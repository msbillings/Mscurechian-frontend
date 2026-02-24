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
    LayoutGrid,
    List,
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
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

    // Fetch active admissions
    const { data: admissions = [], isLoading: loadingAdmissions, refetch: refetchAdmissions } = useQuery<any[]>({
        queryKey: ["ipd", "nurse-active-admissions", user?.id],
        queryFn: () => ipdIssuanceService.getNurseActiveAdmissions(),
        refetchInterval: 5000,
    });

    const enrichedAdmissions = useMemo(() => {
        // Deduplicate admissions just in case backend has duplicate data
        const unique = new Map();
        (admissions || []).forEach(a => {
            if (!unique.has(a.admissionId)) {
                unique.set(a.admissionId, a);
            }
        });

        return Array.from(unique.values()).filter((a) => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return (
                a.patient?.name?.toLowerCase().includes(q) ||
                a.admissionId?.toLowerCase().includes(q)
            );
        });
    }, [admissions, search]);

    // Fetch issuances for selected admission
    const admId = selectedAdmission?.admissionId || "";
    const { data: issuances = [], isLoading: loadingIssuances } = useQuery<any[]>({
        queryKey: ["pharmacy", "ipd-issuance", admId],
        queryFn: () => ipdIssuanceService.getIssuancesByAdmission(admId),
        enabled: !!admId,
        refetchInterval: 5000,
    });

    // Fetch existing return requests for this admission to prevent duplicates
    const { data: existingReturns = [] } = useQuery<any[]>({
        queryKey: ["pharmacy", "medicine-returns", admId],
        queryFn: () => ipdIssuanceService.getReturnsByAdmission(admId),
        enabled: !!admId,
        refetchInterval: 5000,
    });

    // Check if there's already a pending (not yet approved/rejected) return request
    const hasPendingReturn = useMemo(() => {
        return (existingReturns || []).some(
            (r: any) => r.status === 'PENDING' || r.status === 'RETURN_REQUESTED' || r.status === 'pending'
        );
    }, [existingReturns]);

    const { data: clinicalHistory } = useQuery<any>({
        queryKey: ["ipd", "clinical-history", admId],
        queryFn: () => ipdService.getClinicalHistory(admId),
        enabled: !!admId,
        refetchInterval: 5000,
    });

    const enrichedIssuances = useMemo(() => {
        if (!issuances.length) return [];

        // Use two maps for robust matching
        const administeredById: Record<string, number> = {};
        const administeredByName: Record<string, number> = {};

        if (clinicalHistory?.meds) {
            clinicalHistory.meds.forEach((m: any) => {
                const mid = (m.medicineId?._id || m.medicineId)?.toString();
                const drugName = (m.drugName || "").toLowerCase().trim();

                // If mid looks like an ObjectId (24 chars), use it as ID
                if (mid && mid.length === 24 && /^[0-9a-fA-F]+$/.test(mid)) {
                    administeredById[mid] = (administeredById[mid] || 0) + 1;
                } else {
                    // Otherwise, treat as name-based matching
                    const finalName = (mid || drugName).toLowerCase().trim();
                    if (finalName) {
                        administeredByName[finalName] = (administeredByName[finalName] || 0) + 1;
                    }
                }
            });
        }

        return issuances.map((iss) => {
            const newItems = (iss.items ?? []).map((item: any, idx: number) => {
                const issued = item.issuedQty ?? item.qty ?? 0;
                const returned = item.returnedQty ?? 0;
                let leftQty = issued - returned;
                let consumedCount = 0;

                if (leftQty > 0) {
                    const productId = (item.product?._id || item.product)?.toString();
                    const productGeneric = item.product?.generic?.toLowerCase() || "";
                    const productBrand = item.product?.brand?.toLowerCase() || "";
                    const productNameLow = item.productName?.toLowerCase() || "";

                    // 1. Primary Match: medicineId (Exact match)
                    if (productId && administeredById[productId] > 0) {
                        const toDeduct = Math.min(administeredById[productId], leftQty);
                        leftQty -= toDeduct;
                        consumedCount += toDeduct;
                        administeredById[productId] -= toDeduct;
                    }

                    // 2. Secondary Match: Name-based Fuzzy matching (if still left qty)
                    if (leftQty > 0) {
                        for (const drugName in administeredByName) {
                            if (administeredByName[drugName] <= 0) continue;

                            const drugBase = drugName.split(" ")[0];
                            const isMatch =
                                productNameLow.includes(drugBase) ||
                                productGeneric.includes(drugBase) ||
                                productBrand.includes(drugBase) ||
                                drugName.includes(productNameLow.split(" ")[0]);

                            if (isMatch) {
                                const toDeduct = Math.min(administeredByName[drugName], leftQty);
                                leftQty -= toDeduct;
                                consumedCount += toDeduct;
                                administeredByName[drugName] -= toDeduct;
                            }
                        }
                    }
                }

                return { ...item, _rawIdx: idx, _leftQty: leftQty, _consumedQty: consumedCount };
            });
            return { ...iss, items: newItems };
        });
    }, [issuances, clinicalHistory]);

    // We flatten the list for simplified return flows
    const allItems = useMemo(() => {
        let items: any[] = [];
        enrichedIssuances.forEach((iss: any) => {
            (iss.items || []).forEach((it: any) => {
                items.push({
                    ...it,
                    issuanceId: iss._id,
                    issuedAt: iss.issuedAt,
                    nurseName: iss.receivedByNurse?.name || iss.nurseNote || null,
                    issStatus: iss.status
                });
            });
        });
        // Sort by most recent first
        return items.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
    }, [enrichedIssuances]);

    const hasReturnRequests = allItems.some(i => i.issStatus === 'RETURN_REQUESTED');
    const returnableItems = allItems.filter(i => i._leftQty > 0);

    const [isReturnMode, setIsReturnMode] = useState(false);
    // returnQtys: Map of "issuanceId_rawIdx" -> qty
    const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
    const [globalReturnReason, setGlobalReturnReason] = useState("");
    const [submitting, setSubmitting] = useState<boolean>(false);
    // Track if a return was just submitted in this session to prevent re-click before data refreshes
    const [returnJustSubmitted, setReturnJustSubmitted] = useState(false);

    const handleBack = () => {
        setSelectedAdmission(null);
        setIsReturnMode(false);
        setReturnQtys({});
        setGlobalReturnReason("");
        setReturnJustSubmitted(false);
    };

    const handleReturnQtyChange = (key: string, val: number) => {
        setReturnQtys(prev => ({ ...prev, [key]: Math.max(0, val) }));
    };

    // Determine if the nurse can initiate a new return
    const canInitiateReturn = returnableItems.length > 0 && !isReturnMode && !returnJustSubmitted && !hasPendingReturn && !hasReturnRequests;

    const handleSubmitReturn = async () => {
        // Find which items have >=1 return qty selected
        const itemsToReturn = returnableItems
            .map(item => {
                const key = `${item.issuanceId}_${item._rawIdx}`;
                const qty = returnQtys[key] || 0;
                return { ...item, returnQty: qty };
            })
            .filter(item => item.returnQty > 0);

        if (!itemsToReturn.length) {
            toast.error("Enter return quantity for at least one medicine");
            return;
        }

        // We must submit them grouped by issuanceId because the backend endpoint expects issuanceId per request
        const groupedByIssuance: Record<string, any[]> = {};
        itemsToReturn.forEach((i: any) => {
            if (!groupedByIssuance[i.issuanceId]) groupedByIssuance[i.issuanceId] = [];

            groupedByIssuance[i.issuanceId].push({
                productId: i.productId || i.product?._id || i.product,
                productName: i.productName,
                batchId: i.batchId || i.batch?._id || i.batch,
                returnQty: i.returnQty
            });
        });

        setSubmitting(true);
        try {
            // Because backend expects 1 issuanceId per submitReturn... run conditionally in parallel
            const promises = Object.keys(groupedByIssuance).map(issId => {
                return ipdIssuanceService.submitReturn({
                    issuanceId: issId,
                    items: groupedByIssuance[issId].map((i: any) => ({
                        productId: i.productId,
                        returnedQty: i.returnQty,
                        reason: globalReturnReason || "Patient return",
                    })),
                    notes: globalReturnReason || "Submitted by nurse",
                });
            });
            await Promise.all(promises);

            toast.success("Return requests submitted successfully!");
            setIsReturnMode(false);
            setReturnQtys({});
            setGlobalReturnReason("");
            // Mark as just submitted so the button won't reappear before data refreshes
            setReturnJustSubmitted(true);

            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance", admId] });
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "medicine-returns", admId] });
        } catch (err: any) {
            toast.error(err?.message || "Failed to submit return request");
        } finally {
            setSubmitting(false);
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
                    {/* Search and Toggle Row */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full sm:max-w-md">
                            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                                placeholder="Search patients..."
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

                        {/* View Switcher Controls */}
                        <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm shrink-0">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "grid" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
                            >
                                <LayoutGrid size={14} />
                                {!search && "Grid"}
                            </button>
                            <button
                                onClick={() => setViewMode("table")}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "table" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
                            >
                                <List size={14} />
                                {!search && "Table"}
                            </button>
                        </div>
                    </div>

                    {/* Patient Content Rendering */}
                    {loadingAdmissions ? (
                        <div className="flex items-center justify-center py-16 gap-2 text-gray-400 text-sm">
                            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            Loading admitted patients...
                        </div>
                    ) : enrichedAdmissions.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <BedDouble size={48} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">
                                {search ? `No patients matching "${search}"` : "No active IPD admissions"}
                            </p>
                        </div>
                    ) : viewMode === "grid" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {enrichedAdmissions.map((adm: any) => {
                                const issuances = adm.nurseIssuances || [];
                                const totalMedicines = issuances.reduce((sum: number, iss: any) => sum + (iss.items?.length || 0), 0);

                                return (
                                    <button
                                        key={adm._id}
                                        onClick={() => setSelectedAdmission(adm)}
                                        className="w-full text-left bg-white dark:bg-gray-800 rounded-[28px] border border-gray-100 dark:border-gray-700 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xl transition-all relative group overflow-hidden flex flex-col pt-6"
                                    >
                                        <div className="px-6 flex items-start justify-between">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                                                    <User size={20} className="text-white" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-extrabold text-gray-800 dark:text-white text-base tracking-tight truncate pb-0.5">
                                                        {adm.patient?.name || "Unknown"}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold tracking-widest uppercase text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                                                            {adm.admissionId}
                                                        </span>
                                                        {adm.bed?.bedId && (
                                                            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                <BedDouble size={10} /> {adm.bed.bedId}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pharmacy Status Strip */}
                                        <div className="px-6 pb-2">
                                            <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${adm.pharmacyClearanceStatus === "CLEARED" ? "text-green-600" : "text-amber-500"}`}>
                                                {adm.pharmacyClearanceStatus === "CLEARED" ? (
                                                    <><CheckCircle2 size={12} /> Pharmacy Cleared</>
                                                ) : (
                                                    <><Clock size={12} /> Pending Medicine Returns</>
                                                )}
                                            </p>
                                        </div>

                                        {/* Preview of Medicines List for this Nurse */}
                                        <div className="mt-2 flex-grow bg-blue-50/50 dark:bg-gray-900/50 p-6 border-t border-gray-50 dark:border-gray-800 relative">
                                            <div className="flex items-center justify-between mb-3 text-[10px] uppercase tracking-widest font-black text-gray-400">
                                                <span>Medicines Billed To You</span>
                                                <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm">{totalMedicines} Items</span>
                                            </div>

                                            {issuances.length > 0 ? (
                                                <div className="space-y-3">
                                                    {issuances.slice(0, 2).map((iss: any, idx: number) => (
                                                        <div key={idx} className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-50 dark:border-gray-700 pb-1.5">
                                                                {new Date(iss.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(iss.issuedAt).toLocaleDateString()}
                                                            </p>
                                                            <div className="space-y-1.5">
                                                                {iss.items.slice(0, 2).map((item: any, i: number) => (
                                                                    <div key={i} className="flex justify-between items-center">
                                                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate pr-2 max-w-[70%]">{item.productName}</span>
                                                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">{item.issuedQty} QTY</span>
                                                                    </div>
                                                                ))}
                                                                {iss.items.length > 2 && (
                                                                    <p className="text-[10px] font-bold text-gray-400 mt-1 italic">+ {iss.items.length - 2} more items</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {issuances.length > 2 && (
                                                        <p className="text-xs font-bold text-blue-500 text-center pt-1">+ {issuances.length - 2} more sessions</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-6 opacity-40">
                                                    <Package size={24} className="mb-2 text-gray-400" />
                                                    <span className="text-xs font-medium text-gray-500">No medicines explicitly assigned</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action highlight */}
                                        <div className="bg-blue-600 dark:bg-blue-700 py-3.5 px-6 opacity-0 group-hover:opacity-100 transition-all flex justify-between items-center absolute bottom-0 left-0 w-full translate-y-full group-hover:translate-y-0">
                                            <span className="text-xs font-bold text-white uppercase tracking-widest">
                                                Manage Returns
                                            </span>
                                            <ArrowLeft size={16} className="rotate-180 text-white" />
                                        </div>
                                        <div className="h-0 group-hover:h-12 transition-all duration-300 pointer-events-none" />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        /* Table View for Patients */
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Patient Details</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Doctor</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Staff Nurse</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {enrichedAdmissions.map((adm: any) => (
                                        <tr key={adm._id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                                                        {adm.patient?.name?.charAt(0) || "P"}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{adm.patient?.name || "Unknown"}</p>
                                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{adm.admissionId}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                                        {adm.primaryDoctor?.user?.name || adm.primaryDoctor?.name || <span className="text-gray-300 italic">Not assigned</span>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                                        {adm.assignedNurse?.name || user?.name || <span className="text-gray-300 italic">Unassigned</span>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${adm.pharmacyClearanceStatus === "CLEARED" ? "bg-green-100 text-green-700" :
                                                        adm.pharmacyClearanceStatus === "PENDING" ? "bg-amber-100 text-amber-700" :
                                                            "bg-gray-100 text-gray-500"
                                                    }`}>
                                                    {adm.pharmacyClearanceStatus === "CLEARED" ? "Cleared" :
                                                        adm.pharmacyClearanceStatus === "PENDING" ? "Pending" :
                                                            "None"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setSelectedAdmission(adm)}
                                                    className="px-4 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-md active:scale-95"
                                                >
                                                    Open Portal
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <ClipboardList size={16} className="text-blue-500" />
                                    Billed Medicines
                                </h3>

                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Removed View Toggle as requested */}

                                    {hasReturnRequests && (
                                        <span className="text-[10px] text-yellow-600 font-bold bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-xl border border-yellow-200 flex items-center gap-1.5">
                                            <Clock size={12} /> Pending Approval
                                        </span>
                                    )}

                                    {(returnJustSubmitted || hasPendingReturn) && !hasReturnRequests && (
                                        <span className="text-[10px] text-green-600 font-bold bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-xl border border-green-200 flex items-center gap-1.5">
                                            <CheckCircle2 size={12} /> Return Request Submitted — Awaiting Pharmacy
                                        </span>
                                    )}

                                    {canInitiateReturn && (
                                        <button
                                            onClick={() => setIsReturnMode(true)}
                                            className="text-[10px] bg-orange-50 dark:bg-orange-900/20 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-xl font-bold hover:bg-orange-100 flex items-center gap-1.5 transition-colors shadow-sm uppercase tracking-widest"
                                        >
                                            <RotateCcw size={12} />
                                            Initiate Returns
                                        </button>
                                    )}
                                    {isReturnMode && (
                                        <button
                                            onClick={() => {
                                                setIsReturnMode(false);
                                                setReturnQtys({});
                                                setGlobalReturnReason("");
                                            }}
                                            className="text-[10px] bg-gray-100 dark:bg-gray-800 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-xl font-bold hover:bg-gray-200 flex items-center gap-1.5 transition-colors shadow-sm uppercase tracking-widest"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>

                            {loadingIssuances ? (
                                <div className="text-center py-10">
                                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <p className="text-xs text-gray-400">Loading history...</p>
                                </div>
                            ) : allItems.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <Package size={32} className="mx-auto text-gray-300 mb-2" />
                                    <p className="text-sm font-medium text-gray-500">No medicines have been assigned to you for this patient.</p>
                                </div>
                            ) : (
                                /* Fixed Table View for Medicines (Removed Grid as requested) */
                                <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Consolidated Table */}
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                                <th className="text-left px-5 py-3 font-semibold w-1/4">Medicine</th>
                                                <th className="text-left px-5 py-3 font-semibold">Issued Detail</th>
                                                <th className="text-center px-3 py-3 font-semibold text-green-600">Consumed</th>
                                                <th className="text-center px-3 py-3 font-semibold text-orange-500">Returned</th>
                                                <th className="text-center px-3 py-3 font-semibold text-blue-500">Left</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                            {allItems.map((item: any, idx: number) => {
                                                const issued = item.issuedQty ?? item.qty ?? 0;
                                                const returned = item.returnedQty ?? 0;
                                                const isRequested = item.issStatus === 'RETURN_REQUESTED';

                                                return (
                                                    <tr key={idx} className={`hover:bg-gray-50/50 dark:hover:bg-gray-700/20 ${isRequested ? 'opacity-50' : ''}`}>
                                                        <td className="px-5 py-4 font-bold text-gray-700 dark:text-gray-200 align-top">
                                                            {item.productName}
                                                        </td>
                                                        <td className="px-5 py-4 align-top">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[10px] font-black tracking-widest bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase">
                                                                    {issued} QTY
                                                                </span>
                                                                <span className="text-xs text-gray-400 font-medium">
                                                                    {new Date(item.issuedAt).toLocaleDateString("en-IN", {
                                                                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                                                    })}
                                                                </span>
                                                            </div>
                                                            {item.nurseName && (
                                                                <span className="text-[10px] text-teal-600 font-semibold flex items-center gap-1">
                                                                    <UserCheck size={10} /> {item.nurseName}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-4 text-center align-top">
                                                            <span className="text-green-600 font-bold bg-green-50/50 dark:bg-green-900/10 px-2 py-1 rounded">
                                                                {item._consumedQty}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-4 text-center align-top">
                                                            {isRequested ? (
                                                                <span className="text-[10px] border border-orange-200 text-orange-500 bg-orange-50 rounded px-1.5 py-0.5 font-bold">
                                                                    PROCESSING
                                                                </span>
                                                            ) : (
                                                                <span className="text-orange-500 font-bold bg-orange-50/50 dark:bg-orange-900/10 px-2 py-1 rounded">
                                                                    {returned}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-4 text-center align-top">
                                                            <span className={`font-bold px-2 py-1 rounded ${item._leftQty > 0 ? "text-blue-600 bg-blue-50/50" : "text-gray-400 bg-gray-50"}`}>
                                                                {item._leftQty}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    {/* Unified Return Form Overlay (if mode is active) */}
                                    {isReturnMode && (
                                        <div className="bg-orange-50/30 dark:bg-orange-900/10 border-t border-orange-100 p-6 animate-in slide-in-from-bottom-5">
                                            <h4 className="text-xs font-bold text-orange-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                                                <RotateCcw size={14} /> Returns Configuration
                                            </h4>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                                {returnableItems.map((item: any) => {
                                                    const max = item._leftQty;
                                                    const key = `${item.issuanceId}_${item._rawIdx}`;

                                                    return (
                                                        <div key={key} className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-orange-100 dark:border-gray-700 shadow-sm">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{item.productName}</p>
                                                                <p className="text-[10px] text-gray-400 mt-0.5" suppressHydrationWarning>{new Date(item.issuedAt).toLocaleTimeString()}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">Max: {max}</span>
                                                                <input
                                                                    type="number" min={0} max={max}
                                                                    value={returnQtys[key] ?? 0}
                                                                    onChange={(e) => handleReturnQtyChange(key, Number(e.target.value))}
                                                                    className="w-16 bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-800 rounded-lg px-2 py-1 text-sm font-bold text-center outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            <div className="max-w-xl">
                                                <input
                                                    type="text"
                                                    placeholder="Reason for return (required for pharmacy log)"
                                                    value={globalReturnReason}
                                                    onChange={(e) => setGlobalReturnReason(e.target.value)}
                                                    className="w-full bg-white dark:bg-gray-800 border border-orange-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 shadow-sm"
                                                />
                                                <button
                                                    onClick={handleSubmitReturn}
                                                    disabled={submitting}
                                                    className="mt-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md shadow-orange-500/20 w-auto"
                                                >
                                                    {submitting ? (
                                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing Returns...</>
                                                    ) : (
                                                        <><RotateCcw size={14} /> Submit Bulk Return to Pharmacy</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
