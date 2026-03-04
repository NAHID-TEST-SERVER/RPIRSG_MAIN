import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth } from './firebase';

import { UserRole } from './types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  stealthRole: UserRole | null;
  setStealthRole: (role: UserRole | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stealthRole, setStealthRoleState] = useState<UserRole | null>(() => {
    return sessionStorage.getItem('stealthRole') as UserRole | null;
  });

  const setStealthRole = (role: UserRole | null) => {
    setStealthRoleState(role);
    if (role) {
      sessionStorage.setItem('stealthRole', role);
    } else {
      sessionStorage.removeItem('stealthRole');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await firebaseSignOut(auth);
    setStealthRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, stealthRole, setStealthRole }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
