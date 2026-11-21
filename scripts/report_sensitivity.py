"""Phan tich do nhay tham so mang (chi doc DB, khong ghi de data/network/).

Tinh lai tren du lieu hien tai cac bang cua docs/do_nhay_sna.md:
  - G2/G3 theo nguong Jaccard {0,15; 0,20; 0,25; 0,30; 0,35} (2026) va {0,15; 0,25; 0,35} (2024)
  - G4 theo khoang diem {1; 2; 3} (2024, 2026)
  - on dinh cong dong Louvain (ARI/NMI) giua cac nguong va giua 20 seed
  - trung lap top 10 theo nguong; cum y duoc; Adamic-Adar 2024 -> 2026 theo nguong
  - muc dao dong diem chuan giua hai nam lien ke (ly do chon khoang 2 diem)
Dung lai ham dung mang cua sna/build.py nen cau hinh chuan (0,25; 2) trung data/network/summary.csv.

Chay: .venv/Scripts/python.exe -X utf8 scripts/report_sensitivity.py
Ra  : docs/do_nhay_sna.json (so lieu) va docs/do_nhay_sna.md (bang doc)
"""

from __future__ import annotations

import json
import math
import sys
from collections import Counter
from pathlib import Path

import networkx as nx
import pandas as pd
from networkx.algorithms import community

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sna.build import g1_bipartite, g4_competition, jaccard_projection, lcc, load  # noqa: E402

OUT_JSON = ROOT / "docs" / "do_nhay_sna.json"
OUT_MD = ROOT / "docs" / "do_nhay_sna.md"
J_2026 = [0.15, 0.20, 0.25, 0.30, 0.35]
J_2024 = [0.15, 0.25, 0.35]
GAPS = [1.0, 2.0, 3.0]
MEDICAL = ["QHY", "YDN", "DDY", "DHY", "QSY", "TYS", "YDS", "YHB", "YPB", "DTY"]


def r(x, n=4):
    return None if x is None else round(float(x), n)


def louvain(g, seed=42):
    comms = community.louvain_communities(g, weight="weight", seed=seed)
    part = {n: i for i, c in enumerate(sorted(comms, key=len, reverse=True)) for n in c}
    return comms, part


def ari_nmi(a: dict, b: dict) -> tuple[float, float, int]:
    """Adjusted Rand Index va NMI (trung binh so hoc) tren cac dinh chung."""
    common = sorted(set(a) & set(b))
    n = len(common)
    pairs = Counter((a[x], b[x]) for x in common)
    ca, cb = Counter(a[x] for x in common), Counter(b[x] for x in common)
    c2 = lambda k: k * (k - 1) / 2  # noqa: E731
    s_ij = sum(c2(v) for v in pairs.values())
    s_a, s_b = sum(c2(v) for v in ca.values()), sum(c2(v) for v in cb.values())
    exp = s_a * s_b / c2(n)
    ari = (s_ij - exp) / (0.5 * (s_a + s_b) - exp)
    h = lambda cnt: -sum(v / n * math.log(v / n) for v in cnt.values())  # noqa: E731
    mi = sum(v / n * math.log(v * n / (ca[i] * cb[j])) for (i, j), v in pairs.items())
    nmi = 2 * mi / (h(ca) + h(cb)) if h(ca) + h(cb) else 1.0
    return ari, nmi, n


def projection(g1, side, j):
    g = jaccard_projection(g1, side, j)
    g.remove_nodes_from([n for n in list(g) if g.degree(n) == 0])
    return g


def proj_stats(g) -> dict:
    big = lcc(g)
    comms, part = louvain(g)
    return {
        "nodes": g.number_of_nodes(),
        "edges": g.number_of_edges(),
        "density": r(nx.density(g)),
        "components": nx.number_connected_components(g),
        "lcc_nodes": big.number_of_nodes(),
        "lcc_pct": r(100 * big.number_of_nodes() / g.number_of_nodes(), 1),
        "avg_path_lcc": r(nx.average_shortest_path_length(big)),
        "avg_clustering": r(nx.average_clustering(g)),
        "modularity": r(community.modularity(g, comms, weight="weight")),
        "communities": len(comms),
        "_part": part,
    }


