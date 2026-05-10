import { useEffect, useState } from 'react';
import { progressAPI, unitsAPI } from '../../api/services';
import { PageLoader, EmptyState, Modal, ProgressBar, Select } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { formatDate, extractError } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, Plus, Pencil, Calendar, StickyNote } from 'lucide-react';

const EMPTY_FORM = { unit_id: '', tahap: '', progress_percentage: 0, tanggal_update: '', catatan: '' };

// ─────────────────────────────────────────────────────────────
// Normalize: ubah struktur nested dari API → flat yang dipakai komponen
// API mengembalikan: { id, tahap, progress_percentage, tanggal_update, catatan, unit: { id, nomor_unit, progress_percentage, cluster: { nama_cluster, project: { nama_proyek } } } }
// Komponen butuh: { progress_id, unit_id, nomor_unit, nama_cluster, nama_proyek, tahap, progress_pembangunan, tanggal_update, catatan }
// ─────────────────────────────────────────────────────────────
function normalize(item) {
  const unit = item.unit || {};
  const cluster = unit.cluster || {};
  const project = cluster.project || cluster.projects || {};

  return {
    // ID progress (untuk edit)
    progress_id: item.id,

    // Field unit (untuk grouping & tampilan)
    unit_id:    unit.id         || item.unit_id,
    nomor_unit: unit.nomor_unit || item.nomor_unit || '—',
    nama_cluster: cluster.nama_cluster || item.nama_cluster || '—',
    nama_proyek:  project.nama_proyek  || item.nama_proyek  || '—',

    // Progress step ini
    tahap:               item.tahap,
    progress_pembangunan: item.progress_percentage ?? item.progress_pembangunan ?? 0,
    tanggal_update:      item.tanggal_update,
    catatan:             item.catatan || '',

    // Opsional: nama pembeli dari relasi assignment (jika API sertakan)
    nama_pembeli: item.nama_pembeli || null,
  };
}

