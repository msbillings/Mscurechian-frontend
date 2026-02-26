"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import dynamic from 'next/dynamic';
import Link from 'next/link';

// ✅ CRITICAL: Dynamic import must be at MODULE level (outside component)
// If placed inside the component, React recreates a new component type on every render,
// causing the modal to unmount/remount on each 10-second data refetch.
const ReminderConfigModal = dynamic(
  () => import('./components/ReminderConfigModal'),
  { ssr: false }
);

import {
  Users,
  Building2,
  Stethoscope,
  Activity,
  Clock,
  ArrowUpRight,
  Wallet,
  CalendarCheck,
  BedDouble,
  AlertCircle,
  RefreshCw,
  Monitor,
  TestTube,
  Pill,
  Headphones,
  BellRing
} from "lucide-react";
import { Card } from "@/components/admin";
import LiveFeedbackWidget from './components/LiveFeedbackWidget';

// Dynamic import for charts
const AttendancePieChart = dynamic(
  () => import('@/components/charts/OptimizedCharts').then(mod => mod.AttendancePieChart),
  {
    ssr: false, // Don't render on server
    loading: () => (
      <div className="h-[180px] w-full flex items-center justify-center">
        <div className="h-8 w-8 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }
);

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

function HospitalAdminDashboard() {
  const [range, setRange] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("all");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);


  const getMetricDetails = (label: string) => {
    const totalStaff = stats.totalDoctors + stats.totalNurses + stats.totalStaff;
    const attendanceRate = totalStaff > 0 ? Math.round((stats.attendance?.present || 0) / totalStaff * 100) : 0;

    const details: Record<string, { items: { label: string, value: string | number }[], insight: string }> = {
      "Active Doctors": {
        items: [
          { label: "Total Active", value: stats.totalDoctors || 0 },
          { label: "Present Today", value: Math.round((stats.totalDoctors || 0) * attendanceRate / 100) },
          { label: "On Leave", value: stats.attendance?.onLeave || 0 },
          { label: "Appointments", value: stats.totalAppointments || 0 }
        ],
        insight: `${stats.totalDoctors || 0} doctors available. Attendance rate: ${attendanceRate}%`
      },
      "Active Nurses": {
        items: [
          { label: "Total Nurses", value: stats.totalNurses || 0 },
          { label: "On Duty", value: Math.round((stats.totalNurses || 0) * attendanceRate / 100) },
          { label: "Total Staff", value: stats.totalStaff || 0 },
          { label: "Support Desk", value: stats.totalHelpdesk || 0 }
        ],
        insight: `Nursing staff at ${attendanceRate}% capacity with ${stats.totalNurses || 0} active nurses.`
      },
      "Total Patients": {
        items: [
          { label: "Total Patients", value: stats.totalPatients || 0 },
          { label: "Appointments", value: stats.totalAppointments || 0 },
          { label: "Inpatients", value: stats.totalInpatients || 0 },
          { label: "Admissions", value: stats.totalAdmissions || 0 }
        ],
        insight: `${stats.totalPatients || 0} registered patients with ${stats.totalInpatients || 0} currently admitted.`
      },
      "Bed Occupancy": {
        items: [
          { label: "Occupancy", value: `${stats.bedOccupancy || 0}%` },
          { label: "Inpatients", value: stats.totalInpatients || 0 },
          { label: "Admissions", value: stats.totalAdmissions || 0 },
          { label: "Available", value: `${100 - (stats.bedOccupancy || 0)}%` }
        ],
        insight: stats.bedOccupancy >= 80
          ? `High occupancy at ${stats.bedOccupancy}%. Consider capacity planning.`
          : `Occupancy at ${stats.bedOccupancy}%. Capacity is ${stats.bedOccupancy < 50 ? 'optimal' : 'moderate'}.`
      },
      "Avg. Patient Wait": {
        items: [
          { label: "Average Wait", value: `${stats.avgPatientWaitTime || 0}m` },
          { label: "Active Queue", value: stats.totalAppointments || 0 },
          { label: "Lab Orders", value: stats.totalLabRequests || 0 },
          { label: "Pharmacy", value: stats.totalPharmaSales || 0 }
        ],
        insight: stats.avgPatientWaitTime > 30
          ? `Wait time of ${stats.avgPatientWaitTime}m is above target. Monitor queue.`
          : `Wait time of ${stats.avgPatientWaitTime}m is within acceptable range.`
      },
      "Avg. Consultation": {
        items: [
          { label: "Average Time", value: `${stats.avgConsultationTime || 0}m` },
          { label: "Appointments", value: stats.totalAppointments || 0 },
          { label: "Doctors", value: stats.totalDoctors || 0 },
          { label: "Per Doctor", value: stats.totalDoctors > 0 ? Math.round((stats.totalAppointments || 0) / stats.totalDoctors) : 0 }
        ],
        insight: `Average consultation ${stats.avgConsultationTime || 0} minutes with ${stats.totalAppointments || 0} active appointments.`
      },
      "Lab Activity": {
        items: [
          { label: "Total Orders", value: stats.totalLabRequests || 0 },
          { label: "Today", value: stats.totalLabRequests || 0 },
          { label: "Revenue", value: `₹${(stats.revenue || 0).toLocaleString()}` },
          { label: "Active Patients", value: stats.totalPatients || 0 }
        ],
        insight: `${stats.totalLabRequests || 0} lab orders processed. Activity is ${stats.totalLabRequests > 10 ? 'high' : 'moderate'}.`
      },
      "Pharma Throughput": {
        items: [
          { label: "Sales Today", value: stats.totalPharmaSales || 0 },
          { label: "Revenue", value: `₹${(stats.revenue || 0).toLocaleString()}` },
          { label: "Inpatient", value: stats.totalInpatients || 0 },
          { label: "Outpatient", value: stats.totalAppointments || 0 }
        ],
        insight: `${stats.totalPharmaSales || 0} pharmacy transactions. Revenue: ₹${(stats.revenue || 0).toLocaleString()}`
      },
      "Daily Admissions": {
        items: [
          { label: "Total Today", value: stats.totalAdmissions || 0 },
          { label: "Currently Admitted", value: stats.totalInpatients || 0 },
          { label: "Bed Occupancy", value: `${stats.bedOccupancy || 0}%` },
          { label: "Available", value: `${100 - (stats.bedOccupancy || 0)}%` }
        ],
        insight: `${stats.totalAdmissions || 0} admissions today with ${stats.totalInpatients || 0} patients currently admitted.`
      },
      "Monthly Revenue": {
        items: [
          { label: "Total Revenue", value: `₹${(stats.revenue || 0).toLocaleString()}` },
          { label: "Appointments", value: stats.totalAppointments || 0 },
          { label: "Lab Orders", value: stats.totalLabRequests || 0 },
          { label: "Pharmacy", value: stats.totalPharmaSales || 0 }
        ],
        insight: `Revenue: ₹${(stats.revenue || 0).toLocaleString()} from ${stats.totalAppointments + stats.totalLabRequests + stats.totalPharmaSales} transactions.`
      }
    };
    return details[label] || { items: [], insight: "" };
  };

  // Fetch doctors for the filter
  const { data: doctorsData } = useQuery<any>({
    queryKey: ['hospital-admin', 'doctors-list'],
    queryFn: async () => {
      const resp = await hospitalAdminService.getDoctors();
      return resp;
    },
    staleTime: 0,
  });

  // Main dashboard data
  const { data: dashboardData, isLoading, error, refetch, isFetching } = useQuery<any>({
    queryKey: ['hospital-admin', 'dashboard', range, startDate, endDate, selectedDoctorId],
    queryFn: async () => {
      const data = await hospitalAdminService.getDashboard({
        range,
        startDate,
        endDate,
        doctorId: selectedDoctorId === 'all' ? undefined : selectedDoctorId
      });
      return data;
    },
    staleTime: 5000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchInterval: 10000, // Poll every 10 seconds for live updates
    refetchOnWindowFocus: true,
    placeholderData: (previousData: any) => previousData, // Keep showing old data while fetching new data
  });



  const { hospital = {}, stats = {} } = dashboardData || {};

  // Memoized stat cards with real data
  const primaryStats = useMemo(() => [
    {
      label: "Active Doctors",
      value: stats.totalDoctors || 0,
      icon: Stethoscope,
      color: "emerald",
      href: "/hospital-admin/doctors"
    },
    {
      label: "Active Nurses",
      value: stats.totalNurses || 0,
      icon: Activity,
      color: "blue",
      href: "/hospital-admin/nurses"
    },
    {
      label: "Total Patients",
      value: stats.totalPatients || 0,
      icon: Users,
      color: "indigo",
      href: "/hospital-admin/patients"
    },
    {
      label: "Bed Occupancy",
      value: `${stats.bedOccupancy || 0}%`,
      icon: BedDouble,
      color: "rose",
      href: "/hospital-admin/hospital"
    }
  ], [stats]);

  const performanceStats = useMemo(() => [
    {
      label: "Avg. Patient Wait",
      value: `${stats.avgPatientWaitTime || 0} min`,
      icon: Clock,
      color: "amber",
    },
    {
      label: "Avg. Consultation",
      value: `${stats.avgConsultationTime || 15} min`,
      icon: Stethoscope,
      color: "emerald",
    },
    {
      label: "Lab Activity",
      value: stats.totalLabRequests || 0,
      icon: TestTube,
      color: "indigo",
    },
    {
      label: "Pharma Throughput",
      value: stats.totalPharmaSales || 0,
      icon: Pill,
      color: "rose",
    },
    {
      label: "Daily Admissions",
      value: stats.totalAdmissions || 0,
      icon: CalendarCheck,
      color: "blue",
    },
    {
      label: "Monthly Revenue",
      value: `₹${(stats.revenue || 0).toLocaleString()}`,
      icon: Wallet,
      color: "emerald",
    }
  ], [stats]);

  // Attendance chart data
  const attendanceChartData = useMemo(() => {
    const data = [
      { name: 'Present', value: stats.attendance?.present || 0 },
      { name: 'Late', value: stats.attendance?.late || 0 },
      { name: 'Absent', value: stats.attendance?.absent || 0 },
      { name: 'On Leave', value: stats.attendance?.onLeave || 0 },
    ].filter(d => d.value > 0);
    return data.length === 0 ? [{ name: 'No Data', value: 1 }] : data;
  }, [stats.attendance]);



  // Show error state only when there's an error and no cached data
  if (error && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500 font-medium">Failed to load dashboard data</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show skeleton on initial load with refined aesthetics
  if (isLoading && !dashboardData) {
    return (
      <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 rounded-xl animate-pulse"></div>
            <div className="h-4 w-40 bg-slate-100 rounded-lg animate-pulse"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-slate-200 rounded-xl animate-pulse"></div>
            <div className="h-10 w-10 bg-slate-200 rounded-xl animate-pulse"></div>
          </div>
        </div>

        {/* Primary Metrics Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white border border-slate-100 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-slate-100 rounded-xl animate-pulse"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-20 bg-slate-100 rounded animate-pulse"></div>
                  <div className="h-6 w-12 bg-slate-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-white border border-slate-100 rounded-2xl animate-pulse shadow-sm"></div>
              ))}
            </div>
            <div className="h-64 bg-white border border-slate-100 rounded-2xl animate-pulse shadow-sm"></div>
          </div>
          <div className="space-y-6">
            <div className="h-40 bg-white border border-slate-100 rounded-2xl animate-pulse shadow-sm"></div>
            <div className="h-96 bg-white border border-slate-100 rounded-2xl animate-pulse shadow-sm"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Simple Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1">
            <Building2 className="w-3 h-3" /> {hospital?.name || "Hospital Management System"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Range Filter */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {[
              { key: 'today', label: 'Today' },
              { key: '7days', label: '7 Days' },
              { key: 'month', label: 'Month' },
              { key: '3months', label: '3 Months' },
              { key: 'custom', label: 'Custom' },
            ].map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${range === r.key
                  ? 'bg-primary-theme text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {range === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
              />
              <span className="w-2 h-px bg-slate-200"></span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="text-[9px] font-black uppercase tracking-widest">Reload</span>
            </button>
            <button
              onClick={() => setIsReminderModalOpen(true)}
              className="p-2 bg-slate-900 text-white border border-slate-900 rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span className="text-[9px] font-black uppercase tracking-widest">Reminder Settings</span>
            </button>
            <div className="px-3 py-1.5 bg-emerald-50 rounded-xl flex items-center gap-2 border border-emerald-100/50">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Live Flow</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {primaryStats.map((stat, index) => {
          const details = getMetricDetails(stat.label);
          const isHovered = hoveredCard === stat.label;
          return (
            <div
              key={index}
              className="relative group h-full"
              onMouseEnter={() => setHoveredCard(stat.label)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <Link href={stat.href} className="block h-full">
                <Card className={`p-6 border-slate-200 shadow-sm transition-all h-full bg-white relative z-20 ${isHovered ? 'border-slate-300 ring-2 ring-slate-100' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-colors ${stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                      stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                        stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                          'bg-rose-50 text-rose-600'
                      }`}>
                      <stat.icon size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                      <h3 className="text-2xl font-black text-slate-900 leading-tight">{stat.value}</h3>
                    </div>
                  </div>
                </Card>
              </Link>

              {/* Floating Detail Card */}
              {isHovered && (
                <div className="absolute top-full left-0 right-0 mt-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 w-full min-w-[280px]">
                  <div className="absolute -top-2 left-8 w-4 h-4 bg-white border-t border-l border-slate-100 transform rotate-45"></div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${stat.color === 'emerald' ? 'bg-emerald-500' :
                      stat.color === 'blue' ? 'bg-blue-500' :
                        stat.color === 'indigo' ? 'bg-indigo-500' : 'bg-rose-500'
                      }`}></div>
                    {stat.label} Breakdown
                  </h4>
                  <div className="space-y-3 mb-4">
                    {details.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-500">{item.label}</span>
                        <span className="font-black text-slate-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic">
                      "{details.insight}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Performance & Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Metrics */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {performanceStats.map((stat, index) => (
            <Card key={index} className="p-6 border-slate-100 shadow-sm bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <h4 className="text-xl font-black text-slate-900">{stat.value}</h4>
                </div>
                <div className={`p-2 rounded-lg ${stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                  stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                    stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                      stat.color === 'rose' ? 'bg-rose-50 text-rose-600' :
                        'bg-blue-50 text-blue-600'
                  }`}>
                  <stat.icon size={18} />
                </div>
              </div>
            </Card>
          ))}

          <div className="sm:col-span-2">
            <LiveFeedbackWidget />
          </div>
        </div>

        {/* Workforce & Attendance */}
        <div className="flex flex-col gap-6">
          <Card className="p-6 border-slate-200 shadow-sm bg-white">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Workforce Pulse</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Users size={16} /></div>
                  <span className="text-xs font-bold text-slate-600 uppercase">Support Staff</span>
                </div>
                <span className="text-sm font-black text-slate-900">{stats.totalStaff || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Headphones size={16} /></div>
                  <span className="text-xs font-bold text-slate-600 uppercase">Information Desk</span>
                </div>
                <span className="text-sm font-black text-slate-900">{stats.totalHelpdesk || 0}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-slate-200 shadow-sm bg-white flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Attendance Flow</h3>
              <Link href="/hospital-admin/attendance/overview" className="text-emerald-600 hover:text-emerald-700">
                <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="flex-1 flex items-center justify-center min-h-[160px]">
              <AttendancePieChart
                data={attendanceChartData}
                colors={CHART_COLORS}
                centerValue={stats.attendance?.present || 0}
                centerLabel="Present"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Present</p>
                <p className="text-base font-black text-slate-900">{stats.attendance?.present || 0}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase">On Leave</p>
                <p className="text-base font-black text-slate-900">{stats.attendance?.onLeave || 0}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Clinical Registry - More Proper Details */}
      <Card className="p-6 border-slate-200 shadow-sm bg-white rounded-2xl relative">
        {/* Loading Overlay - Subtle and Fast */}
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] rounded-2xl z-50 flex items-center justify-center transition-all">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg border border-slate-100">
              <div className="h-4 w-4 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-[10px] font-bold text-slate-500">Refreshing...</p>
            </div>
          </div>
        )}

        <div className="flex flex-col mb-8 gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Real-time Clinical Registry</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2 mt-1">
                <span className="w-1.5 h-1.5 bg-primary-theme rounded-full animate-pulse"></span>
                In-Flow Monitoring Active • {selectedDoctorId !== 'all' ? `Filtering by Consultant` : 'All Departments'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[9px] font-black text-slate-400 uppercase">Current Load</p>
                <p className="text-xs font-black text-slate-900">
                  {dashboardData?.liveQueue?.length > 7 ? 'High' : dashboardData?.liveQueue?.length > 3 ? 'Moderate' : 'Optimal'}
                </p>
              </div>
              <div className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100 flex items-center gap-3">
                <div>
                  <p className="text-[9px] font-black text-white/60 uppercase">Live Queue</p>
                  <p className="text-xs font-black">{dashboardData?.liveQueue?.length || 0} Entities</p>
                </div>
                <Monitor size={16} className="text-white/40" />
              </div>
            </div>
          </div>

          {/* Doctor Switcher */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedDoctorId('all')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${selectedDoctorId === 'all'
                ? 'bg-primary-theme text-white border-primary-theme shadow-md'
                : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                }`}
            >
              All Doctors
            </button>
            {(Array.isArray(doctorsData?.doctors) ? doctorsData.doctors : []).map((doc: any) => {
              const profileId = doc.doctorProfileId || doc._id;
              const doctorName = doc.name || doc.user?.name || "Doctor";
              return (
                <button
                  key={doc._id}
                  onClick={() => setSelectedDoctorId(profileId)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${selectedDoctorId === profileId
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                    }`}
                >
                  {doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {(dashboardData?.liveQueue || []).length > 0 ? (
            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
              <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 bg-white/50">
                <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</div>
                <div className="col-span-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Subject</div>
                <div className="col-span-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultant</div>
                <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Time</div>
              </div>
              <div className="divide-y divide-slate-50">
                {dashboardData.liveQueue.map((item: any, i: number) => (
                  <div
                    key={item._id || i}
                    className={`grid grid-cols-12 gap-4 px-6 py-5 items-center transition-all hover:bg-white group ${item.status === 'in-progress' ? 'bg-blue-50/30' : 'bg-white/30'
                      }`}
                  >
                    <div className="col-span-2">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${item.status === 'in-progress' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' :
                        item.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                          item.status === 'Booked' ? 'bg-indigo-100 text-indigo-700' :
                            item.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="col-span-4">
                      <p className="text-sm font-black text-slate-900 uppercase group-hover:text-blue-600 transition-colors">{item.patientName}</p>
                    </div>

                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-black group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        {item.doctorName ? item.doctorName.split(' ').pop()?.substring(0, 2).toUpperCase() : 'DR'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{item.doctorName}</p>
                      </div>
                    </div>

                    <div className="col-span-2 text-right">
                      <span className="text-[11px] font-black text-slate-900 group-hover:text-blue-600 transition-colors flex items-center justify-end gap-2">
                        <Clock size={12} className="text-slate-400" strokeWidth={3} /> {item.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-white/50">
              <Monitor size={32} className="mx-auto text-slate-200 mb-4" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">No active clinical activity detected</p>
            </div>
          )}
        </div>
      </Card>

      <ReminderConfigModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
      />
    </div>
  );
}

export default React.memo(HospitalAdminDashboard);
