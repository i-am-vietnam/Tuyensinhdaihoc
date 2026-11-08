"""Check committed site data (--committed), or compare it with the local FastAPI data."""

import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from webapp import main  # noqa: E402


def read(path):
    return json.loads((ROOT / "site" / path).read_text(encoding="utf-8"))


class Page(HTMLParser):
    """Thu các thẻ SEO, id và link của một trang HTML."""

    def __init__(self):
        super().__init__()
        self.meta, self.links, self.ids, self.ld = {}, [], set(), []
        self.title = self.h1 = 0
        self.title_text, self._in, self._buf = "", None, []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.add(a["id"])
        if tag == "meta":
            key = a.get("name") or a.get("property")
            if key:
                assert key not in self.meta, f"duplicate meta {key}"
                self.meta[key] = a.get("content", "")
        elif tag == "link" and a.get("rel") == "canonical":
            assert "canonical" not in self.meta, "duplicate canonical"
            self.meta["canonical"] = a["href"]
        elif tag in ("title", "h1") or (tag == "script" and a.get("type") == "application/ld+json"):
            self.title += tag == "title"
            self.h1 += tag == "h1"
            self._in, self._buf = tag, []
        for k in ("href", "src"):
            if tag in ("a", "link", "script", "img") and a.get(k):
                self.links.append(a[k])

    def handle_data(self, data):
        if self._in:
            self._buf.append(data)

    def handle_endtag(self, tag):
        if tag == self._in or (self._in == "script" and tag == "script"):
            text = "".join(self._buf)
            if self._in == "title":
                self.title_text = html.unescape(text)
            elif self._in == "script":
                self.ld.append(json.loads(text))
            elif self._in == "h1":
                assert text.strip(), "empty h1"
            self._in = None


def check_seo(unis, majors) -> str:
    """Trang tĩnh: thẻ SEO, JSON-LD, link nội bộ (kể cả #nganh-...), sitemap khớp noindex."""
    site = ROOT / "site"
    base = "https://diemthidaihoc.com/"
    seo = read("data/seo_pages.json")
    assert set(seo["uni"]) == {u["uni_code"] for u in unis}
    assert set(seo["major"]) <= {m["major_code"] for m in majors}
    loc = re.findall(r"<loc>([^<]+)</loc>", (site / "sitemap.xml").read_text(encoding="utf-8"))
    assert len(loc) == len(set(loc)) and all(u.startswith(base) for u in loc)
    sitemap = {u[len(base) :] for u in loc}
    robots = (site / "robots.txt").read_text(encoding="utf-8")
    assert f"Sitemap: {base}sitemap.xml" in robots
    pages = sorted(site.glob("*.html")) + sorted(site.glob("truong/**/index.html"))
    pages += sorted(site.glob("nganh/**/index.html"))
    parsed, noindex = {}, set()
    for f in pages:
        rel = f.relative_to(site).as_posix()
        path = rel[: -len("index.html")] if rel.endswith("index.html") else rel
        p = Page()
        p.feed(f.read_text(encoding="utf-8"))
        parsed[path] = p
        new = path.startswith(("truong/", "nganh/"))
        # trang chủ có một h1 cho mỗi tab (sẵn có); trang tĩnh mới đúng một h1
        assert p.title == 1 and (p.h1 == 1 if new else p.h1 >= 1), f"{path}: title/h1"
        assert p.meta["canonical"] == p.meta["og:url"] == base + path, path
        assert p.meta["og:title"] == p.title_text, f"{path}: og:title = title"
        assert 50 <= len(p.meta["description"]) <= 200, f"{path}: description length"
        if "noindex" in p.meta.get("robots", ""):
            noindex.add(path)
        if new:
            types = [x["@type"] for x in p.ld]
            assert "BreadcrumbList" in types, path
            crumbs = next(x for x in p.ld if x["@type"] == "BreadcrumbList")["itemListElement"]
            assert crumbs[-1]["item"] == base + path and crumbs[0]["item"] == base, path
            assert all(k not in json.dumps(p.ld) for k in ("aggregateRating", "review")), path
            assert "Dữ liệu cập nhật ngày" in f.read_text(encoding="utf-8"), path
    assert sitemap == set(parsed) - noindex, "sitemap = public pages"
    assert all(p.startswith("truong/") for p in noindex)
    links = 0
    for path, p in parsed.items():
        for href in p.links:
            if re.match(r"^(https?:|mailto:|data:)", href) or href.startswith("#"):
                continue
            links += 1
            target, _, frag = href.partition("#")
            target = urljoin("/" + path, target.split("?")[0]).lstrip("/")
            if target in parsed:  # trang HTML ("" = trang chủ, "x/" = thư mục, "mos.html")
                if frag and target.startswith("truong/"):
                    assert frag in parsed[target].ids, f"{path}: missing #{frag} in {target}"
            else:
                assert (site / target).is_file(), f"{path}: broken link {href}"
    for code, target in seo["major"].items():
        page, _, frag = target.partition("#")
        assert page in parsed and (not frag or frag in parsed[page].ids), target
    n_uni = sum(p.startswith("truong/") and p != "truong/" for p in parsed)
    n_major = sum(p.startswith("nganh/") and p != "nganh/" for p in parsed)
    assert n_uni == len(unis)
    return (
        f"PASS SEO: {len(parsed)} HTML pages ({n_uni} trường, {n_major} ngành, "
        f"{len(noindex)} noindex), {len(sitemap)} sitemap URLs, {links} internal links OK"
    )


