'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Search, Printer, FileText, User, ArrowLeft, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { helpdeskService } from '@/lib/integrations/services/helpdesk.service';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { useHelpdeskPatients } from "@/lib/integrations";
import { sanitizePatientName } from "@/lib/utils/name-utils";
import { calculateAge } from "@/lib/utils/date-utils";
import { renderToStaticMarkup } from 'react-dom/server';
import MainHeader from '@/components/printers/MainHeader';
import toast from 'react-hot-toast';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const numberToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if ((num = num.toString().replace(/[\, ]/g, '')) != parseFloat(num)) return 'not a number';
    let x = num.indexOf('.');
    if (x == -1) x = num.length;
    if (x > 15) return 'too big';
    let n = num.split('');
    let str = '';
    let sk = 0;
    for (let i = 0; i < x; i++) {
        if ((x - i) % 3 == 2) {
            if (n[i] == '1') {
                str += a[Number(n[i]) + Number(n[i + 1])] + ' ';
                i++;
                sk = 1;
            } else if (n[i] != 0) {
                str += b[n[i]] + ' ';
                sk = 1;
            }
        } else if (n[i] != 0) {
            str += a[n[i]] + ' ';
            if ((x - i) % 3 == 0) str += 'Hundred ';
            sk = 1;
        }
        if ((x - i) % 3 == 1) {
            if (sk) str += (x - i - 1 == 3) ? 'Thousand ' : (x - i - 1 == 6) ? 'Million ' : (x - i - 1 == 9) ? 'Billion ' : '';
            sk = 0;
        }
    }
    return str.trim() ? str.trim() + ' Rupees Only' : '';
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(t);
    }, [value, delayMs]);
    return debounced;
}

