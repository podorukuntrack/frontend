import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { companiesAPI, projectsAPI, documentationAPI } from '../../../api/services';
import { PageLoader, EmptyState, SearchInput, Modal, Confirm, CardSkeleton } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import { getStatusColor, getStatusLabel, formatDate, extractError } from '../../../utils/helpers';
import { useAuth } from '../../../context/AuthContext';
import { FolderKanban, Plus, Pencil, Trash2, MapPin, Calendar, ArrowRight } from 'lucide-react';

const EMPTY_FORM = { nama_proyek: '', lokasi: '', deskripsi: '', status: 'active', logo_url: '', theme_color: '#4f46e5' };

export default function ProjectList() {
  const navigate = useNavigate();
  const { isRole, user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const needsCompanyPicker = isRole('super_admin') || (isRole('admin') && !user?.companyId);

  const queryClient = useQueryClient();

  const { data: projects = [], isLoading: loading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const r = await projectsAPI.list();
      return r.data?.data || [];
    }
  });

  useEffect(() => {
    if (!needsCompanyPicker) return;
    companiesAPI
      .list()
      .then((r) => setCompanies(r.data.data || []))
      .catch((err) => toast(extractError(err), 'error'));
  }, [needsCompanyPicker, toast]);
  
  const filtered = projects.filter(p =>
    p.nama_proyek?.toLowerCase().includes(search.toLowerCase()) ||
    p.lokasi?.toLowerCase().includes(search.toLowerCase())
  );

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast('Hanya file gambar yang diperbolehkan!', 'error');
      return;
    }

    try {
      const fd = new FormData();
      fd.append('jenis', 'logo');
      fd.append('file', file);

      toast('Mengunggah logo...', 'info');
      const uploadRes = await documentationAPI.upload(fd);
      const url = uploadRes.data?.data?.url;

      if (!url) throw new Error('Gagal mendapatkan URL logo');

      setForm(f => ({ ...f, logo_url: url }));
      toast('Logo berhasil diunggah', 'success');
    } catch (err) {
      toast(extractError(err), 'error');
    }
  };

  const openCreate = () => { 
    setForm({
      ...EMPTY_FORM,
      company_id: user?.companyId || '',
      logo_url: '',
      theme_color: '#4f46e5',
    }); 
    setModal({ open: true, mode: 'create' }); 
  };
  
  const openEdit = (p, e) => {
    e.stopPropagation();
    setForm({
      nama_proyek: p.nama_proyek || '',
      lokasi: p.lokasi || '',
      deskripsi: p.deskripsi || '',
      status: p.status || 'active',
      logo_url: p.logo_url || '',
      theme_color: p.theme_color || '#4f46e5',
      company_id: p.company_id || p.company?.id || user?.companyId || '',
    });
    setModal({ open: true, mode: 'edit', data: p });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await projectsAPI.create(form);
        toast('Proyek baru berhasil dibuat', 'success');
      } else {
        await projectsAPI.update(modal.data.id, form);
        toast('Detail proyek berhasil diperbarui', 'success');
      }
      setModal({ open: false, mode: 'create', data: null });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await projectsAPI.delete(confirm.id);
      toast('Proyek berhasil dihapus', 'success');
      setConfirm({ open: false, id: null });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Daftar Proyek</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kelola portofolio dan status proyek properti Anda</p>
        </div>
        {isRole('admin') && (
          <button className="btn-primary whitespace-nowrap" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" /> Tambah Proyek
          </button>
        )}
      </div>

      <div className="w-full max-w-md">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari nama proyek atau lokasi..." />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Proyek tidak ditemukan" description="Tidak ada proyek yang sesuai dengan kriteria pencarian Anda." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => {
            const theme = p.theme_color || '#4f46e5';
            return (
              <div 
                key={p.id} 
                onClick={() => navigate(`/projects/${p.id}/clusters`)} 
                className="card-hover p-6 group flex flex-col justify-between h-full cursor-pointer relative overflow-hidden transition-all duration-300 border-t-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800"
                style={{ 
                  borderTopColor: theme,
                  boxShadow: `0 10px 30px -10px ${theme}40`,
                  background: `linear-gradient(180deg, ${theme}0e 0%, transparent 100%)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 20px 40px -8px ${theme}60`;
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.borderColor = `${theme}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `0 10px 30px -10px ${theme}40`;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '';
                }}
              >
                <div className="absolute -right-6 -bottom-6 transition-all duration-300 pointer-events-none w-36 h-36 flex items-center justify-center opacity-[0.08] group-hover:opacity-[0.16] dark:opacity-[0.12] dark:group-hover:opacity-[0.20]">
                  {p.logo_url ? (
                    <img 
                      src={p.logo_url} 
                      alt="" 
                      className="w-full h-full object-contain filter grayscale brightness-75 dark:brightness-125 contrast-125 rotate-12 scale-110" 
                    />
                  ) : (
                    <FolderKanban className="w-32 h-32" style={{ color: theme }} />
                  )}
                </div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    {/* PREMIUM LOGO CONTAINER */}
                    {p.logo_url ? (
                      <div className="w-12 h-12 rounded-xl bg-white dark:bg-white p-1 border border-slate-200/80 dark:border-slate-100 shadow-sm flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shrink-0 overflow-hidden">
                        <img 
                          src={p.logo_url} 
                          alt={`${p.nama_proyek} Logo`} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 shadow-sm transition-transform duration-300 group-hover:scale-110">
                        <FolderKanban className="w-6 h-6" style={{ color: theme }} />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <span className={`badge`} style={{ backgroundColor: `${theme}15`, color: theme, border: `1px solid ${theme}25` }}>
                        {getStatusLabel(p.status)}
                      </span>
                      {isRole('admin') && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-slate-900/80 rounded-lg p-1 shadow-sm border border-slate-100 dark:border-slate-800">
                          <button onClick={(e) => openEdit(p, e)} className="btn-ghost !p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"><Pencil className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirm({ open: true, id: p.id }); }} className="btn-ghost !p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 leading-tight transition-colors flex items-center" style={{ '--hover-color': theme }}>
                    <span className="group-hover:text-[var(--hover-color)] transition-colors duration-200">{p.nama_proyek}</span>
                    <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" style={{ color: theme }} />
                  </h3>
                  {p.deskripsi && <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2 leading-relaxed">{p.deskripsi}</p>}
                </div>
                
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 relative z-10">
                  <div className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400 font-medium">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
                    <span className="line-clamp-1">{p.lokasi}</span>
                  </div>
                 
                  <div className="flex items-start gap-2.5 text-sm text-slate-500 dark:text-slate-500">
                    <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Dibuat {formatDate(p.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.mode === 'create' ? 'Tambah Proyek' : 'Edit Proyek'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="label">Nama Proyek</label>
            <input className="input" required value={form.nama_proyek} onChange={e => setForm(f => ({ ...f, nama_proyek: e.target.value }))} placeholder="Contoh: Grand Central 2026" />
          </div>
          {needsCompanyPicker && (
            <div className="space-y-1.5">
              <label className="label">Perusahaan</label>
              <select
                className="input"
                required
                value={form.company_id || ''}
                onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}
              >
                <option value="">Pilih perusahaan...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.nama_pt || c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Lokasi</label>
              <input className="input" required value={form.lokasi} onChange={e => setForm(f => ({ ...f, lokasi: e.target.value }))} placeholder="Contoh: Jakarta Timur" />
            </div>
            
            <div className="space-y-1.5">
              <label className="label">Logo Proyek</label>
              <div className="flex items-center gap-3">
                {form.logo_url && (
                  <img src={form.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 p-1" />
                )}
                <label className="btn-secondary !py-2 !px-3 text-xs cursor-pointer inline-flex items-center">
                  Pilih File Logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Warna Tema Proyek</label>
              <div className="flex items-center gap-3">
                <input type="color" className="w-10 h-10 border-0 rounded-lg cursor-pointer p-0 bg-transparent" value={form.theme_color || '#4f46e5'} onChange={e => setForm(f => ({ ...f, theme_color: e.target.value }))} />
                <span className="text-sm font-mono text-slate-500 uppercase tracking-wider font-semibold">{form.theme_color || '#4f46e5'}</span>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="label">Status Proyek</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Sedang Berjalan (Active)</option>
                <option value="completed">Telah Selesai (Completed)</option>
                <option value="on_hold">Ditunda (On Hold)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="label">Deskripsi</label>
            <textarea className="input resize-none h-24" value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))} placeholder="Jelaskan detail singkat proyek ini..." />
          </div>
          
          <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" className="btn-secondary" onClick={() => setModal({ open: false })} disabled={saving}>Batal</button>
            <button type="submit" className="btn-podorukun" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Data'}</button>
          </div>
        </form>
      </Modal>

      <Confirm open={confirm.open} onClose={() => setConfirm({ open: false })} onConfirm={handleDelete}
        title="Hapus Proyek" description="Apakah Anda yakin ingin menghapus proyek ini? Semua cluster, unit, dan progres di dalamnya akan ikut terhapus." loading={saving} />
    </div>
  );
}
