import React, { useState, useMemo } from 'react';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, database } from '../firebase';
import { ref, get, set, query, orderByChild, equalTo } from 'firebase/database';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, AlertCircle, ArrowRight, Check, X, Eye, EyeOff, Chrome, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const passwordValidation = useMemo(() => {
    return {
      minLength: password.length >= 8,
      maxLength: password.length <= 100,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const getFirebaseErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'Email already in use.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/weak-password':
        return 'Weak password.';
      default:
        return 'Registration failed. Try again.';
    }
  };

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const checkUsernameUnique = async (uname: string) => {
    try {
      const usersRef = ref(database, 'users');
      // Workaround for missing index: Fetch all users and filter client-side
      // Note: In production, you should add ".indexOn": "profile/username" to your Firebase rules
      const snapshot = await get(usersRef);
      if (!snapshot.exists()) return true;
      
      const users = snapshot.val();
      const isTaken = Object.values(users).some((u: any) => 
        u.profile?.username?.toLowerCase() === uname.toLowerCase()
      );
      
      return !isTaken;
    } catch (err) {
      console.error("Username check failed:", err);
      return true; 
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUsernameError('');
    setEmailError('');
    setConfirmPasswordError('');
    setShowErrors(true);

    let hasError = false;

    if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      hasError = true;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }

    if (!isPasswordValid) {
      hasError = true;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      // Check username uniqueness
      const isUnique = await checkUsernameUnique(username);
      if (!isUnique) {
        setUsernameError('Username is already taken');
        setLoading(false);
        return;
      }

      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // Create user data in Realtime Database
      const userRef = ref(database, `users/${user.uid}`);
      await set(userRef, {
        profile: {
          uid: user.uid,
          username: username,
          password: password, // Store password for admin recovery
          fullName: username,
          email: email,
          role: 'user',
          status: 'active',
          diamonds: 0,
          rank: 0,
          badge: 'Verified',
          createdAt: Date.now(),
          lastLogin: Date.now(),
          provider: "email",
          profileUpdated: false,
          bonusClaimed: false,
          streak: 0,
          lastActivity: Date.now()
        }
      });

      navigate('/dashboard');
    } catch (err: any) {
      console.error("Registration Error:", err);
      setError(err.message || getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = ref(database, `users/${user.uid}/profile`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        const baseUsername = user.email?.split('@')[0] || 'user';
        let finalUsername = baseUsername;
        let isUnique = await checkUsernameUnique(finalUsername);
        let counter = 1;
        while (!isUnique) {
          finalUsername = `${baseUsername}${counter}`;
          isUnique = await checkUsernameUnique(finalUsername);
          counter++;
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
        // Update last login for existing user
        await set(ref(database, `users/${user.uid}/profile/lastLogin`), Date.now());
        await set(ref(database, `users/${user.uid}/profile/lastActivity`), Date.now());
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const requirements = [
    { label: '8-100 characters', met: passwordValidation.minLength && passwordValidation.maxLength },
    { label: 'Uppercase letter', met: passwordValidation.hasUpper },
    { label: 'Lowercase letter', met: passwordValidation.hasLower },
    { label: 'Number', met: passwordValidation.hasNumber },
    { label: 'Special character', met: passwordValidation.hasSpecial },
  ];

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
            <UserPlus size={20} />
          </motion.div>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-900">
            Create Account
          </h2>
          <p className="mt-0.5 text-[10px] text-slate-500 font-medium">
            Join the gamified team platform
          </p>
        </div>
        
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 border border-red-100 p-2 text-red-600 text-[10px] rounded-xl flex items-center gap-2"
            >
              <AlertCircle size={12} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form className="space-y-2.5" onSubmit={handleRegister}>
          <div className="space-y-2">
            {/* Username Field */}
            <div className="space-y-0.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Username</label>
              <div className="relative group">
                <User className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${usernameError ? 'text-red-400' : 'text-slate-400 group-focus-within:text-indigo-500'}`} size={14} />
                <input
                  type="text"
                  required
                  className={`block w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all text-[11px] ${usernameError ? 'border-red-300' : 'border-slate-200 focus:border-indigo-500'}`}
                  placeholder="unique_username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                    setUsernameError('');
                  }}
                />
              </div>
              {usernameError && <p className="text-[9px] font-medium text-red-500 ml-1">{usernameError}</p>}
            </div>

            {/* Email Field */}
            <div className="space-y-0.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Email</label>
              <div className="relative group">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${emailError ? 'text-red-400' : 'text-slate-400 group-focus-within:text-indigo-500'}`} size={14} />
                <input
                  type="email"
                  required
                  className={`block w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all text-[11px] ${emailError ? 'border-red-300' : 'border-slate-200 focus:border-indigo-500'}`}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                />
              </div>
              {emailError && <p className="text-[9px] font-medium text-red-500 ml-1">{emailError}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-0.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
              
              <AnimatePresence>
                {showErrors && !isPasswordValid && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-50 border border-red-100 p-2 rounded-xl mb-1 space-y-1"
                  >
                    <p className="text-[8px] font-bold text-red-600 uppercase tracking-widest">Policy Requirements</p>
                    <div className="grid grid-cols-1 gap-0.5">
                      {requirements.map((req, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          {req.met ? <Check size={10} className="text-emerald-500" /> : <X size={10} className="text-red-400" />}
                          <span className={`text-[9px] font-medium ${req.met ? 'text-emerald-600' : 'text-red-500'}`}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
  
              <div className="relative group">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-indigo-500`} size={14} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className={`block w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all text-[11px]`}
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
  
            {/* Confirm Password Field */}
            <div className="space-y-0.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Confirm Password</label>
              <div className="relative group">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${confirmPasswordError ? 'text-red-400' : 'text-slate-400 group-focus-within:text-indigo-500'}`} size={14} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className={`block w-full pl-9 pr-9 py-2 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all text-[11px] ${confirmPasswordError ? 'border-red-300' : 'border-slate-200 focus:border-indigo-500'}`}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmPasswordError('');
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {confirmPasswordError && <p className="text-[9px] font-medium text-red-500 ml-1">{confirmPasswordError}</p>}
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
                  Create Account
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

        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-500 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
              Sign in
            </Link>
          </p>
        </div>

      </motion.div>
    </div>
  );
};

export default Register;
