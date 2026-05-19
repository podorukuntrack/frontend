import Sidebar from './Sidebar';
import { useLocation } from 'react-router-dom';

const pageTitles = {
  '/': 'Dashboard',
  '/companies': 'Perusahaan',
  '/projects': 'Proyek',
  '/clusters': 'Cluster',
  '/units': 'Unit',
  '/assignments': 'Penjualan',
  '/progress': 'Progress',
  '/documentation': 'Dokumentasi',
  '/users': 'Pengguna',
};

export default function AppLayout({ children }) {
  const location = useLocation();

  const currentTitle =
    pageTitles[location.pathname] || 'Podorukun';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200">

      {/* SIDEBAR */}
      <Sidebar />

      {/* CONTENT */}
      <main className="flex-1 overflow-y-auto relative">

        {/* TOPBAR */}
        <div className="sticky top-0 z-30 h-[72px] shadow-sm flex items-center px-6 md:px-8" style={{ backgroundColor: 'var(--color-primary, #87070c)' }}>
          <h1 className="text-white text-xl font-semibold tracking-tight">
            {currentTitle}
          </h1>
        </div>

        {/* PAGE CONTENT */}
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fadeIn">
          {children}
        </div>

      </main>
    </div>
  );
}