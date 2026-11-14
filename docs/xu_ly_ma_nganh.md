# Xử lý mã ngành (nhánh fix-ma-nganh, 08/11/2026)

Theo [kiem_tra_ma_nganh.md](kiem_tra_ma_nganh.md). Đã chạy lại `pipeline.clean`, `sna.build`, `scripts/export_static.py`, `scripts/report_major_codes.py` và toàn bộ kiểm thử.

## Đã làm

1. `data/manual/major_map.csv` thêm dòng sửa mã do nguồn ghi (cơ chế mới trong `pipeline/clean.py`, khoá `ma:<mã>` hoặc `ma:<mã>@<trường>`):
   - mã gõ nhầm: `ma:7000204` → 7220204, `ma:7301010` → 7310106, `ma:7801103` → 7810103 (`match_how = doi_ma_nguon`, 5 dòng);
   - để trống `major_code`, giữ `program_code` (`match_how = bo_ma_nguon`): 12 mã 790…, `ma:7549002@DTN`, `ma:7349001@DHK`;
   - thêm 2 tên `marketing va truyen thong`, `quan tri nhan luc va nhan tai` → `-`: đây là chính chương trình thí điểm 7900102/7900103 của QHD ở năm nguồn không ghi mã (mã MAC, HAT). Không chặn thì các dòng này tự ghép sang 7340115/7340404, một chương trình năm có mã năm không. Các trường khác dùng tên này đều có mã nguồn nên không bị ảnh hưởng.
2. `data/manual/danh_muc_nganh.csv` (ma, ten, nguon_ten, so_truong, so_truong_cung_ten, ly_do, vi_du_goc) sinh bằng `scripts/build_danh_muc_nganh.py`: tên chương trình phổ biến nhất giữa các trường sau khi bỏ phần trong ngoặc và hậu tố (đào tạo bằng…, CTTT, chương trình…, chuyên ngành…, miền Bắc, thí sinh…, mới tuyển năm…, thuộc ngành…, đuôi viết tắt như “– BCSE”). `pipeline.clean` lấy `majors.major_name` từ file này. Dòng có `nguon_ten = da_duyet` không bị script ghi đè.
3. `pipeline.clean`: tên chương trình chỉ là mã số được thay bằng tên ngành chuẩn (`match_how = ten_tu_ma`, 15 dòng QSY).
4. Mục 3a: đối chiếu 34 cặp với `data/raw/cutoff` (các trường `code`, `display_code`, `block_code`, `school_code`, mọi năm). 0 cặp có mã nguồn khác, nên không sửa cặp nào (bảng cuối).
5. Slug: 19 ngành đổi tên nên đổi slug trong `seo_slugs.csv` (chỉ lần này).

## Số liệu trước / sau

| Chỉ số | Trước | Sau |
|---|---|---|
| Mã ngành trong bảng `majors` | 472 | 455 |
| Dòng điểm có `major_code` | 69.276 | 69.112 |
| Dòng chưa có `major_code` | 1.735 | 1.899 |
| Mã sai cấu trúc (700/730/780/790…) | 15 | 0 |
| Tên ngành có ngoặc/ghi chú/số | 41 | 0 |
| Dòng tên chương trình chỉ là mã số | 15 | 0 |
| `match_how = ma_7_so` | 56.418 | 56.261 |
| `match_how = ten_khop` | 9.425 | 9.413 |
| `match_how = thu_cong` | 2.055 | 2.040 |
| `match_how = (trống)` | 1.680 | 1.686 |
| `match_how = bo_ma_nguon` | 0 | 152 |
| `match_how = thu_cong_bo` | 55 | 61 |
| `match_how = ten_tu_ma` | 0 | 15 |
| `match_how = doi_ma_nguon` | 0 | 5 |
| Trang ngành `/nganh/<slug>/` | 331 | 327 |
| URL trong sitemap.xml | 622 | 618 |

Các hạng mục trong `kiem_tra_ma_nganh.md`:

