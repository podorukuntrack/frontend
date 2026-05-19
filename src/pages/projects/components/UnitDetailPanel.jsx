import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCheck, CalendarDays, BarChart3, Key, ShieldCheck, Pencil, Home } from 'lucide-react';
import { unitsAPI, assignmentsAPI, timelinesAPI, progressAPI, handoversAPI, retentionsAPI, documentationAPI } from '../../../api/services';
import { PageLoader } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../context/AuthContext';
import { extractError } from '../../../utils/helpers';

// Placeholder untuk setiap Tab Content
import AssignmentTab from '../tabs/AssignmentTab';
import TimelineTab from '../tabs/TimelineTab';
import ProgressTab from '../tabs/ProgressTab';
import HandoverTab from '../tabs/HandoverTab';
import RetentionTab from '../tabs/RetentionTab';

export default function UnitDetailPanel({ unit, cluster, project }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'assignment';
  
  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };
  const [loading, setLoading] = useState(false);
  
  // State untuk melacak data di setiap tab
  const [assignment, setAssignment] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [handover, setHandover] = useState(null);
  const [currentUnit, setCurrentUnit] = useState(unit);

  const handleUnitPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast('Ukuran file maksimal 5MB', 'error');
      return;
    }

    try {
      const fd = new FormData();
      fd.append('unitId', currentUnit.id);
      fd.append('jenis', 'unit');
      fd.append('file', file);

      toast('Mengunggah foto unit...', 'info');
      const uploadRes = await documentationAPI.upload(fd);
      const url = uploadRes.data?.data?.url;

      if (!url) throw new Error('Gagal mendapatkan URL foto unit');

      await unitsAPI.update(currentUnit.id, {
        image_url: url
      });

      toast('Foto unit berhasil diperbarui', 'success');
      setCurrentUnit(prev => ({ ...prev, image_url: url, imageUrl: url }));
    } catch (err) {
      toast(extractError(err), 'error');
    }
  };

  const fetchUnitContext = async () => {
    setLoading(true);
    try {
      // Fetch latest unit data
      const unitRes = await unitsAPI.get(unit.id);
      if (unitRes.data?.data) setCurrentUnit(unitRes.data.data);

      // Fetch assignment untuk unit ini
      const asgRes = await assignmentsAPI.list({ limit: 2000 });
      const currentAsg = (asgRes.data?.data || []).find(a => 
         String(a.unit_id) === String(unit.id) || String(a.unit?.id) === String(unit.id)
      );
      if (currentAsg) setAssignment(currentAsg);

      // Fetch progress
      const progRes = await progressAPI.list();
      const currentProg = (progRes.data?.data || []).filter(p => String(p.unit_id) === String(unit.id));
      setProgressData(currentProg);

      // Fetch handover (filter by unitId)
      const hoRes = await handoversAPI.list({ unitId: unit.id });
      const allHo = hoRes.data?.data || [];
      // Cari handover yang selesai dulu, kalau tidak ada ambil yang aktif
      const completedHo = allHo.find(h => h.status === 'selesai' || h.status === 'completed');
      const currentHo = completedHo ?? allHo[0];
      if (currentHo) setHandover(currentHo);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnitContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit.id]);

  // Logic untuk mengunci tab
  const hasAssignment = !!assignment;

  useEffect(() => {
    if (hasAssignment && activeTab === 'assignment') {
      setActiveTab('timeline');
    }
  }, [hasAssignment, activeTab]);
  
  // Progress 100% logic
  const currentProgressPercent = currentUnit.progress_percentage || 0;
  const isProgressComplete = currentProgressPercent >= 100;

  const isHandoverComplete = handover?.status === 'selesai' || handover?.status === 'completed';

  const tabs = [
    (!hasAssignment && { id: 'assignment', label: 'Penugasan (Assignment)', icon: UserCheck, disabled: false }),
    { id: 'timeline', label: 'Timelines', icon: CalendarDays, disabled: !hasAssignment },
    { id: 'progress', label: 'Progress & Docs', icon: BarChart3, disabled: !hasAssignment },
    { id: 'handover', label: 'Serah Terima', icon: Key, disabled: !isProgressComplete },
    { id: 'retention', label: 'Garansi / Retensi', icon: ShieldCheck, disabled: !isHandoverComplete }
  ].filter(Boolean);

  if (loading) return <PageLoader />;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col min-h-[80vh] overflow-hidden">
      {/* HEADER PANEL */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <button onClick={() => navigate(`/projects/${project.id}/clusters/${cluster.id}/units`)} className="btn-ghost w-fit text-slate-500 hover:text-slate-900 dark:hover:text-white -ml-2 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Daftar Unit
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              {/* STUNNING UNIT IMAGE CARD */}
              <div className="flex-shrink-0 relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm w-36 h-28 bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
                {currentUnit.image_url || currentUnit.imageUrl ? (
                  <>
                    <img
                      src={currentUnit.image_url || currentUnit.imageUrl}
                      alt={`Foto Unit ${currentUnit.nomor_unit}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {isRole('super_admin', 'admin') && (
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[11px] font-semibold gap-1">
                        <Pencil className="w-3.5 h-3.5" />
                        Ubah Foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleUnitPhotoUpload}
                        />
                      </label>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                    <Home className="w-6 h-6 mb-1 text-slate-300 dark:text-slate-700" />
                    {isRole('super_admin', 'admin') ? (
                      <label className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer">
                        Unggah Foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleUnitPhotoUpload}
                        />
                      </label>
                    ) : (
                      <span className="text-[10px]">Belum ada foto</span>
                    )}
                  </div>
                )}
              </div>

              <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                  {project.nama_proyek}
                </span>
                <span className="text-slate-400 text-sm">/</span>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{cluster.nama_cluster}</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                 Unit {currentUnit.nomor_unit} 
                 <span className="text-sm font-normal text-slate-500 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                    {currentUnit.tipe_rumah || 'Tipe Standar'}
                 </span>
              </h2>
              {hasAssignment ? (
                <div className="mt-3 flex items-center gap-3">
                   <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                      <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Dimiliki oleh: {assignment.user?.nama}
                   </span>
                   {assignment.pembayaran?.tipe && (
                     <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                       {assignment.pembayaran.tipe.replace("_", " ")}
                     </span>
                   )}
                </div>
              ) : (
                <div className="mt-3">
                   <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      Unit Tersedia (Belum Terjual)
                   </span>
                </div>
              )}
              </div>
           </div>
           
           <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Status Pembangunan</p>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${currentProgressPercent}%`}}></div>
                </div>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{currentProgressPercent}%</span>
              </div>
           </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 overflow-x-auto custom-scrollbar">
        <div className="flex space-x-1 w-max min-w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`flex items-center gap-2 py-4 px-5 border-b-2 font-medium text-sm transition-all whitespace-nowrap outline-none
                  ${isActive 
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                    : tab.disabled 
                      ? 'border-transparent text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-60' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 p-6 bg-slate-50/30 dark:bg-slate-900/50 relative">
        {activeTab === 'assignment' && <AssignmentTab unit={currentUnit} project={project} onAssigned={fetchUnitContext} />}
        {activeTab === 'timeline' && <TimelineTab unit={currentUnit} project={project} onUpdate={fetchUnitContext} />}
        {activeTab === 'progress' && <ProgressTab unit={currentUnit} assignment={assignment} onUpdate={fetchUnitContext} />}
        {activeTab === 'handover' && <HandoverTab unit={currentUnit} project={project} onHandover={fetchUnitContext} />}
        {activeTab === 'retention' && <RetentionTab unit={currentUnit} project={project} />}
      </div>
    </div>
  )
}
