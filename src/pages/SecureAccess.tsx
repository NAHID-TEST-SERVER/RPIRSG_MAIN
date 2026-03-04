import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { ref, push, get } from 'firebase/database';
import { database } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

const SecureAccess: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const navigate = useNavigate();
  const { setStealthRole } = useAuth();

  useEffect(() => {
    if (lockTimer > 0) {
      const timer = setTimeout(() => setLockTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (lockTimer === 0 && isLocked) {
      setIsLocked(false);
      setAttempts(0);
    }
  }, [lockTimer, isLocked]);

  const logAttempt = async (success: boolean, role: string | null) => {
    try {
      const logRef = ref(database, 'secure_login_logs');
      await push(logRef, {
        username_attempted: username,
        timestamp: Date.now(),
        success,
        role_detected: role || 'none',
        ip: 'hidden'
      });
    } catch (error) {
      console.error("Logging failed:", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    
    setError('');
    setLoading(true);

    // 1. Check Root Admin
    if (username === 'NAHIDUL79' && password === '51535759') {
      await logAttempt(true, 'root_admin');
      setStealthRole('root_admin');
      navigate('/admin-dashboard');
      return;
    }

    // 2. Check Moderator/Admin in Firebase users node
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      const users = snapshot.val() || {};
      
      // Find a user with the matching username/password and role moderator or admin
      const foundUser = Object.values(users).find((u: any) => {
        const profile = u.profile || {};
        return (
          (profile.username === username || profile.email === username) && 
          profile.password === password &&
          (profile.role === 'moderator' || profile.role === 'admin')
        );
      });
      
      if (foundUser) {
        const role = (foundUser as any).profile.role;
        await logAttempt(true, role);
        setStealthRole(role);
        navigate(role === 'admin' ? '/admin-dashboard' : '/moderator-dashboard');
        return;
      }
    } catch (error) {
      console.error("User check failed:", error);
    }

    // 3. Denied
    await logAttempt(false, null);
    setError('Invalid credentials');
    setLoading(false);
    
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (newAttempts >= 5) {
      setIsLocked(true);
      setLockTimer(30);
      setError('Too many failed attempts. System locked for 30s.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[350px] space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 bg-indigo-600 rounded-2xl items-center justify-center text-white shadow-xl shadow-indigo-100 mb-2">
            <Shield size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Admin / Moderator Login</h1>
          <p className="text-[11px] text-slate-500 font-medium">Secure Access Protocol</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600"
              >
                <AlertCircle size={14} className="shrink-0" />
                <p className="text-[10px] font-bold leading-tight">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                  placeholder="Admin ID"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-[11px] flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : isLocked ? `Locked (${lockTimer}s)` : 'Login'}
              {!loading && !isLocked && <ArrowRight size={14} />}
            </button>
          </form>
        </div>

        <div className="text-center">
          <Link 
            to="/login" 
            className="text-[11px] font-bold text-slate-400 hover:text-indigo-600 transition-colors"
          >
            Back to User Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default SecureAccess;
