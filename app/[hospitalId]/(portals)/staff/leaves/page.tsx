'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  FileText,
  Plus,
  Search,
  Filter,
  ChevronRight,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock3,
  AlertCircle,
  Inbox
} from 'lucide-react';
import { staffService } from '@/lib/integrations';
import type { LeaveRequest, LeaveBalance } from '@/lib/integrations/types';
import toast from 'react-hot-toast';
import CalendarPicker from '@/components/CalendarPicker';

import { useQueryClient } from '@tanstack/react-query';
import { useLeaves, useLeaveBalance, useCreateLeave } from '@/lib/integrations/hooks/useStaffQueries';

function LeavesPage() {
  const queryClient = useQueryClient();
  const { data: leavesRes, isLoading: leavesLoading, refetch: refetchLeaves } = useLeaves();
  const { data: balanceRes, isLoading: balanceLoading, refetch: refetchBalance } = useLeaveBalance();
  const createLeaveMutation = useCreateLeave();

  const leaves = leavesRes?.leaves || [];
  const balance = (balanceRes as any)?.balance as LeaveBalance | undefined;

  const [activeTab, setActiveTab] = useState<'history' | 'request'>('history');

  // Form state
  const [formData, setFormData] = useState({
    leaveType: 'sick',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [historyTab, setHistoryTab] = useState<'all' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const loading = leavesLoading || balanceLoading;

  const refreshData = () => {
    toast.promise(Promise.all([refetchLeaves(), refetchBalance()]), {
      loading: 'Synchronizing records...',
      success: 'Registry updated',
      error: 'Sync failed'
    });
  };

  const filteredLeaves = (leaves || []).filter(leave => {
    const reason = leave.reason || '';
    const type = leave.leaveType || '';
    const matchesSearch = reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.toLowerCase().includes(searchQuery.toLowerCase());

    if (historyTab === 'all') return matchesSearch;
    return leave.status === historyTab && matchesSearch;
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, historyTab]);

  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);
  const paginatedLeaves = filteredLeaves.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const truncateReason = (text: string) => {
    if (!text) return '';
    const words = text.trim().split(/\s+/);
    if (words.length <= 2) return text;
    return words.slice(0, 2).join(' ') + '...';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLeaveMutation.mutateAsync(formData as any);
      toast.success('Leave request submitted successfully!');
      setFormData({ leaveType: 'sick', startDate: '', endDate: '', reason: '' });
      setActiveTab('history');
      setHistoryTab('all');
    } catch (error) {
      console.error('Failed to submit leave:', error);
      toast.error('Failed to submit leave request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'rejected': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock3 className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-1 sm:space-y-2 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 sm:gap-2 px-1 sm:px-0">
        <div>
          <h1 className="text-sm sm:text-base font-black text-gray-900 tracking-tighter uppercase leading-none">Leave Management</h1>
          <p className="text-gray-500 font-bold mt-0.5 uppercase tracking-widest text-[6px] sm:text-[8px] leading-none">Registry: Full Leave Lifecycle Protocol</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            className="p-3 bg-white text-gray-400 rounded-[0.5rem] border border-gray-100 hover:text-indigo-600 shadow-sm transition-all active:scale-95"
          >
            <Clock className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab(activeTab === 'history' ? 'request' : 'history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border font-black uppercase text-[9px] tracking-widest ${activeTab === 'request'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
              : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200 shadow-sm'
              }`}
          >
            {activeTab === 'history' ? (
              <><Plus className="w-4 h-4" /> New Request</>
            ) : (
              <><Calendar className="w-4 h-4" /> View History</>
            )}
          </button>
        </div>
      </div>

      {/* Leave Balance Cards */}
      <div className="flex flex-nowrap overflow-x-auto custom-scrollbar gap-1 sm:gap-2 px-1 sm:px-0 min-w-0">
        <div className="flex-1 min-w-[30%] bg-white p-1 sm:p-2 rounded shadow-sm border border-gray-100 flex items-center justify-start gap-1 sm:gap-2 group hover:border-indigo-500 transition-all shrink-0">
          <div className="w-5 h-5 sm:w-8 sm:h-8 bg-indigo-50 rounded flex items-center justify-center text-indigo-600 group-hover:scale-110 shrink-0">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[5px] sm:text-[7px] font-black text-gray-400 uppercase truncate leading-none mb-0.5">Medical</p>
            <h3 className="text-[10px] sm:text-xs font-black text-gray-900 truncate leading-none">
              {balance?.sick ?? 0}<span className="text-[6px] sm:text-[8px] font-bold text-gray-300">/{balance?.totalSick ?? 0}</span>
            </h3>
          </div>
        </div>
        <div className="flex-1 min-w-[30%] bg-white p-1 sm:p-2 rounded shadow-sm border border-gray-100 flex items-center justify-start gap-1 sm:gap-2 group hover:border-emerald-500 transition-all shrink-0">
          <div className="w-5 h-5 sm:w-8 sm:h-8 bg-emerald-50 rounded flex items-center justify-center text-emerald-600 group-hover:scale-110 shrink-0">
            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[5px] sm:text-[7px] font-black text-gray-400 uppercase truncate leading-none mb-0.5">Urgent</p>
            <h3 className="text-[10px] sm:text-xs font-black text-gray-900 truncate leading-none">
              {balance?.emergency ?? 0}<span className="text-[6px] sm:text-[8px] font-bold text-gray-300">/{balance?.totalEmergency ?? 0}</span>
            </h3>
          </div>
        </div>
        <div className="flex-1 min-w-[30%] bg-white p-1 sm:p-2 rounded shadow-sm border border-gray-100 flex items-center justify-start gap-1 sm:gap-2 group hover:border-amber-500 transition-all shrink-0">
          <div className="w-5 h-5 sm:w-8 sm:h-8 bg-amber-50 rounded flex items-center justify-center text-amber-600 group-hover:scale-110 shrink-0">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[5px] sm:text-[7px] font-black text-gray-400 uppercase truncate leading-none mb-0.5">Other</p>
            <h3 className="text-[10px] sm:text-xs font-black text-gray-900 truncate leading-none">
              {balance?.other ?? 0}<span className="text-[6px] sm:text-[8px] font-bold text-gray-300">D</span>
            </h3>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-2">
        {/* Left Column: Form or Stats */}
        <div className="lg:w-1/3 w-full">
          {activeTab === 'request' ? (
            <div className="bg-white p-2 sm:p-4 rounded shadow-sm border border-gray-100 sticky top-20">
              <div className="mb-2 sm:mb-4">
                <h2 className="text-xs sm:text-sm font-bold text-gray-900 uppercase leading-none">Request Protocol</h2>
                <p className="text-[6px] sm:text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">Initialize New Leave Application</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-4">
                <div className="space-y-1">
                  <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Application Category</label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded px-2 py-1.5 text-[10px] font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="sick">Sick Leave</option>
                    <option value="casual">Casual Leave</option>
                    <option value="emergency">Emergency Leave</option>
                    <option value="maternity">Maternity/Paternity</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Temporal Selection</label>
                  <div className="scale-95 origin-top-left w-[105%]">
                    <CalendarPicker
                      startDate={formData.startDate}
                      endDate={formData.endDate}
                      onChange={(dates) => setFormData({ ...formData, ...dates })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Subject Justification</label>
                  <textarea
                    rows={3}
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Provide justification protocol for this leave..."
                    className="w-full bg-gray-50 border border-gray-100 rounded px-2 py-1.5 text-[10px] font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[9px] py-1.5 rounded shadow-sm hover:shadow-indigo-200 transform active:scale-95 tracking-widest"
                >
                  Authorize Leave Request
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white p-2 sm:p-4 rounded shadow-sm border border-gray-100 group">
              <h2 className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 leading-none">Leave Guidelines</h2>
              <div className="space-y-2">
                <div className="flex gap-2 group/item">
                  <div className="h-4 w-4 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[8px] shrink-0 group-hover/item:bg-indigo-600 group-hover/item:text-white">1</div>
                  <p className="text-[9px] font-bold text-gray-600 group-hover/item:text-gray-900 pt-0.5 leading-tight">Apply at least 2 days in advance for casual leaves.</p>
                </div>
                <div className="flex gap-2 group/item">
                  <div className="h-4 w-4 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[8px] shrink-0 group-hover/item:bg-indigo-600 group-hover/item:text-white">2</div>
                  <p className="text-[9px] font-bold text-gray-600 group-hover/item:text-gray-900 pt-0.5 leading-tight">Medical certificates required for sick leaves &gt; 3 days.</p>
                </div>
                <div className="flex gap-2 group/item">
                  <div className="h-4 w-4 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[8px] shrink-0 group-hover/item:bg-indigo-600 group-hover/item:text-white">3</div>
                  <p className="text-[9px] font-bold text-gray-600 group-hover/item:text-gray-900 pt-0.5 leading-tight">Approval dependent on unit operational capacity.</p>
                </div>
              </div>

              <div className="mt-4 p-2 bg-amber-50/50 rounded border border-amber-100 flex gap-2">
                <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                <p className="text-[8px] font-bold text-amber-700 leading-tight italic">For urgent emergency protocols, contact leadership directly.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: History with Tabs */}
        <div className="lg:w-2/3 w-full">
          <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden min-h-[400px] flex flex-col">
            {/* Tab Header */}
            <div className="p-2 sm:p-4 border-b border-gray-50 bg-gray-50/30 flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4">
              <div>
                <h2 className="text-[10px] sm:text-xs font-black text-gray-900 uppercase tracking-tighter leading-none">Application Ledger</h2>
                <div className="flex items-center gap-1 mt-1">
                  {['all', 'approved', 'rejected'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setHistoryTab(tab as any)}
                      className={`px-2 py-1.5 rounded text-[8px] font-black uppercase tracking-widest leading-none ${historyTab === tab
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                      {tab === 'all' ? 'Recent' : tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Search className="w-3 h-3 text-gray-300 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ledger..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-gray-100 rounded pl-7 pr-2 py-1.5 text-[9px] font-bold focus:ring-1 focus:ring-indigo-500 outline-none w-full md:w-48 shadow-xs"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              {filteredLeaves.length > 0 ? (
                <div className="w-full">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-2 text-left text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 leading-none">Leave Type</th>
                        <th className="px-2 py-2 text-left text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 leading-none">Period Date</th>
                        <th className="px-2 py-2 text-left text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 leading-none">Reason</th>
                        <th className="px-2 py-2 text-left text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center leading-none">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginatedLeaves.map((leave) => (
                        <tr key={leave._id} className="hover:bg-gray-50/50 group transition-colors">
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 shadow-xs ${leave.leaveType === 'sick' ? 'bg-orange-50 text-orange-600' :
                                leave.leaveType === 'casual' ? 'bg-indigo-50 text-indigo-600' :
                                  'bg-emerald-50 text-emerald-600'
                                }`}>
                                <Calendar size={10} />
                              </div>
                              <span className="text-[9px] font-bold text-gray-900 uppercase leading-none">{leave.leaveType}</span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-bold text-gray-900 leading-none">
                                {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                              </span>
                              <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-0.5 leading-none">
                                <Clock3 size={8} /> {new Date(leave.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 max-w-xs">
                            <p
                              className="text-[9px] font-bold text-gray-600 italic leading-tight cursor-help hover:text-indigo-600 transition-colors"
                              title={leave.reason}
                            >
                              "{truncateReason(leave.reason)}"
                            </p>
                            {leave.status === 'rejected' && (leave as any).rejectionReason && (
                              <div className="mt-0.5 flex items-start gap-1 text-rose-600">
                                <AlertCircle className="w-2.5 h-2.5 shrink-0 mt-0.5" />
                                <span className="text-[7px] font-bold italic truncate max-w-[100px] leading-tight">{(leave as any).rejectionReason}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`px-1.5 py-0.5 rounded text-[7px] uppercase font-black tracking-widest border flex items-center gap-1 ${getStatusColor(leave.status)}`}>
                                {getStatusIcon(leave.status)}
                                {leave.status}
                              </span>
                              {leave.status === 'approved' && (
                                <span className="text-[6px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-0.5">
                                  <CheckCircle2 size={6} /> Validated
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Enhanced Pagination Controls */}
                  <div className="px-2 py-2 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none">
                      Showing <span className="text-gray-900">{filteredLeaves.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}</span> to <span className="text-gray-900">{Math.min(currentPage * itemsPerPage, filteredLeaves.length)}</span> of <span className="text-gray-900">{filteredLeaves.length}</span> entries
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1 || totalPages <= 1}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-2xl text-[10px] font-black text-gray-600 uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                      >
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {totalPages > 0 ? (
                          [...Array(totalPages)].map((_, i) => (
                            <button
                              key={i + 1}
                              onClick={() => setCurrentPage(i + 1)}
                              className={`w-6 h-6 flex items-center justify-center rounded text-[8px] font-black transition-all transform active:scale-95 ${currentPage === i + 1
                                ? 'bg-indigo-600 text-white shadow-xs scale-105'
                                : 'bg-white text-gray-400 hover:text-gray-600 border border-gray-100 shadow-xs'
                                }`}
                            >
                              {i + 1}
                            </button>
                          ))
                        ) : (
                          <button
                            disabled
                            className="w-6 h-6 flex items-center justify-center rounded text-[8px] font-black bg-indigo-600 text-white shadow-xs scale-105"
                          >
                            1
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages || totalPages <= 1}
                        className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-100 rounded text-[7px] font-black text-gray-600 uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 shadow-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-10 text-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2 text-gray-200">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-black text-gray-900 italic tracking-tight">Ledger Empty</h3>
                  <p className="text-gray-500 font-bold text-[8px] mt-1 max-w-sm">No leave applications detected in the current matrix filter.</p>
                  <button
                    onClick={() => setActiveTab('request')}
                    className="mt-3 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded text-[8px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-xs"
                  >
                    Initiate Request
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(LeavesPage);
