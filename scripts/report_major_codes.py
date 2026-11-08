"""Kiểm tra chất lượng mã ngành (chỉ đọc DB, không sửa dữ liệu) -> docs/kiem_tra_ma_nganh.md.

Run: .venv/Scripts/python.exe scripts/report_major_codes.py
"""

from __future__ import annotations

import re
import sqlite3
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.export_seo import FIELDS  # noqa: E402

DB = ROOT / "data" / "eduradar.db"
OUT = ROOT / "docs" / "kiem_tra_ma_nganh.md"
# Từ không mang nghĩa ngành khi so tên chương trình với tên ngành chuẩn
STOP = set(
    "nganh chuyen chuong trinh va cua cac voi tai hoc ky su cu nhan dao tao tieng anh chat luong "
    "cao clc tien tien lien ket nam nu mien bac thi sinh hop tac quoc te dinh huong song chon "
    "viet".split()
)
AUTO = {"ten_khop", "ten_gan_dung", "dau_ten_chuan", "chua_ten_chuan"}
HOW = {
    "ma_7_so": "mã 7 số do nguồn ghi",
    "ten_khop": "tự động: tên khớp",
    "ten_gan_dung": "tự động: tên gần đúng",
    "dau_ten_chuan": "tự động: đầu tên khớp",
    "chua_ten_chuan": "tự động: chứa tên chuẩn",
    "thu_cong": "thủ công (major_map.csv)",
    "thu_cong_bo": "thủ công (danh mục Bộ)",
}


def unaccent(s: str) -> str:
    s = unicodedata.normalize("NFD", (s or "").replace("đ", "d").replace("Đ", "D"))
    return re.sub(r"[^a-z0-9 ]", " ", "".join(c for c in s if not unicodedata.combining(c)).lower())


def toks(s: str) -> set[str]:
    return {t for t in unaccent(re.sub(r"\(.*?\)", " ", s or "")).split() if t not in STOP}


def md(s) -> str:
    return str(s).replace("|", "\\|")


