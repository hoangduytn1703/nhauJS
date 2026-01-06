import React from 'react';
import { useAuth } from '../App';
import { Link, useLocation } from 'react-router-dom';
import { Beer, LogOut, BarChart3, Settings, Home, Receipt, Users } from 'lucide-react';
import { UserRole } from '../types';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-background text-white">
      {/* Navbar - Sticky Top */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border px-4 lg:px-8 h-16 flex items-center justify-between shadow-sm">
        <Link to="/" className="flex items-center gap-2 md:gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
            <Beer size={20} className="md:w-6 md:h-6" />
          </div>
          <span className="text-lg md:text-xl font-bold tracking-tight text-white line-clamp-1">
             Nhậu JS <span className="hidden sm:inline">- Framework phê nhất thế giới.</span>
          </span>
        </Link>

        {user && (
          <div className="flex items-center gap-4 md:gap-6">
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className={`text-sm font-bold hover:text-primary transition-colors ${isActive('/') ? 'text-primary' : 'text-secondary'}`}>
                Vote Kèo
              </Link>
              <Link to="/members" className={`text-sm font-bold hover:text-primary transition-colors ${isActive('/members') ? 'text-primary' : 'text-secondary'}`}>
                Thành viên
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
                  <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full border-2 bg-cover bg-center transition-all ${isActive('/profile') ? 'border-primary' : 'border-transparent'}`} 
                       style={{ backgroundImage: `url(${user.avatar})` }}>
                  </div>
               </Link>
               <button onClick={logout} className="hidden md:block p-2 text-secondary hover:text-white transition-colors" title="Đăng xuất">
                  <LogOut size={20} />
               </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      {/* Added pb-24 for mobile to account for Bottom Nav */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 w-full bg-surface/95 backdrop-blur-md border-t border-border flex justify-around p-2 pb-safe z-40 shadow-[0_-5px_10px_rgba(0,0,0,0.1)]">
           <Link to="/" className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive('/') ? 'text-primary bg-primary/10' : 'text-secondary'}`}>
              <Home size={22} />
              <span className="text-[10px] font-medium">Vote</span>
           </Link>
           <Link to="/members" className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive('/members') ? 'text-primary bg-primary/10' : 'text-secondary'}`}>
              <Users size={22} />
              <span className="text-[10px] font-medium">Member</span>
           </Link>
           <Link to="/leaderboard" className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive('/leaderboard') ? 'text-primary bg-primary/10' : 'text-secondary'}`}>
              <BarChart3 size={22} />
              <span className="text-[10px] font-medium">BXH</span>
           </Link>
           <Link to="/bills" className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive('/bills') ? 'text-primary bg-primary/10' : 'text-secondary'}`}>
              <Receipt size={22} />
              <span className="text-[10px] font-medium">Bill</span>
           </Link>
           
           <button onClick={logout} className="flex flex-col items-center gap-1 p-2 rounded-lg text-secondary active:text-red-400">
               <LogOut size={22} />
               <span className="text-[10px] font-medium">Thoát</span>
           </button>
        </div>
      )}
    </div>
  );
};