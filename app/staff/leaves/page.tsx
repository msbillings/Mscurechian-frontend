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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl max-sm:text-[20px] font-black text-gray-900 tracking-tight">Leave Management</h1>
          <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">Registry: Full Leave Lifecycle Protocol</p>
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
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[0.5rem] border font-black uppercase text-[10px] tracking-widest ${activeTab === 'request'
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[0.5rem] shadow-sm border border-gray-100 flex items-center gap-4 group hover:border-indigo-500">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase ">Medical / Sick Leave</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {balance?.sick ?? 0} <span className="text-sm font-bold text-gray-300">/ {balance?.totalSick ?? 0}D</span>
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[0.5rem] shadow-sm border border-gray-100 flex items-center gap-4 group hover:border-emerald-500">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Emergency Quota</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {balance?.emergency ?? 0} <span className="text-sm font-bold text-gray-300">/ {balance?.totalEmergency ?? 0}D</span>
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[0.5rem] shadow-sm border border-gray-100 flex items-center gap-4 group hover:border-amber-500">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase ">Aggregate Other</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {balance?.other ?? 0} <span className="text-sm font-bold text-gray-300">Days</span>
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form or Stats */}
        <div className="lg:col-span-1">
          {activeTab === 'request' ? (
            <div className="bg-white p-8 rounded-[0.5rem] shadow-sm border border-gray-100 sticky top-24">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 uppercase ">Request Protocol</h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Initialize New Leave Application</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Application Category</label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-[0.5rem] px-5 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="sick">Sick Leave</option>
                    <option value="casual">Casual Leave</option>
                    <option value="emergency">Emergency Leave</option>
                    <option value="maternity">Maternity/Paternity</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Temporal Selection</label>
                  <CalendarPicker
                    startDate={formData.startDate}
                    endDate={formData.endDate}
                    onChange={(dates) => setFormData({ ...formData, ...dates })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject Justification</label>
                  <textarea
                    rows={4}
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Provide justification protocol for this leave..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-[0.5rem] px-5 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs py-4 rounded-[0.5rem] shadow-xl shadow-indigo-100 hover:shadow-indigo-200 transform active:scale-95"
                >
                  Authorize Leave Request
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-[0.5rem] shadow-sm border border-gray-100 group">
              <h2 className="text-[18px] max-sm:text-[17px] font-bold text-gray-900 uppercase  mb-6">Leave Guidelines</h2>
              <div className="space-y-6">
                <div className="flex gap-4 group/item">
                  <div className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0 group-hover/item:bg-indigo-600 group-hover/item:text-white">1</div>
                  <p className="text-sm font-bold text-gray-600 group-hover/item:text-gray-900 pt-0.5">Apply at least 2 days in advance for casual leaves.</p>
                </div>
                <div className="flex gap-4 group/item">
                  <div className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0 group-hover/item:bg-indigo-600 group-hover/item:text-white">2</div>
                  <p className="text-sm font-bold text-gray-600 group-hover/item:text-gray-900 pt-0.5">Medical certificates required for sick leaves &gt; 3 days.</p>
                </div>
                <div className="flex gap-4 group/item">
                  <div className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0 group-hover/item:bg-indigo-600 group-hover/item:text-white">3</div>
                  <p className="text-sm font-bold text-gray-600 group-hover/item:text-gray-900 pt-0.5">Approval dependent on unit operational capacity.</p>
                </div>
              </div>

              <div className="mt-10 p-5 bg-amber-50/50 rounded-3xl border border-amber-100 flex gap-4">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                <p className="text-xs font-bold text-amber-700 leading-relaxed italic">For urgent emergency protocols, please initiate direct contact with unit leadership via verified channels after submission.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: History with Tabs */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[0.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[600px] flex flex-col">
            {/* Tab Header */}
            <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-[18px] max-sm:text-[17px] font-bold text-gray-900 uppercase">Application Ledger</h2>
                <div className="flex items-center gap-1 mt-1">
                  {['all', 'approved', 'rejected'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setHistoryTab(tab as any)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${historyTab === tab
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                      {tab === 'all' ? 'Recent' : tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-300 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ledger..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-gray-100 rounded-2xl pl-11 pr-5 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64 shadow-xs"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {filteredLeaves.length > 0 ? (
                <div className="w-full">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Leave Type</th>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Period Date</th>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Reason</th>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginatedLeaves.map((leave) => (
                        <tr key={leave._id} className="hover:bg-gray-50/50 group transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${leave.leaveType === 'sick' ? 'bg-orange-50 text-orange-600' :
                                leave.leaveType === 'casual' ? 'bg-indigo-50 text-indigo-600' :
                                  'bg-emerald-50 text-emerald-600'
                                }`}>
                                <Calendar size={14} />
                              </div>
                              <span className="text-xs font-bold text-gray-900 uppercase">{leave.leaveType}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11px] font-bold text-gray-900">
                                {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                              </span>
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Clock3 size={10} /> {new Date(leave.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <p
                              className="text-[11px] font-bold text-gray-600 italic leading-relaxed cursor-help hover:text-indigo-600 transition-colors"
                              title={leave.reason}
                            >
                              "{truncateReason(leave.reason)}"
                            </p>
                            {leave.status === 'rejected' && (leave as any).rejectionReason && (
                              <div className="mt-1 flex items-start gap-1.5 text-rose-600">
                                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                <span className="text-[9px] font-bold italic truncate max-w-[150px]">{(leave as any).rejectionReason}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className={`px-3 py-1 rounded-full text-[9px] uppercase font-black tracking-widest border flex items-center gap-1.5 ${getStatusColor(leave.status)}`}>
                                {getStatusIcon(leave.status)}
                                {leave.status}
                              </span>
                              {leave.status === 'approved' && (
                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                  <CheckCircle2 size={8} /> Validated
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Enhanced Pagination Controls */}
                  <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
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
                      <div className="flex items-center gap-1.5">
                        {totalPages > 0 ? (
                          [...Array(totalPages)].map((_, i) => (
                            <button
                              key={i + 1}
                              onClick={() => setCurrentPage(i + 1)}
                              className={`w-9 h-9 flex items-center justify-center rounded-xl text-[10px] font-black transition-all transform active:scale-90 ${currentPage === i + 1
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105'
                                : 'bg-white text-gray-400 hover:text-gray-600 border border-gray-100 hover:border-gray-200 shadow-sm'
                                }`}
                            >
                              {i + 1}
                            </button>
                          ))
                        ) : (
                          <button
                            disabled
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-[10px] font-black bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105"
                          >
                            1
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages || totalPages <= 1}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-2xl text-[10px] font-black text-gray-600 uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-200">
                    <Inbox className="w-12 h-12" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 italic tracking-tight">Ledger Empty</h3>
                  <p className="text-gray-500 font-bold text-sm mt-2 max-w-sm">No leave applications detected in the current matrix filter.</p>
                  <button
                    onClick={() => setActiveTab('request')}
                    className="mt-8 px-8 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white shadow-indigo-100"
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
