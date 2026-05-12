import React, { useState, useRef } from 'react';
import { Calculator, UploadCloud, FileText, Image as ImageIcon } from 'lucide-react';
import clsx from 'clsx';
import { FileUpload } from './components/FileUpload';
import { SalesforceCaseView } from './components/SalesforceCaseView';
import { ImageAnalyzerTab } from './components/ImageAnalyzerTab';
import BatchSlaCheckTab from './components/BatchSlaCheckTab';
import SlaAiAnalysisTab from './components/SlaAiAnalysisTab';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'image' | 'check' | 'ai'>('single');
  const processRef = useRef<any>(null);
  
  return (
    <div className="min-h-screen bg-[#F3F2F2] flex flex-col p-4 sm:p-8 font-sans pb-24">
      <div className="w-full">
        {/* Header Setup */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-blue-600 text-white rounded-xl shadow-sm">
               <Calculator className="w-8 h-8" />
             </div>
             <div>
               <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">SLA Logic Engine</h1>
               <p className="text-neutral-500">Hệ thống tính toán Target Date / Service Level Agreement</p>
             </div>
          </div>
          
           {/* Tabs */}
           <div className="flex bg-neutral-200/60 p-1 rounded-xl shrink-0">
             <button
               onClick={() => setActiveTab('single')}
               className={clsx(
                 "px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                 activeTab === 'single' ? "bg-white text-blue-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
               )}
             >
               <FileText className="w-4 h-4" />
               Tính từng Case
             </button>
             <button
               onClick={() => setActiveTab('image')}
               className={clsx(
                 "px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                 activeTab === 'image' ? "bg-white text-blue-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
               )}
             >
               <ImageIcon className="w-4 h-4" />
               Tính qua Ảnh
             </button>
             <button
               onClick={() => setActiveTab('batch')}
               className={clsx(
                 "px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                 activeTab === 'batch' ? "bg-white text-blue-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
               )}
             >
               <UploadCloud className="w-4 h-4" />
               Tính hàng loạt
             </button>
             <button
               onClick={() => setActiveTab('check')}
               className={clsx(
                 "px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                 activeTab === 'check' ? "bg-white text-blue-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
               )}
             >
               <UploadCloud className="w-4 h-4" />
               Kiểm Tra File SLA
             </button>
             <button
               onClick={() => setActiveTab('ai')}
               className={clsx(
                 "px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                 activeTab === 'ai' ? "bg-white text-blue-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
               )}
             >
               <Sparkles className="w-4 h-4" />
               AI Phân tích
             </button>
          </div>
        </div>

        {activeTab === 'single' && (
          <div className="mt-4 border border-neutral-200 rounded-lg overflow-hidden shadow-sm max-w-[1600px] mx-auto bg-white">
             <SalesforceCaseView />
          </div>
        )}
        
        {activeTab === 'image' && (
          <div className="max-w-6xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-neutral-200 mt-4">
             <ImageAnalyzerTab />
          </div>
        )}
        
        {activeTab === 'batch' && (
          <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-neutral-200 mt-4">
             <FileUpload onProcessRef={processRef} />
          </div>
        )}

        {activeTab === 'check' && (
           <BatchSlaCheckTab />
        )}

        {activeTab === 'ai' && (
           <SlaAiAnalysisTab />
        )}

      </div>
    </div>
  );
}
