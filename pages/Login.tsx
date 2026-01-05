import React, { useLayoutEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthService } from '../services/mockService';
import { useAuth } from '../App';
import { Beer, Mail, Lock, Eye, EyeOff, CheckSquare, Square } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); 
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await AuthService.login(email, password);
      login(user, rememberMe);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useLayoutEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user])

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-background rounded-3xl border border-border shadow-2xl flex overflow-hidden flex-col md:flex-row min-h-[600px]">
        
        {/* Left Side Visual */}
        <div className="hidden md:flex w-5/12 bg-surface relative flex-col items-center justify-center p-8 text-center">
            <div className="absolute inset-0 z-0">
               <img src="https://picsum.photos/seed/beer/600/800" className="w-full h-full object-cover opacity-40 mix-blend-overlay" />
            </div>
            <div className="relative z-10 animate-bounce mb-6">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(244,140,37,0.4)]">
                    <Beer size={40} className="text-background" />
                </div>
            </div>
            <h3 className="relative z-10 text-2xl font-black text-white mb-2">Chưa có vé?</h3>
            <p className="relative z-10 text-secondary text-sm mb-6">Đăng ký ngay để không bỏ lỡ những kèo nhậu chất lượng nhất!</p>
            <Link to="/register" className="relative z-10 border border-secondary text-secondary hover:bg-secondary hover:text-background px-6 py-2 rounded-full text-sm font-bold transition-all">
                Đăng ký tài khoản
            </Link>
        </div>

        {/* Right Side Form */}
        <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center bg-background relative">
           <div className="mb-8">
               <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-2">
                   👋 Điểm danh!
               </h1>
               <p className="text-secondary">Đăng nhập để bắt đầu bình chọn kèo nhậu hôm nay 🍻</p>
           </div>

           {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-200 rounded-lg text-sm">{error}</div>}

           <form onSubmit={handleLogin} className="flex flex-col gap-5">
               <label className="flex flex-col gap-2">
                   <span className="text-white text-sm font-bold ml-1">Email chiến hữu</span>
                   <div className="relative group">
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-primary transition-colors" size={20} />
                       <input 
                          type="email" 
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-surface border border-border rounded-xl h-12 pl-12 pr-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-secondary/30"
                          placeholder="Nhập email"
                       />
                   </div>
               </label>

               <label className="flex flex-col gap-2">
                   <span className="text-white text-sm font-bold ml-1">Mật khẩu bí mật</span>
                   <div className="relative group">
                       <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-primary transition-colors" size={20} />
                       <input 
                          type={showPass ? "text" : "password"} 
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-surface border border-border rounded-xl h-12 pl-12 pr-10 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-secondary/30"
                          placeholder="*******"
                       />
                       <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-white">
                           {showPass ? <EyeOff size={20}/> : <Eye size={20}/>}
                       </button>
                   </div>
               </label>

               <div className="flex items-center gap-2 cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                   {rememberMe ? <CheckSquare className="text-primary" size={20}/> : <Square className="text-secondary" size={20}/>}
                   <span className={`text-sm select-none ${rememberMe ? 'text-white' : 'text-secondary'}`}>Ghi nhớ đăng nhập</span>
               </div>

               <button 
                  type="submit" 
                  disabled={loading}
                  className="mt-2 w-full h-12 bg-primary text-background text-base font-bold rounded-full hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(244,140,37,0.25)] flex items-center justify-center gap-2"
                >
                  {loading ? 'Đang rót...' : 'Zô 100% (Đăng nhập)'}
               </button>
           </form>
           
           <div className="mt-6 md:hidden text-center">
             <Link to="/register" className="text-primary font-bold hover:underline">Chưa có vé? Đăng ký ngay</Link>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Login;