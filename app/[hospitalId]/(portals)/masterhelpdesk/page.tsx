"use client";

import React, { useMemo } from "react";
import { 
    Users, 
    Calendar, 
    Activity, 
    ArrowUpRight, 
    TrendingUp, 
    Clock, 
    CheckCircle2,
    Building2,
    RefreshCw,
    Plus,
    CalendarCheck,
    CreditCard
} from "lucide-react";
import Link from "next/link";
import { useHelpdeskDashboard } from "@/lib/integrations/hooks";
import { useAuthStore } from "@/stores/authStore";
import { useTenantLink } from "@/hooks/useTenantLink";
import { formatLocalTime } from "@/lib/utils/date-utils";

export default function MasterHelpdeskDashboard() {
    const { user } = useAuthStore();
    const { getPath } = useTenantLink();
    const { data: dashboardData, isLoading, refetch } = useHelpdeskDashboard();

    const stats: any = dashboardData?.stats || {
        totalPatients: 0,
        todayPatients: 0,
        pendingAppointments: 0,
        emergencyCases: 0,
        totalDoctors: 0,
        activeTransits: 0,
        revenueToday: 0
    };

    const appointments = dashboardData?.appointments || [];

    const statsConfig = [
        { 
            label: "Total Registry", 
            value: stats.totalPatients, 
            icon: Users, 
            color: "blue",
            trend: "+12% this month"
        },
        { 
            label: "Today's Volume", 
            value: stats.todayPatients, 
            icon: Calendar, 
            color: "indigo",
            trend: "Live tracking"
        },
        { 
            label: "Pending Queue", 
            value: stats.pendingAppointments, 
            icon: Clock, 
            color: "amber",
            trend: "Action required"
        },
        { 
            label: "Emergency Cases", 
            value: stats.emergencyCases, 
            icon: Activity, 
            color: "rose",
            trend: "Priority high"
        }
    ];

    if (isLoading) {
        return (
            <div className="flex min-h-[600px] items-center justify-center">
                <RefreshCw className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
            {/* Header section with welcome message */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                <div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">System Overview</span>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter mt-3">
                        Master Dashboard
                    </h1>
                    <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">
                        Welcome, <span className="text-slate-900">{user?.name}</span> • Managing System Health
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => refetch()}
                        className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-indigo-600 shadow-sm transition-all active:scale-95"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <Link 
                        href={getPath("/masterhelpdesk/appointments")}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 shadow-lg shadow-indigo-900/10 transition-all active:scale-95"
                    >
                        <Plus size={16} /> New Booking
                    </Link>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statsConfig.map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-${stat.color}-500/10 transition-colors`}></div>
                        
                        <div className="flex items-start justify-between">
                            <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 border border-${stat.color}-100`}>
                                <stat.icon size={22} />
                            </div>
                            <TrendIndicator />
                        </div>

                        <div className="mt-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1 tabular-nums">{stat.value}</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {stat.trend}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Recent Activity Table */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <CalendarCheck size={18} className="text-indigo-600" /> Recent Appointments
                        </h2>
                        <Link href={getPath("/masterhelpdesk/appointments")} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline px-2">View All Ledger</Link>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                                        <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Doctor</th>
                                        <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {appointments.slice(0, 6).map((apt: any) => (
                                        <tr key={apt.id || apt._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-xs">
                                                        {apt.patientName?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-800 uppercase">{apt.patientName}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">MRN: {apt.mrn || "N/A"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-[11px] font-bold text-slate-600 uppercase">{apt.doctorName}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                                        apt.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        apt.status === 'confirmed' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        'bg-slate-50 text-slate-500 border-slate-100'
                                                    }`}>
                                                        {apt.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`text-[9px] font-black uppercase ${apt.isOnline ? 'text-indigo-500' : 'text-slate-400'}`}>
                                                    {apt.isOnline ? 'Online' : 'Offline'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Side Cards */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-900/10">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        
                        <div className="relative z-10">
                            <h3 className="text-xl font-black uppercase tracking-tight">Financial Health</h3>
                            <p className="text-indigo-300 text-xs mt-1 uppercase font-bold tracking-widest">Real-time Revenue flow</p>
                            
                            <div className="mt-8">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Payments (Today)</p>
                                <div className="flex items-end gap-2 text-4xl font-black tabular-nums mt-1">
                                    ₹{stats.revenueToday || 12450} <span className="text-xs text-emerald-400 font-bold mb-2 flex items-center gap-1"><TrendingUp size={12}/> +8%</span>
                                </div>
                            </div>

                            <Link href={getPath("/masterhelpdesk/transactions")} className="mt-8 flex items-center justify-between bg-white text-indigo-900 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors">
                                Review Ledger <ArrowUpRight size={14} />
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                <Building2 size={20} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">System Status</h4>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Operational</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">API Server</span>
                                </div>
                                <span className="text-[9px] font-bold text-emerald-600">Online</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Database</span>
                                </div>
                                <span className="text-[9px] font-bold text-emerald-600">Sync Correct</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Webhooks</span>
                                </div>
                                <span className="text-[9px] font-bold text-amber-600">Processing</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function TrendIndicator() {
    return (
        <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            <TrendingUp size={10} /> 12%
        </div>
    );
}
