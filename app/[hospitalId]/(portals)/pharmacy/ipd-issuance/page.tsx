"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { ipdIssuanceService } from "@/lib/integrations/services/pharmacy.service";
import { ProductService } from "@/lib/integrations/services/product.service";
import { ipdService } from "@/lib/integrations/services/ipd.service";
import { apiClient } from "@/lib/integrations/api";
import {
    Search, Plus, Trash2, User, BedDouble, CheckCircle2,
    AlertTriangle, Package, Pill, ClipboardList,
    UserCheck, ArrowLeft, Pencil, RotateCcw, Check, X, Clock
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useTenantLink } from "@/hooks/useTenantLink";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IPDPatient {
    _id: string;
    admissionId: string;
    patient: { _id: string; name: string; mobile?: string };
    primaryDoctor?: { user?: { name: string } };
    bed?: { bedId?: string; type?: string };
    status: string;
    pharmacyClearanceStatus?: string;
}

interface IssuanceItem {
    productId: string;
    batchId: string;
    productName: string;
    issuedQty: number;
    unitPrice?: number;
}

interface ProductResult {
    _id: string;
    brandName: string;
    genericName: string;
    strength?: string;
    form?: string;
    mrp: number;
    currentStock: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IPDIssuancePage() {
    const router = useRouter();
    const params = useParams();
    const hospitalId = params?.hospitalId as string;
    const queryClient = useQueryClient();
    const { getPath } = useTenantLink();

    // ── Patient list state ──────────────────────────────────────────────────
    const [patientSearch, setPatientSearch] = useState("");
    const [selectedAdmission, setSelectedAdmission] = useState<IPDPatient | null>(null);

    // ── Issue form state ────────────────────────────────────────────────────
    const [showIssueForm, setShowIssueForm] = useState(false);
    const [notes, setNotes] = useState("");
    const [selectedNurseId, setSelectedNurseId] = useState("");
    const [items, setItems] = useState<IssuanceItem[]>([
        { productId: "", batchId: "", productName: "", issuedQty: 1, unitPrice: 0 },
    ]);
    const [medSearches, setMedSearches] = useState<string[]>([""]);
    const [medResults, setMedResults] = useState<ProductResult[][]>([[]]);

    // ── Fetch active admissions ─────────────────────────────────────────────
    const { data: admissions = [], isLoading: loadingAdmissions } = useQuery({
        queryKey: ["ipd", "active-admissions"],
        queryFn: () => ipdService.getActiveAdmissions(),
        refetchInterval: 30000,
    });

    const filteredAdmissions = (admissions as IPDPatient[]).filter((a) => {
        if (!patientSearch.trim()) return true;
        const q = patientSearch.toLowerCase().trim();
        return (
            a.patient?.name?.toLowerCase().includes(q) ||
            a.admissionId?.toLowerCase().includes(q) ||
            a.patient?.mobile?.includes(q)
        );
    });

    // ── Fetch nurses ────────────────────────────────────────────────────────
    const { data: nursesData } = useQuery({
        queryKey: ["hospital-admin", "nurses"],
        queryFn: () => apiClient<any>("/hospital-admin/nurses"),
        staleTime: 60000,
    });
    const nurses: any[] = nursesData?.nurses || nursesData?.data || nursesData || [];

    // ── Fetch issuances & summary for selected patient ──────────────────────
    const admId = selectedAdmission?.admissionId || "";

    const { data: issuances = [], isLoading: loadingIssuances } = useQuery({
        queryKey: ["pharmacy", "ipd-issuance", admId],
        queryFn: () => ipdIssuanceService.getIssuancesByAdmission(admId),
        enabled: !!admId,
        refetchInterval: 5000,
    });

    const { data: summary } = useQuery({
        queryKey: ["pharmacy", "ipd-issuance-summary", admId],
        queryFn: () => ipdIssuanceService.getIssuanceSummary(admId),
        enabled: !!admId,
        refetchInterval: 5000,
    });

    const { data: returns = [], isLoading: loadingReturns } = useQuery({
        queryKey: ["pharmacy", "medicine-returns", admId],
        queryFn: () => ipdIssuanceService.getReturnsByAdmission(admId),
        enabled: !!admId,
        refetchInterval: 5000,
    });

    // ── Issue mutation ──────────────────────────────────────────────────────
    const issueMutation = useMutation({
        mutationFn: ipdIssuanceService.issueForIPD,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance", admId] });
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance-summary", admId] });
            setShowIssueForm(false);
            resetForm();
            toast.success("Medicines issued successfully!");
        },
        onError: (err: any) => toast.error(err?.message || "Failed to issue medicines"),
    });

