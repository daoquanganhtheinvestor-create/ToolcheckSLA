import { addDays, isWeekend, set, format } from 'date-fns';
import { SLA_E2E_RULES } from './slaRules';

const VN_HOLIDAYS_DEFAULT = [
  // 2024
  '2024-01-01',
  '2024-02-08', '2024-02-09', '2024-02-12', '2024-02-13', '2024-02-14',
  '2024-04-18', 
  '2024-04-29', '2024-04-30', '2024-05-01', 
  '2024-09-02', '2024-09-03',
  // 2025
  '2025-01-01',
  '2025-01-27', '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', 
  '2025-04-07', 
  '2025-04-30', '2025-05-01', '2025-05-02', 
  '2025-09-01', '2025-09-02',
  // 2026
  '2026-01-01', '2026-01-02',
  '2026-02-13', '2026-02-14', '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23', '2026-02-24', 
  '2026-04-26', '2026-04-27', 
  '2026-04-30', '2026-05-01', '2026-05-02', '2026-05-03',
  '2026-09-01', '2026-09-02', '2026-09-03'
];

export const isHolidayOrWeekend = (date: Date): boolean => {
  if (isWeekend(date)) return true;
  const dateStr = format(date, 'yyyy-MM-dd');
  return VN_HOLIDAYS_DEFAULT.includes(dateStr);
};

export type ProcessingScope = 
  | 'Xử lý yêu cầu toàn phần' 
  | 'Xử lý yêu cầu 1 phần' 
  | 'Xử lý ngoài phạm vi' 
  | 'Yêu cầu ngoại lệ';

export const PROCESS_TYPES = [
  'SLA E2E',
  'SLA Process - 247 Tuyến 1',
  'SLA Process - 247 Tuyến 2',
  'SLA Process - TTT Tra soát',
  'SLA Process - RCC',
  'SLA Process - TTT Phát hành',
  'SLA Process - TTThe Đối soát',
  'SLA Process - TTT Cấu hình'
];

export interface SLAConfig {
  hours: number;
  label: string;
}

export const SLA_MATRIX: Record<ProcessingScope, Record<string, SLAConfig>> = {
  'Xử lý yêu cầu toàn phần': {
    'khcn': { hours: 8, label: '1 ngày làm việc' },
    'af': { hours: 4, label: '4 giờ làm việc' },
    'private': { hours: 4, label: '4 giờ làm việc' },
  },
  'Xử lý yêu cầu 1 phần': {
    'khcn': { hours: 24, label: '3 ngày làm việc' },
    'af': { hours: 16, label: '2 ngày làm việc' },
    'private': { hours: 16, label: '2 ngày làm việc' },
  },
  'Xử lý ngoài phạm vi': {
    'khcn': { hours: 4, label: '4 giờ làm việc' },
    'af': { hours: 2, label: '2 giờ làm việc' },
    'private': { hours: 2, label: '2 giờ làm việc' },
  },
  'Yêu cầu ngoại lệ': {
    'khcn': { hours: 16, label: '2 ngày làm việc' },
    'af': { hours: 8, label: '1 ngày làm việc' },
    'private': { hours: 8, label: '1 ngày làm việc' },
  }
};

const TTT_TRA_SOAT_MATRIX: Record<string, number> = {
  'Tra soát GD rút tiền tại ATM/CDM VPBank - Thẻ nội địa': 3,
  'Tra soát GD rút tiền tại ATM/CDM VPBank - Thẻ quốc tế': 3,
  'Tra soát thẻ nội địa - ATM ngân hàng khác': 6,
  'Tra soát thẻ nội địa - POS lần 1': 11,
  'Tra soát thẻ nội địa - POS lần 2': 6,
  'Tra soát thẻ nội địa - ECOM': 8,
  'Tra soát thẻ quốc tế - ATM ngân hàng khác': 46,
  'Tra soát thẻ quốc tế - Ecom/POS NH khác': 46,
  'Tra soát thẻ quốc tế - trục lợi Facebook': 46,
  'Tra soát thẻ VPB tại ĐVCNT Ecom/POS VPBank': 46,
  'Tra soát GD nộp tiền tại CDM': 2,
  'Tra soát GD ck nhanh 24/7 NAPAS - Điều chỉnh nội dung': 2,
  'Tra soát GD ck nhanh 24/7 NAPAS - Hỗ trợ nhờ thu': 2,
  'Tra soát GD ck nhanh 24/7 NAPAS - Truy vấn trạng thái GD': 3,
  'Tra soát GD ck nhanh 24/7 NAPAS - YC xác nhận báo có': 4,
  'Tra soát I2B - Billing/ TOP UP - TTT': 8,
  'Tra soát thẻ quốc tế - lần 2': 46,
};

