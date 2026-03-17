"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Users,
  TrendingUp,
  Download,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  FileSpreadsheet,
  ChevronDown,
  CalendarRange
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, Card, Button } from "@/components/admin";
import { hospitalAdminService } from "@/lib/integrations";
import type { AttendanceRecord, AttendanceStats, AttendanceSummary } from "@/lib/integrations";

const STATUS_CONFIG = {
  present: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50", label: "Present" },
  absent: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", label: "Absent" },
  late: { icon: AlertCircle, color: "text-yellow-500", bg: "bg-yellow-50", label: "Late" },
  "half-day": { icon: Clock, color: "text-orange-500", bg: "bg-orange-50", label: "Half Day" },
  "on-leave": { icon: Calendar, color: "text-blue-500", bg: "bg-blue-50", label: "On Leave" },
  "off-duty": { icon: Clock, color: "text-gray-500", bg: "bg-gray-50", label: "Off Duty" }
};

interface AttendanceClientProps {
  initialAttendance: AttendanceRecord[];
  initialStats: AttendanceStats;
  title?: string;
  roleFilter?: string;
}

// ============================================================================
// PERFORMANCE: Pagination Settings
// ============================================================================
const ITEMS_PER_PAGE = 20;

// ============================================================================
// PERFORMANCE: Memoized Attendance Row
// ============================================================================
// ============================================================================
// HELPERS: Safely resolve staff name / designation from any record shape.
// Backend returns different shapes: getMonthlyReport → staff.user.name,
// direct Attendance populate → user.name, virtual records → name directly.
// ============================================================================
const resolveStaffName = (record: any): string =>
  record?.staff?.user?.name ||
  record?.staff?.name ||
  record?.user?.name ||
  record?.name ||
  'Unknown Staff';

const resolveStaffDesignation = (record: any): string =>
  record?.staff?.designation ||
  record?.designation ||
  record?.staff?.user?.role ||
  record?.user?.role ||
  'Staff Member';

const AttendanceRow = React.memo(({
  record
}: {
  record: AttendanceRecord;
}) => {
  const formatTime = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.present;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.bg} border`}>
        <Icon size={14} className={config.color} />
        <span className={config.color}>{config.label}</span>
      </div>
    );
  };

  const staffName = resolveStaffName(record);
  const staffDesignation = resolveStaffDesignation(record);

  return (
    <tr className="hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
      <td className="py-4 px-3 md:px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-400">
            {staffName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{staffName}</p>
            <p className="text-[10px] text-gray-400 font-medium">{staffDesignation}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-3 md:px-6 text-sm font-medium text-gray-600 dark:text-gray-400">
        {new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
      </td>
      <td className="py-4 px-3 md:px-6 text-[11px] font-medium text-emerald-600">
        {record.checkIn?.time ? formatTime(record.checkIn.time) : '--:--'}
      </td>
      <td className="py-4 px-3 md:px-6 text-[11px] font-medium text-rose-500">
        {record.checkOut?.time ? formatTime(record.checkOut.time) : '--:--'}
      </td>
      <td className="py-4 px-3 md:px-6">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          {record.workingHours || 0}m
        </span>
      </td>
      <td className="py-4 px-3 md:px-6">
        {getStatusBadge(record.status)}
      </td>
    </tr>
  );
});

AttendanceRow.displayName = 'AttendanceRow';

// ============================================================================
// PERFORMANCE: Memoized Summary Row
// ============================================================================
const SummaryRow = React.memo(({
  data
}: {
  data: AttendanceSummary;
}) => {
  const formatTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG["off-duty"];
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${config.bg} border border-transparent`}>
        <Icon size={12} className={config.color} />
        <span className={config.color}>{config.label}</span>
      </div>
    );
  };

  const percentage = Math.round((data.monthlyAttendedDays / (data.monthDaysTotal || 1)) * 100);

  return (
    <tr className="hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
      <td className="py-4 px-3 md:px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
            {data.name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              {data.name || 'Unknown'}
            </p>
            <p className="text-[10px] font-medium text-gray-400">
              {/* Only show employeeId if it's a real value, not a backend placeholder */}
              {data.employeeId && !['N/A', 'EMP-N/A', '-'].includes(data.employeeId)
                ? data.employeeId
                : data.designation || ''}
            </p>
          </div>
        </div>
      </td>
      <td className="py-4 px-3 md:px-6">
        <span className="text-xs font-medium text-gray-500">
          {data.designation || 'Staff'}
        </span>
      </td>
      <td className="py-4 px-3 md:px-6">
        {getStatusBadge(data.todayStatus)}
      </td>
      <td className="py-4 px-3 md:px-6 text-center">
        <div className="flex flex-col items-center">
          <div className="flex gap-1 items-baseline">
            <span className="text-sm font-bold text-indigo-600">{data.monthlyAttendedDays}</span>
            <span className="text-[10px] text-gray-400 font-medium">days</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[9px] font-medium text-rose-500">{data.monthlyAbsentDays} Abs</span>
            <span className="text-[9px] font-medium text-amber-500">{data.monthlyLeaveDays} Lve</span>
          </div>
        </div>
      </td>
      <td className="py-4 px-3 md:px-6 text-center">
        <div className="flex flex-col items-center">
          <div className="flex gap-1 items-baseline">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{data.yearlyAttendedDays}</span>
            <span className="text-[10px] text-gray-400 font-medium">days</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[9px] font-medium text-rose-500">{data.yearlyAbsentDays} Abs</span>
            <span className="text-[9px] font-medium text-amber-500">{data.yearlyLeaveDays} Lve</span>
          </div>
        </div>
      </td>
      <td className="py-4 px-3 md:px-6 text-right">
        <div className="flex flex-col text-[11px] font-medium">
          <span className="text-emerald-600">In: {formatTime(data.checkIn)}</span>
          <span className="text-gray-400">Out: {formatTime(data.checkOut)}</span>
        </div>
      </td>
    </tr>
  );
});

