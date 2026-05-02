"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { LabBillingService } from '@/lib/integrations/services/labBilling.service';
import { BillResponse } from '@/lib/integrations/types/labBilling';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download, Eye, Printer, Filter, Calendar, Receipt, ChevronLeft, ChevronRight, Search, X, RefreshCw } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import BillPrintView from '@/components/lab/BillPrintView';
import { toast } from 'react-hot-toast';

function TransactionsPage() {
    const [bills, setBills] = useState<BillResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedBill, setSelectedBill] = useState<BillResponse | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Auto-refresh state
    const [isAutoRefreshed, setIsAutoRefreshed] = useState(false);


    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: selectedBill ? `Invoice_${selectedBill.invoiceId}` : 'Invoice',
        onAfterPrint: () => setShowPreview(false)
    });

    const triggerPrint = (bill: BillResponse) => {
        setSelectedBill(bill);
        setTimeout(() => {
            handlePrint();
        }, 100);
    };

    const openPreview = (bill: BillResponse) => {
        setSelectedBill(bill);
        setShowPreview(true);
    };

    const fetchBills = useCallback(async (pageNum = 1, skipCache = false, isPolling = false) => {
        if (!isPolling) setLoading(true);

        try {
            const data = await LabBillingService.getBills(pageNum, 25, false, startDate, endDate, skipCache);

            // For polling: only update if data changed (simple check) or just always update state
            // In a real app we might diff data, but for now replacing is fine
            setBills(data.bills);
            setTotalPages(data.totalPages);
            if (!isPolling) setPage(data.currentPage);

            if (isPolling) setIsAutoRefreshed(true);
            setTimeout(() => setIsAutoRefreshed(false), 2000); // Reset flash effect using timeout

        } catch (error) {
            console.error("Failed to fetch transactions", error);
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, [startDate, endDate]);


    // Initial Fetch & Date Filter Change
    useEffect(() => {
        fetchBills(1, true);
    }, [fetchBills]);

    // Page Change
    useEffect(() => {
        fetchBills(page, true);
    }, [page, fetchBills]);

    // Polling for instant updates (every 5 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchBills(page, true, true);
        }, 5000);

        return () => clearInterval(interval);
    }, [page, fetchBills]);


    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await LabBillingService.getBills(1, 2000, true, startDate, endDate);
            const allBills = res.bills;

            if (allBills.length === 0) {
                toast.error("No transactions to export");
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Transactions');

            // 1. Transaction Report Heading
            worksheet.mergeCells('A1:J1');
            const titleRow = worksheet.getRow(1);
            titleRow.getCell(1).value = 'LABORATORY TRANSACTION SUMMARY REPORT';
            titleRow.getCell(1).font = { size: 16, bold: true, name: 'Arial', color: { argb: '1E293B' } };
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow.height = 35;

            // 2. Hospital Name
            worksheet.mergeCells('A2:J2');
            const hospitalRow = worksheet.getRow(2);
            hospitalRow.getCell(1).value = 'Medilab Diagnostic Center';
            hospitalRow.getCell(1).font = { size: 12, bold: true, color: { argb: '475569' } };
            hospitalRow.getCell(1).alignment = { horizontal: 'center' };

            // 3. Date Range Info
            worksheet.mergeCells('A3:J3');
            const dateRangeRow = worksheet.getRow(3);
            const dateText = (startDate && endDate)
                ? `Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
                : `Report Date: ${new Date().toLocaleDateString()}`;
            dateRangeRow.getCell(1).value = dateText;
            dateRangeRow.getCell(1).font = { size: 10, italic: true };
            dateRangeRow.getCell(1).alignment = { horizontal: 'center' };

            worksheet.addRow([]); // Spacer

            // Define Columns
            const columns = [
                { header: 'S.No', width: 8 },
                { header: 'Date', width: 12 },
                { header: 'Invoice ID', width: 15 },
                { header: 'Patient Name', width: 25 },
                { header: 'Mobile', width: 15 },
                { header: 'Payment Mode', width: 15 },
                { header: 'Total Amount', width: 15 },
                { header: 'Paid Amount', width: 15 },
                { header: 'Balance', width: 12 },
                { header: 'Status', width: 12 },
            ];

            // Header Row Styling
            const headerRow = worksheet.addRow(columns.map(c => c.header));
            headerRow.height = 25;
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } }; // Slate-800
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'medium' },
                    left: { style: 'thin' },
                    bottom: { style: 'medium' },
                    right: { style: 'thin' }
                };
            });

            let totalBillAmount = 0;
            let totalPaidAmount = 0;
            let totalBalanceAmount = 0;

            // Payment Mode Wise Totals
            let cashTotal = 0;
            let cardTotal = 0;
            let upiTotal = 0;
            let mixedTotal = 0;

            // Add Data Rows
            allBills.forEach((bill, index) => {
                const mode = (bill.paymentMode || 'CASH').toLowerCase();
                const amount = bill.paidAmount; // Tracking actually collected amount

                if (mode === 'cash') cashTotal += amount;
                else if (mode === 'card') cardTotal += amount;
                else if (mode === 'upi') upiTotal += amount;
                else if (mode === 'mixed') mixedTotal += amount;

                const row = worksheet.addRow([
                    index + 1,
                    new Date(bill.createdAt).toLocaleDateString(),
                    bill.invoiceId,
                    bill.patientDetails.name,
                    bill.patientDetails.mobile,
                    bill.paymentMode?.toUpperCase() || 'CASH',
                    bill.finalAmount,
                    bill.paidAmount,
                    bill.balance,
                    bill.status
                ]);

                totalBillAmount += bill.finalAmount;
                totalPaidAmount += bill.paidAmount;
                totalBalanceAmount += bill.balance;

                // Style data cells
                row.eachCell((cell, colNumber) => {
                    // Standard alignment
                    if (colNumber <= 6 || colNumber === 10) {
                        cell.alignment = { horizontal: colNumber === 4 ? 'left' : 'center' };
                    } else {
                        cell.alignment = { horizontal: 'right' };
                    }

                    // Zebra striping
                    if (index % 2 === 0) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
                    }

                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };

                    // Format Amount columns
                    if ([7, 8, 9].includes(colNumber)) {
                        cell.numFmt = '₹#,##0.00';
                    }
                });
            });

            // Summary Totals Row
            worksheet.addRow([]); // Blank row
            const summaryRow = worksheet.addRow([
                '', '', '', '', '', 'TOTALS:',
                totalBillAmount,
                totalPaidAmount,
                totalBalanceAmount,
                ''
            ]);

            summaryRow.height = 25;
            summaryRow.eachCell((cell, colNumber) => {
                if (colNumber >= 6 && colNumber <= 9) {
                    cell.font = { bold: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
                    cell.border = {
                        top: { style: 'medium' },
                        left: { style: 'thin' },
                        bottom: { style: 'medium' },
                        right: { style: 'thin' }
                    };
                    if (colNumber > 6) cell.numFmt = '₹#,##0.00';
                }
            });

            // 4. Payment Mode Breakdown Section
            worksheet.addRow([]); // Spacer
            const breakdownTitle = worksheet.addRow(['', '', '', '', '', 'PAYMENT MODE BREAKDOWN']);
            breakdownTitle.getCell(6).font = { bold: true, underline: true };

            const cashRow = worksheet.addRow(['', '', '', '', '', 'Total Cash :', cashTotal]);
            const cardRow = worksheet.addRow(['', '', '', '', '', 'Total Card :', cardTotal]);
            const upiRow = worksheet.addRow(['', '', '', '', '', 'Total UPI :', upiTotal]);
            const mixedRow = worksheet.addRow(['', '', '', '', '', 'Total Mixed :', mixedTotal]);

            [cashRow, cardRow, upiRow, mixedRow].forEach(row => {
                row.getCell(6).alignment = { horizontal: 'left' };
                row.getCell(7).alignment = { horizontal: 'right' };
                row.getCell(7).font = { bold: true };
                row.getCell(7).numFmt = '₹#,##0.00';
                row.getCell(7).border = {
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            worksheet.addRow([]); // Spacer
            worksheet.addRow([]); // Spacer

            // Preparation Info
            const prepRow = worksheet.addRow(['', '', '', '', '', '', '', '', 'Prepared By:Lab Staff']);
            prepRow.getCell(9).font = { bold: true, italic: true };

            // Set Column Widths
            worksheet.columns.forEach((col, i) => {
                col.width = columns[i].width;
            });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Lab_Transactions_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

        } catch (error) {
            console.error("Export failed", error);
            toast.error("Failed to export transactions");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="max-w-full mx-auto pb-12 bg-slate-50/50 dark:bg-gray-900 min-h-screen">
            {/* Professional Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-4 border-b border-gray-200 dark:border-gray-800 mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200 dark:shadow-none">
                            <Receipt className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white tracking-tight">Billing History</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Manage invoices and track payments
                        </p>
                        {isAutoRefreshed && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse">
                                <RefreshCw className="w-3 h-3" /> Live
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="px-3 py-2 border-r border-gray-100 dark:border-gray-700">
                            <Filter className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent border-none text-xs font-semibold text-gray-700 dark:text-gray-300 focus:ring-0 p-1"
                        />
                        <span className="text-gray-300">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent border-none text-xs font-semibold text-gray-700 dark:text-gray-300 focus:ring-0 p-1"
                        />
                        {(startDate || endDate) && (
                            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-md">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={exporting || loading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold shadow-sm transition-colors"
                    >
                        <Download className="w-4 h-4 text-indigo-500" />
                        {exporting ? 'Exporting...' : 'Export XLS'}
                    </button>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading && !bills.length ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-4">
                                            <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : bills.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                                                <Search className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <p className="text-gray-500 font-medium">No transactions found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                bills.map((bill) => (
                                    <tr key={bill._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-sm text-indigo-600 dark:text-indigo-400">
                                                {bill.invoiceId}
                                            </span>
                                            <div className="text-xs text-gray-400 mt-0.5">{bill.paymentMode}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {new Date(bill.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {bill.patientDetails.name}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {bill.patientDetails.mobile}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 dark:text-white">
                                                ₹{bill.finalAmount.toLocaleString()}
                                            </div>
                                            {bill.balance > 0 && (
                                                <div className="text-xs font-bold text-rose-500 mt-0.5">
                                                    Due: ₹{bill.balance.toLocaleString()}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bill.status === 'Paid'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>
                                                {bill.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openPreview(bill)}
                                                    className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-colors"
                                                    title="View Invoice"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => triggerPrint(bill)}
                                                    className="p-2 text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors shadow-sm"
                                                    title="Print"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                        Page {page} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Print Preview Modal - Professional Style */}
            {showPreview && selectedBill && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Invoice Preview</h3>
                                <p className="text-xs text-gray-500">{selectedBill.invoiceId}</p>
                            </div>
                            <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-200 rounded-lg">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 bg-gray-100/50 dark:bg-black/20">
                            <div className="bg-white shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '20mm' }}>
                                <BillPrintView
                                    billData={selectedBill}
                                    invoiceId={selectedBill.invoiceId}
                                    date={new Date(selectedBill.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-white dark:bg-gray-800">
                            <button onClick={() => setShowPreview(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Close</button>
                            <button onClick={handlePrint} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all">
                                Print Invoice
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Hidden Print Content */}
            <div style={{ display: 'none' }}>
                <div ref={printRef}>
                    {selectedBill && (
                        <BillPrintView
                            billData={selectedBill}
                            invoiceId={selectedBill.invoiceId}
                            date={new Date(selectedBill.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default React.memo(TransactionsPage);
