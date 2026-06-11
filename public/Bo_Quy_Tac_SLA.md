# BẢN ĐẶC TẢ BỘ QUY TẮC TÍNH TOÁN SLA & TARGET DATE
*Ngày cập nhật: 11/06/2026 | Hệ Thống Máy Dò SLA*

Tài liệu này chứa toàn bộ định nghĩa luật (Rule-set) và logic nghiệp vụ đang được vận hành bởi Hệ thống Máy dò SLA để tính toán Ngày hoàn thành dự kiến (Target Date) khớp với các mốc thời gian của ngân hàng.

---

## 1. KHUNG THỜI GIAN LÀM VIỆC & LỊCH NGHỈ LỄ (T)

### 1.1. Thời Gian Làm Việc Trong Ngày
Năm làm việc tiêu chuẩn được quy hoạch theo mốc 8 giờ làm việc mỗi ngày:
*   **Ca Sáng:** 08:30 – 12:00 (Thời lượng: 3.5 giờ)
*   **Nghỉ Trưa:** 12:00 – 13:30 (Thời gian chết, không tính vào SLA)
*   Ca Chiều:** 13:30 – 18:00 (Thời lượng: 4.5 giờ)
*   **Hết Giờ Làm Việc:** Sau 18:00 (Chuyển tiếp qua 08:30 sáng ngày làm việc tiếp theo)

### 1.2. Quy Định Sắp Xếp Ngày Làm Việc Đầu Tiên (Ngày T)
*   **Cách tính SLA Ngày:**
    *   Nếu yêu cầu nhận trước **08:30 sáng** vào ngày làm việc (hoặc vào ngày nghỉ): Hạn chốt tính từ ngày làm việc hiện tại (T + SLA). Mốc bắt đầu ghi nhận lúc **08:30**.
    *   Nếu yêu cầu nhận sau **08:30 sáng** trong ngày làm việc: Phải cộng thêm 1 ngày làm việc để bù đắp cho thời gian của nửa ngày đầu đã trôi qua (T + SLA + 1). Ghi nhận hạn đóng tròn **18:00** của ngày chốt.
*   **Cách tính SLA Giờ:**
    *   Mốc thời gian được dồn tịnh tiến liên tục qua các giờ làm việc thực tế.
    *   Nếu mốc bắt đầu rơi vào cuối tuần/ngày lễ, hoặc giờ nghỉ trưa, hệ thống sẽ tự động dời thời gian sang **08:30** sáng ngày làm việc tiếp theo hoặc **13:30** chiều tương ứng trước khi phân rã quỹ giờ còn lại.

### 1.3. Lịch Nghỉ Lễ Việt Nam Cấu Hình Sẵn (2024 - 2026)
Hệ thống loại trừ hoàn toàn các ngày nghỉ cuối tuần (Thứ 7 & Chủ nhật) và các ngày nghỉ lễ hội lớn tại Việt Nam dưới đây:
*   **Năm 2024:** 01/01 (Tết Dương Lịch), 08/02 - 14/02 (Tết Nguyên Đán), 18/04 (Giổ Tổ Hùng Vương), 29/04 - 01/05 (Giải phóng miền Nam - Quốc tế Lao động), 02/09 - 03/09 (Quốc Khánh).
*   **Năm 2025:** 01/01, 27/01 - 31/01 (Tết Nguyên Đán), 07/04 (Giỗ Tổ), 30/04 - 02/05, 01/09 - 02/09 (Quốc Khánh).
*   **Năm 2026:** 01/01 - 02/01, 13/02 - 24/02 (Tết Bính Ngọ 12 ngày), 26/04 - 27/04, 30/04 - 03/05, 01/09 - 03/09 (Quốc Khánh).

---

## 2. MA TRẬN PHÂN LOẠI PHÂN KHÚC KHÁCH HÀNG

Phân khúc khách hàng được ánh xạ tự động từ dữ liệu CRM sang 3 nhóm chính:
1.  **PRIVATE:** Toàn bộ bản ghi chứa từ khóa "Private" hoặc "Khách hàng ưu tiên siêu giàu". Gồm 2 cột SLA phụ:
    *   *Official* (Đã định danh chính thức)
    *   *Pre-Private* (Tiềm năng)
