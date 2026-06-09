import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, CheckCircle, AlertCircle, RefreshCw, Calculator, Copy, ChevronDown, Check, Info } from 'lucide-react';
import clsx from 'clsx';
import { calculateTargetDate, PROCESS_TYPES, PROCESS_WITH_ASSIGN_DATE, CalculationResult, ProcessingScope } from '../lib/sla';
import { format } from 'date-fns';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ASSIGN_KEYWORDS: Record<string, string[]> = {
  'SLA Process - 247 Tuyến 2': ['Service_VKYC', 'Service_Sale Support', 'Service_Sale 247', 'Service_Sale SL', 'Service_Push Sale', 'Service_Đóng thẻ', 'Service_Dong the', 'Service_CRU', 'Service_Outbound'],
  'SLA Process - RCC': ['Service_THN CSKH'],
  'SLA Process - TTT Phát hành': ['Service_TTThe Phat hanh'],
  'SLA Process - TTThe Đối soát': ['Service_TTThe Doi soat'],
  'SLA Process - TTT Cấu hình': ['Service_TTThe Cau Hinh'],
  'SLA Process - TTT Tra soát': ['Service_TTThe Tra soat'],
  'SLA Process PTT Ebanking': ['Service_PTT Ebanking', 'PTT Ebanking'],
  'SLA Process - PTT 247': ['Service_PTT 247', 'PTT 247']
};

interface ExtractedData {
  reference?: string;
  title?: string;
  createdDateStr?: string;
  segment?: string;
  subSegment?: string;
  milestones?: string[];
  type?: string;
  category?: string;
  subcategory?: string;
  source?: string;
  aptCode?: string;
  processingUnit?: string;
  responsibleUnit?: string;
  reason?: string;
  assignDateStr?: string;
}

