# Tích hợp tab Xếp nguyện vọng — 15/11/2026

Thay giao diện Tư vấn theo điểm bằng Xếp nguyện vọng trên nhánh `v2-simple`.
Commit tính năng: `12d1c8a6` — `feat: tab Xếp nguyện vọng thay cho Tư vấn theo điểm`.
Nguồn giao diện là `webapp/static/`; toàn bộ `site/` được sinh bằng
`scripts/export_static.py`. Giữ nguyên endpoint `/api/advice`, hàm xuất
`advice_data` và mọi file dữ liệu advice hiện có.

## Kết quả dữ liệu

| Mục | Đối chiếu yêu cầu | Thực tế |
| --- | --- | --- |
| Năm dữ liệu / dự báo | 2024–2026 / 2027 | 2024–2026 / 2027 |
| Chương trình | 5.577 | 5.577 |
| Trường | 238 | 238 |
| `co2` | [2,4408; 0,2308; 0,632] | [2,4408; 0,2308; 0,632] |
| `co1` | [3,2039; 0,8302] | [3,2039; 0,8302] |
| `n3` | 3.422 | 3.422 |
| `n2` | [1.033; 1.013; 1.376] | [1.033; 1.013; 1.376] |
| `n1` | 4.072 | 4.072 |
| `mae2` | 1,25 | 1,25 |
| `mae1` | Không yêu cầu số đối chiếu | 1,32 |
| `mae_last` | 1,267 | 1,267 |
| `calib` | [[0,2; 0,189], [0,4; 0,532], [0,6; 0,628], [0,75; 0,775], [0,9; 0,902]] | Khớp toàn bộ |
| `BKA\|IT1.h` | [28,53; 29,19; 29,27] | Khớp |
| `QHI\|CN8.h` | [27,58; 27,86; 26,86], có `ov.X06` | Khớp |

Đã đối chiếu toàn bộ model, 5.577 bản ghi chương trình (kể cả thứ tự tổ hợp)
và 238 trường với kết quả chạy bộ dựng bản mẫu trong RAM. `scripts/check_nv.py`
kiểm thêm trường hợp dời năm trên bản sao DB trong RAM: tự chọn 2028–2030 và
dự báo 2031, giữ nguyên dữ liệu và mô hình tương ứng. DB gốc chỉ được đọc.

DB vẫn có 71.011 dòng sạch, 69.112 dòng có mã ngành (97,33%).
`data/network/summary.csv` vẫn có 12 dòng độ đo SNA, không được sửa trong phiên này.
Không thay đổi các file cũ trong `site/data/`; chỉ thêm `nv.json` (1.322.207 byte, khoảng 1,26 MiB).

## Điều chỉnh khi tích hợp bản mẫu

- Bỏ header/hero riêng; đặt nội dung vào tab hiện có, một `h1`, dùng `div` thay
  `main` lồng nhau để HTML hợp lệ.
- Chuyển script thành IIFE, chỉ xuất `window.NV`, tìm DOM trong `#tab-nv`;
  nạp dữ liệu lười, có fallback, trạng thái lỗi và nút Thử lại.
- Prefix cả các class phụ như `on`, `safe`, `hd`, `sub` thành `nv-*`, scope CSS;
  giữ màu chữ `#111827` và nền sáng của các ô nhập, textarea.
- Dùng năm từ payload cho nội dung dự báo; giữ mốc 2026 khi nhắc tên quy chế.
  Cận trên nhóm biến động là 99 như bản mẫu: tương đương vô cực trên thang 30
  và là JSON hợp lệ.
- Bổ sung chuẩn hóa trạng thái lưu, bỏ các mã đã biến mất khi dùng hồ sơ mẫu;
  cập nhật kết quả tìm kiếm sau đổi điểm/tổ hợp; Escape đóng danh sách thì Enter
  không thêm kết quả đang ẩn, đồng thời cập nhật `aria-expanded`.
- Hiển thị rõ mã chương trình, mã ngành và loại chuẩn trong từng kết quả;
  link trường là đường dẫn tương đối và chỉ có ở bản tĩnh.
- Giữ thứ tự truy vấn lịch sử và truy vấn chọn dòng mới nhất như bản xuất cũ:
  cần để tái lập kiểm định ngẫu nhiên và metadata khi có các dòng bằng điểm.
  Dòng thiếu score chỉ giữ vị trí chương trình trong thứ tự lịch sử, không được
  đưa vào học mô hình hoặc điểm chuẩn.
- Format file Python của bản mẫu bằng Ruff, tách lambda thành hàm, đổi biến `O`
  thành `one_year`; giữ nguyên thuật toán và giao diện HTML gốc trong tài liệu.

## Kiểm tra và ảnh chụp

Các lệnh Python chạy trong PowerShell với `PYTHONIOENCODING=utf-8` để terminal
Windows in được tiếng Việt. Không sửa code của các checker chỉ vì lỗi mã hóa.

| Lệnh | Kết quả |
| --- | --- |
| `.venv\Scripts\python.exe -m ruff check .` | PASS |
| `.venv\Scripts\python.exe -m ruff format --check .` | PASS |
| `.venv\Scripts\python.exe scripts/check_career.py --committed` | PASS: 86 hồ sơ, 85 ngành có điểm, 4.302 dòng, 218 trường |
| `.venv\Scripts\python.exe -m uvicorn webapp.main:app --reload` | Chạy tại 127.0.0.1:8000; `/#nv` và `/api/nv` trả HTTP 200 |
| `.venv\Scripts\python.exe scripts/export_static.py` | PASS: 3.730 file, 137.737.295 byte |
| `.venv\Scripts\python.exe scripts/check_static.py --committed` | PASS: 624 HTML, 618 sitemap URL, 82.035 link nội bộ |
| `.venv\Scripts\python.exe scripts/check_catalog.py --committed` | PASS |
| `.venv\Scripts\python.exe scripts/check_dean.py --committed` | PASS: 8.208 gạch đầu dòng dữ kiện |
| `.venv\Scripts\python.exe scripts/check_nv.py --committed` | PASS: số đối chiếu, cache, payload tĩnh, năm động trong RAM |
| `node scripts/check_static_browser.cjs` | PASS: static/API × 375/1280px; thêm 360px; 25 phép đối chiếu API mỗi lượt, 10 trang SEO mỗi độ rộng; không lỗi console/HTTP |
| `node --check scripts/capture_report_web.cjs` | PASS cú pháp; không chạy script chụp lại ảnh báo cáo cũ |

Kiểm trình duyệt bao gồm hồ sơ mẫu 8 NV (BKA IT1 đầu, MHN 7480201 cuối),
tìm mã 7480201 và phân trang 50→100, tìm BKA và sư phạm toán, không lọc theo
tổ hợp, thêm bằng Enter, Escape→Enter không thêm kết quả ẩn, clipboard bị
chặn, màu textarea ở light/dark, alias `#advice`, kiểm prefix class/id,
retry/fallback/cache, năm động và localStorage bị chặn. Thanh điều hướng
các trang trường/ngành có đủ Xếp nguyện vọng và Tư vấn chọn ngành.

`webapp/static/app.js` xóa 54 dòng và thêm 7 dòng (giảm ròng 47 dòng).
Không có file bị xóa.


Ảnh mới được lưu riêng, không thay ảnh báo cáo cũ:

- [static-nv-360.png](fig/nv-20261115/static-nv-360.png)
- [static-nv-375.png](fig/nv-20261115/static-nv-375.png)
- [static-nv-1280.png](fig/nv-20261115/static-nv-1280.png)
- [api-nv-360.png](fig/nv-20261115/api-nv-360.png)
- [api-nv-375.png](fig/nv-20261115/api-nv-375.png)
- [api-nv-1280.png](fig/nv-20261115/api-nv-1280.png)

## Danh sách đầy đủ file thay đổi

Thêm 15 file, sửa 633 file, xóa 0 file. Các trang SEO/404 sinh lại chỉ đổi thanh điều hướng.

<details>
<summary>Danh sách từng file (A: thêm, M: sửa)</summary>

