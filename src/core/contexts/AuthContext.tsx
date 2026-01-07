import React, { createContext, useState, useEffect } from 'react';
import { User } from '@/core/types/types';
import { DataService } from '@/core/services/mockService';

interface AuthContextType {
  user: User | null;
  login: (user: User, remember: boolean) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>(null!);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = (userData: User, remember: boolean) => {
    setUser(userData);
    if (remember) {
      localStorage.setItem('nhau_user', JSON.stringify(userData));
      sessionStorage.removeItem('nhau_user');
    } else {
      sessionStorage.setItem('nhau_user', JSON.stringify(userData));
      localStorage.removeItem('nhau_user');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nhau_user');
    sessionStorage.removeItem('nhau_user');
  };

  const updateUser = (data: Partial<User>) => {
    if (data && (data as any).preventDefault !== undefined) {
      console.warn("Attempted to pass an Event object to updateUser. Ignoring.");
      return;
    }

    if (user) {
      const updated = { ...user, ...data };
      setUser(updated);
      if (localStorage.getItem('nhau_user')) {
        localStorage.setItem('nhau_user', JSON.stringify(updated));
      } else {
        sessionStorage.setItem('nhau_user', JSON.stringify(updated));
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const stored = localStorage.getItem('nhau_user') || sessionStorage.getItem('nhau_user');

        if (stored) {
          const localUser = JSON.parse(stored);
          setUser(localUser);

          const freshUser = await DataService.getUser(localUser.id);
          if (freshUser) {
            setUser(freshUser);
            if (localStorage.getItem('nhau_user')) {
              localStorage.setItem('nhau_user', JSON.stringify(freshUser));
            } else {
              sessionStorage.setItem('nhau_user', JSON.stringify(freshUser));
            }
          }
        }
      } catch (e) {
        console.error("Failed to sync user profile", e);
        localStorage.removeItem('nhau_user');
        sessionStorage.removeItem('nhau_user');
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
