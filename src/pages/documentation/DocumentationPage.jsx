import { useCallback, useEffect, useState } from "react";
import {
  documentationAPI,
  unitsAPI,
  projectsAPI,
  clustersAPI,
  progressAPI,
} from "../../api/services";

import { PageLoader, EmptyState, Modal, Select } from "../../components/ui";
import { useToast } from "../../hooks/useToast";
import { formatDate, extractError } from "../../utils/helpers";
import {
  Upload,
  FileText,
  X,
  RotateCcw,
  ImageIcon,
  ImagePlus,
  Home,
  Play,
  Layers,
} from "lucide-react";

export default function DocumentationPage() {
  const { toast } = useToast();

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterJenis, setFilterJenis] = useState("");

  const [projects, setProjects] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [units, setUnits] = useState([]);
  const [unitProgressMap, setUnitProgressMap] = useState({});

  const [uploadModal, setUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const [uploadForm, setUploadForm] = useState({
    project_id: "",
    cluster_id: "",
    unit_id: "",
    progress_id: "",
    jenis: "foto",
    deskripsi: "",
  });

  const [uploadQueue, setUploadQueue] = useState([]);

  // Computed — tidak perlu state terpisah
  const progresses = unitProgressMap[uploadForm.unit_id] || [];

  // ================= LOAD =================
  // Dipakai di luar effect (setelah upload), jadi tetap useCallback
  const fetchDocs = useCallback(
    async (jenis = "") => {
      setLoading(true);
      try {
        const params = {};
        if (jenis) params.jenis = jenis;
        const res = await documentationAPI.list(params);
        setDocs(res.data.data || []);
      } catch (err) {
        toast(extractError(err), "error");
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  // Effect untuk filter — fetch langsung di dalam, tidak panggil fetchDocs
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = {};
        if (filterJenis) params.jenis = filterJenis;
        const res = await documentationAPI.list(params);
        if (!cancelled) setDocs(res.data.data || []);
      } catch (err) {
        if (!cancelled) toast(extractError(err), "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [filterJenis, toast]);

  useEffect(() => {
    projectsAPI.list().then((r) => setProjects(r.data.data || []));
  }, []);

  useEffect(() => {
    if (!uploadForm.project_id) return;
    clustersAPI
      .list({ project_id: uploadForm.project_id })
      .then((r) => setClusters(r.data.data || []));
  }, [uploadForm.project_id]);

  useEffect(() => {
    if (!uploadForm.cluster_id) return;

    let cancelled = false;

    const load = async () => {
      const r = await unitsAPI.list({ cluster_id: uploadForm.cluster_id });
      const allUnits = r.data.data || [];

      // Proses bertahap (3 unit sekaligus) agar tidak flood API
      const CHUNK_SIZE = 3;
      const results = [];

      for (let i = 0; i < allUnits.length; i += CHUNK_SIZE) {
        if (cancelled) return;
        const chunk = allUnits.slice(i, i + CHUNK_SIZE);
        const chunkResults = await Promise.all(
          chunk.map(async (unit) => {
            try {
              const res = await progressAPI.list({ unit_id: unit.id });
              const progList = res.data.data || [];
              return progList.length > 0
                ? { unit, progresses: progList }
                : null;
            } catch {
              return null;
            }
          }),
        );
        results.push(...chunkResults);

        // Jeda kecil antar chunk agar tidak memicu rate limit
        if (i + CHUNK_SIZE < allUnits.length) {
          await new Promise((res) => setTimeout(res, 200));
        }
      }

      if (cancelled) return;

      const filtered = results.filter(Boolean);
      setUnits(filtered.map((x) => x.unit));
      setUnitProgressMap(
        Object.fromEntries(filtered.map((x) => [x.unit.id, x.progresses])),
      );
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [uploadForm.cluster_id]);

  // ================= FILE HANDLER =================
  const handleFiles = (files) => {
    const mapped = Array.from(files).map((file) => ({
      file,
      progress: 0,
      status: "pending",
      preview: URL.createObjectURL(file),
    }));
    setUploadQueue((prev) => [...prev, ...mapped]);
  };

  const removeFile = (index) => {
    setUploadQueue((q) => q.filter((_, i) => i !== index));
  };

  // ================= UPLOAD =================
  const uploadSingle = async (item, index) => {
    const fd = new FormData();
    fd.append("file", item.file);
    fd.append("unit_id", uploadForm.unit_id);
    fd.append("progress_id", uploadForm.progress_id);
    fd.append("jenis", uploadForm.jenis);
    fd.append("deskripsi", uploadForm.deskripsi);

    try {
      setUploadQueue((q) => {
        const n = [...q];
        n[index].status = "uploading";
        return n;
      });

      await documentationAPI.upload(fd, {
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          setUploadQueue((q) => {
            const n = [...q];
            n[index].progress = percent;
            return n;
          });
        },
      });

      setUploadQueue((q) => {
        const n = [...q];
        n[index].status = "success";
        return n;
      });
    } catch {
      setUploadQueue((q) => {
        const n = [...q];
        n[index].status = "error";
        return n;
      });
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.unit_id) {
      toast("Pilih unit terlebih dahulu", "error");
      return;
    }
    await Promise.all(
      uploadQueue.map((item, i) => {
        if (item.status !== "success") return uploadSingle(item, i);
        return Promise.resolve();
      }),
    );
    setTimeout(() => fetchDocs(filterJenis), 500);
  };

  const retryUpload = (i) => uploadSingle(uploadQueue[i], i);

  // ================= OPTIONS =================
  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: p.nama_proyek,
  }));
  const clusterOptions = clusters.map((c) => ({
    value: c.id,
    label: c.nama_cluster,
  }));
  const unitOptions = units.map((u) => ({
    value: u.id,
    label: u.nomor_unit,
  }));
  const progressOptions = progresses.map((p) => ({
    value: p.id,
    label: `${p.tahap}${
      p.progress_percentage != null ? ` (${p.progress_percentage}%)` : ""
    }`,
  }));

  // ================= HELPERS =================
  const isVideo = (doc) =>
    doc.jenis === "video" ||
    (doc.nama_file && /\.(mp4|mov|avi|webm)$/i.test(doc.nama_file));

  const formatBytes = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Dokumentasi Lapangan
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Arsip foto dan video progres pembangunan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {["", "foto", "video"].map((j) => (
              <button
                key={j}
                onClick={() => setFilterJenis(j)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterJenis === j
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {j === "" ? "Semua" : j.charAt(0).toUpperCase() + j.slice(1)}
              </button>
            ))}
          </div>
          <button
            className="btn-primary whitespace-nowrap"
            onClick={() => setUploadModal(true)}
          >
            <Upload className="w-4 h-4 mr-1.5" /> Upload File
          </button>
        </div>
      </div>

      {/* DATA GRID */}
      {loading ? (
        <PageLoader />
      ) : docs.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Belum ada dokumentasi"
          description="Mulai unggah foto/video progres proyek Anda."
        />
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {docs.map((d) => (
            <div
              key={d.id}
              className="card overflow-hidden flex flex-col group cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => setPreviewDoc(d)}
            >
              <div className="aspect-video bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                {d.url ? (
                  isVideo(d) ? (
                    <>
                      <video
                        src={d.url}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow">
                          <Play
                            className="w-4 h-4 text-slate-800 ml-0.5"
                            fill="currentColor"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={d.url}
                      alt={d.nama_file || "Dokumentasi"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      isVideo(d)
                        ? "bg-rose-500 text-white"
                        : "bg-indigo-500 text-white"
                    }`}
                  >
                    {isVideo(d) ? "Video" : "Foto"}
                  </span>
                </div>
              </div>

              <div className="p-4 flex flex-col flex-1 gap-3">
                {d.unit && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Home className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                      Unit {d.unit.nomor_unit}
                    </span>
                  </div>
                )}

                {d.progress ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                          {d.progress.tahap}
                        </span>
                      </div>
                      {d.progress.progress_percentage != null && (
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {d.progress.progress_percentage}%
                        </span>
                      )}
                    </div>
                    {d.progress.progress_percentage != null && (
                      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{
                            width: `${d.progress.progress_percentage}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Tanpa progress</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-auto">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {formatDate(d.created_at)}
                  </p>
                  {d.ukuran_bytes > 0 && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {formatBytes(d.ukuran_bytes)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= PREVIEW MODAL ================= */}
      {previewDoc && (
        <Modal
          open={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          title={previewDoc.nama_file || "Preview"}
          size="lg"
        >
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center min-h-48">
              {isVideo(previewDoc) ? (
                <video
                  src={previewDoc.url}
                  controls
                  className="w-full max-h-96 object-contain"
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.nama_file}
                  className="w-full max-h-96 object-contain"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {previewDoc.unit && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Unit</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Unit {previewDoc.unit.nomor_unit}
                  </p>
                </div>
              )}
              {previewDoc.progress && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Progress Tahap</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {previewDoc.progress.tahap}
                  </p>
                  {previewDoc.progress.progress_percentage != null && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Progres</span>
                        <span className="font-bold text-indigo-500">
                          {previewDoc.progress.progress_percentage}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{
                            width: `${previewDoc.progress.progress_percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">Diunggah</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {formatDate(previewDoc.created_at)}
                </p>
              </div>
              {previewDoc.ukuran_bytes > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Ukuran File</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatBytes(previewDoc.ukuran_bytes)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL UPLOAD ================= */}
      <Modal
        open={uploadModal}
        onClose={() => setUploadModal(false)}
        title="Upload Dokumentasi"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Project</label>
              <Select
                value={uploadForm.project_id}
                onChange={(v) =>
                  setUploadForm((f) => ({
                    ...f,
                    project_id: v,
                    cluster_id: "",
                    unit_id: "",
                    progress_id: "",
                  }))
                }
                options={projectOptions}
                placeholder="Pilih Project"
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Cluster</label>
              <Select
                value={uploadForm.cluster_id}
                onChange={(v) =>
                  setUploadForm((f) => ({
                    ...f,
                    cluster_id: v,
                    unit_id: "",
                    progress_id: "",
                  }))
                }
                options={clusterOptions}
                placeholder="Pilih Cluster"
                disabled={!uploadForm.project_id}
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Unit</label>
              <Select
                value={uploadForm.unit_id}
                onChange={(v) =>
                  setUploadForm((f) => ({ ...f, unit_id: v, progress_id: "" }))
                }
                options={unitOptions}
                placeholder="Pilih Unit"
                disabled={!uploadForm.cluster_id}
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Progress Task</label>
              <Select
                value={uploadForm.progress_id}
                onChange={(v) =>
                  setUploadForm((f) => ({ ...f, progress_id: v }))
                }
                options={progressOptions}
                placeholder="Pilih Progress"
                disabled={!uploadForm.unit_id}
              />
            </div>
          </div>

          {/* Jenis */}
          <div className="space-y-1.5">
            <label className="label">Jenis File</label>
            <div className="flex gap-2">
              {["foto", "video"].map((j) => (
                <button
                  key={j}
                  onClick={() => setUploadForm((f) => ({ ...f, jenis: j }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    uploadForm.jenis === j
                      ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-400"
                      : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {j.charAt(0).toUpperCase() + j.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="label">Deskripsi Tambahan</label>
            <input
              className="input"
              placeholder="Contoh: Pemasangan atap blok A selesai"
              value={uploadForm.deskripsi}
              onChange={(e) =>
                setUploadForm((f) => ({ ...f, deskripsi: e.target.value }))
              }
            />
          </div>

          {/* DRAG & DROP */}
          <div
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/30 dark:hover:bg-slate-800/50 transition-colors p-8 rounded-2xl text-center cursor-pointer"
            onClick={() => document.getElementById("fileInput").click()}
          >
            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-200 dark:border-slate-700">
              <ImagePlus className="w-6 h-6 text-indigo-500" />
            </div>
            <p className="text-slate-900 dark:text-white font-medium mb-1">
              Klik untuk unggah atau tarik file kesini
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mendukung format JPG, PNG, atau MP4
            </p>
            <input
              type="file"
              multiple
              className="hidden"
              id="fileInput"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* UPLOAD QUEUE */}
          {uploadQueue.length > 0 && (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              <label className="label">
                Antrean File ({uploadQueue.length})
              </label>
              {uploadQueue.map((item, i) => (
                <div
                  key={i}
                  className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 rounded-xl flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-800">
                    {item.file.type.startsWith("image") ? (
                      <img
                        src={item.preview}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                    ) : item.file.type.startsWith("video") ? (
                      <video
                        src={item.preview}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {item.file.name}
                    </p>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-700 mt-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.status === "error"
                            ? "bg-rose-500"
                            : item.status === "success"
                              ? "bg-emerald-500"
                              : "bg-indigo-500"
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p
                        className={`text-[11px] font-medium uppercase tracking-wider ${
                          item.status === "error"
                            ? "text-rose-500"
                            : item.status === "success"
                              ? "text-emerald-500"
                              : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {item.status}
                      </p>
                      <span className="text-[11px] text-slate-500">
                        {item.progress}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === "error" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          retryUpload(i);
                        }}
                        className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg text-rose-500 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(i);
                      }}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button
              onClick={() => setUploadModal(false)}
              className="btn-secondary"
            >
              Tutup
            </button>
            <button
              onClick={handleUpload}
              className="btn-primary"
              disabled={uploadQueue.length === 0}
            >
              Mulai Upload
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
