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
import Members from './pages/Members';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  login: (user: User, remember: boolean) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => useContext(AuthContext);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    // SECURITY GUARD: Check if 'data' is a SyntheticEvent or DOM Event
    // This prevents "Converting circular structure to JSON" error if updateUser is attached directly to onClick
    if (data && (data as any).preventDefault !== undefined) {
        console.warn("Attempted to pass an Event object to updateUser. Ignoring.");
        return;
    }

    if (user) {
      const updated = { ...user, ...data };
      setUser(updated);
      // Update active storage
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
        try {
            // Prioritize localStorage, fall back to sessionStorage
            const stored = localStorage.getItem('nhau_user') || sessionStorage.getItem('nhau_user');
            
            if (stored) {
                const localUser = JSON.parse(stored);
                // 1. Optimistic load from local storage
                setUser(localUser);

                // 2. Fetch fresh data from Firestore to ensure Role/Avatar is up-to-date
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
            }
        } catch (e) {
            console.error("Failed to sync user profile", e);
            // Clear corrupted data if JSON parse fails
            localStorage.removeItem('nhau_user');
            sessionStorage.removeItem('nhau_user');
        } finally {
            setLoading(false); // Done loading regardless of result
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

// --- Route Guards ---

// 1. ProtectedRoute: Only allows authenticated users
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-background text-primary">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
      );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// 2. PublicRoute: Only allows guests (redirects to Home if logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null; // Or a minimal spinner

  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// 3. AdminRoute: Only allows Admin
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;

  if (!user || user.role !== UserRole.ADMIN) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Layout>
          <Routes>
            {/* Public Routes (Login/Register) - Redirects to Home if already logged in */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            
            {/* Protected Routes */}
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

            <Route path="/members" element={
              <ProtectedRoute>
                <Members />
              </ProtectedRoute>
            } />
            
            {/* Admin Route is now accessible to regular users (read-only handled in component) */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } />

            {/* Catch all - Redirect to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;