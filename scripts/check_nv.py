"""Đối chiếu mô hình Xếp nguyện vọng với dữ liệu THPT hiện tại."""

import json
import sqlite3
import sys
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from webapp import main as api  # noqa: E402


def check():
    d = api.nv_data()
    assert d["years"] == [2024, 2025, 2026] and d["next"] == 2027
    assert len(d["p"]) == 5577 and len(d["u"]) == 238
    m = d["model"]
    for key, expected in {
        "co2": [2.4408, 0.2308, 0.632],
        "co1": [3.2039, 0.8302],
        "n3": 3422,
        "n2": [1033, 1013, 1376],
        "n1": 4072,
        "mae2": 1.25,
        "mae_last": 1.267,
        "calib": [[0.2, 0.189], [0.4, 0.532], [0.6, 0.628], [0.75, 0.775], [0.9, 0.902]],
    }.items():
        assert m[key] == expected, (key, m[key], expected)
    progs = {f"{p[0]}|{p[1]}": p for p in d["p"]}
    assert progs["BKA|IT1"][6] == [28.53, 29.19, 29.27]
    assert progs["QHI|CN8"][6] == [27.58, 27.86, 26.86]
    assert "X06" in progs["QHI|CN8"][7]
    assert all(len(q) == 41 for q in [*m["q2"], m["q1"]])
    assert all(p[6][-1] is not None for p in d["p"])
    assert all(h != p[6] and h[-1] is not None for p in d["p"] for h in p[7].values())
    assert "cbt" not in d
    assert api.nv_data() is d, "Cache phải được dùng lại"
    assert api.nv_data(2026) == d
    # Dời năm trên bản sao trong RAM: chứng minh năm học không bị viết cứng, DB gốc chỉ đọc.
    memory = sqlite3.connect(":memory:")
    memory.row_factory = sqlite3.Row
    source = api.con()
    source.backup(memory)
    source.close()
    memory.execute("UPDATE admissions SET year=year+4")
    memory.commit()
    api.nv_data.cache_clear()
    with patch.object(api, "con", return_value=memory):
        shifted = api.nv_data()
    api.nv_data.cache_clear()
    assert shifted["years"] == [2028, 2029, 2030] and shifted["next"] == 2031
    assert shifted["model"] == m and shifted["p"] == d["p"] and shifted["u"] == d["u"]
    if "--committed" in sys.argv:
        assert json.loads((ROOT / "site/data/nv.json").read_text(encoding="utf-8")) == d
    keys = ("co2", "co1", "n1", "n2", "n3", "mae2", "mae1", "mae_last", "calib")
    print(
        json.dumps(
            {"programs": len(d["p"]), "universities": len(d["u"]), **{k: m[k] for k in keys}}
        )
    )


if __name__ == "__main__":
    check()
