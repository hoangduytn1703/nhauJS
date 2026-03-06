import React,{ useState } from 'react';
import { useNavigate,Link,useLocation } from 'react-router';
import { AuthService, SettingsService } from '@/core/services/mockService';
import { useAuth } from '@/core/hooks';
import { Beer,Mail,Lock,Eye,EyeOff,CheckSquare,Square,XCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [showPass,setShowPass] = useState(false);
  const [rememberMe,setRememberMe] = useState(true);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [regEnabled,setRegEnabled] = useState(true);

  // Forgot Password State
  const [showForgot,setShowForgot] = useState(false);
  const [forgotEmail,setForgotEmail] = useState('');
  const [sendingReset,setSendingReset] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  React.useEffect(() => {
    SettingsService.getSettings().then(s => setRegEnabled(s.registrationEnabled));
  },[]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await AuthService.login(email,password);
      login(user,rememberMe);
      navigate(from);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return alert("Vui lòng nhập email");
    setSendingReset(true);
    try {
      await AuthService.resetPassword(forgotEmail);
      alert("Đã gửi email reset mật khẩu. Hãy kiểm tra hộp thư (cả mục Spam/Rác).");
      setShowForgot(false);
      setForgotEmail('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSendingReset(false);
    }
  };

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
          <p className="relative z-10 text-secondary text-sm mb-6">
            {regEnabled 
              ? 'Đăng ký ngay để không bỏ lỡ những kèo nhậu chất lượng nhất!' 
              : 'Tính năng đăng ký hiện đang tạm đóng. Liên hệ Admin để tham gia!'}
          </p>
          {regEnabled ? (
            <Link to="/register" className="relative z-10 border border-secondary text-secondary hover:bg-secondary hover:text-background px-6 py-2 rounded-full text-sm font-bold transition-all">
              Đăng ký tài khoản
            </Link>
          ) : (
            <div className="relative z-10 border border-secondary/30 text-secondary/30 px-6 py-2 rounded-full text-sm font-bold cursor-not-allowed">
              Đăng ký tạm đóng
            </div>
          )}
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
            <div className="flex flex-col gap-2">
              <label htmlFor="email-input" className="text-white text-sm font-bold ml-1 cursor-pointer">Email chiến hữu</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-primary transition-colors" size={20} />
                <input
                  id="email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl h-12 pl-12 pr-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-secondary/30"
                  placeholder="Nhập email"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password-input" className="text-white text-sm font-bold ml-1 cursor-pointer">Mật khẩu</label>
                <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-primary hover:underline cursor-pointer">Quên mật khẩu?</button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-primary transition-colors" size={20} />
                <input
                  id="password-input"
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl h-12 pl-12 pr-12 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-secondary/30"
                  placeholder="******"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPass(!showPass);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-white transition-colors z-10 p-1 cursor-pointer"
                >
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 cursor-pointer w-fit" onClick={() => setRememberMe(!rememberMe)}>
              {rememberMe
                ? <CheckSquare className="text-primary" size={20} />
                : <Square className="text-secondary" size={20} />
              }
              <span className="text-sm text-secondary select-none">Duy trì đăng nhập</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full h-12 bg-primary hover:bg-primary-hover text-background font-bold text-lg rounded-full shadow-[0_0_20px_rgba(244,140,37,0.3)] transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Đang vào bàn...' : 'Vào Tiệc Ngay'}
            </button>
          </form>

          <div className="text-center mt-6 md:hidden">
            <p className="text-sm text-secondary">
              Chưa có vé? {regEnabled ? (
                <Link to="/register" className="text-primary font-bold hover:underline">Đăng ký ngay</Link>
              ) : (
                <span className="text-secondary/50 font-bold">Đăng ký lọc</span>
              )}
            </p>
          </div>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowForgot(false)}
              className="absolute top-4 right-4 text-secondary hover:text-white cursor-pointer"
            >
              <XCircle size={24} />
            </button>

            <h3 className="text-xl font-bold text-white mb-2">Quên mật khẩu?</h3>
            <p className="text-secondary text-sm mb-6">Nhập email để nhận link đặt lại mật khẩu mới.</p>

            <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full bg-background border border-border rounded-lg p-3 text-white focus:border-primary outline-none"
                placeholder="Nhập email của bạn"
                autoFocus
              />

              <button
                type="submit"
                disabled={sendingReset}
                className="w-full bg-primary hover:bg-primary-hover text-background font-bold py-3 rounded-xl transition-all cursor-pointer"
              >
                {sendingReset ? 'Đang gửi...' : 'Gửi Link Reset'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;