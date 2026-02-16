'use client';

import React, { useState, useEffect } from 'react';
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
    Users,
    Calendar,
    Search,
    RefreshCcw
} from 'lucide-react';
import { PharmacyDashboardService, PharmacyDashboardStats } from '@/lib/integrations/services/pharmacyDashboard.service';
import Link from 'next/link';
import ExpiryAlertsModal from '@/components/pharmacy/dashboard/ExpiryAlertsModal';
import toast from 'react-hot-toast';
import StockAlertsCard from '@/components/pharmacy/dashboard/StockAlertsCard';
import LowStockList from '@/components/pharmacy/dashboard/LowStockList';
import { PharmacyDashboardSkeleton } from '@/components/ui/skeletons';

const PharmacyDashboard = () => {
    const [stats, setStats] = useState<PharmacyDashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);
    const [range, setRange] = useState('7days');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    const getMetricDetails = (stat: any, idx: number) => {
        const details = {
            0: {
                title: 'Revenue Audit',
                items: [
                    { label: 'Net Profit', value: formatCurrency((stats?.requestedStats.revenue || 0) * 0.22) },
                    { label: 'Sales Variance', value: '+4.2%' },
                    { label: 'Avg Bill/Hour', value: '₹12,450' },
                    { label: 'Refund rate', value: '0.1%' }
                ],
                insight: 'Revenue is tracking at 100% of the daily target. Evening peak expected at 7 PM.'
            },
            1: {
                title: 'Inventory Node',
                items: [
                    { label: 'Active SKUs', value: stats?.inventoryStats.totalProducts || 0 },
                    { label: 'Dead Stock', value: '0' },
                    { label: 'Shelf Life Avg', value: '180d' },
                    { label: 'New Arrivals', value: '12' }
                ],
                insight: 'Product catalog is healthy. 12 new items added to stock this morning.'
            },
            2: {
                title: 'Stock Alert Grid',
                items: [
                    { label: 'Low Stock', value: stats?.inventoryStats.lowStockCount || 0 },
                    { label: 'Out of Stock', value: stats?.inventoryStats.outOfStockCount || 0 },
                    { label: 'Expiring 30d', value: stats?.inventoryStats.expiringSoonCount || 0 },
                    { label: 'Reorder Queue', value: '12' }
                ],
                insight: 'Urgent: 4 critical items need reordering. Expiry alerts elevated for Q1 stock.'
            },
            3: {
                title: 'Billing Analytics',
                items: [
                    { label: 'Digital Bills', value: '92%' },
                    { label: 'Print Copies', value: stats?.requestedStats.billCount || 0 },
                    { label: 'Errors/Voids', value: '0' },
                    { label: 'Success rate', value: '100%' }
                ],
                insight: 'Billing workstation performance is optimal. UPI is the preferred mode today.'
            }
        };
        return details[idx as keyof typeof details] || details[0];
    };

    const fetchStats = async (targetRange = range) => {
        if (targetRange === 'custom') {
            if (!startDate || !endDate) return;
            if (new Date(startDate) > new Date(endDate)) {
                toast.error('Start date cannot be after end date');
                return;
            }
        }

        setIsLoading(true);
        try {
            const data = await PharmacyDashboardService.getStats(targetRange, startDate, endDate);
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [range, startDate, endDate]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val || 0);
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
                    onClick={() => fetchStats()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 dark:shadow-none"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 pb-20 max-w-[1400px] mx-auto overflow-x-hidden">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase ">Intelligence</h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Pharmacy Operations & Analytics Hub</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {/* Range Selector - Premium Style */}
                    <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        {[
                            { key: 'today', label: 'Today' },
                            { key: '7days', label: '7 Days' },
                            { key: '1month', label: '1 Month' },
                            { key: 'custom', label: 'Custom' },
                        ].map((r) => (
                            <button
                                key={r.key}
                                onClick={() => {
                                    setRange(r.key);
                                    if (r.key !== 'custom') {
                                        setStartDate('');
                                        setEndDate('');
                                    }
                                    // Proactively trigger fetch with the correct NEW range value
                                    fetchStats(r.key);
                                }}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${range === r.key
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
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-black uppercase text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
                            />
                            <div className="w-2 h-px bg-gray-300 dark:bg-gray-700" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-black uppercase text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
                            />
                        </div>
                    )}

                    <div className="h-8 w-px bg-gray-100 dark:bg-gray-800 hidden sm:block mx-1" />

                    <button
                        onClick={() => setIsExpiryModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-black uppercase  hover:bg-red-100 dark:bg-red-950/20 dark:border-red-900/30 transition-all relative"
                    >
                        <AlertTriangle size={14} />
                        Alerts
                        {stats && stats.inventoryStats.expiringSoonCount ? (
                            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white border-2 border-white dark:border-gray-900">
                                {stats.inventoryStats.expiringSoonCount}
                            </span>
                        ) : null}
                    </button>

                    <button
                        onClick={() => fetchStats()}
                        className="p-1.5 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg text-teal-600 transition-colors"
                    >
                        <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <ExpiryAlertsModal
                isOpen={isExpiryModalOpen}
                onClose={() => setIsExpiryModalOpen(false)}
            />

            {/* Top Stats - Clean Metric Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {[
                    { label: "Revenue Cycle", value: formatCurrency(stats?.requestedStats.revenue || 0), sub: `${stats?.requestedStats.billCount || 0} Invoices Dispatched`, icon: DollarSign, color: "teal", detail: "Daily target progress: 92%" },
                    { label: "Active Inventory", value: stats?.inventoryStats.totalProducts.toString() || "0", sub: "Total SKUs registered", icon: Package, color: "teal", detail: "5 new items added today" },
                    { label: "Critical Stock", value: stats?.inventoryStats.lowStockCount.toString() || "0", sub: stats?.inventoryStats.outOfStockCount ? `${stats.inventoryStats.outOfStockCount} Out of Stock` : "Items below safety limit", icon: AlertTriangle, color: "red", detail: "Safety buffer at 15%" },
                    { label: "Bill Registry", value: stats?.requestedStats.billCount.toString() || "0", sub: "Successfully generated", icon: FileText, color: "teal", detail: "Avg. processing: 3.2m" },
                ].map((stat, idx) => {
                    const Icon = stat.icon;
                    const details = getMetricDetails(stat, idx);
                    return (
                        <div 
                            key={idx} 
                            className="relative group h-full"
                            onMouseEnter={() => setHoveredCard(idx)}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div className="h-full bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-black text-gray-400 uppercase  mb-1">{stat.label}</p>
                                        <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{stat.value}</h3>
                                    </div>
                                    <div className={`p-2.5 rounded-xl bg-${stat.color}-50 dark:bg-${stat.color}-950/20 text-${stat.color}-600`}>
                                        <Icon size={18} />
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between">
                                    <span className="text-[8px] font-bold text-gray-400 uppercase ">{stat.sub}</span>
                                    <span className={`text-[8px] font-black text-${stat.color}-600 bg-${stat.color}-50 dark:bg-${stat.color}-950/20 px-2 py-0.5 rounded uppercase`}>{stat.detail.split(':')[0]}</span>
                                </div>
                            </div>

                            {/* Popup Detail Card */}
                            {hoveredCard === idx && (
                                <div className="absolute top-full left-0 right-0 z-50 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="bg-white/98 dark:bg-gray-900/98 rounded-xl border border-teal-500 shadow-2xl p-5 backdrop-blur-md">
                                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                                            <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase">{details.title}</h4>
                                            <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            {details.items.map((item: any, i: number) => (
                                                <div key={i} className="bg-gray-50/50 dark:bg-gray-800/50 p-2.5 rounded-lg border border-gray-100/50 dark:border-gray-700/50">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{item.label}</p>
                                                    <p className="text-xs font-black text-gray-900 dark:text-white">{item.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-teal-50/50 dark:bg-teal-950/20 p-3 rounded-lg border border-teal-100/50 dark:border-teal-900/30">
                                            <p className="text-xs font-bold text-teal-700 dark:text-teal-300 leading-relaxed">💡 {details.insight}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions - Modern Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { title: "Point of Sale", desc: "Generate Digital Invoice", icon: PlusCircle, href: "/pharmacy/billing", label: "NEW BILL" },
                    { title: "Inventory hub", desc: "Manage Product Catalog", icon: Package, href: "/pharmacy/products", label: "CATALOG" },
                    { title: "Sales audit", desc: "Transaction & History", icon: TrendingUp, href: "/pharmacy/transactions", label: "LOGS" },
                ].map((action, i) => (
                    <Link key={i} href={action.href} className="group">
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:border-teal-500 hover:shadow-md transition-all flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <action.icon size={22} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{action.title}</h4>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase ">{action.desc}</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-1 rounded-lg text-[10px] font-black text-gray-400 uppercase group-hover:bg-teal-600 group-hover:text-white transition-all">
                                {action.label}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Alerts & Low Stock Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-1 h-full">
                    <StockAlertsCard
                        lowStockCount={stats?.inventoryStats.lowStockCount || 0}
                        expiringSoonCount={stats?.inventoryStats.expiringSoonCount || 0}
                        onViewAlerts={() => setIsExpiryModalOpen(true)}
                    />
                </div>
                <div className="xl:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm h-full overflow-hidden">
                        <div className="p-4 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between bg-gray-50/30 dark:bg-gray-800/20">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={14} className="text-red-500 animate-pulse" />
                                <span className="text-xs font-black text-gray-400 uppercase ">Urgent: Low stock registry</span>
                            </div>
                             <Link href="/pharmacy/products">
                                <span className="text-[10px] font-black text-teal-600 hover:underline cursor-pointer uppercase ">Go to Inventory</span>
                             </Link>
                        </div>
                        <div className="p-2">
                            <LowStockList />
                        </div>
                    </div>
                </div>
            </div>

            {/* Insight Grid: Operational Highlights & Top Products */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                {/* Revenue & Payments Node (Left 3 cols) */}
                <div className="xl:col-span-3 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                        {/* Revenue Node Summary */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-all">
                            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-gray-50/20 dark:bg-gray-800/10">
                                <FileText size={18} className="text-teal-600" />
                                <h4 className="text-sm font-black uppercase text-gray-900 dark:text-white">Revenue Node Summary</h4>
                            </div>
                            <div className="p-6 flex-1 space-y-5">
                                {[
                                    { label: "Cycle Revenue", value: formatCurrency(stats?.requestedStats.revenue || 0), progress: 100 },
                                    { label: "Cycle Invoices", value: stats?.requestedStats.billCount.toString() || "0", progress: 85 },
                                    { label: "Items Dispatched", value: stats?.requestedStats.itemsSold.toString() || "0", progress: 78 },
                                    { label: "Cycle Avg Trans", value: formatCurrency(stats?.requestedStats.avgBillValue || 0), progress: 92 },
                                ].map((item, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-bold text-gray-400 uppercase ">{item.label}</span>
                                            <span className="text-sm font-black text-gray-900 dark:text-white tracking-tight">{item.value}</span>
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
                                <p className="text-[10px] font-black text-teal-600 uppercase ">💡 Peak volume expected in 2 hours</p>
                            </div>
                        </div>

                        {/* Payment Method Network */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-all">
                            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-gray-50/20 dark:bg-gray-800/10">
                                <Wallet size={18} className="text-teal-600" />
                                <h4 className="text-sm font-black uppercase  text-gray-900 dark:text-white">Channel Distribution</h4>
                            </div>
                            <div className="p-6 flex-1 grid grid-cols-2 gap-4">
                                {[
                                    { label: "Cash Flow", value: stats?.paymentBreakdown.Cash || 0, icon: DollarSign, color: "teal" },
                                    { label: "UPI Digital", value: stats?.paymentBreakdown.UPI || 0, icon: Wallet, color: "teal" },
                                    { label: "Card Swipes", value: stats?.paymentBreakdown.Card || 0, icon: FileText, color: "teal" },
                                    { label: "Credit Line", value: stats?.paymentBreakdown.Credit || 0, icon: Users, color: "orange" },
                                ].map((p, i) => (
                                    <div key={i} className={`p-4 rounded-2xl border ${p.color === 'teal' ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-teal-500' : 'bg-orange-50/30 dark:bg-orange-950/20 border-orange-100/30 dark:border-orange-900/30'} transition-all group`}>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase  mb-2 group-hover:text-teal-600 transition-colors">{p.label}</p>
                                        <p className="text-base font-black text-gray-900 dark:text-white">{formatCurrency(p.value)}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="m-6 mt-0 p-4 rounded-2xl bg-teal-600 text-white flex justify-between items-center shadow-lg shadow-teal-500/20">
                                <div>
                                    <p className="text-[10px] font-black uppercase  opacity-80">Mixed Revenue</p>
                                    <p className="text-lg font-black">{formatCurrency(stats?.paymentBreakdown.Mixed || 0)}</p>
                                </div>
                                <RefreshCcw size={20} className="opacity-40" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Selling Products (Right 2 cols) */}
                <div className="xl:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm h-full flex flex-col overflow-hidden hover:shadow-md transition-all">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/20 dark:bg-gray-800/10">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-xl">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase  text-gray-900 dark:text-white">Top Dispatched SKUs</h4>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase ">High performance items</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 flex-1">
                            {stats.topProducts && stats.topProducts.length > 0 ? (
                                <div className="space-y-2">
                                    {stats.topProducts.map((product, i) => (
                                        <div key={i} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-2xl transition-all flex items-center justify-between group border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 group-hover:bg-teal-600 transition-all">
                                                    <span className="text-sm font-black text-gray-400 group-hover:text-white">{i + 1}</span>
                                                </div>
                                                <div className="max-w-[140px]">
                                                    <p className="text-[10px] font-black text-gray-700 dark:text-gray-200 uppercase truncate mb-0.5">{product.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase ">{product.quantity} Units</span>
                                                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                        <span className="text-[8px] font-black text-teal-600 uppercase">Top Seller</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-base font-black text-gray-900 dark:text-white">{formatCurrency(product.revenue)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center py-20 text-gray-300 dark:text-gray-600 opacity-50">
                                    <Search size={40} strokeWidth={1.5} className="mb-4" />
                                    <p className="text-sm font-black uppercase tracking-[0.3em]">No registry data found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Invoices - Professional Audit Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-all">
                <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between bg-gray-50/30 dark:bg-gray-800/20">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-xl">
                            <RefreshCcw size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Recent Trade Registry</h4>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Real-time node synchronization active</p>
                        </div>
                    </div>
                    <Link href="/pharmacy/transactions" className="group flex items-center gap-2 px-5 py-2.5 bg-teal-600 dark:bg-white rounded-xl text-xs font-black uppercase tracking-widest text-white dark:text-gray-900 hover:scale-105 transition-all">
                        Audit All Transactions
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Invoice ID</th>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Chronology</th>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Node Operator</th>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Resolution</th>
                                <th className="px-8 py-5 text-right text-xs font-black uppercase tracking-widest text-gray-400">Final Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {stats.recentInvoices?.length > 0 ? (
                                stats.recentInvoices.map((inv) => (
                                    <tr key={inv._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-all group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight">{inv.invoiceNumber}</span>
                                                    <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">ID: {inv._id.slice(-8)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">
                                                    {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                </span>
                                                <span className="text-[12px] font-bold text-gray-400">
                                                    {new Date(inv.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-2xl bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center border border-teal-100 dark:border-teal-800">
                                                    <span className="text-[12px] font-black text-teal-600">{inv.createdBy?.name?.charAt(0) || 'S'}</span>
                                                </div>
                                                <span className="text-[12px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tight">{inv.createdBy?.name || 'In-House'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1.5 rounded-xl text-[12px] font-black uppercase tracking-widest border ${
                                                inv.status === 'PAID' 
                                                ? 'bg-teal-50 text-teal-600 border-teal-100/50 dark:bg-teal-900/20 dark:text-teal-400' 
                                                : 'bg-orange-50 text-orange-600 border-orange-100/50 dark:bg-orange-950/20'
                                            }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-[12px] font-black text-gray-900 dark:text-white group-hover:text-teal-600 transition-colors">
                                                {formatCurrency(inv.netPayable)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-30">
                                            <RefreshCcw size={40} className="text-gray-400" />
                                            <p className="text-[12px] font-black uppercase tracking-[0.4em]">Audit Registry Empty</p>
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
