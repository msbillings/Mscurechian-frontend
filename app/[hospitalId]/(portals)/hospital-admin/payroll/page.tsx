"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    DollarSign,
    Download,
    CheckCircle,
    Clock,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Search,
    CreditCard,
    Banknote,
    Calendar,
    Printer,
    Edit,
    UserCheck,
    Users,
    CalendarDays,
    TrendingUp,
    Briefcase,
    X,
    ChevronDown,
    Loader2,
    FileText,
    Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { hospitalAdminService } from "@/lib/integrations";
import { useReactToPrint } from "react-to-print";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import { PayrollEditModal } from "./PayrollEditModal";
import { PrintablePayslip } from "./PrintablePayslip";

// ─── Status Config ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    draft: { label: "Draft", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: Clock },
    processed: { label: "Processed", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: CheckCircle },
    paid: { label: "Paid", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: Banknote },
    cancelled: { label: "Cancelled", color: "text-rose-600", bg: "bg-rose-50 border-rose-200", icon: AlertCircle },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color, icon: Icon, large = false }: any) => (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3 ${large ? 'col-span-2' : ''}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.bg} ${color.text}`}>
            <Icon size={18} />
        </div>
        <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <h3 className={`text-xl font-black ${color.text}`}>{value}</h3>
            {sub && <p className="text-[8px] font-black text-slate-300 uppercase mt-1">{sub}</p>}
        </div>
    </div>
);

// ─── Attendance Badge ─────────────────────────────────────────────────────────
const AttBadge = ({ count, label, color }: { count: number; label: string; color: string }) => (
    <div className={`flex flex-col items-center p-4 rounded-2xl border ${color}`}>
        <span className="text-2xl font-black">{count}</span>
        <span className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-70">{label}</span>
    </div>
);

export default function PayrollPage() {
    const { hospitalId } = useParams();
    const router = useRouter();

    // ── Period State ─────────────────────────────────────────────────────────
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    });

    // ── Employee State ───────────────────────────────────────────────────────
    const [allEmployees, setAllEmployees] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [empSearch, setEmpSearch] = useState("");
    const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
    const empDropdownRef = useRef<HTMLDivElement>(null);

    // ── Stats State ──────────────────────────────────────────────────────────
    const [empStats, setEmpStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // ── Payroll List State ───────────────────────────────────────────────────
    const [payrolls, setPayrolls] = useState<any[]>([]);
    const [hospital, setHospital] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [editingPayroll, setEditingPayroll] = useState<any>(null);
    const [previewPayroll, setPreviewPayroll] = useState<any>(null);

    const printRef = useRef<HTMLDivElement>(null);

    // ── Tab State ────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'overview' | 'employee'>('overview');

    // ── Fetch All Employees ──────────────────────────────────────────────────
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const [doctorsRes, staffRes, nursesRes] = await Promise.allSettled([
                    hospitalAdminService.getDoctors(),
                    hospitalAdminService.getStaff(),
                    hospitalAdminService.getNurses(),
                ]);

                const doctors = (doctorsRes.status === 'fulfilled' ? (doctorsRes.value as any)?.doctors || [] : []).map((d: any) => ({ ...d, role: 'doctor' }));
                const staff = (staffRes.status === 'fulfilled' ? (staffRes.value as any)?.staff || [] : []).map((s: any) => ({ ...s, role: s.role || 'staff' }));
                const nurses = (nursesRes.status === 'fulfilled' ? (nursesRes.value as any)?.nurses || [] : []).map((n: any) => ({ ...n, role: n.role || 'nurse' }));

                const combined = [...doctors, ...staff, ...nurses];
                const unique = Array.from(new Map(combined.map(item => [item._id, item])).values());
                setAllEmployees(unique);
            } catch (e) {
                console.error("Failed to load employees", e);
            }
        };
        fetchEmployees();
    }, []);

    // ── Fetch Payroll List ───────────────────────────────────────────────────
    useEffect(() => {
        fetchPayroll();
    }, [fromDate, toDate, page]);

    const fetchPayroll = async () => {
        try {
            setLoading(true);
            const res = await hospitalAdminService.getPayroll(fromDate, toDate);
            setPayrolls(res.payrolls || []);
            if (res.hospital) setHospital(res.hospital);
            setTotalPages(res.pagination?.pages || 1);
        } catch (error: any) {
            toast.error(error.message || "Failed to load payroll data");
        } finally {
            setLoading(false);
        }
    };

    // ── Fetch Employee Stats ─────────────────────────────────────────────────
    const fetchEmployeeStats = useCallback(async () => {
        if (!selectedEmployee || !fromDate || !toDate) return;
        try {
            setLoadingStats(true);
            setEmpStats(null);
            const userId = selectedEmployee._id;
            const res = await hospitalAdminService.getEmployeePayrollStats(userId, fromDate, toDate);
            setEmpStats(res);
        } catch (error: any) {
            toast.error(error.message || "Failed to load employee stats");
        } finally {
            setLoadingStats(false);
        }
    }, [selectedEmployee, fromDate, toDate]);

    useEffect(() => {
        if (selectedEmployee) {
            fetchEmployeeStats();
        }
    }, [selectedEmployee, fromDate, toDate]);

    // ── Click Outside Dropdown ───────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (empDropdownRef.current && !empDropdownRef.current.contains(e.target as Node)) {
                setEmpDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── Actions ──────────────────────────────────────────────────────────────
    const handleGeneratePayroll = async () => {
        if (!confirm(`Generate payroll records for ALL staff for the period ${fromDate} to ${toDate}?`)) return;
        try {
            setProcessing(true);
            await hospitalAdminService.generatePayroll(fromDate, toDate);
            toast.success("Payroll records generated successfully");
            fetchPayroll();
            if (selectedEmployee) fetchEmployeeStats();
        } catch (error: any) {
            toast.error(error.message || "Failed to generate payroll");
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateForEmployee = async () => {
        if (!selectedEmployee) return;
        if (!confirm(`Generate payroll for ${selectedEmployee.name} for ${fromDate} to ${toDate}?`)) return;
        try {
            setProcessing(true);
            await hospitalAdminService.generatePayroll(fromDate, toDate, selectedEmployee._id);
            toast.success(`Payroll generated for ${selectedEmployee.name}`);
            fetchPayroll();
            fetchEmployeeStats();
        } catch (error: any) {
            toast.error(error.message || "Failed to generate payroll");
        } finally {
            setProcessing(false);
        }
    };

    const handleMarkAsPaid = async (id: string) => {
        try {
            setPayrolls(prev => prev.map(p => p._id === id ? { ...p, status: 'paid' } : p));
            await hospitalAdminService.updatePayrollStatus(id, "paid");
            toast.success("Payment recorded successfully");
            if (selectedEmployee) fetchEmployeeStats();
        } catch (error: any) {
            toast.error("Payment recording failed");
            fetchPayroll();
        }
    };

    const handleUpdatePayroll = async (id: string, updatedData: any) => {
        try {
            await hospitalAdminService.updatePayroll(id, updatedData);
            toast.success("Payroll record updated");
            setEditingPayroll(null);
            fetchPayroll();
            if (selectedEmployee) fetchEmployeeStats();
        } catch (e) {
            toast.error("Update failed");
        }
    };
    const handleDeletePayroll = async (id: string) => {
        if (!confirm("Are you sure you want to delete this payroll record? This action cannot be undone.")) return;
        try {
            await hospitalAdminService.deletePayroll(id);
            toast.success("Payroll record deleted");
            fetchPayroll();
            if (selectedEmployee) fetchEmployeeStats();
        } catch (e) {
            toast.error("Delete failed");
        }
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: previewPayroll ? `Payslip_${previewPayroll.user?.name}` : 'Payslip',
    });

    // ── Filtered List ────────────────────────────────────────────────────────
    const filteredPayrolls = useMemo(() => {
        let list = payrolls;
        if (searchTerm) {
            const lw = searchTerm.toLowerCase();
            list = list.filter(p =>
                p.user?.name?.toLowerCase().includes(lw) ||
                p.user?.employeeId?.toLowerCase().includes(lw) ||
                p.user?.role?.toLowerCase().includes(lw)
            );
        }
        return list;
    }, [payrolls, searchTerm]);

    const globalStats = useMemo(() => {
        const total = payrolls.reduce((acc, p) => acc + (p.netSalary || 0), 0);
        const paid = payrolls.filter(p => p.status === 'paid').reduce((acc, p) => acc + (p.netSalary || 0), 0);
        const pending = Math.max(0, total - paid);
        return { total, paid, pending, count: payrolls.length };
    }, [payrolls]);

    // ── Employee Dropdown ────────────────────────────────────────────────────
    const filteredEmployees = useMemo(() => {
        if (!empSearch) return allEmployees;
        const lw = empSearch.toLowerCase();
        return allEmployees.filter(e =>
            e.name?.toLowerCase().includes(lw) ||
            e.email?.toLowerCase().includes(lw) ||
            e.role?.toLowerCase().includes(lw) ||
            e.employeeId?.toLowerCase().includes(lw)
        );
    }, [allEmployees, empSearch]);

    // ── Quick Month Presets ──────────────────────────────────────────────────
    const setMonthPreset = (offset: number) => {
        const d = new Date();
        const target = new Date(d.getFullYear(), d.getMonth() + offset, 1);
        const from = new Date(target.getFullYear(), target.getMonth(), 1).toISOString().split('T')[0];
        const to = new Date(target.getFullYear(), target.getMonth() + 1, 0).toISOString().split('T')[0];
        setFromDate(from);
        setToDate(to);
    };

    const monthLabel = (offset: number) => {
        const d = new Date();
        const target = new Date(d.getFullYear(), d.getMonth() + offset, 1);
        return target.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payroll Management</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">HR & Salary Disbursement System</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleGeneratePayroll}
                        disabled={processing}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-theme text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        {processing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} strokeWidth={3} />}
                        Process All Staff
                    </button>
                </div>
            </div>

            {/* ── Period Selector ─────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                    <div className="flex items-center gap-2">
                        <CalendarDays size={16} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pay Period</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[-2, -1, 0].map(offset => (
                            <button
                                key={offset}
                                onClick={() => setMonthPreset(offset)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${new Date(fromDate).getMonth() === new Date(new Date().getFullYear(), new Date().getMonth() + offset, 1).getMonth()
                                    ? 'bg-primary-theme text-white border-primary-theme'
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400'
                                    }`}
                            >
                                {monthLabel(offset)}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <input
                            type="date"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-primary-theme/20"
                        />
                        <span className="text-slate-300 font-bold text-xs">→</span>
                        <input
                            type="date"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-primary-theme/20"
                        />
                    </div>
                </div>
            </div>

            {/* ── Tab Bar ─────────────────────────────────────────────────── */}
            <div className="flex gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit">
                {[
                    { key: 'overview', label: 'All Staff Overview', icon: Users },
                    { key: 'employee', label: 'Employee Payroll', icon: UserCheck },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.key
                            ? 'bg-primary-theme text-white shadow-sm'
                            : 'text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <tab.icon size={13} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ════════════════════════════════════════════════════════════════
                TAB 1: ALL STAFF OVERVIEW
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
                <div className="space-y-6">

                    {/* Global Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Total Staff" value={globalStats.count} sub="Payroll Records" color={{ bg: 'bg-blue-50', text: 'text-blue-600' }} icon={Users} />
                        <StatCard label="Total Liability" value={`₹${globalStats.total.toLocaleString()}`} sub="Gross Net Payable" color={{ bg: 'bg-slate-100', text: 'text-slate-700' }} icon={DollarSign} />
                        <StatCard label="Settled Amount" value={`₹${globalStats.paid.toLocaleString()}`} sub="Disbursed" color={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }} icon={CheckCircle} />
                        <StatCard label="Pending Payout" value={`₹${globalStats.pending.toLocaleString()}`} sub="Unpaid" color={{ bg: 'bg-rose-50', text: 'text-rose-600' }} icon={Clock} />
                    </div>

                    {/* Search & Table Header */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search staff, employee ID or role..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-500/10 outline-none"
                                />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                {filteredPayrolls.length} records
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Employee</th>
                                        <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Period</th>
                                        <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Work Cycle</th>
                                        <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Attendance</th>
                                        <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Monthly Salary</th>
                                        <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Net Payable</th>
                                        <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                        <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading && filteredPayrolls.length === 0 ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={8} className="py-5 px-6">
                                                    <div className="h-10 bg-slate-50 rounded-xl w-full" />
                                                </td>
                                            </tr>
                                        ))
                                    ) : filteredPayrolls.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-24 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                                        <DollarSign size={40} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-400">No payroll records found</p>
                                                        <p className="text-[10px] text-slate-300 mt-1">Click "Process All Staff" to generate payroll for this period</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPayrolls.map(p => (
                                            <tr key={p._id} className="hover:bg-slate-50/70 transition-all group">
                                                {/* Employee */}
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-primary-theme/10 text-primary-theme flex items-center justify-center font-black text-xs">
                                                            {p.user?.name?.charAt(0) || '?'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900">{p.user?.name || 'Unknown'}</p>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase">{p.user?.employeeId || 'NO-ID'}</span>
                                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${p.user?.role === 'doctor' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{p.user?.role}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Period */}
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-700">{new Date(p.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                                        <span className="text-[9px] font-black text-slate-400">to {new Date(p.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                                                    </div>
                                                </td>

                                                {/* Working Days */}
                                                <td className="py-4 px-6 text-center">
                                                    <span className="text-sm font-black text-slate-700">{(p.monthDays || 30) - (p.weeklyOffDays || 0)}/{p.monthDays || 30}</span>
                                                    <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-tighter">Working Days</span>
                                                </td>

                                                {/* Attendance */}
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black border border-emerald-100" title="Present">{p.presentDays}P</span>
                                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-black border border-amber-100" title="Paid Leave">{p.leaveDays}L</span>
                                                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[9px] font-black border border-rose-100" title="Absent">{p.absentDays}A</span>
                                                    </div>
                                                </td>

                                                {/* Monthly Salary */}
                                                <td className="py-4 px-6">
                                                    <span className="text-sm font-bold text-slate-600">₹{(p.baseSalary || 0).toLocaleString()}</span>
                                                </td>

                                                {/* Net Payable */}
                                                <td className="py-4 px-6">
                                                    <span className="text-sm font-black text-slate-900">
                                                        ₹{(p.isVirtual 
                                                            ? (p.baseSalary + (p.totalAllowances || 0) - (p.totalDeductions || 0)) 
                                                            : (p.netSalary || 0)).toLocaleString()}
                                                    </span>
                                                    {p.isVirtual && <span className="text-[8px] text-slate-300 uppercase font-black block">Draft</span>}
                                                </td>

                                                {/* Status */}
                                                <td className="py-4 px-6 text-center">
                                                    {p.isVirtual ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 border border-slate-200 italic">Unprocessed</span>
                                                    ) : (() => {
                                                        const cfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
                                                        return (
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.color}`}>
                                                                {cfg.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {!p.isVirtual ? (
                                                            <>
                                                                <button onClick={() => setEditingPayroll(p)} title="Edit" className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                                                    <Edit size={15} />
                                                                </button>
                                                                <button onClick={() => router.push(`/${hospitalId}/hospital-admin/payroll/resolution/${p._id}`)} title="Print Payslip" className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
                                                                    <Printer size={15} />
                                                                </button>
                                                                <button onClick={() => handleDeletePayroll(p._id)} title="Delete" className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                                                                    <Trash2 size={15} />
                                                                </button>
                                                                {p.status !== 'paid' ? (
                                                                    <button onClick={() => handleMarkAsPaid(p._id)} className="ml-1 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm active:scale-95">
                                                                        Settle
                                                                    </button>
                                                                ) : (
                                                                    <div className="ml-1 w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                                                                        <CheckCircle size={14} strokeWidth={3} />
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <button onClick={handleGeneratePayroll} className="px-4 py-1.5 bg-slate-100 text-slate-500 hover:bg-primary-theme hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95">
                                                                Process
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

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {page} of {totalPages}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase disabled:opacity-30 hover:bg-slate-50 transition-all">
                                        <ChevronLeft size={14} />
                                    </button>
                                    <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase active:scale-95 disabled:opacity-30 hover:bg-slate-800 transition-all">
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 2: EMPLOYEE PAYROLL VIEW
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'employee' && (
                <div className="space-y-6">

                    {/* Employee Selector */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Select Employee</p>
                        <div className="relative" ref={empDropdownRef}>
                            <button
                                onClick={() => setEmpDropdownOpen(o => !o)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-slate-400 transition-all"
                            >
                                {selectedEmployee ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary-theme/10 text-primary-theme flex items-center justify-center font-black text-xs">
                                            {selectedEmployee.name?.charAt(0)}
                                        </div>
                                        <div className="text-left">
                                            <span className="font-black text-slate-900">{selectedEmployee.name}</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase block">{selectedEmployee.role} · {selectedEmployee.employeeId || 'NO-ID'}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-slate-400 font-medium">Click to select an employee...</span>
                                )}
                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${empDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {empDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                                    <div className="p-3 border-b border-slate-100">
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Search by name, role or ID..."
                                                value={empSearch}
                                                onChange={e => setEmpSearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-theme/20"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {filteredEmployees.length === 0 ? (
                                            <div className="py-8 text-center text-sm text-slate-400">No employees found</div>
                                        ) : (
                                            filteredEmployees.map(emp => (
                                                <button
                                                    key={emp._id}
                                                    onClick={() => {
                                                        setSelectedEmployee(emp);
                                                        setEmpDropdownOpen(false);
                                                        setEmpSearch("");
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-all text-left ${selectedEmployee?._id === emp._id ? 'bg-primary-theme/5' : ''}`}
                                                >
                                                    <div className="w-9 h-9 rounded-xl bg-primary-theme/10 text-primary-theme flex items-center justify-center font-black text-xs shrink-0">
                                                        {emp.name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{emp.name}</p>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase">{emp.role} · {emp.employeeId || emp.email || 'No ID'}</p>
                                                    </div>
                                                    {selectedEmployee?._id === emp._id && (
                                                        <CheckCircle size={16} className="text-primary-theme ml-auto" />
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Empty State */}
                    {!selectedEmployee && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-24 flex flex-col items-center gap-4">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                                <UserCheck size={36} className="text-slate-300" />
                            </div>
                            <div className="text-center">
                                <p className="text-slate-500 font-bold text-sm">Select an employee to view their payroll</p>
                                <p className="text-slate-300 text-[11px] mt-1">Attendance logs will be fetched automatically for the selected period</p>
                            </div>
                        </div>
                    )}

                    {/* Loading Stats */}
                    {selectedEmployee && loadingStats && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-20 flex flex-col items-center gap-4">
                            <Loader2 size={32} className="animate-spin text-primary-theme" />
                            <p className="text-slate-400 font-bold text-sm">Loading attendance data for {selectedEmployee.name}...</p>
                        </div>
                    )}

                    {/* Employee Stats Dashboard */}
                    {selectedEmployee && !loadingStats && empStats && (
                        <div className="space-y-5">

                            {/* Employee Info Banner */}
                            <div className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center font-black text-xl">
                                        {empStats.employee?.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black">{empStats.employee?.name}</h2>
                                        <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">
                                            {empStats.employee?.designation || empStats.employee?.role} · {empStats.employee?.department || 'General'}
                                        </p>
                                        <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mt-0.5">
                                            {empStats.employee?.employeeId || 'ID Pending'} · {empStats.employee?.role?.toUpperCase()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-white/50 text-[9px] font-black uppercase tracking-widest mb-1">Pay Period</p>
                                    <p className="text-white font-black">
                                        {new Date(empStats.period?.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                    <p className="text-white/60 text-xs font-bold">
                                        to {new Date(empStats.period?.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>

                            {/* Attendance Stats Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Days</p>
                                    <p className="text-3xl font-black text-slate-900">{empStats.attendance?.totalDays}</p>
                                    <p className="text-[9px] font-black text-slate-400 mt-1">In Period</p>
                                </div>
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Working Days</p>
                                    <p className="text-3xl font-black text-slate-700">{empStats.attendance?.workingDays}</p>
                                    <p className="text-[9px] font-black text-slate-400 mt-1">Excl. Offs</p>
                                </div>
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm p-4 text-center">
                                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-2">Present</p>
                                    <p className="text-3xl font-black text-emerald-700">{empStats.attendance?.presentDays}</p>
                                    <p className="text-[9px] font-black text-emerald-500 mt-1">Days Present</p>
                                </div>
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm p-4 text-center">
                                    <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-2">Paid Leave</p>
                                    <p className="text-3xl font-black text-amber-700">{empStats.attendance?.paidLeaveDays}</p>
                                    <p className="text-[9px] font-black text-amber-500 mt-1">Approved</p>
                                </div>
                                <div className="rounded-2xl border border-rose-200 bg-rose-50 shadow-sm p-4 text-center">
                                    <p className="text-[8px] font-black text-rose-600 uppercase tracking-widest mb-2">Absent</p>
                                    <p className="text-3xl font-black text-rose-700">{empStats.attendance?.absentDays}</p>
                                    <p className="text-[9px] font-black text-rose-500 mt-1">Unauthorized</p>
                                </div>
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Weekly Off</p>
                                    <p className="text-3xl font-black text-slate-500">{empStats.attendance?.weeklyOffDays}</p>
                                    <p className="text-[9px] font-black text-slate-400 mt-1">Days Off</p>
                                </div>
                            </div>

                            {/* Salary Breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                {/* Salary Calculation */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                                        <TrendingUp size={13} /> Salary Computation
                                    </p>
                                    <div className="space-y-3">
                                        {[
                                            { label: 'Monthly Base Salary', value: `₹${(empStats.salary?.monthlySalary || 0).toLocaleString()}`, highlight: false },
                                            { label: 'Custom Allowances', value: `₹${(empStats.salary?.customAllowances || 0).toLocaleString()}`, highlight: false, color: 'text-emerald-600' },
                                            { label: 'Custom Deductions', value: `₹${(empStats.salary?.customDeductions || 0).toLocaleString()}`, highlight: false, color: 'text-rose-600' },
                                            { label: 'Per Day Rate', value: `₹${(empStats.salary?.dayRate || 0).toLocaleString()}`, highlight: false },
                                            { label: 'Earned Days (Incl. Offs)', value: `${empStats.salary?.earnedDays} days`, highlight: false },
                                            { label: 'Absence Penalty', value: `₹${(empStats.salary?.absencePenalty || 0).toLocaleString()}`, highlight: true, color: 'text-rose-600' },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-50">
                                                <span className="text-[11px] font-bold text-slate-600">{item.label}</span>
                                                <span className={`text-sm font-black ${item.color || (item.highlight ? 'text-primary-theme' : 'text-slate-800')}`}>{item.value}</span>
                                            </div>
                                        ))}
                                        <div className="flex items-center justify-between py-3 bg-emerald-50 px-4 rounded-xl mt-2">
                                            <span className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">Net Payable Salary</span>
                                            <span className="text-xl font-black text-emerald-700">₹{(empStats.salary?.netPayable || 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Attendance Timeline */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Calendar size={13} /> Attendance Log ({empStats.attendance?.attendanceRecords?.length || 0} entries)
                                    </p>
                                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                        {(empStats.attendance?.attendanceRecords || []).length === 0 ? (
                                            <div className="py-8 text-center text-slate-300">
                                                <Calendar size={28} className="mx-auto mb-2" />
                                                <p className="text-[11px] font-black uppercase">No attendance records found</p>
                                            </div>
                                        ) : (
                                            empStats.attendance.attendanceRecords.map((rec: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                                                    <span className="text-[10px] font-black text-slate-600">
                                                        {new Date(rec.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        {rec.checkIn && <span className="text-[9px] font-bold text-slate-400">{new Date(rec.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${rec.status === 'present' ? 'bg-emerald-100 text-emerald-700' : rec.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                                            {rec.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Existing Payroll Record or Generate */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <FileText size={13} /> Payroll Record Status
                                    </p>
                                    <div className="flex gap-2">
                                        {empStats.existingPayroll ? (
                                            <>
                                                <button
                                                    onClick={() => setEditingPayroll(empStats.existingPayroll)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                                >
                                                    <Edit size={13} /> Edit Record
                                                </button>
                                                <button
                                                    onClick={() => router.push(`/${hospitalId}/hospital-admin/payroll/resolution/${empStats.existingPayroll._id}`)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                                >
                                                    <Printer size={13} /> Print Payslip
                                                </button>
                                                {empStats.existingPayroll.status !== 'paid' && (
                                                    <button
                                                        onClick={() => handleMarkAsPaid(empStats.existingPayroll._id)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm"
                                                    >
                                                        <CheckCircle size={13} /> Mark as Paid
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <button
                                                onClick={handleGenerateForEmployee}
                                                disabled={processing}
                                                className="flex items-center gap-2 px-5 py-2 bg-primary-theme text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                            >
                                                {processing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                                                Generate Payroll
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {empStats.existingPayroll ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Status', value: (() => { const c = STATUS_CONFIG[empStats.existingPayroll.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft; return <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${c.bg} ${c.color}`}>{c.label}</span>; })() },
                                            { label: 'Base Salary', value: `₹${(empStats.existingPayroll.baseSalary || 0).toLocaleString()}` },
                                            { label: 'Net Payable', value: `₹${(empStats.existingPayroll.netSalary || 0).toLocaleString()}`, highlight: true },
                                            { label: 'Payment Date', value: empStats.existingPayroll.paymentDate ? new Date(empStats.existingPayroll.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not paid yet' },
                                        ].map((item, i) => (
                                            <div key={i} className="bg-slate-50 rounded-xl p-4">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
                                                {typeof item.value === 'string' ? (
                                                    <p className={`text-base font-black ${(item as any).highlight ? 'text-emerald-700' : 'text-slate-800'}`}>{item.value}</p>
                                                ) : item.value}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-10 flex flex-col items-center gap-3 text-center">
                                        <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center">
                                            <FileText size={24} className="text-slate-300" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-500">No payroll record exists for this period</p>
                                            <p className="text-[11px] text-slate-400 mt-1">Click "Generate Payroll" to create a payroll entry based on the attendance statistics above</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Hidden Print Target ──────────────────────────────────────── */}
            <div className="hidden">
                <div ref={printRef}>
                    {previewPayroll && <PrintablePayslip payroll={previewPayroll} hospital={hospital} />}
                </div>
            </div>

            {/* ── Edit Modal ───────────────────────────────────────────────── */}
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