| Hạng mục | Trước | Sau |
|---|---|---|
| 1. Mã sai cấu trúc (3 số đầu không phải lĩnh vực của danh mục) | 15 mã, 132 dòng | 0 mã, 0 dòng |
| 2. Tên ngành chuẩn lấy từ tên chương trình, không phải tên danh mục | 42 mã | 0 mã |
| 3a. Tên chương trình khác hẳn tên ngành, mã do ghép tự động/thủ công | 34 cặp, 350 dòng | 34 cặp, 350 dòng |
| 3b. Tên chương trình khác hẳn tên ngành, mã do nguồn ghi | 165 cặp, 765 dòng | 159 cặp, 745 dòng |
| 3c. Tên chương trình chứa tên ngành nhưng thêm ≥ 3 từ (chuyên ngành hẹp) | 638 cặp, 3087 dòng | 649 cặp, 3141 dòng |
| 4. Một mã dùng cho các chương trình khác nghĩa ở các trường | 2 mã | 0 mã |
| 5. Tên chương trình chỉ là mã số (nguồn thiếu tên) | 5 cặp, 15 dòng | 0 cặp, 0 dòng |

Cột Trước: dữ liệu và site trên main trước nhánh này (bản đang chạy). Cột Sau: sau khi xử lý và duyệt.

## URL trang ngành: bản đang chạy → bản mới

Các trang lên ngày 08/11/2026, Google chưa lập chỉ mục nên không cần redirect.

| Mã | URL cũ | URL mới |
|---|---|---|
| 7210227 | /nganh/dao-dien-am-thanh-anh-sang-san-khau-7210227/ | /nganh/dao-dien-san-khau-7210227/ |
| 7210236 | /nganh/quay-phim-dien-anh-7210236/ | /nganh/quay-phim-7210236/ |
| 7229047 | /nganh/di-san-hoc-chuyen-nganh-di-san-va-phat-trien-du-lich-7229047/ | /nganh/di-san-hoc-7229047/ |
| 7340202 | /nganh/tai-chinh-va-ke-toan-bfa-7340202/ | /nganh/tai-chinh-va-ke-toan-7340202/ |
| 7380102 | /nganh/luat-hien-phap-va-luat-hanh-chinh-7380102/ | /nganh/luat-hien-phap-va-hanh-chinh-7380102/ |
| 7480112 | /nganh/khoa-hoc-du-lieu-va-tri-tue-nhan-tao-he-ky-su-03-chuyen-nganh-khoa-hoc-du-lieu-tri-tue-nhan-tao-phan-tich-du-lieu-kinh-doanh-7480112/ | /nganh/khoa-hoc-du-lieu-va-tri-tue-nhan-tao-7480112/ |
| 7480118 | /nganh/he-thong-nhung-va-iot-dao-tao-bang-tieng-viet-7480118/ | /nganh/he-thong-nhung-va-iot-7480118/ |
| 7480200 | /nganh/nhom-nganh-ky-thuat-hau-can-7480200/ | — (bỏ: mã thí điểm, để trống major_code) |
| 7480203 | /nganh/ky-thuat-du-lieu-tieng-viet-7480203/ | /nganh/ky-thuat-du-lieu-7480203/ |
| 7510104 | /nganh/ky-thuat-giao-thong-thong-minh-sme-7510104/ | /nganh/cong-nghe-ky-thuat-giao-thong-7510104/ |
| 7510208 | /nganh/nang-luong-tai-tao-dao-tao-bang-tieng-viet-7510208/ | /nganh/nang-luong-tai-tao-7510208/ |
| 7519002 | /nganh/cong-nghe-nong-nghiep-moi-tuyen-nam-2026-7519002/ | /nganh/cong-nghe-nong-nghiep-7519002/ |
| 7520101 | /nganh/ky-thuat-co-khi-may-xay-dung-7520101/ | /nganh/co-ky-thuat-7520101/ |
| 7520117 | /nganh/ky-thuat-cong-nghiep-dao-tao-bang-tieng-viet-7520117/ | /nganh/ky-thuat-cong-nghiep-7520117/ |
| 7520208 | /nganh/ky-thuat-dien-va-may-tinh-ece-7520208/ | /nganh/ky-thuat-dien-va-may-tinh-7520208/ |
| 7520215 | /nganh/ky-thuat-dien-dien-tu-vi-mach-ban-dan-moi-tuyen-nam-2026-7520215/ | /nganh/ky-thuat-dien-dien-tu-7520215/ |
| 7520604 | /nganh/ky-thuat-dau-khi-khoan-khai-thac-mo-dau-khi-7520604/ | /nganh/ky-thuat-dau-khi-7520604/ |
| 7549002 | /nganh/ky-nghe-go-va-noi-that-dao-tao-bang-tieng-viet-7549002/ | /truong/dai-hoc-cong-nghe-ky-thuat-tphcm-spk/#nganh-7549002 (còn 1 trường, không còn trang riêng) |
| 7580104 | /nganh/kien-truc-va-thiet-ke-do-thi-thong-minh-7580104/ | /nganh/kien-truc-do-thi-7580104/ |
| 7580210 | /nganh/ky-thuat-ha-tang-do-thi-7580210/ | /nganh/ky-thuat-co-so-ha-tang-7580210/ |
| 7729001 | /nganh/y-sinh-hoc-tdtt-7729001/ | /nganh/y-sinh-hoc-the-duc-the-thao-7729001/ |
| 7840106 | /nganh/khoa-hoc-hang-hai-02-chuyen-nganh-khoa-hoc-hang-hai-quan-ly-hang-hai-va-logistics-7840106/ | /nganh/khoa-hoc-hang-hai-7840106/ |
| 7860100 | /nganh/nganh-nghiep-vu-an-ninh-7860100/ | /nganh/nghiep-vu-an-ninh-7860100/ |
| 7900102 | /nganh/marketing-va-truyen-thong-7900102/ | — (bỏ: mã thí điểm, để trống major_code) |
| 7903124 | /nganh/song-nganh-kinh-te-tai-chinh-7903124/ | — (bỏ: mã thí điểm, để trống major_code) |

