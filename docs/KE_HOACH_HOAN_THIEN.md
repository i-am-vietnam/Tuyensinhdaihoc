# KẾ HOẠCH HOÀN THIỆN ĐỒ ÁN SNA — EduRadar V2

> File nhật ký làm việc. **Đọc file này đầu tiên** khi tiếp tục (kể cả khi cuộc trò chuyện mới).
> Quy ước: `[ ]` chưa làm · `[~]` đang làm · `[x]` xong · `[-]` bỏ qua (ghi lý do).
> Mỗi khi xong một việc: đánh dấu, ghi 1 dòng vào **Nhật ký** (ngày, việc, số liệu trước → sau, file đã sửa).

## 0. Trạng thái hiện tại (cập nhật liên tục)

- **Đang ở bước:** 6 — Hoàn thiện trước khi nộp (bước 1–5 xong 21/11; PR #7 đã merge + deploy; slide `docs/EduRadar_SNA.pptx`)
- **Việc tiếp theo:** 6.1 điền bìa slide + báo cáo (người dùng); 6.3 kiểm 20 dòng (người dùng); 6.4 tập thuyết trình. 6.2 xong (closeness G1 ≤ 1); PR #8 (đồ thị đứng yên) đã merge + deploy; 6.2 + slide đang phát hành qua PR (xem nhật ký)
- **Lưu ý:** `sna.build` chạy ~5,5 phút. Sau khi sửa web/dữ liệu: `scripts/export_static.py` → `check_static.py` (+ `--committed`)
  → `node scripts/check_static_browser.cjs`. Báo cáo: `report_sensitivity.py` → `report_sna_tables.py` (bảng chương 3–4)
  → `build_report_figures.py` → `node scripts/capture_report_web.cjs <url>` → `build_report_docx.py` → `check_report.py`.
  Console Git Bash cần `PYTHONIOENCODING=utf-8` để in tiếng Việt.

## 1. Bổ sung / sửa độ đo SNA (`sna/build.py`)

- [x] 1.1 G1 (hai phía): thêm closeness (bipartite), clustering (bipartite, Latapy), avg path length + diameter trên LCC, modularity (Louvain), HITS (tuỳ chọn)
- [x] 1.2 G4 (có hướng): thêm closeness, clustering (directed), avg path length + diameter (trên LCC, coi vô hướng / hoặc SCC lớn nhất), modularity Louvain (bản vô hướng)
- [x] 1.3 Eigenvector G2/G3: xử lý dồn vào clique (thêm bản không trọng số `eigenvector_unw`), điền 0 cho nút ngoài LCC thay vì để trống, ghi chú lý do
- [x] 1.4 Girvan–Newman: chạy trên toàn bộ G3 (≈370 nút) hoặc mẫu hợp lý thay vì 60 nút bậc cao (Q≈0,002)
- [x] 1.5 Degree distribution: biểu đồ log-log + ước lượng số mũ power-law (γ), ghi vào summary
- [x] 1.6 Chạy lại `sna.build` 3 năm, ghi số trước → sau vào nhật ký
- [x] 1.7 Chép `data/network/**` + `site/data/network/*.json` (định dạng compact như export_static) về máy; không cần chạy lại export_static cho phần mạng

## 2. Sửa web (tab Mạng SNA, Độ phủ, đầu trang)

- [x] 2.1 Thẻ "Định nghĩa đồ thị" cho G1–G4: loại đồ thị, nút, cạnh, trọng số, ngưỡng, số nút/cạnh
- [x] 2.2 Nhãn tiếng Việt + tooltip công thức cho bảng chỉ số (thay `gn_best_modularity`…)
- [x] 2.3 Hiện 2 mốc thời gian: "Thu thập 23/10/2026 · Xử lý 09/11/2026" ở đầu trang + tab SNA
- [x] 2.4 Tab Độ phủ: sơ đồ thu thập (nguồn, API, số request, độ trễ) + bảng phễu làm sạch 76.726 → 71.011
- [x] 2.5 Đồ thị: ô tìm nút, click nút xem độ đo, lọc theo cộng đồng (nếu còn thời gian)
- [x] 2.6 Kiểm tra FastAPI + bản tĩnh `site/` (scripts/check_static.py), commit nhánh v2-simple, deploy (PR #7, 21/11)

## 3. Gephi

- [x] 3.1 Xuất `docs/fig/gephi_g2_2026.png`, `docs/fig/gephi_g3_2026.png` — **người dùng làm trên Gephi**
  - G2: mở `data/network/gexf/g2_uni_uni_2026.gexf` (Undirected) → kiểm **250 nút, 2.540 cạnh**
  - G3: mở `data/network/gexf/g3_major_major_2026.gexf` → kiểm **370 nút, 1.391 cạnh**
  - Appearance → Nodes → Color → Partition → `community` (Louvain đã tính, G2 19 cụm, G3 20 cụm; KHÔNG chạy lại Modularity của Gephi)
  - Appearance → Nodes → Size → Ranking → `degree` (min 5, max 40)
  - Layout ForceAtlas2: Scaling 2–10, bật Prevent Overlap (+ LinLog nếu cụm dính nhau), chạy tới khi ổn định
  - Nhãn: chỉ hiện nhãn nút bậc cao (Filter hoặc chỉnh label size theo degree)
  - Preview → nền trắng, Export PNG ≥ 1600 px → lưu đúng 2 tên file trên
- [ ] 3.2 (tuỳ chọn) G4 2026: màu theo `community` (5 cụm), size theo `authority`, Layout ForceAtlas2 → `docs/fig/gephi_g4_2026.png`

## 4. Báo cáo (`docs/BAO_CAO_DO_AN.md` → Word)

- [x] 4.1 Cập nhật toàn bộ số liệu theo `summary.csv` mới (đang lệch: 249/2531/20/0,4822 vs 250/2540/19/0,4845)
- [x] 4.2 Cập nhật link web diemthidaihoc.com (README + báo cáo), ngày xử lý 09/11, ngày thu thập 23/10
- [x] 4.3 Thêm 2 tab mới: Xếp nguyện vọng, Tư vấn chọn ngành (RIASEC/MBTI); sửa "năm tab" → "sáu tab"
- [x] 4.4 Thêm mục trả lời thẳng 8 câu của thầy (đồ thị, nút, cạnh, trọng số, thu thập, thời gian, làm sạch, độ đo)
- [x] 4.5 Thêm kết quả độ đo mới (G1, G4, eigenvector không trọng số, GN toàn G3, γ power-law)
- [x] 4.6 Chèn hình Gephi + ảnh web mới; rút gọn lý thuyết; xuất Word (`scripts/build_report_docx.py`)

## 5. Slide thuyết trình

- [x] 5.1 Dàn ý: rút còn 14 slide cho 10–15 phút; câu của thầy gắn nhãn "Câu 1–4", "Câu 5 · 6", "Câu 7", "Câu 8"
- [x] 5.2 Slide `docs/EduRadar_SNA.pptx` (14 trang, ~13 phút, ghi chú lời nói từng slide; kịch bản demo ~3 phút ở ghi chú slide 12). Số GN/Louvain không trọng số dùng bản đã sửa (G2 0,32/0,43; G3 0,81/0,82)

> Bảng dàn ý 18 slide bên dưới là bản nháp ban đầu, đã thay bằng bản 14 slide trong file pptx.

## 6. Hoàn thiện trước khi nộp

- [ ] 6.1 Điền slide bìa (họ tên – MSSV, GVHD) và trang bìa báo cáo `[Họ tên — MSSV]`, `[Lớp]`, `[Giảng viên]`, `[Ngày nộp]`; xuất lại Word
- [x] 6.2 (tuỳ chọn) Closeness G1: 24 ngành quân sự > 1 do chuẩn hoá hai phía → đổi sang `nx.closeness_centrality` (Wasserman–Faust, ≤ 1), chạy lại sna.build + script báo cáo + export_static
- [ ] 6.3 Điền kết quả kiểm 20 dòng (Phụ lục C) — người dùng đối chiếu tay với trang trường
- [ ] 6.4 Tập thuyết trình theo ghi chú slide; chuẩn bị trả lời: trọng số G1, ngưỡng Jaccard 0,25 (độ nhạy 4.5), localization eigenvector, authority đổi dấu
- [x] 6.5 Commit file kế hoạch + slide, push, deploy nếu có sửa web

### Dàn ý slide đề xuất (5.1 — chờ người dùng duyệt)

| # | Slide | Nội dung / hình |
|---|---|---|
| 1 | Bìa | Tên đề tài, nhóm, GVHD, link diemthidaihoc.com |
| 2 | Bài toán & mục tiêu | Câu hỏi nghiên cứu (chương 1) |
| 3 | Quy trình tổng thể | crawler → clean → SQLite → SNA → web (docs/fig/data_flow.png) |
| 4 | Thu thập dữ liệu | Nguồn, 2 API, 921 request = 307 trường × 3 năm, 0 lỗi, 23/10/2026 13:51–14:20, nghỉ ≥ 1,5 s, robots.txt |
| 5 | Làm sạch & chuẩn hoá | Phễu 76.726 → 71.011 (cleaning_funnel.png), gán mã ngành 97,33%, cờ chất lượng |
| 6 | Trả lời 8 câu trọng tâm | Bảng: đồ thị, nút, cạnh, trọng số, thu thập, thời gian, làm sạch, độ đo |
| 7 | Bốn mạng G1–G4 | Định nghĩa + hình chiếu (projection.png) |
| 8 | Bảng độ đo toàn mạng 2026 | density, path, diameter, clustering, modularity, assortativity × 4 mạng |
| 9 | Centrality | Top degree/betweenness/PageRank; eigenvector localization |
| 10 | Phân bố bậc | CCDF log-log, γ ≈ 2,4–3,0, đuôi nặng không scale-free thuần |
| 11 | Cộng đồng G2 | Gephi G2 + Louvain vs Girvan–Newman |
| 12 | Cộng đồng G3 | Gephi G3, các khối ngành |
| 13 | Mạng cạnh tranh G4 | HITS/PageRank, Spearman với điểm chuẩn |
| 14 | Dự đoán liên kết & độ hot | Adamic–Adar → ngành tương tự; công thức độ hot |
| 15 | Thay đổi 2024–2026 | Xu hướng số cạnh, cộng đồng, ngành hot |
| 16 | Ứng dụng web (demo) | 6 tab + QR; kịch bản demo 5 phút |
| 17 | Kết luận & hạn chế | Hạn chế dữ liệu, hướng phát triển |
| 18 | Hỏi đáp | |

### Kết quả bước 1 (để dùng cho báo cáo)

- Khoá mới trong `summary.csv`: G1 có density, avg_degree, lcc_nodes, avg_clustering (Latapy), avg_path_length_lcc, diameter_lcc,
  assortativity, louvain_communities, modularity_louvain, uni_/major_powerlaw_*; G2/G3 có gn_* (toàn đồ thị), louvain_unweighted_*,
  powerlaw_*; G4 có avg_degree, scc_nodes, avg_clustering, transitivity, scc_avg_path_length, scc_diameter, avg_path_length_lcc,
  diameter_lcc, assortativity (in–in), louvain_communities, modularity_louvain, in_powerlaw_*.
  Đã bỏ: gn_sample_nodes, louvain_sample_* (báo cáo còn nhắc → sửa ở bước 4).
- Cột mới trong `metrics/*.csv`: G1 closeness, eigenvector, eigenvector_unw, pagerank, authority, clustering, community;
  G2/G3 eigenvector_unw; G4 closeness, eigenvector (trên SCC), clustering, community. Không còn ô trống.
- Số 2026: G1 path 3,28 / diameter 7 / Louvain 21 cụm Q=0,362 / clustering Latapy 0,123;
  G4 SCC 192 nút, path 1,98, diameter 4; LCC bỏ hướng path 1,74, diameter 4; Louvain 5 cụm Q=0,318; assortativity −0,135.
- Girvan–Newman toàn đồ thị (k ≤ 40), Q và Louvain so sánh đều KHÔNG trọng số (sửa 21/11, xem nhật ký): G2 2026 Q=0,3239 (k=32)
  vs Louvain không trọng số 0,4347 (16 cụm); G3 2026 Q=0,8066 (k=23) vs 0,8167 (17 cụm). (Trước: mẫu 60 nút bậc cao, G2 Q=0,002.)
- Eigenvector G3 dồn cụm: có trọng số 34/370 nút > 0,001 (khối ngành địa chất – mỏ, Jaccard = 1);
  không trọng số 52/357 (khối Sư phạm). Giải thích: hiện tượng *localization* trong mạng nhiều khối tách biệt
  → dùng PageRank/degree để xếp hạng toàn cục, eigenvector để chỉ ra "lõi dày đặc nhất".
- Power-law (MLE rời rạc, kmin theo KS, đuôi ≥ max(30, 20% nút)), 2026: G1 trường γ=2,87 (kmin 17), G1 ngành γ=2,44 (kmin 17),
  G2 γ=2,64, G3 γ=2,89, G4 bậc vào γ=3,84; KS ≈ 0,09–0,13 → phân bố đuôi nặng, gần luật lũy thừa ở đuôi nhưng không
  phải scale-free thuần. Hình CCDF log-log có đường khớp ở `data/network/fig/*_degree_*.png`.
- Sửa lỗi nhãn: 3 trường BVS, NHB, NHP có short_name = '' → nhãn trống; dùng `COALESCE(NULLIF(short_name,''), name)`.
- Mọi độ đo cũ không đổi (đã đối chiếu summary cũ/mới).

## Ghi chú kỹ thuật

- Định nghĩa mạng hiện tại:
  - G1: hai phía Trường–Ngành, vô hướng; cạnh = trường có tuyển ngành trong năm; trọng số = số dòng điểm chuẩn của cặp (trường, ngành) (mọi phương thức/chương trình).
  - G2: chiếu Trường–Trường; cạnh khi Jaccard(tập ngành) ≥ 0,25; trọng số = Jaccard.
  - G3: chiếu Ngành–Ngành; cạnh khi Jaccard(tập trường) ≥ 0,25; trọng số = Jaccard.
  - G4: có hướng Trường→Trường; A→B nếu cùng ngành (THPT, thang 30) và điểm B cao hơn A trong (0, 2]; trọng số = số ngành thỏa.
- Dữ liệu: crawled_at 2026-10-23 13:51 → 14:20; quality_report tạo 09/11/2026; 71.011 dòng sạch.

## Nhật ký

| Ngày | Việc | Kết quả / số liệu | File |
|---|---|---|---|
| 21/11/2026 | Đánh giá dự án, lập kế hoạch | Xác định thiếu độ đo G1/G4, eigenvector G3 dồn clique (34/370 > 0,001), GN Q≈0,002, báo cáo lệch số | docs/KE_HOACH_HOAN_THIEN.md |
| 21/11/2026 | Bước 1: bổ sung độ đo G1/G4, eigenvector đủ nút + bản không trọng số, GN toàn đồ thị, power-law + CCDF, sửa nhãn 3 trường | Xem "Kết quả bước 1"; GN G2 Q 0,002 → 0,380; G3 0,660 → 0,826 | sna/build.py, data/network/**, site/data/network/*.json |
| 21/11/2026 | Kiểm bước 1 tại máy Windows: sao lưu summary.csv, chạy `.venv\Scripts\python.exe -m sna.build` (5 phút 35 giây) | summary.csv 12 dòng × 54 cột trùng hoàn toàn bản trước (chỉ khác compute_seconds, gn_seconds); 12 file metrics G1–G4 giống hệt từng ô, 0 ô trống; cột degree G1 2024/2026 không đổi (0/689, 0/697 khác) → điểm "Ngành hot" không đổi; link_prediction_*.csv chỉ khác thứ tự cặp (a,b)/(b,a) và vài cặp bằng điểm ở ngưỡng cắt 300 (297–300/300 trùng), web không dùng | — |
| 21/11/2026 | Bước 2 (2.1–2.5): thẻ Định nghĩa đồ thị (trường `definition`, `viz_edge_limit` trong payload, đã chạy lại `sna.build`: summary vẫn trùng); nhãn tiếng Việt + tooltip công thức, gom 6 nhóm, khóa lạ vẫn hiện tên gốc; ghi chú localization eigenvector; 2 mốc ngày (meta.collected_on = MAX(crawled_at) 23/10/2026, updated_on 09/11/2026) ở hero + tab SNA; tab Độ phủ thêm "Cách thu thập" (fetch_log.csv: 921 request = 307 trường × 3 năm, 0 lỗi, 833 trang có điểm, 292 trường, 76.726 dòng thô, 13:51–14:20 23/10; nghỉ ≥ 1,5 s; robots.txt) và "Các bước làm sạch" (đọc quality_report.md: 76.726 − 69 − 0 − 4.961 − 685 = 71.011, bảng match_how 11 cách, 4 cờ); tìm nút, click xem độ đo nút, lọc cộng đồng | ruff check/format đạt; export_static 3.730 file; check_static + --committed PASS; check_static_browser PASS; kiểm riêng 12 mạng × (375, 1280 px), tìm/click/lọc, độ phủ, không tràn ngang, 0 lỗi console; ảnh docs/fig/web_network.png, web_coverage.png | sna/build.py, webapp/main.py, webapp/static/{app.js,index.html,style.css}, site/*, docs/fig/web_network.png, docs/fig/web_coverage.png |
| 21/11/2026 | Claude (chat) kiểm kết quả bước 2: xem ảnh web_network/web_coverage, định nghĩa G4 khớp code, ngày lấy từ meta; gỡ `.git/index.lock` rỗng do lệnh git status của Claude để lại | Đạt; chưa commit (Claude Code đang chờ browser check) | docs/KE_HOACH_HOAN_THIEN.md |
| 21/11/2026 | Sửa lỗi bước 1: `girvan_newman_full` gọi `louvain_communities`/`modularity` không truyền `weight` nên cột “không trọng số” thực ra có trọng số (G2 2026 0,4845 trùng bản có trọng số); thêm `weight=None`, chạy lại `sna.build` | Chỉ đổi `gn_*`, `louvain_unweighted_*`, thời gian; mọi cột khác và metrics/*.csv giữ nguyên. G2 2026: GN 0,3795 → 0,3239, Louvain kt 0,4845 → 0,4347 (19 → 16 cụm); G3: GN 0,8255 → 0,8066, Louvain kt 0,8363 → 0,8167 (20 → 17 cụm) | sna/build.py, data/network/**, site/data/network/*.json |
| 21/11/2026 | Kiểm trình duyệt: trang SEO YPB tràn ngang 417 px ở 375 px do ô ngày của bảng “Mốc thời gian” đề án không xuống dòng (lỗi có sẵn, CSS cũ cũng lỗi) | Thêm `table.timeline td.num{white-space:normal}` cho màn ≤ 640 px; quét 619 trang trường/ngành: 0 tràn; check_static_browser PASS toàn bộ | webapp/static/style.css, site/style.css |
| 21/11/2026 | Bước 4: báo cáo theo số hiện tại. Script mới `report_sensitivity.py` (tính lại độ nhạy: G2/G3 × 5 ngưỡng, G4 × 3 khoảng, ARI/NMI, AA, dao động điểm), `report_sna_tables.py` (31 bảng chương 3–4 từ summary/metrics/definition); `build_report_figures.py` đọc độ nhạy từ JSON và dùng hình CCDF + power-law của sna.build; `capture_report_web.cjs` nhận URL, thêm tab Tư vấn chọn ngành. Báo cáo: mục “Trả lời 8 câu hỏi trọng tâm”, chương 3 rút gọn (12 độ đo, mỗi mục định nghĩa–công thức–kết quả–ý nghĩa), 4.2 GN toàn đồ thị, 4.5 độ nhạy mới, 5.4 hai hình Gephi, chương 6 sáu tab (nv.js, career.js), link diemthidaihoc.com, ngày 23/10 và 09/11 | Số trước → sau: G2 2026 249/2.531/20/0,4822 → 250/2.540/19/0,4845; G3 377/1.412/19 → 370/1.391/20; G1 705/5.058 → 697/5.046; mã ngành 472 → 455; dòng có mã 69.276 → 69.112 (97,56% → 97,33%); Spearman G4 2026 authority 0,2343 → 0,2349, PageRank 0,6069 → 0,6075. check_report: 11 lỗi → 0/58; docx 63 bảng, 29 hình, 93 công thức OMML | docs/BAO_CAO_DO_AN.md/.docx, docs/do_nhay_sna.md/.json, docs/kiem_tra_bao_cao.md, docs/fig/*, README.md, scripts/report_sensitivity.py, scripts/report_sna_tables.py, scripts/build_report_figures.py, scripts/check_report.py, scripts/capture_report_web.cjs |
| 21/11/2026 | Push v2-simple (b4ff9f85 → ee328c70), tạo PR #7 v2-simple → main (check CI "EduRadar V2 checks" SUCCESS), merge (e5d8d8c2). Deploy Pages tự chạy (run 44892145678) lỗi ở bước deploy-pages: "No artifacts named github-pages" dù upload-pages-artifact đã upload xong (12.956.869 byte) — độ trễ phía GitHub, chạy lại job vẫn lỗi; chạy lượt mới bằng workflow_dispatch (run 44892357709) thì thành công, không sửa workflow | diemthidaihoc.com Last-Modified 21/11/2026 10:02 GMT; Edge headless: tab Mạng SNA có thẻ "Định nghĩa đồ thị" (G2 2026: 250 nút · 2.540 cạnh), hai mốc "Thu thập dữ liệu: 23/10/2026 · Xử lý/cập nhật: 09/11/2026", 0 lỗi JS; coverage.json có khối crawl | docs/KE_HOACH_HOAN_THIEN.md |
| 21/11/2026 | Bước 5: Claude (chat) dựng slide 14 trang từ báo cáo + summary.csv + hình docs/fig (Gephi cắt viền) | Validate pptx đạt, kiểm hình từng slide | docs/EduRadar_SNA.pptx |
| 21/11/2026 | Đồ thị tab Mạng SNA trôi/xoay mãi do physics vis-network chạy liên tục → ổn định 400 vòng rồi tắt physics (`stabilizationIterationsDone`), vẫn kéo thả nút được | Chưa commit/deploy; sửa cả webapp/static/app.js và site/app.js (giống hệt) | webapp/static/app.js, site/app.js |
| 21/11/2026 | Phát hành sửa physics: export_static (site/app.js trùng webapp/static/app.js), check_static + --committed PASS, check_static_browser PASS; kiểm riêng 12 mạng trên bản tĩnh, FastAPI và diemthidaihoc.com: ổn định sau 0,9–3,3 s, vị trí nút không đổi sau đó, kéo thả/zoom/click chạy, 0 lỗi console. Commit de2c70d6, PR #8 (CI đạt) merge aa690d1f, Pages run 44893992063 thành công ngay lần đầu | Máy thiếu bộ nhớ ảo (commit còn ~1,5 GB) làm uvicorn lỗi OpenBLAS → tắt tiến trình kiểm cũ bị treo, chạy kiểm với OPENBLAS_NUM_THREADS=1 (không sửa code) | webapp/static/app.js, site/app.js |
| 21/11/2026 | 6.2: closeness G1 đổi `bipartite.closeness_centrality` → `nx.closeness_centrality(g1)` (Wasserman–Faust); chạy lại sna.build, report_sensitivity, report_sna_tables, export_static | summary.csv: 0 cột lệch; metrics: chỉ cột closeness của g1_uni_major_{2024,2025,2026} đổi, 0 ô trống; số đỉnh G1 closeness > 1: 22/21/24 → 0, max 2026 1,6035 → 0,4570. Top 5 G1 2026: Công nghệ thông tin 0,4570, Quản trị kinh doanh 0,4506, Ngôn ngữ Anh 0,4449, Kế toán 0,4329, Tài chính – Ngân hàng 0,4091. report_sensitivity.py sửa cho tất định (làm tròn eigenvector, xếp AA theo điểm rồi tên cặp; trước đó cặp bằng điểm làm AA 0,35 dao động 57/58); báo cáo 3.2.3 + Bảng 3.9 có cột G1, bỏ câu “không xếp hạng được” ở 3.2.3 và 7.2. check_static + --committed PASS, check_report 58/58, docx 63 bảng | sna/build.py, scripts/report_sensitivity.py, scripts/report_sna_tables.py, docs/BAO_CAO_DO_AN.md/.docx, docs/do_nhay_sna.*, site/data/network/*.json |
