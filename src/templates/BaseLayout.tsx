import React from 'react';
import { useAuth } from '@/core/hooks';
import { Link, useLocation } from 'react-router';
import { Beer, LogOut, BarChart3, Settings, Home, Receipt, Users } from 'lucide-react';
import { UserRole } from '@/core/types/types';

export const BaseLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isDU2 = location.pathname.startsWith('/du2');
  const pathPrefix = isDU2 ? '/du2' : '';

  const isActive = (path: string) => {
    if (path === '/' && !isDU2) return location.pathname === '/';
    if (path === '/du2' && isDU2) return location.pathname === '/du2';
    return location.pathname === path;
  };

  const getLink = (path: string) => {
      if (path === '/') return isDU2 ? '/du2' : '/';
      return `${pathPrefix}${path}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-white">
      {/* Navbar - Sticky Top - */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border px-4 lg:px-8 h-16 flex items-center justify-between shadow-sm">
        <Link to={getLink('/')} className="flex items-center gap-2 md:gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 transition-transform hover:scale-110">
            {isDU2 ? <Users size={20} className="md:w-6 md:h-6" /> : <Beer size={20} className="md:w-6 md:h-6" />}
          </div>
          <div className="flex flex-col">
            <span className="text-lg md:text-xl font-black tracking-tighter text-white leading-none">
                {isDU2 ? 'DU2' : 'Nhậu JS'}
            </span>
            <span className="text-[10px] md:text-xs font-bold text-secondary uppercase tracking-[0.2em] mt-0.5">
                {isDU2 ? 'We Are One' : 'Framework phê nhất'}
            </span>
          </div>
        </Link>

        {user && (
          <div className="flex items-center gap-4 md:gap-6">
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <Link to={getLink('/')} className={`text-sm font-bold hover:text-primary transition-colors ${isActive(getLink('/')) ? 'text-primary' : 'text-secondary'}`}>
                {isDU2 ? 'Chiến Dịch' : 'Vote Kèo'}
              </Link>
              <Link to={getLink('/members')} className={`text-sm font-bold hover:text-primary transition-colors ${isActive(getLink('/members')) ? 'text-primary' : 'text-secondary'}`}>
                Thành viên
              </Link>
              <Link to={getLink('/leaderboard')} className={`text-sm font-bold hover:text-primary transition-colors ${isActive(getLink('/leaderboard')) ? 'text-primary' : 'text-secondary'}`}>
                BXH
              </Link>
              <Link to={getLink('/bills')} className={`text-sm font-bold hover:text-primary transition-colors ${isActive(getLink('/bills')) ? 'text-primary' : 'text-secondary'}`}>
                Tính Tiền
              </Link>
              {user.role === UserRole.ADMIN && (
                <Link to={getLink('/admin')} className={`text-sm font-bold hover:text-primary transition-colors ${isActive(getLink('/admin')) ? 'text-primary' : 'text-secondary'}`}>
                  Quản trị
                </Link>
              )}
            </div>

              <div className="flex items-center gap-3">
                <Link to={getLink('/profile')}>
                  <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full border-2 bg-cover bg-center transition-all ${isActive(getLink('/profile')) ? 'border-primary' : 'border-transparent'}`}
                    style={{ backgroundImage: `url(${user.avatar})` }}>
                  </div>
                </Link>
                {/*TODO: Temporarily disabled for DU2 debugging */}
                {/* {( !isDU2 || user.role === UserRole.ADMIN ) && ( */}
                  <button onClick={logout} className="hidden md:block p-2 text-secondary hover:text-red-400 transition-colors cursor-pointer" title="Đăng xuất">
                    <LogOut size={20} />
                  </button>
                {/* )} */}
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
          <Link to={getLink('/')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive(getLink('/')) ? 'text-primary bg-primary/10' : 'text-secondary'}`}>
            <Home size={22} />
            <span className="text-[10px] font-medium">{isDU2 ? 'Kèo' : 'Vote'}</span>
          </Link>
          <Link to={getLink('/members')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive(getLink('/members')) ? 'text-primary bg-primary/10' : 'text-secondary'}`}>
            <Users size={22} />
            <span className="text-[10px] font-medium">Bản</span>
          </Link>
          <Link to={getLink('/leaderboard')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive(getLink('/leaderboard')) ? 'text-primary bg-primary/10' : 'text-secondary'}`}>
            <BarChart3 size={22} />
            <span className="text-[10px] font-medium">Top</span>
          </Link>
          <Link to={getLink('/bills')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive(getLink('/bills')) ? 'text-primary bg-primary/10' : 'text-secondary'}`}>
            <Receipt size={22} />
            <span className="text-[10px] font-medium">Bill</span>
          </Link>

          {/* Temporarily disabled for DU2 debugging */}
          {( !isDU2 || user.role === UserRole.ADMIN ) && (
            <button onClick={logout} className="flex flex-col items-center gap-1 p-2 rounded-lg text-secondary active:text-red-400 cursor-pointer">
              <LogOut size={22} />
              <span className="text-[10px] font-medium">Thoát</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};