## Duyệt danh mục tên ngành (09/11/2026)

- 126 mã chỉ có 1 trường: giữ tên đã làm sạch, `da_duyet`.
- 7860222 → "Quân sự cơ sở", 7480204 → "Khoa học và Kỹ thuật máy tính".
- 7480200 "Nhóm ngành Kỹ thuật - Hậu cần" (HCB, HCN) và 7840201 "Nhóm ngành tuyển chung" (UTH) là nhóm ngành: `ma:7480200,-`, `ma:7840201,-` trong `major_map.csv` (chỉ hiện ở trang trường).
- 16 mã các trường đặt tên khác nhau (cả 7520119): tên nhiều trường dùng nhất; hoà thì tên ngắn hơn. Trước khi so, gộp các dạng gõ gần trùng (độ giống ≥ 0,95, VD "Inernet"/"internet", "loT"/"IoT") và loại tên trùng tên chuẩn của mã khác trong danh mục (trường ghi nhầm mã). Cột `ten_khac` ghi các tên còn lại (bỏ tên dài > 60 ký tự hoặc là tên chương trình); trang ngành hiện "Tên khác: …" dưới h1 và trong description nếu còn chỗ.

| Mã | Tên chọn | Tên khác | Tên trùng tên chuẩn của mã khác | Ứng viên (số trường: trường) |
|---|---|---|---|---|
| 7140207 | Huấn luyện thể thao | — | Huấn luyện thể thao (7810302), Giáo dục mầm non (7140201), Giáo dục Thể chất (7140206) | Huấn luyện thể thao (1: DTS); Giáo dục mầm non (1: DQB); Giáo dục Thể chất (1: TDV) |
| 7210227 | Đạo diễn sân khấu | Đạo diễn sự kiện lễ hội \| Đạo diễn âm thanh, ánh sáng sân khấu | — | Đạo diễn âm thanh, ánh sáng sân khấu (1: SKD); Đạo diễn sự kiện lễ hội (1: SKD); Đạo diễn sân khấu (1: DSD) |
| 7210236 | Quay phim | Quay phim điện ảnh \| Quay phim truyền hình | — | Quay phim điện ảnh (1: SKD); Quay phim truyền hình (1: SKD); Quay phim (1: DSD) |
| 7229047 | Di sản học | Quản trị tài nguyên di sản | — | Di sản học (1: VHS); Quản trị tài nguyên di sản (1: QHK) |
| 7340202 | Tài chính và Kế toán | — | Tài chính – Ngân hàng (7340201) | Tài chính và Kế toán (1: VGU); Tài chính – Ngân hàng (1: DPT) |
| 7349001 | Quản trị thương hiệu | Quản trị thương hiệu và truyền thông | — | Quản trị thương hiệu (1: QHK); Quản trị thương hiệu và truyền thông (1: DAD) |
| 7380102 | Luật hiến pháp và hành chính | Luật hiến pháp và luật hành chính | — | Luật hiến pháp và luật hành chính (1: TDV); Luật hiến pháp và hành chính (1: DCL) |
| 7480118 | Hệ thống nhúng và IoT | — | — | Hệ thống nhúng và IoT (1: SPK); Chương trình tiên tiến Việt-Mỹ ngành Hệ thống Nhúng và IoT (1: DDK) |
| 7480203 | Kỹ thuật dữ liệu | — | Công nghệ đa phương tiện (7329001) | Kỹ thuật dữ liệu (1: SPK); Công nghệ đa phương tiện (1: ETU) |
| 7520141 | Công nghệ ô tô điện | Công nghệ ô tô thông minh \| Công nghệ ô tô điện và ô tô hybrid | — | Công nghệ ô tô điện (1: DKC); Công nghệ ô tô điện và ô tô hybrid (1: GTA); Công nghệ ô tô thông minh (1: DKC) |
| 7520208 | Kỹ thuật Điện và Máy tính | Công nghệ internet vạn vật | — | Công nghệ internet vạn vật (1: BVS); Kỹ thuật Điện và Máy tính (1: VGU) |
| 7580104 | Kiến trúc đô thị | Kiến trúc và thiết kế đô thị thông minh | — | Kiến trúc và thiết kế đô thị thông minh (1: KSA); Kiến trúc đô thị (1: DTT); Cử nhân Kiến trúc và thiết kế đô thị thông minh song bằng UEH - ĐH Auckland, New Zealand (1: KSA) |
| 7620190 | Công nghệ nông nghiệp số | — | Nông nghiệp công nghệ cao (7620118) | Công nghệ nông nghiệp số (1: QSA); Nông nghiệp công nghệ cao (1: TTB) |
| 7729001 | Y sinh học thể dục thể thao | Y sinh học TDTT | — | Y sinh học TDTT (1: TDB); Y sinh học thể dục thể thao (1: TDS) |
| 7850104 | Du lịch sinh thái | — | Quản lý an toàn; sức khỏe và môi trường (7850105) | Du lịch sinh thái (1: LNH); Quản lý an toàn; sức khỏe và môi trường (1: DHT) |
| 7520119 | Cơ điện tử | Cơ điện tử ô tô | — | Cơ điện tử ô tô (2: GTA,PKA); Cơ điện tử (2: DQH,DTC) |

