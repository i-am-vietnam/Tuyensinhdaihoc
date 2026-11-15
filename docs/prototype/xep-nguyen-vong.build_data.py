import json
import sys

import numpy as np

site = sys.argv[1]
d = json.load(open(f"{site}/data/advice/THPT_2026.json"))
cols = d["columns"]
meta = json.load(open(f"{site}/data/meta.json"))
seo = json.load(open(f"{site}/data/seo_pages.json"))
Y = ("2024", "2025", "2026")


def arr(h):
    return [h.get(y) for y in Y]


# ---------- backtest & model ----------
A = []
one_year = []
for v in d["histories"].values():
    a, b, c = arr(v.get("", {}))
    if None not in (a, b, c):
        A.append((a, b, c))
    if b is not None and c is not None:
        one_year.append((b, c))
A = np.array(A)
one_year = np.array(one_year)
X = np.c_[np.ones(len(A)), A[:, 0], A[:, 1]]
co2, *_ = np.linalg.lstsq(X, A[:, 2], rcond=None)
X1 = np.c_[np.ones(len(one_year)), one_year[:, 0]]
co1, *_ = np.linalg.lstsq(X1, one_year[:, 1], rcond=None)
BL = 0.5


def pred2(a, b):
    return BL * (co2[0] + co2[1] * a + co2[2] * b) + (1 - BL) * b


def pred1(b):
    return BL * (co1[0] + co1[1] * b) + (1 - BL) * b


r2 = A[:, 2] - pred2(A[:, 0], A[:, 1])
vol = np.abs(A[:, 1] - A[:, 0])
r1 = one_year[:, 1] - pred1(one_year[:, 0])
Q = np.linspace(0, 100, 41)
BINS = [[0, 0.5], [0.5, 1.5], [1.5, 99]]
model = {
    "blend": BL,
    "co2": co2.round(4).tolist(),
    "co1": co1.round(4).tolist(),
    "bins": BINS,
    "q2": [np.percentile(r2[(vol >= lo) & (vol < hi)], Q).round(3).tolist() for lo, hi in BINS],
    "n2": [int(((vol >= lo) & (vol < hi)).sum()) for lo, hi in BINS],
    "q1": np.percentile(r1, Q).round(3).tolist(),
    "n1": len(one_year),
    "n3": len(A),
    "mae2": float(np.abs(r2).mean().round(3)),
    "mae1": float(np.abs(r1).mean().round(3)),
    "mae_last": float(np.abs(A[:, 2] - A[:, 1]).mean().round(3)),
}
# calibration check: fraction cut<=pred+quantile => trivially in-sample; also split-half check
rng = np.random.default_rng(0)
idx = rng.permutation(len(A))
h = len(A) // 2
tr, te = idx[:h], idx[h:]
cal = []
for p in (0.2, 0.4, 0.6, 0.75, 0.9):
    ok = 0
    n = 0
    for lo, hi in BINS:
        mtr = tr[(vol[tr] >= lo) & (vol[tr] < hi)]
        mte = te[(vol[te] >= lo) & (vol[te] < hi)]
        thr = np.percentile(r2[mtr], p * 100)
        ok += (r2[mte] <= thr).sum()
        n += len(mte)
    cal.append([p, round(ok / n, 3)])
model["calib"] = cal
print(
    json.dumps(
        {k: model[k] for k in ("co2", "co1", "n2", "n1", "n3", "mae2", "mae1", "mae_last", "calib")}
    ),
    file=sys.stderr,
)
# ---------- programs ----------
progs = {}
unis = {}
for r in d["rows"]:
    x = dict(zip(cols, r[:-1]))
    cb = r[-1]
    if x["scale_max"] != 30:
        continue
    k = (x["uni_code"], x["program_code"])
    p = progs.setdefault(
        k,
        {
            "u": x["uni_code"],
            "c": x["program_code"],
            "n": x["program_name"],
            "t": "" if x["program_type"] == "CHUAN" else x["program_type"],
            "m": x["major_code"] or "",
            "cb": [],
        },
    )
    for c in cb:
        if c not in p["cb"]:
            p["cb"].append(c)
    if x["uni_code"] not in unis:
        unis[x["uni_code"]] = [
            x["short_name"] or x["uni_code"],
            x["uni_name"],
            x["vnur_rank"],
            seo["uni"].get(x["uni_code"], ""),
        ]
out = []
for (u, c), p in progs.items():
    hk = json.dumps([u, c], ensure_ascii=False, separators=(",", ":"))
    H = d["histories"].get(hk, {})
    base = arr(H.get("", {}))
    if base[2] is None:
        continue
    ov = {}
    for cbn, hh in H.items():
        if cbn and cbn in p["cb"]:
            a = arr(hh)
            if a != base and a[2] is not None:
                ov[cbn] = a
    out.append([u, c, p["n"], p["t"], p["m"], p["cb"], base, ov])
print(len(out), "programs", len(unis), "unis", file=sys.stderr)
json.dump(
    {"model": model, "p": out, "u": unis, "cbt": meta.get("combo_subjects", {})},
    open("/home/claude/nv/data.json", "w"),
    ensure_ascii=False,
    separators=(",", ":"),
)
