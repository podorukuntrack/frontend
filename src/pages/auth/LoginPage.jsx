import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/ui';
import { extractError } from '../../utils/helpers';
import { Building2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'customer' ? '/units' : '/');
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-200">
      {/* Left panel - Branding Area */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-12">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-500/25">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-sans font-bold text-2xl text-slate-900 dark:text-white tracking-tight">PropTrack</span>
        </div>

        {/* Hero Copy */}
        <div className="max-w-md">
          <blockquote className="text-3xl font-sans font-bold text-slate-900 dark:text-slate-100 leading-tight mb-5 tracking-tight">
            "Kelola properti Anda dengan mudah dan transparan."
          </blockquote>
          <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
            Platform manajemen proyek real estate terintegrasi dengan tracking real-time. Membantu Anda mengawasi setiap tahap pembangunan hingga serah terima.
          </p>
        </div>

        {/* Stats - Bento Grid Style */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Proyek Aktif', val: '5+' },
            { label: 'Unit Dikelola', val: '500+' },
            { label: 'Customer', val: '200+' },
            { label: 'Uptime', val: '99.9%' },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50">
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1 tracking-tight">{s.val}</div>
              <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - Form Area */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          
          {/* Mobile Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-3 lg:hidden mb-8">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-500/25">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-sans font-bold text-2xl text-slate-900 dark:text-white tracking-tight">PropTrack</span>
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Masuk ke akun</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Selamat datang kembali! Silakan masukkan kredensial Anda.</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 text-sm font-medium px-4 py-3.5 rounded-xl mb-6 flex items-start gap-3 animate-fadeIn">
              <span className="flex-1">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                type="email" 
                className="input" 
                placeholder="nama@email.com"
                value={form.email} 
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required 
                autoFocus
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label !mb-0">Password</label>
                {/* Opsional: Tambahkan Link Lupa Password jika nanti diperlukan */}
                {/* <Link to="/forgot-password" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">Lupa Password?</Link> */}
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} 
                  className="input pr-11" 
                  placeholder="••••••••"
                  value={form.password} 
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading && <Spinner size="sm" className="!text-white/70" />}
              {loading ? 'Sedang masuk...' : 'Masuk sekarang'}
            </button>
          </form>

          <p className="text-center text-slate-500 dark:text-slate-400 text-sm mt-8">
            Belum punya akun?{' '}
            <Link to="/register" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold transition-colors">
              Daftar di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}