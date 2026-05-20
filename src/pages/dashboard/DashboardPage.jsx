import { useEffect, useState } from "react";
import { dashboardAPI } from "../../api/services";
import { DashboardSkeleton } from "../../components/ui";
import { extractError, formatCurrency } from "../../utils/helpers";
import { useAuth } from "../../context/AuthContext";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Home,
  FolderKanban,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

const COLORS = ["#10b981", "#3b82f6", "#94a3b8"]; // Selesai, Dalam Pembangunan, Belum Mulai
const BAR_COLORS = ["#3b82f6", "#10b981", "#f59e0b"]; // Aktif, Selesai, On Hold

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        {error}
      </div>
    );

  const unitData = stats
    ? [
        { name: "Selesai", value: stats.units.selesai },
        { name: "Dalam Pembangunan", value: stats.units.dalam_pembangunan },
        { name: "Belum Mulai", value: stats.units.belum_mulai },
      ]
    : [];

  const projectData = stats
    ? [
        { name: "Aktif", value: stats.projects.active },
        { name: "Selesai", value: stats.projects.completed },
        { name: "On Hold", value: stats.projects.on_hold },
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
    },
    {
      label: "Unit Terjual",
      value: (stats?.assignments?.active ?? 0).toLocaleString(),
      icon: Home,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-500/10",
      sub: `dari ${stats?.units?.total ?? 0} total unit tersedia`,
    },
    {
      label: "Proyek Aktif",
      value: (stats?.projects?.active ?? 0).toLocaleString(),
      icon: FolderKanban,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-500/10",
      sub: `dari ${stats?.projects?.total ?? 0} total proyek`,
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
          <div key={s.label} className="card-hover p-6 flex flex-col justify-between border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 rounded-2xl relative overflow-hidden group">
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
      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* Status Unit Pie */}
        <div className="card p-6 flex flex-col border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 rounded-2xl">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Distribusi Pembangunan Unit
            </h3>
            <p className="text-sm text-slate-500 mt-1">Total {stats?.units?.total ?? 0} unit terdaftar</p>
          </div>
          
          <div className="h-64 flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={unitData}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={105}
                  dataKey="value"
                  paddingAngle={5}
                >
                  {unitData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "inherit" }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{stats?.units?.selesai ?? 0}</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Selesai</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-5 mt-6 pt-5 border-t border-slate-50 dark:border-slate-800/50">
            {unitData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ background: COLORS[i] }} />
                <span>{d.name}: <strong className="text-slate-900 dark:text-slate-200">{d.value}</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Proyek Bar */}
        <div className="card p-6 flex flex-col border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 rounded-2xl">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Status Proyek
            </h3>
            <p className="text-sm text-slate-500 mt-1">Total {stats?.projects?.total ?? 0} proyek</p>
          </div>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === "dark" ? "#1e293b" : "#f1f5f9"} />
                <XAxis dataKey="name" tick={{ fill: theme === "dark" ? "#94a3b8" : "#64748b", fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: theme === "dark" ? "#94a3b8" : "#64748b", fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip cursor={{ fill: theme === "dark" ? "#1e293b" : "#f8fafc", opacity: 0.8 }} contentStyle={tooltipStyle} itemStyle={{ color: "inherit" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {projectData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