2.  **AF (Affluent):** Gồm các phân khúc "AF", "Affluent", hoặc "Diamond" (loại trừ MAF). Gồm 3 cột SLA phụ:
    *   *Elite* (AF Elite)
    *   *Preferred* (AF Preferred / Platinum)
    *   *Special* (AF Special)
3.  **KHCN / Mass / MAF:** Toàn bộ nhóm khách hàng còn lại, hoặc có mác "MAF", "Mega", "Champion", "Titanium".

---

## 3. DANH MỤC CHI TIẾT RULE SLA E2E (END-TO-END)

Bộ quy tắc E2E áp dụng mốc SLA (đơn vị: ngày hoặc giờ) tùy thuộc vào phân khúc khách hàng theo thứ tự cột:
`[Private_Official, Private_Pre, AF_Elite, AF_Pref, AF_Spec, MAF, Mass]`

| STT | Tên Nghiệp Vụ / Rule | Mô tả Điều Kiện Khớp | SLA Chi Tiết Theo Phân Khúc (Private -> Mass) |
|---|---|---|---|
| 1 | Các yêu cầu liên quan đến khối tiểu thương (HHB) | Đơn vị xử lý/chịu trách nhiệm: `Khối Household` | `[4, 4, 4, 4, 4, 4, 4]` ngày |
| 2 | Cập nhật lại trạng thái giao dịch | Sub-category: `Cập nhật lại trạng thái giao dịch` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 3 | Cập nhật thông tin CC | Sub-category: `Cập nhật thông tin hỗ trợ tại Contact Center` | `[1h, 1h, 1, 1, 1, 2, 2]` (1h = 1 giờ làm việc, còn lại là ngày) |
| 4 | Change Information | Sub-category: `Change Information` | `[1, 1, 1, 1, 1, 1, 1]` ngày |
| 5 | Chưa được hoàn tiền cashback | Sub-category: `Chưa được hoàn tiền cashback` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 6 | Chưa nhận Biên nhận thế chấp | Sub-category: `Chưa nhận được Giấy biên nhận thế chấp` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 7 | Chưa nhận được Thẻ Pin | Sub-category: `Chưa nhận được PIN/Thẻ/...` | `[2, 3, 4, 4, 4, 5, 5]` ngày |
| 8 | Chuyển tiếp ĐVKD hỗ trợ KH | Sub-category: `Chuyển tiếp đơn vị kinh doanh hỗ trợ KH` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 9 | Chuyển tiếp nhu cầu mở POS | Sub-category: `Chuyển tiếp nhu cầu mở POS` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 10 | Rút tiền mặt từ TK/Sổ tiết kiệm | Sub-category: `Chuyển tiếp nhu cầu mở/ rút tiền ...` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 11 | Dừng/xử lý tiếp hồ sơ vay | Sub-category: `Chuyển tiếp yêu cầu dừng/xử lý hồ sơ vay` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 12 | Tất toán hợp đồng vay | Sub-category: `Chuyển tiếp yêu cầu tất toán hợp đồng vay` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 13 | Cơ cấu nợ Covid | Sub-category: `Cơ cấu nợ Covid` | `[5, 5, 5, 5, 5, 5, 5]` ngày |
| 14 | Cung cấp thông tin mã DAO | Sub-category: `Cung cấp thông tin mã DAO` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 15 | Đăng ý gói prime cho KHƯT | Sub-category: `Đăng ký gói prime cho KHƯT` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 16 | Đăng ký/Thay đổi/Hủy trích nợ tự động | Sub-category: `Đăng ký/Thay đổi/Hủy trích nợ tự động` | `[2h, 2h, 0.5, 0.5, 0.5, 1, 1]` ngày (0.5 ngày = 4 giờ làm việc) |
| 17 | Định danh AF FAMILY | Sub-category: `Định danh AF FAMILY` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 18 | Định danh KH Goldclub | Sub-category: `Định danh KH Ưu tiên` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 19 | Đối tác | Đơn vị chịu trách nhiệm: `Đối tác` | `[2, 2, 2, 1, 3, 3, 3]` ngày |
| 20 | ĐTGL (Điều tra gian lận) | APT Code: `ĐTGL`; Đơn vị: `Pháp chế - Rủi ro...` | **Không xét** (Tự động gán Target Date: 01/01/2100) |
| 21 | Follow | Tiêu đề chứa từ: `Follow`, `follow` | **Không xét** (Tự động gán Target Date: 01/01/2100) |
| 22 | Giải tỏa sổ tài khoản/tiết kiệm | Sub-category: `Giải tỏa sổ tài khoản/tiết kiệm` | `[2h, 2h, 1, 1, 1, 2, 2]` ngày |
| 23 | Giấy xác nhận số dư tài khoản | Sub-category: `Giấy xác nhận số dư tài khoản` | `[2h, 2h, 0.5, 0.5, 0.5, 1, 1]` ngày |
| 24 | Gọi lại KHƯT | Sub-category: `Gọi lại KHƯT` | `[1, 1, 1, 1, 1, 1, 1]` ngày |
| 25 | Gửi Email xử lý | Sub-category: `Gửi Email xử lý` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 26 | Gửi form tra soát không XN GD | Sub-category: `Gửi form tra soát không xác nhận giao dịch` | `[2h làm việc, 2h làm việc, 4h làm việc, 4h, 4h, 2, 2]` ngày |
| 27 | Gửi lại hợp đồng vay/Lịch trả nợ | Sub-category: `Gửi lại hợp đồng vay/Lịch trả nợ` | `[2h, 2h, 0.5, 0.5, 0.5, 1, 1]` ngày |
| 28 | Gửi mail cardrisk | Sub-category: `Gửi mail cardrisk` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 29 | Gửi mail đóng thẻ đã RTC | Sub-category: `Gửi mail đóng thẻ đã RTC` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 30 | Gửi mail IT | Sub-category: `Gửi mail IT` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 31 | Gửi sao kê hoàn tiền thẻ ghi nợ | Sub-category: `Gửi sao kê hoàn tiền thẻ ghi nợ` | `[2h, 2h, 0.5, 0.5, 0.5, 2, 2]` ngày |
| 32 | Gửi sao kê hoàn tiền Thẻ tín dụng | Sub-category: `Gửi sao kê hoàn tiền Thẻ tín dụng` | `[2h, 2h, 0.5, 0.5, 0.5, 1, 1]` ngày |
| 33 | Gửi sao kê Thẻ tín dụng | Sub-category: `Gửi sao kê Thẻ tín dụng` | `[2h, 2h, 0.5, 0.5, 0.5, 2, 2]` ngày |
| 34 | Gửi xác nhận đóng thẻ TD | Sub-category: `Gửi xác nhận đóng thẻ TD` | `[2h, 2h, 0.5, 0.5, 0.5, 1, 1]` ngày |
| 35 | Gửi Xác nhận tất toán khoản vay | Sub-category: `Gửi Xác nhận tất toán khoản vay` | `[2h, 2h, 0.5, 0.5, 0.5, 1, 1]` ngày |
| 36 | Gửi xác nhận thông tin khoản vay | Sub-category: `Gửi xác nhận thông tin khoản vay` | `[2h, 2h, 0.5, 0.5, 0.5, 1, 1]` ngày |
| 37 | Gửi xác nhận thông tin thẻ tín dụng | Sub-category: `Gửi xác nhận thông tin thẻ TD` | `[2h, 2h, 0.5, 0.5, 0.5, 1, 1]` ngày |
| 38 | Hỗ trợ gửi lại sổ phụ | Sub-category: `Hỗ trợ gửi lại sổ phụ` | `[2h, 2h, 0.5, 0.5, 0.5, 1, 1]` ngày |
| 39 | Hỗ trợ kiểm tra GD từ nước ngoài | Sub-category: `Hỗ trợ kiểm tra GD nhận tiền từ nước ngoài` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 40 | Hỗ trợ kiểm tra mã trace | Sub-category: `Hỗ trợ kiểm tra mã trace` | `[1, 1, 1, 1, 1, 1, 1]` ngày |
| 41 | Kiểm tra CK đi/đến | Sub-category: `Hỗ trợ kiểm tra xử lý món chuyển tiền đi/đến` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 42 | Hoàn tiền trình CEO | APT Code: `Hoàn tiền - TGĐ` | `[3, 3, 4, 4, 4, 7, 7]` ngày |
| 43 | Hoàn tiền trình GĐK / PGĐK | APT Code: `Hoàn tiền - GĐK` / `Hoàn tiền - PGĐK` | `[2, 2, 2, 2, 2, 3, 3]` ngày |
| 44 | Hủy Family Banking | Sub-category: `Hủy Family Banking` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 45 | Hủy nhắc nợ qua Zalo | Sub-category: `Hủy nhắc nợ qua Zalo` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 46 | Hủy yêu cầu tra soát | Sub-category: `Hủy yêu cầu tra soát` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 47 | Issue | Tiêu đề chứa từ: `Issue`, `issue` | **Không xét** (Tự động gán Target Date: 01/01/2100) |
| 48 | Cấp đổi giấy biên nhận thế chấp | Sub-category: `KHCN - Cấp đổi giấy biên nhận thế chấp` | `[0.5, 0.5, 0.5, 0.5, 0.5, 2, 2]` ngày |
| 49 | Không nhận được SMS biến động số dư | Sub-category: `Không nhận được tin nhắn biến động số dư tài khoản` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 50 | KSTT (Kiểm soát tuân thủ) | APT Code: `KSTT`, Đơn vị: `Kiểm tra tuân thủ...` | **Không xét** (Tự động gán Target Date: 01/01/2100) |
| 51 | Phong tỏa tài khoản/sổ tiết kiệm | Sub-category: `Phong tỏa tài khoản/sổ tiết kiệm` | `[2h, 2h, 1, 1, 1, 2, 2]` ngày |
| 52 | Thay đổi CN định danh KHUT | Sub-category: `Thay đổi CN định danh KHUT` | `[3, 3, 3, 3, 3, 3, 3]` ngày |
| 53 | Thay đổi địa chỉ nhận thẻ | Sub-category: `Thay đổi địa chỉ nhận thẻ` | `[3, 3, 3, 3, 3, 4, 4]` ngày |
| 54 | Tra soát GD ck 24/7 NAPAS - ĐC nội dung | Sub-category: `Tra soát GD ck nhanh 24/7 NAPAS – Điều chỉnh nội dung` | `[2, 2, 3, 3, 3, 3, 3]` ngày |
| 55 | Tra soát GD nộp tiền tại CDM | Sub-category: `Tra soát GD nộp tiền tại CDM` | `[2, 2, 2, 2, 3, 3, 3]` ngày |
| 56 | Tra soát chuyển khoản ACH | Sub-category: `Tra soát chuyển khoản ACH` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 57 | Tra soát CK nội bộ - PTT | Sub-category: `Tra soát chuyển khoản nội bộ- PTT` | `[2, 2, 2, 2, 2, 2, 2]` ngày |
| 58 | Tra soát CK nội bộ - PTT - NEO | Sub-category: `Tra soát chuyển khoản nội bộ- PTT - NEO` | `[1, 1, 1, 1, 1, 1, 1]` ngày |
| 59 | Tra soát CK nội bộ - CRU | Sub-category: `Tra soát chuyển khoản nội bộ - CRU` | `[5, 5, 5, 5, 5, 5, 5]` ngày |
| 60 | Tra soát CK nội bộ | Sub-category: `Tra soát chuyển khoản nội bộ` | `[5, 5, 5, 5, 5, 5, 5]` ngày |
| 61 | Tra soát GD CK liên ngân hàng - PTT-NEO | Sub-category: `Tra soát giao dịch... liên ngân hàng- PTT - NEO` | `[1, 1, 1, 1, 1, 1, 1]` ngày |
| 62 | Tra soát GD CK liên ngân hàng | Sub-category: `Tra soát giao dịch chuyển khoản liên ngân hàng` | `[2, 2, 2, 2, 2, 2, 2]` ngày |
| 63 | Tra soát giao dịch chuyển tiền VNPost | Sub-category: `Tra soát giao dịch chuyển tiền VNPost` | `[2, 2, 2, 2, 2, 2, 2]` ngày |
| 64 | Tra soát I2B - Billing/ TOP UP - PTT | Sub-category: `Tra soát I2B - Billing/ TOP UP - PTT` | `[3, 3, 3, 3, 3, 3, 3]` ngày |
| 65 | Tra soát I2B - Billing/ TOP UP - PTT-NEO | Sub-category: `Tra soát I2B - Billing/ TOP UP - PTT - NEO` | `[2, 2, 2, 2, 2, 2, 2]` ngày |
| 66 | Tra soát I2B - Billing/ TOP UP - DST | Sub-category: `Tra soát I2B - Billing/ TOP UP - DST` | `[3, 3, 3, 3, 3, 3, 3]` ngày |
| 67 | Tra soát I2B - Billing/ TOP UP - DST-NEO | Sub-category: `Tra soát I2B - Billing/ TOP UP - DST-NEO` | `[2, 2, 2, 2, 2, 2, 2]` ngày |
| 68 | Tra soát CK nội bộ sang thẻ TD | Sub-category: `Tra soát I2B - chuyển khoản nội bộ sang thẻ TD` | `[2, 2, 3, 3, 3, 3, 3]` ngày |
| 69 | Tra soát PTT 24/7 lần 1 (Truy vấn) | Sub-category: `Tra soát GD ck nhanh 24/7 NAPAS – Truy vấn trạng thái GD` | `[4, 4, 4, 4, 4, 4, 4]` ngày |
| 70 | Tra soát PTT 24/7 lần 2 (Báo có) | Sub-category: `Tra soát GD ck nhanh 24/7 NAPAS – YC xác nhận báo có` | `[5, 5, 5, 5, 5, 5, 5]` ngày |
| 71 | Tra soát quá hạn SLA – CRU | Sub-category: `Tra soát quá hạn SLA – CRU` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 72 | Tra soát quá hạn SLA – SSP | Sub-category: `Tra soát quá hạn SLA – SSP` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 73 | Tra soát thẻ nội địa - ATM ngân hàng khác | Sub-category: `Tra soát thẻ nội địa - ATM ngân hàng khác` | `[7, 7, 7, 7, 7, 7, 7]` ngày |
| 74 | Tra soát thẻ nội địa - ATM VPbank | Sub-category: `Tra soát GD rút tiền tại ATM/CDM... – Thẻ nội địa` | `[3, 3, 3, 3, 4, 4, 4]` ngày |
| 75 | Tra soát thẻ nội địa – ECOM | Sub-category: `Tra soát thẻ nội địa – ECOM` | `[9, 9, 9, 9, 9, 9, 9]` ngày |
| 76 | Tra soát thẻ nội địa – POS lần 1 | Sub-category: `Tra soát thẻ nội địa – POS lần 1` | `[12, 12, 12, 12, 12, 12, 12]` ngày |
| 77 | Tra soát thẻ nội địa – POS lần 2 | Sub-category: `Tra soát thẻ nội địa – POS lần 2` | `[7, 7, 7, 7, 7, 7, 7]` ngày |
| 78 | Tra soát thẻ quốc tế - ATM ngân hàng khác | Sub-category: `Tra soát thẻ quốc tế - ATM ngân hàng khác` | `[47, 47, 47, 47, 47, 47, 47]` ngày |
| 79 | Tra soát thẻ quốc tế - ATM VPBank | Sub-category: `Tra soát GD rút tiền tại ATM/CDM... – Thẻ quốc tế` | `[3, 3, 3, 3, 4, 4, 4]` ngày |
| 80 | Tra soát thẻ quốc tế - ECOM / POS | Sub-category: `Tra soát thẻ quốc tế- Ecom/POS NH khác` | `[47, 47, 47, 47, 47, 47, 47]` ngày |
| 81 | Tra soát thẻ quốc tế - lần 2 | Sub-category: `Tra soát thẻ quốc tế - lần 2` | `[47, 47, 47, 47, 47, 47, 47]` ngày |
| 82 | Tra soát thẻ quốc tế - trục lợi Facebook | Sub-category: `Tra soát thẻ quốc tế - trục lợi Facebook` | `[47, 47, 47, 47, 47, 47, 47]` ngày |
| 83 | Tra soát thẻ VPB tại ĐVCNT Ecom/POS VPB | Sub-category: `Tra soát thẻ VPB tại ĐVCNT Ecom/POS VPBank` | `[47, 47, 47, 47, 47, 47, 47]` ngày |
| 84 | Trao đổi khoản vay | Sub-category: `Trao đổi khoản vay` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 85 | Trao đổi thông tin bảo hiểm TTD | Sub-category: `Trao đổi thông tin bảo hiểm TTD` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 86 | Trình CIC | APT Code: `CIC`, Tiêu đề: `CIC` | **Không xét** (Tự động gán Target Date: 01/01/2100) |
| 87 | TST quốc tế - POS ECOM VPBANK | Sub-category: `TST quốc tế - POS ECOM VPBANK` | `[47, 47, 47, 47, 47, 47, 47]` ngày |
| 88 | Từ chối nhận quảng cáo | Sub-category: `Từ từ chối... / Từ chối nhận quảng cáo` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 89 | Hết quá hạn tại thời điểm hiện tại | Sub-category: `Xác nhận khoản vay hết quá hạn...` | `[0.5, 0.5, 0.5, 0.5, 0.5, 1, 1]` ngày (0.5 ngày = 4 giờ làm việc) |
| 90 | Xác nhận thông tin khoản tiền gửi | Sub-category: `Xác nhận thông tin khoản tiền gửi` | `[2h, 2h, 0.5, 0.5, 0.5, 1, 1]` ngày |
| 91 | Xác nhận thông tin tài khoản | Sub-category: `Xác nhận thông tin tài khoản` | `[2h, 2h, 0.5, 0.5, 0.5, 1, 1]` ngày |
| 92 | Yêu cầu gửi công văn thu hồi | Sub-category: `Tra soát GD ck nhanh 24/7 NAPAS – Hỗ trợ nhờ thu` | `[2, 2, 3, 3, 3, 3, 3]` ngày |
| 93 | Các case có source là Email (Mặc định Email)| Nguồn tạo: `Email / Gmail / Mail` | `[1, 1, 1, 1, 1, 2, 2]` ngày (Áp dụng cho các subcategory ngoài danh sách đặc thù nhận qua Email) |
| 94 | Đóng thẻ tín dụng không TSĐB | Sub-category: `Đóng thẻ tín dụng không TSĐB` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 95 | KH có nhu cầu đóng thẻ | Sub-category: `KH có nhu cầu đóng thẻ` | `[1, 1, 1, 1, 1, 2, 2]` ngày |
| 96 | **Các nghiệp vụ khác (Catch-all)** | Khớp tất cả các ca còn lại không thuộc rule trên | `[1, 1, 1, 1, 1, 2, 2]` ngày |

