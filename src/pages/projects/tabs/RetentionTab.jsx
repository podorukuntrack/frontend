import { useState, useEffect } from 'react';
import { retentionsAPI } from '../../../api/services';
import { PageLoader, Modal, Confirm } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import { extractError, formatDate } from '../../../utils/helpers';
import { useAuth } from '../../../context/AuthContext';
import {
  ShieldCheck, Plus, Pencil, Trash2, Clock, CheckCircle,
  AlertTriangle, Calendar, Compass, ExternalLink
} from 'lucide-react';

const STATUS_CONFIG = {
  active:   { label: 'Aktif', color: 'bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400', icon: ShieldCheck },
  released: { label: 'Selesai / Cair', color: 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
};

function getDaysRemaining(dueDate) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  // Clear times to compare dates purely
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function RetentionTab({ unit }) {
  const { isRole } = useAuth();
  const { toast } = useToast();

  const [retentions, setRetentions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [form, setForm] = useState({ due_date: '', notes: '', status: 'active', linkFoto360: '' });

  const [startDate, setStartDate] = useState('');
  const [durationDays, setDurationDays] = useState(100);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await retentionsAPI.list({ unitId: unit.id });
      const data = (res.data?.data || []).filter(r => {
        const rid = r.unit_id ?? r.unitId;
        return rid && String(rid) === String(unit.id);
      });
      setRetentions(data);
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit.id]);

  useEffect(() => {
    if (startDate && durationDays !== undefined && durationDays !== null) {
      const start = new Date(startDate);
      start.setDate(start.getDate() + parseInt(durationDays, 10));
      setForm(f => ({ ...f, due_date: start.toISOString().split('T')[0] }));
    }
  }, [startDate, durationDays]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.due_date) { toast('Batas waktu garansi wajib diisi', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        unitId: unit.id,
        dueDate: new Date(form.due_date).toISOString(),
        status: 'active', // Default active, automatically release on expired
        notes: form.notes || null,
        linkFoto360: form.linkFoto360 || null,
      };
      if (modal.mode === 'create') {
        await retentionsAPI.create(payload);
        toast('Data garansi/retensi berhasil dibuat', 'success');
      } else {
        await retentionsAPI.update(modal.data.id, payload);
        toast('Data garansi/retensi berhasil diperbarui', 'success');
      }
      setModal({ open: false, mode: 'create', data: null });
      loadData();
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await retentionsAPI.delete(confirm.id);
      toast('Retensi berhasil dihapus', 'success');
      setConfirm({ open: false, id: null });
      loadData();
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setDurationDays(100);
    setForm({ due_date: '', notes: '', status: 'active', linkFoto360: '' });
    setModal({ open: true, mode: 'create', data: null });
  };

  const openEdit = (r) => {
    const dueDate = r.due_date ?? r.dueDate;
    // Guess start date from database created_at or fall back to today minus calculated duration
    const start = r.created_at ? r.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
    setStartDate(start);
    
    let calculatedDays = 100;
    if (dueDate && start) {
      const diffTime = Math.abs(new Date(dueDate) - new Date(start));
      calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    setDurationDays(calculatedDays);
    setForm({
      due_date: dueDate ? dueDate.split('T')[0] : '',
      notes: r.notes || '',
      status: r.status || 'active',
      linkFoto360: r.link_foto_360 ?? r.linkFoto360 ?? '',
    });
    setModal({ open: true, mode: 'edit', data: r });
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Garansi / Retensi
        </h3>
        {isRole('super_admin', 'admin') && (
          <button className="btn-primary text-sm px-3 py-1.5 h-auto" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Tambah Garansi
          </button>
        )}
      </div>

      {/* Empty state */}
      {retentions.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium mb-1">Belum ada data garansi/retensi</p>
          <p className="text-sm text-slate-400">
            Setelah serah terima selesai, tambahkan data masa garansi dan kaitkan link foto 360 unit ini.
          </p>
          {isRole('super_admin', 'admin') && (
            <button className="btn-primary mt-4 text-sm px-4 py-2 h-auto" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1.5" /> Buat Data Garansi
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4 mt-2">
          {retentions.map(r => {
            const dueDate = r.due_date ?? r.dueDate;
            const daysLeft = getDaysRemaining(dueDate);
            const isExpired = daysLeft !== null && daysLeft < 0;
            
            const currentStatus = isExpired ? 'released' : 'active';
            const cfg = STATUS_CONFIG[currentStatus];
            const StatusIcon = cfg.icon;
            const isWarning = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

            return (
              <div
                key={r.id}
                className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border overflow-hidden
                  ${isExpired ? 'border-emerald-200 dark:border-emerald-800' :
                    isWarning ? 'border-amber-200 dark:border-amber-800' :
                    'border-slate-200 dark:border-slate-700'}`}
              >
                {/* Countdown bar */}
                {daysLeft !== null && (
                  <div className={`h-1.5 w-full ${isExpired ? 'bg-emerald-500' : isWarning ? 'bg-amber-400' : 'bg-indigo-500'}`} />
                )}

                <div className="p-5">
                  {/* Card header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2.5">
                      <StatusIcon className={`w-5 h-5 ${isExpired ? 'text-emerald-500' : 'text-indigo-500'}`} />
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">Masa Garansi / Retensi</h4>
                        <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                    {isRole('super_admin', 'admin') && (
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirm({ open: true, id: r.id })} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Batas Waktu
                      </p>
                      <p className={`text-sm font-bold ${isExpired ? 'text-emerald-600 dark:text-emerald-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'}`}>
                        {dueDate ? formatDate(dueDate) : '—'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Sisa Waktu
                      </p>
                      <p className={`text-sm font-bold ${
                        isExpired ? 'text-emerald-600 dark:text-emerald-400' :
                        isWarning ? 'text-amber-600 dark:text-amber-400' :
                        'text-slate-800 dark:text-slate-100'
                      }`}>
                        {isExpired ? 'Selesai' :
                         daysLeft === null ? '—' :
                         daysLeft === 0 ? 'Hari ini!' :
                         `${daysLeft} hari lagi`}
                      </p>
                    </div>
                  </div>

                  {/* Notes */}
                  {r.notes && (
                    <div className="mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-semibold block mb-1 text-xs uppercase tracking-wide text-slate-400">Catatan</span>
                      {r.notes}
                    </div>
                  )}

                  {/* Link Foto 360 */}
                  {(r.link_foto_360 ?? r.linkFoto360) && (
                    <div className="mb-4">
                      <span className="font-semibold block mb-1.5 text-xs uppercase tracking-wide text-slate-400">Foto 360 Unit</span>
                      <a
                        href={r.link_foto_360 ?? r.linkFoto360}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-800 text-sm font-semibold transition-all shadow-sm active:scale-95"
                      >
                        <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        Buka Foto 360 Unit
                        <ExternalLink className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                      </a>
                    </div>
                  )}

                  {/* Released banner */}
                  {isExpired && (
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                      <CheckCircle className="w-4 h-4" /> Masa garansi telah selesai.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal form */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, mode: 'create', data: null })}
        title={modal.mode === 'create' ? 'Tambah Data Garansi' : 'Edit Data Garansi'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Tanggal Mulai Garansi</label>
              <input
                type="date"
                className="input"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Durasi Garansi (Hari)</label>
              <input
                type="number"
                min="1"
                className="input"
                required
                value={durationDays}
                onChange={e => setDurationDays(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="label">Batas Waktu Garansi (Otomatis Terhitung)</label>
            <input
              type="date"
              className="input bg-slate-50 dark:bg-slate-800 cursor-not-allowed font-medium text-slate-700 dark:text-slate-300"
              value={form.due_date}
              readOnly
            />
          </div>

          <div className="space-y-1.5">
            <label className="label">Catatan (Opsional)</label>
            <textarea
              className="input resize-none h-20"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Catatan garansi, syarat, atau kondisi khusus..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="label">Link Foto 360 (Opsional)</label>
            <input
              type="url"
              className="input"
              value={form.linkFoto360}
              onChange={e => setForm({ ...form, linkFoto360: e.target.value })}
              placeholder="https://example.com/360-photo-link"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal({ open: false })} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : modal.mode === 'create' ? 'Buat Garansi' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm delete */}
      <Confirm
        open={confirm.open}
        onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Hapus Data Garansi"
        description="Yakin ingin menghapus data garansi/retensi ini? Tindakan ini tidak dapat dibatalkan."
        loading={saving}
      />
    </div>
  );
}
