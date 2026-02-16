"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
    Beaker,
    Search,
    Navigation,
    ChevronRight,
    ChevronLeft,
    Loader2,
    ArrowLeft,
    RefreshCw,
    Printer,
    Filter,
    FileText,
    Activity
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { helpdeskService } from '@/lib/integrations/services/helpdesk.service';
import { generatePrescriptionHtml, generateLabTokenHtml } from '@/lib/print-utils';
import Link from 'next/link';
import { useTransits } from '@/lib/integrations/hooks';

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

function TransitsPage() {
    const [filter, setFilter] = useState<'all' | 'prescription' | 'lab'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [page, setPage] = useState(1);

    const queryParams = useMemo(() => ({
        page,
        limit: 10,
        search: debouncedSearch,
        type: filter
    }), [page, debouncedSearch, filter]);

    const { data: transitsData, isLoading, isFetching, refetch } = useTransits(queryParams);
    const transits = transitsData?.transits || [];
    const totalPages = transitsData?.pagination?.pages || 1;
    const totalItems = transitsData?.pagination?.total || 0;

    // Reset page on filter change
    useEffect(() => {
        setTimeout(() => setPage(1), 0);
    }, [filter, debouncedSearch]);



    const handlePrint = (transit: any, type: 'prescription' | 'lab') => {
        const hospital = transit.hospital || { name: "CureChain Medical Center", address: "Medical District", contact: "N/A" };

        if (type === 'prescription' && transit.prescription) {
            const data = {
                hospital,
                patient: {
                    name: transit.patientName,
                    mrn: transit.patientMRN,
                    mobile: transit.patientMobile,
                    age: transit.patientAge,
                    gender: transit.patientGender
                },
                doctor: {
                    name: transit.doctorName,
                    specialization: transit.doctorSpecialization,
                    signature: transit.doctorSignature
                },
                prescription: transit.prescription
            };

            const html = generatePrescriptionHtml({ ...data, returnUrl: '/helpdesk/transits' });
            const win = window.open('', '_self');
            if (win) {
                win.document.write(html);
                win.document.close();
            }
            return;
        }

        if (type === 'lab' && transit.labToken) {
            const data = {
                hospital,
                patient: {
                    name: transit.patientName,
                    mrn: transit.patientMRN,
                    age: transit.patientAge,
                    gender: transit.patientGender
                },
                doctor: {
                    name: transit.doctorName
                },
                labToken: transit.labToken
            };

            const html = generateLabTokenHtml({ ...data, returnUrl: '/helpdesk/transits' });
            const win = window.open('', '_self');
            if (win) {
                win.document.write(html);
                win.document.close();
            }
            return;
        }

        toast.error('Document data unavailable');
    };

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-500">

            {/* CONSOLIDATED HEADER & CONTROLS */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-full mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 pt-2">
                    <div className="flex items-center gap-3">
                        <Link href="/helpdesk" className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-rose-600 transition-all shadow-sm">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                Clinical Document Transits
                            </h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Medical Logistics • {totalItems} Live Nodes</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" size={16} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="SEARCH NAME / MRN..."
                                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-rose-500 shadow-inner transition-all"
                            />
                        </div>

                        {/* COMPACT PAGINATION */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-rose-600 disabled:opacity-20 transition-all active:scale-90"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <div className="px-3 py-1.5 text-xs font-black text-slate-900 bg-white rounded-md shadow-sm border border-slate-100 min-w-[55px] text-center">
                                    {page} / {totalPages}
                                </div>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-rose-600 disabled:opacity-20 transition-all active:scale-90"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}

                        <button onClick={() => refetch()} className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-teal-600 shadow-sm active:scale-95 transition-all">
                            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 border-t border-slate-100 pt-3 px-2">
                    {(['all', 'prescription', 'lab'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${filter === f
                                ? 'bg-teal-600  text-white shadow-lg shadow-rose-900/10'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {f === 'all' ? (
                                <div className="flex items-center gap-2">
                                    <Navigation size={14} className={filter === 'all' ? 'animate-pulse' : ''} /> All Entities
                                </div>
                            ) : f === 'prescription' ? (
                                <div className="flex items-center gap-2">
                                    <FileText size={14} /> Prescriptions
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Beaker size={14} /> Lab Tokens
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* TABLE LAYOUT */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[425px] flex flex-col max-w-full mx-auto">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-6 text-left">Patient Details</th>
                                <th className="px-6 py-6 text-left">MRN</th>
                                <th className="px-6 py-6 text-left">Available Documents</th>
                                <th className="px-6 py-6 text-left">Authorizing Doctor</th>
                                <th className="px-6 py-6 text-right pr-10">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <RefreshCw className="w-6 h-6 text-teal-500 animate-spin" />
                                            <span className="text-xs text-slate-400 font-medium tracking-wide">Fetching Records...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : transits.length > 0 ? (
                                transits.map((t) => (
                                    <tr key={t._id} className="hover:bg-slate-50/50 group">
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0 border border-teal-100 shadow-sm">
                                                    {t.patientName.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold text-slate-900 uppercase tracking-tight truncate max-w-[180px]">{t.patientName}</div>
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                                        {t.patientAge !== '-' ? `${t.patientAge} Years` : 'Age N/A'} • {t.patientGender}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="text-xs font-bold text-teal-600 font-mono tracking-wider bg-teal-50/50 px-2 py-1 rounded-lg border border-teal-100 w-fit">
                                                #{t.patientMRN}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex flex-wrap gap-1.5">
                                                {(filter === 'all' || filter === 'prescription') && t.prescription && (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-teal-50 text-teal-700 border border-teal-100 text-[10px] font-bold uppercase tracking-wide">
                                                        <FileText size={11} /> Prescription
                                                    </span>
                                                )}
                                                {(filter === 'all' || filter === 'lab') && t.labToken && (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold uppercase tracking-wide">
                                                        <Beaker size={11} /> Lab Token
                                                    </span>
                                                )}
                                                {!t.prescription && !t.labToken && (
                                                    <span className="text-xs text-slate-400 italic">No Docs</span>
                                                )}
                                            </div>
                                            <div className="text-[9px] text-slate-400 mt-1.5 font-bold uppercase tracking-widest">
                                                Indexed: {new Date(t.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="text-sm font-bold text-slate-900 uppercase">{t.doctorName}</div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest mt-1 text-sky-600">{t.doctorSpecialization}</div>
                                        </td>
                                        <td className="px-5 py-2.5 text-right align-top">
                                            <div className="flex items-center justify-end gap-2">
                                                {(filter === 'all' || filter === 'prescription') && t.prescription && (
                                                    <button
                                                        onClick={() => handlePrint(t, 'prescription')}
                                                        className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                                                        title="Print Prescription"
                                                    >
                                                        <Printer size={14} />
                                                    </button>
                                                )}
                                                {(filter === 'all' || filter === 'lab') && t.labToken && (
                                                    <button
                                                        onClick={() => handlePrint(t, 'lab')}
                                                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                                        title="Print Lab Token"
                                                    >
                                                        <Printer size={14} />
                                                    </button>
                                                )}

                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <Activity size={32} className="text-slate-200 mx-auto mb-3" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            No transits found for current selection
                                        </p>
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

export default React.memo(TransitsPage);