def tops(g, labels) -> dict:
    big = lcc(g)
    ev = nx.eigenvector_centrality_numpy(big, weight="weight")
    vals = {
        "degree": dict(g.degree()),
        "betweenness": nx.betweenness_centrality(g, normalized=True),
        "eigenvector": {n: ev.get(n, 0.0) for n in g},
        "pagerank": nx.pagerank(g, weight="weight"),
    }
    out = {}
    for k, v in vals.items():
        order = sorted(v, key=lambda n: (-v[n], n))
        out[k] = {"top10": order[:10], "rank": {n: i + 1 for i, n in enumerate(order)}}
    out["eigenvector_top_labels"] = [labels.get(n, n) for n in out["eigenvector"]["top10"]]
    return out


def g4_stats(adm, gap) -> dict:
    g = g4_competition(adm, gap)
    g.remove_nodes_from([n for n in list(g) if g.degree(n) == 0])
    hubs, auth = nx.hits(g, max_iter=1000, normalized=True)
    pr = nx.pagerank(g, weight="weight")
    avg = adm[(adm.method == "THPT") & (adm.scale_max == 30)].groupby("uni_code")["score"].mean()
    avg = {f"U:{k}": v for k, v in avg.items()}
    common = [n for n in g if n in avg]
    sp = lambda m: (  # noqa: E731
        pd.Series({n: m[n] for n in common})
        .rank()
        .corr(pd.Series({n: avg[n] for n in common}).rank())
    )
    return {
        "nodes": g.number_of_nodes(),
        "edges": g.number_of_edges(),
        "density": r(nx.density(g)),
        "strong_components": nx.number_strongly_connected_components(g),
        "spearman_pagerank": r(sp(pr)),
        "spearman_authority": r(sp(auth)),
        "_top_pr": sorted(pr, key=lambda n: -pr[n])[:10],
        "_top_auth": sorted(auth, key=lambda n: -auth[n])[:10],
    }


def aa_hits(g_before, g_after, k=300) -> dict:
    pred = sorted(nx.adamic_adar_index(g_before), key=lambda x: -x[2])[:k]
    after = {frozenset(e) for e in g_after.edges()}
    hits = sum(1 for a, b, _ in pred if frozenset((a, b)) in after)
    nodes = [n for n in g_before if n in g_after]
    non = [
        (a, b) for i, a in enumerate(nodes) for b in nodes[i + 1 :] if not g_before.has_edge(a, b)
    ]
    new = sum(1 for a, b in non if g_after.has_edge(a, b))
    base = new / len(non) if non else 0
    return {
        "hits": hits,
        "k": k,
        "base_rate": r(base, 5),
        "lift": r(hits / k / base, 1) if base else None,
    }


def score_change(adm_by_year) -> list[dict]:
    best = {}
    for y, adm in adm_by_year.items():
        t = adm[(adm.method == "THPT") & (adm.scale_max == 30) & (adm.flag == "")]
        best[y] = t.groupby(["uni_code", "major_code"])["score"].max()
    out = []
    for a, b in [(2024, 2025), (2025, 2026)]:
        d = (best[b] - best[a]).dropna().abs()
        out.append(
            {
                "from": a,
                "to": b,
                "pairs": int(len(d)),
                "median": r(d.median(), 2),
                "le1": r(100 * (d <= 1).mean(), 1),
                "le2": r(100 * (d <= 2).mean(), 1),
                "le3": r(100 * (d <= 3).mean(), 1),
            }
        )
    return out


