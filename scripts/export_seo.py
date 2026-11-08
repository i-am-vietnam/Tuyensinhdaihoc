"""Sinh trang tĩnh cho SEO: /truong/<slug>-<mã>/, /nganh/<slug>-<mã>/, hai trang danh sách,
site/data/seo_pages.json (để app.js nối link) và site/sitemap.xml. Không ghi vào DB.

Run riêng: .venv/Scripts/python.exe scripts/export_seo.py
(scripts/export_static.py gọi export() ở cuối mỗi lần xuất.)
URL ổn định nhờ data/manual/seo_slugs.csv: lần đầu tự sinh, sau đó chỉ thêm dòng mới.
"""

from __future__ import annotations

import csv
import html
import json
import re
import shutil
import statistics
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from webapp import main as api  # noqa: E402

SITE = ROOT / "site"
SLUGS = ROOT / "data" / "manual" / "seo_slugs.csv"
BASE = "https://diemthidaihoc.com/"
BRAND = "Tuyển Sinh Đại Học"
CSS = "style.css?v=seo-20261108"
MOS_LASTMOD = "2026-11-08"  # trang tĩnh viết tay, không phụ thuộc dữ liệu
MIN_PAIRS = 5  # trường có ít hơn 5 cặp (chương trình, phương thức): noindex, không vào sitemap
MIN_UNIS = 2  # ngành chỉ có 1 trường: không tạo trang riêng, link tới bảng trong trang trường
SKIP_FLAGS = ("outlier", "diem_thap_bat_thuong")  # cùng tiêu chí với tab Tư vấn
PT = {
    "CLC": "CLC",
    "TIEN_TIEN": "Tiên tiến",
    "LIEN_KET": "Liên kết",
    "TIENG_ANH": "Tiếng Anh",
    "PHAN_HIEU": "Phân hiệu",
    "TAI_NANG": "Tài năng",
}
# Lĩnh vực đào tạo (3 số đầu của mã ngành, danh mục Bộ GD&ĐT)
FIELDS = {
    "714": "Khoa học giáo dục và đào tạo giáo viên",
    "721": "Nghệ thuật",
    "722": "Nhân văn",
    "731": "Khoa học xã hội và hành vi",
    "732": "Báo chí và thông tin",
    "734": "Kinh doanh và quản lý",
    "738": "Pháp luật",
    "742": "Khoa học sự sống",
    "744": "Khoa học tự nhiên",
    "746": "Toán và thống kê",
    "748": "Máy tính và công nghệ thông tin",
    "751": "Công nghệ kỹ thuật",
    "752": "Kỹ thuật",
    "754": "Sản xuất và chế biến",
    "758": "Kiến trúc và xây dựng",
    "762": "Nông, lâm nghiệp và thủy sản",
    "764": "Thú y",
    "772": "Sức khỏe",
    "776": "Dịch vụ xã hội",
    "781": "Du lịch, khách sạn, thể thao và dịch vụ cá nhân",
    "784": "Dịch vụ vận tải",
    "785": "Môi trường và bảo vệ môi trường",
    "786": "An ninh, quốc phòng",
}
OTHER = "khac"  # mã có 3 số đầu ngoài danh mục (700, 730, 780, 790…): nhóm "Ngành khác", cuối trang


def field_of(code: str) -> str:
    return code[:3] if code[:3] in FIELDS else OTHER


def field_name(f: str) -> str:
    return FIELDS.get(f, "Ngành khác")


def esc(s) -> str:
    return html.escape("" if s is None else str(s), quote=True)


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFD", s.replace("đ", "d").replace("Đ", "D"))
    s = "".join(ch for ch in s if not unicodedata.combining(ch)).lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def fmt(x) -> str:
    """Số kiểu vi-VN như app.js: 1.200 · 28,75 · 25."""
    if x is None:
        return ""
    s = f"{x:,.2f}".rstrip("0").rstrip(".")
    return s.replace(",", "_").replace(".", ",").replace("_", ".")


def vi_date(iso: str) -> str:
    y, m, d = iso[:10].split("-")
    return f"{d}/{m}/{y}"


def span(years) -> str:
    ys = sorted(years)
    return f"{ys[0]}–{ys[-1]}" if len(ys) > 1 else str(ys[0])


def cut(s: str, n: int = 160) -> str:
    return s if len(s) <= n else s[: s.rfind(" ", 0, n - 1)].rstrip(",;:") + "…"


def sort_key(s: str) -> str:
    return api.unaccent(s)


