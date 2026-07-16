import { useEffect, useState } from 'react';
import { usersAPI, companiesAPI, assignmentsAPI } from '../../api/services';
import { PageLoader, EmptyState, SearchInput, Modal, Confirm, Pagination, Avatar, Select } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { getStatusColor, getStatusLabel, formatDate, extractError } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { Users, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';

const EMPTY_FORM = {
  nama: '',
  email: '',
  password: '',
  nomor_telepon: '',
  role: '',
  company_id: '',
  status: 'active',
};

const LIMIT = 15;

export default function UsersPage() {
  const { isRole, user: me } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  // tick dipakai untuk force-refetch setelah save/delete tanpa mengubah page/search
  const [tick, setTick] = useState(0);
  // additional UI states
  const [roleConfirm, setRoleConfirm] = useState({ open: false, userId: null, newRole: '', oldRole: '', userName: '', companyId: '' });

  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPw, setShowPw] = useState(false);

  // ─── Fetch users ──────────────────────────────────────────────────────────
  // Semua setState dipanggil dari dalam async callback (bukan synchronous effect
  // body), sehingga tidak melanggar react-hooks/set-state-in-effect.
  // cancelled flag mencegah setState pada unmounted/stale effect.
  useEffect(() => {
    let cancelled = false;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const useLargeFetch = isRole('admin') || isRole('super_admin');
        const fetchLimit = useLargeFetch ? 1000 : LIMIT;
        const r = await usersAPI.list({
          page: useLargeFetch ? 1 : page,
          limit: fetchLimit,
          search: search.trim() || undefined,
        });
        if (cancelled) return;
        // Admin sees only customers in own company, others see all (except filtered by role later)
        if (isRole('super_admin')) {
          // Backend already excludes customers for super_admin
          setUsers(r.data.data || []);
          setTotal(r.data.meta?.total ?? (r.data.data || []).length);
        } else {
          setUsers(r.data.data || []);
          setTotal(r.data.meta?.total ?? 0);
        }
      } catch (err) {
        if (!cancelled) toast(extractError(err), 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUsers();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, tick]);

  // ─── Fetch companies (super_admin only) ───────────────────────────────────
  useEffect(() => {
    if (!isRole('super_admin')) return;
    companiesAPI.list()
      .then(r => setCompanies(r.data.data || []))
      .catch(err => toast(extractError(err), 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Helper: trigger ulang fetch setelah mutasi ───────────────────────────
  const refetch = () => setTick(t => t + 1);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ open: true, mode: 'create' });
  };

  const openEdit = (u) => {
    setForm({
      nama: u.nama,
      email: u.email,
      password: '',
      nomor_telepon: u.nomor_telepon || '',
      role: u.role,
      company_id: u.company_id || '',
      status: u.status,
    });
    setModal({ open: true, mode: 'edit', data: u });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (modal.mode === 'edit' && !payload.password) delete payload.password;
      if (!payload.company_id) delete payload.company_id;
      if (!payload.role) delete payload.role;

      if (modal.mode === 'create') {
        await usersAPI.create(payload);
        toast('User berhasil dibuat', 'success');
      } else {
        await usersAPI.update(modal.data.id, payload);
        toast('User berhasil diperbarui', 'success');
      }
      setModal({ open: false });
      refetch();
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmRoleUpdate = async () => {
    if (['admin', 'direksi'].includes(roleConfirm.newRole) && !roleConfirm.companyId) {
      toast('Pilih perusahaan terlebih dahulu', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { role: roleConfirm.newRole };
      if (['admin', 'direksi'].includes(roleConfirm.newRole)) {
        payload.company_id = roleConfirm.companyId;
      }
      await usersAPI.update(roleConfirm.userId, payload);
      toast('Role pengguna berhasil diperbarui', 'success');
      setRoleConfirm({ open: false, userId: null, newRole: '', oldRole: '', userName: '', companyId: '' });
      refetch();
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
      refetch();
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Options ──────────────────────────────────────────────────────────────
  const roleOptions = isRole('super_admin')
    ? [
        { value: 'super_admin', label: 'Super Admin' }, 
        { value: 'owner', label: 'Owner' },
        { value: 'direksi', label: 'Direksi' },
        { value: 'admin', label: 'Admin' }
      ]
    : [{ value: 'customer', label: 'Customer' }];
  const companyOptions = companies.map(c => ({ value: c.id, label: c.nama_pt }));
  const roleColors = { super_admin: 'badge-red', owner: 'badge-purple', direksi: 'badge-orange', admin: 'badge-blue', customer: 'badge-gray' };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Pengguna</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {total} akun terdaftar di sistem
          </p>
        </div>
        {isRole('super_admin', 'admin') && (
          <button className="btn-primary whitespace-nowrap" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />Tambah Pengguna
          </button>
        )}
      </div>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        placeholder="Cari berdasarkan nama atau email..."
      />

      {/* Table */}
      {loading ? (
        <PageLoader />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title={isRole('admin') ? 'Tidak ada customer di perusahaan Anda' : 'Belum ada pengguna'}
          description={isRole('admin') ? 'Tidak ada pelanggan yang memiliki unit di perusahaan Anda.' : 'Hasil pencarian tidak ditemukan.'}
        />
      ) : (
        <div className="card">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Data Pengguna</th>
                  <th className="px-6 py-4 font-semibold">Akses / Role</th>
                  <th className="px-6 py-4 font-semibold">No. Telepon</th>
                  { !isRole('admin') && <th className="px-6 py-4 font-semibold">Perusahaan</th> }
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
                            {u.id === me?.id && (
                              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30">
                                Anda
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isRole('super_admin') ? (
                        <select
                          key={`role-${u.id}-${u.role}-${tick}`}
                          className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          defaultValue={u.role}
                          disabled={u.id === me?.id}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            if (newRole !== u.role) {
                              setRoleConfirm({ open: true, userId: u.id, newRole, oldRole: u.role, userName: u.nama, companyId: u.company_id || '' });
                            }
                          }}
                        >
                          {roleOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`badge ${roleColors[u.role] || 'badge-gray'}`}>
                          {getStatusLabel(u.role)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                      {u.nomor_telepon || '-'}
                    </td>
                    { !isRole('admin') && (
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {u.company_id ? companies.find(c => c.id === u.company_id)?.kode_pt || '-' : '-'}
                      </td>
                    ) }
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-medium">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(u)} className="btn-ghost !p-2 inline-flex">
                          <Pencil className="w-4 h-4 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400" />
                        </button>
                        {u.id !== me?.id && isRole('super_admin', 'admin') && (
                          <button
                            onClick={() => setConfirm({ open: true, id: u.id })}
                            className="btn-ghost !p-2 inline-flex"
                          >
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

      <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />

      {/* Modal Create / Edit */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        title={modal.mode === 'create' ? 'Tambah Akun Pengguna' : 'Edit Akun Pengguna'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Nama Lengkap</label>
              <input
                className="input"
                required
                value={form.nama}
                onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                placeholder="Nama pengguna"
              />
            </div>
            <div className="space-y-1.5">
              <label className="label">Alamat Email</label>
              <input
                type="email"
                className="input"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@contoh.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">
                {modal.mode === 'edit' ? 'Password Baru (Opsional)' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required={modal.mode === 'create'}
                  minLength={modal.mode === 'create' ? 8 : 0}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="label">Nomor Telepon</label>
              <input
                className="input"
                value={form.nomor_telepon}
                onChange={e => setForm(f => ({ ...f, nomor_telepon: e.target.value }))}
                placeholder="08..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {isRole('super_admin') && modal.mode === 'create' && (
              <div className="space-y-1.5">
                <label className="label">Role Akses</label>
                <Select
                  value={form.role}
                  onChange={v => setForm(f => ({ ...f, role: v }))}
                  options={roleOptions}
                />
              </div>
            )}
          </div>

          {isRole('super_admin') && modal.mode === 'create' && ['direksi', 'admin'].includes(form.role) && (
            <div className="space-y-1.5">
              <label className="label">Afiliasi Perusahaan</label>
              <Select
                value={form.company_id}
                onChange={v => setForm(f => ({ ...f, company_id: v }))}
                options={companyOptions}
                placeholder="Pilih Perusahaan"
              />
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModal({ open: false })}
              disabled={saving}
            >
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <Confirm
        open={confirm.open}
        onClose={() => setConfirm({ open: false })}
        onConfirm={handleDelete}
        title="Hapus Akun Pengguna"
        description="Data pengguna akan dihapus permanen. PERHATIAN: Jika ini adalah akun customer, SELURUH data penugasan, riwayat pembayaran, progress, dan dokumen yang menempel pada unit customer ini juga akan direset dan dihapus secara permanen!"
        loading={saving}
      />
      {/* Confirm Role Change */}
      <Modal
        open={roleConfirm.open}
        onClose={() => {
          setRoleConfirm({ open: false, userId: null, newRole: '', oldRole: '', userName: '', companyId: '' });
          setTick(t => t + 1);
        }}
        title="Konfirmasi Perubahan Role"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300">
            Apakah Anda yakin ingin mengubah role akses <strong className="text-slate-900 dark:text-white">{roleConfirm.userName}</strong>?
          </p>
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <span className={`badge ${roleColors[roleConfirm.oldRole] || 'badge-gray'}`}>
              {getStatusLabel(roleConfirm.oldRole)}
            </span>
            <span className="text-slate-400">→</span>
            <span className={`badge ${roleColors[roleConfirm.newRole] || 'badge-gray'}`}>
              {getStatusLabel(roleConfirm.newRole)}
            </span>
          </div>
          {['admin', 'direksi'].includes(roleConfirm.newRole) && (
            <div className="space-y-1.5">
              <label className="label">Afiliasi Perusahaan</label>
              <select
                className="input"
                value={roleConfirm.companyId}
                onChange={(e) => setRoleConfirm(prev => ({ ...prev, companyId: e.target.value }))}
                required
              >
                <option value="">Pilih Perusahaan</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.nama_pt}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button 
              className="btn-secondary" 
              onClick={() => {
                setRoleConfirm({ open: false, userId: null, newRole: '', oldRole: '', userName: '', companyId: '' });
                setTick(t => t + 1);
              }} 
              disabled={saving}
            >
              Batal
            </button>
            <button className="btn-primary" onClick={confirmRoleUpdate} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Ya, Ubah Role'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}