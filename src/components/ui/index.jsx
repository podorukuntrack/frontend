import { Loader2, AlertTriangle, X, CheckCircle, Info } from 'lucide-react';
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
      const { msg, type } = e.detail;
      const id = Date.now();
      setToasts(prev => [...prev, { id, msg, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  const icons = { success: CheckCircle, error: AlertTriangle, info: Info };
  
  // Style disesuaikan untuk Light/Dark mode dengan warna pastel yang soft
  const styles = { 
    success: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20', 
    error: 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20', 
    info: 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' 
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-[100] pointer-events-none">
      {toasts.map(t => {
        const Icon = icons[t.type] || Info;
        return (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-xl border shadow-lg shadow-slate-200/50 dark:shadow-none animate-fadeIn min-w-[300px] max-w-sm ${styles[t.type] || styles.info}`}>
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">{t.msg}</span>
            <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))} className="opacity-50 hover:opacity-100 transition-opacity">
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
    }
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = 'unset'; // Mengembalikan scroll
    };
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  
  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div className={`relative w-full ${sizes[size]} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl animate-fadeIn overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export function Confirm({ open, onClose, onConfirm, title, description, confirmLabel = 'Hapus', loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">{description}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>Batal</button>
        <button className="btn-danger" onClick={onConfirm} disabled={loading}>
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
    <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800 mt-5">
      <p className="text-slate-500 dark:text-slate-400 text-sm">
        Menampilkan <span className="font-medium text-slate-900 dark:text-slate-200">{((page - 1) * limit) + 1}</span> hingga <span className="font-medium text-slate-900 dark:text-slate-200">{Math.min(page * limit, total)}</span> dari <span className="font-medium text-slate-900 dark:text-slate-200">{total}</span> data
      </p>
      <div className="flex items-center gap-1">
        <button disabled={page === 1} onClick={() => onChange(page - 1)} className="btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-40">Prev</button>
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