    const signoffMutation = useMutation({
        mutationFn: ipdIssuanceService.signoffPharmacy,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance-summary", admId] });
            toast.success("Pharmacy cleared!");
        },
    });

    const approveReturnMutation = useMutation({
        mutationFn: ipdIssuanceService.approveReturn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "medicine-returns", admId] });
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance-summary", admId] });
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance", admId] });
            toast.success("Return approved successfully!");
        },
        onError: (err: any) => toast.error(err?.message || "Failed to approve return"),
    });

    const rejectReturnMutation = useMutation({
        mutationFn: (id: string) => ipdIssuanceService.rejectReturn(id, "Rejected by pharmacist"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "medicine-returns", admId] });
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance-summary", admId] });
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance", admId] });
            toast.success("Return request rejected");
        }
    });

    // ── Helpers ─────────────────────────────────────────────────────────────

    const resetForm = () => {
        setItems([{ productId: "", batchId: "", productName: "", issuedQty: 1, unitPrice: 0 }]);
        setMedSearches([""]);
        setMedResults([[]]);
        setNotes("");
        setSelectedNurseId("");
    };

    const handleSelectAdmission = (adm: IPDPatient) => {
        setSelectedAdmission(adm);
        setShowIssueForm(false);
        resetForm();
    };

    const handleBack = () => {
        setSelectedAdmission(null);
        setShowIssueForm(false);
        resetForm();
    };

    const handleAddItem = () => {
        setItems([...items, { productId: "", batchId: "", productName: "", issuedQty: 1, unitPrice: 0 }]);
        setMedSearches([...medSearches, ""]);
        setMedResults([...medResults, []]);
    };

    const handleRemoveItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx));
        setMedSearches(medSearches.filter((_, i) => i !== idx));
        setMedResults(medResults.filter((_, i) => i !== idx));
    };

    const handleItemChange = (idx: number, field: keyof IssuanceItem, value: any) => {
        setItems(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
    };

    const handleSelectProduct = (idx: number, product: ProductResult) => {
        setItems(items.map((item, i) =>
            i === idx ? {
                ...item,
                productId: product._id,
                productName: `${product.brandName} ${product.strength || ""} ${product.form || ""}`.trim(),
                batchId: "",
                unitPrice: product.mrp,
            } : item
        ));
        const s = [...medSearches];
        s[idx] = `${product.brandName} ${product.strength || ""}`.trim();
        setMedSearches(s);
        const r = [...medResults];
        r[idx] = [];
        setMedResults(r);
    };

    // Debounced medicine search
    useEffect(() => {
        const timers = medSearches.map((q, idx) => {
            if (q.length < 2 || items[idx]?.productId) return null;
            return setTimeout(async () => {
                try {
                    const results = await ProductService.getProducts({ search: q });
                    setMedResults(prev => { const n = [...prev]; n[idx] = (results || []) as ProductResult[]; return n; });
                } catch {
                    setMedResults(prev => { const n = [...prev]; n[idx] = []; return n; });
                }
            }, 300);
        });
        return () => timers.forEach(t => t && clearTimeout(t));
    }, [medSearches]);

    const handleIssue = () => {
        const filled = items.filter(i => i.productId && i.issuedQty > 0);
        if (!filled.length) return toast.error("Add at least one medicine");
        const selectedNurse = nurses.find((n: any) => n._id === selectedNurseId);
        issueMutation.mutate({
            admissionId: admId,
            items: filled,
            notes,
            ...(selectedNurseId ? {
                receivedByNurse: selectedNurseId,
                nurseNote: selectedNurse?.name || selectedNurse?.user?.name || "Nurse",
            } : {}),
        });
    };

    const getClearanceColor = (s?: string) => {
        if (s === "CLEARED") return "bg-green-100 text-green-700 border border-green-200";
        if (s === "PENDING") return "bg-red-100 text-red-700 border border-red-200";
        return "bg-gray-100 text-gray-500 border border-gray-200";
    };

    const getStatusBadge = (s: string) => ({
        ISSUED: "bg-blue-100 text-blue-700",
        RETURN_REQUESTED: "bg-yellow-100 text-yellow-700",
        RETURN_APPROVED: "bg-green-100 text-green-700",
        RETURN_REJECTED: "bg-red-100 text-red-700",
    }[s] || "bg-gray-100 text-gray-600");

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">IPD Medicine Issuance</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Select an admitted patient to issue medicines and track pharmacy clearance.
                </p>
            </div>

            {/* ══ PATIENT LIST VIEW (no patient selected) ══════════════════════════════ */}
            {!selectedAdmission && (
                <div className="space-y-5">
                    {/* Search */}
                    <div className="relative">
                        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            className="w-full pl-10 pr-10 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            placeholder="Filter by patient name or admission ID..."
                            value={patientSearch}
                            onChange={(e) => setPatientSearch(e.target.value)}
                        />
                        {patientSearch && (
                            <button
                                onClick={() => setPatientSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-lg"
                            >×</button>
                        )}
                    </div>

                    {/* Count */}
                    {!loadingAdmissions && (
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {filteredAdmissions.length} Active Admission{filteredAdmissions.length !== 1 ? "s" : ""}
                        </p>
                    )}

                    {/* Patient Cards Grid */}
                    {loadingAdmissions ? (
                        <div className="flex items-center justify-center py-16 gap-2 text-gray-400 text-sm">
                            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            Loading admitted patients...
                        </div>
                    ) : filteredAdmissions.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <BedDouble size={48} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">
                                {patientSearch ? `No patients matching "${patientSearch}"` : "No active IPD admissions"}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredAdmissions.map((adm) => (
                                <div key={adm._id} className="relative group">
                                    <button
                                        onClick={() => handleSelectAdmission(adm)}
                                        className="w-full text-left bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all p-5"
                                    >
                                        {/* Patient name + avatar */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-11 h-11 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
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

                                        {/* Info row */}
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2">
                                                <p className="text-xs text-gray-400 mb-0.5">Bed</p>
                                                <p className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1">
                                                    <BedDouble size={10} className="text-blue-500" />
                                                    {adm.bed?.bedId || "—"}
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-3 py-2">
                                                <p className="text-xs text-gray-400 mb-0.5">Status</p>
                                                <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{adm.status}</p>
                                            </div>
                                        </div>

                                        {adm.primaryDoctor?.user?.name && (
                                            <p className="text-xs text-gray-400 mb-3 truncate">
                                                {adm.primaryDoctor.user.name.startsWith('Dr.') ? adm.primaryDoctor.user.name : `Dr. ${adm.primaryDoctor.user.name}`}
                                            </p>
                                        )}

                                        {/* Pharmacy clearance */}
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block ${getClearanceColor(adm.pharmacyClearanceStatus)}`}>
                                            {adm.pharmacyClearanceStatus === "CLEARED"
                                                ? "✓ Pharmacy Cleared"
                                                : adm.pharmacyClearanceStatus === "PENDING"
                                                    ? "⏳ Clearance Pending"
                                                    : "Not Required"}
                                        </span>
                                    </button>

                                    {/* Edit icon — navigates to IPD Billing with this patient pre-selected */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(getPath(`/pharmacy/ipd-billing?admissionId=${adm.admissionId}`));
                                        }}
                                        title="Add to IPD Bill"
                                        className="absolute top-3 right-3 w-8 h-8 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-xl flex items-center justify-center hover:bg-teal-100 dark:hover:bg-teal-800/40 transition-colors shadow-sm border border-teal-100 dark:border-teal-800/30"
                                    >
                                        <Pencil size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══ PATIENT DETAIL VIEW (patient selected) ════════════════════════════ */}
            {selectedAdmission && (
                <div>
                    {/* Back button */}
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-600 mb-5"
                    >
                        <ArrowLeft size={15} /> Back to all patients
                    </button>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* LEFT col */}
                        <div className="xl:col-span-2 space-y-5">

                            {/* ── Patient Card ── */}
                            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                <div className="bg-linear-to-r from-blue-600 to-indigo-600 p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                                                <User size={24} className="text-white" />
                                            </div>
                                            <div>
                                                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Selected Patient</p>
                                                <p className="text-white text-2xl font-bold">{selectedAdmission.patient?.name}</p>
                                                <p className="text-white/60 text-xs mt-1 font-mono">{selectedAdmission.admissionId}</p>
                                                {selectedAdmission.patient?.mobile && (
                                                    <p className="text-white/60 text-xs">📞 {selectedAdmission.patient.mobile}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right space-y-2">
                                            {selectedAdmission.bed?.bedId && (
                                                <div className="bg-white/10 rounded-2xl px-4 py-2 flex items-center gap-2">
                                                    <BedDouble size={14} className="text-white/70" />
                                                    <span className="text-white font-bold text-sm">{selectedAdmission.bed.bedId}</span>
                                                </div>
                                            )}
                                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold block text-center ${getClearanceColor(selectedAdmission.pharmacyClearanceStatus)}`}>
                                                {selectedAdmission.pharmacyClearanceStatus || "NOT_REQUIRED"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Summary stats */}
                                {summary && (
                                    <div className="grid grid-cols-4 divide-x dark:divide-gray-700">
                                        {[
                                            { label: "Issued", val: (summary as any).totalIssued ?? 0, color: "text-blue-600" },
                                            { label: "Returned", val: (summary as any).totalReturned ?? 0, color: "text-orange-500" },
                                            { label: "Consumed", val: (summary as any).totalConsumed ?? 0, color: "text-green-600" },
                                            { label: "Net Bill", val: `₹${((summary as any).netBillableAmount ?? 0).toFixed(2)}`, color: "text-purple-600" },
                                        ].map((s) => (
                                            <div key={s.label} className="p-4 text-center">
                                                <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                                                <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Warning */}
                                {(summary as any)?.pendingReturnRequests > 0 && (
                                    <div className="mx-5 mb-4 mt-1 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-2xl px-4 py-2.5 flex items-center gap-2 text-xs text-amber-700">
                                        <AlertTriangle size={13} className="shrink-0" />
                                        {(summary as any).pendingReturnRequests} pending return request(s).
                                    </div>
                                )}

                                {(summary as any)?.pharmacyClearanceStatus === "PENDING" && (
                                    <div className="px-5 pb-5">
                                        <button
                                            onClick={() => signoffMutation.mutate(admId)}
                                            disabled={signoffMutation.isPending}
                                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-2xl text-sm font-bold uppercase tracking-wider transition-colors disabled:opacity-60"
                                        >
                                            <CheckCircle2 size={16} />
                                            {signoffMutation.isPending ? "Processing..." : "Manual Sign-Off"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* The manual generic issuance form was removed. Medicines are issued dynamically from IPD Billing. */}

                            {/* ── Return Requests ── */}
                            {(returns as any[]).length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-orange-200 dark:border-orange-800/40 shadow-sm p-6 mb-6">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-2xl">
                                            <RotateCcw size={18} />
                                        </div>
                                        <h3 className="text-base font-bold text-gray-800 dark:text-white">Medicine Return Requests</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {(returns as any[]).map((ret: any) => (
                                            <div key={ret._id} className="border border-orange-100 dark:border-orange-900/40 rounded-2xl overflow-hidden bg-orange-50/30 dark:bg-orange-900/10">
                                                <div className="px-5 py-3 flex items-center justify-between border-b border-orange-100 dark:border-orange-900/30">
                                                    <div>
                                                        <p className="text-xs font-bold text-orange-800 dark:text-orange-400">
                                                            Returned By: {ret.returnedBy?.name || "Nurse"}
                                                        </p>
                                                        <p className="text-xs text-orange-500/70 mt-0.5">
                                                            {new Date(ret.createdAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {ret.status === "PENDING" ? (
                                                            <>
                                                                <button
                                                                    onClick={() => approveReturnMutation.mutate(ret._id)}
                                                                    disabled={approveReturnMutation.isPending}
                                                                    className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                                                >
                                                                    <Check size={14} /> Approve & Update Stock
                                                                </button>
                                                                <button
                                                                    onClick={() => rejectReturnMutation.mutate(ret._id)}
                                                                    disabled={rejectReturnMutation.isPending}
                                                                    className="flex items-center gap-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                                                >
                                                                    <X size={14} /> Reject
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ret.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                                }`}>
                                                                {ret.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <table className="w-full text-xs">
                                                    <thead className="bg-orange-100/50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 uppercase text-[10px] tracking-wider">
                                                        <tr>
                                                            <th className="px-5 py-2 text-left font-bold">Medicine</th>
                                                            <th className="px-4 py-2 text-center font-bold">Qty Returned</th>
                                                            <th className="px-5 py-2 text-left font-bold">Reason</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-orange-100 dark:divide-orange-900/30">
                                                        {(ret.items || []).map((item: any, i: number) => (
                                                            <tr key={i}>
                                                                <td className="px-5 py-2.5 font-bold text-gray-700 dark:text-gray-300">{item.productName}</td>
                                                                <td className="px-4 py-2.5 text-center font-bold text-orange-600">{item.returnedQty}</td>
                                                                <td className="px-5 py-2.5 text-gray-500">{item.reason || "—"}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Issuance History ── */}
                            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl">
                                        <ClipboardList size={18} />
                                    </div>
                                    <h3 className="text-base font-bold text-gray-800 dark:text-white">Medicines Issued to Patient</h3>
                                </div>

                                {loadingIssuances ? (
                                    <div className="flex items-center justify-center py-8 gap-2 text-gray-400 text-sm">
                                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                        Loading...
                                    </div>
                                ) : (issuances as any[]).length === 0 ? (
                                    <div className="text-center py-10 text-gray-400">
                                        <Pill size={36} className="mx-auto mb-3 opacity-20" />
                                        <p className="text-sm">No medicines issued yet.</p>
                                        <button onClick={() => setShowIssueForm(true)} className="mt-4 bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-blue-700">
                                            Issue First Batch
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {(issuances as any[]).map((iss: any) => (
                                            <div key={iss._id} className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                                                <div className="bg-gray-50 dark:bg-gray-700/30 px-5 py-3 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-500">
                                                            By: <span className="text-gray-700 dark:text-gray-300">{iss.issuedBy?.name || "—"}</span>
                                                            {iss.issuedToNurse?.name && (
                                                                <span className="ml-2 text-blue-600">→ Nurse: {iss.issuedToNurse.name}</span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                            {new Date(iss.issuedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                        </p>
                                                    </div>
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadge(iss.status)}`}>
                                                        {iss.status?.replace(/_/g, " ")}
                                                    </span>
                                                </div>
                                                <table className="w-full text-xs">
                                                    <thead className="text-gray-400 uppercase border-b dark:border-gray-700">
                                                        <tr>
                                                            <th className="px-5 py-2.5 text-left">Medicine</th>
                                                            <th className="px-4 py-2.5 text-center">Batch</th>
                                                            <th className="px-4 py-2.5 text-center">Issued</th>
                                                            <th className="px-4 py-2.5 text-center">Returned</th>
                                                            <th className="px-4 py-2.5 text-right">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {iss.items?.map((item: any, i: number) => (
                                                            <tr key={i} className="border-t dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                                                <td className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">{item.productName}</td>
                                                                <td className="px-4 py-3 text-center text-gray-400 font-mono">{item.batchNo || "—"}</td>
                                                                <td className="px-4 py-3 text-center font-bold text-blue-600">{item.issuedQty}</td>
                                                                <td className="px-4 py-3 text-center font-bold text-orange-500">{item.returnedQty ?? 0}</td>
                                                                <td className="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-300">₹{item.totalAmount}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="border-t-2 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/20">
                                                            <td colSpan={4} className="px-5 py-2.5 text-xs font-bold text-gray-500 uppercase">Total</td>
                                                            <td className="px-4 py-2.5 text-right font-bold text-gray-800 dark:text-white">₹{iss.totalAmount}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                                {iss.notes && (
                                                    <div className="px-5 py-2.5 border-t dark:border-gray-700 text-xs text-gray-400">
                                                        📝 {iss.notes}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Nurse quick-pick */}
                        <div className="space-y-4">
                            {nurses.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <UserCheck size={12} /> On-Duty Nurses
                                    </p>
                                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                        {nurses.slice(0, 10).map((nurse: any) => (
                                            <button
                                                key={nurse._id}
                                                onClick={() => setSelectedNurseId(n => n === nurse._id ? "" : nurse._id)}
                                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${selectedNurseId === nurse._id
                                                    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30"
                                                    : "hover:bg-gray-50 dark:hover:bg-gray-700/30"}`}
                                            >
                                                <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                                                    <User size={12} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{nurse.name || nurse.user?.name}</p>
                                                    {nurse.department && <p className="text-xs text-gray-400">{nurse.department}</p>}
                                                </div>
                                                {selectedNurseId === nurse._id && <CheckCircle2 size={14} className="text-blue-500 shrink-0" />}
                                            </button>
                                        ))}
                                    </div>

                                    {selectedNurseId && (
                                        <div className="mt-3 pt-3 border-t dark:border-gray-700">
                                            <p className="text-xs text-blue-600 font-bold">
                                                ✓ Selected: {nurses.find(n => n._id === selectedNurseId)?.name || "Nurse"}
                                            </p>
                                            <button onClick={() => setSelectedNurseId("")} className="text-xs text-gray-400 hover:text-gray-600 mt-1">
                                                Clear selection
                                            </button>
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