- A: `docs/fig/nv-20261115/api-nv-1280.png`
- A: `docs/fig/nv-20261115/api-nv-360.png`
- A: `docs/fig/nv-20261115/api-nv-375.png`
- A: `docs/fig/nv-20261115/static-nv-1280.png`
- A: `docs/fig/nv-20261115/static-nv-360.png`
- A: `docs/fig/nv-20261115/static-nv-375.png`
- A: `docs/prototype/xep-nguyen-vong.build_data.py`
- A: `docs/prototype/xep-nguyen-vong.prototype.html`
- A: `docs/xep-nguyen-vong-20261115.md`
- A: `scripts/check_nv.py`
- A: `site/data/nv.json`
- A: `site/nv.css`
- A: `site/nv.js`
- A: `webapp/static/nv.css`
- A: `webapp/static/nv.js`
- M: `scripts/capture_report_web.cjs`
- M: `scripts/check_static_browser.cjs`
- M: `scripts/export_seo.py`
- M: `scripts/export_static.py`
- M: `site/404.html`
- M: `site/app.js`
- M: `site/index.html`
- M: `site/mos.html`
- M: `site/nganh/am-nhac-hoc-7210201/index.html`
- M: `site/nganh/an-ninh-mang-7480208/index.html`
- M: `site/nganh/an-toan-thong-tin-7480202/index.html`
- M: `site/nganh/bao-chi-7320101/index.html`
- M: `site/nganh/bao-hiem-7340204/index.html`
- M: `site/nganh/bao-hiem-tai-chinh-7340207/index.html`
- M: `site/nganh/bao-ho-lao-dong-7850201/index.html`
- M: `site/nganh/bao-tang-hoc-7320305/index.html`
- M: `site/nganh/bao-ve-thuc-vat-7620112/index.html`
- M: `site/nganh/bat-dong-san-7340116/index.html`
- M: `site/nganh/benh-hoc-thuy-san-7620302/index.html`
- M: `site/nganh/bien-dao-mua-7210243/index.html`
- M: `site/nganh/bien-doi-khi-hau-7440221/index.html`
- M: `site/nganh/bien-doi-khi-hau-va-phat-trien-ben-vung-7440298/index.html`
- M: `site/nganh/bieu-dien-nhac-cu-phuong-tay-7210207/index.html`
- M: `site/nganh/bieu-dien-nhac-cu-truyen-thong-7210210/index.html`
- M: `site/nganh/chan-nuoi-7620105/index.html`
- M: `site/nganh/chan-nuoi-thu-y-7620106/index.html`
- M: `site/nganh/chi-huy-tham-muu-luc-quan-7860201/index.html`
- M: `site/nganh/chinh-tri-hoc-7310201/index.html`
- M: `site/nganh/co-dien-tu-7520119/index.html`
- M: `site/nganh/co-ky-thuat-7520101/index.html`
- M: `site/nganh/cong-nghe-che-bien-lam-san-7549001/index.html`
- M: `site/nganh/cong-nghe-che-bien-thuy-san-7540105/index.html`
- M: `site/nganh/cong-nghe-che-tao-may-7510202/index.html`
- M: `site/nganh/cong-nghe-da-phuong-tien-7329001/index.html`
- M: `site/nganh/cong-nghe-det-may-7540204/index.html`
- M: `site/nganh/cong-nghe-dien-anh-truyen-hinh-7210302/index.html`
- M: `site/nganh/cong-nghe-giao-duc-7140103/index.html`
- M: `site/nganh/cong-nghe-ky-thuat-co-dien-tu-7510203/index.html`
- M: `site/nganh/cong-nghe-ky-thuat-co-khi-7510201/index.html`
- M: `site/nganh/cong-nghe-ky-thuat-cong-trinh-xay-dung-7510102/index.html`
- M: `site/nganh/cong-nghe-ky-thuat-dien-dien-tu-7510301/index.html`
- M: `site/nganh/cong-nghe-ky-thuat-dien-tu-vien-thong-7510302/index.html`
- M: `site/nganh/cong-nghe-ky-thuat-dieu-khien-va-tu-dong-hoa-7510303/index.html`
- M: `site/nganh/cong-nghe-ky-thuat-giao-thong-7510104/index.html`
- M: `site/nganh/cong-nghe-ky-thuat-hat-nhan-7510407/index.html`
- M: `site/nganh/cong-nghe-ky-thuat-hoa-hoc-7510401/index.html`
- M: `site/nganh/cong-nghe-ky-thuat-may-tinh-7480108/index.html`
- M: `site/nganh/cong-nghe-ky-thuat-moi-truong-7510406/index.html`
- M: `site/nganh/cong-nghe-ky-thuat-nang-luong-7510403/index.html`
- M: `site/nganh/cong-nghe-ky-thuat-nang-luong-tai-tao-7519007/index.html`
- M: `site/nganh/cong-nghe-ky-thuat-nhiet-7510206/index.html`
- M: `site/nganh/cong-nghe-ky-thuat-o-to-7510205/index.html`
- M: `site/nganh/cong-nghe-ky-thuat-vat-lieu-xay-dung-7510105/index.html`
- M: `site/nganh/cong-nghe-ky-thuat-xay-dung-7510103/index.html`
- M: `site/nganh/cong-nghe-may-7540209/index.html`
- M: `site/nganh/cong-nghe-nong-nghiep-7519002/index.html`
- M: `site/nganh/cong-nghe-nong-nghiep-so-7620190/index.html`
- M: `site/nganh/cong-nghe-o-to-dien-7520141/index.html`
- M: `site/nganh/cong-nghe-sau-thu-hoach-7540104/index.html`
- M: `site/nganh/cong-nghe-sinh-hoc-7420201/index.html`
- M: `site/nganh/cong-nghe-soi-det-7540202/index.html`
- M: `site/nganh/cong-nghe-tai-chinh-7340205/index.html`
- M: `site/nganh/cong-nghe-tham-my-7420207/index.html`
- M: `site/nganh/cong-nghe-thong-tin-7480201/index.html`
- M: `site/nganh/cong-nghe-thuc-pham-7540101/index.html`
- M: `site/nganh/cong-nghe-truyen-thong-7320106/index.html`
- M: `site/nganh/cong-nghe-vat-lieu-7510402/index.html`
- M: `site/nganh/cong-nghe-vat-lieu-det-may-7540203/index.html`
- M: `site/nganh/cong-tac-xa-hoi-7760101/index.html`
- M: `site/nganh/dam-bao-chat-luong-va-an-toan-thuc-pham-7540106/index.html`
- M: `site/nganh/dao-dien-dien-anh-truyen-hinh-7210235/index.html`
- M: `site/nganh/dao-dien-san-khau-7210227/index.html`
- M: `site/nganh/di-san-hoc-7229047/index.html`
- M: `site/nganh/dia-chat-hoc-7440201/index.html`
- M: `site/nganh/dia-ky-thuat-xay-dung-7580211/index.html`
- M: `site/nganh/dia-ly-hoc-7310501/index.html`
- M: `site/nganh/dien-vien-kich-dien-anh-truyen-hinh-7210234/index.html`
- M: `site/nganh/dieu-duong-7720301/index.html`
- M: `site/nganh/dieu-khac-7210105/index.html`
- M: `site/nganh/digital-marketing-7340114/index.html`
- M: `site/nganh/dinh-duong-7720401/index.html`
- M: `site/nganh/do-hoa-7210104/index.html`
- M: `site/nganh/dong-nam-a-hoc-7310620/index.html`
- M: `site/nganh/dong-phuong-hoc-7310608/index.html`
- M: `site/nganh/du-lich-7810101/index.html`
- M: `site/nganh/du-lich-sinh-thai-7850104/index.html`
- M: `site/nganh/du-lich-van-hoa-7810106/index.html`
- M: `site/nganh/duoc-hoc-7720201/index.html`
- M: `site/nganh/giao-duc-chinh-tri-7140205/index.html`
- M: `site/nganh/giao-duc-cong-dan-7140204/index.html`
- M: `site/nganh/giao-duc-dac-biet-7140203/index.html`
- M: `site/nganh/giao-duc-hoc-7140101/index.html`
- M: `site/nganh/giao-duc-mam-non-7140201/index.html`
- M: `site/nganh/giao-duc-phap-luat-7140248/index.html`
- M: `site/nganh/giao-duc-quoc-phong-an-ninh-7140208/index.html`
- M: `site/nganh/giao-duc-the-chat-7140206/index.html`
- M: `site/nganh/giao-duc-tieu-hoc-7140202/index.html`
- M: `site/nganh/hai-duong-hoc-7440228/index.html`
- M: `site/nganh/han-nom-7220104/index.html`
- M: `site/nganh/han-quoc-hoc-7310614/index.html`
- M: `site/nganh/he-thong-nhung-va-iot-7480118/index.html`
- M: `site/nganh/he-thong-thong-tin-7480104/index.html`
- M: `site/nganh/he-thong-thong-tin-quan-ly-7340405/index.html`
- M: `site/nganh/ho-sinh-7720302/index.html`
- M: `site/nganh/ho-tro-giao-duc-nguoi-khuyet-tat-7760103/index.html`
- M: `site/nganh/hoa-duoc-7720203/index.html`
- M: `site/nganh/hoa-hoc-7440112/index.html`
- M: `site/nganh/hoa-ky-hoc-7310640/index.html`
- M: `site/nganh/hoi-hoa-7210103/index.html`
- M: `site/nganh/huan-luyen-the-thao-7140207/index.html`
- M: `site/nganh/huan-luyen-the-thao-7810302/index.html`
- M: `site/nganh/index.html`
- M: `site/nganh/ke-toan-7340301/index.html`
- M: `site/nganh/khai-thac-van-tai-7840101/index.html`
- M: `site/nganh/khi-tuong-va-khi-hau-hoc-7440222/index.html`
- M: `site/nganh/khoa-hoc-cay-trong-7620110/index.html`
- M: `site/nganh/khoa-hoc-dat-7620103/index.html`
- M: `site/nganh/khoa-hoc-du-lieu-7460108/index.html`
- M: `site/nganh/khoa-hoc-du-lieu-va-tri-tue-nhan-tao-7480112/index.html`
- M: `site/nganh/khoa-hoc-hang-hai-7840106/index.html`
- M: `site/nganh/khoa-hoc-may-tinh-7480101/index.html`
- M: `site/nganh/khoa-hoc-moi-truong-7440301/index.html`
- M: `site/nganh/khoa-hoc-quan-ly-7340401/index.html`
- M: `site/nganh/khoa-hoc-vat-lieu-7440122/index.html`
- M: `site/nganh/khoa-hoc-y-sinh-7420204/index.html`
- M: `site/nganh/khuc-xa-nhan-khoa-7720609/index.html`
- M: `site/nganh/khuc-xa-nhan-khoa-7720699/index.html`
- M: `site/nganh/kiem-toan-7340302/index.html`
- M: `site/nganh/kien-truc-7580101/index.html`
- M: `site/nganh/kien-truc-canh-quan-7580102/index.html`
- M: `site/nganh/kien-truc-do-thi-7580104/index.html`
- M: `site/nganh/kien-truc-noi-that-7580103/index.html`
- M: `site/nganh/kinh-doanh-nong-nghiep-7620114/index.html`
- M: `site/nganh/kinh-doanh-quoc-te-7340120/index.html`
- M: `site/nganh/kinh-doanh-thoi-trang-va-det-may-7340123/index.html`
- M: `site/nganh/kinh-doanh-thuong-mai-7340121/index.html`
- M: `site/nganh/kinh-doanh-xuat-ban-pham-7320402/index.html`
- M: `site/nganh/kinh-te-7310101/index.html`
- M: `site/nganh/kinh-te-chinh-tri-7310102/index.html`
- M: `site/nganh/kinh-te-dau-tu-7310104/index.html`
- M: `site/nganh/kinh-te-nong-nghiep-7620115/index.html`
- M: `site/nganh/kinh-te-phat-trien-7310105/index.html`
- M: `site/nganh/kinh-te-quoc-te-7310106/index.html`
- M: `site/nganh/kinh-te-so-7310109/index.html`
- M: `site/nganh/kinh-te-tai-nguyen-thien-nhien-7850102/index.html`
- M: `site/nganh/kinh-te-van-tai-7840104/index.html`
- M: `site/nganh/kinh-te-xay-dung-7580301/index.html`
- M: `site/nganh/ky-thuat-cap-thoat-nuoc-7580213/index.html`
- M: `site/nganh/ky-thuat-co-dien-tu-7520114/index.html`
- M: `site/nganh/ky-thuat-co-khi-7520103/index.html`
- M: `site/nganh/ky-thuat-co-khi-dong-luc-7520116/index.html`
- M: `site/nganh/ky-thuat-co-so-ha-tang-7580210/index.html`
- M: `site/nganh/ky-thuat-cong-nghiep-7520117/index.html`
- M: `site/nganh/ky-thuat-dau-khi-7520604/index.html`
- M: `site/nganh/ky-thuat-dia-chat-7520501/index.html`
- M: `site/nganh/ky-thuat-dien-7520201/index.html`
- M: `site/nganh/ky-thuat-dien-dien-tu-7520215/index.html`
- M: `site/nganh/ky-thuat-dien-tu-vien-thong-7520207/index.html`
- M: `site/nganh/ky-thuat-dien-va-may-tinh-7520208/index.html`
- M: `site/nganh/ky-thuat-dieu-khien-va-tu-dong-hoa-7520216/index.html`
- M: `site/nganh/ky-thuat-du-lieu-7480203/index.html`
- M: `site/nganh/ky-thuat-hang-khong-7520120/index.html`
- M: `site/nganh/ky-thuat-hat-nhan-7520402/index.html`
- M: `site/nganh/ky-thuat-he-thong-cong-nghiep-7520118/index.html`
- M: `site/nganh/ky-thuat-hinh-anh-y-hoc-7720602/index.html`
- M: `site/nganh/ky-thuat-hoa-hoc-7520301/index.html`
- M: `site/nganh/ky-thuat-khong-gian-7520121/index.html`
- M: `site/nganh/ky-thuat-may-tinh-7480106/index.html`
- M: `site/nganh/ky-thuat-mo-7520601/index.html`
- M: `site/nganh/ky-thuat-moi-truong-7520320/index.html`
- M: `site/nganh/ky-thuat-nhiet-7520115/index.html`
- M: `site/nganh/ky-thuat-o-to-7520130/index.html`
- M: `site/nganh/ky-thuat-phan-mem-7480103/index.html`
- M: `site/nganh/ky-thuat-phuc-hinh-rang-7720502/index.html`
- M: `site/nganh/ky-thuat-phuc-hoi-chuc-nang-7720603/index.html`
- M: `site/nganh/ky-thuat-robot-7520107/index.html`
- M: `site/nganh/ky-thuat-robot-va-tri-tue-nhan-tao-7520218/index.html`
- M: `site/nganh/ky-thuat-tai-nguyen-nuoc-7580212/index.html`
- M: `site/nganh/ky-thuat-tau-thuy-7520122/index.html`
- M: `site/nganh/ky-thuat-thuc-pham-7540102/index.html`
- M: `site/nganh/ky-thuat-trac-dia-ban-do-7520503/index.html`
- M: `site/nganh/ky-thuat-tuyen-khoang-7520607/index.html`
- M: `site/nganh/ky-thuat-vat-lieu-7520309/index.html`
- M: `site/nganh/ky-thuat-xay-dung-7580201/index.html`
- M: `site/nganh/ky-thuat-xay-dung-cong-trinh-giao-thong-7580205/index.html`
- M: `site/nganh/ky-thuat-xay-dung-cong-trinh-thuy-7580202/index.html`
- M: `site/nganh/ky-thuat-xet-nghiem-y-hoc-7720601/index.html`
- M: `site/nganh/ky-thuat-y-sinh-7520212/index.html`
- M: `site/nganh/lam-hoc-7620201/index.html`
- M: `site/nganh/lam-nghiep-7620210/index.html`
- M: `site/nganh/lam-nghiep-do-thi-7620202/index.html`
- M: `site/nganh/lam-sinh-7620205/index.html`
- M: `site/nganh/lich-su-7229010/index.html`
- M: `site/nganh/logistics-va-quan-ly-chuoi-cung-ung-7510605/index.html`
- M: `site/nganh/luat-7380101/index.html`
- M: `site/nganh/luat-dan-su-va-to-tung-dan-su-7380103/index.html`
- M: `site/nganh/luat-hien-phap-va-hanh-chinh-7380102/index.html`
- M: `site/nganh/luat-hinh-su-va-to-tung-hinh-su-7380104/index.html`
- M: `site/nganh/luat-kinh-doanh-7380110/index.html`
- M: `site/nganh/luat-kinh-te-7380107/index.html`
- M: `site/nganh/luat-quoc-te-7380108/index.html`
- M: `site/nganh/luat-thuong-mai-quoc-te-7380109/index.html`
- M: `site/nganh/luu-tru-hoc-7320303/index.html`
- M: `site/nganh/ly-luan-lich-su-va-phe-binh-my-thuat-7210101/index.html`
- M: `site/nganh/mang-may-tinh-va-truyen-thong-du-lieu-7480102/index.html`
- M: `site/nganh/marketing-7340115/index.html`
- M: `site/nganh/my-thuat-do-thi-7210110/index.html`
- M: `site/nganh/nang-luong-tai-tao-7510208/index.html`
- M: `site/nganh/nghe-thuat-so-7210408/index.html`
- M: `site/nganh/nghiep-vu-an-ninh-7860100/index.html`
- M: `site/nganh/ngon-ngu-anh-7220201/index.html`
- M: `site/nganh/ngon-ngu-duc-7220205/index.html`
- M: `site/nganh/ngon-ngu-han-quoc-7220210/index.html`
- M: `site/nganh/ngon-ngu-hoc-7229020/index.html`
- M: `site/nganh/ngon-ngu-italia-7220208/index.html`
- M: `site/nganh/ngon-ngu-nga-7220202/index.html`
- M: `site/nganh/ngon-ngu-nhat-7220209/index.html`
- M: `site/nganh/ngon-ngu-phap-7220203/index.html`
- M: `site/nganh/ngon-ngu-tay-ban-nha-7220206/index.html`
- M: `site/nganh/ngon-ngu-trung-quoc-7220204/index.html`
- M: `site/nganh/nhan-hoc-7310302/index.html`
- M: `site/nganh/nhat-ban-hoc-7310613/index.html`
- M: `site/nganh/nhiep-anh-nghe-thuat-7210301/index.html`
- M: `site/nganh/nong-hoc-7620109/index.html`
- M: `site/nganh/nong-nghiep-7620101/index.html`
- M: `site/nganh/nong-nghiep-cong-nghe-cao-7620118/index.html`
- M: `site/nganh/nuoi-trong-thuy-san-7620301/index.html`
- M: `site/nganh/phan-tich-du-lieu-kinh-doanh-7340125/index.html`
- M: `site/nganh/phat-trien-nong-thon-7620116/index.html`
- M: `site/nganh/phong-chay-chua-chay-va-cuu-nan-cuu-ho-7860113/index.html`
- M: `site/nganh/piano-7210208/index.html`
- M: `site/nganh/quan-he-cong-chung-7320108/index.html`
- M: `site/nganh/quan-he-lao-dong-7340408/index.html`
- M: `site/nganh/quan-he-quoc-te-7310206/index.html`
- M: `site/nganh/quan-ly-benh-vien-7720802/index.html`
- M: `site/nganh/quan-ly-cong-7340403/index.html`
- M: `site/nganh/quan-ly-cong-nghiep-7510601/index.html`
- M: `site/nganh/quan-ly-dat-dai-7850103/index.html`
- M: `site/nganh/quan-ly-do-thi-va-cong-trinh-7580106/index.html`
- M: `site/nganh/quan-ly-du-an-7340409/index.html`
- M: `site/nganh/quan-ly-giao-duc-7140114/index.html`
- M: `site/nganh/quan-ly-kinh-te-7310110/index.html`
- M: `site/nganh/quan-ly-nang-luong-7510602/index.html`
- M: `site/nganh/quan-ly-nha-nuoc-7310205/index.html`
- M: `site/nganh/quan-ly-phat-trien-do-thi-va-bat-dong-san-7580109/index.html`
- M: `site/nganh/quan-ly-tai-nguyen-nuoc-7850198/index.html`
- M: `site/nganh/quan-ly-tai-nguyen-rung-7620211/index.html`
- M: `site/nganh/quan-ly-tai-nguyen-va-moi-truong-7850101/index.html`
- M: `site/nganh/quan-ly-the-duc-the-thao-7810301/index.html`
- M: `site/nganh/quan-ly-thong-tin-7320205/index.html`
- M: `site/nganh/quan-ly-thuy-san-7620305/index.html`
- M: `site/nganh/quan-ly-van-hoa-7229042/index.html`
- M: `site/nganh/quan-ly-xay-dung-7580302/index.html`
- M: `site/nganh/quan-tri-dich-vu-du-lich-va-lu-hanh-7810103/index.html`
- M: `site/nganh/quan-tri-khach-san-7810201/index.html`
- M: `site/nganh/quan-tri-kinh-doanh-7340101/index.html`
- M: `site/nganh/quan-tri-nha-hang-va-dich-vu-an-uong-7810202/index.html`
- M: `site/nganh/quan-tri-nhan-luc-7340404/index.html`
- M: `site/nganh/quan-tri-su-kien-7340412/index.html`
- M: `site/nganh/quan-tri-thuong-hieu-7349001/index.html`
- M: `site/nganh/quan-tri-van-phong-7340406/index.html`
- M: `site/nganh/quay-phim-7210236/index.html`
- M: `site/nganh/quoc-te-hoc-7310601/index.html`
- M: `site/nganh/quy-hoach-vung-va-do-thi-7580105/index.html`
- M: `site/nganh/rang-ham-mat-7720501/index.html`
- M: `site/nganh/robot-va-tri-tue-nhan-tao-7510209/index.html`
- M: `site/nganh/sang-tac-am-nhac-7210203/index.html`
- M: `site/nganh/sinh-hoc-7420101/index.html`
- M: `site/nganh/sinh-hoc-ung-dung-7420203/index.html`
- M: `site/nganh/su-pham-am-nhac-7140221/index.html`
- M: `site/nganh/su-pham-cong-nghe-7140246/index.html`
- M: `site/nganh/su-pham-dia-ly-7140219/index.html`
- M: `site/nganh/su-pham-hoa-hoc-7140212/index.html`
- M: `site/nganh/su-pham-khoa-hoc-tu-nhien-7140247/index.html`
- M: `site/nganh/su-pham-lich-su-7140218/index.html`
- M: `site/nganh/su-pham-lich-su-dia-ly-7140249/index.html`
- M: `site/nganh/su-pham-my-thuat-7140222/index.html`
- M: `site/nganh/su-pham-ngu-van-7140217/index.html`
- M: `site/nganh/su-pham-sinh-hoc-7140213/index.html`
- M: `site/nganh/su-pham-tieng-anh-7140231/index.html`
- M: `site/nganh/su-pham-tieng-han-quoc-7140237/index.html`
- M: `site/nganh/su-pham-tieng-phap-7140233/index.html`
- M: `site/nganh/su-pham-tieng-trung-quoc-7140234/index.html`
- M: `site/nganh/su-pham-tin-hoc-7140210/index.html`
- M: `site/nganh/su-pham-toan-hoc-7140209/index.html`
- M: `site/nganh/su-pham-vat-ly-7140211/index.html`
- M: `site/nganh/tai-chinh-ngan-hang-7340201/index.html`
- M: `site/nganh/tai-chinh-quoc-te-7340206/index.html`
- M: `site/nganh/tai-chinh-va-ke-toan-7340202/index.html`
- M: `site/nganh/tai-nguyen-va-du-lich-sinh-thai-7859002/index.html`
- M: `site/nganh/tam-ly-hoc-7310401/index.html`
- M: `site/nganh/tam-ly-hoc-giao-duc-7310403/index.html`
- M: `site/nganh/thanh-nhac-7210205/index.html`
- M: `site/nganh/thiet-ke-cong-nghiep-7210402/index.html`
- M: `site/nganh/thiet-ke-do-hoa-7210403/index.html`
- M: `site/nganh/thiet-ke-my-thuat-so-7210409/index.html`
- M: `site/nganh/thiet-ke-noi-that-7580108/index.html`
- M: `site/nganh/thiet-ke-thoi-trang-7210404/index.html`
- M: `site/nganh/thiet-ke-vi-mach-7520231/index.html`
- M: `site/nganh/thong-ke-7460201/index.html`
- M: `site/nganh/thong-ke-kinh-te-7310107/index.html`
- M: `site/nganh/thong-tin-thu-vien-7320201/index.html`
- M: `site/nganh/thu-y-7640101/index.html`
- M: `site/nganh/thuong-mai-dien-tu-7340122/index.html`
- M: `site/nganh/thuy-van-hoc-7440224/index.html`
- M: `site/nganh/tieng-viet-va-van-hoa-viet-nam-7220101/index.html`
- M: `site/nganh/toan-hoc-7460101/index.html`
- M: `site/nganh/toan-kinh-te-7310108/index.html`
- M: `site/nganh/toan-tin-7460117/index.html`
- M: `site/nganh/toan-ung-dung-7460112/index.html`
- M: `site/nganh/ton-giao-hoc-7229009/index.html`
- M: `site/nganh/tri-tue-nhan-tao-7480107/index.html`
- M: `site/nganh/tri-tue-nhan-tao-7480207/index.html`
- M: `site/nganh/tri-tue-nhan-tao-va-khoa-hoc-du-lieu-7480205/index.html`
- M: `site/nganh/triet-hoc-7229001/index.html`
- M: `site/nganh/trung-quoc-hoc-7310612/index.html`
- M: `site/nganh/truyen-thong-da-phuong-tien-7320104/index.html`
- M: `site/nganh/truyen-thong-dai-chung-7320105/index.html`
- M: `site/nganh/truyen-thong-doanh-nghiep-7320109/index.html`
- M: `site/nganh/truyen-thong-quoc-te-7320107/index.html`
- M: `site/nganh/truyen-thong-so-7320111/index.html`
- M: `site/nganh/van-hoa-cac-dan-toc-thieu-so-viet-nam-7220112/index.html`
- M: `site/nganh/van-hoa-hoc-7229040/index.html`
- M: `site/nganh/van-hoc-7229030/index.html`
- M: `site/nganh/vat-ly-hoc-7440102/index.html`
- M: `site/nganh/vat-ly-ky-thuat-7520401/index.html`
- M: `site/nganh/vat-ly-y-khoa-7520403/index.html`
- M: `site/nganh/viet-nam-hoc-7310630/index.html`
- M: `site/nganh/xa-hoi-hoc-7310301/index.html`
- M: `site/nganh/xay-dung-dang-va-chinh-quyen-nha-nuoc-7310202/index.html`
- M: `site/nganh/y-hoc-co-truyen-7720115/index.html`
- M: `site/nganh/y-hoc-du-phong-7720110/index.html`
- M: `site/nganh/y-khoa-7720100/index.html`
- M: `site/nganh/y-khoa-7720101/index.html`
- M: `site/nganh/y-sinh-hoc-the-duc-the-thao-7729001/index.html`
- M: `site/nganh/y-te-cong-cong-7720701/index.html`
- M: `site/truong/dai-hoc-an-giang-qsa/index.html`
- M: `site/truong/dai-hoc-an-ninh-nhan-dan-ans/index.html`
- M: `site/truong/dai-hoc-ba-ria-vung-tau-bvu/index.html`
- M: `site/truong/dai-hoc-bac-lieu-dbl/index.html`
- M: `site/truong/dai-hoc-bach-khoa-da-nang-ddk/index.html`
- M: `site/truong/dai-hoc-bach-khoa-ha-noi-bka/index.html`
- M: `site/truong/dai-hoc-bach-khoa-hcm-qsb/index.html`
- M: `site/truong/dai-hoc-binh-duong-dbd/index.html`
- M: `site/truong/dai-hoc-can-tho-tct/index.html`
- M: `site/truong/dai-hoc-canh-sat-nhan-dan-css/index.html`
- M: `site/truong/dai-hoc-chu-van-an-dca/index.html`
- M: `site/truong/dai-hoc-cmc-cmc/index.html`
- M: `site/truong/dai-hoc-cong-doan-lda/index.html`
- M: `site/truong/dai-hoc-cong-nghe-dai-hoc-quoc-gia-ha-noi-qhi/index.html`
- M: `site/truong/dai-hoc-cong-nghe-dong-a-dda/index.html`
- M: `site/truong/dai-hoc-cong-nghe-dong-nai-dcd/index.html`
- M: `site/truong/dai-hoc-cong-nghe-giao-thong-van-tai-gta/index.html`
- M: `site/truong/dai-hoc-cong-nghe-ky-thuat-tphcm-spk/index.html`
- M: `site/truong/dai-hoc-cong-nghe-mien-dong-mit/index.html`
- M: `site/truong/dai-hoc-cong-nghe-sai-gon-dsg/index.html`
- M: `site/truong/dai-hoc-cong-nghe-thong-tin-dhqg-tphcm-qsc/index.html`
- M: `site/truong/dai-hoc-cong-nghe-thong-tin-va-truyen-thong-thai-nguyen-dtc/index.html`
- M: `site/truong/dai-hoc-cong-nghe-thong-tin-va-truyen-thong-viet-han-dai-hoc-da-nang-vku/index.html`
- M: `site/truong/dai-hoc-cong-nghe-tphcm-dkc/index.html`
- M: `site/truong/dai-hoc-cong-nghe-va-quan-ly-huu-nghi-dcq/index.html`
- M: `site/truong/dai-hoc-cong-nghiep-ha-noi-dcn/index.html`
- M: `site/truong/dai-hoc-cong-nghiep-quang-ninh-ddm/index.html`
- M: `site/truong/dai-hoc-cong-nghiep-tphcm-iuh/index.html`
- M: `site/truong/dai-hoc-cong-nghiep-va-thuong-mai-ha-noi-ccm/index.html`
- M: `site/truong/dai-hoc-cong-nghiep-viet-hung-vhd/index.html`
- M: `site/truong/dai-hoc-cong-nghiep-viet-tri-vui/index.html`
- M: `site/truong/dai-hoc-cong-nghiep-vinh-dcv/index.html`
- M: `site/truong/dai-hoc-cong-thuong-tphcm-dct/index.html`
- M: `site/truong/dai-hoc-cuu-long-dcl/index.html`
- M: `site/truong/dai-hoc-da-lat-tdl/index.html`
- M: `site/truong/dai-hoc-dai-nam-ddn/index.html`
- M: `site/truong/dai-hoc-dau-khi-viet-nam-pvu/index.html`
- M: `site/truong/dai-hoc-dien-luc-ddl/index.html`
- M: `site/truong/dai-hoc-dieu-duong-nam-dinh-ydd/index.html`
- M: `site/truong/dai-hoc-dong-a-dad/index.html`
- M: `site/truong/dai-hoc-dong-do-ddu/index.html`
- M: `site/truong/dai-hoc-dong-nai-dnu/index.html`
- M: `site/truong/dai-hoc-dong-thap-spd/index.html`
- M: `site/truong/dai-hoc-duoc-ha-noi-dkh/index.html`
- M: `site/truong/dai-hoc-duy-tan-ddt/index.html`
- M: `site/truong/dai-hoc-fpt-fpt/index.html`
- M: `site/truong/dai-hoc-gia-dinh-gdu/index.html`
- M: `site/truong/dai-hoc-giao-duc-ha-noi-qhs/index.html`
- M: `site/truong/dai-hoc-giao-thong-van-tai-co-so-phia-bac-gha/index.html`
- M: `site/truong/dai-hoc-giao-thong-van-tai-co-so-phia-nam-gsa/index.html`
- M: `site/truong/dai-hoc-giao-thong-van-tai-tphcm-uth/index.html`
- M: `site/truong/dai-hoc-ha-long-hlu/index.html`
- M: `site/truong/dai-hoc-ha-noi-nhf/index.html`
- M: `site/truong/dai-hoc-ha-tinh-hht/index.html`
- M: `site/truong/dai-hoc-hai-duong-dkt/index.html`
- M: `site/truong/dai-hoc-hai-phong-thp/index.html`
- M: `site/truong/dai-hoc-hang-hai-hha/index.html`
- M: `site/truong/dai-hoc-hoa-binh-etu/index.html`
- M: `site/truong/dai-hoc-hoa-lu-dnb/index.html`
- M: `site/truong/dai-hoc-hoa-sen-hsu/index.html`
- M: `site/truong/dai-hoc-hong-duc-hdt/index.html`
- M: `site/truong/dai-hoc-hung-vuong-thv/index.html`
- M: `site/truong/dai-hoc-hung-vuong-tphcm-dhv/index.html`
- M: `site/truong/dai-hoc-khanh-hoa-ukh/index.html`
- M: `site/truong/dai-hoc-khoa-hoc-hue-dht/index.html`
- M: `site/truong/dai-hoc-khoa-hoc-suc-khoe-tphcm-qsy/index.html`
- M: `site/truong/dai-hoc-khoa-hoc-thai-nguyen-dtz/index.html`
- M: `site/truong/dai-hoc-khoa-hoc-tu-nhien-dai-hoc-quoc-gia-ha-noi-qht/index.html`
- M: `site/truong/dai-hoc-khoa-hoc-tu-nhien-tphcm-qst/index.html`
- M: `site/truong/dai-hoc-khoa-hoc-va-cong-nghe-ha-noi-kcn/index.html`
- M: `site/truong/dai-hoc-khoa-hoc-xa-hoi-va-nhan-van-ha-noi-qhx/index.html`
- M: `site/truong/dai-hoc-khoa-hoc-xa-hoi-va-nhan-van-tphcm-qsx/index.html`
- M: `site/truong/dai-hoc-kiem-sat-dks/index.html`
- M: `site/truong/dai-hoc-kien-giang-tkg/index.html`
- M: `site/truong/dai-hoc-kien-truc-da-nang-ktd/index.html`
- M: `site/truong/dai-hoc-kien-truc-ha-noi-kta/index.html`
- M: `site/truong/dai-hoc-kien-truc-tphcm-kts/index.html`
- M: `site/truong/dai-hoc-kinh-bac-ukb/index.html`
- M: `site/truong/dai-hoc-kinh-doanh-va-cong-nghe-ha-noi-dqk/index.html`
- M: `site/truong/dai-hoc-kinh-te-cong-nghe-thai-nguyen-dvb/index.html`
- M: `site/truong/dai-hoc-kinh-te-cong-nghiep-long-an-dla/index.html`
- M: `site/truong/dai-hoc-kinh-te-dai-hoc-da-nang-ddq/index.html`
- M: `site/truong/dai-hoc-kinh-te-dai-hoc-hue-dhk/index.html`
- M: `site/truong/dai-hoc-kinh-te-ha-noi-qhe/index.html`
- M: `site/truong/dai-hoc-kinh-te-ky-thuat-binh-duong-dkb/index.html`
- M: `site/truong/dai-hoc-kinh-te-ky-thuat-cong-nghiep-dkk/index.html`
- M: `site/truong/dai-hoc-kinh-te-luat-tphcm-qsk/index.html`
- M: `site/truong/dai-hoc-kinh-te-quan-tri-kinh-doanh-thai-nguyen-dte/index.html`
- M: `site/truong/dai-hoc-kinh-te-quoc-dan-kha/index.html`
- M: `site/truong/dai-hoc-kinh-te-tai-chinh-tphcm-uef/index.html`
- M: `site/truong/dai-hoc-kinh-te-tphcm-ksa/index.html`
- M: `site/truong/dai-hoc-kinh-te-tphcm-phan-hieu-vinh-long-ksv/index.html`
- M: `site/truong/dai-hoc-ky-thuat-cong-nghe-can-tho-kcc/index.html`
- M: `site/truong/dai-hoc-ky-thuat-cong-nghiep-thai-nguyen-dtk/index.html`
- M: `site/truong/dai-hoc-ky-thuat-y-duoc-da-nang-ydn/index.html`
- M: `site/truong/dai-hoc-ky-thuat-y-te-hai-duong-dky/index.html`
- M: `site/truong/dai-hoc-lac-hong-dlh/index.html`
- M: `site/truong/dai-hoc-lam-nghiep-lnh/index.html`
- M: `site/truong/dai-hoc-lao-dong-xa-hoi-co-so-ha-noi-dlx/index.html`
- M: `site/truong/dai-hoc-lao-dong-xa-hoi-co-so-phia-nam-dls/index.html`
- M: `site/truong/dai-hoc-luat-dai-hoc-hue-dha/index.html`
- M: `site/truong/dai-hoc-luat-dai-hoc-quoc-gia-ha-noi-qhl/index.html`
- M: `site/truong/dai-hoc-luat-ha-noi-lph/index.html`
- M: `site/truong/dai-hoc-luat-tphcm-lps/index.html`
- M: `site/truong/dai-hoc-luong-the-vinh-dtv/index.html`
- M: `site/truong/dai-hoc-mo-dia-chat-mda/index.html`
- M: `site/truong/dai-hoc-mo-ha-noi-mhn/index.html`
- M: `site/truong/dai-hoc-mo-tphcm-mbs/index.html`
- M: `site/truong/dai-hoc-my-thuat-cong-nghiep-mtc/index.html`
- M: `site/truong/dai-hoc-my-thuat-tphcm-mts/index.html`
- M: `site/truong/dai-hoc-my-thuat-viet-nam-mth/index.html`
- M: `site/truong/dai-hoc-nam-can-tho-dnc/index.html`
- M: `site/truong/dai-hoc-ngan-hang-tphcm-nhs/index.html`
- M: `site/truong/dai-hoc-nghe-an-cea/index.html`
- M: `site/truong/dai-hoc-nghe-thuat-hue-dhn/index.html`
- M: `site/truong/dai-hoc-ngoai-ngu-da-nang-ddf/index.html`
- M: `site/truong/dai-hoc-ngoai-ngu-ha-noi-qhf/index.html`
- M: `site/truong/dai-hoc-ngoai-ngu-hue-dhf/index.html`
- M: `site/truong/dai-hoc-ngoai-ngu-tin-hoc-tphcm-dnt/index.html`
- M: `site/truong/dai-hoc-ngoai-thuong-co-so-phia-bac-nth/index.html`
- M: `site/truong/dai-hoc-ngoai-thuong-co-so-phia-nam-nts/index.html`
- M: `site/truong/dai-hoc-nguyen-tat-thanh-ntt/index.html`
- M: `site/truong/dai-hoc-nguyen-trai-ntu/index.html`
- M: `site/truong/dai-hoc-nha-trang-tsn/index.html`
- M: `site/truong/dai-hoc-nong-lam-bac-giang-dbg/index.html`
- M: `site/truong/dai-hoc-nong-lam-hue-dhl/index.html`
- M: `site/truong/dai-hoc-nong-lam-thai-nguyen-dtn/index.html`
- M: `site/truong/dai-hoc-nong-lam-tphcm-nls/index.html`
- M: `site/truong/dai-hoc-pham-van-dong-dpq/index.html`
- M: `site/truong/dai-hoc-phan-chau-trinh-dpc/index.html`
- M: `site/truong/dai-hoc-phan-thiet-dpt/index.html`
- M: `site/truong/dai-hoc-phenikaa-pka/index.html`
- M: `site/truong/dai-hoc-phong-chay-chua-chay-phia-bac-pch/index.html`
- M: `site/truong/dai-hoc-phong-chay-chua-chay-phia-nam-pcs/index.html`
- M: `site/truong/dai-hoc-phu-xuan-dpx/index.html`
- M: `site/truong/dai-hoc-phu-yen-dpy/index.html`
- M: `site/truong/dai-hoc-phuong-dong-dpd/index.html`
- M: `site/truong/dai-hoc-quan-ly-va-cong-nghe-hai-phong-hpu/index.html`
- M: `site/truong/dai-hoc-quan-ly-va-cong-nghe-tphcm-umt/index.html`
- M: `site/truong/dai-hoc-quang-binh-dqb/index.html`
- M: `site/truong/dai-hoc-quang-nam-dqu/index.html`
- M: `site/truong/dai-hoc-quang-trung-dqt/index.html`
- M: `site/truong/dai-hoc-quoc-te-bac-ha-dbh/index.html`
- M: `site/truong/dai-hoc-quoc-te-dhqg-tphcm-qsq/index.html`
- M: `site/truong/dai-hoc-quoc-te-hong-bang-hiu/index.html`
- M: `site/truong/dai-hoc-quoc-te-mien-dong-eiu/index.html`
- M: `site/truong/dai-hoc-quoc-te-sai-gon-siu/index.html`
- M: `site/truong/dai-hoc-quy-nhon-dqn/index.html`
- M: `site/truong/dai-hoc-sai-gon-sgd/index.html`
- M: `site/truong/dai-hoc-san-khau-dien-anh-ha-noi-skd/index.html`
- M: `site/truong/dai-hoc-san-khau-dien-anh-tphcm-dsd/index.html`
- M: `site/truong/dai-hoc-sao-do-sdu/index.html`
- M: `site/truong/dai-hoc-su-pham-dai-hoc-da-nang-dds/index.html`
- M: `site/truong/dai-hoc-su-pham-ha-noi-2-sp2/index.html`
- M: `site/truong/dai-hoc-su-pham-ha-noi-sph/index.html`
- M: `site/truong/dai-hoc-su-pham-hue-dhs/index.html`
- M: `site/truong/dai-hoc-su-pham-ky-thuat-dai-hoc-da-nang-dsk/index.html`
- M: `site/truong/dai-hoc-su-pham-ky-thuat-hung-yen-skh/index.html`
- M: `site/truong/dai-hoc-su-pham-ky-thuat-nam-dinh-skn/index.html`
- M: `site/truong/dai-hoc-su-pham-ky-thuat-vinh-long-vlu/index.html`
- M: `site/truong/dai-hoc-su-pham-ky-thuat-vinh-skv/index.html`
- M: `site/truong/dai-hoc-su-pham-nghe-thuat-trung-uong-gnt/index.html`
- M: `site/truong/dai-hoc-su-pham-thai-nguyen-dts/index.html`
- M: `site/truong/dai-hoc-su-pham-the-duc-the-thao-ha-noi-tdh/index.html`
- M: `site/truong/dai-hoc-su-pham-the-duc-the-thao-tphcm-sts/index.html`
- M: `site/truong/dai-hoc-su-pham-tphcm-sps/index.html`
- M: `site/truong/dai-hoc-tai-chinh-marketing-dms/index.html`
- M: `site/truong/dai-hoc-tai-chinh-ngan-hang-ha-noi-fbu/index.html`
- M: `site/truong/dai-hoc-tai-nguyen-va-moi-truong-ha-noi-dmt/index.html`
- M: `site/truong/dai-hoc-tai-nguyen-va-moi-truong-tphcm-dtm/index.html`
- M: `site/truong/dai-hoc-tan-tao-ttu/index.html`
- M: `site/truong/dai-hoc-tan-trao-tqu/index.html`
- M: `site/truong/dai-hoc-tay-bac-ttb/index.html`
- M: `site/truong/dai-hoc-tay-do-dtd/index.html`
- M: `site/truong/dai-hoc-tay-nguyen-ttn/index.html`
- M: `site/truong/dai-hoc-thai-binh-dtb/index.html`
- M: `site/truong/dai-hoc-thai-binh-duong-tbd/index.html`
- M: `site/truong/dai-hoc-thang-long-dtl/index.html`
- M: `site/truong/dai-hoc-thanh-do-tdd/index.html`
- M: `site/truong/dai-hoc-thanh-dong-ddb/index.html`
- M: `site/truong/dai-hoc-the-duc-the-thao-bac-ninh-tdb/index.html`
- M: `site/truong/dai-hoc-the-duc-the-thao-da-nang-ttd/index.html`
- M: `site/truong/dai-hoc-the-duc-the-thao-tphcm-tds/index.html`
- M: `site/truong/dai-hoc-thu-dau-mot-tdm/index.html`
- M: `site/truong/dai-hoc-thu-do-ha-noi-hnm/index.html`
- M: `site/truong/dai-hoc-thuong-mai-tmu/index.html`
- M: `site/truong/dai-hoc-thuy-loi-co-so-1-tla/index.html`
- M: `site/truong/dai-hoc-thuy-loi-co-so-2-tls/index.html`
- M: `site/truong/dai-hoc-tien-giang-ttg/index.html`
- M: `site/truong/dai-hoc-ton-duc-thang-dtt/index.html`
- M: `site/truong/dai-hoc-tra-vinh-dvt/index.html`
- M: `site/truong/dai-hoc-trung-vuong-dvp/index.html`
- M: `site/truong/dai-hoc-van-hien-dvh/index.html`
- M: `site/truong/dai-hoc-van-hoa-ha-noi-vhh/index.html`
- M: `site/truong/dai-hoc-van-hoa-the-thao-va-du-lich-thanh-hoa-dvd/index.html`
- M: `site/truong/dai-hoc-van-hoa-tphcm-vhs/index.html`
- M: `site/truong/dai-hoc-van-lang-dvl/index.html`
- M: `site/truong/dai-hoc-viet-duc-vgu/index.html`
- M: `site/truong/dai-hoc-viet-nhat-ha-noi-vju/index.html`
- M: `site/truong/dai-hoc-vinh-tdv/index.html`
- M: `site/truong/dai-hoc-vo-truong-toan-vtt/index.html`
- M: `site/truong/dai-hoc-xay-dung-ha-noi-xda/index.html`
- M: `site/truong/dai-hoc-xay-dung-mien-tay-mtu/index.html`
- M: `site/truong/dai-hoc-xay-dung-mien-trung-xdt/index.html`
- M: `site/truong/dai-hoc-y-duoc-buon-ma-thuot-bmu/index.html`
- M: `site/truong/dai-hoc-y-duoc-can-tho-yct/index.html`
- M: `site/truong/dai-hoc-y-duoc-dai-hoc-quoc-gia-ha-noi-qhy/index.html`
- M: `site/truong/dai-hoc-y-duoc-hai-phong-ypb/index.html`
- M: `site/truong/dai-hoc-y-duoc-hue-dhy/index.html`
- M: `site/truong/dai-hoc-y-duoc-thai-binh-ytb/index.html`
- M: `site/truong/dai-hoc-y-duoc-thai-nguyen-dty/index.html`
- M: `site/truong/dai-hoc-y-duoc-tphcm-yds/index.html`
- M: `site/truong/dai-hoc-y-ha-noi-yhb/index.html`
- M: `site/truong/dai-hoc-y-khoa-pham-ngoc-thach-tys/index.html`
- M: `site/truong/dai-hoc-y-khoa-tokyo-viet-nam-thu/index.html`
- M: `site/truong/dai-hoc-y-khoa-vinh-ykv/index.html`
- M: `site/truong/dai-hoc-y-te-cong-cong-ytc/index.html`
- M: `site/truong/dai-hoc-yersin-da-lat-dyd/index.html`
- M: `site/truong/hoc-vien-am-nhac-hue-hva/index.html`
- M: `site/truong/hoc-vien-an-ninh-nhan-dan-anh/index.html`
- M: `site/truong/hoc-vien-bao-chi-va-tuyen-truyen-hbt/index.html`
- M: `site/truong/hoc-vien-bien-phong-bph/index.html`
- M: `site/truong/hoc-vien-can-bo-tphcm-hvc/index.html`
- M: `site/truong/hoc-vien-canh-sat-nhan-dan-csh/index.html`
- M: `site/truong/hoc-vien-chinh-sach-va-phat-trien-hcp/index.html`
- M: `site/truong/hoc-vien-chinh-tri-cong-an-nhan-dan-hca/index.html`
- M: `site/truong/hoc-vien-cong-nghe-buu-chinh-vien-thong-phia-bac-bvh/index.html`
- M: `site/truong/hoc-vien-cong-nghe-buu-chinh-vien-thong-phia-nam-bvs/index.html`
- M: `site/truong/hoc-vien-dan-toc-hvd/index.html`
- M: `site/truong/hoc-vien-hai-quan-hqh/index.html`
- M: `site/truong/hoc-vien-hang-khong-viet-nam-hhk/index.html`
- M: `site/truong/hoc-vien-hanh-chinh-va-quan-tri-cong-hch/index.html`
- M: `site/truong/hoc-vien-hanh-chinh-va-quan-tri-cong-phia-nam-hcs/index.html`
- M: `site/truong/hoc-vien-hau-can-he-dan-su-hfh/index.html`
- M: `site/truong/hoc-vien-hau-can-he-quan-su-heh/index.html`
- M: `site/truong/hoc-vien-khoa-hoc-quan-su-he-dan-su-dnh/index.html`
- M: `site/truong/hoc-vien-khoa-hoc-quan-su-he-quan-su-nqh/index.html`
- M: `site/truong/hoc-vien-ky-thuat-cong-nghe-an-ninh-phia-bac-hcb/index.html`
- M: `site/truong/hoc-vien-ky-thuat-mat-ma-kma/index.html`
- M: `site/truong/hoc-vien-ky-thuat-quan-su-he-dan-su-dqh/index.html`
- M: `site/truong/hoc-vien-ky-thuat-quan-su-he-quan-su-kqh/index.html`
- M: `site/truong/hoc-vien-ky-thuat-va-cong-nghe-an-ninh-phia-nam-hcn/index.html`
- M: `site/truong/hoc-vien-ngan-hang-nhh/index.html`
- M: `site/truong/hoc-vien-ngan-hang-phan-vien-bac-ninh-nhb/index.html`
- M: `site/truong/hoc-vien-ngan-hang-phan-vien-phu-yen-nhp/index.html`
- M: `site/truong/hoc-vien-ngoai-giao-hqt/index.html`
- M: `site/truong/hoc-vien-nong-nghiep-viet-nam-hvn/index.html`
- M: `site/truong/hoc-vien-phong-khong-khong-quan-pkh/index.html`
- M: `site/truong/hoc-vien-phu-nu-viet-nam-hpn/index.html`
- M: `site/truong/hoc-vien-quan-ly-giao-duc-hvq/index.html`
- M: `site/truong/hoc-vien-quan-y-he-dan-su-dyh/index.html`
- M: `site/truong/hoc-vien-quan-y-he-quan-su-yqh/index.html`
- M: `site/truong/hoc-vien-tai-chinh-htc/index.html`
- M: `site/truong/hoc-vien-tai-chinh-phan-hieu-hung-yen-hty/index.html`
- M: `site/truong/hoc-vien-thanh-thieu-nien-viet-nam-htn/index.html`
- M: `site/truong/hoc-vien-toa-an-hta/index.html`
- M: `site/truong/hoc-vien-y-duoc-hoc-co-truyen-viet-nam-hyd/index.html`
- M: `site/truong/index.html`
- M: `site/truong/khoa-giao-duc-the-chat-hue-dhc/index.html`
- M: `site/truong/khoa-ky-thuat-va-cong-nghe-dai-hoc-hue-dhe/index.html`
- M: `site/truong/khoa-quoc-te-dai-hoc-hue-dhi/index.html`
- M: `site/truong/khoa-quoc-te-dai-hoc-thai-nguyen-dtq/index.html`
- M: `site/truong/nhac-vien-tphcm-nvs/index.html`
- M: `site/truong/phan-hieu-dai-hoc-da-nang-tai-kon-tum-ddp/index.html`
- M: `site/truong/phan-hieu-dai-hoc-hue-tai-quang-tri-dhq/index.html`
- M: `site/truong/phan-hieu-dai-hoc-lam-nghiep-tai-dong-nai-lns/index.html`
- M: `site/truong/phan-hieu-dai-hoc-lam-nghiep-tinh-gia-lai-lna/index.html`
- M: `site/truong/phan-hieu-dai-hoc-nong-lam-tphcm-tai-gia-lai-nlg/index.html`
- M: `site/truong/phan-hieu-dai-hoc-nong-lam-tphcm-tai-ninh-thuan-nln/index.html`
- M: `site/truong/phan-hieu-dai-hoc-quoc-gia-tphcm-tai-ben-tre-qsp/index.html`
- M: `site/truong/phan-hieu-dai-hoc-thai-nguyen-tai-ha-giang-dtg/index.html`
- M: `site/truong/phan-hieu-dai-hoc-thai-nguyen-tai-lao-cai-dtp/index.html`
- M: `site/truong/phan-hieu-dai-hoc-xay-dung-mien-trung-tai-da-nang-xdn/index.html`
- M: `site/truong/truong-dai-hoc-tai-chinh-marketing-phan-hieu-quang-ngai-ufa/index.html`
- M: `site/truong/truong-du-lich-dai-hoc-hue-dhd/index.html`
- M: `site/truong/truong-khoa-hoc-lien-nganh-va-nghe-thuat-ha-noi-qhk/index.html`
- M: `site/truong/truong-ngoai-ngu-thai-nguyen-dtf/index.html`
- M: `site/truong/truong-quan-tri-va-kinh-doanh-dh-quoc-gia-ha-noi-qhd/index.html`
- M: `site/truong/truong-quoc-te-dai-hoc-quoc-gia-ha-noi-qhq/index.html`
- M: `site/truong/truong-si-quan-chinh-tri-dai-hoc-chinh-tri-lch/index.html`
- M: `site/truong/truong-si-quan-cong-binh-he-quan-su-dai-hoc-ngo-quyen-snh/index.html`
- M: `site/truong/truong-si-quan-dac-cong-dch/index.html`
- M: `site/truong/truong-si-quan-khong-quan-he-dai-hoc-kgh/index.html`
- M: `site/truong/truong-si-quan-ki-thuat-quan-su-he-quan-su-dai-hoc-tran-dai-nghia-vph/index.html`
- M: `site/truong/truong-si-quan-luc-quan-1-dai-hoc-tran-quoc-tuan-lah/index.html`
- M: `site/truong/truong-si-quan-luc-quan-2-dai-hoc-nguyen-hue-lbh/index.html`
- M: `site/truong/truong-si-quan-phao-binh-pbh/index.html`
- M: `site/truong/truong-si-quan-phong-hoa-hgh/index.html`
- M: `site/truong/truong-si-quan-thong-tin-he-dan-su-dai-hoc-thong-tin-lien-lac-tcu/index.html`
- M: `site/truong/truong-si-quan-thong-tin-he-quan-su-dai-hoc-thong-tin-lien-lac-tth/index.html`
- M: `site/truong/truong-siquan-tang-thiet-giap-tgh/index.html`
- M: `site/truong/truong-y-duoc-da-nang-ddy/index.html`
- M: `site/truong/vien-nghien-cuu-va-dao-tao-viet-anh-dai-hoc-da-nang-ddv/index.html`
- M: `webapp/main.py`
- M: `webapp/static/app.js`
- M: `webapp/static/index.html`
- M: `webapp/static/mos.html`

</details>
