import { useEffect, useState } from "react";
import {
  documentationAPI,
  unitsAPI,
  projectsAPI,
  clustersAPI,
  progressAPI,
} from "../../api/services";

import {
  PageLoader,
  EmptyState,
  Modal,
  Select,
} from "../../components/ui";
import { useToast } from "../../hooks/useToast"; // Pastikan path hook-nya benar
import { formatDate, extractError } from "../../utils/helpers";
import { Upload, FileText, X, RotateCcw, ImageIcon, ImagePlus } from "lucide-react";

export default function DocumentationPage() {
  const { toast } = useToast();

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [projects, setProjects] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [units, setUnits] = useState([]);
  const [progresses, setProgresses] = useState([]);

  const [uploadModal, setUploadModal] = useState(false);

  const [uploadForm, setUploadForm] = useState({
    project_id: "",
    cluster_id: "",
    unit_id: "",
    progress_id: "",
    jenis: "foto",
    deskripsi: "",
  });

  const [uploadQueue, setUploadQueue] = useState([]);

  // ================= LOAD =================
  useEffect(() => {
    const fetchDocs = async () => {
      setLoading(true);
      try {
        const res = await documentationAPI.list({});
        setDocs(res.data.data || []);
      } catch (err) {
        toast(extractError(err), "error");
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    unitsAPI
      .list({ cluster_id: uploadForm.cluster_id })
      .then((r) => setUnits(r.data.data || []));
  }, [uploadForm.cluster_id]);

  useEffect(() => {
    if (!uploadForm.unit_id) return;
    progressAPI
      .list({ unit_id: uploadForm.unit_id })
      .then((r) => setProgresses(r.data.data || []));
  }, [uploadForm.unit_id]);

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

  const handleUpload = () => {
    if (!uploadForm.unit_id) {
      toast("Pilih unit terlebih dahulu", "error");
      return;
    }

    uploadQueue.forEach((item, i) => {
      if (item.status !== "success") uploadSingle(item, i);
    });
  };

  const retryUpload = (i) => uploadSingle(uploadQueue[i], i);

  // ================= OPTIONS =================
  const projectOptions = projects.map((p) => ({ value: p.id, label: p.nama_proyek }));
  const clusterOptions = clusters.map((c) => ({ value: c.id, label: c.nama_cluster }));
  const unitOptions = units.map((u) => ({ value: u.id, label: u.nomor_unit }));
  const progressOptions = progresses.map((p) => ({ value: p.id, label: p.nama_progress }));

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Dokumentasi Lapangan</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Arsip foto dan video progres pembangunan</p>
        </div>
        <button className="btn-primary whitespace-nowrap" onClick={() => setUploadModal(true)}>
          <Upload className="w-4 h-4 mr-1.5" /> Upload File
        </button>
      </div>

      {/* DATA GRID */}
      {loading ? (
        <PageLoader />
      ) : docs.length === 0 ? (
        <EmptyState icon={ImageIcon} title="Belum ada dokumentasi" description="Mulai unggah foto/video progres proyek Anda." />
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {docs.map((d) => (
            <div key={d.id} className="card overflow-hidden flex flex-col">
              {/* Gambar / Media Placeholder */}
              <div className="aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
                 {/* Jika data dari backend punya URL gambar, bisa di render di sini pakai tag <img> */}
                 <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <div className="p-4 flex flex-col flex-1">
                <p className="text-slate-900 dark:text-white text-sm font-medium mb-3 line-clamp-2 flex-1">
                  {d.deskripsi || "Tanpa Deskripsi"}
                </p>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Diunggah {formatDate(d.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= MODAL UPLOAD ================= */}
      <Modal open={uploadModal} onClose={() => setUploadModal(false)} title="Upload Dokumentasi" size="lg">
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Project</label>
              <Select
                value={uploadForm.project_id}
                onChange={(v) => setUploadForm((f) => ({ ...f, project_id: v, cluster_id: "", unit_id: "", progress_id: "" }))}
                options={projectOptions}
                placeholder="Pilih Project"
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Cluster</label>
              <Select
                value={uploadForm.cluster_id}
                onChange={(v) => setUploadForm((f) => ({ ...f, cluster_id: v, unit_id: "", progress_id: "" }))}
                options={clusterOptions}
                placeholder="Pilih Cluster"
                disabled={!uploadForm.project_id}
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Unit</label>
              <Select
                value={uploadForm.unit_id}
                onChange={(v) => setUploadForm((f) => ({ ...f, unit_id: v, progress_id: "" }))}
                options={unitOptions}
                placeholder="Pilih Unit"
                disabled={!uploadForm.cluster_id}
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Progress Task</label>
              <Select
                value={uploadForm.progress_id}
                onChange={(v) => setUploadForm((f) => ({ ...f, progress_id: v }))}
                options={progressOptions}
                placeholder="Pilih Progress"
                disabled={!uploadForm.unit_id}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="label">Deskripsi Tambahan</label>
            <input 
              className="input" 
              placeholder="Contoh: Pemasangan atap blok A selesai"
              value={uploadForm.deskripsi}
              onChange={(e) => setUploadForm(f => ({ ...f, deskripsi: e.target.value }))}
            />
          </div>

          {/* DRAG & DROP AREA */}
          <div
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/30 dark:hover:bg-slate-800/50 transition-colors p-8 rounded-2xl text-center cursor-pointer"
            onClick={() => document.getElementById('fileInput').click()}
          >
            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-200 dark:border-slate-700">
               <ImagePlus className="w-6 h-6 text-indigo-500" />
            </div>
            <p className="text-slate-900 dark:text-white font-medium mb-1">Klik untuk unggah atau tarik file kesini</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Mendukung format JPG, PNG, atau MP4</p>
            <input type="file" multiple className="hidden" id="fileInput" onChange={(e) => handleFiles(e.target.files)} />
          </div>

          {/* UPLOAD QUEUE */}
          {uploadQueue.length > 0 && (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              <label className="label">Antrean File ({uploadQueue.length})</label>
              {uploadQueue.map((item, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 rounded-xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-800">
                    {item.file.type.startsWith("image") ? (
                      <img src={item.preview} alt="preview" className="w-full h-full object-cover" />
                    ) : item.file.type.startsWith("video") ? (
                      <video src={item.preview} className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.file.name}</p>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-700 mt-2 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${item.status === 'error' ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${item.progress}%` }} />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                       <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{item.status}</p>
                       <span className="text-[11px] text-slate-500">{item.progress}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === "error" && (
                      <button onClick={(e) => { e.stopPropagation(); retryUpload(i); }} className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg text-rose-500 transition-colors">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
             <button onClick={() => setUploadModal(false)} className="btn-secondary">Tutup</button>
             <button onClick={handleUpload} className="btn-primary" disabled={uploadQueue.length === 0}>
               Mulai Upload
             </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}