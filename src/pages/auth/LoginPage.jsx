import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen bg-[url('assets/podorukun-bg.jpg')] bg-cover bg-no-repeat dark:bg-slate-950 flex transition-colors duration-200">
    

      {/* Right panel - Form Area */}
      <div className="w-screen h-screen flex items-center justify-center bg-black/70">
      <div className="flex items-center justify-center p-6 sm:p-12 card shadow-[0px_0px_35px_-9px_#c91824]">
        <div className="w-full max-w-sm">
          
          {/* Mobile Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm">
                <img src="src/assets/podorukun-logo.png" alt="" className="w-10 h-10" />
              </div>
              <span className="font-sans font-bold text-2xl text-slate-900 dark:text-white tracking-tight">Podorukun Track</span>
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
            
            <button type="submit" disabled={loading} className="btn-podorukun w-full justify-center py-2.5 mt-2">
              {loading && <Spinner size="sm" className="!text-white/70" />}
              {loading ? 'Sedang masuk...' : 'Masuk sekarang'}
            </button>
          </form>

         
        </div>
      </div>
      </div>
    </div>
  );
}