def main() -> None:
    res = {"jaccard": {}, "gap": {}, "stability": {}, "tops": {}, "aa": {}, "medical": {}}
    data = {y: load(y) for y in (2024, 2025, 2026)}
    g1 = {y: g1_bipartite(data[y][0]) for y in data}
    parts, top_sets = {}, {}
    for year, js in ((2026, J_2026), (2024, J_2024)):
        adm, unis, majors = data[year]
        labels = {
            **{f"U:{k}": v for k, v in unis.items()},
            **{f"M:{k}": v for k, v in majors.items()},
        }
        for j in js:
            for name, side in (("g2", "uni"), ("g3", "major")):
                g = projection(g1[year], side, j)
                st = proj_stats(g)
                parts[(year, name, j)] = st.pop("_part")
                res["jaccard"].setdefault(str(year), {}).setdefault(name, {})[f"{j:.2f}"] = st
                if year == 2026 and j in (0.15, 0.25, 0.35):
                    top_sets[(name, j)] = tops(g, labels)
                if year == 2026 and name == "g2":
                    p = parts[(year, name, j)]
                    meds = [f"U:{c}" for c in MEDICAL if f"U:{c}" in p]
                    cm = Counter(p[m] for m in meds).most_common(1)[0][0] if meds else None
                    members = {n for n, c in p.items() if c == cm}
                    cut = sum(1 for a, b in g.edges() if (a in members) != (b in members))
                    touch = sum(1 for a, b in g.edges() if a in members or b in members)
                    res["medical"][f"{j:.2f}"] = {
                        "present": len(meds),
                        "same_community": sum(1 for m in meds if p[m] == cm),
                        "external_edge_pct": r(100 * cut / touch, 1) if touch else None,
                    }
        print(f"jaccard {year} xong", flush=True)
    # on dinh cong dong 2026
    for name in ("g2", "g3"):
        st = {}
        for a, b in ((0.15, 0.25), (0.35, 0.25), (0.15, 0.35)):
            ari, nmi, n = ari_nmi(parts[(2026, name, a)], parts[(2026, name, b)])
            st[f"{a:.2f}-{b:.2f}"] = {"ari": r(ari, 3), "nmi": r(nmi, 3), "common": n}
        g = projection(g1[2026], "uni" if name == "g2" else "major", 0.25)
        base = parts[(2026, name, 0.25)]
        aris, nmis = [], []
        for seed in range(1, 21):
            _, p = louvain(g, seed)
            a, m, _ = ari_nmi(base, p)
            aris.append(a)
            nmis.append(m)
        st["seed_baseline"] = {
            "ari_mean": r(sum(aris) / 20, 3),
            "ari_min": r(min(aris), 3),
            "nmi_mean": r(sum(nmis) / 20, 3),
        }
        res["stability"][name] = st
    # trung lap top 10 so voi nguong 0,25
    for name in ("g2", "g3"):
        ref = top_sets[(name, 0.25)]
        out = {}
        for j in (0.15, 0.35):
            cur = top_sets[(name, j)]
            out[f"{j:.2f}"] = {
                k: len(set(cur[k]["top10"]) & set(ref[k]["top10"]))
                for k in ("degree", "betweenness", "eigenvector", "pagerank")
            }
        first = ref["betweenness"]["top10"][0]
        out["betweenness_top1"] = {
            "id": first,
            "rank": {
                f"{j:.2f}": top_sets[(name, j)]["betweenness"]["rank"].get(first)
                for j in (0.15, 0.25, 0.35)
            },
        }
        out["eigenvector_top_labels"] = {
            f"{j:.2f}": top_sets[(name, j)]["eigenvector_top_labels"][:5]
            for j in (0.15, 0.25, 0.35)
        }
        res["tops"][name] = out
    print("on dinh + top xong", flush=True)
    # G4 theo khoang diem
    for year in (2024, 2026):
        adm = data[year][0]
        rows = {f"{gp:g}": g4_stats(adm, gp) for gp in GAPS}
        ref = rows["2"]
        for k, v in rows.items():
            v["top_pr_overlap"] = (
                len(set(v.pop("_top_pr")) & set(ref["_top_pr"])) if k != "2" else 10
            )
            v["top_auth_overlap"] = (
                len(set(v.pop("_top_auth")) & set(ref["_top_auth"])) if k != "2" else 10
            )
        ref.pop("_top_pr", None)
        ref.pop("_top_auth", None)
        res["gap"][str(year)] = rows
    # Adamic-Adar 2024 -> 2026 theo nguong G3
    for j in (0.15, 0.25, 0.35):
        res["aa"][f"{j:.2f}"] = aa_hits(
            projection(g1[2024], "major", j), projection(g1[2026], "major", j)
        )
    res["score_change"] = score_change({y: data[y][0] for y in data})
    OUT_JSON.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    write_md(res)
    print(f"Ghi {OUT_JSON.relative_to(ROOT)} va {OUT_MD.relative_to(ROOT)}")


