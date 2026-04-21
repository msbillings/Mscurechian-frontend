"use client";

import React, { useState, useMemo } from "react";
import { 
    Calendar, 
    Search, 
    Filter, 
    RefreshCw, 
    ChevronLeft, 
    ChevronRight,
    SearchX,
    Stethoscope,
    Clock
} from "lucide-react";
import { useAppointments } from "@/lib/integrations/hooks";

export default function MasterAppointmentsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    const { data: appointmentsData, isLoading, refetch } = useAppointments(
        page,
        15,
        undefined,
        dateFilter,
        dateFilter
    );

    const appointments = appointmentsData?.data || [];
    const pagination = appointmentsData?.pagination || { totalPages: 1 };

    const filteredAppointments = useMemo(() => {
        let list = appointments;
        if (statusFilter !== "all") {
            list = list.filter((apt: any) => apt.status?.toLowerCase() === statusFilter.toLowerCase());
        }
        if (search) {
            const s = search.toLowerCase();
            list = list.filter((apt: any) => 
                apt.patientName?.toLowerCase().includes(s) || 
                apt.mrn?.toLowerCase().includes(s) ||
                apt.doctorName?.toLowerCase().includes(s)
            );
        }
        return list;
    }, [appointments, search, statusFilter]);

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "completed": return "bg-emerald-50 text-emerald-600 border-emerald-100";
            case "confirmed": return "bg-blue-50 text-blue-600 border-blue-100";
            case "in-progress": return "bg-amber-50 text-amber-600 border-amber-100";
            case "waiting": return "bg-indigo-50 text-indigo-600 border-indigo-100";
            case "cancelled": return "bg-rose-50 text-rose-600 border-rose-100";
            default: return "bg-slate-50 text-slate-600 border-slate-100";
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Appointments Management</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Cross-Hospital Booking Ledger</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => refetch()}
                        className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-indigo-600 shadow-sm transition-all active:scale-95"
                    >
                        <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                    </button>
                    <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
                        <Calendar size={18} className="ml-2 text-slate-400" />
                        <input 
                            type="date" 
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="bg-transparent border-none text-xs font-black text-slate-700 focus:ring-0 uppercase outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="SEARCH PATIENT, MRN, OR DOCTOR..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    />
                </div>
                
                <div className="md:col-span-1 border border-slate-200 bg-white rounded-2xl flex items-center px-4">
                    <Filter className="text-slate-400 mr-2" size={18} />
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="flex-1 bg-transparent border-none text-xs font-black text-slate-700 focus:ring-0 uppercase outline-none py-3"
                    >
                        <option value="all">ALL STATUSES</option>
                        <option value="booked">BOOKED</option>
                        <option value="confirmed">CONFIRMED</option>
                        <option value="waiting">WAITING</option>
                        <option value="completed">COMPLETED</option>
                        <option value="cancelled">CANCELLED</option>
                    </select>
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Doctor</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Source</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                Array(8).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-6 py-4">
                                            <div className="h-12 bg-slate-50 rounded-xl w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredAppointments.length > 0 ? (
                                filteredAppointments.map((apt: any, idx: number) => (
                                    <tr key={apt.id || apt._id || idx} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-black text-slate-300 uppercase">#{apt.appointmentId?.split('-').pop() || apt.id?.slice(-4)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
                                                    {apt.patientName?.charAt(0) || "P"}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900 uppercase">{apt.patientName}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MRN: {apt.mrn || "N/A"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                                    <Stethoscope size={14} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 uppercase">{apt.doctorName || "Pending"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={12} className="text-slate-400" />
                                                    <span className="text-xs font-black text-slate-900 uppercase tabular-nums">
                                                        {apt.timeSlot || apt.startTime || "N/A"}
                                                    </span>
                                                </div>
                                                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                                                    {apt.date ? new Date(apt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : "Date N/A"}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${apt.isOnline ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                {apt.isOnline ? 'MOBILE APP' : 'WALK-IN'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(apt.status)}`}>
                                                    {apt.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                                                DETAILS
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                                <SearchX className="text-slate-300" size={32} />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 uppercase">No Appointments Found</h3>
                                            <p className="text-xs font-medium text-slate-400 uppercase tracking-[0.2em] mt-1">Try adjusting your filters or date selection</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Showing {filteredAppointments.length} results
                    </p>
                    <div className="flex items-center gap-1">
                        <button 
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-50 transition-all"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="px-4 text-xs font-black text-slate-700">
                            {page} / {pagination.totalPages || 1}
                        </div>
                        <button 
                            disabled={page >= pagination.totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-50 transition-all"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