const TUYEN_2_4H_SUBCATS = [
  'Tra soát GD nộp tiền tại CDM',
  'Tra soát I2B - chuyển khoản nội bộ sang thẻ TD',
  'Tra soát GD ck nhanh 24/7 NAPAS - Truy vấn trạng thái GD',
  'Tra soát quá hạn SLA - CRU',
  'Tra soát thẻ nội địa - ATM ngân hàng khác',
  'Tra soát GD rút tiền tại ATM/CDM VPBank - Thẻ nội địa',
  'Tra soát thẻ nội địa - ECOM',
  'Tra soát thẻ nội địa - POS lần 1',
  'Tra soát thẻ quốc tế - ATM ngân hàng khác',
  'Tra soát GD rút tiền tại ATM/CDM VPBank - Thẻ quốc tế',
  'Tra soát thẻ quốc tế - Ecom/POS NH khác',
  'Tra soát thẻ quốc tế - lần 2',
  'Tra soát thẻ quốc tế - trục lợi Facebook',
  'Tra soát thẻ VPB tại ĐVCNT Ecom/POS VPBank',
  'Tra soát GD ck nhanh 24/7 NAPAS – Điều chỉnh nội dung',
  'Tra soát GD ck nhanh 24/7 NAPAS – YC xác nhận báo có',
  'Tra soát thẻ nội địa – POS lần 2',
  'Tra soát GD ck nhanh 24/7 NAPAS – Hỗ trợ nhờ thu',
  'Tra soát I2B - Billing/ TOP UP - TTT',
  'Cung cấp dư nợ chưa chính xác',
  'Nhắc nợ sai chủ HĐ- kênh Call',
  'Nhắc nợ sai chủ HĐ- kênh Email',
  'Phàn nàn nhắc nợ tự động trước hạn',
  'Phàn nàn thái độ nhân viên thu hồi nợ',
  'Quy trình thực hiện lâu/ phức tạp/ không hợp lý',
  'SMS- nội dung nhắc nợ không rõ ràng/không chính xác',
  'SMS/Email sai chủ tài khoản',
  'Thực hiện không đúng yêu cầu KH',
  'Tư vấn thông tin không đầy đủ/không chính xác'
];

const normalizeStr = (s: string) => {
  if (!s) return '';
  return s.normalize('NFD') // Tách dấu
    .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
    .toLowerCase()
    .replace(/[đĐ]/g, 'd')
    .replace(/[–—−⁃－⁻−⎯‑‒]|&ndash;|&mdash;/g, '-') // Chuẩn hóa gạch ngang
    .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng
    .trim();
};

const flattenForCompare = (s: string) => {
  const norm = normalizeStr(s);
  // Remove all non-alphanumeric, just keep letters and numbers for maximum matching
  return norm.replace(/[^a-z0-9]/g, '');
};

const getMappedSegment = (seg: string, subseg: string = '') => {
  const s = normalizeStr(seg || '');
  const ss = normalizeStr(subseg || '');
  
  if (s.includes('private')) return 'private';
  
  // AF and its sub-segments (Elite, Preferred, Platinum, Diamond, Special)
  // BUT NOT MAF.
  if (s.includes('af') || s.includes('affluent') || s.includes('diamond')) {
      // If it also contains MAF, it's NOT AF (as per user: "MAF ... khác AF")
      if (s.includes('maf')) return 'khcn';
      return 'af';
  }
  
  if (ss.includes('elite') || ss.includes('preferred') || ss.includes('special')) return 'af';

  // MAF, MASS and their sub-segments (MEGA, CHAMPION, TITANIUM) are now KHCN
  return 'khcn';
};

export const getSLAConfig = (scope: ProcessingScope, segment: string, subSegment: string = ''): SLAConfig => {
  const mapped = getMappedSegment(segment, subSegment);
  return SLA_MATRIX[scope]?.[mapped] || { hours: 24, label: '3 ngày làm việc' };
};

