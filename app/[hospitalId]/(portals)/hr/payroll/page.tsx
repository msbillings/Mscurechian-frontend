"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    DollarSign,
    Download,
    Filter,
    CheckCircle,
    Clock,
    AlertCircle,
    FileText,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    X,
    Search,
    ChevronDown,
    ChevronUp,
    CreditCard,
    Banknote,
    Calendar,
    Printer,
    Edit,
    UserCheck
} from "lucide-react";
import toast from "react-hot-toast";
import { hrService } from "@/lib/integrations/services/hr.service";
import { useReactToPrint } from "react-to-print";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import { PayrollEditModal } from "./PayrollEditModal";
import { PrintablePayslip } from "./PrintablePayslip";

// Status Colors
const STATUS_CONFIG = {
    draft: { label: "Draft", color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
    processed: { label: "Processed", color: "text-blue-600", bg: "bg-blue-50", icon: CheckCircle },
    paid: { label: "Paid", color: "text-emerald-600", bg: "bg-emerald-50", icon: Banknote },
    cancelled: { label: "Cancelled", color: "text-rose-600", bg: "bg-rose-50", icon: AlertCircle },
};

export default function HRPayrollPage() {
    const router = useRouter();
    const [payrolls, setPayrolls] = useState<any[]>([]);
    const [hospital, setHospital] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Date Range States
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    });

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [editingPayroll, setEditingPayroll] = useState<any>(null);
    const [previewPayroll, setPreviewPayroll] = useState<any>(null);

    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchPayroll();
    }, [fromDate, toDate, page]);

    const fetchPayroll = async () => {
        try {
            setLoading(true);
            const res = await hrService.getPayrollList(fromDate, toDate);
            setPayrolls(res.payrolls || []);
            if (res.hospital) setHospital(res.hospital);
            setTotalPages(res.pagination?.pages || 1);
        } catch (error: any) {
            toast.error(error.message || "Failed to load payroll data");
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePayroll = async () => {
        if (!confirm(`Generate payroll records for the period ${fromDate} to ${toDate}?`)) return;

        try {
            setProcessing(true);
            await hrService.generatePayroll(fromDate, toDate);
            toast.success("Payroll records generated successfully");
            fetchPayroll();
        } catch (error: any) {
            toast.error(error.message || "Failed to generate payroll");
        } finally {
            setProcessing(false);
        }
    };

    const handleMarkAsPaid = async (id: string) => {
        try {
            // ✅ Optimistic Update for instant UI feedback
            setPayrolls(prev => prev.map(p => p._id === id ? { ...p, status: 'paid' } : p));

            await hrService.updatePayrollStatus(id, "paid");
            toast.success("Disbursement recorded successfully");
        } catch (error: any) {
            toast.error("Disbursement failed");
            // Rollback on error
            fetchPayroll();
        }
    };

    const handleUpdatePayroll = async (id: string, updatedData: any) => {
        try {
            await hrService.updatePayroll(id, updatedData);
            toast.success("Payroll record updated");
            setEditingPayroll(null);
            fetchPayroll();
        } catch (e) {
            toast.error("Update failed");
        }
    };

    const setFullPresent = async (p: any) => {
        try {
            const fullGross = (p.baseSalary || 0) + (p.totalAllowances || 0);
            const resolved = hrService.calculatePayrollResolution(fullGross);

            const updatedData = {
                ...resolved,
                presentDays: p.monthDays || 30,
                absentDays: 0,
                leaveDays: 0,
                attendanceDays: p.monthDays || 30,
                weeklyOffDays: 4
            };
            await hrService.updatePayroll(p._id, updatedData);
            toast.success(`Synchronized ${p.user?.name} to full standard resolution`);
            fetchPayroll();
        } catch (e) {
            toast.error("Operation failed");
        }
    };

    const exportToExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet(`Payroll Summary`);

            // --- 1. Report Titles ---
            const titleRow = worksheet.addRow(['HOSPITAL PAYROLL SUMMARY REPORT']);
            titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1F4E78' } };
            titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.mergeCells('A1:O1');
            titleRow.height = 30;

            const orgRow = worksheet.addRow([hospital?.name || 'Payroll Registry']);
            orgRow.font = { name: 'Calibri', size: 12, bold: true };
            orgRow.alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.mergeCells('A2:O2');

            const periodRow = worksheet.addRow([`Period: ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}`]);
            periodRow.font = { name: 'Calibri', size: 11, italic: true };
            periodRow.alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.mergeCells('A3:O3');

            worksheet.addRow([]); // Spacer

            // --- 2. Define Columns & Headers ---
            const headers = [
                'EMPLOYEE NAME', 'EMPLOYEE ID', 'ROLE', 'BASIC (₹)', 'HRA (₹)',
                'ALLOWANCES (₹)', 'GROSS EARNING (₹)', 'PROV. FUND (₹)', 'ESI (₹)',
                'IT/TDS (₹)', 'PROF. TAX (₹)', 'ADVANCE (₹)', 'TOTAL DEDUCTS (₹)',
                'NET PAYABLE (₹)', 'STATUS'
            ];
            const headerRow = worksheet.addRow(headers);

            // Style Header Row
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF1F2937' }
                };
                cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF0070C0' } },
                    left: { style: 'thin', color: { argb: 'FF0070C0' } },
                    bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
                    right: { style: 'thin', color: { argb: 'FF0070C0' } }
                };
            });

            worksheet.columns = [
                { key: 'name', width: 25 },
                { key: 'id', width: 15 },
                { key: 'role', width: 12 },
                { key: 'basic', width: 12 },
                { key: 'hra', width: 12 },
                { key: 'allowances', width: 15 },
                { key: 'gross', width: 18 },
                { key: 'pf', width: 15 },
                { key: 'esi', width: 12 },
                { key: 'tds', width: 12 },
                { key: 'ptax', width: 12 },
                { key: 'advance', width: 12 },
                { key: 'deducts', width: 18 },
                { key: 'net', width: 20 },
                { key: 'status', width: 12 }
            ];

            // --- 3. Populate Data ---
            payrolls.forEach((p) => {
                const b = p.breakdown || {};
                const totalAlw = (b.transportAllowance || 0) + (b.medicalAllowance || 0) + (b.specialAllowance || 0) + (b.bonus || 0) + (b.salaryArrears || 0);
                const gross = (b.basic || 0) + (b.hra || 0) + totalAlw;
                const totalDed = (b.pf || 0) + (b.esi || 0) + (b.professionalTax || 0) + (b.tds || 0) + (b.salaryAdvance || 0);

                const row = worksheet.addRow({
                    name: p.user?.name?.toUpperCase() || 'N/A',
                    id: p.user?.employeeId || 'N/A',
                    role: p.user?.role?.toUpperCase() || 'N/A',
                    basic: b.basic || 0,
                    hra: b.hra || 0,
                    allowances: totalAlw,
                    gross: gross,
                    pf: b.pf || 0,
                    esi: b.esi || 0,
                    tds: b.tds || 0,
                    ptax: b.professionalTax || 0,
                    advance: b.salaryAdvance || 0,
                    deducts: totalDed,
                    net: p.netSalary || (gross - totalDed),
                    status: p.status.toUpperCase()
                });

                row.eachCell((cell, colNumber) => {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FF0070C0' } },
                        left: { style: 'thin', color: { argb: 'FF0070C0' } },
                        bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
                        right: { style: 'thin', color: { argb: 'FF0070C0' } }
                    };
                    cell.font = { name: 'Calibri', size: 9 };

                    if (colNumber > 3 && colNumber < 15) {
                        cell.numFmt = '₹#,##0.00';
                        cell.alignment = { horizontal: 'right' };
                        cell.font = { name: 'Calibri', size: 9, bold: true };
                    }
                    if (colNumber === 15) {
                        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: cell.value === 'PAID' ? 'FF10B981' : 'FFF59E0B' } };
                    }
                });
            });

            // --- 4. Total Row ---
            const lastRow = worksheet.addRow([]);
            worksheet.mergeCells(`A${lastRow.number}:C${lastRow.number}`);
            const sumTitle = worksheet.getCell(`A${lastRow.number}`);
            sumTitle.value = 'GRAND TOTALS:';

            const colsToSum = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];

            sumTitle.font = { bold: true, size: 10, name: 'Calibri' };
            sumTitle.alignment = { horizontal: 'right', vertical: 'middle' };
            sumTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            sumTitle.border = {
                top: { style: 'thin', color: { argb: 'FF0070C0' } },
                left: { style: 'thin', color: { argb: 'FF0070C0' } },
                bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
                right: { style: 'thin', color: { argb: 'FF0070C0' } }
            };

            colsToSum.forEach(col => {
                const cell = worksheet.getCell(`${col}${lastRow.number}`);
                cell.value = { formula: `SUM(${col}6:${col}${lastRow.number - 1})` };
                cell.font = { bold: true, size: 10, name: 'Calibri' };
                cell.numFmt = '₹#,##0.00';
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF0070C0' } },
                    left: { style: 'thin', color: { argb: 'FF0070C0' } },
                    bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
                    right: { style: 'thin', color: { argb: 'FF0070C0' } }
                };
            });

            const statusCell = worksheet.getCell(`O${lastRow.number}`);
            statusCell.border = {
                top: { style: 'thin', color: { argb: 'FF0070C0' } },
                left: { style: 'thin', color: { argb: 'FF0070C0' } },
                bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
                right: { style: 'thin', color: { argb: 'FF0070C0' } }
            };

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `${hospital?.name || 'Hospital'}_Payroll_${fromDate}_to_${toDate}.xlsx`);
            toast.success("Professional ledger exported successfully");
        } catch (error) {
            console.error(error);
            toast.error("Excel generation failed");
        }
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: previewPayroll ? `Payslip_${previewPayroll.user?.name}` : 'Payslip',
    });

    const filteredPayrolls = useMemo(() => {
        if (!searchTerm) return payrolls;
        const lowerSearch = searchTerm.toLowerCase();
        return payrolls.filter(p =>
            p.user?.name?.toLowerCase().includes(lowerSearch) ||
            p.user?.employeeId?.toLowerCase().includes(lowerSearch)
        );
    }, [payrolls, searchTerm]);

    const stats = useMemo(() => {
        const total = payrolls.reduce((acc, p) => acc + p.netSalary, 0);
        const paid = payrolls.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.netSalary, 0);
        const pending = Math.max(0, total - paid);
        return { total, paid, pending, count: payrolls.length };
    }, [payrolls]);

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Minimalist Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payroll Management</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Staff, Nurse & Doctor Resource Registry</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all font-bold"
                    >
                        <Download size={14} strokeWidth={3} /> Export Ledger
                    </button>
                    <button
                        onClick={handleGeneratePayroll}
                        disabled={processing}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm active:scale-95 disabled:opacity-50 font-bold"
                    >
                        <RefreshCw size={14} className={processing ? "animate-spin" : ""} strokeWidth={3} /> Process Monthly Cycle
                    </button>
                </div>
            </div>

            {/* Simple Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Personnel Count', value: stats.count, color: 'text-blue-600', bg: 'bg-blue-50', icon: UserCheck, sub: 'Total Records' },
                    { label: 'Total Liability', value: stats.total, color: 'text-slate-600', bg: 'bg-slate-50', icon: DollarSign, sub: 'Gross Net' },
                    { label: 'Settled Amount', value: stats.paid, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle, sub: 'Disbursed' },
                    { label: 'Pending Payout', value: stats.pending, color: 'text-rose-600', bg: 'bg-rose-50', icon: Clock, sub: 'Unpaid' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 transition-all hover:shadow-md">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                            <h3 className={`text-xl font-black ${stat.color.includes('emerald') ? 'text-emerald-700' : stat.color.includes('rose') ? 'text-rose-700' : 'text-slate-900'}`}>
                                {typeof stat.value === 'number' && stat.label.includes('Liability') || stat.label.includes('Amount') || stat.label.includes('Payout') ? `₹${stat.value.toLocaleString()}` : stat.value}
                            </h3>
                            <p className="text-[8px] font-black text-slate-300 uppercase mt-1">{stat.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Unified Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
                <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search Staff, ID, or Role..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-500/10 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto border-l border-slate-100 pl-6">
                    <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Cycle Period</span>
                        <div className="flex items-center gap-2">
                            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black uppercase outline-none" />
                            <span className="text-slate-300 font-bold text-xs">to</span>
                            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black uppercase outline-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Clean Registry Ledger */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Resource Entity</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Cycle Period</th>
                                <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Attendance</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Net Payable (₹)</th>
                                <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="py-4 px-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Registry Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-black">
                            {loading && payrolls.length === 0 ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="py-8 px-6">
                                            <div className="h-12 bg-slate-50 rounded-xl w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredPayrolls.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                                <DollarSign size={40} />
                                            </div>
                                            <p className="text-sm font-bold text-slate-400 italic">No personnel manifests detected for this selected range.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredPayrolls.map((p) => (
                                    <tr key={p._id} className={`hover:bg-slate-50/50 transition-all group ${p.isVirtual ? 'bg-slate-50/10' : ''}`}>
                                        <td className="py-5 px-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all ${p.isVirtual ? 'bg-indigo-600 text-slate-300' : 'bg-indigo-600 text-white group-hover:bg-indigo-700'}`}>
                                                    {p.user?.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 leading-none">{p.user?.name}</p>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.user?.employeeId || "HMS_ID_PENDING"}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shadow-xs border ${p.user?.role === 'doctor' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                            {p.user?.role}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-black text-slate-900 leading-none">{new Date(p.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                                <span className="text-[9px] font-bold text-slate-300 uppercase leading-none">to {new Date(p.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex items-center justify-center gap-1.5 font-black">
                                                <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] border border-emerald-100/50" title="Present">{p.presentDays}P</div>
                                                <div className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] border border-amber-100/50" title="Leaves">{p.leaveDays}L</div>
                                                <div className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[9px] border border-rose-100/50" title="Absent">{p.absentDays}A</div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900 italic">₹{p.netSalary?.toLocaleString()}</span>
                                                {p.isVirtual && <span className="text-[8px] text-slate-300 uppercase font-black tracking-tighter">Draft Amount</span>}
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            {(() => {
                                                if (p.isVirtual) {
                                                    return (
                                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-300 border border-slate-100 italic">
                                                            Unscheduled
                                                        </div>
                                                    );
                                                }
                                                const config = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
                                                return (
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${config.bg} ${config.color} border border-current/10 shadow-sm`}>
                                                        {config.label}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="py-5 px-6 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {!p.isVirtual ? (
                                                    <>
                                                        <button
                                                            onClick={() => setFullPresent(p)}
                                                            title="Synchronize to Full Present"
                                                            className="p-2 text-slate-400 hover:text-emerald-600 transition-all font-black hover:bg-emerald-50 rounded-lg"
                                                        >
                                                            <UserCheck size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingPayroll(p)}
                                                            title="Audit Calculation"
                                                            className="p-2 text-slate-400 hover:text-blue-600 transition-all font-black hover:bg-blue-50 rounded-lg"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => router.push(`payroll/resolution/${p._id}`)}
                                                            title="View Proper Print Model"
                                                            className="p-2 text-slate-400 hover:text-slate-900 transition-all font-black hover:bg-slate-100 rounded-lg"
                                                        >
                                                            <Printer size={16} />
                                                        </button>
                                                        {p.status !== 'paid' ? (
                                                            <button
                                                                onClick={() => handleMarkAsPaid(p._id)}
                                                                className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
                                                            >
                                                                Settle
                                                            </button>
                                                        ) : (
                                                            <div className="ml-2 w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100/50 animate-in zoom-in duration-300">
                                                                <CheckCircle size={14} strokeWidth={3} />
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={handleGeneratePayroll}
                                                        className="px-4 py-2 bg-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                                    >
                                                        Process Entry
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Layer {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase disabled:opacity-30">Prev</button>
                            <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase active:scale-95 disabled:opacity-30">Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden Print Target */}
            <div className="hidden">
                <div ref={printRef}>
                    {previewPayroll && (
                        <PrintablePayslip
                            payroll={previewPayroll}
                            hospital={hospital}
                        />
                    )}
                </div>
            </div>

            {/* Modals */}
            {editingPayroll && (
                <PayrollEditModal
                    payroll={editingPayroll}
                    onClose={() => setEditingPayroll(null)}
                    onSave={(data: any) => handleUpdatePayroll(editingPayroll._id, data)}
                />
            )}
        </div>
    );
}
