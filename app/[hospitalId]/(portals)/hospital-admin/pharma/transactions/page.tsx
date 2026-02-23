'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Search,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    Download,
    X
} from 'lucide-react';
import { PharmacyBillingService } from '@/lib/integrations/services/pharmacyBilling.service';
import { PharmacyBill } from '@/lib/integrations/types/pharmacyBilling';
import PharmacyBillPrint from '@/components/pharmacy/billing/PharmacyBillPrint';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useDebounce } from "@/hooks/useDebounce";

// ============================================================================
// PERFORMANCE: Memoized Transaction Row
// ============================================================================
const TransactionRow = React.memo(({
    bill,
    onPrint,
    onDelete
}: {
    bill: PharmacyBill;
    onPrint: (bill: PharmacyBill) => void;
    onDelete: (id: string) => void;
}) => {
    return (
        <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 group transition-colors">
            <td className="px-8 py-5">
                <span
                    onClick={() => onPrint(bill)}
                    className="font-black text-blue-600 text-[12px] tracking-tight hover:underline cursor-pointer uppercase"
                >
                    #{bill.invoiceId}
                </span>
            </td>
            <td className="px-8 py-5 text-[12px] font-bold text-gray-400 uppercase">
                {bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
            </td>
            <td className="px-8 py-5">
                <p className="text-[12px] font-black text-gray-700 dark:text-white tracking-tight uppercase truncate max-w-[200px]">
                    {bill.patientName || 'ANONYMOUS ENTITY'}
                </p>
                <p className="text-[10px] font-bold text-gray-400 tracking-widest">{bill.customerPhone || '-'}</p>
            </td>
            <td className="px-8 py-5 text-center">
                <span className="px-4 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl text-[9px] font-black uppercase tracking-widest">
                    {bill.paymentSummary.paymentMode || 'CASH'}
                </span>
            </td>
            <td className="px-8 py-5 text-right font-black text-gray-900 dark:text-white text-[14px]">
                ₹{Math.round(bill.paymentSummary.grandTotal || 0).toLocaleString()}
            </td>
            <td className="px-8 py-5 text-center">
                <span className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest ${bill.paymentSummary.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                    {bill.paymentSummary.status}
                </span>
            </td>
            <td className="px-8 py-5 text-center">
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => onDelete(bill._id)}
                        className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Purge Record"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </td>
        </tr>
    );
});

TransactionRow.displayName = 'TransactionRow';

const TransactionsPage = () => {
    const [bills, setBills] = useState<PharmacyBill[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalBills, setTotalBills] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const [selectedBill, setSelectedBill] = useState<PharmacyBill | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: selectedBill ? `Invoice_${selectedBill.invoiceId}` : 'Invoice',
    });

    const fetchBills = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const data = await PharmacyBillingService.getBills(
                page,
                10,
                debouncedSearch,
                undefined, // Payment mode filter removed
                startDate,
                endDate
            );
            setBills(data.bills);
            setTotalPages(data.totalPages);
            setCurrentPage(data.currentPage);
            setTotalBills(data.totalBills);
        } catch (error) {
            console.error('Failed to fetch bills:', error);
            toast.error('Failed to load transaction audit logs');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, startDate, endDate]);

    useEffect(() => {
        fetchBills(1);
    }, [fetchBills]);

    const onPrintClick = useCallback((bill: PharmacyBill) => {
        setSelectedBill(bill);
        setTimeout(() => {
            handlePrint();
        }, 300);
    }, [handlePrint]);

    const handleDelete = useCallback(async (id: string) => {
        if (!window.confirm('Warning: This will permanently delete the transaction record. Proceed?')) return;

        try {
            await PharmacyBillingService.deleteBill(id);
            toast.success('Record purged');
            fetchBills(currentPage);
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Purge failed');
        }
    }, [currentPage, fetchBills]);

    const handleExportExcel = async () => {
        if (bills.length === 0) {
            toast.error('No transaction records to export');
            return;
        }

        setIsExporting(true);
        try {
            const exportData = await PharmacyBillingService.getBills(1, 2000, debouncedSearch, undefined, startDate, endDate);
            const allBills = exportData.bills;

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Pharmacy Audit');

            // --- 1. Report Titles ---
            // Row 1: Main Title
            const titleRow = worksheet.addRow(['PHARMACY TRANSACTION SUMMARY REPORT']);
            titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1F4E78' } }; // Dark Blue Text
            titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.mergeCells('A1:J1');
            titleRow.height = 30;

            // Row 2: Organization Name
            const orgRow = worksheet.addRow(['Pharmacy Transaction Registry']);
            orgRow.font = { name: 'Calibri', size: 12, bold: true };
            orgRow.alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.mergeCells('A2:J2');

            // Row 3: Period
            const periodText = `Period: ${startDate ? new Date(startDate).toLocaleDateString('en-GB') : 'Inicio'} to ${endDate ? new Date(endDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}`;
            const periodRow = worksheet.addRow([periodText]);
            periodRow.font = { name: 'Calibri', size: 11, italic: true };
            periodRow.alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.mergeCells('A3:J3');

            // Spacer
            worksheet.addRow([]);

            // --- 2. Define Columns & Headers ---
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
                    top: { style: 'thin', color: { argb: 'FF0070C0' } }, // Blue Border (ARGB FF0070C0)
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

            // --- 3. Populate Data ---
            let grandTotal = 0;

            // Payment Mode Totals
            let cashTotal = 0;
            let cardTotal = 0;
            let upiTotal = 0;
            let mixedTotal = 0;

            allBills.forEach((bill, index) => {
                const dateObj = new Date(bill.createdAt);
                const total = bill.paymentSummary.grandTotal || 0;

                grandTotal += total;

                const pMode = bill.paymentSummary.paymentMode || 'Cash';
                if (pMode === 'Cash') cashTotal += total;
                else if (pMode === 'Card') cardTotal += total;
                else if (pMode === 'UPI') upiTotal += total;
                else mixedTotal += total;

                const row = worksheet.addRow({
                    sno: index + 1,
                    date: dateObj.toLocaleDateString('en-GB'),
                    invoiceId: bill.invoiceId,
                    patient: (bill.patientName || 'ANONYMOUS').toUpperCase(),
                    mobile: bill.customerPhone || '-',
                    mode: pMode.toUpperCase(),
                    total: total,
                    status: (bill.paymentSummary.status || 'Paid').toUpperCase(),
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
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Pharmacy_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('Professional Transaction Audit exported successfully');
        } catch (error) {
            console.error('Export Error:', error);
            toast.error('Manifest extraction failed');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Simple Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Ledger</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1 italic tracking-tight">Sales Audit & Institutional Revenue Tracking</p>
                </div>
                <button
                    onClick={handleExportExcel}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-theme text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all disabled:opacity-50 shadow-sm"
                >
                    <Download size={14} strokeWidth={3} />
                    {isExporting ? 'Exporting...' : 'Export Audit Manifest'}
                </button>
            </div>

            {/* Simple Filter Hub */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative w-full md:w-96">
                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium transition-all"
                            placeholder="Filter by Invoice ID or Entity..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto ml-auto">
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Start:</p>
                            <input
                                type="date"
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                max={endDate || new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">End:</p>
                            <input
                                type="date"
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                min={startDate}
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        {(startDate || endDate) && (
                            <button
                                onClick={() => {
                                    setStartDate('');
                                    setEndDate('');
                                }}
                                className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all ml-2"
                                title="Clear Dates"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Clean Logs Container */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
                {/* Refined Header */}
                <div className="flex items-center justify-between px-8 py-4 border-b border-slate-50 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                            <ArrowUpRight size={18} strokeWidth={3} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Dataset Hub</p>
                            <p className="text-xs font-black text-slate-900 uppercase">{totalBills} Operations Logged</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                const newPage = Math.max(1, currentPage - 1);
                                setCurrentPage(newPage);
                                fetchBills(newPage);
                            }}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-white hover:text-slate-900 transition-all active:scale-95"
                        >
                            <ChevronLeft size={16} strokeWidth={3} />
                        </button>
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                            Layer {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => {
                                const newPage = Math.min(totalPages, currentPage + 1);
                                setCurrentPage(newPage);
                                fetchBills(newPage);
                            }}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-white hover:text-slate-900 transition-all active:scale-95"
                        >
                            <ChevronRight size={16} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-50">
                                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Signature</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity Entity</th>
                                <th className="px-8 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Gateway</th>
                                <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantum</th>
                                <th className="px-8 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-8 py-6"><div className="h-12 bg-slate-50 rounded-xl w-full"></div></td>
                                    </tr>
                                ))
                            ) : bills.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-20 text-center">
                                        <p className="text-lg font-black text-slate-200 uppercase tracking-tight italic">Registry Void</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">No transaction logs detected in sector.</p>
                                    </td>
                                </tr>
                            ) : (
                                bills.map((bill) => (
                                    <TransactionRow
                                        key={bill._id}
                                        bill={bill}
                                        onPrint={onPrintClick}
                                        onDelete={handleDelete}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hidden Print Area */}
            <div className="hidden">
                <div ref={printRef}>
                    {selectedBill && <PharmacyBillPrint
                        billData={selectedBill}
                        shopDetails={{
                            name: 'Institutional Pharmacy',
                            address: 'Main Wing, Level 1',
                            phone: '+91 000 000 0000',
                            email: 'pharma@institutional.hub',
                            gstin: 'IN-PHAR-AUDIT-001'
                        }}
                    />}
                </div>
            </div>
        </div>
    );
};

export default React.memo(TransactionsPage);
