"""EduRadar V2 - xay dung mang va tinh do do SNA.

Dau vao : data/eduradar.db (tu pipeline.clean)
Dau ra  : data/network/<mang>_<nam>.json      (cho trang /network)
          data/network/metrics/<mang>_<nam>.csv (do do tung dinh)
          data/network/gexf/<mang>_<nam>.gexf   (mo bang Gephi)
          data/network/fig/*.png                (phan bo bac)
          data/network/summary.csv              (bang tong hop cho bao cao)

Bon mang:
  G1 uni_major     : hai phia Truong - Nganh (canh = truong co tuyen nganh)
  G2 uni_uni       : chieu tu G1, trong so Jaccard tap nganh
  G3 major_major   : chieu tu G1, trong so Jaccard tap truong
  G4 competition   : co huong A->B neu cung nganh (THPT), diem B cao hon A trong vong 2 diem

Chay: python -m sna.build [--years 2024 2025 2026] [--jaccard 0.25] [--gap 2] [--out <thu muc>]
     (--out: ghi ra thu muc khac, VD khi phan tich do nhay, khong de len data/network/)
Can: pandas, networkx, matplotlib (pip install pandas networkx matplotlib scipy)
"""

from __future__ import annotations

import argparse
import itertools
import json
import sqlite3
import time
from collections import defaultdict
from pathlib import Path

import networkx as nx
import pandas as pd
from networkx.algorithms import bipartite, community

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "data" / "eduradar.db"
OUT = ROOT / "data" / "network"
VIZ_EDGE_LIMIT = 1500  # so canh toi da gui len web (giu canh nang nhat)


def r4(x):
    return round(float(x), 4)


def load(year: int) -> tuple[pd.DataFrame, dict, dict]:
    with sqlite3.connect(DB) as c:
        adm = pd.read_sql(
            "SELECT uni_code, major_code, method, score, scale_max, flag FROM admissions "
            "WHERE year = ? AND major_code IS NOT NULL",
            c,
            params=(year,),
        )
        unis = dict(
            c.execute(
                "SELECT uni_code, COALESCE(NULLIF(short_name, ''), name) FROM universities"
            ).fetchall()
        )
        majors = dict(c.execute("SELECT major_code, major_name FROM majors").fetchall())
    return adm, unis, majors


# ---------------------------------------------------------------- graphs
def g1_bipartite(adm: pd.DataFrame) -> nx.Graph:
    g = nx.Graph()
    pairs = adm.groupby(["uni_code", "major_code"]).size()
    for (u, m), w in pairs.items():
        g.add_node(f"U:{u}", bipartite=0, kind="uni")
        g.add_node(f"M:{m}", bipartite=1, kind="major")
        g.add_edge(f"U:{u}", f"M:{m}", weight=int(w))
    return g


def jaccard_projection(g1: nx.Graph, side: str, threshold: float) -> nx.Graph:
    nodes = [n for n, d in g1.nodes(data=True) if d["kind"] == side]
    nb = {n: set(g1[n]) for n in nodes}
    g = nx.Graph()
    g.add_nodes_from(nodes, kind=side)
    # chi xet cap co it nhat 1 hang xom chung (qua dinh ben kia)
    other = [n for n, d in g1.nodes(data=True) if d["kind"] != side]
    seen = set()
    for o in other:
        for a, b in itertools.combinations(sorted(g1[o]), 2):
            if (a, b) in seen:
                continue
            seen.add((a, b))
            inter = len(nb[a] & nb[b])
            j = inter / len(nb[a] | nb[b])
            if j >= threshold:
                g.add_edge(a, b, weight=r4(j), shared=inter)
    return g


