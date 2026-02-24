"use client";

import React, { useState } from "react";
import {
  Trophy,
  Calendar,
  Users,
  ChevronRight,
  Search,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useHRPerformanceDashboard, useHRDoctorPerformanceDashboard } from "@/lib/integrations/hooks";

export default function PerformancePage() {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch performance data using new hooks
  const { data: performanceData, isLoading } = useHRPerformanceDashboard({ month, year });
  const { data: doctorPerformanceData } = useHRDoctorPerformanceDashboard({ month, year });
  
  // Combine data
  const combinedData = performanceData ? {
    ...performanceData,
    doctors: doctorPerformanceData?.data?.topPerformingDoctors || [],
    stats: {
      ...performanceData.data.stats,
      avgDoctorAttendanceRate: doctorPerformanceData?.data?.stats?.avgAttendanceRate,
    }
  } : null;
  
  // Get top performers
  const topPerformers = {
    doctors: doctorPerformanceData?.data?.topPerformingDoctors?.[0],
    nurses: performanceData?.data?.topPerformers?.nurses?.[0],
    staff: performanceData?.data?.topPerformers?.staff?.[0]
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return "text-emerald-600 bg-emerald-50";
    if (rate >= 80) return "text-amber-600 bg-amber-50";
    return "text-rose-600 bg-rose-50";
  };

  const PerformanceTable = ({ title, data }: { title: string; data: any[] }) => {
    const filtered = data.filter((p: any) =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filtered.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-4">
           <div className="h-8 w-1.5 bg-indigo-600 rounded-full" />
           <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">{title}</h2>
           <span className="text-[10px] font-black text-white bg-indigo-600 px-2 py-0.5 rounded-full">{filtered.length}</span>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="p-6 pl-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                  <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Attendance</th>
                  <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Days Breakdown</th>
                  <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Performance</th>
                  <th className="p-6 text-right pr-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((perf: any) => (
                  <tr key={perf._id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-6 pl-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-sm text-white shadow-lg overflow-hidden ring-4 ring-gray-50">
                          {perf.image ? (
                            <img src={perf.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            perf.name?.charAt(0) || "U"
                          )}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{perf.name}</p>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{perf.role} • {perf.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <div className="space-y-2">
                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${getAttendanceColor(perf.attendance.rate)}`}>
                          <Clock size={10} />
                          {perf.attendance.rate}%
                        </div>
                        <p className="text-[8px] font-black text-gray-500 uppercase">{perf.attendance.presentDays} of {perf.attendance.totalDays} Working Days</p>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <div className="space-y-1">
                        <div className="flex justify-center gap-2 text-[8px] font-black text-gray-500">
                          <span className="flex items-center gap-1">
                            <CheckCircle size={8} className="text-emerald-500" /> {perf.attendance.presentDays}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={8} className="text-amber-500" /> {perf.attendance.lateDays}
                          </span>
                          <span className="flex items-center gap-1">
                            <XCircle size={8} className="text-rose-500" /> {perf.attendance.absentDays}
                          </span>
                        </div>
                        <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden max-w-[100px] mx-auto">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" 
                            style={{ 
                              width: `${(perf.attendance.presentDays / perf.attendance.totalDays) * 100}%`,
                              background: `linear-gradient(to right, #10b981 ${(perf.attendance.presentDays / perf.attendance.totalDays) * 100}%, #f59e0b ${(perf.attendance.presentDays / perf.attendance.totalDays) * 100}%, #f43f5e 100%)`
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-600">
                        <BarChart3 size={10} />
                        {perf.compositeScore?.toFixed(2)}
                      </div>
                    </td>
                    <td className="p-6 text-right pr-8">
                      <div className="text-[9px] font-black text-gray-500 uppercase flex flex-col items-end gap-1">
                        {perf.role === 'doctor' ? (
                          <>
                            <span>{perf.appointmentCount || 0} Apps</span>
                            <span>{perf.prescriptionCount || 0} Presc</span>
                          </>
                        ) : (
                          <span>{perf.additionalMetrics?.taskCompletionRate || 0} Tasks</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const stats = [
    {
      label: "Total Staff",
      value: combinedData?.data?.stats?.totalStaff || 0,
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Avg Attendance",
      value: `${combinedData?.data?.stats?.avgAttendanceRate || 0}%`,
      icon: Clock,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "High Performers",
      value: combinedData?.data?.stats?.highPerformers || 0,
      icon: Trophy,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Low Attendance",
      value: combinedData?.data?.stats?.attendanceBelow70 || 0,
      icon: XCircle,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Attendance Analytics</h1>
          <p className="text-gray-500 font-medium">Fully automated attendance tracking & data-driven performance metrics.</p>
        </div>
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="bg-transparent border-none focus:ring-0 font-bold text-gray-700 text-xs appearance-none pr-8 cursor-pointer uppercase tracking-widest"
          >
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
               <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <div className="h-4 w-px bg-gray-200 mx-1" />
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="bg-transparent border-none focus:ring-0 font-bold text-gray-700 text-xs appearance-none pr-8 cursor-pointer uppercase tracking-widest"
          >
            {[2023, 2024, 2025, 2026].map(y => (
               <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="h-4 w-px bg-gray-200 mx-2" />
          <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Calendar size={14} /> {new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
         {topPerformers?.doctors && (
            <div className="flex-1 bg-indigo-900 rounded-3xl p-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4">
                  <Trophy className="w-12 h-12 text-indigo-400/20 group-hover:scale-110 transition-transform" />
               </div>
               <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-4">Top Performer • Doctor</p>
               <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center font-black text-xl text-white">
                    {topPerformers.doctors.name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase">{topPerformers.doctors.name}</h3>
                    <p className="text-indigo-400 text-[10px] font-black uppercase">{topPerformers.doctors.role}</p>
                  </div>
               </div>
               <div className="mt-6 flex gap-4">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">Attendance</p>
                    <p className="text-lg font-black text-white">{topPerformers.doctors.attendance?.rate}%</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">Present Days</p>
                    <p className="text-lg font-black text-white">{topPerformers.doctors.attendance?.presentDays}/{topPerformers.doctors.attendance?.totalDays}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">Score</p>
                    <p className="text-lg font-black text-white">{topPerformers.doctors.compositeScore?.toFixed(2)}</p>
                  </div>
               </div>
            </div>
         )}
         {topPerformers?.nurses && (
            <div className="flex-1 bg-emerald-900 rounded-3xl p-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4">
                  <Trophy className="w-12 h-12 text-emerald-400/20 group-hover:scale-110 transition-transform" />
               </div>
               <p className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.2em] mb-4">Top Performer • Nurse</p>
               <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center font-black text-xl text-white">
                    {topPerformers.nurses.name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase">{topPerformers.nurses.name}</h3>
                    <p className="text-emerald-400 text-[10px] font-black uppercase">{topPerformers.nurses.role}</p>
                  </div>
               </div>
               <div className="mt-6 flex gap-4">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[8px] font-black text-emerald-400 uppercase mb-1">Attendance</p>
                    <p className="text-lg font-black text-white">{topPerformers.nurses.attendance?.rate}%</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[8px] font-black text-emerald-400 uppercase mb-1">Present Days</p>
                    <p className="text-lg font-black text-white">{topPerformers.nurses.attendance?.presentDays}/{topPerformers.nurses.attendance?.totalDays}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[8px] font-black text-emerald-400 uppercase mb-1">Score</p>
                    <p className="text-lg font-black text-white">{topPerformers.nurses.compositeScore?.toFixed(2)}</p>
                  </div>
               </div>
            </div>
         )}
      </div>

      <div className="relative max-w-md w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by staff name..."
          className="w-full pl-12 pr-6 py-3 bg-white border-none rounded-2xl font-bold text-[11px] uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
        />
      </div>

      {isLoading ? (
        <div className="p-20 flex flex-col items-center justify-center gap-4 text-gray-400">
           <Loader2 size={40} className="animate-spin text-indigo-500" />
           <p className="text-[10px] font-black uppercase tracking-[0.2em]">Loading Performance Data...</p>
        </div>
      ) : (
        <div className="space-y-12">
           <PerformanceTable title="Doctor Performance Analytics" data={doctorPerformanceData?.data?.topPerformingDoctors || []} />
           <PerformanceTable title="Nurse Performance Analytics" data={combinedData?.data?.topPerformers?.nurses || []} />
           <PerformanceTable title="Staff Performance Analytics" data={combinedData?.data?.topPerformers?.staff || []} />

           {(!doctorPerformanceData?.data?.topPerformingDoctors && 
            !combinedData?.data?.topPerformers?.nurses && 
            !combinedData?.data?.topPerformers?.staff) && (
             <div className="p-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-200">
                   <Trophy size={32} />
                </div>
                <div>
                   <h3 className="text-sm font-black text-gray-900 uppercase">No performance data found</h3>
                   <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Data is automatically generated based on attendance and activity.</p>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
}

