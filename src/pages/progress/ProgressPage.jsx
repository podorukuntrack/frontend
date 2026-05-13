import { useEffect, useState } from 'react';
import { progressAPI, assignmentsAPI } from '../../api/services';
import { PageLoader, EmptyState, Modal, ProgressBar, SearchInput } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { formatDate, formatCurrency, extractError } from '../../utils/helpers';
import { useAuth } from '../../context/useAuth';
import { TrendingUp, Plus, Pencil, Calendar, Receipt, Hammer, User, CheckCircle } from 'lucide-react';

const EMPTY_BUILD_FORM = { tahap: '', progress_percentage: 0, tanggal_update: '', catatan: '' };
const EMPTY_PAY_FORM   = { jumlah_bayar: '', tanggal_bayar: '', catatan: '' };

export default function ProgressPage() {
  const { isRole } = useAuth();
  const { toast }  = useToast();

  const [data,       setData]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [buildModal, setBuildModal] = useState({ open: false, mode: 'view', activeId: null, editId: null, originalPct: 0 });
  const [payModal,   setPayModal]   = useState({ open: false, mode: 'view', activeId: null, history: [], sisaTagihan: 0 });

  // Always read the freshest slice of data by ID lookup
  const activeBuildData = data.find(d => d.assignment_id === buildModal.activeId) || null;
  const activePayData   = data.find(d => d.assignment_id === payModal.activeId)   || null;

  const [buildForm, setBuildForm] = useState(EMPTY_BUILD_FORM);
  const [payForm,   setPayForm]   = useState(EMPTY_PAY_FORM);
  const [saving,    setSaving]    = useState(false);

  // ── 1. Fetch ────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      if (refreshKey === 0) setLoading(true);

      try {
        const [rAssign, rProg] = await Promise.all([
          assignmentsAPI.list({ limit: 100 }),
          progressAPI.list({ limit: 100 }),
        ]);

        if (!isMounted) return;

        const assignments     = rAssign.data?.data || [];
        const progressRecords = rProg.data?.data   || [];

        const mergedData = assignments.map(a => {
          const unitId = a.unit?.id;

          // FIX: explicitly read p.unit.id (guaranteed by the fixed backend JOIN query).
          // Also guard: skip any record where unit.id is missing/mismatched.
          const historyFisik = progressRecords
            .filter(p => {
              const pUnitId = p.unit?.id;          // set by mapProgressResponse in backend
              return pUnitId && pUnitId === unitId; // strict string-to-string UUID match
            })
            .sort((x, y) => new Date(y.tanggal_update) - new Date(x.tanggal_update));

          // Total = SUM of all incremental percentages, capped at 100
          const totalFisikPct = historyFisik.reduce(
            (acc, curr) => acc + Number(curr.progress_percentage ?? 0), 0
          );

          const isCashLunas = a.pembayaran?.tipe === 'cash_lunas';
          const payPct = isCashLunas ? 100 : Number(a.pembayaran?.persentase_dibayar ?? 0);

          return {
            assignment_id:    a.id,
            tanggal_pembelian: a.tanggal_pembelian,
            unit:             a.unit,
            customer:         a.user,
            pembayaran:       a.pembayaran,
            historyFisik,
            latestFisik:      historyFisik[0] || null,
            fisik_pct:        Math.min(totalFisikPct, 100),
            pay_pct:          Math.min(payPct, 100),
          };
        });

        setData(mergedData);
      } catch (err) {
        if (isMounted) toast(extractError(err), 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAllData();
    return () => { isMounted = false; };
  }, [refreshKey, toast]);


  // ── 2. Build (Fisik) handlers ───────────────────────────────────
  const openBuildModal = (item) => {
    setBuildModal({ open: true, mode: 'view', activeId: item.assignment_id, editId: null, originalPct: 0 });
  };

  // FIX: guard against undefined p.id before entering edit mode
  const handleOpenEdit = (p) => {
    const editId = p.id ?? p.progress_id;
    if (!editId) {
      toast('ID progress tidak ditemukan, coba refresh halaman.', 'error');
      return;
    }
    const pct = Number(p.progress_percentage ?? 0);
    setBuildForm({
      tahap:              p.tahap,
      progress_percentage: pct,
      tanggal_update:     p.tanggal_update?.split('T')[0] ?? '',
      catatan:            p.catatan || '',
    });
    setBuildModal(prev => ({ ...prev, mode: 'edit', editId, originalPct: pct }));
  };

  const handleSaveBuild = async (e) => {
    e.preventDefault();

    // Extra safety: should never reach here with undefined, but guard anyway
    if (buildModal.mode === 'edit' && !buildModal.editId) {
      toast('ID progress tidak valid, tidak dapat menyimpan.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        unit_id:             activeBuildData.unit.id,
        tahap:               buildForm.tahap,
        progress_percentage: Number(buildForm.progress_percentage),
        tanggal_update:      buildForm.tanggal_update,
        catatan:             buildForm.catatan,
      };

      if (buildModal.mode === 'create') {
        await progressAPI.create(payload);
        toast('Progress bangunan ditambahkan!', 'success');
      } else {
        await progressAPI.update(buildModal.editId, payload);
        toast('Data progress diperbarui!', 'success');
      }

      setBuildModal(prev => ({ ...prev, mode: 'view', editId: null, originalPct: 0 }));
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };


  // ── 3. Payment handlers ─────────────────────────────────────────
  const openPayModal = async (item) => {
    try {
      if (item.pembayaran?.tipe !== 'cash_lunas') {
        const rPay = await assignmentsAPI.getPayments(item.assignment_id);
        setPayModal({ open: true, mode: 'view', activeId: item.assignment_id, history: rPay.data?.data || [], sisaTagihan: 0 });
      } else {
        const mockLunasHistory = [{
          id:           'lunas-auto',
          jumlah_bayar:  item.pembayaran?.harga_total || 0,
          tanggal_bayar: item.tanggal_pembelian || new Date().toISOString(),
          catatan:      'Pembayaran Cash Lunas diselesaikan secara penuh pada saat transaksi pembelian unit.',
          dicatat_oleh: 'Sistem Otomatis',
        }];
        setPayModal({ open: true, mode: 'view', activeId: item.assignment_id, history: mockLunasHistory, sisaTagihan: 0 });
      }
    } catch (err) {
      toast(extractError(err), 'error');
    }
  };

  const handleSavePay = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload   = { ...payForm, jumlah_bayar: Number(payForm.jumlah_bayar) };
      const maxBayar  = (activePayData?.pembayaran?.harga_total || 0) - (activePayData?.pembayaran?.total_dibayar || 0);

      if (payload.jumlah_bayar > maxBayar) {
        toast(`Gagal: Maksimal pembayaran adalah ${formatCurrency(maxBayar)}`, 'error');
        setSaving(false);
        return;
      }

      await assignmentsAPI.createPayment(activePayData.assignment_id, payload);
      toast('Pembayaran berhasil dicatat', 'success');

      const rPay = await assignmentsAPI.getPayments(activePayData.assignment_id);
      setPayModal(prev => ({ ...prev, mode: 'view', history: rPay.data?.data || [] }));
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredData = data.filter(d => {
    const q = search.toLowerCase();
    return (
      d.unit?.nomor_unit?.toLowerCase().includes(q) ||
      d.customer?.nama?.toLowerCase().includes(q) ||
      d.unit?.cluster?.nama_cluster?.toLowerCase().includes(q)
    );
  });

  // Percentage helpers for the build form
  // basePctExcludingEdit = total excluding the record currently being edited
  const basePctExcludingEdit =
    (activeBuildData?.fisik_pct || 0) -
    (buildModal.mode === 'edit' ? buildModal.originalPct : 0);
  const maxSisa = Math.max(0, 100 - basePctExcludingEdit);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Monitor Progress</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {data.length} unit sedang dalam tahap pembangunan &amp; cicilan.
          </p>
        </div>
        <div className="w-full sm:w-80">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari unit atau nama pembeli..." />
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? <PageLoader /> : filteredData.length === 0 ? (
        <EmptyState icon={TrendingUp} title="Tidak ada data" description="Belum ada unit yang ter-assign atau cocok dengan pencarian." />
      ) : (
        <div className="card overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Unit &amp; Cluster</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Customer</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Total Bangunan</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Total Finansial</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-center">Kelola Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredData.map((item) => (
                <tr key={item.assignment_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-white">{item.unit?.nomor_unit}</div>
                    <div className="text-xs text-slate-500">{item.unit?.cluster?.nama_cluster}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                        {item.customer?.nama?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{item.customer?.nama}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 w-56">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {item.latestFisik?.tahap || 'Belum dimulai'}
                      </span>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{item.fisik_pct}%</span>
                    </div>
                    <ProgressBar value={item.fisik_pct} className="!bg-slate-200 dark:!bg-slate-700 h-1.5" />
                  </td>
                  <td className="px-6 py-4 w-56">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        {item.pembayaran?.tipe?.replace('_', ' ')}
                      </span>
                      <span className={`text-xs font-bold ${item.pay_pct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {item.pay_pct}%
                      </span>
                    </div>
                    <ProgressBar value={item.pay_pct} className="!bg-slate-200 dark:!bg-slate-700 h-1.5" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openBuildModal(item)}
                        className="btn-secondary !py-1.5 !px-3 !bg-indigo-50 !border-transparent !text-indigo-700 hover:!bg-indigo-100 dark:!bg-indigo-500/10 dark:!text-indigo-300 text-xs shadow-sm flex items-center gap-1.5"
                      >
                        <Hammer className="w-3.5 h-3.5" /> <span>Fisik</span>
                      </button>
                      <button
                        onClick={() => openPayModal(item)}
                        className={`btn-secondary !py-1.5 !px-3 text-xs shadow-sm flex items-center gap-1.5 !border-transparent ${
                          item.pay_pct >= 100
                            ? '!bg-emerald-50 !text-emerald-700 hover:!bg-emerald-100 dark:!bg-emerald-500/10 dark:!text-emerald-300'
                            : '!bg-amber-50 !text-amber-700 hover:!bg-amber-100 dark:!bg-amber-500/10 dark:!text-amber-300'
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5" /> <span>Dana</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: PROGRESS FISIK                                       */}
      {/* ============================================================ */}
      <Modal
        open={buildModal.open}
        onClose={() => setBuildModal({ open: false, mode: 'view', activeId: null, editId: null, originalPct: 0 })}
        title={`Fisik: Unit ${activeBuildData?.unit?.nomor_unit}`}
      >
        <div className="space-y-4">

          {buildModal.mode === 'view' && (
            <>
              {/* Summary card */}
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-700">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Pemilik Unit</p>
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-400" /> {activeBuildData?.customer?.nama}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 mb-0.5">Total Pembangunan</p>
                  <p className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">{activeBuildData?.fisik_pct}%</p>
                </div>
              </div>

              {/* History */}
              <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3 mt-2">
                {activeBuildData?.historyFisik?.length === 0 ? (
                  <p className="text-center py-6 text-sm text-slate-500">Belum ada riwayat pembangunan.</p>
                ) : (
                  activeBuildData?.historyFisik?.map((p, idx) => {
                    const pct = Number(p.progress_percentage ?? 0);
                    return (
                      <div key={p.id || idx} className="p-3 border border-slate-100 dark:border-slate-700 rounded-xl">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-800 dark:text-slate-100">{p.tahap}</h4>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="badge bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                              +{pct}%
                            </span>
                            {/* FIX: always visible — removed opacity-0 group-hover:opacity-100
                                which made the button untappable on touch screens */}
                            {isRole('admin', 'super_admin') && (
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 dark:hover:text-indigo-400 transition-colors"
                                title="Edit tahap ini"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center text-xs text-slate-500 mb-2 gap-1.5">
                          <Calendar className="w-3.5 h-3.5" /> {formatDate(p.tanggal_update)}
                        </div>
                        {p.catatan && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg mt-1">
                            {p.catatan}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {isRole('admin', 'super_admin') && (activeBuildData?.fisik_pct ?? 0) < 100 && (
                <button
                  className="btn-primary w-full mt-2"
                  onClick={() => {
                    setBuildForm({ ...EMPTY_BUILD_FORM, tanggal_update: new Date().toISOString().split('T')[0] });
                    setBuildModal(prev => ({ ...prev, mode: 'create', editId: null, originalPct: 0 }));
                  }}
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Tambah Tahap Pembangunan
                </button>
              )}
            </>
          )}

          {(buildModal.mode === 'create' || buildModal.mode === 'edit') && (
            <form onSubmit={handleSaveBuild} className="space-y-4">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300 p-3 rounded-lg text-sm border border-indigo-200 dark:border-indigo-800/50">
                {buildModal.mode === 'edit' ? (
                  <>
                    Tahap lain sudah menyumbang <strong>{basePctExcludingEdit}%</strong>.
                    Nilai tahap ini dapat diubah antara <strong>0% — {maxSisa}%</strong>.
                  </>
                ) : (
                  <>
                    Pembangunan sudah mencapai <strong>{activeBuildData?.fisik_pct ?? 0}%</strong>.
                    Anda dapat menambah hingga <strong>{maxSisa}%</strong> pada tahap baru ini.
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="label">Nama Tahap Pengerjaan</label>
                <input
                  className="input"
                  required
                  value={buildForm.tahap}
                  onChange={e => setBuildForm(f => ({ ...f, tahap: e.target.value }))}
                  placeholder="Contoh: Pemasangan Atap..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="label">
                  Persentase Tahap Ini &nbsp;
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">+{buildForm.progress_percentage}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max={maxSisa}
                  step="1"
                  className="w-full accent-indigo-600"
                  value={buildForm.progress_percentage}
                  onChange={e => setBuildForm(f => ({ ...f, progress_percentage: Number(e.target.value) }))}
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>0%</span><span>{maxSisa}%</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">Tanggal Laporan</label>
                <input
                  type="date"
                  required
                  className="input"
                  value={buildForm.tanggal_update}
                  onChange={e => setBuildForm(f => ({ ...f, tanggal_update: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="label">Catatan Lapangan</label>
                <textarea
                  className="input min-h-[80px]"
                  value={buildForm.catatan}
                  onChange={e => setBuildForm(f => ({ ...f, catatan: e.target.value }))}
                  placeholder="Opsional..."
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  disabled={saving}
                  onClick={() => setBuildModal(prev => ({ ...prev, mode: 'view', editId: null, originalPct: 0 }))}
                >
                  Kembali
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Menyimpan...' : buildModal.mode === 'edit' ? 'Perbarui Progress' : 'Simpan Progress'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 2: FINANSIAL (PEMBAYARAN)                               */}
      {/* ============================================================ */}
      <Modal
        open={payModal.open}
        onClose={() => setPayModal({ open: false, mode: 'view', activeId: null, history: [], sisaTagihan: 0 })}
        title={`Keuangan: Unit ${activePayData?.unit?.nomor_unit}`}
      >
        <div className="space-y-4">
          {payModal.mode === 'view' ? (() => {
            const isCashLunas  = activePayData?.pembayaran?.tipe === 'cash_lunas';
            const hargaTotal   = activePayData?.pembayaran?.harga_total   || 0;
            const totalDibayar = isCashLunas ? hargaTotal : (activePayData?.pembayaran?.total_dibayar || 0);
            const sisaTagihan  = hargaTotal - totalDibayar;

            return (
              <>
                <div className={`p-4 rounded-xl flex justify-between border ${sisaTagihan <= 0 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}>
                  <div>
                    <p className={`text-xs mb-0.5 uppercase tracking-wider font-bold ${sisaTagihan <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>Total Dibayar</p>
                    <p className={`text-lg font-bold ${sisaTagihan <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-emerald-600'}`}>{formatCurrency(totalDibayar)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs mb-0.5 uppercase tracking-wider font-bold ${sisaTagihan <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>
                      {sisaTagihan <= 0 ? 'Status' : 'Sisa Tagihan'}
                    </p>
                    {sisaTagihan <= 0 ? (
                      <p className="text-lg font-bold flex items-center justify-end gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-5 h-5" /> LUNAS
                      </p>
                    ) : (
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatCurrency(sisaTagihan)}</p>
                    )}
                  </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3 mt-2">
                  {payModal.history.length === 0 ? (
                    <p className="text-center py-6 text-sm text-slate-500">Belum ada riwayat pembayaran.</p>
                  ) : (
                    payModal.history.map((p, idx) => (
                      <div key={p.id || idx} className="p-3 border border-slate-100 dark:border-slate-700 rounded-xl">
                        <p className="font-bold text-slate-900 dark:text-white text-base">{formatCurrency(p.jumlah_bayar)}</p>
                        <div className="flex items-center text-xs text-slate-500 mt-1 gap-2">
                          <span><Calendar className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />{formatDate(p.tanggal_bayar)}</span>
                          <span>•</span>
                          <span>Oleh: {p.dicatat_oleh || 'Sistem'}</span>
                        </div>
                        {p.catatan && (
                          <p className={`text-sm mt-2 p-2 rounded-lg italic ${isCashLunas ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400'}`}>
                            "{p.catatan}"
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {isRole('admin', 'super_admin') && sisaTagihan > 0 && (
                  <button
                    className="btn-primary !bg-emerald-600 hover:!bg-emerald-700 w-full mt-2"
                    onClick={() => {
                      setPayForm({ ...EMPTY_PAY_FORM, tanggal_bayar: new Date().toISOString().split('T')[0] });
                      setPayModal(prev => ({ ...prev, mode: 'create', sisaTagihan }));
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Catat Pembayaran
                  </button>
                )}
              </>
            );
          })() : (
            <form onSubmit={handleSavePay} className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-3 rounded-lg text-sm border border-amber-200 dark:border-amber-800/50 mb-4">
                Sisa tagihan yang harus dilunasi adalah <strong>{formatCurrency(payModal.sisaTagihan)}</strong>. Anda tidak dapat menginput melebihi nominal ini.
              </div>
              <div className="space-y-1.5">
                <label className="label">Jumlah Nominal Transfer/Cash (Rp)</label>
                <input type="number" required className="input" placeholder="0" max={payModal.sisaTagihan} value={payForm.jumlah_bayar} onChange={e => setPayForm(f => ({ ...f, jumlah_bayar: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="label">Tanggal Transaksi</label>
                <input type="date" required className="input" value={payForm.tanggal_bayar} onChange={e => setPayForm(f => ({ ...f, tanggal_bayar: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="label">Keterangan / Berita Acara</label>
                <textarea className="input min-h-[80px]" placeholder="Misal: Cicilan ke-3 via BCA..." value={payForm.catatan} onChange={e => setPayForm(f => ({ ...f, catatan: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" className="btn-secondary flex-1" disabled={saving} onClick={() => setPayModal(prev => ({ ...prev, mode: 'view' }))}>Kembali</button>
                <button type="submit" className="btn-primary !bg-emerald-600 hover:!bg-emerald-700 flex-1" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>

    </div>
  );
}