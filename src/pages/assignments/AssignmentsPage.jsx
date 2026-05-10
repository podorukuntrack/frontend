import { useEffect, useState } from "react";
import {
  assignmentsAPI,
  usersAPI,
  unitsAPI,
  projectsAPI,
  clustersAPI,
} from "../../api/services";
import {
  PageLoader,
  EmptyState,
  SearchInput,
  Modal,
  
  Select,
} from "../../components/ui";
import {
  getStatusColor,
  getStatusLabel,
  formatDate,
  formatCurrency, // Asumsi ada helper format mata uang
  extractError,
} from "../../utils/helpers";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../context/AuthContext";
import { ClipboardList, Plus, Pencil,  Receipt } from "lucide-react";

const EMPTY_FORM = {
  user_id: "",
  project_id: "",
  cluster_id: "",
  unit_id: "",
  tanggal_pembelian: "",
  status_kepemilikan: "active",
  // Field Finansial Baru
  tipe_pembayaran: "cash_lunas",
  harga_total: 0,
  tenor_bulan: 0,
  keterangan_kpr: "",
};

export default function AssignmentsPage() {
  const { isRole } = useAuth();
  const { toast } = useToast();

  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clusters, setClusters] = useState([]);

  const [loading, setLoading] = useState(true);
  const [ setClusterLoading] = useState(false);
  const [page] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState({ open: false, mode: "create", data: null });
  const [paymentModal, setPaymentModal] = useState({ open: false, assignment: null, history: [] });
  
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const limit = 15;

  
   const load = async () => {
    setLoading(true);
    try {
      const r = await assignmentsAPI.list({ page, limit });
      setAssignments(r.data.data || []);
      setTotal(r.data.meta?.total || 0);
    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const r = await assignmentsAPI.list({ page, limit });
        setAssignments(r.data.data || []);
        setTotal(r.data.meta?.total || 0);
      } catch (err) {
        toast(extractError(err), "error");
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);



  // ================= LOAD MASTER DATA =================
  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const [usersRes, unitsRes, projectsRes] = await Promise.all([
          usersAPI.list({}),
          unitsAPI.list({ limit: 1000 }),
          projectsAPI.list({ limit: 100 }),
        ]);

        const customersOnly = (usersRes.data.data || []).filter(
          (u) => u.role === "customer"
        );

        setUsers(customersOnly);
        setUnits(unitsRes.data.data || []);
        setProjects(projectsRes.data.data || []);
      } catch (err) {
        toast(extractError(err), "error");
      }
    };

    if (isRole("super_admin", "admin")) {
      fetchMaster();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const fetchClustersByProject = async (projectId) => {
    if (!projectId) return;
    setClusterLoading(true);
    try {
      const r = await clustersAPI.list({ project_id: projectId });
      setClusters(r.data.data || []);
    } catch (err) { toast(extractError(err), "error"); }
    finally { setClusterLoading(false); }
  };

  // ================= HANDLERS =================
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setClusters([]);
    setModal({ open: true, mode: "create", data: null });
  };

  const openEdit = (a) => {
    setForm({
      user_id: a.user?.id,
      unit_id: a.unit?.id,
      tanggal_pembelian: a.tanggal_pembelian.split('T')[0], // format date input
      status_kepemilikan: a.status_kepemilikan,
      // Mapping dari object 'pembayaran' di backend
      tipe_pembayaran: a.pembayaran?.tipe || "cash_lunas",
      harga_total: a.pembayaran?.harga_total || 0,
      tenor_bulan: a.pembayaran?.tenor_bulan || 0,
      keterangan_kpr: a.pembayaran?.keterangan_kpr || "",
    });
    setModal({ open: true, mode: "edit", data: a });
  };

  const openPaymentHistory = async (a) => {
    try {
      const r = await assignmentsAPI.getPayments(a.id); // Pastikan api service punya method ini
      setPaymentModal({ open: true, assignment: a, history: r.data.data });
    } catch (err) { toast(extractError(err), "error"); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        harga_total: Number(form.harga_total),
        tenor_bulan: Number(form.tenor_bulan)
      };

      if (modal.mode === "create") {
        await assignmentsAPI.create(payload);
        toast("Assignment & Data Finansial berhasil dibuat", "success");
      } else {
        await assignmentsAPI.update(modal.data.id, payload);
        toast("Data berhasil diperbarui", "success");
      }
      setModal({ open: false });
      load();
    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = assignments.filter(a => 
    a.user?.nama?.toLowerCase().includes(search.toLowerCase()) || 
    a.unit?.nomor_unit?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER & SEARCH (Sama seperti sebelumnya) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Assignment</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{total} total unit terjual</p>
        </div>
        {isRole("super_admin", "admin") && (
          <button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Assign Unit</button>
        )}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Cari customer atau unit..." />

      {/* TABLE */}
      {loading ? <PageLoader /> : filtered.length === 0 ? <EmptyState icon={ClipboardList} title="Data Kosong" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Customer / Unit</th>
                <th className="px-6 py-4">Tipe Bayar</th>
                <th className="px-6 py-4">Total Harga</th>
                <th className="px-6 py-4">Progres Bayar</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900 dark:text-white">{a.user?.nama}</div>
                    <div className="text-xs text-slate-500">{a.unit?.nomor_unit} - {a.unit?.cluster?.nama_cluster}</div>
                  </td>
                  <td className="px-6 py-4 uppercase text-xs font-semibold">{a.pembayaran?.tipe?.replace('_', ' ')}</td>
                  <td className="px-6 py-4 font-mono">{formatCurrency(a.pembayaran?.harga_total)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 rounded-full h-1.5">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${a.pembayaran?.persentase_dibayar}%` }}></div>
                      </div>
                      <span className="text-xs">{a.pembayaran?.persentase_dibayar}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${getStatusColor(a.status_kepemilikan)}`}>{getStatusLabel(a.status_kepemilikan)}</span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openPaymentHistory(a)} className="btn-ghost !p-2 text-blue-600" title="Riwayat Pembayaran">
                      <Receipt className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(a)} className="btn-ghost !p-2">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL FORM (Create/Edit) */}
      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.mode === "create" ? "Assign Unit Baru" : "Edit Assignment"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
               <label className="label">Customer</label>
               <Select 
                 value={form.user_id} 
                 onChange={(v) => setForm(f => ({...f, user_id: v}))} 
                 options={users.map(u => ({ value: u.id, label: `${u.nama} (${u.email})` }))}
                 disabled={modal.mode === "edit"}
               />
            </div>
            
            {modal.mode === "create" && (
              <>
                <div>
                  <label className="label">Proyek</label>
                  <select className="input" value={form.project_id} onChange={(e) => {
                    setForm(f => ({...f, project_id: e.target.value, cluster_id: "", unit_id: ""}));
                    fetchClustersByProject(e.target.value);
                  }}>
                    <option value="">Pilih Proyek...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.nama_proyek}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Cluster</label>
                  <select className="input" value={form.cluster_id} disabled={!form.project_id} onChange={(e) => setForm(f => ({...f, cluster_id: e.target.value, unit_id: ""}))}>
                    <option value="">Pilih Cluster...</option>
                    {clusters.map(c => <option key={c.id} value={c.id}>{c.nama_cluster}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Unit</label>
                  <select className="input" value={form.unit_id} disabled={!form.cluster_id} onChange={(e) => setForm(f => ({...f, unit_id: e.target.value}))}>
                    <option value="">Pilih Unit...</option>
                    {units.filter(u => String(u.cluster_id) === String(form.cluster_id)).map(u => (
                      <option key={u.id} value={u.id}>{u.nomor_unit} ({u.tipe_rumah})</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* SECTION FINANSIAL */}
            <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
              <h3 className="text-sm font-semibold mb-3">Informasi Finansial</h3>
            </div>

            <div>
              <label className="label">Tipe Pembayaran</label>
              <select className="input" value={form.tipe_pembayaran} onChange={(e) => setForm(f => ({...f, tipe_pembayaran: e.target.value}))}>
                <option value="cash_lunas">Cash Lunas</option>
                <option value="cash_cicil">Cash Bertahap (In-House)</option>
                <option value="kredit_kpr">Kredit KPR</option>
              </select>
            </div>

            <div>
              <label className="label">Harga Total (Net)</label>
              <input type="number" className="input" value={form.harga_total} onChange={(e) => setForm(f => ({...f, harga_total: e.target.value}))} />
            </div>

            {form.tipe_pembayaran !== 'cash_lunas' && (
              <div>
                <label className="label">Tenor (Bulan)</label>
                <input type="number" className="input" value={form.tenor_bulan} onChange={(e) => setForm(f => ({...f, tenor_bulan: e.target.value}))} />
              </div>
            )}

            <div>
              <label className="label">Tanggal Pembelian</label>
              <input type="date" className="input" value={form.tanggal_pembelian} onChange={(e) => setForm(f => ({...f, tanggal_pembelian: e.target.value}))} />
            </div>

            {form.tipe_pembayaran === 'kredit_kpr' && (
              <div className="md:col-span-2">
                <label className="label">Keterangan / Bank KPR</label>
                <textarea className="input" rows="2" value={form.keterangan_kpr} onChange={(e) => setForm(f => ({...f, keterangan_kpr: e.target.value}))}></textarea>
              </div>
            )}

            {modal.mode === "edit" && (
              <div className="md:col-span-2">
                <label className="label">Status Kepemilikan</label>
                <select className="input" value={form.status_kepemilikan} onChange={(e) => setForm(f => ({...f, status_kepemilikan: e.target.value}))}>
                  <option value="active">Active</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" className="btn-secondary" onClick={() => setModal({ open: false })}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Data"}</button>
          </div>
        </form>
      </Modal>

      {/* MODAL RIWAYAT PEMBAYARAN (Contoh implementasi baru) */}
      <Modal open={paymentModal.open} onClose={() => setPaymentModal({ open: false })} title="Riwayat Pembayaran">
        <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg flex justify-between items-center">
                <div>
                    <p className="text-xs text-slate-500 uppercase">Total Dibayar</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(paymentModal.assignment?.pembayaran?.total_dibayar || 0)}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase">Sisa Tagihan</p>
                    <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                        {formatCurrency((paymentModal.assignment?.pembayaran?.harga_total || 0) - (paymentModal.assignment?.pembayaran?.total_dibayar || 0))}
                    </p>
                </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
                {paymentModal.history.length === 0 ? (
                    <p className="text-center py-4 text-slate-500 text-sm">Belum ada catatan pembayaran.</p>
                ) : paymentModal.history.map((p, idx) => (
                    <div key={idx} className="border border-slate-100 dark:border-slate-800 p-3 rounded-md flex justify-between items-start">
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(p.jumlah_bayar)}</p>
                            <p className="text-xs text-slate-500">{formatDate(p.tanggal_bayar)} • Oleh: {p.dicatat_oleh}</p>
                            {p.catatan && <p className="text-xs italic mt-1 text-slate-400">"{p.catatan}"</p>}
                        </div>
                    </div>
                ))}
            </div>

            {isRole("admin", "super_admin") && (
                <button 
                  className="btn-primary w-full"
                  onClick={() => {
                      /* Logic untuk buka sub-modal tambah pembayaran atau navigasi */
                      toast("Gunakan endpoint POST /:id/payments untuk menambah data", "info");
                  }}
                >
                    <Plus className="w-4 h-4 mr-2" /> Catat Pembayaran Baru
                </button>
            )}
        </div>
      </Modal>
    </div>
  );
}