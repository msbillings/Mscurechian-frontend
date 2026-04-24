'use client';

import React, { useMemo, useState } from "react";
import {
    CreditCard,
    Download,
    Search,
    TrendingUp,
    Filter,
    Loader2,
    AlertCircle,
    ArrowLeft,
    RefreshCw,
    FileText,
    ChevronLeft,
    ChevronRight,
    Activity,
    Shield,
    IndianRupee,
    X
} from "lucide-react";
import { helpdeskService } from "@/lib/integrations";
import toast from "react-hot-toast";
import Link from "next/link";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useTransactions } from "@/lib/integrations/hooks";

export default function TransactionsPage() {
    const [exporting, setExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [showExportCard, setShowExportCard] = useState(false);
    const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [exportType, setExportType] = useState('all');
    const [typeFilter] = useState("opd"); // Locked to 'opd'
    const [paymentModeFilter, setPaymentModeFilter] = useState<'all' | 'online' | 'offline'>('all');
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const limit = 10;

    // Map frontend filter values to backend transaction types
    const getBackendTypeFilter = (filterValue: string): string | undefined => {
        if (filterValue === 'all') return undefined;

        const typeMap: Record<string, string> = {
            'opd': 'appointment_booking,consultation,opd,opd_consultation',
        };

        return typeMap[filterValue] || filterValue;
    };

    const { data: txRaw, isLoading, isFetching, refetch } = useTransactions(
        page,
        limit,
        undefined,
        false,
        startDate,
        endDate,
        getBackendTypeFilter(typeFilter)
    );

    // ✅ DEBUG LOGGING: Track filtering and data retrieval
    React.useEffect(() => {
        console.log("[Transactions] Type Filter:", typeFilter);
        console.log("[Transactions] Backend Filter Query:", getBackendTypeFilter(typeFilter));
    }, [typeFilter]);

    const { transactions, total, totalRevenue } = useMemo(() => {
        const raw: any = txRaw;
        if (!raw) return { transactions: [] as any[], total: 0, totalRevenue: 0 };

        console.log("[Transactions] Raw Data Received:", {
            resultCount: Array.isArray(raw) ? raw.length : (raw.data?.length || 0),
            totalInDB: raw.pagination?.total
        });

        if (Array.isArray(raw)) return { transactions: raw, total: raw.length, totalRevenue: 0 };
        return {
            transactions: raw.transactions || raw.data || [],
            total: raw.pagination?.total || raw.total || (raw.transactions?.length || raw.data?.length || 0),
            totalRevenue: raw.totalRevenue || 0
        };
    }, [txRaw]);

    const handleExport = async () => {
        try {
            setExporting(true);
            setShowExportCard(false);

            // Fetch ALL transactions for the selected range (nopage=true)
            const data = await helpdeskService.getTransactions(
                1,
                2000, // Large limit for export
                undefined,
                true,
                exportStartDate,
                exportEndDate,
                getBackendTypeFilter(typeFilter)
            );
            let exportData = Array.isArray(data) ? data : (data.data || []);

            // ✅ CLIENT-SIDE FILTERING: Ensure we respect the Online/Offline selection
            if (exportType !== 'all') {
                exportData = exportData.filter((tx: any) => {
                    const txType = tx.type?.toLowerCase();
                    return txType === exportType.toLowerCase();
                });
            }

            exportData = exportData.filter((tx: any) => tx.status?.toLowerCase() !== 'cancelled' && tx.referenceId?.status?.toLowerCase() !== 'cancelled');

            if (exportData.length === 0) {
                toast.error("No data found for the selected period");
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Transactions");

            // Add Report Title
            worksheet.mergeCells("A1:G1");
            const titleRow = worksheet.getRow(1);
            worksheet.getCell("A1").value = "TRANSACTION REVENUE REPORT";
            titleRow.font = { bold: true, size: 16, color: { argb: "0F172A" } };
            titleRow.alignment = { vertical: "middle", horizontal: "center" };
            titleRow.height = 30;

            // Define Headers (Row 3)
            worksheet.getRow(3).values = [
                "DATE",
                "TRANSACTION ID",
                "MOBILE",
                "SERVICE TYPE",
                "AMOUNT (INR)",
                "PAYMENT MODE",
                "STATUS"
            ];

            // Set column mapping (uses the same columns for addRow logic)
            worksheet.columns = [
                { key: "date", width: 20 },
                { key: "id", width: 25 },
                { key: "mobile", width: 15 },
                { key: "type", width: 20 },
                { key: "amount", width: 15 },
                { key: "mode", width: 15 },
                { key: "status", width: 15 }
            ];

            // Style Headers (Row 3)
            const headerRow = worksheet.getRow(3);
            headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
            headerRow.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "0F172A" }
            };
            headerRow.alignment = { vertical: "middle", horizontal: "center" };

            // Add Data
            exportData.forEach((tx: any) => {
                // Safe date handling
                const txDate = tx.date || tx.createdAt || tx.transactionTime;
                const formattedDate = txDate
                    ? new Date(txDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'N/A';

                // Map transaction type
                const typeMapping: Record<string, string> = {
                    'appointment_booking': 'OPD Consultation',
                    'opd': 'OPD Consultation',
                    'ipd': 'IPD Admission',
                    'ipd_advance': 'IPD Advance Payment',
                    'ipd_final_settlement': 'IPD Final Settlement',
                    'discharge': 'Discharge Settlement'
                };
                const rawType = tx.type || 'appointment_booking';
                const serviceType = typeMapping[rawType.toLowerCase()] || rawType.toUpperCase();

                const txId = tx.transactionId || tx.receiptNumber || tx.invoiceNumber || tx.referenceId?.appointmentId || tx.referenceId?.transactionId || tx.referenceId?.admissionId || (tx.patientMRN && tx.patientMRN !== 'Resolving...' ? `#${tx.patientMRN}` : "—");

                worksheet.addRow({
                    date: formattedDate,
                    id: txId ? txId.toUpperCase() : "—",
                    mobile: tx.patientMobile || tx.mobile || "N/A",
                    type: serviceType,
                    amount: tx.amount || 0,
                    mode: (tx.paymentMethod || tx.paymentMode || "CASH").toUpperCase(),
                    status: tx.status.toUpperCase()
                });
            });

            // Summary Row
            const totalAmount = exportData.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);
            worksheet.addRow({});
            const summaryRow = worksheet.addRow({ mode: "TOTAL REVENUE", amount: totalAmount });
            summaryRow.font = { bold: true };

            // Generate File
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            saveAs(blob, `CureChain_Revenue_${exportType.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);

            toast.success(`${exportType.toUpperCase()} manifest exported successfully`);
        } catch (error) {
            console.error("Export Error:", error);
            toast.error("Export Failed");
        } finally {
            setExporting(false);
        }
    };

    // Re-fetch on search if needed or filter client-side for immediate feedback
    // Realistically with server pagination, search should also be server-side
    // Filter transactions based on search term (frontend filtering for better UX)
    // Filter transactions based on search term and payment mode
    const filteredTransactions = transactions.filter((tx: any) => {
        const name = tx.patient?.name || tx.patientName || "Unknown";
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
        const isCancelled = tx.status?.toLowerCase() === 'cancelled' || tx.referenceId?.status?.toLowerCase() === 'cancelled';

        const rawMethod = (tx.paymentMethod || tx.paymentMode || 'CASH').toUpperCase();
        const txType = tx.type?.toLowerCase() || 'appointment_booking';

        // Categorize Helpdesk/OPD transactions as OFFLINE category (including those paid by card/upi at counter)
        const isOfflineCategory = ['CASH', 'OFFLINE'].includes(rawMethod) ||
            ['appointment_booking', 'opd', 'consultation', 'opd_consultation'].includes(txType);

        let matchesPaymentMode = true;
        if (paymentModeFilter === 'online') {
            // Purely online payments (not counter appointments)
            matchesPaymentMode = !isOfflineCategory && ['UPI', 'CARD', 'ONLINE', 'NETBANKING'].includes(rawMethod);
        } else if (paymentModeFilter === 'offline') {
            matchesPaymentMode = isOfflineCategory;
        }

        return matchesSearch && !isCancelled && matchesPaymentMode;
    });

    // Calculate stats based on filtered transactions
    const stats = useMemo(() => {
        // Use global revenue from backend
        const grossRevenue = totalRevenue;

        // Use global total from backend instead of page length
        const operationVolume = total;

        const quantumDensity = total > 0 ? (totalRevenue / total) : 0;

        return { grossRevenue, operationVolume, quantumDensity };
    }, [totalRevenue, total]);

    const totalPages = Math.ceil(total / limit);

    const showInitialLoading = isLoading && !txRaw;

    if (showInitialLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing Revenue Ledger...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">

            {/* CONSOLIDATED HEADER & CONTROLS */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-full mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2 pt-2">
                    <div className="flex items-center gap-3">
                        <Link href="/helpdesk" className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-teal-600 transition-all shadow-sm">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                Transactions
                            </h1>
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-2">
                        <button
                            onClick={() => setShowExportCard(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10 active:scale-95 text-[11px] font-bold uppercase tracking-widest"
                        >
                            <Download size={16} />
                            Export Excel
                        </button>
                        <button onClick={() => refetch()} className="p-2 sm:p-2.5 bg-white border border-slate-200 text-slate-400 rounded-lg sm:rounded-xl hover:text-teal-600 shadow-sm active:scale-95">
                            <RefreshCw size={16} className={`${isFetching ? 'animate-spin' : ''} sm:size-[18px]`} />
                        </button>
                    </div>
                </div>

                {/* SEARCH & FILTER BAR */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-t border-slate-100 pt-3 px-2">
                    <div className="flex flex-col lg:grid lg:grid-cols-2 xl:flex xl:flex-row items-stretch xl:items-center gap-3 w-full">

                        {/* ROW 1: SEARCH & REFRESH (On Small Screens) */}
                        <div className="flex items-center gap-2 w-full xl:w-80">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 size-[14px] sm:size-[16px]" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="SEARCH BY NAME OR ID..."
                                    className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-teal-500 shadow-inner transition-all"
                                />
                            </div>
                            <button onClick={() => refetch()} className="sm:hidden p-2.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg active:scale-95">
                                <RefreshCw size={16} className={`${isFetching ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {/* ROW 2: DATE RANGE */}
                        <div className="flex items-center gap-2 w-full lg:w-auto">
                            <div className="flex-1 lg:w-44 relative">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest outline-none focus:border-teal-500 shadow-sm"
                                />
                            </div>
                            <span className="text-slate-300 font-bold">-</span>
                            <div className="flex-1 lg:w-44 relative">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest outline-none focus:border-teal-500 shadow-sm"
                                />
                            </div>
                        </div>
                        {/* ROW 3: CATEGORY & PAYMENT MODE */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                            {/* Payment Mode (Online / Offline) Toggle */}
                            <div className="flex bg-slate-100 p-1 rounded-lg sm:rounded-xl border border-slate-200 shadow-inner">
                                <button
                                    onClick={() => setPaymentModeFilter('all')}
                                    className={`flex-none px-4 py-2 rounded-md text-[9px] sm:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${paymentModeFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setPaymentModeFilter('online')}
                                    className={`flex-none px-4 py-2 rounded-md text-[9px] sm:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${paymentModeFilter === 'online' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
                                >
                                    Online
                                </button>
                                <button
                                    onClick={() => setPaymentModeFilter('offline')}
                                    className={`flex-none px-4 py-2 rounded-md text-[9px] sm:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${paymentModeFilter === 'offline' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
                                >
                                    Offline
                                </button>
                            </div>
                        </div>

                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 w-full xl:w-auto">
                        <div className="flex flex-col border-l border-slate-100 pl-4 md:hidden">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Pool</span>
                            <span className="text-xs font-bold text-teal-600 uppercase tracking-tight">{filteredTransactions.length} ENTRIES</span>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* PAGINATION */}
                            {totalPages > 1 && (
                                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-teal-600 disabled:opacity-20 transition-all"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <div className="px-3 py-1.5 text-xs font-black text-slate-900 bg-white rounded-md shadow-sm border border-slate-100 min-w-[55px] text-center">
                                        {page} / {totalPages}
                                    </div>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-teal-600 disabled:opacity-20 transition-all"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                            <div className="flex-col border-l border-slate-100 pl-4 hidden md:flex">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Pool</span>
                                <span className="text-xs font-bold text-teal-600 uppercase tracking-tight">{filteredTransactions.length} ENTRIES</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* LEDGER TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="overflow-x-auto">
                    {filteredTransactions.length > 0 ? (
                        <table className="w-full min-w-[1000px] sm:min-w-0 text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    <th className="px-4 sm:px-6 py-4 sm:py-6 text-left">Patient Name / ID</th>
                                    <th className="px-6 py-6 text-center">Service Type</th>
                                    <th className="px-6 py-6 text-left font-bold">Reason</th>
                                    <th className="px-6 py-6 text-left font-bold">Doctor / Status</th>
                                    <th className="px-6 py-6 text-right">Amount (INR)</th>
                                    <th className="px-6 py-6 text-center">Sync State</th>
                                    <th className="px-6 py-6 text-right pr-6">Payment Mode</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTransactions.map((tx: any, index: number) => {
                                    const amount = tx.payment?.amount || tx.amount || 0;
                                    const rawStatus = tx.payment?.status || tx.status || "completed";

                                    // Map payment status: 'paid' or 'completed' -> show as PAID, anything else -> PENDING
                                    // CRITICAL FIX: Also check the populated appointment status (tx.referenceId)
                                    const appointmentPaid = tx.referenceId?.paymentStatus === 'paid' || tx.referenceId?.payment?.paymentStatus === 'paid';
                                    const status = (rawStatus.toLowerCase() === 'paid' || rawStatus.toLowerCase() === 'completed' || appointmentPaid) ? 'completed' : 'pending';

                                    const rawType = tx.type || "appointment_booking";
                                    // 🔧 FIX: Don't use "Emergency Patient" fallback
                                    const patientName = (tx.patientName || tx.patient?.name || tx.referenceId?.patientName || "Unknown").toUpperCase();

                                    // Map transaction type to human-readable format
                                    const typeMapping: Record<string, string> = {
                                        'appointment_booking': 'OPD Consultation',
                                        'opd': 'OPD Consultation',
                                        'ipd': 'IPD Admission',
                                        'ipd_advance': 'IPD Advance Payment',
                                        'ipd_bill_payment': 'IPD Due Amount',
                                        'ipd_final_settlement': 'IPD Final Settlement',
                                        'discharge': 'Discharge Settlement',
                                        'lab_test': 'Lab Test',
                                    };
                                    const type = typeMapping[rawType.toLowerCase()] || rawType.toUpperCase();

                                    // Get clinical detail from populated referenceId (appointment/admission data)
                                    const appointmentData = tx.referenceId || {};
                                    const isDischargeTransaction = rawType.toLowerCase() === 'discharge' || rawType.toLowerCase() === 'ipd_final_settlement' || rawType.toLowerCase() === 'ipd_bill_payment';
                                    const isAdvancePayment = rawType.toLowerCase() === 'ipd_advance';

                                    // 🔧 FIX: Prioritize 'reason' over 'diagnosis' for discharge transactions
                                    // For discharge: reason > disease > symptoms (skip diagnosis)
                                    // For others: reason > disease > diagnosis > symptoms
                                    const clinicalDetail = isDischargeTransaction
                                        ? (appointmentData.reason ||
                                            appointmentData.disease ||
                                            (appointmentData.symptoms && appointmentData.symptoms.length > 0 ? appointmentData.symptoms.join(', ') : null) ||
                                            '-')
                                        : (appointmentData.reason ||
                                            appointmentData.disease ||
                                            appointmentData.diagnosis ||
                                            (appointmentData.symptoms && appointmentData.symptoms.length > 0 ? appointmentData.symptoms.join(', ') : null) ||
                                            '-');

                                    // 🔧 FIX: Amount display logic based on filter type
                                    // - Only show Discharge totals when "Discharge Only" filter is explicitly selected
                                    const displayAmount = amount;

                                    // 🔧 FIX: Removed strict filter that was hiding discharge transactions
                                    // Let all transactions flow through and be rendered based on their available data

                                    // 🔧 FIX: Sanitize doctor name — never show raw ObjectId
                                    const rawDoctorName = appointmentData.primaryDoctor || appointmentData.suggestedDoctorName;
                                    const isObjectId = rawDoctorName && rawDoctorName.length === 24 && /^[a-f0-9]{24}$/i.test(rawDoctorName);
                                    const resolvedDoctorName = isObjectId ? null : rawDoctorName;

                                    // 🔍 DEBUG LOGGING - Track transaction data structure
                                    if (isDischargeTransaction) {
                                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                                        console.log('🔍 HELPDESK DISCHARGE TRANSACTION DEBUG:', {
                                            transactionId: tx._id || tx.id,
                                            patientName: patientName,
                                            rawType: rawType,
                                            isDischargeTransaction: isDischargeTransaction,
                                            transactionAmount: amount,
                                            referenceIdExists: !!tx.referenceId,
                                            referenceIdType: typeof tx.referenceId,
                                            referenceIdKeys: tx.referenceId ? Object.keys(tx.referenceId) : [],
                                            totalBillAmount: appointmentData.totalBillAmount,
                                            displayAmount: displayAmount,
                                            primaryDoctor: appointmentData.primaryDoctor,
                                            suggestedDoctorName: appointmentData.suggestedDoctorName,
                                            conditionAtDischarge: appointmentData.conditionAtDischarge,
                                            fullReferenceId: tx.referenceId
                                        });
                                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                                    }

                                    return (
                                        <tr key={tx._id || index} className="group hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-11 h-11 rounded-xl transition-all flex items-center justify-center font-bold text-lg shadow-sm border shrink-0 ${tx.patientMRN && tx.patientMRN !== 'Resolving...'
                                                        ? 'bg-slate-900 text-white'
                                                        : 'bg-slate-50 text-slate-300 group-hover:bg-slate-900 group-hover:text-white border-slate-100'
                                                        }`}>
                                                        {patientName.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-900 uppercase tracking-tight truncate max-w-[200px]">{patientName}</p>
                                                        <p className={`text-[10px] font-black uppercase tracking-[0.1em] mt-1 px-2 py-0.5 rounded-md inline-block border ${tx.referenceId?.transactionId?.startsWith('OPD') || tx.referenceId?.transactionId?.startsWith('APT')
                                                            ? 'bg-teal-50 text-teal-600 border-teal-100/50'
                                                            : tx.referenceId?.transactionId?.startsWith('IPD') || tx.referenceId?.admissionId
                                                                ? 'bg-rose-50 text-rose-600 border-rose-100/50'
                                                                : 'bg-slate-50 text-slate-500 border-slate-100'
                                                            }`}>
                                                            {tx.transactionId || tx.receiptNumber || tx.invoiceNumber || tx.referenceId?.appointmentId || tx.referenceId?.transactionId || tx.referenceId?.admissionId || (tx.patientMRN && tx.patientMRN !== 'Resolving...' ? `#${tx.patientMRN}` : "—")}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${(tx.registrationType === 'IPD' || type.includes('IPD'))
                                                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                                                    : 'bg-teal-50 text-teal-600 border-teal-100'
                                                    }`}>
                                                    {(tx.registrationType === 'IPD' || type.includes('IPD')) ? 'IPD' : 'OPD'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{clinicalDetail}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    {resolvedDoctorName ? (
                                                        <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">
                                                            {resolvedDoctorName}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">N/A</p>
                                                    )}
                                                    {appointmentData.conditionAtDischarge && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${appointmentData.conditionAtDischarge === 'Stable' || appointmentData.conditionAtDischarge === 'Improved'
                                                                ? 'bg-emerald-500'
                                                                : appointmentData.conditionAtDischarge === 'Critical'
                                                                    ? 'bg-rose-500'
                                                                    : 'bg-amber-500'
                                                                }`} />
                                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                                                {appointmentData.conditionAtDischarge}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <p className="text-sm font-bold text-slate-900 tracking-tight">
                                                    {amount !== null ? `₹${Math.round(amount).toLocaleString()}` : '-'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${status.toLowerCase() === 'paid' || status.toLowerCase() === 'completed'
                                                    ? 'bg-teal-50 text-teal-600 border border-teal-100'
                                                    : 'bg-rose-50 text-rose-600 border border-rose-100'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${status.toLowerCase() === 'paid' || status.toLowerCase() === 'completed' ? 'bg-teal-500' : 'bg-rose-500'}`} />
                                                    {status}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-slate-200 shadow-sm">
                                                    <CreditCard size={12} className="text-slate-400" />
                                                    {tx.paymentMethod || 'CASH'}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-20 text-center">
                            <Activity size={32} className="text-slate-200 mx-auto mb-3" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No financial objects indexed</p>
                        </div>
                    )}
                </div>
            </div>

            {/* EXPORT MODAL */}
            {showExportCard && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                                    <Download size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Export Ledger</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Date Range & Type</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowExportCard(false)}
                                className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5">
                            {/* Date Inputs */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={exportStartDate}
                                        onChange={(e) => setExportStartDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                                    <input
                                        type="date"
                                        value={exportEndDate}
                                        onChange={(e) => setExportEndDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Type Selection */}
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction Category</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['all', 'online', 'offline'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setExportType(t)}
                                            className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${exportType === t
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-200 hover:bg-emerald-50'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={() => handleExport()}
                                    disabled={exporting}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-900/10 active:scale-[0.98] disabled:opacity-50"
                                >
                                    {exporting ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            GENERATING SHEET...
                                        </>
                                    ) : (
                                        <>
                                            <FileText size={18} />
                                            DOWNLOAD EXCEL SHEET
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-slate-50 px-6 py-4 text-center">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em]">System optimized for high-volume ledger exports</p>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}