const getNextWorkingTime = (date: Date, addLog?: (msg: string, icon?: string) => void): Date => {
  let d = new Date(date);
  
  if (isHolidayOrWeekend(d)) {
    if (addLog) addLog(`Ngày ${format(d, 'dd/MM/yyyy')} là ngày nghỉ/lễ. Đang tìm ngày làm việc tiếp theo...`, '🌴');
    while (isHolidayOrWeekend(d)) {
      d = addDays(d, 1);
      d = set(d, { hours: 8, minutes: 30, seconds: 0, milliseconds: 0 });
    }
    if (addLog) addLog(`Đã chuyển sang ngày làm việc: ${format(d, 'dd/MM/yyyy')}`, '🌅');
  }

  const h = d.getHours();
  const m = d.getMinutes();
  const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  
  if (timeStr < '08:30') {
    return set(d, { hours: 8, minutes: 30, seconds: 0, milliseconds: 0 });
  } else if (timeStr >= '12:00' && timeStr < '13:30') {
    if (addLog) addLog(`Đang trong giờ nghỉ trưa (12:00-13:30). Đẩy sang 13:30.`, '🍱');
    return set(d, { hours: 13, minutes: 30, seconds: 0, milliseconds: 0 });
  } else if (timeStr >= '18:00') {
    if (addLog) addLog(`Hết giờ làm việc (sau 18:00). Đẩy sang 08:30 ngày làm việc tiếp theo.`, '🌇');
    let nextDay = addDays(d, 1);
    while (isHolidayOrWeekend(nextDay)) {
      nextDay = addDays(nextDay, 1);
    }
    return set(nextDay, { hours: 8, minutes: 30, seconds: 0, milliseconds: 0 });
  }
  return d;
};

export type SLAInfo = {
  unit: 'day' | 'hour' | 'none';
  value: number;
  label: string;
};

export const parseSLA = (raw: string | number | undefined, defaultSLA?: SLAInfo): SLAInfo => {
  if (raw === undefined || raw === null || raw === '') {
    return defaultSLA || { unit: 'none', value: 0, label: 'Chưa xác định' };
  }
  const s = String(raw).toLowerCase().normalize('NFC').trim();
  if (s.includes('không xét')) {
    return { unit: 'none', value: 0, label: 'Không xét' };
  }
  if (s.includes('chưa có rule') || s.includes('chua co rule')) {
    return { unit: 'none', value: 0, label: 'Chưa có rule' };
  }
  if (s.includes('giờ') || s.includes('tiếng')) {
    const match = s.match(/[\d.]+/);
    if (match) {
        return { unit: 'hour', value: parseFloat(match[0]), label: `${match[0]} giờ làm việc` };
    }
  }
  // Try to match number, defaulting to days
  const match = s.match(/[\d.]+/);
  if (match) {
      const val = parseFloat(match[0]);
      if (s.includes('ngày') || (!s.includes('giờ') && !s.includes('tiếng'))) {
          // Nếu là số lẻ dạng 0.5 (ngày), convert luôn sang giờ (1 ngày = 8 giờ làm việc)
          if (val % 1 !== 0) {
            const hours = val * 8;
            return { unit: 'hour', value: hours, label: `${hours} giờ làm việc` };
          }
          return { unit: 'day', value: val, label: `${val} ngày làm việc` };
      }
  }
  return defaultSLA || { unit: 'day', value: 1, label: '1 ngày làm việc' };
}

export interface ExplanationStep {
  icon: string;
  text: string;
  isHighlight?: boolean;
}

export interface CalculationResult {
  reference: string;
  startDate: Date;
  slaLabel: string;
  slaValue: number;
  targetDate: Date | null;
  explanation: ExplanationStep[];
}

export const PROCESS_WITH_ASSIGN_DATE = [
  'SLA Process - 247 Tuyến 2',
  'SLA Process - RCC',
  'SLA Process - TTT Phát hành',
  'SLA Process - TTThe Đối soát',
  'SLA Process - TTT Cấu hình',
  'SLA Process - TTT Tra soát'
];

