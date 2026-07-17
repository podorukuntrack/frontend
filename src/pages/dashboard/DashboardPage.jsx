import { useEffect, useState } from "react";
import { dashboardAPI } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import ExecutiveDashboard from "./components/ExecutiveDashboard";
import { DashboardSkeleton } from "../../components/ui";
import { extractError, formatCurrency } from "../../utils/helpers";
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
  Wallet,
} from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

import { useNavigate } from "react-router-dom";

const COLORS = ["#10b981", "#3b82f6", "#94a3b8"]; // Selesai, Dalam Pembangunan, Belum Mulai

export default function DashboardPage() {
  const { theme } = useTheme();
  const { isRole } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  if (isRole('direksi', 'owner', 'super_admin', 'admin')) {
    return <ExecutiveDashboard />;
  }

  useEffect(() => {
    dashboardAPI
      .stats()
      .then((res) => setStats(res.data.data))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error)
    return (
      <div className="text-rose-500 text-sm font-medium p-4 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-900/50">
        {typeof error === 'object' ? (error.description || error.title) : error}
      </div>
    );

  const unitData = stats
    ? [
        { name: "Selesai", value: stats.units.selesai },
        { name: "Dalam Pembangunan", value: stats.units.dalam_pembangunan },
        { name: "Belum Mulai", value: stats.units.belum_mulai },
      ]
    : [];

  const statCards = [
    {
      label: "Total Pendapatan",
      value: formatCurrency(stats?.financial?.total_revenue ?? 0),
      icon: Wallet,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      sub: `+ ${formatCurrency(stats?.financial?.revenue_this_month ?? 0)} bulan ini`,
      metricPath: "revenue",
    },
    {
      label: "Unit Terjual",
      value: (stats?.assignments?.active ?? 0).toLocaleString(),
      icon: Home,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-500/10",
      sub: `dari ${stats?.units?.total ?? 0} total unit tersedia`,
      metricPath: "occupancy",
    },
    {
      label: "Proyek Aktif",
      value: (stats?.projects?.active ?? 0).toLocaleString(),
      icon: FolderKanban,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-500/10",
      sub: `dari ${stats?.projects?.total ?? 0} total proyek`,
      path: "/projects",
    },
  ];

  const tooltipStyle = {
    background: theme === "dark" ? "#1e293b" : "#ffffff",
    border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
    borderRadius: "12px",
    color: theme === "dark" ? "#f8fafc" : "#0f172a",
    fontSize: "13px",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Dashboard Analitik
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Ringkasan performa operasional dan finansial perusahaan.
        </p>
      </div>

      {/* BENTO STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {statCards.map((s) => (
          <div 
            key={s.label} 
            onClick={() => {
              if (s.metricPath) navigate(`/analytics/${s.metricPath}`);
              else if (s.path) navigate(s.path);
            }}
            className="card-hover p-6 flex flex-col justify-between border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 rounded-2xl relative overflow-hidden group cursor-pointer"
          >
            {/* Dekorasi Background */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${s.bg} opacity-50 group-hover:scale-[2] transition-transform duration-700 ease-out`} />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center shadow-sm`}>
                  <s.icon className={`w-6 h-6 ${s.color}`} strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
                  {s.value}
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                  {s.label}
                </div>
              </div>
              <div className={`text-[11px] mt-4 font-bold uppercase tracking-wider ${s.color}`}>
                {s.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div className="w-full">
        {/* Status Unit Pie */}
        <div className="card p-6 md:p-8 flex flex-col border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 rounded-2xl">
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg lg:text-xl">
                Distribusi Pembangunan Unit
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Visualisasi status seluruh unit dari total {stats?.units?.total ?? 0} unit yang terdaftar.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center w-full gap-4 md:gap-8 mt-2">
            <div className="h-[260px] md:h-[320px] relative w-full md:w-3/5 lg:w-2/3 flex-shrink-0">
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie
                    data={unitData}
                    cx="50%"
                    cy="50%"
                    innerRadius={90}
                    outerRadius={125}
                    dataKey="value"
                    paddingAngle={4}
                    stroke="none"
                  >
                    {unitData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "inherit" }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter">
                  {stats?.units?.selesai ?? 0}
                </span>
                <span className="text-xs md:text-sm font-bold text-emerald-500 uppercase tracking-widest mt-1 md:mt-2">
                  Unit Selesai
                </span>
              </div>
            </div>
            
            <div className="flex flex-row md:flex-col flex-wrap justify-center md:justify-start w-full md:w-2/5 lg:w-1/3 gap-5 md:gap-6 pt-6 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800/50 md:pl-6 lg:pl-10">
              {unitData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-3 font-medium">
                  <div className="w-4 h-4 rounded-full shadow-sm flex-shrink-0" style={{ background: COLORS[i] }} />
                  <div className="flex flex-row items-center gap-1.5 whitespace-nowrap">
                    <span className="text-sm lg:text-base text-slate-600 dark:text-slate-400">{d.name}:</span>
                    <strong className="text-slate-900 dark:text-white text-lg lg:text-xl font-bold">{d.value}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
