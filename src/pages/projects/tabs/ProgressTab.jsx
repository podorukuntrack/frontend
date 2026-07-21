import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  progressAPI,
  assignmentsAPI,
  timelinesAPI,
  documentationAPI,
} from "../../../api/services";
import { PageLoader, Modal, ProgressBar, Lightbox, Confirm } from "../../../components/ui";
import { useToast } from "../../../hooks/useToast";
import {
  formatDate,
  formatCurrency,
  extractError,
} from "../../../utils/helpers";
import { useAuth } from "../../../context/AuthContext";
import { CustomDatePicker } from "../../../components/ui";
import {
  Hammer,
  Receipt,
  Plus,
  Pencil,
  Calendar,
  CheckCircle,
  BarChart3,
  ImagePlus,
  X,
  FileImage,
  Trash2,
} from "lucide-react";

const EMPTY_BUILD_FORM = {
  tahap: "",
  progress_percentage: 0,
  tanggal_update: "",
  catatan: "",
};
const EMPTY_PAY_FORM = { jumlah_bayar: "", tanggal_bayar: "", catatan: "" };

export default function ProgressTab({ unit, assignment, onUpdate }) {
  const { isRole } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fisik (Pembangunan)
  const [historyFisik, setHistoryFisik] = useState([]);
  const [timelines, setTimelines] = useState([]);
  const [fisikPct, setFisikPct] = useState(0);

  // Dana (Pembayaran)
  const [historyDana, setHistoryDana] = useState([]);
  const [payPct, setPayPct] = useState(0);

  // Modals
  const [buildModal, setBuildModal] = useState({
    open: false,
    mode: "view",
    editId: null,
    originalPct: 0,
  });
  const [payModal, setPayModal] = useState({ open: false, mode: "view" });

  const [confirmBuildOpen, setConfirmBuildOpen] = useState(false);
  const [progressToDelete, setProgressToDelete] = useState(null);

  const [confirmDocOpen, setConfirmDocOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);

  const [confirmPayOpen, setConfirmPayOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  // Forms
  const [buildForm, setBuildForm] = useState(EMPTY_BUILD_FORM);
  const [payForm, setPayForm] = useState(EMPTY_PAY_FORM);
  const [payFiles, setPayFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  // Dokumentasi (foto/file progress)
  const [docFiles, setDocFiles] = useState([]); // File[] yang dipilih untuk diupload
  const [docsMap, setDocsMap] = useState({}); // { progressId: [doc, ...] }
  const fileInputRef = useRef(null);
  const payFileInputRef = useRef(null);

  // Lightbox
  const [lightbox, setLightbox] = useState(null); // { url, type: 'image'|'video', name }

  // Kalkulasi Dana
  const tipePembayaran = assignment?.pembayaran?.tipe;
  const isCashLunas = tipePembayaran === "cash_lunas";
  const isKpr = tipePembayaran === "kredit_kpr";
  const isCicil = tipePembayaran === "cash_cicil";
  const dp = assignment?.pembayaran?.dp || 0;
  const hargaTotal = assignment?.pembayaran?.harga_total || 0;
  const tenorBulan = assignment?.pembayaran?.tenor_bulan || 0;
  const targetTagihan = isKpr ? dp : hargaTotal;
  const kprAmount = isKpr ? Math.max(0, hargaTotal - dp) : 0;
  const totalDibayar = isKpr 
    ? Math.max(0, (assignment?.pembayaran?.total_dibayar || 0) - kprAmount) 
    : (assignment?.pembayaran?.total_dibayar || 0);
  const sisaTagihan = targetTagihan - totalDibayar;

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch everything in parallel
        const [rProg, rTime, rDocsRes, rPayRes] = await Promise.allSettled([
          progressAPI.list({ unitId: unit.id }),
          timelinesAPI.list({ unitId: unit.id }),
          documentationAPI.list({ unitId: unit.id }),
          assignment ? assignmentsAPI.getPayments(assignment.id) : Promise.resolve({ data: { data: [] } })
        ]);

        const filteredFisik = (rProg.status === 'fulfilled' ? rProg.value.data?.data || [] : [])
          .filter((p) => {
            const pid = p.unit_id ?? p.unitId;
            return pid && String(pid) === String(unit.id);
          })
          .sort(
            (x, y) =>
              new Date(y.tanggal_update || y.tanggalUpdate) -
              new Date(x.tanggal_update || x.tanggalUpdate),
          );

        const unitTimelines = (rTime.status === 'fulfilled' ? rTime.value.data?.data || [] : []).filter((t) => {
          const tid = t.unit_id ?? t.unitId;
          return tid && String(tid) === String(unit.id);
        });

        let dMap = {};
        if (rDocsRes.status === 'fulfilled') {
          const docs = rDocsRes.value.data?.data || [];
          docs.forEach((d) => {
            const pid = d.progressId || d.progress_id;
            if (pid) {
              if (!dMap[pid]) dMap[pid] = [];
              dMap[pid].push(d);
            }
          });
        }
        
        let fDana = rPayRes.status === 'fulfilled' ? rPayRes.value.data?.data || [] : [];
        let pPct = targetTagihan > 0 ? Math.min(100, (totalDibayar / targetTagihan) * 100) : 0;

        if (isMounted) {
          setHistoryFisik(filteredFisik);
          setTimelines(unitTimelines);
          setFisikPct(Number(unit.progress_percentage || 0));
          setHistoryDana(fDana);
          setPayPct(Math.min(pPct, 100));
          setDocsMap(dMap);
        }
      } catch (err) {
        if (isMounted) toast(extractError(err), "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [unit.id, assignment?.id, refreshKey]);

  // --- Handlers Pembangunan ---
  const handleOpenEditBuild = (p) => {
    const editId = p.id || p.progress_id;
    if (!editId) {
      toast("ID progress tidak ditemukan.", "error");
      return;
    }
    const pct = Number(p.progress_percentage || p.progressPercentage || 0);
    setBuildForm({
      tahap: p.tahap,
      progress_percentage: pct,
      tanggal_update:
        (p.tanggal_update || p.tanggalUpdate)?.split("T")[0] || "",
      catatan: p.catatan || "",
    });
    setBuildModal({ open: true, mode: "edit", editId, originalPct: pct });
  };

  const handleSaveBuild = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        unit_id: unit.id,
        tahap: buildForm.tahap,
        progress_percentage: Number(buildForm.progress_percentage),
        tanggal_update: buildForm.tanggal_update,
        catatan: buildForm.catatan,
      };

      let savedProgressId = buildModal.editId;
      if (buildModal.mode === "create") {
        const res = await progressAPI.create(payload);
        savedProgressId = res.data?.data?.id || res.data?.id;
        toast("Progress bangunan ditambahkan!", "success");
      } else {
        await progressAPI.update(buildModal.editId, payload);
        toast("Data progress diperbarui!", "success");
      }

      // Keep a copy of the docs to upload and the target IDs
      const docsToUpload = [...docFiles];
      const targetId = savedProgressId;
      const targetUnitId = unit.id;

      // Close modal immediately
      setBuildModal({ open: false, mode: "view", editId: null, originalPct: 0 });
      setDocFiles([]);
      setRefreshKey((prev) => prev + 1);
      if (onUpdate) onUpdate();

      // Upload dokumentasi di background jika ada file yang dipilih
      if (docsToUpload.length > 0 && targetId) {
        // Buat ID toast unik untuk proses upload ini
        const toastId = `upload-${Date.now()}`;
        toast({ title: "Mengunggah Dokumen", description: `Memulai unggahan ${docsToUpload.length} file...` }, "info", { id: toastId, progress: 0 });
        
        // Let it run asynchronously
        (async () => {
          let successCount = 0;
          for (let i = 0; i < docsToUpload.length; i++) {
            const file = docsToUpload[i];
            const fd = new FormData();
            fd.append("unitId", targetUnitId);
            fd.append("progressId", targetId);
            
            let jenis = "dokumen";
            if (file.type.startsWith("video/")) jenis = "video";
            else if (file.type.startsWith("image/")) jenis = "foto";
            fd.append("jenis", jenis);
            
            // PENTING: File harus di-append paling terakhir agar fastify-multipart bisa membaca text fields (unitId, dll) lebih dulu!
            fd.append("file", file);
            
            try {
              await documentationAPI.upload(fd, {
                onUploadProgress: (progressEvent) => {
                  const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                  // Hitung persentase total berdasarkan file ke-berapa
                  const totalPercent = Math.round(((i * 100) + percentCompleted) / docsToUpload.length);
                  toast(
                    { title: "Mengunggah Dokumen", description: `File ${i + 1} dari ${docsToUpload.length}: ${file.name}` }, 
                    "info", 
                    { id: toastId, progress: totalPercent }
                  );
                }
              });
              successCount++;
            } catch (docErr) {
              const errInfo = extractError(docErr);
              toast(`Gagal upload ${file.name}: ${errInfo.description || errInfo}`, "error");
            }
          }
          if (successCount > 0) {
            toast({ title: "Upload Selesai", description: `${successCount} dokumen berhasil diunggah` }, "success", { id: toastId }); // tanpa parameter progress, toast akan tertutup otomatis setelah 5 detik
            setRefreshKey((prev) => prev + 1);
          } else {
            toast({ title: "Upload Gagal", description: "Semua unggahan gagal diproses" }, "error", { id: toastId });
          }
        })();
      }

    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProgressClick = (progressId) => {
    setProgressToDelete(progressId);
    setConfirmBuildOpen(true);
  };

  const executeDeleteProgress = async () => {
    setConfirmBuildOpen(false);
    if (!progressToDelete) return;
    try {
      await progressAPI.delete(progressToDelete);
      toast("Progress berhasil dihapus", "success");
      setRefreshKey((prev) => prev + 1);
      if (onUpdate) onUpdate();
    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setProgressToDelete(null);
    }
  };

  // --- Handler Delete Dokumentasi ---
  const handleDeleteDocClick = (docId) => {
    setDocToDelete(docId);
    setConfirmDocOpen(true);
  };

  const executeDeleteDoc = async () => {
    setConfirmDocOpen(false);
    if (!docToDelete) return;
    try {
      await documentationAPI.delete(docToDelete);
      toast("Dokumen dihapus", "success");
      // Refresh docsMap
      const rDocs = await documentationAPI.list({ unitId: unit.id });
      const docs = rDocs.data?.data || [];
      const dMap = {};
      docs.forEach((d) => {
        const pid = d.progressId || d.progress_id;
        if (pid) {
          if (!dMap[pid]) dMap[pid] = [];
          dMap[pid].push(d);
        }
      });
      setDocsMap(dMap);
    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setDocToDelete(null);
    }
  };

  const handleDeletePaymentClick = (paymentId) => {
    if (paymentId === "lunas-auto") {
      toast("Pembayaran Cash Lunas otomatis terhapus jika Penugasannya dibatalkan. Silakan langsung ke Tab Assignment untuk Membatalkan Penugasan.", "info");
      return;
    }
    setPaymentToDelete(paymentId);
    setConfirmPayOpen(true);
  };

  const executeDeletePayment = async () => {
    setConfirmPayOpen(false);
    if (!paymentToDelete) return;
    try {
      await assignmentsAPI.deletePayment(assignment.id, paymentToDelete);
      toast("Pembayaran berhasil dihapus", "success");
      setRefreshKey((prev) => prev + 1);
      if (onUpdate) onUpdate();
    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setPaymentToDelete(null);
    }
  };

  // --- Handlers Pembayaran ---
  const handleOpenEditPayment = (p) => {
    setPayForm({
      jumlah_bayar: p.jumlah_bayar ? Number(p.jumlah_bayar) : 0,
      tanggal_bayar: p.tanggal_bayar?.split("T")[0] || "",
      catatan: p.catatan || "",
    });
    setPayModal({ open: true, mode: "edit", editId: p.id, oldAmount: Number(p.jumlah_bayar), existingUrl: p.bukti_pembayaran });
    setPayFiles([]);
  };

  const handleSavePay = async (e) => {
    e.preventDefault();

    if (payModal.mode === "create" && payFiles.length === 0) {
      toast("Bukti pembayaran (gambar) wajib diunggah", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        jumlah_bayar: Number(payForm.jumlah_bayar),
        tanggal_bayar: new Date(payForm.tanggal_bayar).toISOString(),
        catatan: payForm.catatan,
      };

      let savedPaymentId = payModal.editId;

      if (payModal.mode === "edit") {
        const diff = payload.jumlah_bayar - payModal.oldAmount;
        if (diff > sisaTagihan) {
          toast(`Gagal: Maksimal penambahan pembayaran adalah ${formatCurrency(sisaTagihan)}`, "error");
          setSaving(false);
          return;
        }
        await assignmentsAPI.updatePayment(assignment.id, payModal.editId, payload);
        toast("Pembayaran berhasil diperbarui", "success");
      } else {
        if (payload.jumlah_bayar > sisaTagihan) {
          toast(`Gagal: Maksimal pembayaran adalah ${formatCurrency(sisaTagihan)}`, "error");
          setSaving(false);
          return;
        }
        const res = await assignmentsAPI.createPayment(assignment.id, payload);
        savedPaymentId = res.data?.data?.id || res.data?.id; // Depends on backend response format
        toast("Pembayaran berhasil dicatat", "success");
      }

      setPayModal({ open: false, mode: "view" });
      const currentFiles = [...payFiles]; // clone files
      setPayFiles([]); // Reset files
      setRefreshKey((prev) => prev + 1);
      if (onUpdate) onUpdate(); // Sync parent data

      // Background Upload Process
      if (currentFiles.length > 0 && savedPaymentId) {
        const toastId = `upload-pay-${savedPaymentId}`;
        toast({ title: "Mengunggah Bukti Pembayaran", description: "Memulai unggahan..." }, "info", { id: toastId, progress: 0 });

        (async () => {
          try {
            let uploadedUrls = [];
            if (payModal.mode === "edit" && payModal.existingUrl) {
              // Note: the backend schema replaces the old URLs entirely. 
              // The UI tells the user that uploading new photos will replace existing ones.
              // So we don't need to append to old URLs if they uploaded new ones.
            }

            for (let i = 0; i < currentFiles.length; i++) {
              const file = currentFiles[i];
              const fd = new FormData();
              fd.append("unitId", unit.id);
              fd.append("jenis", "foto");
              fd.append("file", file);

              const rDocs = await documentationAPI.upload(fd, {
                onUploadProgress: (progressEvent) => {
                  const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                  const overallProgress = Math.round(((i * 100) + percentCompleted) / currentFiles.length);
                  toast(
                    { title: "Mengunggah Bukti Pembayaran", description: `Mengunggah ${i + 1} dari ${currentFiles.length}...` },
                    "info",
                    { id: toastId, progress: overallProgress }
                  );
                }
              });
              
              const url = rDocs.data?.data?.url || rDocs.data?.data?.fileUrl || rDocs.data?.fileUrl;
              if (url) uploadedUrls.push(url);
            }

            if (uploadedUrls.length > 0) {
              await assignmentsAPI.updatePayment(assignment.id, savedPaymentId, {
                bukti_pembayaran: uploadedUrls
              });
              toast({ title: "Upload Selesai", description: "Semua bukti pembayaran berhasil diunggah" }, "success", { id: toastId });
              setRefreshKey((prev) => prev + 1);
            }
          } catch (uploadErr) {
            toast({ title: "Upload Gagal", description: extractError(uploadErr) }, "error", { id: toastId });
          }
        })();
      }
    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  const selectedTahap = buildForm.tahap;
  const otherFisikForSelectedTahap = historyFisik.filter(
    (p) => p.tahap === selectedTahap &&
           (buildModal.mode === "edit" ? String(p.id || p.progress_id) !== String(buildModal.editId) : true)
  );
  const baseTahapPctExcludingEdit = otherFisikForSelectedTahap.reduce(
    (acc, curr) => acc + Number(curr.progress_percentage || curr.progressPercentage || 0),
    0
  );
  const maxSisa = selectedTahap ? Math.max(0, 100 - baseTahapPctExcludingEdit) : 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
        <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          Progress & Dokumentasi
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KOLOM FISIK */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-between items-center">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Hammer className="w-4 h-4 text-slate-400" /> Fisik (Pembangunan)
            </h4>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">
              {fisikPct}%
            </span>
          </div>
          <ProgressBar
            value={fisikPct}
            className="!bg-slate-100 dark:!bg-slate-700 h-1.5 rounded-none"
          />

          <div className="p-4 flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto max-h-[350px] pr-2 space-y-3 custom-scrollbar mb-4">
              {historyFisik.length === 0 ? (
                <p className="text-center py-6 text-sm text-slate-500">
                  Belum ada riwayat pembangunan.
                </p>
              ) : (
                historyFisik.map((p, idx) => {
                  const pct = Number(
                    p.progress_percentage || p.progressPercentage || 0,
                  );
                  return (
                    <div
                      key={p.id || idx}
                      className="p-3 border border-slate-100 dark:border-slate-700 rounded-xl relative group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h5 className="font-bold text-slate-800 dark:text-slate-100">
                          {p.tahap}
                        </h5>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="badge bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                            +{pct}%
                          </span>
                          {isRole('admin') && (
                            <>
                              <button
                                onClick={() => handleOpenEditBuild(p)}
                                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 bg-white dark:bg-slate-800 border border-slate-200 dark:bg-slate-600"
                                title="Edit"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteProgressClick(p.id || p.progress_id)}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 bg-white dark:bg-slate-800 border border-slate-200 dark:bg-slate-600"
                                title="Hapus"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center text-xs text-slate-500 gap-1.5 mb-2">
                        <Calendar className="w-3.5 h-3.5" />{" "}
                        {formatDate(p.tanggal_update || p.tanggalUpdate)}
                      </div>
                      {p.catatan && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                          {p.catatan}
                        </p>
                      )}
                      {/* Dokumentasi foto terlampir */}
                      {(() => {
                        const pid = p.id || p.progress_id;
                        const docs = docsMap[pid] || [];
                        if (docs.length === 0) return null;
                        return (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                            <p className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
                              <FileImage className="w-3 h-3" /> {docs.length} Foto/Dokumen
                            </p>
                            <div className="grid grid-cols-3 gap-1.5">
                              {docs.map((d) => {
                                const url = d.url || d.fileUrl;
                                const isVideo = d.jenis === 'video' || url?.match(/\.(mp4|webm|mov|avi)$/i);
                                // Cek jenis='foto' ATAU ekstensi gambar di URL
                                const isImage = !isVideo && (d.jenis === 'foto' || d.jenis === 'foto_360' || url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                                return (
                                  <div key={d.id} className="relative group/media">
                                    <button
                                      type="button"
                                      onClick={() => setLightbox({ url, type: isVideo ? 'video' : isImage ? 'image' : 'file', name: d.nama_file || d.namaFile })}
                                      className="block w-full aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 hover:ring-2 hover:ring-indigo-400 transition-all"
                                      title={d.nama_file || d.namaFile}
                                    >
                                      {isImage ? (
                                        <img src={url} alt={d.nama_file} className="w-full h-full object-cover" />
                                      ) : isVideo ? (
                                        <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center gap-1">
                                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                          <span className="text-[10px] text-slate-300">VIDEO</span>
                                        </div>
                                      ) : (
                                        <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                          <FileImage className="w-6 h-6 text-slate-400" />
                                        </div>
                                      )}
                                    </button>
                                    {isRole('admin') && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteDocClick(d.id)}
                                        className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center"
                                        title="Hapus"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })
              )}
            </div>

            {isRole('admin') && fisikPct < 100 && (
              <button
                className="btn-primary w-full mt-auto"
                onClick={() => {
                  setBuildForm({
                    ...EMPTY_BUILD_FORM,
                    tanggal_update: new Date().toISOString().split("T")[0],
                  });
                  setBuildModal({
                    open: true,
                    mode: "create",
                    editId: null,
                    originalPct: 0,
                  });
                }}
              >
                <Plus className="w-4 h-4 mr-1.5" /> Tambah Tahap Pembangunan
              </button>
            )}
          </div>
        </div>

        {/* KOLOM DANA */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-between items-center">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-400" /> Dana (Pembayaran)
            </h4>
            <span
              className={`font-bold text-lg ${sisaTagihan <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
            >
              {parseFloat(payPct.toFixed(2))}%
            </span>
          </div>
          <ProgressBar
            value={payPct}
            className="!bg-slate-100 dark:!bg-slate-700 h-1.5 rounded-none"
          />

          <div className="p-4 flex-1 flex flex-col">
            {isCicil ? (
              <div className="flex flex-col mb-4">
                <div className="bg-slate-100/80 dark:bg-slate-800/50 p-3.5 px-4 rounded-t-xl border border-b-0 border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <p className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Harga Keseluruhan Rumah</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(hargaTotal)}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border-x border-slate-200 dark:border-slate-700 p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <p className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Tenor</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{tenorBulan} Bulan</p>
                </div>
                <div className={`p-4 rounded-b-xl flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 border ${sisaTagihan <= 0 ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" : "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700"}`}>
                  <div className="flex-1">
                    <p className={`text-xs mb-0.5 uppercase tracking-wider font-bold ${sisaTagihan <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"}`}>Sudah Dibayar</p>
                    <p className={`text-base font-bold ${sisaTagihan <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-emerald-600"}`}>{formatCurrency(totalDibayar)}</p>
                  </div>
                  <div className="flex-1 sm:text-right">
                    <p className={`text-xs mb-0.5 uppercase tracking-wider font-bold ${sisaTagihan <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"}`}>{sisaTagihan <= 0 ? "Status" : "Sisa Pembayaran"}</p>
                    {sisaTagihan <= 0 ? (
                      <p className="text-base font-bold flex items-center sm:justify-end gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-4 h-4" /> LUNAS</p>
                    ) : (
                      <p className="text-base font-bold text-slate-800 dark:text-slate-100">{formatCurrency(sisaTagihan)}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : isKpr ? (
              <div className="flex flex-col mb-4">
                <div className="bg-slate-100/80 dark:bg-slate-800/50 p-3.5 px-4 rounded-t-xl border border-b-0 border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <p className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Harga Keseluruhan Rumah</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(hargaTotal)}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border-x border-slate-200 dark:border-slate-700 p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <p className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Target DP</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(targetTagihan)}</p>
                </div>
                <div className={`p-4 rounded-b-xl flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 border ${sisaTagihan <= 0 ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" : "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700"}`}>
                  <div className="flex-1">
                    <p className={`text-xs mb-0.5 uppercase tracking-wider font-bold ${sisaTagihan <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"}`}>DP Dibayar</p>
                    <p className={`text-base font-bold ${sisaTagihan <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-emerald-600"}`}>{formatCurrency(totalDibayar)}</p>
                  </div>
                  <div className="flex-1 sm:text-right">
                    <p className={`text-xs mb-0.5 uppercase tracking-wider font-bold ${sisaTagihan <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"}`}>{sisaTagihan <= 0 ? "Status DP" : "Sisa DP"}</p>
                    {sisaTagihan <= 0 ? (
                      <p className="text-base font-bold flex items-center sm:justify-end gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-4 h-4" /> LUNAS</p>
                    ) : (
                      <p className="text-base font-bold text-slate-800 dark:text-slate-100">{formatCurrency(sisaTagihan)}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col mb-4">
                <div className="bg-slate-100/80 dark:bg-slate-800/50 p-3.5 px-4 rounded-t-xl border border-b-0 border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <p className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Harga Keseluruhan Rumah</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(hargaTotal)}</p>
                </div>
                <div className={`p-4 rounded-b-xl flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 border ${sisaTagihan <= 0 ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" : "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700"}`}>
                  <div className="flex-1">
                    <p className={`text-xs mb-0.5 uppercase tracking-wider font-bold ${sisaTagihan <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"}`}>Sudah Dibayar</p>
                    <p className={`text-base font-bold ${sisaTagihan <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-emerald-600"}`}>{formatCurrency(totalDibayar)}</p>
                  </div>
                  <div className="flex-1 sm:text-right">
                    <p className={`text-xs mb-0.5 uppercase tracking-wider font-bold ${sisaTagihan <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"}`}>{sisaTagihan <= 0 ? "Status" : "Sisa Pembayaran"}</p>
                    {sisaTagihan <= 0 ? (
                      <p className="text-base font-bold flex items-center sm:justify-end gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-4 h-4" /> LUNAS</p>
                    ) : (
                      <p className="text-base font-bold text-slate-800 dark:text-slate-100">{formatCurrency(sisaTagihan)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto max-h-[250px] pr-2 space-y-3 custom-scrollbar mb-4">
              {historyDana.length === 0 ? (
                <p className="text-center py-6 text-sm text-slate-500">
                  Belum ada riwayat pembayaran.
                </p>
              ) : (
                historyDana.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="p-3 border border-slate-100 dark:border-slate-700 rounded-xl relative group"
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-slate-900 dark:text-white text-base">
                        {formatCurrency(p.jumlah_bayar)}
                      </p>
                      {isRole('admin') && (
                         <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button
                             onClick={() => handleOpenEditPayment(p)}
                             className="p-1 rounded-md text-slate-400 hover:text-indigo-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600"
                             title="Edit Pembayaran"
                           >
                             <Pencil className="w-3 h-3" />
                           </button>
                           <button
                             onClick={() => handleDeletePaymentClick(p.id)}
                             className="p-1 rounded-md text-slate-400 hover:text-rose-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600"
                             title="Hapus Pembayaran"
                           >
                             <Trash2 className="w-3 h-3" />
                           </button>
                         </div>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-slate-500 mt-1 gap-2">
                      <span>
                        <Calendar className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                        {formatDate(p.tanggal_bayar)}
                      </span>
                      <span>•</span>
                      <span>Oleh: {p.dicatat_oleh || "Sistem"}</span>
                    </div>
                    {p.catatan && (
                      <p
                        className={`text-xs mt-2 p-2 rounded-lg italic ${isCashLunas ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30" : "bg-slate-50 text-slate-600 dark:bg-slate-800/50"}`}
                      >
                        "{p.catatan}"
                      </p>
                    )}
                    {p.bukti_pembayaran && (() => {
                      let urls = [];
                      try {
                        urls = JSON.parse(p.bukti_pembayaran);
                        if (!Array.isArray(urls)) urls = [p.bukti_pembayaran];
                      } catch {
                        urls = [p.bukti_pembayaran];
                      }
                      
                      return (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {urls.map((url, i) => (
                            <button 
                              key={i}
                              onClick={() => setLightbox({ url, type: 'image', name: 'Bukti Pembayaran' })}
                              className="text-xs text-indigo-600 flex flex-col items-center justify-center gap-1 hover:bg-indigo-100 p-2 rounded bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 transition-colors"
                            >
                              <FileImage className="w-5 h-5" />
                              <span>Lihat Bukti {urls.length > 1 ? i + 1 : ''}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ))
              )}
            </div>

            {isRole('admin') &&
              sisaTagihan > 0 && (
                <button
                  className="btn-primary !bg-emerald-600 hover:!bg-emerald-700 w-full mt-auto"
                  onClick={() => {
                    setPayForm({
                      ...EMPTY_PAY_FORM,
                      tanggal_bayar: new Date().toISOString().split("T")[0],
                    });
                    setPayModal({ open: true, mode: "create" });
                  }}
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Catat Pembayaran
                </button>
              )}
          </div>
        </div>
      </div>

      {/* MODAL FISIK */}
      <Modal
        open={buildModal.open}
        onClose={() => {
          setBuildModal({ open: false, mode: "view" });
          setDocFiles([]);
        }}
        title={`Fisik: Unit ${unit.nomor_unit}`}
        size="xl"
      >
        <form onSubmit={handleSaveBuild} className="flex flex-col gap-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300 p-3 rounded-lg text-sm border border-indigo-200 dark:border-indigo-800/50">
            {buildModal.mode === "edit" ? (
              <>
                Tahap ini sudah memiliki progress{" "}
                <strong>{baseTahapPctExcludingEdit}%</strong>. Nilai entri ini dapat
                diubah antara <strong>0% — {maxSisa}%</strong>.
              </>
            ) : (
              <>
                {selectedTahap ? (
                  <>
                    Tahap <strong>{selectedTahap}</strong> sudah mencapai <strong>{baseTahapPctExcludingEdit}%</strong>. Anda
                    dapat menambah hingga <strong>{maxSisa}%</strong> pada tahap ini.
                  </>
                ) : (
                  <>Silakan pilih tahap pembangunan terlebih dahulu.</>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Inputs */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-1.5">
                <label className="label">Nama Tahap Pengerjaan</label>
                <select
                  className="input"
                  required
                  value={buildForm.tahap}
                  onChange={(e) => {
                    const newTahap = e.target.value;
                    setBuildForm((f) => ({ ...f, tahap: newTahap, progress_percentage: 0 }));
                  }}
                >
                  <option value="">-- Pilih Timeline --</option>
                  {timelines
                    .filter((t) => {
                      if (buildModal.mode === "edit" && buildForm.tahap === t.taskName) return true;
                      return !historyFisik.some((p) => p.tahap === t.taskName);
                    })
                    .map((t) => (
                      <option key={t.id} value={t.taskName}>
                        {t.taskName}
                      </option>
                  ))}
                </select>
                {timelines.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Buat Timeline dulu di tab sebelah sebelum mengisi progress.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="label">
                  Persentase Tahap Ini{" "}
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    +{buildForm.progress_percentage}%
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max={maxSisa}
                  step="1"
                  className="w-full accent-indigo-600"
                  value={buildForm.progress_percentage}
                  onChange={(e) =>
                    setBuildForm((f) => ({
                      ...f,
                      progress_percentage: Number(e.target.value),
                    }))
                  }
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>0%</span>
                  <span>{maxSisa}%</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">Tanggal Laporan</label>
                <div className="z-[100]">
                  <CustomDatePicker 
                    value={buildForm.tanggal_update} 
                    onChange={v => setBuildForm((f) => ({ ...f, tanggal_update: v }))} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">Catatan Lapangan</label>
                <textarea
                  className="input min-h-[80px]"
                  value={buildForm.catatan}
                  onChange={(e) =>
                    setBuildForm((f) => ({ ...f, catatan: e.target.value }))
                  }
                  placeholder="Opsional"
                />
              </div>
            </div>

            {/* Right Column: UPLOAD & KELOLA DOKUMENTASI */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-2">
                <label className="label flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-indigo-500" />
                  Foto Lapangan{" "}
                  <span className="text-slate-400 font-normal text-xs">(opsional, multiple)</span>
                </label>

                {/* Existing docs in edit mode */}
                {buildModal.mode === "edit" && (() => {
                  const existingDocs = docsMap[buildModal.editId] || [];
                  if (existingDocs.length === 0) return (
                    <p className="text-xs text-slate-400 italic">Belum ada foto terlampir.</p>
                  );
                  return (
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {existingDocs.map((d) => {
                        const url = d.url || d.fileUrl;
                        const isVideo = d.jenis === 'video' || url?.match(/\.(mp4|webm|mov|avi)$/i);
                        const isImage = !isVideo && url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        return (
                          <div key={d.id} className="relative group/doc">
                            <button
                              type="button"
                              onClick={() => setLightbox({ url, type: isVideo ? 'video' : isImage ? 'image' : 'file', name: d.nama_file || d.namaFile })}
                              className="block w-full aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 hover:ring-2 hover:ring-indigo-400 transition-all"
                            >
                              {isImage ? (
                                <img src={url} alt={d.nama_file} className="w-full h-full object-cover" />
                              ) : isVideo ? (
                                <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center gap-1">
                                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                  <span className="text-[10px] text-slate-300">VIDEO</span>
                                </div>
                              ) : (
                                <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                  <FileImage className="w-6 h-6 text-slate-400" />
                                </div>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocClick(d.id)}
                              className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full opacity-0 group-hover/doc:opacity-100 transition-opacity flex items-center justify-center"
                              title="Hapus"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <div
                  className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-4 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dropped = Array.from(e.dataTransfer.files);
                    setDocFiles((prev) => [...prev, ...dropped]);
                  }}
                >
                  <ImagePlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Klik atau drag & drop gambar di sini</p>
                  <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WEBP, GIF...</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files);
                    setDocFiles((prev) => [...prev, ...selected]);
                    e.target.value = "";
                  }}
                />
                {docFiles.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {docFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileImage className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
                          <span className="text-xs text-slate-400 shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button
                          type="button"
                          className="ml-2 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                          onClick={() => setDocFiles((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 mt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving
                ? "Menyimpan..."
                : buildModal.mode === "edit"
                  ? "Perbarui Progress"
                  : "Simpan Progress"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL PEMBAYARAN */}
      <Modal
        open={payModal.open}
        onClose={() => setPayModal({ open: false, mode: "view" })}
        title={payModal.mode === "edit" ? `Edit Pembayaran` : `Catat Pembayaran: Unit ${unit.nomor_unit}`}
      >
        <form onSubmit={handleSavePay} className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-3 rounded-lg text-sm border border-amber-200 dark:border-amber-800/50 mb-4">
            {payModal.mode === "edit" ? (
              <>Maksimal tagihan yang bisa ditambahkan dari nominal sekarang adalah <strong>{formatCurrency(sisaTagihan)}</strong>.</>
            ) : (
              <>Sisa tagihan yang harus dilunasi adalah <strong>{formatCurrency(sisaTagihan)}</strong>. Anda tidak dapat menginput melebihi nominal ini.</>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="label">Jumlah Nominal Transfer/Cash (Rp)</label>
            <input
              type="text"
              required
              className="input"
              placeholder="0"
              value={!payForm.jumlah_bayar ? '' : payForm.jumlah_bayar.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/[^0-9]/g, '');
                let numValue = rawValue ? Number(rawValue) : '';
                if (numValue !== '') {
                  const maxAllowed = payModal.mode === "edit" ? payModal.oldAmount + sisaTagihan : sisaTagihan;
                  if (numValue > maxAllowed) numValue = maxAllowed;
                }
                setPayForm((f) => ({ ...f, jumlah_bayar: numValue }));
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="label">Tanggal Transaksi</label>
            <div className="z-[100]">
              <CustomDatePicker 
                value={payForm.tanggal_bayar} 
                onChange={v => setPayForm((f) => ({ ...f, tanggal_bayar: v }))} 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="label">Keterangan / Berita Acara</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="Misal: Cicilan ke-3 via BCA..."
              value={payForm.catatan}
              onChange={(e) =>
                setPayForm((f) => ({ ...f, catatan: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <label className="label">Bukti Pembayaran (Gambar) {payModal.mode === "create" && <span className="text-rose-500">*</span>}</label>
            {payModal.mode === "edit" && payModal.existingUrl && (() => {
              let existingUrls = [];
              try {
                existingUrls = JSON.parse(payModal.existingUrl);
                if (!Array.isArray(existingUrls)) existingUrls = [payModal.existingUrl];
              } catch {
                existingUrls = [payModal.existingUrl];
              }
              return (
                <div className="mb-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 mb-2">Bukti Pembayaran Saat Ini:</p>
                  <div className="flex flex-wrap gap-2">
                    {existingUrls.map((url, i) => (
                      <img 
                        key={i}
                        src={url} 
                        alt={`Bukti ${i+1}`} 
                        className="h-20 w-20 rounded border border-slate-300 dark:border-slate-600 object-cover cursor-pointer hover:ring-2 hover:ring-indigo-400"
                        onClick={() => setLightbox({ url, type: 'image', name: `Bukti Pembayaran ${i+1}` })}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 italic">
                    *Mengunggah foto baru di bawah ini akan mengganti semua foto yang ada sebelumnya.
                  </p>
                </div>
              );
            })()}
            
            <div
              className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-4 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors cursor-pointer"
              onClick={() => payFileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = Array.from(e.dataTransfer.files);
                setPayFiles((prev) => [...prev, ...dropped]);
              }}
            >
              <ImagePlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Klik atau drag & drop gambar di sini</p>
              <p className="text-xs text-slate-400 mt-0.5">Mendukung multiple files</p>
            </div>
            
            <input
              type="file"
              multiple
              ref={payFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const selected = Array.from(e.target.files);
                setPayFiles((prev) => [...prev, ...selected]);
                e.target.value = "";
              }}
            />
            {payFiles.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 mt-2">
                {payFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileImage className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
                      <span className="text-xs text-slate-400 shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button
                      type="button"
                      className="ml-2 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                      onClick={() => setPayFiles((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="btn-primary !bg-emerald-600 hover:!bg-emerald-700"
              disabled={saving}
            >
              {saving ? "Menyimpan..." : "Simpan Transaksi"}
            </button>
          </div>
        </form>
      </Modal>

      {/* LIGHTBOX */}
      <Lightbox item={lightbox} onClose={() => setLightbox(null)} />

      <Confirm
        open={confirmBuildOpen}
        onClose={() => setConfirmBuildOpen(false)}
        onConfirm={executeDeleteProgress}
        title="Hapus Progress"
        description="Apakah Anda yakin ingin menghapus progress fisik ini?"
      />
      <Confirm
        open={confirmDocOpen}
        onClose={() => setConfirmDocOpen(false)}
        onConfirm={executeDeleteDoc}
        title="Hapus Dokumen"
        description="Apakah Anda yakin ingin menghapus foto/dokumen ini?"
      />
      <Confirm
        open={confirmPayOpen}
        onClose={() => setConfirmPayOpen(false)}
        onConfirm={executeDeletePayment}
        title="Hapus Pembayaran"
        description="Apakah Anda yakin ingin menghapus riwayat pembayaran ini? Saldo total dibayar akan disesuaikan kembali."
      />
    </div>
  );
}