def main():
    c = sqlite3.connect(f"file:{DB.as_posix()}?mode=ro&immutable=1", uri=True)
    c.row_factory = sqlite3.Row
    majors = {r["major_code"]: r["major_name"] for r in c.execute("SELECT * FROM majors")}
    rows = [
        dict(r)
        for r in c.execute(
            "SELECT uni_code, year, program_name, major_code, match_how FROM admissions "
            "WHERE major_code IS NOT NULL AND major_code != ''"
        )
    ]
    total_rows = c.execute("SELECT COUNT(*) FROM admissions").fetchone()[0]
    by_code = defaultdict(list)
    for r in rows:
        by_code[r["major_code"]].append(r)

    # 1. Mã sai cấu trúc: 7 chữ số, bắt đầu bằng 7, 3 số đầu là một lĩnh vực trong danh mục
    name_to_codes = defaultdict(set)
    for code, name in majors.items():
        name_to_codes[unaccent(name).strip()].add(code)
    bad = []
    for code, name in sorted(majors.items()):
        if re.fullmatch(r"7\d{6}", code) and code[:3] in FIELDS:
            continue
        twins = sorted(
            x for x in name_to_codes[unaccent(name).strip()] if x != code and x[:3] in FIELDS
        )
        rs = by_code.get(code, [])
        unis = sorted({r["uni_code"] for r in rs})
        kind = (
            "sai lĩnh vực (gõ nhầm?)" if code[:3] in ("700", "730", "780") else "mã riêng/thí điểm"
        )
        bad.append((code, name, kind, len(rs), unis, twins))

    # 2. Tên ngành chuẩn trong bảng majors không giống tên danh mục (lấy từ tên chương trình)
    dirty = [
        (code, name)
        for code, name in sorted(majors.items())
        if re.search(r"\(|chuyên ngành|chương trình|đào tạo bằng|CTTT|\d", name, re.I)
    ]

    # 3. Tên chương trình khác hẳn tên ngành chuẩn (không chung từ có nghĩa nào)
    groups = defaultdict(lambda: {"n": 0, "how": Counter(), "years": set()})
    for r in rows:
        g = groups[(r["uni_code"], r["program_name"], r["major_code"])]
        g["n"] += 1
        g["how"][r["match_how"]] += 1
        g["years"].add(r["year"])
    zero, extended, noname = [], [], []
    for (u, p, m), g in groups.items():
        mt, pt = toks(majors[m]), toks(p)
        if not mt:
            continue
        how = g["how"].most_common(1)[0][0]
        item = (u, p, m, majors[m], g["n"], how)
        if re.fullmatch(r"[\d\s]+", p):
            noname.append(item)  # nguồn chỉ ghi mã, thiếu tên chương trình
            continue
        if not mt & pt:
            zero.append(item)
        elif mt <= pt and len(pt - mt) >= 3:
            extended.append(item)  # chứa tên ngành nhưng thêm nhiều từ (VD HVD Kinh tế giáo dục…)
    zero.sort(key=lambda x: (x[5] not in AUTO | {"thu_cong"}, -x[4], x[0]))
    extended.sort(key=lambda x: (-x[4], x[0]))
    review = [z for z in zero if z[5] != "ma_7_so"]
    source = [z for z in zero if z[5] == "ma_7_so"]

    # 4. Một mã, nhiều nghĩa giữa các trường (mã thí điểm dùng lại)
    shared = []
    for code, rs in by_code.items():
        names = defaultdict(set)
        for r in rs:
            names[r["uni_code"]].add(r["program_name"])
        if len(names) < 2:
            continue
        tok = {u: set().union(*(toks(n) for n in ns)) for u, ns in names.items()}
        us = sorted(tok)
        clash = [
            (a, b)
            for i, a in enumerate(us)
            for b in us[i + 1 :]
            if tok[a] and tok[b] and not tok[a] & tok[b]
        ]
        if clash and (code[3:5] == "90" or code[:3] not in FIELDS):
            shared.append((code, majors[code], {u: sorted(names[u])[0] for u in us}))

    n_zero_rows = sum(z[4] for z in zero)
    lines = [
        "# Kiểm tra chất lượng mã ngành",
        "",
        f"Ngày kiểm: {date.today():%d/%m/%Y}. Nguồn: `data/eduradar.db` (bảng `majors`, `admissions`). "
        "Chỉ báo cáo, chưa sửa dữ liệu. Tạo lại: `.venv\\Scripts\\python.exe scripts/report_major_codes.py`.",
        "",
        "## Tóm tắt",
        "",
        "| Hạng mục | Số lượng |",
        "|---|---|",
        f"| Mã ngành trong bảng `majors` | {len(majors)} |",
        f"| Dòng điểm có `major_code` | {len(rows):,} / {total_rows:,} |".replace(",", "."),
        f"| 1. Mã sai cấu trúc (3 số đầu không phải lĩnh vực của danh mục) | {len(bad)} mã, "
        f"{sum(b[3] for b in bad)} dòng |",
        f"| 2. Tên ngành chuẩn lấy từ tên chương trình, không phải tên danh mục | {len(dirty)} mã |",
        f"| 3a. Tên chương trình khác hẳn tên ngành, mã do ghép tự động/thủ công | {len(review)} cặp, "
        f"{sum(z[4] for z in review)} dòng |",
        f"| 3b. Tên chương trình khác hẳn tên ngành, mã do nguồn ghi | {len(source)} cặp, "
        f"{sum(z[4] for z in source)} dòng |",
        f"| 3c. Tên chương trình chứa tên ngành nhưng thêm ≥ 3 từ (chuyên ngành hẹp) | {len(extended)} cặp, "
        f"{sum(z[4] for z in extended)} dòng |",
        f"| 4. Một mã dùng cho các chương trình khác nghĩa ở các trường | {len(shared)} mã |",
        f"| 5. Tên chương trình chỉ là mã số (nguồn thiếu tên) | {len(noname)} cặp, "
        f"{sum(z[4] for z in noname)} dòng |",
        "",
        'Cặp = (trường, tên chương trình, mã ngành). "Khác hẳn" = sau khi bỏ dấu, bỏ phần trong ngoặc và '
        "các từ chung (ngành, chương trình, chất lượng cao, tiếng Anh…), tên chương trình không có từ nào "
        f"trùng với tên ngành chuẩn. Tổng mục 3a + 3b: {len(zero)} cặp, {n_zero_rows} dòng "
        f"({n_zero_rows / len(rows):.1%} số dòng có mã).",
        "",
        "## 1. Mã sai cấu trúc mã 7 số của Bộ",
        "",
        "Mã đúng có dạng `7` + 2 số lĩnh vực + 2 số nhóm + 2 số ngành; 3 số đầu phải là một trong "
        f"{len(FIELDS)} lĩnh vực (714 … 786).",
        "",
        "| Mã | Tên trong dữ liệu | Loại | Dòng | Trường | Mã danh mục cùng tên |",
        "|---|---|---|---|---|---|",
    ]
    for code, name, kind, n, unis, twins in bad:
        lines.append(
            f"| {code} | {md(name)} | {kind} | {n} | {', '.join(unis)} | {', '.join(twins) or '—'} |"
        )
    lines += [
        "",
        "## 2. Tên ngành chuẩn chưa đúng tên danh mục",
        "",
        "Bảng `majors` lấy tên từ tên chương trình của nguồn, nên có tên kèm chuyên ngành, ngôn ngữ "
        "giảng dạy hoặc ghi chú. Các trang `/nganh/` và tab Theo ngành đang hiển thị nguyên tên này.",
        "",
        "| Mã | Tên hiện tại |",
        "|---|---|",
        *[f"| {code} | {md(name)} |" for code, name in dirty],
        "",
        "## 3a. Tên chương trình khác hẳn tên ngành — mã do pipeline ghép (cần xem trước)",
        "",
        "| Trường | Tên chương trình | Mã | Tên ngành chuẩn | Dòng | Cách ghép |",
        "|---|---|---|---|---|---|",
        *[
            f"| {u} | {md(p)} | {m} | {md(mn)} | {n} | {HOW.get(h, h or 'chưa map')} |"
            for u, p, m, mn, n, h in review
        ],
        "",
        "## 3b. Tên chương trình khác hẳn tên ngành — mã do nguồn ghi",
        "",
        "Phần lớn là chuyên ngành hoặc chương trình riêng mà trường tuyển sinh dưới một mã ngành của "
        'danh mục (VD "Thuế" thuộc 7340201 Tài chính – Ngân hàng). Không sai mã, nhưng khi xem theo ngành '
        "người đọc có thể bất ngờ. 40 cặp nhiều dòng nhất:",
        "",
        "| Trường | Tên chương trình | Mã | Tên ngành chuẩn | Dòng |",
        "|---|---|---|---|---|",
        *[f"| {u} | {md(p)} | {m} | {md(mn)} | {n} |" for u, p, m, mn, n, _ in source[:40]],
        "",
        "## 3c. Chuyên ngành hẹp mang mã ngành rộng",
        "",
        "Tên chương trình chứa đủ tên ngành nhưng thêm từ 3 từ có nghĩa trở lên, ví dụ HVD "
        '"Kinh tế giáo dục vùng dân tộc thiểu số" mang mã 7310101 Kinh tế. Thường hợp lệ (trường tuyển '
        "chuyên ngành dưới mã ngành), chỉ cần lưu ý khi so điểm giữa các trường. 30 cặp nhiều dòng nhất:",
        "",
        "| Trường | Tên chương trình | Mã | Tên ngành chuẩn | Dòng |",
        "|---|---|---|---|---|",
        *[f"| {u} | {md(p)} | {m} | {md(mn)} | {n} |" for u, p, m, mn, n, _ in extended[:30]],
        "",
        "## 4. Một mã, nhiều nghĩa giữa các trường",
        "",
        "Mã ngoài danh mục hoặc mã thí điểm (chữ số thứ 4–5 là `90`) mà các trường dùng cho chương trình "
        "không chung từ nào với nhau.",
        "",
        "| Mã | Tên ngành chuẩn | Chương trình theo trường |",
        "|---|---|---|",
        *[
            f"| {code} | {md(name)} | {md('; '.join(f'{u}: {p}' for u, p in per.items()))} |"
            for code, name, per in sorted(shared)
        ],
        "",
        "## 5. Tên chương trình chỉ là mã số",
        "",
        "Mã ngành đúng nhưng nguồn không ghi tên chương trình; trang trường/ngành hiện tên là mã số.",
        "",
        "| Trường | Tên chương trình | Mã | Tên ngành chuẩn | Dòng |",
        "|---|---|---|---|---|",
        *[f"| {u} | {md(p)} | {m} | {md(mn)} | {n} |" for u, p, m, mn, n, _ in noname],
        "",
        "## Đề xuất xử lý",
        "",
        "1. **Mã gõ nhầm (700…, 730…, 780…)**: thêm dòng vào `data/manual/major_map.csv` để chuyển sang "
        "mã danh mục cùng tên (cột cuối bảng mục 1), rồi chạy lại `pipeline.clean` và `sna.build`.",
        "2. **Mã riêng/thí điểm (790…, 7549002…)**: giữ mã gốc của trường ở `program_code`; với `major_code` "
        "chọn một trong hai: (a) map về ngành danh mục gần nhất (VD CTTT Kỹ thuật điện → 7520201) qua "
        "`major_map.csv`, hoặc (b) để trống `major_code` để dòng chỉ hiện ở trang trường, không lẫn "
        "vào trang ngành. Đề xuất (a) cho chương trình tiên tiến/song ngành có ngành gốc rõ, (b) cho phần còn lại.",
        "3. **Tên ngành chuẩn**: thêm file `data/manual/danh_muc_nganh.csv` (mã, tên theo Thông tư "
        "09/2022/TT-BGDĐT và các thông tư bổ sung) và để `pipeline.clean` lấy `majors.major_name` từ "
        f"file này thay vì từ tên chương trình. Sửa được cả {len(dirty)} tên ở mục 2 và tên nhóm ngành trên `/nganh/`.",
        "4. **Mục 3a**: xem từng dòng; dòng ghép sai thì thêm/sửa `major_map.csv` (ghép thủ công được ưu tiên "
        "hơn tự động). Đây là nhóm ít dòng nhất nhưng dễ sai nhất.",
        "5. **Mục 5**: trong `pipeline.clean`, khi tên chương trình chỉ là mã số thì thay bằng tên ngành "
        "chuẩn (ghi `match_how` riêng để còn dấu vết).",
        "6. **Mục 3b, 3c**: không sửa mã. Có thể hiển thị tên chương trình gốc rõ hơn trên trang ngành "
        '(đã có cột Chương trình) và thêm chú thích "chuyên ngành của ngành …".',
        "7. Sau khi sửa: chạy `pipeline.clean`, `sna.build`, `scripts/export_static.py` (sinh lại trang "
        "`/nganh/` và sitemap; slug mới được thêm vào `seo_slugs.csv`, slug cũ vẫn giữ), rồi chạy lại "
        "script này để so số lượng trước–sau.",
        "",
    ]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(
        f"{OUT.relative_to(ROOT)}: bad={len(bad)} dirty={len(dirty)} review={len(review)} "
        f"source={len(source)} extended={len(extended)} shared={len(shared)}"
    )


if __name__ == "__main__":
    main()
