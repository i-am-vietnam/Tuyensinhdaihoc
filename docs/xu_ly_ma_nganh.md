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
| Mã ngành trong bảng `majors` | 472 | 457 |
| Dòng điểm có `major_code` | 69.276 | 69.149 |
| Dòng chưa có `major_code` | 1.735 | 1.862 |
| Mã sai cấu trúc (700/730/780/790…) | 15 | 0 |
| Tên ngành có ngoặc/ghi chú/số | 41 | 1 |
| Dòng tên chương trình chỉ là mã số | 15 | 0 |
| `match_how = ma_7_so` | 56.418 | 56.298 |
| `match_how = ten_khop` | 9.425 | 9.413 |
| `match_how = thu_cong` | 2.055 | 2.040 |
| `match_how = (trống)` | 1.680 | 1.686 |
| `match_how = bo_ma_nguon` | 0 | 115 |
| `match_how = thu_cong_bo` | 55 | 61 |
| `match_how = ten_tu_ma` | 0 | 15 |
| `match_how = doi_ma_nguon` | 0 | 5 |
| Trang ngành `/nganh/<slug>/` | 331 | 328 |
| URL trong sitemap.xml | 622 | 619 |

Các hạng mục trong `kiem_tra_ma_nganh.md`:

| Hạng mục | Trước | Sau |
|---|---|---|
| 1. Mã sai cấu trúc (3 số đầu không phải lĩnh vực của danh mục) | 15 mã, 132 dòng | 0 mã, 0 dòng |
| 2. Tên ngành chuẩn lấy từ tên chương trình, không phải tên danh mục | 42 mã | 1 mã |
| 3a. Tên chương trình khác hẳn tên ngành, mã do ghép tự động/thủ công | 34 cặp, 350 dòng | 34 cặp, 350 dòng |
| 3b. Tên chương trình khác hẳn tên ngành, mã do nguồn ghi | 165 cặp, 765 dòng | 157 cặp, 737 dòng |
| 3c. Tên chương trình chứa tên ngành nhưng thêm ≥ 3 từ (chuyên ngành hẹp) | 638 cặp, 3087 dòng | 646 cặp, 3130 dòng |
| 4. Một mã dùng cho các chương trình khác nghĩa ở các trường | 2 mã | 0 mã |
| 5. Tên chương trình chỉ là mã số (nguồn thiếu tên) | 5 cặp, 15 dòng | 0 cặp, 0 dòng |

Mục 2 còn 1 tên: 7860222 "Quân sự cơ sở - Quân khu 1" (chỉ 1 trường, đã có trong danh sách cần duyệt).

## URL trang ngành cũ → mới

Các trang lên ngày 08/11/2026, Google chưa lập chỉ mục nên không cần redirect.

