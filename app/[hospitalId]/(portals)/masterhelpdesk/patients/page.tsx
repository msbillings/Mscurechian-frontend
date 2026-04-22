'use client';

import React, { useMemo, useState, useEffect } from "react";
import {
    Search,
    Calendar,
    Plus,
    ChevronRight,
    ChevronLeft,
    ArrowLeft,
    Activity,
    ExternalLink,
    RefreshCw,
    Printer,
    UserPlus,
    ShieldCheck
} from "lucide-react";
import { helpdeskService, adminService, useHelpdeskPatients } from "@/lib/integrations";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ClinicalReceipt from "@/components/helpdesk/ClinicalReceipt";
import AppointmentHistoryModal from "@/components/helpdesk/AppointmentHistoryModal";

// ── Debounce Hook ────────────────────────────────────────────────────────
function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(t);
    }, [value, delayMs]);
    return debounced;
}

export default function MasterPatientsPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [activeFilter, setActiveFilter] = useState<'all' | 'ipd' | 'opd'>('all');

    // Receipt & History States
    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);
    const [hospitalInfo, setHospitalInfo] = useState<any>(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [appointmentHistory, setAppointmentHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<any>(null);

    // Doctor Map
    const [doctorMap, setDoctorMap] = useState<Record<string, string>>({});

    // ── Data Loading ───────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            try {
                const [docs, prof] = await Promise.all([
                    helpdeskService.getDoctors(),
                    adminService.getProfile()
                ]);
                const map: Record<string, string> = {};
                docs.forEach((doc: any) => { map[doc._id] = doc.user?.name || doc.name; });
                setDoctorMap(map);
                if (prof?.hospital) setHospitalInfo(prof.hospital);
            } catch (err) {
                console.error("Init failure", err);
            }
        };
        init();
    }, []);

    const debouncedSearch = useDebouncedValue(searchTerm, 300);
    const { data: patientsRaw, isLoading, isFetching, refetch } = useHelpdeskPatients(
        debouncedSearch,
        page,
        limit,
        activeFilter,
        true
    );

    const { patients, total } = useMemo(() => {
        const raw: any = patientsRaw;
        if (!raw) return { patients: [] as any[], total: 0 };
        if (Array.isArray(raw)) return { patients: raw, total: raw.length };
        return {
            patients: raw.data || [],
            total: raw.pagination?.total || (raw.data?.length || 0),
        };
    }, [patientsRaw]);

    const totalPages = Math.ceil(total / limit);

    // ── Handlers ──────────────────────────────────────────────────────────
    const handleFetchHistory = async (patient: any) => {
        try {
            setSelectedPatientForHistory(patient);
            setShowHistoryModal(true);
            setHistoryLoading(true);

            const patientId = patient._id || patient.id;
            const [opdRes, ipdRes] = await Promise.all([
                helpdeskService.getAppointments(1, 50, patientId).catch(() => ({ appointments: [] })),
                fetch(`/api/helpdesk/patients/${patientId}/ipd-admissions`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }).then(res => res.ok ? res.json() : { admissions: [] }).catch(() => ({ admissions: [] }))
            ]);

            const opdApts = opdRes.appointments || opdRes.data || [];
            const ipdAdms = ipdRes.admissions || ipdRes.data || [];

            const transformedIPD = ipdAdms.map((adm: any) => ({
                ...adm,
                type: 'IPD',
                date: adm.admissionDate || adm.createdAt,
                appointmentId: adm.admissionId,
                doctor: adm.primaryDoctor
            }));

            const allHistory = [...opdApts, ...transformedIPD].sort((a, b) =>
                new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
            );

            setAppointmentHistory(allHistory);
        } catch (err) {
            toast.error("Failed to load history");
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleSelectAppointment = async (appt: any) => {
        const patient = selectedPatientForHistory;
        if (!patient || !appt) return;

        setShowHistoryModal(false);
        const doctorName = appt.doctor?.name || appt.doctorName || doctorMap[appt.doctor?._id || appt.doctor] || "N/A";

        setReceiptData({
            hospital: { name: hospitalInfo?.name, address: hospitalInfo?.address, contact: hospitalInfo?.phone, email: hospitalInfo?.email, logo: hospitalInfo?.logo },
            patient: { 
                name: patient.name || patient.user?.name, 
                mrn: patient.mrn || "N/A", 
                age: patient.age, 
                gender: patient.gender, 
                mobile: patient.mobile || patient.user?.mobile,
                vitals: appt.vitals
            },
            appointment: { 
                doctorName, 
                date: new Date(appt.date).toLocaleDateString(), 
                time: appt.appointmentTime || "N/A", 
                type: appt.type || "OPD",
                appointmentId: appt.appointmentId || appt._id?.substring(0, 8).toUpperCase()
            },
            payment: { 
                amount: appt.payment?.amount || appt.amount || 0, 
                method: appt.payment?.paymentMethod || appt.paymentMethod || 'cash', 
                status: appt.payment?.paymentStatus || appt.paymentStatus || 'paid'
            }
        });
        setShowReceipt(true);
    };

    if (isLoading && !patientsRaw) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <RefreshCw className="animate-spin text-indigo-600" size={32} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hydrating Clinical Registry...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Institutional Patient Registry <span className="text-[10px] bg-slate-900 text-white px-3 py-0.5 rounded-full uppercase tracking-tighter shadow-lg">Master Oversight</span>
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">High-Fidelity Medical Records & Clinical Manifests</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
                        <ShieldCheck size={14} className="text-indigo-600" />
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Institutional Authentication</span>
                    </div>
                    <Link href="/masterhelpdesk/registration" className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">
                        <UserPlus size={14} /> New Enrollment
                    </Link>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-3 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4 group">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by MRN, Name, or Mobile Reference..."
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[2rem] text-xs font-bold uppercase outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                </div>
                <div className="flex items-center p-1 bg-slate-100 rounded-[1.5rem] border border-slate-200 shadow-inner">
                    {(['all', 'ipd', 'opd'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => { setActiveFilter(f); setPage(1); }}
                            className={`px-6 py-2 rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest transition-all ${activeFilter === f ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {f} Records
                        </button>
                    ))}
                </div>
                <button onClick={() => refetch()} className="p-4 bg-white border border-slate-200 text-slate-400 rounded-[1.5rem] hover:text-indigo-600 transition-all shadow-sm">
                    <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Registry Table */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identification</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Name</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Demographics</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Contact</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Oversight Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {patients.map((p: any) => (
                                <tr key={p._id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-5">
                                        <span className="text-[11px] font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 tracking-tight">{p.mrn || 'PENDING'}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shadow-lg shadow-slate-900/10">{(p.name || p.user?.name)?.charAt(0)}</div>
                                            <span className="text-[13px] font-black text-slate-900 uppercase tracking-tight">{p.name || p.user?.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg uppercase">{p.age}Y</span>
                                            <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg uppercase">{p.gender}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-[12px] font-bold text-slate-600 tracking-wider font-mono">{p.mobile || p.user?.mobile || 'N/A'}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleFetchHistory(p)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 rounded-xl transition-all shadow-sm" title="Clinical History">
                                                <Printer size={16} />
                                            </button>
                                            <Link href={`/masterhelpdesk/appointment-booking?patientId=${p._id}`} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-indigo-500/10">
                                                <Plus size={16} />
                                            </Link>
                                            <Link href={`/masterhelpdesk/patients/${p._id}`} className="p-2 bg-slate-100 text-slate-500 hover:text-slate-900 rounded-xl transition-all">
                                                <ExternalLink size={16} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Showing {patients.length} objects of {total}</p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase disabled:opacity-30">Previous</button>
                            <span className="text-[10px] font-black text-slate-900 px-4">{page} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase disabled:opacity-30">Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showHistoryModal && (
                <AppointmentHistoryModal
                    patientName={selectedPatientForHistory?.name || "Patient"}
                    appointments={appointmentHistory}
                    isLoading={historyLoading}
                    onSelect={handleSelectAppointment}
                    onClose={() => setShowHistoryModal(false)}
                    doctorMap={doctorMap}
                />
            )}
            {showReceipt && receiptData && (
                <ClinicalReceipt
                    hospital={receiptData.hospital}
                    patient={receiptData.patient}
                    appointment={receiptData.appointment}
                    payment={receiptData.payment}
                    onClose={() => setShowReceipt(false)}
                />
            )}
        </div>
    );
}
