import React, { createContext, useContext, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole } from './types';
import { Layout } from './components/Layout';
import { DataService } from './services/mockService'; // Import DataService
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Vote from './pages/Vote';
import Admin from './pages/Admin';
import Leaderboard from './pages/Leaderboard';
import BillSplit from './pages/BillSplit';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  login: (user: User, remember: boolean) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => useContext(AuthContext);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

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
    if (user) {
      const updated = { ...user, ...data };
      setUser(updated);
      // Update whichever storage is active
      if (localStorage.getItem('nhau_user')) {
          localStorage.setItem('nhau_user', JSON.stringify(updated));
      } else {
          sessionStorage.setItem('nhau_user', JSON.stringify(updated));
      }
    }
  };

  // Check login status & Sync with DB
  useEffect(() => {
    const initAuth = async () => {
        // Prioritize localStorage, fall back to sessionStorage
        const stored = localStorage.getItem('nhau_user') || sessionStorage.getItem('nhau_user');
        
        if (stored) {
            const localUser = JSON.parse(stored);
            // 1. Optimistic load from local storage
            setUser(localUser);

            // 2. Fetch fresh data from Firestore to ensure Role/Avatar is up-to-date
            try {
                const freshUser = await DataService.getUser(localUser.id);
                if (freshUser) {
                    setUser(freshUser);
                    // Update active storage
                    if (localStorage.getItem('nhau_user')) {
                        localStorage.setItem('nhau_user', JSON.stringify(freshUser));
                    } else {
                        sessionStorage.setItem('nhau_user', JSON.stringify(freshUser));
                    }
                }
            } catch (e) {
                console.error("Failed to sync user profile", e);
                // If user deleted in DB or error, optional: logout();
            }
        }
    };
    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Route Guard ---
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user || user.role !== UserRole.ADMIN) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Vote />
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            <Route path="/leaderboard" element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            } />

            <Route path="/bills" element={
              <ProtectedRoute>
                <BillSplit />
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            } />
          </Routes>
        </Layout>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;