def g4_competition(adm: pd.DataFrame, gap: float = 2.0) -> nx.DiGraph:
    thpt = adm[(adm.method == "THPT") & (adm.scale_max == 30) & (adm.flag == "")]
    best = thpt.groupby(["major_code", "uni_code"])["score"].max().reset_index()
    g = nx.DiGraph()
    g.add_nodes_from((f"U:{u}" for u in best.uni_code.unique()), kind="uni")
    w = defaultdict(int)
    for _, grp in best.groupby("major_code"):
        rows = list(grp.itertuples(index=False))
        for a, b in itertools.permutations(rows, 2):
            d = b.score - a.score
            if 0 < d <= gap:
                w[(f"U:{a.uni_code}", f"U:{b.uni_code}")] += 1
    for (a, b), k in w.items():
        g.add_edge(a, b, weight=k)
    return g


# ---------------------------------------------------------------- metrics
def lcc(g: nx.Graph) -> nx.Graph:
    comps = nx.weakly_connected_components(g) if g.is_directed() else nx.connected_components(g)
    return g.subgraph(max(comps, key=len)).copy()


def powerlaw_fit(degrees) -> dict:
    """Uoc luong so mu luat luy thua P(k) ~ k^-gamma cho phan duoi k >= kmin.
    MLE roi rac xap xi (Clauset, Shalizi & Newman 2009), kmin chon theo KS nho nhat,
    duoi can it nhat max(30, 20% so dinh) de uoc luong on dinh (duoi qua ngan cho gamma ao)."""
    import math

    ks = sorted(int(d) for d in degrees if d > 0)
    min_tail = max(30, int(0.2 * len(ks)))
    best = None
    for kmin in sorted(set(ks)):
        tail = [k for k in ks if k >= kmin]
        if len(tail) < min_tail:
            break
        s = sum(math.log(k / (kmin - 0.5)) for k in tail)
        if s <= 0:
            continue
        a = 1 + len(tail) / s
        # KS giua CDF thuc nghiem va CDF ly thuyet (lien tuc xap xi) tren duoi
        n = len(tail)
        uniq = sorted(set(tail))
        D = 0.0
        for k in uniq:
            emp = sum(1 for x in tail if x <= k) / n
            theo = 1 - ((k + 0.5) / (kmin - 0.5)) ** (1 - a)
            D = max(D, abs(emp - theo))
        if best is None or D < best["ks"]:
            best = {"gamma": a, "kmin": kmin, "n_tail": n, "ks": D}
    if not best:
        return {}
    return {
        "powerlaw_gamma": r4(best["gamma"]),
        "powerlaw_kmin": best["kmin"],
        "powerlaw_tail_nodes": best["n_tail"],
        "powerlaw_ks": r4(best["ks"]),
    }


def eig_full(g: nx.Graph, big: nx.Graph, weight) -> dict:
    """Eigenvector tren LCC; dinh ngoai LCC = 0 (khong de trong)."""
    ev = nx.eigenvector_centrality_numpy(big, weight=weight) if big.number_of_edges() else {}
    return {n: float(ev.get(n, 0.0)) for n in g}


def path_stats(big: nx.Graph, prefix: str = "") -> dict:
    if big.number_of_nodes() < 2:
        return {f"{prefix}avg_path_length_lcc": 0, f"{prefix}diameter_lcc": 0}
    return {
        f"{prefix}avg_path_length_lcc": r4(nx.average_shortest_path_length(big)),
        f"{prefix}diameter_lcc": nx.diameter(big),
    }


def girvan_newman_full(g: nx.Graph, max_k: int = 40, time_cap: float = 300.0) -> dict:
    """Girvan-Newman tren TOAN do thi (khong lay mau), dung khi du max_k cum hoac het gio.
    Modularity khong trong so de so sanh cong bang voi Louvain khong trong so."""
    t0 = time.time()
    best_q, best_k, steps = -1.0, 0, 0
    for parts in community.girvan_newman(g):
        steps += 1
        q = community.modularity(g, parts, weight=None)
        if q > best_q:
            best_q, best_k = q, len(parts)
        if len(parts) >= max_k or time.time() - t0 > time_cap:
            break
    lv = community.louvain_communities(g, weight=None, seed=42)
    return {
        "gn_nodes": g.number_of_nodes(),
        "gn_best_modularity": r4(best_q),
        "gn_best_k": best_k,
        "gn_max_k_checked": max_k,
        "gn_seconds": r4(time.time() - t0),
        "louvain_unweighted_modularity": r4(community.modularity(g, lv, weight=None)),
        "louvain_unweighted_communities": len(lv),
    }


