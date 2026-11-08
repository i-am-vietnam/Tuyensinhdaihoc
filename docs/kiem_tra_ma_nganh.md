# Kiểm tra chất lượng mã ngành

Ngày kiểm: 08/11/2026. Nguồn: `data/eduradar.db` (bảng `majors`, `admissions`). Chỉ báo cáo, chưa sửa dữ liệu. Tạo lại: `.venv\Scripts\python.exe scripts/report_major_codes.py`.

## Tóm tắt

| Hạng mục | Số lượng |
|---|---|
| Mã ngành trong bảng `majors` | 472 |
| Dòng điểm có `major_code` | 69.276 / 71.011 |
| 1. Mã sai cấu trúc (3 số đầu không phải lĩnh vực của danh mục) | 15 mã, 132 dòng |
| 2. Tên ngành chuẩn lấy từ tên chương trình, không phải tên danh mục | 42 mã |
| 3a. Tên chương trình khác hẳn tên ngành, mã do ghép tự động/thủ công | 34 cặp, 350 dòng |
| 3b. Tên chương trình khác hẳn tên ngành, mã do nguồn ghi | 165 cặp, 765 dòng |
| 3c. Tên chương trình chứa tên ngành nhưng thêm ≥ 3 từ (chuyên ngành hẹp) | 638 cặp, 3087 dòng |
| 4. Một mã dùng cho các chương trình khác nghĩa ở các trường | 2 mã |
| 5. Tên chương trình chỉ là mã số (nguồn thiếu tên) | 5 cặp, 15 dòng |

Cặp = (trường, tên chương trình, mã ngành). "Khác hẳn" = sau khi bỏ dấu, bỏ phần trong ngoặc và các từ chung (ngành, chương trình, chất lượng cao, tiếng Anh…), tên chương trình không có từ nào trùng với tên ngành chuẩn. Tổng mục 3a + 3b: 199 cặp, 1115 dòng (1.6% số dòng có mã).

## 1. Mã sai cấu trúc mã 7 số của Bộ

Mã đúng có dạng `7` + 2 số lĩnh vực + 2 số nhóm + 2 số ngành; 3 số đầu phải là một trong 23 lĩnh vực (714 … 786).

| Mã | Tên trong dữ liệu | Loại | Dòng | Trường | Mã danh mục cùng tên |
|---|---|---|---|---|---|
| 7000204 | Ngôn ngữ Trung Quốc | sai lĩnh vực (gõ nhầm?) | 2 | DPX | 7220204 |
| 7301010 | Kinh tế quốc tế | sai lĩnh vực (gõ nhầm?) | 2 | DHV | 7310106 |
| 7801103 | Quản trị dịch vụ du lịch và lữ hành | sai lĩnh vực (gõ nhầm?) | 1 | DPT | 7810103 |
| 7900101 | Quản trị Doanh nghiệp và Công nghệ | mã riêng/thí điểm | 10 | QHD | — |
| 7900102 | Marketing và Truyền thông | mã riêng/thí điểm | 26 | DAD, QHD | — |
| 7900103 | Quản trị Nhân lực và Nhân tài | mã riêng/thí điểm | 9 | QHD | — |
| 7900189 | Quản trị và An ninh | mã riêng/thí điểm | 9 | QHD | — |
| 7900204 | Quản trị đô thị thông minh và bền vững | mã riêng/thí điểm | 16 | QHK | — |
| 7900205 | Quản trị tài nguyên di sản | mã riêng/thí điểm | 15 | QHK | — |
| 7903124 | Song ngành Kinh tế - Tài chính | mã riêng/thí điểm | 11 | DHK, QHF | — |
| 7904492 | Khoa học và quản lý môi trường (CTTT) | mã riêng/thí điểm | 8 | DTN | — |
| 7905218 | Kỹ thuật cơ khí - Chương trình tiên tiến (Chuyên ngành: Tự động hóa cơ khí) | mã riêng/thí điểm | 5 | DTK | — |
| 7905228 | Kỹ thuật điện - Chương trình tiên tiến | mã riêng/thí điểm | 5 | DTK | — |
| 7905419 | Công nghệ thực phẩm (CTTT) | mã riêng/thí điểm | 8 | DTN | — |
| 7906425 | Kinh tế nông nghiệp (CTTT) | mã riêng/thí điểm | 5 | DTN | — |

