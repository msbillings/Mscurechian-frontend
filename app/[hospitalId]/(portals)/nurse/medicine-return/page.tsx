"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ipdService } from "@/lib/integrations/services/ipd.service";
import { ipdIssuanceService } from "@/lib/integrations/services/pharmacy.service";
import { useAuthStore } from "@/stores/authStore";
import {
    Search,
    Package,
    RotateCcw,
    UserCheck,
    ChevronDown,
    ChevronUp,
    BedDouble,
    CheckCircle2,
    Clock,
    ArrowLeft,
    User,
    ClipboardList,
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function NurseMedicineReturnPage() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [selectedAdmission, setSelectedAdmission] = useState<any | null>(null);

    // Fetch active admissions
    const { data: admissions = [], isLoading: loadingAdmissions, refetch: refetchAdmissions } = useQuery<any[]>({
        queryKey: ["ipd", "active-admissions"],
        queryFn: () => ipdService.getActiveAdmissions(),
        refetchInterval: 5000,
    });

    const filteredAdmissions = (admissions as any[]).filter((a) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            a.patient?.name?.toLowerCase().includes(q) ||
            a.admissionId?.toLowerCase().includes(q)
        );
    });

    // Fetch issuances for selected admission
    const admId = selectedAdmission?.admissionId || "";
    const { data: issuances = [], isLoading: loadingIssuances } = useQuery<any[]>({
        queryKey: ["pharmacy", "ipd-issuance", admId],
        queryFn: () => ipdIssuanceService.getIssuancesByAdmission(admId),
        enabled: !!admId,
        refetchInterval: 5000,
    });

    const currentUserIssuances = (issuances as any[]).filter(
        (iss) => (iss.receivedByNurse?._id || iss.receivedByNurse) === user?.id
    );

    const { data: clinicalHistory } = useQuery<any>({
        queryKey: ["ipd", "clinical-history", admId],
        queryFn: () => ipdService.getClinicalHistory(admId),
        enabled: !!admId,
        refetchInterval: 5000,
    });

    const enrichedIssuances = useMemo(() => {
        if (!currentUserIssuances.length) return [];
        const administeredCounts: Record<string, number> = {};
        if (clinicalHistory?.meds) {
            clinicalHistory.meds.forEach((m: any) => {
                let drugName = m.drugName || "";

                // If the name has form "Brufen 400mg TABLET", safely extract the base
                drugName = drugName.toLowerCase().trim();
                if (drugName) {
                    administeredCounts[drugName] = (administeredCounts[drugName] || 0) + 1;
                }
            });
        }

        return currentUserIssuances.map((iss) => {
            const newItems = (iss.items ?? []).map((item: any, idx: number) => {
                const issued = item.issuedQty ?? item.qty ?? 0;
                const returned = item.returnedQty ?? 0;
                let leftQty = issued - returned;

                if (leftQty > 0) {
                    const productGeneric = item.product?.generic?.toLowerCase() || "";
                    const productBrand = item.product?.brand?.toLowerCase() || "";
                    const productNameLow = item.productName?.toLowerCase() || "";

                    for (const drugName in administeredCounts) {
                        const drugBase = drugName.split(" ")[0]; // e.g., "ibuprofen" out of "ibuprofen 400mg"

                        const isMatch =
                            productNameLow.includes(drugBase) ||
                            productGeneric.includes(drugBase) ||
                            productBrand.includes(drugBase) ||
                            drugName.includes(productNameLow.split(" ")[0]);

                        if (isMatch) {
                            const toDeduct = Math.min(administeredCounts[drugName], leftQty);
                            leftQty -= toDeduct;
                            administeredCounts[drugName] -= toDeduct;
                            if (administeredCounts[drugName] <= 0) {
                                delete administeredCounts[drugName];
                            }
                        }
                    }
                }

                return { ...item, _rawIdx: idx, _leftQty: leftQty };
            });
            return { ...iss, items: newItems };
        });
    }, [currentUserIssuances, clinicalHistory]);

    const [expandedIssuance, setExpandedIssuance] = useState<string | null>(null);
    const [returnQtys, setReturnQtys] = useState<Record<string, Record<number, number>>>({});
    const [returnReasons, setReturnReasons] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState<string | null>(null);

    const handleBack = () => {
        setSelectedAdmission(null);
        setExpandedIssuance(null);
    };

    const handleReturnQtyChange = (issId: string, idx: number, val: number) => {
        setReturnQtys(prev => ({ ...prev, [issId]: { ...prev[issId], [idx]: Math.max(0, val) } }));
    };

    const handleSubmitReturn = async (iss: any) => {
        const qtys = returnQtys[iss._id] || {};
        const items = (iss.items ?? [])
            .map((item: any, idx: number) => ({
                productId: item.productId || item.product?._id || item.product,
                productName: item.productName,
                batchId: item.batchId || item.batch?._id || item.batch,
                returnQty: qtys[idx] ?? 0,
            }))
            .filter((i: any) => i.returnQty > 0);

        if (!items.length) {
            toast.error("Enter return quantity for at least one medicine");
            return;
        }

        setSubmitting(iss._id);
        try {
            await ipdIssuanceService.submitReturn({
                issuanceId: iss._id,
                items: items.map((i: any) => ({
                    productId: i.productId,
                    returnedQty: i.returnQty,
                    reason: returnReasons[iss._id] || "Patient return",
                })),
                notes: returnReasons[iss._id] || "Submitted by nurse",
            });
            toast.success("Return request submitted!");
            setExpandedIssuance(null);

            // clear local form state
            setReturnQtys(prev => { const n = { ...prev }; delete n[iss._id]; return n; });
            setReturnReasons(prev => { const n = { ...prev }; delete n[iss._id]; return n; });

            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance", admId] });
        } catch (err: any) {
            toast.error(err?.message || "Failed to submit return request");
        } finally {
            setSubmitting(null);
        }
    };

    return (
        <div className="space-y-6 max-w-[1200px] mx-auto pb-20">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Medicine Return</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Select a patient to initiate medicine returns
                </p>
            </div>

            {/* ══ PATIENT LIST VIEW ══════════════════════════════ */}
            {!selectedAdmission ? (
                <div className="space-y-5">
                    {/* Search */}
                    <div className="relative">
                        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            className="w-full pl-10 pr-10 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            placeholder="Search by patient name or admission ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-lg"
                            >×</button>
                        )}
                    </div>

                    {/* Cards */}
                    {loadingAdmissions ? (
                        <div className="flex items-center justify-center py-16 gap-2 text-gray-400 text-sm">
                            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            Loading admitted patients...
                        </div>
                    ) : filteredAdmissions.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <BedDouble size={48} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">
                                {search ? `No patients matching "${search}"` : "No active IPD admissions"}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredAdmissions.map((adm) => (
                                <button
                                    key={adm._id}
                                    onClick={() => setSelectedAdmission(adm)}
                                    className="w-full text-left bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all p-5 relative group"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                                            <User size={18} className="text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-800 dark:text-white text-sm truncate">
                                                {adm.patient?.name || "Unknown"}
                                            </p>
                                            <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">
                                                {adm.admissionId}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2">
                                            <p className="text-xs text-gray-400 mb-0.5">Bed</p>
                                            <p className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1">
                                                <BedDouble size={10} className="text-blue-500" />
                                                {adm.bed?.bedId || "—"}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2">
                                            <p className="text-xs text-gray-400 mb-0.5">Pharmacy Status</p>
                                            <p className={`text-xs font-bold flex items-center gap-1 ${adm.pharmacyClearanceStatus === "CLEARED" ? "text-green-600" : "text-amber-500"}`}>
                                                {adm.pharmacyClearanceStatus === "CLEARED" ? (
                                                    <><CheckCircle2 size={10} /> Closed</>
                                                ) : (
                                                    <><Clock size={10} /> Pending Returns</>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {adm.primaryDoctor?.user?.name && (
                                        <p className="text-xs text-gray-400 truncate">Dr. {adm.primaryDoctor.user.name}</p>
                                    )}

                                    {/* Action highlight */}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-50 dark:from-gray-800 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end items-end rounded-b-3xl">
                                        <span className="text-xs font-bold text-blue-600 flex items-center gap-1 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow-sm">
                                            Open Returns <ArrowLeft size={12} className="rotate-180" />
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* ══ DETAIL VIEW ══════════════════════════════ */
                <div>
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-600 mb-5 transition-colors"
                    >
                        <ArrowLeft size={15} /> Back to patients
                    </button>

                    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl overflow-hidden shadow-sm">
                        {/* Selected Patient Header */}
                        <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-b border-blue-100 dark:border-blue-800/30 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {selectedAdmission.patient?.name}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                                    <span>{selectedAdmission.admissionId}</span>
                                    {selectedAdmission.bed?.bedId && (
                                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                            <BedDouble size={14} /> {selectedAdmission.bed.bedId}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Issued Medicines List */}
                        <div className="p-6">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                <ClipboardList size={16} className="text-blue-500" />
                                Previously Issued Medicines
                            </h3>

                            {loadingIssuances ? (
                                <div className="text-center py-10">
                                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <p className="text-xs text-gray-400">Loading issuance history...</p>
                                </div>
                            ) : currentUserIssuances.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <Package size={32} className="mx-auto text-gray-300 mb-2" />
                                    <p className="text-sm font-medium text-gray-500">No medicines have been assigned to you for this patient.</p>
                                    <p className="text-xs text-gray-400 mt-1">Only medicines explicitly assigned to you during billing will appear here.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {enrichedIssuances.map((iss: any) => {
                                        const isExpanded = expandedIssuance === iss._id;
                                        const returnableItems = (iss.items ?? [])
                                            .filter((i: any) => i._leftQty > 0);
                                        const nurseName = iss.receivedByNurse?.name || iss.nurseNote || null;

                                        return (
                                            <div key={iss._id} className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                                                <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                            Issued on {new Date(iss.issuedAt).toLocaleDateString("en-IN", {
                                                                day: "numeric", month: "short", year: "numeric",
                                                                hour: "2-digit", minute: "2-digit",
                                                            })}
                                                        </p>
                                                        {nurseName && (
                                                            <p className="text-xs text-teal-600 font-medium flex items-center gap-1 mt-1">
                                                                <UserCheck size={12} /> Received by: {nurseName}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {returnableItems.length > 0 && iss.status !== "RETURN_REQUESTED" ? (
                                                            <button
                                                                onClick={() => setExpandedIssuance(isExpanded ? null : iss._id)}
                                                                className="text-xs bg-orange-50 dark:bg-orange-900/20 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-xl font-bold hover:bg-orange-100 flex items-center gap-1.5 transition-colors shadow-sm"
                                                            >
                                                                <RotateCcw size={12} />
                                                                Initiate Return
                                                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                            </button>
                                                        ) : iss.status === "RETURN_REQUESTED" ? (
                                                            <span className="text-xs text-yellow-600 font-bold bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-xl border border-yellow-200 flex items-center gap-1.5">
                                                                <Clock size={12} /> Return Request Processing
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-green-600 font-bold bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-xl border border-green-200 flex items-center gap-1.5">
                                                                <CheckCircle2 size={12} /> Closed
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="text-gray-400 uppercase text-[10px] tracking-wider border-y border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                                                            <th className="text-left px-5 py-3 font-semibold">Medicine</th>
                                                            <th className="text-center px-4 py-3 font-semibold w-24">Issued</th>
                                                            <th className="text-center px-4 py-3 font-semibold w-24">Returned</th>
                                                            <th className="text-center px-4 py-3 font-semibold w-24 text-blue-500">Left</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                                                        {(iss.items ?? []).map((item: any, idx: number) => {
                                                            const issued = item.issuedQty ?? item.qty ?? 0;
                                                            const returned = item.returnedQty ?? 0;
                                                            return (
                                                                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                                                                    <td className="px-5 py-3 font-bold text-gray-700 dark:text-gray-200">{item.productName}</td>
                                                                    <td className="px-4 py-3 text-center text-gray-500 font-medium">{issued}</td>
                                                                    <td className="px-4 py-3 text-center text-orange-500 font-medium">{returned}</td>
                                                                    <td className={`px-4 py-3 text-center font-bold ${item._leftQty > 0 ? "text-blue-600" : "text-green-600"}`}>{item._leftQty}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>

                                                {/* Return Inline Form */}
                                                {isExpanded && (
                                                    <div className="p-5 border-t border-orange-100 dark:border-orange-900/30 bg-orange-50/30 dark:bg-orange-900/10">
                                                        <p className="text-xs font-bold text-orange-800 dark:text-orange-400 mb-3 uppercase tracking-wider">Select quantities to return</p>
                                                        <div className="space-y-3">
                                                            {returnableItems.map((item: any, idx: number) => {
                                                                const max = item._leftQty;
                                                                const rawIdx = item._rawIdx;

                                                                return (
                                                                    <div key={idx} className="flex items-center gap-4 bg-white dark:bg-gray-800 p-3 rounded-xl border border-orange-100 dark:border-gray-700 shadow-sm">
                                                                        <span className="flex-1 text-sm font-bold text-gray-700 dark:text-gray-200">{item.productName}</span>
                                                                        <span className="text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">max {max}</span>
                                                                        <input
                                                                            type="number" min={0} max={max}
                                                                            value={returnQtys[iss._id]?.[rawIdx] ?? 0}
                                                                            onChange={(e) => handleReturnQtyChange(iss._id, rawIdx, Number(e.target.value))}
                                                                            className="w-20 bg-gray-50 dark:bg-gray-900 border border-orange-200 dark:border-orange-800 rounded-lg px-2 py-1.5 text-sm font-bold text-center outline-none focus:ring-2 focus:ring-orange-500"
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Reason for return (e.g. Patient discharge, allergy...)"
                                                            value={returnReasons[iss._id] ?? ""}
                                                            onChange={(e) => setReturnReasons(prev => ({ ...prev, [iss._id]: e.target.value }))}
                                                            className="w-full mt-4 bg-white dark:bg-gray-800 border border-orange-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 shadow-sm"
                                                        />
                                                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-orange-100 dark:border-gray-800">
                                                            <button
                                                                onClick={() => handleSubmitReturn(iss)}
                                                                disabled={submitting === iss._id}
                                                                className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-md shadow-orange-500/20"
                                                            >
                                                                <RotateCcw size={14} />
                                                                {submitting === iss._id ? "Processing Request..." : "Submit Return"}
                                                            </button>
                                                            <button
                                                                onClick={() => setExpandedIssuance(null)}
                                                                className="text-gray-500 hover:text-gray-700 px-4 py-2 text-sm font-medium transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