def main_check():
    committed = "--committed" in sys.argv
    metadata = read("data/meta.json")
    if not committed:
        assert metadata == main.meta()
        assert read("data/dean.json") == main.dean_index()
        assert read("data/uni/BKA_2026.json") == main.university_scores("BKA", 2026)
        assert read("data/major/7480201_2025.json") == main.major_scores("7480201", 2025)
    idx = read("data/majors.json")
    program = idx["programs"][0]
    if not committed:
        assert read(f"data/program/{program['file']}_2026.json") == main.program_scores(
            program["program_name"], 2026
        )
        assert read("data/network/g2_uni_uni_2026.json") == main.network("g2_uni_uni", 2026)
    coverage = read("data/coverage.json")
    assert len(coverage["missing"]) == 15
    assert (
        sum(sum(u["counts"].values()) for u in coverage["universities"])
        == metadata["stats"]["rows"]
    )
    unis = read("data/universities.json")
    assert len(unis) == metadata["stats"]["unis"] == len(coverage["universities"])
    assert len(idx["majors"]) == metadata["stats"]["majors"]
    for u in unis:
        for year in metadata["years"]:
            data = read(f"data/uni/{u['uni_code']}_{year}.json")
            assert data["university"]["uni_code"] == u["uni_code"] and data["year"] == year
            assert data["university"]["province"] == u["province"]
    for m in idx["majors"]:
        for year in metadata["years"]:
            assert read(f"data/major/{m['major_code']}_{year}.json")["year"] == year
    for p in idx["programs"]:
        for year in metadata["years"]:
            assert read(f"data/program/{p['file']}_{year}.json")["year"] == year
    for p in (ROOT / "site/data/network").glob("g*.json"):
        g = json.loads(p.read_text(encoding="utf-8"))
        nodes = {n["id"] for n in g["nodes"]}
        assert all(e["source"] in nodes and e["target"] in nodes for e in g["edges"])
    seo = check_seo(unis, idx["majors"])
    files = [p for p in (ROOT / "site").rglob("*") if p.is_file()]
    largest = max(files, key=lambda p: p.stat().st_size)
    assert largest.stat().st_size < 50_000_000
    print(seo)
    print(
        f"PASS: {'committed data' if committed else 'API parity'}, coverage; {len(files)} files, "
        f"{sum(p.stat().st_size for p in files):,} bytes; "
        f"largest {largest.relative_to(ROOT)} ({largest.stat().st_size:,} bytes)"
    )


if __name__ == "__main__":
    main_check()
