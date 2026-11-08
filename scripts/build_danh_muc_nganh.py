"""Sinh/cập nhật data/manual/danh_muc_nganh.csv: tên ngành chuẩn cho bảng majors.

Không đặt tên theo trí nhớ: với mỗi mã ngành, lấy tên chương trình phổ biến nhất GIỮA CÁC TRƯỜNG
(đếm số trường, hoà thì đếm số dòng) trong data/eduradar.db, sau khi bỏ phần trong ngoặc và các
hậu tố như "(đào tạo bằng tiếng Việt)", "(CTTT)", "- Chương trình tiên tiến", "chuyên ngành …".

nguon_ten:
  pho_bien  tên của ít nhất 2 trường, sau khi làm sạch không còn dấu hiệu chuyên ngành/ghi chú
  can_xem   chỉ 1 trường có mã này, hoặc tên chọn được chỉ 1 trường dùng, hoặc vẫn còn dấu hiệu
            chuyên ngành/ghi chú (cột ly_do) -> người duyệt sửa cột ten rồi đổi nguon_ten = da_duyet
  da_duyet  đã duyệt tay: chạy lại script KHÔNG ghi đè dòng này

Run: .venv/Scripts/python.exe scripts/build_danh_muc_nganh.py   (sau đó chạy lại pipeline.clean)
"""

from __future__ import annotations

import csv
import re
import sqlite3
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "data" / "eduradar.db"
OUT = ROOT / "data" / "manual" / "danh_muc_nganh.csv"
FIELDS = ["ma", "ten", "nguon_ten", "so_truong", "so_truong_cung_ten", "ly_do", "vi_du_goc"]

# Hậu tố/đoạn ghi chú (không dấu, chữ thường) cắt khỏi cuối tên. Cắt từ vị trí khớp đến hết tên.
TAIL = re.compile(
    r"\s*(?:[-–,:;]\s*)?\b(?:"
    r"chuong trinh|ct\b|cttt|clc|chat luong cao|tien tien|lien ket|tang cuong tieng anh|"
    r"dao tao bang|day bang|giang day bang|hoc bang|bang tieng|tieng viet\b|"
    r"he ky su|he cu nhan|he dai tra|chuyen nganh|phan hieu|mien bac|mien nam|"
    r"thi sinh|moi tuyen|du kien|nam \d{4}|thuoc nganh"
    r")\b.*$"
)
# Còn những dấu hiệu này sau khi làm sạch -> can_xem
SUSPECT = re.compile(
    r"chuyen nganh|chuong trinh|\bnganh\b|\bhe (?:ky su|cu nhan)\b|phan hieu|[:;/+&]|\d"
)


def unaccent(s: str) -> str:
    s = unicodedata.normalize("NFD", s.replace("đ", "d").replace("Đ", "D"))
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower()


def clean(name: str) -> str:
    s = re.sub(r"\([^()]*\)|\[[^\[\]]*\]", " ", name)  # mọi phần trong ngoặc
    s = re.sub(r"\([^()]*$", " ", s)  # ngoặc mở không đóng
    s = re.sub(r"^\s*(ngành|nganh)\s+", "", s, flags=re.I)
    s = re.sub(r"\s+", " ", s).strip(" -–,.;:*")
    m = TAIL.search(unaccent(s))  # unaccent giữ nguyên độ dài chuỗi (NFC tiếng Việt)
    if m and m.start() > 0:
        s = s[: m.start()]
    s = re.sub(r"\s+[-–]\s*[A-Z]{2,6}$", "", s.strip())  # đuôi viết tắt: "– BCSE", "– ESAS"
    return re.sub(r"\s+", " ", s).strip(" -–,.;:*")


def key(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", unaccent(s)).strip()


def main():
    old = {}
    if OUT.exists():
        with OUT.open(encoding="utf-8", newline="") as f:
            old = {r["ma"]: r for r in csv.DictReader(f)}
    c = sqlite3.connect(f"file:{DB.as_posix()}?mode=ro&immutable=1", uri=True)
    by_code = defaultdict(list)
    for code, uni, name in c.execute(
        "SELECT major_code, uni_code, program_name FROM admissions WHERE major_code IS NOT NULL"
    ):
        by_code[code].append((uni, name))
    rows = []
    for code in sorted(by_code):
        if old.get(code, {}).get("nguon_ten") == "da_duyet":
            rows.append(old[code])
            continue
        schools = defaultdict(set)  # tên đã làm sạch (key) -> các trường dùng
        n_rows, forms = Counter(), defaultdict(Counter)
        for uni, name in by_code[code]:
            cl = clean(name)
            if not cl or re.fullmatch(r"[\d\s]+", cl):
                continue
            k = key(cl)
            schools[k].add(uni)
            n_rows[k] += 1
            forms[k][cl] += 1
        n_unis = len({u for u, _ in by_code[code]})
        if not schools:
            rows.append(
                dict(ma=code, ten="", nguon_ten="can_xem", so_truong=n_unis, so_truong_cung_ten=0,
                     ly_do="không có tên dùng được", vi_du_goc=by_code[code][0][1])
            )  # fmt: skip
            continue
        best = max(schools, key=lambda k: (len(schools[k]), n_rows[k], -len(k)))
        # dạng viết hoa phổ biến nhất; ưu tiên dạng viết hoa chữ đầu
        name = max(
            forms[best],
            key=lambda f: (forms[best][f], f[:1].isupper(), -sum(map(str.isupper, f[1:]))),
        )
        name = name[:1].upper() + name[1:]
        reasons = []
        if n_unis == 1:
            reasons.append("chỉ 1 trường")
        elif len(schools[best]) == 1:
            reasons.append("các trường đặt tên khác nhau, tên chọn chỉ 1 trường dùng")
        if SUSPECT.search(unaccent(name)):
            reasons.append("tên còn dấu hiệu chuyên ngành/ghi chú")
        example = Counter(n for _, n in by_code[code]).most_common(1)[0][0]
        rows.append(
            dict(ma=code, ten=name, nguon_ten="can_xem" if reasons else "pho_bien",
                 so_truong=n_unis, so_truong_cung_ten=len(schools[best]),
                 ly_do="; ".join(reasons), vi_du_goc=example if example != name else "")
        )  # fmt: skip
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, FIELDS, lineterminator="\n")
        w.writeheader()
        w.writerows({k: r.get(k, "") for k in FIELDS} for r in rows)
    n = Counter(r["nguon_ten"] for r in rows)
    print(
        f"{OUT.relative_to(ROOT)}: {len(rows)} mã; " + ", ".join(f"{k}={v}" for k, v in n.items())
    )


if __name__ == "__main__":
    main()