## 2. Tên ngành chuẩn chưa đúng tên danh mục

Bảng `majors` lấy tên từ tên chương trình của nguồn, nên có tên kèm chuyên ngành, ngôn ngữ giảng dạy hoặc ghi chú. Các trang `/nganh/` và tab Theo ngành đang hiển thị nguyên tên này.

| Mã | Tên hiện tại |
|---|---|
| 7140214 | Sư phạm Kỹ thuật công nghiệp (chuyên ngành Công nghệ thông tin) |
| 7229047 | Di sản học, chuyên ngành Di sản và phát triển du lịch |
| 7340109 | Kinh tế số (Phân hiệu Bắc Ninh) |
| 7340202 | Tài chính và Kế toán (BFA) |
| 7440107 | Công nghệ Vật lý điện tử và tin học (Chương trình tăng cường tiếng Anh) (dự kiến) |
| 7480112 | Khoa học dữ liệu và Trí tuệ nhân tạo (hệ kỹ sư)(03 chuyên ngành: Khoa học dữ liệu; Trí tuệ nhân tạo; Phân tích dữ liệu kinh doanh) |
| 7480118 | Hệ thống nhúng và IoT (đào tạo bằng tiếng Việt) |
| 7480203 | Kỹ thuật dữ liệu (Tiếng Việt) |
| 7510104 | Kỹ thuật Giao thông Thông minh (SME) |
| 7510106 | Hệ thống kỹ thuật công trình xây dựng (đào tạo bằng tiếng Việt) |
| 7510208 | Năng lượng tái tạo (đào tạo bằng tiếng Việt) |
| 7510606 | Logistics Quốc tế (Dạy bằng tiếng Trung Quốc) |
| 7510801 | Công nghệ Kỹ thuật in (đào tạo bằng tiếng Việt) |
| 7519002 | Công nghệ nông nghiệp (mới tuyển năm 2026) |
| 7520117 | Kỹ thuật công nghiệp (đào tạo bằng tiếng Việt) |
| 7520206 | Kỹ thuật biển (Giàn khoan và Tuabin gió) |
| 7520208 | Kỹ thuật Điện và Máy tính (ECE) |
| 7520215 | Kỹ thuật điện; điện tử (Vi mạch bán dẫn) (mới tuyển năm 2026) |
| 7520220 | Kỹ thuật Thiết kế Vi mạch - thuộc ngành Công nghệ KT Điện tử - Viễn thông (Tiếng Việt) |
| 7520604 | Kỹ thuật Dầu khí (Khoan-Khai thác Mỏ Dầu khí) |
| 7549002 | Kỹ nghệ gỗ và nội thất (đào tạo bằng tiếng Việt) |
| 7580110 | Thiết kế đô thị (Chương trình tiên tiến) |
| 7580199 | Thiết kế đô thị (Chương trình tiên tiến) |
| 7580215 | Kỹ thuật an toàn giao thông (Ngành tuyển sinh các năm trước: Công nghệ kỹ thuật giao thông - Chuyên ngành: Kỹ thuật an toàn giao thông) |
| 7620303 | Khoa học thủy sản (02 chuyên ngành: Khoa học thủy sản, Khai thác thủy sản) |
| 7720502 | Kỹ thuật phục hình răng(*) |
| 7810204 | Quản lý du lịch quốc tế (CTTT) |
| 7840106 | Khoa học hàng hải (02 chuyên ngành: Khoa học hàng hải; Quản lý hàng hải và Logistics) |
| 7840110 | Quản lý và vận hành hạ tầng (đào tạo bằng tiếng Việt) |
| 7840201 | Nhóm ngành tuyển chung (dành cho đối tượng chưa xác định được ngành học) – Chương trình tiên tiến |
| 7860203 | Thiết bị bay không người lái (miền Bắc) |
| 7860206 | Chỉ huy tham mưu Tăng Thiết giáp (Thí sinh nam miền Bắc) |
| 7860207 | Chỉ huy - Tham mưu đặc công (miền Bắc) |
| 7860214 | Biên phòng (Thí sinh miền Bắc) |
| 7860220 | Kỹ sư quân sự (miền Bắc, thí sinh Nam) |
| 7860222 | Quân sự cơ sở - Quân khu 1 |
| 7860226 | Ngành Chỉ huy Tham mưu Phòng không, Không quân và Tác chiến điện tử (Thí sinh miền Bắc) |
| 7904492 | Khoa học và quản lý môi trường (CTTT) |
| 7905218 | Kỹ thuật cơ khí - Chương trình tiên tiến (Chuyên ngành: Tự động hóa cơ khí) |
| 7905228 | Kỹ thuật điện - Chương trình tiên tiến |
| 7905419 | Công nghệ thực phẩm (CTTT) |
| 7906425 | Kinh tế nông nghiệp (CTTT) |

