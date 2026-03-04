import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Plus, 
  Search, 
  CheckCircle2,
  XCircle,
  Gem,
  Zap,
  FileText,
  Trash2,
  ShieldAlert,
  Activity,
  Check,
  X,
  Star,
  Medal,
  Edit3,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ref, onValue, get, set, push, update, remove } from 'firebase/database';
import { database } from '../firebase';
import { useAuth } from '../AuthContext';
import { UserProfile, Challenge, ChallengeDifficulty, Submission } from '../types';

const Admin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'challenges' | 'submissions'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Challenge Form State
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDesc, setChallengeDesc] = useState('');
  const [challengeDiff, setChallengeDiff] = useState<ChallengeDifficulty>('medium');
  const [challengeReward, setChallengeReward] = useState(10);
  const [challengeDeadline, setChallengeDeadline] = useState('');

  useEffect(() => {
    if (!user) return;

    const checkAdmin = async () => {
      const profileRef = ref(database, `users/${user.uid}/profile`);
      const snapshot = await get(profileRef);
      const profile = snapshot.val();
      if (profile && (profile.role === 'admin' || profile.role === 'root_admin')) {
        setIsAdmin(true);
        fetchData();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    };

    const fetchData = () => {
      // Users
      const usersRef = ref(database, 'users');
      onValue(usersRef, (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({ 
          uid: id, 
          ...(val.profile || val) 
        }));
        setUsers(list);
      });

      // Challenges
      const challengesRef = ref(database, 'challenges');
      onValue(challengesRef, (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.entries(data).map(([id, c]: [string, any]) => ({ id, ...c }));
        setChallenges(list);
      });

      // Submissions
      const submissionsRef = ref(database, 'submissions');
      onValue(submissionsRef, (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.entries(data).map(([id, s]: [string, any]) => ({ id, ...s }));
        setSubmissions(list.sort((a, b) => b.createdAt - a.createdAt));
        setLoading(false);
      });
    };

    checkAdmin();
  }, [user]);

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const challengeData = {
      title: challengeTitle,
      description: challengeDesc,
      difficulty: challengeDiff,
      reward: challengeReward,
      deadline: challengeDeadline ? new Date(challengeDeadline).getTime() : Date.now() + 86400000 * 7,
      status: 'active',
      createdBy: user?.uid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      const newRef = push(ref(database, 'challenges'));
      await set(newRef, challengeData);
      
      setIsChallengeModalOpen(false);
      setChallengeTitle('');
      setChallengeDesc('');
      setChallengeDiff('medium');
      setChallengeReward(10);
      setChallengeDeadline('');
    } catch (error) {
      console.error('Error creating challenge:', error);
    }
  };

  const handleApproveSubmission = async (submission: Submission) => {
    if (!isAdmin) return;
    
    try {
      await update(ref(database, `submissions/${submission.id}`), {
        status: 'approved',
        reviewedBy: user?.uid,
        approvedAt: Date.now()
      });

      await update(ref(database, `challenges/${submission.taskId}`), {
        status: 'completed',
        updatedAt: Date.now()
      });

      const challenge = challenges.find(c => c.id === submission.taskId);
      const reward = challenge?.reward || 10;
      
      const userProfileRef = ref(database, `users/${submission.userId}/profile`);
      const userSnapshot = await get(userProfileRef);
      const userProfile = userSnapshot.val() as UserProfile;
      
      const newDiamonds = (userProfile.diamonds || 0) + reward;
      
      let newBadge = userProfile.badge || 'none';
      if (newDiamonds >= 500) newBadge = 'platinum';
      else if (newDiamonds >= 300) newBadge = 'gold';
      else if (newDiamonds >= 100) newBadge = 'silver';

      await update(userProfileRef, {
        diamonds: newDiamonds,
        badge: newBadge
      });

      const notifRef = push(ref(database, `users/${submission.userId}/notifications`));
      await set(notifRef, {
        title: 'Challenge Approved!',
        message: `Your submission for "${challenge?.title}" was approved. You earned ${reward} diamonds!`,
        type: 'submission',
        read: false,
        createdAt: Date.now()
      });

      const activityRef = push(ref(database, `users/${submission.userId}/activity`));
      await set(activityRef, {
        action: 'Challenge Approved',
        details: `Admin approved your work for "${challenge?.title}"`,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error approving submission:', error);
    }
  };

  const handleRejectSubmission = async (submission: Submission) => {
    if (!isAdmin) return;
    try {
      await update(ref(database, `submissions/${submission.id}`), {
        status: 'rejected',
        reviewedBy: user?.uid
      });

      const challenge = challenges.find(c => c.id === submission.taskId);
      
      const notifRef = push(ref(database, `users/${submission.userId}/notifications`));
      await set(notifRef, {
        title: 'Submission Rejected',
        message: `Your submission for "${challenge?.title}" was rejected. Please review and try again.`,
        type: 'submission',
        read: false,
        createdAt: Date.now()
      });
    } catch (error) {
      console.error('Error rejecting submission:', error);
    }
  };

  const deleteChallenge = async (id: string) => {
    if (window.confirm('Delete this challenge?')) {
      await remove(ref(database, `challenges/${id}`));
    }
  };

  const togglePassword = (uid: string) => {
    setShowPasswords(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  const handleDeleteUser = async (uid: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await remove(ref(database, `users/${uid}`));
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const { uid, ...profileData } = editingUser;
      await update(ref(database, `users/${uid}/profile`), profileData);
      setEditingUser(null);
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.fullName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  if (!isAdmin && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
        <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
          <ShieldAlert size={32} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Access Denied</h3>
          <p className="text-[11px] text-slate-500">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield size={20} className="text-indigo-600" />
            Admin Control Center
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">Manage challenges, review submissions, and control user rewards.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsChallengeModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold py-2 px-4 rounded-xl transition-all shadow-sm active:scale-95"
          >
            <Plus size={14} />
            New Challenge
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit">
        {(['users', 'challenges', 'submissions'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all capitalize ${
              activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-end">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diamonds</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Badge</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px] overflow-hidden">
                          {u.photoURL ? <img src={u.photoURL} alt="" className="h-full w-full object-cover" /> : u.fullName?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-900">{u.fullName}</p>
                          <p className="text-[9px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        u.role === 'admin' || u.role === 'root_admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-600">
                        <Gem size={12} />
                        {u.diamonds || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        u.badge === 'platinum' ? 'bg-slate-900 text-white' :
                        u.badge === 'gold' ? 'bg-amber-100 text-amber-700' :
                        u.badge === 'silver' ? 'bg-slate-100 text-slate-700' :
                        'bg-slate-50 text-slate-400'
                      }`}>
                        {u.badge || 'none'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-500">
                          {showPasswords[u.uid] ? (u.password || '********') : '••••••••'}
                        </span>
                        <button 
                          onClick={() => togglePassword(u.uid)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          {showPasswords[u.uid] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u.uid)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Challenge</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Difficulty</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reward</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {challenges.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-[11px] font-bold text-slate-900">{c.title}</p>
                      <p className="text-[9px] text-slate-400 truncate max-w-[200px]">{c.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[9px] font-bold uppercase text-slate-600">{c.difficulty}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-600">
                        <Gem size={12} />
                        {c.reward}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        c.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => deleteChallenge(c.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Challenge</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submission</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-[11px] font-bold text-slate-900">{s.userName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[11px] font-bold text-slate-600">
                        {challenges.find(c => c.id === s.taskId)?.title || 'Unknown'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <a href={s.fileUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-[10px] font-bold flex items-center gap-1">
                        <FileText size={12} />
                        View Work
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        s.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                        s.status === 'rejected' ? 'bg-red-50 text-red-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {s.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleApproveSubmission(s)}
                            className="h-7 w-7 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg flex items-center justify-center transition-all"
                          >
                            <Check size={14} />
                          </button>
                          <button 
                            onClick={() => handleRejectSubmission(s)}
                            className="h-7 w-7 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg flex items-center justify-center transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Challenge Modal */}
      <AnimatePresence>
        {isChallengeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChallengeModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">New Challenge</h3>
                <button onClick={() => setIsChallengeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateChallenge} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Title</label>
                  <input
                    type="text"
                    required
                    value={challengeTitle}
                    onChange={(e) => setChallengeTitle(e.target.value)}
                    placeholder="Challenge title..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Difficulty</label>
                    <select
                      value={challengeDiff}
                      onChange={(e) => setChallengeDiff(e.target.value as ChallengeDifficulty)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Reward (Diamonds)</label>
                    <input
                      type="number"
                      required
                      value={challengeReward}
                      onChange={(e) => setChallengeReward(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Deadline</label>
                  <input
                    type="date"
                    required
                    value={challengeDeadline}
                    onChange={(e) => setChallengeDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Description</label>
                  <textarea
                    required
                    value={challengeDesc}
                    onChange={(e) => setChallengeDesc(e.target.value)}
                    placeholder="Challenge details..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all min-h-[80px] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-xl transition-all shadow-md active:scale-95"
                >
                  Create Challenge
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Edit User Profile</h3>
                <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editingUser.fullName || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Role</label>
                    <select
                      value={editingUser.role || 'user'}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="moderator">Moderator</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Diamonds</label>
                    <input
                      type="number"
                      required
                      value={editingUser.diamonds || 0}
                      onChange={(e) => setEditingUser({ ...editingUser, diamonds: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Badge</label>
                  <select
                    value={editingUser.badge || 'none'}
                    onChange={(e) => setEditingUser({ ...editingUser, badge: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="none">None</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-xl transition-all shadow-md active:scale-95"
                >
                  Save Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;
