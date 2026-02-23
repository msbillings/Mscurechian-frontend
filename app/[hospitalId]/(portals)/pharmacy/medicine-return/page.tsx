"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ipdIssuanceService } from "@/lib/integrations/services/pharmacy.service";
import {
    Search, RotateCcw, Check, X, User, BedDouble,
    Clock, Filter, Package, ClipboardList, ArrowRight
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function PharmaMedicineReturnPage() {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<string>("PENDING");
    const [search, setSearch] = useState("");

    // Fetch all returns
    const { data: allReturns = [], isLoading } = useQuery({
        queryKey: ["pharmacy", "medicine-returns", "all", { status: statusFilter }],
        queryFn: () => ipdIssuanceService.getAllReturns({ status: statusFilter === "ALL" ? undefined : statusFilter }),
        refetchInterval: 10000,
    });

    const filteredReturns = allReturns.filter((ret: any) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            ret.patient?.name?.toLowerCase().includes(q) ||
            ret.admissionId?.toLowerCase().includes(q)
        );
    });

    // Mutations
    const approveMutation = useMutation({
        mutationFn: ipdIssuanceService.approveReturn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "medicine-returns", "all"] });
            toast.success("Return approved and stock restored");
        },
        onError: (err: any) => toast.error(err?.message || "Failed to approve return"),
    });

    const rejectMutation = useMutation({
        mutationFn: (id: string) => ipdIssuanceService.rejectReturn(id, "Rejected by pharmacist"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "medicine-returns", "all"] });
            toast.success("Return request rejected");
        },
        onError: (err: any) => toast.error(err?.message || "Failed to reject return"),
    });

    const getStatusColor = (s: string) => ({
        PENDING: "bg-amber-100 text-amber-700 border-amber-200",
        APPROVED: "bg-green-100 text-green-700 border-green-200",
        REJECTED: "bg-red-100 text-red-700 border-red-200",
    }[s] || "bg-gray-100 text-gray-600");

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <RotateCcw className="text-orange-500" />
                        Medicine Return Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Review and process medicine return requests from nursing stations.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    {["PENDING", "APPROVED", "REJECTED", "ALL"].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === status
                                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                                    : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500 shadow-sm transition-all"
                    placeholder="Search by patient name or admission ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Table/List */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
                    <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-medium">Syncing return requests...</p>
                </div>
            ) : filteredReturns.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 py-20 text-center">
                    <RotateCcw size={48} className="mx-auto text-gray-200 mb-4 opacity-50" />
                    <p className="text-gray-500 font-medium">No return requests found.</p>
                    <p className="text-xs text-gray-400 mt-1">Requests submitted by nurses will appear here for your approval.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredReturns.map((ret: any) => (
                        <div key={ret._id} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            {/* Card Header */}
                            <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-700/20 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-800 dark:text-white text-sm">{ret.patient?.name}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getStatusColor(ret.status)}`}>
                                                {ret.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <p className="text-[11px] font-mono text-gray-400">{ret.admissionId}</p>
                                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                <Clock size={10} /> {new Date(ret.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Submitted By</p>
                                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{ret.returnedBy?.name} ({ret.returnedBy?.role})</p>
                                    </div>
                                    {ret.status === "PENDING" && (
                                        <div className="flex items-center gap-2 ml-4">
                                            <button
                                                onClick={() => approveMutation.mutate(ret._id)}
                                                disabled={approveMutation.isPending}
                                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm shadow-green-600/20 active:scale-95 disabled:opacity-50"
                                            >
                                                <Check size={14} /> Approve
                                            </button>
                                            <button
                                                onClick={() => rejectMutation.mutate(ret._id)}
                                                disabled={rejectMutation.isPending}
                                                className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                <X size={14} /> Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card Content */}
                            <div className="grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x dark:divide-gray-700">
                                {/* Items Table */}
                                <div className="lg:col-span-3">
                                    <table className="w-full text-xs">
                                        <thead className="bg-white dark:bg-gray-800 text-gray-400 uppercase text-[10px] tracking-wider border-b dark:border-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left font-bold">Medicine Name</th>
                                                <th className="px-4 py-3 text-center font-bold">Qty Returned</th>
                                                <th className="px-6 py-3 text-left font-bold">Reason/Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                            {ret.items?.map((item: any, i: number) => (
                                                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/10 transition-colors">
                                                    <td className="px-6 py-3 font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                                        <Package size={12} className="text-orange-400" />
                                                        {item.productName}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-black text-orange-600 bg-orange-50/30 dark:bg-orange-900/10">
                                                        {item.returnedQty}
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-500 italic">
                                                        {item.reason || "—"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {ret.notes && (
                                        <div className="px-6 py-3 bg-gray-50/30 dark:bg-gray-700/10 border-t dark:border-gray-700 flex items-start gap-2">
                                            <ClipboardList size={12} className="text-gray-400 mt-0.5" />
                                            <p className="text-[11px] text-gray-500"><span className="font-bold uppercase tracking-tight mr-1">Admin Notes:</span> {ret.notes}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Issuance Info */}
                                <div className="p-6 bg-white dark:bg-gray-800 flex flex-col justify-center">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Original Issuance</p>
                                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] text-gray-500">Status:</span>
                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-md uppercase">
                                                {ret.issuance?.status || "ISSUED"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-500">Date:</span>
                                            <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
                                                {ret.issuance?.issuedAt ? new Date(ret.issuance.issuedAt).toLocaleDateString() : "—"}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => window.open(`/${ret.hospital}/pharmacy/ipd-issuance?admissionId=${ret.admissionId}`, '_blank')}
                                        className="mt-4 text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center justify-center gap-1 group transition-colors"
                                    >
                                        View Full Reconciliation <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