## 3a. Tên chương trình khác hẳn tên ngành — mã do pipeline ghép (cần xem trước)

| Trường | Tên chương trình | Mã | Tên ngành chuẩn | Dòng | Cách ghép |
|---|---|---|---|---|---|
| HHA | Điều khiển tàu biển | 7840106 | Khoa học hàng hải (02 chuyên ngành: Khoa học hàng hải; Quản lý hàng hải và Logistics) | 38 | thủ công (major_map.csv) |
| HHA | Khai thác máy tàu biển | 7840106 | Khoa học hàng hải (02 chuyên ngành: Khoa học hàng hải; Quản lý hàng hải và Logistics) | 38 | thủ công (major_map.csv) |
| HHA | Điều khiển tàu biển (Chọn) | 7840106 | Khoa học hàng hải (02 chuyên ngành: Khoa học hàng hải; Quản lý hàng hải và Logistics) | 25 | thủ công (major_map.csv) |
| HHA | Khai thác máy tàu biển (Chọn) | 7840106 | Khoa học hàng hải (02 chuyên ngành: Khoa học hàng hải; Quản lý hàng hải và Logistics) | 25 | thủ công (major_map.csv) |
| HHA | Tiếng Anh thương mại | 7220201 | Ngôn ngữ Anh | 25 | tự động: tên khớp |
| KHA | Quản lý công và Chính sách (E-PMP) | 7310101 | Kinh tế | 15 | thủ công (major_map.csv) |
| BKA | Tiếng Anh KHKT và Công nghệ | 7220201 | Ngôn ngữ Anh | 13 | thủ công (major_map.csv) |
| HHA | Điều khiển tàu biển (chọn) | 7840106 | Khoa học hàng hải (02 chuyên ngành: Khoa học hàng hải; Quản lý hàng hải và Logistics) | 13 | thủ công (major_map.csv) |
| HHA | Khai thác máy tàu biển (chọn) | 7840106 | Khoa học hàng hải (02 chuyên ngành: Khoa học hàng hải; Quản lý hàng hải và Logistics) | 13 | thủ công (major_map.csv) |
| GTA | Hải quan và Logistics | 7340201 | Tài chính - Ngân hàng | 12 | tự động: tên khớp |
| GTA | Logistics và vận tải đa phương thức | 7310101 | Kinh tế | 12 | tự động: tên khớp |
| GTA | Thương mại quốc tế | 7340120 | Kinh doanh quốc tế | 10 | tự động: tên khớp |
| GTA | Hải quan và Logistics (tăng cường tiếng Anh) | 7340201 | Tài chính - Ngân hàng | 10 | tự động: tên khớp |
| BKA | Tiếng Anh chuyên nghiệp quốc tế | 7220201 | Ngôn ngữ Anh | 8 | thủ công (major_map.csv) |
| DAD | Thiết kế vi mạch bán dẫn (*) | 7480108 | Công nghệ kỹ thuật máy tính | 8 | tự động: tên khớp |
| NTH | CT TH Tiếng Anh thương mại | 7220201 | Ngôn ngữ Anh | 8 | tự động: tên khớp |
| NTH | Chương trình tiêu chuẩn Thương mại quốc tế | 7340120 | Kinh doanh quốc tế | 7 | tự động: tên khớp |
| KHA | Khởi nghiệp & phát triển KD (BBAE) | 7340101 | Quản trị kinh doanh | 6 | thủ công (major_map.csv) |
| TLA | Tài nguyên nước và môi trường (Thủy văn học) | 7440224 | Thủy văn học | 6 | thủ công (major_map.csv) |
| BKA | Tiếng Anh chuyên nghiệp quốc tế (do ĐHBK Hà Nội và ĐH Plymouth Marjon - Vương quốc Anh cấp bằng) | 7220201 | Ngôn ngữ Anh | 5 | thủ công (major_map.csv) |
| GTA | Logistics (Trường Đại học Tongmyong - Hàn Quốc cấp bằng) | 7340101 | Quản trị kinh doanh | 5 | tự động: tên khớp |
| HHA | Tiếng Anh thương mại (TA hệ số 2) | 7220201 | Ngôn ngữ Anh | 5 | tự động: tên khớp |
| HTC | Thuế và Quản trị thuế (Theo định hướng ACCA) | 7340201 | Tài chính - Ngân hàng | 5 | tự động: tên khớp |
| HTC | Trí tuệ nhân tạo trong tài chính kế toán | 7480201 | Công nghệ thông tin | 5 | tự động: tên khớp |
| NTH | Chương trình CLC Tiếng Anh Thương mại | 7220201 | Ngôn ngữ Anh | 5 | tự động: tên khớp |
| QHT | Công nghệ Bán dẫn | 7440102 | Vật lý học | 5 | tự động: tên khớp |
| HTY | Thương mại quốc tế | 7340120 | Kinh doanh quốc tế | 4 | tự động: tên khớp |
| NTH | CT TC Tiếng Anh thương mại | 7220201 | Ngôn ngữ Anh | 4 | tự động: tên khớp |
| NTH | CT CLC Tiếng Anh thương mại | 7220201 | Ngôn ngữ Anh | 4 | tự động: tên khớp |
| QHT | Công nghệ Bán dẫn (thuộc ngành Khoa học vật liệu) | 7440102 | Vật lý học | 4 | tự động: tên khớp |
| NTH | Chương trình tiêu chuẩn Tiếng Anh Thương mại | 7220201 | Ngôn ngữ Anh | 3 | tự động: tên khớp |
| QST | Công nghệ bán dẫn | 7440102 | Vật lý học | 2 | tự động: tên khớp |
| DTK | Kỹ thut ô tô và giao thông thông minh (Ngành Kỹ thuật cơ khí động lực) | 7520116 | Kỹ thuật cơ khí động lực | 1 | thủ công (major_map.csv) |
| HTC | Hải quan và Logistics (Theo đnh hướng FIATA) | 7340201 | Tài chính - Ngân hàng | 1 | tự động: tên khớp |

