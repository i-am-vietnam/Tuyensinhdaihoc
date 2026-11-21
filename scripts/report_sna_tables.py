"""Sinh cac bang so cho Chuong 3-4 cua bao cao tu ket qua mang (chi doc, khong tinh lai mang).

Nguon: data/network/summary.csv, data/network/metrics/*.csv, data/network/*_2026.json (truong
"definition"), data/network/metrics/link_prediction_2026.csv, data/eduradar.db.
Ra: tmp/report/sna_tables.md gom cac khoi "<!-- T:ten -->" de ghep vao docs/BAO_CAO_DO_AN.md.

Chay: .venv/Scripts/python.exe -X utf8 scripts/report_sna_tables.py [file_ra]
"""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from webapp import main as web  # noqa: E402

NET = ROOT / "data" / "network"
YEARS = [2024, 2025, 2026]
NAMES = {
    "g1_uni_major": "G1 Trường–Ngành",
    "g2_uni_uni": "G2 Trường–Trường",
    "g3_major_major": "G3 Ngành–Ngành",
    "g4_competition": "G4 Cạnh tranh",
}
# Ten tieng Viet cho cot summary (cung y nghia voi nhan tren web, webapp/static/app.js)
LABELS = {
    "nodes": "Số đỉnh",
    "universities": "Số trường",
    "majors": "Số ngành",
    "edges": "Số cạnh",
    "bipartite_density": "Mật độ hai phía",
    "density": "Mật độ",
    "avg_degree": "Bậc trung bình",
    "avg_majors_per_uni": "Số ngành TB / trường",
    "avg_unis_per_major": "Số trường TB / ngành",
    "jaccard_threshold": "Ngưỡng Jaccard",
    "components": "Số thành phần liên thông",
    "weak_components": "Thành phần liên thông yếu",
    "strong_components": "Thành phần liên thông mạnh",
    "lcc_nodes": "Số đỉnh thành phần lớn nhất (LCC)",
    "scc_nodes": "Số đỉnh SCC lớn nhất",
    "avg_path_length_lcc": "Đường đi ngắn nhất TB (LCC)",
    "diameter_lcc": "Đường kính (LCC)",
    "scc_avg_path_length": "Đường đi TB có hướng (SCC)",
    "scc_diameter": "Đường kính có hướng (SCC)",
    "avg_clustering": "Hệ số phân cụm TB",
    "transitivity": "Transitivity",
    "assortativity": "Assortativity theo bậc",
    "louvain_communities": "Số cộng đồng Louvain",
    "modularity_louvain": "Modularity Q (Louvain)",
    "gn_nodes": "GN: số đỉnh xét",
    "gn_best_modularity": "GN: Q tốt nhất",
    "gn_best_k": "GN: số cộng đồng tại Q tốt nhất",
    "gn_max_k_checked": "GN: k tối đa đã xét",
    "gn_seconds": "GN: thời gian (giây)",
    "louvain_unweighted_modularity": "Louvain không trọng số: Q",
    "louvain_unweighted_communities": "Louvain không trọng số: số cộng đồng",
    "compute_seconds": "Thời gian tính độ đo (giây)",
    "reciprocity": "Reciprocity",
    "spearman_authority_vs_avg_score": "Spearman(authority, điểm TB)",
    "spearman_pagerank_vs_avg_score": "Spearman(PageRank, điểm TB)",
    "score_gap": "Khoảng điểm tối đa",
}
PL = {"gamma": "γ", "kmin": "k_min", "tail_nodes": "số đỉnh ở đuôi", "ks": "KS"}
PL_SIDE = {"uni_": " (bậc trường)", "major_": " (bậc ngành)", "in_": " (bậc vào)", "": ""}


def label(k: str) -> str:
    if k in LABELS:
        return LABELS[k]
    for side in ("uni_", "major_", "in_", ""):
        for s, v in PL.items():
            if k == f"{side}powerlaw_{s}":
                return f"Power-law {v}{PL_SIDE[side]}"
    return k


def vn(x, d=4) -> str:
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return "—"
    if isinstance(x, (int,)) or (isinstance(x, float) and x.is_integer() and d == 0):
        return f"{int(x):,}".replace(",", ".")
    if isinstance(x, float) and x.is_integer():
        return f"{int(x):,}".replace(",", ".")
    s = f"{x:,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return s.replace("-", "−")


def table(headers, rows) -> str:
    out = ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
    out += ["| " + " | ".join(str(c).replace("|", r"\|") for c in r) + " |" for r in rows]
    return "\n".join(out)


