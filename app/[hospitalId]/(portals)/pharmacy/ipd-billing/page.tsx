"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Pill,
    User,
    ShoppingCart,
    CreditCard,
    Calculator,
    AlertCircle,
    Search,
    Plus,
    Trash2,
    Save,
    ArrowLeft
} from "lucide-react";
import { toast } from "react-hot-toast";
import { PharmacyBillingService } from "@/lib/integrations/services/pharmacyBilling.service";
import { ProductService } from "@/lib/integrations/services/product.service";
import { hospitalAdminService } from "@/lib/integrations";
import { useAuthStore } from "@/stores/authStore";

const IPDBillingPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("orderId");
    const { user } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [order, setOrder] = useState<any>(null);
    const [hospitalSettings, setHospitalSettings] = useState<any>(null);

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

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [settingsRes, orderRes] = await Promise.all([
                    hospitalAdminService.getHospitalMetadata({ skipCache: true }),
                    orderId ? PharmacyBillingService.getPharmacyOrder(orderId) : Promise.resolve(null)
                ]);

                if (settingsRes.success) {
                    setHospitalSettings(settingsRes.data);
                }

                if (orderRes) {
                    const o = orderRes.pharmacyOrder || orderRes;
                    setOrder(o);

                    if (o.medicines) {
                        setPrescribedMedicines(o.medicines.map((m: any) => ({ ...m, processed: false })));
                    }
                }
            } catch (error) {
                console.error("Failed to fetch billing data", error);
                toast.error("Failed to load order details");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [orderId]);

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
    };

    const removeItem = (index: number) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const handleChargeToIPD = async () => {
        if (cart.length === 0) return toast.error("Cart is empty");
        if (!order?.admission) return toast.error("No admission linked to this order");

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
                    totalAmount: item.total
                })),
                notes: `Billed from order ${order.tokenNumber}`
            };

            await PharmacyBillingService.chargeIPDBill(payload);
            toast.success("Medicines charged to IPD bill successfully!");
            router.push("/pharmacy/orders");
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
                    <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
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

                    {/* Prescribed Medicines List - OPD Style */}
                    {prescribedMedicines.length > 0 && (
                        <div className="bg-primary-theme/5 rounded-[2rem] border border-primary-theme/10 p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-primary-theme/10 text-primary-theme rounded-xl">
                                    <Pill size={18} />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase">Prescribed Medicines</h3>
                            </div>
                            <div className="space-y-3">
                                {prescribedMedicines.map((med, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <div>
                                            <p className="text-xs font-black text-slate-700 uppercase">{med.name}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{med.dosage} • qty: {med.quantity}</p>
                                        </div>
                                        <button
                                            disabled={med.processed}
                                            onClick={() => {
                                                setSearchTerm(med.name.split(' (')[0]); // Take the brand name part
                                                setQuantity(Number(med.quantity) || 1);
                                                // Pre-calculate unit price if we can, but selecting the product will do it
                                                setProcessingMedIndex(i);
                                            }}

                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${med.processed ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-primary-theme text-white hover:bg-primary-theme/90'}`}
                                        >
                                            {med.processed ? "Processed" : "Process"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Entry Section */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-slate-50 text-slate-400 rounded-xl">
                                <Plus size={18} />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase">Add Medicine</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                            <button
                                onClick={handleAddItem}
                                className="px-5 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase hover:bg-slate-800 transition-all"
                            >
                                Add Item
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name</th>
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
                    <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary-theme/10 text-primary-theme rounded-2xl">
                                <Calculator size={20} />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase">Bill Summary</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span>Total Payable</span>
                                <span className="text-slate-900">₹{Math.round(subtotal).toLocaleString()}</span>
                            </div>
                            <div className="pt-4 border-t border-slate-100">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Final Amount</p>
                                <p className="text-4xl font-black text-slate-900 tracking-tighter">₹{Math.round(subtotal).toLocaleString()}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleChargeToIPD}
                            disabled={submitting || cart.length === 0}
                            className="w-full bg-primary-theme text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-primary-theme/90 transition-all shadow-lg shadow-primary-theme/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            Charge to IPD Bill
                        </button>

                        <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex items-start gap-4">
                            <AlertCircle className="text-amber-500 shrink-0" size={18} />
                            <p className="text-[9px] font-bold text-amber-700 uppercase leading-relaxed">
                                Charging to IPD will add these items as "Pharmacy Charges" to the patient's admission statement. Stock will be adjusted immediately.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IPDBillingPage;
