import React, { useState } from 'react';
import ResultsDisplay from '../ResultsDisplay'; 
import { Folder, Github, FileArchive, ArrowRight, Loader2, ShieldAlert, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; 

export default function Scanner() {
  const navigate = useNavigate(); 
  const [mode, setMode] = useState('local');
  const [path, setPath] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  
  // --- STREAMING STATES ---
  const [isScanning, setIsScanning] = useState(false); 
  const [meta, setMeta] = useState(null);              
  const [results, setResults] = useState([]);          
  const [chartData, setChartData] = useState([]);      

  // --- LOGOUT FUNCTION ---
  const handleLogout = () => {
    localStorage.removeItem('token'); 
    navigate('/login');               
  };

  // --- HELPER: Calculate Chart Data ---
  // ✅ FIX APPLIED HERE
  const updateChart = (testCases) => {
    const counts = { Simple: 0, Medium: 0, Complex: 0 };
    
    testCases.forEach(tc => {
      // Normalize to lowercase to handle 'Low', 'LOW', 'low' etc.
      const c = tc.complexity ? tc.complexity.toLowerCase() : 'medium';

      // Map 'low' or 'simple' to the Simple category
      if (c === 'simple' || c === 'low') {
        counts.Simple++;
      } 
      // Map 'high' or 'complex' to the Complex category
      else if (c === 'complex' || c === 'high') {
        counts.Complex++;
      } 
      // Default everything else to Medium
      else {
        counts.Medium++;
      }
    });

    setChartData([
      { name: 'Simple', value: counts.Simple },
      { name: 'Medium', value: counts.Medium },
      { name: 'Complex', value: counts.Complex },
    ]);
  };

  const handleScan = async () => {
    setError(null);
    setIsScanning(true); 
    setMeta(null);
    setResults([]);
    setChartData([]);

    try {
      if (mode === 'upload' && !file) {
        throw new Error("Please select a ZIP file to upload.");
      }
      if ((mode === 'local' || mode === 'github') && !path.trim()) {
        throw new Error("Please enter a path or URL.");
      }
      // Use backend port 8000 (backend runs on 127.0.0.1:8000)
      const endpoint = "http://127.0.0.1:8000/api/generate-tests"; 
      let body;
      let headers = {};

      if (mode === 'upload') {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("action", "generate");
        body = formData;
      } else {
        headers = { "Content-Type": "application/json" };
        body = JSON.stringify({ path, mode, action: 'generate' });
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        let errorMsg = `Server Error: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) errorMsg = errorData.detail;
        } catch (e) {
          // If not JSON, use statusText
          errorMsg = `Server Error: ${response.statusText || response.status}`;
        }
        throw new Error(errorMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split("\n");
        buffer = lines.pop(); 

        for (const line of lines) {
          if (line.trim()) parseAndHandleMessage(line);
        }
      }
      if (buffer.trim()) parseAndHandleMessage(buffer);

    } catch (err) {
      console.error(err);
      setError(err.message || "An unexpected connection error occurred.");
      setIsScanning(false);
    }
  };

  const parseAndHandleMessage = (jsonStr) => {
    try {
      const msg = JSON.parse(jsonStr);
      if (msg.type === 'analysis_result') setMeta(msg.data);
      else if (msg.type === 'test_results') {
        const tests = msg.data.test_cases || [];
        setResults(tests);
        // Update chart whenever new tests arrive
        updateChart(tests);
      }
      else if (msg.type === 'error') {
         setError(msg.message);
         setIsScanning(false);
      }
    } catch (e) {
      console.warn("Skipping invalid JSON chunk:", e);
    }
  };

  const handleReset = () => {
    setIsScanning(false);
    setResults([]);
    setMeta(null);
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto relative">
        
        {/* --- LOGOUT BUTTON --- */}
        {!isScanning && (
            <div className="absolute top-0 left-0">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-slate-400 hover:text-red-600 text-xs font-bold transition-colors uppercase tracking-wider px-2 py-1"
                >
                    <LogOut size={14} /> Logout
                </button>
            </div>
        )}

        {/* VIEW 1: INPUT FORM */}
        {!isScanning ? (
          <div className="max-w-3xl mx-auto pt-10 animate-in fade-in duration-500">
            <div className="mb-10 mt-6">
              <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Test Space</h1>
              <p className="text-slate-500 text-sm">Select the source code repository for architectural analysis.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex gap-4 mb-8 border-b border-slate-100 pb-1">
                <TabBtn active={mode==='local'} onClick={()=>setMode('local')} icon={Folder} label="Local Path" />
                <TabBtn active={mode==='github'} onClick={()=>setMode('github')} icon={Github} label="GitHub URL" />
                <TabBtn active={mode==='upload'} onClick={()=>setMode('upload')} icon={FileArchive} label="Upload ZIP" />
              </div>

              <div className="mb-8 min-h-[80px]">
                {mode === 'upload' ? (
                  <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-[#0076a8] hover:bg-blue-50/50 transition-all group">
                    <input type="file" className="hidden" accept=".zip" onChange={(e) => setFile(e.target.files[0])} />
                    <span className="text-sm font-medium text-slate-600 group-hover:text-[#0076a8] transition-colors">
                      {file ? file.name : "Click to upload .zip archive"}
                    </span>
                  </label>
                ) : (
                  <input 
                    type="text" 
                    value={path} 
                    onChange={(e) => setPath(e.target.value)} 
                    placeholder={mode === 'local' ? "/Users/project/src" : "https://github.com/org/repo"} 
                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-800 text-sm focus:border-[#0076a8] focus:ring-1 focus:ring-[#0076a8] outline-none transition-all placeholder:text-slate-400 font-mono" 
                  />
                )}
              </div>

              {error && (
                 <div className="mb-6 bg-rose-50 text-rose-600 p-4 rounded-xl text-xs font-bold flex items-center gap-3 border border-rose-100">
                   <ShieldAlert size={16}/> {error}
                 </div>
              )}

              <button 
                onClick={handleScan}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95"
              >
                Initialize Analysis <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* VIEW 2: RESULTS DASHBOARD */
          <ResultsDisplay 
             data={results} 
             meta={meta} 
             chartData={chartData} 
             onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}

const TabBtn = ({ active, onClick, icon: Icon, label }) => (
    <button 
      onClick={onClick} 
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2 ${
        active ? 'border-[#0076a8] text-[#0076a8]' : 'border-transparent text-slate-400 hover:text-slate-600'
      }`}
    >
        <Icon size={16} /> {label}
    </button>
);