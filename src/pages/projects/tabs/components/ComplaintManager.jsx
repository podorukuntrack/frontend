import { useState, useEffect, useRef } from 'react';
import { retentionsAPI, documentationAPI } from '../../../../api/services';
import { Modal, Confirm, Lightbox } from '../../../../components/ui';
import { useToast } from '../../../../hooks/useToast';
import { extractError, formatDate } from '../../../../utils/helpers';
import { Plus, Pencil, Trash2, Camera, CheckCircle, Image as ImageIcon, Wrench, AlertCircle, X, ImagePlus, FileImage } from 'lucide-react';

export default function ComplaintManager({ retention, isRole, unitId }) {
  const { toast } = useToast();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [confirmPhoto, setConfirmPhoto] = useState({ open: false, complaintId: null, type: null, url: null });
  
  const [form, setForm] = useState({ description: '', status: 'pending', photoBeforeUrls: [], photoAfterUrls: [] });
  const [photoBeforeFiles, setPhotoBeforeFiles] = useState([]);
  const [photoAfterFiles, setPhotoAfterFiles] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  
  const fileInputBeforeRef = useRef(null);
  const fileInputAfterRef = useRef(null);


  const loadComplaints = async () => {
    setLoading(true);
    try {
      const res = await retentionsAPI.getComplaints(retention.id);
      setComplaints(res.data?.data || []);
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retention.id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isCreate = modal.mode === 'create';
      if (isCreate && photoBeforeFiles.length === 0) {
        throw new Error('Foto keluhan (sebelum) wajib diunggah minimal 1 untuk keluhan baru.');
      }

      const payload = {
        description: form.description || null,
        photoBeforeUrls: form.photoBeforeUrls || [],
        photoAfterUrls: form.photoAfterUrls || [],
        status: form.status,
      };

      let savedComplaint;
      if (isCreate) {
        const res = await retentionsAPI.addComplaint(retention.id, payload);
        savedComplaint = res.data?.data;
        toast('Keluhan berhasil dicatat, memulai unggahan foto...', 'success');
      } else {
        const res = await retentionsAPI.updateComplaint(retention.id, modal.data.id, payload);
        savedComplaint = res.data?.data;
        toast('Keluhan diperbarui, memulai unggahan foto...', 'success');
      }

      const complaintId = savedComplaint?.id || modal.data?.id;

      // Close modal immediately and let it run in background
      setModal({ open: false, mode: 'create', data: null });
      setPhotoBeforeFiles([]);
      setPhotoAfterFiles([]);
      loadComplaints();

      const filesToUpload = [
        ...photoBeforeFiles.map(f => ({ file: f, type: 'before' })),
        ...photoAfterFiles.map(f => ({ file: f, type: 'after' }))
      ];

      if (filesToUpload.length > 0 && complaintId) {
        const toastId = `upload-comp-${Date.now()}`;
        toast({ title: "Mengunggah Foto", description: `Memulai unggahan ${filesToUpload.length} file...` }, "info", { id: toastId, progress: 0 });
        
        (async () => {
          let successCount = 0;
          let currentBeforeUrls = [...payload.photoBeforeUrls];
          let currentAfterUrls = [...payload.photoAfterUrls];

          for (let i = 0; i < filesToUpload.length; i++) {
            const { file, type } = filesToUpload[i];
            const fd = new FormData();
            fd.append("unitId", unitId);
            fd.append("jenis", "retention");
            fd.append("file", file); // Appended last

            try {
              const uploadRes = await documentationAPI.upload(fd, {
                onUploadProgress: (progressEvent) => {
                  const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                  const totalPercent = Math.round(((i * 100) + percentCompleted) / filesToUpload.length);
                  toast(
                    { title: "Mengunggah Foto", description: `File ${i + 1} dari ${filesToUpload.length}` }, 
                    "info", 
                    { id: toastId, progress: totalPercent }
                  );
                }
              });
              
              const url = uploadRes.data?.data?.url || uploadRes.data?.data?.fileUrl;
              if (url) {
                if (type === 'before') currentBeforeUrls.push(url);
                if (type === 'after') currentAfterUrls.push(url);
                successCount++;
              }
            } catch (err) {
              const errInfo = extractError(err);
              toast(`Gagal upload file ke-${i+1}: ${errInfo.description || errInfo}`, "error");
            }
          }

          // Final update to attach URLs
          if (successCount > 0) {
            await retentionsAPI.updateComplaint(retention.id, complaintId, {
              ...payload,
              photoBeforeUrls: currentBeforeUrls,
              photoAfterUrls: currentAfterUrls
            });
            toast({ title: "Upload Selesai", description: `${successCount} foto berhasil diunggah` }, "success", { id: toastId });
            loadComplaints();
          } else {
            toast({ title: "Upload Gagal", description: "Semua unggahan foto gagal diproses" }, "error", { id: toastId });
          }
        })();
      }

    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhotoClick = (complaintId, type, urlToRemove) => {
    setConfirmPhoto({ open: true, complaintId, type, url: urlToRemove });
  };

  const executeDeletePhoto = async () => {
    const { complaintId, type, url: urlToRemove } = confirmPhoto;
    setConfirmPhoto({ open: false, complaintId: null, type: null, url: null });
    
    const comp = complaints.find(c => c.id === complaintId);
    if (!comp) return;

    try {
      let payload = {
        description: comp.description,
        status: comp.status,
        photoBeforeUrls: comp.photo_before_urls ?? comp.photoBeforeUrls ?? [],
        photoAfterUrls: comp.photo_after_urls ?? comp.photoAfterUrls ?? []
      };

      if (type === 'before') {
        payload.photoBeforeUrls = payload.photoBeforeUrls.filter(u => u !== urlToRemove);
      } else {
        payload.photoAfterUrls = payload.photoAfterUrls.filter(u => u !== urlToRemove);
      }

      await retentionsAPI.updateComplaint(retention.id, complaintId, payload);
      toast('Foto berhasil dihapus', 'success');
      if (modal.open && modal.data?.id === complaintId) {
        if (type === 'before') {
          setForm(prev => ({ ...prev, photoBeforeUrls: prev.photoBeforeUrls.filter(u => u !== urlToRemove) }));
        } else {
          setForm(prev => ({ ...prev, photoAfterUrls: prev.photoAfterUrls.filter(u => u !== urlToRemove) }));
        }
      }
      loadComplaints();
    } catch (err) {
      toast(extractError(err), 'error');
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await retentionsAPI.deleteComplaint(retention.id, confirm.id);
      toast('Keluhan berhasil dihapus', 'success');
      setConfirm({ open: false, id: null });
      loadComplaints();
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setForm({ description: '', status: 'pending', photoBeforeUrls: [], photoAfterUrls: [] });
    setPhotoBeforeFiles([]);
    setPhotoAfterFiles([]);
    setModal({ open: true, mode: 'create', data: null });
  };

  const openEdit = (c) => {
    setForm({
      description: c.description || '',
      status: c.status || 'pending',
      photoBeforeUrls: c.photo_before_urls ?? c.photoBeforeUrls ?? [],
      photoAfterUrls: c.photo_after_urls ?? c.photoAfterUrls ?? [],
    });
    setPhotoBeforeFiles([]);
    setPhotoAfterFiles([]);
    setModal({ open: true, mode: 'edit', data: c });
  };

  return (
    <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-5">
      <div className="flex items-center justify-between mb-4">
        <h5 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-rose-500" /> Riwayat Keluhan & Perbaikan
        </h5>
        {isRole('admin') && (
          <button onClick={openCreate} className="btn-secondary text-xs px-3 py-1.5 h-auto border border-slate-200">
            <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Keluhan
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-6 text-slate-400 text-sm animate-pulse">Memuat data keluhan...</div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-sm">
          Belum ada data keluhan yang dicatat pada masa garansi ini.
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map(c => (
            <div key={c.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${
                    c.status === 'resolved' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {c.status === 'resolved' ? 'Selesai Diperbaiki' : 'Menunggu Perbaikan'}
                  </span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {c.description || <span className="italic text-slate-400">Tanpa deskripsi</span>}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Dicatat pada: {formatDate(c.created_at ?? c.createdAt)}</p>
                </div>
                <div className="flex gap-1 shrink-0 ml-4">
                  {isRole('admin') && (
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isRole('admin') && (
                    <button onClick={() => setConfirm({ open: true, id: c.id })} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                {((c.photo_before_urls ?? c.photoBeforeUrls)?.length > 0) ? (
                  <div>
                    <span className="font-semibold block mb-1.5 text-[10px] uppercase tracking-wide text-slate-500">Foto Keluhan ({Math.max(c.photo_before_urls?.length || 0, c.photoBeforeUrls?.length || 0)})</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(c.photo_before_urls ?? c.photoBeforeUrls).map((url, i) => (
                        <div key={i} className="relative group/media">
                          <button type="button" onClick={() => setLightbox({ url, type: 'image', name: `Foto Keluhan ${i+1}` })} className="block aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-black/5 w-full text-left">
                            <img src={url} alt={`Before ${i+1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                          </button>
                          {isRole('admin') && (
                            <button
                              type="button"
                              onClick={() => handleDeletePhotoClick(c.id, 'before', url)}
                              className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center"
                              title="Hapus"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <div />}
                
                {((c.photo_after_urls ?? c.photoAfterUrls)?.length > 0) ? (
                  <div>
                    <span className="font-semibold block mb-1.5 text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-500">Foto Perbaikan ({Math.max(c.photo_after_urls?.length || 0, c.photoAfterUrls?.length || 0)})</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(c.photo_after_urls ?? c.photoAfterUrls).map((url, i) => (
                        <div key={i} className="relative group/media">
                          <button type="button" onClick={() => setLightbox({ url, type: 'image', name: `Foto Perbaikan ${i+1}` })} className="block aspect-video rounded-lg overflow-hidden border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/10 w-full text-left">
                            <img src={url} alt={`After ${i+1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                          </button>
                          {isRole('admin') && (
                            <button
                              type="button"
                              onClick={() => handleDeletePhotoClick(c.id, 'after', url)}
                              className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center"
                              title="Hapus"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center aspect-video rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Belum Ada Perbaikan</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Keluhan */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, mode: 'create', data: null })}
        title={modal.mode === 'create' ? 'Tambah Data Keluhan' : 'Edit Keluhan & Perbaikan'}
        size="xl"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Inputs */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-1.5">
                <label className="label">Deskripsi Keluhan <span className="text-rose-500">*</span></label>
                <textarea
                  className="input resize-none h-32"
                  required
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Jelaskan detail keluhan dari customer..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="label">Status Keluhan</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                >
                  <option value="pending">Menunggu Perbaikan</option>
                  <option value="resolved">Selesai Diperbaiki</option>
                </select>
              </div>
            </div>

            {/* Right Column: Images */}
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              
              {/* Foto Sebelum */}
              <div className="space-y-3">
                <label className="label flex justify-between items-center">
                  <span>Foto Keluhan (Sebelum) {modal.mode === 'create' && <span className="text-rose-500">*</span>}</span>
                </label>

                {form.photoBeforeUrls?.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {form.photoBeforeUrls.map((url, i) => (
                      <div key={i} className="relative group/media">
                        <button type="button" onClick={() => setLightbox({ url, type: 'image', name: `Foto Sebelum ${i+1}` })} className="block aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 w-full text-left">
                          <img src={url} alt={`Before ${i+1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                        </button>
                        {isRole('admin') && modal.data?.id && (
                          <button
                            type="button"
                            onClick={() => handleDeletePhotoClick(modal.data.id, 'before', url)}
                            className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center"
                            title="Hapus"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-4 text-center hover:border-amber-400 dark:hover:border-amber-500 transition-colors cursor-pointer bg-amber-50/30 dark:bg-amber-900/10"
                  onClick={() => fileInputBeforeRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dropped = Array.from(e.dataTransfer.files);
                    setPhotoBeforeFiles((prev) => [...prev, ...dropped]);
                  }}
                >
                  <ImagePlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Klik atau drag & drop gambar di sini</p>
                  <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WEBP, GIF...</p>
                </div>
                <input
                  ref={fileInputBeforeRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files);
                    setPhotoBeforeFiles((prev) => [...prev, ...selected]);
                    e.target.value = "";
                  }}
                />
                {photoBeforeFiles.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {photoBeforeFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-100 dark:border-amber-800">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileImage className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
                          <span className="text-xs text-slate-400 shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button
                          type="button"
                          className="ml-2 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                          onClick={() => setPhotoBeforeFiles((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700"></div>

              {/* Foto Sesudah */}
              <div className="space-y-3">
                <label className="label flex justify-between items-center">
                  <span>Foto Perbaikan (Sesudah)</span>
                </label>

                {form.photoAfterUrls?.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {form.photoAfterUrls.map((url, i) => (
                      <div key={i} className="relative group/media">
                        <button type="button" onClick={() => setLightbox({ url, type: 'image', name: `Foto Sesudah ${i+1}` })} className="block aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 w-full text-left">
                          <img src={url} alt={`After ${i+1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                        </button>
                        {isRole('admin') && modal.data?.id && (
                          <button
                            type="button"
                            onClick={() => handleDeletePhotoClick(modal.data.id, 'after', url)}
                            className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center"
                            title="Hapus"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-4 text-center hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors cursor-pointer bg-emerald-50/30 dark:bg-emerald-900/10"
                  onClick={() => fileInputAfterRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dropped = Array.from(e.dataTransfer.files);
                    setPhotoAfterFiles((prev) => [...prev, ...dropped]);
                  }}
                >
                  <ImagePlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Klik atau drag & drop gambar di sini</p>
                  <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WEBP, GIF...</p>
                </div>
                <input
                  ref={fileInputAfterRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files);
                    setPhotoAfterFiles((prev) => [...prev, ...selected]);
                    e.target.value = "";
                  }}
                />
                {photoAfterFiles.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {photoAfterFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg border border-emerald-100 dark:border-emerald-800">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileImage className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
                          <span className="text-xs text-slate-400 shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button
                          type="button"
                          className="ml-2 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                          onClick={() => setPhotoAfterFiles((prev) => prev.filter((_, i) => i !== idx))}
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

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setModal({ open: false, mode: 'create', data: null })} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : modal.mode === 'create' ? 'Tambah Keluhan' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      <Confirm
        open={confirm.open}
        onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Hapus Keluhan"
        description="Yakin ingin menghapus data keluhan ini beserta foto-fotonya? Tindakan ini tidak dapat dibatalkan."
        loading={saving}
      />

      <Confirm
        open={confirmPhoto.open}
        onClose={() => setConfirmPhoto({ open: false, complaintId: null, type: null, url: null })}
        onConfirm={executeDeletePhoto}
        title="Hapus Foto Keluhan"
        description="Apakah Anda yakin ingin menghapus foto ini?"
      />

      {/* LIGHTBOX */}
      <Lightbox item={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
