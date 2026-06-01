'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search,
    CreditCard,
    TrendingUp,
    IndianRupee,
    ArrowUpRight,
    RefreshCw,
    FileSpreadsheet,
    ChevronLeft,
    ChevronRight,
    FlaskConical
} from "lucide-react";
import { LabBillingService } from '@/lib/integrations/services/labBilling.service';
import { BillResponse } from '@/lib/integrations/types/labBilling';
import { toast } from 'react-hot-toast';

function HospitalAdminLabTransactionsPage() {
    const [bills, setBills] = useState<BillResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [selectedBill, setSelectedBill] = useState<BillResponse | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const fetchBills = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await LabBillingService.getBills(page, 10, false, startDate, endDate);
            setBills(res.bills || []);
            setTotalPages(res.totalPages || 1);
            setCurrentPage(res.currentPage || 1);
        } catch (error) {
            console.error('Failed to fetch bills:', error);
            toast.error('Failed to load transaction audit logs');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchBills(currentPage);
    }, [fetchBills, currentPage]);

    const filteredBills = useMemo(() => {
        if (!searchTerm.trim()) return bills;
        const lowSearch = searchTerm.toLowerCase();
        return bills.filter(bill =>
            bill.invoiceId?.toLowerCase().includes(lowSearch) ||
            bill.patientDetails?.name?.toLowerCase().includes(lowSearch) ||
            bill.patientDetails?.mobile?.toLowerCase().includes(lowSearch) ||
            bill.paymentMode?.toLowerCase().includes(lowSearch)
        );
    }, [bills, searchTerm]);

    const totalGlobalRevenue = useMemo(() => {
        return filteredBills.reduce((sum, bill) => sum + (bill.finalAmount || 0), 0);
    }, [filteredBills]);

    const handleExport = async () => {
        if (filteredBills.length === 0) {
            toast.error('No transaction records to export');
            return;
        }

        setIsExporting(true);
        try {
            const res = await LabBillingService.getBills(1, 2000, true, startDate, endDate);
            const allBills = res.bills || [];

            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Lab Audit');

            // --- 1. Report Titles ---
            const titleRow = worksheet.addRow(['LABORATORY TRANSACTION SUMMARY REPORT']);
            titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1F4E78' } }; 
            titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.mergeCells('A1:J1');
            titleRow.height = 30;

            const orgRow = worksheet.addRow(['Laboratory Transaction Registry']);
            orgRow.font = { name: 'Calibri', size: 12, bold: true };
            orgRow.alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.mergeCells('A2:J2');

            const periodText = `Period: ${startDate ? new Date(startDate).toLocaleDateString('en-GB') : 'Inicio'} to ${endDate ? new Date(endDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}`;
            const periodRow = worksheet.addRow([periodText]);
            periodRow.font = { name: 'Calibri', size: 11, italic: true };
            periodRow.alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.mergeCells('A3:J3');
            worksheet.addRow([]);

            // --- 2. Define Columns & Headers ---
            const headers = ['S.No', 'Date', 'Invoice ID', 'Patient Name', 'Mobile', 'Payment Mode', 'Total Amount', 'Status'];
            const headerRow = worksheet.addRow(headers);

            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
                cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF0070C0' } },
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
            let cashTotal = 0;
            let cardTotal = 0;
            let upiTotal = 0;
            let mixedTotal = 0;

            allBills.forEach((bill, index) => {
                const dateObj = new Date(bill.createdAt);
                const total = bill.finalAmount || 0;
                grandTotal += total;

                const pMode = bill.paymentMode || 'Cash';
                if (pMode.toLowerCase() === 'cash') cashTotal += total;
                else if (pMode.toLowerCase() === 'card') cardTotal += total;
                else if (pMode.toLowerCase() === 'upi') upiTotal += total;
                else mixedTotal += total;

                const row = worksheet.addRow({
                    sno: index + 1,
                    date: dateObj.toLocaleDateString('en-GB'),
                    invoiceId: bill.invoiceId,
                    patient: (bill.patientDetails?.name || 'ANONYMOUS').toUpperCase(),
                    mobile: bill.patientDetails?.mobile || '-',
                    mode: pMode.toUpperCase(),
                    total: total,
                    status: (bill.status || 'Pending').toUpperCase(),
                });

                row.eachCell((cell, colIdx) => {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FF0070C0' } },
                        left: { style: 'thin', color: { argb: 'FF0070C0' } },
                        bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
                        right: { style: 'thin', color: { argb: 'FF0070C0' } }
                    };
                    cell.font = { name: 'Calibri', size: 10 };
                    if (colIdx === 7) {
                        cell.numFmt = '₹#,##0.00';
                        cell.alignment = { horizontal: 'right' };
                        cell.font = { bold: true };
                    }
                });
            });

            worksheet.addRow([]);

            // --- 4. Footer Totals ---
            const footerRow = worksheet.addRow(['', '', '', '', '', 'TOTALS:', grandTotal, '']);
            footerRow.eachCell((cell, colIdx) => {
                if (colIdx >= 6 && colIdx <= 7) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
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

            worksheet.addRow([]);
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
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Lab_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`;
            link.click();
            window.URL.revokeObjectURL(url);
            
            toast.success('Professional Transaction Audit exported successfully');
        } catch (error) {
            console.error('Export Error:', error);
            toast.error('Financial Export Failed');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-4 bg-slate-50/50 min-h-screen p-2 sm:p-3 md:p-4">
            {/* Simple Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">Lab Transactions</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1 italic tracking-tight">Track laboratory billing and payments</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="px-5 py-2 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest leading-none">
                        System Verified
                    </div>
                </div>
            </div>

            {/* Simple Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                {[
                    { label: "Page Revenue", value: `₹${Math.round(totalGlobalRevenue).toLocaleString()}`, icon: IndianRupee, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Total Transactions", value: filteredBills.length, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
                    { label: "Average Bill Value", value: `₹${filteredBills.length > 0 ? (totalGlobalRevenue / (filteredBills.length || 1)).toFixed(0) : 0}`, icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50" }
                ].map((stat, i) => (
                    <div key={i} className={`bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md ${i === 0 ? 'col-span-2 md:col-span-1' : ''}`}>
                        <div className={`p-2.5 md:p-3 rounded-xl ${stat.bg} ${stat.color} w-fit mb-3 md:mb-4`}>
                            <stat.icon size={18} className="md:w-[20px] md:h-[20px]" strokeWidth={3} />
                        </div>
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-1">{stat.label}</p>
                        <h3 className="text-sm md:text-xl font-black text-slate-900 leading-none break-all md:break-normal">{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Simple Controller */}
            <div className="bg-white p-2 md:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by invoice ID, patient name, or mobile..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto mt-3 md:mt-0">
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/10"
                        />
                        <span className="text-slate-300 font-bold">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/10"
                        />
                    </div>

                    <button
                        onClick={() => fetchBills(1)}
                        className="p-2.5 bg-white text-slate-400 border border-slate-200 rounded-xl hover:text-slate-900 transition-all font-black"
                    >
                        <RefreshCw size={18} strokeWidth={3} className={loading ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-3 md:px-6 py-2.5 bg-primary-theme text-white rounded-xl text-[10px] font-black uppercase hover:bg-primary-theme/80 transition-all disabled:opacity-50 shadow-sm"
                    >
                        {isExporting ? <RefreshCw size={14} strokeWidth={3} className="animate-spin" /> : <FileSpreadsheet size={14} strokeWidth={3} />}
                        {isExporting ? 'Exporting...' : 'Export Data'}
                    </button>

                    {/* Pagination Controls */}
                    {bills.length > 0 && (
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div className="px-3 py-1.5 text-xs font-black text-slate-900 bg-white rounded-md min-w-[40px] text-center">
                                {currentPage}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Clean Transactions Registry */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-50 bg-slate-50/30">
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Name</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice ID</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tests / Details</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Doctor</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading && bills.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-20 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Transactions...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredBills.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-20 text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                            <CreditCard className="text-slate-200 w-8 h-8" />
                                        </div>
                                        <h3 className="text-sm md:text-lg font-black text-slate-900">No Transactions Found</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 max-w-[240px] mx-auto">
                                            No records match your current filters.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredBills.map((bill) => {
                                    const itemsText = bill.items && bill.items.length > 0 
                                        ? bill.items.map((i: any) => i.testName || i.name || 'Test').join(', ') 
                                        : 'Lab Tests';
                                    
                                    return (
                                        <tr key={bill._id || bill.invoiceId} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-2 md:px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-black text-[10px] uppercase">
                                                        {bill.patientDetails?.name ? bill.patientDetails.name.charAt(0) : 'U'}
                                                    </div>
                                                    <span className="font-thin text-slate-900 text-xs">{(bill.patientDetails?.name || 'Anonymous').toUpperCase()}</span>
                                                </div>
                                            </td>
                                            <td className="px-2 md:px-8 py-4">
                                                <div className="flex flex-col">
                                                    <span className="inline-flex items-center w-fit px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-slate-50 text-slate-600 border-slate-200">
                                                        #{bill.invoiceId}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-2 md:px-8 py-4 max-w-[200px] truncate">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate" title={itemsText}>{itemsText}</span>
                                            </td>
                                            <td className="px-2 md:px-8 py-4">
                                                <div className="space-y-1">
                                                    {bill.patientDetails?.refDoctor ? (
                                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                                            {bill.patientDetails.refDoctor}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">N/A</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 md:px-8 py-4">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    {bill.paymentMode?.toLowerCase() === 'cash' ? <IndianRupee size={12} strokeWidth={3} /> : <CreditCard size={12} strokeWidth={3} />}
                                                    {bill.paymentMode || 'CASH'}
                                                </span>
                                            </td>
                                            <td className="px-2 md:px-8 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-thin text-slate-900">
                                                        ₹{Math.round(bill.finalAmount || 0).toLocaleString()}
                                                    </span>
                                                    {(bill.finalAmount || 0) > (bill.paidAmount || 0) && (
                                                        <span className="text-[8px] font-black text-rose-600 uppercase">
                                                            Due: ₹{Math.round((bill.finalAmount || 0) - (bill.paidAmount || 0)).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 md:px-8 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-thin text-slate-900 leading-none">
                                                        {new Date(bill.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                                                        {new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-2 md:px-8 py-4 text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedBill(bill);
                                                        setShowDetailsModal(true);
                                                    }}
                                                    className="p-2 hover:bg-slate-900 hover:text-white rounded-lg text-slate-300 transition-all"
                                                >
                                                    <ArrowUpRight size={16} strokeWidth={3} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table></div>
                </div>
            </div>

            {/* Payment Details Modal */}
            {showDetailsModal && selectedBill && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4" onClick={() => setShowDetailsModal(false)}>
                    <div className="bg-white rounded-2xl p-3 md:p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-slate-900">Lab Bill Details</h3>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-all"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Name</span>
                                <span className="text-sm font-black text-slate-900">{selectedBill.patientDetails?.name || 'Anonymous'}</span>
                            </div>

                            <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Type</span>
                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-amber-50 text-amber-600 border-amber-100">
                                    LABORATORY
                                </span>
                            </div>

                            <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount</span>
                                <span className="text-sm md:text-lg font-black text-slate-900">₹{Math.round(selectedBill.finalAmount || 0).toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Paid</span>
                                <span className="text-sm md:text-lg font-black text-emerald-600">₹{Math.round(selectedBill.paidAmount || 0).toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</span>
                                <span className="text-sm font-black text-slate-900 uppercase">{selectedBill.paymentMode || 'CASH'}</span>
                            </div>

                            <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Date</span>
                                <span className="text-sm font-black text-slate-900">
                                    {new Date(selectedBill.createdAt).toLocaleDateString('en-GB', {
                                        day: '2-digit', month: 'short', year: 'numeric'
                                    })}
                                </span>
                            </div>

                            <div className="flex justify-between items-center py-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                                {(() => {
                                    const isPaid = selectedBill.status === 'Paid' || (selectedBill.finalAmount === selectedBill.paidAmount && selectedBill.finalAmount > 0);
                                    const displayStatus = isPaid ? 'Paid' : (selectedBill.status || 'Pending');
                                    const statusClasses = isPaid
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        : 'bg-amber-50 text-amber-600 border-amber-100';

                                    return (
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusClasses}`}>
                                            {displayStatus}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>
                        
                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default React.memo(HospitalAdminLabTransactionsPage);