| Mã | URL cũ | URL mới |
|---|---|---|
| 7210227 | /nganh/dao-dien-am-thanh-anh-sang-san-khau-7210227/ | /nganh/dao-dien-su-kien-le-hoi-7210227/ |
| 7229047 | /nganh/di-san-hoc-chuyen-nganh-di-san-va-phat-trien-du-lich-7229047/ | /nganh/di-san-hoc-7229047/ |
| 7340202 | /nganh/tai-chinh-va-ke-toan-bfa-7340202/ | /nganh/tai-chinh-va-ke-toan-7340202/ |
| 7480112 | /nganh/khoa-hoc-du-lieu-va-tri-tue-nhan-tao-he-ky-su-03-chuyen-nganh-khoa-hoc-du-lieu-tri-tue-nhan-tao-phan-tich-du-lieu-kinh-doanh-7480112/ | /nganh/khoa-hoc-du-lieu-va-tri-tue-nhan-tao-7480112/ |
| 7480118 | /nganh/he-thong-nhung-va-iot-dao-tao-bang-tieng-viet-7480118/ | /nganh/he-thong-nhung-va-iot-7480118/ |
| 7480203 | /nganh/ky-thuat-du-lieu-tieng-viet-7480203/ | /nganh/ky-thuat-du-lieu-7480203/ |
| 7510104 | /nganh/ky-thuat-giao-thong-thong-minh-sme-7510104/ | /nganh/cong-nghe-ky-thuat-giao-thong-7510104/ |
| 7510208 | /nganh/nang-luong-tai-tao-dao-tao-bang-tieng-viet-7510208/ | /nganh/nang-luong-tai-tao-7510208/ |
| 7519002 | /nganh/cong-nghe-nong-nghiep-moi-tuyen-nam-2026-7519002/ | /nganh/cong-nghe-nong-nghiep-7519002/ |
| 7520101 | /nganh/ky-thuat-co-khi-may-xay-dung-7520101/ | /nganh/co-ky-thuat-7520101/ |
| 7520117 | /nganh/ky-thuat-cong-nghiep-dao-tao-bang-tieng-viet-7520117/ | /nganh/ky-thuat-cong-nghiep-7520117/ |
| 7520119 | /nganh/co-dien-tu-7520119/ | /nganh/co-dien-tu-o-to-7520119/ |
| 7520208 | /nganh/ky-thuat-dien-va-may-tinh-ece-7520208/ | /nganh/cong-nghe-internet-van-vat-7520208/ |
| 7520215 | /nganh/ky-thuat-dien-dien-tu-vi-mach-ban-dan-moi-tuyen-nam-2026-7520215/ | /nganh/ky-thuat-dien-dien-tu-7520215/ |
| 7520604 | /nganh/ky-thuat-dau-khi-khoan-khai-thac-mo-dau-khi-7520604/ | /nganh/ky-thuat-dau-khi-7520604/ |
| 7549002 | /nganh/ky-nghe-go-va-noi-that-dao-tao-bang-tieng-viet-7549002/ | /truong/dai-hoc-cong-nghe-ky-thuat-tphcm-spk/#nganh-7549002 (còn 1 trường, không còn trang riêng) |
| 7580210 | /nganh/ky-thuat-ha-tang-do-thi-7580210/ | /nganh/ky-thuat-co-so-ha-tang-7580210/ |
| 7840106 | /nganh/khoa-hoc-hang-hai-02-chuyen-nganh-khoa-hoc-hang-hai-quan-ly-hang-hai-va-logistics-7840106/ | /nganh/khoa-hoc-hang-hai-7840106/ |
| 7860100 | /nganh/nganh-nghiep-vu-an-ninh-7860100/ | /nganh/nghiep-vu-an-ninh-7860100/ |
| 7900102 | /nganh/marketing-va-truyen-thong-7900102/ | — (bỏ: mã thí điểm, để trống major_code) |
| 7903124 | /nganh/song-nganh-kinh-te-tai-chinh-7903124/ | — (bỏ: mã thí điểm, để trống major_code) |

## Danh mục tên ngành cần duyệt (145 mã `can_xem`)

Duyệt trong `data/manual/danh_muc_nganh.csv`: sửa cột `ten` nếu cần, đổi `nguon_ten` thành `da_duyet`, rồi chạy `pipeline.clean` → `sna.build` → `scripts/export_static.py`. Cột “Tên cũ” để `=` khi không đổi.

### chỉ 1 trường (126)

