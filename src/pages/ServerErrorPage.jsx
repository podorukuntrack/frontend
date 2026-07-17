import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ServerCrash, RefreshCcw, Home } from 'lucide-react';
import api from '../api/client';

export default function ServerErrorPage() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [isHealthy, setIsHealthy] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      // Get base URL without /api/v1 to hit the /health endpoint
      const healthUrl = api.defaults.baseURL.replace('/api/v1', '/health');
      const res = await fetch(healthUrl);
      if (res.ok) {
        setIsHealthy(true);
      } else {
        setIsHealthy(false);
      }
    } catch (err) {
      setIsHealthy(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 text-center px-6 animate-fadeIn transition-colors duration-200">
      <div className="w-24 h-24 bg-amber-100 dark:bg-amber-500/10 rounded-3xl flex items-center justify-center mb-8 border border-amber-200 dark:border-amber-500/20 shadow-sm relative">
        <ServerCrash className="w-12 h-12 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
        {isChecking && (
          <span className="absolute -top-2 -right-2 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500"></span>
          </span>
        )}
      </div>
      
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
        {isChecking 
          ? "Mengecek Koneksi..." 
          : isHealthy 
            ? "Server Telah Online!" 
            : "500 - Gangguan Server"}
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-base max-w-md mb-10 leading-relaxed font-medium">
        {isChecking 
          ? "Sistem sedang mencoba terhubung kembali ke server. Mohon tunggu sebentar." 
          : isHealthy 
            ? "Koneksi ke server telah berhasil dipulihkan. Anda dapat kembali menggunakan aplikasi."
            : "Oops! Sepertinya sistem kami sedang mengalami kendala atau sedang dalam pemeliharaan. Silakan coba lagi dalam beberapa saat."}
      </p>
      
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        {isHealthy ? (
          <button 
            onClick={handleGoBack}
            className="btn-primary w-full sm:w-auto justify-center py-2.5 px-5"
          >
            Kembali ke Aplikasi
          </button>
        ) : (
          <button 
            onClick={checkHealth} 
            disabled={isChecking}
            className="btn-primary w-full sm:w-auto justify-center py-2.5 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCcw className={`w-4 h-4 mr-1.5 ${isChecking ? 'animate-spin' : ''}`} /> 
            Coba Lagi
          </button>
        )}
        <button onClick={() => navigate('/')} className="btn-secondary w-full sm:w-auto justify-center py-2.5 px-5">
          <Home className="w-4 h-4 mr-1.5" /> Beranda Utama
        </button>
      </div>
    </div>
  );
}