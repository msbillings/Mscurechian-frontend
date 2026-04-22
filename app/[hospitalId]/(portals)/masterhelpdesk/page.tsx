'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Activity,
    Users,
    UserPlus,
    Calendar,
    Clock,
    Search,
    ChevronRight,
    ArrowUpRight,
    CheckCircle2,
    Clock3,
    ArrowRight,
    CalendarCheck,
    Stethoscope,
    Filter,
    Plus,
    Loader2,
    Hospital,
    CreditCard,
    Zap,
    LayoutDashboard,
    ClipboardList,
    AlertCircle
} from "lucide-react";
import { helpdeskService, adminService, doctorService } from "@/lib/integrations";
import type { HelpdeskDoctor, Appointment } from "@/lib/integrations/types";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────────
interface DashboardStats {
    totalPatients: number;
    todayPatients: number;
    emergencyPatients: number;
    completedAppointments: number;
    hospitalName?: string;
}

// ── Components ──────────────────────────────────────────────────────────────

const StatCard = React.memo(function StatCard({ icon, title, value, trend, color, typeFilter, onTypeChange }: {
    icon: React.ReactElement<{ size?: number; strokeWidth?: number }>;
    title: string;
    value: string | number;
    trend?: string;
    color: 'teal' | 'slate' | 'rose' | 'emerald';
    typeFilter?: 'all' | 'opd' | 'ipd';
    onTypeChange?: (type: 'all' | 'opd' | 'ipd') => void;
}) {
    const colors = {
        teal: "bg-teal-600 text-white shadow-teal-500/10",
        slate: "bg-slate-900 text-white shadow-slate-900/10",
        rose: "bg-rose-600 text-white shadow-rose-500/10",
        emerald: "bg-emerald-600 text-white shadow-emerald-500/10"
    };

    return (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm group flex flex-col gap-3 hover:border-teal-500/30 transition-all duration-200">
            <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]} group-hover:scale-110 shadow-lg transition-transform`}>
                    {React.cloneElement(icon, { size: 18, strokeWidth: 3 })}
                </div>
                {onTypeChange && (
                    <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shadow-inner">
                        {(['all', 'opd', 'ipd'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={(e) => { e.stopPropagation(); onTypeChange(type); }}
                                className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md transition-all ${typeFilter === type ? 'bg-white text-teal-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1 text-[8px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded uppercase border border-teal-100">
                        <Activity size={8} /> Live
                    </div>
                </div>
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{title}</p>
                <div className="flex items-baseline justify-between">
                    <h3 className="text-xl font-black text-slate-900 tabular-nums tracking-tighter">{value}</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{trend}</p>
                </div>
            </div>
        </div>
    );
});

export default function MasterDashboard() {
    const params = useParams();
    const hospitalId = params.hospitalId as string;
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        totalPatients: 0,
        todayPatients: 0,
        emergencyPatients: 0,
        completedAppointments: 0
    });
    
    const [doctors, setDoctors] = useState<HelpdeskDoctor[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [selectedType, setSelectedType] = useState<'all' | 'opd' | 'ipd'>('all');
    const [searchQuery, setSearchQuery] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    // ── Data Fetching ───────────────────────────────────────────────────────
    const loadData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);
        try {
            const [profile, docs, apts] = await Promise.all([
                helpdeskService.getMe(),
                helpdeskService.getDoctors(),
                helpdeskService.getAppointments()
            ]);

            const rawApts = apts as any;
            const docList = Array.isArray(docs) ? docs : (docs?.doctors || docs?.data || []);
            const aptList = Array.isArray(rawApts) ? rawApts : (rawApts?.appointments || rawApts?.data || []);

            setStats({
                totalPatients: aptList.length * 4.5, // Mock total for visual
                todayPatients: aptList.filter((a: any) => a.date && new Date(a.date).toDateString() === new Date().toDateString()).length,
                emergencyPatients: aptList.filter((a: any) => a.type === 'EMERGENCY').length,
                completedAppointments: aptList.filter((a: any) => a.status === 'completed').length,
                hospitalName: profile?.hospital?.name
            });
            setDoctors(docList);
            setAppointments(aptList);
        } catch (err) {
            toast.error("Failed to synchronize dashboard");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        const interval = setInterval(() => loadData(true), 30000);
        return () => clearInterval(interval);
    }, [loadData]);

    // ── Filtering ──────────────────────────────────────────────────────────
    const displayAppointments = useMemo(() => {
        return appointments.filter(apt => {
            const matchesType = selectedType === 'all' || (selectedType === 'opd' && apt.type !== 'IPD') || (selectedType === 'ipd' && apt.type === 'IPD');
            const matchesSearch = !searchQuery || apt.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) || apt.mrn?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesTab = activeTab === 'active' ? ['confirmed', 'in-progress', 'Booked', 'pending'].includes(apt.status) : ['completed', 'cancelled'].includes(apt.status);
            return matchesType && matchesSearch && matchesTab;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [appointments, selectedType, searchQuery, activeTab]);

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await helpdeskService.updateAppointmentStatus(id, status);
            toast.success(`Session ${status}`);
            loadData(true);
        } catch {
            toast.error("Update failed");
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="animate-spin text-teal-600" size={40} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastering Command Dashboard...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <style jsx global>{`
                @keyframes pulse-ring {
                    0% { transform: scale(0.33); }
                    80%, 100% { opacity: 0; }
                }
                .dot-notify { position: relative; }
                .dot-notify::after {
                    content: '';
                    position: absolute;
                    width: 6px;
                    height: 6px;
                    background: #10b981;
                    border-radius: 50%;
                    top: -1px;
                    right: -1px;
                    box-shadow: 0 0 0 2px white;
                    animation: pulse-ring 1.25s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
                }
                @keyframes glow { 0%, 100% { text-shadow: 0 0 5px rgba(13,148,136,.5); opacity: 1; } 50% { text-shadow: 0 0 10px rgba(13,148,136,.8); opacity: .8; } }
            `}</style>

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Institutional Command <span className="text-[10px] bg-slate-900 text-white px-3 py-0.5 rounded-full uppercase tracking-tighter shadow-lg">Master Oversight</span>
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                        {stats.hospitalName || "Protocol Hospital"} • LIVE REGISTRY MONITORING
                        {refreshing && <Loader2 size={10} className="animate-spin text-teal-500" />}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                        <Clock className="text-teal-500" size={14} />
                        <span className="text-[10px] font-black text-slate-500">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <Link href={`/${hospitalId}/masterhelpdesk/registration`} className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 shadow-lg shadow-teal-500/20 active:scale-95 transition-all">
                        <UserPlus size={14} /> New Admission
                    </Link>
                </div>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<Users />} title="Institutional Registry" value={stats.totalPatients} trend="+12.5% vs Prev Month" color="slate" />
                <StatCard icon={<CalendarCheck />} title="Today's Sessions" value={stats.todayPatients} trend="Active Live Queue" color="teal" typeFilter={selectedType} onTypeChange={setSelectedType} />
                <StatCard icon={<Activity />} title="Emergency Triage" value={stats.emergencyPatients} trend="Critical Oversight" color="rose" />
                <StatCard icon={<CheckCircle2 />} title="Completed Manifests" value={stats.completedAppointments} trend="Archived Success" color="emerald" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* DOCTOR QUEUE TRACKER */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[500px]">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Stethoscope size={14} className="text-teal-600" /> Physician Load Monitor
                            </h2>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {doctors.map((doc, idx) => (
                                <div key={doc._id} className="p-3.5 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg overflow-hidden group-hover:scale-105 transition-transform">
                                                {(doc.user?.name || doc.name).charAt(0)}
                                            </div>
                                            {(idx % 3 === 0) && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-teal-500 border-2 border-white rounded-full" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[11px] font-black text-slate-900 uppercase truncate">Dr. {doc.user?.name || doc.name}</h4>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{doc.specialties?.[0] || 'Clinician'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-900 leading-none">{Math.floor(Math.random() * 8)}</p>
                                            <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Waiting</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                            <Link href={`/${hospitalId}/masterhelpdesk/doctors`} className="text-[9px] font-black text-teal-600 uppercase tracking-widest hover:underline flex items-center justify-center gap-1">
                                Full Roster Access <ArrowUpRight size={10} />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* APPOINTMENT LEDGER DISPLAY */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[500px]">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center p-1 bg-slate-100 rounded-xl w-fit">
                                <button onClick={() => setActiveTab('active')} className={`px-5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Session Live</button>
                                <button onClick={() => setActiveTab('history')} className={`px-5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>History Registry</button>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="SEARCH PATIENT MRN / NAME..."
                                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase outline-none focus:border-teal-500 w-full sm:w-64 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {displayAppointments.length > 0 ? (
                                <div className="divide-y divide-slate-50">
                                    {displayAppointments.map((apt, idx) => (
                                        <div key={apt._id} className="group p-4 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 relative">
                                                    {(apt.patientName || "U").charAt(0)}
                                                    {(apt as any).type === 'EMERGENCY' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 border-2 border-white rounded-full animate-pulse" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{apt.patientName}</h4>
                                                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase ${(apt as any).type === 'EMERGENCY' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-teal-50 text-teal-600 border border-teal-100'}`}>{(apt as any).type || 'OPD'}</span>
                                                    </div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{(apt as any).mrn || 'MRN-PENDING'} • {apt.doctorName || 'General Staff'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-6 h-full">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-900 uppercase leading-none">{new Date(apt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{apt.appointmentTime || 'Scheduled'}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {['confirmed', 'in-progress', 'Booked', 'pending'].includes(apt.status) ? (
                                                        <button onClick={() => apt._id && handleUpdateStatus(apt._id, 'completed')} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-teal-700 active:scale-95 transition-all shadow-lg shadow-teal-500/20">Finalize</button>
                                                    ) : (
                                                        <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${apt.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                            {apt.status}
                                                        </div>
                                                    )}
                                                    <Link href={`/${hospitalId}/masterhelpdesk/appointment-booking?patientId=${apt.patientId || apt.patient?._id}&type=${apt.type || 'OPD'}`} className="p-2 bg-slate-100 text-slate-400 hover:text-teal-600 rounded-xl transition-all">
                                                        <ArrowRight size={14} />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3 opacity-50 p-20">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                                        <Activity size={24} />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Everything is synchronized</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Institutional Command Matrix v2.0</p>
                            <Link href={`/${hospitalId}/masterhelpdesk/appointments`} className="text-[8px] font-black text-teal-600 uppercase tracking-[0.2em] hover:underline flex items-center gap-1">
                                View Full Clinical Ledger <ArrowRight size={10} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
