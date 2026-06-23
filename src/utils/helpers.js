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
  const status = err?.response?.status;
  const rawMessage = err?.response?.data?.error?.message 
    || err?.response?.data?.message 
    || err?.message 
    || 'Terjadi kesalahan sistem yang tidak diketahui';

  let title = 'Gagal Memproses Data';
  let description = rawMessage;

  // Translasi pesan teknis menjadi pesan berorientasi user (User-Friendly)
  if (status === 400) {
    title = 'Data Tidak Valid';
    if (description.includes('must match format')) {
      description = 'Pastikan format pengisian data sudah benar (misal: format email atau angka).';
    } else if (description.includes('required')) {
      description = 'Mohon lengkapi semua kolom yang wajib diisi pada formulir.';
    } else if (description.includes('JSON')) {
      description = 'Format pengiriman data tidak sesuai.';
    }
  } else if (status === 401) {
    title = 'Akses Ditolak';
    description = 'Sesi Anda telah berakhir atau Anda belum login. Silakan muat ulang halaman atau login kembali.';
  } else if (status === 403) {
    title = 'Akses Dibatasi';
    description = 'Anda tidak memiliki hak akses atau otorisasi untuk melakukan tindakan ini.';
  } else if (status === 404) {
    title = 'Data Tidak Ditemukan';
    description = rawMessage && !rawMessage.toLowerCase().includes('not found') 
        ? rawMessage 
        : 'Data yang Anda cari atau coba proses tidak dapat ditemukan di sistem.';
  } else if (status >= 500) {
    title = 'Kesalahan Server';
    description = 'Mohon maaf, terjadi gangguan pada server kami. Tim teknis sedang menangani kendala ini.';
  } else if (err?.code === 'ERR_NETWORK') {
    title = 'Koneksi Terputus';
    description = 'Gagal terhubung ke server. Periksa koneksi internet Anda dan coba lagi.';
  }

  // Return sebagai object untuk digunakan di komponen Toast baru
  return { title, description };
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
    maximumFractionDigits: showDecimal ? 2 : 0,
  }).format(amount);
};