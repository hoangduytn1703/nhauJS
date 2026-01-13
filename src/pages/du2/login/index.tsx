import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { AuthService, DataService } from '@/core/services/mockService';
import { useAuth } from '@/core/hooks';
import { User, UserRole } from '@/core/types/types';
import { Users, Lock, ChevronRight, ShieldCheck, Mail, XCircle, Eye, EyeOff } from 'lucide-react';

const DU2Login: React.FC = () => {
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [adminMode, setAdminMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, user: currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#admin') {
        setAdminMode(true);
      } else {
        setAdminMode(false);
      }
    };

    // Check on mount
    checkHash();

    // Listen for changes
    window.addEventListener('hashchange', checkHash);
    
    // If already logged in as a MEMBER on DU2, redirect to dashboard immediately
    const stored = localStorage.getItem('du2_user') || sessionStorage.getItem('du2_user');
    if (stored) {
       const u = JSON.parse(stored) as User;
       if (u.role === UserRole.MEMBER) {
         navigate('/du2');
       }
    }

    fetchUsers();
    return () => window.removeEventListener('hashchange', checkHash);
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      const users = await DataService.getUsers();
      setAvailableUsers(users.filter(u => u.role === UserRole.MEMBER).sort((a,b) => a.nickname.localeCompare(b.nickname)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = availableUsers.filter(u => 
    u.nickname.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserConfirm = () => {
    const target = availableUsers.find(u => u.id === selectedUserId);
    if (target) {
      login(target, true); // Remember selection forever
      navigate('/du2');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError('');

    if (email === 'admin@admin.com' && password === 'Password@123#') {
        try {
            const user = await AuthService.login(email, password);
            login(user, rememberMe);
            navigate('/du2/admin');
        } catch (err: any) {
            setError(err.message || 'Lỗi đăng nhập Admin');
        }
    } else {
        setError('Thông tin Admin không chính xác');
    }
    setProcessing(false);
  };

  return (
    <div className="flex items-start justify-center p-4 bg-background overflow-hidden pt-[10vh]">
      <div className="w-full max-w-md flex flex-col gap-15">
        <div className="text-center animate-in fade-in slide-in-from-bottom duration-700">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center mx-auto mb-1 rotate-3">
             <Users className="text-primary" size={20} />
          </div>
          <h1 className="text-xl font-black text-white mb-0 tracking-tight italic">DU2</h1>
          <p className="text-[9px] text-secondary font-medium uppercase tracking-widest leading-none">We Are One</p>
        </div>

        <div className="bg-surface/50 border border-border p-5 rounded-3xl shadow-2xl backdrop-blur-xl animate-in zoom-in duration-500">
          {adminMode ? (
            <form onSubmit={handleAdminLogin} className="flex flex-col gap-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-white">Admin Access</h2>
                    <button 
                        type="button" 
                        onClick={() => { setAdminMode(false); window.location.hash = ''; }}
                        className="text-primary text-sm font-bold hover:underline cursor-pointer"
                    >
                        Quay lại
                    </button>
                </div>

                {error && <div className="p-3 bg-red-900/30 border border-red-800 text-red-200 rounded-lg text-sm text-center">{error}</div>}

                <div className="flex flex-col gap-5">
                    <label className="flex flex-col gap-2">
                        <span className="text-white text-sm font-bold ml-1">Admin Email</span>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-primary transition-colors" size={20} />
                            <input 
                                type="email" 
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full h-12 bg-background border border-border rounded-xl pl-12 pr-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-secondary/30"
                                placeholder="Nhập email admin"
                                required
                            />
                        </div>
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="text-white text-sm font-bold ml-1">Mật khẩu</span>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-primary transition-colors" size={20} />
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full h-12 bg-background border border-border rounded-xl pl-12 pr-12 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-secondary/30"
                                placeholder="••••••••"
                                required
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowPassword(!showPassword);
                              }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-white transition-colors z-10 p-1 cursor-pointer"
                            >
                              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </label>
                </div>

                <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setRememberMe(!rememberMe)}>
                    <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${rememberMe ? 'bg-primary border-primary' : 'border-border bg-background'}`}>
                        {rememberMe && <ChevronRight size={14} className="text-background rotate-90" />}
                    </div>
                    <span className="text-xs text-secondary group-hover:text-white transition-colors">Ghi nhớ đăng nhập</span>
                </div>

                <button 
                    disabled={processing}
                    className="w-full h-12 bg-primary hover:bg-primary-hover text-background font-black text-base rounded-2xl flex items-center justify-center gap-2 transform transition-all active:scale-95 shadow-[0_0_20px_rgba(244,140,37,0.3)] cursor-pointer"
                >
                    {processing ? 'Verifying...' : 'Sâm nhập Tổng bộ'}
                </button>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-white text-center">Xác nhận danh tính</h2>

              {loading ? (
                <div className="flex flex-col items-center py-6 gap-2">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-secondary text-xs">Đang tải danh sách...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 relative">
                    <span className="text-white text-[10px] font-bold uppercase tracking-wider opacity-60 ml-1">Bạn là</span>
                    
                    {/* Searchable Select Implementation */}
                    <div className="relative group">
                      <input 
                        type="text"
                        placeholder="Nhập tên để tìm kiếm..."
                        value={isDropdownOpen ? searchTerm : (availableUsers.find(u => u.id === selectedUserId)?.nickname || '')}
                        onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                        onClick={() => {
                          setIsDropdownOpen(true);
                          if (selectedUserId) {
                            setSearchTerm('');
                          }
                        }}
                        onFocus={() => {
                          setIsDropdownOpen(true);
                          if (!selectedUserId) setSearchTerm('');
                        }}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        className="w-full h-11 bg-background border border-border rounded-xl px-4 pr-20 text-white font-bold focus:border-primary outline-none transition-all text-sm"
                      />
                      {selectedUserId && !isDropdownOpen && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserId('');
                            setSearchTerm('');
                            setIsDropdownOpen(true);
                          }}
                          className="absolute right-10 top-1/2 -translate-y-1/2 text-secondary hover:text-red-400 transition-colors p-1"
                          type="button"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                      <ChevronRight className={`absolute right-4 top-1/2 -translate-y-1/2 text-secondary transition-transform ${isDropdownOpen ? 'rotate-90' : ''}`} size={16} />
                      
                      {isDropdownOpen && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-surface border border-border rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                          {filteredUsers.length > 0 ? (
                            filteredUsers.map(u => (
                              <button
                                key={u.id}
                                onClick={() => {
                                  setSelectedUserId(u.id);
                                  setSearchTerm(u.nickname);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-primary/10 flex items-center gap-3 ${selectedUserId === u.id ? 'bg-primary/20 text-primary font-bold' : 'text-secondary'}`}
                              >
                                <img src={u.avatar} className="w-6 h-6 rounded-full" />
                                <span>{u.nickname}</span>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center text-xs text-secondary italic">Không tìm thấy thành viên</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleUserConfirm}
                    disabled={!selectedUserId}
                    className="w-full h-12 bg-primary hover:bg-primary-hover disabled:bg-gray-700 disabled:cursor-not-allowed text-background font-bold text-base rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
                  >
                    Đăng nhập.
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-center mt-8 opacity-0 hover:opacity-10 transition-opacity">
            <button onClick={() => setAdminMode(true)} className="text-[10px] text-secondary uppercase tracking-[0.3em] cursor-default">
                Authorized Members Only • Admin Portal
            </button>
        </div>
      </div>
    </div>
  );
};

export default DU2Login;
