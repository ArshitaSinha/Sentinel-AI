import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Zap, LogOut } from 'lucide-react';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen z-50 shadow-sm">
        
        {/* BRANDING */}
        <div className="p-8 flex items-center gap-3">
          <div className="bg-[#0076a8] p-2 rounded-lg shadow-lg shadow-blue-900/10">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 leading-tight tracking-tight">Sentinel</div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Enterprise</div>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-4 mt-6">
          <Link
            to="/scanner"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              location.pathname.includes('scanner') 
                ? 'bg-slate-100 text-[#0076a8] border border-slate-200 shadow-sm' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Zap size={18} />
            Active Scan
          </Link>
        </nav>

        {/* LOGOUT */}
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all group"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            End Session
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}