def undirected_metrics(g: nx.Graph) -> tuple[dict, dict]:
    t = time.time()
    big = lcc(g)
    node = {
        "degree": dict(g.degree()),
        "degree_centrality": nx.degree_centrality(g),
        "betweenness": nx.betweenness_centrality(g, normalized=True),
        "closeness": nx.closeness_centrality(g),
        "eigenvector": eig_full(g, big, "weight"),
        "eigenvector_unw": eig_full(g, big, None),
        "clustering": nx.clustering(g, weight=None),
        "pagerank": nx.pagerank(g, weight="weight"),
    }
    comms = community.louvain_communities(g, weight="weight", seed=42)
    group = {n: i for i, c in enumerate(sorted(comms, key=len, reverse=True)) for n in c}
    node["community"] = group
    summary = {
        "nodes": g.number_of_nodes(),
        "edges": g.number_of_edges(),
        "density": r4(nx.density(g)),
        "components": nx.number_connected_components(g),
        "lcc_nodes": big.number_of_nodes(),
        "avg_degree": r4(2 * g.number_of_edges() / max(g.number_of_nodes(), 1)),
        "avg_clustering": r4(nx.average_clustering(g)),
        "transitivity": r4(nx.transitivity(g)),
        "avg_path_length_lcc": r4(nx.average_shortest_path_length(big))
        if big.number_of_nodes() > 1
        else 0,
        "diameter_lcc": nx.diameter(big) if big.number_of_nodes() > 1 else 0,
        "assortativity": r4(nx.degree_assortativity_coefficient(g)) if g.number_of_edges() else 0,
        "louvain_communities": len(comms),
        "modularity_louvain": r4(community.modularity(g, comms, weight="weight")),
    }
    # Girvan-Newman tren toan do thi (truoc day chi chay mau 60 dinh bac cao -> Q gan 0)
    summary.update(girvan_newman_full(g))
    summary.update(powerlaw_fit(dict(g.degree()).values()))
    summary["compute_seconds"] = r4(time.time() - t)
    return node, summary


def directed_metrics(g: nx.DiGraph) -> tuple[dict, dict]:
    hubs, auths = nx.hits(g, max_iter=1000, normalized=True) if g.number_of_edges() else ({}, {})
    scc = g.subgraph(max(nx.strongly_connected_components(g), key=len)).copy()
    big = lcc(g)
    node = {
        "in_degree": dict(g.in_degree()),
        "out_degree": dict(g.out_degree()),
        "in_strength": dict(g.in_degree(weight="weight")),
        "pagerank": nx.pagerank(g, weight="weight"),
        "hub": hubs,
        "authority": auths,
        "betweenness": nx.betweenness_centrality(g, normalized=True),
        # closeness co huong: dua tren khoang cach DI VAO dinh (Wasserman-Faust khi khong lien thong)
        "closeness": nx.closeness_centrality(g),
        # eigenvector (theo canh vao) tren thanh phan lien thong manh lon nhat; ngoai SCC = 0
        "eigenvector": eig_full(g, scc, "weight"),
        # clustering co huong (Fagiolo 2007), khong trong so
        "clustering": nx.clustering(g),
    }
    comms = community.louvain_communities(g, weight="weight", seed=42)
    node["community"] = {
        n: i for i, c in enumerate(sorted(comms, key=len, reverse=True)) for n in c
    }
    und = big.to_undirected()
    summary = {
        "nodes": g.number_of_nodes(),
        "edges": g.number_of_edges(),
        "density": r4(nx.density(g)),
        "avg_degree": r4(g.number_of_edges() / max(g.number_of_nodes(), 1)),
        "weak_components": nx.number_weakly_connected_components(g),
        "strong_components": nx.number_strongly_connected_components(g),
        "reciprocity": r4(nx.reciprocity(g)) if g.number_of_edges() else 0,
        "lcc_nodes": big.number_of_nodes(),
        "scc_nodes": scc.number_of_nodes(),
        "avg_clustering": r4(nx.average_clustering(g)),
        "transitivity": r4(nx.transitivity(g.to_undirected())),
        # duong di co huong tren SCC lon nhat (moi cap deu toi duoc nhau)
        **{
            k.replace("_lcc", "").replace("avg", "scc_avg").replace("diameter", "scc_diameter"): v
            for k, v in path_stats(scc).items()
        },
        # duong di khi bo huong, tren LCC yeu
        **path_stats(und),
        "assortativity": r4(nx.degree_assortativity_coefficient(g, x="in", y="in")),
        "louvain_communities": len(comms),
        "modularity_louvain": r4(community.modularity(g, comms, weight="weight")),
        **{f"in_{k}": v for k, v in powerlaw_fit(dict(g.in_degree()).values()).items()},
    }
    return node, summary