class Slugs:
    """data/manual/seo_slugs.csv (kind,code,slug): dòng đã có không bao giờ bị sửa."""

    def __init__(self):
        self.rows: dict[tuple[str, str], str] = {}
        if SLUGS.exists():
            with SLUGS.open(encoding="utf-8", newline="") as f:
                for r in csv.DictReader(f):
                    self.rows[(r["kind"], r["code"])] = r["slug"]
        self.added = 0

    def get(self, kind: str, code: str, text: str) -> str:
        key = (kind, code)
        if key not in self.rows:
            base = f"{slugify(text) or kind}-{code.lower()}"
            used = {s for (k, _), s in self.rows.items() if k == kind}
            slug, i = base, 2
            while slug in used:
                slug, i = f"{base}-{i}", i + 1
            self.rows[key] = slug
            self.added += 1
        return self.rows[key]

    def save(self):
        if not self.added:
            return
        SLUGS.parent.mkdir(parents=True, exist_ok=True)
        with SLUGS.open("w", encoding="utf-8", newline="") as f:
            w = csv.writer(f, lineterminator="\n")
            w.writerow(["kind", "code", "slug"])
            for (kind, code), slug in sorted(self.rows.items()):
                w.writerow([kind, code, slug])


# ---------- khung trang ----------


def jsonld(data: dict) -> str:
    text = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return f'<script type="application/ld+json">{text}</script>'


def breadcrumb_ld(crumbs: list[tuple[str, str]]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": name, "item": BASE + path}
            for i, (name, path) in enumerate(crumbs)
        ],
    }


def nav(prefix: str, active: str) -> str:
    links = [
        (f"{prefix}#uni", "Theo trường", ""),
        (f"{prefix}#major", "Theo ngành", ""),
        (f"{prefix}#advice", "Tư vấn theo điểm", ""),
        (f"{prefix}#network", "Mạng SNA", ""),
        (f"{prefix}#coverage", "Độ phủ dữ liệu", ""),
        (f"{prefix}truong/", "DS Trường", "truong"),
        (f"{prefix}nganh/", "DS Ngành", "nganh"),
        (f"{prefix}mos.html", "Thi MOS", "mos"),
    ]
    out = []
    for href, label, key in links:
        cls = ["nav-mos"] if key == "mos" else []
        cur = ""
        if key and key == active:
            cls.append("active")
            cur = ' aria-current="page"'
        c = f' class="{" ".join(cls)}"' if cls else ""
        out.append(f'      <a href="{href}"{c}{cur}>{label}</a>')
    return "\n".join(out)


def page(
    path: str,
    title: str,
    desc: str,
    crumbs: list[tuple[str, str]],
    body: str,
    active: str,
    updated: str,
    sources: str,
    ld: list[dict],
    noindex: bool = False,
) -> str:
    """path: đường dẫn tính từ gốc site, ví dụ 'truong/abc-bka/'. Mọi link nội bộ đều tương đối."""
    prefix = "../" * path.count("/")
    url = BASE + path
    crumb_html = (
        "".join(f'<li><a href="{prefix}{p}">{esc(n)}</a></li>' for n, p in crumbs[:-1])
        + f'<li aria-current="page">{esc(crumbs[-1][0])}</li>'
    )
    robots = '<meta name="robots" content="noindex, follow">\n' if noindex else ""
    return f"""<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
{robots}<link rel="canonical" href="{url}">
<link rel="icon" type="image/svg+xml" href="{prefix}favicon.svg">
<meta name="theme-color" content="#1e40af">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:locale" content="vi_VN">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{prefix}{CSS}">
{"".join(jsonld(x) for x in ld)}
</head>
<body class="page-seo">
<a class="skip-link" href="#main">Đến nội dung chính</a>
<header class="top">
  <div class="wrap top-row">
    <a class="brand" href="{prefix or "./"}" aria-label="{BRAND} — trang chủ"><span class="dot"></span>{BRAND}</a>
    <nav class="tabs" aria-label="Điều hướng chính">
{nav(prefix, active)}
    </nav>
  </div>
</header>
<main id="main" class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><ol>{crumb_html}</ol></nav>
{body}
<p class="seo-updated muted small">Dữ liệu cập nhật ngày {vi_date(updated)}. {sources}
Luôn đối chiếu với thông báo chính thức của trường.</p>
</main>
<footer class="site-footer">
  <div class="wrap">
    <p class="foot-brand">{BRAND}</p>
    <p>Dữ liệu tổng hợp từ <a href="https://diemthi.tuyensinh247.com" target="_blank" rel="noopener">diemthi.tuyensinh247.com (tuyensinh247)</a>; xếp hạng trường theo <a href="https://vnur.vn/bang-xep-hang/" target="_blank" rel="noopener">VNUR 2026</a>. Dùng cho mục đích học tập phi thương mại (đồ án môn SNA).</p>
    <p>&copy; 2026 {BRAND} · <a href="{prefix or "./"}">Tra cứu điểm chuẩn</a> · <a href="{prefix}truong/">Danh sách trường</a> · <a href="{prefix}nganh/">Danh sách ngành</a> · <a href="{prefix}mos.html">Tài liệu luyện thi MOS</a></p>
  </div>
</footer>
</body>
</html>
"""


# ---------- bảng điểm theo phương thức ----------


def latest(t: dict):
    for y in sorted(t["years"], reverse=True):
        if t["years"][y]:
            return max(t["years"][y])
    return None