| Mã | Tên chọn | Tên cũ trong `majors` | Số trường | Ví dụ tên gốc |
|---|---|---|---|---|
| 7140107 | Quản trị chất lượng giáo dục | = | 1 |  |
| 7140214 | Sư phạm Kỹ thuật công nghiệp | Sư phạm Kỹ thuật công nghiệp (chuyên ngành Công nghệ thông tin) | 1 | Sư phạm Kỹ thuật công nghiệp (chuyên ngành Công nghệ thông tin) |
| 7140215 | Sư phạm Kỹ thuật nông nghiệp | = | 1 |  |
| 7140227 | SP tiếng H'mong | = | 1 |  |
| 7140232 | Sư phạm Tiếng Nga | = | 1 |  |
| 7140235 | Sư phạm tiếng Đức | = | 1 |  |
| 7140236 | Sư phạm tiếng Nhật | = | 1 |  |
| 7140250 | Sư phạm Tin học và Công nghệ Tiểu học | = | 1 |  |
| 7210107 | Gốm | = | 1 |  |
| 7210112 | Nhiếp ảnh nghệ thuật | = | 1 |  |
| 7210204 | Chỉ huy âm nhạc | = | 1 |  |
| 7210206 | Thanh nhạc | = | 1 |  |
| 7210213 | Nghệ thuật học | = | 1 |  |
| 7210226 | Nhạc công kịch hát dân tộc | = | 1 |  |
| 7210233 | Biên kịch điện ảnh | = | 1 |  |
| 7210244 | Huấn luyện múa | = | 1 |  |
| 7210303 | Thiết kế âm thanh ánh sáng | = | 1 |  |
| 7210405 | Âm nhạc | = | 1 |  |
| 7210406 | Nghệ thuật hóa trang | Thiết kế mỹ thuật sân khấu | 1 | Thiết kế mỹ thuật sân khấu |
| 7210407 | Đồ họa công nghệ số | = | 1 |  |
| 7220106 | Ngôn ngữ Khmer | = | 1 |  |
| 7220110 | Sáng tác văn học | = | 1 |  |
| 7220113 | Ngôn ngữ và Văn hóa các dân tộc thiếu số Việt Nam | = | 1 |  |
| 7220207 | Ngôn ngữ Bồ Đào Nha | = | 1 |  |
| 7220211 | Ngôn ngữ Ả Rập | = | 1 |  |
| 7220212 | Văn hóa và truyền thông xuyên quốc gia | = | 1 |  |
| 7220214 | Ngôn ngữ Thái Lan | = | 1 |  |
| 7229008 | Chủ nghĩa xã hội khoa học | = | 1 |  |
| 7310111 | Nghiên cứu phát triển | = | 1 |  |
| 7310113 | Kinh tế thể thao | = | 1 |  |
| 7310120 | Kinh doanh quốc tế | = | 1 |  |
| 7310399 | Giới và Phát triển | = | 1 |  |
| 7310603 | Việt Nam học | = | 1 |  |
| 7310615 | Nhật Bản học | = | 1 |  |
| 7311020 | Quản lý Nhà nước | = | 1 |  |
| 7320110 | Quảng cáo | = | 1 |  |
| 7320113 | Công nghệ đa phương tiện | = | 1 |  |
| 7320115 | Truyền thông số | = | 1 |  |
| 7340002 | Quản trị kinh doanh | = | 1 |  |
| 7340102 | Quản trị - Luật | = | 1 |  |
| 7340109 | Kinh tế số | Kinh tế số (Phân hiệu Bắc Ninh) | 1 | Kinh tế số (Phân hiệu Bắc Ninh) |
| 7340124 | Quản trị và Kinh doanh Quốc tế | = | 1 |  |
| 7340129 | Quản trị kinh doanh thực phẩm | = | 1 |  |
| 7340155 | Marketing | = | 1 |  |
| 7340410 | Quản trị công nghệ truyền thông | = | 1 |  |
| 7347010 | Quản trị kinh doanh | = | 1 |  |
| 7349002 | Quản lý giải trí và sự kiện | = | 1 |  |
| 7420205 | Công nghệ sinh học y dược | = | 1 |  |
| 7440107 | Công nghệ Vật lý điện tử và tin học | Công nghệ Vật lý điện tử và tin học (Chương trình tăng cường tiếng Anh) (dự kiến) | 1 | Công nghệ Vật lý điện tử và tin học (Chương trình tăng cường tiếng Anh) (dự kiến) |
| 7440229 | Quản lý và phân tích dữ liệu khoa học | = | 1 |  |
| 7460104 | Khoa học dữ liệu | = | 1 |  |
| 7480206 | Địa tin học | = | 1 |  |
| 7489001 | Công nghệ và đổi mới sáng tạo | = | 1 |  |
| 7510101 | Công nghệ kỹ thuật kiến trúc | = | 1 |  |
| 7510106 | Hệ thống kỹ thuật công trình xây dựng | Hệ thống kỹ thuật công trình xây dựng (đào tạo bằng tiếng Việt) | 1 | Hệ thống kỹ thuật công trình xây dựng (đào tạo bằng tiếng Việt) |
| 7510204 | Công nghệ kỹ thuật cơ điện tử ô tô | = | 1 |  |
| 7510210 | Điện lạnh và điều hòa không khí | = | 1 |  |
| 7510212 | Công nghệ ôtô | = | 1 |  |
| 7510213 | Thiết kế cơ khí và kiểu dáng công nghiệp | = | 1 |  |
| 7510251 | Kỹ thuật ô tô và năng lượng mới | = | 1 |  |
| 7510604 | Kinh tế công nghiệp | = | 1 |  |
| 7510606 | Logistics Quốc tế | Logistics Quốc tế (Dạy bằng tiếng Trung Quốc) | 1 | Logistics Quốc tế (Dạy bằng tiếng Trung Quốc) |
| 7510701 | Công nghệ dầu khí và khai thác dầu | = | 1 |  |
| 7510801 | Công nghệ kỹ thuật in | Công nghệ Kỹ thuật in (đào tạo bằng tiếng Việt) | 1 | Công nghệ kỹ thuật in (Tiếng Việt) |
| 7519003 | Công nghệ kỹ thuật khuôn mẫu | = | 1 |  |
| 7520202 | Kỹ thuật Y sinh | = | 1 |  |
| 7520206 | Kỹ thuật biển | Kỹ thuật biển (Giàn khoan và Tuabin gió) | 1 | Kỹ thuật biển (Giàn khoan và Tuabin gió) |
| 7520219 | Hệ thống giao thông thông minh | = | 1 |  |
| 7520220 | Kỹ thuật Thiết kế Vi mạch | Kỹ thuật Thiết kế Vi mạch - thuộc ngành Công nghệ KT Điện tử - Viễn thông (Tiếng Việt) | 1 | Kỹ thuật Thiết kế Vi mạch - thuộc ngành Công nghệ KT Điện tử - Viễn thông (Tiếng Việt) |
| 7520502 | Kỹ thuật địa vật lý | = | 1 |  |
| 7520505 | Đá quý Đá mỹ nghệ | = | 1 |  |
| 7520605 | Kỹ thuật khí thiên nhiên | = | 1 |  |
| 7520606 | Công nghệ số trong thăm dò và khai thác tài nguyên thiên nhiên | = | 1 |  |
| 7540103 | Công nghệ hóa thực phẩm | = | 1 |  |
| 7540118 | Công nghệ Thực phẩm và sức khỏe | Công nghệ Thực phẩm và sức khỏe – EFTH | 1 | Công nghệ Thực phẩm và sức khỏe – EFTH |
| 7549002 | Kỹ nghệ gỗ và nội thất | Kỹ nghệ gỗ và nội thất (đào tạo bằng tiếng Việt) | 1 | Kỹ nghệ gỗ và nội thất (đào tạo bằng tiếng Việt) |
| 7580110 | Thiết kế đô thị | Thiết kế đô thị (Chương trình tiên tiến) | 1 | Thiết kế đô thị (Chương trình tiên tiến) |
| 7580112 | Đô thị học | = | 1 |  |
| 7580199 | Thiết kế đô thị | Thiết kế đô thị (Chương trình tiên tiến) | 1 | Thiết kế đô thị (Chương trình tiên tiến) |
| 7580204 | Xây dựng công trình ngầm thành phố và Hệ thống tàu điện ngầm | = | 1 |  |
| 7580215 | Kỹ thuật an toàn giao thông | Kỹ thuật an toàn giao thông (Ngành tuyển sinh các năm trước: Công nghệ kỹ thuật giao thông - Chuyên ngành: Kỹ thuật an toàn giao thông) | 1 | Kỹ thuật an toàn giao thông (Ngành tuyển sinh các năm trước: Công nghệ kỹ thuật giao thông - Chuyên ngành: Kỹ thuật an toàn giao thông) |
| 7620102 | Khuyến nông | = | 1 |  |
| 7620111 | Khoa học cây trồng | = | 1 |  |
| 7620113 | Công nghệ rau hoa quả và cảnh quan | = | 1 |  |
| 7620119 | Kinh doanh và khởi nghiệp nông thôn | = | 1 |  |
| 7620122 | Nông nghiệp thông minh và bền vững | = | 1 | Nông nghiệp thông minh và bền vững – ESAS |
| 7620191 | Kinh doanh nông nghiệp số | = | 1 |  |
| 7620303 | Khoa học thủy sản | Khoa học thủy sản (02 chuyên ngành: Khoa học thủy sản, Khai thác thủy sản) | 1 | Khoa học thủy sản (02 chuyên ngành: Khoa học thủy sản, Khai thác thủy sản) |
| 7620901 | Nông học | = | 1 |  |
| 7720202 | Công nghệ dược phẩm | = | 1 |  |
| 7720402 | Dinh dưỡng và Khoa học thực phẩm | = | 1 |  |
| 7720497 | Dinh dưỡng và Khoa học thực phẩm | = | 1 |  |
| 7720610 | Kỹ thuật Gây mê hồi sức | = | 1 |  |
| 7760102 | Công tác Thanh thiếu niên | = | 1 |  |
| 7810102 | Du lịch điện tử | = | 1 |  |
| 7810104 | Quản trị du lịch và khách sạn | = | 1 |  |
| 7810105 | Du lịch địa chất | = | 1 |  |
| 7810203 | Quản trị Khách sạn – Nhà hàng | = | 1 |  |
| 7810204 | Quản lý du lịch quốc tế | Quản lý du lịch quốc tế (CTTT) | 1 | Quản lý du lịch quốc tế (CTTT) |
| 7810501 | Kinh tế Gia đình | Kinh tế gia đình | 1 | Kinh tế gia đình |
| 7819009 | Khoa học dinh dưỡng và ẩm thực | = | 1 |  |
| 7819010 | Khoa học chế biến món ăn | = | 1 |  |
| 7840102 | Quản lý hoạt động bay | Quản lý hoạt động bay; Hệ thống kỹ thuật quản lý bay | 1 | Quản lý hoạt động bay; Hệ thống kỹ thuật quản lý bay |
| 7840110 | Quản lý và vận hành hạ tầng | Quản lý và vận hành hạ tầng (đào tạo bằng tiếng Việt) | 1 | Quản lý và vận hành hạ tầng (đào tạo bằng tiếng Việt) |
| 7850105 | Quản lý an toàn, sức khỏe và môi trường | = | 1 |  |
| 7850106 | Quản lý tài nguyên thiên nhiên | = | 1 |  |
| 7850195 | Quản lý tổng hợp tài nguyên nước | = | 1 |  |
| 7850196 | Quản lý tài nguyên khoáng sản | = | 1 |  |
| 7850197 | Quản lý tài nguyên và môi trường biển đảo | = | 1 |  |
| 7850199 | Quản lý biển | = | 1 |  |
| 7850202 | An toàn, Vệ sinh lao động | = | 1 |  |
| 7859007 | Cảnh quan và kỹ thuật hoa viên | = | 1 |  |
| 7860114 | An ninh mạng và phòng chống tội phạm công nghệ cao | Ngành An ninh mạng và phòng chống tội phạm công nghệ cao | 1 | Ngành An ninh mạng và phòng chống tội phạm công nghệ cao |
| 7860202 | Chỉ huy tham mưu Hải quân | = | 1 |  |
| 7860203 | Thiết bị bay không người lái | Thiết bị bay không người lái (miền Bắc) | 1 | Thiết bị bay không người lái (miền Bắc) |
| 7860205 | Chỉ huy tham mưu Pháo binh | = | 1 |  |
| 7860206 | Chỉ huy tham mưu Tăng Thiết giáp | Chỉ huy tham mưu Tăng Thiết giáp (Thí sinh nam miền Bắc) | 1 | Chỉ huy tham mưu Tăng Thiết giáp (Thí sinh nam miền Bắc) |
| 7860207 | Chỉ huy - Tham mưu đặc công | Chỉ huy - Tham mưu đặc công (miền Bắc) | 1 | Chỉ huy - Tham mưu đặc công (miền Bắc) |
| 7860214 | Biên phòng | Biên phòng (Thí sinh miền Bắc) | 1 | Biên phòng (Quân khu 4) |
| 7860218 | Hậu cần quân sự | Ngành Hậu cần Quân sự | 1 | Ngành Hậu cần Quân sự |
| 7860219 | Chỉ huy - Tham mưu Thông tin | Chỉ huy Tham mưu - thông tin | 1 | Chỉ huy - Tham mưu Thông tin (miền Bắc) |
| 7860220 | Kỹ sư quân sự | Kỹ sư quân sự (miền Bắc, thí sinh Nam) | 1 | Đào tạo kỹ sư quân sự |
| 7860226 | Chỉ huy Tham mưu Phòng không, Không quân và Tác chiến điện tử | Ngành Chỉ huy Tham mưu Phòng không, Không quân và Tác chiến điện tử (Thí sinh miền Bắc) | 1 | Ngành Chỉ huy Tham mưu Phòng không, Không quân và Tác chiến điện tử (Thí sinh miền Bắc) |
| 7860228 | Chỉ huy kỹ thuật Công binh | = | 1 |  |
| 7860229 | Chỉ huy Kỹ thuật hóa học | Ngành Chỉ huy Kỹ thuật hóa học | 1 | Ngành Chỉ huy Kỹ thuật hóa học |
| 7860231 | Trinh sát kỹ thuật | = | 1 |  |

