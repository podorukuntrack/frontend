import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { bannersAPI } from '../../api/services';
import { Spinner, TableSkeleton, EmptyState, Confirm } from '../../components/ui';
import BannerModal from './BannerModal';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function BannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState(null);
  
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await bannersAPI.list();
      setBanners(res.data.data || []);
    } catch (err) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { id: Date.now(), msg: err.message, type: 'error' }
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setSelectedBanner(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (banner) => {
    setSelectedBanner(banner);
    setModalOpen(true);
  };

  const handleDeleteConfirm = (banner) => {
    setBannerToDelete(banner);
    setConfirmOpen(true);
  };

  const handleSave = async (data) => {
    try {
      setIsSaving(true);
      if (selectedBanner) {
        await bannersAPI.update(selectedBanner.id, data);
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { id: Date.now(), msg: 'Banner berhasil diperbarui', type: 'success' }
        }));
      } else {
        await bannersAPI.create(data);
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { id: Date.now(), msg: 'Banner berhasil ditambahkan', type: 'success' }
        }));
      }
      setModalOpen(false);
      fetchBanners();
    } catch (err) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { id: Date.now(), msg: err.message || 'Gagal menyimpan banner', type: 'error' }
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!bannerToDelete) return;
    try {
      setIsDeleting(true);
      await bannersAPI.delete(bannerToDelete.id);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { id: Date.now(), msg: 'Banner berhasil dihapus', type: 'success' }
      }));
      setConfirmOpen(false);
      fetchBanners();
    } catch (err) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { id: Date.now(), msg: err.message || 'Gagal menghapus banner', type: 'error' }
      }));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Banner Iklan</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola banner promosi dan iklan untuk mobile app.</p>
        </div>
        <button onClick={handleOpenAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          <span>Tambah Banner</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <TableSkeleton rows={4} />
        ) : banners.length === 0 ? (
          <EmptyState 
            icon={ExternalLink} 
            title="Belum ada banner" 
            description="Tambahkan banner iklan pertama Anda untuk ditampilkan di aplikasi mobile."
            action={<button onClick={handleOpenAdd} className="btn-primary mt-4">Tambah Banner</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Preview</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Banner</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Target</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Link Tujuan</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {banners.map((banner) => (
                  <tr key={banner.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="w-24 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <img src={banner.imageUrl} alt={banner.name} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-900 dark:text-white">
                      {banner.name}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400">
                      {banner.targetCompanies && banner.targetCompanies.length > 0 ? (
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 rounded-md text-xs font-medium">
                          {banner.targetCompanies.length} Perusahaan
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-md text-xs font-medium">
                          Global
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-500 dark:text-slate-400">
                      {banner.linkUrl ? (
                        <a href={banner.linkUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">
                          {banner.linkUrl.length > 25 ? banner.linkUrl.substring(0,25) + '...' : banner.linkUrl}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : '-'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        banner.isActive === 'true' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}>
                        {banner.isActive === 'true' ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenEdit(banner)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteConfirm(banner)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BannerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        banner={selectedBanner}
        onSave={handleSave}
        loading={isSaving}
      />

      <Confirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Banner"
        description={`Apakah Anda yakin ingin menghapus banner "${bannerToDelete?.name}"?`}
        confirmLabel="Hapus"
        loading={isDeleting}
      />
    </div>
  );
}