## 3b. Tên chương trình khác hẳn tên ngành — mã do nguồn ghi

Phần lớn là chuyên ngành hoặc chương trình riêng mà trường tuyển sinh dưới một mã ngành của danh mục (VD "Thuế" thuộc 7340201 Tài chính – Ngân hàng). Không sai mã, nhưng khi xem theo ngành người đọc có thể bất ngờ. 40 cặp nhiều dòng nhất:

| Trường | Tên chương trình | Mã | Tên ngành chuẩn | Dòng |
|---|---|---|---|---|
| DTZ | Công nghệ bán dẫn | 7440102 | Vật lý học | 15 |
| THP | Logistics và vận tải đa phương thức | 7310101 | Kinh tế | 14 |
| THP | Logistics và vận tải đa phương thức (CLC) | 7310101 | Kinh tế | 14 |
| THP | Trí tuệ nhân tạo và Khoa học dữ liệu | 7480201 | Công nghệ thông tin | 14 |
| THP | Thiết kế game và Multimedia (CLC) | 7480201 | Công nghệ thông tin | 14 |
| DTZ | Khoa học Tự nhiên tích hợp STEM | 7440112 | Hóa học | 13 |
| KSV | Thuế | 7340201 | Tài chính - Ngân hàng | 13 |
| BVH | Thiết kế và phát triển Game (ngành Công nghệ đa phương tiện) | 7329001 | Công nghệ đa phương tiện | 10 |
| BVH | Quan hệ công chúng (ngành Marketing) | 7340115 | Marketing | 10 |
| VGU | Quản trị số và Kinh doanh Quốc tế (BDE) | 7340122 | Thương mại điện tử | 10 |
| BVH | Trí tuệ nhân tạo vạn vật (AIoT) (ngành Kỹ thuật Điện tử viễn thông) | 7520207 | Kỹ thuật điện tử - viễn thông | 9 |
| BVH | Thiết kế đồ họa game | 7329001 | Công nghệ đa phương tiện | 9 |
| BVH | Thiết kế và phát triển Game (Chất lượng cao) | 7329001 | Công nghệ đa phương tiện | 9 |
| BVH | Quan hệ công chúng | 7340115 | Marketing | 9 |
| BVH | Trí tuệ nhân tạo vạn vật (AIoT) | 7520207 | Kỹ thuật điện tử - viễn thông | 9 |
| BVS | Công nghệ internet vạn vật (IoT) | 7520208 | Kỹ thuật Điện và Máy tính (ECE) | 9 |
| BVS | Công nghệ Internet vạn vật (IoT) | 7520208 | Kỹ thuật Điện và Máy tính (ECE) | 9 |
| KSA | Tiếng Anh thương mại | 7220201 | Ngôn ngữ Anh | 9 |
| KSA | Phân tích rủi ro và định phí bảo hiểm | 7310108 | Toán kinh tế | 9 |
| KSA | Thuế | 7340201 | Tài chính - Ngân hàng | 9 |
| KSA | Thị trường chứng khoán | 7340201 | Tài chính - Ngân hàng | 9 |
| DTC | Marketing số | 7340122 | Thương mại điện tử | 8 |
| DTC | Vi mạch bán dẫn | 7510302 | Công nghệ kỹ thuật điện tử - viễn thông | 8 |
| DTN | Dược liệu và hợp chất thiên nhiên | 7549002 | Kỹ nghệ gỗ và nội thất (đào tạo bằng tiếng Việt) | 8 |
| HHT | Nông nghiệp công nghệ cao | 7620110 | Khoa học cây trồng | 8 |
| HPN | Thiết kế và phát triển game | 7480201 | Công nghệ thông tin | 8 |
| QHK | Thiết kế nội thất bền vững | 7210407 | Đồ họa công nghệ số | 8 |
| DCN | Robot và trí tuệ nhân tạo | 7510203 | Công nghệ kỹ thuật cơ điện tử | 7 |
| DLS | Marketing | 7340101 | Quản trị kinh doanh | 7 |
| DLX | Marketing | 7340101 | Quản trị kinh doanh | 7 |
| DLX | Tài chính và Quản trị rủi ro | 7340204 | Bảo hiểm | 7 |
| DLX | Đầu tư tài chính | 7340204 | Bảo hiểm | 7 |
| HHK | Thương mại quốc tế (Ngành: Kinh doanh quốc tế) | 7340120 | Kinh doanh quốc tế | 7 |
| HHK | Trí tuệ nhân tạo và Dữ liệu lớn (Ngành: CNTT) | 7480201 | Công nghệ thông tin | 7 |
| HHK | Trí tuệ nhân tạo và Internet vạn vật (Ngành: CNTT) | 7480201 | Công nghệ thông tin | 7 |
| HHK | Quản lý và khai thác cảng HK (Ngành: CNKT Công trình xây dựng) | 7510102 | Công nghệ kỹ thuật công trình xây dựng | 7 |
| HHK | Thiết bị bay không người lái và Robotics (Ngành: CNKT Điều khiển và tự động hóa) | 7510303 | Công nghệ kỹ thuật điều khiển và tự động hóa | 7 |
| HHK | Tiếng Anh hàng không; Tiếng Anh du lịch thương mại | 7220201 | Ngôn ngữ Anh | 7 |
| HHK | Thương mại quốc tế | 7340120 | Kinh doanh quốc tế | 7 |
| HHK | Trí tuệ nhân tạo và Dữ liệu lớn | 7480201 | Công nghệ thông tin | 7 |