---

## 4. CHI TIẾT CÁC QUY TRÌNH (PROCESS TYPE) PHỤ THUỘC

### 4.1. SLA Process - 247 Tuyến 1
SLA căn cứ vào ma trận Scope định nghĩa tại Salesforce và phân hạng Khách hàng:

| Phạm vi xử lý (Scope) | Segment PRIVATE | Segment AF | Segment Mass/KHCN/MAF |
|---|---|---|---|
| **Xử lý yêu cầu toàn phần** | 4 giờ làm việc | 4 giờ làm việc | 8 giờ làm việc (1 ngày) |
| **Xử lý yêu cầu 1 phần** | 16 giờ làm việc (2 ngày) | 16 giờ làm việc (2 ngày) | 24 giờ làm việc (3 ngày) |
| **Xử lý ngoài phạm vi** | 2 giờ làm việc | 2 giờ làm việc | 4 giờ làm việc |
| **Yêu cầu ngoại lệ** | 8 giờ làm việc (1 ngày) | 8 giờ làm việc (1 ngày) | 16 giờ làm việc (2 ngày) |

### 4.2. SLA Process - 247 Tuyến 2
*   **Rule Ưu tiên 4h:** Áp dụng SLA cố định **4 giờ làm việc** cho 32 Sub-category sau (Ví dụ một số sub phổ biến):
    *   *Tra soát GD nộp tiền tại CDM*
    *   *Tra soát I2B - chuyển khoản nội bộ sang thẻ TD*
    *   *Tra soát GD ck nhanh 24/7 NAPAS - Truy vấn trạng thái GD*
    *   *Tra soát quá hạn SLA - CRU / SSP*
    *   *Tra soát thẻ nội địa - ATM ngân hàng khác / ECOM / POS*
    *   *Các phàn nàn/khiếu nại:* Nhắc nợ sai chủ HĐ, Phàn nàn thái độ nhân viên thu hồi nợ, Tư vấn thông tin không đầy đủ/chính xác, Thực hiện không đúng yêu cầu KH...