### các trường đặt tên khác nhau, tên chọn chỉ 1 trường dùng (15)

| Mã | Tên chọn | Tên cũ trong `majors` | Số trường | Ví dụ tên gốc |
|---|---|---|---|---|
| 7140207 | Huấn luyện thể thao | = | 3 |  |
| 7210227 | Đạo diễn sự kiện lễ hội | Đạo diễn âm thanh, ánh sáng sân khấu | 2 | Đạo diễn âm thanh, ánh sáng sân khấu |
| 7210236 | Quay phim điện ảnh | = | 2 |  |
| 7229047 | Di sản học | Di sản học, chuyên ngành Di sản và phát triển du lịch | 2 | Di sản học, chuyên ngành Di sản và phát triển du lịch |
| 7340202 | Tài chính và Kế toán | Tài chính và Kế toán (BFA) | 2 | Tài chính và Kế toán (BFA) |
| 7349001 | Quản trị thương hiệu | = | 2 |  |
| 7380102 | Luật hiến pháp và luật hành chính | = | 2 |  |
| 7480118 | Hệ thống nhúng và IoT | Hệ thống nhúng và IoT (đào tạo bằng tiếng Việt) | 2 | Hệ thống nhúng và IoT (đào tạo bằng tiếng Việt) |
| 7480203 | Kỹ thuật dữ liệu | Kỹ thuật dữ liệu (Tiếng Việt) | 2 | Kỹ thuật dữ liệu (Tiếng Việt) |
| 7520141 | Công nghệ ô tô điện | = | 2 |  |
| 7520208 | Công nghệ internet vạn vật | Kỹ thuật Điện và Máy tính (ECE) | 2 | Kỹ thuật Điện và Máy tính (ECE) |
| 7580104 | Kiến trúc và thiết kế đô thị thông minh | = | 2 |  |
| 7620190 | Công nghệ nông nghiệp số | = | 2 |  |
| 7729001 | Y sinh học TDTT | = | 2 |  |
| 7850104 | Du lịch sinh thái | = | 2 |  |

### chỉ 1 trường; tên còn dấu hiệu chuyên ngành/ghi chú (3)

| Mã | Tên chọn | Tên cũ trong `majors` | Số trường | Ví dụ tên gốc |
|---|---|---|---|---|
| 7480204 | Khoa học & Kỹ thuật máy tính | Khoa học và Kỹ thuật máy tính | 1 | Khoa học & Kỹ thuật máy tính – BCSE |
| 7840201 | Nhóm ngành tuyển chung | Nhóm ngành tuyển chung (dành cho đối tượng chưa xác định được ngành học) – Chương trình tiên tiến | 1 | Nhóm ngành tuyển chung (dành cho đối tượng chưa xác định được ngành học) – Chương trình tiên tiến |
| 7860222 | Quân sự cơ sở - Quân khu 1 | = | 1 |  |

### tên còn dấu hiệu chuyên ngành/ghi chú (1)

| Mã | Tên chọn | Tên cũ trong `majors` | Số trường | Ví dụ tên gốc |
|---|---|---|---|---|
| 7480200 | Nhóm ngành Kỹ thuật - Hậu cần | = | 2 |  |

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
