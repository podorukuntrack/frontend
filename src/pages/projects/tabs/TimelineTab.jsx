import { useState, useEffect } from 'react';
import { timelinesAPI } from '../../../api/services';
import { PageLoader, Modal, Confirm } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import { extractError, formatDate } from '../../../utils/helpers';
import { useAuth } from '../../../context/AuthContext';
import { Trash2, Pencil, Plus, Calendar as CalIcon, Clock } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import id from "date-fns/locale/id";
import { differenceInDays } from "date-fns";

export default function TimelineTab({ unit, project, onUpdate }) {
  const { isRole } = useAuth();
  const { toast } = useToast();
  
  const [timelines, setTimelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ task_name: '', start_date: '', end_date: '', status: 'planned' });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await timelinesAPI.list({ unitId: unit.id, limit: 100 });
      // Filter by unitId for safety
      const data = (res.data?.data || []).filter(t => String(t.unitId) === String(unit.id) || String(t.unit_id) === String(unit.id));
      setTimelines(data);
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        projectId: project.id,
        unitId: unit.id,
        taskName: form.task_name,
        startDate: form.start_date ? new Date(form.start_date).toISOString() : undefined,
        endDate: form.end_date ? new Date(form.end_date).toISOString() : undefined
      };

      if (modal.mode === 'create') {
        await timelinesAPI.create(payload);
        toast('Timeline berhasil dibuat', 'success');
      } else {
        await timelinesAPI.update(modal.data.id, payload);
        toast('Timeline berhasil diperbarui', 'success');
      }
      setModal({ open: false, mode: 'create', data: null });
      loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await timelinesAPI.delete(confirm.id);
      toast('Timeline berhasil dihapus', 'success');
      setConfirm({ open: false });
      loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
           <CalIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Estimasi Pengerjaan
        </h3>
        {isRole('super_admin', 'admin') && (
          <button 
            className="btn-primary text-sm px-3 py-1.5 h-auto"
            onClick={() => {
              setForm({ task_name: '', start_date: '', end_date: '', status: 'planned' });
              setModal({ open: true, mode: 'create' });
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Tambah Timeline
          </button>
        )}
      </div>

      {timelines.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
           <CalIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
           <p className="text-slate-500 font-medium">Belum ada timeline yang dibuat</p>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
           {timelines.map(t => (
               <div key={t.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex justify-between items-center flex-wrap gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                     <h4 className="font-bold text-slate-900 dark:text-white text-base">{t.taskName}</h4>
                     <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-md w-fit">
                        <CalIcon className="w-3.5 h-3.5" />
                        <span>{formatDate(t.startDate)} - {formatDate(t.endDate)}</span>
                     </div>
                  </div>
                <div className="flex items-center gap-4">
                   <span className="badge bg-amber-100 text-amber-700">{t.status}</span>
                   {isRole('super_admin', 'admin') && (
                      <div className="flex gap-2">
                         <button onClick={() => {
                            setForm({ task_name: t.taskName, start_date: t.startDate?.split('T')[0], end_date: t.endDate?.split('T')[0], status: t.status });
                            setModal({ open: true, mode: 'edit', data: t });
                         }} className="text-slate-400 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>
                         <button onClick={() => setConfirm({ open: true, id: t.id })} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                   )}
                </div>
             </div>
           ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modal.open} onClose={() => setModal({ open: false, mode: 'create', data: null })} title={modal.mode === 'create' ? 'Tambah Timeline' : 'Edit Timeline'}>
         <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
               <label className="label">Nama Tugas (Estimasi)</label>
               <input className="input" required value={form.task_name} onChange={e => setForm({...form, task_name: e.target.value})} placeholder="Contoh: Pengecoran Pondasi" />
            </div>
            
            <div className="space-y-1.5">
               <label className="label">Periode Pengerjaan</label>
               <div className="relative z-[100] w-full">
                 <DatePicker
                   selectsRange={true}
                   startDate={form.start_date ? new Date(form.start_date) : null}
                   endDate={form.end_date ? new Date(form.end_date) : null}
                   onChange={(update) => {
                     const [start, end] = update;
                     setForm({
                       ...form,
                       start_date: start ? start.toISOString().split('T')[0] : '',
                       end_date: end ? end.toISOString().split('T')[0] : ''
                     });
                   }}
                   locale={id}
                   dateFormat="dd/MM/yyyy"
                   placeholderText="Pilih Tanggal Mulai - Selesai"
                   className="input w-full pl-10 cursor-pointer"
                   wrapperClassName="w-full"
                 />
                 <CalIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
               </div>
               {form.start_date && form.end_date && (
                 <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-1.5 bg-indigo-50 dark:bg-indigo-500/10 w-fit px-2.5 py-1 rounded-md">
                   <Clock className="w-3.5 h-3.5" />
                   Estimasi Waktu: {differenceInDays(new Date(form.end_date), new Date(form.start_date)) + 1} Hari
                 </p>
               )}
            </div>

            <div className="flex justify-end pt-4">
               <button type="submit" className="btn-primary" disabled={saving || !form.start_date || !form.end_date}>
                 {saving ? 'Menyimpan...' : 'Simpan'}
               </button>
            </div>
         </form>
      </Modal>

      <Confirm open={confirm.open} onClose={() => setConfirm({ open: false })} onConfirm={handleDelete} title="Hapus Timeline" description="Yakin ingin menghapus timeline ini?" loading={saving} />
    </div>
  )
}
