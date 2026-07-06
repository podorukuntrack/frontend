import { useState, useEffect } from 'react';
import { Modal, Spinner } from '../../components/ui';

export default function BannerModal({ open, onClose, banner, onSave, loading }) {
  const [formData, setFormData] = useState({
    name: '',
    imageUrl: '',
    linkUrl: '',
    isActive: 'true'
  });

  useEffect(() => {
    if (banner) {
      setFormData({
        name: banner.name || '',
        imageUrl: banner.imageUrl || '',
        linkUrl: banner.linkUrl || '',
        isActive: banner.isActive || 'true'
      });
    } else {
      setFormData({
        name: '',
        imageUrl: '',
        linkUrl: '',
        isActive: 'true'
      });
    }
  }, [banner, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal open={open} onClose={onClose} title={banner ? "Edit Banner" : "Tambah Banner"} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Nama Banner <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            className="input w-full"
            placeholder="Misal: Promo Akhir Tahun"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            URL Gambar <span className="text-rose-500">*</span>
          </label>
          <input
            type="url"
            required
            className="input w-full"
            placeholder="https://example.com/image.jpg"
            value={formData.imageUrl}
            onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
          />
          {formData.imageUrl && (
             <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 h-32 relative">
                <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
             </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Link Tujuan (Opsional)
          </label>
          <input
            type="url"
            className="input w-full"
            placeholder="https://example.com/promo"
            value={formData.linkUrl}
            onChange={e => setFormData({ ...formData, linkUrl: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Status
          </label>
          <select 
            className="input w-full"
            value={formData.isActive}
            onChange={e => setFormData({ ...formData, isActive: e.target.value })}
          >
            <option value="true">Aktif</option>
            <option value="false">Tidak Aktif</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4 justify-end border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
            Batal
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
            {loading && <Spinner size="sm" className="!text-current" />}
            {banner ? 'Simpan Perubahan' : 'Tambah Banner'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