export default function FinalBillPage() {
    const router = useRouter();
    const params = useParams();
    
    // Search & Pagination State for Table
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const limit = 10;
    const debouncedSearch = useDebouncedValue(searchTerm, 300);

    const { data: patientsRaw, isLoading, isFetching, refetch } = useHelpdeskPatients(
        debouncedSearch,
        page,
        limit,
        'ipd', // Force IPD patients only
        undefined,
        true
    );

    const { patients, total } = useMemo(() => {
        const raw: any = patientsRaw;
        if (!raw) return { patients: [] as any[], total: 0 };
        if (Array.isArray(raw)) return { patients: raw, total: raw.length };
        return {
            patients: raw.data || [],
            total: raw.pagination?.total || (raw.data?.length || 0),
        };
    }, [patientsRaw]);
    
    const totalPages = Math.ceil(total / limit);
    const showRefreshing = isFetching && !isLoading && patientsRaw;

    // Bill State
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [hospital, setHospital] = useState<any>(null);
    const [admission, setAdmission] = useState<any>(null);
    const [latestReport, setLatestReport] = useState<any>(null);
    const [loadingReport, setLoadingReport] = useState(false);

    useEffect(() => {
        hospitalAdminService.getHospital().then(res => setHospital(res?.hospital)).catch(() => {});
    }, []);

    const handleSelectPatient = async (patient: any) => {
        const pId = patient.user?._id || patient._id || patient.id;
        setSelectedPatient({
            ...patient,
            _id: pId,
            name: patient.user?.name || patient.name,
            mobile: patient.user?.mobile || patient.profile?.contactNumber || patient.mobile || 'N/A',
            mrn: patient.mrn || patient.profile?.mrn || 'N/A',
        });
        setLatestReport(null);
        fetchPatientBillingData(pId);
    };

    const fetchPatientBillingData = async (pId: string) => {
        setLoadingReport(true);
        try {
            // Fetch IPD admission for details
            const admissions = await helpdeskService.getPatientIPDAdmissions(pId);
            const admissionList = Array.isArray(admissions) ? admissions : (admissions as any).admissions || [];
            if (admissionList.length > 0) {
                setAdmission(admissionList.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]);
            }

            // Fetch transaction reports
            const reports = await helpdeskService.getPatientTransactionReports(pId);
            if (reports && reports.length > 0) {
                // Get the most recent one
                setLatestReport(reports[0]);
                toast.success("Latest bill loaded successfully.");
            } else {
                toast.error("No saved transaction reports found for this patient.");
            }
        } catch (err) {
            console.error("Failed to fetch billing data", err);
            toast.error("Failed to load billing data.");
        } finally {
            setLoadingReport(false);
        }
    };

    const handlePrint = () => {
        if (!latestReport) {
            toast.error("No bill data to print.");
            return;
        }

        const win = window.open('', '_blank');
        if (!win) {
            alert('Please allow popups to print');
            return;
        }

        const h = hospital || { name: 'Hospital Name', address: 'Hospital Address', contact: 'Contact Info' };
        const data = latestReport.reportData;
        const pt = selectedPatient;
        const adm = admission;
        const dateNow = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

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

        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>IP Interim Bill - ${pt.name}</title>
                <style>
                    * { box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; padding: 20px; color: #000; font-size: 10px; line-height: 1.3; background: #fff; margin: 0; }
                    .header-custom { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    .header-custom h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
                    .header-custom p { margin: 2px 0; font-size: 10px; }
                    .bill-title { text-align: center; font-weight: bold; font-size: 14px; text-decoration: underline; margin: 10px 0; }
                    .invoice-no { text-align: center; font-weight: bold; font-size: 11px; margin-bottom: 10px; }
                    
                    .patient-details-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                    .patient-details-table td { padding: 4px; vertical-align: top; }
                    .patient-details-table .lbl { font-weight: bold; width: 110px; }
                    .patient-details-table .val { width: auto; }
                    
                    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; border: 1px solid #000; }
                    .items-table th { background: #f0f0f0; border: 1px solid #000; padding: 5px; text-align: left; font-size: 9px; }
                    .items-table td { border-left: 1px solid #000; border-right: 1px solid #000; padding: 4px 5px; font-size: 9px; }
                    .items-table .category-row td { background: #e0e0e0; font-weight: bold; text-align: center; border: 1px solid #000; }
                    .items-table .subtotal-row td { background: #d0e0ff; font-weight: bold; text-align: right; border: 1px solid #000; color: #000; }
                    .items-table .total-amount-cell { text-align: right; }
                    .items-table .right-align { text-align: right; }
                    .items-table .center-align { text-align: center; }

                    .summary-section { width: 100%; display: table; margin-top: 20px; }
                    .amount-words { display: table-cell; width: 60%; vertical-align: bottom; font-weight: bold; font-size: 11px; }
                    .totals-box { display: table-cell; width: 40%; }
                    .totals-table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
                    .totals-table td { border: 1px solid #000; padding: 4px; font-size: 10px; }
                    .totals-table .lbl { font-weight: bold; background: #f0f0f0; width: 60%; }
                    .totals-table .val { text-align: right; font-weight: bold; }

                    .receipts-title { font-weight: bold; margin: 15px 0 5px; font-size: 11px; text-decoration: underline; }
                    .receipts-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 30px; }
                    .receipts-table th, .receipts-table td { border: 1px solid #000; padding: 4px; font-size: 9px; text-align: center; }
                    .receipts-table th { background: #f0f0f0; }

                    .footer-signatures { width: 100%; display: table; margin-top: 50px; text-align: center; font-weight: bold; font-size: 11px; }
                    .footer-signatures > div { display: table-cell; width: 50%; }

                    @media print { 
                        body { padding: 0; } 
                        @page { margin: 10mm; }
                        .items-table { page-break-inside: auto; }
                        .items-table tr { page-break-inside: avoid; page-break-after: auto; }
                    }
                </style>
            </head>
            <body>
                <div class="header-custom">
                    ${headerHtml}
                </div>
                
                <div class="bill-title">IP Interim Bill - Detailed</div>
                <div class="invoice-no">BILL OF SUPPLY / INVOICE NO : ${latestReport._id.slice(-8).toUpperCase()}</div>

                <table class="patient-details-table">
                    <tr>
                        <td class="lbl">CIN No</td><td class="val">: N/A</td>
                        <td class="lbl">GST No</td><td class="val">: N/A</td>
                    </tr>
                    <tr>
                        <td class="lbl">Patient Name</td><td class="val">: <b>${pt.name}</b></td>
                        <td class="lbl">IP No</td><td class="val">: ${adm?.admissionId || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Age / Sex</td><td class="val">: ${pt.age || '-'} / ${pt.gender || '-'}</td>
                        <td class="lbl">UMR No</td><td class="val">: ${pt.mrn || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="lbl">S/W/D</td><td class="val">: N/A</td>
                        <td class="lbl">Bill No</td><td class="val">: ${latestReport._id.slice(-6).toUpperCase()}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Doctor</td><td class="val">: ${adm?.attendingDoctor || 'N/A'}</td>
                        <td class="lbl">Bill Dt</td><td class="val">: ${dateNow}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Admission Dt</td><td class="val">: ${adm ? new Date(adm.admissionDate).toLocaleString('en-IN') : 'N/A'}</td>
                        <td class="lbl">Discharge Type</td><td class="val">: ${adm?.status === 'Discharged' ? 'Normal' : 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Organization</td><td class="val">: N/A</td>
                        <td class="lbl">Discharge Dt&Tm</td><td class="val">: ${adm?.dischargeDate ? new Date(adm.dischargeDate).toLocaleString('en-IN') : '-'}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Patient Type</td><td class="val">: IPD</td>
                        <td class="lbl">Ward</td><td class="val">: ${adm?.wardName || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Secondary Dr.</td><td class="val">: N/A</td>
                        <td class="lbl">Bed No</td><td class="val">: ${adm?.bedNumber || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Address</td><td class="val">: ${pt.address || 'N/A'}</td>
                        <td class="lbl">Phone No</td><td class="val">: ${pt.mobile || 'N/A'}</td>
                    </tr>
                </table>

                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 5%">S.No</th>
                            <th style="width: 10%">Code</th>
                            <th style="width: 45%">Service Name</th>
                            <th style="width: 15%" class="right-align">Rate</th>
                            <th style="width: 10%" class="center-align">Qty</th>
                            <th style="width: 15%" class="right-align">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        let sno = 1;
        
        // Helper to render a category
        const renderCategory = (title: string, items: any[], nameKey: string, rateKey: string, qtyKey: string) => {
            if (!items || items.length === 0) return '';
            let catHtml = `<tr class="category-row"><td colspan="6">${title}</td></tr>`;
            let subtotal = 0;
            items.forEach(item => {
                const amount = item[rateKey] * item[qtyKey];
                subtotal += amount;
                catHtml += `
                    <tr>
                        <td class="center-align">${sno++}</td>
                        <td>-</td>
                        <td>${item[nameKey]}</td>
                        <td class="right-align">${fmt(item[rateKey])}</td>
                        <td class="center-align">${item[qtyKey]}</td>
                        <td class="right-align">${fmt(amount)}</td>
                    </tr>
                `;
            });
            catHtml += `<tr class="subtotal-row"><td colspan="5">Sub Total:</td><td class="right-align">${fmt(subtotal)}</td></tr>`;
            return catHtml;
        };

        html += renderCategory('CONSULTATION CHARGES', data.doctors, 'doctorName', 'rate', 'visits');
        html += renderCategory('WARD CHARGES', data.admissions, 'chargeType', 'rate', 'days');
        html += renderCategory('PHARMACY CHARGES', data.meds, 'medicineName', 'rate', 'quantity');
        html += renderCategory('SERVICE CHARGES', data.services, 'serviceName', 'rate', 'quantity');
        html += renderCategory('INVESTIGATION CHARGES', data.diags, 'testName', 'rate', 'quantity');

        html += `
                    </tbody>
                </table>

                <div class="summary-section">
                    <div class="amount-words">
                        Rupees In: ${numberToWords(latestReport.totals.balance > 0 ? latestReport.totals.balance : latestReport.totals.grandTotal)}
                        <br><br>
                        Reason : ${latestReport.notes || '-'}
                    </div>
                    <div class="totals-box">
                        <table class="totals-table">
                            <tr><td class="lbl">Grand Total</td><td class="val">${fmt(latestReport.totals.grandTotal)}</td></tr>
                            <tr><td class="lbl">Net Amt</td><td class="val">${fmt(latestReport.totals.grandTotal)}</td></tr>
                            <tr><td class="lbl">Paid Amt</td><td class="val">${fmt(latestReport.totals.totalPaid)}</td></tr>
                            <tr><td class="lbl">Balance Amt</td><td class="val">${fmt(latestReport.totals.balance)}</td></tr>
                        </table>
                    </div>
                </div>

                ${data.payments && data.payments.length > 0 ? `
                    <div class="receipts-title">Receipt Details</div>
                    <table class="receipts-table">
                        <tr><th>S.No</th><th>Record Date</th><th>Receipt No</th><th>Amount Payment</th><th>Type</th></tr>
                        ${data.payments.map((p: any, i: number) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${p.date}</td>
                                <td>${p.receiptNo}</td>
                                <td>${fmt(p.amount)}</td>
                                <td>Advance</td>
                            </tr>
                        `).join('')}
                    </table>
                ` : ''}

                <div class="footer-signatures">
                    <div>Patient / Attendant Signatory</div>
                    <div>Authorised Signatory</div>
                </div>

                <script>
                    window.onload = function() { 
                        setTimeout(() => {
                            window.print(); 
                            window.onafterprint = function() { window.close(); }
                        }, 500);
                    }
                </script>
            </body>
            </html>
        `;

        win.document.write(html);
        win.document.close();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm shadow-indigo-500/5">
                <div className="flex items-start gap-5">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-50/50">
                        <FileText className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Final Bill Generate</h1>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Select patient to print IP Interim Bill</p>
                    </div>
                </div>
                {!selectedPatient && (
                    <div className="relative flex-1 max-w-sm group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-[16px]" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search Name, MRN, Mobile..."
                            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-indigo-500 shadow-inner transition-all"
                        />
                    </div>
                )}
            </div>

            {/* Content Area */}
            {selectedPatient ? (
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm text-center">
                    {loadingReport ? (
                        <div className="py-10">
                            <RefreshCw className="animate-spin text-indigo-500 mx-auto mb-4" size={32} />
                            <p className="text-sm font-bold text-slate-500">Fetching latest billing data...</p>
                        </div>
                    ) : latestReport ? (
                        <div className="py-8">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-50/50">
                                <FileText size={36} />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 mb-2">Ready to Print Final Bill</h2>
                            <p className="text-sm font-bold text-slate-500 mb-8">
                                Found latest transaction report for <b>{selectedPatient.name}</b>.
                            </p>

                            <div className="flex justify-center gap-4">
                                <button 
                                    onClick={() => { setSelectedPatient(null); setLatestReport(null); }}
                                    className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handlePrint}
                                    className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all"
                                >
                                    <Printer size={18} />
                                    Print IP Interim Bill - Detailed
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-10">
                            <AlertCircle className="text-rose-500 mx-auto mb-4" size={48} />
                            <h3 className="text-lg font-black text-slate-800 mb-2">No Saved Bills Found</h3>
                            <p className="text-sm font-bold text-slate-500 mb-6">
                                There are no finalized transaction reports for this patient. Please create and save a report in the Transaction Reports section first.
                            </p>
                            <div className="flex justify-center gap-4">
                                <button 
                                    onClick={() => setSelectedPatient(null)}
                                    className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                                >
                                    Go Back
                                </button>
                                <button 
                                    onClick={() => router.push(`/${params.hospitalId}/frontdesk/transaction-reports?patientId=${selectedPatient._id}`)}
                                    className="px-6 py-3 rounded-xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 transition-colors"
                                >
                                    Go to Transaction Reports
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Patient Table */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                        <div className="overflow-x-auto w-full no-scrollbar">
                            {(isLoading && patients.length === 0) ? (
                                <div className="py-32 flex flex-col items-center justify-center gap-4">
                                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Registry...</p>
                                </div>
                            ) : patients.length > 0 ? (
                                <table className="w-full min-w-[700px] table-auto">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] lg:text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                            <th className="w-16 px-4 py-3 sm:py-4 text-center">#</th>
                                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-left w-64 lg:w-80">MRN Number</th>
                                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-left min-w-[200px]">Patient Name</th>
                                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-center w-24">Age</th>
                                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-center w-24">Gender</th>
                                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-left w-auto">Phone Number</th>
                                            <th className="w-[120px] px-4 py-3 sm:py-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {patients.map((patient: any, idx: number) => {
                                            const patientId = patient._id || patient.id;
                                            const serialNo = ((page - 1) * limit) + idx + 1;

                                            return (
                                                <tr key={`${patientId}-${idx}`} className="group hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-[11px] lg:text-[13px] font-black text-slate-300 group-hover:text-indigo-500 transition-colors">
                                                            {serialNo.toString().padStart(2, '0')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-4">
                                                        <span className="text-[12px] lg:text-[14px] font-extra-bold text-slate-700 uppercase tracking-widest bg-slate-100/50 px-2.5 py-1 rounded-md border border-slate-100 block truncate">
                                                            {patient.profile?.mrn || patient.mrn}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-indigo-50 text-indigo-500 border border-indigo-100 transition-all flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                                                                {sanitizePatientName(patient.name || patient.user?.name).charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="text-[13px] lg:text-[15px] font-[550] text-slate-700 uppercase tracking-tight truncate block">
                                                                    {sanitizePatientName(patient.name || patient.user?.name)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-[12px] lg:text-[13px] font-bold text-slate-600 bg-slate-50 border border-slate-200/50 px-2 py-1 rounded-lg">
                                                            {patient.profile?.age || patient.age || calculateAge(patient.profile?.dob || patient.dob)} <span className="text-[9px] text-slate-400">YRS</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-[10px] lg:text-[12px] font-black text-slate-500 uppercase tracking-widest bg-slate-200/10 px-2 py-0.5 rounded-full border border-slate-200/20">
                                                            {patient.profile?.gender || patient.gender}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="text-[11px] lg:text-[13px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                                                            {patient.mobile || patient.user?.mobile || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                onClick={() => handleSelectPatient(patient)}
                                                                className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white shadow-sm transition-all active:scale-95 flex items-center gap-2"
                                                                title="Print IP Bill"
                                                            >
                                                                <Printer size={14} /> <span className="text-[10px] font-bold uppercase tracking-widest hidden lg:inline">Print</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="py-32 text-center">
                                    <Activity size={32} className="text-slate-200 mx-auto mb-3" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No IPD patients found.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && patients.length > 0 && (
                        <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm mt-4">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
                                    Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total} patients
                                </div>

                                <div className="flex items-center gap-2 pr-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                                    >
                                        <ChevronLeft size={14} /> Prev
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                                            const pageNum = i + 1;
                                            const showPage = pageNum <= 5 || pageNum === totalPages || (pageNum >= page - 1 && pageNum <= page + 1);

                                            if (!showPage && pageNum === 6 && page > 7) {
                                                return <span key={pageNum} className="px-2 text-slate-400">...</span>;
                                            }
                                            if (!showPage) return null;

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setPage(pageNum)}
                                                    className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${page === pageNum
                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                                                        : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                                    >
                                        Next <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
