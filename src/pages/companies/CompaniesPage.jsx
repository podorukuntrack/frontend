import { useEffect, useState } from 'react';
import { companiesAPI, documentationAPI } from '../../api/services';
import { PageLoader, EmptyState, Modal } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { formatDate, extractError } from '../../utils/helpers';
import { Building2, Plus, Pencil, MapPin, Camera } from 'lucide-react';

const EMPTY_FORM = { nama_pt: '', kode_pt: '', alamat: '', logo_url: '', theme_color: '#4f46e5' };

export default function CompaniesPage() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = async () => {
    setLoading(true);
    try {
      const r = await companiesAPI.list();
      setCompanies(r.data.data || []);
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => { 
    setForm(EMPTY_FORM); 
    setModal({ open: true, mode: 'create' }); 
  };
  
  const openEdit = (c) => {
    setForm({ 
      nama_pt: c.nama_pt, 
      kode_pt: c.kode_pt, 
      alamat: c.alamat || '', 
      logo_url: c.logo_url || '', 
      theme_color: c.theme_color || '#4f46e5' 
    });
    setModal({ open: true, mode: 'edit', data: c });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast('Ukuran logo maksimal 2MB', 'error');
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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'create') { 
        await companiesAPI.create(form); 
        toast('Perusahaan berhasil ditambahkan', 'success'); 
      } else { 
        await companiesAPI.update(modal.data.id, form); 
        toast('Perusahaan berhasil diperbarui', 'success'); 
      }
      setModal({ open: false });
      load();
    } catch (err) { 
      toast(extractError(err), 'error'); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Perusahaan</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{companies.length} perusahaan terdaftar</p>
        </div>
        <button className="btn-primary whitespace-nowrap" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" />
          Tambah Perusahaan
        </button>
      </div>

      {/* DATA DISPLAY */}
      {loading ? (
        <PageLoader />
      ) : companies.length === 0 ? (
        <EmptyState icon={Building2} title="Belum ada perusahaan" description="Tambahkan perusahaan ke sistem untuk memulai" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {companies.map(c => {
            const theme = c.theme_color || '#4f46e5';
            return (
              <div 
                key={c.id} 
                className="card-hover p-6 group flex flex-col justify-between h-full relative overflow-hidden transition-all duration-300 border-t-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800"
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
                {/* Large Background Watermark */}
                <div className="absolute -right-6 -bottom-6 transition-all duration-300 pointer-events-none w-36 h-36 flex items-center justify-center opacity-[0.08] group-hover:opacity-[0.16] dark:opacity-[0.12] dark:group-hover:opacity-[0.20]">
                  {c.logo_url ? (
                    <img 
                      src={c.logo_url} 
                      alt="" 
                      className="w-full h-full object-contain filter grayscale brightness-75 dark:brightness-125 contrast-125 rotate-12 scale-110" 
                    />
                  ) : (
                    <Building2 className="w-32 h-32" style={{ color: theme }} />
                  )}
                </div>

                <div className="relative z-10 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-14 h-14 bg-white dark:bg-white rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-100 shadow-sm overflow-hidden p-1 shrink-0">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt={c.nama_pt} className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-6 h-6 text-indigo-400" />
                        )}
                      </div>
                      <button onClick={() => openEdit(c)} className="btn-ghost !p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil className="w-4 h-4 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400" />
                      </button>
                    </div>
                    
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1.5 leading-tight">{c.nama_pt}</h3>
                    <div className="inline-flex items-center px-2 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 text-xs font-mono font-semibold rounded-md border border-indigo-100 dark:border-indigo-500/20 mb-4" style={{ backgroundColor: `${theme}15`, color: theme, borderColor: `${theme}25` }}>
                      {c.kode_pt}
                    </div>
                    
                    {c.alamat && (
                      <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
                        <span className="line-clamp-2">{c.alamat}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                      Ditambahkan pada {formatDate(c.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.mode === 'create' ? 'Tambah Perusahaan' : 'Edit Perusahaan'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="label">Nama Perusahaan</label>
            <input className="input" required value={form.nama_pt} onChange={e => setForm(f => ({ ...f, nama_pt: e.target.value }))} placeholder="Contoh: PT Golden Raya" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Kode PT</label>
              <input className="input" required value={form.kode_pt} onChange={e => setForm(f => ({ ...f, kode_pt: e.target.value }))} placeholder="Contoh: GR-A" />
            </div>
            
            <div className="space-y-1.5">
              <label className="label">Logo Perusahaan</label>
              <div className="flex items-center gap-3">
                {form.logo_url && (
                  <img src={form.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-1" />
                )}
                <label className="btn-secondary !py-2.5 !px-3 text-xs cursor-pointer inline-flex items-center">
                  <Camera className="w-3.5 h-3.5 mr-1" />
                  Pilih Logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="label">Alamat Lengkap</label>
            <input className="input" value={form.alamat} onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))} placeholder="Contoh: Jakarta, Indonesia" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Warna Tema Perusahaan</label>
              <div className="flex items-center gap-3">
                <input type="color" className="w-10 h-10 border-0 rounded-lg cursor-pointer p-0 bg-transparent" value={form.theme_color || '#4f46e5'} onChange={e => setForm(f => ({ ...f, theme_color: e.target.value }))} />
                <span className="text-sm font-mono text-slate-500 uppercase tracking-wider font-semibold">{form.theme_color || '#4f46e5'}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" className="btn-secondary" onClick={() => setModal({ open: false })} disabled={saving}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Data'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
