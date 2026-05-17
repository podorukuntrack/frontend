import { useState, useEffect } from 'react';
import { retentionsAPI } from '../../../api/services';
import { PageLoader, Modal, Confirm } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import { extractError, formatDate } from '../../../utils/helpers';
import { useAuth } from '../../../context/AuthContext';
import {
  ShieldCheck, Plus, Pencil, Trash2, Clock, CheckCircle,
  AlertTriangle, Calendar, XCircle
} from 'lucide-react';

const STATUS_CONFIG = {
  active:   { label: 'Aktif', color: 'bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400', icon: ShieldCheck },
  claimed:  { label: 'Diklaim', color: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400', icon: AlertTriangle },
  released: { label: 'Selesai / Cair', color: 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
};

function getDaysRemaining(dueDate) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
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
  const [form, setForm] = useState({ due_date: '', notes: '', status: 'active' });

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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.due_date) { toast('Batas waktu garansi wajib diisi', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        unitId: unit.id,
        dueDate: new Date(form.due_date).toISOString(),
        status: form.status,
        notes: form.notes || null,
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

  const handleQuickStatus = async (r, newStatus) => {
    setSaving(true);
    try {
      await retentionsAPI.update(r.id, { status: newStatus });
      toast(`Status diperbarui ke "${STATUS_CONFIG[newStatus]?.label ?? newStatus}"`, 'success');
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
      setConfirm({ open: false });
      loadData();
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setForm({ due_date: '', notes: '', status: 'active' });
    setModal({ open: true, mode: 'create', data: null });
  };

  const openEdit = (r) => {
    const dueDate = r.due_date ?? r.dueDate;
    setForm({
      due_date: dueDate ? dueDate.split('T')[0] : '',
      notes: r.notes || '',
      status: r.status || 'active',
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
            Setelah serah terima selesai, tambahkan data masa garansi dan nilai retensi unit ini.
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
            const cfg = STATUS_CONFIG[r.status] ?? { label: r.status, color: 'bg-slate-100 text-slate-600', icon: Clock };
            const StatusIcon = cfg.icon;
            const isExpired = daysLeft !== null && daysLeft < 0;
            const isWarning = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

            return (
              <div
                key={r.id}
                className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border overflow-hidden
                  ${r.status === 'released' ? 'border-emerald-200 dark:border-emerald-800' :
                    r.status === 'claimed' ? 'border-amber-300 dark:border-amber-700' :
                    isExpired ? 'border-red-300 dark:border-red-700' :
                    isWarning ? 'border-amber-200 dark:border-amber-800' :
                    'border-slate-200 dark:border-slate-700'}`}
              >
                {/* Countdown bar */}
                {r.status === 'active' && daysLeft !== null && (
                  <div className={`h-1.5 w-full ${isExpired ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-indigo-500'}`} />
                )}
                {r.status === 'released' && <div className="h-1.5 w-full bg-emerald-500" />}
                {r.status === 'claimed' && <div className="h-1.5 w-full bg-amber-500" />}

                <div className="p-5">
                  {/* Card header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2.5">
                      <StatusIcon className={`w-5 h-5 ${r.status === 'released' ? 'text-emerald-500' : r.status === 'claimed' ? 'text-amber-500' : 'text-indigo-500'}`} />
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
                      <p className={`text-sm font-bold ${isExpired ? 'text-red-600 dark:text-red-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'}`}>
                        {dueDate ? formatDate(dueDate) : '—'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Sisa Waktu
                      </p>
                      <p className={`text-sm font-bold ${
                        r.status === 'released' ? 'text-emerald-600 dark:text-emerald-400' :
                        isExpired ? 'text-red-600 dark:text-red-400' :
                        isWarning ? 'text-amber-600 dark:text-amber-400' :
                        'text-slate-800 dark:text-slate-100'
                      }`}>
                        {r.status === 'released' ? 'Selesai' :
                         daysLeft === null ? '—' :
                         isExpired ? `Lewat ${Math.abs(daysLeft)} hari` :
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

                  {/* Quick action buttons (admin only, non-released) */}
                  {isRole('super_admin', 'admin') && r.status !== 'released' && (
                    <div className="flex gap-2 flex-wrap">
                      {r.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleQuickStatus(r, 'claimed')}
                            disabled={saving}
                            className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700 transition-colors font-medium"
                          >
                            <AlertTriangle className="w-3 h-3 inline mr-1" /> Tandai Diklaim
                          </button>
                          <button
                            onClick={() => handleQuickStatus(r, 'released')}
                            disabled={saving}
                            className="text-xs px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700 transition-colors font-medium"
                          >
                            <CheckCircle className="w-3 h-3 inline mr-1" /> Tandai Selesai / Cair
                          </button>
                        </>
                      )}
                      {r.status === 'claimed' && (
                        <button
                          onClick={() => handleQuickStatus(r, 'released')}
                          disabled={saving}
                          className="text-xs px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700 transition-colors font-medium"
                        >
                          <CheckCircle className="w-3 h-3 inline mr-1" /> Tandai Garansi Selesai
                        </button>
                      )}
                    </div>
                  )}

                  {/* Released banner */}
                  {r.status === 'released' && (
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
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
              <label className="label">Batas Waktu Garansi <span className="text-rose-500">*</span></label>
              <input
                type="date"
                className="input"
                required
                value={form.due_date}
                onChange={e => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="active">Aktif (Masa Garansi)</option>
                <option value="claimed">Diklaim</option>
                <option value="released">Selesai / Cair</option>
              </select>
            </div>
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
        onClose={() => setConfirm({ open: false })}
        onConfirm={handleDelete}
        title="Hapus Data Garansi"
        description="Yakin ingin menghapus data garansi/retensi ini? Tindakan ini tidak dapat dibatalkan."
        loading={saving}
      />
    </div>
  );
}
