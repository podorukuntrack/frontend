const JENIS_LABEL = {
  booking_fee: "Booking fee",
  uang_muka: "Uang muka",
  angsuran: "Angsuran",
  pencairan_kpr: "Pencairan KPR",
};

export const billLabel = (b) =>
  `Tagihan ke-${b.no_urut} · ${JENIS_LABEL[b.jenis] || b.jenis}${b.keterangan ? ` · ${b.keterangan}` : ""}`;

// Tagihan bisa dibayar bila masih aktif, belum lunas, dan tidak sedang menunggu keputusan Keuangan SI.
export const isBillPayable = (b) => b.aktif && Number(b.sisa) > 0 && !b.sedang_diproses;
