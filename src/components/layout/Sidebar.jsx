import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  Users,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Image as ImageIcon
} from "lucide-react";

import { useState, useEffect } from "react";
import logo from "../../assets/podorukun-logo.png";
import { useTheme } from "../../hooks/useTheme";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", roles: ["super_admin", "owner", "admin", "direksi"], match: ["/"] },
  { to: "/companies", icon: Building2, label: "Perusahaan", roles: ["super_admin", "owner"], match: ["/companies"] },
  { to: "/banners", icon: ImageIcon, label: "Banner Iklan", roles: ["super_admin"], match: ["/banners"] },
  { to: "/projects", icon: FolderKanban, label: "Proyek", roles: ["super_admin", "owner", "admin", "direksi"], match: ["/projects"] },
];

const settingsItems = [
  { to: "/users", icon: Users, label: "Pengguna", roles: ["super_admin", "owner", "admin", "direksi"], match: ["/users"] },
];

export default function Sidebar() {
  const { user, logout, isRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Determine visible items based on role
  let visibleItems = [];
  if (isRole('owner', 'direksi')) {
    // Owner & Direksi: only Dashboard and Proyek
    visibleItems = navItems.filter(item =>
      ['/', '/projects'].includes(item.to) && isRole(...item.roles)
    );
  } else if (isRole('super_admin')) {
    // Super Admin: Dashboard, Perusahaan, Banner Iklan, Pengguna
    visibleItems = [
      ...navItems.filter(item =>
        ['/', '/companies', '/banners'].includes(item.to) && isRole(...item.roles)
      ),
      ...settingsItems.filter(item => isRole(...item.roles))
    ];
  } else if (isRole('admin')) {
    // Admin: Dashboard, Proyek & Pengguna
    visibleItems = [
      ...navItems.filter(item => ['/', '/projects'].includes(item.to) && isRole(...item.roles)),
      ...settingsItems.filter(item => isRole(...item.roles))
    ];
  }

  const isItemActive = (item) =>
    item.match.some((path) =>
      path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)
    );

  const renderNavItems = (items) =>
    items.map((item) => {
      const active = isItemActive(item);
      return (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={() => setOpen(false)}
          className={`podorukun-sidebar-link ${active ? "podorukun-sidebar-link-active" : ""}`}
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.6 : 2.2} />
          <span>{item.label}</span>
        </NavLink>
      );
    });

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900 transition-colors duration-500">
      {/* HEADER */}
      <div className="flex items-start justify-between px-[34px] pb-9 pt-7">
        <div className="flex-1 min-w-0 pr-2">
          <h1 className="text-[17px] font-semibold leading-6 truncate transition-colors" style={{ color: 'var(--color-primary, #c9151b)' }}>
            {user?.company?.name || "Podorukun Group"}
          </h1>
          <p className="mt-0.5 text-[15px] font-medium leading-5 truncate opacity-90 transition-colors" style={{ color: 'var(--color-primary, #c9151b)' }}>
            Monitoring Sistem
          </p>
        </div>
        <img src={user?.company?.logoUrl || logo} alt="Company Logo" className="h-[36px] w-[36px] object-contain shrink-0" />
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 overflow-y-auto pb-6">
        <div className="mb-8">
          <p className="podorukun-sidebar-section">Menu</p>
          <div className="mt-5 space-y-3">{renderNavItems(visibleItems)}</div>
        </div>
      </nav>

      {/* DARK MODE TOGGLE */}
      <button onClick={toggleTheme} className="podorukun-sidebar-link mt-auto mb-3 relative overflow-hidden group">
        <span className="absolute inset-0 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 opacity-0 group-hover:opacity-20 transition-opacity duration-500"/>
        {theme === "light" ? (
          <>
            <Moon className="h-[18px] w-[18px] transform transition-transform duration-500 group-hover:rotate-180" strokeWidth={2.2} />
            <span className="transition-colors duration-500 group-hover:text-pink-600">Dark Mode</span>
          </>
        ) : (
          <>
            <Sun className="h-[18px] w-[18px] transform transition-transform duration-500 group-hover:scale-125 group-hover:rotate-90" strokeWidth={2.2} />
            <span className="transition-colors duration-500 group-hover:text-yellow-400">Light Mode</span>
          </>
        )}
      </button>

      {/* LOGOUT */}
      <button onClick={handleLogout} className="podorukun-logout">
        <span>Keluar</span>
        <span className="podorukun-logout-icon"><LogOut className="h-5 w-5" strokeWidth={2.3} /></span>
      </button>
    </div>
  );

  return (
    <>
      {/* MOBILE TOPBAR */}
      <header className="fixed left-0 right-0 top-0 z-[60] flex h-14 items-center justify-between border-b border-slate-200 bg-white dark:bg-slate-900 px-4 shadow-sm lg:hidden transition-colors duration-500">
        <div className="flex items-center gap-2 min-w-0">
          <img src={user?.company?.logoUrl || logo} alt="Company Logo" className="h-7 w-7 object-contain shrink-0" />
          <span className="text-[15px] font-semibold truncate transition-colors" style={{ color: 'var(--color-primary, #c9151b)' }}>
            {user?.company?.name || "Podorukun Group"}
          </span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
          aria-controls="mobile-sidebar"
          className="rounded-lg p-1.5 text-slate-600 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* OVERLAY */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* MOBILE SIDEBAR */}
      <aside
        id="mobile-sidebar"
        role="navigation"
        aria-label="Menu navigasi"
        className={`fixed right-0 top-0 pt-[55px] z-50 h-full w-[290px] transform overflow-hidden bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {renderSidebarContent()}
      </aside>

      {/* DESKTOP SIDEBAR */}
      <aside
        role="navigation"
        aria-label="Menu navigasi"
        className="podorukun-sidebar-shadow sticky top-0 hidden h-screen w-[290px] shrink-0 overflow-hidden bg-white dark:bg-slate-900 lg:flex lg:flex-col transition-colors duration-500"
      >
        {renderSidebarContent()}
      </aside>
    </>
  );
}
