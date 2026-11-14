"""Kiểm hồ sơ ngành của tab "Tư vấn chọn ngành" (data/manual/career_profiles.json).

--committed: chỉ đọc file đã commit (site/data/majors.json, site/data/career.json), không cần DB.
Không có cờ: kiểm thêm /api/career dựng từ data/eduradar.db.

Run: .venv/Scripts/python.exe scripts/check_career.py --committed
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

PROFILES = ROOT / "data/manual/career_profiles.json"
SUBJECTS = {
    "toan", "van", "anh", "ly", "hoa", "sinh", "su", "dia", "tin", "gdkt",
    "cncn", "cnnn", "nnk", "ve", "nk",
}  # fmt: skip
TRAITS = {"EI", "SN", "TF", "JP", "RS"}
VALUES = {"income", "stable", "creative", "impact", "status", "autonomy", "learning", "balance"}
ENVS = {"office", "field", "mix"}


def check_profiles(majors: list[dict], site_codes: set[str]) -> None:
    seen = set()
    for m in majors:
        code = m["code"]
        assert code not in seen, f"trùng mã {code}"
        seen.add(code)
        assert code in site_codes, f"{code} không có trong site/data/majors.json"
        h = m["holland"]
        assert len(h) == 3 and len(set(h)) == 3 and set(h) <= set("RIASEC"), f"{code}: holland {h}"
        assert m["subjects"] and set(m["subjects"]) <= SUBJECTS, f"{code}: subjects {m['subjects']}"
        assert all(v > 0 for v in m["subjects"].values()), f"{code}: trọng số môn phải > 0"
        assert set(m["traits"]) <= TRAITS, f"{code}: traits {m['traits']}"
        assert all(-1 <= v <= 1 for v in m["traits"].values()), f"{code}: traits ngoài [-1, 1]"
        assert m["values"] and set(m["values"]) <= VALUES, f"{code}: values {m['values']}"
        assert m["env"] in ENVS, f"{code}: env {m['env']}"
        assert 1 <= m["stress"] <= 5, f"{code}: stress {m['stress']}"
        assert 4 <= m["years"] <= 6, f"{code}: years {m['years']}"
        assert isinstance(m["physical"], bool), f"{code}: physical"
        assert m["jobs"] and m["note"], f"{code}: thiếu jobs/note"
        assert "name" not in m, f"{code}: tên ngành lấy từ DB, không lưu trong file"


def check_career_json(data: dict, majors: list[dict]) -> int:
    codes = [m["code"] for m in majors]
    assert [p["code"] for p in data["profiles"]] == codes
    assert all(p["name"] for p in data["profiles"])
    assert data["method"] == "THPT" and data["scale"] == 30
    assert set(data["majors"]) <= set(codes)
    for cb, subs in data["combos"].items():
        assert subs and set(subs) <= SUBJECTS, f"tổ hợp {cb}: {subs}"
    for code, m in data["majors"].items():
        for uni, score, cbs, ptype in m["rows"]:
            assert uni in data["unis"], f"{code}: thiếu trường {uni}"
            assert 0 < score <= 30, f"{code}/{uni}: điểm {score}"
            assert cbs and all(c in data["combos"] for c in cbs.split(";")), f"{code}: {cbs}"
            assert ptype != "CHUAN"
    rows = sum(len(m["rows"]) for m in data["majors"].values())
    return rows


def main() -> None:
    committed = "--committed" in sys.argv
    majors = json.loads(PROFILES.read_text(encoding="utf-8"))["majors"]
    site = json.loads((ROOT / "site/data/majors.json").read_text(encoding="utf-8"))
    check_profiles(majors, {m["major_code"] for m in site["majors"]})
    if committed:
        path = ROOT / "site/data/career.json"
        data = json.loads(path.read_text(encoding="utf-8"))
    else:
        from webapp import main as api

        data = api.career_data()
    rows = check_career_json(data, majors)
    print(
        f"PASS: {len(majors)} hồ sơ ngành; career.json {data['year']}: {len(data['majors'])} ngành "
        f"có điểm, {rows} dòng, {len(data['unis'])} trường, {len(data['combos'])} tổ hợp"
    )


if __name__ == "__main__":
    main()
