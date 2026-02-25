"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ipdIssuanceService } from "@/lib/integrations/services/pharmacy.service";
import { ProductService } from "@/lib/integrations/services/product.service";
import { ipdService } from "@/lib/integrations/services/ipd.service";
import { apiClient } from "@/lib/integrations/api";
import {
    Search, User, BedDouble, CheckCircle2,
    AlertTriangle, Pill, ClipboardList, IndianRupee, Wallet,
    UserCheck, ArrowLeft, Pencil, RotateCcw, Check, X, Clock, Fingerprint, ArrowRight
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
    const searchParams = useSearchParams();
    const hospitalId = params?.hospitalId as string;
    const urlAdmissionId = searchParams.get("admissionId");
    const queryClient = useQueryClient();
    const { getPath } = useTenantLink();

    // ── Patient list state ──────────────────────────────────────────────────
    const [patientSearch, setPatientSearch] = useState("");
    const [manualSelectionId, setManualSelectionId] = useState<string | null>(null);

    // ── Issue form state ────────────────────────────────────────────────────
    const [showIssueForm, setShowIssueForm] = useState(false);
    const [overrideMismatch, setOverrideMismatch] = useState<{ missingItems: any[] } | null>(null);
    const [overrideReason, setOverrideReason] = useState("");
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

    // Derive selected admission from URL or manual state
    const selectedAdmission = useMemo(() => {
        const id = urlAdmissionId || manualSelectionId;
        if (!id || admissions.length === 0) return null;
        return (admissions as any[]).find((a: any) => a.admissionId === id) || null;
    }, [urlAdmissionId, manualSelectionId, admissions]);

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
        mutationFn: (payload: { admissionId: string, forceOverride?: boolean, overrideReason?: string }) =>
            ipdIssuanceService.signoffPharmacy(payload),
        onSuccess: (res: any) => {
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance-summary", admId] });
            toast.success(res?.message || "Pharmacy cleared!");
            setOverrideMismatch(null);
            setOverrideReason("");
        },
        onError: (err: any) => {
            if (err?.mismatch && err?.data?.missingItems) {
                setOverrideMismatch({ missingItems: err.data.missingItems });
                toast.error(err.message || "Medicine mismatch detected!");
            } else {
                toast.error(err?.message || "Failed to sign-off");
            }
        }
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
        router.push(getPath(`/pharmacy/ipd-issuance?admissionId=${adm.admissionId}`));
        setManualSelectionId(adm.admissionId);
        setShowIssueForm(false);
        resetForm();
    };

    const handleBack = () => {
        router.push(getPath("/pharmacy/ipd-issuance"));
        setManualSelectionId(null);
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
    }, [medSearches, items]);

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
                    {/* Search - Reduced Width */}
                    <div className="relative max-w-md group">
                        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-[12px] font-bold outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-400"
                            placeholder="Search by Name, MRN or ID..."
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

                    {/* Table View */}
                    <div className="bg-white dark:bg-[#111] rounded-4xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient / Reference</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Bed Info</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Primary Doctor</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Dept Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Clearance</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                    {loadingAdmissions ? (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fetching Active Admissions...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredAdmissions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center italic text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                                                No clinical records match your search
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAdmissions.map((adm) => (
                                            <tr key={adm._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-all group cursor-pointer" onClick={() => handleSelectAdmission(adm)}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600 border border-blue-100 dark:border-blue-800/50 font-black text-xs">
                                                            {adm.patient?.name?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{adm.patient?.name}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <Fingerprint size={10} className="text-gray-400" />
                                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                                                    MRN: {(adm.patient as any)?.mrn || 'N/A'}
                                                                    <span className="mx-1.5 opacity-30">|</span>
                                                                    ADM: {adm.admissionId}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                                        <BedDouble size={10} className="text-blue-500" />
                                                        <span className="text-[10px] font-black text-gray-600 dark:text-gray-400">{adm.bed?.bedId || '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase">
                                                        {adm.primaryDoctor?.user?.name || 'Not Assigned'}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.05em]">
                                                        {adm.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${adm.pharmacyClearanceStatus === "CLEARED"
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                                        : adm.pharmacyClearanceStatus === "PENDING"
                                                            ? "bg-rose-50 text-rose-600 border-rose-200 animate-pulse"
                                                            : "bg-gray-50 text-gray-400 border-gray-200"
                                                        }`}>
                                                        {adm.pharmacyClearanceStatus === "CLEARED" ? "CLEARED" : adm.pharmacyClearanceStatus || "NOT REQUIRED"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.push(getPath(`/pharmacy/ipd-billing?admissionId=${adm.admissionId}`));
                                                            }}
                                                            className="px-3 py-1.5 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-lg hover:bg-teal-600 hover:text-white transition-all border border-teal-100 dark:border-teal-800/30 text-[9px] font-black uppercase flex items-center gap-2"
                                                        >
                                                            <Pencil size={10} />
                                                            Edit Bill
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
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
                                        {!overrideMismatch ? (
                                            <button
                                                onClick={() => signoffMutation.mutate({ admissionId: admId })}
                                                disabled={signoffMutation.isPending}
                                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-2xl text-sm font-bold uppercase tracking-wider transition-colors disabled:opacity-60 w-full justify-center"
                                            >
                                                <CheckCircle2 size={16} />
                                                {signoffMutation.isPending ? "Verifying Stock..." : "Verify & Sign-Off"}
                                            </button>
                                        ) : (
                                            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-3xl p-5 mb-4">
                                                <h4 className="text-red-700 dark:text-red-400 font-bold mb-3 flex items-center gap-2">
                                                    <AlertTriangle size={18} />
                                                    Discrepancy Detected
                                                </h4>
                                                <p className="text-red-600 dark:text-red-300 text-xs mb-4 leading-relaxed">
                                                    The system found medicines that were issued but neither consumed nor physically returned. You cannot normally sign off until these are verified or a return request is submitted.
                                                </p>

                                                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-100 dark:border-red-900 overflow-hidden mb-4">
                                                    <table className="w-full text-xs text-left">
                                                        <thead className="bg-red-100/50 dark:bg-red-900/40 text-red-700 dark:text-red-400">
                                                            <tr>
                                                                <th className="px-4 py-2 font-bold">Missing Medicine</th>
                                                                <th className="px-2 py-2 text-center font-bold">Issued</th>
                                                                <th className="px-2 py-2 text-center font-bold">Consumed</th>
                                                                <th className="px-2 py-2 text-center font-bold">Returned</th>
                                                                <th className="px-2 py-2 text-center text-red-600 font-bold">Variance</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-red-100 dark:divide-red-900/50">
                                                            {overrideMismatch.missingItems.map((m: any, i: number) => (
                                                                <tr key={i} className="dark:text-gray-300 hover:bg-red-50/50 dark:hover:bg-red-900/20">
                                                                    <td className="px-4 py-2.5 font-bold">{m.medicine}</td>
                                                                    <td className="px-2 py-2.5 text-center text-blue-600 font-bold">{m.issued}</td>
                                                                    <td className="px-2 py-2.5 text-center text-green-600 font-bold">{m.consumed}</td>
                                                                    <td className="px-2 py-2.5 text-center text-orange-500 font-bold">{m.returned}</td>
                                                                    <td className="px-2 py-2.5 text-center text-red-600 font-bold text-sm bg-red-100/30 dark:bg-red-900/30">{m.missing}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                <label className="block text-xs font-bold text-red-800 dark:text-red-300 mb-1">Override Reason (Mandatory if forcing sign-off)</label>
                                                <textarea
                                                    value={overrideReason}
                                                    onChange={e => setOverrideReason(e.target.value)}
                                                    placeholder="Specify why you are clearing this physically missing stock..."
                                                    className="w-full text-sm p-3 rounded-2xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 h-20"
                                                />

                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setOverrideMismatch(null);
                                                            setOverrideReason("");
                                                        }}
                                                        className="flex-1 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 py-3 rounded-2xl text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        Cancel & Check with Nurse
                                                    </button>
                                                    <button
                                                        onClick={() => signoffMutation.mutate({ admissionId: admId, forceOverride: true, overrideReason })}
                                                        disabled={signoffMutation.isPending || !overrideReason.trim()}
                                                        className="flex-1 bg-red-600 text-white py-3 rounded-2xl text-xs font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                                    >
                                                        {signoffMutation.isPending ? "Forcing..." : "Force Sign-Off Anyway"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
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
                                                            <th className="px-4 py-2.5 text-center text-orange-500">Returned</th>
                                                            <th className="px-4 py-2.5 text-right">Unit Rate</th>
                                                            <th className="px-4 py-2.5 text-right">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {iss.items?.map((item: any, i: number) => {
                                                            const returnedAmt = (item.returnedQty || 0) * (item.unitRate || item.totalAmount / item.issuedQty);
                                                            return (
                                                                <tr key={i} className="border-t dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                                                    <td className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">{item.productName}</td>
                                                                    <td className="px-4 py-3 text-center text-gray-400 font-mono">{item.batchNo || "—"}</td>
                                                                    <td className="px-4 py-3 text-center font-bold text-blue-600">{item.issuedQty}</td>
                                                                    <td className={`px-4 py-3 text-center font-bold ${item.returnedQty > 0 ? "text-orange-500 bg-orange-50/30" : "text-gray-300"}`}>
                                                                        {item.returnedQty || 0}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-gray-500">₹{(item.unitRate || item.totalAmount / item.issuedQty).toFixed(2)}</td>
                                                                    <td className="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-300">
                                                                        <div>₹{item.totalAmount.toFixed(2)}</div>
                                                                        {item.returnedQty > 0 && (
                                                                            <div className="text-[10px] text-orange-600">- ₹{returnedAmt.toFixed(2)}</div>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="border-t-2 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20">
                                                            <td colSpan={5} className="px-5 py-2.5 text-xs font-bold text-gray-500 uppercase text-right">Issuance Subtotal</td>
                                                            <td className="px-4 py-2.5 text-right font-bold text-gray-800 dark:text-white">₹{iss.totalAmount.toFixed(2)}</td>
                                                        </tr>
                                                        {iss.items?.some((it: any) => it.returnedQty > 0) && (
                                                            <tr className="bg-orange-50/20 dark:bg-orange-900/10">
                                                                <td colSpan={5} className="px-5 py-2.5 text-xs font-bold text-orange-600 uppercase text-right">(-) Total Return Credit</td>
                                                                <td className="px-4 py-2.5 text-right font-bold text-orange-600">
                                                                    - ₹{iss.items.reduce((sum: number, it: any) => sum + ((it.returnedQty || 0) * (it.unitRate || it.totalAmount / it.issuedQty)), 0).toFixed(2)}
                                                                </td>
                                                            </tr>
                                                        )}
                                                        <tr className="bg-blue-50/30 dark:bg-blue-900/10 border-t border-blue-100 dark:border-blue-900">
                                                            <td colSpan={5} className="px-5 py-3 text-xs font-black text-blue-700 dark:text-blue-400 uppercase text-right tracking-widest">Net Payable</td>
                                                            <td className="px-4 py-3 text-right font-black text-blue-800 dark:text-blue-300 text-sm">
                                                                ₹{(iss.totalAmount - iss.items.reduce((sum: number, it: any) => sum + ((it.returnedQty || 0) * (it.unitRate || it.totalAmount / it.issuedQty)), 0)).toFixed(2)}
                                                            </td>
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

                            {/* ── Financial Summary ── */}
                            {summary && (
                                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                                            Bill Preview
                                        </span>
                                        <Wallet size={14} className="text-blue-500" />
                                    </div>

                                    {/* Patient Info Section */}
                                    <div className="px-5 py-4 bg-blue-50/30 dark:bg-blue-900/10 border-b border-gray-100 dark:border-gray-700">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-blue-400"></div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Patient Details</p>
                                            </div>
                                            <div className="grid grid-cols-1 gap-y-2">
                                                <div>
                                                    <p className="text-sm font-black text-gray-800 dark:text-white leading-tight">{selectedAdmission.patient?.name}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <p className="text-[8px] font-bold text-gray-400 uppercase">MRN Number</p>
                                                        <p className="text-[10px] font-black text-gray-600 dark:text-gray-300">{(selectedAdmission.patient as any)?.mrn || "N/A"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-bold text-gray-400 uppercase">Mobile</p>
                                                        <p className="text-[10px] font-black text-gray-600 dark:text-gray-300">{selectedAdmission.patient?.mobile || "N/A"}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-bold text-gray-400 uppercase">Admission#</p>
                                                    <p className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">{selectedAdmission.admissionId}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 font-medium flex items-center gap-2">
                                                <span className="w-1 h-1 rounded-full bg-gray-300 inline-block"></span>
                                                Total Issued
                                            </span>
                                            <span className="font-bold text-gray-800 dark:text-white">₹{((summary as any).totalIssuedAmount ?? 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-orange-500 font-medium flex items-center gap-2">
                                                <span className="w-1 h-1 rounded-full bg-orange-400 inline-block"></span>
                                                Total Returned
                                            </span>
                                            <span className="font-bold text-orange-600">-₹{((summary as any).totalReturnedAmount ?? 0).toFixed(2)}</span>
                                        </div>
                                        <div className="pt-4 border-t border-dashed border-gray-200 dark:border-gray-700 flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                                    <IndianRupee size={10} />
                                                    Net Payable
                                                </p>
                                                <p className="text-[9px] text-gray-400 italic font-medium leading-none">Pharmacy Statement</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-black text-blue-700 dark:text-blue-400 leading-none">
                                                    ₹{((summary as any).netBillableAmount ?? 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
