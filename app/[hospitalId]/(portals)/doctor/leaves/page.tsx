"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Plus,
  Filter,
  Search,
  Eye,
  Trash2,
  AlertTriangle,
  RefreshCcw,
  CalendarDays,
  History,
  X,
  Phone,
  User
} from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLeaves, useLeaveBalance, useDeleteLeave } from "@/lib/integrations/hooks/useStaffQueries";

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", label: "Pending Review" },
  approved: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", label: "Approved" },
  rejected: { icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", label: "Declined" },
  cancelled: { icon: AlertTriangle, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-100", label: "Withdrawn" }
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  casual: "Casual Leave",
  sick: "Sick Leave",
  annual: "Annual Leave",
  maternity: "Maternity Leave",
  paternity: "Paternity Leave",
  emergency: "Emergency Leave",
  other: "Other"
};

function DoctorLeaves() {
  const queryClient = useQueryClient();
  const { data: leavesRes, isLoading: loading, refetch } = useLeaves();
  const { data: balanceRes } = useLeaveBalance();
  const deleteLeaveMutation = useDeleteLeave();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const leaves = leavesRes?.leaves || [];
  const balance = balanceRes?.balance || (balanceRes as any) || {};

  const filteredLeaves = useMemo(() => {
    return leaves.filter((leave: any) => {
      const reason = (leave.reason || "").toLowerCase();
      const type = (leave.leaveType || "").toLowerCase();
      const label = (LEAVE_TYPE_LABELS[leave.leaveType] || "").toLowerCase();
      const id = (leave._id || "").toLowerCase();
      const search = searchQuery.toLowerCase();

      const matchesSearch = reason.includes(search) || type.includes(search) || label.includes(search) || id.includes(search);
      const matchesStatus = statusFilter === "all" || leave.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [leaves, searchQuery, statusFilter]);

  const refreshData = () => {
    toast.promise(Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ['staff', 'leave-balance'] })]), {
      loading: 'Updating records...',
      success: 'Records refreshed',
      error: 'Failed to update'
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to withdraw this leave request?")) return;
    
    try {
      await deleteLeaveMutation.mutateAsync(id);
      toast.success("Request withdrawn successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to withdraw request");
    }
  };

  const openViewModal = (leave: any) => {
    setSelectedLeave(leave);
    setIsViewModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading Leave Records...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32 pt-12 px-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Leave Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your planned absences and track approval status.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={refreshData}
            title="Refresh Data"
            className="p-3 bg-white dark:bg-gray-800 text-gray-400 rounded-2xl border border-gray-100 dark:border-gray-700 hover:text-emerald-500 shadow-sm transition-all active:rotate-180"
          >
            <RefreshCcw size={20} />
          </button>
          <a 
            href="/doctor/leave"
            className="flex items-center gap-2 px-6 py-3.5 bg-primary-theme text-white rounded-2xl text-sm font-bold hover:bg-primary-theme/80 transition-all active:scale-95 group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 
            New Request
          </a>
        </div>
      </div>

      {/* Stats Summary & Leave Balance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white text-gray-900 p-8 rounded-[0.5rem]  relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Total Balance</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-4xl font-black">{balance.totalQuota || 30}</h3>
            <span className="text-xs font-bold text-slate-400 uppercase">Days / Year</span>
          </div>
          <div className="mt-6 flex items-center justify-between text-xs font-bold">
            <span className="text-emerald-400">Used: {balance.used || 0}</span>
            <span className="text-slate-400">Remaining: {(balance.totalQuota || 30) - (balance.used || 0)}</span>
          </div>
          <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-1000" 
              style={{ width: `${((balance.used || 0) / (balance.totalQuota || 30)) * 100}%` }}
            ></div>
          </div>
        </div>

        {[
          { label: "Approved Leaves", value: leaves.filter((l: any) => l.status === 'approved').length, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "Pending Review", value: leaves.filter((l: any) => l.status === 'pending').length, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "History Total", value: leaves.length, icon: History, color: "text-blue-500", bg: "bg-blue-50" }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 p-8 rounded-[0.5rem] border border-gray-100 dark:border-gray-800 group hover:border-emerald-500/50 transition-all shadow-sm">
            <div className={`p-3 w-12 h-12 ${stat.bg} dark:bg-gray-800 rounded-2xl flex items-center justify-center ${stat.color} mb-6`}>
              <stat.icon size={24} />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white underline decoration-emerald-500/30 underline-offset-8">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Main Content: Leave Log */}
      <div className="bg-white dark:bg-gray-900 rounded-[0.5rem] border border-gray-100 dark:border-gray-800 overflow-hidden">
         <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
               <h3 className="text-xl font-bold text-gray-900 dark:text-white">Leave History</h3>
               <p className="text-xs text-gray-500 mt-1">Review and manage your previous absence requests</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
               <div className="relative w-full sm:w-64">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search logs..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-6 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 w-full transition-all"
                  />
               </div>
               <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  {['all', 'pending', 'approved', 'rejected'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                        statusFilter === status 
                        ? 'bg-primary-theme text-white border-primary-theme' 
                        : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-100 dark:border-gray-700 hover:border-emerald-500'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
               </div>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/30">
                     <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                     <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Range</th>
                     <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Days</th>
                     <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                     <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest w-1/4">Reason</th>
                     <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {filteredLeaves.length > 0 ? filteredLeaves.map((leave: any) => {
                     const config = STATUS_CONFIG[leave.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                     const StatusIcon = config.icon;
                     
                     return (
                        <tr key={leave._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 group transition-colors">
                           <td className="px-8 py-6">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                 {LEAVE_TYPE_LABELS[leave.leaveType] || leave.leaveType}
                              </span>
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex flex-col">
                                 <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {new Date(leave.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {new Date(leave.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                 </span>
                                 <span className="text-[10px] font-bold text-gray-400 uppercase mt-1 flex items-center gap-1">
                                    <CalendarDays size={10} /> {new Date(leave.createdAt).toLocaleDateString()}
                                 </span>
                              </div>
                           </td>
                           <td className="px-8 py-6 text-center">
                              <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                 {leave.duration || 0}
                              </span>
                           </td>
                           <td className="px-8 py-6">
                              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${config.bg} ${config.color} border ${config.border} dark:bg-transparent`}>
                                 <StatusIcon size={12} />
                                 {config.label}
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 line-clamp-1 italic">"{leave.reason}"</p>
                           </td>
                           <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                 <button 
                                   onClick={() => openViewModal(leave)}
                                   className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-400 hover:text-emerald-600 rounded-xl transition-colors"
                                 >
                                    <Eye size={18} />
                                 </button>
                                 {leave.status === 'pending' && (
                                    <button 
                                      onClick={() => handleDelete(leave._id)}
                                      className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-gray-400 hover:text-rose-600 rounded-xl transition-colors"
                                    >
                                       <Trash2 size={18} />
                                    </button>
                                 )}
                              </div>
                           </td>
                        </tr>
                     );
                  }) : (
                     <tr>
                        <td colSpan={6} className="py-32 text-center">
                           <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                              <Calendar className="text-gray-300" size={40} />
                           </div>
                           <h4 className="text-lg font-bold text-gray-400">No matching records</h4>
                           <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or submit a new request</p>
                           <a 
                             href="/doctor/leave"
                             className="mt-8 px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 inline-flex items-center gap-2"
                           >
                              <Plus size={18} /> Request Leave Now
                           </a>
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* View Modal */}
      {isViewModalOpen && selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div 
             className="absolute inset-0" 
             onClick={() => setIsViewModalOpen(false)}
           ></div>
           <div className="bg-white dark:bg-[#0a0a0a] w-full max-w-xl rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="h-2 bg-emerald-600 w-full"></div>
              
              <div className="p-8">
                 <div className="flex justify-between items-start mb-8">
                    <div>
                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_CONFIG[selectedLeave.status as keyof typeof STATUS_CONFIG]?.bg} ${STATUS_CONFIG[selectedLeave.status as keyof typeof STATUS_CONFIG]?.color} border ${STATUS_CONFIG[selectedLeave.status as keyof typeof STATUS_CONFIG]?.border} mb-2 inline-block`}>
                          {selectedLeave.status}
                       </span>
                       <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Summary</h2>
                       <p className="text-sm text-gray-500 mt-1">Registry ID: {selectedLeave._id}</p>
                    </div>
                    <button 
                      onClick={() => setIsViewModalOpen(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 transition-colors"
                    >
                       <X size={20} />
                    </button>
                 </div>

                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Leave Type</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{LEAVE_TYPE_LABELS[selectedLeave.leaveType] || selectedLeave.leaveType}</p>
                       </div>
                       <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Duration</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedLeave.duration} Day(s)</p>
                       </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Leave Interval</p>
                       <div className="flex items-center gap-4">
                          <div className="flex-1">
                             <p className="text-xs text-gray-500 font-medium">Start Date</p>
                             <p className="text-sm font-bold dark:text-white">{new Date(selectedLeave.startDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                          </div>
                          <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
                          <div className="flex-1">
                             <p className="text-xs text-gray-500 font-medium text-right">End Date</p>
                             <p className="text-sm font-bold dark:text-white text-right">{new Date(selectedLeave.endDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                          </div>
                       </div>
                    </div>

                    <div>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <FileText size={12} className="text-emerald-500" /> Reason for Leave
                       </p>
                       <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 italic text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                          "{selectedLeave.reason}"
                       </div>
                    </div>

                    {selectedLeave.emergencyContact && (
                       <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Emergency Contact Info</p>
                          <div className="grid grid-cols-2 gap-4 text-sm font-bold">
                             <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300 italic">
                                <User size={16} className="text-blue-500" /> {selectedLeave.emergencyContact.name}
                             </div>
                             <div className="flex items-center gap-3 text-emerald-600 italic">
                                <Phone size={16} /> {selectedLeave.emergencyContact.mobile}
                             </div>
                          </div>
                       </div>
                    )}
                 </div>

                 <div className="mt-8 flex gap-3">
                    <button 
                      onClick={() => setIsViewModalOpen(false)}
                      className="flex-1 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold text-sm shadow-xl hover:scale-[1.02] transition-transform active:scale-95"
                    >
                       Done
                    </button>
                    {selectedLeave.status === 'pending' && (
                       <button 
                          onClick={() => {
                             setIsViewModalOpen(false);
                             handleDelete(selectedLeave._id);
                          }}
                          className="px-6 py-4 bg-rose-50 dark:bg-rose-900/10 text-rose-600 rounded-2xl font-bold text-sm hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors"
                       >
                          <Trash2 size={20} />
                       </button>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 pt-4">
         <AlertCircle size={16} className="text-amber-500" />
         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Note: Emergency leave requests are escalated automatically to hospital administration.
         </p>
      </div>
    </div>
  );
}

export default React.memo(DoctorLeaves);