## 3c. Chuyên ngành hẹp mang mã ngành rộng

Tên chương trình chứa đủ tên ngành nhưng thêm từ 3 từ có nghĩa trở lên, ví dụ HVD "Kinh tế giáo dục vùng dân tộc thiểu số" mang mã 7310101 Kinh tế. Thường hợp lệ (trường tuyển chuyên ngành dưới mã ngành), chỉ cần lưu ý khi so điểm giữa các trường. 30 cặp nhiều dòng nhất:

| Trường | Tên chương trình | Mã | Tên ngành chuẩn | Dòng |
|---|---|---|---|---|
| LPS | Luật - Phân hiệu tại tỉnh Quảng Trị | 7380101 | Luật | 28 |
| HCH | Chuyên ngành Thanh tra thuộc ngành Luật | 7380101 | Luật | 18 |
| NTH | CT ĐHNNQT Kinh doanh quốc tế theo mô hình tiên tiến Nhật Bản | 7340120 | Kinh doanh quốc tế | 18 |
| NTH | CT ĐHNNQT Luật Kinh doanh quốc tế theo mô hình thực hành nghề nghiệp | 7380110 | Luật Kinh doanh | 18 |
| NTH | CT ĐHNNQT Marketing số | 7340115 | Marketing | 18 |
| DTT | Công nghệ thông tin (song bằng 2+2) - Chương trình dự bị liên kết Đại học La Trobe (Úc) | 7480201 | Công nghệ thông tin | 17 |
| DTT | Kỹ thuật xây dựng (song bằng 2+2) - Chương trình dự bị liên kết Đại học La Trobe (Úc) | 7580201 | Kỹ thuật xây dựng | 17 |
| XDA | Quản lý xây dựng/ Kinh tế và quản lý bất động sản | 7580302 | Quản lý xây dựng | 17 |
| DTT | Kinh doanh quốc tế (song bằng 3 +1) - Chương trình dự bị liên kết Đại học La Trobe (Úc) | 7340120 | Kinh doanh quốc tế | 16 |
| HBT | Quan hệ quốc tế, chuyên ngành Thông tin đối ngoại | 7310206 | Quan hệ quốc tế | 16 |
| HBT | Quan hệ quốc tế, chuyên ngành Quan hệ chính trị và Truyền thông quốc tế | 7310206 | Quan hệ quốc tế | 16 |
| HBT | Quan hệ quốc tế, chuyên ngành Quan hệ quốc tế và Truyền thông toàn cầu | 7310206 | Quan hệ quốc tế | 16 |
| HBT | Quan hệ công chúng, chuyên ngành Truyền thông marketing | 7320108 | Quan hệ công chúng | 16 |
| KHA | Kiểm toán tích hợp chứng chỉ quốc tế (ICAEW CFAB) | 7340302 | Kiểm toán | 16 |
| XDA | Kỹ thuật xây dựng/ Hệ thống kỹ thuật trong công trình | 7580201 | Kỹ thuật xây dựng | 16 |
| HBT | Báo chí, chuyên ngành Quay phim truyền hình | 7320101 | Báo chí | 15 |
| HBT | Báo chí, chuyên ngành Báo mạng điện tử | 7320101 | Báo chí | 15 |
| XDA | Kỹ thuật xây dựng/ Xây dựng Dân dụng và Công nghiệp | 7580201 | Kỹ thuật xây dựng | 15 |
| DTT | Công nghệ sinh học - Chương trình dự bị đại học bằng tiếng Anh | 7420201 | Công nghệ sinh học | 14 |
| HBT | Chính trị học, chuyên ngành Công tác tư tưởng - văn hóa | 7310201 | Chính trị học | 14 |
| HBT | Chính trị học, chuyên ngành Tư tưởng Hồ Chí Minh | 7310201 | Chính trị học | 14 |
| SPS | Giáo dục Tiểu học dạy bằng song ngữ Việt - Anh | 7140202 | Giáo dục Tiểu học | 14 |
| TMU | Quản trị kinh doanh (Quản trị kinh doanh) - Khởi nghiệp (Thành lập doanh nghiệp) - Chương trình đào tạo song bằng quốc tế | 7340101 | Quản trị kinh doanh | 14 |
| TMU | Marketing (Marketing thương mại) - Thương mại sản phẩm và dịch vụ (Bán hàng) - Chương trình đào tạo song bằng quốc tế | 7340115 | Marketing | 14 |
| DTT | Marketing - Chương trình dự bị đại học bằng tiếng Anh | 7340115 | Marketing | 13 |
| DTT | Kinh doanh quốc tế - Chương trình dự bị đại học bằng tiếng Anh | 7340120 | Kinh doanh quốc tế | 13 |
| DTT | Khoa học máy tính - Chương trình dự bị đại học bằng tiếng Anh | 7480101 | Khoa học máy tính | 13 |
| DTT | Kỹ thuật điều khiển và tự động hóa - Chương trình dự bị đại học bằng tiếng Anh | 7520216 | Kỹ thuật điều khiển và tự động hóa | 13 |
| DTT | Kỹ thuật xây dựng - Chương trình dự bị đại học bằng tiếng Anh | 7580201 | Kỹ thuật xây dựng | 13 |
| DTT | Quản trị kinh doanh toàn cầu (đơn bằng 2+2) - Chương trình dự bị liên kết Trường Kinh doanh Emlyon (Pháp) | 7340101 | Quản trị kinh doanh | 13 |

