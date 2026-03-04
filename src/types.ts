export type UserRole = 'admin' | 'user' | 'root_admin' | 'moderator';
export type UserStatus = 'active' | 'inactive';
export type ChallengeStatus = 'active' | 'cancelled' | 'completed';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  photoURL?: string;
  diamonds: number;
  rank: number;
  badge: string;
  bio?: string;
  designation?: string;
  department?: string;
  socialLinks?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
  };
  createdAt: number;
  lastLogin: number;
  lastDiamondDecay?: number;
  profileUpdated?: boolean; // For 5 diamond reward
  bonusClaimed?: boolean;
  streak?: number;
  lastActivity?: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  deadline: number;
  reward: number; // Default 10
  status: ChallengeStatus;
  createdBy: string;
  bookedBy?: string; // User UID who booked it
  bookedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Submission {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userUsername: string;
  fileUrl?: string;
  comment?: string;
  status: SubmissionStatus;
  reviewedBy?: string;
  approvedAt?: number;
  createdAt: number;
  type?: 'text' | 'link';
  content?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'challenge' | 'submission' | 'badge' | 'system';
  read: boolean;
  createdAt: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: number;
}
