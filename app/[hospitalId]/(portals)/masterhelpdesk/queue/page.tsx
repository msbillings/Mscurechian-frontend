"use client";

import React, { useState, useMemo } from "react";
import { 
    Clock, 
    Search, 
    RefreshCw, 
    User,
    Stethoscope,
    CheckCircle2,
    Activity,
    Timer,
    Users,
    ArrowRight,
    SearchX,
    AlertCircle,
    AlertTriangle
} from "lucide-react";
import { useAppointments, useUpdateAppointmentStatus } from "@/lib/integrations/hooks";
import { toast } from "react-hot-toast";

export default function MasterQueuePage() {
    const [search, setSearch] = useState("");
    
    // Fetch today's appointments specifically for queue management
    const today = new Date().toISOString().split('T')[0];
    const { data: appointmentsData, isLoading, refetch } = useAppointments(
        1,
        100, // Large limit for queue listing
        undefined,
        today,
        today
    );

    const updateStatusMutation = useUpdateAppointmentStatus();

    const appointments = appointmentsData?.data || [];

    // Filter for queue: Waiting or In-Progress or Confirmed (but not yet completed/cancelled)
    const queueList = useMemo(() => {
        const activeStatuses = ["waiting", "confirmed", "in-progress", "arrived", "booked"];
        let list = appointments.filter((apt: any) => 
            activeStatuses.includes(apt.status?.toLowerCase())
        );

        if (search) {
            const s = search.toLowerCase();
            list = list.filter((apt: any) => 
                apt.patientName?.toLowerCase().includes(s) || 
                apt.mrn?.toLowerCase().includes(s) ||
                apt.doctorName?.toLowerCase().includes(s)
            );
        }

        // Sort by time: In-Progress first, then by earliest schedule
        return list.sort((a: any, b: any) => {
            if (a.status === "in-progress" && b.status !== "in-progress") return -1;
            if (b.status === "in-progress" && a.status !== "in-progress") return 1;
            
            const timeA = a.startTime || a.timeSlot || "99:99";
            const timeB = b.startTime || b.timeSlot || "99:99";
            return timeA.localeCompare(timeB);
        });
    }, [appointments, search]);

    const onlineQueue = useMemo(() => queueList.filter((a: any) => a.isOnline), [queueList]);
    const offlineQueue = useMemo(() => queueList.filter((a: any) => !a.isOnline), [queueList]);

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await updateStatusMutation.mutateAsync({ appointmentId: id, status });
            toast.success(`Patient moved to ${status}`);
            refetch();
        } catch (err) {
            toast.error("Status update failed");
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Today's Patient Queue</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Real-time Clinical Flow Monitor</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 flex items-center gap-2">
                        <Users size={16} />
                        <span className="text-xs font-black uppercase tracking-widest">{queueList.length} IN QUEUE</span>
                    </div>
                    <button 
                        onClick={() => refetch()}
                        className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-indigo-600 shadow-sm transition-all active:scale-95"
                    >
                        <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Live Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="LOCATE PATIENT IN QUEUE..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none shadow-sm"
                />
            </div>

            {/* Queue Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Waiting Patients */}
                <div className="xl:col-span-2 space-y-8">
                    {/* Online Queue */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <Activity size={18} className="text-indigo-600" />
                            <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Online Bookings</h2>
                            <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full ml-2">{onlineQueue.length}</span>
                            <div className="flex-1 border-b border-slate-100 ml-2"></div>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {onlineQueue.length > 0 ? (
                                onlineQueue.map((apt: any, idx: number) => (
                                    <QueueCard key={apt.id || apt._id} apt={apt} idx={idx} onUpdateStatus={handleUpdateStatus} />
                                ))
                            ) : (
                                <div className="py-10 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No online patients</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Offline Queue */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <Users size={18} className="text-slate-600" />
                            <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Walk-in Registry</h2>
                            <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full ml-2">{offlineQueue.length}</span>
                            <div className="flex-1 border-b border-slate-100 ml-2"></div>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {offlineQueue.length > 0 ? (
                                offlineQueue.map((apt: any, idx: number) => (
                                    <QueueCard key={apt.id || apt._id} apt={apt} idx={idx} onUpdateStatus={handleUpdateStatus} />
                                ))
                            ) : (
                                <div className="py-10 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No walk-in patients</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Queue Summary / Stats */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <Activity size={18} className="text-emerald-600" />
                        <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Queue Health</h2>
                        <div className="flex-1 border-b border-slate-100 ml-2"></div>
                    </div>

                    <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white space-y-6 relative overflow-hidden shadow-xl shadow-indigo-900/10">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        
                        <div>
                            <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] mb-1">Estimated Wait Time</p>
                            <div className="flex items-end gap-2 text-3xl font-black tabular-nums">
                                ~12 <span className="text-sm text-indigo-300 font-bold uppercase mb-1">Mins</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Waiting</p>
                                <p className="text-xl font-black">{queueList.filter((a: any) => a.status === 'confirmed' || a.status === 'waiting').length}</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Consulting</p>
                                <p className="text-xl font-black text-amber-400">{queueList.filter((a: any) => a.status === 'in-progress').length}</p>
                            </div>
                        </div>

                        <div className="pt-2">
                             <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Flow Capacity</span>
                                <span className="text-[10px] font-black text-emerald-400">85% Optimal</span>
                             </div>
                             <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 w-[85%] rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                             </div>
                        </div>
                    </div>

                    {/* Quick Tips */}
                    <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 flex gap-4">
                        <AlertCircle className="text-amber-500 shrink-0" size={20} />
                        <div>
                            <h4 className="text-xs font-black text-amber-900 uppercase tracking-tight">Queue Management Tip</h4>
                            <p className="text-[10px] font-medium text-amber-700/80 mt-1 leading-relaxed">
                                Use the Master Portal to re-assign patients if one doctor's queue becomes significantly longer than others to balance the clinical load.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function QueueCard({ apt, idx, onUpdateStatus }: any) {
    return (
        <div 
            className={`bg-white p-4 rounded-[2rem] border transition-all duration-300 flex flex-col sm:flex-row items-center gap-4 hover:shadow-md ${
                apt.status === "waiting" ? "border-indigo-100 bg-indigo-50/10 shadow-sm" : 
                apt.status === "in-progress" ? "border-amber-200 bg-amber-50/10 ring-2 ring-amber-500/20" : 
                "border-slate-200"
            }`}
        >
            <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                    {(idx + 1).toString().padStart(2, '0')}
                </div>
                
                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-bold text-lg">
                    {apt.patientName?.charAt(0) || "P"}
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="text-[13px] font-black text-slate-900 uppercase truncate">{apt.patientName}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{apt.mrn || "NO MRN"}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">{apt.startTime || apt.timeSlot || "N/A"}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-4 sm:border-l border-slate-100 pl-4 w-full sm:w-auto">
                <div className="text-left min-w-[120px]">
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">DOCTOR</p>
                    <p className="text-[11px] font-black text-slate-700 uppercase truncate">{apt.doctorName || "Pending"}</p>
                </div>

                <div className="flex items-center gap-2">
                    {apt.status === "in-progress" ? (
                        <div className="px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl flex items-center gap-2">
                            <Activity size={12} className="animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">CONSULTING</span>
                        </div>
                    ) : (
                        <button 
                            onClick={() => onUpdateStatus(apt.id || apt._id, "in-progress")}
                            className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors flex items-center gap-2 group"
                        >
                            CONSULT <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    )}
                    
                    <button 
                        onClick={() => onUpdateStatus(apt.id || apt._id, "completed")}
                        className="p-1.5 text-slate-300 hover:text-emerald-500 transition-colors"
                    >
                        <CheckCircle2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
