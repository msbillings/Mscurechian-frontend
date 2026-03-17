'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Users,
    Search,
    Activity,
    Heart,
    Thermometer,
    Wind,
    ChevronRight,
    ChevronLeft,
    History,
    RefreshCw,
    ArrowRightLeft,
    LogOut,
    Plus,
    Receipt,
    X,
    LayoutGrid,
    List,
    Pill,
    Pencil,
    Check,
    ClipboardList
} from 'lucide-react';
import { useTenantLink } from '@/hooks/useTenantLink';
import AddClinicalChargeModal from '@/components/ipd/AddClinicalChargeModal';
import { IPDBillingModal } from '@/components/helpdesk/IPDBillingModal';
import TransferRequestModal from '@/components/ipd/TransferRequestModal';
import { getDoctorInpatientsAction } from '@/lib/integrations/actions/doctor.actions';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { calculateStayDuration } from '@/lib/utils/date-utils';
import { ipdService } from '@/lib/integrations';
import { getSocket } from '@/lib/integrations/api/socket';

import { useDoctorInpatients } from '@/lib/integrations/hooks';
import { useAuthStore } from '@/stores/authStore';
import { useQueryClient } from '@tanstack/react-query';

export default function DoctorInpatientsPage() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const { data: admissions = [], isLoading: loading } = useDoctorInpatients(user?.id, user?.role);

    useEffect(() => {
        if (admissions.length > 0) {
            console.log("[DoctorInpatients] Current Inpatients Sample Data:", {
                id: admissions[0].admissionId || admissions[0]._id,
                reason: admissions[0].reason,
                reasonForAdmission: admissions[0].reasonForAdmission,
                clinicalNotes: admissions[0].clinicalNotes,
                raw: admissions[0]
            });
        }
    }, [admissions]);

    const fetchAdmissions = useCallback(async () => {
        queryClient.invalidateQueries({ queryKey: ['doctor-inpatients'] });
    }, [queryClient]);

    const [itemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAdmissionForCharge, setSelectedAdmissionForCharge] = useState<string | null>(null);
    const [selectedAdmissionForLedger, setSelectedAdmissionForLedger] = useState<string | null>(null);
    const [selectedAdmissionForTransfer, setSelectedAdmissionForTransfer] = useState<{ id: string; name: string } | null>(null);
    const [viewType, setViewType] = useState<'list' | 'card'>('list');
    const [filters, setFilters] = useState({ type: '', room: '' });

    // ✅ REAL-TIME SYNC: Listen for updates
    useEffect(() => {
        let socketInstance: any;

        const setupSocket = async () => {
            socketInstance = await getSocket();
            if (socketInstance) {
                socketInstance.on('ipd:bed_updated', (data: any) => {
                    console.log('📡 [Doctor] Bed Update Sync:', data);
                    fetchAdmissions(); // Trigger query refresh
                });
                socketInstance.on('vitals_updated', (data: any) => {
                    console.log('📡 [Doctor] Vitals Sync:', data);
                    fetchAdmissions();
                });
                socketInstance.on('doctoral_vital_alert', (data: any) => {
                    console.log('📡 [Doctor] Vital Alert Sync:', data);
                    fetchAdmissions();
                });
            }
        };

        setupSocket();
        return () => {
            if (socketInstance) {
                socketInstance.off('ipd:bed_updated');
                socketInstance.off('vitals_updated');
                socketInstance.off('doctoral_vital_alert');
            }
        };
    }, [fetchAdmissions]);

    // ✅ Dynamic Filter Options Derived from Admissions
    const unitTypeOptions = Array.from(new Set(admissions.map(adm => adm.bed?.type).filter(Boolean))).sort();
    const availableRooms = Array.from(new Set(
        admissions
            .filter(adm => !filters.type || String(adm.bed?.type || '').toLowerCase() === filters.type.toLowerCase())
            .map(adm => adm.bed?.room)
            .filter(Boolean)
    )).sort();

    const filteredAdmissions = admissions.filter(adm => {
        const matchesSearch = adm.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            adm.admissionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            adm.patient?.mrn?.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        const bedType = String(adm.bed?.type || '').toLowerCase();
        const bedRoom = String(adm.bed?.room || '').toLowerCase();
        const filterType = String(filters.type || '').toLowerCase();
        const filterRoom = String(filters.room || '').toLowerCase();

        if (filterType && bedType !== filterType) return false;
        if (filterRoom && bedRoom !== filterRoom) return false;

        return true;
    });

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const totalPages = Math.ceil(filteredAdmissions.length / itemsPerPage);
    const paginatedAdmissions = filteredAdmissions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // ✅ Summary Stats Calculation
    const stats = {
        total: admissions.length,
        critical: admissions.filter(a => a.vitals?.status === 'Critical' || a.vitals?.condition === 'Critical').length,
        abnormal: admissions.filter(a => a.vitals?.status === 'Warning' || (['Fair', 'Serious'].includes(a.vitals?.condition) && a.vitals?.status !== 'Critical')).length
    };

    const getMonitoringStatus = (nextDue: string | Date | undefined) => {
        if (!nextDue) return { label: 'Scheduled', color: 'text-gray-400', isOverdue: false };
        const dueTime = new Date(nextDue).getTime();
        const now = Date.now();
        const diff = dueTime - now;

        if (diff < 0) {
            const mins = Math.abs(Math.floor(diff / 60000));
            return {
                label: `Overdue ${mins > 60 ? `${Math.floor(mins / 60)}h` : `${mins}m`}`,
                color: 'text-rose-600 font-black animate-pulse',
                isOverdue: true
            };
        }

        const mins = Math.floor(diff / 60000);
        return {
            label: mins <= 0 ? 'Due Now' : `Due in ${mins > 60 ? `${Math.floor(mins / 60)}h` : `${mins}m`}`,
            color: mins < 15 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold',
            isOverdue: false
        };
    };

    return (
        <div className="space-y-3 pb-10 pt-10 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        CLINICAL SURVEILLANCE <Users className="text-emerald-500" size={24} />
                    </h1>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-1">Active Assigned Inpatients Registry</p>
                </div>

                <div className="flex items-center gap-3 group w-full lg:w-fit">
                    <div className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-1 rounded-lg">
                        <button
                            onClick={() => setViewType('list')}
                            className={`p-1.5 rounded-md transition-all ${viewType === 'list' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                            title="List View"
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => setViewType('card')}
                            className={`p-1.5 rounded-md transition-all ${viewType === 'card' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Card View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            className="px-3 py-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none focus:border-emerald-500 transition-all"
                            value={filters.type}
                            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value, room: '' }))}
                        >
                            <option value="">All Types</option>
                            {unitTypeOptions.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>

                        <select
                            className="px-3 py-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none focus:border-emerald-500 transition-all"
                            value={filters.room}
                            onChange={(e) => setFilters(prev => ({ ...prev, room: e.target.value }))}
                        >
                            <option value="">All Rooms</option>
                            {availableRooms.map(room => (
                                <option key={room} value={room}>{room}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative flex-1 lg:w-[400px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name, MRN, or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 focus:border-emerald-500 outline-none text-[11px] font-bold transition-all shadow-sm focus:shadow-emerald-500/10 placeholder:text-gray-400 rounded-xl"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Summary Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard
                    label="Assigned Inpatients"
                    value={stats.total}
                    sub="Active patients in your registry"
                    color="blue"
                />
                <SummaryCard
                    label="Critical Alerts"
                    value={stats.critical}
                    sub="Immediate intervention required"
                    color="rose"
                />
                <SummaryCard
                    label="Abnormal Vitals"
                    value={stats.abnormal}
                    sub="Patients in warning range"
                    color="amber"
                />
            </div>


            {/* Content Section */}
            {viewType === 'list' ? (
                <div className="bg-white dark:bg-[#111] rounded-[0.5rem] border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left min-w-[1000px]">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Inpatient Details</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Room/Bed</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Monitoring</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Reason</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Primary Doctor</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Admission Info</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center italic text-gray-400 animate-pulse font-bold uppercase tracking-widest text-xs">
                                            Syncing Clinical Stream...
                                        </td>
                                    </tr>
                                ) : paginatedAdmissions.length > 0 ? (
                                    paginatedAdmissions.map((adm) => {
                                        const isCritical = adm.vitals?.status === 'Critical' || (adm.vitals?.spO2 && Number(adm.vitals.spO2) < 90);
                                        const isAbnormal = isCritical || adm.vitals?.status === 'Warning' || (adm.vitals?.spO2 && Number(adm.vitals.spO2) < 94);
                                        const monitor = getMonitoringStatus(adm.vitals?.nextVitalsDue);

                                        return (
                                            <tr key={adm._id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/20 transition-all group">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <Link href={`/doctor/patients/${adm.patient?._id || adm.patient?.id}`} className="flex items-center gap-4 group/item cursor-pointer">
                                                        <div className="relative">
                                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-black text-sm border border-emerald-200/50 dark:border-emerald-800/50">
                                                                {adm.patient?.name?.[0] || 'P'}
                                                            </div>
                                                            {isAbnormal && (
                                                                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-[#111] ${isCritical ? 'bg-rose-600 animate-ping' : 'bg-amber-500 animate-pulse'}`} />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{adm.patient?.name}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">MRN: {adm.patient?.mrn || 'N/A'}</p>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase">{adm.bed?.bedId || 'UNASSIGNED'}</span>
                                                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">{adm.bed?.type || 'STANDARD'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                    <span className={`text-[10px] uppercase font-black tracking-widest ${monitor.color}`}>
                                                        {monitor.label}
                                                    </span>
                                                </td>
                                                 <td className="px-4 py-3 whitespace-nowrap">
                                                     <div className="w-[180px]">
                                                         <InpatientReason admission={adm} onSaved={() => fetchAdmissions()} />
                                                     </div>
                                                 </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="text-xs font-black text-emerald-600 uppercase">
                                                        {adm.primaryDoctor?.user?.name || adm.primaryDoctor?.name || 'NOT ASSIGNED'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ADM: {adm.admissionId}</span>
                                                        <span className="text-[9px] font-bold text-gray-500 italic">{calculateStayDuration(adm.createdAt)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end">
                                                        <ActionButtons
                                                            adm={adm}
                                                            onTransfer={() => setSelectedAdmissionForTransfer({ id: adm._id, name: adm.patient?.name })}
                                                            onCharge={() => setSelectedAdmissionForCharge(adm._id)}
                                                            onLedger={() => setSelectedAdmissionForLedger(adm._id)}
                                                            fetchAdmissions={fetchAdmissions}
                                                            variant="compact"
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan={6} className="px-8 py-20 text-center italic text-gray-400 font-bold uppercase tracking-widest">No patients found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {loading ? (
                        Array(8).fill(0).map((_, i) => (
                            <div key={i} className="h-64 bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-gray-800 animate-pulse" />
                        ))
                    ) : paginatedAdmissions.length > 0 ? (
                        paginatedAdmissions.map((adm) => (
                            <InpatientCard
                                key={adm._id}
                                adm={adm}
                                onTransfer={() => setSelectedAdmissionForTransfer({ id: adm._id, name: adm.patient?.name })}
                                onCharge={() => setSelectedAdmissionForCharge(adm._id)}
                                onLedger={() => setSelectedAdmissionForLedger(adm._id)}
                                fetchAdmissions={fetchAdmissions}
                                getMonitoringStatus={getMonitoringStatus}
                            />
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center bg-white dark:bg-[#111] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest italic">No matching inpatients found</p>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination Controls */}
            {!loading && filteredAdmissions.length > 0 && (
                <div className=" flex items-center justify-between mt-6 p-4 bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        Showing <span className="text-gray-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="text-gray-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredAdmissions.length)}</span> of <span className="text-gray-900 dark:text-white">{filteredAdmissions.length}</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-emerald-600 transition-all"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-[9px] font-black text-gray-900 dark:text-white px-1 uppercase tracking-wide">
                            Page {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-emerald-600 transition-all"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            <AddClinicalChargeModal
                isOpen={!!selectedAdmissionForCharge}
                onClose={() => setSelectedAdmissionForCharge(null)}
                admissionId={selectedAdmissionForCharge || ''}
            />
            <IPDBillingModal
                isOpen={!!selectedAdmissionForLedger}
                onClose={() => setSelectedAdmissionForLedger(null)}
                admissionId={selectedAdmissionForLedger || ''}
                hidePaymentActions={true}
            />
            <TransferRequestModal
                isOpen={!!selectedAdmissionForTransfer}
                onClose={() => setSelectedAdmissionForTransfer(null)}
                admissionId={selectedAdmissionForTransfer?.id || ''}
                patientName={selectedAdmissionForTransfer?.name || ''}
                onSuccess={fetchAdmissions}
            />
        </div>
    );
}

function ActionButtons({ adm, onTransfer, onCharge, onLedger, fetchAdmissions, variant = 'full' }: any) {
    const isCompact = variant === 'compact';
    const { getPath } = useTenantLink();
    const router = useRouter();

    if (adm.dischargeRequested) {
        return (
            <div className={`flex items-center gap-1.5 bg-emerald-100/50 dark:bg-emerald-900/20 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/50 shadow-sm animate-pulse ${!isCompact && 'w-full justify-center'}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Discharge Pending</span>
                <button
                    onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm("Revoke discharge?")) {
                            await ipdService.cancelDischargeRequest(adm._id);
                            fetchAdmissions();
                        }
                    }}
                    className="p-1 rounded-full hover:bg-rose-100 text-rose-500 transition-colors"
                >
                    <X size={12} />
                </button>
            </div>
        );
    }
    if (adm.transferRequested) {
        return (
            <div className={`flex items-center gap-1.5 bg-amber-100/50 dark:bg-amber-900/20 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800/50 shadow-sm animate-pulse ${!isCompact && 'w-full justify-center'}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Transfer Pending</span>
                <button
                    onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm("Revoke transfer?")) {
                            await ipdService.cancelTransferRequest(adm._id);
                            fetchAdmissions();
                        }
                    }}
                    className="p-1 rounded-full hover:bg-rose-100 text-rose-500 transition-colors"
                >
                    <X size={12} />
                </button>
            </div>
        );
    }

    const btnClass = "flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 shadow-sm border border-transparent";

    return (
        <div className={isCompact ? "flex items-center gap-2" : "grid grid-cols-2 gap-2 w-full"}>
            <button
                onClick={(e) => { e.stopPropagation(); router.push(getPath(`/doctor/prescription/create?patientId=${adm.patient?._id || adm.patient?.id}&admissionId=${adm.admissionId}`)); }}
                className={`${btnClass} bg-pink-50 text-pink-700 hover:bg-pink-100 hover:border-pink-200 dark:bg-pink-900/10 dark:text-pink-400 dark:hover:bg-pink-900/20`}
                title="Add Prescription"
            >
                <Pill size={13} strokeWidth={3} />
                {!isCompact && <span>Prescribe</span>}
            </button>

            <button
                onClick={(e) => { e.stopPropagation(); onTransfer(); }}
                className={`${btnClass} bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-200 dark:bg-amber-900/10 dark:text-amber-400 dark:hover:bg-amber-900/20`}
                title="Transfer Patient"
            >
                <ArrowRightLeft size={13} strokeWidth={3} />
                {!isCompact && <span>Transfer</span>}
            </button>

            <button
                onClick={async (e) => {
                    e.stopPropagation();
                    const res = await ipdService.requestDischarge(adm._id);
                    if (res) {
                        toast.success("Discharge requested");
                        fetchAdmissions();
                    }
                }}
                className={`${btnClass} bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-200 dark:bg-emerald-900/10 dark:text-emerald-400 dark:hover:bg-emerald-900/20`}
                title="Request Discharge"
            >
                <LogOut size={13} strokeWidth={3} />
                {!isCompact && <span>Discharge</span>}
            </button>

            <button
                onClick={(e) => { e.stopPropagation(); onCharge(); }}
                className={`${btnClass} bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-200 dark:bg-sky-900/10 dark:text-sky-400 dark:hover:bg-sky-900/20`}
                title="Add Charge"
            >
                <Receipt size={13} strokeWidth={3} />
                {!isCompact && <span>Charge</span>}
            </button>

            <button
                onClick={(e) => { e.stopPropagation(); onLedger(); }}
                className={`${btnClass} bg-violet-50 text-violet-700 hover:bg-violet-100 hover:border-violet-200 dark:bg-violet-900/10 dark:text-violet-400 dark:hover:bg-violet-900/20`}
                title="View Ledger"
            >
                <History size={13} strokeWidth={3} />
                {!isCompact && <span>Ledger</span>}
            </button>
        </div>
    );
}

function InpatientCard({ adm, onTransfer, onCharge, onLedger, fetchAdmissions, getMonitoringStatus }: any) {
    const isCritical = adm.vitals?.status === 'Critical' || (adm.vitals?.spO2 && Number(adm.vitals.spO2) < 90);
    const monitor = getMonitoringStatus(adm.vitals?.nextVitalsDue);

    return (
        <div className="bg-white dark:bg-[#111] rounded-[1.2rem] border border-gray-200 dark:border-gray-800 p-4 shadow-sm hover:shadow-2xl hover:scale-[1.01] transition-all group overflow-hidden relative">
            {/* Status Indicator Badge */}
            <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm ${isCritical ? 'bg-rose-600 text-white animate-pulse' : 'bg-emerald-500 text-white'}`}>
                {adm.vitals?.condition || 'Stable'}
            </div>

            <div className="flex items-start gap-4 mb-4">
                <Link href={`/doctor/patients/${adm.patient?._id || adm.patient?.id}`} className="relative block shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-extrabold text-2xl border border-emerald-100/50 dark:border-emerald-800/50">
                        {adm.patient?.name?.[0]}
                    </div>
                </Link>
                <div className="flex-1 min-w-0 pt-1">
                    <h3 className="text-[13px] font-black text-gray-900 dark:text-white uppercase truncate tracking-tight">{adm.patient?.name}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">MRN: {adm.patient?.mrn || 'N/A'}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded uppercase">{adm.bed?.bedId}</span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase">{adm.bed?.type}</span>
                    </div>
                </div>
            </div>

            <InpatientReason admission={adm} onSaved={() => fetchAdmissions()} />

            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl mb-5">
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Monitoring</span>
                    <span className={`text-[10px] font-black uppercase tracking-tight ${monitor.color}`}>{monitor.label}</span>
                </div>
                <div className="flex flex-col text-right border-l border-gray-100 dark:border-gray-800 pl-3">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Stay Duration</span>
                    <span className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase">{calculateStayDuration(adm.createdAt)}</span>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-gray-400 uppercase">Admission ID</span>
                        <span className="text-[9px] font-bold text-gray-600 dark:text-gray-400">#{adm.admissionId}</span>
                    </div>
                    <ActionButtons
                        adm={adm}
                        onTransfer={onTransfer}
                        onCharge={onCharge}
                        onLedger={onLedger}
                        fetchAdmissions={fetchAdmissions}
                        variant="full"
                    />
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ label, value, sub, color }: any) {
    const colorClasses: any = {
        emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
        rose: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20',
        amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
        blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
    };

    return (
        <div className="bg-white dark:bg-[#111] p-4 rounded-[0.5rem] border border-gray-200 dark:border-gray-800 shadow-xl shadow-gray-200/20 dark:shadow-none group hover:scale-[1.01] transition-all duration-500">
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{label}</p>
            <div className="flex items-end justify-between">
                <div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{value}</h3>
                    <p className="text-[8px] font-bold text-gray-400 mt-2 tracking-widest">{sub}</p>
                </div>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${colorClasses[color]}`}>
                    <Activity size={18} />
                </div>
            </div>
        </div>
    );
}

function InpatientReason({ admission, onSaved }: { admission: any, onSaved: () => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [reason, setReason] = useState(admission?.reason || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!reason.trim()) return;
        setSaving(true);
        try {
            await ipdService.updateAdmissionDetails(admission._id, { reason });
            toast.success("Reason updated");
            setIsEditing(false);
            onSaved();
        } catch (error) {
            toast.error("Failed to update");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-lg p-1.5 border border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-500">
                    <ClipboardList size={10} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Reason for Admission</span>
                </div>
                {!isEditing && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                        className="p-1 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-md transition-colors"
                    >
                        <Pencil size={10} />
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="flex items-start gap-2">
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-white dark:bg-[#111] border border-amber-200 dark:border-amber-800 rounded-lg p-2 text-[10px] font-bold outline-none focus:border-amber-400 min-h-[10px] resize-none"
                        placeholder="Enter clinical reason..."
                    />
                    <div className="flex flex-col gap-1 shrink-0">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md transition-colors disabled:opacity-50"
                        >
                            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsEditing(false); setReason(admission?.reasonForAdmission || admission?.reason || ''); }}
                            disabled={saving}
                            className="p-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-md transition-colors disabled:opacity-50"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-1" title={admission?.reason}>
                    {admission?.reason || 'No specific reason provided.'}
                </p>
            )}
        </div>
    );
}
