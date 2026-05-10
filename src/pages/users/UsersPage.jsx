import { useEffect, useState } from 'react';
import { usersAPI, companiesAPI } from '../../api/services';
import { PageLoader, EmptyState, SearchInput, Modal, Confirm, Pagination, Avatar, Select } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { getStatusColor, getStatusLabel, formatDate, extractError } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { Users, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';

const EMPTY_FORM = { nama: '', email: '', password: '', nomor_telepon: '', role: 'customer', company_id: '', status: 'active' };

export default function UsersPage() {
  const { isRole, user: me } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPw, setShowPw] = useState(false);
  const limit = 15;

 
   const load = async () => {
      setLoading(true);
      try {
        const r = await usersAPI.list({ page, limit, search: search || undefined });
        setUsers(r.data.data || []);
        setTotal(r.data.meta?.total || 0);
      } catch (err) {
        toast(extractError(err), "error");
      } finally {
        setLoading(false);
      }
    };
  
    useEffect(() => {
      const fetchPageData = async () => {
        try {
          const r = await usersAPI.list({ page, limit, search: search || undefined });
          setUsers(r.data.data || []);
          setTotal(r.data.meta?.total || 0);
        } catch (err) {
          toast(extractError(err), "error");
        } finally {
          setLoading(false);
        }
      };
  
      fetchPageData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, search]);
  
  
  
  useEffect(() => { 
    if (isRole('super_admin')) {
      companiesAPI.list().then(r => setCompanies(r.data.data || [])); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => { 
    setForm(EMPTY_FORM); 
    setModal({ open: true, mode: 'create' }); 
  };
  
  const openEdit = (u) => {
    setForm({ nama: u.nama, email: u.email, password: '', nomor_telepon: u.nomor_telepon || '', role: u.role, company_id: u.company_id || '', status: u.status });
    setModal({ open: true, mode: 'edit', data: u });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (modal.mode === 'edit' && !payload.password) delete payload.password;
      if (!payload.company_id) delete payload.company_id;
      
      if (modal.mode === 'create') { 
        await usersAPI.create(payload); 
        toast('User berhasil dibuat', 'success'); 
      } else { 
        await usersAPI.update(modal.data.id, payload); 
        toast('User berhasil diperbarui', 'success'); 
      }
      setModal({ open: false });
      load();
    } catch (err) { 
      toast(extractError(err), 'error'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await usersAPI.delete(confirm.id);
      toast('User berhasil dihapus', 'success');
      setConfirm({ open: false });
      load();
    } catch (err) { 
      toast(extractError(err), 'error'); 
    } finally { 
      setSaving(false); 
    }
  };

  const roleOptions = [
    ...(isRole('super_admin') ? [{ value: 'super_admin', label: 'Super Admin' }, { value: 'admin', label: 'Admin' }] : []),
    { value: 'customer', label: 'Customer' },
  ];
  const companyOptions = companies.map(c => ({ value: c.id, label: c.nama_pt }));
  const roleColors = { super_admin: 'badge-red', admin: 'badge-blue', customer: 'badge-gray' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Pengguna</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{total} akun terdaftar di sistem</p>
        </div>
        {isRole('super_admin', 'admin') && (
          <button className="btn-primary whitespace-nowrap" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />Tambah Pengguna
          </button>
        )}
      </div>

      <SearchInput value={search} onChange={(val) => { setSearch(val); setPage(1); }} placeholder="Cari berdasarkan nama atau email..." />

      {loading ? (
        <PageLoader />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="Belum ada pengguna" description="Hasil pencarian tidak ditemukan." />
      ) : (
        <div className="card">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Data Pengguna</th>
                  <th className="px-6 py-4 font-semibold">Akses / Role</th>
                  <th className="px-6 py-4 font-semibold">No. Telepon</th>
                  <th className="px-6 py-4 font-semibold">Perusahaan</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Tanggal Bergabung</th>
                  <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/25 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.nama} size="md" />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            {u.nama}
                            {u.id === me?.id && <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30">Anda</span>}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${roleColors[u.role] || 'badge-gray'}`}>{getStatusLabel(u.role)}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{u.nomor_telepon || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {u.company_id ? companies.find(c => c.id === u.company_id)?.nama_pt || '-' : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${getStatusColor(u.status)}`}>{getStatusLabel(u.status)}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-medium">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(u)} className="btn-ghost !p-2 inline-flex">
                          <Pencil className="w-4 h-4 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400" />
                        </button>
                        {u.id !== me?.id && isRole('super_admin') && (
                          <button onClick={() => setConfirm({ open: true, id: u.id })} className="btn-ghost !p-2 inline-flex">
                            <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onChange={setPage} />

      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.mode === 'create' ? 'Tambah Akun Pengguna' : 'Edit Akun Pengguna'} size="md">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Nama Lengkap</label>
              <input className="input" required value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} placeholder="Nama pengguna" />
            </div>
            <div className="space-y-1.5">
              <label className="label">Alamat Email</label>
              <input type="email" className="input" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@contoh.com" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">{modal.mode === 'edit' ? 'Password Baru (Opsional)' : 'Password'}</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input pr-10" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={modal.mode === 'create'} minLength={modal.mode === 'create' ? 8 : 0} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="label">Nomor Telepon</label>
              <input className="input" value={form.nomor_telepon} onChange={e => setForm(f => ({ ...f, nomor_telepon: e.target.value }))} placeholder="08..." />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Role Akses</label>
              <Select value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))} options={roleOptions} />
            </div>
            <div className="space-y-1.5">
              <label className="label">Status Akun</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>
          {isRole('super_admin') && (
            <div className="space-y-1.5">
              <label className="label">Afiliasi Perusahaan</label>
              <Select value={form.company_id} onChange={v => setForm(f => ({ ...f, company_id: v }))} options={companyOptions} placeholder="Tidak ada (Akses Semua Sistem)" />
            </div>
          )}
          <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" className="btn-secondary" onClick={() => setModal({ open: false })} disabled={saving}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Data'}</button>
          </div>
        </form>
      </Modal>

      <Confirm open={confirm.open} onClose={() => setConfirm({ open: false })} onConfirm={handleDelete}
        title="Hapus Akun Pengguna" description="Data pengguna akan dihapus secara permanen dari sistem. Tindakan ini tidak dapat dibatalkan." loading={saving} />
    </div>
  );
}