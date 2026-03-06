'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    FileEdit,
    Printer,
    ChevronLeft,
    ChevronRight,
    User,
    Calendar,
    Filter,
    Trash2,
    ArrowLeft,
    Plus,
    CreditCard,
    LayoutGrid,
    Table as TableIcon
} from 'lucide-react';
import { Card, Button } from '@/components/admin';
import { dischargeService } from '@/lib/integrations/services/discharge.service';
import { PrintableDischargeSummary } from './PrintableDischargeSummary';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';

interface DischargeHistoryProps {
    basePath: string;
}

export function DischargeHistory({ basePath }: DischargeHistoryProps) {
    const router = useRouter();
    const { user } = useAuthStore();
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit] = useState(6);
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 1
    });

    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

    // Printing state
    const [printData, setPrintData] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const handleDirectPrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Discharge_Summary_${printData?.mrn || 'Record'}`,
    });

    // Debounce search - reduced to 300ms for snappier feel
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.length >= 3 || searchTerm.length === 0) {
                setDebouncedSearch(searchTerm);
                setPage(1); // Reset to first page on new search
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const response = await dischargeService.getHistory(page, limit, debouncedSearch);

            // Atomic update to prevent UI flickering
            if (response.data) {
                setRecords(response.data);
                if (response.pagination) {
                    setPagination({
                        total: response.pagination.total,
                        totalPages: response.pagination.totalPages
                    });
                }
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to load history");
        } finally {
            setLoading(false);
        }
    }, [page, limit, debouncedSearch]);

    // Fetch data whenever fetchHistory definition changes (which is tied to page/search)
    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleEdit = (id: string) => {
        router.push(`${basePath}?id=${id}`);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this record")) {
            return;
        }

        try {
            await dischargeService.deleteRecord(id);
            toast.success("Record deleted successfully", {
                icon: '🗑️',
                duration: 4000
            });
            // Refresh records
            fetchHistory();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete record");
        }
    };

    const triggerPrint = async (record: any) => {
        try {
            setLoading(true);
            // Fetch full record to ensure all details (vitals, diagnosis, etc.) are included for printing
            const fullRecord = await dischargeService.getRecordById(record._id);
            setPrintData(fullRecord.data);
            // Wait for state update to trigger print
            setTimeout(() => {
                handleDirectPrint();
            }, 100);
        } catch (err: any) {
            toast.error("Failed to fetch full record for printing");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const NoRecordsFound = ({ variant = 'table' }: { variant?: 'table' | 'grid' }) => {
        const content = (
            <div className={`py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200 ${variant === 'grid' ? 'col-span-full' : ''}`}>
                <div className="max-w-xs mx-auto space-y-4">
                    <div className="mx-auto w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <Search size={40} />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">No records found</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-4">Try adjusting your search filters or create a new discharge summary for this hospital.</p>
                    <Button onClick={() => router.push(basePath)} className="bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest px-8 shadow-lg shadow-blue-200">
                        Create New Summary
                    </Button>
                </div>
            </div>
        );

        if (variant === 'grid') return content;

        return (
            <tr>
                <td colSpan={5} className="p-0">
                    {content}
                </td>
            </tr>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="w-full py-4 space-y-5">
                {/* CONSOLIDATED HEADER & CONTROLS */}
                <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 pt-2">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                suppressHydrationWarning
                                onClick={() => router.push(basePath)}
                                className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                                title="Back to Portal"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                                    Discharge History
                                </h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {pagination.total} Committed Summaries
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative w-full md:w-80 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="SEARCH NAME / MRN..."
                                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-blue-500 shadow-inner transition-all"
                                />
                            </div>

                            {user?.role === 'hospital-admin' && (
                                <div className="flex items-center gap-2">
                                    <Link
                                        href="/hospital-admin/transactions?type=Discharge"
                                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all text-[10px] uppercase tracking-wider shadow-lg shadow-emerald-200"
                                    >
                                        <CreditCard size={16} />
                                        See Transactions
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Statistics Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Total Summaries</p>
                            <h3 className="text-2xl font-black leading-none mt-1">{pagination.total}</h3>
                        </div>
                        <FileEdit size={24} className="opacity-20" />
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Filter size={18} />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">View</p>
                                <h3 className="text-sm font-black text-blue-600 mt-1 uppercase leading-none">
                                    {debouncedSearch ? 'Filtered' : 'All Data'}
                                </h3>
                            </div>
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                type="button"
                                suppressHydrationWarning
                                onClick={() => setViewMode('grid')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <LayoutGrid size={12} /> Card
                            </button>
                            <button
                                type="button"
                                suppressHydrationWarning
                                onClick={() => setViewMode('table')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <TableIcon size={12} /> Table
                            </button>
                        </div>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                <Calendar size={18} />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Page Index</p>
                                <h3 className="text-sm font-black text-slate-900 mt-1 uppercase leading-none">
                                    {page} of {pagination.totalPages}
                                </h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50 shadow-inner">
                            <button
                                type="button"
                                suppressHydrationWarning
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <div className="px-2 py-1 text-[10px] font-black text-blue-600 bg-white rounded shadow-sm min-w-[32px] text-center">
                                {page}/{pagination.totalPages}
                            </div>
                            <button
                                type="button"
                                suppressHydrationWarning
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages || pagination.totalPages === 0}
                                className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all font-black"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                {viewMode === 'table' ? (
                    <Card className="rounded-2xl border-slate-200 shadow-xl shadow-blue-900/5 overflow-hidden bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Patient Details</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">ID Identifiers</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Clinical Team</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status / Date</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <tr key={i} className="">
                                                <td colSpan={5} className="px-8 py-6">
                                                    <div className="h-8 bg-slate-100 rounded-xl w-full animate-pulse" />
                                                </td>
                                            </tr>
                                        ))
                                    ) : records.length === 0 ? (
                                        <NoRecordsFound variant="table" />
                                    ) : (
                                        records.map((record) => (
                                            <tr key={record._id} className="hover:bg-blue-50/20 transition-colors border-b border-slate-50 last:border-0 group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                            {record.patientName?.charAt(0) || 'P'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-blue-600 text-sm leading-tight uppercase tracking-tight">{record.patientName}</h4>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{record.gender} • {record.age}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">MRN: {record.mrn}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-bold text-indigo-600 line-clamp-1 italic uppercase tracking-tight">
                                                            {record.primaryDoctor || record.suggestedDoctorName || 'N/A'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${record.conditionAtDischarge === 'Stable' || record.conditionAtDischarge === 'Improved' ? 'bg-emerald-500' : record.conditionAtDischarge === 'Critical' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{record.conditionAtDischarge || record.status || 'Completed'}</span>
                                                        </div>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {new Date(record.dischargeDate || record.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {user?.role === 'helpdesk' && (
                                                            <button
                                                                type="button"
                                                                suppressHydrationWarning
                                                                onClick={() => handleEdit(record._id)}
                                                                className="p-2.5 bg-white border border-slate-200 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                                title="Edit Summary"
                                                            >
                                                                <FileEdit size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            suppressHydrationWarning
                                                            onClick={() => triggerPrint(record)}
                                                            className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-800 hover:text-white rounded-xl transition-all shadow-sm"
                                                            title="Print Directly"
                                                        >
                                                            <Printer size={16} />
                                                        </button>
                                                        {user?.role === 'hospital-admin' && (
                                                            <button
                                                                type="button"
                                                                suppressHydrationWarning
                                                                onClick={() => handleDelete(record._id)}
                                                                className="p-2.5 bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                                title="Delete Record"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            Array(6).fill(0).map((_, i) => (
                                <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm animate-pulse space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
                                        <div className="space-y-2 flex-1">
                                            <div className="h-4 bg-slate-100 rounded w-3/4" />
                                            <div className="h-3 bg-slate-100 rounded w-1/2" />
                                        </div>
                                    </div>
                                    <div className="h-24 bg-slate-50 rounded-2xl" />
                                    <div className="h-10 bg-slate-100 rounded-xl" />
                                </div>
                            ))
                        ) : records.length === 0 ? (
                            <NoRecordsFound variant="grid" />
                        ) : (
                            records.map((record) => (
                                <div key={record._id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:border-blue-400 transition-all flex flex-col gap-6 relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex gap-1.5">
                                            <button type="button" suppressHydrationWarning onClick={() => triggerPrint(record)} className="p-2 bg-slate-900 text-white rounded-xl shadow-lg"><Printer size={14} /></button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-[1.25rem] bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-200">
                                            {record.patientName?.charAt(0) || 'P'}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">{record.patientName}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{record.gender} • {record.age}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-slate-50">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Clinical Team</span>
                                            <span className="text-[11px] font-black text-blue-600 uppercase italic">{record.primaryDoctor || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Discharge Date</span>
                                            <span className="text-[11px] font-bold text-slate-700 uppercase">{new Date(record.dischargeDate || record.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-4 flex gap-2">
                                        <button
                                            type="button"
                                            suppressHydrationWarning
                                            onClick={() => triggerPrint(record)}
                                            className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all"
                                        >
                                            View Report
                                        </button>
                                        {user?.role === 'helpdesk' && (
                                            <button
                                                type="button"
                                                suppressHydrationWarning
                                                onClick={() => handleEdit(record._id)}
                                                className="px-4 py-3 border border-slate-200 text-slate-400 rounded-2xl hover:text-blue-600 hover:border-blue-200 transition-all"
                                            >
                                                <FileEdit size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Hidden Printable Component */}
            <div className="hidden">
                <PrintableDischargeSummary
                    ref={printRef}
                    data={printData}
                    consultants={printData?.consultants || []}
                />
            </div>
        </div>
    );
}

export default React.memo(DischargeHistory);
