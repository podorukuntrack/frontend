
import { useEffect, useState } from "react";
import { clustersAPI, projectsAPI } from "../../api/services";
import {
  PageLoader,
  EmptyState,
  SearchInput,
  Modal,
  Confirm,
  Pagination,
  Select,
} from "../../components/ui";
import { useToast } from "../../hooks/useToast";
import { extractError, formatDate } from "../../utils/helpers";
import { useAuth } from "../../context/useAuth";
import { Layers, Plus, Pencil, Trash2, Home } from "lucide-react";

const EMPTY_FORM = {
  project_id: "",
  nama_cluster: "",
  jumlah_unit: "",
};

const LIMIT = 12;

export default function ClustersPage() {
  const { isRole } = useAuth();
  const { toast } = useToast();

  const [clusters, setClusters] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [modal, setModal] = useState({
    open: false,
    mode: "create",
    data: null,
  });

  const [confirm, setConfirm] = useState({
    open: false,
    id: null,
  });

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  /**
   * Normalisasi berbagai kemungkinan struktur response API:
   * - []
   * - { data: [] }
   * - { items: [] }
   * - { data: { items: [] } }
   */
  const extractRows = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    return [];
  };

  /**
   * Ambil total rows dari response.
   */
  const extractTotal = (payload, fallback = 0) => {
    return (
      payload?.total ??
      payload?.meta?.total ??
      payload?.data?.total ??
      payload?.data?.meta?.total ??
      fallback
    );
  };

  /**
   * Load cluster + projects (dipanggil saat page/filter/search berubah)
   */
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);

        const [clusterRes, projectRes] = await Promise.all([
          clustersAPI.list({
            skip: (page - 1) * LIMIT,
            limit: LIMIT,
            search: search.trim() || undefined,
            project_id: filterProject || undefined,
          }),
          projectsAPI.list({ limit: 100 }),
        ]);

        if (!isMounted) return;

        // =========================
        // CLUSTERS
        // =========================
        const clusterPayload = clusterRes?.data ?? clusterRes;
        const clusterRows = extractRows(clusterPayload);
        const clusterTotal = extractTotal(clusterPayload, clusterRows.length);

        setClusters(clusterRows);
        setTotal(clusterTotal);

        // =========================
        // PROJECTS
        // =========================
        const projectPayload = projectRes?.data ?? projectRes;
        const projectRows = extractRows(projectPayload);

        setProjects(projectRows);

        // =========================
        // DEBUG LOGS
        // =========================
        console.log("clusterRes:", clusterRes);
        console.log("clusterRows:", clusterRows);
        console.log("projectRes:", projectRes);
        console.log("projectRows:", projectRows);
      } catch (err) {
        if (isMounted) {
          toast(extractError(err), "error");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [page, search, filterProject, toast]);

  /**
   * Manual reload setelah create/update/delete.
   */
  const loadClusters = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const params = {
        skip: (page - 1) * LIMIT,
        limit: LIMIT,
        search: search.trim() || undefined,
        project_id: filterProject || undefined,
      };

      const result = await clustersAPI.list(params);

      const payload = result?.data ?? result;
      const rows = extractRows(payload);
      const totalRows = extractTotal(payload, rows.length);

      setClusters(rows);
      setTotal(totalRows);
    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // MODAL HANDLERS
  // =========================
  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      project_id: filterProject || "",
    });

    setModal({
      open: true,
      mode: "create",
      data: null,
    });
  };

  const openEdit = (cluster) => {
    setForm({
      project_id:
        cluster.project_id ||
        cluster.projectId ||
        cluster.project?.id ||
        "",
      nama_cluster:
        cluster.nama_cluster ||
        cluster.namaCluster ||
        "",
      jumlah_unit: String(
        cluster.jumlah_unit ||
          cluster.jumlahUnit ||
          0
      ),
    });

    setModal({
      open: true,
      mode: "edit",
      data: cluster,
    });
  };

  // =========================
  // SAVE
  // =========================
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        project_id: form.project_id,
        nama_cluster: form.nama_cluster,
        jumlah_unit: parseInt(form.jumlah_unit, 10) || 0,
      };

      if (modal.mode === "create") {
        await clustersAPI.create(payload);
        toast("Cluster berhasil dibuat", "success");
      } else {
        await clustersAPI.update(modal.data.id, payload);
        toast("Cluster berhasil diperbarui", "success");
      }

      setModal({
        open: false,
        mode: "create",
        data: null,
      });

      await loadClusters(true);
    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // DELETE
  // =========================
  const handleDelete = async () => {
    setSaving(true);

    try {
      await clustersAPI.delete(confirm.id);

      toast("Cluster berhasil dihapus", "success");

      setConfirm({
        open: false,
        id: null,
      });

      await loadClusters(true);
    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // PROJECT OPTIONS
  // =========================
  const projectOptions = projects.map((project) => ({
    value: String(project.id),
    label:
      project.nama_proyek ||
      project.namaProyek ||
      project.name ||
      "Unnamed Project",
  }));

  // Debug state (aman)
  console.log("projects state:", projects);
  console.log("projectOptions:", projectOptions);
  console.log("first cluster:", clusters[0]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Cluster
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {total} cluster terdaftar
          </p>
        </div>

        {isRole("super_admin", "admin") && (
          <button
            className="btn-primary whitespace-nowrap"
            onClick={openCreate}
          >
            <Plus className="w-4 h-4 mr-1" />
            Tambah Cluster
          </button>
        )}
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Cari nama cluster..."
          />
        </div>

        <div className="w-full sm:w-64">
          <Select
            value={filterProject}
            onChange={(v) => {
              setFilterProject(v);
              setPage(1);
            }}
            options={projectOptions}
            placeholder="Semua Proyek"
          />
        </div>
      </div>

      {/* DATA DISPLAY */}
      {loading ? (
        <PageLoader />
      ) : clusters.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Belum ada cluster"
          description={
            search
              ? "Hasil pencarian tidak ditemukan."
              : "Tambahkan cluster ke proyek Anda."
          }
        />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {clusters.map((c) => (
              <div
                key={c.id}
                className="card-hover p-6 group flex flex-col justify-between h-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                      {c.project?.nama_proyek ||
                        c.project?.namaProyek ||
                        "General"}
                    </span>

                    {isRole("super_admin", "admin") && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(c)}
                          className="btn-ghost !p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() =>
                            setConfirm({
                              open: true,
                              id: c.id,
                            })
                          }
                          className="btn-ghost !p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 leading-tight">
                    {c.nama_cluster || c.namaCluster}
                  </h3>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <Home className="w-4 h-4 text-slate-400" />
                    <span>
                      {c.jumlah_unit || c.jumlahUnit || 0}{" "}
                      <span className="text-slate-400 font-normal">
                        Unit
                      </span>
                    </span>
                  </div>

                  <p className="text-slate-400 dark:text-slate-500 text-[10px] font-medium uppercase">
                    {formatDate(c.created_at || c.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            page={page}
            total={total}
            limit={LIMIT}
            onChange={setPage}
          />
        </>
      )}

      {/* MODAL CREATE/EDIT */}
      <Modal
        open={modal.open}
        onClose={() =>
          setModal({
            open: false,
            mode: "create",
            data: null,
          })
        }
        title={
          modal.mode === "create"
            ? "Tambah Cluster"
            : "Edit Cluster"
        }
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-1.5">
            <label className="label">Pilih Proyek</label>
            <Select
              value={form.project_id}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  project_id: v,
                }))
              }
              options={projectOptions}
              required
              placeholder="Pilih proyek..."
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Nama Cluster</label>
              <input
                className="input w-full"
                required
                value={form.nama_cluster}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    nama_cluster: e.target.value,
                  }))
                }
                placeholder="Contoh: Cluster Sakura"
              />
            </div>

            <div className="space-y-1.5">
              <label className="label">Jumlah Unit</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                required
                value={form.jumlah_unit}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    jumlah_unit: e.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-5 mt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                setModal({
                  open: false,
                  mode: "create",
                  data: null,
                })
              }
              disabled={saving}
            >
              Batal
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? "Menyimpan..." : "Simpan Data"}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE */}
      <Confirm
        open={confirm.open}
        onClose={() =>
          setConfirm({
            open: false,
            id: null,
          })
        }
        onConfirm={handleDelete}
        title="Hapus Cluster"
        description="Data cluster akan dihapus permanen. Pastikan tidak ada data unit di dalam cluster ini."
        loading={saving}
      />
    </div>
  );
}