export const calculateTargetDate = (params: {
  reference: string;
  createdDate: Date;
  processType: string;
  scope?: ProcessingScope;
  segment?: string;
  subSegment?: string;
  subcategory?: string;
  e2eSlaStr?: string | number;
  source?: string;
  type?: string;
  category?: string;
  processingUnit?: string;
  responsibleUnit?: string;
  reason?: string;
  title?: string;
  aptCode?: string;
  assignDate?: Date;
}): CalculationResult => {
  const { reference, createdDate, processType, scope, segment, subSegment, subcategory, e2eSlaStr,
          source, type, category, processingUnit, responsibleUnit, reason, title, aptCode, assignDate } = params;
  const explanation: ExplanationStep[] = [];

  const addLog = (msg: string, icon: string = '🔹', isHighlight: boolean = false) => {
    explanation.push({ text: msg.replace(/^- /, ''), icon, isHighlight });
  };

  addLog(`Bắt đầu tính Target Date cho Mã yêu cầu: ${reference}`, '🚀', true);
  addLog(`Thời gian tạo (Created Date): ${format(createdDate, 'HH:mm, dd/MM/yyyy')}`, '📅');
  if (assignDate && PROCESS_WITH_ASSIGN_DATE.includes(processType)) {
    addLog(`Ngày assign: ${format(assignDate, 'HH:mm, dd/MM/yyyy')}`, '⏳');
  }
  addLog(`Process Type: ${processType}`, '⚙️');
  if (source) addLog(`Nguồn tạo: ${source}`, '📥');
  if (type) addLog(`Type: ${type}`, '🏷️');
  if (category) addLog(`Category: ${category}`, '🗂️');
  if (subcategory) addLog(`Sub-category: ${subcategory}`, '📂');
  if (segment) addLog(`Segment: ${segment}`, '👥');
  if (subSegment) addLog(`Sub-segment: ${subSegment}`, '🎖️');
  if (processingUnit) addLog(`Đơn vị xử lý: ${processingUnit}`, '🏢');
  if (responsibleUnit) addLog(`Đơn vị chịu trách nhiệm: ${responsibleUnit}`, '🛡️');
  if (reason) addLog(`Nguyên nhân: ${reason}`, '❓');
  if (title) addLog(`Tiêu đề: ${title}`, '📌');
  if (aptCode) addLog(`APT Code: ${aptCode}`, '🔑');
  if (e2eSlaStr) addLog(`Dữ liệu SLA từ cột E2E gốc: ${e2eSlaStr}`, '📊');

  let startDate: Date = createdDate;
  let targetDate: Date | null = createdDate;
  let slaInfo: SLAInfo = { unit: 'none', value: 0, label: 'Chưa xác định' };
  
  const seg = normalizeStr(segment || '');
  const subSeg = normalizeStr(subSegment || '');
  const subCat = normalizeStr(subcategory || '');
  const procUnit = normalizeStr(processingUnit || '');
  const respUnit = normalizeStr(responsibleUnit || '');
  const titleNorm = normalizeStr(title || '');
  const aptNorm = normalizeStr(aptCode || '');
  
  // 1. Kiểm tra Rule "Không xét" áp dụng chung hoặc ưu tiên cao nhất
  let isNone = false;
  
  const lookupE2ESla = () => {
      let hitRule = false;
      let matchedSla: string | number | undefined = undefined;

      const mappedSeg = getMappedSegment(segment, subSegment);
      let colIdx = 6;
      
      const s = normalizeStr(segment || '');
      const ss = normalizeStr(subSegment || '');

      if (mappedSeg === 'private') {
        colIdx = ss.includes('official') ? 0 : 1;
      } else if (mappedSeg === 'af') {
        if (ss.includes('elite') || ss.includes('private')) colIdx = 2;
        else if (ss.includes('preferred')) colIdx = 3;
        else colIdx = 4; // Special
      } else if (s.includes('maf')) {
        colIdx = 5;
      } else {
        colIdx = 6; // Mass / KHCN
      }

      const normSource = normalizeStr(source || '');
      const normReason = normalizeStr(reason || '');

      for (const rule of SLA_E2E_RULES) {
         let isMatch = false;
         if (rule.conditions.subCategory && rule.conditions.subCategory.some(v => subCat === normalizeStr(v))) isMatch = true;
         if (!isMatch && rule.conditions.processingUnit && rule.conditions.processingUnit.some(v => procUnit.includes(normalizeStr(v)))) isMatch = true;
         if (!isMatch && rule.conditions.responsibleUnit && rule.conditions.responsibleUnit.some(v => respUnit.includes(normalizeStr(v)))) isMatch = true;
         if (!isMatch && rule.conditions.title && rule.conditions.title.some(v => titleNorm.includes(normalizeStr(v)))) isMatch = true;
         if (!isMatch && rule.conditions.aptCode && rule.conditions.aptCode.some(v => aptNorm.includes(normalizeStr(v)))) isMatch = true;
         if (!isMatch && rule.conditions.source && rule.conditions.source.some(v => normSource.includes(normalizeStr(v)))) isMatch = true;
         if (!isMatch && rule.conditions.reason && rule.conditions.reason.some(v => normReason.includes(normalizeStr(v)))) isMatch = true;

         // if empty conditions, it's the catch-all
         if (Object.keys(rule.conditions).length === 0) {
            isMatch = true;
         }

         if (isMatch) {
            hitRule = true;
            matchedSla = rule.slas[colIdx];
            addLog(`Tìm thấy rule E2E: "${rule.name}" => Mức SLA: ${matchedSla}`, '🎯', true);
            break;
         }
      }

      let resSlaInfo: SLAInfo;
      let resIsNone = false;
      if (hitRule && matchedSla !== undefined) {
         if (String(matchedSla).toLowerCase().includes('không xét')) {
             resSlaInfo = { unit: 'none', value: 0, label: 'Không xét' };
             resIsNone = true;
         } else {
             resSlaInfo = parseSLA(matchedSla);
         }
      } else {
         addLog(`- Không tìm thấy rule đặc thù cho Sub-category này.`, 'ℹ️');
         if (processType !== 'SLA E2E' && scope === 'Xử lý ngoài phạm vi') {
             addLog(`- Phát hiện loại "Ngoài phạm vi": SLA mặc định 1 ngày làm việc.`, '📌');
             resSlaInfo = { unit: 'day', value: 1, label: '1 ngày làm việc' };
         } else {
             resSlaInfo = parseSLA(e2eSlaStr, { unit: 'none', value: 0, label: `Chưa có rule E2E` });
             if (resSlaInfo.label === 'Chưa có rule E2E') resIsNone = true;
         }
      }
      return { slaInfo: resSlaInfo, hitRule, matchedSla, isNone: resIsNone };
  };
  
  if (processType === 'SLA E2E') {
      const e2eResult = lookupE2ESla();
      slaInfo = e2eResult.slaInfo;
      isNone = e2eResult.isNone;
  } else {
    // 1. Kiểm tra Rule "Không xét" CHỈ áp dụng cho E2E theo yêu cầu user
    if (processType !== 'SLA E2E') {
       isNone = false; 
    } else {
       if (
         procUnit.includes('phap che') || respUnit.includes('phap che') ||
         procUnit.includes('phong chong gian lan') || respUnit.includes('phong chong gian lan') ||
         procUnit.includes('kiem tra tuan thu') || respUnit.includes('kiem tra tuan thu') ||
         procUnit.includes('phong chong rua tien') || respUnit.includes('phong chong rua tien') ||
         aptNorm === 'dtgl' || aptNorm === 'kstt' || aptNorm === 'cic' ||
         subCat === 'cic' ||
         titleNorm.includes('follow') || titleNorm.includes('issue')
       ) {
         addLog(`Hit rule E2E: Không xét (Pháp chế / Rủi ro / APT / Title đặc biệt / CIC...)`, '⛔', true);
         slaInfo = { unit: 'none', value: 0, label: 'Không xét' };
         isNone = true;
       }
    }

    if (!isNone) {
      if (processType === 'SLA Process - 247 Tuyến 1') {
        const finalScope = scope || 'Xử lý yêu cầu toàn phần';
        const mappedSeg = getMappedSegment(segment, subSegment);
        
        const config = getSLAConfig(finalScope, segment, subSegment);
        addLog(`Phân loại Tuyến 1:`, '🔍', true);
        addLog(`- Phạm vi xử lý (Scope): ${finalScope}`, '🎯');
        addLog(`- Phân khúc khách hàng (Segment): ${segment || 'N/A'} (Phân loại: ${mappedSeg.toUpperCase()})`, '👥');
        addLog(`- Quy định SLA: ${config.label}`, '✅');
        
        // Căn cứ vào label để quyết định unit
        const isDay = config.label.includes('ngày');
        slaInfo = { 
          unit: isDay ? 'day' : 'hour', 
          value: isDay ? (config.hours / 8) : config.hours, 
          label: config.label 
        };
      } else if (processType === 'SLA Process - TTT Tra soát') {
      const subCatVal = subcategory || '';
      const flatSubCat = flattenForCompare(subCatVal);
      addLog(`(TTT Tra soát) Kiểm tra mapping Sub-category CRM...`, '🔍');
      addLog(`- Sub-category: "${subCatVal || 'Trống'}"`, '⚙️');
      
      let days: number | null = null;
      let matchedKey = '';
      
      if (!flatSubCat) {
          addLog(`Lỗi: Không tìm thấy giá trị Sub-category để tra cứu rule Tra soát.`, '❌', true);
      } else {
          for (const [key, val] of Object.entries(TTT_TRA_SOAT_MATRIX)) {
            if (flatSubCat === flattenForCompare(key)) {
              days = val;
              matchedKey = key;
              break;
            }
          }
      }
      if (days !== null) {
        addLog(`Tìm thấy Rule Tra soát khớp: "${matchedKey}"`, '✅', true);
        addLog(`- Thời hạn: ${days} ngày làm việc`, '🕒');
        slaInfo = { unit: 'day', value: days, label: `${days} ngày làm việc` };
      } else {
        slaInfo = { unit: 'none', value: 0, label: 'Chưa có rule Tra soát' };
        isNone = true;
        if (flatSubCat) {
          addLog(`Không tìm thấy rule khớp cho Sub-category Tra soát này.`, '⚠️', true);
        }
      }
    } else if (processType === 'SLA Process - 247 Tuyến 2') {
      const normSubCat = normalizeStr(subcategory || '');
      let is4h = false;
      let matchedSub4h = '';
      addLog(`(Tuyến 2) Kiểm tra Rule ưu tiên 4h cho Sub-category...`, '🔍');
      for (const sub of TUYEN_2_4H_SUBCATS) {
        if (normSubCat === normalizeStr(sub)) {
          is4h = true;
          matchedSub4h = sub;
          break;
        }
      }
      
      if (is4h) {
        addLog(`Xác nhận: Thuộc danh mục ƯU TIÊN 4H.`, '✅', true);
        addLog(`- Khớp với: "${matchedSub4h}"`, '📌');
        slaInfo = { unit: 'hour', value: 4, label: '4 giờ làm việc' };
      } else {
        addLog(`Xác nhận: Không thuộc danh mục ưu tiên 4h.`, 'ℹ️');
        addLog(`- Thực hiện lấy SLA dựa trên quy định phân bổ của SLA E2E...`, '🔍');
        const e2eResult = lookupE2ESla();
        slaInfo = e2eResult.slaInfo;
        isNone = e2eResult.isNone;
        if (!e2eResult.hitRule) {
           addLog(`Cảnh báo: Không tìm thấy rule E2E tương ứng. Không áp dụng SLA mặc định.`, '⚠️');
           slaInfo = { unit: 'none', value: 0, label: 'Chưa có rule E2E (Tuyến 2)' };
           isNone = true;
        }
      }
    } else if (processType.includes('RCC')) {
      const mappedSeg = getMappedSegment(segment, subSegment);
      addLog(`(SLA RCC) Phân loại theo Phân khúc khách hàng:`, '👥');
      if (mappedSeg === 'af' || mappedSeg === 'private') {
        addLog(`- Khách hàng thuộc phân khúc: ${mappedSeg.toUpperCase()}. Quy định SLA: 5 giờ làm việc.`, '✅');
        slaInfo = { unit: 'hour', value: 5, label: '5 giờ làm việc' };
      } else {
        addLog(`- Khách hàng thuộc phân khúc: KHCN/Mass. Quy định SLA: 10 giờ làm việc.`, '✅');
        slaInfo = { unit: 'hour', value: 10, label: '10 giờ làm việc' };
      }
    } else if (processType.includes('Cấu hình')) {
      const mappedSeg = getMappedSegment(segment, subSegment);
      addLog(`(SLA TTThe Cấu hình) Phân loại theo Phân khúc khách hàng:`, '👥');
      if (mappedSeg === 'af' || mappedSeg === 'private') {
        addLog(`- Khách hàng thuộc phân khúc: ${mappedSeg.toUpperCase()}. Quy định SLA: 1 ngày làm việc.`, '✅');
        slaInfo = { unit: 'day', value: 1, label: '1 ngày làm việc' };
      } else {
        addLog(`- Khách hàng thuộc phân khúc: KHCN/Mass. Quy định SLA: 2 ngày làm việc.`, '✅');
        slaInfo = { unit: 'day', value: 2, label: '2 ngày làm việc' };
      }
    } else if (processType.includes('Phát hành')) {
      const subCatNorm = normalizeStr(subcategory || '');
      const allowedSubCats = [
        'chua nhan duoc pin',
        'chua nhan duoc the',
        'chua nhan duoc pin the',
        'thay doi dia chi nhan the'
      ];
      
      const isAllowed = allowedSubCats.some(allowed => subCatNorm.includes(allowed));
      
      if (isAllowed) {
        const mappedSeg = getMappedSegment(segment, subSegment);
        addLog(`(SLA TTThe Phát hành) Sub-category hợp lệ: "${subcategory}". Phân loại theo Phân khúc:`, '👥');
        if (mappedSeg === 'af' || mappedSeg === 'private') {
          addLog(`- Phân khúc: ${mappedSeg.toUpperCase()}. Quy định SLA: 3 ngày làm việc.`, '✅');
          slaInfo = { unit: 'day', value: 3, label: '3 ngày làm việc' };
        } else {
          addLog(`- Phân khúc: KHCN/Mass. Quy định SLA: 4 ngày làm việc.`, '✅');
          slaInfo = { unit: 'day', value: 4, label: '4 ngày làm việc' };
        }
      } else {
        addLog(`(SLA TTThe Phát hành) Sub-category "${subcategory}" không nằm trong danh mục áp dụng SLA cụ thể.`, '⚠️');
        slaInfo = { unit: 'none', value: 0, label: 'Chưa xác định' };
        isNone = true;
      }
    } else if (processType.includes('Đối soát')) {
      const subCatNorm = normalizeStr(subcategory || '');
      addLog(`(SLA TTThe Đối soát) Kiểm tra Sub-category: "${subcategory}"`, '🔍');
      
      const hours6List = [
        'tu van tra gop doi tac',
        'phat hanh lai the pin', // normalizeStr removes /
        'mail xu ly',
        'tinh trang the chua duoc dieu chinh dung',
        'phi sms',
        'tang giam hmctn',
        'hoan tien tinh nang the',
        'tra gop ngoai le da tt minpay',
        'tu van tra gop ngoai kenh doi tac'
      ];
      
      const is6Hours = hours6List.some(rule => subCatNorm.includes(rule));
      
      if (is6Hours) {
        addLog(`- Thuộc nhóm SLA: 6 giờ làm việc.`, '✅');
        slaInfo = { unit: 'hour', value: 6, label: '6 giờ làm việc' };
      } else {
        addLog(`- Thuộc nhóm SLA mặc định: 14 giờ làm việc.`, '✅');
        slaInfo = { unit: 'hour', value: 14, label: '14 giờ làm việc' };
      }
    } else {
      addLog(`Cảnh báo: Loại quy trình (Process Type) lạ: "${processType}".`, '⚠️');
      slaInfo = { unit: 'none', value: 0, label: 'Chưa xác định quy trình' };
      isNone = true;
    }
  }
}

addLog(`SLA được chuyển đổi hệ thống: [Unit: ${slaInfo.unit.toUpperCase()}, Value: ${slaInfo.value}] - "${slaInfo.label}"`, '⚙️', true);

  if (slaInfo.label.startsWith('Chưa có rule') || slaInfo.label.startsWith('Chưa xác định')) {
    startDate = new Date(createdDate);
    targetDate = null;
    addLog(`Vì không tìm thấy rule trong bộ quy định, không thể xác định Target Date.`, '🛑');
  } else if (slaInfo.label === 'Không xét') {
    startDate = new Date(createdDate);
    targetDate = new Date(2100, 0, 1, 0, 0, 0); // 01/01/2100
    addLog(`Vì SLA = "Không xét", Target Date tự động gán là Target Max: 01/01/2100.`, '🛑');
  } else if (slaInfo.unit === 'day') {
    // Logic của SLA theo NGÀY
    let d = new Date(createdDate);
    if (PROCESS_WITH_ASSIGN_DATE.includes(processType) && assignDate) {
      d = new Date(assignDate);
      addLog(`Sử dụng 'Ngày assign' làm mốc bắt đầu tính Target Date.`, '⏱️');
    }
    
    let isAfter830 = false;
    let effectiveStartDay = new Date(d);

    if (isHolidayOrWeekend(d)) {
      addLog(`Ngày tạo (${format(d, 'dd/MM/yyyy')}) là ngày nghỉ. Đẩy sang ngày làm việc kế tiếp.`, '🌴');
      while (isHolidayOrWeekend(effectiveStartDay)) {
        effectiveStartDay = addDays(effectiveStartDay, 1);
      }
      isAfter830 = false; // Coi như đầu giờ sáng
      addLog(`Ngày T (Ngày làm việc bắt đầu) được tính là: ${format(effectiveStartDay, 'dd/MM/yyyy')}, ghi nhận mốc < 08:30 sáng.`, '🌅');
      startDate = set(effectiveStartDay, { hours: 8, minutes: 30, seconds: 0, milliseconds: 0 });
    } else {
      const timeNum = d.getHours() * 60 + d.getMinutes();
      if (timeNum >= 8 * 60 + 30) {
        isAfter830 = true;
        addLog(`Tạo lúc ${format(d, 'HH:mm')} (>= 08:30) trong ngày T (${format(d, 'dd/MM/yyyy')}).`, '⏰');
      } else {
        isAfter830 = false;
        addLog(`Tạo lúc ${format(d, 'HH:mm')} (< 08:30) trong ngày T (${format(d, 'dd/MM/yyyy')}).`, '🌅');
      }
      
      if (timeNum < 8 * 60 + 30) {
        startDate = set(d, { hours: 8, minutes: 30, seconds: 0, milliseconds: 0 });
      } else {
        startDate = d; // starts strictly at creation if >= 8:30
      }
    }

    let workingDaysToAdd = slaInfo.value - 1;
    if (isAfter830) {
      workingDaysToAdd += 1;
      addLog(`Vì ghi nhận khối lượng sau 08:30 sáng, cần xử lý dời sang hạn của ngày T + ${workingDaysToAdd}.`, '➕');
    } else {
      addLog(`Vì ghi nhận trước 08:30 sáng, chốt hạn trong ngày T + ${workingDaysToAdd}.`, '✔️');
    }

    let count = 0;
    targetDate = new Date(effectiveStartDay);
    while (count < workingDaysToAdd) {
      targetDate = addDays(targetDate, 1);
      if (!isHolidayOrWeekend(targetDate)) {
        count++;
      } else {
        addLog(`Ngày ${format(targetDate, 'dd/MM/yyyy')} là ngày nghỉ/lễ. Không tính vào SLA.`, '🌴');
      }
    }
    targetDate = set(targetDate, { hours: 18, minutes: 0, seconds: 0, milliseconds: 0 });
    addLog(`[Logic Ngày] Thời gian đóng case sẽ tính vào tròn 18h của ngày làm việc (theo thiết lập).`, '🌇');
    addLog(`Đã tính ra Target Date: ${format(targetDate, 'HH:mm, dd/MM/yyyy')}.`, '🎯', true);

  } else {
    // Logic của SLA theo POINT-IN-TIME (Giờ)
    let d = new Date(createdDate);
    if (PROCESS_WITH_ASSIGN_DATE.includes(processType) && assignDate) {
      d = new Date(assignDate);
      addLog(`Sử dụng 'Ngày assign' làm mốc bắt đầu tính Target Date.`, '⏱️');
    }

    startDate = getNextWorkingTime(d, addLog);
    addLog(`[Logic Giờ] Start Date được đưa về trong khung giờ làm việc: ${format(startDate, 'HH:mm, dd/MM/yyyy')}.`, '⏳');

    targetDate = new Date(startDate);
    let remainingHours = slaInfo.value;
    
    while (remainingHours > 0) {
      targetDate = getNextWorkingTime(targetDate, addLog);
      const th = targetDate.getHours();
      const tm = targetDate.getMinutes();
      
      let hoursToNoon = (12 - th) - (tm / 60);
      if (th >= 13) hoursToNoon = 0;
      
      let hoursToEOD = (18 - th) - (tm / 60);
      if (th < 13) hoursToEOD = 0;

      if (th < 12) {
        if (remainingHours <= hoursToNoon) {
          targetDate = new Date(targetDate.getTime() + remainingHours * 60 * 60 * 1000);
          remainingHours = 0;
        } else {
          targetDate = set(targetDate, { hours: 13, minutes: 30 });
          remainingHours -= hoursToNoon;
        }
      } else {
        if (remainingHours <= hoursToEOD) {
          targetDate = new Date(targetDate.getTime() + remainingHours * 60 * 60 * 1000);
          remainingHours = 0;
        } else {
          targetDate = addDays(targetDate, 1);
          while (isHolidayOrWeekend(targetDate)) {
            targetDate = addDays(targetDate, 1);
          }
          targetDate = set(targetDate, { hours: 8, minutes: 30 });
          remainingHours -= hoursToEOD;
        }
      }
    }
    addLog(`[Logic Giờ] Đã tính dồn đúng số giờ. Target Date: ${format(targetDate, 'HH:mm, dd/MM/yyyy')}`, '🎯', true);
  }

  return {
    reference,
    startDate,
    slaLabel: slaInfo.label,
    slaValue: slaInfo.value,
    targetDate,
    explanation
  };
};
