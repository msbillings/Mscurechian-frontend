"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
    Search,
    Plus,
    Trash2,
    Save,
    User,
    ShoppingCart,
    BedDouble,
    Calculator,
    AlertCircle,
    CheckCircle2,
    Clock,
    Info,
    UserCheck,
    RotateCcw,
    Package,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { ipdService } from "@/lib/integrations/services/ipd.service";
import { ipdIssuanceService } from "@/lib/integrations/services/pharmacy.service";
import { PharmacyBillingService } from "@/lib/integrations/services/pharmacyBilling.service";
import { ProductService } from "@/lib/integrations/services/product.service";
import { PharmacyProduct } from "@/lib/integrations/types/product";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/integrations/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CartItem {
    productId: string;
    productName: string;
    qty: number;
    unitRate: number;
    total: number;
    gstPct: number;
}

interface IPDPatient {
    _id: string;
    admissionId: string;
    patient: { _id: string; name: string; mobile?: string; age?: number };
    primaryDoctor?: { name: string };
    bed?: { bedId?: string };
    status: string;
    pharmacyClearanceStatus?: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PharmacyIPDBillingPage() {
    const searchParams = useSearchParams();
    const preselectedAdmId = searchParams.get("admissionId");
    const orderId = searchParams.get("orderId");

    // Patient search
    const [patientSearch, setPatientSearch] = useState("");
    const [selectedAdmission, setSelectedAdmission] = useState<IPDPatient | null>(null);

    // Medicine search
    const [medSearch, setMedSearch] = useState("");
    const [medResults, setMedResults] = useState<PharmacyProduct[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<PharmacyProduct | null>(null);
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(0);
    const [isSearchingMed, setIsSearchingMed] = useState(false);

    // Active Prescription (if passed from Order)
    const [prescribedMedicines, setPrescribedMedicines] = useState<any[]>([]);
    const [processingMedIndex, setProcessingMedIndex] = useState<number | null>(null);

    // Nurse
    const [selectedNurseId, setSelectedNurseId] = useState("");

    // Cart
    const [cart, setCart] = useState<CartItem[]>([]);
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [savedBills, setSavedBills] = useState<any[]>([]);

    // Fetch active IPD admissions
    const { data: admissions = [], isLoading: loadingAdmissions } = useQuery({
        queryKey: ["ipd", "active-admissions"],
        queryFn: () => ipdService.getActiveAdmissions(),
        refetchInterval: 30000,
    });

    // Fetch nurses
    const { data: nursesData } = useQuery({
        queryKey: ["hospital-admin", "nurses"],
        queryFn: () => apiClient<any>("/hospital-admin/nurses"),
        staleTime: 60000,
    });
    const nurses: any[] = nursesData?.nurses || nursesData?.data || nursesData || [];

    // Auto-select patient from URL param (when navigated from IPD Issuance)
    useEffect(() => {
        if (!preselectedAdmId || !admissions || (admissions as IPDPatient[]).length === 0) return;
        const found = (admissions as IPDPatient[]).find(
            (a) => a.admissionId === preselectedAdmId || a._id === preselectedAdmId
        );
        if (found) setSelectedAdmission(found);
    }, [preselectedAdmId, admissions]);

    // Filter admissions by search — name, admission ID, or mobile
    const filteredAdmissions = (admissions as IPDPatient[]).filter((a) => {
        if (!patientSearch.trim()) return true; // show ALL if no search
        const q = patientSearch.toLowerCase().trim();
        return (
            a.patient?.name?.toLowerCase().includes(q) ||
            a.admissionId?.toLowerCase().includes(q) ||
            a.patient?.mobile?.includes(q)
        );
    });

    // Fetch billing summary for selected admission
    const { data: billSummary, refetch: refetchSummary } = useQuery({
        queryKey: ["ipd", "bill-summary", selectedAdmission?._id],
        queryFn: () => ipdService.getBillSummary(selectedAdmission!._id),
        enabled: !!selectedAdmission,
    });

    // Fetch issuances for selected patient (medicines already given)
    const queryClient = useQueryClient();
    const admId = selectedAdmission?.admissionId || "";
    const { data: issuances = [], refetch: refetchIssuances } = useQuery({
        queryKey: ["pharmacy", "ipd-issuance", admId],
        queryFn: () => ipdIssuanceService.getIssuancesByAdmission(admId),
        enabled: !!admId,
    });

    // Fetch prescribed medicines if orderId exists
    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) return;
            try {
                const res = await PharmacyBillingService.getPharmacyOrder(orderId);
                if (res.pharmacyOrder && res.pharmacyOrder.medicines) {
                    setPrescribedMedicines(res.pharmacyOrder.medicines.map((m: any) => ({
                        ...m,
                        processed: false
                    })));
                }
            } catch (err) {
                console.error("Failed to fetch prescription details", err);
            }
        };
        fetchOrder();
    }, [orderId]);

    // Return state
    const [expandedIssuance, setExpandedIssuance] = useState<string | null>(null);
    const [returnQtys, setReturnQtys] = useState<Record<string, Record<number, number>>>({});
    const [returnReasons, setReturnReasons] = useState<Record<string, string>>({});
    const [submittingReturn, setSubmittingReturn] = useState<string | null>(null);

    const handleReturnQtyChange = (issuanceId: string, itemIdx: number, val: number) => {
        setReturnQtys(prev => ({
            ...prev,
            [issuanceId]: { ...prev[issuanceId], [itemIdx]: Math.max(0, val) }
        }));
    };

    const handleSubmitReturn = async (iss: any) => {
        const qtys = returnQtys[iss._id] || {};
        const returnItems = iss.items
            .map((item: any, idx: number) => ({
                productId: item.productId,
                productName: item.productName,
                batchId: item.batchId,
                returnQty: qtys[idx] ?? 0,
            }))
            .filter((i: any) => i.returnQty > 0);

        if (!returnItems.length) return toast.error("Enter return quantity for at least one medicine");

        setSubmittingReturn(iss._id);
        try {
            await apiClient("/pharmacy/medicine-return", {
                method: "POST",
                body: JSON.stringify({
                    issuanceId: iss._id,
                    admissionId: admId,
                    items: returnItems,
                    reason: returnReasons[iss._id] || "Patient return",
                }),
            });
            toast.success("Return request submitted!");
            setReturnQtys(prev => { const n = { ...prev }; delete n[iss._id]; return n; });
            setReturnReasons(prev => { const n = { ...prev }; delete n[iss._id]; return n; });
            setExpandedIssuance(null);
            refetchIssuances();
        } catch (err: any) {
            toast.error(err?.message || "Failed to submit return");
        } finally {
            setSubmittingReturn(null);
        }
    };

    // Medicine search with debounce
    useEffect(() => {
        if (medSearch.length < 2) {
            setMedResults([]);
            return;
        }
        setIsSearchingMed(true);
        const t = setTimeout(async () => {
            try {
                const results = await ProductService.getProducts({ search: medSearch });
                setMedResults(results || []);
            } catch {
                setMedResults([]);
            } finally {
                setIsSearchingMed(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [medSearch]);

    const handleSelectProduct = (product: PharmacyProduct) => {
        setSelectedProduct(product);
        setMedSearch(product.brandName);
        setPrice(product.mrp);
        setMedResults([]);
    };

    const handleAddToCart = () => {
        if (!selectedProduct) return toast.error("Select a medicine first");
        if (qty < 1) return toast.error("Quantity must be at least 1");
        if (qty > selectedProduct.currentStock)
            return toast.error(`Only ${selectedProduct.currentStock} units in stock`);

        const total = qty * price;
        setCart([
            ...cart,
            {
                productId: selectedProduct._id,
                productName: `${selectedProduct.brandName} ${selectedProduct.strength || ""} ${selectedProduct.form || ""}`.trim(),
                qty,
                unitRate: price,
                total,
                gstPct: selectedProduct.gst || 0,
            },
        ]);
        setSelectedProduct(null);
        setMedSearch("");
        setQty(1);
        setPrice(0);
    };

    const removeFromCart = (idx: number) => {
        setCart(cart.filter((_, i) => i !== idx));
    };

    const grandTotal = cart.reduce((sum, item) => sum + item.total, 0);

    // Save as IPD extra charge (deferred payment)
    const handleSaveToIPDBill = async () => {
        if (!selectedAdmission) return toast.error("Select an IPD patient first");
        if (cart.length === 0) return toast.error("Cart is empty");

        const selectedNurse = nurses.find(n => n._id === selectedNurseId);
        const nurseName = selectedNurse?.name || selectedNurse?.user?.name || "Nurse";
        const description = notes || `Pharmacy Bill: ${cart.length} item(s)`;

        setIsSaving(true);
        try {
            await ipdIssuanceService.issueForIPD({
                admissionId: selectedAdmission.admissionId,
                ...(orderId ? { orderId } : {}),
                items: cart.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    issuedQty: item.qty,
                    // batchId left empty: backend auto-selects batches FIFO against stock
                })),
                notes: description,
                ...(selectedNurseId ? {
                    receivedByNurse: selectedNurseId,
                    nurseNote: nurseName,
                } : {}),
            });

            toast.success(
                `₹${grandTotal.toLocaleString()} charged to IPD & medicines issued for ${selectedAdmission.patient.name}`
            );

            setSavedBills((prev) => [
                {
                    id: Date.now(),
                    patient: selectedAdmission.patient.name,
                    admissionId: selectedAdmission.admissionId,
                    items: [...cart],
                    total: grandTotal,
                    notes: description,
                    nurse: selectedNurseId ? nurseName : null,
                    savedAt: new Date().toLocaleTimeString(),
                },
                ...prev,
            ]);

            setCart([]);
            setNotes("");
            setSelectedNurseId("");
            refetchSummary();
            refetchIssuances();
        } catch (err: any) {
            toast.error(err.message || "Failed to save to IPD bill");
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusColor = (status: string) => {
        if (status === "Active") return "bg-green-100 text-green-700";
        if (status === "Discharge Initiated") return "bg-yellow-100 text-yellow-700";
        return "bg-gray-100 text-gray-500";
    };

    const pharmaClearanceColor = (status?: string) => {
        if (status === "CLEARED") return "text-green-600";
        if (status === "PENDING") return "text-red-500";
        return "text-gray-400";
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        IPD Pharmacy Billing
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Issue medicines to admitted patients — charges are added to their
                        final IPD bill (no immediate payment collected)
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-300">
                    <Info size={14} />
                    Deferred Billing Mode
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* LEFT: Patient Selection + Cart */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Patient Selection */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl">
                                    <BedDouble size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Step 1</p>
                                    <h2 className="text-base font-bold text-gray-800 dark:text-white">Select IPD Patient</h2>
                                </div>
                            </div>
                            {/* Count badge */}
                            {!loadingAdmissions && (
                                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-xs font-bold rounded-full border border-blue-100 dark:border-blue-800/30">
                                    {filteredAdmissions.length} patient{filteredAdmissions.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        {/* Search box — by name OR admission ID */}
                        <div className="relative mb-3">
                            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 border-none"
                                placeholder="Search by patient name or admission ID..."
                                value={patientSearch}
                                onChange={(e) => setPatientSearch(e.target.value)}
                            />
                            {patientSearch && (
                                <button
                                    onClick={() => setPatientSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-lg leading-none"
                                >×</button>
                            )}
                        </div>

                        {/* Selected patient indicator */}
                        {selectedAdmission && (
                            <div className="mb-3 px-4 py-2.5 bg-blue-600 text-white rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <User size={13} />
                                    <span className="text-sm font-bold">{selectedAdmission.patient.name}</span>
                                    <span className="text-xs opacity-70 font-medium">{selectedAdmission.admissionId}</span>
                                </div>
                                <button
                                    onClick={() => setSelectedAdmission(null)}
                                    className="text-blue-200 hover:text-white text-lg leading-none ml-2"
                                >×</button>
                            </div>
                        )}

                        {/* Admitted patients list — always visible */}
                        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                            {loadingAdmissions ? (
                                <div className="flex items-center justify-center py-8 gap-2 text-gray-400 text-sm">
                                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                    Loading admitted patients...
                                </div>
                            ) : filteredAdmissions.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                    {patientSearch ? `No patients matching "${patientSearch}"` : "No active IPD admissions"}
                                </div>
                            ) : (
                                filteredAdmissions.map((admission) => (
                                    <button
                                        key={admission._id}
                                        onClick={() => setSelectedAdmission(
                                            selectedAdmission?._id === admission._id ? null : admission
                                        )}
                                        className={`w-full text-left p-3.5 rounded-2xl border transition-all ${selectedAdmission?._id === admission._id
                                            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/25 dark:border-blue-600 shadow-sm"
                                            : "border-gray-100 dark:border-gray-700/60 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${selectedAdmission?._id === admission._id
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                                                    }`}>
                                                    <User size={14} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-sm text-gray-800 dark:text-white truncate">
                                                        {admission.patient?.name}
                                                    </p>
                                                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                                                        {admission.admissionId}
                                                        {admission.patient?.mobile && (
                                                            <span className="font-sans ml-1.5 text-gray-400">• {admission.patient.mobile}</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1 shrink-0 ml-2">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(admission.status)}`}>
                                                    {admission.status}
                                                </span>
                                                {admission.bed?.bedId && (
                                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                                        <BedDouble size={10} />
                                                        {admission.bed.bedId}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Selected patient info + current bill */}
                    {selectedAdmission && billSummary && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-800/30 rounded-3xl p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-blue-500 font-bold uppercase tracking-wider mb-1">
                                        Current IPD Bill
                                    </p>
                                    <p className="text-lg font-bold text-gray-800 dark:text-white">
                                        {selectedAdmission.patient.name}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 mb-1">Total Charges</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        ₹
                                        {(
                                            (billSummary as any)?.data?.totalBilledAmount ||
                                            (billSummary as any)?.totalBilledAmount ||
                                            0
                                        ).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mt-4">
                                {[
                                    {
                                        label: "Pharmacy",
                                        val: (billSummary as any)?.data?.pharmacyCharges || (billSummary as any)?.pharmacyCharges || 0,
                                        color: "text-teal-600",
                                    },
                                    {
                                        label: "Advance Paid",
                                        val: (billSummary as any)?.data?.totalAdvancePaid || (billSummary as any)?.totalAdvancePaid || 0,
                                        color: "text-green-600",
                                    },
                                    {
                                        label: "Balance Due",
                                        val: (billSummary as any)?.data?.balanceDue || (billSummary as any)?.balanceDue || 0,
                                        color: "text-red-500",
                                    },
                                ].map((s) => (
                                    <div
                                        key={s.label}
                                        className="bg-white dark:bg-gray-800 rounded-2xl p-3 text-center"
                                    >
                                        <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                                        <p className={`font-bold text-sm ${s.color}`}>
                                            ₹{Number(s.val).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── Issued Medicines History ──────────────────────────────── */}
                    {selectedAdmission && (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-xl">
                                    <Package size={16} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Previously Issued</p>
                                    <h2 className="text-sm font-bold text-gray-800 dark:text-white">Medicines Issued to Patient</h2>
                                </div>
                            </div>

                            {(issuances as any[]).length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-4">No medicines issued yet for this admission.</p>
                            ) : (
                                <div className="space-y-3">
                                    {(issuances as any[]).map((iss: any) => {
                                        const isExpanded = expandedIssuance === iss._id;
                                        const returnableItems = (iss.items ?? []).filter(
                                            (i: any) => ((i.issuedQty ?? i.qty ?? 0) - (i.returnedQty ?? 0)) > 0
                                        );
                                        const nurseName = iss.receivedByNurse?.name || iss.nurseNote || null;
                                        return (
                                            <div key={iss._id} className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                                                {/* Header */}
                                                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/30">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                                            {new Date(iss.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                        </p>
                                                        {nurseName && (
                                                            <p className="text-xs text-teal-600 font-medium flex items-center gap-1 mt-0.5">
                                                                <UserCheck size={10} /> Nurse: {nurseName}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {returnableItems.length > 0 && (
                                                        <button
                                                            onClick={() => setExpandedIssuance(isExpanded ? null : iss._id)}
                                                            className="text-xs bg-orange-50 dark:bg-orange-900/20 border border-orange-200 text-orange-700 px-2.5 py-1.5 rounded-lg font-medium hover:bg-orange-100 flex items-center gap-1"
                                                        >
                                                            <RotateCcw size={10} />
                                                            Return
                                                            {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Medicine table */}
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="text-gray-400 uppercase text-[10px] tracking-wider border-b dark:border-gray-700">
                                                            <th className="text-left px-4 py-2">Medicine</th>
                                                            <th className="text-center px-4 py-2">Issued</th>
                                                            <th className="text-center px-4 py-2">Returned</th>
                                                            <th className="text-center px-4 py-2">Remaining</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-gray-700/50">
                                                        {(iss.items ?? []).map((item: any, idx: number) => {
                                                            const issued = item.issuedQty ?? item.qty ?? 0;
                                                            const returned = item.returnedQty ?? 0;
                                                            return (
                                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                                                    <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">{item.productName}</td>
                                                                    <td className="px-4 py-2 text-center text-gray-600">{issued}</td>
                                                                    <td className="px-4 py-2 text-center text-orange-500">{returned}</td>
                                                                    <td className={`px-4 py-2 text-center font-bold ${issued - returned > 0 ? "text-blue-600" : "text-green-600"}`}>{issued - returned}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>

                                                {/* Inline return form */}
                                                {isExpanded && (
                                                    <div className="px-4 pb-4 pt-3 border-t dark:border-gray-700 bg-orange-50/50 dark:bg-orange-900/5">
                                                        <p className="text-xs font-bold text-orange-700 mb-3">Enter return quantities:</p>
                                                        <div className="space-y-2">
                                                            {returnableItems.map((item: any, idx: number) => {
                                                                const issued = item.issuedQty ?? item.qty ?? 0;
                                                                const returned = item.returnedQty ?? 0;
                                                                const max = issued - returned;
                                                                return (
                                                                    <div key={idx} className="flex items-center gap-3">
                                                                        <span className="flex-1 text-xs font-medium text-gray-700 dark:text-gray-300">{item.productName}</span>
                                                                        <span className="text-xs text-gray-400">max {max}</span>
                                                                        <input
                                                                            type="number" min={0} max={max}
                                                                            value={returnQtys[iss._id]?.[idx] ?? 0}
                                                                            onChange={(e) => handleReturnQtyChange(iss._id, idx, Number(e.target.value))}
                                                                            className="w-20 bg-white dark:bg-gray-700 border border-orange-200 rounded-lg px-2 py-1.5 text-sm font-bold text-center outline-none focus:ring-2 focus:ring-orange-400"
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Reason (e.g. patient discharged early)"
                                                            value={returnReasons[iss._id] ?? ""}
                                                            onChange={(e) => setReturnReasons(prev => ({ ...prev, [iss._id]: e.target.value }))}
                                                            className="w-full mt-3 bg-white dark:bg-gray-700 border border-orange-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-400"
                                                        />
                                                        <div className="flex gap-2 mt-3">
                                                            <button
                                                                onClick={() => handleSubmitReturn(iss)}
                                                                disabled={submittingReturn === iss._id}
                                                                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-50 transition-colors"
                                                            >
                                                                <RotateCcw size={11} />
                                                                {submittingReturn === iss._id ? "Submitting..." : "Submit Return"}
                                                            </button>
                                                            <button onClick={() => setExpandedIssuance(null)} className="text-gray-400 hover:text-gray-600 px-3 py-2 text-xs">Cancel</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Active Prescription / Suggested Tablets */}
                    {prescribedMedicines.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-amber-100 dark:border-amber-900/30 p-6 mb-6">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-2xl">
                                    <Clock size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Suggested Tablets</p>
                                    <h2 className="text-base font-bold text-gray-800 dark:text-white flex justify-between items-center">
                                        Doctor Prescription
                                        <span className="text-xs text-amber-600 font-bold bg-amber-50 px-3 py-1 rounded-full">{prescribedMedicines.length} items</span>
                                    </h2>
                                </div>
                            </div>

                            <div className="grid gap-3">
                                {prescribedMedicines.map((med: any, i) => (
                                    <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${med.processed ? 'bg-gray-50 border-gray-100 dark:bg-gray-800/50 dark:border-gray-700' : 'bg-amber-50/30 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800/30'}`}>
                                        <div>
                                            <p className={`font-bold text-sm ${med.processed ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200 uppercase tracking-tight'}`}>{med.name}</p>
                                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-0.5">{med.dosage} • {med.quantity} Units | {med.freq}</p>
                                        </div>
                                        <button
                                            disabled={med.processed}
                                            onClick={() => {
                                                setMedSearch(med.name.split(' (')[0]);
                                                setQty(Number(med.quantity) || 1);
                                                setProcessingMedIndex(i);

                                                const newMeds = [...prescribedMedicines];
                                                newMeds[i].processed = true;
                                                setPrescribedMedicines(newMeds);
                                            }}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${med.processed ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200' : (processingMedIndex === i ? 'bg-amber-500 text-white' : 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95')}`}
                                        >
                                            {med.processed ? 'Processed' : (processingMedIndex === i ? 'Filling...' : 'Process Item')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Medicine Entry */}

                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2.5 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-2xl">
                                <Plus size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Step 2
                                </p>
                                <h2 className="text-base font-bold text-gray-800 dark:text-white">
                                    Add Medicines
                                </h2>
                            </div>
                        </div>

                        {/* Medicine search */}
                        <div className="relative mb-4">
                            <Search
                                size={15}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-400 border-none"
                                placeholder="Search medicine..."
                                value={medSearch}
                                onChange={(e) => {
                                    setMedSearch(e.target.value);
                                    setSelectedProduct(null);
                                }}
                            />
                            {medSearch.length >= 2 &&
                                medResults.length === 0 &&
                                !isSearchingMed &&
                                !selectedProduct && (
                                    <p className="mt-2 text-xs font-semibold text-red-500 flex items-center gap-1.5">
                                        <AlertCircle size={12} />
                                        Medicine not found in inventory
                                    </p>
                                )}
                            {medResults.length > 0 && (
                                <div className="absolute z-50 w-full top-full mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                                    {medResults.map((product) => (
                                        <button
                                            key={product._id}
                                            onClick={() => handleSelectProduct(product)}
                                            className="w-full text-left px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 last:border-none flex justify-between items-center"
                                        >
                                            <div>
                                                <p className="font-bold text-xs text-gray-800 dark:text-white uppercase">
                                                    {product.brandName}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {product.genericName} • {product.strength}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-xs text-teal-600">
                                                    ₹{product.mrp}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Stock: {product.currentStock}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Qty + Price + Add */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={qty}
                                    onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                                    className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                                    Unit Price (₹)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={price || ""}
                                    onChange={(e) => setPrice(Number(e.target.value))}
                                    className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-400"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={handleAddToCart}
                                    disabled={!selectedProduct}
                                    className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-2xl py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Plus size={16} />
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* Cart Table */}
                        {cart.length > 0 && (
                            <div className="mt-5 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700/30">
                                        <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            <th className="px-4 py-3 text-left">Medicine</th>
                                            <th className="px-4 py-3 text-center">Qty</th>
                                            <th className="px-4 py-3 text-right">Price</th>
                                            <th className="px-4 py-3 text-right">Total</th>
                                            <th className="px-4 py-3 text-center">Del</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-gray-700/50">
                                        {cart.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 text-xs">
                                                    {item.productName}
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-gray-600 dark:text-gray-300">
                                                    {item.qty}
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-500 text-xs">
                                                    ₹{item.unitRate.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-teal-600">
                                                    ₹{item.total.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => removeFromCart(idx)}
                                                        className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg hover:bg-red-100"
                                                    >
                                                        <Trash2 size={13} />
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

                {/* RIGHT: Bill Summary + Save */}
                <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sticky top-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2.5 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-2xl">
                                <Calculator size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Step 3
                                </p>
                                <h2 className="text-base font-bold text-gray-800 dark:text-white">
                                    Confirm & Save
                                </h2>
                            </div>
                        </div>

                        {/* Selected patient badge */}
                        {selectedAdmission ? (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
                                <User size={15} className="text-blue-600 shrink-0" />
                                <div>
                                    <p className="font-bold text-sm text-gray-800 dark:text-white">
                                        {selectedAdmission.patient.name}
                                    </p>
                                    <p className="text-xs text-gray-500">{selectedAdmission.admissionId}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl px-4 py-3 mb-4 text-xs text-gray-400 text-center">
                                No patient selected
                            </div>
                        )}

                        {/* Nurse selector */}
                        <div className="mb-4">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 block">
                                <UserCheck size={12} /> Received By Nurse
                            </label>
                            <select
                                value={selectedNurseId}
                                onChange={(e) => setSelectedNurseId(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-teal-400 appearance-none"
                            >
                                <option value="">— Select nurse (optional) —</option>
                                {nurses.map((nurse: any) => (
                                    <option key={nurse._id} value={nurse._id}>
                                        {nurse.name || nurse.user?.name || "Nurse"}
                                        {nurse.department ? ` — ${nurse.department}` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Totals */}
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Items in cart</span>
                                <span className="font-bold text-gray-700 dark:text-gray-300">
                                    {cart.length}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Subtotal</span>
                                <span className="font-bold text-gray-700 dark:text-gray-300">
                                    ₹{grandTotal.toFixed(2)}
                                </span>
                            </div>
                            <div className="border-t dark:border-gray-700 pt-3 flex justify-between">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                    Pharmacy Charge
                                </span>
                                <span className="text-2xl font-bold text-teal-600">
                                    ₹{Math.round(grandTotal).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="mb-4">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                                Notes (optional)
                            </label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g. Morning rounds medicines..."
                                className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                            />
                        </div>

                        {/* Deferred billing notice */}
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-2xl px-4 py-3 mb-4 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
                            <Clock size={14} className="shrink-0 mt-0.5" />
                            <span>
                                This charge will be <strong>added to the patient's final IPD
                                    bill</strong>. No payment is collected now — the patient pays
                                at discharge.
                            </span>
                        </div>

                        <button
                            onClick={handleSaveToIPDBill}
                            disabled={isSaving || !selectedAdmission || cart.length === 0}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-4 rounded-2xl font-bold uppercase tracking-wider text-sm active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
                        >
                            <Save size={16} />
                            {isSaving ? "Saving..." : "Add to IPD Bill"}
                        </button>

                        <button
                            onClick={() => { setCart([]); setNotes(""); }}
                            className="w-full mt-2 text-gray-400 hover:text-gray-600 py-2 text-xs font-medium"
                        >
                            Clear cart
                        </button>
                    </div>

                    {/* Today's saved entries */}
                    {savedBills.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                Today's IPD Entries
                            </p>
                            <div className="space-y-2.5">
                                {savedBills.map((bill) => (
                                    <div
                                        key={bill.id}
                                        className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-800/30"
                                    >
                                        <CheckCircle2 size={15} className="text-green-500 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold text-xs text-gray-800 dark:text-white truncate">
                                                    {bill.patient}
                                                </p>
                                                <span className="font-bold text-xs text-green-600 ml-2 shrink-0">
                                                    ₹{bill.total.toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                                                {bill.notes}
                                            </p>
                                            <p className="text-xs text-gray-300 mt-0.5 flex items-center gap-1">
                                                <Clock size={10} />
                                                {bill.savedAt}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
