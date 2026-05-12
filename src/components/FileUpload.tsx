import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Download, AlertCircle, File as FileIcon, Trash2, HelpCircle } from 'lucide-react';
import { calculateTargetDate, ProcessingScope, PROCESS_TYPES, PROCESS_WITH_ASSIGN_DATE } from '../lib/sla';
import { format, parse } from 'date-fns';

interface UploadProps {
  onProcessRef: React.MutableRefObject<any>;
}

export function FileUpload({ onProcessRef }: UploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [defaultProcessType, setDefaultProcessType] = useState<string>('SLA Process - 247 Tuyến 1');
  const [defaultScope, setDefaultScope] = useState<ProcessingScope>('Xử lý yêu cầu toàn phần');
  const [explanationData, setExplanationData] = useState<string[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile);
    setProcessedData([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result;
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      const validRows = json.filter(row => Object.values(row).some(val => String(val).trim() !== ''));
      setData(validRows);
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const normalizeStr = (s: string) => {
    if (!s) return '';
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  };

  const parseDateStr = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    
    try {
      if (dateVal instanceof Date) {
        if (!isNaN(dateVal.getTime())) return dateVal;
      }
      
      if (typeof dateVal === 'number') {
        // Excel serial date formula (1900 date system)
        const d = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
        return new Date(d.getTime() + d.getTimezoneOffset() * 60000);
      }
      
      const str = String(dateVal).trim();
      
      // Attempt generic JS parse first
      const d = new Date(str);
      // We test if standard parse worked and it doesn't look like DD/MM/YYYY
      // because new Date('08/05/2026') might parse as August 5 incorrectly!
      
      let cleanStr = str.replace(/[,_]/g, ' ').replace(/-/g, '/').replace(/–/g, '/').replace(/\s+/g, ' ').trim();
      
      if (cleanStr.includes('/')) {
        const parts = cleanStr.split(' ');
        
        let datePart = '';
        let timePart = '00:00';

        if (parts.length >= 2) {
          const timeIndex = parts.findIndex(p => p.includes(':'));
          const dateIndex = parts.findIndex(p => p.includes('/'));
          
          if (timeIndex !== -1) timePart = parts[timeIndex];
          if (dateIndex !== -1) datePart = parts[dateIndex];
          else datePart = parts[0];
        } else {
          datePart = parts[0];
        }

        const dateParts = datePart.split('/');
        if (dateParts.length >= 3) {
           let idxDay = 0;
           let idxMonth = 1;
           let idxYear = 2;
           
           // If the first part is 4 digits, it's YYYY/MM/DD
           if (dateParts[0].length === 4) {
             idxYear = 0;
             idxMonth = 1;
             idxDay = 2;
           }

           let day = parseInt(dateParts[idxDay], 10);
           let month = parseInt(dateParts[idxMonth], 10) - 1; // 0-indexed
           let year = parseInt(dateParts[idxYear], 10);
           
           if (year < 100) year += 2000;
           
           const timeSplit = timePart.split(':');
           let hours = 0;
           let minutes = 0;
           let seconds = 0;
           if (timeSplit.length >= 2) {
             hours = parseInt(timeSplit[0], 10);
             minutes = parseInt(timeSplit[1], 10);
             if (timeSplit.length >= 3) {
               seconds = parseInt(timeSplit[2], 10);
             }
           }

           // Handle AM/PM if present
           if (cleanStr.toLowerCase().includes('pm') && hours < 12) hours += 12;
           if (cleanStr.toLowerCase().includes('am') && hours === 12) hours = 0;

           const finalDate = new Date(year, month, day, hours, minutes, seconds);
           if (!isNaN(finalDate.getTime())) return finalDate;
        }
      }
      
      if (!isNaN(d.getTime())) return d;
      
      return null;
    } catch (e) {
      console.warn("Could not parse date:", dateVal);
      return null;
    }
  };

  const getCol = (row: any, names: string[]) => {
    const keys = Object.keys(row);
    for (const k of keys) {
      const normK = normalizeStr(k);
      if (names.some(n => normK.includes(normalizeStr(n)))) {
        return row[k];
      }
    }
    return '';
  };

  const processFile = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const processed = data.map((row: any) => {
        const reference = getCol(row, ['mã yêu cầu', 'reference', 'ma yeu cau']);
        const createdDateStr = getCol(row, ['ngày tạo', 'created date', 'thời gian tạo', 'ngay tao']);
        const segmentStr = String(getCol(row, ['phân khúc', 'segment', 'phan khuc'])).toLowerCase();
        const subSegmentStr = String(getCol(row, ['sub-segment', 'sub segment', 'phân khúc con']) || '');
        const sourceStr = String(getCol(row, ['nguồn tạo', 'nguồn', 'source']) || '');
        const typeStrVal = String(getCol(row, ['type', 'loại', 'loai']) || '');
        const categoryStr = String(getCol(row, ['category', 'danh mục', 'nhóm', 'nhom']) || '');
        const subcategoryStr = String(getCol(row, ['subcategory', 'sub category', 'sub-category', 'sub_category', 'danh mục con', 'danh muc con']) || '');
        const processTypeVal = getCol(row, ['sla process', 'process type', 'hệ thống crm']);
        const e2eSlaVal = getCol(row, ['sla e2e', 'target e2e', 'thời gian e2e']) || getCol(row, ['e2e', 'sla']);

        const processingUnitStr = String(getCol(row, ['đơn vị xử lý', 'processing unit']) || '');
        const responsibleUnitStr = String(getCol(row, ['đơn vị chịu trách nhiệm', 'responsible unit']) || '');
        const reasonStr = String(getCol(row, ['nguyên nhân', 'reason', 'nguyen nhan']) || '');
        const titleStr = String(getCol(row, ['tiêu đề', 'title', 'tieu de']) || '');
        const aptCodeStr = String(getCol(row, ['apt code', 'apt']) || '');
        const assignDateRaw = getCol(row, ['ngày assign tuyến 2', 'ngày assign', 'assign date', 'ngày chuyển tuyến 2']);
        
        // ... (keep rest)
        
        let processType = defaultProcessType;
        if (processTypeVal && typeof processTypeVal === 'string') {
           const match = PROCESS_TYPES.find(p => p.toLowerCase() === processTypeVal.toLowerCase());
           if (match) processType = match;
        }

        const rowScope = typeof row['Loại xử lý'] === 'string' && row['Loại xử lý'] ? row['Loại xử lý'] as ProcessingScope : undefined;

        const createdDate = parseDateStr(createdDateStr);
        let startStr = '';
        let targetStr = '';

        if (createdDate && !isNaN(createdDate.getTime())) {
          try {
            const res = calculateTargetDate({
              reference: String(reference),
              createdDate,
              processType,
              scope: processType === 'SLA Process - 247 Tuyến 1' ? (rowScope || defaultScope) : undefined,
              segment: segmentStr,
              subSegment: subSegmentStr,
              subcategory: subcategoryStr,
              source: sourceStr,
              type: typeStrVal,
              category: categoryStr,
              processingUnit: processingUnitStr,
              responsibleUnit: responsibleUnitStr,
              reason: reasonStr,
              title: titleStr,
              aptCode: aptCodeStr,
              assignDate: PROCESS_WITH_ASSIGN_DATE.includes(processType) && assignDateRaw ? parseDateStr(assignDateRaw) || undefined : undefined,
              e2eSlaStr: e2eSlaVal // Use the raw value string or number
            });
            startStr = format(res.startDate, 'HH:mm, dd/MM/yyyy');
            targetStr = format(res.targetDate, 'HH:mm, dd/MM/yyyy');
            
            return {
              ...row,
              'Mã yêu cầu': reference,
              'Ngày tạo': createdDateStr instanceof Date ? format(createdDateStr, 'HH:mm, dd/MM/yyyy') : String(createdDateStr),
              'Loại SLA áp dụng': processType,
              'SLA E2E/Gốc': res.slaLabel,
              'Loại xử lý (T1)': processType === 'SLA Process - 247 Tuyến 1' ? (rowScope || defaultScope) : '',
              'Start date': startStr,
              'Target date': targetStr,
              'Chi tiết xử lý': res.explanation.slice(-1)[0]?.text || 'Hoàn tất',
              'explanation': res.explanation.map(e => e.text)
            };
          } catch (e: any) {
            console.error("Error calculating row", row, e);
            startStr = 'Error';
            targetStr = 'Error';
            return {
              ...row,
              'Mã yêu cầu': reference,
              'Ngày tạo': createdDateStr instanceof Date ? format(createdDateStr, 'HH:mm, dd/MM/yyyy') : String(createdDateStr),
              'Loại SLA áp dụng': processType,
              'SLA E2E/Gốc': e2eSlaVal || '',
              'Loại xử lý (T1)': processType === 'SLA Process - 247 Tuyến 1' ? (rowScope || defaultScope) : '',
              'Start date': startStr,
              'Target date': targetStr,
              'Chi tiết xử lý': e.message || 'Lỗi xử lý',
              'explanation': [e.message || 'Lỗi xử lý']
            };
          }
        } else {
            startStr = 'Invalid Date';
            targetStr = 'Invalid Date';
            return {
              ...row,
              'Mã yêu cầu': reference,
              'Ngày tạo': createdDateStr instanceof Date ? format(createdDateStr, 'HH:mm, dd/MM/yyyy') : String(createdDateStr),
              'Start date': startStr,
              'Target date': targetStr,
              'Chi tiết xử lý': 'Ngày tạo không hợp lệ',
              'explanation': ['Ngày tạo không hợp lệ']
            };
        }
      });

      setProcessedData(processed);
      setIsProcessing(false);
    }, 500);
  };

  const downloadResults = () => {
    if (processedData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(processedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SLA Results");
    XLSX.writeFile(workbook, "SLA_Calculated_Results.xlsx");
  };

  const handleDownloadTemplate = () => {
    const baseRow: any = {
      'Mã yêu cầu': 'RQ12345',
      'Trạng thái': 'Open',
      'Ngày tạo': '14:00, 08/05/2026',
      'Nguồn tạo': 'Portal',
      'Type': 'Service Request',
      'Category': 'A',
      'Subcategory': 'Tra soát GD ck nhanh 24/7 NAPAS – Điều chỉnh nội dung',
      'Phân khúc': 'MAF',
      'Sub-Segment': 'Standard',
      'Đơn vị xử lý': 'IT',
      'Đơn vị chịu trách nhiệm': 'IT Support',
      'Nguyên nhân': '',
      'Tiêu đề': 'Test Request',
      'APT code': ''
    };

    if (PROCESS_WITH_ASSIGN_DATE.includes(defaultProcessType)) {
      baseRow['Ngày assign'] = '15:00, 08/05/2026';
    }

    const templateData = [baseRow];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "SLA_Template.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">SLA Process Mặc định</label>
            <select 
              value={defaultProcessType}
              onChange={e => setDefaultProcessType(e.target.value)}
              className="w-full sm:w-[240px] rounded-xl border border-neutral-300 px-4 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none bg-white"
            >
              {PROCESS_TYPES.map(pt => (
                <option key={pt} value={pt}>{pt}</option>
              ))}
            </select>
          </div>
          
          {defaultProcessType === 'SLA Process - 247 Tuyến 1' && (
            <div>
               <label className="block text-sm font-medium text-neutral-700 mb-1">Scope Mặc định (Tuyến 1)</label>
               <select 
                 value={defaultScope}
                 onChange={e => setDefaultScope(e.target.value as ProcessingScope)}
                 className="w-full sm:w-[240px] rounded-xl border border-neutral-300 px-4 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none bg-white"
               >
                 <option value="Xử lý yêu cầu toàn phần">Xử lý yêu cầu toàn phần</option>
                 <option value="Xử lý yêu cầu 1 phần">Xử lý yêu cầu 1 phần</option>
                 <option value="Xử lý ngoài phạm vi">Xử lý ngoài phạm vi</option>
                 <option value="Yêu cầu ngoại lệ">Yêu cầu ngoại lệ</option>
               </select>
            </div>
          )}
        </div>
        <button 
          onClick={handleDownloadTemplate}
          className="text-sm text-blue-600 font-medium hover:text-blue-700 hover:underline flex items-center gap-1"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Tải Template File
        </button>
      </div>

      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${file ? 'border-emerald-300 bg-emerald-50' : 'border-neutral-300 bg-neutral-50 hover:bg-neutral-100'}`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileInput} 
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
          className="hidden" 
        />
        
        {file ? (
          <>
            <FileIcon className="w-12 h-12 text-emerald-500 mb-4" />
            <h3 className="text-emerald-800 font-semibold mb-1">{file.name}</h3>
            <p className="text-emerald-600 col-span-1 text-sm">{data.length} dòng dữ liệu</p>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-neutral-900 font-semibold mb-1">Click để tải file lên hoặc Kéo & Thả</h3>
            <p className="text-neutral-500 text-sm">Hỗ trợ định dạng .xlsx, .csv</p>
          </>
        )}
      </div>

      {file && (
        <div className="flex gap-4">
          <button 
            onClick={processFile}
            disabled={isProcessing}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-4 py-3 rounded-xl transition-colors flex justify-center items-center gap-2"
          >
             {isProcessing ? 'Đang xử lý...' : 'Thực hiện tính toán hàng loạt'}
          </button>
          {processedData.length > 0 && (
            <button 
              onClick={downloadResults}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-3 rounded-xl transition-colors flex justify-center items-center gap-2"
            >
               <Download className="w-5 h-5" />
               Tải Xuất Kết Quả
            </button>
          )}
          <button 
            onClick={() => { setFile(null); setProcessedData([]); setData([]); }}
            className="bg-red-50 hover:bg-red-100 text-red-600 font-medium px-4 py-3 rounded-xl transition-colors flex justify-center items-center gap-2"
          >
             <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {processedData.length > 0 && (
        <div className="mt-8 border border-neutral-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-neutral-700">Mã yêu cầu</th>
                  <th className="px-4 py-3 font-semibold text-neutral-700">Cột mốc</th>
                  <th className="px-4 py-3 font-semibold text-neutral-700">Ngày tạo</th>
                  <th className="px-4 py-3 font-semibold text-neutral-700">Start Date</th>
                  <th className="px-4 py-3 font-semibold text-neutral-700 text-emerald-700">Target Date</th>
                </tr>
              </thead>
              <tbody>
                {processedData.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-3 text-neutral-900 font-medium">{row['Mã yêu cầu'] || row['mã yêu cầu'] || row['Reference'] || '-'}</td>
                    <td className="px-4 py-3 text-neutral-500">{row['Cột mốc'] || row['cột mốc']}</td>
                    <td className="px-4 py-3 text-neutral-500">{row['Ngày tạo']}</td>
                    <td className="px-4 py-3 text-neutral-600 font-mono text-xs">{row['Start date']}</td>
                    <td 
                      className="px-4 py-3 text-emerald-600 font-mono font-semibold text-xs cursor-pointer hover:underline group"
                      onClick={() => setExplanationData(row.explanation)}
                    >
                      <div className="flex items-center gap-1">
                        {row['Target date']}
                        {row.explanation && <HelpCircle className="w-3.5 h-3.5 text-emerald-500 opacity-60 group-hover:opacity-100" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {processedData.length > 5 && (
            <div className="bg-neutral-50 px-4 py-3 border-t border-neutral-200 text-sm text-neutral-500 text-center">
              Hiển thị 5 / {processedData.length} kết quả. Bấm {`"Tải Xuất Kết Quả"`} để xem bản đầy đủ.
            </div>
          )}
        </div>
      )}

      {explanationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setExplanationData(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">Chi tiết tính toán Target Date</h3>
              <button onClick={() => setExplanationData(null)} className="text-neutral-500 hover:text-neutral-900 text-xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-1 text-[13px] text-neutral-700 font-mono whitespace-pre-wrap">
              {explanationData.join('\n')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
