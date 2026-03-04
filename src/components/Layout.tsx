import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Settings, 
  Bell, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  User,
  Search,
  Gem,
  Trophy,
  Target,
  Zap,
  Medal,
  Shield
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ref, onValue, update, get } from 'firebase/database';
import { database } from '../firebase';
import { Notification } from '../types';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch Profile for Diamonds/Badge
    const profileRef = ref(database, `users/${user.uid}/profile`);
    const unsubProfile = onValue(profileRef, (snapshot) => {
      setUserProfile(snapshot.val());
    });

    // Fetch Notifications
    const notifRef = ref(database, `users/${user.uid}/notifications`);
    const unsubNotif = onValue(notifRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, n]: [string, any]) => ({ id, ...n }));
      setNotifications(list.sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => {
      unsubProfile();
      unsubNotif();
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    if (!user) return;
    const updates: any = {};
    notifications.forEach(n => {
      if (!n.read) updates[`users/${user.uid}/notifications/${n.id}/read`] = true;
    });
    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Challenges', path: '/challenges', icon: Target },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  if (userProfile?.role === 'admin') {
    menuItems.push({ name: 'Admin Panel', path: '/admin', icon: Shield });
  }

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 fixed h-full z-30">
        <div className="p-6 flex items-center gap-3 border-b border-slate-50">
          <div className="h-8 w-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <Target size={18} />
          </div>
          <span className="font-bold text-slate-900 tracking-tight">OrgTask Master</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={16} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-50">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-[11px] font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 px-4 lg:px-8 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
          >
            <Menu size={20} />
          </button>

          <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 w-64">
            <Search size={14} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search challenges..." 
              className="bg-transparent border-none outline-none text-[10px] w-full font-medium text-slate-600 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Diamonds & Badge Display */}
            <div className="hidden md:flex items-center gap-3 mr-4">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-50 text-cyan-600 rounded-full border border-cyan-100">
                <Gem size={14} />
                <span className="text-[11px] font-bold">{userProfile?.diamonds || 0}</span>
              </div>
              {userProfile?.badge && userProfile.badge !== 'none' && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-full border border-slate-800">
                  <Medal size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{userProfile.badge}</span>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  if (!isNotificationsOpen) markAllAsRead();
                }}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsNotificationsOpen(false)}
                      className="fixed inset-0 z-40"
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Notifications</h3>
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {unreadCount} New
                        </span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((n) => (
                            <div key={n.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-indigo-50/30' : ''}`}>
                              <p className="text-[11px] font-bold text-slate-900">{n.title}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                              <p className="text-[8px] text-slate-400 mt-2 font-medium">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center">
                            <Bell size={24} className="mx-auto text-slate-200 mb-2" />
                            <p className="text-[11px] text-slate-400 italic">No notifications yet</p>
                          </div>
                        )}
                      </div>
                      <Link 
                        to="/profile" 
                        onClick={() => setIsNotificationsOpen(false)}
                        className="p-3 text-center block text-[10px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-all"
                      >
                        View All Activity
                      </Link>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 pl-3 border-l border-slate-200 group"
              >
                <div className="hidden sm:block text-right">
                  <p className="text-[11px] font-bold text-slate-900 leading-none group-hover:text-indigo-600 transition-colors">{user?.displayName || userProfile?.username || 'User'}</p>
                  <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider font-bold">{userProfile?.role || 'Member'}</p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 overflow-hidden flex items-center justify-center group-hover:border-indigo-300 transition-all">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <User size={18} className="text-indigo-600" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsProfileOpen(false)}
                      className="fixed inset-0 z-40"
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
                    >
                      <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                        <p className="text-[10px] font-bold text-slate-900 truncate">{user?.email}</p>
                      </div>
                      <div className="p-1">
                        <Link 
                          to="/profile" 
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all"
                        >
                          <User size={14} />
                          Profile
                        </Link>
                        <button 
                          onClick={() => {
                            setIsProfileOpen(false);
                            handleSignOut();
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[11px] font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all"
                        >
                          <LogOut size={14} />
                          Log Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed top-0 left-0 bottom-0 w-64 bg-white z-50 lg:hidden flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
                    <Target size={18} />
                  </div>
                  <span className="font-bold text-slate-900 tracking-tight">OrgTask</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                        isActive 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon size={16} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-slate-50">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-[11px] font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;
