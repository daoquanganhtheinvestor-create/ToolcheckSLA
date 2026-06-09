import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { calculateTargetDate, ProcessingScope } from '../lib/sla';
import { format, differenceInMinutes } from 'date-fns';
import clsx from 'clsx';

function normalizeHeader(h: string) {
  if (!h) return '';
  return h.toLowerCase()
    .normalize('NFC')
    .replace(/^\ufeff/, '') // Remove BOM
    .replace(/[_\s\-\/]/g, '')
    .trim();
}

type RowData = Record<string, any>;

interface BatchResult {
  row: RowData;
  rowIndex: number;
  reference: string;
  expectedTargetDate: Date | null;
  actualTargetDate: Date | null;
  detectedProcessType: string;
  originalProcessType: string;
  isCorrect: boolean;
  isValid: boolean;
  errorMessage?: string;
  updateTargetDateStr: string;
  shortExplanation: string;
  explanationSteps?: any[];
  targetResponseMinutes?: string;
}

export default function BatchSlaCheckTab() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [stats, setStats] = useState({ total: 0, correct: 0, wrong: 0, invalid: 0 });
  const [pivotStats, setPivotStats] = useState<Record<string, number>>({});
  const [invalidBreakdown, setInvalidBreakdown] = useState({
     emptyOrSummary: 0,
     missingMilestone: 0,
     missingCreatedDate: 0,
     undefinedRule: 0,
     otherError: 0
  });

  // Fallback parsing date
  const parseDateFallback = (val: any): Date | undefined => {
    if (!val) return undefined;
    if (val instanceof Date) {
        return isNaN(val.getTime()) ? undefined : val;
    }
    
    if (typeof val === 'number') {
        if (val > 10000) {
           const d = new Date((val - (25567 + 1)) * 86400 * 1000);
           return isNaN(d.getTime()) ? undefined : d;
        }
    }
    
    // String based
    const s = String(val).trim();
    if (!s) return undefined;
    
    // Try DD/MM/YYYY HH:mm or DD/MM/YYYY or DD-MM-YYYY
    // Also handle possible comma after time or date like "00:02, 30/04/2026"
    const sClean = s.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    
    const dmTMatch = sClean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?(?::(\d{1,2}))?/);
    if (dmTMatch) {
        const h = dmTMatch[4] ? parseInt(dmTMatch[4], 10) : 0;
        const m = dmTMatch[5] ? parseInt(dmTMatch[5], 10) : 0;
        const sec = dmTMatch[6] ? parseInt(dmTMatch[6], 10) : 0;
        return new Date(parseInt(dmTMatch[3], 10), parseInt(dmTMatch[2], 10) - 1, parseInt(dmTMatch[1], 10), h, m, sec);
    }

    const tDmMatch = sClean.match(/^(\d{1,2}):(\d{1,2})(?:[:\s]+)(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (tDmMatch) {
       return new Date(parseInt(tDmMatch[5], 10), parseInt(tDmMatch[4], 10) - 1, parseInt(tDmMatch[3], 10), parseInt(tDmMatch[1], 10), parseInt(tDmMatch[2], 10));
    }
    
    // Fallback: standard JS parse
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    
    return undefined;
  };

  const [selectedResult, setSelectedResult] = useState<BatchResult | null>(null);

  const processFile = async (selectedFile: File) => {
    setIsProcessing(true);
    setResults([]);
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(data), { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json: RowData[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (json.length === 0) {
        alert('File không có dữ liệu');
        setIsProcessing(false);
        return;
      }

      // Map raw rows to parsed data
      // Use header finding strategy
      const firstRow = json[0];
      const keys = Object.keys(firstRow);
      
      const getVal = (row: RowData, ...possibleNames: string[]) => {
         const normalizedPossibleNames = possibleNames.map(pn => normalizeHeader(pn));
         
         // Priority 1: Exact matches in order of possibleNames
         for (const npn of normalizedPossibleNames) {
            for (const key of keys) {
               if (normalizeHeader(key) === npn) {
                  return row[key];
               }
            }
         }

         // Priority 2: Fuzzy matches (header contains potential name) in order of possibleNames
         for (const npn of normalizedPossibleNames) {
            if (!npn) continue;
            for (const key of keys) {
               const h = normalizeHeader(key);
               if (h && h.includes(npn)) {
                  return row[key];
               }
            }
         }
         return null;
      };

      let correct = 0;
      let wrong = 0;
      let invalid = 0;
      let emptyOrSummary = 0;
      let missingMilestone = 0;
      let missingCreatedDate = 0;
      let undefinedRule = 0;
      let otherError = 0;

      const parsedResults: BatchResult[] = [];
      const pivot: Record<string, number> = {};

      json.forEach((row, idx) => {
         const reference = String(getVal(row, 'Mã yêu cầu', 'Mã YC', 'Case Number', 'Reference', 'CaseNumber') || '').trim();
         
         // Skip empty rows or summary rows and count them as invalid for statistics consistency
         if (!reference || reference.toLowerCase().includes('tổng cộng') || reference.toLowerCase() === 'null') {
            invalid++;
            emptyOrSummary++;
            return;
         }

         // Priority for milestone columns
         let pt = ''; let processTypeLower = ''; let detectedLabel = ''; const originalProcessTypeVal = getVal(row, 'Cột mốc', 'Tiến độ mốc', 'Mốc', 'Milestone Name', 'SLA Process', 'milestone', 'Process Type', 'Tên mốc', 'SLA mốc') || '-';
                   pt = String(originalProcessTypeVal || '').trim();
          processTypeLower = pt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[–—−⁃－⁻−⎯‑‒]|&ndash;|&mdash;/g, '-').replace(/\s+/g, ' ').trim();
          detectedLabel = pt;
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
          } else if (processTypeLower.includes('tuyen') || processTypeLower.includes('truyen')) {
              if (processTypeLower.includes('1')) detectedLabel = 'SLA Process - 247 Tuyến 1';
              else if (processTypeLower.includes('2')) detectedLabel = 'SLA Process - 247 Tuyến 2';
          }
          const createdDateStr = getVal(row, 'Ngày/Thời gian đã mở', 'Ngày tạo', 'Created Date', 'Ngày/Thời gian đã mở', 'Ngày mở', 'Time opened', 'CreatedDate', 'Opened Date', 'Ngày giờ tạo');
         const targetDateStr = getVal(row, 'Target Date', 'Hạn xử lý', 'Ngày tới hạn', 'Mốc thời gian dự kiến', 'TargetDate', 'Due Date');
         const slaTypeStr = getVal(row, 'SLA Type', 'Loại yêu cầu', 'Scope', 'Phân loại SLA', 'Phạm vi', 'Quy mô', 'Loại SLA');
         const rawVpbSlaStartStr = getVal(row, 'VPB_SLAStarttimeSLA', 'Ngày bắt đầu', 'VPB_Start time SLA', 'Assign Date SLA', 'Ngày bắt đầu tính SLA', 'VPB Start time SLA', 'Start time SLA', 'VPB_StartTimeSla', 'Assign Date', 'Assign Time');
         const caseSourceVal = getVal(row, 'Nguồn tạo', 'Source', 'Case Source');
         const caseTypeVal = getVal(row, 'Type', 'Case Type', 'Loại của yêu cầu');
         
         // Setup params
         const createdDate = parseDateFallback(createdDateStr);
         const originalTargetDate = parseDateFallback(targetDateStr);
         let vpbStartStr = '';
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
          const assignDate = parseDateFallback(vpbStartStr);

         const ref = reference;
         
         pt = String(originalProcessTypeVal || '').trim();
         
         // Try to normalize process type if possible
         let dummyType = pt.toLowerCase()
             .normalize('NFD')
             .replace(/[\u0300-\u036f]/g, '')
             .replace(/[đĐ]/g, 'd')
             .replace(/[–—−⁃－⁻−⎯‑‒]|&ndash;|&mdash;/g, '-')
             .replace(/\s+/g, ' ')
             .trim();
         
         detectedLabel = pt;

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
         } else if (processTypeLower.includes('tuyen') || processTypeLower.includes('truyen')) {
             if (processTypeLower.includes('1')) detectedLabel = 'SLA Process - 247 Tuyến 1';
             else if (processTypeLower.includes('2')) detectedLabel = 'SLA Process - 247 Tuyến 2';
         }

         let res: BatchResult = {
             row,
             rowIndex: idx,
             reference: ref,
             expectedTargetDate: null, targetResponseMinutes: getVal(row, 'Phản hồi mục tiêu(Phút)', 'Phản hồi mục tiêu (Phút)', 'Phan hoi muc tieu', 'Phản hồi mục tiêu', 'target response') ? String(getVal(row, 'Phản hồi mục tiêu(Phút)', 'Phản hồi mục tiêu (Phút)', 'Phan hoi muc tieu', 'Phản hồi mục tiêu', 'target response')).trim() : undefined,
             actualTargetDate: originalTargetDate || null,
             detectedProcessType: detectedLabel,
             originalProcessType: String(originalProcessTypeVal),
             isCorrect: false,
             isValid: false,
             updateTargetDateStr: '',
             shortExplanation: '',
             explanationSteps: []
         };

         if (!detectedLabel || detectedLabel === '-') {
             res.errorMessage = 'Thiếu Cột mốc (SLA Process)'; missingMilestone++;
             invalid++;
             parsedResults.push(res);
             return;
         }

         if (!createdDate) {
             res.errorMessage = `Thiếu hoặc lỗi format Ngày/Thời gian mở (${createdDateStr})`; missingCreatedDate++;
             invalid++;
             parsedResults.push(res);
             return;
         }

         try {
             const isSlaTypeNull = !slaTypeStr || String(slaTypeStr).trim() === '' || String(slaTypeStr).toLowerCase().trim() === 'null' || String(slaTypeStr).toLowerCase().trim() === 'undefined';
             let scope: ProcessingScope = 'Xử lý yêu cầu toàn phần';
             
             if (detectedLabel === 'SLA Process - 247 Tuyến 1' && isSlaTypeNull) {
                 scope = 'Xử lý ngoài phạm vi';
             } else {
                 // Deduce scope from SLA Type column
                 const t = String(slaTypeStr || '').toLowerCase()
                     .normalize('NFD')
                     .replace(/[\u0300-\u036f]/g, '')
                     .replace(/[đĐ]/g, 'd');

                 if (t.includes('1 phan') || t.includes('mot phan')) scope = 'Xử lý yêu cầu 1 phần';
                 else if (t.includes('ngoai pham vi')) scope = 'Xử lý ngoài phạm vi';
                 else if (t.includes('ngoai le')) scope = 'Yêu cầu ngoại lệ';
             }

             const calc = calculateTargetDate({
                reference: ref,
                createdDate: createdDate,
                processType: detectedLabel,
                scope: scope,
                segment: getVal(row, 'Phân khúc', 'Phân khúc KH', 'Segment', 'Customer Segment', 'Phân hạng KH') || '',
                subSegment: getVal(row, 'Phân hạng', 'Phân khúc phụ', 'Sub-segment', 'Customer Sub-segment', 'Subsegment') || '',
                subcategory: getVal(row, 'Sub-category CRM', 'Sub Category CRM', 'Subcategory Name', 'Sub Category', 'Danh mục phụ', 'Sub-category', 'Subcategory', 'Danh mục con', 'Danh mục') || '',
                e2eSlaStr: getVal(row, 'E2E SLA', 'SLA tổng', 'SLA', 'Original SLA', 'SLA gốc') || '',
                source: caseSourceVal || '',
                type: caseTypeVal || '',
                category: getVal(row, 'Danh mục', 'Category', 'Case Category') || '',
                processingUnit: getVal(row, 'Đơn vị xử lý', 'Processing Unit', 'Queue Name') || '',
                responsibleUnit: getVal(row, 'Đơn vị chịu trách nhiệm', 'Responsible Unit') || '',
                reason: getVal(row, 'Nguyên nhân', 'Lý do', 'Reason', 'Case Reason') || '',
                title: getVal(row, 'Tiêu đề', 'Title', 'Subject') || '',
                aptCode: getVal(row, 'APT Code') || '',
                assignDate: assignDate
             });

             res.isValid = true;
             res.expectedTargetDate = calc.targetDate;
             res.explanationSteps = calc.explanation;
             
             if (originalTargetDate && calc.targetDate) {
                 const diff = Math.abs(differenceInMinutes(originalTargetDate, calc.targetDate));
                 res.isCorrect = diff <= 5;
             } else if (!originalTargetDate && !calc.targetDate) {
                 res.isCorrect = true; 
             } else {
                 res.isCorrect = false; 
             }

             if (res.isCorrect) {
                 correct++;
                 res.shortExplanation = 'Đúng hạn';
             } else if (calc.slaLabel.startsWith('Chưa có rule') || calc.slaLabel.startsWith('Chưa xác định')) {
                 res.shortExplanation = 'Chưa xác định'; undefinedRule++;
                 invalid++;
                 res.updateTargetDateStr = '';
             } else {
                 wrong++;
                 res.updateTargetDateStr = calc.targetDate ? format(calc.targetDate, 'HH:mm, dd/MM/yyyy') : '';
                 res.shortExplanation = `Sai lệch. SLA hệ thống: ${calc.slaLabel}`;
                 // Track pivot info
                 pivot[detectedLabel] = (pivot[detectedLabel] || 0) + 1;
             }
             
         } catch (e: any) {
             res.errorMessage = e.message || 'Lỗi tính toán'; otherError++;
             invalid++;
         }

         parsedResults.push(res);
      });

      setResults(parsedResults);
      setStats({ total: json.length, correct, wrong, invalid });
      setPivotStats(pivot);
      setInvalidBreakdown({
         emptyOrSummary,
         missingMilestone,
         missingCreatedDate,
         undefinedRule,
         otherError
      });
      
    } catch (err: any) {
      alert("Lỗi đọc file: " + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
        setFile(e.target.files[0]);
        processFile(e.target.files[0]);
     }
  };

  const exportResults = () => {
     if (results.length === 0) return;
     
     const exportData = results.map(r => {
          const newRow = { ...r.row };
          newRow['[Kết quả] Kiểm tra'] = r.isValid ? (r.isCorrect ? 'ĐÚNG' : 'SAI') : 'LỖI';
          if (!r.isCorrect && r.isValid) {
              newRow['[Kết quả] Ngày targetdate cần update'] = r.updateTargetDateStr;
          } else {
              newRow['[Kết quả] Ngày targetdate cần update'] = '';
          }
          newRow['[Kết quả] Giải nghĩa'] = r.isValid ? r.shortExplanation : (r.errorMessage || '');
          return newRow;
     });

     const wb = XLSX.utils.book_new();
     
     // Sheet 1: Details
     const wsDetails = XLSX.utils.json_to_sheet(exportData);
     XLSX.utils.book_append_sheet(wb, wsDetails, "SLA_Check_Result");
     
     // Sheet 2: Pivot Summary
     const pivotData = Object.entries(pivotStats).map(([type, count]) => ({
        'Loại SLA': type,
        'Số lượng sai': count
     }));
     
     // Add 'Không hợp lệ' to pivot data for transparency
     if (stats.invalid > 0) {
        pivotData.push({
           'Loại SLA': 'LỖI / KHÔNG HỢP LỆ (Dòng bị bỏ qua hoặc thiếu data)',
           'Số lượng sai': stats.invalid
        });
     }

     // Add a total row
     if (pivotData.length > 0) {
        const total = Object.values(pivotStats).reduce((a, b) => a + b, 0) + stats.invalid;
        pivotData.push({
           'Loại SLA': 'TỔNG CỘNG',
           'Số lượng sai': total
        });
     }
     
     const wsSummary = XLSX.utils.json_to_sheet(pivotData);
     XLSX.utils.book_append_sheet(wb, wsSummary, "Tổng hợp");
     
     XLSX.writeFile(wb, `SLA_Kết_Quả_Check_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };

  const hasTargetResponse = results.some(r => r.targetResponseMinutes !== undefined && r.targetResponseMinutes !== '');

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-200 bg-neutral-50/50 flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              Kiểm Tra SLA Hàng Loạt
            </h2>
            <p className="text-sm text-neutral-500 mt-1">Upload file Excel/CSV chứa danh sách case để đối chiếu Target Date</p>
          </div>
          
          {results.length > 0 && (
             <button
               onClick={exportResults}
               className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 shadow flex items-center gap-2 transition-colors"
             >
               <Download className="w-4 h-4" /> Xuất File Kết Quả
             </button>
          )}
        </div>

        <div className="p-6">
          <label className="flex flex-col flex-1 border-2 border-dashed border-neutral-300 rounded-xl p-8 hover:bg-blue-50/50 hover:border-blue-400 cursor-pointer transition-all items-center justify-center min-h-[200px]">
            <input 
              type="file" 
              className="hidden" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileUpload}
            />
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center text-blue-600">
                 <Loader2 className="w-10 h-10 animate-spin mb-3" />
                 <span className="font-semibold">Đang xử lý {file?.name}...</span>
              </div>
            ) : (
              file && results.length > 0 ? (
                <div className="flex flex-col items-center justify-center text-green-600">
                   <CheckCircle className="w-10 h-10 mb-3" />
                   <span className="font-semibold text-neutral-800">Đã xử lý: {file.name}</span>
                   <span className="text-sm text-neutral-500 mt-2">Nhấp để tải lên file khác</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-neutral-500">
                   <UploadCloud className="w-10 h-10 mb-3 text-neutral-400" />
                   <span className="font-semibold text-neutral-700">Kéo thả hoặc nhấn để tải lên file Excel/CSV</span>
                   <span className="text-xs text-neutral-400 mt-2 max-w-sm text-center">
                     Yêu cầu các cột: Mã Yêu cầu, Cột mốc, Ngày/Thời gian đã mở, VPB_Start time SLA, SLA Type, Target Date...
                   </span>
                </div>
              )
            )}
          </label>

          {results.length > 0 && (
            <div className="mt-8 space-y-6">
               <div className="grid grid-cols-4 gap-4">
                  <div className="bg-neutral-50 border rounded-lg p-4 flex flex-col items-center justify-center">
                     <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wide">Tổng số dòng</span>
                     <span className="text-2xl font-bold text-neutral-800">{stats.total}</span>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex flex-col items-center justify-center">
                     <span className="text-xs text-green-600 font-semibold uppercase tracking-wide">Target Date Đúng</span>
                     <span className="text-2xl font-bold text-green-700">{stats.correct}</span>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex flex-col items-center justify-center">
                     <span className="text-xs text-red-600 font-semibold uppercase tracking-wide">Target Date Sai</span>
                     <span className="text-2xl font-bold text-red-700">{stats.wrong}</span>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 flex flex-col items-center justify-center">
                     <span className="text-xs text-orange-600 font-semibold uppercase tracking-wide">Lỗi / Thiếu dữ liệu</span>
                     <span className="text-2xl font-bold text-orange-700">{stats.invalid}</span>
                  </div>
               </div>

               {/* Explanation for discrepancy */}
               {stats.invalid > 0 && (
                  <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500 space-y-3">
                     <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <h3 className="font-bold text-amber-900 text-sm md:text-base">
                           Bảng Phân Tích Sự Chênh Lệch Số Liệu (Dòng lỗi/bỏ qua SLA)
                        </h3>
                     </div>
                     
                     <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
                        Theo logic đối chiếu, <strong>Tổng số dòng ({stats.total.toLocaleString()})</strong> bằng với 
                        tổng số dòng <strong>Đúng ({stats.correct.toLocaleString()})</strong> + <strong>Sai ({stats.wrong.toLocaleString()})</strong> + 
                        các dòng <strong>Lỗi / Bỏ qua ({stats.invalid.toLocaleString()})</strong>.
                        Sở dĩ có sự chênh lệch này là do <strong>{stats.invalid.toLocaleString()}</strong> dòng dưới đây không đủ thông tin 
                        hợp lệ hoặc không có rule để tính toán SLA. Chi tiết các nguyên nhân chênh lệch:
                     </p>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1">
                        <div className="bg-white border border-amber-100 rounded-lg p-3 flex flex-col justify-between">
                           <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">1. Dòng trống / Tổng cộng</span>
                           <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-xl font-bold text-amber-700">{invalidBreakdown.emptyOrSummary}</span>
                              <span className="text-[11px] text-neutral-400">dòng</span>
                           </div>
                           <p className="text-[10px] text-neutral-400 mt-1 italic">Hàng trống hoặc dòng tổng cộng cuối file</p>
                        </div>
                        
                        <div className="bg-white border border-amber-100 rounded-lg p-3 flex flex-col justify-between">
                           <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">2. Thiếu cột mốc</span>
                           <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-xl font-bold text-amber-700">{invalidBreakdown.missingMilestone}</span>
                              <span className="text-[11px] text-neutral-400">dòng</span>
                           </div>
                           <p className="text-[10px] text-neutral-400 mt-1 italic">Không dữ liệu hoặc trống cột mốc xử lý</p>
                        </div>

                        <div className="bg-white border border-amber-100 rounded-lg p-3 flex flex-col justify-between">
                           <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">3. Sai ngày mở (Created)</span>
                           <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-xl font-bold text-amber-700">{invalidBreakdown.missingCreatedDate}</span>
                              <span className="text-[11px] text-neutral-400">dòng</span>
                           </div>
                           <p className="text-[10px] text-neutral-400 mt-1 italic">Trống ngày mở hoặc sai định dạng date</p>
                        </div>

                        <div className="bg-white border border-amber-100 rounded-lg p-3 flex flex-col justify-between">
                           <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">4. Mốc chưa có rule</span>
                           <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-xl font-bold text-amber-700">{invalidBreakdown.undefinedRule}</span>
                              <span className="text-[11px] text-neutral-400">dòng</span>
                           </div>
                           <p className="text-[10px] text-neutral-400 mt-1 italic">Tên mốc thuộc loại chưa được cấu hình rule</p>
                        </div>

                        <div className="bg-white border border-amber-100 rounded-lg p-3 flex flex-col justify-between">
                           <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">5. Lỗi xử lý khác</span>
                           <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-xl font-bold text-amber-700">{invalidBreakdown.otherError}</span>
                              <span className="text-[11px] text-neutral-400">dòng</span>
                           </div>
                           <p className="text-[10px] text-neutral-400 mt-1 italic">Lỗi parse hoặc ngoại lệ tính toán hệ thống</p>
                        </div>
                     </div>
                  </div>
               )}

               {/* Pivot Summary UI */}
               {Object.keys(pivotStats).length > 0 && (
                  <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                     <div className="p-4 bg-red-50/50 border-b border-neutral-200 flex items-center justify-between">
                        <h3 className="font-bold text-neutral-800 flex items-center gap-2 text-sm">
                           <AlertCircle className="w-4 h-4 text-red-600" />
                           Thống kê SLA Sai theo loại
                        </h3>
                        <span className="text-xs font-medium text-neutral-500 italic">Dựa trên logic tính toán hệ thống</span>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                           <thead className="bg-neutral-50 text-neutral-500 text-[10px] uppercase font-bold border-b">
                              <tr>
                                 <th className="px-6 py-3 text-left">Quy trình (Milestone)</th>
                                 <th className="px-6 py-3 text-right w-32">Số lượng SAI</th>
                                 <th className="px-6 py-3 text-right w-32">Tỷ lệ / Tổng sai</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-neutral-100">
                              {Object.entries(pivotStats)
                                .sort((a, b) => b[1] - a[1])
                                .map(([type, count]) => (
                                 <tr key={type} className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-neutral-800">{type}</td>
                                    <td className="px-6 py-3 text-right font-bold text-red-600">{count}</td>
                                    <td className="px-6 py-3 text-right text-neutral-500">
                                       {((count / stats.wrong) * 100).toFixed(1)}%
                                    </td>
                                 </tr>
                              ))}
                              <tr className="bg-neutral-50 font-bold border-t-2 border-neutral-200">
                                 <td className="px-6 py-3 text-neutral-800 uppercase tracking-wider">TỔNG CỘNG</td>
                                 <td className="px-6 py-3 text-right text-red-700">{stats.wrong}</td>
                                 <td className="px-6 py-3 text-right text-neutral-800">100.0%</td>
                              </tr>
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               <div className="border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
                 <div className="p-3 bg-neutral-50 border-b flex justify-between items-center text-sm font-semibold text-neutral-700">
                    Chi tiết (Hiển thị 100 dòng đầu)
                 </div>
                 <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-sm text-left">
                       <thead className="bg-white sticky top-0 border-b shadow-sm z-10 text-xs uppercase text-neutral-500">
                          <tr>
                             <th className="px-4 py-3 font-semibold w-16 text-center">Row</th>
                             <th className="px-4 py-3 font-semibold">Mã yêu cầu</th>
                             <th className="px-4 py-3 font-semibold">Cột mốc</th>
                             {hasTargetResponse && (
                                 <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Phản hồi mục tiêu</th>
                              )}
                              <th className="px-4 py-3 font-semibold">Target Date (File)</th>
                             <th className="px-4 py-3 font-semibold">Target Date (Update)</th>
                             <th className="px-4 py-3 font-semibold text-center">Kết Quả</th>
                             <th className="px-4 py-3 font-semibold">Giải nghĩa</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-neutral-100">
                          {results.slice(0, 100).map((r) => (
                             <tr key={r.rowIndex} className="hover:bg-neutral-50 cursor-pointer" onClick={() => setSelectedResult(r)}>
                                <td className="px-4 py-3 text-center text-neutral-400 font-medium">{r.rowIndex + 2}</td>
                                <td className="px-4 py-3 font-medium text-neutral-800">{r.reference}</td>
                                <td className="px-4 py-3">
                                   <div className="font-medium text-neutral-800">{r.originalProcessType}</div>
                                   <div className="text-[10px] text-neutral-400 uppercase tracking-tighter truncate max-w-[150px]" title={r.detectedProcessType}>
                                      Hệ thống: {r.detectedProcessType}
                                   </div>
                                </td>

                                {hasTargetResponse ? (
                                   <>
                                      <td className="px-4 py-3 text-neutral-600 font-mono text-center">
                                         {r.targetResponseMinutes !== undefined && r.targetResponseMinutes !== "" ? r.targetResponseMinutes : "-"}
                                      </td>
                                      <td className="px-4 py-3 text-neutral-600">
                                         {r.actualTargetDate ? format(r.actualTargetDate, 'HH:mm, dd/MM/yyyy') : '-'}
                                      </td>
                                   </>
                                ) : (
                                   <td className="px-4 py-3 text-neutral-600">
                                      {r.actualTargetDate ? format(r.actualTargetDate, 'HH:mm, dd/MM/yyyy') : '-'}
                                   </td>
                                )}
                                <td className="px-4 py-3 font-medium">
                                   {!r.isValid ? '-' : r.isCorrect ? '-' : (
                                      <span className="text-blue-600">{r.updateTargetDateStr}</span>
                                   )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                   {!r.isValid ? (
                                      <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-orange-100 text-orange-700 text-xs font-bold">LỖI</span>
                                   ) : r.isCorrect ? (
                                      <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-bold">ĐÚNG</span>
                                   ) : r.shortExplanation === 'Chưa xác định' ? (
                                      <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-neutral-100 text-neutral-700 text-[10px] font-bold whitespace-nowrap">CHƯA XÁC ĐỊNH</span>
                                   ) : (
                                      <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold">SAI</span>
                                   )}
                                </td>
                                <td className="px-4 py-3 text-neutral-600">
                                   {r.isValid ? r.shortExplanation : r.errorMessage}
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b flex justify-between items-center bg-neutral-50">
                 <h3 className="font-bold text-neutral-800 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    Chi tiết tính toán: {selectedResult.reference}
                 </h3>
                 <button 
                   onClick={() => setSelectedResult(null)}
                   className="p-1 hover:bg-neutral-200 rounded-full transition-colors"
                 >
                    <svg className="w-6 h-6 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                 </button>
              </div>
              
               <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className={clsx("grid gap-4 mb-6", selectedResult.targetResponseMinutes !== undefined && selectedResult.targetResponseMinutes !== '' ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2")}>
                     <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">Cột mốc nhận diện</div>
                        <div className="font-semibold text-neutral-800 text-sm truncate">{selectedResult.detectedProcessType}</div>
                     </div>
                     {selectedResult.targetResponseMinutes !== undefined && selectedResult.targetResponseMinutes !== '' && (
                        <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 animate-in zoom-in-95 duration-200">
                           <div className="text-[10px] text-purple-600 font-bold uppercase tracking-wider mb-1">Phản hồi mục tiêu (Phút)</div>
                           <div className="font-semibold text-neutral-800 text-sm">{selectedResult.targetResponseMinutes}</div>
                        </div>
                     )}
                     <div className="hidden">
                     </div>
                     <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                        <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Kết quả</div>
                        <div className={clsx(
                           "font-bold text-sm",
                           selectedResult.isCorrect ? "text-green-600" : "text-red-600"
                        )}>
                           {selectedResult.shortExplanation}
                        </div>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">Log xử lý chi tiết</h4>
                     {selectedResult.explanationSteps?.map((step, i) => (
                        <div key={i} className={clsx(
                           "flex gap-3 text-sm p-2 rounded-lg border",
                           step.isHighlight ? "bg-blue-50 border-blue-100" : "bg-white border-neutral-100"
                        )}>
                           <span className="text-base">{step.icon}</span>
                           <span className={clsx(
                              "flex-1",
                              step.isHighlight ? "font-semibold text-blue-800" : "text-neutral-600"
                           )}>{step.text}</span>
                        </div>
                     ))}
                     {(!selectedResult.explanationSteps || selectedResult.explanationSteps.length === 0) && (
                        <div className="text-center py-8 text-neutral-400 text-sm italic">
                           {selectedResult.errorMessage || 'Không có log chi tiết cho dòng này.'}
                        </div>
                     )}
                  </div>
               </div>
              
              <div className="p-4 bg-neutral-50 border-t flex justify-end">
                 <button 
                   onClick={() => setSelectedResult(null)}
                   className="px-6 py-2 bg-neutral-800 text-white rounded-lg font-semibold hover:bg-neutral-900 transition-colors shadow-sm"
                 >
                    Đóng
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
