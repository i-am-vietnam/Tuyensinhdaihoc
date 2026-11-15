/* Edge headless regression: npm install --prefix .venv/browser-check playwright
 * Run: node scripts/check_static_browser.cjs   (site/ served at "/", như https://diemthidaihoc.com/)
 *      node scripts/check_static_browser.cjs --live   (kiểm bản đang chạy thật)
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const net = require("node:net");
const { spawn } = require("node:child_process");
const { chromium } = require("../.venv/browser-check/node_modules/playwright");

const root = path.resolve(__dirname, "..");
const scratch = path.join(os.tmpdir(), "eduradar-pages-check");
const screenshots = path.join(scratch, "screenshots");
const python = path.join(root, ".venv", "Scripts", "python.exe");
const children = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function freePort() {
  const server = net.createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  await new Promise((r) => server.close(r));
  return port;
}
function run(args) {
  const p = spawn(python, args, { cwd: root, windowsHide: true, stdio: "ignore" });
  children.push(p);
  p.on("error", (e) => console.error(e));
}
async function json(url) {
  const r = await fetch(url);
  assert.equal(r.status, 200, url);
  return r.json();
}
async function waitServer(url) {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await sleep(100);
  }
  throw new Error(`Server unavailable: ${url}`);
}

(async () => {
  fs.mkdirSync(scratch, { recursive: true });
  fs.mkdirSync(screenshots, { recursive: true });
  const staticPort = await freePort(), apiPort = await freePort();
  run(["-m", "http.server", String(staticPort), "--bind", "127.0.0.1", "--directory", path.join(root, "site")]);
  run(["-m", "uvicorn", "webapp.main:app", "--host", "127.0.0.1", "--port", String(apiPort)]);
  const base = `http://127.0.0.1:${staticPort}/`;
  const live = `http://127.0.0.1:${apiPort}/`;
  const pages = "https://diemthidaihoc.com/";
  const FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;
  let browser;
  const results = [];
  try {
    await Promise.all([waitServer(base), waitServer(live + "api/meta")]);
    browser = await chromium.launch({ channel: "msedge", headless: true });
    const modes = process.argv.includes("--live") ? ["pages"] : ["static", "api"];
    for (const mode of modes) for (const width of [375, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const errors = [], badResponses = [], failedRequests = [], requests = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("response", (r) => { if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`); });
      page.on("requestfailed", (r) => failedRequests.push(`${r.url()} ${r.failure()?.errorText}`));
      page.on("request", (r) => requests.push(r.url()));
      const target = mode === "pages" ? pages : mode === "static" ? base : live;
      await page.goto(target);
      await page.waitForFunction(() => document.querySelector("#uni-year").options.length === 3);
      await page.waitForFunction(() => document.querySelectorAll(".uni-card").length === 292);
      assert.equal(await page.evaluate(() => Data.static), mode !== "api");
      assert.equal(await page.locator("#uni-grid").evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(" ").length), width === 375 ? 1 : 3);
      await page.screenshot({ path: path.join(screenshots, `${mode}-grid-${width}.png`) });
      for (const gone of ["#uni-letter", "#uni-sort", "#adv-sort", "#adv-combo-search", "[data-csv]", ".btn-csv"]) assert.equal(await page.locator(gone).count(), 0, gone);
      assert.doesNotMatch(await page.locator("body").innerText(), /Xuất CSV|Mọi chữ cái|Tên A–Z/);
      // One ordering by VNUR rank: inherited members sit at their parent's rank (direct first on ties), unranked last.
      const keys = await page.evaluate(() => [...document.querySelectorAll(".uni-card")].map((c) => {
        const b = c.querySelector(".rank-badge");
        return b ? [+b.textContent.match(/Top (\d+)/)[1], b.classList.contains("rank-inherited") ? 1 : 0] : [Infinity, 2];
      }));
      assert.deepEqual(keys, [...keys].sort((a, b) => a[0] - b[0] || a[1] - b[1]));
      assert.match(await page.locator(".uni-card").first().innerText(), /Top 1\b/);
      const firstUnranked = keys.findIndex((k) => k[0] === Infinity);
      assert.ok(keys.findIndex((k) => k[1] === 0) < keys.slice(0, firstUnranked).map((k) => k[1]).lastIndexOf(1), "inherited and direct ranks interleave");
      assert.ok(await page.evaluate(() => UNIVERSITIES.some((u) => u.province_source === "HOCMAI")));
      assert.ok(await page.evaluate(() => UNIVERSITIES.every((u) => u.province !== "Khác")));
      assert.match(await page.locator("#data-updated").innerText(), /Dữ liệu cập nhật ngày \d{2}\/\d{2}\/\d{4}/);
      await page.locator("#uni-province").selectOption("Thành phố Hà Nội");
      assert.ok(await page.locator('.uni-card[data-uni="BKA"]').count());
      await page.locator("#uni-q").fill("BKA");
      assert.equal(await page.locator(".uni-card").count(), 1);
      assert.match(await page.locator(".uni-card").innerText(), /mã xét tuyển.*phương thức/);
      await page.locator('.uni-card[data-uni="BKA"]').click();
      await page.locator("#uni-out tbody tr").first().waitFor();
      await page.locator("#uni-province").selectOption("");

      // Exercise autocomplete, year changes, and actual renderers at both sizes.
      await page.locator("#uni-q").fill("BKA");
      await page.locator("#uni-ac li").first().waitFor({ state: "visible" });
      await page.locator("#uni-ac li").first().click();
      await page.locator("#uni-out tbody tr").first().waitFor();
      assert.match(await page.locator("#uni-out").innerText(), /BKA/);
      assert.equal(await page.locator("#uni-year").inputValue(), "2026");
      await page.screenshot({ path: path.join(screenshots, `${mode}-uni-${width}.png`) });
      assert.match(await page.locator('#uni-out .combo-code').first().getAttribute("title"), /Toán|Ngữ văn/);
      // Hand-researched tuition (tuition_extra.json): keep the source unit, flag-driven notes.
      const EXTRA = {
        DBG: [/350\.000 – 370\.000 đ\/tín chỉ/, /tổng mỗi năm phụ thuộc số tín chỉ đăng ký/, /Mức học phí năm 2024–2025, có thể đã thay đổi/],
        DCA: [/Theo ngành/iu, /Mức niêm yết, chưa trừ ưu đãi/, /Xem thêm 5 dòng/],
        DLH: [/18 – 30 triệu đ\/học kỳ/, /Mức theo học kỳ\/tháng, không phải cả năm/],
        DLS: [/Khoảng 23,6 triệu đ\/năm/, /dự kiến/i],
        DVP: [/Chỉ có thông tin cho ngành Dược học/],
        DBH: [/Chưa có mức học phí được xác minh/, /Xem thông báo của trường/],
        NTS: [/28–32 triệu đồng\/năm/, /không ghi đơn vị trong nguồn/],
        HHA: [/gần 700\.000/, /942\.000 đ\/tín chỉ/, /1\.413\.000 đ\/tín chỉ/],
        MDA: [/513\.100–635\.900 đồng\/tín chỉ/, /miễn học phí năm 2026–2027/i],
        KTA: [/1\.600\.000 đồng\/tín chỉ/, /DEEA 75/],
        DVB: [/60\.000\.000 đ\/toàn khóa/, /480\.000 đ\/tín chỉ/],
        TDB: [/596\.666 đ\/tín chỉ/, /17\.900\.000 đ\/năm/],
      };
      for (const code of ["BKA", "QHI", "IUH", "BVS", "DBD", ...Object.keys(EXTRA)]) {
        if (code !== "BKA") {
          await page.locator("#uni-q").fill(code);
          await page.locator("#uni-ac li").first().waitFor({ state: "visible" });
          await page.locator("#uni-ac li").first().click();
        }
        await page.locator("#uni-out .dean-block").waitFor();
        const plan = page.locator("#uni-out .dean-block");
        if (code === "BVS" || /Chưa có dữ liệu đề án/.test(await plan.innerText())) {
          assert.match(await plan.innerText(), /Chưa có dữ liệu đề án/);
          assert.equal(await plan.locator("a").count(), 0);
        } else {
          const open = await plan.locator("details.dean-method").evaluateAll((ds) => ds.filter((d) => !d.classList.contains("dean-common")).map((d) => d.open));
          assert.ok(open.length >= 2 && open[0] && open.slice(1).every((x) => !x), `${code} first method open, others collapsed`);
          assert.ok(await plan.locator("details.dean-method[open] .fact-group h4").count(), `${code} labelled groups`);
          assert.match(await plan.innerText(), /đối tượng|điều kiện \/ ngưỡng đầu vào|cách tính điểm|điểm cộng \/ ưu tiên|chỉ tiêu|ghi chú/iu);
          assert.match(await plan.locator(".dean-source").innerText(), /^Nguồn dữ kiện: HOCMAI, năm 20\d\d$/);
          assert.equal(await plan.locator(".dean-source a").getAttribute("target"), "_blank");
          assert.match(await plan.locator(".dean-source a").getAttribute("href"), /^https:\/\/huongnghiep.hocmai.vn\/de-an\//);
          assert.equal(await plan.locator(".dean-link").count(), 0);
          assert.doesNotMatch(await plan.innerText(), /Xem đề án đầy đủ|Danh sách ngành đào tạo|Giới thiệu trường/);
          await plan.locator("details.dean-method").evaluateAll((ds) => ds.forEach((d) => (d.open = true)));
          assert.ok((await plan.locator(".fact-group li").allTextContents()).every((s) => s.length <= 241));
          await plan.locator("details.dean-method").evaluateAll((ds) => ds.forEach((d, i) => (d.open = i === 0)));
        }
        const tuition = page.locator("#uni-out .dean-block + .tuition-card");
        assert.equal(await tuition.count(), 1, `${code} tuition card right under the plan`);
        const tuitionText = await tuition.innerText();
        if (EXTRA[code]) {
          for (const re of EXTRA[code]) assert.match(tuitionText, re, `${code} tuition ${re}`);
          assert.match(await tuition.locator(".src-tag").innerText(), /^(Chính thức|Văn bản chính thức \(bản lưu\)|Tham khảo|Chưa xác minh)$/i, `${code} evidence label`);
          if (!["NTS", "KTA"].includes(code)) assert.doesNotMatch(tuitionText, /triệu đồng\/năm/, `${code} not forced into a yearly range`);
          const links = await tuition.locator("a").evaluateAll((as) => as.map((a) => a.target));
          assert.ok(links.length >= 1 && links.length <= 3 && links.every((t) => t === "_blank"), `${code} 1-3 source links in new tab`);
          assert.equal(await tuition.evaluate((el) => el.classList.contains("tuition-old")), ["DBG", "HHA"].includes(code), `${code} amber border only for old years`);
          if (code === "DBH") assert.doesNotMatch(tuitionText, /\d\.\d{3}|triệu/, "unverified shows no amount");
          if (code === "DCA") {
            assert.equal(await tuition.locator(".fact-group > table.tuition-items tr").count(), 6);
            assert.equal(await tuition.locator("details.more-items").evaluate((d) => d.open), false);
          }
        } else assert.match(tuitionText, /triệu đồng\/năm|Miễn học phí|Chưa có thông tin học phí/);
        if (code === "DBD") assert.match(tuitionText, /Ước tính quy đổi: .*tín chỉ × 30/);
        if (!EXTRA[code] && !/Chưa có thông tin học phí/.test(tuitionText)) {
          assert.match(await tuition.locator(".src-tag").innerText(), /^(Chính thức|Báo chí|Tổng hợp)$/, `${code} source label`);
          assert.match(tuitionText, /Năm học 20\d\d–20\d\d/);
        }
        await plan.scrollIntoViewIfNeeded();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: path.join(screenshots, `${mode}-dean-${code}-${width}.png`) });
        await tuition.scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(screenshots, `${mode}-tuition-${code}-${width}.png`) });
      }

      await page.locator('[data-tab="major"]').click();
      await page.locator("#major-year").selectOption("2025");
      await page.locator("#major-q").fill("7480201");
      await page.locator("#major-ac li").first().waitFor({ state: "visible" });
      await page.locator("#major-ac li").first().click();
      await page.locator("#major-out tbody tr").first().waitFor();
      assert.match(await page.locator("#major-out").innerText(), /7480201/);
      await page.screenshot({ path: path.join(screenshots, `${mode}-major-${width}.png`) });

      // Tab Xếp nguyện vọng: cùng dữ liệu và hành vi ở bản tĩnh lẫn FastAPI.
      assert.ok(!requests.some(u => /(?:api\/nv|data\/nv\.json)$/.test(u)), "NV tải lười");
      await page.locator('[data-tab="nv"]').click();
      await page.locator("#nv-out .nv-plan").waitFor();
      await page.locator("#nv-sample").click();
      const nvRows = page.locator("#nv-out .nv-plan tbody tr:not(.nv-sub)");
      assert.equal(await nvRows.count(), 8);
      assert.match(await nvRows.first().innerText(), /CNTT: Khoa học Máy tính.*Đại Học Bách Khoa Hà Nội/s);
      assert.match(await nvRows.last().innerText(), /Công nghệ thông tin.*Đại Học Mở Hà Nội/s);
      assert.equal(await page.locator("#tab-nv h1").count(), 1);
      assert.equal(await page.locator('#nv-out a[href^="truong/"]').count() > 0, mode !== "api");
      const nvData = mode === "api" ? await json(live + "api/nv") : await json(target + "data/nv.json");
      assert.deepEqual(nvData, await json(live + "api/nv"));
      const totalNV = async () => Number((await page.locator("#nv-sugg .nv-hd").innerText()).match(/Tìm thấy ([\d.]+)/)[1].replace(/\./g, ""));
      await page.locator("#nv-q").fill("7480201");
      assert.ok(await totalNV() >= 150);
      const totalBeforeCombo = await totalNV();
      await page.locator("#nv-combo").selectOption("H00");
      assert.equal(await totalNV(), totalBeforeCombo, "Tìm kiếm không lọc tổ hợp");
      assert.ok(await page.locator("#nv-sugg .nv-na").count(), "Gắn nhãn không xét tổ hợp");
      await page.locator("#nv-combo").selectOption("A00");
      assert.equal(await page.locator("#nv-sugg button[data-i]").count(), 50);
      await page.locator("#nv-sugg [data-more]").click();
      assert.equal(await page.locator("#nv-sugg button[data-i]").count(), 100);
      await page.locator("#nv-q").fill("BKA");
      assert.match(await page.locator("#nv-sugg button[data-i]").first().innerText(), /Đại Học Bách Khoa Hà Nội \(BKA\)/);
      await page.locator("#nv-q").fill("sư phạm toán");
      assert.ok(await totalNV() >= 30);
      const beforeNV = await page.locator("#nv-list > li").count();
      await page.locator("#nv-q").press("ArrowDown");
      await page.locator("#nv-q").press("Enter");
      assert.equal(await page.locator("#nv-list > li").count(), beforeNV + 1);
      await page.locator("#nv-q").fill("BKA IT2");
      await page.locator("#nv-q").press("Escape");
      assert.equal(await page.locator("#nv-sugg").evaluate(e => getComputedStyle(e).display), "none");
      await page.locator("#nv-q").press("Enter");
      assert.equal(await page.locator("#nv-list > li").count(), beforeNV + 1, "Enter không thêm kết quả đã đóng bằng Escape");
      await page.locator("#nv-q").fill("");
      await page.locator("#nv-sample").click();
      for (const colorScheme of ["light", "dark"]) {
        await page.emulateMedia({ colorScheme });
        const colors = await page.locator("#nv-copytext").evaluate(e => ({ color: getComputedStyle(e).color, bg: getComputedStyle(e).backgroundColor }));
        assert.equal(colors.color, "rgb(17, 24, 39)");
        assert.equal(colors.bg, "rgb(248, 250, 252)");
        for (const input of await page.locator("#tab-nv input, #tab-nv select, #tab-nv textarea").all()) {
          assert.equal(await input.evaluate(e => getComputedStyle(e).color), "rgb(17, 24, 39)");
        }
      }
      await page.emulateMedia({ colorScheme: "light" });
      // Clipboard bị chặn: chọn sẵn nội dung để Ctrl+C, không phát sinh lỗi.
      await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("blocked")) } }));
      await page.locator("#nv-copy").click();
      assert.match(await page.locator("#nv-toast").innerText(), /Ctrl\+C/);
      assert.ok(await page.locator("#nv-copytext").evaluate(e => e.selectionEnd === e.value.length));
      await page.evaluate(() => scrollTo(0, 0));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await page.screenshot({ path: path.join(screenshots, `${mode}-nv-${width}.png`) });
      await page.setViewportSize({ width: 360, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 360, "NV: không cuộn ngang ở 360px");
      await page.screenshot({ path: path.join(screenshots, `${mode}-nv-360.png`) });
      await page.setViewportSize({ width, height: 900 });
      await page.goto(target + "#advice");
      await page.waitForURL(/#nv$/);
      await page.locator("#tab-nv.active .nv-plan").waitFor();
      assert.equal(new URL(page.url()).hash, "#nv");
      assert.equal(await page.locator('[data-tab="advice"]').count(), 0);
      assert.deepEqual(await page.locator("#tab-nv [class], #tab-nv [id]").evaluateAll(es => es.flatMap(e => [...e.classList, ...(e.id ? [e.id] : [])]).filter(c => !c.startsWith("nv-"))), []);

      // Tab "Tư vấn chọn ngành" (career.js): hồ sơ mẫu, giải thích, so sánh, khảo sát trống.
      // --live bỏ qua khi bản đang chạy thật chưa có tab này.
      if (mode !== "pages" || await page.locator('[data-tab="career"]').count()) {
        await page.locator('[data-tab="career"]').click();
        await page.locator("#tv-results .tv-mj").first().waitFor();
        assert.equal(await page.locator("#tv-holland").innerText(), "IRC");
        assert.equal(await page.locator("#tv-mbti").innerText(), "INTJ");
        assert.ok(await page.locator("#tv-results .tv-mj").count() >= 6, "at least 6 major cards");
        const first = page.locator("#tv-results .tv-mj").first();
        assert.ok(await first.locator(".tv-pros li").count() >= 1, "why-this list");
        assert.match(await first.locator(".tv-pros h4").innerText(), /Vì sao gợi ý ngành này/);
        assert.match(await first.locator(".tv-adm").innerText(), /Khả năng trúng tuyển/);
        assert.ok(await first.locator(".tv-adm tbody tr").count() >= 1, "admission rows");
        if (mode === "api") assert.equal(await page.locator("#tv-results .tv-mj a").count(), 0, "no SEO links without static pages");
        await page.screenshot({ path: path.join(screenshots, `${mode}-career-${width}.png`) });
        const before = await page.locator("#tv-compare table").innerText();
        const optB = await page.locator("#tv-cmpB option").evaluateAll((os) => os.map((o) => o.value).find((v) => v !== document.querySelector("#tv-cmpA").value && v !== document.querySelector("#tv-cmpB").value));
        await page.locator("#tv-cmpB").selectOption(optB);
        await page.waitForFunction((b) => document.querySelector("#tv-compare table").innerText !== b, before);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "career: no horizontal scroll");
        await page.locator("#tv-reset").click();
        assert.match(await page.locator("#tv-results").innerText(), /Kết quả sẽ hiện ở đây/);
        await page.locator("#tv-sample").click();
        await page.locator("#tv-results .tv-mj").first().waitFor();
      }

      await page.locator('[data-tab="network"]').click();
      await page.waitForFunction(() => document.querySelector("#net-name").value === "g2_uni_uni_2026");
      await page.locator("#net-side table").first().waitFor();
      await page.waitForFunction(() => netObj && netObj.body.nodeIndices.length > 0);
      // Freeze the force layout for a deterministic screenshot; convergence is not a UI check.
      await page.evaluate(() => { netObj.stopSimulation(); netObj.fit({ animation: false }); });
      assert.ok(await page.locator("#net-canvas canvas").count());
      await page.screenshot({ path: path.join(screenshots, `${mode}-network-${width}.png`) });

      await page.locator('[data-tab="coverage"]').click();
      await page.locator("#coverage-out tbody tr").first().waitFor();
      assert.match(await page.locator("#coverage-out").innerText(), /Dữ liệu cập nhật ngày \d{2}\/\d{2}\/\d{4}/);
      assert.equal(await page.locator("#coverage-out tbody tr").count(), 292);
      assert.equal(await page.locator("#coverage-out .missing-list li").count(), 15);
      assert.match(await page.locator("#coverage-out").innerText(), /285\/292 trường có mức học phí/);
      assert.equal(await page.locator("#coverage-out .tuition-missing-list li").count(), 7);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.evaluate(() => { document.querySelector("#uni-year").value = "2024"; });
      await page.locator('#coverage-out [data-uni="BKA"]').click();
      await page.locator("#uni-out tbody tr").first().waitFor();
      assert.equal(await page.locator("#uni-year").inputValue(), "2026", "Coverage link opens its stated year");

      // Full JSON equality with live FastAPI, including ties and combo-specific history.
      const cases = [
        "api/meta", "api/universities/BKA/scores?year=2026",
        "api/universities/NTH/scores?year=2026", "api/universities/BVS/scores?year=2026",
        "api/universities/DCA/scores?year=2026", "api/universities/DBH/scores?year=2026", "api/coverage",
        "api/majors/7480201/scores?year=2025&method=THPT",
        "api/majors/7480201/scores?year=2025",
        "api/majors/7480201/similar?year=2025", "api/network/g2_uni_uni?year=2026",
        "api/universities?q=bach%20khoa", "api/majors?q=cong%20nghe%20thong%20tin",
        "api/advice?method=THPT&score=24&combo=A00&year=2026",
        "api/advice?method=THPT&score=24&combo=A00&year=2026&offset=50",
        "api/advice?method=THPT&score=24&combo=A00&year=2026&offset=3050&limit=100",
        "api/advice?method=THPT&score=24&year=2026&limit=1000",
        "api/advice?method=THPT&score=24&year=2025",
        "api/advice?method=THPT&score=24&combo=a00&year=2024&limit=17",
        "api/advice?method=DGNL_HCM&score=900&year=2026",
        "api/advice?method=DGNL_HN&score=100&combo=A00&year=2025",
        "api/advice?method=HOCBA&score=25&year=2024&margin=0.5",
        "api/advice?method=KETHOP&score=24&year=2026",
        "api/advice?method=THPT&score=0&year=2026",
      ];
      const program = await page.evaluate(async () => (await Data.searchIndex()).programs[0]);
      cases.push(`api/programs/scores?name=${encodeURIComponent(program.program_name)}&year=2026`);
      for (const endpoint of cases) {
        const expected = await json(live + endpoint);
        const actual = await page.evaluate((p) => api(p), endpoint);
        assert.deepEqual(actual, expected, `${width}px ${endpoint}`);
      }
      const accented = await page.evaluate(async () => {
        const a = await api("api/universities?q=bách%20khoa"), b = await api("api/universities?q=bach%20khoa");
        return JSON.stringify(a) === JSON.stringify(b);
      });
      assert.ok(accented, "Accent-insensitive search");
      assert.deepEqual(errors, [], "Console/page errors");
      assert.deepEqual(badResponses, [], "HTTP errors");
      assert.deepEqual(failedRequests, [], "Failed requests");
      assert.ok(requests.every((u) => u.startsWith(target) || FONTS.test(u)), "All requests stay on the site (plus Google Fonts)");
      if (mode !== "api") assert.ok(requests.every((u) => !u.includes("/api/")), "Static mode makes no API probes");
      results.push({ mode, width, tabs: 6, coverage: true, parity: cases.length, consoleErrors: 0, httpErrors: 0 });
      console.log(`PASS ${mode} ${width}px: six tabs (career), rank grid, plans/tuition, Xếp nguyện vọng, ${cases.length} API comparisons, no console/HTTP errors`);
      await page.close();
      if (width === 1280 && mode !== "pages") {
        // Lỗi tải, retry, API fallback, cache, năm động và localStorage bị chặn.
        const retryPage = await browser.newPage({ viewport: { width, height: 900 } });
        const retryErrors = [];
        retryPage.on("pageerror", e => retryErrors.push(e.message));
        await retryPage.addInitScript(() => {
          Storage.prototype.getItem = () => { throw new Error("storage blocked"); };
          Storage.prototype.setItem = () => { throw new Error("storage blocked"); };
        });
        let available = false, loads = 0;
        const futureData = { ...nvData, years: [2028, 2029, 2030], next: 2031,
          p: nvData.p.filter(p => !(p[0] === "MHN" && p[1] === "7480201")) };
        await retryPage.route("**/api/nv", route => { loads++; return route.fulfill({ contentType: "application/json", body: "invalid JSON" }); });
        await retryPage.route("**/data/nv.json", route => { loads++; return route.fulfill({ contentType: "application/json", body: available ? JSON.stringify(futureData) : "invalid JSON" }); });
        await retryPage.goto(target + "#nv");
        await retryPage.locator("#nv-retry").waitFor();
        assert.match(await retryPage.locator("#nv-out").innerText(), /Không tải được dữ liệu/);
        available = true;
        await retryPage.locator("#nv-retry").click();
        await retryPage.locator("#nv-out .nv-plan").waitFor();
        assert.equal(loads, mode === "api" ? 4 : 2);
        await retryPage.locator("#nv-sample").click();
        assert.equal(await retryPage.locator("#nv-list > li").count(), 7, "Hồ sơ mẫu bỏ mã đã biến mất ở năm mới");
        assert.match(await retryPage.locator("#nv-out .nv-method").innerText(), /2028, 2029, 2030/);
        assert.match(await retryPage.locator("#nv-out").innerText(), /Dự báo 2031/);
        const cachedLoads = loads;
        await retryPage.evaluate(async () => { await window.NV.open(); await window.NV.open(); });
        assert.equal(loads, cachedLoads);
        assert.deepEqual(retryErrors, []);
        await retryPage.close();
        console.log(`PASS ${mode}: retry, fallback, cache, năm động, storage bị chặn`);
      }
    }
    // Trang tĩnh SEO (scripts/export_seo.py): /truong/, /nganh/, link từ app, cuộn ngang bảng trên 375px.
    const siteBase = process.argv.includes("--live") ? pages : base;
    const seo = await json(siteBase + "data/seo_pages.json");
    const pick = (keys, n) => [...keys].sort(() => Math.random() - 0.5).slice(0, n);
    const uniKeys = Object.keys(seo.uni), majorKeys = Object.keys(seo.major).filter((k) => seo.major[k].startsWith("nganh/"));
    const seoPaths = ["truong/", "nganh/", seo.uni.BKA, seo.major["7480201"],
      ...pick(uniKeys, 3).map((k) => seo.uni[k]), ...pick(majorKeys, 3).map((k) => seo.major[k])];
    console.log("SEO sample:", seoPaths.join(" "));
    for (const width of [375, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const errors = [], bad = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("response", (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
      page.on("requestfailed", (r) => bad.push(`${r.url()} ${r.failure()?.errorText}`));
      for (const p of seoPaths) {
        const res = await page.goto(siteBase + p);
        assert.equal(res.status(), 200, p);
        assert.equal(await page.getAttribute('link[rel="canonical"]', "href"), pages + p, p);
        assert.equal(await page.getAttribute('meta[property="og:url"]', "content"), pages + p, p);
        assert.equal(await page.getAttribute('meta[property="og:title"]', "content"), await page.title(), p);
        assert.equal(await page.locator("h1").count(), 1, p);
        const navText = await page.locator("nav.tabs").innerText();
        assert.match(navText, /Xếp nguyện vọng/);
        assert.match(navText, /Tư vấn chọn ngành/);
        assert.doesNotMatch(navText, /Tư vấn theo điểm/);
        assert.ok(await page.locator('nav.tabs a[href$="truong/"]').count() && await page.locator('nav.tabs a[href$="nganh/"]').count(), `${p} menu Trường/Ngành`);
        assert.match(await page.locator(".seo-updated").innerText(), /Dữ liệu cập nhật ngày \d{2}\/\d{2}\/\d{4}/, p);
        const types = await page.locator('script[type="application/ld+json"]').evaluateAll((s) => s.map((x) => JSON.parse(x.textContent)["@type"]));
        assert.ok(types.includes("BreadcrumbList"), p);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${p} no page-level horizontal scroll`);
        if (p.split("/").length > 2) {
          const open = await page.locator("details.seo-method[open]").count();
          assert.equal(open, 1, `${p} exactly one method open`);
          if (await page.locator("#pt-thpt").count()) assert.ok(await page.locator("#pt-thpt").evaluate((d) => d.open), `${p} THPT open`);
          const wrap = page.locator("details.seo-method[open] .tbl-wrap");
          if (width === 375) assert.ok(await wrap.evaluate((e) => e.scrollWidth > e.clientWidth && getComputedStyle(e).overflowX === "auto"), `${p} table scrolls horizontally`);
        }
        await page.screenshot({ path: path.join(screenshots, `seo-${p.replace(/\W+/g, "_")}-${width}.png`) });
      }
      // Liên kết chéo: ngành → trường, danh sách → trang ngành 1 trường (#nganh-...)
      await page.goto(siteBase + seo.major["7480201"]);
      await page.locator("details.seo-method[open] tbody a").first().click();
      await page.waitForURL(/\/truong\/[a-z0-9-]+\/$/);
      const single = Object.entries(seo.major).find(([, v]) => v.includes("#nganh-"));
      await page.goto(siteBase + "nganh/");
      await page.locator(`a[href="../${single[1]}"]`).click();
      await page.waitForURL((u) => u.hash === `#nganh-${single[0]}`);
      assert.ok(await page.locator(`#nganh-${single[0]}`).isVisible());
      // Nội dung có sẵn trong HTML: tắt JS vẫn thấy bảng điểm
      const nojs = await browser.newContext({ javaScriptEnabled: false });
      const raw = await nojs.newPage();
      await raw.goto(siteBase + seo.uni.BKA);
      assert.ok((await raw.locator("details.seo-method tbody tr").count()) > 50, "server-rendered rows");
      await nojs.close();
      // App chính (bản tĩnh): menu Trường/Ngành và link "Trang riêng ↗"
      await page.goto(siteBase + "#uni/BKA/2026");
      await page.locator("#uni-out .seo-page-link").waitFor();
      assert.ok(await page.locator('nav.tabs a[href="truong/"]').count() && await page.locator('nav.tabs a[href="nganh/"]').count());
      await page.locator("#uni-out .seo-page-link").click();
      await page.waitForURL(siteBase + seo.uni.BKA);
      await page.goto(siteBase + "#major/7480201/2026");
      await page.locator("#major-out .seo-page-link").click();
      await page.waitForURL(siteBase + seo.major["7480201"]);
      // Trang 404 (GitHub Pages trả cho URL không tồn tại; local mở trực tiếp /404.html)
      await page.goto(siteBase + "404.html");
      assert.equal(await page.locator("h1").innerText(), "Không tìm thấy trang");
      assert.match(await page.getAttribute('meta[name="robots"]', "content"), /noindex/);
      assert.equal(await page.locator('link[rel="canonical"]').count(), 0);
      for (const href of ["/", "/truong/", "/nganh/"]) assert.ok(await page.locator(`main a[href="${href}"]`).count(), `404 link ${href}`);
      await page.screenshot({ path: path.join(screenshots, `seo-404-${width}.png`) });
      if (process.argv.includes("--live")) {
        const [nErr, nBad] = [errors.length, bad.length];
        const res = await page.goto(pages + "khong-ton-tai/trang-sau/");
        assert.equal(res.status(), 404);
        assert.equal(await page.locator("h1").innerText(), "Không tìm thấy trang");
        await page.waitForLoadState("networkidle");
        // 404 của chính request cố ý này là kết quả mong đợi; mọi lỗi khác vẫn bị bắt
        const expected = (s) => /404/.test(s) && (!/https?:/.test(s) || s.includes("khong-ton-tai"));
        assert.ok(errors.slice(nErr).every(expected) && bad.slice(nBad).every(expected), "404 page assets load");
        errors.splice(nErr); bad.splice(nBad);
      }
      assert.deepEqual(errors, [], "SEO pages: console/page errors");
      assert.deepEqual(bad, [], "SEO pages: HTTP errors");
      console.log(`PASS seo ${width}px: ${seoPaths.length} pages, cross links, no-JS content, app links, no console/HTTP errors`);
      await page.close();
    }
    fs.writeFileSync(path.join(scratch, "results.json"), JSON.stringify(results, null, 2));
  } finally {
    if (browser) await browser.close();
    children.forEach((p) => p.kill());
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