def degree_plot(g, path: Path, title: str, nodes=None, kind: str = "") -> None:
    """Ve phan bo bac. nodes: chi tinh bac (trong do thi g) cua cac dinh nay;
    kind: "in"/"out" cho do thi co huong."""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    view = g.in_degree() if kind == "in" else g.out_degree() if kind == "out" else g.degree()
    deg = [d for n, d in view if d > 0 and (nodes is None or n in nodes)]
    if not deg:
        return
    cnt = pd.Series(deg).value_counts().sort_index()
    fig, ax = plt.subplots(1, 2, figsize=(9, 3.4))
    ax[0].hist(deg, bins=30, color="#1f5eff")
    ax[0].set(title=f"{title}: phân bố bậc", xlabel="bậc k", ylabel="số đỉnh")
    # CCDF P(K >= k) tren log-log: on dinh hon P(k) khi nhieu muc bac chi co 1 dinh
    n_all = len(deg)
    ccdf = [(k, sum(1 for d in deg if d >= k) / n_all) for k in cnt.index]
    ax[1].loglog(
        [k for k, _ in ccdf], [c for _, c in ccdf], "o", ms=4, color="#e8590c", label="dữ liệu"
    )
    fit = powerlaw_fit(deg)
    if fit:
        a, kmin, nt = fit["powerlaw_gamma"], fit["powerlaw_kmin"], fit["powerlaw_tail_nodes"]
        xs = [k for k in cnt.index if k >= kmin]
        ax[1].loglog(
            xs,
            [nt / n_all * (k / kmin) ** (1 - a) for k in xs],
            "-",
            color="#1f5eff",
            label=f"luật lũy thừa γ = {a:.2f} (k ≥ {kmin})",
        )
        ax[1].legend(fontsize=8)
    ax[1].set(title="log–log CCDF P(K ≥ k)", xlabel="k", ylabel="P(K ≥ k)")
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    plt.close(fig)


