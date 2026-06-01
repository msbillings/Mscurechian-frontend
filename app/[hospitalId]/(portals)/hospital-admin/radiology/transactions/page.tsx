'use client';

import React, { useState } from 'react';
import {
    Search,
    CreditCard,
    TrendingUp,
    IndianRupee,
    RefreshCw,
    FileSpreadsheet,
    Activity
} from "lucide-react";
import { toast } from 'react-hot-toast';

function RadiologyTransactionsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    
    // Mock data since Radiology billing is not yet implemented
    const bills: any[] = []; 
    const loading = false;
    const totalGlobalRevenue = 0;

    const handleExport = async () => {
        toast.error('Radiology module is pending backend integration');
    };

    const fetchBills = () => {
        toast.success('System up to date. Waiting for Radiology backend integration.');
    };

    return (
        <div className="space-y-4 bg-slate-50/50 min-h-screen p-2 sm:p-3 md:p-4">
            {/* Simple Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">Radiology Transactions</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1 italic tracking-tight">Track radiology billing and payments</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="px-5 py-2 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest leading-none">
                        System Verified
                    </div>
                </div>
            </div>

            {/* Simple Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                {[
                    { label: "Page Revenue", value: `₹${Math.round(totalGlobalRevenue).toLocaleString()}`, icon: IndianRupee, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Total Transactions", value: bills.length, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
                    { label: "Average Bill Value", value: `₹0`, icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50" }
                ].map((stat, i) => (
                    <div key={i} className={`bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md ${i === 0 ? 'col-span-2 md:col-span-1' : ''}`}>
                        <div className={`p-2.5 md:p-3 rounded-xl ${stat.bg} ${stat.color} w-fit mb-3 md:mb-4`}>
                            <stat.icon size={18} className="md:w-[20px] md:h-[20px]" strokeWidth={3} />
                        </div>
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-1">{stat.label}</p>
                        <h3 className="text-sm md:text-xl font-black text-slate-900 leading-none break-all md:break-normal">{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Simple Controller */}
            <div className="bg-white p-2 md:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by invoice ID, patient name, or mobile..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto mt-3 md:mt-0">
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/10"
                        />
                        <span className="text-slate-300 font-bold">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/10"
                        />
                    </div>

                    <button
                        onClick={() => fetchBills()}
                        className="p-2.5 bg-white text-slate-400 border border-slate-200 rounded-xl hover:text-slate-900 transition-all font-black"
                    >
                        <RefreshCw size={18} strokeWidth={3} className={loading ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-3 md:px-6 py-2.5 bg-primary-theme text-white rounded-xl text-[10px] font-black uppercase hover:bg-primary-theme/80 transition-all disabled:opacity-50 shadow-sm"
                    >
                        {isExporting ? <RefreshCw size={14} strokeWidth={3} className="animate-spin" /> : <FileSpreadsheet size={14} strokeWidth={3} />}
                        {isExporting ? 'Exporting...' : 'Export Data'}
                    </button>
                </div>
            </div>

            {/* Clean Transactions Registry */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-50 bg-slate-50/30">
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Name</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice ID</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Scans / Details</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Doctor</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            <tr>
                                <td colSpan={8} className="p-20 text-center">
                                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                                        <Activity className="text-blue-500 w-8 h-8" />
                                    </div>
                                    <h3 className="text-sm md:text-lg font-black text-slate-900">Radiology Integration Pending</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 max-w-[280px] mx-auto leading-relaxed">
                                        The Radiology billing module is currently under development. Transactions will appear here once the backend is linked.
                                    </p>
                                </td>
                            </tr>
                        </tbody>
                    </table></div>
                </div>
            </div>
        </div>
    );
}

export default React.memo(RadiologyTransactionsPage);
