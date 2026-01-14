import React, { createContext, useState, useEffect } from 'react';
import { User } from '@/core/types/types';
import { DataService, AuthService } from '@/core/services/mockService';

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

  const isDU2 = () => window.location.pathname.startsWith('/du2');
  const storageKey = isDU2() ? 'du2_user' : 'nhau_user';

  const login = (userData: User, remember: boolean) => {
    setUser(userData);
    if (remember) {
      localStorage.setItem(storageKey, JSON.stringify(userData));
      sessionStorage.removeItem(storageKey);
    } else {
      sessionStorage.setItem(storageKey, JSON.stringify(userData));
      localStorage.removeItem(storageKey);
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (e) {
      console.error("Firebase logout failed", e);
    }
    setUser(null);
    localStorage.removeItem(storageKey);
    sessionStorage.removeItem(storageKey);
  };

  const updateUser = (data: Partial<User>) => {
    if (data && (data as any).preventDefault !== undefined) {
      console.warn("Attempted to pass an Event object to updateUser. Ignoring.");
      return;
    }

    if (user) {
      const updated = { ...user, ...data };
      setUser(updated);
      if (localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } else {
        sessionStorage.setItem(storageKey, JSON.stringify(updated));
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const stored = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);

        if (stored) {
          const localUser = JSON.parse(stored);
          setUser(localUser);

          const freshUser = await DataService.getUser(localUser.id);
          if (freshUser) {
            setUser(freshUser);
            if (localStorage.getItem(storageKey)) {
              localStorage.setItem(storageKey, JSON.stringify(freshUser));
            } else {
              sessionStorage.setItem(storageKey, JSON.stringify(freshUser));
            }
          }
        }
      } catch (e) {
        console.error("Failed to sync user profile", e);
        localStorage.removeItem(storageKey);
        sessionStorage.removeItem(storageKey);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [window.location.pathname]);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
