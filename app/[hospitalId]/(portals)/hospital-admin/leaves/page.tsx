"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from "@/lib/integrations";
import {
   Calendar,
   Clock,
   CheckCircle2,
   XCircle,
   AlertCircle,
   FileText,
   User,
   Building,
   Filter,
   Search,
   MoreHorizontal,
   ArrowRight,
   ShieldAlert,
   CalendarDays,
   CheckCircle,
   ClipboardList,
   ChevronLeft,
   ChevronRight,
   History
} from "lucide-react";
import toast from "react-hot-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuthStore } from "@/stores/authStore";

const STATUS_CONFIG = {
   pending: { icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", label: "Pending Review" },
   approved: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", label: "Approved" },
   rejected: { icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", label: "Rejected" },
   cancelled: { icon: XCircle, color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-100", label: "Cancelled" }
};

const LEAVE_TYPE_LABELS = {
   casual: "Casual Leave",
   sick: "Sick Leave",
   annual: "Annual Leave",
   maternity: "Maternity Leave",
   paternity: "Paternity Leave",
   emergency: "Emergency Leave",
   other: "Other"
};

// ============================================================================
// PERFORMANCE: Pagination Settings
// ============================================================================
const ITEMS_PER_PAGE = 10;

// ============================================================================
// PERFORMANCE: Memoized Leave Card
// ============================================================================
// ============================================================================
// PERFORMANCE: Memoized Leave Row
// ============================================================================
const LeaveRow = React.memo(({
   leave,
   onStatusUpdate,
   processingId
}: {
   leave: any;
   onStatusUpdate: (id: string, status: 'approved' | 'rejected', reason?: string) => void;
   processingId: string | null;
}) => {
   const isPending = leave.status === 'pending';
   const isProcessing = processingId === leave._id;
   const statusConfig = STATUS_CONFIG[leave.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
   const StatusIcon = statusConfig.icon;

   return (
      <tr className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 group">
         <td className="py-5 px-6">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500/10 to-blue-600/10 flex items-center justify-center text-blue-600 font-black text-sm">
                  {(leave.requester?.name || leave.applicant?.name || "A")?.charAt(0).toUpperCase()}
               </div>
               <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                     {leave.requester?.name || leave.applicant?.name || "Anonymous User"}
                  </h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                     {leave.requester?.role?.replace('-', ' ') || 'Registered User'}
                  </p>
               </div>
            </div>
         </td>
         <td className="py-5 px-6">
            <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase">
               {LEAVE_TYPE_LABELS[leave.leaveType as keyof typeof LEAVE_TYPE_LABELS] || leave.leaveType}
            </p>
         </td>
         <td className="py-5 px-6">
            <div className="flex flex-col gap-1">
               <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                  {new Date(leave.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(leave.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
               </span>
               <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                  {leave.numberOfDays || (Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)} Days
               </span>
            </div>
         </td>
         <td className="py-5 px-6 max-w-xs">
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 italic line-clamp-1 truncate">
               "{leave.reason}"
            </p>
         </td>
         <td className="py-5 px-6">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
               <StatusIcon size={12} />
               {statusConfig.label}
            </div>
         </td>
         <td className="py-5 px-6 text-right">
            {isPending ? (
               <div className="flex justify-end gap-2">
                  <button
                     onClick={() => onStatusUpdate(leave._id, 'approved')}
                     disabled={isProcessing}
                     className="px-4 py-2 bg-emerald-600/10 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white disabled:opacity-50 transition-all active:scale-95"
                  >
                     Approve
                  </button>
                  <button
                     onClick={() => {
                        const reason = prompt("State rejection protocol justification:");
                        if (reason) onStatusUpdate(leave._id, 'rejected', reason);
                     }}
                     disabled={isProcessing}
                     className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white disabled:opacity-50 transition-all active:scale-95"
                  >
                     Reject
                  </button>
               </div>
            ) : (
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Logged: {new Date(leave.createdAt).toLocaleDateString()}
               </span>
            )}
         </td>
      </tr>
   );
});

LeaveRow.displayName = 'LeaveRow';

function HospitalAdminLeaves() {

   const queryClient = useQueryClient();
   const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
   const [filterRole, setFilterRole] = useState("all");
   const [searchTerm, setSearchTerm] = useState("");
   const debouncedSearch = useDebounce(searchTerm, 300);
   const [processingId, setProcessingId] = useState<string | null>(null);
   const [page, setPage] = useState(1);

   const { data: leaves = [], isLoading: loading } = useQuery<any[]>({
      queryKey: ['hospital-admin', 'leaves'],
      queryFn: async () => {
         try {
            const data = await adminService.getLeavesClient();
            return Array.isArray(data) ? data : (data?.leaves || []);
         } catch (error) {
            console.error("Failed to fetch leave requests:", error);
            toast.error("Failed to load leave requests");
            throw error;
         }
      },
      staleTime: 10 * 1000,
   });


   // ✅ REAL-TIME DYNAMICS: Hyper-Reactive Governance Sync
   useEffect(() => {
      let isMounted = true;
      const initSocketSync = async () => {
         const { getSocket, joinSocketRoom } = await import('@/lib/integrations/api/socket');
         const socket = await getSocket();
         if (socket && isMounted) {
            // Resolve ID from store or storage
            const rawUser = useAuthStore.getState().user as any;
            const uId = rawUser?.id || rawUser?._id;

            if (uId) {
               joinSocketRoom({
                  userId: uId,
                  role: 'hospital-admin',
                  hospitalId: rawUser?.hospital || rawUser?.hospitalId
               });

               // Listen for granular leave events
               socket.on('leave:new', (data: any) => {
                  console.log('📡 [Leaves] Local Sync Triggered');

                  // Global toast if not handled by layout
                  const requesterName = data.leave?.requester?.name || data.leave?.applicant?.name || 'Staff Member';
                  toast(`Instant Sync: New Leave Request From ${requesterName}`, {
                     icon: '📅',
                     duration: 4000,
                     style: { borderRadius: '15px', background: '#0f172a', color: '#fff', fontSize: '12px', fontWeight: 'bold' }
                  });

                  queryClient.invalidateQueries({ queryKey: ['hospital-admin', 'leaves'] });
               });
            }
         }
      };

      initSocketSync();
      return () => {
         isMounted = false;
         import('@/lib/integrations/api/socket').then(({ getSocket }) => {
            getSocket().then(socket => {
               if (socket) socket.off('leave:new');
            });
         });
      };
   }, [queryClient]);

   const handleStatusUpdate = async (leaveId: string, status: 'approved' | 'rejected', rejectionReason?: string) => {
      setProcessingId(leaveId);
      try {
         await adminService.updateLeaveStatusClient(leaveId, {
            status,
            rejectionReason: status === 'rejected' ? rejectionReason : undefined
         });
         toast.success(`Leave request ${status} successfully`);
         queryClient.invalidateQueries({ queryKey: ['hospital-admin', 'leaves'] });
      } catch (error: any) {
         console.error("Failed to update leave status:", error);
         toast.error(error.message || "Failed to update leave status");
      } finally {
         setProcessingId(null);
      }
   };

   const filteredLeaves = useMemo(() => {
      return (leaves || []).filter(leave => {
         // Tab filtering
         const matchesTab = activeTab === 'active'
            ? leave.status === 'pending'
            : ['approved', 'rejected', 'cancelled'].includes(leave.status);


         const role = leave.requester?.role || leave.applicant?.type;
         const matchesRole = filterRole === "all" || role === filterRole;

         const name = (leave.requester?.name || leave.applicant?.name || "").toLowerCase();
         const matchesSearch = !debouncedSearch || name.includes(debouncedSearch.toLowerCase());

         return matchesTab && matchesRole && matchesSearch;
      });
   }, [leaves, activeTab, filterRole, debouncedSearch]);

   const paginatedLeaves = useMemo(() => {
      const start = (page - 1) * ITEMS_PER_PAGE;
      return filteredLeaves.slice(start, start + ITEMS_PER_PAGE);
   }, [filteredLeaves, page]);

   const totalPages = Math.ceil(filteredLeaves.length / ITEMS_PER_PAGE);

   useEffect(() => {
      setPage(1);
   }, [activeTab, filterRole, debouncedSearch]);

   const stats = useMemo(() => {
      return {
         total: leaves.length,
         pending: leaves.filter(l => l.status === 'pending').length,
         approved: leaves.filter(l => l.status === 'approved').length,
         rejected: leaves.filter(l => l.status === 'rejected').length
      };
   }, [leaves]);

   return (
      <div className="space-y-8 pb-12">
         {/* Header */}
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
               <h1 className="text-2xl font-bold text-gray-900 dark:text-white  uppercase  leading-none">Leave Intelligence</h1>
               <p className="text-gray-500 dark:text-gray-400 font-bold mt-2 uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
                  Management Oversight: {leaves.length} Applications Total
               </p>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={() => queryClient.invalidateQueries({ queryKey: ['hospital-admin', 'leaves'] })} className="p-4 bg-white dark:bg-gray-800 text-gray-400 rounded-2xl border border-gray-100 dark:border-gray-700 hover:text-indigo-600 shadow-xs transition-all active:scale-95">
                  <Clock className="w-5 h-5 transition-transform hover:rotate-12" />
               </button>
            </div>
         </div>

         {/* Stats Summary */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
               { label: 'Total Requests', value: stats.total, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
               { label: 'Pending Review', value: stats.pending, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
               { label: 'Approved Logs', value: stats.approved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
               { label: 'Denied Actions', value: stats.rejected, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' }
            ].map((stat, i) => (
               <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-[0.5rem] shadow-xs border border-gray-100 dark:border-gray-700 group hover:border-indigo-200 transition-colors">
                  <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                        <stat.icon className="w-6 h-6" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{stat.value}</h3>
                     </div>
                  </div>
               </div>
            ))}
         </div>

         {/* Navigation Tabs */}
         <div className="flex items-center gap-2 p-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 w-fit">
            <button
               onClick={() => setActiveTab('active')}
               className={`flex items-center gap-2 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'active'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none'
                  : 'text-gray-400 hover:text-gray-600'}`}
            >
               <AlertCircle size={14} /> Active Requests ({stats.pending})
            </button>
            <button
               onClick={() => setActiveTab('history')}
               className={`flex items-center gap-2 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none'
                  : 'text-gray-400 hover:text-gray-600'}`}
            >
               <History size={14} /> Application History ({stats.total - stats.pending})
            </button>
         </div>

         {/* Filter Bar */}
         <div className="bg-white dark:bg-gray-800 p-5 rounded-4xl  border border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full lg:w-auto">
               <Search className="w-4 h-4 text-gray-400 absolute left-5 top-1/2 -translate-y-1/2" />
               <input
                  type="text"
                  placeholder="Scan directory by applicant nomenclature..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
               />
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
               <div className="relative flex-1 lg:w-44">
                  <User className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <select
                     value={filterRole}
                     onChange={(e) => setFilterRole(e.target.value)}
                     className="w-full pl-11 pr-4 py-3 bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[0.5rem] text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                  >
                     <option value="all">Consolidated Roles</option>
                     <option value="doctor">Doctors</option>
                     <option value="nurse">Nurses</option>
                     <option value="receptionist">Receptionists</option>
                     <option value="lab-technician">Lab Technicians</option>
                     <option value="pharmacist">Pharmacists</option>
                  </select>
               </div>
               
            </div>
         </div>

         {/* Tabular Registry */}
         <div className="bg-white dark:bg-gray-800 rounded-[0.5rem] shadow-xs border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-gray-50/50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-800">
                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Applicant Identity</th>
                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Temporal Range</th>
                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Justification</th>
                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Matrix Status</th>
                        <th className="py-4 px-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Governance</th>
                     </tr>
                  </thead>
                  <tbody>
                     {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                           <tr key={i} className="animate-pulse">
                              <td colSpan={6} className="py-8 px-6">
                                 <div className="h-10 bg-gray-50 dark:bg-gray-700/30 rounded-xl" />
                              </td>
                           </tr>
                        ))
                     ) : paginatedLeaves.length === 0 ? (
                        <tr>
                           <td colSpan={6} className="py-32 text-center text-gray-400">
                              <div className="flex flex-col items-center gap-4">
                                 <ClipboardList size={48} className="opacity-20" />
                                 <p className="text-[10px] font-black uppercase tracking-widest">No matching application logs detected</p>
                              </div>
                           </td>
                        </tr>
                     ) : (
                        paginatedLeaves.map((leave) => (
                           <LeaveRow
                              key={leave._id}
                              leave={leave}
                              onStatusUpdate={handleStatusUpdate}
                              processingId={processingId}
                           />
                        ))
                     )}
                  </tbody>
               </table>
            </div>

            {/* Pagination Interface */}
            <div className="flex items-center justify-between p-8 bg-gray-50/30 dark:bg-gray-700/10 border-t border-gray-100 dark:border-gray-800">
               <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-3 px-8 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:text-indigo-600 hover:border-indigo-200 transition-all disabled:opacity-30 active:scale-95 shadow-xs"
               >
                  <ChevronLeft size={16} /> Previous Sector
               </button>
               <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">
                     Registry Layer {page} <span className="mx-2 opacity-20">/</span> {totalPages || 1}
                  </span>
                  <p className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">
                     Entries Inventory: {Math.min(filteredLeaves.length, (page - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredLeaves.length, page * ITEMS_PER_PAGE)} of {filteredLeaves.length} Nodes
                  </p>
               </div>
               <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-3 px-8 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:text-indigo-600 hover:border-indigo-200 transition-all disabled:opacity-30 active:scale-95 shadow-xs"
               >
                  Next Sector <ChevronRight size={16} />
               </button>
            </div>
         </div>
      </div>
   );
}
export default React.memo(HospitalAdminLeaves);
