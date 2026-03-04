import React, { useEffect, useState } from 'react';
import { ref, onValue, get, query, orderByChild, limitToLast } from 'firebase/database';
import { database } from '../firebase';
import { useAuth } from '../AuthContext';
import { 
  Gem, 
  Trophy, 
  Target, 
  CheckCircle2,
  Plus,
  ArrowRight,
  Activity,
  Zap,
  Star
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { UserProfile, Challenge } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({
    activeChallenges: 0,
    bookedChallenges: 0,
    completedChallenges: 0,
    rank: 0
  });
  const [availableChallenges, setAvailableChallenges] = useState<Challenge[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch user profile
    const profileRef = ref(database, `users/${user.uid}/profile`);
    const unsubProfile = onValue(profileRef, (snapshot) => {
      setProfile(snapshot.val());
    });

    // Fetch stats
    const challengesRef = ref(database, 'challenges');
    const unsubChallenges = onValue(challengesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({
        ...val,
        id
      })) as Challenge[];
      
      const active = list.filter(c => c.status === 'active' && !c.bookedBy).length;
      const booked = list.filter(c => c.bookedBy === user.uid && c.status === 'active').length;
      const completed = list.filter(c => c.bookedBy === user.uid && c.status === 'completed').length;

      setStats(prev => ({
        ...prev,
        activeChallenges: active,
        bookedChallenges: booked,
        completedChallenges: completed
      }));
      
      setAvailableChallenges(list.filter(c => c.status === 'active' && !c.bookedBy).slice(0, 3));
      setLoading(false);
    });

    // Fetch Rank (Simple logic: sort all users by diamonds)
    const usersRef = ref(database, 'users');
    const unsubRank = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val() || {};
      const sortedUsers = Object.values(usersData)
        .map((u: any) => u.profile)
        .filter(Boolean)
        .sort((a, b) => (b.diamonds || 0) - (a.diamonds || 0));
      
      const myRank = sortedUsers.findIndex(u => u.uid === user.uid) + 1;
      setStats(prev => ({ ...prev, rank: myRank }));
    });

    // Fetch Activity
    const activityRef = ref(database, `users/${user.uid}/activity`);
    const unsubActivity = onValue(activityRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const logs = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        })).sort((a: any, b: any) => b.timestamp - a.timestamp).slice(0, 5);
        setActivities(logs as any[]);
      }
    });

    return () => {
      unsubProfile();
      unsubChallenges();
      unsubRank();
      unsubActivity();
    };
  }, [user]);

  const statCards = [
    { label: 'Diamonds', value: profile?.diamonds || 0, icon: Gem, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Current Rank', value: stats.rank ? `#${stats.rank}` : '...', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Active Tasks', value: stats.activeChallenges, icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Completed', value: stats.completedChallenges, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Welcome back, {profile?.fullName || user?.email?.split('@')[0]}
            {profile?.badge !== 'none' && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                profile?.badge === 'platinum' ? 'bg-slate-900 text-white' :
                profile?.badge === 'gold' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {profile?.badge}
              </span>
            )}
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">Ready for your next challenge? Earn diamonds and climb the leaderboard!</p>
        </div>
        <Link 
          to="/challenges"
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold py-2 px-4 rounded-xl transition-all shadow-sm active:scale-95"
        >
          <Zap size={14} />
          Browse Challenges
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`h-8 w-8 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon size={16} />
              </div>
              {stat.label === 'Diamonds' && (
                <div className="flex items-center gap-1 text-[9px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full">
                  <Star size={10} fill="currentColor" />
                  +10 Today
                </div>
              )}
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">
              {loading ? '...' : stat.value}
            </h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Challenges */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Available Challenges</h3>
            <Link to="/challenges" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {availableChallenges.length > 0 ? availableChallenges.map((challenge, i) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-100 transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      challenge.difficulty === 'expert' ? 'bg-red-50 text-red-600' :
                      challenge.difficulty === 'hard' ? 'bg-orange-50 text-orange-600' :
                      challenge.difficulty === 'medium' ? 'bg-amber-50 text-amber-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      <Zap size={18} />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{challenge.title}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Gem size={10} className="text-cyan-600" /> {challenge.reward} Diamonds
                        </span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          challenge.difficulty === 'expert' ? 'bg-red-100 text-red-700' :
                          challenge.difficulty === 'hard' ? 'bg-orange-100 text-orange-700' :
                          challenge.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {challenge.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                <p className="text-[11px] text-slate-400 font-medium">No new challenges available right now. Check back later!</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Recent Activity & Leaderboard Shortcut */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Activity</h3>
              <Activity size={14} className="text-slate-400" />
            </div>
            <div className="p-4 space-y-4">
              {activities.length > 0 ? activities.map((log, i) => (
                <div key={log.id || log.timestamp || i} className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Activity size={12} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-900 font-medium">
                      {log.action} <span className="text-slate-500 font-normal">{log.details}</span>
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-4">
                  <p className="text-[10px] text-slate-400 font-medium italic">No recent activity.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-100 relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-80">Global Rank</h3>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-3xl font-bold">{stats.rank ? `#${stats.rank}` : '...'}</span>
                <span className="text-[10px] font-bold mb-1.5 opacity-80">Top {Math.max(1, Math.round(stats.rank / 10) * 10)}%</span>
              </div>
              <Link to="/leaderboard" className="mt-4 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold py-2 rounded-xl transition-all">
                View Leaderboard
                <ArrowRight size={14} />
              </Link>
            </div>
            <Trophy size={80} className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
