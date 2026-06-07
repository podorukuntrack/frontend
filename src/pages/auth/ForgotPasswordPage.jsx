import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, MessageCircle, AlertCircle, CheckCircle, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../../api/client';
import { Spinner } from '../../components/ui';

import bgImage from '../../assets/podorukun-bg.jpg';
import logo from '../../assets/podorukun-logo.png';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Step 1 state
  const [method, setMethod] = useState('wa'); // 'wa' or 'email'
  const [contact, setContact] = useState('');
  
  // Step 2 state
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState(null);
  
  // Step 3 state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --- Handlers ---
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password/request-otp', { method, contact });
      setStep(2);
    } catch (err) {
      setError(err?.response?.data?.message || 'Gagal mengirim OTP. Pastikan kontak terdaftar.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/forgot-password/verify-otp', { contact, otp });
      setResetToken(res.data.data.resetToken);
      setStep(3);
    } catch (err) {
      setError(err?.response?.data?.message || 'OTP tidak valid atau sudah kedaluwarsa.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password/reset', { contact, resetToken, newPassword });
      setStep(4); // Success step
    } catch (err) {
      setError(err?.response?.data?.message || 'Gagal mereset password. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-6 transition-all duration-500"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white/95 dark:bg-slate-900/95 shadow-[0px_0px_40px_-10px_rgba(201,24,36,0.6)] backdrop-blur-xl p-8 sm:p-10 transition-colors duration-300 border border-white/20 dark:border-slate-800">
        
        {/* Header / Logo */}
        <div className="flex flex-col items-center justify-center mb-8">
          <img src={logo} alt="Podorukun Logo" className="w-14 h-14 object-contain mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Lupa Password
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
            {step === 1 && 'Pilih metode untuk menerima kode verifikasi OTP'}
            {step === 2 && 'Masukkan kode OTP yang telah dikirim'}
            {step === 3 && 'Buat password baru untuk akun Anda'}
            {step === 4 && 'Password Anda berhasil diperbarui'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{error}</p>
          </div>
        )}

        {/* --- STEP 1: Request OTP --- */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setMethod('wa')}
                className={`flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                  method === 'wa' 
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                }`}
              >
                <MessageCircle className={`w-6 h-6 mb-2 ${method === 'wa' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                <span className={`text-sm font-semibold ${method === 'wa' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}`}>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod('email')}
                className={`flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                  method === 'email' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <Mail className={`w-6 h-6 mb-2 ${method === 'email' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                <span className={`text-sm font-semibold ${method === 'email' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}`}>Email</span>
              </button>
            </div>

            <div>
              <label className="label">
                {method === 'wa' ? 'Nomor WhatsApp' : 'Alamat Email'}
              </label>
              <input
                type={method === 'email' ? 'email' : 'tel'}
                className="input focus:ring-2 focus:ring-rose-500/50 transition-all"
                placeholder={method === 'wa' ? 'Contoh: 081234567890' : 'nama@email.com'}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
                autoFocus
              />
            </div>

            <button type="submit" disabled={loading || !contact} className="btn-podorukun w-full justify-center py-3 text-base">
              {loading && <Spinner size="sm" className="!text-white/70 mr-2" />}
              {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
            </button>

            <div className="text-center mt-6">
              <Link to="/login" className="text-sm text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 inline-flex items-center gap-1 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Kembali ke Login
              </Link>
            </div>
          </form>
        )}

        {/* --- STEP 2: Verify OTP --- */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <label className="label text-center block !text-lg mb-4">Masukkan 6 Digit OTP</label>
              <input
                type="text"
                maxLength={6}
                className="input text-center text-2xl tracking-[0.5em] font-mono h-14 focus:ring-2 focus:ring-rose-500/50 transition-all"
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // only numbers
                required
                autoFocus
              />
              <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-3">
                Kode dikirim ke <span className="font-semibold text-slate-700 dark:text-slate-200">{contact}</span>
              </p>
              {method === 'email' && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2 text-left leading-relaxed animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Tidak menerima email? Silakan periksa folder <strong>Spam</strong> atau <strong>Junk</strong> Anda.</p>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading || otp.length !== 6} className="btn-podorukun w-full justify-center py-3 text-base">
              {loading && <Spinner size="sm" className="!text-white/70 mr-2" />}
              {loading ? 'Memverifikasi...' : 'Verifikasi OTP'}
            </button>
            
            <div className="text-center mt-4">
              <button type="button" onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors">
                Ganti nomor/email?
              </button>
            </div>
          </form>
        )}

        {/* --- STEP 3: Reset Password --- */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <label className="label">Password Baru</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  className="input pl-10 focus:ring-2 focus:ring-rose-500/50 transition-all"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="label">Konfirmasi Password Baru</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  className="input pl-10 focus:ring-2 focus:ring-rose-500/50 transition-all"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-podorukun w-full justify-center py-3 text-base mt-4">
              {loading && <Spinner size="sm" className="!text-white/70 mr-2" />}
              {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </form>
        )}

        {/* --- STEP 4: Success --- */}
        {step === 4 && (
          <div className="text-center space-y-6 animate-in zoom-in-95 duration-500">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Password Berhasil Diubah</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Silakan login menggunakan password baru Anda.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="btn-podorukun w-full justify-center py-3 text-base group"
            >
              Masuk Sekarang <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
