"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Pill,
    User,
    Users,
    ShoppingCart,
    CreditCard,
    Calculator,
    AlertCircle,
    Search,
    Plus,
    Trash2,
    Save,
    ArrowLeft,
    ChevronDown,
    UserCheck,
    X
} from "lucide-react";
import { toast } from "react-hot-toast";
import { PharmacyBillingService } from "@/lib/integrations/services/pharmacyBilling.service";
import { ProductService } from "@/lib/integrations/services/product.service";
import { hospitalAdminService } from "@/lib/integrations";
import { apiClient } from "@/lib/integrations/api/apiClient";
import { useAuthStore } from "@/stores/authStore";
import { useTenantLink } from "@/hooks/useTenantLink";
import { ipdService } from "@/lib/integrations/services/ipd.service";
import { ipdIssuanceService } from "@/lib/integrations/services/pharmacy.service";
import { ClipboardList } from "lucide-react";

const IPDBillingPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("orderId");
    const admissionId = searchParams.get("admissionId");
    const { user } = useAuthStore();
    const { getPath } = useTenantLink();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [order, setOrder] = useState<any>(null);
    const [previousIssuances, setPreviousIssuances] = useState<any[]>([]);
    const [hospitalSettings, setHospitalSettings] = useState<any>(null);

    // Nurse State
    const [nurses, setNurses] = useState<any[]>([]);
    const [loadingNurses, setLoadingNurses] = useState(false);
    const [selectedNurse, setSelectedNurse] = useState<any>(null);
    const [nurseSearch, setNurseSearch] = useState("");
    const [showNurseDropdown, setShowNurseDropdown] = useState(false);

    // Cart State
    const [cart, setCart] = useState<any[]>([]);
    const [prescribedMedicines, setPrescribedMedicines] = useState<any[]>([]);
    const [processingMedIndex, setProcessingMedIndex] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState(0);
    const [frequency, setFrequency] = useState("1-1-1");

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const p_admissionId = orderId ? null : admissionId; // if we have order we already process it, but if no order, get by admission

                const [settingsRes, orderRes, admissionRes, issuancesRes] = await Promise.all([
                    hospitalAdminService.getHospitalMetadata({ skipCache: true }).catch(err => {
                        console.error('Failed to load settings', err);
                        return { success: false, data: null };
                    }),
                    orderId ? PharmacyBillingService.getPharmacyOrder(orderId).catch(err => {
                        console.error('Failed to load order', err);
                        return null;
                    }) : Promise.resolve(null),
                    p_admissionId ? ipdService.getAdmissionDetails(p_admissionId).catch(err => {
                        console.error('Failed to load admission details', err);
                        return null;
                    }) : Promise.resolve(null),
                    admissionId ? ipdIssuanceService.getIssuancesByAdmission(admissionId).catch(err => {
                        console.error('Failed to load previous issuances', err);
                        return [];
                    }) : Promise.resolve([])
                ]);

                if (settingsRes.success) {
                    setHospitalSettings(settingsRes.data);
                }

                if (issuancesRes && Array.isArray(issuancesRes)) {
                    setPreviousIssuances(issuancesRes);
                }

                if (orderRes) {
                    const o = orderRes.pharmacyOrder || orderRes;
                    setOrder(o);

                    if (o.medicines) {
                        setPrescribedMedicines(o.medicines.map((m: any) => ({ ...m, processed: false })));
                    }
                } else if (admissionRes) {
                    // Create mock order so billing logic works seamlessly (map flattened discharge response)
                    setOrder({
                        _id: null,
                        tokenNumber: "Direct IPD Billing",
                        patient: {
                            name: admissionRes.patientName || admissionRes.patient?.name, // Fallbacks just in case
                            age: admissionRes.age,
                            gender: admissionRes.gender,
                        },
                        admission: {
                            _id: admissionRes.admissionId || admissionRes._id,
                            admissionId: admissionRes.admissionId,
                            wardType: admissionRes.roomType || admissionRes.wardType,
                            bedDetails: {
                                wardType: admissionRes.roomType || admissionRes.wardType,
                                room: admissionRes.roomNo,
                                bedId: admissionRes.bedNo,
                                department: admissionRes.department
                            }
                        },
                        doctor: {
                            name: admissionRes.primaryDoctor || admissionRes.doctor?.name
                        }
                    });
                }
            } catch (error) {
                console.error("Failed to fetch billing data", error);
                toast.error("Failed to load details");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [orderId, admissionId]);

    // Fetch nurses for this hospital
    useEffect(() => {
        const fetchNurses = async () => {
            try {
                setLoadingNurses(true);
                const res: any = await apiClient("/hospital-admin/nurses");
                const list = res?.nurses || res?.users || res?.data || res || [];
                const parsedNurses = Array.isArray(list) ? list : [];
                setNurses(parsedNurses);

                // Auto-select nurse from previous issuances if available
                if (previousIssuances && previousIssuances.length > 0 && parsedNurses.length > 0 && !selectedNurse) {
                    const lastNurseId = previousIssuances[0]?.receivedByNurse?._id || previousIssuances[0]?.receivedByNurse;
                    if (lastNurseId) {
                        const nurseMatch = parsedNurses.find((n: any) => n._id === lastNurseId);
                        if (nurseMatch) {
                            setSelectedNurse(nurseMatch);
                        }
                    }
                }

            } catch (err) {
                console.error("Failed to fetch nurses:", err);
            } finally {
                setLoadingNurses(false);
            }
        };
        fetchNurses();
    }, [previousIssuances]);

    // Close nurse dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest(".nurse-dropdown-container")) {
                setShowNurseDropdown(false);
            }
        };
        if (showNurseDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [showNurseDropdown]);

    const filteredNurses = nurses.filter(n => {
        const q = nurseSearch.toLowerCase();
        return !q || n.name?.toLowerCase().includes(q) || n.email?.toLowerCase().includes(q);
    });

    // Product search logic
    useEffect(() => {
        if (searchTerm.length < 2) {
            setSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            try {
                setIsSearching(true);
                const results = await ProductService.getProducts({ search: searchTerm });
                setSearchResults(results || []);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleSelectProduct = (product: any) => {
        setSelectedProduct(product);
        setSearchTerm(product.brandName);
        const unitsPerPack = product.unitsPerPack || 1;
        setPrice(product.mrp / unitsPerPack);
        setSearchResults([]);
    };

    const handleAddItem = () => {
        if (!selectedProduct) return toast.error("Select a product first");
        if (quantity <= 0) return toast.error("Quantity must be greater than 0");

        const newItem = {
            productId: selectedProduct._id,
            productName: `${selectedProduct.brandName} ${selectedProduct.strength}`,
            qty: quantity,
            unitRate: price,
            frequency: frequency,
            total: quantity * price
        };

        setCart([...cart, newItem]);

        // If we were processing a prescribed med, mark it as done
        if (processingMedIndex !== null) {
            const updatedMeds = [...prescribedMedicines];
            updatedMeds[processingMedIndex].processed = true;
            setPrescribedMedicines(updatedMeds);
            setProcessingMedIndex(null);
        }

        setSelectedProduct(null);
        setSearchTerm("");
        setQuantity(1);
        setPrice(0);
        setFrequency("1-1-1");
    };

    const removeItem = (index: number) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const handleChargeToIPD = async () => {
        if (cart.length === 0) return toast.error("Cart is empty");
        if (!order?.admission) return toast.error("No admission linked to this order");

        // Nurse is optional but recommended
        if (!selectedNurse) {
            const confirm = window.confirm("No nurse selected. The medicines won't appear in any nurse's return portal. Proceed anyway?");
            if (!confirm) return;
        }

        // Check if ward/room/department allows IPD billing
        const bedInfo = order?.admission?.bedDetails || {};
        const wardType = bedInfo.wardType || order?.admission?.wardType;
        const room = bedInfo.room;
        const department = bedInfo.department;

        const enabledWards = hospitalSettings?.ipdPharmaSettings?.enabledWards || [];
        const isEnabled = enabledWards.includes(wardType) ||
            (room && enabledWards.includes(room)) ||
            (department && enabledWards.includes(department)) ||
            (bedInfo.wardName && enabledWards.includes(bedInfo.wardName));

        if (!isEnabled && enabledWards.length > 0) {
            toast.error(`IPD Pharmacy Billing is disabled for ${bedInfo.wardName || wardType}${room ? ` [Room: ${room}]` : ''}. Please use Retail Flow.`);
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                admissionId: order.admission.admissionId || order.admission._id,
                orderId: order._id,
                items: cart.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    issuedQty: item.qty,
                    unitRate: item.unitRate,
                    frequency: item.frequency,
                    totalAmount: item.total
                })),
                // ✅ Nurse assignment — drives the return portal filtering
                receivedByNurse: selectedNurse?._id || null,
                nurseNote: selectedNurse?.name || null,
                notes: `Billed from order ${order.tokenNumber}${selectedNurse ? ` | Assigned to Nurse: ${selectedNurse.name}` : ""}`
            };

            await PharmacyBillingService.chargeIPDBill(payload);
            toast.success(
                selectedNurse
                    ? `Medicines charged to IPD & assigned to ${selectedNurse.name}'s return portal!`
                    : "Medicines charged to IPD bill successfully!"
            );
            router.push(getPath("/pharmacy/orders"));
        } catch (error: any) {
            console.error("Charge failed", error);
            toast.error(error.message || "Failed to charge medicines to IPD");
        } finally {
            setSubmitting(false);
        }
    };

    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-12 h-12 border-4 border-primary-theme/10 border-t-primary-theme rounded-full animate-spin" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Patient Context...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <CreditCard className="text-primary-theme" size={28} />
                            IPD PHARMACY BILLING
                        </h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Deferred Billing for Admitted Patients</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    {/* Patient Card */}
                    <div className="bg-white rounded-4xl border border-slate-100 p-8 shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 bg-primary-theme/10 text-primary-theme rounded-2xl flex items-center justify-center">
                                <User size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase">{order?.patient?.name || "Unknown Patient"}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {order?.patient?.age && `${order.patient.age}Y • `} {order?.patient?.gender && `${order.patient.gender} • `} ADMISSION: {order?.admission?.admissionId || "N/A"} • WARD: {order?.admission?.bedDetails?.wardType || order?.admission?.wardType || "N/A"} {order?.admission?.bedDetails?.bedId && `[BED: ${order.admission.bedDetails.bedId}]`}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-4xl border border-slate-100">
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Doctor</p>
                                <p className="text-xs font-black text-slate-700 uppercase">
                                    {(() => {
                                        const docName = order?.doctor?.user?.name || order?.doctor?.name || "N/A";
                                        return docName.toLowerCase().startsWith("dr.") ? docName : `Dr. ${docName}`;
                                    })()}
                                </p>
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Token Number</p>
                                <p className="text-xs font-black text-slate-700 uppercase">{order?.tokenNumber || "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Prescribed Medicines List */}
                    {prescribedMedicines.length > 0 && (
                        <div className="bg-primary-theme/5 rounded-4xl border border-primary-theme/10 p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-primary-theme/10 text-primary-theme rounded-xl">
                                    <Pill size={18} />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase">Prescribed Medicines</h3>
                            </div>
                            <div className="space-y-3">
                                {prescribedMedicines.map((med, i) => {
                                    const prescribedFreq = med.freq || med.frequency || "1-1-1";
                                    return (
                                        <div key={i} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                            <div>
                                                <p className="text-xs font-black text-slate-700 uppercase">{med.name}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {med.dosage} • Freq: <span className="text-primary-theme">{prescribedFreq}</span> • qty: {med.quantity}
                                                </p>
                                            </div>
                                            <button
                                                disabled={med.processed}
                                                onClick={() => {
                                                    setSearchTerm(med.name.split(' (')[0]);
                                                    setQuantity(Number(med.quantity) || 1);
                                                    // Fix: PharmacyOrder.medicines stores field as `freq` not `frequency`
                                                    setFrequency(med.freq || med.frequency || "1-1-1");
                                                    setProcessingMedIndex(i);
                                                }}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${med.processed ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-primary-theme text-white hover:bg-primary-theme/90'}`}
                                            >
                                                {med.processed ? "Processed" : "Process"}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Previous Issuances / Medicines List */}
                    {previousIssuances.length > 0 && (
                        <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-4xl border border-amber-100 dark:border-amber-900/30 p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
                                    <ClipboardList size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">Previously Issued Medicines</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Review prior medicine distributions</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {previousIssuances.map((iss, idx) => (
                                    <div key={iss._id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-amber-100/50 dark:border-amber-900/30 shadow-sm">
                                        <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-700 pb-3 mb-3">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {new Date(iss.issuedAt).toLocaleString()}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded">
                                                    By: {iss.nurseNote || (iss.receivedByNurse?.name) || "Direct Issue"}
                                                </p>
                                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded">
                                                    ₹{Number(iss.totalAmount || 0).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2.5">
                                            {iss.items.map((item: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center text-xs bg-slate-50/50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300 uppercase truncate pr-4">{item.productName}</span>
                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <span className="font-black text-blue-600 dark:text-blue-400">{item.issuedQty} QTY</span>
                                                        <span className="font-black text-slate-500 w-16 text-right">₹{Number(item.totalAmount || 0).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Entry Section */}
                    <div className="bg-white rounded-4xl border border-slate-100 p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-slate-50 text-slate-400 rounded-xl">
                                <Plus size={18} />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase">Add Medicine</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="md:col-span-2 relative">
                                <input
                                    type="text"
                                    placeholder="Search medicine..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase outline-none focus:border-primary-theme"
                                />
                                {searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                                        {searchResults.map((p) => (
                                            <button
                                                key={p._id}
                                                onClick={() => handleSelectProduct(p)}
                                                className="w-full px-6 py-4 text-left hover:bg-slate-50 border-b border-slate-50 last:border-none flex justify-between"
                                            >
                                                <div>
                                                    <p className="text-xs font-black text-slate-700 uppercase">{p.brandName}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase">{p.strength} • Units/Pack: {p.unitsPerPack || 1}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-primary-theme">₹{p.mrp}</p>
                                                    <p className="text-[9px] font-bold text-teal-600">₹{Math.round(p.mrp / (p.unitsPerPack || 1)).toLocaleString()} / unit</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <input
                                type="number"
                                placeholder="Qty"
                                value={quantity || ""}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black outline-none focus:border-primary-theme"
                            />
                            <input
                                type="text"
                                placeholder="Frequency (e.g. 1-1-1)"
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value)}
                                className="px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black outline-none focus:border-primary-theme"
                            />
                            <button
                                onClick={handleAddItem}
                                className="px-5 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase hover:bg-slate-800 transition-all"
                            >
                                Add Item
                            </button>
                        </div>
                    </div>

                    {/* Cart Table */}
                    <div className="bg-white rounded-4xl border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name</th>
                                    <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Freq</th>
                                    <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                                    <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Act</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {cart.map((item, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50">
                                        <td className="px-8 py-5 text-xs font-black text-slate-700 uppercase">{item.productName}</td>
                                        <td className="px-8 py-5 text-center text-xs font-black text-primary-theme leading-none">{item.frequency || "1-1-1"}</td>
                                        <td className="px-8 py-5 text-center text-xs font-black text-slate-700">{item.qty}</td>
                                        <td className="px-8 py-5 text-right text-xs font-black text-slate-700">₹{Math.round(item.unitRate || 0).toLocaleString()}</td>
                                        <td className="px-8 py-5 text-right text-xs font-black text-primary-theme">₹{Math.round(item.total || 0).toLocaleString()}</td>
                                        <td className="px-8 py-5 text-center">
                                            <button onClick={() => removeItem(i)} className="p-2 text-slate-300 hover:text-rose-500 transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {cart.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No items in billing queue</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Summary Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-4xl border border-slate-100 p-8 shadow-sm space-y-8">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <div className="p-3 bg-primary-theme/10 text-primary-theme rounded-2xl">
                                <Calculator size={20} />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase">Bill Summary</h3>
                        </div>

                        {/* ✅ NURSE SELECTION (MOVED TO BILL SUMMARY) */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 mt-4">Assign Nurse</h4>
                            <div className="relative nurse-dropdown-container">
                                {/* Selected Nurse Badge */}
                                {selectedNurse ? (
                                    <div className="flex flex-col gap-2 bg-teal-50 border border-teal-200 rounded-2xl p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-teal-600 text-white rounded-xl flex items-center justify-center font-black text-sm shrink-0">
                                                {selectedNurse.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-black text-teal-800 uppercase truncate">{selectedNurse.name}</p>
                                                <p className="text-[9px] font-bold text-teal-500 uppercase tracking-widest truncate">{selectedNurse.email || "Nurse"}</p>
                                            </div>
                                            <button
                                                onClick={() => { setSelectedNurse(null); setNurseSearch(""); }}
                                                className="p-1.5 text-teal-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowNurseDropdown(!showNurseDropdown)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-left hover:border-teal-300 hover:bg-teal-50/30 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-200 text-slate-400 rounded-xl flex items-center justify-center shrink-0">
                                                <User size={14} />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                                                {loadingNurses ? "Loading..." : "Select nurse..."}
                                            </span>
                                        </div>
                                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${showNurseDropdown ? "rotate-180" : ""}`} />
                                    </button>
                                )}

                                {/* Nurse Dropdown */}
                                {showNurseDropdown && !selectedNurse && (
                                    <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="max-h-52 overflow-y-auto">
                                            {nurses.length === 0 ? (
                                                <div className="py-6 text-center">
                                                    <Users size={20} className="mx-auto text-slate-200 mb-2" />
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        No nurses found
                                                    </p>
                                                </div>
                                            ) : (
                                                nurses.map((nurse) => (
                                                    <button
                                                        key={nurse._id}
                                                        onClick={() => {
                                                            setSelectedNurse(nurse);
                                                            setShowNurseDropdown(false);
                                                            toast.success(`Assigned to ${nurse.name}`);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 transition-colors border-b border-slate-50 last:border-none text-left"
                                                    >
                                                        <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 text-white rounded-xl flex items-center justify-center font-black text-xs shrink-0">
                                                            {nurse.name?.charAt(0)?.toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[10px] font-black text-slate-800 uppercase truncate">{nurse.name}</p>
                                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">{nurse.email || "Nurse"}</p>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {!selectedNurse && (
                                <p className="text-[8px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1 mt-1">
                                    <AlertCircle size={10} />
                                    Medicines won't appear in return portal if empty
                                </p>
                            )}
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            {previousIssuances.length > 0 && (
                                <div className="flex justify-between items-center text-[10px] font-black text-rose-500 uppercase tracking-widest">
                                    <span>Previously Billed</span>
                                    <span className="text-rose-600">₹{previousIssuances.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span>Cart Items</span>
                                <span className="text-slate-900">{cart.length}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span>Current Session Payable</span>
                                <span className="text-slate-900">₹{Math.round(subtotal).toLocaleString()}</span>
                            </div>
                            <div className="pt-4 border-t border-slate-100">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Final Accumulative Amount</p>
                                <p className="text-4xl font-black text-slate-900 tracking-tighter">
                                    ₹{Math.round(subtotal + previousIssuances.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0)).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleChargeToIPD}
                            disabled={submitting || cart.length === 0}
                            className="w-full bg-primary-theme text-white py-5 rounded-4xl font-black text-xs uppercase tracking-widest hover:bg-primary-theme/90 transition-all shadow-lg shadow-primary-theme/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            {selectedNurse ? `Charge & Assign to ${selectedNurse.name.split(' ')[0]}` : "Charge to IPD Bill"}
                        </button>

                        <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex items-start gap-4">
                            <AlertCircle className="text-amber-500 shrink-0" size={18} />
                            <p className="text-[9px] font-bold text-amber-700 uppercase leading-relaxed">
                                Charging to IPD will add these items as "Pharmacy Charges" to the patient's admission statement. Stock will be adjusted immediately.
                                {selectedNurse && ` Medicines will appear in ${selectedNurse.name}'s return portal.`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IPDBillingPage;
