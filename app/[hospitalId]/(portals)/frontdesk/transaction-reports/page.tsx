'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, FileText, Stethoscope, Bed, Pill, Wrench, FlaskConical, CreditCard, Printer, Calendar, Search, Activity, RefreshCw } from 'lucide-react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { helpdeskService } from '@/lib/integrations/services/helpdesk.service';
import { renderToStaticMarkup } from 'react-dom/server';
import MainHeader from '@/components/printers/MainHeader';
import MainFooter from '@/components/printers/MainFooter';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface DoctorCharge    { id: string; doctorName: string; specialization: string; rate: number; visits: number; }
interface AdmissionCharge { id: string; chargeType: string; description: string; rate: number; days: number; }
interface MedCharge       { id: string; medicineName: string; rate: number; quantity: number; }
interface ServiceCharge   { id: string; serviceName: string; rate: number; quantity: number; }
interface DiagCharge      { id: string; testName: string; rate: number; quantity: number; }
interface Payment         { id: string; receiptNo: string; date: string; mode: string; status: string; amount: number; }

const uid = () => Math.random().toString(36).slice(2, 9);
const genReceipt = () => 'RCP-' + Date.now().toString().slice(-7);
const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Professional Input Styling for Tables
const tableInputClass = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none hover:border-indigo-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-slate-300 placeholder:font-medium";
const tableSelectClass = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none hover:border-indigo-200 focus:border-indigo-500 transition-all cursor-pointer";

const DelBtn = ({ onClick }: { onClick(): void }) => (
    <button type="button" onClick={onClick} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all print:hidden">
        <Trash2 size={14} />
    </button>
);

const AddBtn = ({ onClick }: { onClick(): void }) => (
    <button 
        type="button" 
        onClick={onClick} 
        className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all group"
    >
        <Plus size={14} className="group-hover:scale-110 transition-transform" />
        Add Entry
    </button>
);

interface CardProps {
    icon: React.ReactNode;
    title: string;
    color: string;
    children: React.ReactNode;
    onAdd: () => void;
    total?: number;
}

const Card = ({ icon, title, color, children, onAdd, total }: CardProps) => {
    const colorMap: any = {
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        slate: 'bg-slate-50 text-slate-600 border-slate-100',
    };

    return (
        <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-500">
            <div className="p-5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border ${colorMap[color] || colorMap.slate}`}>
                        {icon}
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">{title}</h2>
                        {total !== undefined && (
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                Subtotal: <span className="text-indigo-600 font-black">{fmt(total)}</span>
                            </p>
                        )}
                    </div>
                </div>
                <AddBtn onClick={onAdd} />
            </div>
            <div className="overflow-x-auto p-4">
                {children}
            </div>
        </div>
    );
};

