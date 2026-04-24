'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { LabBillingService } from '@/lib/integrations/services/labBilling.service';
import { BillResponse } from '@/lib/integrations/types/labBilling';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
    Download,
    Search,
    Calendar,
    Filter,
    CreditCard,
    ChevronLeft,
    ChevronRight,
    Activity,
    FlaskConical
} from 'lucide-react';
import { toast } from 'react-hot-toast';

function HospitalAdminLabTransactionsPage() {
    const [bills, setBills] = useState<BillResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchBills = async (pageNum: number) => {
        setLoading(true);
        try {
            const res = await LabBillingService.getBills(pageNum, 10, false, startDate, endDate);
            setBills(res.bills);
            setTotalPages(res.totalPages);
            setPage(res.currentPage);
        } catch (error) {
            console.error("Audit fetch failed", error);
            toast.error("Failed to synchronize transaction logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBills(1);
    }, [startDate, endDate]);

    useEffect(() => {
        fetchBills(page);
    }, [page]);

    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await LabBillingService.getBills(1, 2000, true, startDate, endDate);
            const allBills = res.bills;

            if (allBills.length === 0) {
                toast.error("No transaction records found for export");
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Revenue Report');

            // 1. Report Titles
            const titleRow = worksheet.addRow(['LABORATORY TRANSACTION SUMMARY REPORT']);
            titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1F4E78' } };
            titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.mergeCells('A1:J1');
            titleRow.height = 30;

            const orgRow = worksheet.addRow(['Medilab Diagnostic Center']);
            orgRow.font = { name: 'Calibri', size: 12, bold: true };
            orgRow.alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.mergeCells('A2:J2');

            const periodText = `Period: ${startDate ? new Date(startDate).toLocaleDateString('en-GB') : 'Inicio'} to ${endDate ? new Date(endDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}`;
            const periodRow = worksheet.addRow([periodText]);
            periodRow.font = { name: 'Calibri', size: 11, italic: true };
            periodRow.alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.mergeCells('A3:J3');

            // Spacer
            worksheet.addRow([]);

            // 2. Define Columns & Headers
            const headers = [
                'S.No',
                'Date',
                'Invoice ID',
                'Patient Name',
                'Mobile',
                'Payment Mode',
                'Total Amount',
                'Status'
            ];
            const headerRow = worksheet.addRow(headers);

            // Styling Header Row
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF1F2937' } // Dark Gray/Black Background
                };
                cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF0070C0' } }, // Blue Border
                    left: { style: 'thin', color: { argb: 'FF0070C0' } },
                    bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
                    right: { style: 'thin', color: { argb: 'FF0070C0' } }
                };
            });

            worksheet.columns = [
                { key: 'sno', width: 8 },
                { key: 'date', width: 12 },
                { key: 'invoiceId', width: 20 },
                { key: 'patient', width: 25 },
                { key: 'mobile', width: 15 },
                { key: 'mode', width: 15 },
                { key: 'total', width: 15 },
                { key: 'status', width: 15 },
            ];

            // 3. Populate Data
            let grandTotal = 0;

            // Payment Mode Totals
            let cashTotal = 0;
            let cardTotal = 0;
            let upiTotal = 0;
            let mixedTotal = 0;

            allBills.forEach((bill, index) => {
                const dateObj = new Date(bill.createdAt);
                const total = bill.finalAmount || 0;

                grandTotal += total;

                if (bill.paymentMode === 'Cash') cashTotal += total;
                else if (bill.paymentMode === 'Card') cardTotal += total;
                else if (bill.paymentMode === 'UPI') upiTotal += total;
                else mixedTotal += total;

                const row = worksheet.addRow({
                    sno: index + 1,
                    date: dateObj.toLocaleDateString('en-GB'),
                    invoiceId: bill.invoiceId,
                    patient: bill.patientDetails.name,
                    mobile: bill.patientDetails.mobile || '-',
                    mode: bill.paymentMode,
                    total: total,
                    status: bill.status || 'Pending',
                });

                // Styling Data Rows
                row.eachCell((cell, colIdx) => {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FF0070C0' } }, // Blue Border
                        left: { style: 'thin', color: { argb: 'FF0070C0' } },
                        bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
                        right: { style: 'thin', color: { argb: 'FF0070C0' } }
                    };
                    cell.font = { name: 'Calibri', size: 10 };

                    // Numeric Formatting
                    if (colIdx === 7) { // Total Amount
                        cell.numFmt = '₹#,##0.00';
                        cell.alignment = { horizontal: 'right' };
                        cell.font = { bold: true };
                    }
                });
            });

            // Spacer
            worksheet.addRow([]);

            // --- 4. Footer Totals ---
            const footerRow = worksheet.addRow([
                '', '', '', '', '', 'TOTALS:', grandTotal, ''
            ]);

            // Style Header-like footer
            footerRow.eachCell((cell, colIdx) => {
                if (colIdx >= 6 && colIdx <= 7) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; // Light Blue
                    cell.font = { bold: true };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FF0070C0' } },
                        left: { style: 'thin', color: { argb: 'FF0070C0' } },
                        bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
                        right: { style: 'thin', color: { argb: 'FF0070C0' } }
                    };
                    if (colIdx === 7) {
                        cell.alignment = { horizontal: 'right' };
                        cell.numFmt = '₹#,##0.00';
                    }
                }
            });

            // Spacer
            worksheet.addRow([]);

            // --- 5. Payment Breakdown ---
            const breakdownHeader = worksheet.addRow(['', '', '', '', '', 'PAYMENT MODE BREAKDOWN']);
            breakdownHeader.getCell(6).font = { bold: true, underline: true };

            const addBreakdownRow = (label: string, value: number) => {
                const r = worksheet.addRow(['', '', '', '', '', label, value]);
                r.getCell(6).alignment = { horizontal: 'left' };
                r.getCell(7).alignment = { horizontal: 'right' };
                r.getCell(7).numFmt = '₹#,##0.00';
                r.getCell(7).font = { bold: true };
            };

            addBreakdownRow('Total Cash :', cashTotal);
            addBreakdownRow('Total Card :', cardTotal);
            addBreakdownRow('Total UPI :', upiTotal);
            addBreakdownRow('Total Mixed :', mixedTotal);

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Lab_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Transaction report generated successfully");
        } catch (error) {
            console.error("Export failure", error);
            toast.error("Manifest extraction failed");
        } finally {
            setExporting(false);
        }
    };

    const filteredBills = useMemo(() => {
        if (!searchTerm.trim()) return bills;
        const lowSearch = searchTerm.toLowerCase();
        return bills.filter(bill =>
            bill.invoiceId.toLowerCase().includes(lowSearch) ||
            bill.patientDetails.name.toLowerCase().includes(lowSearch) ||
            bill.patientDetails.mobile?.toLowerCase().includes(lowSearch) ||
            bill.paymentMode.toLowerCase().includes(lowSearch)
        );
    }, [bills, searchTerm]);

    return (
        <div className="p-2 sm:p-3 md:p-4 space-y-6">
            {/* Header Tier */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div>
                    <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white uppercase">Transactions</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-bold mt-2 uppercase tracking-[0.2em] text-[10px] ml-1 flex items-center gap-2">
                        <Activity className="w-3 h-3 text-blue-500" />
                        Track payments and billing records
                    </p>
                </div>

                <button
                    onClick={handleExport}
                    disabled={exporting || loading}
                    className="flex items-center gap-3 px-4 md:px-8 py-4 bg-primary-theme dark:bg-white text-white dark:text-black rounded-[1rem] text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                    <Download className="w-4 h-4" />
                    {exporting ? 'Extracting...' : 'Export Data'}
                </button>
            </div>

            {/* Strategic Filters Hub */}
            <div className="bg-white dark:bg-gray-800 p-3 md:p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap gap-4 items-end relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16"></div>

                {/* Search Bar */}
                <div className="flex-[2] min-w-[280px]">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Search</label>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search Invoice, Patient, or Mobile..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-blue-500/30 rounded-xl pl-12 pr-4 py-2.5 text-xs font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 min-w-[160px]">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">From Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-blue-500/30 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 min-w-[160px]">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">To Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            type="date"
                            value={endDate}
                            min={startDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-blue-500/30 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        />
                    </div>
                </div>

                <button
                    onClick={() => { setStartDate(''); setEndDate(''); setSearchTerm(''); }}
                    className="px-4 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
                >
                    Reset
                </button>
            </div>

            {/* Audit manifestation Terminal */}
            <div className="bg-white dark:bg-gray-800 rounded-[0.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden relative">
                <div className="overflow-x-auto">
                    <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice ID</th>
                                <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient Name</th>
                                <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Method</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="opacity-50">
                                        <td colSpan={6} className="px-2 md:px-8 py-6"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredBills.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-2 md:px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-50">
                                            <FlaskConical className="w-12 h-12 text-gray-300" />
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">No results found for your search criteria</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredBills.map((bill) => (
                                    <tr key={bill._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 group">
                                        <td className="px-2 md:px-8 py-6">
                                            <span className="text-[11px] font-black italic bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-xl uppercase">#{bill.invoiceId}</span>
                                        </td>
                                        <td className="px-2 md:px-8 py-6">
                                            <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tighter">
                                                {new Date(bill.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                        </td>
                                        <td className="px-2 md:px-8 py-6">
                                            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tighter underline underline-offset-4 decoration-gray-100 dark:decoration-gray-800">{bill.patientDetails.name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{bill.patientDetails.mobile}</p>
                                        </td>
                                        <td className="px-2 md:px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-gray-900 dark:text-white">₹{bill.finalAmount.toLocaleString()}</span>
                                                {bill.paidAmount < bill.finalAmount && <span className="text-[8px] font-black text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full uppercase">Arrears: ₹{(bill.finalAmount - bill.paidAmount).toLocaleString()}</span>}
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-8 py-6">
                                            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${bill.status === 'Paid' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600'}`}>
                                                {bill.status}
                                            </span>
                                        </td>
                                        <td className="px-2 md:px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="w-3 h-3 text-gray-300" />
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{bill.paymentMode}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table></div>
                </div>

                {/* Tactical Pagination Terminal */}
                <div className="p-3 md:p-8 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                        className="flex items-center gap-2 px-3 md:px-6 py-3 text-[10px] font-black text-gray-400 hover:text-blue-500 uppercase tracking-widest disabled:opacity-20"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.3em]">Unit {page} of {totalPages}</span>
                        <div className="flex gap-1 mt-2">
                            {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                                <div key={i} className={`w-4 h-1 rounded-full ${i + 1 === page ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                            ))}
                        </div>
                    </div>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="flex items-center gap-2 px-3 md:px-6 py-3 text-[10px] font-black text-gray-400 hover:text-blue-500 uppercase tracking-widest disabled:opacity-20"
                    >
                        Next
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(HospitalAdminLabTransactionsPage);
