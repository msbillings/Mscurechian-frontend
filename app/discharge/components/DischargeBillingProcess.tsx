'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Button, FormInput, FormSelect, FormTextarea } from '@/components/admin';
import { ArrowLeft, Save, FileCheck, Receipt } from 'lucide-react';
import { dischargeService } from '@/lib/integrations/services/discharge.service';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import toast from 'react-hot-toast';
import { Tag, AlertCircle, Info, Lock } from 'lucide-react';

export function DischargeBillingProcess() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const admissionId = searchParams.get('admissionId');
    const [loading, setLoading] = useState(false);
    const [recordData, setRecordData] = useState<any>(null);
    const [billSummary, setBillSummary] = useState<any>(null);

    const [billingData, setBillingData] = useState({
        advanceAmount: 0,
        finalPayment: 0,
        totalBillAmount: 0,
        paymentMode: 'cash',
        insuranceName: '',
        allergyHistory: '',
        bedChargesTotal: 0,
        extraChargesTotal: 0,
        discountAmount: 0
    });

    useEffect(() => {
        if (admissionId) {
            fetchAdmissionDetails(admissionId);
        }
    }, [admissionId]);

    const fetchAdmissionDetails = async (id: string) => {
        try {
            setLoading(true);
            const [data, summary] = await Promise.all([
                dischargeService.getAdmissionDetails(id),
                ipdService.getBillSummary(id).catch(e => {
                    console.error("Ledger fetch failed", e);
                    return null;
                })
            ]);

            if (data) {
                setRecordData(data);
                setBillSummary(summary);

                // Auto-fill from SUMMARY if available (SOURCE OF TRUTH)
                if (summary?.financials) {
                    setBillingData({
                        advanceAmount: summary.financials.totalAdvance || 0,
                        totalBillAmount: summary.financials.finalAmount || 0,
                        finalPayment: summary.financials.balance || 0,
                        paymentMode: data.paymentMode || 'cash',
                        insuranceName: data.insuranceName || '',
                        allergyHistory: data.allergyHistory || data.vitals?.sugar || '',
                        bedChargesTotal: summary.bedCharges?.total || 0,
                        extraChargesTotal: summary.extraCharges?.total || 0,
                        discountAmount: summary.financials?.discount || 0
                    });
                } else if (data.vitals) {
                    // Pre-fill existing billing data if any (legacy path)
                    setBillingData(prev => ({
                        ...prev,
                        advanceAmount: data.advanceAmount || 0,
                        totalBillAmount: data.totalBillAmount || 0,
                        finalPayment: data.finalPayment || 0,
                        paymentMode: data.paymentMode || 'cash',
                        insuranceName: data.insuranceName || '',
                        allergyHistory: data.allergyHistory || ''
                    }));
                }
            }
        } catch (error) {
            console.error("Failed to fetch details", error);
            toast.error("Failed to load patient details");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name === 'advanceAmount' || name === 'finalPayment') {
            const val = parseFloat(value) || 0;
            setBillingData(prev => {
                const newBilling = { ...prev, [name]: val };
                const advance = name === 'advanceAmount' ? val : prev.advanceAmount;
                const final = name === 'finalPayment' ? val : prev.finalPayment;
                newBilling.totalBillAmount = advance + final;
                return newBilling;
            });
        } else if (name === 'totalBillAmount') {
            // If user manually edits Total, should we adjust Final?
            // Let's allow manual edit but maybe it gets overwritten if they touch others?
            // Or maybe we treat Total as the sum always. 
            // If they edit Total, let's keep it, but if they touch Advance/Final it recalculates.
            // Actually, simplest is to let Total be Sum. 
            const val = parseFloat(value) || 0;
            setBillingData(prev => ({ ...prev, [name]: val }));
        } else {
            setBillingData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admissionId) return;

        setLoading(true);
        try {
            const payload = {
                ...recordData,
                ...billingData,
                status: 'completed',
                dischargeDate: new Date().toISOString()
            };

            // If the record is already completed, we are updating it.
            // If it is 'PREPARED_BY_NURSE' (Draft) or has no status, we are CREATING the final record.
            // The Draft ID (_id) from PendingDischarge cannot be used to update DischargeRecord collection.

            if (recordData.status === 'completed' && recordData._id) {
                await dischargeService.updateRecord(recordData._id, payload);
            } else {
                // It is a draft or new, so we create a new DischargeRecord
                // We do NOT pass the draft's _id to saveRecord, as mongo will generate a new one for the DischargeRecord
                const { _id, ...cleanPayload } = payload;
                await dischargeService.saveRecord(cleanPayload);
            }

            toast.success("Discharge finalized & Bill generated");
            router.push('/helpdesk/discharge');
        } catch (error: any) {
            toast.error(error.message || "Failed to finalize discharge");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !recordData) {
        return <div className="p-8 text-center text-slate-500">Loading patient details...</div>;
    }

    if (!recordData) {
        return <div className="p-8 text-center text-rose-500">Patient record not found</div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-4 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-slate-900">Finalize Discharge</h1>
                    <p className="text-xs text-slate-500 font-bold">Billing & Insurance Processing</p>
                </div>
                <Button
                    onClick={() => router.back()}
                    className="border border-slate-200 text-black shadow-sm font-bold"
                >
                    <ArrowLeft size={16} className="mr-2" /> Back
                </Button>
            </div>

            {/* Read-Only Clinical Summary */}
            <Card className="p-4 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                        <FileCheck size={18} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">Clinical Summary (Prepared by Nurse)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Patient Name</p>
                        <p className="font-bold text-slate-900">{recordData.patientName}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">MRN</p>
                        <p className="font-bold text-slate-900">{recordData.mrn}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Doctor</p>
                        <p className="font-bold text-slate-900">{recordData.primaryDoctor}</p>
                    </div>
                    <div className="md:col-span-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Diagnosis</p>
                        <p className="font-medium text-slate-800">{recordData.diagnosis}</p>
                    </div>
                    <div className="md:col-span-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Advice</p>
                        <p className="font-medium text-slate-800">{recordData.adviceAtDischarge || 'No specific advice'}</p>
                    </div>
                    <div className="md:col-span-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Allergies</p>
                        <p className="font-medium text-rose-600">{recordData.allergyHistory || 'None'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Follow-up Date</p>
                        <p className="font-bold text-blue-600">
                            {recordData.followUpDate
                                ? new Date(recordData.followUpDate).toLocaleString()
                                : 'Not Scheduled'}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Billing Form */}
            <form onSubmit={handleSubmit}>
                <Card className="p-5 bg-white shadow-xl shadow-blue-900/5 border-white">
                    <div className="flex items-center gap-3 mb-5 border-b border-gray-50 pb-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Receipt size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-gray-900">Billing Details</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Enter payment information</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <FormInput
                            label="Advance Paid"
                            name="advanceAmount"
                            type="number"
                            value={billingData.advanceAmount}
                            onChange={handleChange}
                            placeholder="0.00"
                            className="bg-slate-50 border-slate-200 font-bold opacity-70"
                            readOnly
                        />
                        <FormInput
                            label="Final Payment (Due)"
                            name="finalPayment"
                            type="number"
                            value={billingData.finalPayment}
                            onChange={handleChange}
                            placeholder="0.00"
                            className="bg-slate-50 border-slate-200 font-bold opacity-70"
                            readOnly
                            required
                        />
                        <FormInput
                            label="Total Bill Amount"
                            name="totalBillAmount"
                            type="number"
                            value={billingData.totalBillAmount}
                            onChange={handleChange}
                            placeholder="0.00"
                            className="bg-slate-50 border-slate-200 text-teal-600 font-bold text-lg opacity-70"
                            readOnly
                            required
                        />
                        <FormSelect
                            label="Payment Mode"
                            name="paymentMode"
                            value={billingData.paymentMode}
                            onChange={handleChange}
                            className="border-gray-400 font-bold"
                            options={[
                                { value: 'cash', label: 'Cash' },
                                { value: 'card', label: 'Card' },
                                { value: 'upi', label: 'UPI' },
                                { value: 'mixed', label: 'Mixed' },
                                { value: 'other', label: 'Other' }
                            ]}
                        />
                        <div className="md:col-span-2">
                            <FormInput
                                label="Insurance Name / TPA"
                                name="insuranceName"
                                value={billingData.insuranceName}
                                onChange={handleChange}
                                placeholder="Enter insurance provider if applicable"
                                className="border-gray-300 font-bold"
                            />
                        </div>
                    </div>

                    {/* Statement Breakdown Preview */}
                    {billSummary && (
                        <div className="mt-8 p-6 bg-slate-50 rounded-[24px] border border-slate-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Statement Breakdown</h3>
                                {!billSummary.isBillLocked && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded text-[8px] font-black uppercase border border-amber-100">
                                        <AlertCircle size={10} /> Bill Not Locked 
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white text-slate-400 rounded-lg flex items-center justify-center border border-slate-100"><Tag size={14} /></div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-800 uppercase leading-none">Bed Charges</p>
                                            <p className="text-[7px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Stay & Services</p>
                                        </div>
                                    </div>
                                    <p className="text-xs font-black text-slate-900">₹{billSummary.bedCharges?.total?.toLocaleString() || '0'}</p>
                                </div>

                                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white text-slate-400 rounded-lg flex items-center justify-center border border-slate-100"><Info size={14} /></div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-800 uppercase leading-none">Extra Charges</p>
                                            <p className="text-[7px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Clinical & Misc</p>
                                        </div>
                                    </div>
                                    <p className="text-xs font-black text-slate-900">₹{billSummary.extraCharges?.total?.toLocaleString() || '0'}</p>
                                </div>

                                {billSummary.financials?.discount > 0 && (
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-100 text-emerald-600">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><Tag size={14} /></div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase leading-none">Discount Applied</p>
                                                <p className="text-[7px] font-bold opacity-60 mt-1 uppercase tracking-tight">Managed Adjustment</p>
                                            </div>
                                        </div>
                                        <p className="text-xs font-black">- ₹{billSummary.financials.discount.toLocaleString()}</p>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-2 text-teal-600">
                                    <p className="text-[10px] font-black uppercase tracking-widest">Net Payable</p>
                                    <p className="text-sm font-black underline decoration-2 underline-offset-4">₹{billSummary.financials?.finalAmount?.toLocaleString() || '0'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4 pt-5 mt-5 border-t border-gray-50 flex-col md:flex-row md:items-center">
                        {billSummary && !billSummary.isBillLocked && (
                            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-2xl md:flex-1">
                                <AlertCircle className="text-rose-500 shrink-0" size={16} />
                                <p className="text-[9px] font-bold text-rose-700 leading-tight uppercase">
                                    Warning: The IPD bill is not locked. Please ensure the helpdesk has finalized the statement for accurate discharge records.
                                </p>
                            </div>
                        )}
                        <div className="flex-1 hidden md:block" />
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl px-6 py-2.5 font-bold shadow-lg shadow-blue-200 flex items-center gap-2 text-sm"
                        >
                            <Save size={16} />
                            {loading ? 'Finalizing...' : 'Finalize & Generate Invoice'}
                        </Button>
                    </div>
                </Card>
            </form>
        </div>
    );
}
