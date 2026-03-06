'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Button, FormInput, FormSelect, FormTextarea } from '@/components/admin';
import { ArrowLeft, Save, FileCheck, Receipt } from 'lucide-react';
import { dischargeService } from '@/lib/integrations/services/discharge.service';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import toast from 'react-hot-toast';
import { Tag, AlertCircle, Info, Lock, Wallet, Plus, X, DollarSign } from 'lucide-react';
import ClinicalReceipt from '@/components/helpdesk/ClinicalReceipt';

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

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState({
        amount: 0,
        mode: 'UPI',
        reference: ''
    });
    const [receiptData, setReceiptData] = useState<any>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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
                        advanceAmount: summary.financials.totalPaid || 0,
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
            
            // Set receipt data so the preview modal opens!
            setReceiptData({
                hospital: recordData.hospital || {},
                patient: {
                    name: recordData.patientName,
                    mrn: recordData.mrn,
                    age: recordData.age,
                    gender: recordData.gender,
                    mobile: recordData.phone,
                    email: recordData.email,
                    address: recordData.address,
                    emergencyContact: recordData.attendantName ? `${recordData.attendantName} (${recordData.attendantPhone})` : '',
                    bloodGroup: recordData.bloodGroup,
                    dateOfBirth: recordData.dob,
                    allergies: recordData.allergyHistory,
                    medicalHistory: recordData.pastMedicalHistory,
                    symptoms: recordData.reasonForAdmission,
                    vitals: recordData.vitals
                },
                appointment: {
                    type: 'Final Discharge Summary',
                    doctorName: recordData.primaryDoctor || recordData.suggestedDoctorName || 'Assigned Physician',
                    appointmentId: recordData._id || `DIS-${Date.now()}`,
                    date: recordData.admissionDate ? new Date(recordData.admissionDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
                    time: recordData.admissionDate ? new Date(recordData.admissionDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString(),
                    specialization: recordData.specialistType || 'IPD'
                },
                payment: {
                    receiptNo: recordData._id || `BILL-${Date.now()}`,
                    date: new Date().toISOString(),
                    amount: Math.round(billingData.totalBillAmount),
                    advanceAmount: Math.round(billingData.advanceAmount),
                    totalBillAmount: Math.round(billingData.totalBillAmount),
                    mode: billingData.paymentMode,
                    status: 'PAID'
                }
            });
        } catch (error: any) {
            toast.error(error.message || "Failed to finalize discharge");
        } finally {
            setLoading(false);
        }
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admissionId || !recordData) return;

        try {
            setIsProcessingPayment(true);
            const response = await ipdService.addAdvancePayment({
                admissionId,
                amount: paymentData.amount,
                mode: paymentData.mode,
                transactionType: 'Settlement',
                reference: paymentData.reference
            });

            toast.success("Payment recorded successfully");

            // Set receipt data and refresh
            setReceiptData({
                hospital: recordData.hospital || {},
                patient: {
                    name: recordData.patientName,
                    mrn: recordData.mrn,
                    age: recordData.age,
                    gender: recordData.gender,
                    mobile: recordData.phone,
                    email: recordData.email,
                    address: recordData.address,
                    emergencyContact: recordData.attendantName ? `${recordData.attendantName} (${recordData.attendantPhone})` : '',
                    bloodGroup: recordData.bloodGroup,
                    dateOfBirth: recordData.dob,
                    allergies: recordData.allergyHistory,
                    medicalHistory: recordData.pastMedicalHistory,
                    symptoms: recordData.reasonForAdmission,
                    vitals: recordData.vitals
                },
                appointment: {
                    type: 'IPD Final Settlement',
                    doctorName: recordData.primaryDoctor || recordData.suggestedDoctorName || 'Assigned Physician',
                    appointmentId: recordData._id || `SET-${Date.now()}`,
                    date: recordData.admissionDate ? new Date(recordData.admissionDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
                    time: recordData.admissionDate ? new Date(recordData.admissionDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString(),
                    specialization: recordData.specialistType || 'IPD'
                },
                payment: {
                    receiptNo: response._id || `REC-${Date.now()}`,
                    date: new Date().toISOString(),
                    amount: Math.round(paymentData.amount),
                    advanceAmount: Math.round(billingData.advanceAmount),
                    totalBillAmount: Math.round(billingData.totalBillAmount),
                    mode: paymentData.mode,
                    reference: paymentData.reference,
                    status: 'PAID' // Required for receipt generator
                }
            });

            setShowPaymentModal(false);
            fetchAdmissionDetails(admissionId);
        } catch (error: any) {
            toast.error(error.message || "Failed to record payment");
        } finally {
            setIsProcessingPayment(false);
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
                    <h3 className="font-bold text-slate-800 text-sm">
                        Clinical Summary {recordData.preparedBy?.name ? `(Prepared by ${recordData.preparedBy.name})` : (recordData.createdBy?.name ? `(Finalized by ${recordData.createdBy.name})` : '(Prepared by Nurse)')}
                    </h3>
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
                            label="Total Advance Paid"
                            name="advanceAmount"
                            type="number"
                            value={Math.round(billingData.advanceAmount)}
                            onChange={handleChange}
                            placeholder="0.00"
                            className="bg-slate-50 border-slate-200 font-bold text-emerald-700"
                            readOnly
                        />
                        <div className="relative">
                            <FormInput
                                label="Current Balance Due"
                                name="finalPayment"
                                type="number"
                                value={Math.round(billingData.finalPayment)}
                                onChange={handleChange}
                                placeholder="0.00"
                                className={`bg-slate-50 border-slate-200 font-bold ${Math.round(billingData.finalPayment) > 0 ? 'text-rose-600' : 'text-slate-900'}`}
                                readOnly
                                required
                            />
                            {Math.round(billingData.finalPayment) === 0 && Math.round(billingData.totalBillAmount) > 0 && (
                                <span className="absolute right-3 top-[34px] text-[10px] font-black uppercase text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Paid</span>
                            )}
                        </div>
                        <FormInput
                            label="Total Bill Amount"
                            name="totalBillAmount"
                            type="number"
                            value={Math.round(billingData.totalBillAmount)}
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
                                {/* 1. Gross Charges */}
                                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white text-slate-400 rounded-lg flex items-center justify-center border border-slate-100"><DollarSign size={14} /></div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-800 uppercase leading-none">Gross Clinical Charges</p>
                                            <p className="text-[7px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Bed & Extra Charges</p>
                                        </div>
                                    </div>
                                    <p className="text-xs font-black text-slate-900">₹{(Math.round(billSummary.bedCharges?.total + billSummary.extraCharges?.total)).toLocaleString()}</p>
                                </div>

                                {/* 2. Medicine Returns (if any) */}
                                {billSummary.financials?.returnCredits > 0 && (
                                    <div className="flex justify-between items-center pb-2 border-b border-rose-100 text-rose-600 bg-rose-50/50 px-2 py-1.5 rounded-lg -mx-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white text-rose-500 rounded-lg flex items-center justify-center border border-rose-100 shadow-sm"><ArrowLeft size={14} /></div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase leading-none">Medicine Returns</p>
                                                <p className="text-[7px] font-bold opacity-70 mt-1 uppercase tracking-tight">Pharmacy Credit</p>
                                            </div>
                                        </div>
                                        <p className="text-xs font-black">- ₹{billSummary.financials.returnCredits.toLocaleString()}</p>
                                    </div>
                                )}

                                {/* 3. Discount (if any) */}
                                {billSummary.financials?.discount > 0 && (
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-100 text-emerald-600">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><Tag size={14} /></div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase leading-none">Discount Details</p>
                                                <p className="text-[7px] font-bold opacity-60 mt-1 uppercase tracking-tight">Admin Adjustment</p>
                                            </div>
                                        </div>
                                        <p className="text-xs font-black">- ₹{billSummary.financials.discount.toLocaleString()}</p>
                                    </div>
                                )}

                                {/* 4. Advance Paid */}
                                <div className="flex justify-between items-center pb-2 border-b border-emerald-100 text-emerald-600 bg-emerald-50/30 px-2 py-1.5 rounded-lg -mx-2 mt-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-100 shadow-sm"><Wallet size={14} /></div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase leading-none">Net Advance Paid</p>
                                            <p className="text-[7px] font-bold opacity-70 mt-1 uppercase tracking-tight">Payments Recorded</p>
                                        </div>
                                    </div>
                                    <p className="text-xs font-black">- ₹{(billingData.advanceAmount || 0).toLocaleString()}</p>
                                </div>

                                {/* 5. Final Balance */}
                                <div className="flex justify-between items-center pt-3 text-rose-600 border-t-2 border-dashed border-slate-200 mt-2">
                                    <div className="flex flex-col">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Final Balance Due</p>
                                        <p className="text-[8px] font-bold opacity-60 uppercase mt-1">Settlement required for discharge</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <p className="text-lg font-black underline decoration-2 underline-offset-4">₹{Math.round(billingData.finalPayment || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Settlement Action Button moved here */}
                            {Math.round(billingData.finalPayment) > 0 && (
                                <div className="mt-6 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPaymentData(prev => ({ ...prev, amount: Math.round(billingData.finalPayment) }));
                                            setShowPaymentModal(true);
                                        }}
                                        className="w-full md:w-auto px-10 py-3 bg-rose-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-200"
                                    >
                                        <Wallet size={16} /> Record Settlement Payment
                                    </button>
                                </div>
                            )}

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

                        {Math.round(billingData.finalPayment) > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl">
                                <AlertCircle size={14} className="text-rose-500" />
                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
                                    Outstanding Balance: ₹{Math.round(billingData.finalPayment).toLocaleString()} — Please record payment first
                                </span>
                            </div>
                        )}

                        {Math.round(billingData.finalPayment) === 0 && (
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Invoice Payment Mode:</label>
                                <select
                                    value={billingData.paymentMode}
                                    onChange={(e) => setBillingData({ ...billingData, paymentMode: e.target.value })}
                                    className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Card">Card</option>
                                    <option value="Bank TXN">Bank Transfer</option>
                                    <option value="Insurance">Insurance/TPA</option>
                                </select>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading || Math.round(billingData.finalPayment) > 0}
                            className={`rounded-xl px-6 py-2.5 font-bold shadow-lg flex items-center gap-2 text-sm transition-all ${Math.round(billingData.finalPayment) > 0
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                                }`}
                        >
                            <Save size={16} />
                            {loading ? 'Finalizing...' : 'Finalize & Generate Invoice'}
                        </Button>
                    </div>
                </Card>
            </form>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-4 bg-slate-50 border-b border-slate-100">
                            <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm flex items-center gap-2">
                                <Wallet size={16} className="text-rose-500" /> Record Settlement
                            </h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Payment Amount</label>
                                <input
                                    type="number"
                                    value={paymentData.amount}
                                    onChange={(e) => setPaymentData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                    className="w-full text-lg font-black bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-rose-500"
                                    required
                                    max={Math.round(billingData.finalPayment)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Payment Mode</label>
                                    <select
                                        value={paymentData.mode}
                                        onChange={(e) => setPaymentData(prev => ({ ...prev, mode: e.target.value }))}
                                        className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-3 outline-none focus:border-rose-500"
                                    >
                                        <option value="UPI">UPI</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Card">Card</option>
                                        <option value="Bank TXN">Bank TXN</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Reference ID</label>
                                    <input
                                        type="text"
                                        value={paymentData.reference}
                                        onChange={(e) => setPaymentData(prev => ({ ...prev, reference: e.target.value }))}
                                        placeholder="Optional"
                                        className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none focus:border-rose-500"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isProcessingPayment}
                                className="w-full py-3.5 bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                            >
                                {isProcessingPayment ? "Processing..." : <><Plus size={16} /> Confirm Payment</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Clinical Receipt Preview */}
            {receiptData && (
                <ClinicalReceipt
                    hospital={receiptData.hospital}
                    patient={receiptData.patient}
                    appointment={receiptData.appointment}
                    payment={receiptData.payment}
                    onClose={() => {
                        setReceiptData(null);
                        if (receiptData.appointment.type === 'Final Discharge Summary') {
                            router.push('/helpdesk/discharge');
                        }
                    }}
                />
            )}
        </div>
    );
}
