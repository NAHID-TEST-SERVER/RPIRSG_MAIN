import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Search, 
  Filter,
  Calendar,
  Gem,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  Unlock,
  Send,
  FileText,
  X,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ref, onValue, set, update, push } from 'firebase/database';
import { database } from '../firebase';
import { useAuth } from '../AuthContext';
import { Challenge, ChallengeDifficulty, UserProfile } from '../types';

const Challenges: React.FC = () => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'available' | 'my-booked' | 'completed'>('available');
  
  // Submission state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionFile, setSubmissionFile] = useState('');
  const [submissionComment, setSubmissionComment] = useState('');

  useEffect(() => {
    if (!user) return;

    // Fetch Profile
    const profileRef = ref(database, `users/${user.uid}/profile`);
    onValue(profileRef, (snapshot) => {
      setProfile(snapshot.val());
    });

    // Fetch Challenges
    const challengesRef = ref(database, 'challenges');
    const unsub = onValue(challengesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, challenge]: [string, any]) => ({
          id,
          ...challenge
        }));
        setChallenges(list);
      } else {
        setChallenges([]);
      }
      setLoading(false);
    });

    // Fetch user's submissions
    const submissionsRef = ref(database, 'submissions');
    const unsubSubmissions = onValue(submissionsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data)
        .map(([id, val]: [string, any]) => ({ id, ...val }))
        .filter(s => s.userId === user.uid);
      setSubmissions(list);
    });

    return () => {
      unsub();
      unsubSubmissions();
    };
  }, [user]);

  const handleBookChallenge = async (challenge: Challenge) => {
    if (!user) return;
    try {
      await update(ref(database, `challenges/${challenge.id}`), {
        bookedBy: user.uid,
        bookedAt: Date.now(),
        updatedAt: Date.now()
      });
      
      // Log activity
      const activityRef = push(ref(database, `users/${user.uid}/activity`));
      await set(activityRef, {
        action: 'Booked Challenge',
        details: `You booked "${challenge.title}"`,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error booking challenge:', error);
    }
  };

  const handleSubmitChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedChallenge) return;

    const submissionId = push(ref(database, 'submissions')).key;
    const submissionData = {
      id: submissionId,
      taskId: selectedChallenge.id,
      userId: user.uid,
      userName: profile?.fullName || user.email?.split('@')[0],
      userEmail: user.email,
      fileUrl: submissionFile,
      comment: submissionComment,
      status: 'pending',
      reward: selectedChallenge.reward,
      title: selectedChallenge.title,
      createdAt: Date.now()
    };

    try {
      // Create submission
      await set(ref(database, `submissions/${submissionId}`), submissionData);

      // Update challenge to indicate it's pending approval
      await update(ref(database, `challenges/${selectedChallenge.id}`), {
        submissionStatus: 'pending',
        submissionId: submissionId,
        submittedAt: Date.now(),
        projectLink: submissionFile
      });

      // Log activity
      const activityRef = push(ref(database, `users/${user.uid}/activity`));
      await set(activityRef, {
        action: 'Submitted Challenge',
        details: `You submitted work for "${selectedChallenge.title}"`,
        timestamp: Date.now()
      });

      setIsSubmitModalOpen(false);
      setSubmissionFile('');
      setSubmissionComment('');
      setSelectedChallenge(null);
      alert('Challenge submitted successfully! Waiting for Admin approval.');
    } catch (error) {
      console.error('Error submitting challenge:', error);
      alert('Failed to submit challenge. Please try again.');
    }
  };

  const handleClaimDiamonds = async (challenge: Challenge) => {
    if (!user || !profile) return;
    
    const submission = submissions.find(s => s.taskId === challenge.id && s.claimable);
    if (!submission) return;

    try {
      const reward = challenge.reward;
      const newDiamonds = (profile.diamonds || 0) + reward;

      // 1. Update user diamonds
      await update(ref(database, `users/${user.uid}/profile`), {
        diamonds: newDiamonds
      });

      // 2. Mark submission as claimed
      await update(ref(database, `submissions/${submission.id}`), {
        claimable: false,
        status: 'claimed',
        claimedAt: Date.now()
      });

      // 3. Mark challenge as completed
      await update(ref(database, `challenges/${challenge.id}`), {
        status: 'completed',
        completedAt: Date.now(),
        submissionStatus: 'claimed'
      });

      // 4. Log activity
      const activityRef = push(ref(database, `users/${user.uid}/activity`));
      await set(activityRef, {
        action: 'Claimed Diamonds',
        details: `You claimed ${reward} diamonds for "${challenge.title}"`,
        timestamp: Date.now()
      });

      // 5. Notify user
      const notifRef = push(ref(database, `users/${user.uid}/notifications`));
      await set(notifRef, {
        title: 'Diamonds Claimed! 💎',
        message: `You successfully claimed ${reward} diamonds. Your new balance is ${newDiamonds}.`,
        type: 'success',
        read: false,
        createdAt: Date.now()
      });

      alert(`Successfully claimed ${reward} diamonds!`);
    } catch (error) {
      console.error('Error claiming diamonds:', error);
      alert('Failed to claim diamonds.');
    }
  };

  const getDifficultyColor = (d: ChallengeDifficulty) => {
    switch (d) {
      case 'expert': return 'text-red-500 bg-red-50 border-red-100';
      case 'hard': return 'text-orange-500 bg-orange-50 border-orange-100';
      case 'medium': return 'text-amber-500 bg-amber-50 border-amber-100';
      case 'easy': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      default: return 'text-slate-500 bg-slate-50 border-slate-100';
    }
  };

  const filteredChallenges = challenges.filter(c => {
    const matchesSearch = (c.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (c.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    if (filter === 'available') return matchesSearch && c.status === 'active' && !c.bookedBy;
    if (filter === 'my-booked') return matchesSearch && c.bookedBy === user?.uid && c.status === 'active';
    if (filter === 'completed') return matchesSearch && c.bookedBy === user?.uid && c.status === 'completed';
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Challenges</h2>
          <p className="text-[11px] text-slate-500 font-medium">Complete challenges to earn diamonds and climb the leaderboard.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {(['available', 'my-booked', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                filter === f ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {f === 'available' ? 'Available' : f === 'my-booked' ? 'My Booked' : 'Completed'}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input
          type="text"
          placeholder="Search challenges..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
        />
      </div>

      {/* Challenges List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          ))
        ) : filteredChallenges.length > 0 ? (
          filteredChallenges.map((challenge) => (
            <motion.div
              key={challenge.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => {
                setSelectedChallenge(challenge);
                setIsDetailsModalOpen(true);
              }}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all group flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    challenge.difficulty === 'expert' ? 'bg-red-50 text-red-600' :
                    challenge.difficulty === 'hard' ? 'bg-orange-50 text-orange-600' :
                    challenge.difficulty === 'medium' ? 'bg-amber-50 text-amber-600' :
                    'bg-emerald-50 text-emerald-600'
                  }`}>
                    <Zap size={20} />
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 text-cyan-600 font-bold text-xs">
                      <Gem size={12} />
                      {challenge.reward}
                    </div>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border uppercase tracking-wider mt-1 ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty}
                    </span>
                  </div>
                </div>
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">{challenge.title}</h3>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{challenge.description}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                    <Calendar size={10} />
                    {new Date(challenge.deadline).toLocaleDateString()}
                  </div>
                </div>
                
                {filter === 'available' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookChallenge(challenge);
                    }}
                    className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                  >
                    <Unlock size={12} />
                    Book Now
                  </button>
                )}

                {filter === 'my-booked' && (
                  challenge.submissionStatus === 'pending' ? (
                    <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg text-[10px] font-bold">
                      <Clock size={12} />
                      Pending Approval
                    </div>
                  ) : challenge.submissionStatus === 'approved' ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClaimDiamonds(challenge);
                      }}
                      className="flex items-center gap-1.5 bg-cyan-600 text-white hover:bg-cyan-700 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 shadow-lg shadow-cyan-100"
                    >
                      <Gem size={12} />
                      Claim Diamonds
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChallenge(challenge);
                        setIsSubmitModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                    >
                      <Send size={12} />
                      Submit Work
                    </button>
                  )
                )}

                {filter === 'completed' && (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold">
                      <CheckCircle2 size={14} />
                      Completed
                    </div>
                    {challenge.projectLink && (
                      <a 
                        href={challenge.projectLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[9px] text-indigo-600 hover:underline font-bold"
                      >
                        View Project
                      </a>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Target size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No challenges found</h3>
            <p className="text-[11px] text-slate-500 mt-1">Try changing your filter or search query.</p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {isDetailsModalOpen && selectedChallenge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    selectedChallenge.difficulty === 'expert' ? 'bg-red-50 text-red-600' :
                    selectedChallenge.difficulty === 'hard' ? 'bg-orange-50 text-orange-600' :
                    selectedChallenge.difficulty === 'medium' ? 'bg-amber-50 text-amber-600' :
                    'bg-emerald-50 text-emerald-600'
                  }`}>
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Challenge Details</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Review requirements and deadlines.</p>
                  </div>
                </div>
                <button onClick={() => setIsDetailsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 tracking-tight">{selectedChallenge.title}</h4>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${getDifficultyColor(selectedChallenge.difficulty)}`}>
                      {selectedChallenge.difficulty}
                    </span>
                    <div className="flex items-center gap-1 text-cyan-600 font-bold text-xs">
                      <Gem size={12} />
                      {selectedChallenge.reward} Diamonds
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</p>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {selectedChallenge.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Deadline</p>
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <Calendar size={14} className="text-indigo-500" />
                      {new Date(selectedChallenge.deadline).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <Clock size={14} className="text-amber-500" />
                      {selectedChallenge.status.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  {filter === 'available' && (
                    <button 
                      onClick={() => {
                        handleBookChallenge(selectedChallenge);
                        setIsDetailsModalOpen(false);
                      }}
                      className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl text-[11px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Unlock size={16} />
                      Book This Challenge
                    </button>
                  )}
                  {filter === 'my-booked' && (
                    <button 
                      onClick={() => {
                        setIsDetailsModalOpen(false);
                        setIsSubmitModalOpen(true);
                      }}
                      className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-2xl text-[11px] shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Send size={16} />
                      Submit Your Work
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submit Modal */}
      <AnimatePresence>
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSubmitModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Submit Challenge</h3>
                <button onClick={() => setIsSubmitModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitChallenge} className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Challenge</p>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedChallenge?.title}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Project Link / File URL</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="url"
                      required
                      value={submissionFile}
                      onChange={(e) => setSubmissionFile(e.target.value)}
                      placeholder="https://github.com/..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Comments</label>
                  <textarea
                    value={submissionComment}
                    onChange={(e) => setSubmissionComment(e.target.value)}
                    placeholder="Describe your work..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all min-h-[80px] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  Submit Project
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Challenges;
