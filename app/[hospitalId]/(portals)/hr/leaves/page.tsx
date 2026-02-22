'use client';

import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  MoreVertical,
  Check,
  X,
  User,
} from 'lucide-react';
import { useHRLeaves, useUpdateLeaveStatus } from '@/lib/integrations/hooks';
import toast from 'react-hot-toast';

export default function LeaveManagementPage() {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);

  const { data: leaveResponse, isLoading } = useHRLeaves({ 
    status: status || undefined,
    page,
    limit: 10
  });

  const updateStatusMutation = useUpdateLeaveStatus();

  const handleStatusUpdate = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: newStatus });
      toast.success(`Leave request ${newStatus} successfully`);
    } catch (error) {
      toast.error('Failed to update leave status');
    }
  };

  const leaves = leaveResponse?.data || [];
  const pagination = leaveResponse?.pagination;

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Leave Management</h1>
          <p className="text-gray-500 font-medium">Review and process staff leave applications.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
          {['pending', 'approved', 'rejected', 'all'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s === 'all' ? '' : s); setPage(1); }}
              className={`px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
                (status === s || (status === '' && s === 'all'))
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-white rounded-2xl animate-pulse shadow-sm border border-gray-100"></div>
          ))
        ) : leaves.length > 0 ? (
          leaves.map((leave: any) => (
            <div key={leave._id} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row justify-between gap-8 group hover:border-indigo-100 transition-colors">
              <div className="flex gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <User className="w-8 h-8" />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{leave.requester?.name}</h3>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{leave.requester?.role} • {leave.leaveType}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{new Date(leave.startDate).toLocaleDateString()}</span>
                      <span className="text-gray-300">→</span>
                      <span>{new Date(leave.endDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} Days</span>
                    </div>
                  </div>
                  <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-600 leading-relaxed"><span className="font-bold text-gray-900">Reason:</span> {leave.reason}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between items-end gap-6 min-w-[200px]">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                  leave.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                  leave.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                  'bg-rose-50 text-rose-600 border border-rose-100'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    leave.status === 'pending' ? 'bg-amber-400' :
                    leave.status === 'approved' ? 'bg-emerald-400' :
                    'bg-rose-400'
                  }`}></div>
                  {leave.status}
                </span>

                {leave.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleStatusUpdate(leave._id, 'rejected')}
                      disabled={updateStatusMutation.isPending}
                      className="p-3 rounded-xl border border-rose-100 text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(leave._id, 'approved')}
                      disabled={updateStatusMutation.isPending}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                    >
                      <Check className="w-5 h-5" />
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-20 text-center rounded-2xl border border-gray-100 shadow-sm">
            <Calendar className="w-16 h-16 text-gray-200 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-gray-900">No leave requests found</h3>
            <p className="text-gray-500 mt-2">All caught up! There are no {status} leave requests at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