export default function ProgressPage() {
  const { isRole } = useAuth();
  const { toast } = useToast();
  const [progress, setProgress] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUnit, setFilterUnit] = useState('');
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // ── Load data progress ──────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const params = filterUnit ? { unit_id: filterUnit } : {};
      const r = await progressAPI.list(params);

      const raw = r.data?.data || r.data || [];
      // Normalize semua item supaya field-nya konsisten
      const normalized = Array.isArray(raw) ? raw.map(normalize) : [];
      setProgress(normalized);
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

 

  useEffect(() => { 
    const fetchProgress = async () => {
      try {
        const params = filterUnit ? { unit_id: filterUnit } : {};
        const r = await progressAPI.list(params);
        setProgress(r.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterUnit]);
  // ── Load daftar unit untuk dropdown filter & form ───────────
  useEffect(() => {
    unitsAPI.list({ limit: 500 }).then(r => setUnits(r.data?.data || []));
  }, []);

  // ── Modal helpers ───────────────────────────────────────────
  const openCreate = () => {
    setForm({ ...EMPTY_FORM, tanggal_update: new Date().toISOString().split('T')[0] });
    setModal({ open: true, mode: 'create' });
  };

  const openEdit = (p) => {
    setForm({
      unit_id:             p.unit_id,
      tahap:               p.tahap,
      progress_percentage: p.progress_pembangunan,
      tanggal_update:      p.tanggal_update,
      catatan:             p.catatan || '',
    });
    setModal({ open: true, mode: 'edit', data: p });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, progress_percentage: parseInt(form.progress_percentage) };
      if (modal.mode === 'create') {
        await progressAPI.create(payload);
        toast('Progress berhasil ditambahkan', 'success');
      } else {
        await progressAPI.update(modal.data.progress_id, {
          progress_percentage: payload.progress_percentage,
          catatan: payload.catatan,
        });
        toast('Progress berhasil diperbarui', 'success');
      }
      setModal({ open: false });
      load();
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Opsi dropdown unit ──────────────────────────────────────
  const unitOptions = units.map(u => ({
    value: u.id,
    label: `${u.nomor_unit} — ${u.cluster?.nama_cluster || 'No Cluster'}`,
  }));

  // ── Grouping: 1 card per unit, berisi timeline tahapannya ───
  // Setelah normalize, semua item sudah punya unit_id yang benar
  const grouped = progress.reduce((acc, p) => {
    const key = p.unit_id || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        nomor_unit:   p.nomor_unit,
        nama_cluster: p.nama_cluster,
        nama_proyek:  p.nama_proyek,
        items: [],
      };
    }
    acc[key].items.push(p);
    return acc;
  }, {});

  // Progress terbaru per unit = item dengan progress_pembangunan tertinggi
  const latestPct = (items) =>
    Math.max(...items.map(i => i.progress_pembangunan || 0));

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Progress Pembangunan
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {Object.keys(grouped).length} unit · {progress.length} riwayat update
          </p>
        </div>
        {isRole('super_admin', 'admin') && (
          <button className="btn-primary whitespace-nowrap" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />Tambah Progress
          </button>
        )}
      </div>

      {/* ── Filter unit ── */}
      <div className="w-full sm:w-72">
        <Select
          value={filterUnit}
          onChange={setFilterUnit}
          options={unitOptions}
          placeholder="Semua Unit"
        />
      </div>

      {/* ── Konten utama ── */}
      {loading ? (
        <PageLoader />
      ) : Object.keys(grouped).length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Belum ada progress"
          description="Data tidak ditemukan atau belum ada update."
        />
      ) : (
        <div className="grid gap-6">
          {Object.entries(grouped).map(([unitId, group]) => {
            const pct = latestPct(group.items);
            return (
              <div key={unitId} className="card p-6">

                {/* ── Card header: nama unit + progress bar ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                      Unit {group.nomor_unit}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-0.5">
                      {group.nama_cluster} — {group.nama_proyek}
                    </p>
                  </div>

                  {/* Badge persentase + bar */}
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono w-10 text-right">
                      {pct}%
                    </span>
                    <ProgressBar
                      value={pct}
                      className="w-32 !bg-slate-200 dark:!bg-slate-700"
                    />
                  </div>
                </div>

                {/* ── Timeline tahapan ── */}
                <div className="relative pl-2">
                  <div className="absolute left-[19px] top-2 bottom-4 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-6">
                    {[...group.items]
                      .sort((a, b) => b.progress_pembangunan - a.progress_pembangunan)
                      .map((p, i) => (
                        <div key={p.progress_id || i} className="flex gap-5 relative">
                          {/* Dot timeline */}
                          <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center z-10 border-2 ${
                            i === 0
                              ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500/20 dark:border-indigo-500/30'
                              : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700'
                          }`}>
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              i === 0 ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-300 dark:bg-slate-600'
                            }`} />
                          </div>

                          {/* Isi card tahapan */}
                          <div className="flex-1 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Nama tahap + badge % */}
                                <div className="flex items-center gap-2.5 mb-1.5">
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    {p.tahap}
                                  </span>
                                  <span className="text-xs font-bold text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-500/20 px-2 py-0.5 rounded-md">
                                    {p.progress_pembangunan}%
                                  </span>
                                </div>

                                {/* Tanggal + nama pembeli */}
                                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {formatDate(p.tanggal_update)}
                                  </div>
                                  {p.nama_pembeli && (
                                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                      <span>Pemilik: {p.nama_pembeli}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Catatan */}
                                {p.catatan && (
                                  <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 mt-3 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <StickyNote className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
                                    <p className="leading-relaxed">{p.catatan}</p>
                                  </div>
                                )}
                              </div>

                              {/* Tombol edit (hanya di tahap terbaru / i===0) */}
                              {isRole('super_admin', 'admin') && i === 0 && (
                                <button
                                  onClick={() => openEdit(p)}
                                  className="btn-ghost !p-2 bg-white dark:bg-slate-800 shadow-sm ml-3 flex-shrink-0"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal tambah / edit ── */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        title={modal.mode === 'create' ? 'Tambah Progress' : 'Edit Progress'}
      >
        <form onSubmit={handleSave} className="space-y-5">
          {modal.mode === 'create' && (
            <div className="space-y-1.5">
              <label className="label">Unit</label>
              <Select
                value={form.unit_id}
                onChange={v => setForm(f => ({ ...f, unit_id: v }))}
                options={unitOptions}
                placeholder="Pilih unit..."
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="label">Tahap</label>
            <input
              className="input"
              placeholder="Contoh: Pondasi, Struktur Beton..."
              value={form.tahap}
              onChange={e => setForm(f => ({ ...f, tahap: e.target.value }))}
              disabled={modal.mode === 'edit'}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="label">Progress ({form.progress_percentage}%)</label>
            <input
              type="range" min={0} max={100} step={5}
              className="w-full accent-indigo-600"
              value={form.progress_percentage}
              onChange={e => setForm(f => ({ ...f, progress_percentage: e.target.value }))}
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="label">Tanggal Update</label>
            <input
              type="date" className="input"
              value={form.tanggal_update}
              onChange={e => setForm(f => ({ ...f, tanggal_update: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="label">Catatan</label>
            <textarea
              className="input min-h-[80px] resize-none"
              placeholder="Keterangan kondisi lapangan..."
              value={form.catatan}
              onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button type="button" className="btn-secondary" onClick={() => setModal({ open: false })}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}