*   **Fallback:** Bản ghi không thuộc danh mục 4h ưu tiên sẽ **quy chiếu trực tiếp về mức SLA của SLA E2E** tương ứng. Nếu E2E không có rule sẽ báo chưa có rule.

### 4.3. SLA Process - TTT Tra soát
Mapping theo bảng ngày đơn giản đối với cột Sub-category CRM (không phân biệt phân khúc):
*   *Tra soát GD rút tiền ATM VPBank (nội địa/quốc tế):* **3 ngày làm việc**
*   *Tra soát thẻ nội địa - ATM ngân hàng khác / POS lần 2:* **6 ngày làm việc**
*   *Tra soát thẻ nội địa - POS lần 1:* **11 ngày làm việc**
*   *Tra soát thẻ nội địa - ECOM:* **8 ngày làm việc**
*   *Tra soát thẻ quốc tế - ATM ngân hàng khác / Ecom/POS NH khác / Facebook / lần 2:* **46 ngày làm việc**
*   *Tra soát GD nộp tiền tại CDM / Điều chỉnh nội dung / Hỗ trợ nhờ thu:* **2 ngày làm việc**
*   *Tra soát GD ck nhanh 24/7 NAPAS - Truy vấn trạng thái GD:* **3 ngày làm việc**
*   *Tra soát GD ck nhanh 24/7 NAPAS - YC xác nhận báo có:* **4 ngày làm việc**
*   *Tra soát I2B - Billing/ TOP UP - TTT / DST:* **8 ngày làm việc**

