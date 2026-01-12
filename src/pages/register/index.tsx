import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { AuthService } from '@/core/services/mockService';
import { useAuth } from '@/core/hooks';
import { Mail, Lock, User } from 'lucide-react';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate Name (Latin characters only, 3-50 chars)
    const nameRegex = /^[\p{L}\s]{3,50}$/u;
    if (!nameRegex.test(name.trim())) {
      setError("Tên hiển thị chỉ được chứa chữ cái, độ dài 3-50 ký tự");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      setLoading(false);
      return;
    }

    try {
      const user = await AuthService.register(email, name, password);
      login(user, true);
      navigate('/profile'); // Send to profile to complete setup
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-[480px] flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Gia nhập Hội Bàn Tròn</h2>
          <p className="text-secondary">Điền thông tin để nhận vé mời VIP.</p>
        </div>

        {error && <div className="p-3 bg-red-900/30 border border-red-800 text-red-200 rounded-lg text-sm text-center">{error}</div>}

        <form onSubmit={handleRegister} className="flex flex-col gap-5 bg-surface/50 p-8 rounded-3xl border border-border shadow-xl backdrop-blur-sm">
          <label className="flex flex-col gap-2">
            <span className="text-white text-sm font-medium">Tên hiển thị</span>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-primary" size={20} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface text-white border border-border rounded-xl h-12 pl-12 pr-4 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="VD: Tuấn Cồn"
              />
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-white text-sm font-medium">Email</span>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-primary" size={20} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface text-white border border-border rounded-xl h-12 pl-12 pr-4 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="email@example.com"
              />
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-white text-sm font-medium">Mật khẩu</span>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-primary" size={20} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface text-white border border-border rounded-xl h-12 pl-12 pr-4 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="******"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full h-12 bg-primary hover:bg-primary-hover text-background font-bold text-lg rounded-full shadow-[0_0_20px_rgba(244,140,37,0.3)] transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Đang đăng ký...' : 'Lên Bia! 🍺'}
          </button>
        </form>

        <div className="text-center mt-2">
          <p className="text-sm text-secondary">
            Đã có bàn rồi? <Link to="/login" className="text-primary font-bold hover:underline">Vào tiệc ngay (Đăng nhập)</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;