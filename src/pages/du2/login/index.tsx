import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { AuthService, DataService } from '@/core/services/mockService';
import { useAuth } from '@/core/hooks';
import { User, UserRole } from '@/core/types/types';
import { Users, Lock, ChevronRight, ShieldCheck, Mail } from 'lucide-react';

const DU2Login: React.FC = () => {
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [adminMode, setAdminMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const { login, user: currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we should show admin mode based on URL hash or secret toggle
    if (window.location.hash === '#admin') {
      setAdminMode(true);
    }
    
    // If already logged in as a MEMBER on DU2, redirect to dashboard immediately
    // to fulfill "cannot change" requirement
    const stored = localStorage.getItem('du2_user') || sessionStorage.getItem('du2_user');
    if (stored) {
       const u = JSON.parse(stored) as User;
       if (u.role === UserRole.MEMBER) {
         navigate('/du2');
       }
    }

    fetchUsers();
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
            login(user, true);
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
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#0f172a]">
      <div className="w-full max-w-md flex flex-col gap-8">
        <div className="text-center animate-in fade-in slide-in-from-bottom duration-700">
          <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
             <Users className="text-primary" size={40} />
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight italic">DU2</h1>
          <p className="text-secondary font-medium uppercase tracking-widest">We Are One</p>
        </div>

        <div className="bg-surface/50 border border-border p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-xl animate-in zoom-in duration-500">
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

                <div className="flex flex-col gap-4">
                    <label className="flex flex-col gap-2">
                        <span className="text-white text-xs font-bold uppercase tracking-wider opacity-60">Admin Email</span>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={18} />
                            <input 
                                type="email" 
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full h-12 bg-background border border-border rounded-xl pl-12 pr-4 text-white focus:border-primary outline-none transition-all"
                                placeholder="admin@admin.com"
                                required
                            />
                        </div>
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="text-white text-xs font-bold uppercase tracking-wider opacity-60">Authentication Key</span>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={18} />
                            <input 
                                type="password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full h-12 bg-background border border-border rounded-xl pl-12 pr-4 text-white focus:border-primary outline-none transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </label>
                </div>

                <button 
                    disabled={processing}
                    className="w-full h-14 bg-primary hover:bg-primary-hover text-background font-black text-lg rounded-2xl flex items-center justify-center gap-2 transform transition-all active:scale-95 shadow-[0_0_30px_rgba(244,140,37,0.3)] cursor-pointer"
                >
                    {processing ? 'Verifying...' : 'Sâm nhập Tổng bộ'}
                </button>
            </form>
          ) : (
            <div className="flex flex-col gap-6">
              <h2 className="text-2xl font-bold text-white text-center">Xác nhận danh tính</h2>

              {loading ? (
                <div className="flex flex-col items-center py-10 gap-4">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-secondary text-sm">Đang tải danh sách...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <span className="text-white text-xs font-bold uppercase tracking-wider opacity-60 ml-1">Chọn tên của bạn</span>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full h-14 bg-background border border-border rounded-2xl px-4 text-white font-bold focus:border-primary outline-none appearance-none cursor-pointer"
                    >
                      <option value="" disabled>-- Vui lòng chọn --</option>
                      {availableUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.nickname}</option>
                      ))}
                    </select>
                  </div>

                  <p className="text-[10px] text-secondary text-center italic opacity-60 px-4">
                    Lưu ý: Sau khi chọn, bạn sẽ không thể thay đổi danh tính trên thiết bị này.
                  </p>

                  <button
                    onClick={handleUserConfirm}
                    disabled={!selectedUserId}
                    className="w-full h-14 bg-primary hover:bg-primary-hover disabled:bg-gray-700 text-background font-black text-lg rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
                  >
                    Bắt đầu nhiệm vụ
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-center opacity-0 hover:opacity-10 transition-opacity">
            <button onClick={() => setAdminMode(true)} className="text-[10px] text-secondary uppercase tracking-[0.3em] cursor-default">
                Admin Portal
            </button>
        </div>
        <div className="text-center">
            <p className="text-xs text-secondary opacity-40 uppercase tracking-[0.3em]">Authorized Members Only</p>
        </div>
      </div>
    </div>
  );
};

export default DU2Login;