### 4.4. SLA Process - RCC
*   **Phân khúc AF hoặc Private:** SLA cố định **5 giờ làm việc**.
*   **Phân khúc Mass/KHCN/MAF:** SLA cố định **10 giờ làm việc**.

### 4.5. SLA Process - TTT Phát hành
Chỉ áp dụng cho các Sub-category liên quan đến giao thẻ/pin (`chua nhan duoc pin`, `chua nhan duoc the`, `chua nhan duoc pin the`, `thay doi dia chi nhan the`):
*   **Phân khúc AF hoặc Private:** SLA **3 ngày làm việc**.
*   **Phân khúc Mass/KHCN/MAF:** SLA **4 ngày làm việc**.
*   *Các Sub-category khác:* Trả kết quả chưa xác định.

### 4.6. SLA Process - TTThe Đối soát
*   *Sub-category đặc biệt:*
    *   `Tra soát I2B - Billing/ TOP UP - DST-NEO` (neo): **2 ngày làm việc** (Toàn bộ phân khúc).
    *   `Tra soát I2B - Billing/ TOP UP - DST` (không neo): **3 ngày làm việc** (Toàn bộ phân khúc).
*   *Sub-category thuộc danh mục 6 giờ* (VD: tư vấn trả góp, phát hành lại thẻ/pin, tăng giảm hạn mức, hoàn phí sms, mail xử lý...):
    *   **Nếu là AF hoặc Private:** SLA **6 giờ làm việc**.
    *   **Nếu khác:** SLA mặc định **14 giờ làm việc**.
*   *Các sub-category thông thường khác:* SLA **14 giờ làm việc** (cho mọi phân khúc).

### 4.7. SLA Process PTT Ebanking
Cố định hạn xử lý theo ngày cho tất cả phân khúc:
*   *Tra soát CK nội bộ PTT (NEO hoặc thường):* **1 ngày làm việc**
*   *Tra soát CK liên ngân hàng PTT NEO:* **1 ngày làm việc**
*   *Tra soát I2B Billing/Topup PTT (NEO hoặc thường):* **2 ngày làm việc**

### 4.8. SLA Process - PTT 247
Áp dụng đối với các giao dịch NAPAS 24/7:
*   *Điều chỉnh nội dung / Hỗ trợ nhờ thu:* **2 ngày làm việc**
*   *Truy vấn trạng thái giao dịch:* **3 ngày làm việc**
*   *Xác nhận báo có / Yêu cầu báo có:* **4 ngày làm việc**

---

*Hết bản đặc tả luật tính toán SLA.*
