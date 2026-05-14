import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { endpoints } from '../api';
import { 
  Activity, 
  Layout as LayoutIcon, 
  Zap, 
  Shield, 
  ArrowRight, 
  Clock, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const [jiraTickets, setJiraTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [histRes, jiraRes] = await Promise.all([
          endpoints.getHistory(),
          endpoints.getJiraDashboard()
        ]);
        setHistory(histRes.data || []);
        // Note: backend returns { success: true, tickets: [...] }
        setJiraTickets(jiraRes.data?.tickets || []);
      } catch (err) {
        console.error("Dashboard Sync Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <Layout>
      <div className="bg-midnight" />
      <div className="bg-neon-grid" />

      <header className="mb-10">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl font-bold text-white mb-2 tracking-tight italic uppercase"
        >
          Sentinel <span className="text-blue-500">Command</span>
        </motion.h1>
        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black tracking-[0.3em] uppercase">
          <Shield size={14} className="text-emerald-500 animate-pulse" />
          System Status: Online // Backlog Synced
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* ACTION CARD: DEPLOY AGENT */}
        <motion.div 
          whileHover={{ translateY: -5 }}
          className="bg-gradient-to-br from-blue-600/20 to-indigo-900/20 border border-blue-500/30 rounded-[2.5rem] p-10 text-white relative overflow-hidden backdrop-blur-md group shadow-2xl"
        >
          <div className="relative z-10">
            <div className="bg-blue-500/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/40">
              <Zap size={24} className="text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3 uppercase tracking-tighter italic">Initialize Agent</h2>
            <p className="text-blue-200/60 mb-8 max-w-sm leading-relaxed text-sm font-medium">
              Deploy the Ensemble Engine to map architecture, generate Playwright test suites, and calculate ROI metrics.
            </p>
            <Link to="/scanner" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all inline-flex items-center gap-2 hover:bg-blue-500 hover:gap-4 shadow-xl shadow-blue-900/40">
              New Deployment <ArrowRight size={16} />
            </Link>
          </div>
          <Activity size={240} className="absolute -right-20 -bottom-20 text-blue-500/5 group-hover:text-blue-500/10 transition-all duration-700" />
        </motion.div>

        {/* JIRA BACKLOG WIDGET */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-md flex flex-col shadow-2xl h-[380px]">
          <div className="flex justify-between items-center mb-6 px-2">
            <h3 className="font-black text-slate-400 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
              <LayoutIcon className="text-blue-500" size={16} /> Enterprise Backlog
            </h3>
            <div className="flex items-center gap-1.5 text-emerald-500">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-widest">Live Sync</span>
            </div>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2 px-2">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-600 text-[10px] uppercase font-black tracking-widest animate-pulse">Synchronizing Jira...</div>
            ) : jiraTickets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-2">
                <ExternalLink size={24} className="opacity-20" />
                <p className="text-[10px] uppercase font-black tracking-widest">No active tickets found</p>
              </div>
            ) : (
              jiraTickets.map((t) => (
                <div key={t.id} className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-slate-800/50 hover:border-blue-500/30 transition-all group">
                  <div className="truncate pr-4">
                    <div className="text-slate-200 text-sm font-bold truncate group-hover:text-blue-400 transition-colors">{t.title}</div>
                    <div className="text-slate-600 text-[10px] font-black mt-1 uppercase tracking-widest flex items-center gap-2">
                      <span className="text-blue-500/60">{t.id}</span> 
                      <span>•</span> 
                      <span>{t.assignee || 'Unassigned'}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border ${
                    t.priority === 'Highest' || t.priority === 'High'
                    ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}>{t.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* DEPLOYMENT LOGS */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-2 mb-8 px-2">
            <Clock size={16} className="text-blue-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Deployment History Logs</span>
        </div>

        {history.length === 0 && !loading ? (
          <div className="text-center py-12 text-slate-800 font-black text-[10px] uppercase tracking-widest">No previous scan data found.</div>
        ) : (
          <div className="space-y-3 px-2">
            {history.map((run) => (
              <motion.div 
                whileHover={{ x: 5 }}
                key={run.id} 
                className="flex items-center justify-between p-5 bg-black/20 hover:bg-blue-500/[0.03] rounded-2xl border border-slate-800/50 hover:border-blue-500/30 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-6">
                  <div className="h-10 w-10 bg-black rounded-xl flex items-center justify-center border border-slate-800 text-slate-500 font-mono text-[10px] group-hover:border-blue-500/50 group-hover:text-blue-400 transition-all">
                    #{run.id}
                  </div>
                  <div>
                    <div className="text-slate-100 font-bold text-sm tracking-tight">{run.project_path}</div>
                    <div className="text-slate-600 text-[10px] font-black mt-1 uppercase tracking-widest">
                        {new Date(run.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-slate-700 group-hover:text-blue-400 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden md:block">Retrieve Archive</span>
                  <ChevronRight size={18} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}