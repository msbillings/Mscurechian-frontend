"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
   Clock, Search, Filter, User as UserIcon, ArrowRight,
   ChevronLeft, ChevronRight, TrendingUp, UserCheck, UserX, Clock8,
   CalendarDays, RefreshCw, MapPin, Monitor, ShieldCheck,
   Hospital, FileText, FileSpreadsheet, ChevronDown, CalendarRange, X, Printer
} from 'lucide-react';
import { useHRAttendance } from '@/lib/integrations/hooks';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { hospitalAdminService, hrService } from '@/lib/integrations';
import { renderToStaticMarkup } from 'react-dom/server';
import MainHeader from '@/components/printers/MainHeader';
import MainFooter from '@/components/printers/MainFooter';
import { AttendancePDFPreview } from '../../hospital-admin/attendance/AttendancePDFPreview';
import type { AttendancePDFRow, AttendanceSummaryPDFRow } from '../../hospital-admin/attendance/AttendancePDFPreview';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
   present: { label: 'Present', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: UserCheck },
   late: { label: 'Late Arrival', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: Clock8 },
   absent: { label: 'Absent', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', icon: UserX },
   'on-leave': { label: 'On Leave', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: CalendarDays },
   'off-duty': { label: 'Off Duty', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-100', icon: Hospital },
};

const ITEMS_PER_PAGE = 10;

// ── Status colour map for PDF ──
const STATUS_COLORS_PDF: Record<string, string> = {
   present: '#16a34a', late: '#d97706', absent: '#dc2626',
   'on-leave': '#2563eb', 'off-duty': '#6b7280',
};

export default function AttendancePage() {
   const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
   const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
   const [page, setPage] = useState(1);
   const [filterRole, setFilterRole] = useState('all');
   const [filterStatus, setFilterStatus] = useState('all');
   const [searchTerm, setSearchTerm] = useState('');
   const [debouncedSearch, setDebouncedSearch] = useState('');

   // ── Report menu state ──
   const [showExportMenu, setShowExportMenu] = useState(false);
   const [showDateRangePicker, setShowDateRangePicker] = useState(false);
   const [customRange, setCustomRange] = useState({
      from: format(new Date(Date.now() - 7 * 86400000), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd')
   });

   // ── PDF Preview state ──
   const [pdfPreview, setPdfPreview] = useState<{
      open: boolean;
      reportType: string;
      period: string;
      reportLabel: string;
      rows: AttendancePDFRow[] | AttendanceSummaryPDFRow[];
      isSummary: boolean;
   } | null>(null);

   const [summary, setSummary] = useState<any[]>([]);
   const [loading, setLoading] = useState(false);
   const iframeRef = useRef<HTMLIFrameElement>(null);

   // ── Hospital info ──
   const [hospital, setHospital] = useState<any>({ name: '' });
   useEffect(() => {
      hospitalAdminService.getHospital().then(r => { if (r?.hospital) setHospital(r.hospital); }).catch(() => { });
      hospitalAdminService.getAttendanceSummary().then(r => { if (r?.summary) setSummary(r.summary); }).catch(() => { });
   }, []);

   // Add debounce effect
   useEffect(() => {
      const handler = setTimeout(() => {
         setDebouncedSearch(searchTerm);
      }, 500);
      return () => clearTimeout(handler);
   }, [searchTerm]);

   const { data: attendanceResponse, isLoading, refetch, isRefetching } = useHRAttendance({
      ...(startDate === endDate ? { date: startDate } : { startDate, endDate }),
      page,
      limit: ITEMS_PER_PAGE,
      role: filterRole,
      status: filterStatus,
      search: debouncedSearch
   });

   const logs = attendanceResponse?.attendance || attendanceResponse?.data || [];
   const stats = attendanceResponse?.stats || { total: 0, present: 0, late: 0, absent: 0, onLeave: 0 };
   const pagination = attendanceResponse?.pagination;

   // ── Build PDF print rows (Robust) ──
   const buildPDFRows = (data: any[]): AttendancePDFRow[] => data.map((log: any) => {
      const getRawTime = (val: any) => val?.time || val;
      const tIn = getRawTime(log.checkIn);
      const tOut = getRawTime(log.checkOut);

      const formatTime = (raw: any) => {
         if (!raw) return '--:--';
         const d = new Date(raw);
         return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      };

      const dur = tIn && tOut ? (() => {
         const d = new Date(tOut).getTime() - new Date(tIn).getTime();
         return isNaN(d) ? '--' : `${Math.floor(d / 3600000)}h ${Math.floor((d / 60000) % 60)}m`;
      })() : '--';

      const userData = log.user || log.staff?.user || {};

      return {
         name: userData.name || 'Unknown',
         designation: userData.role?.replace('-', ' ') || log.staff?.designation || 'Staff',
         employeeId: userData.employeeId || log.staff?.employeeId || 'N/A',
         date: log.date ? new Date(log.date).toLocaleDateString('en-GB') : '-',
         checkIn: formatTime(tIn),
         checkOut: formatTime(tOut),
         dutyHours: dur,
         status: log.status || 'absent',
      };
   });

   const buildSummaryPDFRows = (data: any[]): AttendanceSummaryPDFRow[] =>
      data.map(s => ({
         name: s.name || 'Unknown',
         designation: s.designation || 'Staff',
         employeeId: s.employeeId || 'N/A',
         email: s.email || '-',
         monthlyPresent: s.monthlyAttendedDays,
         monthlyAbsent: s.monthlyAbsentDays,
         monthlyLeave: s.monthlyLeaveDays,
         yearlyPresent: s.yearlyAttendedDays,
         yearlyAbsent: s.yearlyAbsentDays,
         yearlyLeave: s.yearlyLeaveDays,
      }));

    const handleExport = async (type: 'current' | 'today' | 'weekly' | 'monthly' | 'yearly' | 'consolidated' | 'custom', exportFormat: 'pdf' | 'excel') => {
        setShowExportMenu(false); setShowDateRangePicker(false);
        const now = new Date();

        // 1. Unified Period & Label Logic
        const PERIOD_MAP: Record<string, string> = {
            today: format(now, 'dd/MM/yyyy'),
            weekly: `${format(new Date(Date.now() - 7 * 86400000), 'dd/MM/yyyy')} to ${format(now, 'dd/MM/yyyy')}`,
            monthly: format(now, 'MMMM yyyy'),
            yearly: `Year ${now.getFullYear()}`,
            current: `${startDate} to ${endDate}`,
            consolidated: format(now, 'dd/MM/yyyy')
        };

        const LABEL_MAP: Record<string, string> = {
            today: "Today's Attendance",
            weekly: "Weekly Attendance",
            monthly: "Monthly Attendance",
            yearly: "Yearly Attendance",
            current: "Attendance Log (Current Filters)",
            consolidated: "Consolidated Attendance Summary",
            custom: "Custom Range Attendance"
        };

        // 2. Specialized Case: Consolidated
        if (type === 'consolidated') {
            if (!summary || summary.length === 0) { toast.error('No summary data available'); return; }
            if (exportFormat === 'pdf') {
                setPdfPreview({ open: true, reportType: 'CONSOLIDATED', period: PERIOD_MAP.consolidated, reportLabel: LABEL_MAP.consolidated, rows: buildSummaryPDFRows(summary), isSummary: true });
            } else {
                exportSummaryReport();
            }
            return;
        }

        // 3. Specialized Case: Current View (Uses existing 'logs' state)
        if (type === 'current') {
            if (exportFormat === 'pdf') {
                setPdfPreview({ open: true, reportType: 'LOGS', period: PERIOD_MAP.current, reportLabel: LABEL_MAP.current, rows: buildPDFRows(logs || []), isSummary: false });
            } else {
                handleExportExcel(logs || [], PERIOD_MAP.current);
            }
            return;
        }

        // 4. Case: Custom (Trigger Picker)
        if (type === 'custom' && (!customRange.from || !customRange.to)) {
            setShowDateRangePicker(true);
            setShowExportMenu(true);
            return;
        }

        // 5. Data Fetching for other types
        setLoading(true);
        try {
            const params: any = {};
            let periodStr = PERIOD_MAP[type] || '';

            if (type === 'today') {
                params.date = format(now, 'yyyy-MM-dd');
                periodStr = format(now, 'dd/MM/yyyy');
            } else if (type === 'weekly') {
                const start = new Date(); start.setDate(now.getDate() - 7);
                params.startDate = format(start, 'yyyy-MM-dd');
                params.endDate = format(now, 'yyyy-MM-dd');
                periodStr = `${format(start, 'dd/MM/yyyy')} to ${format(now, 'dd/MM/yyyy')}`;
            } else if (type === 'monthly') {
                // Better monthly filtering often uses YYYY-MM
                params.month = format(now, 'yyyy-MM');
                periodStr = format(now, 'MMMM yyyy');
            } else if (type === 'yearly') {
                const start = new Date(now.getFullYear(), 0, 1);
                params.startDate = format(start, 'yyyy-MM-dd');
                params.endDate = format(now, 'yyyy-MM-dd');
                periodStr = `Jan ${now.getFullYear()} to Dec ${now.getFullYear()}`;
            } else if (type === 'custom') {
                params.startDate = customRange.from;
                params.endDate = customRange.to;
                periodStr = `${format(new Date(customRange.from), 'dd/MM/yyyy')} to ${format(new Date(customRange.to), 'dd/MM/yyyy')}`;
            }

            // Switching to the working Hospital Admin Service for reliable range-based filtering
            const res = await hospitalAdminService.getAttendance(params) as any;
            const data = res.attendance || res.data || [];

            if (data.length === 0) {
                toast.error(`No records found`);
                return;
            }

            if (exportFormat === 'pdf') {
                setPdfPreview({
                    open: true,
                    reportType: type.toUpperCase(),
                    period: periodStr,
                    reportLabel: LABEL_MAP[type] || 'Attendance Report',
                    rows: buildPDFRows(data),
                    isSummary: false
                });
            } else {
                handleExportExcel(data, periodStr);
            }
        } catch (err) {
            console.error('Attendance Export Fetch Fail:', err);
            toast.error('Export failed');
        } finally {
            setLoading(false);
        }
    };

   const exportSummaryReport = async () => {
      try {
         setLoading(true);
         const ExcelJS = (await import('exceljs')).default;

         const workbook = new ExcelJS.Workbook();
         const worksheet = workbook.addWorksheet('Summary');
         const title = worksheet.addRow(['ATTENDANCE SUMMARY REPORT']);
         title.font = { bold: true, size: 14 };
         worksheet.addRow([hospital.name || 'Hospital Report']);
         worksheet.addRow([]);
         const hdr = worksheet.addRow(['Staff Name', 'Emp ID', 'Designation', 'Mth Present', 'Mth Absent', 'Mth Leave', 'Yr Present', 'Yr Absent', 'Yr Leave']);
         hdr.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }; c.font = { color: { argb: 'FFFFFFFF' }, bold: true }; });
         summary.forEach(s => {
            worksheet.addRow([s.name, s.employeeId, s.designation, s.monthlyAttendedDays, s.monthlyAbsentDays, s.monthlyLeaveDays, s.yearlyAttendedDays, s.yearlyAbsentDays, s.yearlyLeaveDays]);
         });
         const buffer = await workbook.xlsx.writeBuffer();
         const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
         const url = URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.download = `Attendance_Summary_${new Date().toISOString().split('T')[0]}.xlsx`;
         link.click();
         toast.success('Summary exported');
      } catch (err) {
         console.error('Summary Export Error:', err);
         toast.error('Export failed');
      } finally { setLoading(false); }
   };

   // ── Export Excel (current view) ──
   const handleExportExcel = async (data: any[], period: string) => {
      try {
         setLoading(true);
         const ExcelJS = (await import('exceljs')).default;

         const workbook = new ExcelJS.Workbook();
         const worksheet = workbook.addWorksheet('Attendance');
         const t = worksheet.addRow(['ATTENDANCE REGISTRY']);
         t.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1F4E78' } };
         t.alignment = { horizontal: 'center', vertical: 'middle' };
         worksheet.mergeCells('A1:G1'); t.height = 30;
         const o = worksheet.addRow([hospital.name || 'Hospital Attendance Report']);
         o.font = { name: 'Calibri', size: 12, bold: true };
         o.alignment = { horizontal: 'center', vertical: 'middle' };
         worksheet.mergeCells('A2:G2');
         const p = worksheet.addRow([`Period: ${period} | Generated: ${new Date().toLocaleString('en-GB')}`]);
         p.font = { name: 'Calibri', size: 11, italic: true };
         p.alignment = { horizontal: 'center', vertical: 'middle' };
         worksheet.mergeCells('A3:G3');
         worksheet.addRow([]);
         const hdr = worksheet.addRow(['NAME', 'EMPLOYEE ID', 'ROLE', 'CLOCK IN', 'CLOCK OUT', 'DURATION', 'STATUS']);
         hdr.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
            cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin', color: { argb: 'FF0070C0' } }, left: { style: 'thin', color: { argb: 'FF0070C0' } }, bottom: { style: 'thin', color: { argb: 'FF0070C0' } }, right: { style: 'thin', color: { argb: 'FF0070C0' } } };
         });
         worksheet.columns = [
            { key: 'name', width: 25 }, { key: 'id', width: 15 }, { key: 'role', width: 15 },
            { key: 'in', width: 20 }, { key: 'out', width: 20 }, { key: 'duration', width: 15 }, { key: 'status', width: 15 }
         ];
         data.forEach((log: any) => {
            const rawIn = log.checkIn?.time || log.checkIn;
            const rawOut = log.checkOut?.time || log.checkOut;

            // Use safer native date conversion helper
            const formatTime = (raw: any) => {
               if (!raw) return '--:--';
               const d = new Date(raw);
               if (isNaN(d.getTime())) return '--:--';
               return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            };

            const ci = formatTime(rawIn);
            const co = formatTime(rawOut);
            let dur = '--';
            if (rawIn && rawOut) {
               const d = new Date(rawOut).getTime() - new Date(rawIn).getTime();
               if (!isNaN(d)) dur = `${Math.floor(d / 3600000)}h ${Math.floor((d / 60000) % 60)}m`;
            }
            const userData = log.user || log.staff?.user || {};
            const role = userData.role || log.staff?.designation || 'Staff';
            worksheet.addRow({
               name: (userData.name || 'N/A').toUpperCase(),
               id: (userData.employeeId || log.staff?.employeeId || 'N/A'),
               role: role.toUpperCase().replace(/-/g, ' '),
               in: ci,
               out: co,
               duration: dur,
               status: (STATUS_CONFIG[log.status]?.label || log.status || 'ABSENT').toUpperCase()
            }).eachCell(cell => {
               cell.alignment = { horizontal: 'center', vertical: 'middle' };
               cell.font = { name: 'Calibri', size: 9 };
               cell.border = { top: { style: 'thin', color: { argb: 'FF0070C0' } }, left: { style: 'thin', color: { argb: 'FF0070C0' } }, bottom: { style: 'thin', color: { argb: 'FF0070C0' } }, right: { style: 'thin', color: { argb: 'FF0070C0' } } };
            });
         });
         const buffer = await workbook.xlsx.writeBuffer();
         const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
         const url = URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.download = `Attendance_${period.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
         link.click();
         toast.success('Excel report downloaded');
      } catch (err) {
         console.error('Attendance Excel Export Error:', err);
         toast.error('Export failed');
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="space-y-4 bg-gray-50/50 min-h-screen">

         {/* ── PDF PREVIEW MODAL ── */}
         {pdfPreview?.open && (
            <AttendancePDFPreview
               hospital={hospital}
               reportType={pdfPreview.reportType}
               period={pdfPreview.period}
               reportLabel={pdfPreview.reportLabel}
               rows={pdfPreview.rows}
               isSummary={pdfPreview.isSummary}
               onClose={() => setPdfPreview(null)}
            />
         )}

         {/* Top Navigation & Unified Stats Command Bar */}
         <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl sm:rounded-2xl border border-slate-100 shadow-sm w-full">
            <div className="flex flex-col xl:flex-row xl:items-center gap-4 xl:gap-8 w-full xl:w-auto">
             <div className="space-y-0.5 min-w-[180px]">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2 leading-none uppercase">
               <Clock className="text-indigo-600 w-4 h-4" />
               Attendance Logic
            </h1>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
               Personnel Compliance Node
            </p>
            </div>
               <div className="grid grid-cols-2 xs:grid-cols-3 sm:flex sm:items-center gap-3 sm:gap-6 p-3 sm:p-0 sm:px-5 sm:py-1.5 bg-slate-50/50 sm:bg-transparent rounded-xl border border-slate-100 sm:border-none w-full xl:w-auto">
                  {[
                     { label: 'Total', value: stats.total, color: 'text-slate-500', icon: UserIcon },
                     { label: 'Present', value: stats.present, color: 'text-emerald-600', icon: UserCheck },
                     { label: 'Late', value: stats.late, color: 'text-amber-600', icon: Clock8 },
                     { label: 'Absent', value: stats.absent, color: 'text-rose-600', icon: UserX },
                     { label: 'Leave', value: stats.onLeave, color: 'text-blue-600', icon: CalendarDays },
                  ].map((stat, i, arr) => (
                     <React.Fragment key={stat.label}>
                        <div className="flex flex-col items-center sm:items-start min-w-[70px]">
                           <div className={`flex items-center gap-1 mb-0.5 ${stat.color}`}>
                              <stat.icon size={10} />
                              <span className="text-[7px] font-black uppercase tracking-widest whitespace-nowrap">{stat.label}</span>
                           </div>
                           <p className="text-sm sm:text-base font-black text-slate-900 leading-none">{stat.value}</p>
                        </div>
                        {i < arr.length - 1 && <div className="hidden sm:block w-px h-6 bg-slate-200" />}
                     </React.Fragment>
                  ))}
               </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full lg:w-auto mt-2 lg:mt-0">
               <button onClick={() => refetch()} className="p-2 sm:p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all active:scale-95 border border-slate-100 flex items-center gap-2 group">
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline group-hover:text-indigo-600">Revalidate</span>
               </button>
            </div>
         </div>

         {/* Advanced Filter Architecture */}
         <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col lg:flex-row items-center gap-4">
            <div className="relative flex-1 w-full lg:w-auto">
               <Search className="w-4 h-4 text-gray-400 absolute left-5 top-1/2 -translate-y-1/2" />
               <input
                  type="text"
                  placeholder="Scan personnel index by name or ID..."
                  className="w-full pl-12 pr-4 py-4 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700 rounded-2xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
               <div className="relative flex-1 lg:w-48">
                  <Filter className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <select
                     className="w-full pl-11 pr-4 py-4 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer hover:bg-gray-50/80 transition-all"
                     value={filterRole}
                     onChange={(e) => {
                        setFilterRole(e.target.value);
                        setPage(1);
                     }}
                  >
                     <option value="all">Unfiltered Roles</option>
                     <option value="doctor">Doctors</option>
                     <option value="nurse">Nurses</option>
                     <option value="staff">Clinical Staff</option>
                     <option value="hr">HR Personnel</option>
                     <option value="helpdesk">Reception/Desk</option>
                  </select>
               </div>

               <div className="relative flex-1 lg:w-48">
                  <TrendingUp className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <select
                     className="w-full pl-11 pr-4 py-4 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer hover:bg-gray-50/80 transition-all"
                     value={filterStatus}
                     onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setPage(1);
                     }}
                  >
                     <option value="all">All Conditions</option>
                     <option value="present">Present (Normal)</option>
                     <option value="late">Tardy Entry</option>
                     <option value="absent">Absence (Unlogged)</option>
                     <option value="on-leave">Approved Leave</option>
                  </select>
               </div>
            </div>

            {/* ── Hybrid Generate Report button moved here ── */}
            <div className="relative w-full lg:w-auto mt-2 lg:mt-0">
               <button
                  onClick={() => { setShowExportMenu(v => !v); setShowDateRangePicker(false); }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all"
               >
                  <FileSpreadsheet size={15} /> Generate Report <ChevronDown size={12} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
               </button>

               {showExportMenu && (
                  <>
                     <div className="fixed inset-0 z-10" onClick={() => { setShowExportMenu(false); setShowDateRangePicker(false); }} />
                     <div className="absolute right-0 mt-3 w-80 max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 z-20 overflow-hidden origin-top-right">
                        <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600">
                           <p className="text-[10px] font-black uppercase tracking-widest text-white">Select Report Type</p>
                           <p className="text-[9px] text-indigo-200 mt-0.5">PDF preview or Excel download</p>
                        </div>
                        <div className="py-1">
                           {[
                              { key: 'consolidated', label: 'Consolidated Summary', icon: '📊' },
                              { key: 'current', label: 'Current View', icon: '📋' },
                              { key: 'today', label: "Today's Attendance", icon: '📅' },
                              { key: 'weekly', label: 'Last 7 Days', icon: '📆' },
                              { key: 'monthly', label: 'Monthly Logs', icon: '🗓️' },
                              { key: 'yearly', label: 'Yearly Logs', icon: '📈' },
                           ].map(item => (
                              <div key={item.key} className="flex items-center justify-between px-3 py-2 hover:bg-indigo-50/60 transition-colors group">
                                 <span className="flex items-center gap-2 text-xs font-semibold text-gray-700 group-hover:text-indigo-700">
                                    <span>{item.icon}</span>{item.label}
                                 </span>
                                 <div className="flex gap-1">
                                    <button onClick={() => handleExport(item.key as any, 'pdf')} className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-100 rounded-lg text-[10px] font-bold transition-all">
                                       <FileText size={11} /> PDF
                                    </button>
                                    <button onClick={() => handleExport(item.key as any, 'excel')} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-bold transition-all">
                                       <FileSpreadsheet size={11} /> XLS
                                    </button>
                                 </div>
                              </div>
                           ))}
                        </div>
                        {/* Custom Range */}
                        <div className="border-t border-gray-100">
                           <button onClick={() => setShowDateRangePicker(v => !v)} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors">
                              <CalendarRange size={13} /> Custom Date Range
                              <ChevronDown size={11} className={`ml-auto transition-transform ${showDateRangePicker ? 'rotate-180' : ''}`} />
                           </button>
                           {showDateRangePicker && (
                              <div className="px-4 pb-4 space-y-2" onClick={e => e.stopPropagation()}>
                                 <div className="grid grid-cols-2 gap-2">
                                    <div>
                                       <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">From</label>
                                       <input type="date" value={customRange.from} max={customRange.to} onChange={e => setCustomRange(r => ({ ...r, from: e.target.value }))} className="w-full px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                       <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">To</label>
                                       <input type="date" value={customRange.to} min={customRange.from} max={format(new Date(), 'yyyy-MM-dd')} onChange={e => setCustomRange(r => ({ ...r, to: e.target.value }))} className="w-full px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => handleExport('custom', 'pdf')} className="flex items-center justify-center gap-1.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition-colors">
                                       <FileText size={12} /> PDF Preview
                                    </button>
                                    <button onClick={() => handleExport('custom', 'excel')} className="flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors">
                                       <FileSpreadsheet size={12} /> Excel
                                    </button>
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>
                  </>
               )}
            </div>
         </div>

         {loading && (
            <div className="fixed inset-0 bg-white/60 dark:bg-gray-950/60 flex items-center justify-center z-[100] backdrop-blur-sm">
               <div className="flex flex-col items-center">
                  <div className="h-10 w-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                  <p className="text-xs font-bold text-indigo-600 tracking-widest uppercase">Generating Report...</p>
               </div>
            </div>
         )}

         {/* Hybrid Data Grid */}
         <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden min-h-[500px] flex flex-col">
            <div className="overflow-x-auto flex-1">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-700">
                        <th className="p-4 px-6 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Personnel Identity</th>
                        <th className="p-4 px-6 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Departmental Logic</th>
                        <th className="p-4 px-6 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Clock Dynamics</th>
                        <th className="p-4 px-6 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Active Duration</th>
                        <th className="p-4 px-6 text-right text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Network Status</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                     {isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                           <tr key={i} className="animate-pulse">
                              <td colSpan={5} className="p-8">
                                 <div className="h-10 bg-gray-50 dark:bg-gray-700 rounded-2xl w-full opacity-50" />
                              </td>
                           </tr>
                        ))
                     ) : logs.length > 0 ? (
                        logs.map((log: any) => {
                           const status = STATUS_CONFIG[log.status] || STATUS_CONFIG.absent;
                           const StatusIcon = status.icon;
                           const isAbsent = log.status === 'absent';

                           return (
                              <tr key={log._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-all group">
                                 <td className="p-6">
                                    <div className="flex items-center gap-4">
                                       <div className="relative">
                                          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-500/10 to-blue-600/10 flex items-center justify-center text-indigo-600 font-black text-base border border-indigo-100 dark:border-indigo-900/30 group-hover:scale-105 transition-transform">
                                             {log.user?.name?.charAt(0).toUpperCase()}
                                          </div>
                                          {!isAbsent && (
                                             <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-gray-800 rounded-full flex items-center justify-center">
                                                <Monitor size={10} className="text-white" />
                                             </div>
                                          )}
                                       </div>
                                       <div>
                                          <p className="font-black text-gray-900 dark:text-white uppercase text-[11px] tracking-tight">{log.user?.name}</p>
                                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">#{log.user?.employeeId || 'UNREGISTERED'}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="p-4 px-6">
                                    <div className="flex flex-col gap-1">
                                       <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{log.user?.role?.replace('-', ' ')}</span>
                                       <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter leading-none">Hospital Primary Node</span>
                                    </div>
                                 </td>
                                 <td className="p-4 px-6">
                                    <div className="flex items-center gap-4">
                                       <div className="flex flex-col">
                                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">In</span>
                                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${log.checkIn ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'} uppercase`}>
                                             {log.checkIn ? format(new Date(log.checkIn), 'HH:mm:ss') : '--:--:--'}
                                          </span>
                                       </div>
                                       <ArrowRight className="w-3.5 h-3.5 text-gray-300 mt-4" />
                                       <div className="flex flex-col">
                                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Out</span>
                                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${log.checkOut ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-gray-100 text-gray-400'} uppercase`}>
                                             {log.checkOut ? format(new Date(log.checkOut), 'HH:mm:ss') : '--:--:--'}
                                          </span>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="p-4 px-6">
                                    <div className="flex items-center gap-2">
                                       <Clock className="w-3 h-3 text-indigo-400" />
                                       {log.checkIn && log.checkOut ? (
                                          <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                             {Math.floor((new Date(log.checkOut).getTime() - new Date(log.checkIn).getTime()) / (1000 * 60 * 60))}h {Math.floor(((new Date(log.checkOut).getTime() - new Date(log.checkIn).getTime()) / (1000 * 60)) % 60)}m
                                          </span>
                                       ) : (
                                          <span className="text-[10px] font-black text-gray-300 uppercase italic">Incalculable</span>
                                       )}
                                    </div>
                                 </td>
                                 <td className="p-4 px-6 text-right">
                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${status.bg} ${status.color} ${status.border} shadow-sm group-hover:scale-105 transition-transform`}>
                                       <StatusIcon size={12} />
                                       {status.label}
                                    </div>
                                 </td>
                              </tr>
                           );
                        })
                     ) : (
                        <tr>
                           <td colSpan={5} className="p-32 text-center text-gray-400">
                              <div className="flex flex-col items-center gap-6">
                                 <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center animate-bounce">
                                    <Clock size={40} className="text-gray-200" />
                                 </div>
                                 <div className="space-y-1">
                                    <p className="text-[12px] font-black uppercase tracking-[0.3em]">No Attendance Vectors Detected</p>
                                    <p className="text-[10px] font-bold text-gray-400">Verify filters or terminal connectivity status.</p>
                                 </div>
                                 <button
                                    onClick={() => {
                                       setFilterRole('all');
                                       setFilterStatus('all');
                                    }}
                                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all"
                                 >
                                    Clear Matrix Filters
                                 </button>
                              </div>
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>

            {/* Pagination Governance */}
            <div className="p-8 bg-gray-50/50 dark:bg-gray-900/10 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
               <div className="hidden lg:flex flex-col">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Registry Throughput</p>
                  <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                     Showing {logs.length} active nodes in current sector
                  </p>
               </div>

               <div className="flex items-center gap-3 mx-auto lg:mx-0">
                  <button
                     disabled={page === 1}
                     onClick={() => setPage(p => Math.max(1, p - 1))}
                     className="px-6 py-3.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all disabled:opacity-30 flex items-center gap-2 group shadow-sm active:scale-95"
                  >
                     <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                     Previous Entry
                  </button>

                  <div className="flex items-center gap-2 px-6">
                     <span className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-xl text-[11px] font-black shadow-lg shadow-indigo-100">{page}</span>
                     <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mx-2">of</span>
                     <span className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-700 text-gray-400 rounded-xl text-[11px] font-black border border-gray-100 dark:border-gray-600">{pagination?.pages || 1}</span>
                  </div>

                  <button
                     disabled={page >= (pagination?.pages || 1)}
                     onClick={() => setPage(p => p + 1)}
                     className="px-6 py-3.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all disabled:opacity-30 flex items-center gap-2 group shadow-sm active:scale-95"
                  >
                     Next Entry
                     <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
               </div>
            </div>
         </div>

         {/* Compliance Footer */}
         <div className="flex items-center justify-center gap-8 py-6 opacity-30">
            <div className="flex items-center gap-2">
               <ShieldCheck className="w-3.5 h-3.5" />
               <span className="text-[9px] font-black uppercase tracking-[0.2em]">QR Verified</span>
            </div>
            <div className="flex items-center gap-2">
               <MapPin className="w-3.5 h-3.5" />
               <span className="text-[9px] font-black uppercase tracking-[0.2em]">Geofenced</span>
            </div>
            <div className="flex items-center gap-2">
               <Monitor className="w-3.5 h-3.5" />
               <span className="text-[9px] font-black uppercase tracking-[0.2em]">Real-time Sync</span>
            </div>
         </div>
      </div>
   );
}
