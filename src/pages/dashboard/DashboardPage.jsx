// src/pages/dashboard/DashboardPage.jsx

import { useEffect, useState } from "react";
import { dashboardAPI } from "../../api/services";
import { PageLoader, ProgressBar } from "../../components/ui";
import { extractError } from "../../utils/helpers";
import { useAuth } from "../../context/useAuth";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Home,
  FolderKanban,
  CheckCircle,
  Clock,
  TrendingUp,
  Ticket,
  DollarSign,
  MessageCircle,
} from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

// Chart colors
const COLORS = ["#10b981", "#f59e0b", "#64748b", "#3b82f6"];

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        let response;
        if (user?.role === "customer_service") {
          response = await dashboardAPI.customerService();
        } else if (user?.role === "admin" || user?.role === "super_admin") {
          response = await dashboardAPI.admin();
        } else {
          throw new Error("Role tidak memiliki akses dashboard");
        }

        // Menangani struktur dari backend: { success: true, data: { ... } }
        // axios mengembalikan response.data, jadi datanya ada di response.data (jika belum di-intercept)
        const payload = response?.data?.data || response?.data || response;
        setStats(payload || {});
      } catch (err) {
        setError(extractError(err));
      } finally {
        setLoading(false);
      }
    };

    if (user?.role) {
      fetchDashboard();
    }
  }, [user?.role]);

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="text-rose-500 text-sm font-medium p-4 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
        {error}
      </div>
    );
  }

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(number || 0);
  };

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  // ==========================================
  // SETUP DATA UNTUK ADMIN / SUPER ADMIN
  // ==========================================
  const totalUnits = Number(stats?.total_units || 0);
  const unitsSold = Number(stats?.units_sold || 0);
  const availableUnits = totalUnits - unitsSold;

  const adminStatCards = [
    {
      label: "Total Proyek",
      value: Number(stats?.total_projects || 0).toLocaleString("id-ID"),
      icon: FolderKanban,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
    },
    {
      label: "Total Unit",
      value: totalUnits.toLocaleString("id-ID"),
      icon: Home,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-500/10",
    },
    {
      label: "Tiket Terbuka",
      value: Number(stats?.open_tickets || 0).toLocaleString("id-ID"),
      icon: Ticket,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-500/10",
    },
    {
      label: "Total Revenue",
      value: formatRupiah(stats?.total_revenue),
      icon: DollarSign,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-500/10",
      isCurrency: true,
    },
  ];

  const adminUnitData = [
    { name: "Terjual", value: unitsSold },
    { name: "Tersedia", value: availableUnits > 0 ? availableUnits : 0 },
  ];

  // ==========================================
  // SETUP DATA UNTUK CUSTOMER SERVICE
  // ==========================================
  const csStatCards = [
    {
      label: "Tiket Terbuka",
      value: Number(stats?.open_tickets || 0).toLocaleString("id-ID"),
      icon: Ticket,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-500/10",
    },
    {
      label: "Pending Respons",
      value: Number(stats?.pending_responses || 0).toLocaleString("id-ID"),
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-500/10",
    },
    {
      label: "WA Terkirim Hari Ini",
      value: Number(stats?.wa_sent_today || 0).toLocaleString("id-ID"),
      icon: MessageCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
    },
  ];

  const csTicketData = [
    { name: "Open", value: Number(stats?.open_tickets || 0) },
    { name: "In Progress", value: Number(stats?.pending_responses || 0) },
  ];

  // Pilihan kartu dan data chart tergantung role aktif
  const currentCards = isAdmin ? adminStatCards : csStatCards;
  const pieData = isAdmin ? adminUnitData : csTicketData;

  const tooltipStyle = {
    background: theme === "dark" ? "#1e293b" : "#ffffff",
    border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
    borderRadius: "12px",
    color: theme === "dark" ? "#f8fafc" : "#0f172a",
    fontSize: "13px",
    boxShadow:
      "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Dashboard Overview
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Selamat datang kembali,{" "}
          <span className="font-semibold">
            {user?.name || user?.nama || user?.email}
          </span>
        </p>
      </div>

      {/* STAT CARDS */}
      <div className={`grid gap-4 md:gap-6 ${isAdmin ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
        {currentCards.map((s) => (
          <div key={s.label} className="card p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center`}
              >
                <s.icon className={`w-6 h-6 ${s.color}`} strokeWidth={2.5} />
              </div>
            </div>

            <div>
              <div className={`font-bold text-slate-900 dark:text-white mb-1 tracking-tight ${s.isCurrency ? 'text-xl md:text-2xl' : 'text-3xl'}`}>
                {s.value}
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* PIE CHART */}
        <div className="card p-6 flex flex-col">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6">
            {isAdmin ? "Status Penjualan Unit" : "Status Tiket Bantuan"}
          </h3>

          {pieData.every(d => d.value === 0) ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Belum ada data tersedia
            </div>
          ) : (
            <div className="h-60 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    dataKey="value"
                    paddingAngle={4}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    {entry.name}: <span className="font-semibold">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PROGRESS OVERVIEW */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAdmin ? "Progress Penjualan" : "Penyelesaian Kendala"}
            </h3>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <TrendingUp className="w-4 h-4 text-slate-500" />
            </div>
          </div>

          <div className="flex flex-col gap-6 justify-center h-full pb-8">
            {isAdmin ? (
              <div className="text-center p-6 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 rounded-full mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {unitsSold} / {totalUnits}
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1 mb-4">
                  Unit Terjual
                </div>
                <ProgressBar
                  value={totalUnits ? (unitsSold / totalUnits) * 100 : 0}
                  className="!bg-slate-200 dark:!bg-slate-700"
                />
              </div>
            ) : (
              <div className="text-center p-6 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                 <div className="flex items-center justify-center w-12 h-12 bg-amber-100 dark:bg-amber-500/10 rounded-full mx-auto mb-3">
                  <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                   {stats?.pending_responses || 0}
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1 mb-4">
                  Tiket Menunggu Respons
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}