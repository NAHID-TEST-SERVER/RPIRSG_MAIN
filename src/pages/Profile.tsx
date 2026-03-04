import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Building2, 
  Globe, 
  Github, 
  Linkedin, 
  Twitter,
  Save,
  Camera,
  Check,
  AlertCircle,
  Gem,
  Medal,
  Star,
  Activity,
  History,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ref, onValue, set, update, push, query, limitToLast } from 'firebase/database';
import { database } from '../firebase';
import { useAuth } from '../AuthContext';
import { UserProfile, ActivityLog } from '../types';

const getBadge = (diamonds: number): string => {
  if (diamonds >= 1000) return 'Grand Master';
  if (diamonds >= 700) {
    const extra = Math.floor((diamonds - 700) / 50) * 50;
    return extra > 0 ? `Master +${extra}` : 'Master';
  }
  if (diamonds >= 400) {
    const extra = Math.floor((diamonds - 400) / 40) * 40;
    return extra > 0 ? `Hero +${extra}` : 'Hero';
  }
  if (diamonds >= 200) {
    const extra = Math.floor((diamonds - 200) / 30) * 30;
    return extra > 0 ? `Gold +${extra}` : 'Gold';
  }
  if (diamonds >= 100) {
    const extra = Math.floor((diamonds - 100) / 20) * 20;
    return extra > 0 ? `Silver +${extra}` : 'Silver';
  }
  if (diamonds >= 50) {
    const extra = Math.floor((diamonds - 50) / 10) * 10;
    return extra > 0 ? `Bronze +${extra}` : 'Bronze';
  }
  if (diamonds >= 5) return 'Verified';
  return 'Newbie';
};

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    const profileRef = ref(database, `users/${user.uid}/profile`);
    const unsubProfile = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProfile(data);
        // Check for diamond decay
        handleDiamondDecay(data);
      }
      setLoading(false);
    });

    const activityRef = query(ref(database, `users/${user.uid}/activity`), limitToLast(20));
    const unsubActivity = onValue(activityRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const activityList = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        })).reverse();
        setActivities(activityList);
      }
    });

    return () => {
      unsubProfile();
      unsubActivity();
    };
  }, [user]);

  const handleDiamondDecay = async (currentProfile: any) => {
    if (!user || currentProfile.diamonds < 500) return;

    const now = Date.now();
    const lastDecay = currentProfile.lastDiamondDecay || currentProfile.createdAt;
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    if (now - lastDecay >= sevenDaysInMs) {
      const newDiamonds = Math.max(450, currentProfile.diamonds - 50);
      if (newDiamonds !== currentProfile.diamonds) {
        await update(ref(database, `users/${user.uid}/profile`), {
          diamonds: newDiamonds,
          lastDiamondDecay: now,
          badge: getBadge(newDiamonds)
        });

        // Log decay
        const activityRef = push(ref(database, `users/${user.uid}/activity`));
        await set(activityRef, {
          action: 'Diamond Decay',
          details: 'Lost 50 diamonds due to inactivity (Decay System).',
          timestamp: now
        });
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('photoURL', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setStatus(null);

    try {
      const isCompletingFirstTime = !profile.bonusClaimed && 
        profile.fullName && 
        profile.username &&
        profile.photoURL &&
        profile.designation && 
        profile.department;

      const newDiamonds = isCompletingFirstTime ? (profile.diamonds || 0) + 5 : (profile.diamonds || 0);
      const newBadge = getBadge(newDiamonds);

      const updates: any = {
        ...profile,
        diamonds: newDiamonds,
        badge: newBadge,
        updatedAt: Date.now()
      };

      if (isCompletingFirstTime) {
        updates.bonusClaimed = true;
        updates.profileUpdated = true;
        
        // Log activity
        const activityRef = push(ref(database, `users/${user.uid}/activity`));
        await set(activityRef, {
          action: 'Profile Bonus',
          details: 'Earned 5 diamonds for full profile completion!',
          timestamp: Date.now()
        });

        // Notification
        const notifRef = push(ref(database, `users/${user.uid}/notifications`));
        await set(notifRef, {
          title: 'Bonus Diamonds!',
          message: 'You earned 5 diamonds for completing your profile.',
          type: 'system',
          read: false,
          createdAt: Date.now()
        });
      }

      await update(ref(database, `users/${user.uid}/profile`), updates);
      
      setStatus({ 
        type: 'success', 
        text: isCompletingFirstTime ? 'Profile updated! +5 Diamonds earned!' : 'Profile updated successfully' 
      });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setStatus({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">My Profile</h2>
          <p className="text-[11px] text-slate-500 font-medium">Manage your personal information and earn rewards.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowActivity(!showActivity)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Activity size={12} className="text-indigo-500" />
            View Activity
          </button>
          <AnimatePresence>
            {status && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold border ${
                  status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                }`}
              >
                {status.type === 'success' ? <Check size={12} /> : <AlertCircle size={12} />}
                {status.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showActivity && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="p-4 border-bottom border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={14} className="text-indigo-600" />
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Recent Activity</h4>
              </div>
              <span className="text-[9px] font-bold text-slate-400">{activities.length} logs</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
              {activities.length > 0 ? activities.map((log) => (
                <div key={log.id} className="p-2 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 flex items-start gap-3">
                  <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                    <Star size={10} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-800 truncate">{log.action}</p>
                      <span className="text-[8px] font-medium text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[9px] text-slate-500 leading-relaxed mt-0.5">{log.details}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-[10px] text-slate-400 font-medium">No activity recorded yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Header Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ShieldCheck size={120} className="text-indigo-600" />
          </div>
          
          <div className="relative group">
            <div className="h-28 w-28 rounded-3xl bg-indigo-50 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <User size={48} className="text-indigo-200" />
              )}
            </div>
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 h-10 w-10 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all hover:scale-110 active:scale-95"
            >
              <Camera size={18} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
          </div>
          
          <div className="flex-1 text-center sm:text-left space-y-2 relative z-10">
            <div className="space-y-0.5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">{profile.fullName || 'New User'}</h3>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-cyan-50 text-cyan-600 text-[10px] font-bold rounded-full border border-cyan-100 shadow-sm">
                    <Gem size={12} />
                    {profile.diamonds || 0}
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-md">
                    <Medal size={12} />
                    {profile.badge || 'Newbie'}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-bold">@{profile.username || 'username'}</p>
            </div>
            
            <p className="text-[11px] text-slate-500 font-medium max-w-sm">{profile.bio || 'No bio set yet. Tell the team about yourself!'}</p>
            
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-bold rounded-xl border border-indigo-100 uppercase tracking-wider">
                Rank #{profile.rank || '--'}
              </span>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded-xl border border-emerald-100 uppercase tracking-wider">
                {profile.role}
              </span>
              {!profile.bonusClaimed && (profile.diamonds || 0) < 5 && (
                <motion.span 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[9px] font-bold rounded-xl border border-amber-100 uppercase tracking-wider flex items-center gap-1 shadow-sm"
                >
                  <Star size={10} className="fill-amber-400 text-amber-400" />
                  Complete for +5 Diamonds
                </motion.span>
              )}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                <User size={12} className="text-indigo-600" />
              </div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Basic Information</h4>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  disabled
                  value={profile.username || ''}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-2xl text-[11px] text-slate-500 cursor-not-allowed font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={profile.fullName || ''}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-medium"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="email"
                  disabled
                  value={profile.email || ''}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-2xl text-[11px] text-slate-500 cursor-not-allowed font-medium"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Briefcase size={12} className="text-indigo-600" />
              </div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Work Information</h4>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Designation</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={profile.designation || ''}
                  onChange={(e) => handleChange('designation', e.target.value)}
                  placeholder="e.g. Senior Developer"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Department</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={profile.department || ''}
                  onChange={(e) => handleChange('department', e.target.value)}
                  placeholder="e.g. Engineering"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Bio</label>
              <textarea
                value={profile.bio || ''}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Tell the team about your skills and interests..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all min-h-[90px] resize-none font-medium"
              />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Globe size={12} className="text-indigo-600" />
            </div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connect Socials</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative group">
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
              <input
                type="text"
                value={profile.socialLinks?.github || ''}
                onChange={(e) => handleChange('socialLinks', { ...profile.socialLinks, github: e.target.value })}
                placeholder="GitHub Profile"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-medium"
              />
            </div>
            <div className="relative group">
              <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
              <input
                type="text"
                value={profile.socialLinks?.linkedin || ''}
                onChange={(e) => handleChange('socialLinks', { ...profile.socialLinks, linkedin: e.target.value })}
                placeholder="LinkedIn Profile"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-medium"
              />
            </div>
            <div className="relative group">
              <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
              <input
                type="text"
                value={profile.socialLinks?.twitter || ''}
                onChange={(e) => handleChange('socialLinks', { ...profile.socialLinks, twitter: e.target.value })}
                placeholder="Twitter Profile"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-medium"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold py-3 px-10 rounded-2xl transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
