import { useRef, useState } from "react";
import { ImagePlus, FileImage, X } from "lucide-react";
import { Modal, CustomDatePicker } from "../../../../components/ui";
import { assignmentsAPI, documentationAPI } from "../../../../api/services";
import { useToast } from "../../../../hooks/useToast";
import { formatCurrency, formatDate, extractError } from "../../../../utils/helpers";
import { billLabel, isBillPayable } from "./billing";

const today = () => new Date().toISOString().split("T")[0];
const emptyForm = () => ({ si_jadwal_id: "", tanggal_bayar: today(), catatan: "" });

/**
 * Pengajuan pembayaran berdasarkan tagihan SI. Nominal diambil dari sisa tagihan
 * dan dikunci; backend menentukan nominal akhir. Bukti diunggah sebelum pengajuan
 * karena kontrak SI mewajibkannya, dan request_id dipakai ulang selama isi
 * pengajuan sama supaya retry tidak membuat pengajuan ganda.
 */
export default function BillPaymentModal({ open, onClose, onSubmitted, assignmentId, unit, bills }) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  // File -> URL yang sudah terunggah, agar retry memakai URL yang sama.
  const uploadedRef = useRef(new Map());
  const attemptRef = useRef(null); // { key, requestId }

  const selected = bills.find((b) => b.id === form.si_jadwal_id);

  const reset = () => {
    setForm(emptyForm());
    setFiles([]);
    uploadedRef.current = new Map();
    attemptRef.current = null;
  };

  const close = () => {
    if (saving) return;
    onClose();
  };

  const uploadProofs = async () => {
    const urls = [];
    for (const file of files) {
      let url = uploadedRef.current.get(file);
      if (!url) {
        const fd = new FormData();
        fd.append("unitId", unit.id);
        fd.append("jenis", "foto");
        fd.append("file", file);
        const res = await documentationAPI.upload(fd);
        url = res.data?.data?.url || res.data?.data?.fileUrl || res.data?.fileUrl;
        if (!url) throw new Error(`Gagal mengunggah ${file.name}`);
        uploadedRef.current.set(file, url);
      }
      urls.push(url);
    }
    return urls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected || !isBillPayable(selected)) return toast("Pilih tagihan yang masih bisa dibayar", "error");
    if (!form.tanggal_bayar) return toast("Tanggal pembayaran wajib diisi", "error");
    if (files.length === 0) return toast("Bukti pembayaran wajib diunggah", "error");

    setSaving(true);
    try {
      const bukti = await uploadProofs();
      const payload = {
        si_jadwal_id: selected.id,
        tanggal_bayar: form.tanggal_bayar,
        bukti_pembayaran: bukti,
        ...(form.catatan.trim() ? { catatan: form.catatan.trim() } : {}),
      };
      const key = JSON.stringify(payload);
      if (attemptRef.current?.key !== key) attemptRef.current = { key, requestId: crypto.randomUUID() };
      await assignmentsAPI.createPayment(assignmentId, { ...payload, request_id: attemptRef.current.requestId });
      toast("Pengajuan dikirim. Pembayaran tercatat setelah diverifikasi Keuangan.", "success");
      reset();
      onSubmitted();
    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title={`Catat Pembayaran: Unit ${unit.nomor_unit}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-lg text-sm border bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50">
          Nominal mengikuti tagihan dari Keuangan dan tidak bisa diubah. Pengajuan baru dihitung lunas setelah diverifikasi Keuangan.
        </div>

        <div className="space-y-1.5">
          <label className="label" htmlFor="bill-select">Tagihan</label>
          <select
            id="bill-select"
            required
            className="input"
            value={form.si_jadwal_id}
            onChange={(e) => setForm((f) => ({ ...f, si_jadwal_id: e.target.value }))}
          >
            <option value="">Pilih tagihan</option>
            {bills.map((b) => (
              <option key={b.id} value={b.id} disabled={!isBillPayable(b)}>
                {billLabel(b)} — {formatCurrency(b.sisa)}
                {!b.aktif ? " (nonaktif)" : b.sedang_diproses ? " (menunggu verifikasi)" : Number(b.sisa) <= 0 ? " (lunas)" : ""}
              </option>
            ))}
          </select>
          {selected && (
            <p className="text-xs text-slate-500">
              Tenggat {formatDate(selected.tanggal)} · Nilai tagihan {formatCurrency(selected.jumlah)} · Sudah dibayar {formatCurrency(selected.realisasi)}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="label" htmlFor="bill-amount">Nominal (Rp)</label>
          <input
            id="bill-amount"
            type="text"
            readOnly
            className="input bg-slate-100 dark:bg-slate-800 cursor-not-allowed"
            value={selected ? formatCurrency(selected.sisa) : "—"}
          />
        </div>

        <div className="space-y-1.5">
          <label className="label">Tanggal Pembayaran</label>
          <div className="z-[100]">
            <CustomDatePicker value={form.tanggal_bayar} onChange={(v) => setForm((f) => ({ ...f, tanggal_bayar: v }))} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="label" htmlFor="bill-note">Keterangan <span className="text-slate-400 font-normal text-xs">(opsional)</span></label>
          <textarea
            id="bill-note"
            className="input min-h-[80px]"
            placeholder="Misal: Transfer via BCA"
            value={form.catatan}
            onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="label">Bukti Pembayaran (Gambar)</label>
          <div
            className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-4 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
            }}
          >
            <ImagePlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Klik atau drag & drop gambar di sini</p>
          </div>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
              e.target.value = "";
            }}
          />
          {files.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 mt-2">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileImage className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
                    <span className="text-xs text-slate-400 shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <button
                    type="button"
                    className="ml-2 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label={`Hapus ${file.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3">
          <button type="submit" className="btn-primary !bg-emerald-600 hover:!bg-emerald-700" disabled={saving || !selected}>
            {saving ? "Mengirim..." : "Kirim Pengajuan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
