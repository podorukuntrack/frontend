import { useState, useEffect, useRef } from 'react';
import { assignmentsAPI, usersAPI, documentationAPI } from '../../../api/services';
import { PageLoader, Spinner } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import { extractError, formatCurrency, formatDate } from '../../../utils/helpers';
import { useAuth } from '../../../context/AuthContext';
import { UserCheck, Pencil, Trash2, Search, Check, ChevronDown, User } from 'lucide-react';
import { CustomDatePicker } from '../../../components/ui';
import CustomMultiDatePicker from '../../../components/ui/CustomMultiDatePicker';

export default function AssignmentTab({ unit, project, onAssigned }) {
  const { isRole } = useAuth();
  const { toast } = useToast();
  
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const dropdownRef = useRef(null);

  const [form, setForm] = useState({
    user_id: '',
    tanggal_pembelian: new Date().toISOString().split("T")[0],
    tipe_pembayaran: 'cash_lunas',
    harga_total: 0,
    dp: 0,
    jatuh_tempo_kpr: '',
    reminder_kpr_dates: [],
    tenor_bulan: 0,
    keterangan_kpr: '',
    status_kepemilikan: 'active'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // Only fetch assignments for this unit
      const asgRes = await assignmentsAPI.list({ unitId: unit.id, limit: 1 });
      const currentAsg = (asgRes.data?.data || []).find(a => String(a.unit?.id) === String(unit.id) || String(a.unit_id) === String(unit.id));
      if (currentAsg) {
        setAssignment(currentAsg);
        if (currentAsg.user) {
          setSelectedUser(currentAsg.user);
          setForm(f => ({ ...f, user_id: currentAsg.user.id }));
        }
      }
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit.id]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search customer logic
  useEffect(() => {
    if (!isOpen) return;

    if (!searchTerm.trim()) {
      // Fetch default 5 suggestions
      const fetchSuggestions = async () => {
        setSearching(true);
        try {
          const res = await usersAPI.list({ role: 'customer', all_customers: 'true', limit: 5 });
          setSearchResults(res.data?.data || []);
        } catch (err) {
          console.error(err);
        } finally {
          setSearching(false);
        }
      };
      fetchSuggestions();
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await usersAPI.list({ 
          role: 'customer', 
          all_customers: 'true', 
          search: searchTerm, 
          limit: 8 
        });
        setSearchResults(res.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

  const startEdit = () => {
    const defaultReminders = (assignment.pembayaran?.reminder_kpr_dates || []).map(r => typeof r === 'string' ? r : r.date).filter(Boolean);
    setForm({
      user_id: assignment.user?.id || assignment.user_id,
      tanggal_pembelian: assignment.tanggal_pembelian?.split("T")[0] || "",
      tipe_pembayaran: assignment.pembayaran?.tipe || "cash_lunas",
      harga_total: assignment.pembayaran?.harga_total || 0,
      dp: assignment.pembayaran?.dp || 0,
      jatuh_tempo_kpr: assignment.pembayaran?.jatuh_tempo_kpr || '',
      reminder_kpr_dates: defaultReminders,
      tenor_bulan: assignment.pembayaran?.tenor_bulan || 0,
      keterangan_kpr: assignment.pembayaran?.keterangan_kpr || "",
      status_kepemilikan: assignment.status_kepemilikan || 'active'
    });
    if (assignment.user) {
      setSelectedUser(assignment.user);
    }
    setIsEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.user_id) {
      toast('Pilih customer terlebih dahulu', 'error');
      return;
    }

    if (assignment && assignment.pembayaran?.total_dibayar > form.harga_total) {
      toast(`Harga Total tidak boleh lebih kecil dari yang sudah dibayar (Rp ${formatCurrency(assignment.pembayaran.total_dibayar)})`, 'error');
      return;
    }

    if (assignment) {
      if (!window.confirm("Apakah Anda yakin ingin menyimpan perubahan data penugasan ini?")) {
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        project_id: project.id,
        cluster_id: unit.cluster_id || unit.cluster?.id,
        unit_id: unit.id,
        user_id: form.user_id,
        tanggal_pembelian: form.tanggal_pembelian,
        tipe_pembayaran: form.tipe_pembayaran,
        harga_total: Number(form.harga_total),
        dp: form.tipe_pembayaran === 'kredit_kpr' ? Number(form.dp) : 0,
        jatuh_tempo_kpr: form.tipe_pembayaran === 'kredit_kpr' ? form.jatuh_tempo_kpr : null,
        reminder_kpr_dates: form.tipe_pembayaran === 'kredit_kpr' ? form.reminder_kpr_dates : [],
        tenor_bulan: form.tipe_pembayaran === 'cash_cicil' ? Number(form.tenor_bulan) : 0,
        keterangan_kpr: form.keterangan_kpr,
        status_kepemilikan: form.status_kepemilikan
      };

      if (!assignment) {
        await assignmentsAPI.create(payload);
        toast('Penugasan berhasil dibuat', 'success');
      } else {
        await assignmentsAPI.update(assignment.id, payload);
        toast('Data penugasan diperbarui', 'success');
      }
      setIsEditing(false);
      await loadData();
      if (onAssigned) onAssigned(); // Panggil ini agar tab lain terbuka!
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Apakah Anda yakin ingin membatalkan/menghapus penugasan ini? Pastikan unit tidak memiliki riwayat pembayaran, dokumen serah terima, atau garansi.")) return;
    setSaving(true);
    try {
      await assignmentsAPI.delete(assignment.id);
      toast('Penugasan berhasil dibatalkan dan dihapus', 'success');
      setAssignment(null);
      if (onAssigned) onAssigned();
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  if (assignment && !isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
             <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Detail Penugasan / Kepemilikan
          </h3>
          {isRole('admin') && (
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button onClick={handleDelete} className="btn-secondary !bg-rose-50 !text-rose-600 hover:!bg-rose-100 border-none text-sm px-3 py-1.5 h-auto flex-1 sm:flex-none justify-center" disabled={saving}>
                <Trash2 className="w-4 h-4 mr-1" /> Batalkan Penugasan
              </button>
              <button onClick={startEdit} className="btn-secondary text-sm px-3 py-1.5 h-auto flex-1 sm:flex-none justify-center">
                <Pencil className="w-4 h-4 mr-1" /> Edit Data
              </button>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Customer / Pemilik</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{assignment.user?.nama}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{assignment.user?.email}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Status: <span className={`badge ${assignment.status_kepemilikan === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{assignment.status_kepemilikan.toUpperCase()}</span></p>
           </div>
           <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Informasi Finansial</p>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="text-slate-500 py-1">Tipe Pembayaran</td>
                    <td className="font-semibold text-right text-slate-900 dark:text-white uppercase">{assignment.pembayaran?.tipe?.replace("_", " ")}</td>
                  </tr>
                  <tr>
                    <td className="text-slate-500 py-1">Harga Net</td>
                    <td className="font-mono font-semibold text-right text-slate-900 dark:text-white">{formatCurrency(assignment.pembayaran?.harga_total)}</td>
                  </tr>
                  {assignment.pembayaran?.tipe === "cash_cicil" && (
                    <tr>
                      <td className="text-slate-500 py-1">Tenor</td>
                      <td className="font-semibold text-right text-slate-900 dark:text-white">{assignment.pembayaran?.tenor_bulan} Bulan</td>
                    </tr>
                  )}
                  {assignment.pembayaran?.tipe === "kredit_kpr" && (
                    <>
                      <tr>
                        <td className="text-slate-500 py-1">Tanggal Jatuh Tempo</td>
                        <td className="font-semibold text-right text-slate-900 dark:text-white">{assignment.pembayaran?.jatuh_tempo_kpr ? formatDate(assignment.pembayaran.jatuh_tempo_kpr) : '-'}</td>
                      </tr>
                      {assignment.pembayaran?.reminder_kpr_dates?.length > 0 && (
                        <tr>
                          <td className="text-slate-500 py-1 align-top pt-2">Pengingat KPR</td>
                          <td className="text-right pt-2">
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {assignment.pembayaran.reminder_kpr_dates.map((r, idx) => {
                                const dateStr = typeof r === 'string' ? r : r.date;
                                if (!dateStr) return null;
                                const diffDays = Math.ceil((new Date(assignment.pembayaran.jatuh_tempo_kpr).getTime() - new Date(dateStr).getTime()) / (1000 * 3600 * 24));
                                return (
                                  <span key={idx} className="bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-[11px] font-semibold border border-indigo-200 dark:border-indigo-500/30">
                                    H-{diffDays} ({formatDate(dateStr)})
                                  </span>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                  <tr>
                    <td className="text-slate-500 py-1">Tgl Pembelian</td>
                    <td className="font-semibold text-right text-slate-900 dark:text-white">{formatDate(assignment.tanggal_pembelian)}</td>
                  </tr>
                </tbody>
              </table>
           </div>
           {assignment.pembayaran?.keterangan_kpr && (
              <div className="md:col-span-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold block mb-1">Keterangan / Catatan:</span>
                {assignment.pembayaran?.keterangan_kpr}
              </div>
           )}
        </div>
      </div>
    );
  }

  if (!isRole('admin') && !assignment) {
    return (
      <div className="text-center py-12 px-4 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
        <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium mb-1">Belum ada penugasan customer</p>
        <p className="text-sm text-slate-400">
          Unit ini belum dimiliki atau ditugaskan kepada siapa pun.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
           <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> 
           {assignment ? 'Edit Penugasan' : 'Buat Penugasan Baru'}
        </h3>
        {assignment && (
           <div className="flex flex-wrap gap-2 w-full sm:w-auto">
             {isRole('admin') && (
               <button type="button" onClick={handleDelete} className="btn-secondary !bg-rose-50 !text-rose-600 hover:!bg-rose-100 border-none text-sm px-3 py-1.5 h-auto flex-1 sm:flex-none justify-center" disabled={saving}>
                 <Trash2 className="w-4 h-4 mr-1" /> Batalkan Penugasan
               </button>
             )}
             <button type="button" onClick={() => setIsEditing(false)} className="btn-ghost text-slate-500 text-sm flex-1 sm:flex-none justify-center">Batal Edit</button>
           </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
         <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="label text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Pilih Customer / Pembeli</label>
                <div className="relative" ref={dropdownRef}>
                  {/* Trigger Box */}
                  <div 
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-between input cursor-pointer border border-slate-200 hover:border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-4 py-2.5 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <User className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      {selectedUser ? (
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {selectedUser.nama} <span className="text-xs font-normal text-slate-500">({selectedUser.email})</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Cari nama atau email customer...</span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Float Dropdown */}
                  {isOpen && (
                    <div className="absolute left-0 right-0 mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-2 animate-fadeIn max-h-[320px] flex flex-col">
                      {/* Search Input Box */}
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text"
                          className="input w-full pl-9 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                          placeholder="Ketik nama atau email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        {searching && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Spinner size="sm" />
                          </div>
                        )}
                      </div>

                      {/* Results Scroll Container */}
                      <div className="overflow-y-auto flex-1 space-y-1 custom-scrollbar">
                        {searchResults.length === 0 ? (
                          <div className="text-center py-6 text-sm text-slate-500 dark:text-slate-400 font-medium">
                            {searching ? 'Mencari...' : 'Customer tidak ditemukan'}
                          </div>
                        ) : (
                          <>
                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2.5 py-1">
                              {searchTerm.trim() ? 'Hasil Pencarian' : 'Rekomendasi / Customer Terbaru'}
                            </div>
                            {searchResults.map((u) => {
                              const isSelected = form.user_id === u.id;
                              return (
                                <div
                                  key={u.id}
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setForm(f => ({ ...f, user_id: u.id }));
                                    setIsOpen(false);
                                    setSearchTerm('');
                                  }}
                                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-sm ${
                                    isSelected 
                                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold' 
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <div className="min-w-0 pr-4">
                                    <div className="truncate font-semibold">{u.nama}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
                                  </div>
                                  {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="label">Tanggal Pembelian</label>
                   <div className="z-[100]">
                     <CustomDatePicker 
                       value={form.tanggal_pembelian} 
                       onChange={v => setForm({...form, tanggal_pembelian: v})} 
                     />
                   </div>
                 </div>
                 {assignment && (
                   <div>
                     <label className="label">Status Kepemilikan</label>
                     <select className="input" value={form.status_kepemilikan} onChange={e => setForm({...form, status_kepemilikan: e.target.value})}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                     </select>
                   </div>
                 )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold mb-4 text-slate-900 dark:text-white">Informasi Finansial & Pembayaran</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Tipe Pembayaran</label>
                    <select className="input" value={form.tipe_pembayaran} onChange={e => setForm({...form, tipe_pembayaran: e.target.value})}>
                      <option value="cash_lunas">Cash Lunas</option>
                      <option value="cash_cicil">Cash Bertahap (In-House)</option>
                      <option value="kredit_kpr">Kredit KPR</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Harga Total (Net)</label>
                    <input 
                      type="text" 
                      className="input" 
                      required 
                      value={form.harga_total === 0 ? '' : form.harga_total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} 
                      onChange={e => {
                        const rawValue = e.target.value.replace(/[^0-9]/g, '');
                        setForm({...form, harga_total: rawValue ? Number(rawValue) : 0});
                      }} 
                      placeholder="0" 
                    />
                  </div>
                  {form.tipe_pembayaran === 'kredit_kpr' && (
                    <div>
                      <label className="label">Down Payment (DP)</label>
                      <input 
                        type="text" 
                        className="input" 
                        required={form.tipe_pembayaran === 'kredit_kpr'}
                        value={form.dp === 0 ? '' : form.dp.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} 
                        onChange={e => {
                          const rawValue = e.target.value.replace(/[^0-9]/g, '');
                          setForm({...form, dp: rawValue ? Number(rawValue) : 0});
                        }} 
                        placeholder="0" 
                      />
                    </div>
                  )}
                  {form.tipe_pembayaran === 'cash_cicil' && (
                    <div>
                      <label className="label">Tenor (Bulan)</label>
                      <input type="number" className="input" value={form.tenor_bulan === 0 ? '' : form.tenor_bulan} onChange={e => setForm({...form, tenor_bulan: e.target.value})} placeholder="0" />
                    </div>
                  )}
                  {form.tipe_pembayaran === 'kredit_kpr' && (
                      <div>
                        <label className="label">Tanggal Jatuh Tempo (KPR)</label>
                        <CustomDatePicker
                          value={form.jatuh_tempo_kpr}
                          onChange={(val) => {
                            let newReminders = form.reminder_kpr_dates || [];
                            if (val) {
                              const dueTime = new Date(val).getTime();
                              newReminders = newReminders.filter(d => new Date(d).getTime() < dueTime);
                            }
                            setForm({...form, jatuh_tempo_kpr: val, reminder_kpr_dates: newReminders});
                          }}
                          placeholder="Pilih Tanggal Jatuh Tempo"
                        />
                      </div>
                  )}
                  {form.tipe_pembayaran === 'kredit_kpr' && form.jatuh_tempo_kpr && (
                      <div className="md:col-span-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                        <label className="label">Pengingat Jatuh Tempo (KPR)</label>
                            <p className="text-xs text-slate-500 mb-2">Tambahkan tanggal pengingat (sebelum hari-H). Notifikasi akan dikirim ke customer pada tanggal tersebut.</p>
                            
                            <div className="mb-3">
                              <CustomMultiDatePicker
                                selectedDates={form.reminder_kpr_dates || []}
                                onChange={(dates) => {
                                  setForm({ ...form, reminder_kpr_dates: dates.sort() });
                                }}
                                minDate={new Date()}
                                maxDate={new Date(new Date(form.jatuh_tempo_kpr).getTime() - 86400000)}
                                placeholder="Pilih beberapa tanggal..."
                              />
                            </div>
                            
                            {(form.reminder_kpr_dates || []).length > 0 ? (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {(form.reminder_kpr_dates || []).map((date, idx) => {
                                  const diffDays = Math.ceil((new Date(form.jatuh_tempo_kpr).getTime() - new Date(date).getTime()) / (1000 * 3600 * 24));
                                  return (
                                    <div key={idx} className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full text-xs font-semibold border border-indigo-200 dark:border-indigo-500/30">
                                      <span>H-{diffDays} ({formatDate(date)})</span>
                                      <button 
                                        type="button"
                                        className="hover:bg-indigo-200 dark:hover:bg-indigo-500/50 p-0.5 rounded-full"
                                        onClick={() => {
                                          setForm({
                                            ...form,
                                            reminder_kpr_dates: form.reminder_kpr_dates.filter(d => d !== date)
                                          });
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">Belum ada tanggal pengingat yang ditambahkan.</p>
                            )}
                          </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="label">Keterangan / Catatan</label>
                    <textarea className="input" rows="2" value={form.keterangan_kpr} onChange={e => setForm({...form, keterangan_kpr: e.target.value})} placeholder="Catatan..."></textarea>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
               <button type="submit" className="btn-primary" disabled={saving || !form.user_id}>
                  {saving ? 'Menyimpan...' : (assignment ? 'Simpan Perubahan' : 'Assign Customer (Buka Tab Lain)')}
               </button>
            </div>
         </form>
      </div>
    </div>
  )
}