# ---------------------------------------------------------------- export
def export(
    name, year, g, node_metrics, summary, labels, title, desc, size_key, top_keys, definition=None
):
    for d in ("metrics", "gexf", "fig"):
        (OUT / d).mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame(node_metrics).rename_axis("id").reset_index()
    df.insert(1, "label", df["id"].map(lambda n: labels.get(n, n)))
    df.insert(2, "kind", df["id"].map(lambda n: g.nodes[n].get("kind")))
    df.round(5).to_csv(OUT / "metrics" / f"{name}_{year}.csv", index=False, encoding="utf-8-sig")

    gx = g.copy()
    for n in gx.nodes:
        gx.nodes[n]["label"] = labels.get(n, n)
        for k, vals in node_metrics.items():
            if n in vals:
                gx.nodes[n][k] = float(vals[n])
    nx.write_gexf(gx, OUT / "gexf" / f"{name}_{year}.gexf")

    edges = sorted(g.edges(data=True), key=lambda e: -e[2].get("weight", 1))[:VIZ_EDGE_LIMIT]
    keep = {n for e in edges for n in e[:2]}
    size = node_metrics.get(size_key, {})
    payload = {
        "title": title,
        "description": desc,
        "directed": g.is_directed(),
        "year": year,
        # dinh nghia do thi cho the "Dinh nghia" tren web (dung voi code tao mang o tren)
        "definition": definition or {},
        "viz_edge_limit": VIZ_EDGE_LIMIT,
        "summary": summary,
        "top": {
            k: [
                [labels.get(n, n), r4(v)]
                for n, v in sorted(node_metrics[k].items(), key=lambda x: -x[1])[:10]
            ]
            for k in top_keys
            if k in node_metrics
        },
        "nodes": [
            {
                "id": n,
                "label": labels.get(n, n),
                "kind": g.nodes[n].get("kind"),
                "group": node_metrics.get("community", {}).get(n),
                "size": r4(size.get(n, 0)) + 0.0001,
                "metrics": {
                    k: r4(v[n]) for k, v in node_metrics.items() if n in v and k != "community"
                },
            }
            for n in keep
        ],
        "edges": [{"source": a, "target": b, "weight": d.get("weight", 1)} for a, b, d in edges],
    }
    (OUT / f"{name}_{year}.json").write_text(
        json.dumps(payload, ensure_ascii=False), encoding="utf-8"
    )
    return {"network": name, "year": year, **summary}


