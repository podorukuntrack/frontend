import { useState, useEffect, useRef } from 'react';
import { Modal, Spinner } from '../../components/ui';
import { companiesAPI } from '../../api/services';
import { UploadCloud, X } from 'lucide-react';

export default function BannerModal({ open, onClose, banner, onSave, loading }) {
  const [formData, setFormData] = useState({
    name: '',
    linkUrl: '',
    isActive: 'true'
  });
  
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [companies, setCompanies] = useState([]);
  const [isGlobal, setIsGlobal] = useState(true);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await companiesAPI.list();
      setCompanies(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch companies', err);
    }
  };

  useEffect(() => {
    if (banner) {
      setFormData({
        name: banner.name || '',
        linkUrl: banner.linkUrl || '',
        isActive: banner.isActive || 'true'
      });
      setPreviewUrl(banner.imageUrl || '');
      setFile(null);
      
      const targets = banner.targetCompanies || [];
      if (targets.length === 0) {
        setIsGlobal(true);
        setSelectedCompanies([]);
      } else {
        setIsGlobal(false);
        setSelectedCompanies(targets);
      }
    } else {
      setFormData({
        name: '',
        linkUrl: '',
        isActive: 'true'
      });
      setPreviewUrl('');
      setFile(null);
      setIsGlobal(true);
      setSelectedCompanies([]);
    }
  }, [banner, open]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(banner ? banner.imageUrl : '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleCompany = (companyId) => {
    setSelectedCompanies(prev => 
      prev.includes(companyId) ? prev.filter(id => id !== companyId) : [...prev, companyId]
    );
  };

  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!banner && !file) {
      alert("Silakan unggah gambar banner!");
      return;
    }

    const payload = new FormData();
    payload.append('name', formData.name);
    payload.append('linkUrl', formData.linkUrl);
    payload.append('isActive', formData.isActive);
    
    const finalCompanies = isGlobal ? [] : selectedCompanies;
    payload.append('targetCompanies', JSON.stringify(finalCompanies));

    if (file) {
      payload.append('file', file);
    }
    
    setUploadProgress(0);
    const config = {
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
      }
    };

    try {
      await onSave(payload, config);
    } finally {
      setUploadProgress(0);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={banner ? "Edit Banner" : "Tambah Banner"} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {loading && uploadProgress > 0 && (
          <div className="w-full mb-4">
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <p className="text-xs text-slate-500 mt-1 text-right">{uploadProgress}% diunggah...</p>
          </div>
        )}
        
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
            Gambar Banner {(!banner) && <span className="text-rose-500">*</span>}
          </label>
          
          {previewUrl ? (
             <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 h-40 relative group overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                <button type="button" onClick={handleRemoveFile} className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-4 h-4" />
                </button>
             </div>
          ) : (
            <div className="mt-2 flex justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-6 py-8 hover:border-indigo-500 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-slate-300" aria-hidden="true" />
                <div className="mt-4 flex text-sm leading-6 text-slate-600 dark:text-slate-400 justify-center">
                  <span className="relative cursor-pointer rounded-md font-semibold text-indigo-600 focus-within:outline-none hover:text-indigo-500">
                    <span>Upload file</span>
                  </span>
                  <p className="pl-1">atau drag and drop</p>
                </div>
                <p className="text-xs leading-5 text-slate-500">PNG, JPG, WEBP max 5MB</p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Target Perusahaan
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Global (Semua Perusahaan)</span>
              <button 
                type="button"
                role="switch"
                aria-checked={isGlobal}
                onClick={() => setIsGlobal(!isGlobal)}
                className={`${isGlobal ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'} relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2`}
              >
                <span className={`${isGlobal ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
              </button>
            </div>
          </div>
          
          {!isGlobal && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl mt-3 animate-fadeIn">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">Pilih satu atau lebih perusahaan:</p>
              {companies.length === 0 ? (
                 <p className="text-sm text-slate-500 italic">Belum ada data perusahaan.</p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                  {companies.map(c => {
                    const isSelected = selectedCompanies.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCompany(c.id)}
                        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                          isSelected 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-400 dark:bg-indigo-400' : 'border-slate-300 dark:border-slate-600 bg-transparent'}`}>
                          {isSelected && <svg className="w-2.5 h-2.5 text-white dark:text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        {c.nama_pt || c.name || 'Tanpa Nama'}
                      </button>
                    );
                  })}
                </div>
              )}
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
            {banner ? 'Simpan Perubahan' : 'Upload Banner'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