## 4. Một mã, nhiều nghĩa giữa các trường

Mã ngoài danh mục hoặc mã thí điểm (chữ số thứ 4–5 là `90`) mà các trường dùng cho chương trình không chung từ nào với nhau.

| Mã | Tên ngành chuẩn | Chương trình theo trường |
|---|---|---|
| 7349001 | Quản trị thương hiệu | DAD: Quản trị thương hiệu và truyền thông (*); DHK: Tài chính - Ngân hàng; QHK: Quản trị thương hiệu |
| 7549002 | Kỹ nghệ gỗ và nội thất (đào tạo bằng tiếng Việt) | DTN: Dược liệu và hợp chất thiên nhiên; SPK: Kỹ nghệ gỗ và nội thất (Tiếng Việt) |

## 5. Tên chương trình chỉ là mã số

Mã ngành đúng nhưng nguồn không ghi tên chương trình; trang trường/ngành hiện tên là mã số.

| Trường | Tên chương trình | Mã | Tên ngành chuẩn | Dòng |
|---|---|---|---|---|
| QSY | 7720201 | 7720201 | Dược học | 3 |
| QSY | 7720501 | 7720501 | Răng - Hàm - Mặt | 3 |
| QSY | 7720115 | 7720115 | Y học cổ truyền | 3 |
| QSY | 7720101 | 7720101 | Y khoa | 3 |
| QSY | 7720301 | 7720301 | Điều dưỡng | 3 |

