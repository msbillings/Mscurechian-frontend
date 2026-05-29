"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Search, ArrowLeft, ExternalLink, Calendar, User, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { helpdeskService } from '@/lib/integrations/services/helpdesk.service';
import { useHelpdeskPatients } from "@/lib/integrations";
import { sanitizePatientName } from "@/lib/utils/name-utils";
import { calculateAge } from "@/lib/utils/date-utils";
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';

function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(t);
    }, [value, delayMs]);
    return debounced;
}

export default function TransactionHistoryPage() {
    const router = useRouter();
    const params = useParams();

    // Patient search
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const limit = 10;
    const debouncedSearch = useDebouncedValue(searchTerm, 300);

    const { data: patientsRaw, isLoading: patientsLoading, isFetching } = useHelpdeskPatients(
        debouncedSearch,
        page,
        limit,
        undefined,
        undefined,
        true
    );

    const { patients, total } = useMemo(() => {
        const raw: any = patientsRaw;
        if (!raw) return { patients: [] as any[], total: 0 };
        if (Array.isArray(raw)) return { patients: raw, total: raw.length };
        return {
            patients: raw.data || [],
            total: raw.pagination?.total || (raw.data?.length || 0),
        };
    }, [patientsRaw]);

    const totalPages = Math.ceil(total / limit);

    // Selected patient & their reports
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [patientReports, setPatientReports] = useState<any[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);

    // All reports (shown when no patient is selected)
    const [allReports, setAllReports] = useState<any[]>([]);
    const [allReportsLoading, setAllReportsLoading] = useState(true);

    useEffect(() => {
        fetchAllReports();
    }, []);

    const fetchAllReports = async () => {
        try {
            setAllReportsLoading(true);
            const data = await helpdeskService.getAllTransactionReports();
            setAllReports(data);
        } catch (error) {
            console.error("Failed to fetch reports:", error);
        } finally {
            setAllReportsLoading(false);
        }
    };

    const handleSelectPatient = async (patient: any) => {
        const pId = patient.user?._id || patient._id || patient.id;
        setSelectedPatient({
            ...patient,
            _id: pId,
            name: patient.user?.name || patient.name,
            mobile: patient.user?.mobile || patient.profile?.contactNumber || patient.mobile || 'N/A',
            mrn: patient.mrn || patient.profile?.mrn || 'N/A',
        });
        setLoadingReports(true);
        try {
            // Fetch both saved reports AND dynamic IPD bill in parallel
            const [savedReports, dynamicBill] = await Promise.allSettled([
                helpdeskService.getPatientTransactionReports(pId),
                helpdeskService.getIPDFinalBill(pId).catch(() => []),
            ]);

            const saved = savedReports.status === 'fulfilled' ? (savedReports.value || []) : [];
            const dynamic = dynamicBill.status === 'fulfilled' ? (dynamicBill.value || []) : [];

            // Merge: dynamic (auto-generated) bills first, then saved reports
            const merged = [...(Array.isArray(dynamic) ? dynamic : []), ...(Array.isArray(saved) ? saved : [])];
            setPatientReports(merged);

            if (merged.length === 0) {
                toast("No billing data found for this patient.", { icon: "📋" });
            }
        } catch (error) {
            console.error("Failed to fetch patient reports:", error);
            toast.error("Failed to load patient reports");
            setPatientReports([]);
        } finally {
            setLoadingReports(false);
        }
    };

    const fmt = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    // Decide which reports to display
    const displayReports = selectedPatient ? patientReports : allReports;
    const isLoadingDisplay = selectedPatient ? loadingReports : allReportsLoading;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-16 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={() => selectedPatient ? setSelectedPatient(null) : router.back()}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-colors"
                >
                    <ArrowLeft size={14} /> {selectedPatient ? "Back to All Reports" : "Back to Reports"}
                </button>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Search patient name, MRN, mobile..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        className="pl-10 pr-6 py-2 bg-white border border-slate-200 rounded-xl w-[300px] text-xs font-bold placeholder:text-slate-400 focus:border-indigo-500 transition-all outline-none"
                    />
                </div>
            </div>

            {/* Patient Search Results — show when user is typing */}
            {searchTerm.length >= 2 && !selectedPatient && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/40 overflow-hidden mb-2">
                    <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-white border-b border-slate-100">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                            {isFetching ? "Searching..." : `${total} Patient${total !== 1 ? "s" : ""} Found`}
                        </p>
                    </div>
                    {patientsLoading ? (
                        <div className="py-10 text-center">
                            <RefreshCw className="animate-spin text-indigo-400 mx-auto mb-3" size={24} />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Searching patients...</p>
                        </div>
                    ) : patients.length === 0 ? (
                        <div className="py-10 text-center">
                            <User size={36} className="mx-auto text-slate-200 mb-3" />
                            <p className="text-slate-400 font-bold text-xs">No patients found for &quot;{searchTerm}&quot;</p>
                        </div>
                    ) : (
                        <>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">MRN</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Age / Gender</th>
                                        <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {patients.map((p: any) => {
                                        const name = sanitizePatientName(p.user?.name || p.name || "Unknown");
                                        const mrn = p.mrn || p.profile?.mrn || "N/A";
                                        const mobile = p.user?.mobile || p.profile?.contactNumber || p.mobile || "N/A";
                                        const dob = p.user?.dateOfBirth || p.profile?.dob || p.dateOfBirth;
                                        const age = dob ? calculateAge(dob) : "--";
                                        const gender = p.user?.gender || p.profile?.gender || p.gender || "--";

                                        return (
                                            <tr
                                                key={p._id || p.id}
                                                onClick={() => handleSelectPatient(p)}
                                                className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm">
                                                            {name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-800">{name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500">{mrn}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500">{mobile}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500">{age} / {gender}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                                        View Reports →
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
                                    <p className="text-[10px] font-bold text-slate-400">Page {page} of {totalPages}</p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPage(Math.max(1, page - 1))}
                                            disabled={page <= 1}
                                            className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-white transition-colors"
                                        >
                                            <ChevronLeft size={14} />
                                        </button>
                                        <button
                                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                                            disabled={page >= totalPages}
                                            className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-white transition-colors"
                                        >
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Selected Patient Banner */}
            {selectedPatient && (
                <div className="bg-gradient-to-r from-indigo-50 via-white to-indigo-50 rounded-2xl border border-indigo-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-lg">
                            {(selectedPatient.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900">{selectedPatient.name}</h3>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                MRN: {selectedPatient.mrn} &bull; Mobile: {selectedPatient.mobile}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setSelectedPatient(null); setPatientReports([]); setSearchTerm(""); }}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:bg-white transition-colors"
                    >
                        Clear Selection
                    </button>
                </div>
            )}

            {/* Reports Table */}
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                            {selectedPatient ? `Reports for ${selectedPatient.name}` : "Total Patient Transaction Reports"}
                        </h2>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-0.5">
                            {selectedPatient ? "SAVED FINANCIAL STATEMENTS FOR THIS PATIENT" : "PREVIOUSLY SAVED FINANCIAL STATEMENTS"}
                        </p>
                    </div>
                </div>

                {isLoadingDisplay ? (
                    <div className="py-20 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading...</p>
                    </div>
                ) : displayReports.length === 0 ? (
                    <div className="py-20 text-center">
                        <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                            {selectedPatient ? "No saved reports for this patient" : "No transaction reports found"}
                        </p>
                        {!selectedPatient && (
                            <p className="text-slate-400 font-medium text-xs mt-2">
                                Use the search bar above to find a patient by name, MRN, or mobile number
                            </p>
                        )}
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
                                {displayReports.map((report) => (
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
                                            <div className="text-sm font-bold text-slate-900">{report.patient?.name || report.patient?.user?.name || selectedPatient?.name || "N/A"}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">{report.patient?.profile?.mrn || selectedPatient?.mrn || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-6 text-sm font-black text-slate-700">{fmt(report.totals?.grandTotal || 0)}</td>
                                        <td className="px-6 py-6 text-sm font-bold text-emerald-600">{fmt(report.totals?.totalPaid || 0)}</td>
                                        <td className="px-6 py-6 text-sm font-black text-rose-500">{fmt(report.totals?.balance || 0)}</td>
                                        <td className="px-6 py-6 text-right">
                                            <button
                                                onClick={() => {
                                                    const patientId = report.patient?._id || selectedPatient?._id;
                                                    router.push(`/${params.hospitalId}/frontdesk/transaction-reports?patientId=${patientId}&loadReport=${report._id}`);
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
