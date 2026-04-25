"use client";

import React, { useState, useMemo } from "react";
import { 
    Search, 
    RefreshCw, 
    CheckCircle2,
    Activity,
    Users,
    ArrowRight,
    SearchX,
    Clock,
    MonitorSmartphone,
    Building
} from "lucide-react";
import { useMasterQueue, useUpdateAppointmentStatus } from "@/lib/integrations/hooks";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";

export default function MasterQueuePage() {
    const [search, setSearch] = useState("");
    const [showAllAppointments, setShowAllAppointments] = useState(false);
    const params = useParams();
    const hospitalId = params.hospitalId as string;
    
    // Fetch today's appointments specifically for queue management
    const today = new Date().toISOString().split('T')[0];
    const { data: appointmentsData, isLoading, refetch } = useMasterQueue(
        1,
        250, // High limit for complete table
        undefined,
        hospitalId
    );

    const updateStatusMutation = useUpdateAppointmentStatus();
    const appointments = appointmentsData?.data || [];

    // Filter Logic based on Toggle
    const displayedList = useMemo(() => {
        let list = [...appointments];

        if (!showAllAppointments) {
            // Live Queue: Show only active patients (Booked, In-Progress, Waiting)
            // Hide Completed and Cancelled appointments
            list = list.filter((apt: any) => {
                const s = (apt.status || "").toLowerCase();
                return s !== "completed" && s !== "cancelled";
            });
        }

        if (search) {
            const s = search.toLowerCase();
            list = list.filter((apt: any) => 
                (apt.patient?.name || apt.patientName || "").toLowerCase().includes(s) || 
                (apt.mrn || "").toLowerCase().includes(s) ||
                (apt.doctorName || "").toLowerCase().includes(s)
            );
        }

        // Sort: First-In-First-Out (FIFO) ascending order
        return list.sort((a: any, b: any) => {
            // In-progress always bubbles to top.
            if (a.status === "in-progress" && b.status !== "in-progress") return -1;
            if (b.status === "in-progress" && a.status !== "in-progress") return 1;
            
            // Then sort by date/time (Ascending)
            const timeA = a.startTime || a.timeSlot || "00:00";
            const timeB = b.startTime || b.timeSlot || "00:00";
            if (timeA !== timeB) return timeA.localeCompare(timeB);

            // Finally by creation date
            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        });
    }, [appointments, search, showAllAppointments]);

    // Analytics computation
    const totalToday = appointments.length;
    const waitingCount = appointments.filter((a: any) => a.status === 'confirmed' || a.status === 'waiting').length;
    const consultingCount = appointments.filter((a: any) => a.status === 'in-progress').length;
    const completedCount = appointments.filter((a: any) => a.status === 'completed').length;

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await updateStatusMutation.mutateAsync({ appointmentId: id, status });
            toast.success(`Moved to ${status.toUpperCase()}`);
            refetch();
        } catch (err) {
            toast.error("Status update failed.");
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto min-h-[calc(100vh-6rem)] pb-10 animate-in fade-in zoom-in-95 duration-500">
            {/* Minimal High-End Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-lg md:text-xl lg:text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        Today's Queue Roster
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                        Master Patient Traffic Log
                    </p>
                </div>
                
                <div className="flex items-center gap-6">
                    {/* Status Chips */}
                    <div className="flex items-center gap-3 pr-6 border-r border-slate-200 hidden lg:flex">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting</p>
                            <p className="text-lg font-black text-slate-700">{waitingCount}</p>
                        </div>
                        <div className="text-center px-4 border-l border-slate-100">
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Consulting</p>
                            <p className="text-lg font-black text-amber-600">{consultingCount}</p>
                        </div>
                        <div className="text-center pl-4 border-l border-slate-100">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Completed</p>
                            <p className="text-lg font-black text-emerald-600">{completedCount}</p>
                        </div>
                    </div>

                    {/* Master Toggle */}
                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${!showAllAppointments ? 'text-indigo-600' : 'text-slate-400'}`}>
                            Live Queue
                        </span>
                        
                        <button 
                            onClick={() => setShowAllAppointments(!showAllAppointments)}
                            className={`w-14 h-7 rounded-full transition-colors relative shadow-inner ${showAllAppointments ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm transition-transform duration-300 ${showAllAppointments ? 'translate-x-8' : 'translate-x-1'}`}></div>
                        </button>
                        
                        <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${showAllAppointments ? 'text-indigo-600' : 'text-slate-400'}`}>
                            All ({totalToday})
                        </span>
                    </div>

                    <button 
                        onClick={() => refetch()}
                        disabled={isLoading || updateStatusMutation.isPending}
                        className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={isLoading ? "animate-spin text-indigo-500" : ""} />
                    </button>
                </div>
            </div>

            {/* Smart Table Layout */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="relative w-full max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder="SEARCH PATIENT, MRN, DR..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                        />
                    </div>
                    
                    <div className="hidden sm:flex items-center gap-2">
                        <Users size={16} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Showing {displayedList.length} Records
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient Profile</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden md:table-cell">Age</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden md:table-cell">Gender</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden lg:table-cell">Doctor</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Schedule</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden xl:table-cell">Source</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden md:table-cell">Payment</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Action Gate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayedList.length > 0 ? (
                                displayedList.map((apt: any, idx: number) => (
                                    <QueueRow 
                                        key={apt.id || apt._id || idx} 
                                        apt={apt} 
                                        idx={idx} 
                                        onUpdateStatus={handleUpdateStatus} 
                                        isProcessing={updateStatusMutation.isPending} 
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                                <SearchX size={24} className="text-slate-300" />
                                            </div>
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                                                {!showAllAppointments 
                                                    ? "Toggle switch ON to view today's booked appointments" 
                                                    : "No records found matching criteria"
                                                }
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Table Row Component
function QueueRow({ apt, idx, onUpdateStatus, isProcessing }: { apt: any, idx: number, onUpdateStatus: any, isProcessing: boolean }) {
    const isConsulting = apt.status === "in-progress";
    const patientName = (apt.patientName || apt.patient?.name || apt.patient?.user?.name || "").trim();
    const status = (apt.status || "").toLowerCase();
    
    // Status Badge Styling Logic
    let statusStyle = "bg-slate-100 text-slate-500 border-slate-200";
    if (status === "waiting" || status === "booked" || status === "confirmed") statusStyle = "bg-indigo-50 text-indigo-600 border-indigo-200";
    if (status === "in-progress") statusStyle = "bg-amber-100 text-amber-700 border-amber-300 shadow-sm shadow-amber-500/20";
    if (status === "completed") statusStyle = "bg-emerald-50 text-emerald-600 border-emerald-200";
    if (status === "cancelled") statusStyle = "bg-rose-50 text-rose-600 border-rose-200";

    return (
        <tr className={`group transition-colors hover:bg-slate-50/50 ${isConsulting ? 'bg-amber-50/30' : ''}`}>
            
            <td className="px-6 py-5 whitespace-nowrap">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm ${isConsulting ? 'bg-amber-500' : 'bg-slate-900'}`}>
                        {patientName.charAt(0)}
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase">{patientName}</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{apt.mrn || apt.patient?.mrn || "N/A"}</p>
                    </div>
                </div>
            </td>

            <td className="px-6 py-5 whitespace-nowrap hidden md:table-cell">
                <p className="text-xs font-black text-slate-700 uppercase">{apt.age || "--"}</p>
            </td>

            <td className="px-6 py-5 whitespace-nowrap hidden md:table-cell">
                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${apt.gender?.toLowerCase() === 'male' ? 'bg-blue-50 text-blue-600 border-blue-100' : apt.gender?.toLowerCase() === 'female' ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                    {apt.gender || "--"}
                </span>
            </td>

            <td className="px-6 py-5 whitespace-nowrap hidden lg:table-cell">
                <p className="text-xs font-black text-slate-700 uppercase">Dr. {apt.doctorName || "Pending Setup"}</p>
            </td>

            <td className="px-6 py-5 whitespace-nowrap">
                <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" />
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{apt.startTime || apt.timeSlot || "N/A"}</span>
                </div>
            </td>

            <td className="px-6 py-5 whitespace-nowrap hidden xl:table-cell">
                <div className="flex items-center gap-1.5">
                    {apt.isOnline !== false ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                            <MonitorSmartphone size={12} className="text-indigo-500" />
                            <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Online</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/50 border border-slate-200 rounded-lg">
                            <Building size={12} className="text-slate-500" />
                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Walk-in</span>
                        </div>
                    )}
                </div>
            </td>

            <td className="px-6 py-5 whitespace-nowrap hidden md:table-cell">
                <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-800">
                        ₹{apt.amount || apt.payment?.amount || apt.fee || "0"}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${(apt.paymentStatus || apt.payment?.paymentStatus)?.toLowerCase() === 'completed' || (apt.paymentStatus || apt.payment?.paymentStatus)?.toLowerCase() === 'success' || apt.paymentStatus === 'Paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {apt.paymentStatus || apt.payment?.paymentStatus || "Pending"}
                    </span>
                </div>
            </td>

            <td className="px-6 py-5 whitespace-nowrap text-right">
                 {(status === "in-progress" || status === "completed" || status === "cancelled") && (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${statusStyle}`}>
                        {isConsulting && <Activity size={12} className="animate-pulse" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{apt.status || "UNKNOWN"}</span>
                    </div>
                 )}
            </td>

            <td className="px-6 py-5 whitespace-nowrap text-right">
                <div className="flex justify-end gap-2">
                    {/* Action 1: Move to Consulting (In-Progress) */}
                    {(status === "waiting" || status === "confirmed" || status === "booked") && (
                        <>
                            <button 
                                onClick={() => onUpdateStatus(apt.id || apt._id, "in-progress")}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 shadow-sm shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                            >
                                <Activity size={14} /> In-Progress
                            </button>
                            <button 
                                onClick={() => onUpdateStatus(apt.id || apt._id, "completed")}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-sm shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                            >
                                <CheckCircle2 size={14} /> Finish
                            </button>
                        </>
                    )}

                    {/* Action 2: Move to Completed while already in consulting */}
                    {isConsulting && (
                        <button 
                            onClick={() => onUpdateStatus(apt.id || apt._id, "completed")}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-sm shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <CheckCircle2 size={14} /> Finish
                        </button>
                    )}

                    {/* Passive states */}
                    {(status === "completed" || status === "cancelled") && (
                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest pr-2">Archived</span>
                    )}
                </div>
            </td>
        </tr>
    );
}
