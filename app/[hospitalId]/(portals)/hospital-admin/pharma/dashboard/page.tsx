'use client';

import React, {  useState , useMemo } from 'react';
import {
    DollarSign,
    Package,
    AlertTriangle,
    FileText,
    ChevronRight,
    Loader2,
    PlusCircle,
    TrendingUp,
    Wallet,
    Users
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PharmacyDashboardService, PharmacyDashboardStats } from '@/lib/integrations/services/pharmacyDashboard.service';
import Link from 'next/link';
import ExpiryAlertsModal from '@/components/pharmacy/dashboard/ExpiryAlertsModal';

const PharmacyDashboard = () => {
    const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);

    // ✅ CRITICAL FIX: Use React Query instead of useState + useEffect
    const { data: stats, isLoading, error } = useQuery<any>({
        queryKey: ['hospital-admin-pharma-dashboard'],
        queryFn: async () => {
            try {
                const data = await PharmacyDashboardService.getStats();
                return data;
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
                throw error;
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes - dashboard cached longer
        gcTime: 15 * 60 * 1000, // Keep in cache for 15 min
        retry: 1,
    });

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    if (isLoading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest animate-pulse">Synchronizing Pharma Nodes...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-2 md:p-4 md:p-8 text-center bg-gray-50 dark:bg-gray-900/50 rounded-4xl border border-dashed border-gray-200 dark:border-gray-800">
                <div className="p-5 bg-red-50 text-red-600 rounded-3xl">
                    <AlertTriangle size={40} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Access Protocol Failure</h3>
                    <p className="text-sm font-bold text-gray-500 mt-2 max-w-md">
                        We couldn't establish a secure handshake with the pharmacy registry. 
                        Please ensure a pharmacy profile is correctly mapped to this hospital.
                    </p>
                </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-2 md:px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="p-2 sm:p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 bg-slate-50/50 min-h-screen">
            {/* Simple Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Pharmaceutical Intelligence</h1>
                    <p className="text-xs md:text-sm text-slate-500 font-medium mt-1 italic tracking-tight">Institutional Pharmacy Operations & Inventory Integrity</p>
                </div>
                <button
                    onClick={() => setIsExpiryModalOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 md:px-6 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all"
                >
                    <AlertTriangle size={16} strokeWidth={3} /> Expiry Watchlist
                    {stats?.inventoryStats.expiringSoonCount ? (
                        <span className="ml-2 flex h-4 w-4 items-center justify-center rounded bg-rose-600 text-[8px] font-black text-white">
                            {stats.inventoryStats.expiringSoonCount}
                        </span>
                    ) : null}
                </button>
            </div>

            <ExpiryAlertsModal
                isOpen={isExpiryModalOpen}
                onClose={() => setIsExpiryModalOpen(false)}
            />

            {/* Simple Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {[
                    { label: "Cycle Revenue", value: formatCurrency(stats?.todayStats.revenue || 0), sub: `${stats?.todayStats.billCount || 0} Invoices`, icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Stock Registry", value: stats?.inventoryStats.totalProducts.toString() || "0", sub: "Active SKU Units", icon: Package, color: "text-indigo-600", bg: "bg-indigo-50" },
                    { label: "Critical Stock", value: stats?.inventoryStats.lowStockCount.toString() || "0", sub: stats?.inventoryStats.outOfStockCount ? `${stats.inventoryStats.outOfStockCount} Depleted` : "Status Stable", icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50" },
                    { label: "Session Volume", value: stats?.todayStats.billCount.toString() || "0", sub: "Dispatched Assets", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-3 md:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} w-fit mb-4`}>
                            <stat.icon size={20} strokeWidth={3} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <h3 className="text-2xl font-black text-slate-900 leading-none">{stat.value}</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Primary Action Gateways */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/hospital-admin/pharma/billing">
                    <button className="w-full flex items-center justify-between p-2 md:p-4 md:p-8 rounded-2xl md:rounded-3xl bg-white text-slate-900 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                            <PlusCircle size={120} />
                        </div>
                        <div className="relative z-10 flex items-center gap-3 md:gap-5">
                            <div className="p-3 md:p-4 rounded-2xl bg-slate-50 text-slate-900 hover:bg-primary-theme hover:text-white transition-all">
                                <PlusCircle size={20} className="md:w-6 md:h-6" />
                            </div>
                            <div className="text-left font-black">
                                <h4 className="text-xs md:text-sm font-bold uppercase ">Point of Sale</h4>
                                <p className="text-[8px] md:text-[9px] opacity-60 uppercase tracking-widest mt-1">Digital Billing Terminal</p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 opacity-30 group-hover:opacity-100 group-hover:translate-x-2 transition-all relative z-10" />
                    </button>
                </Link>

                <Link href="/hospital-admin/pharma/products">
                    <button className="w-full flex items-center justify-between p-2 md:p-4 md:p-8 rounded-3xl bg-white border border-slate-200 text-slate-900 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-5">
                            <div className="p-2 md:p-4 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <Package size={24} />
                            </div>
                            <div className="text-left font-black">
                                <h4 className="text-sm uppercase font-bold ">Inventory hub</h4>
                                <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Global SKU Management</p>
                            </div>
                        </div>
                        <ChevronRight className="text-slate-200 group-hover:text-slate-900 group-hover:translate-x-2 transition-all" />
                    </button>
                </Link>

                <Link href="/hospital-admin/pharma/transactions">
                    <button className="w-full flex items-center justify-between p-2 md:p-4 md:p-8 rounded-3xl bg-white border border-slate-200 text-slate-900 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-5">
                            <div className="p-2 md:p-4 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <TrendingUp size={24} />
                            </div>
                            <div className="text-left font-black">
                                <h4 className="text-sm uppercase font-bold">Audit Archive</h4>
                                <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Revenue Stream Analysis</p>
                            </div>
                        </div>
                        <ChevronRight className="text-slate-200 group-hover:text-slate-900 group-hover:translate-x-2 transition-all" />
                    </button>
                </Link>
            </div>

            {/* Detailed Intelligence */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-2 md:p-6 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded-xl text-slate-400">
                                <FileText size={18} />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Session Digest</h4>
                        </div>
                    </div>
                    <div className="p-3 md:p-8 space-y-4">
                        {[
                            { label: "Gross Assets", value: formatCurrency(stats?.todayStats.revenue || 0), desc: "Current cycle valuation" },
                            { label: "Dispatch Frequency", value: stats?.todayStats.billCount.toString() || "0", desc: "Settled invoices" },
                            { label: "Quantum Density", value: formatCurrency(stats?.todayStats.avgBillValue || 0), desc: "Average bill valuation" },
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 md:p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                                <div>
                                    <p className="text-xs font-thin text-slate-900 uppercase tracking-tight leading-none">{item.label}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{item.desc}</p>
                                </div>
                                <span className="text-sm md:text-lg font-black text-slate-900 italic">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-2 md:p-6 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded-xl text-slate-400">
                                <Wallet size={18} />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Settlement Gateway</h4>
                        </div>
                    </div>
                    <div className="p-2 md:p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { label: "Physical Cash", value: formatCurrency(stats?.paymentBreakdown.Cash || 0), color: "bg-emerald-500" },
                            { label: "Digital Card", value: formatCurrency(stats?.paymentBreakdown.Card || 0), color: "bg-blue-500" },
                            { label: "Unified UPI", value: formatCurrency(stats?.paymentBreakdown.UPI || 0), color: "bg-indigo-500" },
                            { label: "Institutional", value: formatCurrency(stats?.paymentBreakdown.Credit || 0), color: "bg-rose-500" },
                        ].map((method, idx) => (
                            <div key={idx} className="p-2 md:p-4 md:p-5 rounded-2xl bg-slate-50/50 border border-slate-100 relative group">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${method.color} rounded-l-2xl`} />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{method.label}</p>
                                <p className="text-xs md:text-base md:text-lg font-black text-slate-900 italic leading-none">{method.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PharmacyDashboard;
