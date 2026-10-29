import { useState } from "react";
import { Compass, ExternalLink, Pencil, Plus, X, Check } from "lucide-react";
import { unitsAPI } from "../../../../api/services";
import { useToast } from "../../../../hooks/useToast";
import { extractError } from "../../../../utils/helpers";

const isHttpUrl = (v) => /^https?:\/\/\S+$/i.test(v);

/**
 * Link foto 360 milik unit. Bisa diisi sejak masa pembangunan, tidak menunggu
 * data garansi/retensi. Admin dapat menambah, mengubah, atau menghapus; peran
 * lain hanya melihat tombol buka bila link sudah ada.
 */
export default function Foto360Link({ unit, canEdit, onSaved }) {
  const { toast } = useToast();
  const current = unit?.link_foto_360 ?? "";
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setValue(current);
    setEditing(true);
  };

  const save = async (next) => {
    const link = next.trim();
    if (link && !isHttpUrl(link)) {
      toast("Link foto 360 harus diawali http:// atau https://", "error");
      return;
    }
    setSaving(true);
    try {
      await unitsAPI.update(unit.id, { link_foto_360: link });
      toast(link ? "Link foto 360 disimpan" : "Link foto 360 dihapus", "success");
      setEditing(false);
      onSaved?.();
    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <form
        className="flex w-full sm:w-auto items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save(value);
        }}
      >
        <Compass className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
        <input
          type="url"
          autoFocus
          className="input h-9 py-1 text-sm w-full sm:w-80"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://contoh.com/link-foto-360"
          aria-label="Link foto 360"
          disabled={saving}
        />
        <button type="submit" className="btn-primary h-9 px-3 text-sm" disabled={saving} title="Simpan">
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="btn-secondary h-9 px-3 text-sm"
          disabled={saving}
          onClick={() => setEditing(false)}
          title="Batal"
        >
          <X className="w-4 h-4" />
        </button>
      </form>
    );
  }

  if (!current) {
    if (!canEdit) return null;
    return (
      <button
        type="button"
        onClick={startEdit}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-sm font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
      >
        <Plus className="w-4 h-4" /> Tambah Link Foto 360
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={current}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-800 text-sm font-semibold transition-colors"
      >
        <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        Buka Foto 360 Unit
        <ExternalLink className="w-3.5 h-3.5 opacity-60" />
      </a>
      {canEdit && (
        <>
          <button
            type="button"
            onClick={startEdit}
            className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Ubah link foto 360"
            aria-label="Ubah link foto 360"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => window.confirm("Hapus link foto 360 unit ini?") && save("")}
            disabled={saving}
            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Hapus link foto 360"
            aria-label="Hapus link foto 360"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