def cells(t: dict, years: list[int]) -> str:
    out = []
    for y in years:
        v = t["years"].get(y)
        if not v:
            text = "—"
        elif len(v) == 1:
            text = fmt(next(iter(v)))
        else:  # nhiều mức điểm trong năm (theo tổ hợp, đối tượng...): hiện khoảng thấp–cao
            text = (
                f'<span title="{len(v)} mức điểm trong năm {y}">{fmt(min(v))}–{fmt(max(v))}</span>'
            )
        out.append(f'<td class="num">{text}</td>')
    return "".join(out)


def method_sections(rows, keyf, head: str, row_html, sortf, years, method_names) -> str:
    by_m = defaultdict(list)
    for r in rows:
        by_m[r["method"]].append(r)
    if not by_m:
        return '<p class="muted">Chưa có dữ liệu điểm chuẩn.</p>'
    open_m = "THPT" if "THPT" in by_m else max(by_m, key=lambda m: len(by_m[m]))
    out = []
    for m in sorted(by_m, key=api.method_sort):
        table: dict = {}
        for r in by_m[m]:
            t = table.setdefault(
                keyf(r),
                {
                    "r": r,
                    "years": defaultdict(set),
                    "combos": defaultdict(set),
                    "notes": defaultdict(set),
                },
            )
            if r["year"] > t["r"]["year"]:
                t["r"] = r  # tên/loại chương trình theo năm mới nhất
            t["combos"][r["year"]].update(c for c in (r["combos"] or "").split(";") if c)
            if r["note"]:
                t["notes"][r["year"]].add(r["note"])
            if r["score"] is not None:
                t["years"][r["year"]].add(r["score"])
        scales = Counter(r["scale_max"] for r in by_m[m] if r["scale_max"])
        main_scale = scales.most_common(1)[0][0] if scales else None
        items = sorted(table.values(), key=lambda t: sortf(t, main_scale))
        sub = f"thang {fmt(main_scale)} · {len(items)} dòng" if main_scale else f"{len(items)} dòng"
        year_th = "".join(f'<th class="num">{y}</th>' for y in years)
        body = "".join(row_html(t, main_scale) for t in items)
        out.append(
            f'<details class="seo-method" id="pt-{m.lower()}"{" open" if m == open_m else ""}>'
            f"<summary>{esc(method_names.get(m, m))}"
            f'<span class="sub"> · {sub}</span>'
            f'</summary><div class="tbl-wrap"><table class="seo-table"><thead><tr>{head}{year_th}'
            f"</tr></thead><tbody>{body}</tbody></table></div></details>"
        )
    return "\n".join(out)


def scale_note(r: dict, main_scale) -> str:
    s = r["scale_max"]
    return f' <span class="sub">thang {fmt(s)}</span>' if s and s != main_scale else ""


def combos(t: dict) -> str:
    return esc(", ".join(sorted(t["combos"][t["r"]["year"]])))


def notes(t: dict) -> str:
    ns = sorted(t["notes"][t["r"]["year"]])
    text = "; ".join(ns[:2]) + (f" (+{len(ns) - 2})" if len(ns) > 2 else "")
    return f'<span class="eq">{esc(cut(text, 140))}</span>' if ns else ""


# ---------- học phí, đề án (cùng nội dung với thẻ trong app.js) ----------

SOURCE_TYPES = {
    "official": "Trang/đề án chính thức của trường",
    "press": "Báo chí",
    "aggregator": "Trang tổng hợp",
}
EVIDENCE = {
    "official": "Chính thức",
    "official_archived": "Văn bản chính thức (bản lưu)",
    "secondary": "Tham khảo",
    "unverified": "Chưa xác minh",
}


def host(u: str) -> str:
    m = re.match(r"https?://(?:www\.)?([^/]+)", u or "")
    return m.group(1) if m else "nguồn"


def ext_link(u: str, text: str) -> str:
    return f'<a href="{esc(u)}" target="_blank" rel="noopener noreferrer">{esc(text)}</a>'


def tuition_html(t, x) -> str:
    if x:
        return tuition_extra_html(x)
    if not t:
        return '<section class="card tuition-card"><h2>Học phí</h2><p class="muted">Chưa có thông tin học phí</p></section>'
    free = t["min_mil"] == 0 and t["max_mil"] == 0
    one = t["max_mil"] is None or t["max_mil"] == t["min_mil"]
    amount = (
        "Miễn học phí"
        if free
        else ("Từ " if t["max_mil"] is None else "")
        + (fmt(t["min_mil"]) if one else f"{fmt(t['min_mil'])}–{fmt(t['max_mil'])}")
        + " <span>triệu đồng/năm</span>"
    )
    extra = ""
    if free:
        extra = (
            '<p class="muted small">Theo quy định chung đối với học viên hệ quân sự/công an.</p>'
        )
    else:
        if t["text"]:
            extra += f"<p>{esc(t['text'])}</p>"
        if t["unit_note"]:
            extra += f'<p class="muted small">{esc(t["unit_note"])}</p>'
    src_text = f"{SOURCE_TYPES.get(t['source_type'], 'Nguồn')} ({host(t['source_url'])})"
    return (
        f'<section class="card tuition-card"><div class="head"><h2>Học phí</h2>'
        f'<span class="muted small">Năm học {t["year"]}–{t["year"] + 1}</span></div>'
        f'<p class="tuition-range">{amount}</p>{extra}'
        f'<p class="muted small">Nguồn: {ext_link(t["source_url"], src_text)}</p></section>'
    )


