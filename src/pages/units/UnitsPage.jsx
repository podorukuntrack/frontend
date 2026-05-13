import { useEffect, useState } from "react";
import { unitsAPI, clustersAPI, projectsAPI } from "../../api/services"; 
import { PageLoader, EmptyState, SearchInput, Modal, ProgressBar, Select, Pagination } from "../../components/ui";
import { useToast } from "../../hooks/useToast";
import { getStatusColor, getStatusLabel, extractError } from "../../utils/helpers";
import { useAuth } from "../../context/useAuth";
import { Home, Pencil, Plus } from "lucide-react";

const LIMIT = 10;

const initialAddForm = {
  project_id: "",
  cluster_id: "",
  tipe_rumah: "",
  luas_tanah: "",
  luas_bangunan: "",
  jumlah_unit: 1,
  nomor_units: [""], 
};

export default function UnitsPage() {
  const { isRole } = useAuth();
  const { toast } = useToast();

  const [units, setUnits] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProject] = useState("");
  const [filterCluster] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState(false);

  const [editModal, setEditModal] = useState({ open: false, data: null });
  const [addModal, setAddModal] = useState(false);

  const [editForm, setEditForm] = useState({ nomor_unit: "", tipe_rumah: "", luas_tanah: "", luas_bangunan: "" });
  const [addForm, setAddForm] = useState(initialAddForm);

  // ─── Helper: Extract rows dari berbagai format response ──────────────────
  const extractRows = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    return [];
  };

  // ─── Helper: Extract total dari response ──────────────────────────────
  const extractTotal = (payload, fallback = 0) => {
    return (
      payload?.total ??
      payload?.meta?.total ??
      payload?.data?.total ??
      payload?.data?.meta?.total ??
      fallback
    );
  };

  // ─── Fetch all data ──────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      try {
        setLoading(true);

        const [resUnits, resClusters, resProjects] = await Promise.all([
          unitsAPI.list({
            skip: (page - 1) * LIMIT,
            limit: LIMIT,
            search: search.trim() || undefined,
            project_id: filterProject || undefined,
            cluster_id: filterCluster || undefined,
            status_pembangunan: filterStatus || undefined,
          }),
          clustersAPI.list({ limit: 100 }),
          projectsAPI.list({ limit: 100 }),
        ]);

        if (!isMounted) return;

        // ===== Units =====
        const unitPayload = resUnits?.data ?? resUnits;
        const unitRows = extractRows(unitPayload);
        const unitTotal = extractTotal(unitPayload, unitRows.length);

        setUnits(unitRows);
        setTotal(unitTotal);

        // ===== Clusters =====
        const clusterPayload = resClusters?.data ?? resClusters;
        const clusterRows = extractRows(clusterPayload);
        setClusters(clusterRows);

        // ===== Projects =====
        const projectPayload = resProjects?.data ?? resProjects;
        const projectRows = extractRows(projectPayload);
        setProjects(projectRows);

        console.log("Units loaded:", unitRows);
        console.log("Clusters loaded:", clusterRows);
        console.log("Projects loaded:", projectRows);
      } catch (err) {
        if (isMounted) toast(extractError(err), "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initData();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filterStatus, filterProject, filterCluster]);

  // ─── Manual reload setelah create/update/delete ──────────────────
  const loadUnits = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const params = {
        skip: (page - 1) * LIMIT,
        limit: LIMIT,
        search: search.trim() || undefined,
        project_id: filterProject || undefined,
        cluster_id: filterCluster || undefined,
        status_pembangunan: filterStatus || undefined,
      };

      const result = await unitsAPI.list(params);

      const payload = result?.data ?? result;
      const rows = extractRows(payload);
      const totalRows = extractTotal(payload, rows.length);

      setUnits(rows);
      setTotal(totalRows);
    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setLoading(false);
    }
  };
  
  const filtered = units.filter((u) => {
    const matchSearch = u.nomor_unit?.toLowerCase().includes(search.toLowerCase()) || u.tipe_rumah?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || u.status_pembangunan === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleJumlahChange = (e) => {
    let val = parseInt(e.target.value) || 1;

    if (addForm.cluster_id && val > sisaKuota) {
      val = sisaKuota;
      toast(`Maksimal penambahan unit di cluster ini sisa ${sisaKuota} unit`, "error");
    }

    const newNomorUnits = [...addForm.nomor_units];
    if (val > newNomorUnits.length) {
      while (newNomorUnits.length < val) newNomorUnits.push("");
    } else {
      newNomorUnits.length = val; 
    }

    setAddForm({ ...addForm, jumlah_unit: val, nomor_units: newNomorUnits });
  };

  const handleNomorChange = (index, value) => {
    const newNomorUnits = [...addForm.nomor_units];
    newNomorUnits[index] = value;
    setAddForm({ ...addForm, nomor_units: newNomorUnits });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.cluster_id) return toast("Pilih cluster terlebih dahulu", "error");
    if (addForm.jumlah_unit > sisaKuota) return toast(`Gagal! Sisa kuota hanya ${sisaKuota} unit`, "error");
    
    // Validate semua nomor unit diisi
    const emptyNomors = addForm.nomor_units.filter(n => !String(n || "").trim());
    if (emptyNomors.length > 0) {
      return toast(`${emptyNomors.length} nomor unit masih kosong`, "error");
    }

    setSaving(true);
    try {
      const payloads = addForm.nomor_units.map((nomor) => {
        const nomorString = String(nomor || "").trim();
        if (!nomorString) throw new Error("Nomor unit tidak boleh kosong");
        
        return {
          clusterId: String(addForm.cluster_id),
          nomorUnit: nomorString,
          tipeRumah: String(addForm.tipe_rumah || ""),
          luasTanah: addForm.luas_tanah ? parseFloat(addForm.luas_tanah) : undefined,
          luasBangunan: addForm.luas_bangunan ? parseFloat(addForm.luas_bangunan) : undefined,
          statusPembangunan: "planned",
          progressPercentage: 0,
        };
      });

      console.log("Submitting units payload:", JSON.stringify(payloads, null, 2));
      const response = await unitsAPI.bulkCreate(payloads);
      console.log("Response:", response);
      
      toast(`${payloads.length} unit berhasil ditambahkan`, "success");
      setAddModal(false);
      setAddForm(initialAddForm);
      await loadUnits(true);
    } catch (err) {
      console.error("Error creating units:", err);
      toast(extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u) => {
    setEditForm({
      nomor_unit: u.nomor_unit || "",
      tipe_rumah: u.tipe_rumah || "",
      luas_tanah: u.luas_tanah || "",
      luas_bangunan: u.luas_bangunan || "",
    });
    setEditModal({ open: true, data: u });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await unitsAPI.update(editModal.data.id, {
        nomor_unit: editForm.nomor_unit,
        tipe_rumah: editForm.tipe_rumah,
        luas_tanah: parseFloat(editForm.luas_tanah) || 0,
        luas_bangunan: parseFloat(editForm.luas_bangunan) || 0,
      });
      toast("Spesifikasi unit berhasil diperbarui", "success");
      setEditModal({ open: false, data: null });
      await loadUnits(true);
    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = [
    { value: "belum_mulai", label: "Belum Mulai" },
    { value: "dalam_pembangunan", label: "Dalam Pembangunan" },
    { value: "selesai", label: "Selesai" },
  ];

  const filteredClusters = clusters.filter(
    (c) => String(c.project_id) === String(addForm.project_id) || String(c.project?.id) === String(addForm.project_id),
  );

  const selectedCluster = clusters.find((c) => String(c.id) === String(addForm.cluster_id));
  const kapasitasCluster = selectedCluster?.jumlah_unit || selectedCluster?.total_unit || 0;
  
  const unitTerdaftar = units.filter(
    (u) => String(u.cluster_id) === String(addForm.cluster_id) || String(u.cluster?.id) === String(addForm.cluster_id),
  ).length;

  const sisaKuota = addForm.cluster_id ? Math.max(0, kapasitasCluster - unitTerdaftar) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Manajemen Unit</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{units.length} unit terdaftar dalam sistem</p>
        </div>
        {isRole("super_admin", "admin") && (
          <button className="btn-primary whitespace-nowrap" onClick={() => setAddModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> Tambah Unit
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari nomor unit atau tipe..." />
        </div>
        <div className="w-full sm:w-64">
          <Select value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1); }} options={statusOptions} placeholder="Semua Status Pembangunan" />
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Home} title="Belum ada unit" description="Data unit tidak ditemukan atau belum ditambahkan." />
      ) : (
        <>
          <div className="card">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Nomor Unit</th>
                    <th className="px-6 py-4 font-semibold">Spesifikasi</th>
                    <th className="px-6 py-4 font-semibold">Cluster & Proyek</th>
                    <th className="px-6 py-4 font-semibold">Progress</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/25 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-slate-900 dark:text-white px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">{u.nomor_unit}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 dark:text-slate-200">{u.tipe_rumah || "-"}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">LB: {u.luas_bangunan || 0}m² / LT: {u.luas_tanah || 0}m²</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 dark:text-slate-200">{u.cluster?.nama_cluster || "-"}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{u.cluster?.project?.nama_proyek || "-"}</div>
                      </td>
                      <td className="px-6 py-4 w-48">
                        <div className="flex items-center gap-3">
                          <ProgressBar value={u.progress_percentage || 0} className="flex-1" />
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 w-8 text-right">{u.progress_percentage || 0}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge ${getStatusColor(u.status_pembangunan)}`}>{getStatusLabel(u.status_pembangunan)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isRole("super_admin", "admin") && (
                          <button onClick={() => openEdit(u)} className="btn-ghost !p-2 inline-flex">
                            <Pencil className="w-4 h-4 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={page}
            total={total}
            limit={LIMIT}
            onChange={setPage}
          />
        </>
      )}

      {/* Modal Tambah Unit */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Tambah Unit Baru" size="md">
        <form onSubmit={handleAdd} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Project Fikri<span className="text-rose-500">*</span></label>
              <select 
                className="input" 
                value={addForm.project_id} 
                required
                onChange={(e) => setAddForm({ ...addForm, project_id: e.target.value, cluster_id: "" })}
              >
                <option value="">-- Pilih Project --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama_proyek || p.namaProyek || "Unnamed"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="label">Cluster <span className="text-rose-500">*</span></label>
              <select 
                className="input" 
                value={addForm.cluster_id} 
                required 
                disabled={!addForm.project_id}
                onChange={(e) => setAddForm({ ...addForm, cluster_id: e.target.value, jumlah_unit: 1, nomor_units: [""] })}
              >
                <option value="">-- Pilih Cluster --</option>
                {filteredClusters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nama_cluster || c.namaCluster || "Unnamed"} ({c.jumlah_unit || 0} units)
                  </option>
                ))}
              </select>
              {!addForm.project_id && <p className="text-xs text-slate-400 mt-1">Pilih project terlebih dahulu</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="label">Tipe Rumah</label>
              <input 
                type="text" 
                className="input" 
                value={addForm.tipe_rumah} 
                onChange={(e) => setAddForm({ ...addForm, tipe_rumah: e.target.value })} 
                placeholder="Ex: Tipe 45" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Luas Bangunan</label>
              <div className="relative">
                <input 
                  type="number" 
                  className="input pr-8" 
                  value={addForm.luas_bangunan} 
                  onChange={(e) => setAddForm({ ...addForm, luas_bangunan: e.target.value })} 
                  placeholder="0" 
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">m²</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="label">Luas Tanah</label>
              <div className="relative">
                <input 
                  type="number" 
                  className="input pr-8" 
                  value={addForm.luas_tanah} 
                  onChange={(e) => setAddForm({ ...addForm, luas_tanah: e.target.value })} 
                  placeholder="0" 
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">m²</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div>
              <label className="label flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <span>Jumlah unit yang dibuat serentak:</span>
                {addForm.cluster_id && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 sm:mt-0 ${sisaKuota > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"}`}>
                    SISA KUOTA: {sisaKuota}/{kapasitasCluster}
                  </span>
                )}
              </label>
              <input 
                type="number" 
                min="1" 
                max={addForm.cluster_id ? sisaKuota : 50} 
                className="input w-full sm:w-32" 
                value={addForm.jumlah_unit} 
                onChange={handleJumlahChange} 
                disabled={!addForm.cluster_id || sisaKuota === 0} 
                required 
              />
              {addForm.cluster_id && sisaKuota === 0 && <p className="text-xs font-semibold text-rose-500 mt-2">Kapasitas cluster ini sudah penuh!</p>}
            </div>

            {addForm.cluster_id && sisaKuota > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
                <label className="label mb-3">Definisikan Nomor Unit <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {addForm.nomor_units.map((nomor, index) => (
                    <input 
                      key={index} 
                      type="text" 
                      className="input !bg-white dark:!bg-slate-900 font-mono text-sm" 
                      value={nomor} 
                      onChange={(e) => handleNomorChange(index, e.target.value)} 
                      placeholder={`Unit ${index + 1}`} 
                      required 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setAddModal(false)}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving || (!addForm.cluster_id) || sisaKuota === 0}>{saving ? "Menyimpan..." : "Buat Unit"}</button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Unit */}
      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, data: null })} title="Edit Spesifikasi Unit" size="sm">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="label">Nomor Unit</label>
            <input type="text" className="input font-mono font-bold" value={editForm.nomor_unit} onChange={(e) => setEditForm((f) => ({ ...f, nomor_unit: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <label className="label">Tipe Rumah</label>
            <input type="text" className="input" value={editForm.tipe_rumah} onChange={(e) => setEditForm((f) => ({ ...f, tipe_rumah: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Luas Bangunan</label>
              <div className="relative">
                <input type="number" className="input pr-8" value={editForm.luas_bangunan} onChange={(e) => setEditForm((f) => ({ ...f, luas_bangunan: e.target.value }))} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">m²</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="label">Luas Tanah</label>
              <div className="relative">
                <input type="number" className="input pr-8" value={editForm.luas_tanah} onChange={(e) => setEditForm((f) => ({ ...f, luas_tanah: e.target.value }))} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">m²</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" className="btn-secondary" onClick={() => setEditModal({ open: false, data: null })}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Perubahan"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}