## Đề xuất xử lý

1. **Mã gõ nhầm (700…, 730…, 780…)**: thêm dòng vào `data/manual/major_map.csv` để chuyển sang mã danh mục cùng tên (cột cuối bảng mục 1), rồi chạy lại `pipeline.clean` và `sna.build`.
2. **Mã riêng/thí điểm (790…, 7549002…)**: giữ mã gốc của trường ở `program_code`; với `major_code` chọn một trong hai: (a) map về ngành danh mục gần nhất (VD CTTT Kỹ thuật điện → 7520201) qua `major_map.csv`, hoặc (b) để trống `major_code` để dòng chỉ hiện ở trang trường, không lẫn vào trang ngành. Đề xuất (a) cho chương trình tiên tiến/song ngành có ngành gốc rõ, (b) cho phần còn lại.
3. **Tên ngành chuẩn**: thêm file `data/manual/danh_muc_nganh.csv` (mã, tên theo Thông tư 09/2022/TT-BGDĐT và các thông tư bổ sung) và để `pipeline.clean` lấy `majors.major_name` từ file này thay vì từ tên chương trình. Sửa được cả 42 tên ở mục 2 và tên nhóm ngành trên `/nganh/`.
4. **Mục 3a**: xem từng dòng; dòng ghép sai thì thêm/sửa `major_map.csv` (ghép thủ công được ưu tiên hơn tự động). Đây là nhóm ít dòng nhất nhưng dễ sai nhất.
5. **Mục 5**: trong `pipeline.clean`, khi tên chương trình chỉ là mã số thì thay bằng tên ngành chuẩn (ghi `match_how` riêng để còn dấu vết).
6. **Mục 3b, 3c**: không sửa mã. Có thể hiển thị tên chương trình gốc rõ hơn trên trang ngành (đã có cột Chương trình) và thêm chú thích "chuyên ngành của ngành …".
7. Sau khi sửa: chạy `pipeline.clean`, `sna.build`, `scripts/export_static.py` (sinh lại trang `/nganh/` và sitemap; slug mới được thêm vào `seo_slugs.csv`, slug cũ vẫn giữ), rồi chạy lại script này để so số lượng trước–sau.
