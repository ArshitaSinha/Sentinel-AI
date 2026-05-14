import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { endpoints } from '../api';
import { Clock, ChevronRight, Layout as LayoutIcon, ExternalLink, Shield, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function History() {
  const [history, setHistory] = useState([]);
  const [jiraTickets, setJiraTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistoryData = async () => {
      try {
        const [histRes, jiraRes] = await Promise.all([
          endpoints.getHistory(),
          endpoints.getJiraDashboard()
        ]);
        setHistory(histRes.data || []);
        setJiraTickets(jiraRes.data?.tickets || []);
      } catch (err) {
        console.error("Archive Sync Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistoryData();
  }, []);

  return (
    <Layout>
      <div className="bg-midnight" /><div className="bg-neon-grid" />
      
      <header className="mb-10 relative z-10">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl font-black text-white mb-2 tracking-tight italic uppercase"
        >
          Deployment <span className="text-blue-500">Logs</span>
        </motion.h1>
        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black tracking-[0.3em] uppercase">
          <Clock size={14} className="text-blue-500" />
          System Archive // Enterprise Backlog Sync
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* LEFT COLUMN: HISTORICAL SCANS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-4 px-2">
            <Shield size={12} className="text-blue-500/50" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Previous Executions</span>
          </div>

          {loading ? (
             <div className="p-20 text-center animate-pulse text-slate-700 font-black text-[10px] uppercase tracking-widest">
                Accessing Encrypted Logs...
             </div>
          ) : history.length === 0 ? (
            <div className="bg-slate-900/20 border border-slate-800 border-dashed rounded-[2rem] p-20 text-center text-slate-700 font-black text-[10px] uppercase tracking-widest">
              No historical data in archive
            </div>
          ) : (
            history.map((run, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ x: 10 }}
                key={run.id} 
                className="flex items-center justify-between p-6 bg-slate-900/40 hover:bg-blue-600/5 rounded-2xl border border-slate-800 hover:border-blue-500/30 transition-all group cursor-pointer backdrop-blur-md"
              >
                <div className="flex items-center gap-6">
                  <div className="h-12 w-12 bg-black rounded-xl flex items-center justify-center border border-slate-800 text-slate-500 font-mono text-xs group-hover:border-blue-500/50 group-hover:text-blue-400 transition-all shadow-inner">
                    #{run.id}
                  </div>
                  <div>
                    <div className="text-slate-100 font-bold text-sm tracking-tight">{run.project_path}</div>
                    <div className="text-slate-600 text-[10px] font-black mt-1 uppercase tracking-widest">
                        Validated: {new Date(run.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-700 group-hover:text-blue-400 transition-colors" />
              </motion.div>
            ))
          )}
        </div>

        {/* RIGHT COLUMN: JIRA SYNC WIDGET */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4 px-2">
            <LayoutIcon size={12} className="text-blue-500/50" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Jira Backlog</span>
          </div>
          
          <div className="bg-slate-900/60 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-2xl h-fit sticky top-10 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-1.5 text-emerald-500">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-widest">Live</span>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                 <div className="py-10 text-center animate-pulse text-slate-700 text-[10px] font-black uppercase tracking-widest">Syncing Jira...</div>
              ) : jiraTickets.length === 0 ? (
                <div className="py-10 text-center text-slate-700">
                  <AlertCircle size={20} className="mx-auto mb-2 opacity-20" />
                  <p className="text-[10px] uppercase font-black tracking-widest">Connection Offline</p>
                </div>
              ) : (
                jiraTickets.map((t) => (
                  <div key={t.id} className="p-4 bg-black/40 rounded-xl border border-slate-800/50 hover:border-blue-500/20 transition-all group">
                    <div className="flex justify-between mb-2">
                      <span className="text-blue-500/60 text-[9px] font-bold font-mono uppercase group-hover:text-blue-400 transition-colors">{t.id}</span>
                      <span className={`text-[8px] font-black px-1.5 rounded uppercase border ${
                        t.priority === 'Highest' || t.priority === 'High' ? 'text-rose-500 border-rose-500/20 bg-rose-500/5' : 'text-slate-500 border-slate-800'
                      }`}>{t.priority}</span>
                    </div>
                    <div className="text-slate-300 text-[11px] font-bold leading-tight mb-2 truncate">{t.title}</div>
                    <div className="text-slate-600 text-[9px] font-black uppercase tracking-tighter">{t.status}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}