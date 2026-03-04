import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Gem, 
  Star, 
  Medal, 
  Search,
  ArrowUp,
  ArrowDown,
  User
} from 'lucide-react';
import { motion } from 'motion/react';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase';
import { useAuth } from '../AuthContext';
import { UserProfile } from '../types';

const Leaderboard: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsub = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const userList = Object.values(data)
        .map((u: any) => u.profile)
        .filter(Boolean)
        .sort((a, b) => (b.diamonds || 0) - (a.diamonds || 0));
      
      setUsers(userList);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredUsers = users.filter(u => 
    (u.fullName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const myRank = users.findIndex(u => u.uid === user?.uid) + 1;
  const myProfile = users.find(u => u.uid === user?.uid);

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'platinum': return 'bg-slate-900 text-white';
      case 'gold': return 'bg-amber-100 text-amber-700';
      case 'silver': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Leaderboard</h2>
          <p className="text-[11px] text-slate-500 font-medium">Top performers of the organization based on earned diamonds.</p>
        </div>
      </div>

      {/* My Stats Banner */}
      {myProfile && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-100 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-bold">
              #{myRank}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Your Current Rank</p>
              <h3 className="text-lg font-bold">{myProfile.fullName}</h3>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Diamonds</p>
              <div className="flex items-center justify-end gap-1 text-lg font-bold">
                <Gem size={16} />
                {myProfile.diamonds}
              </div>
            </div>
            {myProfile.badge !== 'none' && (
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Medal size={20} />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
        />
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-20">Rank</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Diamonds</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u, i) => (
                  <tr 
                    key={u.uid} 
                    className={`group hover:bg-slate-50 transition-colors ${u.uid === user?.uid ? 'bg-indigo-50/30' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        i === 0 ? 'bg-amber-100 text-amber-600' :
                        i === 1 ? 'bg-slate-200 text-slate-600' :
                        i === 2 ? 'bg-orange-100 text-orange-600' :
                        'text-slate-400'
                      }`}>
                        {i + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-indigo-50 text-indigo-600 font-bold text-[10px]">
                              {u.fullName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-900">{u.fullName}</p>
                          <p className="text-[9px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700">
                        <Gem size={12} className="text-cyan-600" />
                        {u.diamonds}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.badge !== 'none' ? (
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getBadgeColor(u.badge)}`}>
                          {u.badge}
                        </span>
                      ) : (
                        <span className="text-[8px] font-bold text-slate-300 uppercase tracking-wider">No Badge</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[11px] text-slate-400 italic">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