def vn(x, d=3):
    if x is None:
        return "—"
    if isinstance(x, int):
        return f"{x:,}".replace(",", ".")
    s = f"{x:,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return s.replace("-", "−")


def write_md(res) -> None:
    J = res["jaccard"]
    L = [
        "# Phân tích độ nhạy tham số mạng SNA",
        "",
        "Sinh tự động bởi `scripts/report_sensitivity.py` từ `data/eduradar.db` hiện tại (dùng lại hàm dựng mạng của "
        "`sna/build.py`; cấu hình chuẩn Jaccard 0,25 và khoảng điểm 2 trùng `data/network/summary.csv`). "
        "Mỗi lần chỉ đổi một tham số. Louvain có trọng số, seed 42; ARI/NMI tính trên đỉnh chung của hai phân hoạch.",
        "",
    ]
    for name, title in (("g2", "G2 Trường – Trường"), ("g3", "G3 Ngành – Ngành")):
        L += [f"## {title} theo ngưỡng Jaccard (2026)", ""]
        cols = list(J["2026"][name])
        L.append("| Độ đo | " + " | ".join(c.replace(".", ",") for c in cols) + " |")
        L.append("| --- |" + " ---: |" * len(cols))
        for key, lab, d in [
            ("nodes", "Số đỉnh", 0),
            ("edges", "Số cạnh", 0),
            ("density", "Mật độ", 3),
            ("components", "Số thành phần", 0),
            ("lcc_nodes", "LCC (đỉnh)", 0),
            ("lcc_pct", "LCC (%)", 1),
            ("avg_path_lcc", "Đường đi TB (LCC)", 2),
            ("avg_clustering", "Clustering TB", 3),
            ("modularity", "Modularity Louvain", 3),
            ("communities", "Số cộng đồng", 0),
        ]:
            L.append(
                f"| {lab} | " + " | ".join(vn(J["2026"][name][c][key], d) for c in cols) + " |"
            )
        L.append("")
        y24 = J["2024"][name]
        L.append(
            "Năm 2024 (0,15 / 0,25 / 0,35): Q = "
            + " / ".join(vn(y24[c]["modularity"]) for c in y24)
            + "; LCC = "
            + " / ".join(vn(y24[c]["lcc_nodes"]) for c in y24)
            + " đỉnh; thành phần = "
            + " / ".join(vn(y24[c]["components"]) for c in y24)
            + "; cộng đồng = "
            + " / ".join(vn(y24[c]["communities"]) for c in y24)
            + "."
        )
        L.append("")
    L += [
        "## G4 theo khoảng điểm",
        "",
        "| Độ đo | Năm | 1 điểm | 2 điểm | 3 điểm |",
        "| --- | --- | ---: | ---: | ---: |",
    ]
    for year in ("2026", "2024"):
        g = res["gap"][year]
        for key, lab, d in [
            ("nodes", "Số đỉnh", 0),
            ("edges", "Số cạnh", 0),
            ("density", "Mật độ", 3),
            ("strong_components", "Thành phần liên thông mạnh", 0),
            ("spearman_pagerank", "Spearman(PageRank, điểm TB)", 3),
            ("spearman_authority", "Spearman(authority, điểm TB)", 3),
            ("top_pr_overlap", "Top 10 PageRank trùng mốc 2 điểm", 0),
            ("top_auth_overlap", "Top 10 authority trùng mốc 2 điểm", 0),
        ]:
            L.append(
                f"| {lab} | {year} | "
                + " | ".join(vn(g[k][key], d) for k in ("1", "2", "3"))
                + " |"
            )
    L += [
        "",
        "## Độ ổn định cộng đồng Louvain (2026)",
        "",
        "| So sánh | G2: ARI / NMI (đỉnh chung) | G3: ARI / NMI (đỉnh chung) |",
        "| --- | --- | --- |",
    ]
    S = res["stability"]
    for k in ("0.15-0.25", "0.35-0.25", "0.15-0.35"):
        a, b = S["g2"][k], S["g3"][k]
        L.append(
            f"| {k.replace('.', ',').replace('-', ' so với ')} | {vn(a['ari'])} / {vn(a['nmi'])} ({a['common']}) | "
            f"{vn(b['ari'])} / {vn(b['nmi'])} ({b['common']}) |"
        )
    a, b = S["g2"]["seed_baseline"], S["g3"]["seed_baseline"]
    L.append(
        f"| Mức nền: 20 seed so với seed 42 (0,25) | TB {vn(a['ari_mean'])} (thấp nhất {vn(a['ari_min'])}) / {vn(a['nmi_mean'])} | "
        f"TB {vn(b['ari_mean'])} (thấp nhất {vn(b['ari_min'])}) / {vn(b['nmi_mean'])} |"
    )
    L += ["", "Cụm y dược (10 trường " + ", ".join(MEDICAL) + ") trong G2 2026:", ""]
    for j, m in res["medical"].items():
        L.append(
            f"- Ngưỡng {j.replace('.', ',')}: {m['same_community']}/{m['present']} trường cùng một cộng đồng; "
            f"tỉ lệ cạnh của cộng đồng đó đi ra ngoài {vn(m['external_edge_pct'], 1)}%."
        )
    L += [
        "",
        "## Trùng lặp top 10 so với ngưỡng 0,25 (2026)",
        "",
        "| Mạng | Ngưỡng | Bậc | Betweenness | Eigenvector | PageRank |",
        "| --- | --- | ---: | ---: | ---: | ---: |",
    ]
    for name in ("g2", "g3"):
        for j in ("0.15", "0.35"):
            t = res["tops"][name][j]
            L.append(
                f"| {name.upper()} | {j.replace('.', ',')} | {t['degree']}/10 | {t['betweenness']}/10 | {t['eigenvector']}/10 | {t['pagerank']}/10 |"
            )
    for name in ("g2", "g3"):
        t = res["tops"][name]["betweenness_top1"]
        L.append("")
        L.append(
            f"{name.upper()}: đỉnh betweenness cao nhất ở 0,25 là `{t['id']}`; hạng ở 0,15 / 0,25 / 0,35 = "
            + " / ".join(vn(t["rank"][j]) for j in ("0.15", "0.25", "0.35"))
            + "."
        )
        ev = res["tops"][name]["eigenvector_top_labels"]
        L.append("")
        L.append(
            f"{name.upper()} top 5 eigenvector: "
            + "; ".join(f"{j.replace('.', ',')}: {', '.join(v)}" for j, v in ev.items())
            + "."
        )
    L += [
        "",
        "## Adamic–Adar G3 2024 → 2026 theo ngưỡng",
        "",
        "| Ngưỡng | Trúng trong top 300 | Tỉ lệ nền | Gấp nền |",
        "| --- | ---: | ---: | ---: |",
    ]
    for j, a in res["aa"].items():
        L.append(
            f"| {j.replace('.', ',')} | {a['hits']}/300 | {vn(a['base_rate'], 5)} | {vn(a['lift'], 1)} |"
        )
    L += [
        "",
        "## Mức dao động điểm chuẩn giữa hai năm (lý do chọn khoảng 2 điểm)",
        "",
        "Điểm THPT thang 30 cao nhất của cùng (trường, ngành), dòng không cờ.",
        "",
        "| Cặp năm | Số cặp | Trung vị mức thay đổi | ≤ 1 điểm | ≤ 2 điểm | ≤ 3 điểm |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for s in res["score_change"]:
        L.append(
            f"| {s['from']} → {s['to']} | {vn(s['pairs'])} | {vn(s['median'], 2)} | {vn(s['le1'], 1)}% | {vn(s['le2'], 1)}% | {vn(s['le3'], 1)}% |"
        )
    L.append("")
    OUT_MD.write_text("\n".join(L), encoding="utf-8")


if __name__ == "__main__":
    main()
