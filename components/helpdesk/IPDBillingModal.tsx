'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    Receipt,
    Plus,
    CreditCard,
    Tag,
    Lock,
    CheckCircle2,
    ArrowDownCircle,
    ArrowUpCircle,
    History,
    Wallet,
    Info,
    Bed as BedIcon,
    Printer,
    ChevronDown
} from 'lucide-react';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { printIPDLedger } from '@/lib/utils/print-ipd-ledger';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';

interface IPDBillingModalProps {
    isOpen: boolean;
    onClose: () => void;
    admissionId: string;
    hidePaymentActions?: boolean;
}

export const IPDBillingModal: React.FC<IPDBillingModalProps> = ({ isOpen, onClose, admissionId, hidePaymentActions }) => {
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'summary' | 'charges' | 'advances'>('summary');
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [hospitalDetails, setHospitalDetails] = useState<any>(null);

    // Form States
    const [showChargeForm, setShowChargeForm] = useState(false);
    const [showAdvanceForm, setShowAdvanceForm] = useState(false);
    const [showDiscountForm, setShowDiscountForm] = useState(false);

    const [chargeData, setChargeData] = useState({ category: 'Nursing', description: '', amount: 0 });
    const [advanceData, setAdvanceData] = useState({ amount: 0, mode: 'Cash', transactionType: 'Advance', reference: '' });
    const [discountData, setDiscountData] = useState({ amount: 0, reason: '' });

    const [submitting, setSubmitting] = useState(false);

    // Auto-fill advance amount with balance due when opening form
    useEffect(() => {
        if (showAdvanceForm && summary?.financials?.balance > 0) {
            setAdvanceData(prev => ({ ...prev, amount: Math.round(summary.financials.balance) }));
        }
    }, [showAdvanceForm, summary]);

    useEffect(() => {
        hospitalAdminService.getHospital().then((res) => {
            if (res?.hospital) setHospitalDetails(res.hospital);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        if (isOpen && admissionId) {
            fetchSummary();
            // ── Auto-refresh every 5s so lab/pharma charges appear without manual reload ──
            const interval = setInterval(async () => {
                try {
                    const [data, admissionDetails] = await Promise.all([
                        ipdService.getBillSummary(admissionId),
                        ipdService.getAdmissionDetails(admissionId).catch(() => null)
                    ]);
                    if (data && admissionDetails) {
                        data.primaryDoctor = admissionDetails.primaryDoctor || data.primaryDoctor;
                        data.doctor = admissionDetails.doctor || data.doctor;
                        data.suggestedDoctorName = admissionDetails.suggestedDoctorName || data.suggestedDoctorName;
                        
                        const patientObj = admissionDetails.patient || {};
                        const profileObj = admissionDetails.patientProfile || {};
                        data.mrn = data.mrn || patientObj.mrn || profileObj.mrn || admissionDetails.mrn || "";
                        data.patientAge = data.patientAge || patientObj.age || profileObj.age || "";
                        data.patientGender = data.patientGender || patientObj.gender || profileObj.gender || "";
                        data.patientAddress = data.patientAddress || patientObj.address || profileObj.address || "";
                        data.patientContact = data.patientContact || patientObj.phone || patientObj.mobile || profileObj.phone || profileObj.mobile || "";
                        data.admissionDate = data.admissionDate || admissionDetails.admissionDate || "";
                    }
                    if (data) {
                        setSummary(data);
                    }
                } catch (e) { }
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [isOpen, admissionId]);

    const fetchSummary = async () => {
        try {
            setLoading(true);
            const [data, admissionDetails] = await Promise.all([
                ipdService.getBillSummary(admissionId),
                ipdService.getAdmissionDetails(admissionId).catch(() => null)
            ]);
            if (data && admissionDetails) {
                data.primaryDoctor = admissionDetails.primaryDoctor || data.primaryDoctor;
                data.doctor = admissionDetails.doctor || data.doctor;
                data.suggestedDoctorName = admissionDetails.suggestedDoctorName || data.suggestedDoctorName;
                
                const patientObj = admissionDetails.patient || {};
                const profileObj = admissionDetails.patientProfile || {};
                data.mrn = data.mrn || patientObj.mrn || profileObj.mrn || admissionDetails.mrn || "";
                data.patientAge = data.patientAge || patientObj.age || profileObj.age || "";
                data.patientGender = data.patientGender || patientObj.gender || profileObj.gender || "";
                data.patientAddress = data.patientAddress || patientObj.address || profileObj.address || "";
                data.patientContact = data.patientContact || patientObj.phone || patientObj.mobile || profileObj.phone || profileObj.mobile || "";
                data.admissionDate = data.admissionDate || admissionDetails.admissionDate || "";
            }
            setSummary(data);
        } catch (error: any) {
            toast.error("Failed to load bill summary");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCharge = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await ipdService.addExtraCharge({ admissionId, ...chargeData });
            toast.success("Charge added successfully");
            setShowChargeForm(false);
            setChargeData({ category: 'Nursing', description: '', amount: 0 });
            fetchSummary();
        } catch (error: any) {
            toast.error(error.message || "Failed to add charge");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddAdvance = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await ipdService.addAdvancePayment({
                admissionId,
                amount: advanceData.amount,
                mode: advanceData.mode,
                transactionType: advanceData.transactionType as any,
                reference: advanceData.reference
            });
            toast.success("Payment recorded successfully");
            setShowAdvanceForm(false);
            setAdvanceData({ amount: 0, mode: 'Cash', transactionType: 'Advance', reference: '' });
            fetchSummary();
        } catch (error: any) {
            toast.error(error.message || "Failed to record payment");
        } finally {
            setSubmitting(false);
        }
    };

    const handleApplyDiscount = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await ipdService.applyDiscount({ admissionId, ...discountData });
            toast.success("Discount applied");
            setShowDiscountForm(false);
            setDiscountData({ amount: 0, reason: '' });
            fetchSummary();
        } catch (error: any) {
            toast.error(error.message || "Failed to apply discount");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveDiscount = async () => {
        if (!window.confirm("Are you sure you want to remove this discount?")) return;
        try {
            setSubmitting(true);
            await ipdService.applyDiscount({
                admissionId,
                amount: 0,
                reason: 'Adjustment Removed'
            });
            toast.success("Discount removed successfully");
            fetchSummary();
        } catch (error: any) {
            toast.error(error.message || "Failed to remove discount");
        } finally {
            setSubmitting(false);
        }
    };

    const handleLockBill = async () => {
        if (!window.confirm("Once locked, no further charges or discounts can be added. Proceed?")) return;
        try {
            setSubmitting(true);
            await ipdService.lockBill(admissionId);
            toast.success("Bill locked successfully");
            fetchSummary();
        } catch (error: any) {
            toast.error(error.message || "Failed to lock bill");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-2">
            <div className="bg-white w-full max-w-3xl max-h-[95vh] rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20">
                            <Receipt size={16} />
                        </div>
                        <div>
                            <h2 className="text-[11px] font-black uppercase tracking-tight leading-tight">Billing Statement</h2>
                            <p className="text-[7px] font-bold text-teal-400 uppercase tracking-widest mt-0.5">
                                {summary?.patientName || 'Loading...'} • ID: {summary?.admissionId || admissionId}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {summary?.isBillLocked && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-md text-[7px] font-black uppercase tracking-widest border border-emerald-500/30">
                                <Lock size={10} /> Bill Locked
                            </div>
                        )}
                        <button
                            onClick={() => summary && printIPDLedger(summary, hospitalDetails)}
                            title="Print Statement"
                            className="w-7 h-7 bg-white/10 text-teal-400 rounded-lg flex items-center justify-center hover:bg-teal-500/20 hover:text-teal-300 transition-all"
                        >
                            <Printer size={14} />
                        </button>
                        <button onClick={onClose} className="w-7 h-7 bg-white/10 text-white rounded-lg flex items-center justify-center hover:bg-white/20 transition-all">
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-50 px-4 border-b border-slate-100">
                    {[
                        { id: 'summary', label: 'Summary', icon: Wallet },
                        { id: 'charges', label: 'Charges', icon: History },
                        ...(!hidePaymentActions ? [{ id: 'advances', label: 'Payments', icon: CreditCard }] : []),
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-3 py-2.5 flex items-center gap-1.5 text-[7px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab.id ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <tab.icon size={12} />
                            {tab.label}
                            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-600 rounded-t-full" />}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 opacity-50">
                            <div className="w-8 h-8 border-3 border-teal-500/10 border-t-teal-500 rounded-full animate-spin" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Syncing with Financial Ledger...</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {/* Financial Summary Tab */}
                            {activeTab === 'summary' && (
                                <div className="space-y-8">
                                    {/* ── Step-by-step Billing Ledger ── */}
                                    {(() => {
                                        const bedTotal = Math.round(summary?.bedCharges?.total || 0);
                                        const catBreakdown = summary?.extraCharges?.categoryBreakdown || {};

                                        // Pharmacy medicine bill — ONLY from pharmacy issuances (category "Pharmacy", positive amounts)
                                        const pharmaTotal = Math.round(catBreakdown['Pharmacy'] || 0);

                                        // Lab charges — from LabOrders linked to this admission
                                        const labTotal = Math.round(catBreakdown['Lab'] || 0);

                                        const otherExtra = Math.round(
                                            Object.entries(catBreakdown)
                                                .filter(([cat]) => cat !== 'Pharmacy' && cat !== 'Lab')
                                                .reduce((sum, [, val]) => sum + (val as number), 0)
                                        );
                                        const otherExtraCats = Object.keys(catBreakdown)
                                            .filter(c => c !== 'Pharmacy' && c !== 'Lab');

                                        // Total = Bed + Pharma + Lab + Other
                                        const totalAmount = bedTotal + pharmaTotal + labTotal + otherExtra;
                                        const returnCredits = Math.round(summary?.financials?.returnCredits || 0);
                                        const netAfterReturn = Math.max(0, totalAmount - returnCredits);
                                        const discount = Math.round(summary?.financials?.discount || 0);
                                        const afterDiscount = Math.max(0, netAfterReturn - discount);
                                        const totalAdvance = Math.round(summary?.financials?.totalAdvance || 0);
                                        const finalBill = Math.max(0, afterDiscount - totalAdvance);
                                        const overpaid = Math.max(0, totalAdvance - afterDiscount);

                                        // Row helper — now with expandable accordion
                                        const Row = ({ label, sub, amount, color = 'text-slate-800', bg = '', rowKey, subItems }: {
                                            label: string; sub?: string; amount: string; color?: string; bg?: string; rowKey?: string; subItems?: any[];
                                        }) => {
                                            const isExpandable = rowKey && subItems && subItems.length > 0;
                                            const isExpanded = rowKey ? expandedRows[rowKey] : false;
                                            return (
                                                <div>
                                                    <div
                                                        className={`flex justify-between items-center px-3 py-2 rounded-lg ${bg} ${isExpandable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                                                        onClick={() => {
                                                            if (isExpandable && rowKey) {
                                                                setExpandedRows(prev => ({ ...prev, [rowKey]: !prev[rowKey] }));
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            <div>
                                                                <span className={`text-[8px] font-bold uppercase ${color}`}>{label}</span>
                                                                {sub && <span className="ml-2 text-[6px] font-black text-slate-400 uppercase tracking-widest">{sub}</span>}
                                                            </div>
                                                            {isExpandable && (
                                                                <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                            )}
                                                        </div>
                                                        <span className={`text-[9px] font-black ${color}`}>{amount}</span>
                                                    </div>
                                                    {isExpandable && isExpanded && (
                                                        <div className="ml-4 mr-2 mt-1 mb-2 border-l-2 border-slate-200 pl-3 space-y-1 animate-in slide-in-from-top-1 duration-200">
                                                            {subItems!.map((item: any, idx: number) => (
                                                                <div key={idx} className="flex justify-between items-center py-1 text-[7px]">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-slate-500 uppercase">{item.description || item.bedId || item.type || 'Item'}</span>
                                                                        {item.date && <span className="text-slate-400">{format(new Date(item.date), 'dd MMM')}</span>}
                                                                        {item.category && <span className="px-1 py-0.5 bg-slate-100 text-slate-400 rounded text-[5px] font-black uppercase">{item.category}</span>}
                                                                    </div>
                                                                    <span className={`font-black ${item.status === 'Reversed' ? 'text-slate-300 line-through' : 'text-slate-600'}`}>₹ {(item.amount || item.charge || 0).toLocaleString()}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        };

                                        const Divider = ({ label }: { label: string }) => (
                                            <div className="border-t border-dashed border-slate-200 pt-3 mt-1 mb-2">
                                                <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                                            </div>
                                        );

                                        const SubTotal = ({ label, amount, color = 'text-slate-900', bg = 'bg-slate-100' }: {
                                            label: string; amount: string; color?: string; bg?: string;
                                        }) => (
                                            <div className={`flex justify-between items-center px-3 py-2 rounded-lg mt-2 ${bg}`}>
                                                <span className={`text-[8px] font-black uppercase ${color}`}>{label}</span>
                                                <span className={`text-[10px] font-black ${color}`}>{amount}</span>
                                            </div>
                                        );

                                        return (
                                            <div className="bg-white rounded-[16px] border border-slate-200 overflow-hidden shadow-sm">
                                                <div className="px-4 py-2.5 bg-slate-900 text-white flex justify-between items-center">
                                                    <h3 className="text-[9px] font-black uppercase tracking-widest">Patient Bill Statement</h3>
                                                    <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse inline-block" />
                                                        Live
                                                    </span>
                                                </div>

                                                <div className="p-4 space-y-1">

                                                    {/* ── CHARGES (with accordion drilldown) ── */}
                                                    <Row
                                                        label="Bed Charges"
                                                        sub={`${summary?.bedCharges?.items?.length || 0} bed(s) @ daily rate`}
                                                        amount={`₹ ${bedTotal.toLocaleString()}`}
                                                        bg="bg-blue-50/50"
                                                        color="text-blue-800"
                                                        rowKey="bed"
                                                        subItems={summary?.bedCharges?.items?.map((b: any) => ({ description: `${b.bedId} • ${b.type}`, charge: b.charge, date: null, category: `${Math.ceil(b.days || 1)} day(s) @ ₹${b.rate}` }))}
                                                    />

                                                    <Row
                                                        label="Pharmacy Medicine Bill"
                                                        sub="IPD medicine issuances only"
                                                        amount={`₹ ${pharmaTotal.toLocaleString()}`}
                                                        bg="bg-violet-50/50"
                                                        color="text-violet-800"
                                                        rowKey="pharmacy"
                                                        subItems={(summary?.extraCharges?.items || []).filter((i: any) => i.category === 'Pharmacy')}
                                                    />

                                                    <Row
                                                        label="Lab Investigation Charges"
                                                        sub="Tests ordered during admission"
                                                        amount={`₹ ${labTotal.toLocaleString()}`}
                                                        bg="bg-cyan-50/50"
                                                        color="text-cyan-800"
                                                        rowKey="lab"
                                                        subItems={(summary?.extraCharges?.items || []).filter((i: any) => i.category === 'Lab')}
                                                    />
                                                    {otherExtra > 0 && (
                                                        <Row
                                                            label="Other Charges"
                                                            sub={otherExtraCats.join(', ') || 'Nursing, OT, Misc'}
                                                            amount={`₹ ${otherExtra.toLocaleString()}`}
                                                            bg="bg-orange-50/50"
                                                            color="text-orange-800"
                                                            rowKey="other"
                                                            subItems={(summary?.extraCharges?.items || []).filter((i: any) => i.category !== 'Pharmacy' && i.category !== 'Lab')}
                                                        />
                                                    )}

                                                    <SubTotal label="Total Amount" amount={`₹ ${totalAmount.toLocaleString()}`} />

                                                    {/* ── DEDUCTIONS ── */}
                                                    {returnCredits > 0 && (
                                                        <>
                                                            <Divider label="Deductions" />
                                                            <Row
                                                                label="(−) Returned Medicines"
                                                                sub="medicine return credit"
                                                                amount={`₹ ${returnCredits.toLocaleString()}`}
                                                                bg="bg-rose-50/50"
                                                                color="text-rose-600"
                                                            />
                                                            <SubTotal
                                                                label="Net Bill After Returns"
                                                                amount={`₹ ${netAfterReturn.toLocaleString()}`}
                                                                bg="bg-slate-100"
                                                            />
                                                        </>
                                                    )}

                                                    {discount > 0 && (
                                                        <>
                                                            {returnCredits === 0 && <Divider label="Deductions" />}
                                                            <Row
                                                                label="(−) Discount / Adjustment"
                                                                amount={`₹ ${discount.toLocaleString()}`}
                                                                bg="bg-emerald-50/50"
                                                                color="text-emerald-700"
                                                            />
                                                            <SubTotal
                                                                label="After Discount"
                                                                amount={`₹ ${afterDiscount.toLocaleString()}`}
                                                                bg="bg-slate-100"
                                                            />
                                                        </>
                                                    )}

                                                    {/* ── PAYMENT ── */}
                                                    <Divider label="Payment Received" />
                                                    <Row
                                                        label="(−) Advance Paid"
                                                        sub="all recorded payments incl. admission"
                                                        amount={`₹ ${totalAdvance.toLocaleString()}`}
                                                        bg="bg-teal-50/50"
                                                        color="text-teal-700"
                                                    />

                                                    {/* ── FINAL BILL (professional dark card for due, emerald for settled/overpaid) ── */}
                                                    <div className={`rounded-xl p-4 mt-3 flex justify-between items-center border-2 ${overpaid > 0
                                                            ? 'bg-emerald-50 border-emerald-300'
                                                            : finalBill === 0
                                                                ? 'bg-emerald-50 border-emerald-200'
                                                                : 'bg-slate-900 border-slate-800'
                                                        }`}>
                                                        <div>
                                                            <p className={`text-[9px] font-black uppercase tracking-widest ${overpaid > 0 || finalBill === 0 ? 'text-emerald-600' : 'text-slate-400'
                                                                }`}>
                                                                {overpaid > 0 ? 'Overpaid — Refund Due' : finalBill === 0 ? '✓ Fully Settled' : 'Final Patient Bill'}
                                                            </p>
                                                            {overpaid > 0 && (
                                                                <p className="text-[7px] font-bold text-emerald-500 mt-0.5">Return ₹ {overpaid.toLocaleString()} to patient</p>
                                                            )}
                                                        </div>
                                                        <p className={`text-3xl font-black tracking-tight ${overpaid > 0 || finalBill === 0 ? 'text-emerald-600' : 'text-teal-400'
                                                            }`}>
                                                            ₹ {(overpaid > 0 ? overpaid : finalBill).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Actions — context-aware: show modification buttons only when unlocked */}
                                    <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                                        {summary?.isBillLocked ? (
                                            /* ── Locked State: Show Print & Unlock Request ── */
                                            <>
                                                <button
                                                    onClick={() => summary && printIPDLedger(summary, hospitalDetails)}
                                                    className="px-5 py-3 bg-teal-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all flex items-center gap-2 shadow-lg shadow-teal-200 h-fit"
                                                >
                                                    <Printer size={14} /> Print Final Bill
                                                </button>
                                                <div className="flex-1 min-w-[50px]" />
                                                <button
                                                    onClick={() => window.confirm('Bill unlock requires Hospital Admin approval.\n\nPlease contact your Hospital Administrator to unlock this bill from the Admin Panel → IPD Management.')}
                                                    className="px-4 py-3 bg-white border border-slate-200 text-slate-400 rounded-xl text-[7px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all flex items-center gap-1.5 h-fit"
                                                >
                                                    <Lock size={12} /> Request Admin Unlock
                                                </button>
                                            </>
                                        ) : (
                                            /* ── Unlocked State: Show modification buttons ── */
                                            <>
                                                {summary?.status !== 'Discharge Initiated' && (
                                                    <button
                                                        onClick={() => { setShowChargeForm(true); setActiveTab('charges'); }}
                                                        className="px-4 py-3 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-lg h-fit"
                                                    >
                                                        <Plus size={14} /> Add Charge
                                                    </button>
                                                )}
                                                {!hidePaymentActions && (
                                                    <>
                                                        <button
                                                            onClick={() => setShowDiscountForm(true)}
                                                            className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-sm h-fit"
                                                        >
                                                            <Tag size={14} /> Apply Discount
                                                        </button>
                                                        <div className="flex-1 min-w-[100px]" />
                                                        <button
                                                            onClick={handleLockBill}
                                                            disabled={submitting}
                                                            className="px-4 py-3 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-xl shadow-slate-200 h-fit ml-auto"
                                                        >
                                                            <Lock size={14} /> Finalize & Lock
                                                        </button>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Charges Tab */}
                            {activeTab === 'charges' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-black uppercase tracking-tight text-slate-700">Detailed Charges</h3>
                                        {/* {!summary?.isBillLocked && !showChargeForm && summary?.status !== 'Discharge Initiated' && (
                                            <button
                                                onClick={() => setShowChargeForm(true)}
                                                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-2"
                                            >
                                                <Plus size={14} /> New Charge
                                            </button>
                                        )} */}
                                    </div>

                                    {showChargeForm && (
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in slide-in-from-top-4 duration-300">
                                            <form onSubmit={handleAddCharge} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                                <div className="space-y-1.5 md:col-span-3">
                                                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                                                    <select
                                                        value={chargeData.category}
                                                        onChange={(e) => setChargeData(prev => ({ ...prev, category: e.target.value }))}
                                                        className="w-full px-3 py-2.5 bg-white border border-slate-100 rounded-lg text-[9px] font-bold outline-none focus:ring-2 focus:ring-teal-500/20"
                                                    >
                                                        <option>Nursing</option>
                                                        <option>Doctor Fee</option>
                                                        <option>OT</option>
                                                        <option>Pharmacy</option>
                                                        <option>Consumables</option>
                                                        <option>Lab</option>
                                                        <option>Misc</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5 md:col-span-4">
                                                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                                    <input
                                                        required
                                                        value={chargeData.description}
                                                        onChange={(e) => setChargeData(prev => ({ ...prev, description: e.target.value }))}
                                                        className="w-full px-3 py-2.5 bg-white border border-slate-100 rounded-lg text-[9px] font-bold outline-none focus:ring-2 focus:ring-teal-500/20"
                                                        placeholder="E.G. Consult, etc."
                                                    />
                                                </div>
                                                <div className="space-y-1.5 md:col-span-5">
                                                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                                                    <div className="flex gap-1.5">
                                                        <input
                                                            required
                                                            type="number"
                                                            value={chargeData.amount}
                                                            onChange={(e) => setChargeData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                                            className="flex-1 min-w-[60px] px-3 py-2.5 bg-white border border-slate-100 rounded-lg text-[9px] font-bold outline-none focus:ring-2 focus:ring-teal-500/20"
                                                        />
                                                        <button
                                                            disabled={submitting}
                                                            className="px-4 py-2.5 bg-teal-600 text-white rounded-lg text-[7px] font-black uppercase transition-all disabled:opacity-50"
                                                        >
                                                            Add
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowChargeForm(false)}
                                                            className="p-2.5 bg-slate-200 text-slate-500 rounded-lg"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    )}

                                    {/* Bed Items */}
                                    <div className="space-y-3">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Bed Occupancy</p>
                                        {summary?.bedCharges?.items.map((item: any, i: number) => (
                                            <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-md"><BedIcon size={18} /></div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-900 uppercase">{item.bedId || "Unknown Bed"} • {item.type}</p>
                                                        <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{item.days < 1 ? `${Math.round(item.days * 24)}h` : item.days === 1 ? '1 Day' : `${Math.ceil(item.days)} Days`} @ ₹ {item.rate}/day</p>
                                                    </div>
                                                </div>
                                                <p className="font-black text-slate-900">₹ {item.charge.toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Extra Items */}
                                    <div className="space-y-3">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Extra Services</p>
                                        {summary?.extraCharges?.items.length === 0 ? (
                                            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">No extra charges recorded</p>
                                            </div>
                                        ) : (
                                            summary?.extraCharges?.items.map((item: any, i: number) => (
                                                <div key={i} className="p-3 bg-white border border-slate-100 rounded-xl flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${item.status === 'Reversed' ? 'bg-slate-100 text-slate-400' : 'bg-teal-50 text-teal-600'}`}>
                                                            <Tag size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="text-[9px] font-black text-slate-900 uppercase">{item.description}</p>
                                                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-md text-[5.5px] font-black uppercase">{item.category}</span>
                                                            </div>
                                                            <p className="text-[7px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{format(new Date(item.date), 'dd MMM yyyy, hh:mm a')}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-[10px] font-black ${item.status === 'Reversed' ? 'text-slate-300 line-through' : 'text-slate-900'}`}>₹ {item.amount.toLocaleString()}</p>
                                                        {item.status === 'Reversed' && <p className="text-[5px] font-black text-rose-500 uppercase tracking-widest">Reversed</p>}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Advances Tab */}
                            {activeTab === 'advances' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-black uppercase tracking-tight text-slate-700">Payment History</h3>
                                        {/* {!summary?.isBillLocked && !showAdvanceForm && (
                                            <button
                                                onClick={() => setShowAdvanceForm(true)}
                                                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-2"
                                            >
                                                <Plus size={14} /> Record Payment
                                            </button>
                                        )} */}
                                    </div>

                                    {showAdvanceForm && (
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in slide-in-from-top-4 duration-300">
                                            <form onSubmit={handleAddAdvance} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                                <div className="space-y-1.5 md:col-span-3">
                                                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                                                    <select
                                                        value={advanceData.transactionType}
                                                        onChange={(e) => setAdvanceData(prev => ({ ...prev, transactionType: e.target.value }))}
                                                        className={`w-full px-3 py-2.5 border border-slate-100 rounded-lg text-[9px] font-bold outline-none focus:ring-2 focus:ring-teal-500/20 ${advanceData.transactionType === 'Refund' ? 'bg-rose-50 text-rose-600 border-rose-100' : advanceData.transactionType === 'Settlement' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-white'}`}
                                                    >
                                                        <option value="Advance">Advance</option>
                                                        <option value="Settlement">Settlement</option>
                                                        <option value="Refund">Refund</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5 md:col-span-2">
                                                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Mode</label>
                                                    <select
                                                        value={advanceData.mode}
                                                        onChange={(e) => setAdvanceData(prev => ({ ...prev, mode: e.target.value }))}
                                                        className="w-full px-3 py-2.5 bg-white border border-slate-100 rounded-lg text-[9px] font-bold outline-none focus:ring-2 focus:ring-teal-500/20"
                                                    >
                                                        <option value="Cash">Cash</option>
                                                        <option value="Card">Card</option>
                                                        <option value="UPI">UPI</option>
                                                        <option value="Bank Transfer">Bank Transfer</option>
                                                        <option value="Insurance">Insurance</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5 md:col-span-3">
                                                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Ref ID</label>
                                                    <input
                                                        value={advanceData.reference}
                                                        onChange={(e) => setAdvanceData(prev => ({ ...prev, reference: e.target.value }))}
                                                        className="w-full px-3 py-2.5 bg-white border border-slate-100 rounded-lg text-[9px] font-bold outline-none focus:ring-2 focus:ring-teal-500/20"
                                                        placeholder="Optional"
                                                    />
                                                </div>
                                                <div className="space-y-1.5 md:col-span-4">
                                                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                                                    <div className="flex gap-1.5">
                                                        <input
                                                            required
                                                            type="number"
                                                            value={advanceData.amount}
                                                            onChange={(e) => setAdvanceData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                                            className="flex-1 min-w-[60px] px-3 py-2.5 bg-white border border-slate-100 rounded-lg text-[9px] font-bold outline-none focus:ring-2 focus:ring-teal-500/20"
                                                        />
                                                        <button
                                                            disabled={submitting}
                                                            className={`px-4 py-2.5 rounded-lg text-[7px] font-black uppercase transition-all disabled:opacity-50 text-white ${advanceData.transactionType === 'Refund' ? 'bg-rose-600' : 'bg-teal-600'}`}
                                                        >
                                                            {advanceData.transactionType === 'Refund' ? 'Refund' : 'Pay'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowAdvanceForm(false)}
                                                            className="p-2.5 bg-slate-200 text-slate-500 rounded-lg"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {summary?.advances?.length === 0 ? (
                                            <div className="p-12 text-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                                                <ArrowDownCircle size={40} className="text-slate-200 mx-auto mb-4" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No financial transactions yet</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                                                        <Info size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Payment Summary</p>
                                                        <p className="text-xs font-bold text-emerald-700 mt-1">Total advance of ₹ {summary?.financials?.totalAdvance.toLocaleString()} recorded across all transactions.</p>
                                                    </div>
                                                </div>
                                                {summary?.advances?.map((adv: any, i: number) => (
                                                    <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center group shadow-sm transition-all hover:shadow-md">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${adv.transactionType === 'Refund' ? 'bg-rose-50 text-rose-600' : adv.transactionType === 'Settlement' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                                {adv.transactionType === 'Refund' ? <ArrowUpCircle size={18} /> : adv.transactionType === 'Settlement' ? <CheckCircle2 size={18} /> : <ArrowDownCircle size={18} />}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[10px] font-black text-slate-900 uppercase">
                                                                        {adv.transactionType === 'Refund' ? 'Refund Issued' : adv.transactionType === 'Settlement' ? 'Final Settlement' : 'Advance Payment'}
                                                                    </p>
                                                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[6px] font-black uppercase">{adv.mode}</span>
                                                                </div>
                                                                <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                                                    {format(new Date(adv.date), 'dd MMM yyyy, hh:mm a')} • {adv.reference || 'No Ref'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`font-black ${adv.transactionType === 'Refund' ? 'text-rose-600' : adv.transactionType === 'Settlement' ? 'text-blue-600' : 'text-emerald-600'}`}>
                                                                {adv.transactionType === 'Refund' ? '-' : '+'}₹ {adv.amount.toLocaleString()}
                                                            </p>
                                                            <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Processed</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Section (Locked status if applicable) */}
                {summary?.isBillLocked && (
                    <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-3">
                        <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center shrink-0">
                            <Lock size={14} className="text-teal-400" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white uppercase tracking-widest">Finalized Statement</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">This bill has been locked for settlement. No further modifications are permitted.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Sub-modals */}
            {
                showDiscountForm && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-8 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Financial Adjustment</h3>
                                <button onClick={() => setShowDiscountForm(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>
                            <form onSubmit={handleApplyDiscount} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Discount Amount (₹)</label>
                                    <input
                                        required
                                        type="number"
                                        value={discountData.amount}
                                        onChange={(e) => setDiscountData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black focus:border-emerald-500 outline-none transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adjustment Reason</label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={discountData.reason}
                                        onChange={(e) => setDiscountData(prev => ({ ...prev, reason: e.target.value }))}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:border-emerald-500 outline-none transition-all resize-none"
                                        placeholder="E.G. Hospital Policy, Special Approval, etc."
                                    />
                                </div>
                                <button
                                    disabled={submitting}
                                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50"
                                >
                                    {submitting ? "Applying..." : "Confirm Adjustment"}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
