export interface SLARule {
  name: string;
  slas: (number | string)[]; // [Private_Official, Private_Pre, AF_Elite, AF_Pref, AF_Spec, MAF, Mass]
  conditions: {
    subCategory?: string[]; // Includes one of these
    processingUnit?: string[];
    responsibleUnit?: string[];
    reason?: string[];
    title?: string[];
    aptCode?: string[];
    source?: string[];
  }
}

export const SLA_E2E_RULES: SLARule[] = [
  {
    name: "Các yêu cầu liên quan đến khối tiểu thương (HHB)",
    slas: [4, 4, 4, 4, 4, 4, 4],
    conditions: { processingUnit: ["Khối Household"], responsibleUnit: ["Khối Household"] } // OR match?! The file says "Or: Khối Household"
  },
  {
    name: "Cập nhật lại trạng thái giao dịch",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Cập nhật lại trạng thái giao dịch"] }
  },
  {
    name: "Cập nhật thông tin hỗ trợ tại Contact Center",
    slas: ["1 giờ", "1 giờ", 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Cập nhật thông tin hỗ trợ tại Contact Center"] }
  },
  {
    name: "Change Information",
    slas: [1, 1, 1, 1, 1, 1, 1],
    conditions: { subCategory: ["Change Information"] }
  },
  {
    name: "Chưa được hoàn tiền cashback",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Chưa được hoàn tiền cashback"] }
  },
  {
    name: "Chưa nhận được Giấy biên nhận thế chấp",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Chưa nhận được Giấy biên nhận thế chấp"] }
  },
  {
    name: "Chưa nhận được Thẻ Pin",
    slas: [2, 3, 4, 4, 4, 5, 5],
    conditions: { subCategory: ["Chưa nhận được Thẻ & Pin", "Chưa nhận được PIN", "Chưa nhận được THE", "Chưa nhận được Thẻ"] }
  },
  {
    name: "Chuyển tiếp đơn vị kinh doanh hỗ trợ KH",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Chuyển tiếp đơn vị kinh doanh hỗ trợ KH"] }
  },
  {
    name: "Chuyển tiếp nhu cầu mở POS",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Chuyển tiếp nhu cầu mở POS"] }
  },
  {
    name: "Chuyển tiếp nhu cầu mở/ rút tiền mặt từ TK/sổ tiết kiệm",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Chuyển tiếp nhu cầu mở/ rút tiền mặt", "Chuyển tiếp nhu cầu mở/ rút tiền mặt từ TK/sổ tiết kiệm"] }
  },
  {
    name: "Chuyển tiếp yêu cầu dừng/xử lý tiếp hồ sơ vay",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Chuyển tiếp yêu cầu dừng/xử lý tiếp hồ sơ vay"] }
  },
  {
    name: "Chuyển tiếp yêu cầu tất toán hợp đồng vay",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Chuyển tiếp yêu cầu tất toán hợp đồng vay"] }
  },
  {
    name: "Cơ cấu nợ Covid",
    slas: [5, 5, 5, 5, 5, 5, 5],
    conditions: { subCategory: ["Cơ cấu nợ Covid"] }
  },
  {
    name: "Cung cấp thông tin mã DAO",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Cung cấp thông tin mã DAO"] }
  },
  {
    name: "Đăng ký gói prime cho KHƯT",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Đăng ký gói prime cho KHƯT"] }
  },
  {
    name: "Đăng ký/Thay đổi/Hủy trích nợ tự động",
    slas: ["2 giờ", "2 giờ", 0.5, 0.5, 0.5, 1, 1],
    conditions: { subCategory: ["Đăng ký/Thay đổi trích nợ tự động", "Hủy trích nợ tự động"] }
  },
  {
    name: "Định danh AF FAMILY",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Định danh AF FAMILY"] }
  },
  {
    name: "Định danh KH Goldclub",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Định danh KH Ưu tiên"] }
  },
  {
    name: "Đối tác",
    slas: [2, 2, 2, 1, 3, 3, 3], // Wait, missing one? Private=2, 2. AF=2,1,3. MAF=3, Mass=? (Suppose 3 based on 'Đối tác,2,2,2,1,3,3,,,,,') Wait, 2 2 2 1 3 3? That's 6 columns. 7th is empty. Let's assume 3.
    conditions: { responsibleUnit: ["Đối tác"] } // Loại trừ tra soát handled in logic
  },
  {
    name: "ĐTGL",
    slas: ["Không xét", "Không xét", "Không xét", "Không xét", "Không xét", "Không xét", "Không xét"],
    conditions: { processingUnit: ["Pháp chế - Rủi ro - Phòng chống gian lận"], responsibleUnit: ["Pháp chế - Rủi ro - Phòng chống gian lận"], aptCode: ["ĐTGL"] }
  },
  {
    name: "Follow",
    slas: ["Không xét", "Không xét", "Không xét", "Không xét", "Không xét", "Không xét", "Không xét"],
    conditions: { title: ["Follow", "follow"] }
  },
  {
    name: "Giải tỏa sổ tài khoản/tiết kiệm",
    slas: ["2 giờ", "2 giờ", 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Giải tỏa sổ tài khoản/tiết kiệm"] }
  },
  {
    name: "Giấy xác nhận số dư tài khoản",
    slas: ["2 giờ", "2 giờ", 0.5, 0.5, 0.5, 1, 1],
    conditions: { subCategory: ["Giấy xác nhận số dư tài khoản"] }
  },
  {
    name: "Gọi lại KHƯT",
    slas: [1, 1, 1, 1, 1, 1, 1],
    conditions: { subCategory: ["Gọi lại KHƯT"] }
  },
  {
    name: "Gửi Email xử lý",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Gửi Email xử lý"] }
  },
  {
    name: "Gửi form tra soát không xác nhận giao dịch",
    slas: ["2 giờ", "2 giờ", 0.5, 0.5, 0.5, 2, 2],
    conditions: { subCategory: ["Gửi form tra soát không xác nhận giao dịch"] }
  },
  {
    name: "Gửi lại hợp đồng vay/Lịch trả nợ",
    slas: ["2 giờ", "2 giờ", 0.5, 0.5, 0.5, 1, 1],
    conditions: { subCategory: ["Gửi lại hợp đồng vay/Lịch trả nợ"] }
  },
  {
    name: "Gửi mail cardrisk",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Gửi mail cardrisk"] }
  },
  {
    name: "Gửi mail đóng thẻ đã RTC",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Gửi mail đóng thẻ đã RTC"] }
  },
  {
    name: "Gửi mail IT",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Gửi mail IT"] }
  },
  {
    name: "Gửi sao kê hoàn tiền thẻ ghi nợ",
    slas: ["2 giờ", "2 giờ", 0.5, 0.5, 0.5, 2, 2],
    conditions: { subCategory: ["Gửi sao kê hoàn tiền thẻ ghi nợ"] }
  },
  {
    name: "Gửi sao kê hoàn tiền Thẻ tín dụng",
    slas: ["2 giờ", "2 giờ", 0.5, 0.5, 0.5, 1, 1],
    conditions: { subCategory: ["Gửi sao kê hoàn tiền Thẻ tín dụng"] }
  },
  {
    name: "Gửi sao kê Thẻ tín dụng",
    slas: ["2 giờ", "2 giờ", 0.5, 0.5, 0.5, 2, 2],
    conditions: { subCategory: ["Gửi sao kê Thẻ tín dụng"] }
  },
  {
    name: "Gửi xác nhận đóng thẻ TD",
    slas: ["2 giờ", "2 giờ", 0.5, 0.5, 0.5, 1, 1],
    conditions: { subCategory: ["Gửi xác nhận đóng thẻ TD"] }
  },
  {
    name: "Gửi Xác nhận tất toán khoản vay",
    slas: ["2 giờ", "2 giờ", 0.5, 0.5, 0.5, 1, 1],
    conditions: { subCategory: ["Gửi Xác nhận tất toán khoản vay"] }
  },
  {
    name: "Gửi xác nhận thông tin khoản vay",
    slas: ["2 giờ", "2 giờ", 0.5, 0.5, 0.5, 1, 1],
    conditions: { subCategory: ["Gửi xác nhận thông tin khoản vay"] }
  },
  {
    name: "Gửi xác nhận thông tin thẻ tín dụng",
    slas: ["2 giờ", "2 giờ", 0.5, 0.5, 0.5, 1, 1],
    conditions: { subCategory: ["Gửi xác nhận thông tin thẻ TD"] }
  },
  {
    name: "Hỗ trợ gửi lại sổ phụ",
    slas: ["2 giờ", "2 giờ", 0.5, 0.5, 0.5, 1, 1],
    conditions: { subCategory: ["Hỗ trợ gửi lại sổ phụ"] }
  },
  {
    name: "Hỗ trợ kiểm tra GD nhận tiền từ nước ngoài",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Hỗ trợ kiểm tra GD nhận tiền từ nước ngoài"] }
  },
  {
    name: "Hỗ trợ kiểm tra mã trace",
    slas: [1, 1, 1, 1, 1, 1, 1],
    conditions: { subCategory: ["Hỗ trợ kiểm tra mã trace"] }
  },
  {
    name: "Hỗ trợ kiểm tra xử lý món chuyển tiền đi/đến",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Hỗ trợ kiểm tra xử lý món chuyển tiền đi/đến"] }
  },
  {
    name: "Hoàn tiền trình CEO",
    slas: [3, 3, 4, 4, 4, 7, 7],
    conditions: { aptCode: ["Hoàn tiền - TGĐ"] }
  },
  {
    name: "Hoàn tiền trình GĐK/ P.GĐK",
    slas: [2, 2, 2, 2, 2, 3, 3], // assumed Mass = 3
    conditions: { aptCode: ["Hoàn tiền - GĐK", "Hoàn tiền - PGĐK"] }
  },
  {
    name: "Hủy Family Banking",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Hủy Family Banking"] }
  },
  {
    name: "Hủy nhắc nợ qua Zalo",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Hủy nhắc nợ qua Zalo"] }
  },
  {
    name: "Hủy yêu cầu tra soát",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Hủy yêu cầu tra soát"] }
  },
  {
    name: "Issue",
    slas: ["Không xét", "Không xét", "Không xét", "Không xét", "Không xét", "Không xét", "Không xét"],
    conditions: { title: ["Issue", "issue"] }
  },
  {
    name: "KHCN - Cấp đổi giấy biên nhận thế chấp",
    slas: [0.5, 0.5, 0.5, 0.5, 0.5, 2, 2],
    conditions: { subCategory: ["KHCN - Cấp đổi giấy biên nhận thế chấp"] }
  },
  {
    name: "Không nhận được tin nhắn biến động số dư tài khoản",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Không nhận được tin nhắn biến động số dư tài khoản"] }
  },
  {
    name: "KSTT",
    slas: ["Không xét", "Không xét", "Không xét", "Không xét", "Không xét", "Không xét", "Không xét"],
    conditions: { processingUnit: ["Kiểm tra tuân thủ", "Phòng chống rửa tiền"], responsibleUnit: ["Kiểm tra tuân thủ", "Phòng chống rửa tiền"], aptCode: ["KSTT"] }
  },
  {
    name: "Phong tỏa tài khoản/sổ tiết kiệm",
    slas: ["2 giờ", "2 giờ", 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Phong tỏa tài khoản/sổ tiết kiệm"] }
  },
  {
    name: "Thay đổi CN định danh KHUT",
    slas: [3, 3, 3, 3, 3, 3, 3], // fallback MAF Mass = 3
    conditions: { subCategory: ["Thay đổi CN định danh KHUT"] }
  },
  {
    name: "Thay đổi địa chỉ nhận thẻ",
    slas: [3, 3, 3, 3, 3, 4, 4],
    conditions: { subCategory: ["Thay đổi địa chỉ nhận thẻ"] }
  },
  {
    name: "Thay đổi nội dung chuyển khoản",
    slas: [2, 2, 3, 3, 3, 3, 3],
    conditions: { subCategory: ["Tra soát GD ck nhanh 24/7 NAPAS – Điều chỉnh nội dung"] }
  },
  {
    name: "Tra soát - CDM",
    slas: [2, 2, 2, 2, 3, 3, 3],
    conditions: { subCategory: ["Tra soát GD nộp tiền tại CDM"] }
  },
  {
    name: "Tra soát chuyển khoản ACH",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Tra soát chuyển khoản ACH"] }
  },
  {
    name: "Tra soát chuyển khoản nội bộ",
    slas: [5, 5, 5, 5, 5, 5, 5],
    conditions: { subCategory: ["Tra soát chuyển khoản nội bộ"] }
  },
  {
    name: "Tra soát giao dịch chuyển khoản liên ngân hàng",
    slas: [2, 2, 2, 2, 2, 2, 2],
    conditions: { subCategory: ["Tra soát giao dịch chuyển khoản liên ngân hàng"] }
  },
  {
    name: "Tra soát giao dịch chuyển tiền VNPost",
    slas: [2, 2, 2, 2, 2, 2, 2],
    conditions: { subCategory: ["Tra soát giao dịch chuyển tiền VNPost"] }
  },
  {
    name: "Tra soát I2B - Billing/ TOP UP - PTT",
    slas: [9, 9, 9, 9, 9, 9, 9],
    conditions: { subCategory: ["Tra soát I2B - Billing/ TOP UP - PTT"] }
  },
  {
    name: "Tra soát I2B - chuyển khoản nội bộ sang thẻ TD",
    slas: [2, 2, 3, 3, 3, 3, 3],
    conditions: { subCategory: ["Tra soát I2B - chuyển khoản nội bộ sang thẻ TD"] }
  },
  {
    name: "Tra soát I2B ATM - Chuyển khoản 24/7 lần 1",
    slas: [4, 4, 4, 4, 4, 4, 4],
    conditions: { subCategory: ["Tra soát GD ck nhanh 24/7 NAPAS – Truy vấn trạng thái GD"] }
  },
  {
    name: "Tra soát I2B ATM - Chuyển khoản 24/7 lần 2",
    slas: [5, 5, 5, 5, 5, 5, 5],
    conditions: { subCategory: ["Tra soát GD ck nhanh 24/7 NAPAS – YC xác nhận báo có"] }
  },
  {
    name: "Tra soát quá hạn SLA – CRU",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Tra soát quá hạn SLA – CRU"] }
  },
  {
    name: "Tra soát quá hạn SLA – SSP",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Tra soát quá hạn SLA – SSP"] }
  },
  {
    name: "Tra soát thẻ nội địa - ATM ngân hàng khác",
    slas: [7, 7, 7, 7, 7, 7, 7],
    conditions: { subCategory: ["Tra soát thẻ nội địa - ATM ngân hàng khác"] }
  },
  {
    name: "Tra soát thẻ nội địa - ATM VPbank",
    slas: [3, 3, 3, 3, 4, 4, 4],
    conditions: { subCategory: ["Tra soát GD rút tiền tại ATM/CDM VPBank – Thẻ nội địa"] }
  },
  {
    name: "Tra soát thẻ nội địa – ECOM",
    slas: [9, 9, 9, 9, 9, 9, 9],
    conditions: { subCategory: ["Tra soát thẻ nội địa – ECOM"] }
  },
  {
    name: "Tra soát thẻ nội địa – POS lần 1",
    slas: [12, 12, 12, 12, 12, 12, 12],
    conditions: { subCategory: ["Tra soát thẻ nội địa – POS lần 1"] }
  },
  {
    name: "Tra soát thẻ nội địa – POS lần 2",
    slas: [7, 7, 7, 7, 7, 7, 7],
    conditions: { subCategory: ["Tra soát thẻ nội địa – POS lần 2"] }
  },
  {
    name: "Tra soát thẻ quốc tế - ATM ngân hàng khác",
    slas: [47, 47, 47, 47, 47, 47, 47],
    conditions: { subCategory: ["Tra soát thẻ quốc tế - ATM ngân hàng khác"] }
  },
  {
    name: "Tra soát thẻ quốc tế - ATM VPBank",
    slas: [3, 3, 3, 3, 4, 4, 4],
    conditions: { subCategory: ["Tra soát GD rút tiền tại ATM/CDM VPBank – Thẻ quốc tế"] }
  },
  {
    name: "Tra soát thẻ quốc tế - ECOM",
    slas: [47, 47, 47, 47, 47, 47, 47],
    conditions: { subCategory: ["Tra soát thẻ quốc tế- Ecom/POS NH khác"] }
  },
  {
    name: "Tra soát thẻ quốc tế - lần 2",
    slas: [47, 47, 47, 47, 47, 47, 47],
    conditions: { subCategory: ["Tra soát thẻ quốc tế - lần 2"] }
  },
  {
    name: "Tra soát thẻ quốc tế - POS",
    slas: [47, 47, 47, 47, 47, 47, 47],
    conditions: { subCategory: ["Tra soát thẻ quốc tế- Ecom/POS NH khác"] }
  },
  {
    name: "Tra soát thẻ quốc tế - trục lợi Facebook",
    slas: [47, 47, 47, 47, 47, 47, 47],
    conditions: { subCategory: ["Tra soát thẻ quốc tế - trục lợi Facebook"] }
  },
  {
    name: "Trao đổi khoản vay",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Trao đổi khoản vay"] }
  },
  {
    name: "Trao đổi thông tin bảo hiểm TTD",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Trao đổi thông tin bảo hiểm TTD"] }
  },
  {
    name: "Trình CIC",
    slas: ["Không xét", "Không xét", "Không xét", "Không xét", "Không xét", "Không xét", "Không xét"],
    conditions: { aptCode: ["CIC"], title: ["CIC"] } // The prompt says APT code OR Title OR reason? -> It says Title: "CIC", Nguồn tạo: "Or CIC" -> let's map it roughly
  },
  {
    name: "TST quốc tế - POS ECOM VPBANK",
    slas: [47, 47, 47, 47, 47, 47, 47],
    conditions: { subCategory: ["TST quốc tế - POS ECOM VPBANK"] }
  },
  {
    name: "Từ chối nhận quảng cáo",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Hủy từ chối nhận quảng cáo", "Từ chối nhận quảng cáo"] }
  },
  {
    name: "Xác nhận khoản vay hết quá hạn tại thời điểm hiện tại",
    slas: [0.5, 0.5, 0.5, 0.5, 0.5, 1, 1],
    conditions: { subCategory: ["Xác nhận khoản vay hết quá hạn tại thời điểm hiện tại"] }
  },
  {
    name: "Xác nhận thông tin khoản tiền gửi",
    slas: ["2 giờ", "2 giờ", 0.5, 0.5, 0.5, 1, 1],
    conditions: { subCategory: ["Xác nhận thông tin khoản tiền gửi"] }
  },
  {
    name: "Xác nhận thông tin tài khoản",
    slas: ["2 giờ", "2 giờ", 0.5, 0.5, 0.5, 1, 1],
    conditions: { subCategory: ["Xác nhận thông tin tài khoản"] }
  },
  {
    name: "Yêu cầu gửi công văn thu hồi",
    slas: [2, 2, 3, 3, 3, 3, 3],
    conditions: { subCategory: ["Tra soát GD ck nhanh 24/7 NAPAS – Hỗ trợ nhờ thu"] }
  },

  // DEFAULT MATCHES
  {
    name: "Các case có source là Email",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { source: ["Email", "email"] }
  },
  {
    name: "KH có nhu cầu đóng thẻ",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["KH có nhu cầu đóng thẻ"] }
  },
  {
    name: "Đóng thẻ tín dụng không TSĐB",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: { subCategory: ["Đóng thẻ tín dụng không TSĐB"] }
  },
  {
    name: "Các nghiệp vụ khác",
    slas: [1, 1, 1, 1, 1, 2, 2],
    conditions: {} // Matches everything else
  }
];