Ghi chú: 7140207 có cả 3 tên đều là tên chuẩn của mã khác (DQB "Giáo dục mầm non", TDV "Giáo dục Thể chất", DTS "Huấn luyện thể thao") nên giữ tên đã sinh "Huấn luyện thể thao". 7729001 chọn tên đầy đủ "Y sinh học thể dục thể thao" thay cho dạng viết tắt "Y sinh học TDTT" (cùng nghĩa).

### URL đổi thêm khi duyệt (7)

| Mã | URL trước (báo cáo 08/11) | URL mới |
|---|---|---|
| 7210227 | /nganh/dao-dien-su-kien-le-hoi-7210227/ | /nganh/dao-dien-san-khau-7210227/ |
| 7210236 | /nganh/quay-phim-dien-anh-7210236/ | /nganh/quay-phim-7210236/ |
| 7380102 | /nganh/luat-hien-phap-va-luat-hanh-chinh-7380102/ | /nganh/luat-hien-phap-va-hanh-chinh-7380102/ |
| 7520119 | /nganh/co-dien-tu-o-to-7520119/ | /nganh/co-dien-tu-7520119/ |
| 7520208 | /nganh/cong-nghe-internet-van-vat-7520208/ | /nganh/ky-thuat-dien-va-may-tinh-7520208/ |
| 7580104 | /nganh/kien-truc-va-thiet-ke-do-thi-thong-minh-7580104/ | /nganh/kien-truc-do-thi-7580104/ |
| 7729001 | /nganh/y-sinh-hoc-tdtt-7729001/ | /nganh/y-sinh-hoc-the-duc-the-thao-7729001/ |
| 7480200 | /nganh/nhom-nganh-ky-thuat-hau-can-7480200/ | — (nhóm ngành, để trống major_code) |