export const ImageAnalyzerTab: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [historyFile, setHistoryFile] = useState<File | null>(null);
  const [historyImagePreview, setHistoryImagePreview] = useState<string | null>(null);
  const [isAnalyzingHistory, setIsAnalyzingHistory] = useState(false);
  const [manualAssignDate, setManualAssignDate] = useState<string>('');
  
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);
  const [selectedProcessType, setSelectedProcessType] = useState<string>('');
  const [selectedScope, setSelectedScope] = useState<ProcessingScope | ''>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyFileInputRef = useRef<HTMLInputElement>(null);

  // Parse date functions
  const tryParseDate = (str: string): Date | undefined => {
    if (!str) return undefined;
    // try to split by ' ' or ','
    const parts = str.split(/[,\s]+/);
    if (parts.length >= 2) {
      const timePart = parts[0].includes(':') ? parts[0] : parts[1];
      const datePart = parts[0].includes('/') ? parts[0] : parts[1];
      
      const timeSplit = timePart.split(':');
      const dateSplit = datePart.split('/');
      
      if (timeSplit.length >= 2 && dateSplit.length === 3) {
         const h = parseInt(timeSplit[0], 10);
         const m = parseInt(timeSplit[1], 10);
         const d = parseInt(dateSplit[0], 10);
         const mo = parseInt(dateSplit[1], 10) - 1;
         const y = parseInt(dateSplit[2], 10);
         
         const date = new Date(y, mo, d, h, m);
         if (!isNaN(date.getTime())) return date;
      }
    }
    return undefined;
  };

  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const pastedFile = items[i].getAsFile();
          if (pastedFile) {
             if (!file) {
                 handleFileSelected(pastedFile);
             } else if (PROCESS_WITH_ASSIGN_DATE.includes(selectedProcessType)) {
                 handleHistoryFileSelected(pastedFile);
             } else {
                 handleFileSelected(pastedFile);
             }
          }
          break;
        }
      }
    }
  };

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [file, selectedProcessType]);

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setCalcResult(null);
    setExtractedData(null);
    setSelectedProcessType('');
    setManualAssignDate('');
    setHistoryFile(null);
    setHistoryImagePreview(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleHistoryFileSelected = (selectedFile: File) => {
    setHistoryFile(selectedFile);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setHistoryImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const analyzeImage = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      // File to base64
      const buffer = await file.arrayBuffer();
      const base64Data = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

      const prompt = `You are an expert system processing screenshots from a Salesforce case view.
Extract the following information accurately from the image text and context. 
Return ONLY a valid JSON object matching this schema, do not include markdown or other text:
{
  "reference": "string: Mã yêu cầu (e.g., YC00360839)",
  "title": "string: Tiêu đề nằm dưới chữ 'Trường hợp' và trên phần 'Phân công cho'",
  "createdDateStr": "string: date such as '17:24, 06/01/2026' from 'Ngày/Thời Gian Đã Mở'",
  "segment": "string: Phân khúc (e.g. MAF)",
  "subSegment": "string: Phân hạng (e.g. CHAMPION)",
  "milestones": ["array of strings: danh sách các loại SLA hiển thị ở khu vực Cột Mốc"],
  "type": "string for Type",
  "category": "string for Category",
  "subcategory": "string for Sub Category",
  "source": "string for Nguồn tạo",
  "aptCode": "string for APT Code",
  "processingUnit": "string for Đơn vị xử lý",
  "responsibleUnit": "string for Đơn vị chịu trách nhiệm",
  "reason": "string for Lý do hủy or Nguyên nhân",
  "assignDateStr": "string with date format (HH:mm, dd/MM/yyyy) for Ngày assign if present"
}
If any field is missing or not identifiable, leave it as an empty string.`;

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
           { role: 'user', parts: [
              {text: prompt},
              {inlineData: { mimeType: file.type, data: base64Data }}
           ]}
        ]
      });

      const responseText = result.text.trim();
      let parsedJson: ExtractedData;
      
      try {
        let jsonStr = responseText;
        if (jsonStr.startsWith('\`\`\`json')) {
           jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
        } else if (jsonStr.startsWith('\`\`\`')) {
           jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
        }
        parsedJson = JSON.parse(jsonStr);
      } catch (err) {
        throw new Error("Không thể đọc kết quả JSON từ AI: " + responseText);
      }

      setExtractedData(parsedJson);

      if (parsedJson) {
         let initialProcessType = 'SLA E2E';
         if (parsedJson.milestones && parsedJson.milestones.includes('SLA E2E')) {
            initialProcessType = 'SLA E2E';
         } else if (parsedJson.milestones && parsedJson.milestones.length > 0) {
            // Still default to SLA E2E unless it is not in the list, but let's just force SLA E2E 
            // as requested "auto chọn SLA E2E trước"
            initialProcessType = 'SLA E2E';
         }
         setSelectedProcessType(initialProcessType);
         calculateResultForType(parsedJson, initialProcessType);
      }

    } catch (e: any) {
      setError(e.message || "Có lỗi xảy ra khi phân tích ảnh");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeHistoryImage = async () => {
    if (!historyFile || !extractedData) return;
    setIsAnalyzingHistory(true);
    setError(null);

    try {
      const buffer = await historyFile.arrayBuffer();
      const base64Data = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

      const keywords = ASSIGN_KEYWORDS[selectedProcessType] || [];
      const keywordStr = keywords.length > 0 ? keywords.join(', ') : 'đơn vị xử lý tương ứng';

      const prompt = `You are extracting an assignment date from a Salesforce case history screenshot.
Find the LATEST entry where "Trường" is "Phân công cho" and "Giá Trị Mới" is one of: [${keywordStr}].
Or if it's explicitly assigned to a mapped Service for this process type.
Return ONLY a valid JSON object matching this schema, no markdown:
{
  "assignDateStr": "string: The Date/Time from the 'Ngày' column (e.g. '17:12, 06/12/2025')"
}`;

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
           { role: 'user', parts: [
              {text: prompt},
              {inlineData: { mimeType: historyFile.type, data: base64Data }}
           ]}
        ]
      });

      const responseText = result.text.trim();
      let parsedJson: { assignDateStr?: string };
      
      try {
        let jsonStr = responseText;
        if (jsonStr.startsWith('\`\`\`json')) {
           jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
        } else if (jsonStr.startsWith('\`\`\`')) {
           jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
        }
        parsedJson = JSON.parse(jsonStr);
      } catch (err) {
        throw new Error("Không thể đọc kết quả JSON Lịch sử từ AI: " + responseText);
      }

      if (parsedJson.assignDateStr) {
         setManualAssignDate(parsedJson.assignDateStr);
         calculateResultForType(extractedData, selectedProcessType, parsedJson.assignDateStr);
      } else {
         setError("Không tìm thấy ngày assign trong lịch sử cho các đơn vị này.");
      }

    } catch (e: any) {
      setError(e.message || "Có lỗi xảy ra khi phân tích ảnh lịch sử");
    } finally {
      setIsAnalyzingHistory(false);
    }
  };

  const calculateResultForType = (data: ExtractedData, typeStr: string, manualAssign?: string, scope?: ProcessingScope | '') => {
     let pType = typeStr;
     if (pType.includes('E2E')) pType = 'SLA E2E';
     
     const cDate = tryParseDate(data.createdDateStr || '');
     const finalAssignDateStr = manualAssign !== undefined ? manualAssign : (manualAssignDate || data.assignDateStr || '');
     const aDate = tryParseDate(finalAssignDateStr);
     const currentScope = scope !== undefined ? scope : selectedScope;

     if (!cDate) {
       setError("Không thể nhận diện Ngày/Thời Gian tạo từ (Ảnh gốc).");
       setCalcResult(null);
       return;
     }

     if (pType === 'SLA Process - 247 Tuyến 1' && !currentScope) {
       setError("Vui lòng chọn phạm vi xử lý cho Tuyến 1.");
       setCalcResult(null);
       return;
     }

     if (PROCESS_WITH_ASSIGN_DATE.includes(pType) && (!finalAssignDateStr || !aDate)) {
       setError("Loại SLA này yêu cầu Ngày assign. Vui lòng nhập hoặc cung cấp ảnh Lịch sử Case.");
       setCalcResult(null);
       return;
     }

     setError(null);
     const calc = calculateTargetDate({
        reference: data.reference || 'YC_UNKNOWN',
        createdDate: cDate,
        processType: pType,
        scope: currentScope as ProcessingScope,
        type: data.type,
        category: data.category,
        subcategory: data.subcategory,
        source: data.source,
        aptCode: data.aptCode,
        processingUnit: data.processingUnit,
        responsibleUnit: data.responsibleUnit,
        reason: data.reason,
        assignDate: aDate,
        title: data.title,
        segment: data.segment,
        subSegment: data.subSegment
     });
     setCalcResult(calc);
  };

  const parseJsonToExtractedData = (str: string) => {
    // just a helper note, handled in try-catch
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Upload Area */}
      <div className="w-full md:w-1/2 flex flex-col gap-4">
        <div 
          className={clsx(
            "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative",
            imagePreview ? "border-blue-300 bg-blue-50/30" : "border-neutral-300 hover:border-blue-400 bg-neutral-50 hover:bg-blue-50/50"
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileSelected(e.dataTransfer.files[0]);
            }
          }}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) handleFileSelected(e.target.files[0]);
            }}
          />
          
          {imagePreview ? (
            <div className="relative w-full aspect-video">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-lg" />
              <div className="absolute inset-0 bg-black/5 hover:bg-black/20 transition-all flex items-center justify-center opacity-0 hover:opacity-100 rounded-lg">
                <span className="bg-white/90 text-neutral-800 px-3 py-1.5 rounded-md text-sm font-medium shadow-sm">Đổi ảnh khác</span>
              </div>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-800 mb-1">Click hoặc kéo thả ảnh vào đây</h3>
              <p className="text-sm text-neutral-500 mb-4">Định dạng JPG, PNG, WEBP. Hoặc <span className="font-medium text-blue-600">Ctrl+V</span> để dán ảnh trực tiếp.</p>
            </>
          )}
        </div>

        <button
          onClick={analyzeImage}
          disabled={!file || isAnalyzing}
          className={clsx(
            "w-full py-3 px-4 rounded-xl font-medium text-white shadow-sm flex items-center justify-center gap-2 transition-all",
            !file || isAnalyzing ? "bg-neutral-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:shadow-md"
          )}
        >
          {isAnalyzing ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Calculator className="w-5 h-5" />
          )}
          {isAnalyzing ? "Đang phân tích ảnh..." : "Trích xuất & Tính SLA"}
        </button>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="break-words font-medium">{error}</div>
          </div>
        )}
      </div>

      {/* Result Area */}
      <div className="w-full md:w-1/2 flex flex-col gap-4">
        <div className="bg-white border text-left border-neutral-200 rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
          <div className="bg-neutral-50 px-5 py-4 border-b border-neutral-200 font-semibold text-neutral-800 flex justify-between items-center">
            <span>Kết quả tính toán</span>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto bg-neutral-50/30">
            {!extractedData && !calcResult && (
              <div className="text-center text-neutral-400 py-12 flex flex-col items-center">
                <Calculator className="w-12 h-12 mb-3 opacity-20" />
                <p>Thông tin và kết quả sẽ hiển thị ở đây</p>
              </div>
            )}

            {extractedData && (
              <div className="mb-6 flex flex-col gap-4">
                <div className="bg-white border border-neutral-100 rounded-lg p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-neutral-800 mb-3 border-b pb-2 uppercase tracking-wide">Dữ liệu trích xuất</h4>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <div className="text-neutral-500">Mã:</div>
                    <div className="font-medium text-neutral-900">{extractedData.reference || '-'}</div>

                    <div className="text-neutral-500">Tiêu đề:</div>
                    <div className="font-medium text-neutral-900 truncate" title={extractedData.title}>{extractedData.title || '-'}</div>
                    
                    <div className="text-neutral-500">Phân khúc:</div>
                    <div className="font-medium text-neutral-900">{extractedData.segment || '-'}</div>

                    <div className="text-neutral-500">Phân hạng:</div>
                    <div className="font-medium text-neutral-900">{extractedData.subSegment || '-'}</div>

                    <div className="text-neutral-500">Ngày tạo:</div>
                    <div className="font-medium text-neutral-900">{extractedData.createdDateStr || '-'}</div>

                    {extractedData.assignDateStr && (
                      <>
                        <div className="text-neutral-500">Ngày assign:</div>
                        <div className="font-medium text-neutral-900">{extractedData.assignDateStr}</div>
                      </>
                    )}
                    
                    <div className="text-neutral-500">Type:</div>
                    <div className="font-medium text-neutral-900">{extractedData.type || '-'}</div>
                    
                    <div className="text-neutral-500">Category:</div>
                    <div className="font-medium text-neutral-900">{extractedData.category || '-'}</div>
                    
                    <div className="text-neutral-500">Sub Category:</div>
                    <div className="font-medium text-neutral-900 truncate" title={extractedData.subcategory}>{extractedData.subcategory || '-'}</div>

                    <div className="text-neutral-500">Đơn vị xử lý:</div>
                    <div className="font-medium text-neutral-900">{extractedData.processingUnit || '-'}</div>

                    <div className="text-neutral-500">ĐV chịu trách nhiệm:</div>
                    <div className="font-medium text-neutral-900">{extractedData.responsibleUnit || '-'}</div>

                    <div className="text-neutral-500">Nguyên nhân:</div>
                    <div className="font-medium text-neutral-900 truncate" title={extractedData.reason}>{extractedData.reason || '-'}</div>
                  </div>
                </div>

                <div className="bg-white border border-neutral-100 rounded-lg p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-neutral-800 mb-3 border-b pb-2 uppercase tracking-wide">Loại SLA (từ Cột mốc)</h4>
                  <div className="flex flex-wrap gap-2">
                    {extractedData.milestones && extractedData.milestones.length > 0 ? (
                      extractedData.milestones.map((ms, idx) => {
                        const msType = PROCESS_TYPES.find(pt => ms.includes(pt.replace('SLA Process -', '').replace('SLA Process –', '').trim()) || (ms.includes('E2E') && pt.includes('E2E'))) || ms;
                        const isSelected = selectedProcessType === ms;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedProcessType(ms);
                              calculateResultForType(extractedData, ms);
                            }}
                            className={clsx(
                              "text-xs px-3 py-1.5 rounded-full border transition-all",
                              isSelected 
                                ? "bg-blue-100 border-blue-300 text-blue-700 font-medium shadow-sm" 
                                : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:border-neutral-300"
                            )}
                          >
                            {ms}
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-sm text-neutral-500 w-full mb-3">Không tìm thấy cột mốc nào trong ảnh. Hãy chọn loại SLA thủ công:</p>
                    )}
                  </div>
                  
                  {(!extractedData.milestones || extractedData.milestones.length === 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      {PROCESS_TYPES.map((pt, idx) => (
                         <button
                           key={idx}
                           onClick={() => {
                             setSelectedProcessType(pt);
                             calculateResultForType(extractedData, pt);
                           }}
                           className={clsx(
                             "text-xs px-3 py-2 text-left rounded-md border transition-all text-neutral-700 font-medium",
                             selectedProcessType === pt ? "bg-blue-50 border-blue-300 shadow-sm" : "bg-white hover:bg-neutral-50"
                           )}
                         >
                           {pt}
                         </button>
                      ))}
                    </div>
                  )}

                  {selectedProcessType.includes('Tuyến 1') && (
                    <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2">Chọn phạm vi xử lý (Tuyến 1)</h4>
                      <select
                        className="w-full text-sm rounded-md border-neutral-300"
                        value={selectedScope}
                        onChange={(e) => {
                          const newScope = e.target.value as ProcessingScope | '';
                          setSelectedScope(newScope);
                          calculateResultForType(extractedData, selectedProcessType, manualAssignDate, newScope);
                        }}
                      >
                        <option value="">Chọn phạm vi...</option>
                        <option value="Xử lý yêu cầu toàn phần">Xử lý yêu cầu toàn phần</option>
                        <option value="Xử lý yêu cầu 1 phần">Xử lý yêu cầu 1 phần</option>
                        <option value="Xử lý ngoài phạm vi">Xử lý ngoài phạm vi</option>
                        <option value="Yêu cầu ngoại lệ">Yêu cầu ngoại lệ</option>
                      </select>
                    </div>
                  )}

                  {selectedProcessType && PROCESS_WITH_ASSIGN_DATE.includes(selectedProcessType) && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-orange-800 mb-2">Loại SLA này yêu cầu Ngày Assign</h4>
                      <p className="text-xs text-orange-700 mb-4">
                        Khung giờ bắt đầu tính SLA sẽ dựa theo thời gian giao việc gần nhất đến các đơn vị xử lý đích.
                      </p>
                      
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="text-xs font-medium text-neutral-700 mb-1 block">Nhập tay Ngày assign (HH:mm, dd/MM/yyyy)</label>
                          <div className="flex gap-2">
                             <input 
                               type="text" 
                               value={manualAssignDate} 
                               onChange={(e) => setManualAssignDate(e.target.value)}
                               placeholder="VD: 17:12, 06/12/2025"
                               className="flex-1 text-sm rounded-md border-neutral-300"
                             />
                             <button
                                onClick={() => calculateResultForType(extractedData, selectedProcessType, manualAssignDate)}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                             >
                               Tính lại
                             </button>
                          </div>
                        </div>

                        <div className="text-center text-xs text-neutral-500 font-medium border-t border-orange-200 pt-3 mt-1">HOẶC NHẬN DIỆN TỪ ẢNH LỊCH SỬ</div>

                        <div 
                          className={clsx(
                            "border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative",
                            historyImagePreview ? "border-orange-300 bg-white" : "border-orange-300 hover:border-orange-400 bg-white hover:bg-orange-100/50"
                          )}
                          onClick={(e) => {
                             // Only trigger file select if clicking the outer box, not inner buttons
                             if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                               historyFileInputRef.current?.click();
                             }
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              handleHistoryFileSelected(e.dataTransfer.files[0]);
                            }
                          }}
                        >
                          <input 
                            type="file" 
                            ref={historyFileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) handleHistoryFileSelected(e.target.files[0]);
                            }}
                          />
                          
                          {historyImagePreview ? (
                            <div className="w-full flex flex-col items-center gap-3">
                               <img src={historyImagePreview} alt="History Preview" className="max-h-32 object-contain rounded-md border" />
                               <div className="flex gap-2 w-full">
                                  <button
                                     onClick={(e) => { e.stopPropagation(); analyzeHistoryImage(); }}
                                     disabled={isAnalyzingHistory}
                                     className="flex-1 py-1.5 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-semibold shadow flex items-center justify-center gap-1 disabled:opacity-50"
                                  >
                                     {isAnalyzingHistory ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Calculator className="w-3 h-3"/>}
                                     {isAnalyzingHistory ? 'Đang trích xuất...' : 'Trích xuất Ngày Assign'}
                                  </button>
                                  <button
                                     onClick={(e) => { e.stopPropagation(); setHistoryFile(null); setHistoryImagePreview(null); }}
                                     className="px-3 py-1.5 border border-neutral-300 hover:bg-neutral-100 text-neutral-700 rounded-md text-xs font-medium bg-white"
                                  >
                                     Xóa ảnh
                                  </button>
                               </div>
                            </div>
                          ) : (
                            <>
                              <UploadCloud className="w-6 h-6 text-orange-500 mb-1" />
                              <span className="text-sm font-medium text-orange-800">Tải lên ảnh Lịch sử Case</span>
                              <span className="text-xs text-orange-600 mt-1">Hỗ trợ nhận diện lịch sử phân công/gán việc</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {calcResult && (
              <div className="bg-white border-2 border-green-500/20 rounded-lg p-4 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-2 h-full bg-green-500"></div>
                <h4 className="text-sm font-semibold text-green-800 mb-3 uppercase tracking-wide">Target Date Calculated</h4>
                
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                   <div className="flex-[1] flex flex-col items-center justify-center py-4 bg-neutral-50 rounded-lg border border-neutral-200">
                     <div className="text-sm text-neutral-600 font-medium mb-1">Mức SLA</div>
                     <div className="text-xl font-bold tracking-tight text-neutral-800">
                       {calcResult.slaLabel || '-'}
                     </div>
                   </div>
                   
                   <div className="flex-[2] flex flex-col items-center justify-center py-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-sm text-green-700 font-medium mb-1">Target Date / Deadline</div>
                      <div className="text-2xl font-bold tracking-tight text-neutral-900">
                        {calcResult.targetDate ? format(calcResult.targetDate, 'HH:mm, dd/MM/yyyy') : 'N/A'}
                      </div>
                   </div>
                </div>

                <div className="bg-white border rounded-lg overflow-hidden border-neutral-200 mt-4 shadow-sm">
                  <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200 font-semibold text-sm flex items-center gap-2 text-neutral-700">
                     <Info className="w-4 h-4 text-blue-500" />
                     Nhật ký xử lý SLA (Log)
                  </div>
                  <div className="p-4 space-y-3 font-sans text-sm text-neutral-700 leading-relaxed max-h-96 overflow-y-auto">
                    {calcResult.explanation.map((step, idx) => (
                      <div key={idx} className={clsx(
                        "flex gap-3 px-3 py-2 rounded-md transition-colors",
                        step.isHighlight ? "bg-blue-50 border border-blue-100" : "hover:bg-neutral-50"
                      )}>
                        <div className="flex-shrink-0 text-xl leading-none mt-0.5">
                          {step.icon}
                        </div>
                        <div className={clsx(
                           "flex-1",
                           step.isHighlight ? "text-blue-800 font-medium" : "text-neutral-700"
                        )}>
                          {step.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
