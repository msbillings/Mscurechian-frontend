"use client";

import React, { useState, useMemo } from 'react';
import {
   Clock,
   Calendar,
   Search,
   Filter,
   User as UserIcon,
   ArrowRight,
   ChevronLeft,
   ChevronRight,
   TrendingUp,
   UserCheck,
   UserX,
   Clock8,
   CalendarDays,
   Download,
   RefreshCw,
   MapPin,
   Monitor,
   ShieldCheck,
   Hospital
} from 'lucide-react';
import { useHRAttendance } from '@/lib/integrations/hooks';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
   present: { label: 'Present', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: UserCheck },
   late: { label: 'Late Arrival', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: Clock8 },
   absent: { label: 'Absent', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', icon: UserX },
   'on-leave': { label: 'On Leave', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: CalendarDays },
   'off-duty': { label: 'Off Duty', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-100', icon: Hospital },
};

const ITEMS_PER_PAGE = 10;

export default function AttendancePage() {
   const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
   const [page, setPage] = useState(1);
   const [filterRole, setFilterRole] = useState('all');
   const [filterStatus, setFilterStatus] = useState('all');
   const [searchTerm, setSearchTerm] = useState('');

   const { data: attendanceResponse, isLoading, refetch, isRefetching } = useHRAttendance({
      date,
      page,
      limit: ITEMS_PER_PAGE,
      role: filterRole,
      status: filterStatus
   });

   const logs = attendanceResponse?.data || [];
   const stats = attendanceResponse?.stats || { total: 0, present: 0, late: 0, absent: 0, onLeave: 0 };
   const pagination = attendanceResponse?.pagination;

   const handleExport = () => {
      toast.success("Preparing high-fidelity attendance directory export...");
      // Logic for CSV/PDF export would go here
   };

   return (
      <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen pb-20">
         {/* Top Navigation & Actions */}
         <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="space-y-1">
               <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                  <ShieldCheck className="text-indigo-600 w-8 h-8" />
                  Clock Intelligence Registry
               </h1>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Node: Personnel Monitoring & Compliance Portal
               </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
               <div className="bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center">
                  <div className="px-4 py-2 flex items-center gap-3 border-r border-gray-50 dark:border-gray-700">
                     <Calendar className="w-4 h-4 text-indigo-500" />
                     <input
                        type="date"
                        className="bg-transparent border-none focus:ring-0 font-black text-[10px] text-gray-700 dark:text-gray-300 uppercase tracking-widest outline-none"
                        value={date}
                        onChange={(e) => {
                           setDate(e.target.value);
                           setPage(1);
                        }}
                     />
                  </div>
                  <button 
                     onClick={() => refetch()}
                     className="p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all text-gray-400 hover:text-indigo-600 active:scale-95"
                  >
                     <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
                  </button>
               </div>

               <button 
                  onClick={handleExport}
                  className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-700 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
               >
                  <Download size={14} /> Export Directory
               </button>
            </div>
         </div>

         {/* Executive Stats Summary */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[
               { label: 'Total Personnel', value: stats.total, icon: UserIcon, color: 'text-gray-900', bg: 'bg-white', border: 'border-gray-100' },
               { label: 'Active Present', value: stats.present, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50/30', border: 'border-emerald-100/50' },
               { label: 'Tardy Arrival', value: stats.late, icon: Clock8, color: 'text-amber-600', bg: 'bg-amber-50/30', border: 'border-amber-100/50' },
               { label: 'Absent Warning', value: stats.absent, icon: UserX, color: 'text-rose-600', bg: 'bg-rose-50/30', border: 'border-rose-100/50' },
               { label: 'Approved Leave', value: stats.onLeave, icon: CalendarDays, color: 'text-blue-600', bg: 'bg-blue-50/30', border: 'border-blue-100/50' },
            ].map((stat, i) => (
               <div key={i} className={`${stat.bg} p-5 rounded-3xl border ${stat.border} shadow-sm group hover:shadow-md transition-all`}>
                  <div className="flex items-center justify-between mb-4">
                     <div className={`p-2.5 rounded-xl bg-white dark:bg-gray-800 shadow-sm ${stat.color}`}>
                        <stat.icon size={18} />
                     </div>
                     <TrendingUp className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <h3 className={`text-2xl font-black ${stat.color} tracking-tighter`}>{stat.value}</h3>
               </div>
            ))}
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

            <div className="flex items-center gap-3 w-full lg:w-auto">
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
         </div>

         {/* Hybrid Data Grid */}
         <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden min-h-[500px] flex flex-col">
            <div className="overflow-x-auto flex-1">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-700">
                        <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Personnel Identity</th>
                        <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Departmental Logic</th>
                        <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Clock Dynamics</th>
                        <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Active Duration</th>
                        <th className="p-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Network Status</th>
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
                                          <p className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-tight">{log.user?.name}</p>
                                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">#{log.user?.employeeId || 'UNREGISTERED'}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="p-6">
                                    <div className="flex flex-col gap-1">
                                       <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{log.user?.role?.replace('-', ' ')}</span>
                                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Hospital Primary Node</span>
                                    </div>
                                 </td>
                                 <td className="p-6">
                                    <div className="flex items-center gap-4">
                                       <div className="flex flex-col">
                                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Clock In</span>
                                          <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${log.checkIn ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'} uppercase`}>
                                             {log.checkIn ? format(new Date(log.checkIn), 'HH:mm:ss') : '--:--:--'}
                                          </span>
                                       </div>
                                       <ArrowRight className="w-4 h-4 text-gray-300 mt-4" />
                                       <div className="flex flex-col">
                                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Clock Out</span>
                                          <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${log.checkOut ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-gray-100 text-gray-400'} uppercase`}>
                                             {log.checkOut ? format(new Date(log.checkOut), 'HH:mm:ss') : '--:--:--'}
                                          </span>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="p-6">
                                    <div className="flex items-center gap-2">
                                       <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                       {log.checkIn && log.checkOut ? (
                                          <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                             {Math.floor((new Date(log.checkOut).getTime() - new Date(log.checkIn).getTime()) / (1000 * 60 * 60))}h {Math.floor(((new Date(log.checkOut).getTime() - new Date(log.checkIn).getTime()) / (1000 * 60)) % 60)}m
                                          </span>
                                       ) : (
                                          <span className="text-[11px] font-black text-gray-300 uppercase italic">Incalculable</span>
                                       )}
                                    </div>
                                 </td>
                                 <td className="p-6 text-right">
                                    <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${status.bg} ${status.color} ${status.border} shadow-sm group-hover:scale-105 transition-transform`}>
                                       <StatusIcon size={14} />
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
