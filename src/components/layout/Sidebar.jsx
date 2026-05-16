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
} from "lucide-react";

import { useState, useEffect } from "react";
import logo from "../../assets/podorukun-logo.png";

const navItems = [
  {
    to: "/",
    icon: LayoutDashboard,
    label: "Dashboard",
    roles: ["super_admin", "admin"],
    match: ["/"],
  },
  {
    to: "/companies",
    icon: Building2,
    label: "Perusahaan",
    roles: ["super_admin"],
    match: ["/companies"],
  },
  {
    to: "/projects",
    icon: FolderKanban,
    label: "Proyek",
    roles: ["super_admin", "admin"],
    match: ["/projects"],
  },
];

const settingsItems = [
  {
    to: "/users",
    icon: Users,
    label: "Pengguna",
    roles: ["super_admin", "admin"],
    match: ["/users"],
  },
];

export default function Sidebar() {
  const { logout, isRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // FIX #5: Kunci scroll body saat sidebar mobile terbuka
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const visibleNavItems = navItems.filter((item) => isRole(...item.roles));
  const visibleSettingsItems = settingsItems.filter((item) =>
    isRole(...item.roles),
  );

  const isItemActive = (item) =>
    item.match.some((path) =>
      path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(path),
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
          className={`podorukun-sidebar-link ${
            active ? "podorukun-sidebar-link-active" : ""
          }`}
        >
          <item.icon
            className="h-[18px] w-[18px] shrink-0"
            strokeWidth={active ? 2.6 : 2.2}
          />
          <span>{item.label}</span>
        </NavLink>
      );
    });

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-white">
      {/* HEADER */}
      <div className="flex items-start justify-between px-[34px] pb-9 pt-7">
        <div>
          <h1 className="text-[17px] font-semibold leading-6 text-[#c9151b]">
            Podorukun Group
          </h1>
          <p className="mt-0.5 text-[15px] font-medium leading-5 text-[#c9151b]">
            Monitoring Sistem
          </p>
        </div>
        <img
          src={logo}
          alt="Podorukun Logo"
          className="h-[36px] w-[36px] object-contain"
        />
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 overflow-y-auto pb-6">
        <div className="mb-8">
          <p className="podorukun-sidebar-section">Menu</p>
          <div className="mt-5 space-y-3">
            {renderNavItems(visibleNavItems)}
          </div>
        </div>
        <div>
          <p className="podorukun-sidebar-section">Pengaturan</p>
          <div className="mt-5 space-y-3">
            {renderNavItems(visibleSettingsItems)}
          </div>
        </div>
      </nav>

      {/* LOGOUT */}
      <button onClick={handleLogout} className="podorukun-logout">
        <span>Keluar</span>
        <span className="podorukun-logout-icon">
          <LogOut className="h-5 w-5" strokeWidth={2.3} />
        </span>
      </button>
    </div>
  );

  return (
    <>
      {/*
       * FIX #2 & #3: Mobile Topbar yang proper
       * - Posisi tombol hamburger di KIRI atas (konsisten dengan sidebar yang muncul dari kiri)
       * - Ada konteks visual berupa nama app di topbar
       * - Hanya muncul di mobile (lg:hidden)
       */}
      <header className="fixed left-0 right-0 top-0 z-[60] flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <div className="flex items-center gap-2">
          <img
            src={logo}
            alt="Podorukun Logo"
            className="h-7 w-7 object-contain"
          />
          <span className="text-[15px] font-semibold text-[#c9151b]">
            Podorukun Group
          </span>
        </div>

        {/* Tombol hamburger di KANAN */}
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
          aria-controls="mobile-sidebar"
          className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100"
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
      {/* Sidebar mobile muncul dari KANAN */}
      <aside
        id="mobile-sidebar"
        role="navigation"
        aria-label="Menu navigasi"
        className={`fixed right-0 top-0 z-500 h-full w-[290px] transform overflow-hidden bg-white shadow-2xl shadow-slate-950/10 transition-transform duration-300 ease-in-out lg:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {renderSidebarContent()}
      </aside>

      {/* DESKTOP SIDEBAR */}
      <aside
        role="navigation"
        aria-label="Menu navigasi"
        className="podorukun-sidebar-shadow sticky top-0 hidden h-screen w-[290px] shrink-0 overflow-hidden bg-white lg:flex lg:flex-col"
      >
        {renderSidebarContent()}
      </aside>
    </>
  );
}