def main() -> None:
    global OUT
    ap = argparse.ArgumentParser()
    ap.add_argument("--years", type=int, nargs="+", default=[2024, 2025, 2026])
    ap.add_argument("--jaccard", type=float, default=0.25, help="nguong Jaccard cho G2/G3")
    ap.add_argument("--gap", type=float, default=2.0, help="khoang diem cho mang canh tranh G4")
    ap.add_argument("--out", type=Path, default=OUT, help="thu muc ket qua (mac dinh data/network)")
    args = ap.parse_args()
    OUT = args.out
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for year in args.years:
        adm, unis, majors = load(year)
        if adm.empty:
            continue
        labels = {
            **{f"U:{k}": v for k, v in unis.items()},
            **{f"M:{k}": v for k, v in majors.items()},
        }
        print(f"== {year}: {len(adm):,} dong")

        g1 = g1_bipartite(adm)
        U = [n for n, d in g1.nodes(data=True) if d["kind"] == "uni"]
        M = [n for n, d in g1.nodes(data=True) if d["kind"] == "major"]
        deg = dict(g1.degree())
        t1 = time.time()
        big1 = lcc(g1)
        hub1, auth1 = nx.hits(big1, max_iter=1000)
        comm1 = community.louvain_communities(g1, weight="weight", seed=42)
        m1 = {
            "degree": deg,
            "degree_centrality": bipartite.degree_centrality(g1, U),
            "betweenness": bipartite.betweenness_centrality(g1, U),
            # closeness Wasserman-Faust tren toan G1 (<= 1); ban hai phia chuan hoa theo phia ben kia
            # nen o thanh phan nho (khoi nganh quan su) vuot 1, khong xep hang duoc
            "closeness": nx.closeness_centrality(g1),
            "eigenvector": eig_full(g1, big1, "weight"),
            "eigenvector_unw": eig_full(g1, big1, None),
            "pagerank": nx.pagerank(g1, weight="weight"),
            # do thi vo huong: hub = authority; giu authority de doc nhu "uy tin"
            "authority": {n: float(auth1.get(n, 0.0)) for n in g1},
            # clustering hai phia (Latapy 2008): do trung lap lang gieng o phia ben kia
            "clustering": bipartite.clustering(g1, mode="dot"),
            "community": {
                n: i for i, c in enumerate(sorted(comm1, key=len, reverse=True)) for n in c
            },
        }
        s1 = {
            "nodes": g1.number_of_nodes(),
            "universities": len(U),
            "majors": len(M),
            "edges": g1.number_of_edges(),
            "bipartite_density": r4(bipartite.density(g1, U)),
            "density": r4(nx.density(g1)),
            "avg_degree": r4(2 * g1.number_of_edges() / g1.number_of_nodes()),
            "avg_majors_per_uni": r4(sum(deg[u] for u in U) / len(U)),
            "avg_unis_per_major": r4(sum(deg[m] for m in M) / len(M)),
            "components": nx.number_connected_components(g1),
            "lcc_nodes": big1.number_of_nodes(),
            "avg_clustering": r4(bipartite.average_clustering(g1, mode="dot")),
            # transitivity kieu tam giac luon = 0 tren do thi hai phia -> dung clustering Latapy
            "transitivity": 0.0,
            **path_stats(big1),
            "assortativity": r4(nx.degree_assortativity_coefficient(g1)),
            "louvain_communities": len(comm1),
            "modularity_louvain": r4(community.modularity(g1, comm1, weight="weight")),
            **{f"uni_{k}": v for k, v in powerlaw_fit([deg[u] for u in U]).items()},
            **{f"major_{k}": v for k, v in powerlaw_fit([deg[m] for m in M]).items()},
        }
        s1["compute_seconds"] = r4(time.time() - t1)
        rows.append(
            export(
                "g1_uni_major",
                year,
                g1,
                m1,
                s1,
                labels,
                "G1 · Trường – Ngành (hai phía)",
                "Cạnh nối trường với ngành trường đó tuyển. Kim cương = ngành, tròn = trường.",
                "degree",
                ["degree", "betweenness", "closeness", "eigenvector", "pagerank", "clustering"],
                definition={
                    "type": "Hai phía (bipartite), vô hướng, có trọng số",
                    "nodes": "Trường (hình tròn) và ngành theo mã 7 số Bộ GD&ĐT (hình kim cương)",
                    "edges": "Trường có điểm chuẩn của ngành đó trong năm",
                    "weight": "Số dòng điểm chuẩn của cặp (trường, ngành), tính mọi phương thức, "
                    "chương trình, tổ hợp",
                    "params": "Chỉ dùng dòng đã có mã ngành 7 số",
                },
            )
        )
        # bac cua dinh nganh tinh tren G1 (= so truong mo nganh); truoc day dung subgraph(M) khong co canh
        degree_plot(g1, OUT / "fig" / f"g1_major_degree_{year}.png", "Ngành (G1)", nodes=set(M))
        degree_plot(g1, OUT / "fig" / f"g1_uni_degree_{year}.png", "Trường (G1)", nodes=set(U))
        degree_plot(g1, OUT / "fig" / f"g1_degree_{year}.png", "G1")

        for name, side, title, desc, what, via in [
            (
                "g2_uni_uni",
                "uni",
                "G2 · Trường – Trường",
                "Hai trường nối nhau khi tập ngành giống nhau (Jaccard ≥ ngưỡng). Màu = cộng đồng Louvain.",
                "Trường–Trường",
                "tập ngành của 2 trường",
            ),
            (
                "g3_major_major",
                "major",
                "G3 · Ngành – Ngành",
                "Hai ngành nối nhau khi thường cùng được một trường mở. Màu = cộng đồng Louvain.",
                "Ngành–Ngành",
                "tập trường mở 2 ngành",
            ),
        ]:
            g = jaccard_projection(g1, side, args.jaccard)
            g.remove_nodes_from([n for n in list(g) if g.degree(n) == 0])
            nm, sm = undirected_metrics(g)
            sm["jaccard_threshold"] = args.jaccard
            rows.append(
                export(
                    name,
                    year,
                    g,
                    nm,
                    sm,
                    labels,
                    title,
                    desc,
                    "degree",
                    ["degree", "betweenness", "closeness", "eigenvector", "pagerank", "clustering"],
                    definition={
                        "type": f"Chiếu một phía {what} từ G1, vô hướng, có trọng số",
                        "nodes": "Trường" if side == "uni" else "Ngành (mã 7 số)",
                        "edges": f"Nối 2 nút khi Jaccard({via}) ≥ {args.jaccard:g}".replace(
                            ".", ","
                        ),
                        "weight": "Hệ số Jaccard = |giao| / |hợp|",
                        "params": f"Ngưỡng Jaccard {args.jaccard:g}".replace(".", ",")
                        + "; bỏ nút cô lập (không có cạnh)",
                    },
                )
            )
            degree_plot(g, OUT / "fig" / f"{name}_degree_{year}.png", title.split("·")[1].strip())
            if side == "major":  # du doan lien ket -> goi y nganh tuong tu
                pred = sorted(nx.adamic_adar_index(g), key=lambda x: -x[2])[:300]
                pd.DataFrame(
                    [(labels.get(a, a), labels.get(b, b), r4(s)) for a, b, s in pred],
                    columns=["nganh_a", "nganh_b", "adamic_adar"],
                ).to_csv(
                    OUT / "metrics" / f"link_prediction_{year}.csv",
                    index=False,
                    encoding="utf-8-sig",
                )
                sim = {}
                for n in g:
                    nbrs = sorted(g[n].items(), key=lambda x: -x[1]["weight"])[:8]
                    sim[n[2:]] = [[m[2:], labels.get(m, m), d["weight"]] for m, d in nbrs]
                (OUT / f"similar_majors_{year}.json").write_text(
                    json.dumps(sim, ensure_ascii=False), encoding="utf-8"
                )

        g4 = g4_competition(adm, args.gap)
        g4.remove_nodes_from([n for n in list(g4) if g4.degree(n) == 0])
        if g4.number_of_edges():
            degree_plot(g4, OUT / "fig" / f"g4_in_degree_{year}.png", "G4 bậc vào", kind="in")
            degree_plot(g4, OUT / "fig" / f"g4_out_degree_{year}.png", "G4 bậc ra", kind="out")
            nm, sm = directed_metrics(g4)
            thpt = (
                adm[(adm.method == "THPT") & (adm.scale_max == 30)]
                .groupby("uni_code")["score"]
                .mean()
            )
            avg = {f"U:{k}": v for k, v in thpt.items()}
            common = [n for n in g4 if n in avg]
            sm["spearman_authority_vs_avg_score"] = r4(
                pd.Series({n: nm["authority"][n] for n in common})
                .rank()
                .corr(pd.Series({n: avg[n] for n in common}).rank())
            )
            sm["spearman_pagerank_vs_avg_score"] = r4(
                pd.Series({n: nm["pagerank"][n] for n in common})
                .rank()
                .corr(pd.Series({n: avg[n] for n in common}).rank())
            )
            sm["score_gap"] = args.gap
            rows.append(
                export(
                    "g4_competition",
                    year,
                    g4,
                    nm,
                    sm,
                    labels,
                    "G4 · Mạng cạnh tranh (có hướng)",
                    f"A → B nếu cùng ngành, B có điểm THPT cao hơn A trong vòng {args.gap} điểm. Authority cao = trường được 'nhắm tới'.",
                    "authority",
                    ["authority", "hub", "pagerank", "in_strength", "closeness", "betweenness"],
                    definition={
                        "type": "Có hướng Trường → Trường, có trọng số",
                        "nodes": "Trường có điểm chuẩn THPT thang 30",
                        "edges": f"A → B khi cùng một ngành, điểm B cao hơn A trong khoảng (0; {args.gap:g}] "
                        "điểm",
                        "weight": "Số ngành thỏa điều kiện",
                        "params": "Chỉ phương thức THPT thang 30, dòng không gắn cờ; lấy điểm cao "
                        "nhất của trường cho mỗi ngành; khoảng điểm "
                        + f"{args.gap:g}".replace(".", ",")
                        + "; bỏ nút cô lập",
                        "reading": "Authority cao = trường được nhiều trường khác “nhắm lên”",
                    },
                )
            )
    summ = pd.DataFrame(rows)
    summ.to_csv(OUT / "summary.csv", index=False, encoding="utf-8-sig")
    print(summ.to_string())


if __name__ == "__main__":
    main()
