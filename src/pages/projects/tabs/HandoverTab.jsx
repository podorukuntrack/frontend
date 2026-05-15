import { useState, useEffect } from 'react';
import { handoversAPI } from '../../../api/services';
import { PageLoader, Modal, Confirm } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import { extractError, formatDate } from '../../../utils/helpers';
import { useAuth } from '../../../context/AuthContext';
import {
  Key, Plus, Pencil, Trash2, CheckCircle, Clock, AlertTriangle,
  UserCheck, XCircle, RotateCcw, ArrowRight
} from 'lucide-react';

// Helper: baca field tanggal — support camelCase & snake_case
const getScheduledDate = (h) => h.scheduled_date ?? h.scheduledDate ?? null;
const getProposedDate  = (h) => h.proposed_date  ?? h.proposedDate  ?? null;
const getActualDate    = (h) => h.actual_date     ?? h.actualDate    ?? null;

// Format tanggal+waktu dengan safe parsing
const fmtDateTime = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Status badge config
const STATUS_CONFIG = {
  menunggu_respon_customer: { label: 'Menunggu Respon Customer', color: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' },
  scheduled:                { label: 'Menunggu Respon Customer', color: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' },
  menunggu_konfirmasi_admin:{ label: 'Perlu Konfirmasi Admin', color: 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800' },
  dijadwalkan:              { label: 'Jadwal Disepakati', color: 'bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800' },
  selesai:                  { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' },
  completed:                { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' },
  gagal:                    { label: 'Gagal (Perlu Jadwal Ulang)', color: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
  delayed:                  { label: 'Tertunda', color: 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600' },
};

export default function HandoverTab({ unit, onHandover }) {
  const { isRole } = useAuth();
  const { toast } = useToast();

  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal: create/edit jadwal
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [form, setForm] = useState({ scheduled_date: '', notes: '' });

  // Modal: konfirmasi hasil serah terima hari H
  const [resultModal, setResultModal] = useState({ open: false, handover: null });
  const [resultNotes, setResultNotes] = useState('');

  // Confirm: hapus
  const [confirm, setConfirm] = useState({ open: false, id: null });

  // Cek apakah sudah ada handover yang selesai
  const hasCompleted = handovers.some(h => h.status === 'selesai' || h.status === 'completed');
  // Handover aktif (belum selesai/gagal) — hanya boleh 1
  const activeHandover = handovers.find(h => !['selesai', 'completed', 'gagal'].includes(h.status));
  // Boleh buat baru jika tidak ada aktif DAN belum ada yang selesai
  const canCreate = isRole('super_admin', 'admin') && !activeHandover && !hasCompleted;

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await handoversAPI.list({ unitId: unit.id });
      // Sort: aktif di atas, lalu terbaru
      const data = (res.data?.data || []).sort((a, b) => {
        const order = { menunggu_respon_customer: 0, scheduled: 0, menunggu_konfirmasi_admin: 1, dijadwalkan: 2, gagal: 3, delayed: 3, selesai: 4, completed: 4 };
        return (order[a.status] ?? 5) - (order[b.status] ?? 5);
      });
      setHandovers(data);
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

  // ── Simpan (create / edit jadwal) ──────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.scheduled_date) { toast('Tanggal jadwal wajib diisi', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        unitId: unit.id,
        scheduledDate: new Date(form.scheduled_date).toISOString(),
        notes: form.notes || null,
        // Reset status ke menunggu_respon_customer saat create / edit jadwal
        status: 'menunggu_respon_customer',
        proposedDate: null,
      };
      if (modal.mode === 'create') {
        await handoversAPI.create(payload);
        toast('Jadwal serah terima berhasil dibuat', 'success');
      } else {
        await handoversAPI.update(modal.data.id, payload);
        toast('Jadwal berhasil diperbarui', 'success');
      }
      setModal({ open: false, mode: 'create', data: null });
      loadData();
      if (onHandover) onHandover();
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Setujui usulan jadwal customer ───────────────────────────
  const handleApproveProposal = async (h) => {
    setSaving(true);
    try {
      await handoversAPI.update(h.id, {
        scheduledDate: getProposedDate(h),
        status: 'dijadwalkan',
        proposedDate: null,
      });
      toast('Usulan jadwal customer disetujui', 'success');
      loadData();
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Tandai hasil serah terima (selesai / gagal) ───────────────
  const handleConfirmResult = async (success) => {
    const h = resultModal.handover;
    setSaving(true);
    try {
      if (success) {
        await handoversAPI.update(h.id, {
          status: 'selesai',
          actualDate: new Date().toISOString(),
          notes: resultNotes || h.notes || null,
        });
        toast('Serah terima ditandai selesai. Lanjutkan ke tab Retensi!', 'success');
      } else {
        await handoversAPI.update(h.id, {
          status: 'gagal',
          notes: resultNotes || h.notes || null,
        });
        toast('Serah terima dicatat gagal. Silakan buat jadwal baru.', 'warning');
      }
      setResultModal({ open: false, handover: null });
      setResultNotes('');
      loadData();
      if (onHandover) onHandover();
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Hapus handover ────────────────────────────────────────────
  const handleDelete = async () => {
    setSaving(true);
    try {
      await handoversAPI.delete(confirm.id);
      toast('Handover berhasil dihapus', 'success');
      setConfirm({ open: false });
      loadData();
      if (onHandover) onHandover();
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toDateTimeLocal = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const openEdit = (h) => {
    setForm({ scheduled_date: toDateTimeLocal(getScheduledDate(h)), notes: h.notes || '' });
    setModal({ open: true, mode: 'edit', data: h });
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Serah Terima (Handover)
        </h3>
        {canCreate && (
          <button
            className="btn-primary text-sm px-3 py-1.5 h-auto"
            onClick={() => {
              setForm({ scheduled_date: '', notes: '' });
              setModal({ open: true, mode: 'create', data: null });
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Buat Jadwal Serah Terima
          </button>
        )}
      </div>

      {/* Empty state */}
      {handovers.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <Key className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium mb-1">Belum ada jadwal serah terima</p>
          <p className="text-sm text-slate-400">Unit sudah mencapai 100%, Anda dapat mengatur jadwal serah terima kunci ke customer.</p>
        </div>
      ) : (
        <div className="space-y-4 mt-2">
          {handovers.map(h => {
            const cfg = STATUS_CONFIG[h.status] ?? { label: h.status, color: 'bg-slate-100 text-slate-600' };
            const isActive = !['selesai', 'completed', 'gagal'].includes(h.status);
            const isGagal = h.status === 'gagal';
            const isDone = h.status === 'selesai' || h.status === 'completed';

            return (
              <div
                key={h.id}
                className={`p-5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border transition-all
                  ${h.status === 'menunggu_konfirmasi_admin' ? 'border-rose-400 ring-1 ring-rose-300' :
                    isDone ? 'border-emerald-300 dark:border-emerald-800' :
                    isGagal ? 'border-red-300 dark:border-red-800 opacity-75' :
                    'border-slate-200 dark:border-slate-700'}`}
              >
                {/* Card Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      {isDone ? '✅ Serah Terima Selesai' : isGagal ? '❌ Serah Terima Gagal' : 'Jadwal Serah Terima'}
                    </h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Edit & Delete — hanya untuk handover aktif (admin) */}
                  {isRole('super_admin', 'admin') && isActive && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => openEdit(h)}
                        className="btn-secondary px-3 py-1.5 text-xs h-auto"
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit Jadwal
                      </button>
                      <button
                        onClick={() => setConfirm({ open: true, id: h.id })}
                        className="btn-danger px-2.5 py-1.5 text-xs h-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Info Tanggal */}
                <div className="space-y-1 text-sm mb-3">
                  <p className="text-slate-500 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    Jadwal:{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {fmtDateTime(getScheduledDate(h))}
                    </span>
                  </p>
                  {getActualDate(h) && (
                    <p className="text-slate-500 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      Aktual Selesai:{' '}
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatDate(getActualDate(h))}
                      </span>
                    </p>
                  )}
                </div>

                {/* ── Status-specific action panels ── */}

                {/* 1. Menunggu respon customer */}
                {(h.status === 'menunggu_respon_customer' || h.status === 'scheduled') && (
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800 flex items-start gap-3">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Menunggu Respon Customer</p>
                      <p className="text-xs text-amber-700/80 dark:text-amber-500 mt-0.5">
                        Notifikasi sudah dikirim ke aplikasi mobile customer. Admin dapat mengubah jadwal jika perlu dengan tombol <strong>Edit Jadwal</strong> di atas.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Customer ajukan perubahan jadwal */}
                {h.status === 'menunggu_konfirmasi_admin' && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
                    <div className="flex gap-3 mb-3">
                      <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-rose-800 dark:text-rose-400">Customer Mengajukan Perubahan Jadwal</p>
                        <p className="text-sm text-rose-700/90 dark:text-rose-400/80 mt-1">
                          Usulan baru:{' '}
                          <span className="font-bold bg-white dark:bg-slate-700 px-2 py-0.5 rounded ml-1 border border-rose-100 dark:border-slate-600">
                            {fmtDateTime(getProposedDate(h))}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-8">
                      <button
                        onClick={() => handleApproveProposal(h)}
                        disabled={saving}
                        className="btn-primary text-xs px-4 py-1.5 h-auto bg-rose-600 hover:bg-rose-700 border-none"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Setujui Usulan
                      </button>
                      <button
                        onClick={() => openEdit(h)}
                        className="btn-secondary text-xs px-4 py-1.5 h-auto"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Tolak & Atur Ulang
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Jadwal disepakati → admin konfirmasi hasil hari H */}
                {h.status === 'dijadwalkan' && isRole('super_admin', 'admin') && (
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <div className="flex gap-3 mb-3">
                      <UserCheck className="w-5 h-5 text-indigo-500 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-400">Jadwal Telah Disepakati</p>
                        <p className="text-xs text-indigo-700/80 dark:text-indigo-400/80 mt-0.5">
                          Pada hari H, konfirmasikan apakah serah terima berjalan atau tidak.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-8">
                      <button
                        onClick={() => { setResultNotes(h.notes || ''); setResultModal({ open: true, handover: h }); }}
                        disabled={saving}
                        className="btn-primary text-xs px-4 py-1.5 h-auto bg-indigo-600 hover:bg-indigo-700 border-none"
                      >
                        <ArrowRight className="w-3.5 h-3.5 mr-1.5" /> Konfirmasi Hasil Serah Terima
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Selesai → prompt ke Retensi */}
                {isDone && (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Serah Terima Berhasil</p>
                      <p className="text-xs text-emerald-700/80 dark:text-emerald-500 mt-0.5">
                        Unit telah diserahkan. Lanjutkan ke tab <strong>Retensi</strong> untuk proses garansi/pemeliharaan.
                      </p>
                    </div>
                  </div>
                )}

                {/* 5. Gagal → minta buat jadwal baru */}
                {isGagal && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-red-800 dark:text-red-400">Serah Terima Gagal / Customer Tidak Hadir</p>
                        <p className="text-xs text-red-700/80 dark:text-red-500 mt-0.5">Buat jadwal serah terima baru untuk melanjutkan proses.</p>
                      </div>
                    </div>
                    {isRole('super_admin', 'admin') && !activeHandover && (
                      <button
                        onClick={() => { setForm({ scheduled_date: '', notes: '' }); setModal({ open: true, mode: 'create', data: null }); }}
                        className="btn-primary text-xs px-3 py-1.5 h-auto shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Jadwal Ulang
                      </button>
                    )}
                  </div>
                )}

                {/* Catatan */}
                {h.notes && (
                  <div className="mt-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-semibold block mb-1">Catatan:</span>
                    {h.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Buat / Edit Jadwal ───────────────────────── */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, mode: 'create', data: null })}
        title={modal.mode === 'create' ? 'Buat Jadwal Serah Terima' : 'Edit Jadwal Serah Terima'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="label">Tanggal & Waktu Serah Terima</label>
            <input
              type="datetime-local"
              className="input"
              required
              value={form.scheduled_date}
              onChange={e => setForm({ ...form, scheduled_date: e.target.value })}
            />
            <p className="text-xs text-slate-500">
              {modal.mode === 'create'
                ? 'Notifikasi akan dikirim ke aplikasi mobile customer untuk dikonfirmasi.'
                : 'Mengubah jadwal akan mereset status ke "Menunggu Respon Customer" dan notifikasi ulang dikirim ke customer.'}
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="label">Catatan Tambahan (Opsional)</label>
            <textarea
              className="input resize-none h-20"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Instruksi, lokasi, atau informasi tambahan..."
            />
          </div>
          <div className="flex justify-end pt-2 gap-2">
            <button type="button" onClick={() => setModal({ open: false, mode: 'create', data: null })} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : modal.mode === 'create' ? 'Buat Jadwal' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Konfirmasi Hasil Serah Terima ────────────── */}
      <Modal
        open={resultModal.open}
        onClose={() => { setResultModal({ open: false, handover: null }); setResultNotes(''); }}
        title="Konfirmasi Hasil Serah Terima"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Apakah serah terima pada{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {resultModal.handover ? fmtDateTime(getScheduledDate(resultModal.handover)) : '—'}
            </span>{' '}
            berjalan?
          </p>
          <div className="space-y-1.5">
            <label className="label">Catatan (Opsional)</label>
            <textarea
              className="input resize-none h-20"
              value={resultNotes}
              onChange={e => setResultNotes(e.target.value)}
              placeholder="Catatan hasil serah terima, kondisi unit, dsb..."
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => handleConfirmResult(true)}
              disabled={saving}
              className="btn-primary flex-1 bg-emerald-600 hover:bg-emerald-700 border-none justify-center"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {saving ? 'Menyimpan...' : 'Serah Terima Berjalan ✓'}
            </button>
            <button
              onClick={() => handleConfirmResult(false)}
              disabled={saving}
              className="btn-danger flex-1 justify-center"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {saving ? 'Menyimpan...' : 'Gagal / Customer Tidak Hadir ✗'}
            </button>
          </div>
          <div className="text-center">
            <button
              onClick={() => { setResultModal({ open: false, handover: null }); setResultNotes(''); }}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Batal, kembali
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Confirm: Hapus ──────────────────────────────────── */}
      <Confirm
        open={confirm.open}
        onClose={() => setConfirm({ open: false })}
        onConfirm={handleDelete}
        title="Hapus Jadwal Handover"
        description="Yakin ingin menghapus jadwal serah terima ini? Tindakan ini tidak dapat dibatalkan."
        loading={saving}
      />
    </div>
  );
}
