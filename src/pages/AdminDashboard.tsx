import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove, update, get } from 'firebase/database';
import { database } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Users, 
  Activity, 
  LogOut, 
  Database, 
  AlertTriangle, 
  Terminal, 
  Search, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff,
  X,
  Check,
  UserPlus,
  Settings,
  ShieldAlert,
  Plus,
  MoreVertical,
  Info,
  Gem,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const AdminDashboard: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'moderators' | 'challenges' | 'submissions' | 'system'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddChallenge, setShowAddChallenge] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    reward: 50,
    difficulty: 'medium' as const,
    deadline: '',
    status: 'active' as const
  });
  const [newUser, setNewUser] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    role: 'user'
  });
  
  const [stats, setStats] = useState({
    totalAttempts: 0,
    successRate: 0,
    totalUsers: 0,
    activeModerators: 0,
    totalChallenges: 0
  });
  
  const navigate = useNavigate();
  const { setStealthRole } = useAuth();

  useEffect(() => {
    // Fetch Logs
    const logsRef = ref(database, 'secure_login_logs');
    const unsubLogs = onValue(logsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
      const sorted = list.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(sorted);

      const success = list.filter(l => l.success).length;
      setStats(prev => ({
        ...prev,
        totalAttempts: list.length,
        successRate: list.length > 0 ? Math.round((success / list.length) * 100) : 0
      }));
    });

    // Fetch Users
    const usersRef = ref(database, 'users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ 
        uid: id, 
        ...(val.profile || val) 
      }));
      setUsers(list);
      setStats(prev => ({ 
        ...prev, 
        totalUsers: list.length,
        activeModerators: list.filter(u => u.role === 'moderator').length
      }));
    });

    // Fetch Challenges
    const challengesRef = ref(database, 'challenges');
    const unsubChallenges = onValue(challengesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
      setChallenges(list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      setStats(prev => ({ ...prev, totalChallenges: list.length }));
    });

    // Fetch Submissions
    const submissionsRef = ref(database, 'submissions');
    const unsubSubmissions = onValue(submissionsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
      setSubmissions(list.sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => {
      unsubLogs();
      unsubUsers();
      unsubChallenges();
      unsubSubmissions();
    };
  }, []);

  const handleLogout = () => {
    setStealthRole(null);
    navigate('/secure-access');
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

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userRef = push(ref(database, 'users'));
      const uid = userRef.key;
      if (!uid) return;

      const profile = {
        uid,
        ...newUser,
        password: newUser.password, // Ensure password is in profile for admin view
        diamonds: 0,
        badge: 'none',
        status: 'active',
        createdAt: Date.now(),
        lastLogin: Date.now(),
        profileUpdated: false,
        bonusClaimed: false
      };

      await set(ref(database, `users/${uid}/profile`), profile);
      setShowAddUser(false);
      setNewUser({ fullName: '', username: '', email: '', password: '', role: 'user' });
    } catch (error) {
      console.error("Add user failed:", error);
    }
  };

  const handleAddChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const challengeRef = push(ref(database, 'challenges'));
      await set(challengeRef, {
        ...newChallenge,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      setShowAddChallenge(false);
      setNewChallenge({
        title: '',
        description: '',
        reward: 50,
        difficulty: 'medium',
        deadline: '',
        status: 'active'
      });
    } catch (error) {
      console.error("Add challenge failed:", error);
    }
  };

  const handleApproveSubmission = async (submission: any) => {
    if (!window.confirm(`Approve submission from ${submission.userName}?`)) return;

    try {
      const { taskId, userId, reward, id: submissionId, title } = submission;

      if (!taskId || !submissionId) {
        alert('Error: Missing task or submission ID');
        return;
      }

      // 1. Update challenge status
      await update(ref(database, `challenges/${taskId}`), {
        submissionStatus: 'approved',
        updatedAt: Date.now()
      });

      // 2. Update submission status
      await update(ref(database, `submissions/${submissionId}`), {
        status: 'approved',
        claimable: true,
        approvedAt: Date.now()
      });

      // 3. Notify user
      const notifRef = push(ref(database, `users/${userId}/notifications`));
      await set(notifRef, {
        title: 'Challenge Approved! 🎉',
        message: `Your work for "${title}" has been approved. You can now claim your ${reward} diamonds in the Challenges page!`,
        type: 'success',
        read: false,
        createdAt: Date.now()
      });

      // 4. Log activity for user
      const activityRef = push(ref(database, `users/${userId}/activity`));
      await set(activityRef, {
        action: 'Submission Approved',
        details: `Work for "${title}" was approved. Reward: ${reward} Diamonds (Pending Claim)`,
        timestamp: Date.now()
      });

      alert('Submission approved! User can now claim diamonds.');
    } catch (error) {
      console.error("Approval failed:", error);
      alert('Failed to approve submission: ' + (error as Error).message);
    }
  };

  const handleRejectSubmission = async (submission: any) => {
    const reason = window.prompt('Enter rejection reason:');
    if (reason === null || reason.trim() === '') return;

    try {
      const { taskId, userId, id: submissionId, title } = submission;

      if (!taskId || !submissionId) {
        alert('Error: Missing task or submission ID');
        return;
      }

      // 1. Update submission status
      await update(ref(database, `submissions/${submissionId}`), {
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: Date.now()
      });

      // 2. Update challenge status to allow resubmission
      await update(ref(database, `challenges/${taskId}`), {
        submissionStatus: 'rejected',
        updatedAt: Date.now()
      });

      // 3. Notify user
      const notifRef = push(ref(database, `users/${userId}/notifications`));
      await set(notifRef, {
        title: 'Submission Rejected',
        message: `Your work for "${title}" was rejected. Reason: ${reason}`,
        type: 'error',
        read: false,
        createdAt: Date.now()
      });

      alert('Submission rejected.');
    } catch (error) {
      console.error("Rejection failed:", error);
      alert('Failed to reject submission: ' + (error as Error).message);
    }
  };

  const handleDeleteChallenge = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this challenge?')) return;
    try {
      await remove(ref(database, `challenges/${id}`));
      alert('Challenge deleted.');
    } catch (error) {
      console.error("Delete challenge failed:", error);
    }
  };

  const handleUpdateChallengeStatus = async (id: string, status: string) => {
    try {
      await update(ref(database, `challenges/${id}`), {
        status,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error("Update challenge status failed:", error);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.fullName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (u.username?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-6 mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
            <Shield size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Command Center</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
              System Online | Role: Root_Admin
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Users
            </button>
            <button 
              onClick={() => setActiveTab('moderators')}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === 'moderators' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Moderators
            </button>
            <button 
              onClick={() => setActiveTab('challenges')}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === 'challenges' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Challenges
            </button>
            <button 
              onClick={() => setActiveTab('submissions')}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === 'submissions' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Submissions
            </button>
            <button 
              onClick={() => setActiveTab('system')}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === 'system' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              System Logs
            </button>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white border border-red-100 text-red-500 px-4 py-2.5 rounded-2xl hover:bg-red-50 transition-all text-[10px] font-bold shadow-sm"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      {/* Smaller Stats Boxes */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-1 text-slate-400">
            <Activity size={12} className="text-indigo-500" />
            <span className="text-[8px] font-bold uppercase tracking-widest">Attempts</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{stats.totalAttempts}</div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-1 text-slate-400">
            <ShieldAlert size={12} className="text-emerald-500" />
            <span className="text-[8px] font-bold uppercase tracking-widest">Success</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{stats.successRate}%</div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-1 text-slate-400">
            <Users size={12} className="text-blue-500" />
            <span className="text-[8px] font-bold uppercase tracking-widest">Users</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{stats.totalUsers}</div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-1 text-slate-400">
            <Settings size={12} className="text-amber-500" />
            <span className="text-[8px] font-bold uppercase tracking-widest">Mods</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{stats.activeModerators}</div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-1 text-slate-400">
            <Zap size={12} className="text-cyan-500" />
            <span className="text-[8px] font-bold uppercase tracking-widest">Challenges</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{stats.totalChallenges}</div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'submissions' ? (
          <motion.div 
            key="submissions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Check size={18} className="text-emerald-600" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-900">Pending Submissions</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{submissions.filter(s => s.status === 'pending').length} Pending</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Challenge</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Link</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitted</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {submissions.filter(s => s.status === 'pending').map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="text-[11px] font-bold text-slate-900">{sub.userName}</div>
                          <div className="text-[9px] text-slate-400">{sub.userEmail}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[11px] font-bold text-slate-900">{sub.title}</div>
                          <div className="text-[9px] text-indigo-600 font-bold">{sub.reward} Diamonds</div>
                        </td>
                        <td className="px-6 py-4">
                          <a 
                            href={sub.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[11px] text-indigo-600 hover:underline font-medium truncate max-w-[150px] block"
                          >
                            {sub.fileUrl}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-[10px] text-slate-500">
                          {new Date(sub.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <select 
                              onChange={(e) => {
                                if (e.target.value === 'approve') handleApproveSubmission(sub);
                                if (e.target.value === 'reject') handleRejectSubmission(sub);
                                e.target.value = ''; // Reset
                              }}
                              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                              <option value="">Actions</option>
                              <option value="approve" className="text-emerald-600">Approve</option>
                              <option value="reject" className="text-red-600">Reject</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {submissions.filter(s => s.status === 'pending').length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-[11px] text-slate-400 italic">
                          No pending submissions to review.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'system' ? (
          <motion.div 
            key="system"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2">
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[600px]">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Terminal size={16} className="text-indigo-600" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-900">Secure Access Logs</span>
                  </div>
                  <Database size={16} className="text-slate-300" />
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="text-[11px] border-l-4 border-slate-100 pl-5 py-3 hover:bg-slate-50 transition-colors rounded-r-2xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className={`font-bold px-2 py-0.5 rounded-lg text-[9px] ${log.success ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {log.success ? 'SUCCESS' : 'FAILURE'}
                        </span>
                        <span className="text-slate-400 font-medium">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-slate-500">USER: <span className="text-slate-900 font-bold">{log.username_attempted}</span></div>
                        <div className="text-slate-500">ROLE: <span className="text-slate-900 font-bold">{log.role_detected}</span></div>
                      </div>
                      <div className="text-slate-400 mt-2 text-[10px] flex items-center gap-2">
                        <Info size={10} />
                        IP_ADDR: {log.ip}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <AlertTriangle size={18} className="text-amber-500" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-900">Security Alerts</span>
                </div>
                <div className="space-y-4">
                  {logs.filter(l => !l.success).slice(0, 5).map((l, i) => (
                    <div key={i} className="text-[10px] text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3">
                      <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Suspicious attempt detected</p>
                        <p className="mt-1 opacity-80">User: {l.username_attempted}</p>
                        <p className="opacity-80">{new Date(l.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                  {logs.filter(l => !l.success).length === 0 && (
                    <p className="text-[10px] text-slate-400 italic text-center py-8">No security threats detected.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'users' ? (
          <motion.div 
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-indigo-600" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-900">User Directory</span>
                  </div>
                  <button 
                    onClick={() => setShowAddUser(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                  >
                    <Plus size={14} />
                    Add User
                  </button>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search by name, email, or username..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-2xl text-[11px] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">#</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">User Profile</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diamonds</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Badge</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map((u, index) => (
                      <tr key={u.uid} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-4 text-[10px] font-bold text-slate-300">{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-[11px] overflow-hidden border border-indigo-100 shadow-sm">
                              {u.photoURL ? <img src={u.photoURL} alt="" className="h-full w-full object-cover" /> : u.fullName?.charAt(0)}
                            </div>
                            <div>
                              <div className="text-[11px] font-bold text-slate-900">{u.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-medium">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-bold text-slate-600">@{u.username || u.email?.split('@')[0] || 'n/a'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                            u.role === 'admin' || u.role === 'root_admin' 
                              ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                              : u.role === 'moderator'
                              ? 'bg-amber-50 text-amber-600 border border-amber-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <Gem size={12} className="text-cyan-500" />
                            <span className="text-[11px] font-bold text-slate-900">{u.diamonds || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{u.badge || 'none'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                              {showPasswords[u.uid] ? (u.password || '********') : '••••••••'}
                            </span>
                            <button 
                              onClick={() => togglePassword(u.uid)}
                              className="text-slate-300 hover:text-indigo-600 transition-colors"
                            >
                              {showPasswords[u.uid] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setEditingUser(u)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              title="Edit User"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(u.uid)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete User"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'challenges' ? (
          <motion.div 
            key="challenges"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-indigo-600" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-900">AI SECTION (Challenge Inventory)</span>
                </div>
                <button 
                  onClick={() => setShowAddChallenge(true)}
                  className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                >
                  <Plus size={14} />
                  New Challenge
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Difficulty</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reward</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Booking Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deadline</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {challenges.map((challenge) => (
                      <tr key={challenge.id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="text-[11px] font-bold text-slate-900">{challenge.title}</div>
                          <div className="text-[9px] text-slate-400 line-clamp-1 max-w-xs">{challenge.description}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                            challenge.difficulty === 'hard' ? 'bg-red-50 text-red-600' :
                            challenge.difficulty === 'medium' ? 'bg-amber-50 text-amber-600' :
                            'bg-emerald-50 text-emerald-600'
                          }`}>
                            {challenge.difficulty}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <Gem size={12} className="text-cyan-500" />
                            <span className="text-[11px] font-bold text-slate-900">{challenge.reward}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {challenge.bookedBy ? (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                              Booked
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
                              Non Booked
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[10px] text-slate-500">
                          {challenge.deadline}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                            challenge.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {challenge.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <select 
                              onChange={(e) => {
                                if (e.target.value === 'delete') handleDeleteChallenge(challenge.id);
                                if (e.target.value === 'active' || e.target.value === 'cancelled' || e.target.value === 'completed') {
                                  handleUpdateChallengeStatus(challenge.id, e.target.value);
                                }
                                e.target.value = '';
                              }}
                              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                              <option value="">Actions</option>
                              <option value="active">Set Active</option>
                              <option value="cancelled">Cancel</option>
                              <option value="completed">Complete</option>
                              <option value="delete" className="text-red-600">Delete</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="moderators"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 text-center">
              <div className="h-16 w-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-4">
                <Shield size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Moderator Management</h3>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto mb-6">Create and manage moderator accounts to help manage tasks, badges, and user submissions.</p>
              <button 
                onClick={() => {
                  setNewUser({ ...newUser, role: 'moderator' });
                  setShowAddUser(true);
                }}
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[11px] font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                Create New Moderator
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.filter(u => u.role === 'moderator').map(mod => (
                <div key={mod.uid} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-sm border border-amber-100">
                      {mod.fullName?.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-[12px] font-bold text-slate-900">{mod.fullName}</h4>
                      <p className="text-[10px] text-slate-500">@{mod.username}</p>
                    </div>
                  </div>
                  <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                    <MoreVertical size={18} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Challenge Modal */}
      <AnimatePresence>
        {showAddChallenge && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddChallenge(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[32px] shadow-2xl z-[60] overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Create New Challenge</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Define a new task for the community.</p>
                  </div>
                </div>
                <button onClick={() => setShowAddChallenge(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddChallenge} className="p-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Challenge Title</label>
                  <input 
                    type="text" 
                    required
                    value={newChallenge.title}
                    onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-medium"
                    placeholder="e.g. Build a Landing Page"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description</label>
                  <textarea 
                    required
                    value={newChallenge.description}
                    onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-medium min-h-[100px] resize-none"
                    placeholder="Describe the challenge requirements..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Reward (Diamonds)</label>
                    <input 
                      type="number" 
                      required
                      value={newChallenge.reward}
                      onChange={(e) => setNewChallenge({ ...newChallenge, reward: parseInt(e.target.value) })}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Difficulty</label>
                    <select 
                      value={newChallenge.difficulty}
                      onChange={(e) => setNewChallenge({ ...newChallenge, difficulty: e.target.value as any })}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-medium"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Deadline</label>
                  <input 
                    type="date" 
                    required
                    value={newChallenge.deadline}
                    onChange={(e) => setNewChallenge({ ...newChallenge, deadline: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-medium"
                  />
                </div>
                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl text-[11px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    Publish Challenge
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddUser && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddUser(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[32px] shadow-2xl z-[60] overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Add New {newUser.role === 'moderator' ? 'Moderator' : 'User'}</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Fill in the details to create a new account.</p>
                  </div>
                </div>
                <button onClick={() => setShowAddUser(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddUser} className="p-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={newUser.fullName}
                    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-medium"
                    placeholder="Enter full name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Username</label>
                    <input 
                      type="text" 
                      required
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-medium"
                      placeholder="username"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Role</label>
                    <select 
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-medium"
                    >
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-medium"
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Password</label>
                  <input 
                    type="password" 
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-medium"
                    placeholder="••••••••"
                  />
                </div>
                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl text-[11px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    Create Account
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[32px] shadow-2xl z-[60] overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                    <Edit3 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Edit User Profile</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Modify user details and roles.</p>
                  </div>
                </div>
                <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleUpdateUser} className="p-8 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Full Name</label>
                    <input 
                      type="text" 
                      value={editingUser.fullName || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Role</label>
                    <select 
                      value={editingUser.role || 'user'}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-medium"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="moderator">Moderator</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Diamonds</label>
                    <input 
                      type="number" 
                      value={editingUser.diamonds || 0}
                      onChange={(e) => setEditingUser({ ...editingUser, diamonds: parseInt(e.target.value) })}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Badge</label>
                    <input 
                      type="text" 
                      value={editingUser.badge || 'none'}
                      onChange={(e) => setEditingUser({ ...editingUser, badge: e.target.value })}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Password (Recovery)</label>
                  <input 
                    type="text" 
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-medium"
                    placeholder="User password"
                  />
                </div>
                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl text-[11px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
