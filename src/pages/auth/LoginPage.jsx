import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/ui';
import { Eye, EyeOff, Mail, AlertCircle, CheckCircle, X } from 'lucide-react';
import api from '../../api/client';

import bgImage from '../../assets/podorukun-bg.jpg';
import logo from '../../assets/podorukun-logo.png';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // { title, description }

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState(null); // { success, message }

  // ── Login ─────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // tambahkan ini

    setLoading(true);
    setError(null);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'customer' ? '/units' : '/');
    } catch (err) {
      console.error('Login error:', err); // tambah ini untuk debug

      const status = err?.response?.status;
      const raw = err?.response?.data?.message || err?.message || '';

      if (status === 401 || status === 400) {
        setError({
          title: 'Login Gagal',
          description: 'Email atau password yang Anda masukkan tidak sesuai.',
        });
      } else if (err?.code === 'ERR_NETWORK' || err?.code === 'ERR_CONNECTION_REFUSED') {
        setError({
          title: 'Koneksi Gagal',
          description: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
        });
      } else {
        setError({
          title: 'Terjadi Kesalahan',
          description: 'Silakan coba lagi beberapa saat.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password ───────────────────────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotResult(null);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotResult({
        success: true,
        message: 'Password sementara telah dikirim ke nomor WhatsApp yang terdaftar. Silakan cek pesan Anda.',
      });
    } catch (err) {
      const raw = err?.response?.data?.message || '';
      setForgotResult({
        success: false,
        message: raw || 'Gagal mengirim password. Pastikan email yang Anda masukkan sudah benar.',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotEmail('');
    setForgotResult(null);
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-6"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" />

      {/* ── Login Card ─────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-[0px_0px_35px_-9px_#c91824] p-8 sm:p-10 transition-colors duration-200">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <img src={logo} alt="Podorukun Logo" className="w-11 h-11 object-contain" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Podorukun Track
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Selamat datang kembali
            </p>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Masuk ke akun
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Silakan masukkan email dan password Anda.
          </p>
        </div>

        {/* Error Box */}
        {error && (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">{error.title}</p>
                <p className="text-sm text-rose-600 dark:text-rose-300 mt-0.5">{error.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <div>
            <label className="label">Email</label>
            <input
              id="login-email"
              type="email"
              className="input"
              placeholder="nama@email.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              autoFocus
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label !mb-0">Password</label>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium transition-colors"
              >
                Lupa password?
              </button>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                className="input pr-11"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-podorukun w-full justify-center py-2.5"
          >
            {loading && <Spinner size="sm" className="!text-white/70" />}
            {loading ? 'Sedang masuk...' : 'Masuk sekarang'}
          </button>
        </form>
      </div>

      {/* ── Forgot Password Modal ──────────────────────────────── */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeForgot} />

          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Lupa Password</h3>
              </div>
              <button
                onClick={closeForgot}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotResult ? (
              /* Result State */
              <div>
                <div className={`rounded-xl border px-4 py-3 flex items-start gap-2 ${forgotResult.success
                  ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10'
                  : 'border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10'
                  }`}>
                  {forgotResult.success
                    ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    : <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                  }
                  <p className={`text-sm ${forgotResult.success
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-700 dark:text-rose-300'
                    }`}>
                    {forgotResult.message}
                  </p>
                </div>
                <button
                  onClick={closeForgot}
                  className="btn-podorukun w-full justify-center py-2.5 mt-4"
                >
                  Kembali ke Login
                </button>
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Masukkan email Anda. Kami akan mengirimkan password sementara via <strong>WhatsApp</strong> ke nomor yang terdaftar.
                </p>
                <div>
                  <label className="label">Email</label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="input"
                    placeholder="nama@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn-podorukun w-full justify-center py-2.5"
                >
                  {forgotLoading && <Spinner size="sm" className="!text-white/70" />}
                  {forgotLoading ? 'Mengirim...' : 'Kirim Password via WhatsApp'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}