'use client';

import React, { useState } from 'react';
import {
    IndianRupee,
    Package,
    AlertTriangle,
    FileText,
    ChevronRight,
    PlusCircle,
    TrendingUp,
    Wallet,
    Activity,
    Search,
    RefreshCcw
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PharmacyDashboardService, PharmacyDashboardStats } from '@/lib/integrations/services/pharmacyDashboard.service';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ExpiryAlertsModal from '@/components/pharmacy/dashboard/ExpiryAlertsModal';
import toast from 'react-hot-toast';
import StockAlertsCard from '@/components/pharmacy/dashboard/StockAlertsCard';
import LowStockList from '@/components/pharmacy/dashboard/LowStockList';
import { PharmacyDashboardSkeleton } from '@/components/ui/skeletons';

const PharmacyDashboard = () => {
    const { hospitalId } = useParams();
    const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);
    const [range, setRange] = useState('7days');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    const { data: stats, isLoading, refetch } = useQuery<any>({
        queryKey: ['hospital-admin-pharma-dashboard', range, startDate, endDate],
        queryFn: async () => {
            try {
                const data = await PharmacyDashboardService.getStats(range, startDate, endDate);
                return data;
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
                throw error;
            }
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        retry: 1,
    });

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    const getMetricDetails = (stat: any, idx: number) => {
        const details = {
            0: {
                title: 'Sales Details',
                items: [
                    { label: 'Net Profit', value: formatCurrency((stats?.requestedStats.revenue || 0) * 0.22) },
                    { label: 'Sales Change', value: '+4.2%' },
                    { label: 'Avg Bill/Hour', value: '₹12,450' },
                    { label: 'Refund Rate', value: '0.1%' }
                ],
                insight: 'Sales are on track for the daily target. High sales expected in the evening.'
            },
            1: {
                title: 'Medicine Stock',
                items: [
                    { label: 'Total Medicines', value: stats?.inventoryStats.totalProducts || 0 },
                    { label: 'Unused Stock', value: '0' },
                    { label: 'Avg Shelf Life', value: '180d' },
                    { label: 'New Medicines', value: '12' }
                ],
                insight: 'Medicine stock is healthy. 12 new medicines added this morning.'
            },
            2: {
                title: 'Stock Alerts',
                items: [
                    { label: 'Low Stock', value: stats?.inventoryStats.lowStockCount || 0 },
                    { label: 'Out of Stock', value: stats?.inventoryStats.outOfStockCount || 0 },
                    { label: 'Expiring in 30d', value: stats?.inventoryStats.expiringSoonCount || 0 },
                    { label: 'Need Reorder', value: '12' }
                ],
                insight: '4 medicines need urgent reordering. Check expiry dates for old stock.'
            },
            3: {
                title: 'Billing Details',
                items: [
                    { label: 'Digital Bills', value: '92%' },
                    { label: 'Total Bills', value: stats?.requestedStats.billCount || 0 },
                    { label: 'Errors/Voids', value: '0' },
                    { label: 'Success Rate', value: '100%' }
                ],
                insight: 'Billing is running smoothly. UPI is the most used payment method today.'
            }
        };
        return details[idx as keyof typeof details] || details[0];
    };

    if (isLoading && !stats) {
        return <PharmacyDashboardSkeleton />;
    }

    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-full text-red-600">
                    <AlertTriangle size={40} />
                </div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">System Offline</h2>
                <p className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest">Unable to establish connection with the analytics node</p>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 dark:shadow-none"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-8 pb-20 max-w-[1400px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1 md:px-2 mt-4 md:mt-0">
                <div>
                    <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Pharmacy Dashboard</h1>
                    <p className="text-[7px] sm:text-[10px] font-medium text-slate-500 dark:text-gray-400 uppercase tracking-widest mt-1">Overview of pharmacy sales and stock</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Range Selector */}
                    <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1.5 md:p-1 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-x-auto no-scrollbar">
                        {[
                            { key: 'today', label: 'Today' },
                            { key: '7days', label: '7D' },
                            { key: '1month', label: '30D' },
                            { key: 'custom', label: 'Custom' },
                        ].map((r) => (
                            <button
                                key={`range-${r.key}`}
                                onClick={() => {
                                    setRange(r.key);
                                    if (r.key !== 'custom') {
                                        setStartDate('');
                                        setEndDate('');
                                    }
                                }}
                                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${range === r.key
                                    ? 'bg-teal-600 text-white shadow-sm scale-105'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                    }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {range === 'custom' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                            <input
                                type="date"
                                title="Start Date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-2 md:px-3 py-2 text-[10px] md:text-xs font-black uppercase text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm w-full sm:w-auto"
                            />
                            <div className="w-2 h-px bg-gray-300 dark:bg-gray-700 shrink-0" />
                            <input
                                type="date"
                                title="End Date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-2 md:px-3 py-2 text-[10px] md:text-xs font-black uppercase text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm w-full sm:w-auto"
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                        <button
                            onClick={() => setIsExpiryModalOpen(true)}
                            className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] md:text-xs font-black uppercase hover:bg-red-100 dark:bg-red-950/20 dark:border-red-900/30 transition-all relative shadow-sm"
                        >
                            <AlertTriangle size={14} />
                            Alerts
                            {stats && stats.inventoryStats.expiringSoonCount ? (
                                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white border-2 border-white dark:border-gray-900">
                                    {stats.inventoryStats.expiringSoonCount}
                                </span>
                            ) : null}
                        </button>

                        <button
                            onClick={() => refetch()}
                            title="Refresh Dashboard"
                            className="p-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-teal-600 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <ExpiryAlertsModal
                isOpen={isExpiryModalOpen}
                onClose={() => setIsExpiryModalOpen(false)}
            />

            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                {[
                    { label: "Total Sales", value: formatCurrency(stats?.requestedStats.revenue || 0), sub: `${stats?.requestedStats.billCount || 0} Bills Generated`, icon: IndianRupee, color: "teal", detail: "Daily Target: 92%" },
                    { label: "Available Medicines", value: stats?.inventoryStats.totalProducts.toString() || "0", sub: "Total Medicines", icon: Package, color: "teal", detail: "New Medicines Added" },
                    { label: "Low Stock Items", value: stats?.inventoryStats.lowStockCount.toString() || "0", sub: stats?.inventoryStats.outOfStockCount ? `${stats.inventoryStats.outOfStockCount} Out of Stock` : "Stock levels normal", icon: AlertTriangle, color: "red", detail: "Needs reorder" },
                    { label: "Total Bills", value: stats?.requestedStats.billCount.toString() || "0", sub: "Bills Generated", icon: FileText, color: "teal", detail: "Processed today" },
                ].map((stat, idx) => {
                    const Icon = stat.icon;
                    const details = getMetricDetails(stat, idx);
                    return (
                        <div
                            key={`stat-card-${idx}`}
                            className="relative group h-full"
                            onMouseEnter={() => setHoveredCard(idx)}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div className="h-full bg-white dark:bg-gray-800 p-5 md:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="min-w-0">
                                        <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase mb-1 truncate">{stat.label}</p>
                                        <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate">{stat.value}</h3>
                                    </div>
                                    <div className={`p-2.5 rounded-xl shrink-0 ${stat.color === 'red' ? 'bg-red-50 text-red-600 dark:bg-red-950/20' : 'bg-teal-50 text-teal-600 dark:bg-teal-950/20'}`}>
                                        <Icon size={18} className="md:size-5" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700/50">
                                    <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase truncate mr-2">{stat.sub}</span>
                                    <span className={`text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded uppercase shrink-0 ${stat.color === 'red' ? 'text-red-600 bg-red-50 dark:bg-red-950/20' : 'text-teal-600 bg-teal-50 dark:bg-teal-950/20'}`}>
                                        {stat.detail}
                                    </span>
                                </div>
                            </div>

                            {hoveredCard === idx && (
                                <div className="absolute top-full left-0 right-0 z-50 pt-2 animate-in fade-in slide-in-from-top-2 duration-200 hidden md:block">
                                    <div className="bg-white/98 dark:bg-gray-900/98 rounded-xl border border-teal-500 shadow-2xl p-5 backdrop-blur-md">
                                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                                            <h4 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">{details.title}</h4>
                                            <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            {details.items.map((item: any, i: number) => (
                                                <div key={`detail-item-${i}`} className="bg-gray-50/50 dark:bg-gray-800/50 p-2.5 rounded-lg border border-gray-100/50 dark:border-gray-700/50">
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">{item.label}</p>
                                                    <p className="text-[11px] font-black text-gray-900 dark:text-white">{item.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-teal-50/50 dark:bg-teal-950/20 p-3 rounded-lg border border-teal-100/50 dark:border-teal-900/30">
                                            <p className="text-[10px] font-bold text-teal-700 dark:text-teal-300 leading-relaxed uppercase tracking-tighter">💡 {details.insight}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {[
                    { title: "Billing", desc: "Create Bill", icon: PlusCircle, href: `/${hospitalId}/hospital-admin/pharma/billing`, label: "NEW BILL" },
                    { title: "Medicine Inventory", desc: "Manage Medicines", icon: Package, href: `/${hospitalId}/hospital-admin/pharma/products`, label: "MEDICINES" },
                    { title: "Sales History", desc: "View Transactions", icon: TrendingUp, href: `/${hospitalId}/hospital-admin/pharma/transactions`, label: "HISTORY" },
                ].map((action, i) => (
                    <Link key={`quick-action-${i}`} href={action.href} className="group">
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:border-teal-500 hover:shadow-md transition-all flex items-center justify-between">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="p-3 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-xl group-hover:scale-110 transition-transform shrink-0">
                                    <action.icon size={20} className="md:size-[22px]" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">{action.title}</h4>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase truncate">{action.desc}</p>
                                </div>
                            </div>
                            <div className="shrink-0 bg-gray-50 dark:bg-gray-700/50 px-3 py-1 rounded-lg text-[10px] font-black text-gray-400 uppercase group-hover:bg-teal-600 group-hover:text-white transition-all">
                                {action.label}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Alerts & Low Stock Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="h-full">
                    <StockAlertsCard
                        lowStockCount={stats?.inventoryStats.lowStockCount || 0}
                        expiringSoonCount={stats?.inventoryStats.expiringSoonCount || 0}
                        onViewAlerts={() => setIsExpiryModalOpen(true)}
                    />
                </div>
                <div className="xl:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm h-full overflow-hidden">
                        <div className="p-4 md:px-6 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between bg-gray-50/30 dark:bg-gray-800/20">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={14} className="text-red-500 animate-pulse" />
                                <span className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">Urgent Low Stock</span>
                            </div>
                            <Link href={`/${hospitalId}/hospital-admin/pharma/products`}>
                                <span className="text-[10px] font-black text-teal-600 hover:underline cursor-pointer uppercase tracking-widest">View Medicines</span>
                            </Link>
                        </div>
                        <div className="p-2 overflow-x-auto no-scrollbar">
                            <LowStockList />
                        </div>
                    </div>
                </div>
            </div>

            {/* Insight Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div className="xl:col-span-3 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                        {/* Revenue Node Summary */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-all">
                            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-gray-50/20 dark:bg-gray-800/10">
                                <FileText size={18} className="text-teal-600" />
                                <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Sales Summary</h4>
                            </div>
                            <div className="p-6 flex-1 space-y-5">
                                {[
                                    { label: "Total Sales", value: formatCurrency(stats?.requestedStats.revenue || 0), progress: 100 },
                                    { label: "Total Bills", value: stats?.requestedStats.billCount.toString() || "0", progress: 85 },
                                    { label: "Items Sold", value: stats?.requestedStats.itemsSold.toString() || "0", progress: 78 },
                                    { label: "Average Bill Value", value: formatCurrency(stats?.requestedStats.avgBillValue || 0), progress: 92 },
                                ].map((item, idx) => (
                                    <div key={`revenue-stat-${idx}`} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{item.label}</span>
                                            <span className="text-xs md:text-sm font-black text-gray-900 dark:text-white tracking-tight">{item.value}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-teal-500 rounded-full transition-all duration-1000"
                                                style={{ width: `${item.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="px-6 py-4 bg-teal-50/20 dark:bg-teal-900/10 border-t border-gray-50 dark:border-gray-700">
                                <p className="text-[9px] md:text-[10px] font-black text-teal-600 uppercase tracking-widest">💡 High sales expected soon</p>
                            </div>
                        </div>

                        {/* Payment Method Network */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-all">
                            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-gray-50/20 dark:bg-gray-800/10">
                                <Wallet size={18} className="text-teal-600" />
                                <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Payment Summary</h4>
                            </div>
                            <div className="p-5 md:p-6 flex-1 grid grid-cols-2 gap-3 md:gap-4">
                                {[
                                    { label: "Cash Payments", value: stats?.paymentBreakdown.Cash || 0, color: "teal" },
                                    { label: "UPI Payments", value: stats?.paymentBreakdown.UPI || 0, color: "teal" },
                                    { label: "Card Payments", value: stats?.paymentBreakdown.Card || 0, color: "teal" },
                                    { label: "Credit Payments", value: stats?.paymentBreakdown.Credit || 0, color: "orange" },
                                ].map((p, i) => (
                                    <div key={`payment-mode-${i}`} className={`p-3 md:p-4 rounded-2xl border ${p.color === 'teal' ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-teal-500' : 'bg-orange-50/30 dark:bg-orange-950/20 border-orange-100/30 dark:border-orange-900/30'} transition-all group`}>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-2 group-hover:text-teal-600 transition-colors truncate">{p.label}</p>
                                        <p className="text-sm md:text-base font-black text-gray-900 dark:text-white truncate">{formatCurrency(p.value)}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="m-5 md:m-6 mt-0 p-4 rounded-2xl bg-teal-600 text-white flex justify-between items-center shadow-lg shadow-teal-500/20">
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black uppercase opacity-80 tracking-widest">Total Revenue</p>
                                    <p className="text-base md:text-lg font-black truncate">{formatCurrency(stats?.paymentBreakdown.Mixed || 0)}</p>
                                </div>
                                <RefreshCcw size={18} className="opacity-40 shrink-0 ml-2" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Selling Products */}
                <div className="xl:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm h-full flex flex-col overflow-hidden hover:shadow-md transition-all">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/20 dark:bg-gray-800/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-xl">
                                    <TrendingUp size={18} />
                                </div>
                                <div>
                                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Top Selling Medicines</h4>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5 tracking-tight">Best Selling Items</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-2 md:p-4 flex-1">
                            {stats.topProducts && stats.topProducts.length > 0 ? (
                                <div className="space-y-1 md:space-y-2">
                                    {stats.topProducts.map((product: any, i: number) => (
                                        <div key={`top-product-${product.name}-${i}`} className="p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-2xl transition-all flex items-center justify-between group border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                                            <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 group-hover:bg-teal-600 transition-all shrink-0">
                                                    <span className="text-[10px] md:text-xs font-black text-gray-400 group-hover:text-white">{i + 1}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] md:text-xs font-black text-gray-700 dark:text-gray-200 uppercase truncate mb-0.5">{product.name}</p>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase whitespace-nowrap">{product.quantity} Units Sold</span>
                                                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                        <span className="text-[8px] md:text-[9px] font-black text-teal-600 uppercase whitespace-nowrap">Peak Sales</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right ml-2 shrink-0">
                                                <p className="text-[11px] md:text-sm font-black text-gray-900 dark:text-white font-mono tracking-tighter">{formatCurrency(product.revenue)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center py-20 text-gray-300 dark:text-gray-600 opacity-50">
                                    <Search size={40} strokeWidth={1.5} className="mb-4" />
                                    <p className="text-xs font-black uppercase tracking-[0.3em]">No registry data</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Invoices Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-all">
                <div className="p-4 md:p-6 border-b border-gray-50 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/30 dark:bg-gray-800/20">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2 md:p-2.5 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-xl">
                            <Activity size={18} />
                        </div>
                        <div>
                            <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Recent Transactions</h4>
                            <p className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Live transactions</p>
                        </div>
                    </div>
                    <Link href={`/${hospitalId}/hospital-admin/pharma/transactions`} className="group flex items-center justify-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-teal-600 dark:bg-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest text-white dark:text-gray-900 hover:scale-105 transition-all shadow-md">
                        View All Transactions
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400">Invoice ID</th>
                                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400">Date & Time</th>
                                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400">Staff</th>
                                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400">Status</th>
                                <th className="px-6 md:px-8 py-4 md:py-5 text-right text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {stats.recentInvoices?.length > 0 ? (
                                stats.recentInvoices.map((inv: any) => (
                                    <tr key={inv._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-all group">
                                        <td className="px-6 md:px-8 py-4 md:py-5">
                                            <div className="flex items-center gap-2 md:gap-3">
                                                <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse shrink-0" />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[11px] md:text-[12px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight truncate">{inv.invoiceNumber}</span>
                                                    <span className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest font-mono">#{inv._id.slice(-6)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 md:px-8 py-4 md:py-5 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] md:text-[12px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">
                                                    {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                                <span className="text-[10px] md:text-[11px] font-bold text-gray-400">
                                                    {new Date(inv.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 md:px-8 py-4 md:py-5">
                                            <div className="flex items-center gap-2 md:gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center border border-teal-100 dark:border-teal-800 shrink-0">
                                                    <span className="text-[11px] font-black text-teal-600">{inv.createdBy?.name?.charAt(0) || 'S'}</span>
                                                </div>
                                                <span className="text-[11px] md:text-[12px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tight truncate max-w-[120px]">{inv.createdBy?.name || 'Pharmacist'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 md:px-8 py-4 md:py-5">
                                            <span className={`px-2 md:px-3 py-1 md:py-1.5 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest border shadow-sm ${inv.status === 'PAID'
                                                ? 'bg-teal-50 text-teal-600 border-teal-100/50 dark:bg-teal-900/20 dark:text-teal-400'
                                                : 'bg-orange-50 text-orange-600 border-orange-100/50 dark:bg-orange-950/20'
                                                }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-6 md:px-8 py-4 md:py-5 text-right">
                                            <span className="text-[11px] md:text-sm font-black text-gray-900 dark:text-white group-hover:text-teal-600 transition-colors font-mono">
                                                {formatCurrency(inv.netPayable)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 md:px-8 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-30">
                                            <RefreshCcw size={40} className="text-gray-400" />
                                            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em]">No Transactions Found</p>
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
};

export default PharmacyDashboard;


