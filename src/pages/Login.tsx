import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { auth, googleProvider, database } from '../firebase';
import { ref, get, set, query, orderByChild, equalTo } from 'firebase/database';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, Chrome, ArrowRight, AlertCircle, Eye, EyeOff, ShieldCheck, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState(''); // Email or Username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { setStealthRole } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Hardcoded Admin Check
    if (identifier === 'NAHIDUL79' && password === '51535759') {
      setStealthRole('root_admin');
      sessionStorage.setItem('stealthRole', 'root_admin');
      setSuccess('Login Successful (Admin)');
      setTimeout(() => navigate('/admin-dashboard'), 1000);
      return;
    }

    try {
      let emailToLogin = identifier;

      // If identifier doesn't look like an email, assume it's a username
      if (!identifier.includes('@')) {
        const usersRef = ref(database, 'users');
        // Workaround for missing index: Fetch all users and filter client-side
        const snapshot = await get(usersRef);
        
        let foundUser = null;
        if (snapshot.exists()) {
          const users = snapshot.val();
          foundUser = Object.values(users).find((u: any) => 
            u.profile?.username?.toLowerCase() === identifier.toLowerCase()
          ) as any;
        }

        if (foundUser) {
          emailToLogin = foundUser.profile.email;
        } else {
          // Check moderators node too
          const modRef = ref(database, `moderators/${identifier}`);
          const modSnapshot = await get(modRef);
          if (modSnapshot.exists() && modSnapshot.val().password === password) {
            setStealthRole('moderator');
            sessionStorage.setItem('stealthRole', 'moderator');
            setSuccess('Login Successful (Moderator)');
            setTimeout(() => navigate('/moderator-dashboard'), 1000);
            return;
          }
          throw new Error('User not found');
        }
      }

      const userCredential = await signInWithEmailAndPassword(auth, emailToLogin, password);
      const user = userCredential.user;
      
      // Check if user is a moderator trying to login through normal login
      const userRef = ref(database, `users/${user.uid}/profile`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const profile = snapshot.val();
        if (profile.role === 'moderator') {
          await auth.signOut();
          setError('Unauthorized entry point.');
          setLoading(false);
          return;
        }
      }
      
      setSuccess('Login Successful');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err: any) {
      console.error("Login Error:", err);
      setError('Invalid Credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = ref(database, `users/${user.uid}/profile`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        const baseUsername = user.email?.split('@')[0] || 'user';
        let finalUsername = baseUsername;
        
        // Check uniqueness for Google users too
        const usersRef = ref(database, 'users');
        const usersSnapshot = await get(usersRef);
        
        if (usersSnapshot.exists()) {
          const users = usersSnapshot.val();
          const isTaken = Object.values(users).some((u: any) => 
            u.profile?.username?.toLowerCase() === finalUsername.toLowerCase()
          );
          
          if (isTaken) {
            finalUsername = `${baseUsername}${Math.floor(Math.random() * 1000)}`;
          }
        }

        await set(userRef, {
          uid: user.uid,
          username: finalUsername,
          fullName: user.displayName || finalUsername,
          email: user.email,
          role: 'user',
          status: 'active',
          diamonds: 0,
          rank: 0,
          badge: 'Verified',
          createdAt: Date.now(),
          lastLogin: Date.now(),
          provider: "google",
          profileUpdated: false,
          bonusClaimed: false,
          streak: 0,
          lastActivity: Date.now()
        });
      } else {
        const profile = snapshot.val();
        if (profile.role === 'moderator') {
          await auth.signOut();
          setError('Unauthorized entry point.');
          setLoading(false);
          return;
        }
        // Update last login
        await set(ref(database, `users/${user.uid}/profile/lastLogin`), Date.now());
        await set(ref(database, `users/${user.uid}/profile/lastActivity`), Date.now());
      }

      setSuccess('Login Successful');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!identifier || !identifier.includes('@')) {
      setError('Please enter your email first to reset password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, identifier);
      setResetSent(true);
      setError('');
      setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[320px] w-full space-y-2 bg-white p-5 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100"
      >
        <div className="text-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mx-auto h-10 w-10 flex items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100"
          >
            <LogIn size={20} />
          </motion.div>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-900">
            Welcome Back
          </h2>
          <p className="mt-0.5 text-[10px] text-slate-500 font-medium">
            Sign in to access your dashboard
          </p>
        </div>
        
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 border border-red-100 p-2 text-red-600 text-[10px] rounded-xl flex items-center gap-2"
            >
              <AlertCircle size={12} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-50 border border-emerald-100 p-2 text-emerald-600 text-[10px] rounded-xl flex items-center gap-2"
            >
              <ShieldCheck size={12} className="shrink-0" />
              <span>{success}</span>
            </motion.div>
          )}
          {resetSent && (
            <motion.div 
              key="reset"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-indigo-50 border border-indigo-100 p-2 text-indigo-600 text-[10px] rounded-xl flex items-center gap-2"
            >
              <ShieldCheck size={12} className="shrink-0" />
              <span>Reset email sent! Check your inbox.</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form className="space-y-2.5" onSubmit={handleLogin}>
          <div className="space-y-2">
            <div className="space-y-0.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Username or Email</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                <input
                  type="text"
                  required
                  className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all text-[11px]"
                  placeholder="Username or Email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[9px] font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all text-[11px]"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
 
          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent text-[11px] font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="pt-1">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="px-2 bg-white text-slate-400 font-bold uppercase tracking-widest">Or</span>
            </div>
          </div>

          <div className="mt-2.5">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/10 transition-all active:scale-[0.98]"
            >
              <Chrome className="text-red-500" size={14} />
              Continue with Google
            </button>
          </div>
        </div>

        <div className="text-center pt-2 space-y-2">
          <p className="text-[11px] text-slate-500 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
              Sign up
            </Link>
          </p>
          <Link 
            to="/secure-access" 
            className="block text-[11px] text-slate-400 opacity-60 hover:opacity-100 transition-opacity"
          >
            System Access
          </Link>
        </div>

      </motion.div>
    </div>
  );
};

export default Login;
