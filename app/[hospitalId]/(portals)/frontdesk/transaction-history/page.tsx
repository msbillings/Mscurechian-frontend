"use client";

import React, { useState, useEffect } from 'react';
import { FileText, Search, ArrowLeft, ExternalLink, Calendar } from 'lucide-react';
import { helpdeskService } from '@/lib/integrations/services/helpdesk.service';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';

export default function TransactionHistoryPage() {
    const router = useRouter();
    const params = useParams();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const data = await helpdeskService.getAllTransactionReports();
            setReports(data);
        } catch (error) {
            console.error("Failed to fetch reports:", error);
            toast.error("Failed to load transaction history");
        } finally {
            setLoading(false);
        }
    };

    const filteredReports = reports.filter(r => {
        const name = r.patient?.name || "";
        const mobile = r.patient?.mobile || "";
        const mrn = r.patient?.profile?.mrn || "";
        
        return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               mobile.includes(searchTerm) ||
               mrn.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const fmt = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-16 animate-in fade-in duration-500">
            {/* Minimal Header with Back Button */}
            <div className="flex items-center justify-between mb-4">
                <button 
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-colors"
                >
                    <ArrowLeft size={14} /> Back to Reports
                </button>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
                    <input 
                        type="text"
                        placeholder="Search patient..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-6 py-2 bg-white border border-slate-200 rounded-xl w-[300px] text-xs font-bold placeholder:text-slate-400 focus:border-indigo-500 transition-all outline-none"
                    />
                </div>
            </div>

            {/* Main Table Container (Matches Attached Image Style) */}
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Total Patient Transaction Reports</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-0.5">PREVIOUSLY SAVED FINANCIAL STATEMENTS</p>
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading...</p>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="py-20 text-center">
                        <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No transaction reports found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Details</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Paid</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance</th>
                                    <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredReports.map((report) => (
                                    <tr key={report._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-6">
                                            <div className="text-sm font-bold text-slate-700">
                                                {new Date(report.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                                                {new Date(report.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="text-sm font-bold text-slate-900">{report.patient?.name || report.patient?.user?.name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">{report.patient?.profile?.mrn || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-6 text-sm font-black text-slate-700">{fmt(report.totals.grandTotal)}</td>
                                        <td className="px-6 py-6 text-sm font-bold text-emerald-600">{fmt(report.totals.totalPaid)}</td>
                                        <td className="px-6 py-6 text-sm font-black text-rose-500">{fmt(report.totals.balance)}</td>
                                        <td className="px-6 py-6 text-right">
                                            <button 
                                                onClick={() => {
                                                    router.push(`/${params.hospitalId}/frontdesk/transaction-reports?patientId=${report.patient?._id}&loadReport=${report._id}`);
                                                }}
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shadow-sm"
                                                title="Open Report"
                                            >
                                                <FileText size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
