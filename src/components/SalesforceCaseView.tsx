import React, { useState } from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { calculateTargetDate, ProcessingScope, CalculationResult, PROCESS_TYPES } from '../lib/sla';
import { UNIT_OPTIONS } from '../lib/unitOptions';
import { APT_CODE_OPTIONS } from '../lib/aptCodeOptions';
import { TYPE_CATEGORY_MAPPING } from '../lib/categoryData';
import { SearchableSelect } from './SearchableSelect';
import { Briefcase, ChevronDown, Edit3, User, Calendar, Calculator, HelpCircle } from 'lucide-react';

export function SalesforceCaseView() {
  const [reference, setReference] = useState('YC00360839');
  const [title, setTitle] = useState('Không nhận được biểu mẫu');
  const [status, setStatus] = useState('New');
  const [assignee, setAssignee] = useState('Đào Quang Anh');
  const [hasSLA, setHasSLA] = useState('Có');
  
  // Left Column
  const [segment, setSegment] = useState('MAF');

  // Right Column fields for SLA
  const [typeStr, setTypeStr] = useState('Complaint');
  const [category, setCategory] = useState('Bieu Mau');
  const [subcategory, setSubcategory] = useState('Không nhận được biểu mẫu');
  
  const typeOptions = ['', ...Object.keys(TYPE_CATEGORY_MAPPING)];
  const categoryOptions = ['', ...(TYPE_CATEGORY_MAPPING[typeStr] ? Object.keys(TYPE_CATEGORY_MAPPING[typeStr]) : [])];
  const subcategoryOptions = ['', ...(TYPE_CATEGORY_MAPPING[typeStr]?.[category] ? TYPE_CATEGORY_MAPPING[typeStr][category] : [])];
  const [source, setSource] = useState('247-Other');
  
  const [processType, setProcessType] = useState<string>('SLA Process - 247 Tuyến 1');
  const [scope, setScope] = useState<ProcessingScope>('Xử lý yêu cầu toàn phần');
  
  const [processingUnit, setProcessingUnit] = useState('');
  const [responsibleUnit, setResponsibleUnit] = useState('');
  const [aptCode, setAptCode] = useState('Hoàn tiền - TGĐ - RB');
  
  const [createdDateStr, setCreatedDateStr] = useState('2026-01-06T17:24');
  const [assignDateStr, setAssignDateStr] = useState('');
  const [subSegment, setSubSegment] = useState('');
  
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleCalculate = () => {
    if (!createdDateStr) return;
    try {
      const createdDate = new Date(createdDateStr);
      const assignDate = assignDateStr ? new Date(assignDateStr) : undefined;
      const calcResult = calculateTargetDate({
        reference: reference || 'N/A',
        createdDate,
        processType,
        scope: processType === 'SLA Process - 247 Tuyến 1' ? scope : undefined,
        segment,
        subSegment,
        subcategory,
        source,
        type: typeStr,
        category,
        processingUnit,
        responsibleUnit,
        aptCode,
        title,
        assignDate
      });
      setResult(calcResult);
    } catch (e) {
      console.error(e);
      alert("Invalid date or inputs.");
    }
  };

  const InputField = ({ label, value, onChange, editable = true }: any) => (
    <div className="border-b border-neutral-200 py-2 flex items-center group">
      <div className="w-1/3 text-xs text-neutral-500 font-medium break-words leading-tight pr-2">{label}</div>
      <div className="w-2/3 flex items-center justify-between">
        {editable ? (
          <input
            type={label.includes('Ngày') || label.includes('Thời gian') ? 'datetime-local' : 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent outline-none text-sm text-neutral-900 placeholder-neutral-300"
            placeholder={`Nhập ${label.toLowerCase()}`}
          />
        ) : (
          <span className="text-sm text-neutral-900">{value}</span>
        )}
        {editable && <Edit3 className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
    </div>
  );

  const SelectField = ({ label, value, onChange, options, editable = true }: any) => (
    <div className="border-b border-neutral-200 py-2 flex items-center group">
      <div className="w-1/3 text-xs text-neutral-500 font-medium break-words leading-tight pr-2">{label}</div>
      <div className="w-2/3 flex items-center justify-between relative">
        {editable ? (
          <SearchableSelect
            value={value}
            onChange={onChange}
            options={options}
            placeholder={`Chọn ${label.toLowerCase()}`}
          />
        ) : (
          <span className="text-sm text-neutral-900">{value}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-[#F3F2F2] font-sans selection:bg-blue-200 h-[calc(100vh-100px)] flex flex-col">
      
      {/* Top action bar mock */}
      <div className="bg-white border-b border-neutral-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-4 shrink-0">
        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded flex items-center justify-center shrink-0">
          <Briefcase className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-neutral-500 font-medium pl-0.5">Tiêu đề (Title)</p>
          <input 
             value={title}
             onChange={e => setTitle(e.target.value)}
             className="text-2xl font-normal text-neutral-900 bg-transparent outline-none m-0 p-0 w-full min-w-[300px]"
          />
        </div>
        
        <div className="ml-auto flex items-center gap-4 text-sm whitespace-nowrap overflow-x-auto pb-1 sm:pb-0">
          <div>
            <p className="text-xs text-neutral-500 mb-0.5">Mã yêu cầu</p>
            <input value={reference} onChange={e=>setReference(e.target.value)} className="font-medium outline-none bg-transparent w-24" />
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-0.5">Trạng Thái</p>
            <p className="font-medium">{status}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-0.5">Phân công cho</p>
            <div className="flex items-center gap-1 font-medium text-blue-600">
               <User className="w-4 h-4" />
               {assignee}
            </div>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-0.5">Thời gian xử lý gốc</p>
            <p className="font-medium">{result ? result.slaLabel : '--'}</p>
          </div>
          <div className="pl-4 border-l border-neutral-200">
             <button 
                onClick={handleCalculate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full font-medium transition-colors flex items-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                Tính Target Date
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] w-full mx-auto p-4 flex gap-4 flex-1 overflow-hidden">
        
        {/* Left Column */}
        <div className="w-[320px] shrink-0 flex flex-col gap-4 overflow-y-auto pb-4 pr-1">
          
          <div className="bg-white rounded border border-neutral-200">
            <div className="p-4 border-b border-neutral-100 flex items-center gap-2">
               <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                 <Briefcase className="w-3.5 h-3.5" />
               </div>
               <h3 className="font-semibold text-neutral-900">Cột Mốc</h3>
            </div>
            <div className="p-4 text-sm text-neutral-600">
               {result ? (
                 <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-neutral-500">Mốc Bắt Đầu Tính (Start Date)</p>
                      <p className="font-medium text-neutral-900 bg-neutral-50 p-2 mt-1 rounded border border-neutral-100">
                        {format(result.startDate, 'HH:mm - dd/MM/yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-emerald-600">Hạn Cuối Cùng (Target Date)</p>
                      <div className="font-bold text-neutral-900 bg-emerald-50 p-2 mt-1 rounded border border-emerald-100 cursor-pointer flex justify-between items-center group hover:bg-emerald-100 transition-colors" onClick={() => setShowExplanation(true)}>
                        {format(result.targetDate, 'HH:mm - dd/MM/yyyy')}
                        <HelpCircle className="w-4 h-4 text-emerald-500 opacity-70 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1 cursor-pointer hover:underline" onClick={() => setShowExplanation(true)}>
                        Xem chi tiết phép tính (Log SLA)
                      </p>
                    </div>
                 </div>
               ) : (
                 <p className="text-neutral-400 italic">Chưa tính toán. Điền thông tin và bấm nút Tính Target Date.</p>
               )}
            </div>
          </div>

          <div className="bg-white rounded border border-neutral-200">
            <div className="p-4 pb-2 border-b border-neutral-100">
              <h3 className="font-semibold text-neutral-900 text-lg">Chi tiết khách hàng</h3>
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-4 p-4 pt-4">
               <div>
                 <p className="text-xs text-neutral-500 mb-1">Phân khúc (Segment)</p>
                 <div className="border border-orange-200 bg-orange-50 rounded focus-within:border-orange-400">
                    <SearchableSelect 
                      value={segment} 
                      onChange={val => { setSegment(val); setSubSegment(''); }}
                      options={["", "AF", "MAF", "MASS", "PRIVATE", "KHCN", "HH", "Others"]}
                    />
                 </div>
               </div>
               {['AF', 'MAF', 'PRIVATE'].includes(segment) && (
                 <div>
                   <p className="text-xs text-neutral-500 mb-1">Cấp độ (Sub-segment)</p>
                   <div className="border border-transparent bg-neutral-50 rounded hover:border-neutral-200 focus-within:border-blue-400">
                     <SearchableSelect 
                        value={subSegment} 
                        onChange={setSubSegment}
                        options={(() => {
                           if (segment === 'AF') return ["", "Af-private", "Af-elite", "Af-preferred", "Af-special"];
                           if (segment === 'MAF') return ["", "Champion", "Rising"];
                           if (segment === 'PRIVATE') return ["", "Official Private", "Pre-Private"];
                           return [];
                        })()}
                     />
                   </div>
                 </div>
               )}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="flex-1 bg-white rounded border border-neutral-200 flex flex-col overflow-hidden">
           
           {/* Tabs */}
           <div className="flex flex-wrap items-center gap-6 px-4 border-b border-neutral-200 pt-2 shrink-0">
              <div className="pb-2 border-b-2 border-blue-600 text-blue-600 font-medium text-sm px-1 cursor-pointer">Chi Tiết Input</div>
           </div>

           {/* Content */}
           <div className="p-4 overflow-y-auto flex-1">
              
              <div className="mb-8">
                <div className="flex items-center gap-1 bg-neutral-100 p-2 rounded mb-4">
                   <ChevronDown className="w-5 h-5 text-neutral-600" />
                   <h3 className="font-medium text-neutral-900">Thông tin config SLA</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 px-4">
                  <div className="space-y-4">
                    <div className="border-b border-neutral-200 py-2 flex justify-between items-center group relative z-10">
                      <span className="w-1/3 text-xs text-neutral-500 font-medium whitespace-nowrap">Loại SLA</span>
                      <div className="w-2/3 bg-orange-50 bg-opacity-30 border border-orange-200 hover:border-orange-300 focus-within:border-orange-500 rounded px-1 transition-colors">
                        <SearchableSelect 
                           value={processType}
                           onChange={setProcessType}
                           options={PROCESS_TYPES}
                        />
                      </div>
                    </div>
                    {processType === 'SLA Process - 247 Tuyến 1' && (
                      <div className="border-b border-neutral-200 py-2 flex justify-between items-center group relative z-0">
                        <span className="w-1/3 text-xs text-neutral-500 font-medium whitespace-nowrap">Quy mô (Scope) T1</span>
                        <div className="w-2/3 bg-transparent border border-transparent hover:border-neutral-200 focus-within:border-blue-400 rounded px-1 transition-colors">
                          <SearchableSelect 
                            value={scope}
                            onChange={(val) => setScope(val as ProcessingScope)}
                            options={["Xử lý yêu cầu toàn phần", "Xử lý yêu cầu 1 phần", "Xử lý ngoài phạm vi", "Yêu cầu ngoại lệ"]}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-1 bg-neutral-100 p-2 rounded mb-4">
                   <ChevronDown className="w-5 h-5 text-neutral-600" />
                   <h3 className="font-medium text-neutral-900">Yêu cầu xử lý thông tin (SLA Inputs)</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 px-4">
                   <div className="flex flex-col gap-1">
                      <SelectField 
                        label="Type" 
                        value={typeStr} 
                        onChange={(val: string) => { setTypeStr(val); setCategory(''); setSubcategory(''); }} 
                        options={typeOptions} 
                      />
                      <SelectField 
                        label="Category" 
                        value={category} 
                        onChange={(val: string) => { setCategory(val); setSubcategory(''); }} 
                        options={categoryOptions} 
                      />
                      <SelectField 
                        label="Sub Category" 
                        value={subcategory} 
                        onChange={setSubcategory} 
                        options={subcategoryOptions} 
                      />
                      <SelectField label="Đơn vị xử lý" value={processingUnit} onChange={setProcessingUnit} options={['', ...UNIT_OPTIONS]} />
                      <SelectField label="Đơn vị chịu trách nhiệm" value={responsibleUnit} onChange={setResponsibleUnit} options={['', ...UNIT_OPTIONS]} />
                   </div>
                   <div className="flex flex-col gap-1">
                      <SelectField 
                        label="Nguồn tạo (Source)" 
                        value={source} 
                        onChange={setSource} 
                        options={[
                          "TBOPS", "Branch- ĐVKD", "Branch- DVKH", "247-Inbound Call", "Email", 
                          "247- Chat", "VPBank Neo", "Website CCP", "Internetcall", "Chatbot", 
                          "Callbot", "247- Outbound Call- Miss Call", "247- Outbound Call", 
                          "247- Facebook", "247-Other", "RCC", "FPID", "RBCSO"
                        ]} 
                      />
                      <InputField label="Ngày tạo (Created Date)" value={createdDateStr} onChange={setCreatedDateStr} />
                      {['SLA Process - 247 Tuyến 2', 'SLA Process - RCC', 'SLA Process - TTT Phát hành', 'SLA Process - TTThe Đối soát', 'SLA Process - TTT Cấu hình', 'SLA Process - TTT Tra soát'].includes(processType) && (
                        <InputField label="Ngày Assign" value={assignDateStr} onChange={setAssignDateStr} />
                      )}
                      
                      <div className="h-6"></div> {/* Spacer */}
                      <SelectField 
                        label="Trạng Thái" 
                        value={status} 
                        onChange={setStatus} 
                        options={["New", "Received", "Wait for internal", "Wait for customer", "Update response", "Resolved", "Cancel"]} 
                      />
                      <SelectField 
                        label="APT Code" 
                        value={aptCode} 
                        onChange={setAptCode} 
                        options={['', ...APT_CODE_OPTIONS]} 
                      />
                   </div>
                </div>
              </div>

           </div>
        </div>
      </div>

      {showExplanation && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowExplanation(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
              <div className="flex items-center gap-2 text-neutral-900">
                 <Calculator className="w-5 h-5" />
                 <h3 className="font-semibold text-lg">Log Hệ thống - Tính toán Target Date</h3>
              </div>
              <button onClick={() => setShowExplanation(false)} className="text-neutral-400 hover:text-neutral-900 text-2xl leading-none transition-colors">
                &times;
              </button>
            </div>
            <div className="p-0 overflow-y-auto max-h-[80vh] bg-white text-sm">
              {result.explanation.map((step, idx) => (
                <div key={idx} className={clsx(
                  "flex gap-3 px-5 py-3 border-b border-neutral-100 last:border-0 transition-colors",
                  step.isHighlight ? "bg-blue-50/50" : "hover:bg-neutral-50"
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
  );
}