SummaryRow.displayName = 'SummaryRow';


// Helper to filter data by role — includes all roles (doctors, nurses, staff, helpdesk/frontdesk)
const rowFilterData = (data: any[], roleFilter?: string) => {
  return data.filter(item => {
    const role = (
      item.staff?.user?.role ||
      item.user?.role ||
      item.role ||
      ''
    ).toLowerCase();

    // If a specific role is requested, filter to that role only
    if (roleFilter) return role === roleFilter.toLowerCase();

    return true;
  });
};

function AttendanceClient({ initialAttendance, initialStats, title = "Staff Attendance", roleFilter }: AttendanceClientProps) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(rowFilterData(initialAttendance || [], roleFilter));

  const [summary, setSummary] = useState<AttendanceSummary[]>([]);
  const [stats, setStats] = useState<AttendanceStats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'logs'>('summary');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStaff, setFilterStaff] = useState("");
  const [staffList, setStaffList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [customRange, setCustomRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // last 7 days default
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchStaff();
    fetchSummary();
  }, []);

  const fetchStaff = async () => {
    try {
      const [staffRes, drRes, nurseRes, helpRes] = await Promise.allSettled([
        hospitalAdminService.getStaff(),
        hospitalAdminService.getDoctors(),
        hospitalAdminService.getNurses(),
        hospitalAdminService.getHelpdesks(),
      ]);

      const allStaff: any[] = [];

      if (staffRes.status === 'fulfilled') allStaff.push(...(staffRes.value.staff || []));
      if (drRes.status === 'fulfilled') allStaff.push(...(drRes.value.doctors || []));
      if (nurseRes.status === 'fulfilled') allStaff.push(...(nurseRes.value.nurses || []));
      if (helpRes.status === 'fulfilled') {
          // Map helpdesk users to expected shape if needed, though they already have _id/name typically
          allStaff.push(...(helpRes.value.helpdesks || []));
      }

      // Always exclude admin; filter by explicit roleFilter if provided
      const filtered = allStaff.filter((s: any) => {
        const role = (s.user?.role || s.role || '').toLowerCase();
        if (role === 'hospital-admin') return false;
        if (roleFilter) return role === roleFilter.toLowerCase();
        return true;
      });

      // Deduplicate by user ID
      const uniqueStaff = Array.from(new Map(filtered.map(s => [s.user?._id || s._id, s])).values());
      setStaffList(uniqueStaff);
    } catch (e) {
      console.error("Staff fetch error", e);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await (hospitalAdminService as any).getAttendanceSummary();
      setSummary(rowFilterData(res.summary || [], roleFilter));
    } catch (e) {
      console.error("Summary fetch error", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterDate, filterStatus, filterStaff]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const params: { date?: string; status?: string; staffId?: string } = {};
      if (filterDate) params.date = filterDate;
      if (filterStatus) params.status = filterStatus;
      if (filterStaff) params.staffId = filterStaff;

      const [attendanceResponse, statsResponse] = await Promise.all([
        hospitalAdminService.getAttendance(params),
        hospitalAdminService.getAttendanceStats()
      ]);

      setAttendance(rowFilterData(attendanceResponse.attendance || [], roleFilter));
      setStats(statsResponse.stats as any);
      setPage(1); // Reset page on filter change
    } catch (error: any) {
      console.error("Failed to fetch data:", error);
      toast.error(error.message || "Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };



  const exportSummaryReport = async () => {
    try {
      if (summary.length === 0) {
        toast.error("No summary data to export");
        return;
      }

      setLoading(true);
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Summary');

      // --- 1. Report Titles ---
      const titleRow = worksheet.addRow(['ATTENDANCE SUMMARY REPORT']);
      titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1F4E78' } };
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells('A1:K1');
      titleRow.height = 30;

      const orgRow = worksheet.addRow(['Attendance Summary Report']);
      orgRow.font = { name: 'Calibri', size: 12, bold: true };
      orgRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells('A2:K2');

      const periodRow = worksheet.addRow([`Report Generated: ${new Date().toLocaleDateString('en-GB')}`]);
      periodRow.font = { name: 'Calibri', size: 11, italic: true };
      periodRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells('A3:K3');

      worksheet.addRow([]); // Spacer

      // --- 2. Define Columns & Headers ---
      const headers = [
        "Staff Name", "Employee ID", "Designation", "Email",
        "Monthly Present", "Monthly Absent", "Monthly Leaves",
        "Yearly Present", "Yearly Absent", "Yearly Leaves",
        "Total Period Days"
      ];
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
        { key: 'name', width: 25 },
        { key: 'empId', width: 15 },
        { key: 'designation', width: 20 },
        { key: 'email', width: 30 },
        { key: 'mPresent', width: 15 },
        { key: 'mAbsent', width: 15 },
        { key: 'mLeave', width: 15 },
        { key: 'yPresent', width: 15 },
        { key: 'yAbsent', width: 15 },
        { key: 'yLeave', width: 15 },
        { key: 'totalDays', width: 15 },
      ];

      // --- 3. Populate Data ---
      summary.forEach((s) => {
        const row = worksheet.addRow({
          name: s.name || 'Unknown',
          empId: s.employeeId || 'N/A',
          designation: s.designation || 'Staff',
          email: s.email || '-',
          mPresent: s.monthlyAttendedDays,
          mAbsent: s.monthlyAbsentDays,
          mLeave: s.monthlyLeaveDays,
          yPresent: s.yearlyAttendedDays,
          yAbsent: s.yearlyAbsentDays,
          yLeave: s.yearlyLeaveDays,
          totalDays: s.yearDaysTotal
        });

        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF0070C0' } },
            left: { style: 'thin', color: { argb: 'FF0070C0' } },
            bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
            right: { style: 'thin', color: { argb: 'FF0070C0' } }
          };
          cell.font = { name: 'Calibri', size: 10 };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `attendance_summary_${new Date().toISOString().split('T')[0]}.xlsx`);
      link.click();
      toast.success("Consolidated summary report exported");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate summary report");
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (type: 'today' | 'weekly' | 'monthly' | 'yearly' | 'consolidated' | 'custom') => {
    if (type === 'consolidated') {
      exportSummaryReport();
      setShowExportMenu(false);
      return;
    }

    // Custom date range: show inline picker, don't close menu yet
    if (type === 'custom') {
      setShowDateRangePicker(true);
      return;
    }

    try {
      setLoading(true);
      setShowExportMenu(false);

      const params: any = {};
      const now = new Date();

      if (type === 'today') {
        params.date = now.toISOString().split('T')[0];
      } else if (type === 'weekly') {
        const lastWeek = new Date();
        lastWeek.setDate(now.getDate() - 7);
        params.startDate = lastWeek.toISOString().split('T')[0];
        params.endDate = now.toISOString().split('T')[0];
      } else if (type === 'monthly') {
        params.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      } else if (type === 'yearly') {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        params.startDate = yearStart.toISOString().split('T')[0];
        params.endDate = now.toISOString().split('T')[0];
      }

      const res = await hospitalAdminService.getAttendance(params);
      const dataToExport = res.attendance || [];

      if (dataToExport.length === 0) {
        toast.error(`No historical logs found for ${type} protocol`);
        return;
      }

      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance History');

      // --- 1. Report Titles ---
      const titleRow = worksheet.addRow(['ATTENDANCE HISTORY LOGS']);
      titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1F4E78' } };
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells('A1:H1');
      titleRow.height = 30;

      const orgRow = worksheet.addRow(['Attendance History Logs']);
      orgRow.font = { name: 'Calibri', size: 12, bold: true };
      orgRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells('A2:H2');

      const periodRow = worksheet.addRow([`Protocol: ${type.toUpperCase()} | Generated: ${now.toLocaleDateString('en-GB')}`]);
      periodRow.font = { name: 'Calibri', size: 11, italic: true };
      periodRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells('A3:H3');

      worksheet.addRow([]); // Spacer

      // --- 2. Define Columns & Headers ---
      const headers = ["Personnel Name", "Designation", "Employee ID", "Date", "Check-In", "Check-Out", "Duty Hours", "Status"];
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
        { key: 'name', width: 25 },
        { key: 'designation', width: 20 },
        { key: 'empId', width: 15 },
        { key: 'date', width: 12 },
        { key: 'in', width: 15 },
        { key: 'out', width: 15 },
        { key: 'hours', width: 15 },
        { key: 'status', width: 15 },
      ];

      // --- 3. Populate Data ---
      dataToExport.forEach((rec) => {
        const row = worksheet.addRow({
          name: rec.staff?.user?.name || 'Unknown',
          designation: rec.staff?.designation || 'Staff',
          empId: rec.staff?.employeeId || 'N/A',
          date: new Date(rec.date).toLocaleDateString(),
          in: rec.checkIn?.time ? new Date(rec.checkIn.time).toLocaleTimeString() : "-",
          out: rec.checkOut?.time ? new Date(rec.checkOut.time).toLocaleTimeString() : "-",
          hours: Number((rec.workingHours || 0) / 60).toFixed(2),
          status: rec.status.toUpperCase()
        });

        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF0070C0' } },
            left: { style: 'thin', color: { argb: 'FF0070C0' } },
            bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
            right: { style: 'thin', color: { argb: 'FF0070C0' } }
          };
          cell.font = { name: 'Calibri', size: 10 };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `attendance_history_${type}_${now.toISOString().split('T')[0]}.xlsx`);
      link.click();
      toast.success(`${type.toUpperCase()} historical logs exported`);
    } catch (err) {
      console.error(err);
      toast.error("Log export failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Custom range export ──
  const exportCustomRange = async () => {
    if (!customRange.from || !customRange.to) {
      toast.error('Please select both From and To dates');
      return;
    }
    if (customRange.from > customRange.to) {
      toast.error('From date cannot be after To date');
      return;
    }
    setShowExportMenu(false);
    setShowDateRangePicker(false);
    try {
      setLoading(true);
      const res = await hospitalAdminService.getAttendance({
        startDate: customRange.from,
        endDate: customRange.to,
      });
      const dataToExport = res.attendance || [];
      if (dataToExport.length === 0) {
        toast.error(`No logs found between ${customRange.from} and ${customRange.to}`);
        return;
      }
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance History');

      const titleRow = worksheet.addRow(['ATTENDANCE HISTORY LOGS']);
      titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1F4E78' } };
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells('A1:H1');
      titleRow.height = 30;
      const orgRow = worksheet.addRow(['Attendance History Logs']);
      orgRow.font = { name: 'Calibri', size: 12, bold: true };
      orgRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells('A2:H2');
      const periodRow = worksheet.addRow([`Period: ${customRange.from}  to  ${customRange.to} | Generated: ${new Date().toLocaleDateString('en-GB')}`]);
      periodRow.font = { name: 'Calibri', size: 11, italic: true };
      periodRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells('A3:H3');
      worksheet.addRow([]);

      const headers = ["Personnel Name", "Designation", "Employee ID", "Date", "Check-In", "Check-Out", "Duty Hours", "Status"];
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin', color: { argb: 'FF0070C0' } }, left: { style: 'thin', color: { argb: 'FF0070C0' } }, bottom: { style: 'thin', color: { argb: 'FF0070C0' } }, right: { style: 'thin', color: { argb: 'FF0070C0' } } };
      });
      worksheet.columns = [
        { key: 'name', width: 25 }, { key: 'designation', width: 20 }, { key: 'empId', width: 15 },
        { key: 'date', width: 12 }, { key: 'in', width: 15 }, { key: 'out', width: 15 },
        { key: 'hours', width: 15 }, { key: 'status', width: 15 },
      ];
      dataToExport.forEach((rec: any) => {
        const row = worksheet.addRow({
          name: rec.staff?.user?.name || 'Unknown',
          designation: rec.staff?.designation || 'Staff',
          empId: rec.staff?.employeeId || 'N/A',
          date: new Date(rec.date).toLocaleDateString('en-GB'),
          in: rec.checkIn?.time ? new Date(rec.checkIn.time).toLocaleTimeString() : "-",
          out: rec.checkOut?.time ? new Date(rec.checkOut.time).toLocaleTimeString() : "-",
          hours: Number((rec.workingHours || 0) / 60).toFixed(2),
          status: rec.status.toUpperCase()
        });
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = { top: { style: 'thin', color: { argb: 'FF0070C0' } }, left: { style: 'thin', color: { argb: 'FF0070C0' } }, bottom: { style: 'thin', color: { argb: 'FF0070C0' } }, right: { style: 'thin', color: { argb: 'FF0070C0' } } };
          cell.font = { name: 'Calibri', size: 10 };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_${customRange.from}_to_${customRange.to}.xlsx`);
      link.click();
      toast.success(`Custom range report exported (${customRange.from} to ${customRange.to})`);
    } catch (err) {
      console.error(err);
      toast.error('Custom range export failed');
    } finally {
      setLoading(false);
    }
  };

  // ✅ PERFORMANCE: Pagination Logic
  const paginatedAttendance = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return attendance.slice(start, start + ITEMS_PER_PAGE);
  }, [attendance, page]);

  const totalPages = Math.ceil(attendance.length / ITEMS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <PageHeader
          icon={<div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl"><Users className="text-indigo-600" size={32} /></div>}
          title={title}
          subtitle="View and manage daily staff presence and reports"
        />

        <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setViewMode('summary')}
            className={`flex items-center gap-2 px-3 md:px-6 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'summary'
              ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <LayoutGrid size={16} /> Summary Report
          </button>
          <button
            onClick={() => setViewMode('logs')}
            className={`flex items-center gap-2 px-3 md:px-6 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'logs'
              ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <List size={16} /> History Logs
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card padding="p-5" className="bg-white dark:bg-gray-900 border-none shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">Total Staff</p>
              <h3 className="text-2xl font-bold">{stats.totalStaff}</h3>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400">
              <Users size={20} />
            </div>
          </div>
        </Card>

        {/* Present Today — only 'present' status, NOT late */}
        <Card padding="p-5" className="bg-white dark:bg-gray-900 border-none shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">Present Today</p>
              <h3 className="text-2xl font-bold text-emerald-600">{stats.today?.present || 0}</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">On-time arrivals only</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
              <CheckCircle size={20} />
            </div>
          </div>
        </Card>

        {/* Late Today — shown separately from Present */}
        <Card padding="p-5" className="bg-white dark:bg-gray-900 border-none shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">Late Today</p>
              <h3 className="text-2xl font-bold text-amber-500">{stats.today?.late || 0}</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Arrived after cutoff</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-500">
              <Clock size={20} />
            </div>
          </div>
        </Card>

        <Card padding="p-5" className="bg-white dark:bg-gray-900 border-none shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">Avg Attendance</p>
              <h3 className="text-2xl font-bold text-indigo-600">{stats.averageAttendance}%</h3>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600">
              <TrendingUp size={20} />
            </div>
          </div>
        </Card>
      </div>

       {/* Filters */}
      <Card padding="p-3 md:p-4" className="mb-6 border-none shadow-sm bg-white dark:bg-gray-900">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 md:gap-4 w-full md:w-auto">
            {viewMode === 'logs' && (
              <div className="flex-1 min-w-[140px] md:flex-none">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Select Date</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full px-3 py-2 md:py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 text-xs font-bold font-mono outline-none"
                />
              </div>
            )}

            <div className="flex-1 min-w-[140px] md:flex-none">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Status Filter</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 md:py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 text-xs font-bold outline-none appearance-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half-day">Half Day</option>
                <option value="on-leave">On Leave</option>
              </select>
            </div>

            <div className="flex-1 min-w-[140px] md:flex-none">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Staff Member</label>
              <select
                value={filterStaff}
                onChange={(e) => setFilterStaff(e.target.value)}
                className="w-full px-3 py-2 md:py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 text-xs font-bold outline-none appearance-none cursor-pointer"
              >
                <option value="">All Personnel</option>
                {staffList.map((s: any) => (
                  <option key={s.user?._id || s._id} value={s.user?._id || s._id}>
                    {s.user?.name || s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative w-full md:w-auto mt-2 md:mt-0">
            <Button
              variant="primary"
              onClick={() => { setShowExportMenu(!showExportMenu); setShowDateRangePicker(false); }}
              className="w-full flex items-center justify-center gap-2 px-6 py-2.5 md:py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 active:scale-95 transition-all"
            >
              <FileSpreadsheet size={16} />
              Generate Report
              <ChevronDown size={14} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
            </Button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => { setShowExportMenu(false); setShowDateRangePicker(false); }}
                />
                <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 py-2 backdrop-blur-lg overflow-hidden">
                  <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-50 dark:border-gray-700 mb-1">Select Report Type</p>
                  {[
                    { key: 'consolidated', label: 'Consolidated Summary' },
                    { key: 'today', label: "Today's Attendance" },
                    { key: 'weekly', label: 'Last 7 Days' },
                    { key: 'monthly', label: 'Monthly Logs' },
                    { key: 'yearly', label: 'Yearly Logs' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => exportData(item.key as any)}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors flex items-center justify-between"
                    >
                      {item.label}
                      <Download size={14} className="opacity-40" />
                    </button>
                  ))}

                  {/* Custom Date Range section */}
                  <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                    <button
                      onClick={() => setShowDateRangePicker(prev => !prev)}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 transition-colors flex items-center gap-2"
                    >
                      <CalendarRange size={14} />
                      Custom Date Range
                      <ChevronDown size={12} className={`ml-auto transition-transform ${showDateRangePicker ? 'rotate-180' : ''}`} />
                    </button>

                    {showDateRangePicker && (
                      <div className="px-4 pb-3 space-y-2" onClick={e => e.stopPropagation()}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">From</label>
                            <input
                              type="date"
                              value={customRange.from}
                              max={customRange.to}
                              onChange={e => setCustomRange(r => ({ ...r, from: e.target.value }))}
                              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">To</label>
                            <input
                              type="date"
                              value={customRange.to}
                              min={customRange.from}
                              max={new Date().toISOString().split('T')[0]}
                              onChange={e => setCustomRange(r => ({ ...r, to: e.target.value }))}
                              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                        </div>
                        <button
                          onClick={exportCustomRange}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          <Download size={13} /> Export Range
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {loading && (
        <div className="fixed inset-0 bg-white/60 dark:bg-gray-950/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-xs font-bold text-indigo-600">Updating records...</p>
          </div>
        </div>
      )}

      {/* Data Representation */}
      <Card padding="p-0" className="overflow-hidden border border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 shadow-sm">
        <div className="overflow-x-auto">
          {viewMode === 'summary' ? (
            <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Staff Member</th>
                  <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Designation</th>
                  <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Today's Pulse</th>
                  <th className="py-4 px-3 md:px-6 text-center text-xs font-bold text-gray-400">Monthly Stats</th>
                  <th className="py-4 px-3 md:px-6 text-center text-xs font-bold text-gray-400">Yearly Stats</th>
                  <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Daily Timing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {summary.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center">
                        <Users className="text-gray-200 dark:text-gray-800 mb-4" size={48} />
                        <p className="text-xs font-bold text-gray-400">No staff found for this period</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  summary
                    .filter(s => (!filterStaff || s.userId === filterStaff) && (!filterStatus || s.todayStatus === filterStatus))
                    .map((s) => (
                      <SummaryRow key={s.userId} data={s} />
                    ))
                )}
              </tbody>
            </table></div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full">
                <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Staff Unit</th>
                    <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Date</th>
                    <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Check-In</th>
                    <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Check-Out</th>
                    <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Duration</th>
                    <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <div className="flex flex-col items-center">
                          <Calendar className="text-gray-200 mb-4" size={48} />
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Nulled Records in this quadrant</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedAttendance.map((record) => (
                      <AttendanceRow
                        key={record._id}
                        record={record}
                      />
                    ))
                  )}
                </tbody>
              </table></div>

              {/* Pagination */}
              {totalPages > 1 && viewMode === 'logs' && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 md:p-8 bg-gray-50/30 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 md:px-8 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-30 active:scale-95 shadow-sm order-2 sm:order-1"
                  >
                    <ChevronLeft size={16} /> Previous Quadrant
                  </button>
                  <div className="flex items-center gap-4 order-1 sm:order-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">
                      Sector {page} <span className="mx-2 opacity-20">/</span> {totalPages}
                    </span>
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 md:px-8 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-30 active:scale-95 shadow-sm order-3"
                  >
                    Next Quadrant <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ✅ PERFORMANCE: Memoized component
export default React.memo(AttendanceClient);
