import React from 'react';
import { useAuth } from '../App';
import { Link, useLocation } from 'react-router-dom';
import { Beer, User as UserIcon, LogOut, BarChart3, Settings, Home, Receipt } from 'lucide-react';
import { UserRole } from '../types';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-background text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border px-4 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Beer size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight text-white hidden sm:block">Nhậu JS - Nơi bất mãn đc giải bày.</span>
        </Link>

        {user && (
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className={`text-sm font-bold hover:text-primary transition-colors ${isActive('/') ? 'text-primary' : 'text-secondary'}`}>
                Vote Kèo
              </Link>
              <Link to="/leaderboard" className={`text-sm font-bold hover:text-primary transition-colors ${isActive('/leaderboard') ? 'text-primary' : 'text-secondary'}`}>
                BXH
              </Link>
              <Link to="/bills" className={`text-sm font-bold hover:text-primary transition-colors ${isActive('/bills') ? 'text-primary' : 'text-secondary'}`}>
                Tính Tiền
              </Link>
              {user.role === UserRole.ADMIN && (
                <Link to="/admin" className={`text-sm font-bold hover:text-primary transition-colors ${isActive('/admin') ? 'text-primary' : 'text-secondary'}`}>
                  Admin
                </Link>
              )}
            </div>

            <div className="flex items-center gap-3">
               <Link to="/profile">
                  <div className={`w-10 h-10 rounded-full border-2 bg-cover bg-center transition-all ${isActive('/profile') ? 'border-primary' : 'border-transparent'}`} 
                       style={{ backgroundImage: `url(${user.avatar})` }}>
                  </div>
               </Link>
               <button onClick={logout} className="p-2 text-secondary hover:text-white transition-colors">
                  <LogOut size={20} />
               </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-8">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 w-full bg-surface border-t border-border flex justify-around p-3 z-40">
           <Link to="/" className={`flex flex-col items-center gap-1 ${isActive('/') ? 'text-primary' : 'text-secondary'}`}>
              <Home size={24} />
              <span className="text-[10px]">Vote</span>
           </Link>
           <Link to="/leaderboard" className={`flex flex-col items-center gap-1 ${isActive('/leaderboard') ? 'text-primary' : 'text-secondary'}`}>
              <BarChart3 size={24} />
              <span className="text-[10px]">BXH</span>
           </Link>
           <Link to="/bills" className={`flex flex-col items-center gap-1 ${isActive('/bills') ? 'text-primary' : 'text-secondary'}`}>
              <Receipt size={24} />
              <span className="text-[10px]">Tính Tiền</span>
           </Link>
           {user.role === UserRole.ADMIN && (
             <Link to="/admin" className={`flex flex-col items-center gap-1 ${isActive('/admin') ? 'text-primary' : 'text-secondary'}`}>
                <Settings size={24} />
                <span className="text-[10px]">Admin</span>
             </Link>
           )}
        </div>
      )}
    </div>
  );
};