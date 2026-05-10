import Sidebar from './Sidebar';

export default function AppLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        {/* Padding yang lebih bersahabat untuk layar kecil */}
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fadeIn">
          {children}
        </div>
      </main>
    </div>
  );
}