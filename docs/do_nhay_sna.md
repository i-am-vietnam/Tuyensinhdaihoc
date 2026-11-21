# Phân tích độ nhạy tham số mạng SNA

Sinh tự động bởi `scripts/report_sensitivity.py` từ `data/eduradar.db` hiện tại (dùng lại hàm dựng mạng của `sna/build.py`; cấu hình chuẩn Jaccard 0,25 và khoảng điểm 2 trùng `data/network/summary.csv`). Mỗi lần chỉ đổi một tham số. Louvain có trọng số, seed 42; ARI/NMI tính trên đỉnh chung của hai phân hoạch.

## G2 Trường – Trường theo ngưỡng Jaccard (2026)

| Độ đo | 0,15 | 0,20 | 0,25 | 0,30 | 0,35 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Số đỉnh | 262 | 259 | 250 | 237 | 218 |
| Số cạnh | 7.472 | 4.446 | 2.540 | 1.332 | 720 |
| Mật độ | 0,218 | 0,133 | 0,082 | 0,048 | 0,030 |
| Số thành phần | 5 | 6 | 8 | 14 | 23 |
| LCC (đỉnh) | 250 | 245 | 232 | 201 | 141 |
| LCC (%) | 95,4 | 94,6 | 92,8 | 84,8 | 64,7 |
| Đường đi TB (LCC) | 2,21 | 2,63 | 3,24 | 3,75 | 3,93 |
| Clustering TB | 0,657 | 0,610 | 0,548 | 0,523 | 0,439 |
| Modularity Louvain | 0,257 | 0,363 | 0,484 | 0,615 | 0,703 |
| Số cộng đồng | 10 | 11 | 19 | 22 | 30 |

Năm 2024 (0,15 / 0,25 / 0,35): Q = 0,242 / 0,449 / 0,668; LCC = 251 / 219 / 163 đỉnh; thành phần = 4 / 11 / 20; cộng đồng = 10 / 18 / 26.

## G3 Ngành – Ngành theo ngưỡng Jaccard (2026)

| Độ đo | 0,15 | 0,20 | 0,25 | 0,30 | 0,35 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Số đỉnh | 399 | 392 | 370 | 330 | 267 |
| Số cạnh | 3.429 | 2.135 | 1.391 | 906 | 579 |
| Mật độ | 0,043 | 0,028 | 0,020 | 0,017 | 0,016 |
| Số thành phần | 3 | 4 | 7 | 21 | 50 |
| LCC (đỉnh) | 395 | 385 | 357 | 211 | 23 |
| LCC (%) | 99,0 | 98,2 | 96,5 | 63,9 | 8,6 |
| Đường đi TB (LCC) | 3,28 | 4,03 | 5,67 | 12,82 | 1,72 |
| Clustering TB | 0,538 | 0,535 | 0,512 | 0,483 | 0,505 |
| Modularity Louvain | 0,682 | 0,775 | 0,836 | 0,879 | 0,895 |
| Số cộng đồng | 13 | 14 | 20 | 32 | 50 |

Năm 2024 (0,15 / 0,25 / 0,35): Q = 0,716 / 0,836 / 0,905; LCC = 381 / 345 / 28 đỉnh; thành phần = 5 / 13 / 41; cộng đồng = 16 / 27 / 42.

## G4 theo khoảng điểm

| Độ đo | Năm | 1 điểm | 2 điểm | 3 điểm |
| --- | --- | ---: | ---: | ---: |
| Số đỉnh | 2026 | 224 | 226 | 226 |
| Số cạnh | 2026 | 6.098 | 9.215 | 11.492 |
| Mật độ | 2026 | 0,122 | 0,181 | 0,226 |
| Thành phần liên thông mạnh | 2026 | 50 | 35 | 23 |
| Spearman(PageRank, điểm TB) | 2026 | 0,528 | 0,608 | 0,664 |
| Spearman(authority, điểm TB) | 2026 | 0,233 | 0,235 | 0,249 |
| Top 10 PageRank trùng mốc 2 điểm | 2026 | 6 | 10 | 9 |
| Top 10 authority trùng mốc 2 điểm | 2026 | 5 | 10 | 8 |
| Số đỉnh | 2024 | 257 | 259 | 259 |
| Số cạnh | 2024 | 7.107 | 10.542 | 12.731 |
| Mật độ | 2024 | 0,108 | 0,158 | 0,191 |
| Thành phần liên thông mạnh | 2024 | 19 | 17 | 16 |
| Spearman(PageRank, điểm TB) | 2024 | 0,450 | 0,567 | 0,634 |
| Spearman(authority, điểm TB) | 2024 | −0,384 | −0,401 | −0,309 |
| Top 10 PageRank trùng mốc 2 điểm | 2024 | 7 | 10 | 9 |
| Top 10 authority trùng mốc 2 điểm | 2024 | 7 | 10 | 10 |