def tuition_extra_html(x: dict) -> str:
    year = x["school_year"]
    label = f"Năm học {year}" if re.fullmatch(r"\d{4}–\d{4}", year or "") else year
    label_html = f'<span class="muted small">{esc(label)}</span>' if label else ""
    head = (
        f'<div class="head"><h2>Học phí</h2><span class="tuition-meta">'
        f'<span class="src-tag ev-{esc(x["evidence"])}">{EVIDENCE.get(x["evidence"], "")}</span>'
        f"{label_html}</span></div>"
    )
    links = " · ".join(ext_link(u, host(u)) for u in x["sources"][:3])
    if x["evidence"] == "unverified":
        src_html = f'<p class="small">Nguồn: {links}</p>' if links else ""
        return (
            f'<section class="card tuition-card">{head}<p>Chưa có mức học phí được xác minh</p>'
            f"{src_html}</section>"
        )
    items = "".join(
        f'<tr><td>{esc(i["name"])}</td><td class="num">{esc(i["amount"])} {esc(i["unit"])}</td></tr>'
        for i in x["items"]
    )
    items = (
        f'<div class="fact-group"><h4>Theo ngành</h4><table class="tuition-items"><tbody>{items}</tbody></table></div>'
        if items
        else ""
    )
    cls = "tuition-range" if len(x["summary"]) <= 60 else "tuition-summary"
    scope = (
        f'<p class="muted small">Phạm vi: {esc(x["scope"])}</p>'
        if x.get("scope") and x["scope"] != year
        else ""
    )
    note = f'<p class="muted small">{esc(x["note"])}</p>' if x.get("note") else ""
    return (
        f'<section class="card tuition-card">{head}<p class="{cls}">{esc(x["summary"])}</p>'
        f'{scope}{items}{note}<p class="muted small">Nguồn: {links}</p></section>'
    )


def dean_html(plan) -> str:
    if not plan:
        return ""
    parts = [f'<section class="card dean-block"><h2>Đề án tuyển sinh {plan["year"] or ""}</h2>']
    if plan["quota"]:
        lis = "".join(f"<li>{esc(q)}</li>" for q in plan["quota"])
        parts.append(f'<div class="fact-group"><h4>Chỉ tiêu</h4><ul>{lis}</ul></div>')
    if plan["methods"]:
        lis = "".join(f"<li>{esc(m['name'])}</li>" for m in plan["methods"])
        parts.append(f'<div class="fact-group"><h4>Phương thức xét tuyển</h4><ul>{lis}</ul></div>')
    if plan["timeline"]:
        trs = "".join(
            f'<tr><td class="num">{esc(t["date"])}</td><td>{esc(t["event"])}</td></tr>'
            for t in plan["timeline"]
        )
        parts.append(
            f'<div class="fact-group"><h4>Mốc thời gian</h4><table class="timeline"><tbody>{trs}</tbody></table></div>'
        )
    parts.append(
        f'<p class="dean-source muted small">Nguồn dữ kiện: {ext_link(plan["source_url"], "HOCMAI")}'
        f", năm {esc(plan['year'] or '')}</p></section>"
    )
    return "".join(parts)


# ---------- dữ liệu ----------


def load():
    c = api.con()
    unis = {
        r["uni_code"]: api.university_info(dict(r)) for r in c.execute("SELECT * FROM universities")
    }
    majors = {r["major_code"]: dict(r) for r in c.execute("SELECT * FROM majors")}
    rows = [
        dict(r)
        for r in c.execute(
            "SELECT uni_code, year, method, method_name, program_code, major_code, program_name, "
            "program_type, combos, score, scale_max, note, source_url FROM admissions "
            f"WHERE flag NOT IN ({','.join('?' * len(SKIP_FLAGS))})",
            SKIP_FLAGS,
        )
    ]
    tuition = {}
    try:
        for r in c.execute("SELECT * FROM tuition ORDER BY uni_code, year"):
            tuition[r["uni_code"]] = dict(r)  # năm học mới nhất, như /api/universities
    except Exception:
        pass
    c.close()
    return unis, majors, rows, tuition


