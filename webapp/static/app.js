const $ = (s) => document.querySelector(s);
const readJson = async (p) => {
  const r = await fetch(p);
  if (!r.ok) { const t = await r.text(); let m = t; try { m = JSON.parse(t).detail; } catch {} throw new Error(m || r.status); }
  return r.json();
};
const unaccent = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/\s+/g, " ").trim();
const Data = {
  static: document.documentElement.dataset.mode === "static",
  cache: new Map(),
  file(p) {
    if (!this.cache.has(p)) this.cache.set(p, readJson(p).catch((e) => { this.cache.delete(p); throw e; }));
    return this.cache.get(p);
  },
  async init() {
    if (!this.static) {
      try { this.meta = await readJson("api/meta"); return; } catch { this.static = true; }
    }
    this.meta = await this.file("data/meta.json");
  },
  // trang tĩnh /truong/, /nganh/ (scripts/export_seo.py); chỉ có ở bản tĩnh
  async seoPages() {
    if (!this.static) return { uni: {}, major: {} };
    return this.file("data/seo_pages.json").catch(() => ({ uni: {}, major: {} }));
  },
  async searchIndex() {
    if (!this.static) return this.file("api/search-index");
    const [unis, majors] = await Promise.all([this.file("data/universities.json"), this.file("data/majors.json")]);
    return { unis, ...majors };
  },
  rank(items, q, limit) {
    const key = unaccent(q), words = key.split(" ");
    if (!key) return [];
    return items.filter((i) => words.every((w) => i._k.includes(w))).sort((a, b) =>
      Number(!a._k.startsWith(key)) - Number(!b._k.startsWith(key)) || (b.n_rows ?? b.n_unis ?? 0) - (a.n_rows ?? a.n_unis ?? 0)
    ).slice(0, limit).map(({ _k, file, ...item }) => item);
  },
  filterAdvice(d, q) {
    const year = Number(q.get("year")), method = q.get("method"), score = Number(q.get("score")), combo = q.get("combo") || "";
    const margin = q.has("margin") ? Number(q.get("margin")) : (d.scale == null ? null : d.scale / 30);
    const offset = Math.max(0, Number(q.get("offset") || 0)), limit = Math.max(0, Math.min(1000, q.has("limit") ? Number(q.get("limit")) : 50));
    const out = { year, method, combo, score, offset, scale: d.scale, margin, counts: {}, total: 0, rows: [] };
    if (d.scale == null) return out;
    const levels = ["Thử sức", "Vừa sức", "An toàn"], unit = d.scale / 30, cands = [];
    for (const values of d.rows) {
      if (combo && !values[d.columns.length].includes(combo.toUpperCase())) continue;
      const r = Object.fromEntries(d.columns.map((k, i) => [k, values[i]]));
      if (r.score > score + margin) continue;
      const delta = r.score - score;
      r.level = levels[delta > 0 ? 0 : delta > -unit ? 1 : 2]; cands.push(r);
    }
    cands.sort((a, b) => b.hot - a.hot); // on dinh nhu Python: cung do hot giu thu tu diem giam dan
    out.counts = Object.fromEntries(levels.map((lv) => [lv, cands.filter((r) => r.level === lv).length]));
    out.total = cands.length;
    out.rows = cands.slice(offset, offset + limit).map((r) => {
      const h = d.histories[JSON.stringify([r.uni_code, r.program_code])] || {};
      return { ...r, history: { ...(h[combo.toUpperCase()] || {}), [year]: r.score } };
    });
    return out;
  },
  async request(p) {
    await this.ready;
    const [path, query] = p.split("?"), q = new URLSearchParams(query), parts = path.split("/");
    if (path === "api/meta") return this.meta;
    if (path === "api/universities" || path === "api/majors") {
      const idx = await this.searchIndex(), term = q.get("q"), limit = Number(q.get("limit") || 15);
      if (path === "api/universities") return this.rank(idx.unis, term, limit);
      const found = this.rank(idx.majors, term, limit);
      return [...found, ...this.rank(idx.programs, term, found.length ? Math.min(5, limit) : limit)];
    }
    if (!this.static) return readJson(p);
    const year = q.get("year");
    if (path === "api/coverage") return this.file("data/coverage.json");
    if (path === "api/network") return this.file("data/network.json");
    if (parts[1] === "network") return this.file(`data/network/${parts[2]}_${year}.json`);
    if (parts[1] === "universities") return this.file(`data/uni/${parts[2]}_${year}.json`);
    if (parts[3] === "similar") {
      const d = await this.file(`data/network/similar_majors_${year}.json`);
      return (d[decodeURIComponent(parts[2])] || []).map(([major_code, major_name, jaccard]) => ({ major_code, major_name, jaccard }));
    }
    if (parts[1] === "majors" || parts[1] === "programs") {
      let file = `data/major/${parts[2]}_${year}.json`;
      if (parts[1] === "programs") {
        const idx = await this.searchIndex(), program = idx.programs.find((p) => p.program_name === q.get("name"));
        if (!program) throw new Error("Không tìm thấy chương trình");
        file = `data/program/${program.file}_${year}.json`;
      }
      const d = await this.file(file), method = q.get("method");
      return method ? { ...d, rows: d.rows.filter((r) => r.method === method) } : d;
    }
    if (path === "api/advice") return this.filterAdvice(await this.file(`data/advice/${q.get("method")}_${year}.json`), q);
    throw new Error("Không tìm thấy dữ liệu");
  },
};
Data.ready = Data.init();
const api = (p) => Data.request(p);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (x) => (x == null || x === "" ? "" : Number(x).toLocaleString("vi-VN", { maximumFractionDigits: 2 }));
const PT = { CHUAN: "", CLC: "CLC", TIEN_TIEN: "Tiên tiến", LIEN_KET: "Liên kết", TIENG_ANH: "Tiếng Anh", PHAN_HIEU: "Phân hiệu", TAI_NANG: "Tài năng" };
const uniCell = (r) => `<span title="${esc(r.uni_name)}">${esc(shortUni(r.uni_name))}</span> <span class="sub">${esc(r.uni_code)}</span>`;
const shortUni = (n) => String(n || "").replace(/^(Trường\s+)?(Đại\s+Học|Đại\s+học)\s+/i, "ĐH ").replace(/^Học\s+Viện\s+/i, "HV ");
const tag = (t) => (PT[t] ? `<span class="tag">${PT[t]}</span>` : "");
const comboHtml = (s) => !s ? "" : `<span class="combo-values">` + s.split(";").filter(Boolean).map((c) => `<span class="combo-code" title="${esc(META?.combo_tooltips[c] || "Chưa có tên môn từ nguồn")}">${esc(c)}</span>`).join(", ") + "</span>";
const rankHtml = (u, compact = false) => u.vnur_rank == null ? `<span class="sub">Chưa có hạng</span>` : `<span class="rank-badge${u.vnur_parent ? " rank-inherited" : ""}">${compact ? `${u.vnur_rank}${u.vnur_parent ? ` (${esc(u.vnur_parent)})` : ""}` : u.vnur_parent ? `Thuộc ${esc(u.vnur_parent)} · Top ${u.vnur_rank}` : `Top ${u.vnur_rank} VNUR`}</span>`;
const DEAN_FIELDS = [["audience", "Đối tượng"], ["conditions", "Điều kiện / ngưỡng đầu vào"], ["formula", "Cách tính điểm"], ["bonus", "Điểm cộng / ưu tiên"], ["quota", "Chỉ tiêu"], ["notes", "Ghi chú"]];
const bulletList = (items) => `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
const factGroups = (fields) => DEAN_FIELDS.filter(([k]) => fields[k]?.length).map(([k, label]) => `<div class="fact-group"><h4>${label}</h4>${bulletList(fields[k])}</div>`).join("");
function deanHtml(plan, scoreYear) {
  if (!plan) return `<section class="card dean-block"><h2>Đề án tuyển sinh</h2><p class="muted">Chưa có dữ liệu đề án</p></section>`;
  const methods = plan.methods.map((m, i) => `<details class="dean-method"${i === 0 ? " open" : ""}><summary>${esc(m.name)}</summary>
    ${factGroups(m.fields) || `<p class="muted small">Bài nguồn chưa có dữ kiện chi tiết cho phương thức này.</p>`}
    ${m.shared ? `<p class="muted small">Một số quy định áp dụng chung: xem mục Quy định chung.</p>` : ""}</details>`).join("");
  const common = DEAN_FIELDS.some(([k]) => plan.common[k]?.length) ? `<details class="dean-method dean-common"><summary>Quy định chung (áp dụng cho nhiều phương thức)</summary>${factGroups(plan.common)}</details>` : "";
  const timeline = plan.timeline.length ? `<div class="fact-group"><h4>Mốc thời gian</h4><table class="timeline"><tbody>${plan.timeline.map((t) => `<tr><td class="num">${esc(t.date)}</td><td>${esc(t.event)}</td></tr>`).join("")}</tbody></table></div>` : "";
  const docs = plan.documents.length ? `<div class="fact-group"><h4>Hồ sơ</h4>${bulletList(plan.documents)}</div>` : "";
  return `<section class="card dean-block"><h2>Đề án tuyển sinh ${plan.year || ""}</h2>
    <p class="muted small">${esc(plan.province)}${plan.groups.length ? " · " + esc(plan.groups.join(", ")) : ""}${plan.year !== scoreYear ? ` · Đề án khác năm bảng điểm ${scoreYear}` : ""}</p>
    ${plan.methods_year && plan.methods_year !== plan.year ? `<p class="dean-note">Phần phương thức trong bài vẫn ghi năm ${plan.methods_year}; tiêu đề đề án ghi năm ${plan.year}.</p>` : ""}
    ${plan.quota.length ? `<div class="fact-group dean-quota"><h4>Chỉ tiêu</h4>${bulletList(plan.quota)}</div>` : ""}
    <h3>Phương thức xét tuyển</h3>
    <div class="dean-methods">${methods || `<p class="muted">Bài nguồn chưa có mục phương thức xét tuyển.</p>`}${common}</div>
    <h3>Thời gian &amp; hồ sơ</h3>
    ${timeline || docs ? `<div class="dean-time">${timeline}${docs}</div>` : `<p class="muted small">Bài nguồn chưa có dữ kiện thời gian hoặc hồ sơ.</p>`}
    <p class="dean-source muted small">Nguồn dữ kiện: <a href="${esc(plan.source_url)}" target="_blank" rel="noopener noreferrer">HOCMAI</a>, năm ${esc(plan.year ?? "")}</p></section>`;
}
const SOURCE_TYPES = { official: "Trang/đề án chính thức của trường", press: "Báo chí", aggregator: "Trang tổng hợp" };
function tuitionHtml(t) {
  if (!t) return `<section class="card tuition-card"><h2>Học phí</h2><p class="muted">Chưa có thông tin học phí</p></section>`;
  const one = t.max_mil == null || t.max_mil === t.min_mil;
  let host = "";
  try { host = new URL(t.source_url).hostname.replace(/^www\./, ""); } catch {}
  const free = t.min_mil === 0 && t.max_mil === 0;
  const label = { official: "Chính thức", press: "Báo chí", aggregator: "Tổng hợp" }[t.source_type];
  return `<section class="card tuition-card"><div class="head"><h2>Học phí</h2><span class="tuition-meta">${label ? `<span class="src-tag src-${esc(t.source_type)}">${label}</span>` : ""}<span class="muted small">Năm học ${t.year}–${t.year + 1}</span></span></div>
    <p class="tuition-range">${free ? "Miễn học phí" : `${t.max_mil == null ? "Từ " : ""}${one ? fmt(t.min_mil) : `${fmt(t.min_mil)}–${fmt(t.max_mil)}`} <span>triệu đồng/năm</span>`}</p>
    ${free ? `<p class="muted small">Theo quy định chung đối với học viên hệ quân sự/công an.</p>` : `${t.text ? `<p>${esc(t.text)}</p>` : ""}${!t.unit_note ? "" : /×|quy đổi/.test(t.unit_note) ? `<p class="tuition-convert small">Ước tính quy đổi: ${esc(t.unit_note)}</p>` : `<p class="muted small">${esc(t.unit_note)}</p>`}`}
    <p class="muted small">Nguồn: <a href="${esc(t.source_url)}" target="_blank" rel="noopener noreferrer">${esc(SOURCE_TYPES[t.source_type] || "Nguồn")}${host ? ` (${esc(host)})` : ""}</a></p></section>`;
}
// 89 truong tra tay (data/clean/tuition_extra.json): giu don vi goc, khong quy doi sang nam
const EVIDENCE = { official: "Chính thức", official_archived: "Văn bản chính thức (bản lưu)", secondary: "Tham khảo", unverified: "Chưa xác minh" };
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "nguồn"; } };
const itemRows = (items) => items.map((i) => `<tr><td>${esc(i.name)}</td><td class="num">${esc(i.amount)} ${esc(i.unit)}${i.extra ? `<div class="muted small">${esc(i.extra)}</div>` : ""}</td></tr>`).join("");
function tuitionExtraHtml(x) {
  const f = new Set(x.flags);
  const year = /^\d{4}–\d{4}$/.test(x.school_year) ? `Năm học ${x.school_year}` : x.school_year;
  const links = x.sources.slice(0, 3);
  const head = `<div class="head"><h2>Học phí</h2><span class="tuition-meta"><span class="src-tag ev-${esc(x.evidence)}">${EVIDENCE[x.evidence]}</span>${year ? `<span class="muted small">${esc(year)}</span>` : ""}</span></div>`;
  if (x.evidence === "unverified")
    return `<section class="card tuition-card tuition-extra">${head}<p>Chưa có mức học phí được xác minh</p>
      ${links.length ? `<p class="small"><a href="${esc(links[0])}" target="_blank" rel="noopener noreferrer">Xem thông báo của trường</a></p>` : ""}</section>`;
  const notes = [];
  if (f.has("nam_cu")) notes.push(`Mức học phí năm ${x.school_year}, có thể đã thay đổi`);
  if (f.has("theo_tin_chi")) notes.push("Học phí tính theo tín chỉ; tổng mỗi năm phụ thuộc số tín chỉ đăng ký");
  if (f.has("theo_hoc_ky") || f.has("theo_thang")) notes.push("Mức theo học kỳ/tháng, không phải cả năm");
  if (f.has("toan_khoa")) notes.push("Có mức tính cho toàn khoá, không phải mỗi năm");
  if (f.has("du_kien")) notes.push("Mức dự kiến, chưa phải quyết định chính thức");
  if (f.has("tam_thu")) notes.push("Mức tạm thu, có thể điều chỉnh khi có quyết định chính thức");
  if (f.has("trung_binh")) notes.push("Mức trung bình, học phí từng ngành có thể khác");
  if (f.has("chi_mot_nganh")) notes.push(x.only_major ? `Chỉ có thông tin cho ngành ${x.only_major}` : "Chỉ có thông tin cho một số ngành");
  if (f.has("co_uu_dai")) notes.push("Mức niêm yết, chưa trừ ưu đãi");
  if (f.has("da_tru_uu_dai")) notes.push("Biểu đã gồm ưu đãi theo ngành và cách thanh toán; xem chi tiết từng dòng");
  if (x.evidence === "secondary") notes.push("Thông tin tham khảo, chưa đối chiếu văn bản gốc của trường");
  const items = x.items.length ? `<div class="fact-group"><h4>Theo ngành</h4><table class="tuition-items"><tbody>${itemRows(x.items.slice(0, 6))}</tbody></table>
    ${x.items.length > 6 ? `<details class="more-items"><summary>Xem thêm ${x.items.length - 6} dòng</summary><table class="tuition-items"><tbody>${itemRows(x.items.slice(6))}</tbody></table></details>` : ""}</div>` : "";
  return `<section class="card tuition-card tuition-extra${f.has("nam_cu") ? " tuition-old" : ""}">${head}
    <p class="${x.summary.length <= 60 ? "tuition-range" : "tuition-summary"}">${esc(x.summary)}</p>
    ${x.scope && x.scope !== x.school_year ? `<p class="muted small">Phạm vi: ${esc(x.scope)}</p>` : ""}
    ${items}
    ${notes.length ? `<ul class="tuition-notes">${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
    ${x.note ? `<p class="muted small">${esc(x.note)}</p>` : ""}
    <p class="muted small">Nguồn: ${links.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(hostOf(u))}</a>`).join(" · ")}</p></section>`;
}
const feeHtml = (d) => (d.tuition_extra ? tuitionExtraHtml(d.tuition_extra) : tuitionHtml(d.tuition));
const fail = (out, e) => (out.innerHTML = `<div class="card empty">Lỗi: ${esc(e.message)}</div>`);
const TABS = ["uni", "major", "nv", "career", "network", "coverage"];
let META = null;
let UNIVERSITIES = [];

const uniNameKey = (u) => unaccent(u.name).replace(/^(truong\s+)?dai hoc\s+|^hoc vien\s+|^phan hieu\s+/, "");
// hang VNUR tang dan; truong ke thua dung o hang cua dai hoc me (cung hang: truc tiep truoc); chua xep hang cuoi, theo ten
function renderUniGrid() {
  const words = unaccent($("#uni-q").value).split(" "), province = $("#uni-province").value;
  const items = UNIVERSITIES.filter((u) => words.every((w) => u._k.includes(w)) && (!province || u.province === province));
  items.sort((a, b) => (a.vnur_rank ?? Infinity) - (b.vnur_rank ?? Infinity) || Number(!!a.vnur_parent) - Number(!!b.vnur_parent)
    || (a.vnur_parent || "").localeCompare(b.vnur_parent || "", "vi") || uniNameKey(a).localeCompare(uniNameKey(b), "vi") || a.uni_code.localeCompare(b.uni_code));
  $("#uni-count").textContent = `${items.length} trường · Xếp theo hạng VNUR 2026 tăng dần; trường thành viên đứng ở hạng của đại học mẹ (cùng hạng: hạng trực tiếp trước), rồi các trường chưa xếp hạng theo tên. Thống kê theo năm mới nhất của từng trường.`;
  $("#uni-grid").innerHTML = items.length ? items.map((u) => `<button type="button" class="uni-card" data-uni="${esc(u.uni_code)}" data-year="${u.latest_year}">
    <span class="uni-code-badge">${esc(u.uni_code)}</span><span class="uni-card-name">${esc(u.name)}</span>
    <span class="sub">${u.n_programs} mã xét tuyển · ${u.n_methods} phương thức · ${u.latest_year}</span>
    ${u.first_year > 2024 ? `<span class="sub">mới có ${u.first_year}</span>` : ""}
    <span class="sub">${esc(u.province)}</span>${u.vnur_rank != null ? rankHtml(u) : ""}</button>`).join("") : `<p class="muted">Không tìm thấy trường phù hợp.</p>`;
}
$("#uni-q").addEventListener("input", renderUniGrid);
$("#uni-province").addEventListener("change", renderUniGrid);
$("#uni-grid").addEventListener("click", (e) => {
  const card = e.target.closest("[data-uni]");
  if (card) { curUni = card.dataset.uni; $("#uni-year").value = card.dataset.year; loadUni(); }
});

/* ---------- tabs ---------- */
document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
function showTab(t) {
  if (t === "advice") t = "nv";
  if (!TABS.includes(t)) t = "uni";
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === t));
  document.querySelectorAll(".tab").forEach((s) => s.classList.toggle("active", s.id === "tab-" + t));
  if (t === "network") loadNetworkList();
  if (t === "coverage") loadCoverage();
  if (t === "career") window.Career?.open();
  if (t === "nv") window.NV?.open();
  history.replaceState(null, "", "#" + t);
}
window.addEventListener("hashchange", () => {
  if (location.hash === "#advice") showTab("nv");
});

/* ---------- autocomplete ---------- */
function autocomplete(input, list, url, render, onPick) {
  let timer, items = [], sel = -1, seq = 0;
  const close = () => { list.style.display = "none"; sel = -1; };
  const draw = () => {
    list.innerHTML = items.map((it, i) => `<li class="${i === sel ? "sel" : ""}" data-i="${i}">${render(it)}</li>`).join("");
    list.style.display = items.length ? "block" : "none";
  };
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const my = ++seq, q = input.value.trim();
      let res = [];
      try { res = q ? await api(url + encodeURIComponent(q)) : []; } catch { res = []; }
      if (my !== seq) return; // da co lan go moi hon -> bo ket qua cu
      items = res; sel = -1; draw();
    }, 150);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { sel = Math.min(sel + 1, items.length - 1); draw(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
    else if (e.key === "Enter") { e.preventDefault(); const it = items[sel >= 0 ? sel : 0]; if (it) { onPick(it); close(); } }
    else if (e.key === "Escape") close();
  });
  list.addEventListener("mousedown", (e) => { const li = e.target.closest("li"); if (li) { onPick(items[+li.dataset.i]); close(); } });
  input.addEventListener("blur", () => setTimeout(close, 150));
}

/* ---------- 1a. theo truong ---------- */
let curUni = null;
autocomplete($("#uni-q"), $("#uni-ac"), "api/universities?q=",
  (u) => `<span>${esc(u.name)}</span><span class="code">${esc(u.uni_code)}${u.short_name ? " · " + esc(u.short_name) : ""}</span>`,
  (u) => { curUni = u.uni_code; $("#uni-q").value = u.name; loadUni(); });
$("#uni-year").addEventListener("change", () => curUni && loadUni());

async function loadUni() {
  const out = $("#uni-out");
  out.innerHTML = `<div class="empty">Đang tải…</div>`;
  let d;
  try { d = await api(`api/universities/${encodeURIComponent(curUni)}/scores?year=${$("#uni-year").value}`); } catch (e) { return fail(out, e); }
  location.hash = `uni/${curUni}/${d.year}`;
  const seoUni = (await Data.seoPages()).uni[d.university.uni_code];
  $("#uni-q").value = d.university.name;
  renderUniGrid();
  if (!d.rows.length) {
    out.innerHTML = `<div class="card empty">${esc(d.university.name)} chưa có dữ liệu năm ${d.year}. Năm có dữ liệu: ${d.years.join(", ") || "—"}</div>${deanHtml(d.dean, d.year)}${feeHtml(d)}`;
    return;
  }
  const cols = d.methods;
  const more = (r, m) => r.scores[m + "_more"] || [];
  const cell = (c) => !c ? "" : `${fmt(c.score)}${c.equiv != null ? `<span class="eq">≈ ${fmt(c.equiv)}/30</span>` : ""}`;
  const body = d.rows.map((r) => `<tr>
      <td class="code" data-label="Mã">${esc(r.program_code)}</td>
      <td class="prog main">${esc(r.program_name)}${tag(r.program_type)}${r.notes.length ? `<div class="sub">${esc(r.notes.join(" · "))}</div>` : ""}</td>
      <td class="combo" data-label="Tổ hợp">${comboHtml(r.combos)}</td>
      ${cols.map((m) => `<td class="num" data-label="${esc(m.method_name)}">${cell(r.scores[m.method])}${more(r, m.method).map((c) => `<span class="eq">${fmt(c.score)}</span>`).join("")}</td>`).join("")}
    </tr>`).join("");
  out.innerHTML = `<div class="card">
    <div class="head"><h2>${esc(d.university.name)} <span class="sub">(${esc(d.university.uni_code)})</span></h2>
      <span class="muted small">${d.rows.length} chương trình · năm ${d.year} · <a href="${esc(d.source_url)}" target="_blank" rel="noopener">nguồn</a>${seoUni ? ` · <a class="seo-page-link" href="${esc(seoUni)}">Trang riêng của trường ↗</a>` : ""}</span></div>
    <div class="tbl-wrap"><table class="stack">
      <thead><tr><th>Mã</th><th>Ngành / chương trình</th><th>Tổ hợp</th>${cols.map((m) => `<th class="num">${esc(m.method_name)}</th>`).join("")}</tr></thead>
      <tbody>${body}</tbody></table></div></div>${deanHtml(d.dean, d.year)}${feeHtml(d)}`;
  out.scrollIntoView({ block: "start" });
}

/* ---------- 1b. theo nganh (hoac ten chuong trinh goc chua map) ---------- */
let curMajor = null; // {code} hoac {name}
autocomplete($("#major-q"), $("#major-ac"), "api/majors?q=",
  (m) => m.kind === "program"
    ? `<span>${esc(m.program_name)} <span class="tag tag-raw">chưa map</span></span><span class="code">${m.n_unis} trường · ${m.n_rows} dòng</span>`
    : `<span>${esc(m.major_name)}</span><span class="code">${esc(m.major_code)} · ${m.n_unis} trường</span>`,
  (m) => {
    curMajor = m.kind === "program" ? { name: m.program_name } : { code: m.major_code };
    $("#major-q").value = m.kind === "program" ? m.program_name : m.major_name;
    loadMajor();
  });
["#major-year", "#major-method"].forEach((s) => $(s).addEventListener("change", () => curMajor && loadMajor()));

async function loadMajor() {
  const out = $("#major-out");
  out.innerHTML = `<div class="empty">Đang tải…</div>`;
  const year = $("#major-year").value, method = $("#major-method").value;
  const { code, name } = curMajor;
  const url = code
    ? `api/majors/${encodeURIComponent(code)}/scores?year=${year}&method=${method}`
    : `api/programs/scores?name=${encodeURIComponent(name)}&year=${year}&method=${method}`;
  let d;
  try { d = await api(url); } catch (e) { return fail(out, e); }
  location.hash = code ? `major/${code}/${d.year}` : `major/~${encodeURIComponent(name)}/${d.year}`;
  const seoMajor = code && (await Data.seoPages()).major[code];
  $("#major-q").value = d.major.major_name;
  const rawNote = d.major.unmapped ? `<p class="muted small">Tên chương trình gốc, chưa gán mã ngành chuẩn — chỉ gồm các dòng chưa map${d.years ? ` (năm có dữ liệu: ${d.years.join(", ")})` : ""}.</p>` : "";
  if (!d.rows.length) { out.innerHTML = `<div class="card empty">Chưa có dữ liệu cho ${code ? "ngành" : "chương trình"} này năm ${d.year}.${rawNote}</div>`; return; }
  const unis = new Set(d.rows.map((r) => r.uni_code)).size;
  const sim = code ? await api(`api/majors/${encodeURIComponent(code)}/similar?year=${d.year}`).catch(() => []) : [];
  const simHtml = sim.length ? `<div class="chips"><span class="muted small">Ngành tương tự (mạng G3):</span>${sim.map((x) =>
    `<button type="button" class="chip" data-code="${esc(x.major_code)}" data-name="${esc(x.major_name)}" title="Jaccard ${x.jaccard}">${esc(x.major_name)}</button>`).join("")}</div>` : "";
  out.innerHTML = `<div class="card"><div class="head"><h2>${esc(d.major.major_name)} <span class="sub">${esc(d.major.major_code || "chưa map")}</span></h2>
    <span class="muted small">${unis} trường · ${d.rows.length} dòng · năm ${d.year}${seoMajor && seoMajor.startsWith("nganh/") ? ` · <a class="seo-page-link" href="${esc(seoMajor)}">Trang riêng của ngành ↗</a>` : ""}</span></div>${rawNote}${simHtml}
    <div class="tbl-wrap"><table class="stack"><thead><tr><th>Trường</th><th>Chương trình</th><th>Phương thức</th><th>Tổ hợp</th><th class="num">Điểm chuẩn</th></tr></thead>
    <tbody>${d.rows.map((r) => `<tr><td class="main">${uniCell(r)}</td>
      <td data-label="Chương trình">${esc(r.program_name)}${tag(r.program_type)}</td><td class="sub" data-label="Phương thức">${esc(r.method_name)}</td>
      <td class="sub" data-label="Tổ hợp">${comboHtml(r.combos)}</td>
      <td class="num" data-label="Điểm chuẩn">${fmt(r.score)}<span class="sub"> /${r.scale_max ?? "?"}</span></td></tr>`).join("")}</tbody></table></div></div>`;
}

$("#major-out").addEventListener("click", (e) => {
  const b = e.target.closest(".chip[data-code]");
  if (b) { curMajor = { code: b.dataset.code }; $("#major-q").value = b.dataset.name; loadMajor(); }
});

/* ---------- 3. mang SNA ---------- */
// Ten tieng Viet + 1 cau y nghia/cong thuc cho cac khoa trong summary.csv (sna/build.py).
// Khoa khong co trong bang van hien ten goc (nhom "Khác").
const MG = { size: "Quy mô", path: "Liên thông & đường đi", clus: "Phân cụm & cộng đồng", deg: "Phân bố bậc", algo: "Thuật toán (Louvain/Girvan–Newman)", g4: "Riêng G4" };
const SUMMARY_LABELS = {
  nodes: ["Số nút", "Số nút N của toàn mạng.", "size"],
  universities: ["Số trường", "Số nút trường (phía U của G1).", "size"],
  majors: ["Số ngành", "Số nút ngành mã 7 số (phía M của G1).", "size"],
  edges: ["Số cạnh", "Số cạnh E (có hướng: A→B và B→A tính là 2 cạnh).", "size"],
  density: ["Mật độ", "Tỉ lệ cạnh có trên số cạnh tối đa: vô hướng D = 2E / (N(N−1)), có hướng D = E / (N(N−1)).", "size"],
  bipartite_density: ["Mật độ hai phía", "D = E / (|U|·|M|): tỉ lệ cặp (trường, ngành) có cạnh.", "size"],
  avg_degree: ["Bậc trung bình", "⟨k⟩ = 2E / N (vô hướng); có hướng = E / N (bậc vào = bậc ra trung bình).", "size"],
  avg_majors_per_uni: ["Số ngành trung bình / trường", "Bậc trung bình phía trường trong G1 = E / |U|.", "size"],
  avg_unis_per_major: ["Số trường trung bình / ngành", "Bậc trung bình phía ngành trong G1 = E / |M|.", "size"],
  jaccard_threshold: ["Ngưỡng Jaccard", "Tạo cạnh khi J(A,B) = |A∩B| / |A∪B| ≥ ngưỡng.", "size"],
  components: ["Số thành phần liên thông", "Số nhóm nút mà trong mỗi nhóm đi được tới nhau.", "path"],
  weak_components: ["Thành phần liên thông yếu", "Số thành phần khi bỏ hướng cạnh.", "path"],
  strong_components: ["Thành phần liên thông mạnh", "Số thành phần mà mọi cặp nút đi tới nhau theo đúng hướng cạnh.", "path"],
  lcc_nodes: ["Số nút thành phần lớn nhất", "Số nút trong thành phần liên thông lớn nhất (LCC; G4 là thành phần yếu lớn nhất).", "path"],
  scc_nodes: ["Số nút SCC lớn nhất", "Số nút trong thành phần liên thông mạnh lớn nhất.", "path"],
  avg_path_length_lcc: ["Độ dài đường đi trung bình (LCC)", "L = Σ d(i,j) / (n(n−1)) trên thành phần lớn nhất; G4 tính khi bỏ hướng.", "path"],
  diameter_lcc: ["Đường kính (LCC)", "Khoảng cách ngắn nhất lớn nhất max d(i,j) trên thành phần lớn nhất; G4 bỏ hướng.", "path"],
  scc_avg_path_length: ["Độ dài đường đi trung bình (SCC, có hướng)", "L tính theo hướng cạnh trên SCC lớn nhất (mọi cặp đều tới được nhau).", "path"],
  scc_diameter: ["Đường kính (SCC, có hướng)", "max d(i→j) theo hướng cạnh trên SCC lớn nhất.", "path"],
  avg_clustering: ["Hệ số phân cụm trung bình", "C = (1/N) Σ C_i, C_i = 2T_i / (k_i(k_i−1)). G1 dùng clustering hai phía Latapy (độ trùng láng giềng); G4 dùng bản có hướng.", "clus"],
  transitivity: ["Tính bắc cầu", "T = 3 × số tam giác / số bộ ba nối nhau. G1 luôn 0 vì đồ thị hai phía không có tam giác.", "clus"],
  assortativity: ["Hệ số đồng loại theo bậc", "Tương quan Pearson giữa bậc hai đầu cạnh: r > 0 nút bậc cao nối nút bậc cao, r < 0 ngược lại. G4 dùng bậc vào – bậc vào.", "clus"],
  louvain_communities: ["Số cộng đồng (Louvain)", "Số cộng đồng tìm bằng Louvain có trọng số (seed 42); là màu nút trên hình.", "clus"],
  modularity_louvain: ["Modularity Q (Louvain)", "Q = (1/2m) Σ [A_ij − k_i k_j / 2m] δ(c_i, c_j); Q > 0,3 thường coi là có cấu trúc cộng đồng rõ.", "clus"],
  gn_nodes: ["GN: số nút xét", "Girvan–Newman chạy trên toàn bộ nút của mạng (không lấy mẫu).", "algo"],
  gn_best_modularity: ["GN: modularity Q tốt nhất", "Girvan–Newman lần lượt xoá cạnh có betweenness cao nhất; ghi Q (không trọng số) cao nhất đã gặp.", "algo"],
  gn_best_k: ["GN: số cộng đồng tại Q tốt nhất", "Số cộng đồng k ứng với Q tốt nhất của Girvan–Newman.", "algo"],
  gn_max_k_checked: ["GN: k tối đa đã xét", "Dừng tách khi đủ số cộng đồng này (hoặc hết giới hạn thời gian).", "algo"],
  gn_seconds: ["GN: thời gian (giây)", "Thời gian chạy Girvan–Newman và Louvain so sánh.", "algo"],
  louvain_unweighted_modularity: ["Louvain không trọng số: Q", "Modularity của Louvain bỏ trọng số, để so cùng điều kiện với Girvan–Newman.", "algo"],
  louvain_unweighted_communities: ["Louvain không trọng số: số cộng đồng", "Số cộng đồng của Louvain bỏ trọng số.", "algo"],
  compute_seconds: ["Thời gian tính độ đo (giây)", "Thời gian tính toàn bộ độ đo của mạng.", "algo"],
  reciprocity: ["Tính tương hỗ", "Tỉ lệ cạnh A→B có cạnh ngược B→A.", "g4"],
  spearman_authority_vs_avg_score: ["Spearman: authority – điểm TB", "Tương quan hạng ρ giữa authority và điểm chuẩn THPT trung bình của trường.", "g4"],
  spearman_pagerank_vs_avg_score: ["Spearman: PageRank – điểm TB", "Tương quan hạng ρ giữa PageRank và điểm chuẩn THPT trung bình của trường.", "g4"],
  score_gap: ["Khoảng điểm tối đa", "A → B khi 0 < điểm B − điểm A ≤ khoảng này (thang 30).", "g4"],
};
const POWERLAW = { gamma: ["số mũ γ", "Số mũ γ trong P(k) ∝ k^−γ, ước lượng MLE rời rạc trên đuôi k ≥ k_min."],
  kmin: ["k_min", "Bậc nhỏ nhất của đuôi, chọn theo khoảng cách KS nhỏ nhất."],
  tail_nodes: ["số nút ở đuôi", "Số nút có bậc k ≥ k_min dùng để ước lượng γ."],
  ks: ["KS", "Khoảng cách Kolmogorov–Smirnov D = max |F_dữ liệu − F_mô hình|; càng nhỏ càng khớp."] };
const PL_SIDE = { uni_: " (bậc trường)", major_: " (bậc ngành)", in_: " (bậc vào)", "": "" };
function summaryLabel(k) {
  if (SUMMARY_LABELS[k]) return SUMMARY_LABELS[k];
  const m = k.match(/^(uni_|major_|in_|)powerlaw_(gamma|kmin|tail_nodes|ks)$/);
  if (m) return [`Power-law: ${POWERLAW[m[2]][0]}${PL_SIDE[m[1]]}`, POWERLAW[m[2]][1], "deg"];
  return [k, "", "other"];
}
const NODE_LABELS = {
  degree: ["Bậc", "k_i = số cạnh nối với nút."],
  degree_centrality: ["Trung tâm bậc", "k_i / (N − 1); G1 chuẩn hoá theo số nút phía bên kia."],
  in_degree: ["Bậc vào", "Số trường có cạnh trỏ tới nút (số trường “nhắm lên” trường này)."],
  out_degree: ["Bậc ra", "Số trường mà nút trỏ tới."],
  in_strength: ["Cường độ vào", "Tổng trọng số cạnh vào = tổng số ngành mà các trường khác “nhắm lên” trường này."],
  betweenness: ["Trung gian (betweenness)", "C_B(v) = Σ σ_st(v) / σ_st, chuẩn hoá: tỉ lệ đường ngắn nhất đi qua nút."],
  closeness: ["Độ gần (closeness)", "(n − 1) / Σ d(v,u), chỉnh Wasserman–Faust khi mạng không liên thông; G4 tính theo khoảng cách đi vào."],
  eigenvector: ["Vector riêng (eigenvector)", "x_i = (1/λ) Σ A_ij x_j, có trọng số, tính trên thành phần lớn nhất (G4: SCC lớn nhất); nút ngoài = 0."],
  eigenvector_unw: ["Vector riêng, không trọng số", "Như eigenvector nhưng mọi cạnh trọng số 1."],
  pagerank: ["PageRank", "PR(i) = (1 − d)/N + d Σ_j PR(j)·w_ji / s_j, d = 0,85, có trọng số."],
  authority: ["Authority (HITS)", "a_i = Σ_{j→i} h_j: được nhiều hub trỏ tới. G1 vô hướng nên hub = authority."],
  hub: ["Hub (HITS)", "h_i = Σ_{i→j} a_j: trỏ tới nhiều authority."],
  clustering: ["Hệ số phân cụm", "C_i = 2T_i / (k_i(k_i − 1)); G1 dùng Latapy (hai phía), G4 dùng bản có hướng."],
  community: ["Cộng đồng (Louvain)", "Số thứ tự cộng đồng Louvain, 1 = cộng đồng đông nhất."],
};
const nodeLabel = (k) => NODE_LABELS[k] || [k, ""];
const EIG_NOTE = "Eigenvector dồn vào khối dày đặc nhất (localization) do mạng gồm nhiều khối tách biệt. Xếp hạng toàn cục nên xem PageRank/degree.";
const PALETTE = ["#1f5eff", "#e8590c", "#2b8a3e", "#c2255c", "#7048e8", "#0c8599", "#e67700", "#5c940d", "#862e9c", "#495057"];
const fmt4 = (x) => (x == null || x === "" ? "" : Number(x).toLocaleString("vi-VN", { maximumFractionDigits: 4 }));
const ddmmyyyy = (s) => (s ? String(s).slice(0, 10).split("-").reverse().join("/") : "—");
const datesText = () => `Thu thập dữ liệu: ${ddmmyyyy(META.collected_on)} · Xử lý/cập nhật: ${ddmmyyyy(META.updated_on)}`;
const th = (k, [label, tip]) => `<span title="${esc(tip ? `${tip} (${k})` : k)}">${esc(label)}</span>`;

let netLoaded = false, netObj = null, netData = null, netNodes = null, netLastFind = "";
async function loadNetworkList() {
  if (netLoaded) return; netLoaded = true;
  let names;
  try { names = await api("api/network"); } catch (e) { netLoaded = false; return fail($("#net-canvas"), e); }
  const sel = $("#net-name");
  if (!names.length) { $("#net-canvas").innerHTML = `<div class="empty">Chưa có dữ liệu mạng. Chạy: python -m sna.build</div>`; return; }
  const NAMES = { g1_uni_major: "G1 · Trường – Ngành", g2_uni_uni: "G2 · Trường – Trường", g3_major_major: "G3 · Ngành – Ngành", g4_competition: "G4 · Cạnh tranh (có hướng)" };
  const label = (n) => { const i = n.lastIndexOf("_"); return `${NAMES[n.slice(0, i)] || n.slice(0, i)} — ${n.slice(i + 1)}`; };
  names.sort((a, b) => b.slice(-4).localeCompare(a.slice(-4)) || a.localeCompare(b));
  sel.innerHTML = names.map((n) => `<option value="${n}">${label(n)}</option>`).join("");
  sel.value = names.find((n) => n.startsWith("g2_uni_uni")) || names[0];
  sel.addEventListener("change", drawNetwork);
  // "change" cung ban khi o tim mat focus sau Enter -> bo qua neu vua tim dung chuoi nay
  $("#net-find").addEventListener("change", () => { if ($("#net-find").value !== netLastFind) findNode($("#net-find").value); });
  $("#net-find").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); findNode($("#net-find").value); } });
  $("#net-comm").addEventListener("change", filterCommunity);
  $("#net-side").addEventListener("click", (e) => { if (e.target.closest("#net-node-close")) { netObj?.unselectAll(); $("#net-node").innerHTML = ""; } });
  drawNetwork();
}
function definitionHtml(g) {
  const d = g.definition || {}, s = g.summary || {};
  const count = `${fmt(s.nodes)} nút · ${fmt(s.edges)} cạnh${s.universities != null ? ` (${fmt(s.universities)} trường, ${fmt(s.majors)} ngành)` : ""}`;
  const rows = [["Loại đồ thị", d.type], ["Nút", d.nodes], ["Cạnh", d.edges], ["Trọng số", d.weight], ["Ngưỡng / tham số", d.params], ["Số nút / cạnh", count], ["Đọc kết quả", d.reading]];
  const limit = Number(g.viz_edge_limit || 1500).toLocaleString("vi-VN");
  return `<section class="net-def"><h3>Định nghĩa đồ thị</h3>
    ${d.type ? "" : `<p>${esc(g.description || "")}</p>`}
    <dl>${rows.filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
    <p class="muted small">Hình chỉ vẽ ${limit} cạnh nặng nhất; độ đo tính trên toàn mạng.</p></section>`;
}
function summaryHtml(s) {
  const groups = {};
  for (const [k, v] of Object.entries(s)) {
    const [label, tip, grp] = summaryLabel(k);
    (groups[grp] ||= []).push(`<tr><td>${th(k, [label, tip])}</td><td class="num">${esc(typeof v === "number" ? fmt4(v) : v)}</td></tr>`);
  }
  return [...Object.keys(MG), "other"].filter((g) => groups[g]).map((g) =>
    `<h4 class="net-group">${g === "other" ? "Khác" : MG[g]}</h4><table>${groups[g].join("")}</table>`).join("");
}
async function drawNetwork() {
  const [name, year] = (() => { const v = $("#net-name").value; const i = v.lastIndexOf("_"); return [v.slice(0, i), v.slice(i + 1)]; })();
  let g;
  try { g = await api(`api/network/${name}?year=${year}`); } catch (e) { $("#net-side").innerHTML = `<p class="muted">Lỗi: ${esc(e.message)}</p>`; return; }
  const linked = new Set(g.edges.flatMap((e) => [e.source, e.target]));
  g.nodes = g.nodes.filter((n) => linked.has(n.id));
  netData = g;
  const maxS = Math.max(...g.nodes.map((n) => n.size || 1));
  const nodes = g.nodes.map((n) => ({ id: n.id, label: n.label, value: n.size || 1,
    title: `${n.label}${n.group != null ? `\nCộng đồng: ${n.group + 1}` : ""}\n${Object.entries(n.metrics || {}).map(([k, v]) => `${nodeLabel(k)[0]}: ${fmt4(v)}`).join("\n")}`,
    color: n.group != null ? PALETTE[n.group % PALETTE.length] : (n.kind === "major" ? "#e8590c" : "#1f5eff"), shape: n.kind === "major" ? "diamond" : "dot",
    font: { size: (n.size || 1) > maxS * 0.3 ? 14 : 0 } }));
  const edges = g.edges.map((e) => ({ from: e.source, to: e.target, value: e.weight || 1, arrows: g.directed ? "to" : undefined, color: { opacity: 0.25 } }));
  if (netObj) netObj.destroy();
  netNodes = new vis.DataSet(nodes);
  netObj = new vis.Network($("#net-canvas"), { nodes: netNodes, edges }, {
    physics: { solver: "forceAtlas2Based", stabilization: { iterations: 400, fit: true } },
    nodes: { scaling: { min: 4, max: 40 } }, edges: { scaling: { min: 0.5, max: 4 }, smooth: false }, interaction: { hover: true, tooltipDelay: 80 } });
  // Vat ly chi dung de tinh bo cuc ban dau; xong thi tat de hinh dung yen (keo tha nut van duoc).
  netObj.once("stabilizationIterationsDone", () => { netObj.setOptions({ physics: false }); netObj.fit(); });
  netObj.on("click", (p) => { if (p.nodes.length) showNode(p.nodes[0]); });
  // tim nut + loc cong dong
  $("#net-find").value = ""; netLastFind = "";
  $("#net-find-list").innerHTML = g.nodes.map((n) => `<option value="${esc(n.label)}"></option>`).join("");
  const comm = {};
  g.nodes.forEach((n) => { if (n.group != null) comm[n.group] = (comm[n.group] || 0) + 1; });
  const keys = Object.keys(comm).map(Number).sort((a, b) => a - b);
  $("#net-comm").innerHTML = `<option value="">Mọi cộng đồng</option>` + keys.map((k) => `<option value="${k}">Cộng đồng ${k + 1} · ${comm[k]} nút trên hình</option>`).join("");
  $("#net-comm").disabled = !keys.length;
  const top = Object.entries(g.top || {}).map(([m, rows]) => `<h3>Top ${th(m, nodeLabel(m))}</h3><table>${rows.map((r) => `<tr><td>${esc(r[0])}</td><td class="num">${fmt4(r[1])}</td></tr>`).join("")}</table>${m === "eigenvector" ? `<p class="net-note small">${EIG_NOTE}</p>` : ""}`).join("");
  $("#net-side").innerHTML = `<h3>${esc(g.title || name)} · ${year}</h3>${definitionHtml(g)}<div id="net-node" aria-live="polite"></div>
    <h3>Chỉ số toàn mạng</h3><p class="muted small">Rê chuột lên tên chỉ số để xem ý nghĩa và công thức.</p>${summaryHtml(g.summary || {})}${top}`;
}
function findNode(q) {
  if (!netData || !q.trim()) return;
  netLastFind = q;
  const key = unaccent(q), n = netData.nodes.find((x) => unaccent(x.label) === key) || netData.nodes.find((x) => unaccent(x.label).includes(key));
  if (!n) { $("#net-node").innerHTML = `<p class="muted small">Không thấy nút “${esc(q)}” trên hình (hình chỉ có các nút thuộc những cạnh nặng nhất).</p>`; return; }
  if (netNodes.get(n.id)?.hidden) { $("#net-comm").value = ""; filterCommunity(); }
  netObj.selectNodes([n.id]);
  netObj.focus(n.id, { scale: 1.4, animation: { duration: 400 } });
  showNode(n.id);
}
function showNode(id) {
  const n = netData?.nodes.find((x) => x.id === id);
  if (!n) return;
  const rows = Object.entries(n.metrics || {}).map(([k, v]) => `<tr><td>${th(k, nodeLabel(k))}</td><td class="num">${fmt4(v)}</td></tr>`).join("");
  $("#net-node").innerHTML = `<section class="net-def net-node-card"><div class="net-node-head"><h3>${esc(n.label)}</h3><button type="button" id="net-node-close" aria-label="Bỏ chọn nút">✕</button></div>
    <p class="muted small">${n.kind === "major" ? "Ngành" : "Trường"} · ${esc(n.id.slice(2))}${n.group != null ? ` · Cộng đồng ${n.group + 1}` : ""}</p><table>${rows}</table></section>`;
  $("#net-node").scrollIntoView({ block: "nearest" });
}
function filterCommunity() {
  if (!netData) return;
  const v = $("#net-comm").value, g = v === "" ? null : Number(v);
  netNodes.update(netData.nodes.map((n) => ({ id: n.id, hidden: g != null && n.group !== g })));
}

/* ---------- init ---------- */
function tuitionCoverageHtml(d) {
  const s = META.stats, src = s.tuition_sources || { old: {}, new: {} };
  const n = (o, k) => o[k] || 0;
  const unverified = d.tuition_missing.filter((u) => u.unverified).length;
  return `<h2>Học phí</h2>
    <p><b>${s.tuition_unis}/${s.unis} trường có mức học phí</b> (${fmt(s.tuition_unis / s.unis * 100)}%).</p>
    <ul><li>Bộ đầu (${Object.values(src.old).reduce((a, b) => a + b, 0)} trường, quy về triệu đồng/năm; tín chỉ × 30, học kỳ × 2, tháng × 10 ghi ở từng thẻ): ${n(src.old, "official")} trang/đề án chính thức · ${n(src.old, "press")} báo chí · ${n(src.old, "aggregator")} trang tổng hợp.</li>
    <li>Bộ tra tay bổ sung (${Object.values(src.new).reduce((a, b) => a + b, 0)} trường, giữ đơn vị gốc, không quy đổi sang năm): ${n(src.new, "official")} chính thức · ${n(src.new, "official_archived")} văn bản chính thức (bản lưu) · ${n(src.new, "secondary")} tham khảo · ${n(src.new, "unverified")} chưa xác minh được mức tiền.</li></ul>
    <h3>${d.tuition_missing.length} trường còn thiếu mức học phí${unverified ? ` (${unverified} có thông báo nhưng chưa xác minh được số tiền)` : ""}</h3>
    <ul class="tuition-missing-list">${d.tuition_missing.map((u) => `<li>${esc(u.uni_code)} · ${esc(u.name)}${u.unverified ? ` <span class="muted small">— chưa xác minh</span>` : ""}</li>`).join("")}</ul>`;
}
// Cach thu thap (crawler.fetch, data/raw/fetch_log.csv) + phieu lam sach (data/clean/quality_report.md)
const dash = (v) => (v == null || v === "" ? "—" : typeof v === "number" ? fmt(v) : esc(v));
const hhmm = (s) => (s ? `${String(s).slice(11, 16)} ngày ${ddmmyyyy(s)}` : "—");
function crawlHtml(c) {
  if (!c) return "";
  const rows = [
    ["Nguồn", `<a href="${esc(c.source)}" target="_blank" rel="noopener">${esc(c.source.replace(/^https?:\/\//, ""))}</a> (API JSON công khai)`],
    ["API 1 · danh mục trường", `<code>${esc(c.apis[0])}</code> → ${dash(c.catalog)} cơ sở, trong đó ${dash(c.universities)} trường đại học được tải điểm`],
    ["API 2 · điểm chuẩn", `<code>${esc(c.apis[1])}</code> → mỗi trường × mỗi năm 1 request`],
    ["Các năm", c.years.length ? c.years.join(", ") : "—"],
    ["Số request điểm chuẩn", `${dash(c.requests)}${c.universities && c.years.length ? ` (= ${c.universities} trường × ${c.years.length} năm)` : ""} · lỗi: ${dash(c.errors)}`],
    ["Kết quả", `${dash(c.pages_with_rows)} trang có điểm · ${dash(c.unis_with_rows)} trường có điểm · ${dash(c.raw_rows)} dòng thô`],
    ["Thời gian chạy", c.started ? `${hhmm(c.started)} → ${hhmm(c.finished)}` : "—"],
    ["Lịch sự với máy chủ", `Nghỉ ≥ ${fmt(c.delay_seconds)} giây giữa 2 request (cộng thêm ngẫu nhiên 0–0,5 giây); ${c.robots ? "kiểm robots.txt trước mỗi request" : "—"}; chạy lại bỏ qua file đã tải`],
  ];
  return `<section class="card"><h2>Cách thu thập</h2>
    <ol class="flow"><li>Lấy danh mục trường</li><li>Lọc trường đại học</li><li>Tải điểm chuẩn từng trường × năm</li><li>Lưu JSON gốc vào data/raw/cutoff/&lt;năm&gt;/&lt;mã&gt;.json</li><li>Ghi nhật ký fetch_log.csv</li></ol>
    <div class="tbl-wrap"><table class="kv"><tbody>${rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join("")}</tbody></table></div>
    <p class="muted small">Số liệu đọc từ nhật ký thu thập data/raw/fetch_log.csv và data/raw/schools.json do crawler/fetch.py ghi.</p></section>`;
}
function cleaningHtml(c) {
  if (!c) return `<section class="card"><h2>Các bước làm sạch</h2><p class="muted">Chưa có data/clean/quality_report.md — chạy python -m pipeline.clean.</p></section>`;
  let left = 0;
  const funnel = c.steps.filter((s) => s.kind !== "info").map((s) => {
    left = s.kind === "raw" ? s.rows : s.kind === "remove" ? left - s.rows : left;
    const n = s.kind === "remove" ? `− ${fmt(s.rows)}` : fmt(s.rows);
    return `<tr class="${s.kind === "remove" ? "" : "funnel-strong"}"><td>${esc(s.label)}</td><td class="num">${n}</td><td class="num">${s.kind === "final" ? fmt(s.rows) : fmt(left)}</td></tr>`;
  }).join("");
  const info = c.steps.filter((s) => s.kind === "info");
  const total = c.match_how.reduce((a, r) => a + r.rows, 0);
  return `<section class="card"><h2>Các bước làm sạch</h2>
    <p class="muted small">Theo báo cáo chất lượng data/clean/quality_report.md (pipeline/clean.py, tạo ${esc(c.report_date || "—")}).${c.funnel_ok ? "" : " <b>Cảnh báo: số dòng thô trừ các bước bỏ/gộp không bằng bảng sạch.</b>"}</p>
    <h3>Phễu số dòng</h3>
    <div class="tbl-wrap"><table class="funnel"><thead><tr><th>Bước</th><th class="num">Thay đổi</th><th class="num">Còn lại</th></tr></thead><tbody>${funnel}</tbody></table></div>
    ${info.length ? `<p class="small"><b>Ghi nhận thêm (không làm đổi số dòng):</b></p><ul class="small">${info.map((s) => `<li>${esc(s.label)}: ${fmt(s.rows)}</li>`).join("")}</ul>` : ""}
    <h3>Gán mã ngành 7 số (cột match_how)</h3>
    <div class="tbl-wrap"><table><thead><tr><th>Cách gán</th><th>Ý nghĩa</th><th class="num">Số dòng</th><th class="num">Tỉ lệ</th></tr></thead><tbody>
    ${c.match_how.map((r) => `<tr><td><code>${esc(r.how)}</code></td><td>${esc(r.label)}</td><td class="num">${fmt(r.rows)}</td><td class="num">${esc(String(r.pct).replace(".", ","))}</td></tr>`).join("")}
    <tr class="funnel-strong"><td colspan="2">Tổng</td><td class="num">${fmt(total)}</td><td></td></tr></tbody></table></div>
    <h3>Cờ chất lượng (cột flag)</h3>
    <div class="tbl-wrap"><table><thead><tr><th>Cờ</th><th>Ý nghĩa</th><th class="num">Số dòng</th></tr></thead><tbody>
    ${c.flags.map((r) => `<tr><td><code>${esc(r.flag)}</code></td><td>${esc(r.label)}</td><td class="num">${fmt(r.rows)}</td></tr>`).join("")}</tbody></table></div>
    <p class="muted small">Dòng có cờ vẫn giữ trong bảng sạch để tra cứu; mạng G4, xu hướng điểm, Xếp nguyện vọng và Tư vấn chỉ dùng dòng không cờ.</p></section>`;
}
async function loadCoverage() {
  const out = $("#coverage-out");
  try {
    const d = await api("api/coverage");
    $("#coverage-how").innerHTML = crawlHtml(d.crawl) + cleaningHtml(d.cleaning);
    out.innerHTML = `<div class="card"><p>Dữ liệu cập nhật ngày ${esc(META.updated_on.split("-").reverse().join("/"))} (xử lý) · thu thập ngày ${esc(ddmmyyyy(META.collected_on))}.</p><p>Nguồn: <a href="${esc(d.source_url)}" target="_blank" rel="noopener">tuyensinh247</a> · Thu thập: ${esc(d.collected_from?.slice(0, 10))} đến ${esc(d.collected_to?.slice(0, 10))}.</p>
      <p>${d.universities.length} trường có điểm · ${d.missing.length} trường trong danh mục nguồn chưa có điểm trong các năm ${d.years.join(", ")}. Ô số là số dòng điểm, dấu — là chưa có dữ liệu; không có nghĩa trường không tuyển sinh.</p>
      <p>Xếp hạng: <a href="${esc(META.ranking_source.url)}" target="_blank" rel="noopener">VNUR 2026</a> · ${META.stats.ranked_unis} trường có hạng, gồm ${META.stats.inherited_unis} đơn vị kế thừa hạng đại học mẹ. Hạng 2026 dùng tham khảo cho mọi năm, không phải hạng riêng của trường thành viên.</p>
      ${tuitionCoverageHtml(d)}
      <h2>Độ hot trong tab Tư vấn</h2>
      <p><b>Độ hot = 0,5 × điểm trường + 0,3 × điểm ngành + 0,2 × điểm xu hướng</b>, mỗi phần trong khoảng 0–1; kết quả xếp từ cao xuống thấp.</p>
      <ul><li><b>Điểm trường</b>: hạng VNUR 2026 trực tiếp 1 → 1,0 … 100 → 0,01 (= (101 − hạng)/100); hạng kế thừa đại học mẹ nhân 0,8; chưa xếp hạng = 0.</li>
      <li><b>Điểm ngành</b>: percentile của mức tăng số trường mở ngành (mã ngành 7 số) từ 2024 đến 2026, lấy từ bậc của nút ngành trong mạng G1. ${META.stats.hot_majors} ngành (10% cao nhất) gắn nhãn “Ngành hot 2026”. Dòng chưa có mã ngành = 0.</li>
      <li><b>Điểm xu hướng</b>: percentile mức thay đổi điểm chuẩn 2025 → 2026 của chính chương trình (cùng trường, mã chương trình, phương thức, thang điểm), so trong cùng phương thức; thiếu một trong hai năm = 0,5.</li></ul>
      <p>Đề án: ${META.stats.dean_unis}/${META.stats.unis} trường có bài nguồn <a href="https://huongnghiep.hocmai.vn/" target="_blank" rel="noopener">HOCMAI</a>; mỗi phương thức tách thành đối tượng, điều kiện, cách tính điểm, điểm cộng, chỉ tiêu, ghi chú (gạch đầu dòng ngắn, không chép nguyên đoạn). Tỉnh/thành dùng địa chỉ chính thức đã đối chiếu, VNUR và HOCMAI; thống nhất tên tỉnh sau sắp xếp 2025. Còn ${d.universities.filter((u) => u.province === "Khác").length} trường “Khác”. Với trường có nhiều cơ sở dùng tỉnh trụ sở chính; phân hiệu có mã riêng dùng tỉnh của phân hiệu.</p>
      <div class="tbl-wrap"><table><thead><tr><th>Trường</th>${d.years.map((y) => `<th class="num">${y}</th>`).join("")}</tr></thead><tbody>
      ${d.universities.map((u) => `<tr><td><a href="#uni/${esc(u.uni_code)}/${d.years[0]}" data-uni="${esc(u.uni_code)}">${esc(u.uni_code)} · ${esc(u.name)}</a></td>${d.years.map((y) => `<td class="num">${u.counts[y] ? fmt(u.counts[y]) : "—"}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <h2>${d.missing.length} trường nguồn chưa có điểm</h2><ul class="missing-list">${d.missing.map((u) => `<li>${esc(u.uni_code)} · ${esc(u.name)}</li>`).join("")}</ul></div>`;
  } catch (e) { fail(out, e); }
}
$("#coverage-out").addEventListener("click", (e) => {
  const a = e.target.closest("[data-uni]");
  if (a) {
    e.preventDefault();
    $("#uni-year").value = a.hash.split("/")[2];
    showTab("uni"); curUni = a.dataset.uni; loadUni();
  }
});

(async function init() {
  try { META = await api("api/meta"); } catch (e) { $("#stats").textContent = "Lỗi: " + e.message; return; }
  $("#data-updated").textContent = `Dữ liệu cập nhật ngày ${META.updated_on.split("-").reverse().join("/")}. `;
  document.querySelectorAll(".data-dates").forEach((e) => (e.textContent = datesText()));
  const yearOpts = META.years.map((y) => `<option>${y}</option>`).join("");
  ["#uni-year", "#major-year"].forEach((s) => ($(s).innerHTML = yearOpts));
  const mOpts = META.methods.map((m) => `<option value="${m.method}">${esc(m.method_name)}</option>`).join("");
  $("#major-method").insertAdjacentHTML("beforeend", mOpts);
  $("#major-method").value = "THPT";
  UNIVERSITIES = (await Data.searchIndex()).unis;
  $("#uni-province").insertAdjacentHTML("beforeend", [...new Set(UNIVERSITIES.map((u) => u.province))].sort((a, b) => a.localeCompare(b, "vi")).map((p) => `<option>${esc(p)}</option>`).join(""));
  renderUniGrid();
  const st = META.stats;
  $("#stats").textContent = `${st.rows.toLocaleString("vi-VN")} điểm chuẩn · ${st.unis} trường · ${st.majors} ngành · năm ${META.years.slice().reverse().join(", ")}`;
  const [tab, code, year] = location.hash.slice(1).split("/");
  if (tab) showTab(tab);
  if (year && META.years.includes(+year)) ["#uni-year", "#major-year"].forEach((s) => ($(s).value = year));
  if (tab === "uni" && code) { curUni = code; $("#uni-q").value = code; loadUni(); }
  if (tab === "major" && code) {
    curMajor = code.startsWith("~") ? { name: decodeURIComponent(code.slice(1)) } : { code };
    $("#major-q").value = curMajor.name || code;
    loadMajor();
  }
})();