## Độ ổn định cộng đồng Louvain (2026)

| So sánh | G2: ARI / NMI (đỉnh chung) | G3: ARI / NMI (đỉnh chung) |
| --- | --- | --- |
| 0,15 so với 0,25 | 0,525 / 0,725 (250) | 0,639 / 0,774 (370) |
| 0,35 so với 0,25 | 0,598 / 0,804 (218) | 0,521 / 0,808 (267) |
| 0,15 so với 0,35 | 0,406 / 0,663 (218) | 0,426 / 0,753 (267) |
| Mức nền: 20 seed so với seed 42 (0,25) | TB 0,796 (thấp nhất 0,543) / 0,888 | TB 0,907 (thấp nhất 0,863) / 0,956 |

Cụm y dược (10 trường QHY, YDN, DDY, DHY, QSY, TYS, YDS, YHB, YPB, DTY) trong G2 2026:

- Ngưỡng 0,15: 10/10 trường cùng một cộng đồng; tỉ lệ cạnh của cộng đồng đó đi ra ngoài 24,6%.
- Ngưỡng 0,20: 10/10 trường cùng một cộng đồng; tỉ lệ cạnh của cộng đồng đó đi ra ngoài 10,9%.
- Ngưỡng 0,25: 10/10 trường cùng một cộng đồng; tỉ lệ cạnh của cộng đồng đó đi ra ngoài 6,6%.
- Ngưỡng 0,30: 10/10 trường cùng một cộng đồng; tỉ lệ cạnh của cộng đồng đó đi ra ngoài 1,4%.
- Ngưỡng 0,35: 10/10 trường cùng một cộng đồng; tỉ lệ cạnh của cộng đồng đó đi ra ngoài 0,9%.

## Trùng lặp top 10 so với ngưỡng 0,25 (2026)

| Mạng | Ngưỡng | Bậc | Betweenness | Eigenvector | PageRank |
| --- | --- | ---: | ---: | ---: | ---: |
| G2 | 0,15 | 5/10 | 4/10 | 8/10 | 7/10 |
| G2 | 0,35 | 6/10 | 2/10 | 8/10 | 7/10 |
| G3 | 0,15 | 2/10 | 1/10 | 10/10 | 3/10 |
| G3 | 0,35 | 4/10 | 0/10 | 0/10 | 1/10 |

G2: đỉnh betweenness cao nhất ở 0,25 là `U:VTT`; hạng ở 0,15 / 0,25 / 0,35 = 1 / 1 / 74.

G2 top 5 eigenvector: 0,15: HUFLIT, HUB, BETU, UTM, BVU; 0,25: HUFLIT, HUB, GDU, BVU, DNU; 0,35: HUFLIT, HUB, GDU, BETU, HVUH.

G3: đỉnh betweenness cao nhất ở 0,25 là `M:7420101`; hạng ở 0,15 / 0,25 / 0,35 = 23 / 1 / 76.

G3 top 5 eigenvector: 0,15: Quản lý và phân tích dữ liệu khoa học, Địa tin học, Kỹ thuật địa vật lý, Đá quý Đá mỹ nghệ, Kỹ thuật khí thiên nhiên; 0,25: Quản lý và phân tích dữ liệu khoa học, Địa tin học, Kỹ thuật địa vật lý, Đá quý Đá mỹ nghệ, Kỹ thuật khí thiên nhiên; 0,35: Sư phạm Vật lý, Sư phạm Ngữ văn, Sư phạm Hóa học, Sư phạm Sinh học, Sư phạm Lịch sử.

## Adamic–Adar G3 2024 → 2026 theo ngưỡng

| Ngưỡng | Trúng trong top 300 | Tỉ lệ nền | Gấp nền |
| --- | ---: | ---: | ---: |
| 0,15 | 121/300 | 0,01426 | 28,3 |
| 0,25 | 68/300 | 0,00532 | 42,6 |
| 0,35 | 57/300 | 0,00361 | 52,6 |

## Mức dao động điểm chuẩn giữa hai năm (lý do chọn khoảng 2 điểm)

Điểm THPT thang 30 cao nhất của cùng (trường, ngành), dòng không cờ.

| Cặp năm | Số cặp | Trung vị mức thay đổi | ≤ 1 điểm | ≤ 2 điểm | ≤ 3 điểm |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2024 → 2025 | 3.985 | 1,00 | 54,7% | 76,3% | 87,6% |
| 2025 → 2026 | 3.957 | 0,95 | 61,1% | 79,5% | 88,8% |
