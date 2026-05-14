import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../api';
import { 
  Shield, ArrowRight, Loader2, Lock, 
  Cpu, Server, Code, Terminal, 
  UserPlus, LogIn 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login & Register
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        // --- LOGIN FLOW ---
        const { data } = await auth.login(form.email, form.password);
        localStorage.setItem('token', data.access_token);
        navigate('/scanner');
      } else {
        // --- REGISTER FLOW ---
        await auth.register(form.email, form.password);
        alert("Identity Created Successfully. Please Log In.");
        setIsLogin(true); // Switch back to login view
        setForm({ email: '', password: '' }); // Clear form for fresh login
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Authentication Failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white p-10 rounded-2xl shadow-xl shadow-slate-200/50 w-full max-w-md border border-slate-100 relative overflow-hidden"
      >
        {/* Header Section */}
        <div className="text-center mb-8 relative z-10">
          <div className="bg-[#0076a8] w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/20">
            <Shield className="text-white w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isLogin ? 'Sentinel Enterprise' : 'New Identity'}
          </h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            {isLogin ? 'Secure Quality Engineering Portal' : 'Register Authorized Personnel'}
          </p>
        </div>

        {/* Dynamic Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Identity (Email)</label>
            <input
              type="email"
              placeholder="user@deloitte.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-[#0076a8] focus:ring-1 focus:ring-[#0076a8] outline-none transition-all placeholder:text-slate-400"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Passcode</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-[#0076a8] focus:ring-1 focus:ring-[#0076a8] outline-none transition-all placeholder:text-slate-400"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              required
            />
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-medium flex items-center gap-2"
              >
                <Lock size={12} /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button 
            disabled={loading} 
            className="w-full bg-[#0076a8] hover:bg-[#005a80] text-white py-3 rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 mt-2 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (
              <>
                {isLogin ? 'Authenticate Access' : 'Create Identity'} 
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Toggle Login/Register */}
        <div className="mt-6 text-center border-t border-slate-100 pt-4">
            <button 
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-xs text-slate-400 hover:text-[#0076a8] font-medium flex items-center justify-center gap-2 mx-auto transition-colors py-2 px-4 hover:bg-slate-50 rounded-lg"
            >
                {isLogin ? (
                    <><UserPlus size={14} /> Don't have an account? Register</>
                ) : (
                    <><LogIn size={14} /> Already have an account? Login</>
                )}
            </button>
        </div>
        
        {/* Tech Stack Footer */}
        <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-4">
                Powered By Enterprise Stack
            </p>
            <div className="flex justify-center items-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                <TechBadge icon={Cpu} label="Gemini AI" />
                <TechBadge icon={Server} label="FastAPI" />
                <TechBadge icon={Code} label="React" />
                <TechBadge icon={Terminal} label="Playwright" />
            </div>
        </div>

      </motion.div>
      
      <div className="mt-6 text-xs text-slate-400 font-medium">
        &copy; 2024 Sentinel AI. Authorized Personnel Only.
      </div>
    </div>
  );
}

// Sub-component for Tech Icons
const TechBadge = ({ icon: Icon, label }) => (
    <div className="flex flex-col items-center gap-1 group cursor-default">
        <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-blue-50 group-hover:text-[#0076a8] transition-colors">
            <Icon size={14} />
        </div>
        <span className="text-[8px] font-bold text-slate-500 group-hover:text-slate-700">{label}</span>
    </div>
);