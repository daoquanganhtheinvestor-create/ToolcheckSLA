import React, { useState } from 'react';
import { BookOpen, Search, Download, CheckCircle, ShieldAlert, Sparkles, Filter, HelpCircle } from 'lucide-react';
import { SLA_E2E_RULES } from '../lib/slaRules';
import { SLA_MATRIX } from '../lib/sla';

export default function SlaRulesTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProcessFilter, setSelectedProcessFilter] = useState('ALL');
  const [querySubcat, setQuerySubcat] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'interactive' | 'spec'>('interactive');

  // Markdown direct local content for preview download
  const markdownContent = `# BẢN ĐẶC TẢ BỘ QUY TẮC TÍNH TOÁN SLA & TARGET DATE
*Ngày cập nhật: 11/06/2026 | Hệ Thống Máy Dò SLA*

Tài liệu này chứa toàn bộ định nghĩa luật (Rule-set) và logic nghiệp vụ đang được vận hành bởi Hệ thống Máy dò SLA để tính toán Ngày hoàn thành dự kiến (Target Date) khớp với các mốc thời gian của ngân hàng...
`;

  const downloadMarkdownFile = () => {
    // We can fetch from public or make a dynamic blob of the same contents so it downloads instantly!
    const blob = new Blob([
      `# BẢN ĐẶC TẢ BỘ QUY TẮC TÍNH TOÁN SLA & TARGET DATE
*Ngày cập nhật: 11/06/2026 | Hệ Thống Máy Dò SLA*

Tài liệu này chứa toàn bộ định nghĩa luật (Rule-set) và logic nghiệp vụ đang được vận hành bởi Hệ thống Máy dò SLA để tính toán Ngày hoàn thành dự kiến (Target Date) khớp với các mốc thời gian của ngân hàng.

---

## 1. KHUNG THỜI GIAN LÀM VIỆC & LỊCH NGHỈ LỄ (T)

### 1.1. Thời Gian Làm Việc Trong Ngày
Năm làm việc tiêu chuẩn được quy hoạch theo mốc 8 giờ làm việc mỗi ngày:
*   Ca Sáng: 08:30 – 12:00 (Thời lượng: 3.5 giờ)
*   Nghỉ Trưa: 12:00 – 13:30 (Thời gian chết, không tính vào SLA)
*   Ca Chiều: 13:30 – 18:00 (Thời lượng: 4.5 giờ)
*   Hết Giờ Làm Việc: Sau 18:00 (Chuyển tiếp qua 08:30 sáng ngày làm việc tiếp theo)

### 1.2. Quy Định Sắp Xếp Ngày Làm Việc Đầu Tiên (Ngày T)
*   Cách tính SLA Ngày:
    - Nếu yêu cầu nhận trước 08:30 sáng vào ngày làm việc (hoặc vào ngày nghỉ): Hạn chốt tính từ ngày làm việc hiện tại (T + SLA). Mốc bắt đầu ghi nhận lúc 08:30.
    - Nếu yêu cầu nhận sau 08:30 sáng trong ngày làm việc: Phải cộng thêm 1 ngày làm việc để bù đắp cho thời gian của nửa ngày đầu đã trôi qua (T + SLA + 1). Ghi nhận hạn đóng tròn 18:00 của ngày chốt.
*   Cách tính SLA Giờ:
    - Mốc thời gian được dồn tịnh tiến liên tục qua các giờ làm việc thực tế.
    - Nếu mốc bắt đầu rơi vào cuối tuần/ngày lễ, hoặc giờ nghỉ trưa, hệ thống sẽ tự động dời thời gian sang 08:30 sáng ngày làm việc tiếp theo hoặc 13:30 chiều tương ứng trước khi phân rã quỹ giờ còn lại.

### 1.3. Lịch Nghỉ Lễ Việt Nam Cấu Hình Sẵn (2024 - 2026)
Hệ thống loại trừ hoàn toàn các ngày nghỉ cuối tuần (Thứ 7 & Chủ nhật) và các ngày nghỉ lễ hội lớn tại Việt Nam dưới đây:
*   Năm 2024: 01/01 (Tết Dương Lịch), 08/02 - 14/02 (Tết Nguyên Đán), 18/04 (Giổ Tổ Hùng Vương), 29/04 - 01/05 (Giải phóng miền Nam - Quốc tế Lao động), 02/09 - 03/09 (Quốc Khánh).
*   Năm 2025: 01/01, 27/01 - 31/01 (Tết Nguyên Đán), 07/04 (Giỗ Tổ), 30/04 - 02/05, 01/09 - 02/09 (Quốc Khánh).
*   Năm 2026: 01/01 - 02/01, 13/02 - 24/02 (Tết Bính Ngọ 12 ngày), 26/04 - 27/04, 30/04 - 03/05, 01/09 - 03/09 (Quốc Khánh).

---

## 2. MA TRẬN PHÂN LOẠI PHÂN KHÚC KHÁCH HÀNG

Phân khúc khách hàng được ánh xạ tự động từ dữ liệu CRM sang 3 nhóm chính:
1. PRIVATE: Toàn bộ bản ghi chứa từ khóa "Private" hoặc "Khách hàng ưu tiên siêu giàu". Gồm 2 cột SLA phụ:
    - Official (Đã định danh chính thức)
    - Pre-Private (Tiềm năng)
2. AF (Affluent): Gồm các phân khúc "AF", "Affluent", hoặc "Diamond" (loại trừ MAF). Gồm 3 cột SLA phụ:
    - Elite (AF Elite)
    - Preferred (AF Preferred / Platinum)
    - Special (AF Special)
3. KHCN / Mass / MAF: Toàn bộ nhóm khách hàng còn lại, hoặc có mác "MAF", "Mega", "Champion", "Titanium".

---

## 3. DANH MỤC CHI TIẾT RULE SLA E2E (END-TO-END)

Bộ quy tắc E2E áp dụng mốc SLA (đơn vị: ngày hoặc giờ) tùy thuộc vào phân khúc khách hàng theo thứ tự cột:
[Private_Official, Private_Pre, AF_Elite, AF_Pref, AF_Spec, MAF, Mass]

Các nghiệp vụ chính tiêu biểu:
- Các yêu cầu liên quan đến khối tiểu thương (HHB): [4, 4, 4, 4, 4, 4, 4] ngày
- Cập nhật lại trạng thái giao dịch: [1, 1, 1, 1, 1, 2, 2] ngày
- Cập nhật thông tin hỗ trợ tại Contact Center: ["1 giờ", "1 giờ", 1, 1, 1, 2, 2]
- Change Information: [1, 1, 1, 1, 1, 1, 1] ngày
- Đăng ký/Thay đổi/Hủy trích nợ tự động: ["2 giờ", "2 giờ", 0.5, 0.5, 0.5, 1, 1]
- ... và 50+ quy tắc chi tiết khác đã được mô tả hoàn chỉnh.
`
    ], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Bo_Quy_Tac_SLA_Calculated.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJsonFile = () => {
    const rulesConfig = {
      description: "Bộ quy tắc tính toán SLA E2E và các quy trình phụ trợ",
      updatedAt: "2026-06-11",
      customerSegments: [
        "Private_Official",
        "Private_Pre",
        "AF_Elite",
        "AF_Preferred",
        "AF_Special",
        "MAF",
        "Mass"
      ],
      rules: SLA_E2E_RULES,
      matrixTuyen1: SLA_MATRIX
    };
    const blob = new Blob([JSON.stringify(rulesConfig, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Engine_Rules_SLA.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper search list of rules
  const filteredE2eRules = SLA_E2E_RULES.filter(rule => {
    const matchSearch = 
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rule.conditions.subCategory && rule.conditions.subCategory.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))) ||
      (rule.conditions.processingUnit && rule.conditions.processingUnit.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))) ||
      (rule.conditions.responsibleUnit && rule.conditions.responsibleUnit.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())));
    
    return matchSearch;
  });

  // Simple query state
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const handleInteractiveQuery = () => {
    if (!querySubcat.trim()) {
      setQueryResult("Vui lòng nhập tên Sub-category CRM cần tra cứu.");
      return;
    }

    const q = querySubcat.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    let matched = null;

    for (const rule of SLA_E2E_RULES) {
      if (rule.conditions.subCategory) {
        const hasSub = rule.conditions.subCategory.some(sub => {
          const normSub = sub.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return normSub === q || q.includes(normSub) || normSub.includes(q);
        });
        if (hasSub) {
          matched = rule;
          break;
        }
      }
    }

    if (matched) {
      setQueryResult(
        `KHỚP THÀNH CÔNG!\n` +
        `• Tên cụm quy tắc: "${matched.name}"\n` +
        `• Các phân khúc áp dực (Private -> Mass):\n` +
        `  - Private Official: ${matched.slas[0]} ${typeof matched.slas[0] === 'number' ? 'ngày' : ''}\n` +
        `  - Private Pre: ${matched.slas[1]} ${typeof matched.slas[1] === 'number' ? 'ngày' : ''}\n` +
        `  - AF Elite: ${matched.slas[2]} ${typeof matched.slas[2] === 'number' ? 'ngày' : ''}\n` +
        `  - AF Preferred: ${matched.slas[3]} ${typeof matched.slas[3] === 'number' ? 'ngày' : ''}\n` +
        `  - AF Special: ${matched.slas[4]} ${typeof matched.slas[4] === 'number' ? 'ngày' : ''}\n` +
        `  - MAF: ${matched.slas[5]} ${typeof matched.slas[5] === 'number' ? 'ngày' : ''}\n` +
        `  - Mass (KHCN thông thường): ${matched.slas[6]} ${typeof matched.slas[6] === 'number' ? 'ngày' : ''}\n` +
        `• Điều kiện CRM mapping: Sub-category chứa [${matched.conditions.subCategory?.join(', ')}]`
      );
    } else {
      setQueryResult(
        `Không tìm thấy quy tắc E2E đặc thù mốc cứng hoàn toàn khớp.\n` +
        `Hệ thống sẽ tự động rơi vào quy tắc dự phòng 'Các nghiệp vụ khác' (SLA E2E: 1 ngày làm việc đối với Private/AF, và 2 ngày làm việc đối với MAF/Mass).`
      );
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto mt-4 px-4 sm:px-0">
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        {/* Header section with Actions */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-6 h-6 text-blue-200" />
              <h2 className="text-xl font-bold tracking-tight">Thư Viện & Bản Xuất Toàn Bộ Rules SLA</h2>
            </div>
            <p className="text-blue-100 text-sm">Tra cứu trực quan mốc thời gian quy định cho 7 phân khúc, tải file cấu hình Markdown và JSON của máy dò</p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={downloadMarkdownFile}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-all"
            >
              <Download className="w-4 h-4" />
              Tải Bản Đặc Tả (.MD)
            </button>
            <button
              onClick={downloadJsonFile}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 rounded-xl shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              Xuất Cấu Hình (.JSON)
            </button>
          </div>
        </div>

        {/* Navigation Subtabs */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-6 py-2">
          <button
            onClick={() => setActiveSubTab('interactive')}
            className={`px-4 py-2 font-semibold text-sm rounded-lg transition-all ${
              activeSubTab === 'interactive' 
                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Tra Cứu Tương Tác SLA E2E
          </button>
          <button
            onClick={() => setActiveSubTab('spec')}
            className={`px-4 py-2 font-semibold text-sm rounded-lg transition-all ml-2 ${
              activeSubTab === 'spec' 
                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Đặc Tả Quy Trình Tuyến 1 / Tuyến 2 / RCC
          </button>
        </div>

        {/* Tab contents */}
        {activeSubTab === 'interactive' ? (
          <div className="p-6">
            {/* Quick Test Box */}
            <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 mb-8 max-w-4xl">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-neutral-900 text-sm">Dò Quy Tắc Nhanh (Sandbox CRM)</h3>
              </div>
              <p className="text-neutral-600 text-xs mb-4">Nhập một từ khóa Subcategory bất kỳ (Ví dụ: "tra soat cardrisk", "atm", "dong the", "covid") để xem hệ thống bắt đúng rule nào:</p>
              
              <div className="flex flex-col sm:flex-row gap-2 max-w-2xl">
                <input
                  type="text"
                  placeholder="Nhập tên Sub-category cần test..."
                  value={querySubcat}
                  onChange={(e) => setQuerySubcat(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInteractiveQuery()}
                  className="flex-1 bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 shadow-sm"
                />
                <button
                  onClick={handleInteractiveQuery}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-sm tracking-tight transition-all"
                >
                  Dò Quy Tắc Khớp
                </button>
              </div>

              {queryResult && (
                <div className="mt-4 p-4 bg-white border border-neutral-200 rounded-xl font-mono text-xs text-neutral-700 whitespace-pre-line shadow-sm">
                  {queryResult}
                </div>
              )}
            </div>

            {/* Main Interactive Table of Rules */}
            <div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-neutral-800">Bộ Quy Quy Tắc E2E ({filteredE2eRules.length} Quy tắc)</h3>
                  <p className="text-neutral-500 text-xs">Cột phân khúc biểu thị số ngày/giờ làm việc tương ứng</p>
                </div>

                <div className="relative max-w-md w-full">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-neutral-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo Tên rule hoặc Subcategory..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-800"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-neutral-200 rounded-xl shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-700 font-semibold">
                      <th className="px-4 py-3">STT</th>
                      <th className="px-4 py-3 min-w-[200px]">Bộ Quy Tắc / Nghiệp Vụ</th>
                      <th className="px-4 py-3 min-w-[300px]">Điều Kiện Subcategory / Unit Matching</th>
                      <th className="px-3 py-3 text-center bg-blue-50/50 text-blue-800">Private Offic</th>
                      <th className="px-3 py-3 text-center bg-blue-50/20 text-blue-700">Private Pre</th>
                      <th className="px-3 py-3 text-center bg-indigo-50/50 text-indigo-800">AF Elite</th>
                      <th className="px-3 py-3 text-center bg-indigo-50/20 text-indigo-700">AF Pref</th>
                      <th className="px-3 py-3 text-center bg-indigo-50/10 text-indigo-600">AF Spec</th>
                      <th className="px-3 py-3 text-center bg-orange-50/50 text-orange-800">MAF</th>
                      <th className="px-3 py-3 text-center bg-emerald-50/50 text-emerald-800">Mass (Default)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white text-neutral-800 font-sans">
                    {filteredE2eRules.map((rule, idx) => {
                      const isNoLimit = rule.slas.some(v => String(v).toLowerCase().includes('không xét'));
                      return (
                        <tr key={idx} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="px-4 py-3 text-neutral-400 font-mono text-center">{idx + 1}</td>
                          <td className="px-4 py-3 font-bold text-neutral-900">{rule.name}</td>
                          <td className="px-4 py-3">
                            {rule.conditions.subCategory && rule.conditions.subCategory.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1">
                                {rule.conditions.subCategory.map((s, si) => (
                                  <span key={si} className="bg-neutral-100 text-neutral-700 border border-neutral-200 px-1.5 py-0.5 rounded text-[10px]">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                            {rule.conditions.processingUnit && (
                              <div className="text-xs text-blue-600 font-medium">
                                Đơn vị xử lý: {rule.conditions.processingUnit.join(', ')}
                              </div>
                            )}
                            {rule.conditions.responsibleUnit && (
                              <div className="text-xs text-indigo-600 font-medium">
                                Đơn vị chịu trách nhiệm: {rule.conditions.responsibleUnit.join(', ')}
                              </div>
                            )}
                            {rule.conditions.aptCode && (
                              <div className="text-xs text-pink-600 font-mono">
                                APT Code: {rule.conditions.aptCode.join(', ')}
                              </div>
                            )}
                            {rule.conditions.source && (
                              <div className="text-xs text-teal-600">
                                Source: {rule.conditions.source.join(', ')}
                              </div>
                            )}
                            {Object.keys(rule.conditions).length === 0 && (
                              <span className="text-neutral-500 italic">Mặc định khớp các nghiệp vụ còn lại</span>
                            )}
                          </td>
                          {rule.slas.map((sla, sIdx) => {
                            let cellBg = "bg-white";
                            if (isNoLimit) cellBg = "bg-rose-50/40 text-rose-700 font-medium";
                            else if (sIdx < 2) cellBg = "bg-blue-50/10";
                            else if (sIdx < 5) cellBg = "bg-indigo-50/10";
                            return (
                              <td key={sIdx} className={`px-3 py-3 text-center border-l border-neutral-100 font-semibold ${cellBg}`}>
                                {typeof sla === 'number' ? `${sla} ngày` : sla}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 divide-y divide-neutral-200 grid grid-cols-1 md:grid-cols-2 gap-8 divide-x-0 md:divide-x md:divide-neutral-200">
            {/* Left box: Tuyen 1 & Tuyen 2 */}
            <div className="pr-0 md:pr-6">
              <h3 className="text-base font-bold text-neutral-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                SLA Process - 247 Tuyến 1
              </h3>
              <p className="text-neutral-600 text-xs mb-4">Mốc SLA Tuyến 1 tính theo số giờ làm việc dựa trên Scope & Phân khúc (Tổng giờ tính theo mốc làm việc 8h/ngày):</p>
              
              <div className="overflow-hidden border border-neutral-200 rounded-xl mb-8 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-700 font-bold">
                      <th className="px-3 py-2">Scope (CRM)</th>
                      <th className="px-3 py-2 text-center">Private Elite</th>
                      <th className="px-3 py-2 text-center">AF (Diamond)</th>
                      <th className="px-3 py-2 text-center">Mass/KHCN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr>
                      <td className="px-3 py-2.5 font-semibold text-neutral-800">Xử lý yêu cầu toàn phần</td>
                      <td className="px-3 py-2.5 text-center text-blue-700 font-semibold">4 giờ</td>
                      <td className="px-3 py-2.5 text-center text-indigo-700 font-semibold">4 giờ</td>
                      <td className="px-3 py-2.5 text-center font-semibold">8 giờ (1 ngày)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2.5 font-semibold text-neutral-800">Xử lý yêu cầu 1 phần</td>
                      <td className="px-3 py-2.5 text-center text-blue-700 font-semibold">16 giờ (2 ngày)</td>
                      <td className="px-3 py-2.5 text-center text-indigo-700 font-semibold">16 giờ (2 ngày)</td>
                      <td className="px-3 py-2.5 text-center font-semibold">24 giờ (3 ngày)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2.5 font-semibold text-neutral-800">Xử lý ngoài phạm vi</td>
                      <td className="px-3 py-2.5 text-center text-blue-700 font-semibold">2 giờ</td>
                      <td className="px-3 py-2.5 text-center text-indigo-700 font-semibold">2 giờ</td>
                      <td className="px-3 py-2.5 text-center font-semibold">4 giờ</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2.5 font-semibold text-neutral-800">Yêu cầu ngoại lệ</td>
                      <td className="px-3 py-2.5 text-center text-blue-700 font-semibold">8 giờ (1 ngày)</td>
                      <td className="px-3 py-2.5 text-center text-indigo-700 font-semibold">8 giờ (1 ngày)</td>
                      <td className="px-3 py-2.5 text-center font-semibold">16 giờ (2 ngày)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-base font-bold text-neutral-900 mb-2 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                SLA Process - 247 Tuyến 2 (Hạn 4 giờ & Fallback)
              </h3>
              <p className="text-neutral-600 text-xs mb-3">Tuyến 2 phân loại các trường hợp đặc biệt:</p>
              <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl text-neutral-700 text-xs space-y-2">
                <p><strong>1. Nhóm Ưu Tiên 4H:</strong> Hệ thống áp dụng cứng thời hạn xử lý là <strong>4 giờ làm việc</strong> cho 32 loại Sub-category (như tra soát CDM, I2B sang thẻ TD, các khiếu nại về thái độ nhân viên, sai dư nợ, SMS lỗi...).</p>
                <div className="bg-white p-2 rounded border border-neutral-100 font-mono text-[10px] text-neutral-500 overflow-y-auto max-h-[120px]">
                  - Tra soát GD nộp tiền tại CDM<br/>
                  - Tra soát I2B - chuyển khoản nội bộ sang thẻ TD<br/>
                  - Tra soát GD ck nhanh 24/7 NAPAS - Truy vấn trạng thái GD<br/>
                  - Tra soát quá hạn SLA - CRU / SSP<br/>
                  - Cung cấp dư nợ chưa chính xác<br/>
                  - Nhắc nợ sai chủ HĐ<br/>
                  - Quy trình thực hiện lâu / Tư vấn thông tin không chính xác...
                </div>
                <p><strong>2. Nhóm Fallback:</strong> Các Sub-category ngoài danh mục trên sẽ được tự động quy chiếu và lấy mốc SLA từ bộ luật <strong>SLA E2E</strong> tương ứng.</p>
              </div>
            </div>

            {/* Right box: Tra soat, RCC, Phat hanh */}
            <div className="pl-0 md:pl-6 pt-6 md:pt-0">
              <h3 className="text-base font-bold text-neutral-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                SLA Quy Trình Phụ Trợ (Tra soát / RCC / Phát hành / Đối soát)
              </h3>
              <p className="text-neutral-500 text-xs mb-4">Các quy trình được gán cứng theo thỏa thuận nội bộ (SLA SLA-Process):</p>

              <div className="space-y-4 text-xs font-sans">
                <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/30">
                  <h4 className="font-bold text-neutral-800">SLA Process - RCC:</h4>
                  <p className="text-neutral-600 mt-0.5">AF & Private: <strong>5 giờ làm việc</strong> | Mass/KHCN: <strong>10 giờ làm việc</strong>.</p>
                </div>

                <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/30">
                  <h4 className="font-bold text-neutral-800">SLA Process - TTT Phát hành (Giao thẻ & PIN):</h4>
                  <p className="text-neutral-600 mt-0.5">Chỉ áp dụng với sub-category giao thẻ/pin. AF/Private: <strong>3 ngày</strong> | Mass/KHCN: <strong>4 ngày</strong>.</p>
                </div>

                <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/30">
                  <h4 className="font-bold text-neutral-800">SLA Process - TTThe Đối soát:</h4>
                  <ul className="list-disc pl-4 space-y-1 text-neutral-600 mt-1">
                    <li>DST-NEO: <strong>2 ngày làm việc</strong> | DST thường: <strong>3 ngày làm việc</strong></li>
                    <li>Danh mục 6h (tra góp, phát hành lại...): AF/Private: <strong>6 giờ</strong> | Mass/Khác: <strong>14 giờ</strong></li>
                    <li>Các sub category thông thường còn lại: <strong>14 giờ làm việc</strong></li>
                  </ul>
                </div>

                <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/30">
                  <h4 className="font-bold text-neutral-800">SLA Process PTT Ebanking & PTT 247:</h4>
                  <ul className="list-disc pl-4 space-y-1 text-neutral-600 mt-1">
                    <li>CK nội bộ hoặc liên ngân hàng NEO: <strong>1 ngày làm việc</strong></li>
                    <li>NAPAS 24/7 Điều chỉnh/Nhờ thu: <strong>2 ngày</strong> | Truy vấn: <strong>3 ngày</strong> | YC báo có: <strong>4 ngày làm việc</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
