'use client';

import React, { useState, useMemo, useCallback } from "react";
import {
    Users,
    Calendar,
    Search,
    Stethoscope,
    ChevronRight,
    Activity,
    AlertCircle,
    Plus,
    RefreshCw,
    CheckCircle2,
    Activity as ActivityIcon,
    ArrowLeft,
    Filter,
    FileText,
    Clock,
    MoreVertical,
    FileDown,
    X
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useTenantLink } from "@/hooks/useTenantLink";
import { useAuthStore } from "@/stores/authStore";
import { helpdeskService } from "@/lib/integrations/services/helpdesk.service";
import { useMasterQueue, useHelpdeskDoctors, useUpdateAppointmentStatus } from "@/lib/integrations/hooks";
import toast from "react-hot-toast";
import { formatLocalTime } from "@/lib/utils/date-utils";
import { OnlineClinicalLedger } from "@/components/masterhelpdesk/OnlineClinicalLedger";
import { OfflineClinicalLedger } from "@/components/masterhelpdesk/OfflineClinicalLedger";
import { sanitizePatientName } from "@/lib/utils/name-utils";

export default function MasterAppointmentsLedger() {
    const router = useRouter();
    const { getPath } = useTenantLink();
    const { user } = useAuthStore();
    const params = useParams();
    const hospitalId = params.hospitalId as string;
    
    // Filters State
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [selectedDoctorId, setSelectedDoctorId] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [channelFilter, setChannelFilter] = useState("all");

    const [page, setPage] = useState(1);
    const limit = 20;

    // Fetch Global Master Queue
    const { data: appointmentsData, isLoading, refetch } = useMasterQueue(
        page,
        limit,
        statusFilter === "all" ? undefined : statusFilter,
        hospitalId
    );

    // Fetch Doctors for filter
    const { data: doctorsData } = useHelpdeskDoctors();
    const updateStatusMutation = useUpdateAppointmentStatus();

    const appointments = useMemo(() => {
        const raw = appointmentsData as any;
        const list = Array.isArray(raw) ? raw : (raw?.appointments || raw?.data || []);
        
        // DEBUG LOG: Trace resolved clinical data
        if (list.length > 0) {
            console.log("=== APPOINTMENT DATA TRACE ===");
            list.forEach((apt: any, i: number) => {
                console.log(`[${i}] Name: ${apt.patientName || apt.patient?.name}, MRN: ${apt.mrn || apt.patient?.mrn}`);
            });
        }

        // Frontend filtering (Fallback)
        return list.filter((apt: any) => {
            const pName = (apt.patientDetails?.name || apt.patient?.name || apt.patient?.profile?.name || apt.patientName || "").toLowerCase();
            const dName = (apt.doctor?.user?.name || apt.doctor?.name || apt.doctor?.profile?.name || apt.doctorName || "").toLowerCase();
            const matchesSearch = searchTerm === "" || 
                pName.includes(searchTerm.toLowerCase()) || 
                apt.patient?.mrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                apt.mrn?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === "all" || apt.status?.toLowerCase() === statusFilter.toLowerCase();
            const matchesType = typeFilter === "all" || apt.type?.toLowerCase() === typeFilter.toLowerCase();
            const matchesDoctor = selectedDoctorId === "all" || 
                apt.doctorId === selectedDoctorId || 
                apt.doctor?._id === selectedDoctorId;
            
            const matchesChannel = channelFilter === "all" || 
                (channelFilter === "online" && apt.isOnline) || 
                (channelFilter === "offline" && !apt.isOnline);

            return matchesSearch && matchesStatus && matchesType && matchesDoctor && matchesChannel;
        }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [appointmentsData, searchTerm, statusFilter, typeFilter, selectedDoctorId, channelFilter]);

    const handleUpdateStatus = useCallback(async (appointmentId: string, status: string) => {
        try {
            await updateStatusMutation.mutateAsync({ appointmentId, status });
            toast.success(`Protocol updated: ${status.toUpperCase()}`);
            refetch();
        } catch (err: any) {
            toast.error("Operation failed");
        }
    }, [updateStatusMutation, refetch]);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed': return 'bg-teal-50 text-teal-700 border-teal-100';
            case 'in-progress': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-100';
            default: return 'bg-slate-50 text-slate-500 border-slate-100';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <button onClick={() => router.back()} className="p-2 border rounded-xl hover:bg-slate-50 transition-colors">
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <h1 className="text-lg md:text-xl lg:text-xl font-black text-slate-900 uppercase tracking-tight">Master Clinical Ledger</h1>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Hospital-Wide Deployment Tracker</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                     <button onClick={() => router.push(getPath("/masterhelpdesk/appointment-booking"))} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95">
                        <Plus size={16} /> New Enrollment
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="col-span-1 lg:col-span-2 relative flex items-center">
                        <Search className="absolute left-4 text-slate-400" size={16} />
                        <input 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="SEARCH BY MRN / NAME..." 
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all leading-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Start Date</label>
                        <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black outline-none" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">End Date</label>
                        <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black outline-none" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Status</label>
                        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none">
                            <option value="all">ALL STATUS</option>
                            <option value="pending">PENDING</option>
                            <option value="confirmed">CONFIRMED</option>
                            <option value="in-progress">IN-PROGRESS</option>
                            <option value="completed">COMPLETED</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Consultant</label>
                        <select value={selectedDoctorId} onChange={e=>setSelectedDoctorId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none">
                            <option value="all">ALL CONSULTANTS</option>
                            {(Array.isArray(doctorsData) ? doctorsData : (doctorsData as any)?.doctors || (doctorsData as any)?.data || [])?.map((doc: any) => (
                                <option key={doc._id} value={doc._id}>{doc.user?.name || doc.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            
            {/* Channel Toggles */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl w-fit shadow-sm">
                    <button 
                        onClick={() => setChannelFilter("all")}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${channelFilter === "all" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        Total ({ (appointmentsData as any)?.pagination?.total || 0 })
                    </button>
                    <button 
                         onClick={() => setChannelFilter("online")}
                         className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${channelFilter === "online" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        Online ({ (appointmentsData as any)?.pagination?.onlineCount || 0 })
                    </button>
                    <button 
                         onClick={() => setChannelFilter("offline")}
                         className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${channelFilter === "offline" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        Offline ({ (appointmentsData as any)?.pagination?.offlineCount || 0 })
                    </button>
                </div>

                <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 italic">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                       Showing {appointments.length} clinical engagements
                    </p>
                </div>
            </div>

            {/* Main Ledger Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                {channelFilter === "online" ? (
                    <OnlineClinicalLedger 
                        appointments={appointments} 
                        isLoading={isLoading} 
                        onUpdateStatus={handleUpdateStatus} 
                    />
                ) : channelFilter === "offline" ? (
                    <OfflineClinicalLedger 
                        appointments={appointments} 
                        isLoading={isLoading} 
                        onUpdateStatus={handleUpdateStatus} 
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="text-left p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Entity</th>
                                    <th className="text-left p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Consultant</th>
                                    <th className="text-center p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule</th>
                                    <th className="text-center p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Engagement</th>
                                    <th className="text-right p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center">
                                            <div className="flex flex-col items-center">
                                                <RefreshCw className="animate-spin text-indigo-600 mb-4" size={32} />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synchronizing Manifest...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : appointments.length > 0 ? (
                                    appointments.map((apt: any, i: number) => (
                                        <tr key={i} className="group hover:bg-slate-50/80 transition-all italic-hover:bg-slate-100">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-base group-hover:scale-110 transition-transform shadow-lg shadow-slate-200">
                                                        {sanitizePatientName(apt.patientName || apt.patient?.name).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                                                            {sanitizePatientName(apt.patientName || apt.patient?.name)}
                                                        </h4>
                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg uppercase tracking-widest border border-indigo-100">
                                                                MRN: {apt.mrn || "N/A"}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg tracking-wider font-mono">
                                                                {apt.patientMobile || apt.patients?.mobile || apt.patient?.mobile || "No Mobile"}
                                                            </span>
                                                            {((apt.age && apt.age !== "--") || (apt.patient?.age && apt.patient?.age !== "--")) && (
                                                                <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-lg uppercase">
                                                                    {apt.age || apt.patient?.age}Y
                                                                </span>
                                                            )}
                                                            {apt.isOnline && (
                                                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg uppercase tracking-widest border border-emerald-100">Mobile</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 hidden md:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                        <Stethoscope size={14} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[150px]">
                                                            {apt.doctor?.user?.name || apt.doctor?.name || apt.doctor?.profile?.name || apt.doctorName || "Pending Assign"}
                                                        </p>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Facility Expert</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex flex-col items-center gap-1">
                                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">
                                                        {apt.date ? new Date(apt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A"}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <Clock size={10} /> {apt.appointmentTime || apt.startTime || apt.time || "No Slot"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center hidden sm:table-cell">
                                                <span className={`px-2 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border ${
                                                    apt.type?.toLowerCase() === 'emergency' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                                    apt.type?.toLowerCase() === 'ipd' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                                }`}>
                                                    {apt.type || "OPD"}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest border ${getStatusColor(apt.status || 'pending')}`}>
                                                    {apt.status === 'confirmed' ? <CheckCircle2 size={12} /> : <ActivityIcon size={12} />}
                                                    {apt.status || "Pending"}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-32 text-center text-slate-400 uppercase font-black text-xs tracking-widest">
                                            No clinical engagements found for the selected manifest scope
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