## Mục 3a: 34 cặp đã đối chiếu nguồn thô

| Trường | Tên chương trình | Mã | Tên ngành chuẩn | Dòng | Cách ghép | Mã nguồn | Kết luận |
|---|---|---|---|---|---|---|---|
| BKA | Tiếng Anh KHKT và Công nghệ | 7220201 | Ngôn ngữ Anh | 13 | thủ công (major_map.csv) | FL1 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| BKA | Tiếng Anh chuyên nghiệp quốc tế | 7220201 | Ngôn ngữ Anh | 8 | thủ công (major_map.csv) | FL2 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| BKA | Tiếng Anh chuyên nghiệp quốc tế (do ĐHBK Hà Nội và ĐH Plymouth Marjon - Vương quốc Anh cấp bằng) | 7220201 | Ngôn ngữ Anh | 5 | thủ công (major_map.csv) | FL2 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| DAD | Thiết kế vi mạch bán dẫn (*) | 7480108 | Công nghệ kỹ thuật máy tính | 8 | tự động: tên khớp | 1251 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| DTK | Kỹ thut ô tô và giao thông thông minh (Ngành Kỹ thuật cơ khí động lực) | 7520116 | Kỹ thuật cơ khí động lực | 1 | thủ công (major_map.csv) | KDO2 | Nguồn ghi mã 7520116, trùng mã đang gán: giữ |
| GTA | Hải quan và Logistics | 7340201 | Tài chính - Ngân hàng | 12 | tự động: tên khớp | GTADCH2, GTADCHL2, GTADCHQ2 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| GTA | Hải quan và Logistics (tăng cường tiếng Anh) | 7340201 | Tài chính - Ngân hàng | 10 | tự động: tên khớp | GTADCHQA2, GTADCLHA2 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| GTA | Logistics (Trường Đại học Tongmyong - Hàn Quốc cấp bằng) | 7340101 | Quản trị kinh doanh | 5 | tự động: tên khớp | GTADKLG2 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| GTA | Logistics và vận tải đa phương thức | 7310101 | Kinh tế | 12 | tự động: tên khớp | GTADCVL2 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| GTA | Thương mại quốc tế | 7340120 | Kinh doanh quốc tế | 10 | tự động: tên khớp | GTADCCI2 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| HHA | Khai thác máy tàu biển | 7840106 | Khoa học hàng hải | 38 | thủ công (major_map.csv) | D102 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| HHA | Khai thác máy tàu biển (Chọn) | 7840106 | Khoa học hàng hải | 25 | thủ công (major_map.csv) | S102 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| HHA | Khai thác máy tàu biển (chọn) | 7840106 | Khoa học hàng hải | 13 | thủ công (major_map.csv) | S102 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| HHA | Tiếng Anh thương mại | 7220201 | Ngôn ngữ Anh | 25 | tự động: tên khớp | D124 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| HHA | Tiếng Anh thương mại (TA hệ số 2) | 7220201 | Ngôn ngữ Anh | 5 | tự động: tên khớp | D124 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| HHA | Điều khiển tàu biển | 7840106 | Khoa học hàng hải | 38 | thủ công (major_map.csv) | D101 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| HHA | Điều khiển tàu biển (Chọn) | 7840106 | Khoa học hàng hải | 25 | thủ công (major_map.csv) | S101 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| HHA | Điều khiển tàu biển (chọn) | 7840106 | Khoa học hàng hải | 13 | thủ công (major_map.csv) | S101 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| HTC | Hải quan và Logistics (Theo đnh hướng FIATA) | 7340201 | Tài chính - Ngân hàng | 1 | tự động: tên khớp | HC0106QT | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| HTC | Thuế và Quản trị thuế (Theo định hướng ACCA) | 7340201 | Tài chính - Ngân hàng | 5 | tự động: tên khớp | 7340201QT01.01, HC0101QT | Nguồn ghi mã 7340201, trùng mã đang gán: giữ |
| HTC | Trí tuệ nhân tạo trong tài chính kế toán | 7480201 | Công nghệ thông tin | 5 | tự động: tên khớp | 7480201, HC1301 | Nguồn ghi mã 7480201, trùng mã đang gán: giữ |
| HTY | Thương mại quốc tế | 7340120 | Kinh doanh quốc tế | 4 | tự động: tên khớp | HY1502 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| KHA | Khởi nghiệp & phát triển KD (BBAE) | 7340101 | Quản trị kinh doanh | 6 | thủ công (major_map.csv) | EP01 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| KHA | Quản lý công và Chính sách (E-PMP) | 7310101 | Kinh tế | 15 | thủ công (major_map.csv) | EPMP | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| NTH | CT CLC Tiếng Anh thương mại | 7220201 | Ngôn ngữ Anh | 4 | tự động: tên khớp | NNAH2.1 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| NTH | CT TC Tiếng Anh thương mại | 7220201 | Ngôn ngữ Anh | 4 | tự động: tên khớp | NNAH1.1 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| NTH | CT TH Tiếng Anh thương mại | 7220201 | Ngôn ngữ Anh | 8 | tự động: tên khớp | NTHNN19 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| NTH | Chương trình CLC Tiếng Anh Thương mại | 7220201 | Ngôn ngữ Anh | 5 | tự động: tên khớp | NNAH2.1 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| NTH | Chương trình tiêu chuẩn Thương mại quốc tế | 7340120 | Kinh doanh quốc tế | 7 | tự động: tên khớp | KTEH1.2 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| NTH | Chương trình tiêu chuẩn Tiếng Anh Thương mại | 7220201 | Ngôn ngữ Anh | 3 | tự động: tên khớp | NNAH1.1 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| QHT | Công nghệ Bán dẫn | 7440102 | Vật lý học | 5 | tự động: tên khớp | QHT99 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| QHT | Công nghệ Bán dẫn (thuộc ngành Khoa học vật liệu) | 7440102 | Vật lý học | 4 | tự động: tên khớp | QHT99 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành). Lưu ý: tên ghi "thuộc ngành Khoa học vật liệu" nhưng gắn 7440102 Vật lý học |
| QST | Công nghệ bán dẫn | 7440102 | Vật lý học | 2 | tự động: tên khớp | 74401a1 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
| TLA | Tài nguyên nước và môi trường (Thủy văn học) | 7440224 | Thủy văn học | 6 | thủ công (major_map.csv) | TLA103 | Nguồn chỉ có mã nội bộ, không có mã 7 số: giữ (chuyên ngành/chương trình thuộc ngành) |