def export(site: Path = SITE) -> dict:
    unis, majors, rows, tuition = load()
    extra = api.tuition_extra_index()
    years = sorted({r["year"] for r in rows})
    method_names = {}
    for m in api.meta()["methods"]:
        method_names.setdefault(m["method"], m["method_name"])
    by_uni, by_major = defaultdict(list), defaultdict(list)
    for r in rows:
        by_uni[r["uni_code"]].append(r)
        if r["major_code"]:
            by_major[r["major_code"]].append(r)
    major_unis = {m: {r["uni_code"] for r in rs} for m, rs in by_major.items()}
    slugs = Slugs()
    uni_path = {
        u: f"truong/{slugs.get('truong', u, unis[u]['alias'] or unis[u]['name'])}/" for u in unis
    }
    major_page = {
        m: f"nganh/{slugs.get('nganh', m, majors[m]['major_name'])}/"
        for m in majors
        if len(major_unis.get(m, ())) >= MIN_UNIS
    }
    # ngành 1 trường: link thẳng tới mục ngành trong trang trường
    major_link = dict(major_page)
    for m, us in major_unis.items():
        if m not in major_page and m in majors:
            major_link[m] = f"{uni_path[next(iter(us))]}#nganh-{m}"
    sim_file = api.NETWORK_DIR / f"similar_majors_{years[-1]}.json"
    similar = json.loads(sim_file.read_text(encoding="utf-8")) if sim_file.exists() else {}

    for d in ("truong", "nganh"):
        if (site / d).exists():
            shutil.rmtree(site / d)
    sitemap: list[tuple[str, str]] = []
    noindex: list[str] = []
    sizes = Counter()

    def write(path: str, text: str, lastmod: str, index: bool = True):
        target = site / path / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")
        sizes[path.split("/")[0]] += len(text.encode("utf-8"))
        if index:
            sitemap.append((path, lastmod))
        else:
            noindex.append(path)

    # ----- trang trường -----
    for u, info in unis.items():
        rs = by_uni.get(u, [])
        path = uni_path[u]
        prefix = "../../"
        uyears = sorted({r["year"] for r in rs}) or years
        pairs = {(r["program_code"], r["method"]) for r in rs}
        methods = sorted({r["method"] for r in rs}, key=api.method_sort)
        progs = {(r["program_code"], r["program_name"]) for r in rs}

        def uni_row(t, main_scale, prefix=prefix):
            r = t["r"]
            name = esc(r["program_name"])
            link = major_link.get(r["major_code"])
            if r["major_code"] in major_page:
                name = f'<a href="{prefix}{link}">{name}</a>'
            tag = (
                f'<span class="tag">{PT[r["program_type"]]}</span>'
                if r["program_type"] in PT
                else ""
            )
            return (
                f'<tr><td class="code">{esc(r["program_code"])}</td><td class="prog">{name}{tag}'
                f'{scale_note(r, main_scale)}{notes(t)}</td><td class="combo">{combos(t)}</td>'
                f"{cells(t, years)}</tr>"
            )

        tables = method_sections(
            rs,
            lambda r: (r["program_code"], r["scale_max"]),
            "<th>Mã</th><th>Ngành / chương trình</th><th>Tổ hợp</th>",
            uni_row,
            lambda t, s: (t["r"]["scale_max"] != s, t["r"]["program_code"]),
            years,
            method_names,
        )
        rank = info["vnur_rank"]
        if rank is None:
            rank_txt = "Chưa có trong bảng xếp hạng VNUR 2026."
        elif info["vnur_parent"]:
            rank_txt = f"Thuộc {esc(info['vnur_parent'])}, hạng Top {rank} VNUR 2026 (kế thừa hạng của đại học mẹ)."
        else:
            rank_txt = f"Hạng Top {rank} VNUR 2026."
        short = f"{esc(info['short_name'])}, " if info["short_name"] else ""
        mnames = ", ".join(method_names.get(m, m) for m in methods)
        lead = (
            f'<p class="seo-lead">{esc(info["name"])} ({short}mã trường {u}) · {esc(info["province"])}. '
            f"{rank_txt} Dữ liệu gồm {len(progs)} chương trình, {len(methods)} phương thức xét tuyển"
            f"{f' ({esc(mnames)})' if mnames else ''}, năm {', '.join(map(str, uyears))}.</p>"
        )
        thpt = [
            r["score"]
            for r in rs
            if r["method"] == "THPT"
            and r["year"] == uyears[-1]
            and r["scale_max"] == 30
            and r["score"] is not None
        ]
        thpt_txt = (
            f" Điểm thi THPT {uyears[-1]}: {fmt(min(thpt))}–{fmt(max(thpt))} điểm." if thpt else ""
        )
        mcodes = sorted(
            {r["major_code"] for r in rs if r["major_code"] in majors},
            key=lambda m: sort_key(majors[m]["major_name"]),
        )
        major_items = []
        for m in mcodes:
            ms = sorted(
                {r["method"] for r in by_uni[u] if r["major_code"] == m}, key=api.method_sort
            )
            nm = esc(majors[m]["major_name"])
            if m in major_page:
                nm = f'<a href="{prefix}{major_page[m]}">{nm}</a>'
            others = len(major_unis[m]) - 1
            info_txt = f"{m} · {', '.join(method_names.get(x, x) for x in ms)}"
            info_txt += (
                f" · thêm {others} trường khác" if others else " · chỉ trường này có trong dữ liệu"
            )
            major_items.append(
                f'<li id="nganh-{m}">{nm} <span class="sub">{esc(info_txt)}</span></li>'
            )
        majors_html = (
            f'<section class="card"><h2>Các ngành đào tạo có điểm chuẩn ({len(mcodes)})</h2><ul class="seo-list">{"".join(major_items)}</ul></section>'
            if major_items
            else ""
        )
        src = rs[0]["source_url"] if rs else None
        body = (
            f"<h1>Điểm chuẩn {esc(info['name'])} ({u}) {span(uyears)}</h1>{lead}"
            f'<p class="seo-actions"><a class="seo-cta" href="{prefix}#uni/{u}/{uyears[-1]}">Mở trong công cụ tra cứu</a></p>'
            f'<section class="seo-block"><h2>Điểm chuẩn theo phương thức xét tuyển</h2>'
            f'<p class="muted small">Bấm vào từng phương thức để xem bảng; bảng cuộn ngang được trên điện thoại. "—" là năm chưa có dữ liệu; "a–b" là năm có nhiều mức điểm (theo tổ hợp hoặc đối tượng).</p>{tables}</section>'
            f"{tuition_html(tuition.get(u), None if tuition.get(u) else extra.get(u))}"
            f"{dean_html(api.university_plan(u))}{majors_html}"
        )
        sources = (
            "Nguồn điểm chuẩn: "
            + (ext_link(src, "tuyensinh247") if src else "tuyensinh247")
            + "; xếp hạng: "
            + ext_link("https://vnur.vn/bang-xep-hang/", "VNUR 2026")
            + "."
        )
        title = f"Điểm chuẩn {info['name']} ({u}) {span(uyears)} | {BRAND}"
        desc = cut(
            f"Điểm chuẩn {info['name']} ({u}) {span(uyears)}: {len(progs)} chương trình, "
            f"{len(methods)} phương thức.{thpt_txt} Kèm học phí, đề án tuyển sinh."
        )
        crumbs = [("Trang chủ", ""), ("Trường", "truong/"), (info["name"], path)]
        org = {
            "@context": "https://schema.org",
            "@type": "CollegeOrUniversity",
            "name": info["name"],
            "url": BASE + path,
            "address": {
                "@type": "PostalAddress",
                "addressRegion": info["province"],
                "addressCountry": "VN",
            },
        }
        alt = [x for x in (info["short_name"], u) if x]
        if alt:
            org["alternateName"] = alt
        index = len(pairs) >= MIN_PAIRS
        write(
            path,
            page(
                path,
                title,
                desc,
                crumbs,
                body,
                "truong",
                info["updated_on"],
                sources,
                [breadcrumb_ld(crumbs), org],
                noindex=not index,
            ),
            info["updated_on"],
            index,
        )

    # ----- trang ngành -----
    for m, path in major_page.items():
        info, rs = majors[m], by_major[m]
        prefix = "../../"
        us = major_unis[m]
        myears = sorted({r["year"] for r in rs})
        updated = max(unis[u]["updated_on"] for u in us)

        def major_row(t, main_scale, prefix=prefix):
            r = t["r"]
            un = unis[r["uni_code"]]
            tag = (
                f'<span class="tag">{PT[r["program_type"]]}</span>'
                if r["program_type"] in PT
                else ""
            )
            return (
                f'<tr><td class="prog"><a href="{prefix}{uni_path[r["uni_code"]]}">{esc(un["name"])}</a> '
                f'<span class="sub">{r["uni_code"]}</span></td><td>{esc(un["province"])}</td>'
                f'<td class="prog">{esc(r["program_name"])}{tag}{scale_note(r, main_scale)}{notes(t)}</td>'
                f'<td class="combo">{combos(t)}</td>{cells(t, years)}</tr>'
            )

        tables = method_sections(
            rs,
            lambda r: (r["uni_code"], r["program_code"], r["scale_max"]),
            "<th>Trường</th><th>Tỉnh/thành</th><th>Chương trình</th><th>Tổ hợp</th>",
            major_row,
            lambda t, s: (t["r"]["scale_max"] != s, -(latest(t) or 0), t["r"]["uni_code"]),
            years,
            method_names,
        )
        stat_m = (
            "THPT"
            if any(r["method"] == "THPT" for r in rs)
            else Counter(r["method"] for r in rs).most_common(1)[0][0]
        )
        sy = max(r["year"] for r in rs if r["method"] == stat_m)
        sc = Counter(
            r["scale_max"]
            for r in rs
            if r["method"] == stat_m and r["year"] == sy and r["scale_max"]
        ).most_common(1)
        vals = [
            r["score"]
            for r in rs
            if r["method"] == stat_m
            and r["year"] == sy
            and sc
            and r["scale_max"] == sc[0][0]
            and r["score"] is not None
        ]
        stat_txt = ""
        if vals:
            stat_txt = (
                f" {method_names.get(stat_m, stat_m)} năm {sy} (thang {fmt(sc[0][0])}, {len(vals)} dòng): cao nhất "
                f"{fmt(max(vals))}, trung vị {fmt(statistics.median(vals))}, thấp nhất {fmt(min(vals))} điểm."
            )
        short_stat = (
            f" {'THPT' if stat_m == 'THPT' else method_names.get(stat_m, stat_m)} {sy}: "
            f"{fmt(min(vals))}–{fmt(max(vals))} điểm."
            if vals
            else ""
        )
        field = (
            f"lĩnh vực {FIELDS[m[:3]]}"
            if m[:3] in FIELDS
            else "mã ngoài các lĩnh vực của danh mục Bộ GD&ĐT"
        )
        lead = (
            f'<p class="seo-lead">Ngành {esc(info["major_name"])} (mã {m}, {esc(field)}) có {len(us)} trường '
            f"xét tuyển trong dữ liệu năm {', '.join(map(str, myears))}.{esc(stat_txt)}</p>"
        )
        rel = [(c2, n2) for c2, n2, _ in similar.get(m, []) if c2 in major_page][:8]
        rel_items = "".join(
            f'<li><a href="{prefix}{major_page[c2]}">{esc(n2)}</a> <span class="sub">{c2}</span></li>'
            for c2, n2 in rel
        )
        rel_html = (
            '<section class="card"><h2>Ngành liên quan</h2><p class="muted small">Theo mạng SNA '
            "Ngành–Ngành (G3): hai ngành gần nhau khi được nhiều trường cùng đào tạo.</p>"
            f'<ul class="seo-list">{rel_items}</ul></section>'
            if rel
            else ""
        )
        body = (
            f"<h1>Điểm chuẩn ngành {esc(info['major_name'])} ({m}) {span(myears)}</h1>{lead}"
            f'<p class="seo-actions"><a class="seo-cta" href="{prefix}#major/{m}/{myears[-1]}">Mở trong công cụ tra cứu</a></p>'
            f'<section class="seo-block"><h2>So sánh điểm chuẩn giữa các trường</h2>'
            f'<p class="muted small">Mỗi phương thức một bảng, xếp theo điểm năm gần nhất giảm dần; bảng cuộn ngang được trên điện thoại. "—" là năm chưa có dữ liệu; "a–b" là năm có nhiều mức điểm (theo tổ hợp hoặc đối tượng).</p>{tables}</section>{rel_html}'
        )
        sources = (
            "Nguồn điểm chuẩn: "
            + ext_link("https://diemthi.tuyensinh247.com", "tuyensinh247")
            + " (trang điểm chuẩn của từng trường)."
        )
        title = f"Điểm chuẩn ngành {info['major_name']} ({m}) {span(myears)} – {len(us)} trường | {BRAND}"
        desc = cut(
            f"Điểm chuẩn ngành {info['major_name']} ({m}) {span(myears)} tại {len(us)} trường.{short_stat} "
            "So sánh theo năm, phương thức xét tuyển."
        )
        crumbs = [("Trang chủ", ""), ("Ngành", "nganh/"), (info["major_name"], path)]
        listed = sorted(us, key=lambda u: sort_key(unis[u]["name"]))
        item_list = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": f"Trường xét tuyển ngành {info['major_name']}",
            "numberOfItems": len(listed),
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": i + 1,
                    "name": unis[u]["name"],
                    "url": BASE + uni_path[u],
                }
                for i, u in enumerate(listed)
            ],
        }
        write(
            path,
            page(
                path,
                title,
                desc,
                crumbs,
                body,
                "nganh",
                updated,
                sources,
                [breadcrumb_ld(crumbs), item_list],
            ),
            updated,
        )

    updated_all = max(u["updated_on"] for u in unis.values())
    src_all = (
        "Nguồn điểm chuẩn: "
        + ext_link("https://diemthi.tuyensinh247.com", "tuyensinh247")
        + "; xếp hạng: "
        + ext_link("https://vnur.vn/bang-xep-hang/", "VNUR 2026")
        + "."
    )

    # ----- danh sách trường -----
    by_prov = defaultdict(list)
    for u, info in unis.items():
        by_prov[info["province"]].append(u)
    provs = sorted(by_prov, key=sort_key)
    jump = "".join(
        f'<a class="chip" href="#tinh-{slugify(p)}">{esc(p)} ({len(by_prov[p])})</a>' for p in provs
    )
    groups = []
    for p in provs:
        lis = []
        for u in sorted(by_prov[p], key=lambda u: sort_key(unis[u]["name"])):
            info = unis[u]
            n = len({(r["program_code"], r["program_name"]) for r in by_uni.get(u, [])})
            rank = f" · Top {info['vnur_rank']} VNUR" if info["vnur_rank"] is not None else ""
            lis.append(
                f'<li><a href="../{uni_path[u]}">{esc(info["name"])}</a> <span class="sub">{u}{rank} · {n} chương trình</span></li>'
            )
        groups.append(
            f'<section class="seo-group" id="tinh-{slugify(p)}"><h2>{esc(p)}</h2><ul class="seo-list">{"".join(lis)}</ul></section>'
        )
    body = (
        f"<h1>Danh sách trường đại học và điểm chuẩn {span(years)}</h1>"
        f'<p class="seo-lead">{len(unis)} trường đại học, học viện ở {len(provs)} tỉnh/thành. Mỗi trang trường có điểm chuẩn từng ngành qua các năm theo phương thức xét tuyển, học phí và đề án tuyển sinh.</p>'
        f'<div class="chips seo-jump">{jump}</div>{"".join(groups)}'
    )
    crumbs = [("Trang chủ", ""), ("Trường", "truong/")]
    write(
        "truong/",
        page(
            "truong/",
            f"Danh sách {len(unis)} trường đại học, điểm chuẩn {span(years)} | {BRAND}",
            cut(
                f"Danh sách {len(unis)} trường đại học, học viện theo tỉnh/thành, kèm điểm chuẩn {span(years)} từng ngành, học phí và đề án tuyển sinh."
            ),
            crumbs,
            body,
            "truong",
            updated_all,
            src_all,
            [breadcrumb_ld(crumbs)],
        ),
        updated_all,
    )

    # ----- danh sách ngành -----
    by_field = defaultdict(list)
    for m in major_link:
        by_field[field_of(m)].append(m)
    fields = sorted(by_field, key=lambda f: (f == OTHER, f))
    jump = "".join(
        f'<a class="chip" href="#linh-vuc-{f}">{esc(field_name(f))} ({len(by_field[f])})</a>'
        for f in fields
    )
    groups = []
    for f in fields:
        lis = []
        for m in sorted(by_field[f], key=lambda m: sort_key(majors[m]["major_name"])):
            n = len(major_unis[m])
            if m in major_page:
                sub = f"{m} · {n} trường"
            else:
                sub = f"{m} · 1 trường: {unis[next(iter(major_unis[m]))]['name']}"
            lis.append(
                f'<li><a href="../{major_link[m]}">{esc(majors[m]["major_name"])}</a> <span class="sub">{esc(sub)}</span></li>'
            )
        groups.append(
            f'<section class="seo-group" id="linh-vuc-{f}"><h2>{esc(field_name(f))}</h2><ul class="seo-list">{"".join(lis)}</ul></section>'
        )
    body = (
        f"<h1>Danh sách ngành đại học và điểm chuẩn {span(years)}</h1>"
        f'<p class="seo-lead">{len(major_link)} ngành theo mã Bộ GD&amp;ĐT, nhóm theo lĩnh vực. {len(major_page)} ngành có trang so sánh điểm chuẩn giữa các trường; ngành chỉ có một trường trong dữ liệu dẫn thẳng tới trang của trường đó.</p>'
        f'<div class="chips seo-jump">{jump}</div>{"".join(groups)}'
    )
    crumbs = [("Trang chủ", ""), ("Ngành", "nganh/")]
    write(
        "nganh/",
        page(
            "nganh/",
            f"Danh sách {len(major_link)} ngành đại học, điểm chuẩn {span(years)} | {BRAND}",
            cut(
                f"Danh sách {len(major_link)} ngành đại học theo lĩnh vực, so sánh điểm chuẩn {span(years)} giữa các trường theo phương thức xét tuyển."
            ),
            crumbs,
            body,
            "nganh",
            updated_all,
            src_all,
            [breadcrumb_ld(crumbs)],
        ),
        updated_all,
    )

    # ----- seo_pages.json cho app.js, sitemap.xml -----
    (site / "data").mkdir(parents=True, exist_ok=True)
    (site / "data" / "seo_pages.json").write_text(
        json.dumps(
            {"uni": uni_path, "major": major_link}, ensure_ascii=False, separators=(",", ":")
        ),
        encoding="utf-8",
    )
    head = [("", updated_all), ("mos.html", MOS_LASTMOD)]
    urls = head + sorted(sitemap, key=lambda x: (x[0].count("/"), x[0]))
    xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    xml += [
        f"  <url>\n    <loc>{BASE}{p}</loc>\n    <lastmod>{d}</lastmod>\n  </url>" for p, d in urls
    ]
    xml.append("</urlset>\n")
    (site / "sitemap.xml").write_text("\n".join(xml), encoding="utf-8")
    slugs.save()
    stats = {
        "uni_pages": len(unis),
        "major_pages": len(major_page),
        "noindex": len(noindex),
        "sitemap_urls": len(urls),
        "bytes": dict(sizes),
        "new_slugs": slugs.added,
    }
    print(f"SEO pages: {stats}", flush=True)
    return stats


if __name__ == "__main__":
    export()
