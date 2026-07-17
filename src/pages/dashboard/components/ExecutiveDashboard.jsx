import { useEffect, useState } from "react";
import { dashboardAPI, companiesAPI } from "../../../api/services";
import { DashboardSkeleton } from "../../../components/ui";
import { extractError, formatCurrency } from "../../../utils/helpers";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  Landmark,
  Home,
  Building2,
  Users,
  CalendarRange,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { id } from "date-fns/locale";
import { useTheme } from "../../../hooks/useTheme";

const COLORS = ["var(--color-primary, #3b82f6)", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];

export default function ExecutiveDashboard() {
  const { theme } = useTheme();
  const { isRole } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [companies, setCompanies] = useState([]);
  
  // Persist state in sessionStorage
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => sessionStorage.getItem("exec_companyId") || "");
  const [startDate, setStartDate] = useState(() => sessionStorage.getItem("exec_startDate") || "");
  const [endDate, setEndDate] = useState(() => sessionStorage.getItem("exec_endDate") || "");
  const [hoverDate, setHoverDate] = useState(null);

  useEffect(() => {
    sessionStorage.setItem("exec_companyId", selectedCompanyId);
  }, [selectedCompanyId]);

  useEffect(() => {
    sessionStorage.setItem("exec_startDate", startDate);
    sessionStorage.setItem("exec_endDate", endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    if (isRole("owner", "super_admin")) {
      companiesAPI.list()
        .then(res => setCompanies(res.data.data))
        .catch(console.error);
    }
  }, [isRole]);

  useEffect(() => {
    // Prevent fetching if only one date is selected in the range picker
    if ((startDate && !endDate) || (!startDate && endDate)) return;

    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const params = {};
        if (selectedCompanyId) params.companyId = selectedCompanyId;
        if (startDate && endDate) {
          params.startDate = startDate;
          params.endDate = endDate;
        }

        const res = await dashboardAPI.executive(params);
        setStats(res.data.data);
        setError("");
      } catch (err) {
        setError(extractError(err));
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboard();
  }, [selectedCompanyId, startDate, endDate, isRole]);

  if (loading) return <DashboardSkeleton />;
  if (error)
    return (
      <div className="text-rose-500 text-sm font-medium p-4 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-900/50">
        {typeof error === 'object' ? (error.description || error.title) : error}
      </div>
    );

  const paymentData = (stats?.payment_methods || []).map((m) => ({
    name: m.method.replace("_", " ").toUpperCase(),
    value: parseInt(m.count, 10),
  }));

  const financeCards = [
    {
      label: "Kas Masuk",
      value: formatCurrency(stats?.finance?.total_cash_in ?? 0),
      icon: Wallet,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-slate-800",
      borderColor: "border-emerald-100 dark:border-slate-700",
      sub: "Pembayaran terverifikasi",
      metricPath: "cash-in",
    },
    {
      label: "Total yang Belum Dibayar",
      value: formatCurrency(stats?.finance?.total_piutang ?? 0),
      icon: Landmark,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-slate-800",
      borderColor: "border-rose-100 dark:border-slate-700",
      sub: "Sisa tagihan berjalan",
      metricPath: "piutang",
    }
  ];

  const opsCards = [
    {
      label: "Tingkat Okupansi",
      value: `${stats?.sales?.units_sold ?? 0} Unit Terjual`,
      icon: Home,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-slate-800",
      borderColor: "border-indigo-100 dark:border-slate-700",
      sub: `Dari total ${stats?.sales?.total_units ?? 0} unit`,
      metricPath: "occupancy",
    },
    {
      label: "Total Customer",
      value: stats?.sales?.total_customers || 0,
      sub: "Pelanggan Unik Aktif",
      icon: Users,
      bg: "bg-fuchsia-50 dark:bg-slate-800",
      color: "text-fuchsia-600 dark:text-fuchsia-400",
      borderColor: "border-fuchsia-100 dark:border-slate-700",
      metricPath: "customers",
    },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-lg">
          <p className="font-bold text-slate-900 dark:text-white mb-2">{data.company_name}</p>
          <div className="space-y-1">
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold">
              Total Penjualan: {formatCurrency(data.total_revenue)}
            </p>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">
              Unit Terjual: {data.units_sold} Unit
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Executive Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Tinjauan strategis finansial dan penjualan.
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* DATE RANGE FILTER */}
          <div className="flex items-center bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-[42px] relative z-20">
            <CalendarRange className="w-4 h-4 text-slate-400 ml-2 absolute left-2 pointer-events-none" />
            <DatePicker
              selectsRange={true}
              startDate={startDate ? new Date(startDate) : null}
              endDate={endDate ? new Date(endDate) : null}
              onChange={(update) => {
                let [start, end] = update;
                /**
                 * BACKWARD SELECTION HACK
                 * react-datepicker in range mode struggles when a user clicks a later date first, 
                 * then clicks an earlier date (intending to form a range backward).
                 * We detect if a start date is already picked (but no end date), and if the new
                 * click is *before* the old start date, we swap them to form a valid range.
                 */
                if (start && !end && startDate && !endDate) {
                   const oldStart = new Date(startDate);
                   if (start < oldStart) {
                      end = oldStart; // Swap them
                   }
                }
                
                /**
                 * TIMEZONE OFFSET HACK
                 * When parsing the selected Date object to an ISO string, it converts to UTC.
                 * This can shift the date backward by 1 day if the user is in a timezone like UTC+7.
                 * We manually subtract the timezone offset before converting to ISO string
                 * to ensure the local date matches the YYYY-MM-DD string exactly.
                 */
                if (start) {
                  const s = new Date(start.getTime() - (start.getTimezoneOffset() * 60000));
                  setStartDate(s.toISOString().split('T')[0]);
                } else setStartDate("");
                
                if (end) {
                  const e = new Date(end.getTime() - (end.getTimezoneOffset() * 60000));
                  setEndDate(e.toISOString().split('T')[0]);
                } else setEndDate("");
              }}
              isClearable={true}
              placeholderText="Pilih rentang tanggal..."
              className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-0 outline-none w-[220px] cursor-pointer pl-8"
              locale={id}
              dateFormat="dd MMM yyyy"
              maxDate={new Date()}
              renderDayContents={(day, date) => {
                return (
                  <div 
                    onMouseEnter={() => {
                      if (startDate && !endDate) {
                        setHoverDate(date);
                      }
                    }}
                    className="w-full h-full leading-8"
                  >
                    {day}
                  </div>
                );
              }}
              dayClassName={(date) => {
                if (startDate && !endDate && hoverDate) {
                  const s = new Date(startDate);
                  s.setHours(0, 0, 0, 0);
                  const h = new Date(hoverDate);
                  h.setHours(0, 0, 0, 0);
                  const d = new Date(date);
                  d.setHours(0, 0, 0, 0);
                  
                  // Highlight backwards
                  if (h < s && d >= h && d <= s) {
                    return "react-datepicker__day--in-selecting-range"; 
                  }
                }
                return "";
              }}
            />
          </div>

          {/* COMPANY FILTER (ONLY OWNER/SUPER_ADMIN) */}
          {isRole("owner", "super_admin") && (
            <div className="flex items-center bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-[42px] relative z-20">
              <Building2 className="w-4 h-4 text-slate-400 ml-2 absolute left-2 pointer-events-none" />
              <select 
                className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-0 outline-none pr-8 cursor-pointer w-full sm:w-48 pl-8"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
              >
                <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Semua Perusahaan</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{c.nama_pt}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* DASHBOARD LAYOUT HIERARCHY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* FINANCIAL METRICS */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-slate-500" />
            <h2 className="font-bold text-slate-700 dark:text-slate-300">Kinerja Keuangan</h2>
          </div>
          
          <div 
            onClick={() => {
              const query = selectedCompanyId ? `?companyId=${selectedCompanyId}` : '';
              navigate(`/analytics/revenue${query}`);
            }}
            className="card-hover p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl relative overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-primary,#3b82f6)]" />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-2">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700">
                  <TrendingUp className="w-6 h-6 text-[var(--color-primary,#3b82f6)] dark:text-slate-300" strokeWidth={2.5} />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary,#3b82f6)] dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-1 rounded-full">
                  Total Nilai Penjualan
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {formatCurrency(stats?.finance?.total_revenue_target ?? 0)}
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                  Akumulasi nilai transaksi aktif
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {financeCards.map((s) => (
              <div 
                key={s.label} 
                onClick={() => {
                  if (s.metricPath) {
                    const queryParams = new URLSearchParams();
                    if (selectedCompanyId) queryParams.set("companyId", selectedCompanyId);
                    if (startDate) queryParams.set("startDate", startDate);
                    if (endDate) queryParams.set("endDate", endDate);
                    navigate(`/analytics/${s.metricPath}?${queryParams.toString()}`);
                  }
                }}
                className={`card-hover p-5 border ${s.borderColor} bg-white dark:bg-slate-900 rounded-2xl relative overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-all duration-300`}
              >
                <div className="relative z-10 flex items-center gap-4">
                  <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0 border ${s.borderColor}`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                      {s.label}
                    </div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                      {s.value}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* OPERATIONAL METRICS */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-slate-500" />
            <h2 className="font-bold text-slate-700 dark:text-slate-300">Data Operasional</h2>
          </div>
          
          <div className="flex flex-col gap-4 h-full">
            {opsCards.map((s) => (
              <div 
                key={s.label} 
                onClick={() => {
                  if (s.metricPath) {
                    const queryParams = new URLSearchParams();
                    if (selectedCompanyId) queryParams.set("companyId", selectedCompanyId);
                    if (startDate) queryParams.set("startDate", startDate);
                    if (endDate) queryParams.set("endDate", endDate);
                    navigate(`/analytics/${s.metricPath}?${queryParams.toString()}`);
                  }
                }}
                className={`card-hover p-6 flex-1 border ${s.borderColor} bg-white dark:bg-slate-900 rounded-2xl relative overflow-hidden group cursor-pointer flex flex-col justify-center shadow-sm hover:shadow-md transition-all duration-300`}
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                      {s.label}
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                      {s.value}
                    </div>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${s.color}`}>
                      {s.sub}
                    </div>
                  </div>
                  <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center border ${s.borderColor}`}>
                    <s.icon className={`w-6 h-6 ${s.color}`} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SALES TREND LINE CHART */}
      <div className="card p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex flex-col shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">Tren Uang Masuk (Cash In) Harian</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Berdasarkan tanggal masuknya uang di riwayat pembayaran (Status Verified).</p>
        
        <div className="w-full h-[300px]">
          {stats?.sales_trend && stats.sales_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={stats.sales_trend}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
                  }}
                  tick={{ fill: theme === 'dark' ? '#94a3b8' : '#475569', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  tickFormatter={(val) => {
                    if (val >= 1000000000) return `Rp ${(val / 1000000000).toFixed(1)} M`;
                    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(0)} Jt`;
                    return `Rp ${val}`;
                  }}
                  tick={{ fill: theme === 'dark' ? '#94a3b8' : '#475569', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <RechartsTooltip 
                  cursor={{ stroke: theme === 'dark' ? '#334155' : '#e2e8f0', strokeWidth: 2, strokeDasharray: '5 5' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const dateStr = new Date(label).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                      return (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-lg">
                          <p className="font-semibold text-slate-500 dark:text-slate-400 mb-1">{dateStr}</p>
                          <p className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                            {formatCurrency(payload[0].value)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="var(--color-primary, #3b82f6)" 
                  strokeWidth={4}
                  dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--color-primary, #3b82f6)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              Belum ada data pembayaran pada rentang tanggal ini.
            </div>
          )}
        </div>
      </div>

      {/* Multi-Tenant Leaderboard (ONLY FOR OWNER AND NO SPECIFIC FILTER) */}
      {!selectedCompanyId && isRole('owner', 'super_admin') && (
        <div className="card p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex flex-col shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Performa Perusahaan (Leaderboard)</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Peringkat performa penjualan antar perusahaan di dalam grup.</p>
          
          <div className="w-full h-[400px]">
            {stats?.leaderboard && stats.leaderboard.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.leaderboard}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="company_name" 
                    width={150}
                    tick={{ fill: theme === 'dark' ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f1f5f9' }} />
                  <Bar 
                    dataKey="total_revenue" 
                    radius={[0, 4, 4, 0]}
                    barSize={32}
                    onClick={(data) => {
                      if (data?.company_id) {
                        navigate(`/analytics/revenue?companyId=${data.company_id}`);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {stats.leaderboard.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Belum ada data penjualan perusahaan.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
