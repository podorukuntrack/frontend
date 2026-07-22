import { Loader2, AlertTriangle, X, CheckCircle, Info, FileImage, RefreshCw } from 'lucide-react';
import { utilsAPI } from '../../api/services.js';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// ==========================================
// 1. LOADING STATES
// ==========================================
export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8', xl: 'w-10 h-10' };
  return <Loader2 className={`animate-spin text-indigo-600 dark:text-indigo-400 ${sizes[size]} ${className}`} />;
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Memuat data...</p>
      </div>
    </div>
  );
}

// ==========================================
// 1.5 SKELETON LOADERS
// ==========================================
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="card p-6 flex flex-col justify-between">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="w-12 h-12" />
      </div>
      <div>
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-3 w-40 mt-4" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-5 w-1/4" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 mb-5">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    </div>
  );
}

// ==========================================
// 2. EMPTY STATE
// ==========================================
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20">
      {Icon && (
        <div className="w-12 h-12 mb-4 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-slate-900 dark:text-slate-100 font-semibold mb-1.5">{title}</h3>
      {description && <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

// ==========================================
// 3. TOAST CONTAINER
// ==========================================
export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const { id, msg, type, progress } = e.detail;
      
      setToasts(prev => {
        const existing = prev.find(t => t.id === id);
        if (existing) {
          return prev.map(t => t.id === id ? { ...t, msg, type, progress } : t);
        }
        return [...prev, { id, msg, type, progress }];
      });

      // Jika tidak ada progress bar yang berjalan, atau operasi selesai, mulai timer auto-close
      if (progress === undefined) {
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
      }
    };

    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  const icons = { success: CheckCircle, error: AlertTriangle, info: Info };
  
  const styles = { 
    success: 'border-emerald-200 dark:border-emerald-800/60', 
    error: 'border-rose-200 dark:border-rose-800/60', 
    info: 'border-indigo-200 dark:border-indigo-800/60' 
  };

  const iconStyles = {
    success: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', icon: 'text-emerald-600 dark:text-emerald-400' },
    error: { bg: 'bg-rose-100 dark:bg-rose-500/20', icon: 'text-rose-600 dark:text-rose-400' },
    info: { bg: 'bg-indigo-100 dark:bg-indigo-500/20', icon: 'text-indigo-600 dark:text-indigo-400' }
  };

  return (
    <div className="fixed top-4 left-0 right-0 flex flex-col items-center gap-3 z-[999999] pointer-events-none px-4">
      {toasts.map(t => {
        const Icon = icons[t.type] || Info;
        const style = styles[t.type] || styles.info;
        const iconStyle = iconStyles[t.type] || iconStyles.info;
        
        // Ekstraksi Title dan Description
        const isObj = typeof t.msg === 'object' && t.msg !== null;
        const title = isObj ? t.msg.title : (t.type === 'error' ? 'Kesalahan' : t.type === 'success' ? 'Berhasil' : 'Informasi');
        const desc = isObj ? t.msg.description : t.msg;

        return (
          <div key={t.id} className={`pointer-events-auto flex items-start gap-4 p-4 rounded-2xl border shadow-2xl shadow-slate-200/50 dark:shadow-none animate-fadeIn w-full sm:w-[360px] bg-white dark:bg-slate-900 ${style}`}>
            <div className={`mt-0.5 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconStyle.bg}`}>
              <Icon className={`w-5 h-5 ${iconStyle.icon}`} strokeWidth={2.5} />
            </div>
            <div className="flex-1 space-y-1 mt-0.5 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">{title}</h4>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed break-words">{desc}</p>
              {t.progress !== undefined && (
                <div className="mt-2.5 mb-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-300 rounded-full ${t.progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(t.progress, 100)}%` }} />
                </div>
              )}
            </div>
            <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))} className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors mt-[-4px] mr-[-4px]">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// 4. MODALS & DIALOGS (Diperbarui dengan Portal)
// ==========================================
export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) {
      document.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden'; // Mengunci scroll body
      return () => {
        document.removeEventListener('keydown', handler);
        document.body.style.overflow = 'unset'; // Mengembalikan scroll
      };
    }
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  
  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div className={`relative w-full ${sizes[size]} max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl animate-fadeIn overflow-hidden`}>
        {title && (
          <div className="flex-shrink-0 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 pr-4">{title}</h2>
            <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {!title && (
          <button onClick={onClose} className="absolute top-4 right-4 z-20 btn-ghost p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
          </button>
        )}
        <div className={`flex-1 overflow-y-auto ${title ? "p-5 sm:p-6" : "p-5 sm:p-6 pt-10"}`}>{children}</div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export function Confirm({ open, onClose, onConfirm, title, description, confirmLabel = 'Hapus', loading }) {
  const isDestructive = confirmLabel.toLowerCase().includes('hapus') || confirmLabel.toLowerCase().includes('keluar') || confirmLabel.toLowerCase().includes('batal');
  
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center mt-2 mb-6 sm:mb-8">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 border-4 ${isDestructive ? 'bg-rose-100 border-rose-50 dark:bg-rose-500/20 dark:border-rose-500/10' : 'bg-amber-100 border-amber-50 dark:bg-amber-500/20 dark:border-amber-500/10'}`}>
          <AlertTriangle className={`w-8 h-8 ${isDestructive ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`} strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-[280px] mx-auto leading-relaxed">{description}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button className="btn-secondary w-full sm:flex-1 justify-center !py-2.5 font-semibold order-2 sm:order-1" onClick={onClose} disabled={loading}>Batal</button>
        <button className={`${isDestructive ? 'btn-danger' : 'btn-primary'} w-full sm:flex-1 justify-center !py-2.5 font-semibold order-1 sm:order-2`} onClick={onConfirm} disabled={loading}>
          {loading && <Spinner size="sm" className="!text-current mr-2" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ==========================================
// 5. DATA NAVIGATION
// ==========================================
export function Pagination({ page, total, limit, onChange }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-slate-100 dark:border-slate-800 mt-5">
      <p className="text-slate-500 dark:text-slate-400 text-sm text-center sm:text-left">
        Menampilkan <span className="font-medium text-slate-900 dark:text-slate-200">{((page - 1) * limit) + 1}</span> hingga <span className="font-medium text-slate-900 dark:text-slate-200">{Math.min(page * limit, total)}</span> dari <span className="font-medium text-slate-900 dark:text-slate-200">{total}</span>
      </p>
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button disabled={page === 1} onClick={() => onChange(page - 1)} className="btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-40">Prev</button>
        <div className="hidden sm:flex items-center gap-1">
          {Array.from({ length: Math.min(5, pages) }, (_, i) => {
            const p = Math.max(1, Math.min(pages - 4, page - 2)) + i;
            return (
              <button 
                key={p} 
                onClick={() => onChange(p)} 
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${
                  p === page 
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' 
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
        <button disabled={page === pages} onClick={() => onChange(page + 1)} className="btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

// ==========================================
// 6. FORMS & INPUTS
// ==========================================
export function SearchInput({ value, onChange, placeholder = 'Cari...' }) {
  return (
    <div className="relative">
      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input className="input pl-10" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function Select({ value, onChange, options, placeholder = 'Pilih...', className = '' }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={`input ${className}`}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// ==========================================
// 7. MISCELLANEOUS UI
// ==========================================
export function ProgressBar({ value, className = '' }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-indigo-500' : value >= 20 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className={`h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${className}`}>
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export function Avatar({ name, size = 'md' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  // Menggunakan warna yang lebih soft untuk UI modern
  const colors = [
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400', 
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', 
    'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400', 
    'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
  ];
  const color = colors[name?.charCodeAt(0) % colors.length] || colors[0];
  
  return (
    <div className={`${sizes[size]} ${color} rounded-xl flex items-center justify-center font-bold flex-shrink-0 border border-white/20`}>
      {initials}
    </div>
  );
}

// ==========================================
// 8. LIGHTBOX / MEDIA VIEWER
// ==========================================
export function Lightbox({ item, onClose }) {
  const [isRotating, setIsRotating] = useState(false);
  const [imgSrc, setImgSrc] = useState('');
  const [visualRotation, setVisualRotation] = useState(0);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (item?.url) {
      setImgSrc(item.url);
      setVisualRotation(0);
    }
  }, [item]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (item) {
      document.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handler);
        document.body.style.overflow = 'unset';
      };
    }
  }, [item, onClose]);

  if (!item) return null;
  const { type, name } = item;

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleVisualRotate = (e) => {
    e.stopPropagation();
    setVisualRotation(prev => prev + 90);
  };

  const handleSaveRotation = async (e) => {
    e.stopPropagation();
    const degrees = visualRotation % 360;
    if (degrees === 0) return;
    
    try {
      setIsRotating(true);
      await utilsAPI.rotateImage({ fileUrl: item.url, degrees });
      
      // Force reload image by appending timestamp
      const newUrl = new URL(imgSrc, window.location.origin);
      newUrl.searchParams.set('t', Date.now());
      setImgSrc(newUrl.toString());
      setVisualRotation(0);
      showToast('Perubahan rotasi berhasil disimpan!');
    } catch (err) {
      console.error('Failed to save image rotation', err);
      showToast('Gagal merotasi gambar. Silakan coba lagi.', 'error');
    } finally {
      setIsRotating(false);
    }
  };

  const hasRotationChanges = visualRotation % 360 !== 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {toast && (
        <div className={`absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full font-medium text-sm shadow-xl transition-all flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <div className="absolute top-6 right-6 flex gap-3 items-center">
        {type === 'image' && hasRotationChanges && (
          <button
            className="text-white text-sm font-medium bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-full transition-all flex items-center justify-center disabled:opacity-50 gap-2 shadow-lg"
            onClick={handleSaveRotation}
            disabled={isRotating}
          >
            {isRotating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {isRotating ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        )}
        
        {type === 'image' && (
          <button
            className="text-white/70 hover:text-white bg-white/10 hover:bg-indigo-500 p-2 rounded-full transition-all flex items-center justify-center disabled:opacity-50"
            onClick={handleVisualRotate}
            title="Rotate Gambar"
            disabled={isRotating}
          >
            <RefreshCw className="w-6 h-6" />
          </button>
        )}
        <button
          className="text-white/70 hover:text-white bg-white/10 hover:bg-rose-500 p-2 rounded-full transition-all"
          onClick={onClose}
          title="Tutup (Esc)"
        >
          <X className="w-6 h-6" strokeWidth={2.5} />
        </button>
      </div>
      {name && <p className="text-white/80 font-medium text-sm mb-4 max-w-lg text-center truncate">{name}</p>}
      {type === 'image' ? (
        <div className="relative max-w-full max-h-[85vh] flex items-center justify-center">
          <img
            src={imgSrc}
            alt={name || 'Preview'}
            style={{ transform: `rotate(${visualRotation}deg)`, transition: 'transform 0.3s ease' }}
            className={`max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl transition-opacity duration-300 ${isRotating ? 'opacity-50' : 'opacity-100'}`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : type === 'video' ? (
        <video
          src={url}
          controls
          autoPlay
          className="max-w-full max-h-[85vh] rounded-xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="flex flex-col items-center gap-4">
          <FileImage className="w-20 h-20 text-white/30" />
          <a
            href={url}
            target="_blank" rel="noopener noreferrer"
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Buka File
          </a>
        </div>
      )}
    </div>,
    document.body
  );
}export { default as CustomDatePicker } from './CustomDatePicker';

export { default as CircularTimePicker } from './CircularTimePicker';
export { default as DateTimePickerModal } from './DateTimePickerModal';
