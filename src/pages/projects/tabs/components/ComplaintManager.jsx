import { useState, useEffect } from 'react';
import { retentionsAPI, documentationAPI } from '../../../../api/services';
import { Modal, Confirm, Lightbox } from '../../../../components/ui';
import { useToast } from '../../../../hooks/useToast';
import { extractError, formatDate } from '../../../../utils/helpers';
import { Plus, Pencil, Trash2, Camera, CheckCircle, Image as ImageIcon, Wrench, AlertCircle } from 'lucide-react';

export default function ComplaintManager({ retention, isRole, unitId }) {
  const { toast } = useToast();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });
  
  const [form, setForm] = useState({ description: '', status: 'pending', photoBeforeUrls: [], photoAfterUrls: [] });
  const [photoBeforeFiles, setPhotoBeforeFiles] = useState([]);
  const [photoAfterFiles, setPhotoAfterFiles] = useState([]);
  const [lightbox, setLightbox] = useState(null);


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
        <button onClick={openCreate} className="btn-secondary text-xs px-3 py-1.5 h-auto border border-slate-200">
          <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Keluhan
        </button>
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
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {isRole('super_admin', 'admin') && (
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
                        <button key={i} type="button" onClick={() => setLightbox({ url, type: 'image', name: `Foto Keluhan ${i+1}` })} className="block aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-black/5 w-full text-left">
                          <img src={url} alt={`Before ${i+1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : <div />}
                
                {((c.photo_after_urls ?? c.photoAfterUrls)?.length > 0) ? (
                  <div>
                    <span className="font-semibold block mb-1.5 text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-500">Foto Perbaikan ({Math.max(c.photo_after_urls?.length || 0, c.photoAfterUrls?.length || 0)})</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(c.photo_after_urls ?? c.photoAfterUrls).map((url, i) => (
                        <button key={i} type="button" onClick={() => setLightbox({ url, type: 'image', name: `Foto Perbaikan ${i+1}` })} className="block aspect-video rounded-lg overflow-hidden border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/10 w-full text-left">
                          <img src={url} alt={`After ${i+1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                        </button>
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
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="label">Deskripsi Keluhan <span className="text-rose-500">*</span></label>
            <textarea
              className="input resize-none h-20"
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

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="label">Foto Keluhan (Sebelum) {modal.mode === 'create' && <span className="text-rose-500">*</span>}</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={e => setPhotoBeforeFiles(Array.from(e.target.files))}
                className="input text-sm p-1.5 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 dark:file:bg-amber-900/30 dark:file:text-amber-400 hover:file:bg-amber-100"
              />
              <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium flex flex-col gap-1">
                {(form.photoBeforeUrls?.length > 0) && (
                   <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {form.photoBeforeUrls.length} foto tersimpan</span>
                )}
                {(photoBeforeFiles.length > 0) && (
                   <span className="flex items-center gap-1 text-slate-500"><Plus className="w-3 h-3" /> {photoBeforeFiles.length} foto baru siap diunggah</span>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="label">Foto Perbaikan (Sesudah)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={e => setPhotoAfterFiles(Array.from(e.target.files))}
                className="input text-sm p-1.5 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-900/30 dark:file:text-emerald-400 hover:file:bg-emerald-100"
              />
              <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex flex-col gap-1">
                {(form.photoAfterUrls?.length > 0) && (
                   <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {form.photoAfterUrls.length} foto tersimpan</span>
                )}
                {(photoAfterFiles.length > 0) && (
                   <span className="flex items-center gap-1 text-slate-500"><Plus className="w-3 h-3" /> {photoAfterFiles.length} foto baru siap diunggah</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setModal({ open: false })} className="btn-secondary">Batal</button>
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

      {/* LIGHTBOX */}
      <Lightbox item={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