def main() -> None:
    out_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "tmp/report/sna_tables.md"
    summ = pd.read_csv(NET / "summary.csv")
    S = {(r.network, r.year): r for r in summ.itertuples(index=False)}
    with sqlite3.connect(f"file:{(ROOT / 'data/eduradar.db').as_posix()}?mode=ro", uri=True) as c:
        unis = dict(c.execute("SELECT uni_code, name FROM universities"))
        majors = dict(c.execute("SELECT major_code, major_name FROM majors"))
        adm = pd.read_sql(
            "SELECT uni_code, year, major_code, method, scale_max, score, flag FROM admissions "
            "WHERE major_code IS NOT NULL",
            c,
        )

    def name(i: str) -> str:
        code = i[2:]
        return (
            f"{unis.get(code, code)} ({code})"
            if i.startswith("U:")
            else f"{majors.get(code, code)} ({code})"
        )

    M = {
        (n, y): pd.read_csv(NET / "metrics" / f"{n}_{y}.csv").set_index("id")
        for n in NAMES
        for y in YEARS
    }
    blocks: dict[str, str] = {}

    def top(n, col, k=10, kind=None, y=2026, d=4):
        m = M[(n, y)]
        if kind:
            m = m[m.kind == kind]
        m = m.sort_values([col], ascending=False, kind="mergesort")
        m = m.loc[sorted(m.index, key=lambda i: (-m.loc[i, col], i))][:k]
        return [f"{name(i)} — {vn(float(v), d) if d else vn(int(v), 0)}" for i, v in m[col].items()]

    def side_by_side(cols, k=10):
        return [[i + 1, *[c[i] if i < len(c) else "" for c in cols]] for i in range(k)]

    # Quy mo
    rows = []
    for y in YEARS:
        for n in NAMES:
            s = S[(n, y)]
            what = (
                f"{int(s.universities)} trường + {int(s.majors)} ngành"
                if n.startswith("g1")
                else ("ngành" if n.startswith("g3") else "trường")
            )
            rows.append([NAMES[n], y, vn(int(s.nodes), 0), vn(int(s.edges), 0), what])
    blocks["sizes"] = table(["Mạng", "Năm", "Số đỉnh", "Số cạnh", "Đỉnh là"], rows)
    # Dinh nghia (tu truong definition)
    rows = []
    for n in NAMES:
        d = json.loads((NET / f"{n}_2026.json").read_text(encoding="utf-8"))["definition"]
        s = S[(n, 2026)]
        rows.append(
            [
                NAMES[n],
                d["type"],
                d["nodes"],
                d["edges"],
                d["weight"],
                d["params"],
                f"{vn(int(s.nodes), 0)} / {vn(int(s.edges), 0)}",
            ]
        )
    blocks["definition"] = table(
        ["Mạng", "Loại đồ thị", "Nút", "Cạnh", "Trọng số", "Ngưỡng / tham số", "Nút / cạnh 2026"],
        rows,
    )
    # Top-10
    blocks["deg_g1"] = table(
        ["Hạng", "Trường (số ngành mở)", "Ngành (số trường mở)"],
        side_by_side(
            [
                top("g1_uni_major", "degree", kind="uni", d=0),
                top("g1_uni_major", "degree", kind="major", d=0),
            ]
        ),
    )
    blocks["deg_g2g3"] = table(
        ["Hạng", "G2: trường (bậc)", "G3: ngành (bậc)"],
        side_by_side([top("g2_uni_uni", "degree", d=0), top("g3_major_major", "degree", d=0)]),
    )
    blocks["deg_g4"] = table(
        ["Hạng", "Bậc vào", "Bậc ra", "Cường độ vào (tổng số ngành)"],
        side_by_side(
            [
                top("g4_competition", "in_degree", d=0),
                top("g4_competition", "out_degree", d=0),
                top("g4_competition", "in_strength", d=0),
            ]
        ),
    )
    blocks["btw"] = table(
        ["Hạng", "G2", "G3", "G4"],
        side_by_side(
            [
                top("g2_uni_uni", "betweenness"),
                top("g3_major_major", "betweenness"),
                top("g4_competition", "betweenness"),
            ]
        ),
    )
    blocks["btw_g1"] = table(
        ["Hạng", "G1 phía trường", "G1 phía ngành"],
        side_by_side(
            [
                top("g1_uni_major", "betweenness", kind="uni"),
                top("g1_uni_major", "betweenness", kind="major"),
            ]
        ),
    )
    # G1 khong xep hang closeness: bipartite.closeness_centrality chuan hoa theo phia ben kia nen o
    # thanh phan nho co the > 1 (khoi nganh quan su) -> chi bao cao G2, G3, G4
    blocks["clo"] = table(
        ["Hạng", "G2", "G3", "G4 (theo khoảng cách đi vào)"],
        side_by_side(
            [
                top("g2_uni_uni", "closeness"),
                top("g3_major_major", "closeness"),
                top("g4_competition", "closeness"),
            ]
        ),
    )
    g1c = M[("g1_uni_major", 2026)]
    big = g1c[g1c.closeness > 1]
    blocks["clo_g1_note"] = (
        f"{len(big)} đỉnh G1 2026 có closeness > 1 (lớn nhất {vn(float(g1c.closeness.max()))}), "
        f"thuộc thành phần nhỏ: " + ", ".join(sorted(big.label.astype(str))[:6])
    )
    blocks["eig"] = table(
        ["Hạng", "G2 có trọng số", "G2 không trọng số", "G3 có trọng số", "G3 không trọng số"],
        side_by_side(
            [
                top("g2_uni_uni", "eigenvector"),
                top("g2_uni_uni", "eigenvector_unw"),
                top("g3_major_major", "eigenvector"),
                top("g3_major_major", "eigenvector_unw"),
            ]
        ),
    )
    rows = []
    for n in ("g1_uni_major", "g2_uni_uni", "g3_major_major", "g4_competition"):
        m = M[(n, 2026)]
        for col in ("eigenvector", "eigenvector_unw"):
            if col in m:
                v = m[col]
                rows.append(
                    [
                        NAMES[n],
                        "có trọng số" if col == "eigenvector" else "không trọng số",
                        f"{int((v > 0.001).sum())}/{len(v)}",
                        f"{int((v > 0.05).sum())}/{len(v)}",
                        vn(float(v.max())),
                    ]
                )
    blocks["eig_spread"] = table(
        ["Mạng 2026", "Bản", "Đỉnh > 0,001", "Đỉnh > 0,05", "Lớn nhất"], rows
    )
    blocks["pr"] = table(
        ["Hạng", "G1 (cả hai phía)", "G2", "G3", "G4"],
        side_by_side(
            [
                top("g1_uni_major", "pagerank"),
                top("g2_uni_uni", "pagerank"),
                top("g3_major_major", "pagerank"),
                top("g4_competition", "pagerank"),
            ]
        ),
    )
    blocks["hits"] = table(
        ["Hạng", "G4 authority", "G4 hub", "G1 authority (= hub, vô hướng)"],
        side_by_side(
            [
                top("g4_competition", "authority"),
                top("g4_competition", "hub"),
                top("g1_uni_major", "authority"),
            ]
        ),
    )

    # Bang toan cuc theo nam
    def glob(keys_by_net, title_col="Mạng / chỉ tiêu"):
        rows = []
        for n, keys in keys_by_net:
            for k in keys:
                vals = [getattr(S[(n, y)], k) for y in YEARS]
                if all(pd.isna(v) for v in vals):
                    continue
                d = 0 if all(float(v).is_integer() for v in vals if not pd.isna(v)) else 4
                rows.append(
                    [f"{NAMES[n].split()[0]}: {label(k)}", *[vn(float(v), d) for v in vals]]
                )
        return table([title_col, *map(str, YEARS)], rows)

    ALL = list(NAMES)
    blocks["g_density"] = glob(
        [(n, ["density", "avg_degree"]) for n in ALL] + [("g1_uni_major", ["bipartite_density"])]
    )
    blocks["g_path"] = glob(
        [(n, ["lcc_nodes", "avg_path_length_lcc", "diameter_lcc"]) for n in ALL]
        + [("g4_competition", ["scc_nodes", "scc_avg_path_length", "scc_diameter"])]
    )
    blocks["g_clust"] = glob([(n, ["avg_clustering", "transitivity"]) for n in ALL])
    blocks["g_mod"] = glob([(n, ["louvain_communities", "modularity_louvain"]) for n in ALL])
    blocks["g_conn"] = glob(
        [(n, ["components", "assortativity"]) for n in ALL[:3]]
        + [
            (
                "g4_competition",
                ["weak_components", "strong_components", "reciprocity", "assortativity"],
            )
        ]
    )
    blocks["g_powerlaw"] = glob(
        [
            ("g1_uni_major", [f"{s}powerlaw_{k}" for s in ("uni_", "major_") for k in PL]),
            ("g2_uni_uni", [f"powerlaw_{k}" for k in PL]),
            ("g3_major_major", [f"powerlaw_{k}" for k in PL]),
            ("g4_competition", [f"in_powerlaw_{k}" for k in PL]),
        ]
    )
    blocks["gn"] = glob(
        [
            (
                n,
                [
                    "gn_nodes",
                    "gn_best_k",
                    "gn_best_modularity",
                    "louvain_unweighted_communities",
                    "louvain_unweighted_modularity",
                    "louvain_communities",
                    "modularity_louvain",
                    "gn_seconds",
                ],
            )
            for n in ("g2_uni_uni", "g3_major_major")
        ]
    )
    blocks["spearman"] = glob(
        [
            (
                "g4_competition",
                [
                    "nodes",
                    "edges",
                    "spearman_authority_vs_avg_score",
                    "spearman_pagerank_vs_avg_score",
                ],
            )
        ]
    )
    # Bang day du summary theo mang
    for n in ALL:
        cols = [
            k
            for k in summ.columns
            if k not in ("network", "year")
            and not all(pd.isna(getattr(S[(n, y)], k)) for y in YEARS)
        ]
        rows = []
        for k in cols:
            vals = [getattr(S[(n, y)], k) for y in YEARS]
            d = 0 if all(float(v).is_integer() for v in vals if not pd.isna(v)) else 4
            rows.append([f"{label(k)} (`{k}`)", *[vn(float(v), d) for v in vals]])
        blocks[f"full_{n}"] = table(["Chỉ tiêu (cột)", *map(str, YEARS)], rows)
    # Cong dong 2026
    for n in ("g2_uni_uni", "g3_major_major"):
        m = M[(n, 2026)]
        rows = []
        for cid, grp in m.groupby("community"):
            best = grp.sort_values("degree", ascending=False, kind="mergesort")
            best = best.loc[sorted(best.index, key=lambda i: (-best.loc[i, "degree"], i))][:4]
            rows.append(
                [int(cid) + 1, len(grp), "; ".join(name(i).rsplit(" (", 1)[0] for i in best.index)]
            )
        blocks[f"comm_{n}"] = table(["Cộng đồng", "Số đỉnh", "Bốn đỉnh bậc cao nhất"], rows)
    # Authority theo nhom diem va cap truong-nganh G4
    rows, pairs = {}, {}
    bins = [
        (-1, 17, "≤ 17"),
        (17, 19, "(17; 19]"),
        (19, 21, "(19; 21]"),
        (21, 23, "(21; 23]"),
        (23, 25, "(23; 25]"),
        (25, 99, "> 25"),
    ]
    for y in YEARS:
        a = adm[adm.year == y]
        thpt = a[(a.method == "THPT") & (a.scale_max == 30)]
        avg = thpt.groupby("uni_code").score.mean()
        m = M[("g4_competition", y)]
        auth = {i[2:]: v for i, v in m.authority.items()}
        for lo, hi, lab in bins:
            sel = [u for u, s in avg.items() if lo < s <= hi and u in auth]
            mean = sum(auth[u] for u in sel) / len(sel) if sel else 0
            rows.setdefault(lab, []).append(f"{len(sel)} / {vn(mean, 5)}")
        best = thpt[thpt.flag == ""].groupby(["uni_code", "major_code"]).score.max()
        pairs.setdefault("Cặp trường–ngành (THPT 30, không cờ, điểm cao nhất)", []).append(
            vn(len(best), 0)
        )
        pairs.setdefault("Cặp đúng 15 điểm", []).append(vn(int((best == 15).sum()), 0))
        pairs.setdefault("Cặp ≤ 16 điểm", []).append(vn(int((best <= 16).sum()), 0))
        pairs.setdefault("Trường có điểm THPT 30 (trước lọc cờ, bỏ cô lập)", []).append(
            vn(thpt.uni_code.nunique(), 0)
        )
    blocks["auth_bins"] = table(
        ["Nhóm điểm TB", *map(str, YEARS)], [[k, *v] for k, v in rows.items()]
    )
    blocks["g4_pairs"] = table(["Chỉ tiêu", *map(str, YEARS)], [[k, *v] for k, v in pairs.items()])
    # Adamic-Adar top 10
    lp = pd.read_csv(NET / "metrics" / "link_prediction_2026.csv").head(10)
    blocks["aa_top"] = table(
        ["Hạng", "Ngành A", "Ngành B", "AA"],
        [
            [i + 1, r.nganh_a, r.nganh_b, vn(r.adamic_adar)]
            for i, r in enumerate(lp.itertuples(index=False))
        ],
    )
    # Do hot
    h = web.hot_index()
    blocks["hot"] = table(
        ["Thành phần", "Kết quả"],
        [
            ["Ngành trong tập so sánh tăng bậc G1 (2024 ∪ 2026)", vn(len(h["growth"]), 0)],
            ["Nhãn “Ngành hot 2026” (10% cao nhất)", vn(len(h["hot_majors"]), 0)],
            [
                "Khóa (trường, chương trình, phương thức, thang) đủ 2025 và 2026",
                vn(len(h["trend"]), 0),
            ],
        ],
    )
    text = "\n\n".join(f"<!-- T:{k} -->\n{v}" for k, v in blocks.items()) + "\n"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(text, encoding="utf-8")
    print(f"{len(blocks)} bảng -> {out_path}")


if __name__ == "__main__":
    main()
