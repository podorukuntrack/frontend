export const formatDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
};

export const getStatusColor = (status) => {
  const map = {
    active: 'badge-green', completed: 'badge-blue', on_hold: 'badge-yellow',
    selesai: 'badge-green', dalam_pembangunan: 'badge-yellow', belum_mulai: 'badge-gray',
    inactive: 'badge-red',
  };
  return map[status] || 'badge-gray';
};

export const getStatusLabel = (status) => {
  const map = {
    active: 'Aktif', completed: 'Selesai', on_hold: 'Ditahan',
    selesai: 'Selesai', dalam_pembangunan: 'Dalam Pembangunan', belum_mulai: 'Belum Mulai',
    inactive: 'Nonaktif', super_admin: 'Super Admin', admin: 'Admin', customer: 'Customer',
    foto: 'Foto', video: 'Video', dokumen: 'Dokumen',
  };
  return map[status] || status;
};

export const getProgressColor = (pct) => {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-blue-500';
  if (pct >= 20) return 'bg-amber-500';
  return 'bg-red-500';
};

export const extractError = (err) => {
  return err?.response?.data?.error?.message
    || err?.response?.data?.message
    || err?.message
    || 'Terjadi kesalahan';
};

/**
 * Memformat angka menjadi format mata uang Rupiah
 * @param {number|string} amount - Angka yang akan diformat
 * @param {boolean} showDecimal - Apakah ingin menampilkan .00 di akhir
 * @returns {string}
 */
export const formatCurrency = (amount, showDecimal = false) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'Rp 0';
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    // Jika tidak ingin ada desimal (.00), set minimumFractionDigits ke 0
    minimumFractionDigits: showDecimal ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
};