export default function TransactionReportsPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const patientId = searchParams.get('patientId');
    const loadReportId = searchParams.get('loadReport');

    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

    const [doctors,    setDoctors]  = useState<DoctorCharge[]>([]);
    const [admissions, setAdmis]    = useState<AdmissionCharge[]>([]);
    const [meds,       setMeds]     = useState<MedCharge[]>([]);
    const [services,   setServices] = useState<ServiceCharge[]>([]);
    const [diags,      setDiags]    = useState<DiagCharge[]>([]);
    const [payments,   setPay]      = useState<Payment[]>([]);
    const [hospital,   setHospital] = useState<any>(null);
    const [patient,    setPatient]  = useState<any>(null);
    const [admission,  setAdmission] = useState<any>(null);
    const [savedReports, setSavedReports] = useState<any[]>([]);
    const [isSaving,   setIsSaving] = useState(false);

    // Persistence: Load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(`txn_report_${patientId || 'draft'}`);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                setDoctors(data.doctors || []);
                setAdmis(data.admissions || []);
                setMeds(data.meds || []);
                setServices(data.services || []);
                setDiags(data.diags || []);
                setPay(data.payments || []);
            } catch (e) { console.error("Failed to parse saved draft", e); }
        }
    }, [patientId]);

    // Persistence: Save to localStorage
    useEffect(() => {
        const data = { doctors, admissions, meds, services, diags, payments };
        localStorage.setItem(`txn_report_${patientId || 'draft'}`, JSON.stringify(data));
    }, [doctors, admissions, meds, services, diags, payments, patientId]);

    useEffect(() => {
        hospitalAdminService.getHospital().then(res => setHospital(res?.hospital)).catch(() => {});
        
        if (patientId) {
            helpdeskService.getPatientById(patientId)
                .then(res => setPatient(res))
                .catch(err => {
                    console.error("Failed to fetch patient:", err);
                    toast.error("Could not load patient details");
                });

            helpdeskService.getPatientIPDAdmissions(patientId)
                .then(res => {
                    if (res && res.length > 0) {
                        const latest = res.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                        setAdmission(latest);
                    }
                })
                .catch(err => console.error("Failed to fetch admissions:", err));
        }
    }, [patientId]);

    useEffect(() => {
        if (!patientId) return;
        fetchHistory();
    }, [patientId]);

    const fetchHistory = () => {
        if (!patientId) return;
        helpdeskService.getPatientTransactionReports(patientId)
            .then(res => {
                setSavedReports(res);
                if (loadReportId) {
                    const r = res.find((x: any) => x._id === loadReportId);
                    if (r) {
                        setDoctors(r.reportData.doctors || []);
                        setAdmis(r.reportData.admissions || []);
                        setMeds(r.reportData.meds || []);
                        setServices(r.reportData.services || []);
                        setDiags(r.reportData.diags || []);
                        setPay(r.reportData.payments || []);
                        toast.success("Report data loaded from history!");
                    }
                }
            })
            .catch(err => console.error("Failed to fetch history:", err));
    };

    const totDoc  = doctors.reduce((s, r) => s + r.rate * r.visits, 0);
    const totAdm  = admissions.reduce((s, r) => s + r.rate * r.days, 0);
    const totMed  = meds.reduce((s, r) => s + r.rate * r.quantity, 0);
    const totSvc  = services.reduce((s, r) => s + r.rate * r.quantity, 0);
    const totDiag = diags.reduce((s, r) => s + r.rate * r.quantity, 0);
    const totPaid = payments.filter(p => p.status === 'Paid' || p.status === 'Completed').reduce((s, r) => s + r.amount, 0);
    const grand   = totDoc + totAdm + totMed + totSvc + totDiag;
    const balance = grand - totPaid;

    const handlePrint = () => {
        const win = window.open('', '_blank');
        if (!win) {
            alert('Please allow popups to print');
            return;
        }

        const h = hospital || { name: 'Hospital Name', address: 'Hospital Address', contact: 'Contact Info' };

        const headerHtml = renderToStaticMarkup(
            <MainHeader
                initialDetails={{
                    name: h.name || "Hospital Name",
                    address: h.address || "",
                    phone: h.phone || h.mobile || "",
                    email: h.email || "",
                    logo: h.logo
                }}
            />
        );

        const footerHtml = renderToStaticMarkup(
            <MainFooter
                initialDetails={{
                    name: h.name || "Hospital Name",
                    address: h.address || "",
                    phone: h.phone || h.mobile || "",
                    email: h.email || "",
                }}
            />
        );
        
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Statement - ${patient?.name || 'Patient'}</title>
                <style>
                    body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 20px; color: #1e293b; line-height: 1.4; background: #fff; font-size: 11px; }
                    .report-title { text-align: center; margin: 15px 0 25px; }
                    .report-title h2 { margin: 0; font-size: 18px; color: #4338ca; text-transform: uppercase; letter-spacing: 2px; font-weight: 900; }
                    .section { margin-bottom: 20px; break-inside: avoid; }
                    .section-header { background: #f8fafc; padding: 8px 12px; border-left: 4px solid #4338ca; margin-bottom: 12px; font-weight: 900; color: #1e293b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
                    th { text-align: left; padding: 10px 8px; background: #f1f5f9; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; font-weight: 900; }
                    td { padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 10px; color: #334155; font-weight: 500; }
                    .subtotal-row td { background: #fff; font-weight: 900; color: #4338ca; text-align: right; padding-top: 12px; font-size: 11px; }
                    .summary-box { margin-top: 30px; border-top: 2px solid #f1f5f9; padding-top: 20px; display: flex; flex-direction: column; align-items: flex-end; }
                    .summary-item { width: 220px; display: flex; justify-content: space-between; padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; }
                    .summary-item.grand { margin-top: 10px; padding-top: 10px; border-top: 2px solid #4338ca; color: #4338ca; font-weight: 900; font-size: 16px; }
                    .summary-item.balance { color: ${balance > 0 ? '#e11d48' : '#059669'}; font-weight: 900; font-size: 15px; }
                    @media print { body { padding: 0; } @page { margin: 1cm; } }
                </style>
            </head>
            <body>
                <div id="print-header">${headerHtml}</div>
                <div class="report-title"><h2>Financial Statement</h2></div>
                
                ${patient ? `
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 25px; padding: 15px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px">
                        <div><div style="font-size: 9px; color: #64748b; font-weight: 900; text-transform: uppercase; letter-spacing: 1px">Patient Name</div><div style="font-size: 12px; font-weight: 900; color: #1e293b; margin-top: 4px">${patient.name || patient.user?.name}</div></div>
                        <div><div style="font-size: 9px; color: #64748b; font-weight: 900; text-transform: uppercase; letter-spacing: 1px">MRN Number</div><div style="font-size: 12px; font-weight: 900; color: #1e293b; margin-top: 4px">${patient.profile?.mrn || 'N/A'}</div></div>
                        <div><div style="font-size: 9px; color: #64748b; font-weight: 900; text-transform: uppercase; letter-spacing: 1px">Mobile</div><div style="font-size: 12px; font-weight: 900; color: #1e293b; margin-top: 4px">${patient.user?.mobile || patient.mobile || 'N/A'}</div></div>
                        <div><div style="font-size: 9px; color: #64748b; font-weight: 900; text-transform: uppercase; letter-spacing: 1px">Age / Gender</div><div style="font-size: 12px; font-weight: 900; color: #1e293b; margin-top: 4px">${patient.age || 'N/A'}Y / ${patient.gender || 'N/A'}</div></div>
                        <div><div style="font-size: 9px; color: #64748b; font-weight: 900; text-transform: uppercase; letter-spacing: 1px">Admission ID</div><div style="font-size: 12px; font-weight: 900; color: #1e293b; margin-top: 4px">${admission?.admissionId || 'N/A'}</div></div>
                        <div><div style="font-size: 9px; color: #64748b; font-weight: 900; text-transform: uppercase; letter-spacing: 1px">Statement Date</div><div style="font-size: 12px; font-weight: 900; color: #1e293b; margin-top: 4px">${new Date(reportDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div></div>
                        <div><div style="font-size: 9px; color: #64748b; font-weight: 900; text-transform: uppercase; letter-spacing: 1px">Admission Date</div><div style="font-size: 11px; font-weight: 900; color: #1e293b; margin-top: 4px">${admission ? new Date(admission.admissionDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</div></div>
                        <div><div style="font-size: 9px; color: #64748b; font-weight: 900; text-transform: uppercase; letter-spacing: 1px">Discharge Date</div><div style="font-size: 12px; font-weight: 900; color: #1e293b; margin-top: 4px">${admission?.dischargeDate ? new Date(admission.dischargeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (admission ? 'STILL ADMITTED' : 'N/A')}</div></div>
                    </div>
                ` : ''}

                ${doctors.length > 0 ? `
                    <div class="section"><div class="section-header">Doctor Consultations</div><table><thead><tr><th>Doctor</th><th>Specialization</th><th>Rate</th><th>Visits</th><th>Amount</th></tr></thead><tbody>${doctors.map(r => `<tr><td>${r.doctorName}</td><td>${r.specialization}</td><td>${fmt(r.rate)}</td><td>${r.visits}</td><td>${fmt(r.rate*r.visits)}</td></tr>`).join('')}<tr class="subtotal-row"><td colspan="5">Subtotal: ${fmt(totDoc)}</td></tr></tbody></table></div>
                ` : ''}
                ${admissions.length > 0 ? `
                    <div class="section"><div class="section-header">Admission & ICU Stay</div><table><thead><tr><th>Type</th><th>Description</th><th>Rate/Day</th><th>Days</th><th>Amount</th></tr></thead><tbody>${admissions.map(r => `<tr><td>${r.chargeType}</td><td>${r.description}</td><td>${fmt(r.rate)}</td><td>${r.days}</td><td>${fmt(r.rate*r.days)}</td></tr>`).join('')}<tr class="subtotal-row"><td colspan="5">Subtotal: ${fmt(totAdm)}</td></tr></tbody></table></div>
                ` : ''}
                ${meds.length > 0 ? `
                    <div class="section"><div class="section-header">Pharmacy & Medications</div><table><thead><tr><th>Medicine</th><th>Rate</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${meds.map(r => `<tr><td>${r.medicineName}</td><td>${fmt(r.rate)}</td><td>${r.quantity}</td><td>${fmt(r.rate*r.quantity)}</td></tr>`).join('')}<tr class="subtotal-row"><td colspan="4">Subtotal: ${fmt(totMed)}</td></tr></tbody></table></div>
                ` : ''}
                ${services.length > 0 ? `
                    <div class="section"><div class="section-header">Clinical Services</div><table><thead><tr><th>Service</th><th>Rate</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${services.map(r => `<tr><td>${r.serviceName}</td><td>${fmt(r.rate)}</td><td>${r.quantity}</td><td>${fmt(r.rate*r.quantity)}</td></tr>`).join('')}<tr class="subtotal-row"><td colspan="4">Subtotal: ${fmt(totSvc)}</td></tr></tbody></table></div>
                ` : ''}
                ${diags.length > 0 ? `
                    <div class="section"><div class="section-header">Diagnostics & Lab</div><table><thead><tr><th>Test</th><th>Rate</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${diags.map(r => `<tr><td>${r.testName}</td><td>${fmt(r.rate)}</td><td>${r.quantity}</td><td>${fmt(r.rate*r.quantity)}</td></tr>`).join('')}<tr class="subtotal-row"><td colspan="4">Subtotal: ${fmt(totDiag)}</td></tr></tbody></table></div>
                ` : ''}
                ${payments.length > 0 ? `
                    <div class="section"><div class="section-header">Advance Payments</div><table><thead><tr><th>Receipt</th><th>Date</th><th>Mode</th><th>Status</th><th>Amount</th></tr></thead><tbody>${payments.map(r => `<tr><td style="font-family:monospace;font-weight:900">${r.receiptNo}</td><td>${r.date}</td><td>${r.mode}</td><td>${r.status}</td><td>${fmt(r.amount)}</td></tr>`).join('')}<tr class="subtotal-row"><td colspan="5">Total Paid: ${fmt(totPaid)}</td></tr></tbody></table></div>
                ` : ''}

                <div class="summary-box">
                    <div class="summary-item"><span>Grand Total:</span> <span>${fmt(grand)}</span></div>
                    <div class="summary-item"><span>Advance Received:</span> <span>${fmt(totPaid)}</span></div>
                    <div class="summary-item grand"><span>Net Payable:</span> <span>${fmt(balance)}</span></div>
                </div>


                <div id="print-footer" style="margin-top: 40px">${footerHtml}</div>
                <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }</script>
            </body>
            </html>
        `;

        win.document.write(html);
        win.document.close();
    };

    const handleSaveReport = async () => {
        if (!patientId) {
            toast.error("Please select a patient first");
            return;
        }

        try {
            setIsSaving(true);
            const reportData = { doctors, admissions, meds, services, diags, payments };
            const totals = { grandTotal: grand, totalPaid: totPaid, balance: balance };

            await helpdeskService.saveTransactionReport({
                patientId,
                reportData,
                totals,
                generatedBy: "frontdesk"
            });

            toast.success("Transaction report saved successfully!");
            fetchHistory();
            localStorage.removeItem(`txn_report_${patientId}`);
        } catch (error) {
            console.error("Failed to save report:", error);
            toast.error("Failed to store report in database");
        } finally {
            setIsSaving(false);
        }
    };

    const updD = (i: number, k: keyof DoctorCharge, v: any) => setDoctors(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
    const updA = (i: number, k: keyof AdmissionCharge, v: any) => setAdmis(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
    const updM = (i: number, k: keyof MedCharge, v: any) => setMeds(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
    const updS = (i: number, k: keyof ServiceCharge, v: any) => setServices(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
    const updDiag = (i: number, k: keyof DiagCharge, v: any) => setDiags(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
    const updP = (i: number, k: keyof Payment, v: any) => setPay(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm shadow-indigo-500/5">
                <div className="flex items-start gap-5">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-50/50">
                        <FileText className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Financial Statement</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            {patient && (
                                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border border-indigo-100/50 flex items-center gap-1.5 shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                    {patient.name || patient.user?.name}
                                </span>
                            )}
                            <span className="bg-slate-50 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200/50 uppercase tracking-widest">
                                Report Configuration
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group bg-slate-50 hover:bg-white border-2 border-slate-100 hover:border-indigo-200 p-1.5 rounded-2xl transition-all duration-300 flex items-center gap-3 min-w-[200px]">
                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-400 group-hover:text-indigo-500 transition-colors">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Statement Date</p>
                            <input 
                                type="date"
                                value={reportDate}
                                onChange={(e) => setReportDate(e.target.value)}
                                className="w-full bg-transparent border-none p-0 text-sm font-black text-slate-700 focus:ring-0 cursor-pointer"
                            />
                        </div>
                    </div>

                            <div className="h-10 w-[1px] bg-slate-100 hidden lg:block mx-1"></div>

                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => router.push(`/${params.hospitalId}/frontdesk/transaction-history`)}
                                    className="h-12 px-5 bg-white text-slate-600 font-bold text-sm rounded-2xl border border-slate-200 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center gap-2"
                                >
                                    <Search className="w-4 h-4" />
                                    History
                                </button>
                                <button 
                                    onClick={handleSaveReport}
                                    disabled={isSaving}
                                    className="h-12 px-6 bg-white border-2 border-emerald-100 text-emerald-600 hover:bg-emerald-50 font-black text-sm rounded-2xl transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Save
                                </button>
                                <button 
                                    onClick={handlePrint}
                                    className="h-12 px-6 bg-indigo-600 text-white hover:bg-indigo-700 font-black text-sm rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print
                                </button>
                            </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Grand Total', val: grand, color: 'indigo', icon: CreditCard },
                    { label: 'Total Paid', val: totPaid, color: 'emerald', icon: Activity },
                    { label: 'Balance Due', val: balance, color: balance > 0 ? 'rose' : 'slate', icon: Search },
                    { label: 'Total Items', val: doctors.length + admissions.length + meds.length + services.length + diags.length, isRaw: true, color: 'slate', icon: FileText }
                ].map((kpi, i) => (
                    <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-sm hover:border-indigo-100 transition-all group overflow-hidden relative">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${kpi.color}-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-125 duration-500`}></div>
                        <div className="relative flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 shadow-sm transition-colors">
                                <kpi.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                                <p className={`text-xl font-black text-slate-900 mt-0.5 ${kpi.color === 'rose' && balance > 0 ? 'text-rose-600' : ''}`}>
                                    {kpi.isRaw ? kpi.val : fmt(kpi.val as number)}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card icon={<Stethoscope className="w-5 h-5" />} title="Doctor Consultation Charges" color="indigo" total={totDoc} onAdd={() => setDoctors(p => [...p, { id: uid(), doctorName: '', specialization: '', rate: 0, visits: 1 }])}>
                    <table className="w-full text-left">
                        <thead><tr className="border-b border-slate-100">{['Doctor Name', 'Specialization', 'Rate (₹)', 'Visits', 'Amount', ''].map(h => (<th key={h} className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>))}</tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {doctors.map((d, i) => (
                                <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3"><input value={d.doctorName} onChange={(e) => updD(i, 'doctorName', e.target.value)} className={tableInputClass} placeholder="Doctor Name" /></td>
                                    <td className="p-3"><input value={d.specialization} onChange={(e) => updD(i, 'specialization', e.target.value)} className={tableInputClass} placeholder="Specialization" /></td>
                                    <td className="p-3"><input type="number" value={d.rate} onChange={(e) => updD(i, 'rate', Number(e.target.value))} className={tableInputClass} /></td>
                                    <td className="p-3"><input type="number" value={d.visits} onChange={(e) => updD(i, 'visits', Number(e.target.value))} className={tableInputClass} /></td>
                                    <td className="p-3 text-sm font-black text-slate-900">{fmt(d.rate * d.visits)}</td>
                                    <td className="p-3 text-right"><DelBtn onClick={() => setDoctors(p => p.filter((_,j) => j!==i))} /></td>
                                </tr>
                            ))}
                            {doctors.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-sm font-bold text-slate-400 italic">No doctor charges added yet.</td></tr>}
                        </tbody>
                    </table>
                </Card>

                <Card icon={<Bed className="w-5 h-5" />} title="Admission & ICU Stay Charges" color="indigo" total={totAdm} onAdd={() => setAdmis(p => [...p, { id: uid(), admissionId: '', chargeType: 'Stay', description: '', rate: 0, days: 1 }])}>
                    <table className="w-full text-left">
                        <thead><tr className="border-b border-slate-100">{['Charge Type', 'Description', 'Rate/Day (₹)', 'Days', 'Amount', ''].map(h => (<th key={h} className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>))}</tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {admissions.map((a, i) => (
                                <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3">
                                        <select value={a.chargeType} onChange={(e) => updA(i, 'chargeType', e.target.value)} className={tableSelectClass}>
                                            {['Admission', 'ICU', 'Ward', 'Emergency', 'OT', 'Recovery', 'Ventilator', 'Oxygen'].map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-3"><input value={a.description} onChange={(e) => updA(i, 'description', e.target.value)} className={tableInputClass} placeholder="Description" /></td>
                                    <td className="p-3"><input type="number" value={a.rate} onChange={(e) => updA(i, 'rate', Number(e.target.value))} className={tableInputClass} /></td>
                                    <td className="p-3"><input type="number" value={a.days} onChange={(e) => updA(i, 'days', Number(e.target.value))} className={tableInputClass} /></td>
                                    <td className="p-3 text-sm font-black text-slate-900">{fmt(a.rate * a.days)}</td>
                                    <td className="p-3 text-right"><DelBtn onClick={() => setAdmis(p => p.filter((_,j) => j!==i))} /></td>
                                </tr>
                            ))}
                            {admissions.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-sm font-bold text-slate-400 italic">No admission charges added yet.</td></tr>}
                        </tbody>
                    </table>
                </Card>

                <Card icon={<Pill className="w-5 h-5" />} title="Pharmacy & Medication Statement" color="indigo" total={totMed} onAdd={() => setMeds(p => [...p, { id: uid(), medicineName: '', rate: 0, quantity: 1 }])}>
                    <table className="w-full text-left">
                        <thead><tr className="border-b border-slate-100">{['Medicine Name', 'Rate (₹)', 'Quantity', 'Amount', ''].map(h => (<th key={h} className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>))}</tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {meds.map((m, i) => (
                                <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3"><input value={m.medicineName} onChange={(e) => updM(i, 'medicineName', e.target.value)} className={tableInputClass} placeholder="Medicine Name" /></td>
                                    <td className="p-3"><input type="number" value={m.rate} onChange={(e) => updM(i, 'rate', Number(e.target.value))} className={tableInputClass} /></td>
                                    <td className="p-3"><input type="number" value={m.quantity} onChange={(e) => updM(i, 'quantity', Number(e.target.value))} className={tableInputClass} /></td>
                                    <td className="p-3 text-sm font-black text-slate-900">{fmt(m.rate * m.quantity)}</td>
                                    <td className="p-3 text-right"><DelBtn onClick={() => setMeds(p => p.filter((_,j) => j!==i))} /></td>
                                </tr>
                            ))}
                            {meds.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-sm font-bold text-slate-400 italic">No medication charges added.</td></tr>}
                        </tbody>
                    </table>
                </Card>

                <Card icon={<Wrench className="w-5 h-5" />} title="Hospital Services & Procedures" color="indigo" total={totSvc} onAdd={() => setServices(p => [...p, { id: uid(), serviceName: '', rate: 0, quantity: 1 }])}>
                    <table className="w-full text-left">
                        <thead><tr className="border-b border-slate-100">{['Service Name', 'Rate (₹)', 'Quantity', 'Amount', ''].map(h => (<th key={h} className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>))}</tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {services.map((s, i) => (
                                <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3"><input value={s.serviceName} onChange={(e) => updS(i, 'serviceName', e.target.value)} className={tableInputClass} placeholder="Service Name" /></td>
                                    <td className="p-3"><input type="number" value={s.rate} onChange={(e) => updS(i, 'rate', Number(e.target.value))} className={tableInputClass} /></td>
                                    <td className="p-3"><input type="number" value={s.quantity} onChange={(e) => updS(i, 'quantity', Number(e.target.value))} className={tableInputClass} /></td>
                                    <td className="p-3 text-sm font-black text-slate-900">{fmt(s.rate * s.quantity)}</td>
                                    <td className="p-3 text-right"><DelBtn onClick={() => setServices(p => p.filter((_,j) => j!==i))} /></td>
                                </tr>
                            ))}
                            {services.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-sm font-bold text-slate-400 italic">No service charges added.</td></tr>}
                        </tbody>
                    </table>
                </Card>

                <Card icon={<FlaskConical className="w-5 h-5" />} title="Diagnostics & Lab Reports" color="indigo" total={totDiag} onAdd={() => setDiags(p => [...p, { id: uid(), testName: '', rate: 0, quantity: 1 }])}>
                    <table className="w-full text-left">
                        <thead><tr className="border-b border-slate-100">{['Test Name', 'Rate (₹)', 'Quantity', 'Amount', ''].map(h => (<th key={h} className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>))}</tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {diags.map((d, i) => (
                                <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3"><input value={d.testName} onChange={(e) => updDiag(i, 'testName', e.target.value)} className={tableInputClass} placeholder="Test Name" /></td>
                                    <td className="p-3"><input type="number" value={d.rate} onChange={(e) => updDiag(i, 'rate', Number(e.target.value))} className={tableInputClass} /></td>
                                    <td className="p-3"><input type="number" value={d.quantity} onChange={(e) => updDiag(i, 'quantity', Number(e.target.value))} className={tableInputClass} /></td>
                                    <td className="p-3 text-sm font-black text-slate-900">{fmt(d.rate * d.quantity)}</td>
                                    <td className="p-3 text-right"><DelBtn onClick={() => setDiags(p => p.filter((_,j) => j!==i))} /></td>
                                </tr>
                            ))}
                            {diags.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-sm font-bold text-slate-400 italic">No diagnostic charges added.</td></tr>}
                        </tbody>
                    </table>
                </Card>

                <Card icon={<CreditCard className="w-5 h-5" />} title="Advance Payments & Reconciliation" color="emerald" total={totPaid} onAdd={() => setPay(p => [...p, { id: uid(), receiptNo: genReceipt(), date: new Date().toLocaleDateString(), amount: 0, mode: 'Cash', status: 'Paid' }])}>
                    <table className="w-full text-left">
                        <thead><tr className="border-b border-slate-100">{['Receipt No', 'Date', 'Mode', 'Status', 'Amount (₹)', ''].map(h => (<th key={h} className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>))}</tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {payments.map((p, i) => (
                                <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3"><span className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black font-mono tracking-tight border border-indigo-100 flex items-center justify-center h-[38px]">{p.receiptNo}</span></td>
                                    <td className="p-3"><input value={p.date} onChange={(e) => updP(i, 'date', e.target.value)} className={tableInputClass} /></td>
                                    <td className="p-3">
                                        <select value={p.mode} onChange={(e) => updP(i, 'mode', e.target.value)} className={tableSelectClass}>
                                            {['Cash', 'Card', 'UPI', 'Bank'].map(m => <option key={m}>{m}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-3">
                                        <select value={p.status} onChange={(e) => updP(i, 'status', e.target.value)} className={tableSelectClass}>
                                            {['Paid', 'Pending', 'Failed'].map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-3"><input type="number" value={p.amount} onChange={(e) => updP(i, 'amount', Number(e.target.value))} className={tableInputClass} /></td>
                                    <td className="p-3 text-right"><DelBtn onClick={() => setPay(p => p.filter((_,j) => j!==i))} /></td>
                                </tr>
                            ))}
                            {payments.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-sm font-bold text-slate-400 italic">No payment history available.</td></tr>}
                        </tbody>
                    </table>
                </Card>

                {/* Light-Themed Final Reconciliation Box */}
                <div className="bg-white rounded-[2.5rem] p-10 border-2 border-slate-100 shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 transition-transform hover:scale-110 duration-700 opacity-50"></div>
                    <div className="relative">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
                            {[
                                ['Doctors', totDoc, 'indigo'], ['Admissions', totAdm, 'emerald'], ['Pharmacy', totMed, 'rose'], 
                                ['Services', totSvc, 'slate'], ['Lab Tests', totDiag, 'indigo'], ['Total Paid', totPaid, 'emerald']
                            ].map(([l, v, c]) => (
                                <div key={l as string} className="bg-slate-50 p-4 rounded-3xl border border-slate-100 group hover:bg-white hover:border-indigo-100 transition-all">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-2">{l as string}</p>
                                    <p className={`text-lg font-black text-slate-700 group-hover:text-${c as string}-600 transition-colors`}>{fmt(v as number)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pt-10 border-t border-slate-100">
                            <div>
                                <p className="text-xs text-slate-400 font-black mb-2 uppercase tracking-widest leading-none">Final Balance Amount</p>
                                <p className={`text-6xl font-black tracking-tighter ${balance > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{fmt(balance)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-3 text-right">
                                
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Statement Reconciliation Summary</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
