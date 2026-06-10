import React, { useState } from 'react';
import { Sparkles, FileSpreadsheet, Loader2, AlertCircle, TrendingUp, Search, BrainCircuit } from 'lucide-react';
import * as XLSX from 'xlsx';
import { calculateTargetDate, isHolidayOrWeekend, SLAInfo } from '../lib/sla';
import { format, getHours, getDay } from 'date-fns';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import clsx from 'clsx';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface RowData {
  [key: string]: any;
}

interface FailedCase {
  row: RowData;
  reference: string;
  detectedProcessType: string;
  actualTargetDate: Date | null;
  expectedTargetDate: Date | null;
  slaLabel: string;
  createdDate: Date;
  isHoliday: boolean;
  hourOfDay: number;
  dayOfWeek: string;
  errorMessage?: string;
}

export default function SlaAiAnalysisTab() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [failedCases, setFailedCases] = useState<FailedCase[]>([]);
  const [totalCases, setTotalCases] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  const normalizeHeader = (h: string) => {
    if (!h) return '';
    return h.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  const fixSlaDateFormat = (d: Date | undefined): Date | undefined => {
    if (!d || isNaN(d.getTime())) return d;
    const year = d.getFullYear();
    const month0 = d.getMonth(); // 0-indexed: 5 is June
    const date = d.getDate();    // day of month
    
    // Check if Month and Day got swapped (e.g. June 9th becomes September 6th because Month = 9, Day = 6)
    if (year >= 2024 && year <= 2028 && date === 6 && month0 !== 5) {
      return new Date(year, 5, month0 + 1, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
    }
    return d;
  };

  const parseDateFallback = (val: any): Date | undefined => {
    if (!val) return undefined;
    let res: Date | undefined = undefined;
    if (val instanceof Date) {
      res = isNaN(val.getTime()) ? undefined : val;
    } else if (typeof val === 'number') {
      if (val > 10000) {
        const d = new Date((val - (25567 + 1)) * 86400 * 1000);
        res = isNaN(d.getTime()) ? undefined : d;
      }
    } else {
      const sClean = String(val).replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
      const dmTMatch = sClean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?(?::(\d{1,2}))?/);
      if (dmTMatch) {
        const h = dmTMatch[4] ? parseInt(dmTMatch[4], 10) : 0;
        const m = dmTMatch[5] ? parseInt(dmTMatch[5], 10) : 0;
        const sec = dmTMatch[6] ? parseInt(dmTMatch[6], 10) : 0;
        res = new Date(parseInt(dmTMatch[3], 10), parseInt(dmTMatch[2], 10) - 1, parseInt(dmTMatch[1], 10), h, m, sec);
      } else {
        const d = new Date(sClean);
        res = isNaN(d.getTime()) ? undefined : d;
      }
    }
    return fixSlaDateFormat(res);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setIsProcessing(true);
    setAnalysis(null);
    setFailedCases([]);
    setChatMessages([]);
    setError(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(data), { type: 'array', cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: RowData[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (json.length === 0) {
        setError('File không có dữ liệu');
        setIsProcessing(false);
        return;
      }

      setTotalCases(json.length);
      const keys = Object.keys(json[0]);
      const getVal = (row: RowData, ...possibleNames: string[]) => {
        const normalized = possibleNames.map(normalizeHeader);
        for (const npn of normalized) {
          for (const key of keys) {
            if (normalizeHeader(key) === npn) return row[key];
          }
        }
        for (const npn of normalized) {
          if (!npn) continue;
          for (const key of keys) {
            if (normalizeHeader(key).includes(npn)) return row[key];
          }
        }
        return null;
      };

      const failures: FailedCase[] = [];
      const DAYS = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

      json.forEach((row, idx) => {
        const reference = String(getVal(row, 'Mã yêu cầu', 'Mã YC', 'Case Number', 'Reference') || '').trim();
        if (!reference || reference.toLowerCase().includes('tổng cộng')) return;

        const originalProcessTypeVal = getVal(row, 'Cột mốc', 'Mốc', 'Milestone Name', 'SLA Process') || '-';
        const createdDateStr = getVal(row, 'Ngày/Thời gian đã mở', 'Ngày tạo', 'Created Date', 'CreatedDate');
        const targetDateStr = getVal(row, 'Target Date', 'Hạn xử lý', 'Ngày tới hạn');
        const slaTypeStr = getVal(row, 'SLA Type', 'Loại yêu cầu', 'Scope');
        const rawVpbSlaStartStr = getVal(row, 'VPB_SLAStarttimeSLA', 'Ngày bắt đầu', 'VPB_Start time SLA', 'Assign Date', 'Ngày bắt đầu tính SLA', 'VPB Start time SLA', 'Start time SLA', 'VPB_StartTimeSla', 'Assign Date SLA');

        const createdDate = parseDateFallback(createdDateStr);
        const originalTargetDate = parseDateFallback(targetDateStr);
        let vpbStartStr = ''; let assignDate: Date | undefined = undefined;

        if (!createdDate) return;

        // NEW: Filter by "[Kết quả] Kiểm tra" column as requested
        const checkResultRaw = String(getVal(row, '[Kết quả] Kiểm tra', 'Kết quả', 'Kiem tra', 'Status') || '').trim();
        const checkResultNormalized = checkResultRaw.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd');
            
        if (checkResultNormalized !== 'sai') return;

        const processTypeLower = String(originalProcessTypeVal).toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd')
            .replace(/[–—−⁃－⁻−⎯‑‒]|&ndash;|&mdash;/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
        
        let detectedLabel = 'SLA E2E';
        if (processTypeLower.includes('e2e')) {
            detectedLabel = 'SLA E2E';
        } else if (processTypeLower.includes('tuyen 1') || processTypeLower.includes('truyen 1') || processTypeLower.includes('t1')) {
            detectedLabel = 'SLA Process - 247 Tuyến 1';
        } else if (processTypeLower.includes('tuyen 2') || processTypeLower.includes('truyen 2') || processTypeLower.includes('t2')) {
            detectedLabel = 'SLA Process - 247 Tuyến 2';
        } else if (processTypeLower.includes('tra soat')) {
            detectedLabel = 'SLA Process - TTT Tra soát';
        } else if (processTypeLower.includes('rcc')) {
            detectedLabel = 'SLA Process - RCC';
        } else if (processTypeLower.includes('phat hanh')) {
            detectedLabel = 'SLA Process - TTT Phát hành';
        } else if (processTypeLower.includes('doi soat')) {
            detectedLabel = 'SLA Process - TTThe Đối soát';
        } else if (processTypeLower.includes('cau hinh')) {
            detectedLabel = 'SLA Process - TTT Cấu hình';
        } else if (processTypeLower.includes('247 ptt') || processTypeLower.includes('ptt 247') || (processTypeLower.includes('ptt') && processTypeLower.includes('247'))) {
            detectedLabel = 'SLA Process - PTT 247';
        } else if (processTypeLower.includes('ptt eban') || processTypeLower.includes('ebanking') || processTypeLower.includes('ptt') || processTypeLower.includes('e-banking')) {
            detectedLabel = 'SLA Process PTT Ebanking';
        }

        if (detectedLabel === 'SLA Process - 247 Tuyến 2') {
          vpbStartStr = String(getVal(row, 'VPB_StartTimeSla', 'vpb_starttimesla', 'VPB_SLAStarttimeSLA') || '');
        } else if (
          detectedLabel === 'SLA Process - TTT Tra soát' ||
          detectedLabel === 'SLA Process - RCC' ||
          detectedLabel === 'SLA Process - TTThe Đối soát' ||
          detectedLabel === 'SLA Process - TTT Phát hành' ||
          detectedLabel === 'SLA Process - TTT Cấu hình' ||
          detectedLabel === 'SLA Process PTT Ebanking' ||
          detectedLabel === 'SLA Process - PTT 247'
        ) {
          vpbStartStr = String(getVal(row, 'Ngày Bắt Đầu  ', 'Ngày bắt đầu', 'Ngày bắt đầu tính SLA', 'Ngay bat dau', 'ngaybatdau') || '');
        } else {
          vpbStartStr = String(rawVpbSlaStartStr || '');
        }
        assignDate = parseDateFallback(vpbStartStr) || undefined;

        const isSlaTypeNull = !slaTypeStr || String(slaTypeStr).trim() === '' || String(slaTypeStr).toLowerCase().trim() === 'null' || String(slaTypeStr).toLowerCase().trim() === 'undefined';
        let scope = 'Xử lý yêu cầu toàn phần' as any;
        if (detectedLabel === 'SLA Process - 247 Tuyến 1' && isSlaTypeNull) {
          scope = 'Xử lý ngoài phạm vi';
        } else {
          const ts = String(slaTypeStr || '').toLowerCase();
          if (ts.includes('1 phan')) scope = 'Xử lý yêu cầu 1 phần';
          else if (ts.includes('ngoai pham vi')) scope = 'Xử lý ngoài phạm vi';
          else if (ts.includes('ngoai le')) scope = 'Yêu cầu ngoại lệ';
        }

        try {
          const calc = calculateTargetDate({
            reference,
            createdDate,
            processType: detectedLabel,
            scope,
            segment: getVal(row, 'Phân khúc', 'Segment') || '',
            subSegment: getVal(row, 'Phân hạng', 'Sub-segment') || '',
            subcategory: getVal(row, 'Sub-category CRM', 'Sub-category') || '',
            e2eSlaStr: getVal(row, 'E2E SLA', 'SLA') || '',
            source: getVal(row, 'Nguồn tạo', 'Source') || '',
            type: getVal(row, 'Type', 'Case Type') || '',
            processingUnit: getVal(row, 'Đơn vị xử lý') || '',
            responsibleUnit: getVal(row, 'Đơn vị chịu trách nhiệm') || '',
            reason: getVal(row, 'Nguyên nhân', 'Reason') || '',
            title: getVal(row, 'Tiêu đề', 'Title') || '',
            aptCode: getVal(row, 'APT Code') || '',
            assignDate
          });

          // Always push to failures because we filtered by the "Sai" status column at the start of loop
          failures.push({
            row,
            reference,
            detectedProcessType: detectedLabel,
            actualTargetDate: originalTargetDate || null,
            expectedTargetDate: calc.targetDate,
            slaLabel: calc.slaLabel,
            createdDate,
            isHoliday: isHolidayOrWeekend(createdDate),
            hourOfDay: getHours(createdDate),
            dayOfWeek: DAYS[getDay(createdDate)]
          });
        } catch (e) {}
      });

      setFailedCases(failures);
      
      if (failures.length > 0) {
        await runAiAnalysis(failures, json.length);
      } else {
        setAnalysis("Chúc mừng! Không tìm thấy trường hợp nào bị sai Target Date trong file này.");
      }

    } catch (err: any) {
      setError("Lỗi xử lý file: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getAnalysisContext = (failures: FailedCase[], total: number) => {
    const stats: any = {
      byProcess: {} as any,
      bySegment: {} as any,
      byHour: {} as any,
      byDay: {} as any,
      byHoliday: { yes: 0, no: 0 },
      bySubCategory: {} as any
    };

    failures.forEach(f => {
      stats.byProcess[f.detectedProcessType] = (stats.byProcess[f.detectedProcessType] || 0) + 1;
      const seg = f.row['Phân khúc'] || f.row['Segment'] || 'Unknown';
      stats.bySegment[seg] = (stats.bySegment[seg] || 0) + 1;
      stats.byHour[f.hourOfDay] = (stats.byHour[f.hourOfDay] || 0) + 1;
      stats.byDay[f.dayOfWeek] = (stats.byDay[f.dayOfWeek] || 0) + 1;
      if (f.isHoliday) stats.byHoliday.yes++; else stats.byHoliday.no++;
      const sub = f.row['Sub-category CRM'] || f.row['Sub-category'] || 'Unknown';
      stats.bySubCategory[sub] = (stats.bySubCategory[sub] || 0) + 1;
    });

    const formatDateForAi = (d: Date | null | undefined) => {
      if (!d) return 'null';
      return `Ngày ${format(d, 'dd')} tháng ${format(d, 'MM')} năm ${format(d, 'yyyy')} lúc ${format(d, 'HH:mm')}`;
    };

    const sample = failures.slice(0, 30).map(f => ({
      ref: f.reference,
      process: f.detectedProcessType,
      created: formatDateForAi(f.createdDate),
      expected: formatDateForAi(f.expectedTargetDate),
      actualInFile: formatDateForAi(f.actualTargetDate),
      slaLabel: f.slaLabel,
      subCategory: f.row['Sub-category CRM'] || f.row['Sub-category'],
      segment: f.row['Phân khúc'] || f.row['Segment']
    }));

    return { total, failuresCount: failures.length, stats, sample };
  };

  const runAiAnalysis = async (failures: FailedCase[], total: number) => {
    const contextData = getAnalysisContext(failures, total);
    
    const prompt = `DANH NGHĨA VÀ VAI TRÒ CHUYÊN GIA:
Bạn là "MÁY DÒ SLA - Chuyên gia cao cấp về Service SLA & Chẩn đoán Bug Logic Hệ thống (SLA Auditor Specialist)" do nhà phát triển Daosweet2k sáng tạo.
Nhiệm vụ tối cao của bạn là săn lùng và phân tích lỗi logic, tìm ra điểm bất nhất (bug/mismatch) giữa kết quả chuẩn mong đợi (trong file dữ liệu thực tế) và cách tính toán hiện tại của hệ thống (trong file code src/lib/sla.ts, src/lib/slaRules.ts).

DỮ LIỆU LOGIC KIỂM TRA ĐẦU VÀO:
- Tổng số case đã kiểm định (audit): ${total}.
- Số lượng case bị phát hiện tính toán lệch Target Date: ${failures.length} ca (${((failures.length/total)*100).toFixed(1)}%).

LƯU Ý CỰC KỲ QUAN TRỌNG VỀ ĐỊNH DẠNG NGÀY THÁNG (QUYẾT ĐỊNH ĐỘ CHÍNH XÁC KHI SĂN BUG):
- Toàn bộ thời gian hiển thị trong dữ liệu mẫu (sample) đã được ĐỊNH DẠNG RÕ RÀNG dạng chữ viết tiếng Việt, ví dụ: "Ngày 09 tháng 06 năm 2026 lúc 15:30". 
  + Hãy nhớ kỹ: "tháng 06" hoặc "tháng 6" là tháng sáu (June), "tháng 08" là tháng tám (August). 
  + Hãy tin tưởng 100% vào chuỗi chữ viết này để tránh nhầm ngày/tháng theo định dạng Mỹ!
- Ví dụ cụ thể: 
  + "Ngày 08 tháng 06" là ngày mùng 8 tháng 6 năm 2026 (Ngày 8, Tháng 6). Tuyệt đối KHÔNG ĐƯỢC nhầm lẫn hoặc đọc thành ngày mùng 6 tháng 8.
  + "Ngày 09 tháng 06" là ngày mùng 9 tháng 6 năm 2026 (Ngày 9, Tháng 6). Tuyệt đối KHÔNG ĐƯỢC nhầm lẫn hoặc đọc thành ngày mùng 6 tháng 9.
- Luôn kiểm tra kỹ thứ tự ngày/tháng trước khi đưa ra nhận định về lệch ngày hoặc nguyên nhân chậm trễ. Tuyệt đối tránh hiểu nhầm theo định dạng Mỹ MM/DD/YYYY!

TÓM TẮT THUẬT TOÁN LOGIC CỐT LÕI (CHUYÊN GIA BIẾT ĐỂ TRA CỨU CODE):
1. Giờ làm việc hành chính: 8:30 - 12:00 và 13:30 - 18:00 (làm việc 8 tiếng/ngày). Trừ cuối tuần & Lễ Tết (VN_HOLIDAYS_DEFAULT trong sla.ts).
2. Phân loại theo Process Type:
   - SLA E2E: Dựa trên SLA_E2E_RULES trong slaRules.ts. Không loại trừ ngày nghỉ lễ trừ khi cấu hình đặc biệt.
   - SLA Process - 247 Tuyến 1: Nếu Scope = "Xử lý ngoài phạm vi" (AF/Private = 2 giờ, Khác = 4 giờ làm việc). Các scope khác đối chiếu SLA_MATRIX.
   - SLA Process - 247 Tuyến 2: Có subcategory đặc biệt: "Tra soát chuyển khoản nội bộ - CRU" là 5 ngày làm việc.
   - SLA Process - TTT Tra soát: Giá trị ngày làm việc lấy từ TTT_TRA_SOAT_MATRIX (ví dụ Tra soát CDM = 2 ngày, Thẻ nội địa POS = 11 ngày, ...).
   - SLA Process - RCC: AF/Private = 5h làm việc, Khác = 10h làm việc.
   - SLA Process - TTT Phát hành: AF/Private = 3 ngày làm việc, Khác = 4 ngày làm việc.
   - SLA Process - TTThe Đối soát: Tra soát DST = 3 ngày, Tra soát DST-NEO = 2 ngày. Các sub-category khác quy đổi 14h làm việc (khách hàng thường/Mass) hoặc 6h/14h (khách hàng VIP).
   - SLA Process - TTT Cấu hình: AF/Private = 1 ngày làm việc, Khác = 2 ngày làm việc.
   - SLA Process PTT Ebanking: 'Tra soát chuyển khoản nội bộ- PTT' và 'Tra soát chuyển khoản nội bộ- PTT - NEO' = 1 ngày làm việc; 'Tra soát I2B - Billing/ TOP UP - PTT' và 'Tra soát I2B - Billing/ TOP UP - PTT - NEO' = 2 ngày làm việc.
   - SLA Process - PTT 247: Điều chỉnh nội dung = 2 ngày, Hỗ trợ nhờ thu = 2 ngày, Truy vấn trạng thái = 3 ngày, YC xác nhận báo có = 4 ngày làm việc.

THỐNG KÊ CHI TIẾT CÁC CASE BỊ LỆCH TARGET DATE:
1. Phân bố theo Quy trình: ${JSON.stringify(contextData.stats.byProcess)}
2. Phân bố theo Phân khúc (Segment): ${JSON.stringify(contextData.stats.bySegment)}
3. Khung giờ tạo case bị lệch: ${JSON.stringify(contextData.stats.byHour)}
4. Ngày trong tuần bị lệch: ${JSON.stringify(contextData.stats.byDay)}
5. Tạo vào ngày nghỉ/ngày lễ: ${JSON.stringify(contextData.stats.byHoliday)}
6. Top Sub-category có nhiều sai lệch nhất: ${JSON.stringify(Object.entries(contextData.stats.bySubCategory).sort((a: any, b: any) => b[1] - a[1]).slice(0, 15))}

MẪU CHI TIẾT 30 CASE TRỰC QUAN ĐỂ CHẨN ĐOÁN BUG:
${JSON.stringify(contextData.sample, null, 2)}

NHIỆM VỤ THỰC THI (TRÌNH BÀY BẰNG CÁC ĐẦU MỤC CHUYÊN NGHIỆP):
1. **CHẨN ĐOÁN PATTERNS KHÁI QUÁT**: Phân tích xem lỗi sai tập trung ở đâu (quy trình nào, phân khúc nào, mốc thời gian đặc biệt nào như ngày nghỉ Tết/Lễ, cuối tuần, ngoài giờ làm việc).
2. **KHOANH VÙNG BUG CODE & BẤT NHẤT LOGIC**: Tìm nguyên nhân tại sao Target Date thực tế lại khác Target Date mà hệ thống tính ra (Expected vs Actual). Hãy chẩn đoán kỹ xem:
   - Có phải do lệch định dạng ngày mùng 8/6 hay 9/6 hay do thuật toán cộng giờ làm việc?
   - Có phải do lệch tên Sub-category (khoảng trắng, ký tự đặc biệt, viết hoa thường, dấu gạch ngang) giữa dữ liệu thực và cấu hình trong file \`sla.ts\`/\`slaRules.ts\`?
3. **ĐỀ XUẤT CÁCH VÁ CODE (BUG WORKAROUNDS)**: Viết đề xuất sửa mã nguồn TypeScript cụ thể trong file \`src/lib/sla.ts\` hoặc \`src/lib/slaRules.ts\` để vá triệt để lỗi này.`;

    try {
      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      const text = result.text;
      setAnalysis(text);
      setChatMessages([{ role: 'assistant', content: text }]);
    } catch (e: any) {
      setAnalysis("Lỗi khi gọi AI phân tích: " + e.message);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isChatting) return;
    const userMsg = userInput;
    setUserInput('');
    setIsChatting(true);
    
    const newMessages = [...chatMessages, { role: 'user' as const, content: userMsg }];
    setChatMessages(newMessages);

    try {
      const contextData = getAnalysisContext(failedCases, totalCases);
      const systemPrompt = `Bạn là "MÁY DÒ SLA - Chuyên gia cao cấp về Service SLA & Chẩn đoán Bug Logic Hệ thống (SLA Auditor Specialist)" do nhà phát triển Daosweet2k chế tạo.
Vai trò của bạn là nhiệt tình thảo luận, hỗ trợ gỡ lỗi và phân tích các trường hợp sai lệch Target Date / SLA dựa trên dữ liệu hệ thống (code sla.ts và slaRules.ts).

LƯU Ý CỰC KỲ QUAN TRỌNG VỀ ĐỊNH DẠNG NGÀY THÁNG (LUÔN PHẢI TUÂN THEO ĐỂ TRÁNH TRẢ LỜI SAI):
- Toàn bộ thời gian hiển thị trong dữ liệu mẫu (sample) đã được ĐỊNH DẠNG RÕ RÀNG dạng chữ viết tiếng Việt, ví dụ: "Ngày 09 tháng 06 năm 2026 lúc 15:30". 
  + Hãy nhớ kỹ: "tháng 06" hoặc "tháng 6" là tháng sáu (June), "tháng 08" là tháng tám (August). 
  + Hãy tin tưởng 100% vào chuỗi chữ viết này để tránh nhầm ngày/tháng theo định dạng Mỹ!
- Ví dụ cụ thể:
  + "Ngày 08 tháng 06" là ngày mùng 8 tháng 6 năm 2026 (Ngày 8, Tháng 6). Tuyệt đối KHÔNG ĐƯỢC đọc thành ngày mùng 6 tháng 8.
  + "Ngày 09 tháng 06" là ngày mùng 9 tháng 6 năm 2026 (Ngày 9, Tháng 6). Tuyệt đối KHÔNG ĐƯỢC đọc thành ngày mùng 6 tháng 9.
- Luôn trả lời người dùng dựa trên việc quy chiếu ngày/tháng chính xác theo dạng chữ viết Việt Nam này. Tuyệt đối không nhầm lẫn với định dạng Mỹ MM/DD/YYYY.

PHẠM VI CHẨN ĐOÁN HIỆN TẠI:
- Tổng số ca: ${totalCases} 
- Số ca lệch Target Date: ${failedCases.length}

THỐNG KÊ CHI TIẾT CỦA FILE:
${JSON.stringify(contextData.stats)}

DỮ LIỆU MẪU CỦA ĐỢT KIỂM TRA:
${JSON.stringify(contextData.sample)}

HƯỚNG DẪN TRẢ LỜI:
- Luôn giữ vững phong thái của một chuyên gia cao cấp đầy kinh nghiệm về ngân hàng và hệ thống SLA quy mô lớn.
- Phát hiện xem có sự khác biệt giữa ký tự chuỗi String hay không (khoảng trắng, dấu gạch ngang, tiếng Việt có dấu) khiến regex hoặc hàm string normalizer không bắt trúng.
- Sử dụng Markdown có phân mục rõ ràng, sạch sẽ, chuyên nghiệp.`;

      const history = newMessages.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }]
      }));

      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...history
        ]
      });

      setChatMessages([...newMessages, { role: 'assistant', content: result.text }]);
    } catch (e: any) {
      setChatMessages([...newMessages, { role: 'assistant', content: "Có lỗi xảy ra: " + e.message }]);
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="p-8 bg-gradient-to-r from-emerald-600 to-teal-800 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <BrainCircuit className="w-32 h-32" />
          </div>
          <div className="relative z-10">
             <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
                <h2 className="text-2xl font-bold">máy dò SLA - Chuyên gia SLA & Săn Bug Hệ thống</h2>
             </div>
             <p className="text-emerald-100 max-w-2xl text-sm leading-relaxed">
               Phòng thí nghiệm chẩn đoán SLA. Chuyên phân tích nguyên nhân gốc rễ và săn tìm bug logic hệ thống, giúp đảm bảo SLA khớp chuẩn 100%. Được phát triển bởi Daosweet2k.
             </p>
          </div>
        </div>

        <div className="p-8">
          {!file ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 rounded-2xl py-16 bg-neutral-50 hover:bg-neutral-100/50 transition-colors group">
               <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-neutral-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-8 h-8 text-green-600" />
               </div>
               <h3 className="text-lg font-semibold text-neutral-800">Tải lên file dữ liệu bị sai Target Date</h3>
               <p className="text-neutral-500 text-sm mt-1 mb-6 text-center max-w-sm">
                 Công cụ sẽ tự lọc các case có cột <code className="bg-neutral-200 px-1 rounded">[Kết quả] Kiểm tra</code> là <span className="text-red-600 font-bold">"Sai"</span>.
               </p>
               
               <label className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 cursor-pointer shadow-sm transition-all active:scale-95">
                  Chọn File Phân Tích
                  <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
               </label>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg border shadow-sm">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-bold text-neutral-800">{file.name}</div>
                    <div className="text-xs text-neutral-500">Tìm thấy {failedCases.length} case sai / {totalCases} tổng cộng</div>
                  </div>
                </div>
                <button 
                  onClick={() => { setFile(null); setAnalysis(null); setFailedCases([]); setChatMessages([]); }}
                  className="text-sm font-medium text-neutral-500 hover:text-red-600 transition-colors"
                >
                  Thay đổi file
                </button>
              </div>

              {isProcessing && (
                <div className="flex flex-col items-center justify-center py-12 text-teal-600">
                  <Loader2 className="w-12 h-12 animate-spin mb-4" />
                  <p className="font-bold animate-pulse">AI Chuyên gia đang phân tích & săn lùng bug logic...</p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              {analysis && (
                <div className="animate-in fade-in duration-700 space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center justify-center text-center">
                        <TrendingUp className="w-6 h-6 text-red-500 mb-2" />
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Tỉ lệ sai</span>
                        <span className="text-3xl font-black text-neutral-800 mt-1">
                          {((failedCases.length / totalCases) * 100).toFixed(1)}%
                        </span>
                     </div>
                     <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center justify-center text-center">
                        <Search className="w-6 h-6 text-teal-500 mb-2" />
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Case được phân tích</span>
                        <span className="text-3xl font-black text-neutral-800 mt-1">{failedCases.length}</span>
                     </div>
                     <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center justify-center text-center">
                        <BrainCircuit className="w-6 h-6 text-emerald-500 mb-2" />
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Tương tác AI</span>
                        <span className="text-sm font-bold text-emerald-600 mt-1">Sẵn sàng phản hồi</span>
                     </div>
                  </div>

                  {/* Chat interface */}
                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
                    <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <BrainCircuit className="w-5 h-5 text-teal-600 animate-pulse" />
                          <span className="font-bold text-neutral-800">Hội ý với Chuyên gia SLA & Săn Bug Hệ thống</span>
                       </div>
                       <span className="px-2 py-1 bg-teal-100 text-teal-700 text-[10px] font-bold rounded uppercase">Auditor Mode Active</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-neutral-50/30">
                       {chatMessages.map((msg, i) => (
                         <div key={i} className={clsx(
                           "flex",
                           msg.role === 'user' ? "justify-end" : "justify-start"
                         )}>
                            <div className={clsx(
                              "max-w-[85%] rounded-2xl p-4 shadow-sm",
                              msg.role === 'user' 
                                ? "bg-teal-600 text-white rounded-tr-none" 
                                : "bg-white border text-neutral-800 rounded-tl-none"
                            )}>
                               <div className="prose prose-sm prose-neutral max-w-none prose-white">
                                  <Markdown>{msg.content}</Markdown>
                               </div>
                            </div>
                         </div>
                       ))}
                       {isChatting && (
                         <div className="flex justify-start">
                            <div className="bg-white border rounded-2xl p-4 rounded-tl-none shadow-sm flex items-center gap-2">
                               <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                               <span className="text-sm text-neutral-500 italic">Chuyên gia đang chẩn đoán & tra cứu code...</span>
                            </div>
                         </div>
                       )}
                    </div>

                    <div className="p-4 bg-white border-t border-neutral-200">
                       <div className="flex gap-2">
                          <input 
                            type="text" 
                            className="flex-1 px-4 py-3 bg-neutral-100 border-none rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm transition-all"
                            placeholder="Yêu cầu chuyên gia truy vết ca cụ thể, tìm bug code hoặc phân tích luật..."
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          />
                          <button 
                            onClick={handleSendMessage}
                            disabled={!userInput.trim() || isChatting}
                            className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                          >
                            Gửi
                          </button>
                       </div>
                       <p className="text-[10px] text-neutral-400 mt-2 text-center">Chuyên gia chẩn đoán dựa trên lịch thực tế của Việt Nam, mã nguồn hệ thống và phân tích dữ liệu đợt kiểm tra này.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
