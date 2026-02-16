'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    Receipt,
    Plus,
    CreditCard,
    Tag,
    Lock,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    ArrowDownCircle,
    ArrowUpCircle,
    History,
    Wallet,
    Info,
    Trash2,
    Bed as BedIcon
} from 'lucide-react';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface IPDBillingModalProps {
    isOpen: boolean;
    onClose: () => void;
    admissionId: string;
}

export const IPDBillingModal: React.FC<IPDBillingModalProps> = ({ isOpen, onClose, admissionId }) => {
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'summary' | 'charges' | 'advances'>('summary');

    // Form States
    const [showChargeForm, setShowChargeForm] = useState(false);
    const [showAdvanceForm, setShowAdvanceForm] = useState(false);
    const [showDiscountForm, setShowDiscountForm] = useState(false);

    const [chargeData, setChargeData] = useState({ category: 'Nursing', description: '', amount: 0 });
    const [advanceData, setAdvanceData] = useState({ amount: 0, mode: 'Cash', transactionType: 'Advance', reference: '' });
    const [discountData, setDiscountData] = useState({ amount: 0, reason: '' });

    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && admissionId) {
            fetchSummary();
        }
    }, [isOpen, admissionId]);

    const fetchSummary = async () => {
        try {
            setLoading(true);
            const data = await ipdService.getBillSummary(admissionId);
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                            <Receipt size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-tight leading-tight">Billing Statement</h2>
                            <p className="text-[8px] font-bold text-teal-400 uppercase tracking-widest mt-0.5">
                                {summary?.patientName || 'Loading...'} • ID: {summary?.admissionId || admissionId}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {summary?.isBillLocked && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 text-rose-300 rounded-lg text-[8px] font-black uppercase tracking-widest border border-rose-500/30">
                                <Lock size={12} /> Bill Locked
                            </div>
                        )}
                        <button onClick={onClose} className="w-8 h-8 bg-white/10 text-white rounded-lg flex items-center justify-center hover:bg-white/20 transition-all">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-50 px-6 border-b border-slate-100">
                    {[
                        { id: 'summary', label: 'Summary', icon: Wallet },
                        { id: 'charges', label: 'Charges', icon: History },
                        { id: 'advances', label: 'Payments', icon: CreditCard },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-3 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab.id ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-600 rounded-t-full" />}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                            <div className="w-12 h-12 border-4 border-teal-500/10 border-t-teal-500 rounded-full animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing with Financial Ledger...</p>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {/* Financial Summary Tab */}
                            {activeTab === 'summary' && (
                                <div className="space-y-8">
                                    {/* Stat Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-[24px] border border-slate-100 text-center space-y-1">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Bill</p>
                                            <p className="text-xl font-black text-slate-900">₹{summary?.financials?.finalAmount.toLocaleString()}</p>
                                        </div>
                                        <div className="p-4 bg-teal-50 rounded-[24px] border border-teal-100 text-center space-y-1">
                                            <p className="text-[8px] font-black text-teal-600 uppercase tracking-widest">Advance Paid</p>
                                            <p className="text-xl font-black text-teal-700">₹{summary?.financials?.totalAdvance.toLocaleString()}</p>
                                        </div>
                                        <div className={`p-4 rounded-[24px] border text-center space-y-1 ${summary?.financials?.balance > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                            <p className={`text-[8px] font-black uppercase tracking-widest ${summary?.financials?.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Balance Due</p>
                                            <p className={`text-xl font-black ${summary?.financials?.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>₹{Math.max(0, summary?.financials?.balance).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {/* Detailed Breakdown */}
                                    <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm">
                                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                            <h3 className="text-[10px] font-black uppercase tracking-tight text-slate-700">Statement Breakdown</h3>
                                            <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Live Ledger</div>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shadow-sm"><Tag size={14} /></div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-800 uppercase leading-none">Bed Charges</p>
                                                        <p className="text-[7px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Days @ Daily Rate</p>
                                                    </div>
                                                </div>
                                                <p className="text-xs font-black text-slate-900">₹{summary?.bedCharges?.total.toLocaleString()}</p>
                                            </div>
                                            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shadow-sm"><AlertCircle size={14} /></div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-800 uppercase leading-none">Extra Charges</p>
                                                        <p className="text-[7px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Nursing, OT, Lab, Misc</p>
                                                    </div>
                                                </div>
                                                <p className="text-xs font-black text-slate-900">₹{summary?.extraCharges?.total.toLocaleString()}</p>
                                            </div>
                                            {summary?.financials?.discount > 0 && (
                                                <div className="flex justify-between items-center pb-3 border-b border-slate-50 text-emerald-600">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shadow-sm"><Tag size={14} /></div>
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase leading-none">Discount Applied</p>
                                                            <p className="text-[7px] font-bold opacity-60 mt-0.5 uppercase tracking-widest">Adjusted</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-xs font-black text-emerald-700">- ₹{summary?.financials?.discount.toLocaleString()}</p>
                                                        {!summary?.isBillLocked && (
                                                            <button
                                                                onClick={handleRemoveDiscount}
                                                                className="p-1.5 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-all"
                                                                title="Remove Discount"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
                                        {!summary?.isBillLocked && (
                                            <>
                                                <button
                                                    onClick={() => { setShowChargeForm(true); setActiveTab('charges'); }}
                                                    className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg h-fit"
                                                >
                                                    <Plus size={16} /> Add Charge
                                                </button>
                                                <button
                                                    onClick={() => { setShowAdvanceForm(true); setActiveTab('advances'); }}
                                                    className="px-6 py-4 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all flex items-center gap-2 shadow-lg h-fit"
                                                >
                                                    <Wallet size={16} /> Record Payment
                                                </button>
                                                <button
                                                    onClick={() => setShowDiscountForm(true)}
                                                    className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm h-fit"
                                                >
                                                    <Tag size={16} /> Apply Discount
                                                </button>
                                                <div className="flex-1 min-w-[200px]" />
                                                <button
                                                    onClick={handleLockBill}
                                                    disabled={submitting}
                                                    className="px-6 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center gap-2 shadow-xl shadow-rose-200 h-fit ml-auto"
                                                >
                                                    <Lock size={16} /> Finalize & Lock
                                                </button>
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
                                        {!summary?.isBillLocked && !showChargeForm && (
                                            <button
                                                onClick={() => setShowChargeForm(true)}
                                                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-2"
                                            >
                                                <Plus size={14} /> New Charge
                                            </button>
                                        )}
                                    </div>

                                    {showChargeForm && (
                                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 animate-in slide-in-from-top-4 duration-300">
                                            <form onSubmit={handleAddCharge} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                                <div className="space-y-2">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                                                    <select
                                                        value={chargeData.category}
                                                        onChange={(e) => setChargeData(prev => ({ ...prev, category: e.target.value }))}
                                                        className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-teal-500/20"
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
                                                <div className="space-y-2 md:col-span-2">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                                    <input
                                                        required
                                                        value={chargeData.description}
                                                        onChange={(e) => setChargeData(prev => ({ ...prev, description: e.target.value }))}
                                                        className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-teal-500/20"
                                                        placeholder="E.G. Special Consult, Dressing, etc."
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            required
                                                            type="number"
                                                            value={chargeData.amount}
                                                            onChange={(e) => setChargeData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                                            className="flex-1 px-4 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-teal-500/20"
                                                        />
                                                        <button
                                                            disabled={submitting}
                                                            className="px-4 py-3 bg-teal-600 text-white rounded-xl text-[8px] font-black uppercase transition-all disabled:opacity-50"
                                                        >
                                                            Add
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowChargeForm(false)}
                                                            className="p-3 bg-slate-200 text-slate-500 rounded-xl"
                                                        >
                                                            <X size={14} />
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
                                                        <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{item.days} Days @ ₹{item.rate}/day</p>
                                                    </div>
                                                </div>
                                                <p className="font-black text-slate-900">₹{item.charge.toLocaleString()}</p>
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
                                                <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${item.status === 'Reversed' ? 'bg-slate-100 text-slate-400' : 'bg-teal-50 text-teal-600'}`}>
                                                            <Tag size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] font-black text-slate-900 uppercase">{item.description}</p>
                                                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-md text-[6px] font-black uppercase">{item.category}</span>
                                                            </div>
                                                            <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{format(new Date(item.date), 'dd MMM yyyy, hh:mm a')}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-black ${item.status === 'Reversed' ? 'text-slate-300 line-through' : 'text-slate-900'}`}>₹{item.amount.toLocaleString()}</p>
                                                        {item.status === 'Reversed' && <p className="text-[6px] font-black text-rose-500 uppercase tracking-widest">Reversed</p>}
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
                                        {!summary?.isBillLocked && !showAdvanceForm && (
                                            <button
                                                onClick={() => setShowAdvanceForm(true)}
                                                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-2"
                                            >
                                                <Plus size={14} /> Record Payment
                                            </button>
                                        )}
                                    </div>

                                    {showAdvanceForm && (
                                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 animate-in slide-in-from-top-4 duration-300">
                                            <form onSubmit={handleAddAdvance} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                                <div className="space-y-2">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                                                    <select
                                                        value={advanceData.transactionType}
                                                        onChange={(e) => setAdvanceData(prev => ({ ...prev, transactionType: e.target.value }))}
                                                        className={`w-full px-4 py-3 border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-teal-500/20 ${advanceData.transactionType === 'Refund' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-white'}`}
                                                    >
                                                        <option value="Advance">Advance Payment</option>
                                                        <option value="Refund">Manual Refund</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Mode</label>
                                                    <select
                                                        value={advanceData.mode}
                                                        onChange={(e) => setAdvanceData(prev => ({ ...prev, mode: e.target.value }))}
                                                        className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-teal-500/20"
                                                    >
                                                        <option>Cash</option>
                                                        <option>Card</option>
                                                        <option>UPI</option>
                                                        <option>Bank Transfer</option>
                                                        <option>Insurance</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Ref / Trans ID</label>
                                                    <input
                                                        value={advanceData.reference}
                                                        onChange={(e) => setAdvanceData(prev => ({ ...prev, reference: e.target.value }))}
                                                        className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-teal-500/20"
                                                        placeholder="Optional"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            required
                                                            type="number"
                                                            value={advanceData.amount}
                                                            onChange={(e) => setAdvanceData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                                            className="flex-1 px-4 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-teal-500/20"
                                                        />
                                                        <button
                                                            disabled={submitting}
                                                            className={`px-4 py-3 rounded-xl text-[8px] font-black uppercase transition-all disabled:opacity-50 text-white ${advanceData.transactionType === 'Refund' ? 'bg-rose-600' : 'bg-teal-600'}`}
                                                        >
                                                            {advanceData.transactionType === 'Refund' ? 'Refund' : 'Pay'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowAdvanceForm(false)}
                                                            className="p-3 bg-slate-200 text-slate-500 rounded-xl"
                                                        >
                                                            <X size={14} />
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
                                                        <p className="text-xs font-bold text-emerald-700 mt-1">Total advance of ₹{summary?.financials?.totalAdvance.toLocaleString()} recorded across all transactions.</p>
                                                    </div>
                                                </div>
                                                {summary?.advances?.map((adv: any, i: number) => (
                                                    <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center group shadow-sm transition-all hover:shadow-md">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${adv.transactionType === 'Refund' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                                {adv.transactionType === 'Refund' ? <ArrowDownCircle size={18} className="rotate-180" /> : <ArrowDownCircle size={18} />}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[10px] font-black text-slate-900 uppercase">{adv.transactionType === 'Refund' ? 'Refund Issued' : 'Advance Payment'}</p>
                                                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[6px] font-black uppercase">{adv.mode}</span>
                                                                </div>
                                                                <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                                                    {format(new Date(adv.date), 'dd MMM yyyy, hh:mm a')} • {adv.reference || 'No Ref'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`font-black ${adv.transactionType === 'Refund' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                {adv.transactionType === 'Refund' ? '-' : '+'}₹{adv.amount.toLocaleString()}
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
                    <div className="p-6 bg-rose-50 border-t border-rose-100 flex items-center gap-4">
                        <Lock size={20} className="text-rose-600" />
                        <div>
                            <p className="text-[10px] font-black text-rose-800 uppercase tracking-widest">Finalized Statement</p>
                            <p className="text-[8px] font-bold text-rose-600 uppercase mt-0.5">This bill has been locked for settlement. No further modifications are permitted.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Sub-modals */}
            {showDiscountForm && (
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
            )}
        </div>
    );
};
