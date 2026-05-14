import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LabelList 
} from 'recharts';
import { 
  Terminal, ArrowLeft, CloudUpload, Play, 
  Loader2, X, CheckCircle, AlertTriangle, Eye, Sparkles, Box, FileCode, Activity, Code, Lightbulb,
  FileSpreadsheet, Clipboard, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { endpoints } from './api'; 

// --- HELPER: Smart Gap Analysis Renderer ---
const GapAnalysisRenderer = ({ data }) => {
  if (!data) return <p className="text-slate-400 italic text-xs">Waiting for analysis...</p>;
  
  if (typeof data === 'string') {
    if (data.includes('- ') || data.includes('\n')) {
      const items = data.split(/\n|;/).map(s => s.replace(/^- /, '').trim()).filter(s => s.length > 2);
      return (
        <ul className="space-y-2 mt-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-amber-900 text-xs md:text-sm leading-relaxed animate-in fade-in slide-in-from-left-2 duration-500" style={{animationDelay: `${i * 100}ms`}}>
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }
    return <p className="text-amber-900 text-sm leading-relaxed">{data}</p>;
  }
  
  if (typeof data === 'object') {
     const content = data.summary || data.gap_analysis || JSON.stringify(data);
     return <p className="text-amber-900 text-sm leading-relaxed">{String(content)}</p>;
  }
  
  return <p className="text-amber-900 text-xs">Data unavailable.</p>;
};

export default function ResultsDisplay({ data = [], chartData = [], meta = {}, onReset }) {
  const [jiraModalOpen, setJiraModalOpen] = useState(false);
  const [codeModal, setCodeModal] = useState(null); 
  const [evidenceModal, setEvidenceModal] = useState(null); 
  const [runningId, setRunningId] = useState(null); 
  const [isExportingCSV, setIsExportingCSV] = useState(false);

  // --- SMART STATUS LOGIC ---
  const hasMeta = meta && Object.keys(meta).length > 0;
  const hasData = data && data.length > 0;
  
  // Dynamic Header Text based on "Waterfall" stage
  let statusText = "Initializing...";
  let isThinking = true;

  if (!hasMeta && !hasData) {
      statusText = "Scanning Architecture...";
  } else if (hasMeta && !hasData) {
      statusText = "Designing Scenarios...";
  } else if (hasData) {
      statusText = `Powered by ${data[0]?.generated_by || "Gemini 2.0 Flash"}`;
      isThinking = false;
  }

  // --- HANDLERS ---
  const handleCSVExport = async () => {
    setIsExportingCSV(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/export/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_cases: data }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Sentinel_Report_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert("Failed to generate CSV. Please check backend logs.");
      }
    } catch (error) {
      console.error("CSV Export Error:", error);
      alert("Error connecting to server for CSV export.");
    } finally {
        setIsExportingCSV(false);
    }
  };

  const handleJiraPush = async (credentials) => {
    try {
      await endpoints.exportToJira({
        test_cases: data,
        credentials: credentials,
        project_summary: meta?.project_summary || "Automated Export"
      });
      alert("Success: Tickets pushed to Jira.");
      setJiraModalOpen(false);
    } catch (e) {
      const errorMsg = e.response?.data?.detail || e.message || "Check credentials";
      alert("Export Failed: " + errorMsg);
    }
  };

  const handleRunSingle = async (testCase, index) => {
    setRunningId(index);
    try {
      const res = await endpoints.runTest(testCase.code);
      setEvidenceModal({
        title: testCase.test_case_name,
        code: testCase.code,   
        logs: res.logs || res.data?.logs || "No output returned.",
        status: res.success ? "Passed" : "Failed"
      });
    } catch (e) {
      alert("Execution Failed: " + e.message);
    } finally {
      setRunningId(null);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white text-xs p-2 rounded-lg shadow-xl border border-slate-700">
          <p className="font-bold mb-1">{label}</p>
          <p className="text-emerald-400">Count: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full max-w-7xl mx-auto">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
            <button onClick={onReset} className="text-slate-400 hover:text-slate-600 text-sm font-medium flex items-center gap-2 transition-colors">
            <ArrowLeft size={16} /> Return
            </button>
            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
            <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100 shadow-sm transition-all duration-500">
                <Sparkles size={12} className={isThinking ? "text-blue-500 animate-pulse" : "text-blue-500"} />
                {statusText}
            </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={handleCSVExport}
                disabled={!hasData || isExportingCSV}
                className="bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isExportingCSV ? <Loader2 size={16} className="animate-spin"/> : <FileSpreadsheet size={16} />} 
                Export CSV
            </button>

            <button 
                onClick={() => setJiraModalOpen(true)}
                disabled={!hasData}
                className="bg-white border border-slate-200 text-slate-700 hover:border-[#0076a8] hover:text-[#0076a8] px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <CloudUpload size={16} /> Push to Jira
            </button>
        </div>
      </div>

      {/* --- EXECUTIVE ANALYSIS CARD --- */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 relative overflow-hidden min-h-[220px]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 z-0" />
        <h3 className="relative z-10 text-xs font-bold text-slate-500 mb-6 uppercase tracking-wider flex items-center gap-2">
            <Activity size={14} /> Executive Analysis
            {!hasMeta && <span className="ml-2 text-indigo-500 text-[10px] animate-pulse">Scanning Codebase...</span>}
        </h3>
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Architecture Column */}
            <div className="flex flex-col">
                <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                    <Box size={14} className="text-slate-400"/> Architecture Overview
                </h4>
                <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-100 flex-1 transition-all duration-500">
                    {hasMeta ? (
                         <p className="text-slate-600 text-sm leading-relaxed animate-in fade-in">{meta.project_summary}</p>
                    ) : (
                        <div className="space-y-2 animate-pulse">
                             <div className="h-2 bg-slate-200 rounded w-3/4"></div>
                             <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                             <div className="h-2 bg-slate-200 rounded w-5/6"></div>
                        </div>
                    )}
                </div>
            </div>
            {/* Gap Analysis Column */}
            <div className="flex flex-col">
                <h4 className="font-bold text-amber-900 text-sm mb-3 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-600"/> Critical Risk Assessment
                </h4>
                <div className="bg-amber-50/80 p-5 rounded-xl border border-amber-100 flex-1 max-h-[180px] overflow-y-auto custom-scrollbar">
                    {hasMeta ? (
                        <GapAnalysisRenderer data={meta.gap_analysis} />
                    ) : (
                        <div className="space-y-2 animate-pulse mt-1">
                             <div className="h-2 bg-amber-200/50 rounded w-full"></div>
                             <div className="h-2 bg-amber-200/50 rounded w-2/3"></div>
                             <div className="h-2 bg-amber-200/50 rounded w-3/4"></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* --- DASHBOARD GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* CHART SECTION */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-1 h-[500px] flex flex-col">
          <h3 className="text-xs font-bold text-slate-500 mb-6 uppercase tracking-wider">Complexity Distribution</h3>
          <div className="flex-1 w-full -ml-4 flex items-center justify-center">
            {chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={40}>
                    <defs>
                        <linearGradient id="colorSimple" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.8}/>
                            <stop offset="100%" stopColor="#10b981" stopOpacity={1}/>
                        </linearGradient>
                        <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.8}/>
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity={1}/>
                        </linearGradient>
                        <linearGradient id="colorComplex" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fb7185" stopOpacity={0.8}/>
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity={1}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData?.map((e, i) => (
                        <Cell key={i} fill={`url(#color${e.name})`} />
                    ))}
                    <LabelList dataKey="value" position="top" fill="#94a3b8" fontSize={12} fontWeight="bold" />
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex flex-col items-center text-slate-300 animate-pulse">
                    <Activity size={48} className="mb-2 opacity-50"/>
                    <span className="text-xs font-medium">Calculating Metrics...</span>
                </div>
            )}
          </div>
        </div>

        {/* --- TEST CASES TABLE SECTION --- */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm lg:col-span-2 overflow-hidden flex flex-col h-[500px]">
           <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
                        <Terminal size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Generated Scenarios</h3>
                        <p className="text-[10px] text-slate-500 font-medium">
                            {isThinking ? "Designing test scenarios..." : `${data.length} test cases ready for review`}
                        </p>
                    </div>
                </div>
                {isThinking && <Loader2 size={16} className="text-indigo-500 animate-spin" />}
           </div>
           
           <div className="flex-1 overflow-auto custom-scrollbar relative">
             {!hasData ? (
                // LOADING SKELETON FOR TABLE
                <div className="p-6 space-y-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex gap-4 animate-pulse">
                            <div className="h-10 w-10 bg-slate-100 rounded-full flex-shrink-0"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                                <div className="h-3 bg-slate-100 rounded w-3/4"></div>
                            </div>
                            <div className="h-8 w-20 bg-slate-100 rounded"></div>
                        </div>
                    ))}
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
                         <div className="bg-white px-6 py-3 rounded-full shadow-xl border border-slate-100 flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                            <Loader2 size={18} className="animate-spin text-blue-500" />
                            <span className="text-xs font-bold text-slate-600 tracking-wide uppercase">
                                {hasMeta ? "Writing Tests..." : "Analyzing..."}
                            </span>
                         </div>
                    </div>
                </div>
             ) : (
                // DATA TABLE
                <table className="w-full text-left text-sm animate-in fade-in slide-in-from-bottom-2">
                    <thead className="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-100 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            <th className="p-3 pl-5 text-xs uppercase tracking-wider font-bold text-slate-400">Scenario Details</th>
                            <th className="p-3 text-xs uppercase tracking-wider font-bold text-slate-400 w-32">Complexity</th>
                            <th className="p-3 text-right pr-5 text-xs uppercase tracking-wider font-bold text-slate-400 w-32">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.map((tc, i) => (
                            <tr key={i} className="hover:bg-slate-50/80 transition-all group">
                                <td className="p-4 pl-5">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 flex-shrink-0">
                                        <CheckCircle size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="font-bold text-slate-700 text-sm group-hover:text-indigo-600 transition-colors truncate">
                                                {tc.test_case_name}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium line-clamp-2" title={tc.description}>
                                                {tc.description || "No description provided."}
                                            </p>
                                            {tc.reasoning && (
                                            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-400 italic">
                                                <Lightbulb size={10} className="text-amber-400" />
                                                <span className="truncate">Logic: {tc.reasoning}</span>
                                            </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 align-top pt-5">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border shadow-sm ${
                                        tc.complexity === 'Simple' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                        tc.complexity === 'Complex' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                                    }`}>
                                        {tc.complexity}
                                    </span>
                                </td>
                                <td className="p-4 align-top pt-4 text-right pr-5">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => setCodeModal(tc.code)} 
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100"
                                            title="View Source Code"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleRunSingle(tc, i)} 
                                            disabled={runningId === i} 
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-[#0076a8] text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm hover:shadow-md active:scale-95"
                                        >
                                            {runningId === i ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                                            Run
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             )}
           </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {codeModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <motion.div 
                    initial={{scale:0.95, opacity:0}} 
                    animate={{scale:1, opacity:1}} 
                    exit={{scale:0.95, opacity:0}} 
                    className="bg-[#1e1e1e] w-full max-w-4xl rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[85vh]"
                >
                    <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
                        <span className="text-emerald-400 font-mono text-xs flex items-center gap-2 font-bold tracking-wider">
                            <FileCode size={14}/> PYTHON SOURCE CODE
                        </span>
                        <button onClick={()=>setCodeModal(null)} className="text-slate-400 hover:text-white transition-colors"><X size={18}/></button>
                    </div>
                    <div className="flex-1 overflow-auto p-6 bg-[#1e1e1e] custom-scrollbar">
                        <pre className="font-mono text-xs md:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{codeModal}</pre>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {evidenceModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <motion.div 
                    initial={{scale:0.95, opacity:0}} 
                    animate={{scale:1, opacity:1}} 
                    exit={{scale:0.95, opacity:0}} 
                    className="bg-white w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 h-[80vh]"
                >
                    {/* --- FIXED HEADER SECTION --- */}
                    <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle size={18} className="text-emerald-500"/> 
                                <h3 className="font-bold text-slate-800">
                                    {/* 1. NAME FORMATTER: Adds spaces to CamelCase and snake_case */}
                                    {evidenceModal.title 
                                        ? evidenceModal.title.replace(/_/g, " ").replace(/([A-Z])/g, ' $1').trim() 
                                        : "Diagnostic Execution"}
                                </h3>
                            </div>

                            {/* 2. DYNAMIC STATUS: Checks Logs for success keywords */}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                (evidenceModal.logs?.includes("PASSED") || evidenceModal.logs?.includes("1 passed") || evidenceModal.status === "Passed")
                                ? "bg-emerald-100 text-emerald-600" 
                                : "bg-red-100 text-red-600"
                            }`}>
                                {(evidenceModal.logs?.includes("PASSED") || evidenceModal.logs?.includes("1 passed")) ? "PASSED" : "FAILED"}
                            </span>
                        </div>
                        
                        <button onClick={()=>setEvidenceModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={20}/>
                        </button>
                    </div>
                    {/* --- END FIXED HEADER SECTION --- */}
                    
                    <div className="flex flex-col md:flex-row h-full overflow-hidden">
                        <div className="w-full md:w-1/2 bg-[#1e1e1e] p-0 flex flex-col border-r border-slate-700">
                             <div className="bg-[#2d2d2d] px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-black/20 flex items-center gap-2">
                                <Code size={12}/> Source Logic
                             </div>
                             <div className="flex-1 overflow-auto p-5 custom-scrollbar">
                                <pre className="font-mono text-xs text-blue-300 whitespace-pre-wrap leading-loose">{evidenceModal.code}</pre>
                             </div>
                        </div>

                        <div className="w-full md:w-1/2 bg-[#0f172a] p-0 flex flex-col">
                             <div className="bg-[#1e293b] px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700 flex justify-between items-center">
                                <span className="flex items-center gap-2"><Terminal size={12}/> Console Output</span>
                                <span className="text-emerald-500 animate-pulse text-[10px] font-mono">● LIVE CONNECTION</span>
                             </div>
                             <div className="flex-1 overflow-auto p-5 custom-scrollbar">
                                <pre className="font-mono text-xs text-emerald-400 whitespace-pre-wrap leading-loose">{evidenceModal.logs}</pre>
                             </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {jiraModalOpen && (
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <motion.div 
                    initial={{scale:0.95, opacity:0}} 
                    animate={{scale:1, opacity:1}} 
                    exit={{scale:0.95, opacity:0}} 
                    className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-100"
                >
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2"><CloudUpload size={18} className="text-[#0076a8]"/> Push to Jira</h3>
                        <button onClick={()=>setJiraModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                    </div>
                    <JiraForm onSubmit={handleJiraPush} />
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const JiraForm = ({ onSubmit }) => {
    const [form, setForm] = useState({ url: '', email: '', api_token: '', project_key: '' });
    return (
        <>
            <div className="p-6 space-y-4">
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jira Site URL</label><input className="w-full border-slate-200 border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={form.url} onChange={e=>setForm({...form, url: e.target.value})} placeholder="https://your-domain.atlassian.net"/></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input className="w-full border-slate-200 border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} placeholder="you@company.com"/></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Token</label><input type="password" className="w-full border-slate-200 border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={form.api_token} onChange={e=>setForm({...form, api_token: e.target.value})} placeholder="••••••••"/></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Key</label><input className="w-full border-slate-200 border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={form.project_key} onChange={e=>setForm({...form, project_key: e.target.value})} placeholder="KAN"/></div>
                </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-end">
                <button onClick={()=>onSubmit(form)} className="bg-[#0076a8] hover:bg-[#005a80] text-white px-6 py-2.5 rounded-lg font-medium shadow-lg shadow-blue-500/10 transition-all text-sm">Confirm Export</button>
            </div>
        </>
    );
};