import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { dashboardAPI } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import { PageLoader } from "../../components/ui";
import { extractError, formatCurrency, formatDate } from "../../utils/helpers";
import { ArrowLeft, TrendingUp, Wallet, Landmark, Home, Users, Search } from "lucide-react";

const metricConfig = {
  revenue: {
    title: "Detail Nilai Penjualan",
    desc: "Daftar seluruh unit aktif beserta nilai transaksinya.",
    icon: TrendingUp,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
  "cash-in": {
    title: "Detail Kas Masuk",
    desc: "Daftar unit yang telah melakukan pembayaran dan tervalidasi.",
    icon: Wallet,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  piutang: {
    title: "Detail Piutang",
    desc: "Daftar unit dengan sisa tagihan atau KPR yang belum cair.",
    icon: Landmark,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
  },
  occupancy: {
    title: "Detail Okupansi Unit",
    desc: "Daftar seluruh unit beserta status penjualan dan pembangunannya.",
    icon: Home,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-500/10",
  },
  customers: {
    title: "Analitik Data Customer",
    desc: "Rincian pelanggan yang telah melakukan transaksi pembelian unit.",
    icon: Users,
    color: "text-fuchsia-600 dark:text-fuchsia-400",
    bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10",
  },
};

export default function AnalyticsDrilldownPage() {
  const { metric } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get("companyId");
  const { isRole } = useAuth();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipePembayaran, setFilterTipePembayaran] = useState("");
  const [filterStatusPembangunan, setFilterStatusPembangunan] = useState("");
  const [filterStatusPenjualan, setFilterStatusPenjualan] = useState("");

  useEffect(() => {
    if (!metricConfig[metric]) {
      navigate("/");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const params = companyId ? { companyId } : {};
        const res = await dashboardAPI.drilldown(params);
        
        const allData = res.data.data;
        
        let targetData = [];
        if (metric === "revenue") targetData = allData.revenue;
        else if (metric === "cash-in") targetData = allData.cash_in;
        else if (metric === "piutang") targetData = allData.piutang;
        else if (metric === "occupancy") targetData = allData.occupancy;
        else if (metric === "customers") targetData = allData.customers;
        
        setData(targetData || []);
      } catch (err) {
        setError(extractError(err));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [metric, companyId, navigate, isRole]);

  const cfg = metricConfig[metric];

  const filteredData = data.filter(row => {
    let searchMatch = true;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (metric === "customers") {
        searchMatch = 
          (row.customer_name || "").toLowerCase().includes(term) ||
          (row.company_name || "").toLowerCase().includes(term);
      } else {
        searchMatch = 
          (row.nomor_unit || "").toLowerCase().includes(term) ||
          (row.customer_name || "").toLowerCase().includes(term) ||
          (row.nama_proyek || "").toLowerCase().includes(term);
      }
    }
    
    let typeMatch = true;
    let buildMatch = true;
    let soldMatch = true;
    
    if (filterTipePembayaran && metric !== 'occupancy' && metric !== 'customers') {
      typeMatch = row.tipe_pembayaran === filterTipePembayaran;
    }
    if (filterStatusPembangunan && metric === 'occupancy') {
      buildMatch = row.status_pembangunan === filterStatusPembangunan;
    }
    if (filterStatusPenjualan && metric === 'occupancy') {
      const isSoldStr = row.is_sold ? 'terjual' : 'tersedia';
      soldMatch = isSoldStr === filterStatusPenjualan;
    }
    
    return searchMatch && typeMatch && buildMatch && soldMatch;
  });

  const formatTipePembayaran = (tipe) => {
    if (!tipe) return "-";
    return tipe.replace("_", " ").toUpperCase();
  };

  const summaryTotal = filteredData.reduce((acc, row) => {
    if (metric === "revenue") return acc + Number(row.harga_total || 0);
    if (metric === "cash-in") return acc + Number(row.effective_cash_in || 0);
    if (metric === "piutang") return acc + Number(row.effective_piutang || 0);
    if (metric === "customers") return acc + Number(row.total_transaction_value || 0);
    return acc;
  }, 0);

  const summaryPiutang = filteredData.reduce((acc, row) => {
    if (metric === "customers") return acc + Number(row.total_piutang || 0);
    return acc;
  }, 0);

  if (loading) return <PageLoader />;
  if (error) return <div className="text-rose-500 p-4 bg-rose-50 rounded-xl">{error}</div>;
  if (!cfg) return null;

  const Icon = cfg.icon;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center shadow-sm`}>
              <Icon className={`w-5 h-5 ${cfg.color}`} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {cfg.title}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {cfg.desc}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metric === 'occupancy' ? (
          <>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Unit</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{filteredData.length}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center border-l-4 border-l-indigo-500">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Unit Terjual</div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{filteredData.filter(d => d.is_sold).length}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center border-l-4 border-l-emerald-500">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Belum Terjual</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{filteredData.filter(d => !d.is_sold).length}</div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">{metric === 'customers' ? 'Total Pelanggan' : 'Total Data'}</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{filteredData.length}</div>
            </div>
            <div className={`col-span-1 ${metric === 'customers' ? 'md:col-span-1' : 'md:col-span-2'} bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center border-l-4 ${cfg.color.includes('emerald') ? 'border-l-emerald-500' : cfg.color.includes('amber') ? 'border-l-amber-500' : cfg.color.includes('fuchsia') ? 'border-l-fuchsia-500' : 'border-l-blue-500'}`}>
              <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Nominal</div>
              <div className={`text-2xl font-bold ${cfg.color}`}>{formatCurrency(summaryTotal)}</div>
            </div>
            {metric === 'customers' && (
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center border-l-4 border-l-rose-500">
                <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Sisa Tagihan</div>
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(summaryPiutang)}</div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder={metric === 'customers' ? "Cari customer atau perusahaan..." : "Cari unit, customer, atau proyek..."} 
            className="input pl-9 w-full"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {['revenue', 'cash-in', 'piutang'].includes(metric) && (
            <select 
              className="input text-sm w-full sm:w-48"
              value={filterTipePembayaran}
              onChange={e => setFilterTipePembayaran(e.target.value)}
            >
              <option value="">Semua Pembayaran</option>
              <option value="cash_lunas">Cash Keras / Lunas</option>
              <option value="cash_cicil">Cash Bertahap (In-House)</option>
              <option value="kredit_kpr">Kredit KPR</option>
            </select>
          )}

          {metric === 'occupancy' && (
            <>
              <select 
                className="input text-sm w-full sm:w-48"
                value={filterStatusPembangunan}
                onChange={e => setFilterStatusPembangunan(e.target.value)}
              >
                <option value="">Semua Status Bangunan</option>
                <option value="selesai">Selesai</option>
                <option value="dalam_pembangunan">Dalam Pembangunan</option>
                <option value="belum_mulai">Belum Mulai</option>
              </select>
              <select 
                className="input text-sm w-full sm:w-40"
                value={filterStatusPenjualan}
                onChange={e => setFilterStatusPenjualan(e.target.value)}
              >
                <option value="">Status Penjualan</option>
                <option value="terjual">Terjual</option>
                <option value="tersedia">Belum Terjual</option>
              </select>
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/80">
              {metric === 'customers' ? (
                <tr>
                  <th className="px-5 py-4 font-semibold">Nama Customer</th>
                  <th className="px-5 py-4 font-semibold text-center">Unit Dibeli</th>
                  <th className="px-5 py-4 font-semibold">Perusahaan</th>
                  <th className="px-5 py-4 font-semibold text-right">Total Transaksi</th>
                  <th className="px-5 py-4 font-semibold text-right">Sisa Tagihan</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-5 py-4 font-semibold">Unit & Proyek</th>
                  <th className="px-5 py-4 font-semibold">Customer</th>
                  {metric !== 'occupancy' && <th className="px-5 py-4 font-semibold">Metode</th>}
                  {metric === 'revenue' && <th className="px-5 py-4 font-semibold text-right">Nilai Transaksi</th>}
                  {metric === 'cash-in' && <th className="px-5 py-4 font-semibold text-right">Kas Masuk (Valid)</th>}
                  {metric === 'piutang' && <th className="px-5 py-4 font-semibold text-right">Sisa Piutang</th>}
                  {metric === 'occupancy' && <th className="px-5 py-4 font-semibold">Status Pembangunan</th>}
                  {metric === 'occupancy' && <th className="px-5 py-4 font-semibold">Status Penjualan</th>}
                  <th className="px-5 py-4 font-semibold text-right">Aksi</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredData.map((row, i) => {
                if (metric === 'customers') {
                  const isLunas = Number(row.total_piutang) <= 0;
                  return (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                        {row.customer_name}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold">
                          {row.total_units_bought} Unit
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded text-xs font-semibold">
                          {row.company_name}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-slate-600 dark:text-slate-400">
                        {formatCurrency(row.total_transaction_value)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isLunas ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded font-bold text-sm">
                            LUNAS
                          </span>
                        ) : (
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            {formatCurrency(row.total_piutang)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                }
                
                return (
                  <tr 
                    key={i} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/projects/${row.project_id}/clusters/${row.cluster_id}/units/${row.unit_id}`)}
                  >
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {row.nomor_unit}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                        {row.nama_proyek} - {row.nama_cluster}
                      </div>
                      {isRole("owner", "super_admin") && (
                        <div className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 mt-0.5">
                          {row.company_name}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-700 dark:text-slate-200">
                        {row.customer_name || <span className="text-slate-400 dark:text-slate-500 italic">Belum ada</span>}
                      </div>
                      {row.tanggal_pembelian && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          Sejak: {formatDate(row.tanggal_pembelian)}
                        </div>
                      )}
                    </td>
                    
                    {metric !== 'occupancy' && (
                      <td className="px-5 py-4">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-bold whitespace-nowrap">
                          {formatTipePembayaran(row.tipe_pembayaran)}
                        </span>
                      </td>
                    )}

                    {metric === 'revenue' && (
                      <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(row.harga_total)}
                      </td>
                    )}
                    {metric === 'cash-in' && (
                      <td className="px-5 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.effective_cash_in)}
                      </td>
                    )}
                    {metric === 'piutang' && (
                      <td className="px-5 py-4 text-right font-bold text-amber-600 dark:text-amber-400">
                        {formatCurrency(row.effective_piutang)}
                      </td>
                    )}
                    
                    {metric === 'occupancy' && (
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                          row.status_pembangunan === 'selesai' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                          row.status_pembangunan === 'dalam_pembangunan' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {row.status_pembangunan.replace("_", " ").toUpperCase()}
                        </span>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                          Progress: {row.progress_percentage}%
                        </div>
                      </td>
                    )}
                    
                    {metric === 'occupancy' && (
                      <td className="px-5 py-4">
                        {row.is_sold ? (
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 rounded text-xs font-bold whitespace-nowrap">
                            TERJUAL
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded text-xs font-bold whitespace-nowrap">
                            BELUM TERJUAL
                          </span>
                        )}
                      </td>
                    )}
                    
                    <td className="px-5 py-4 text-right">
                      <button className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                        Detail ➔
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredData.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                    Tidak ada data yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
