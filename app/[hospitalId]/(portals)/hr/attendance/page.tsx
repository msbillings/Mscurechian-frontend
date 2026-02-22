'use client';

import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  Search,
  Filter,
  User,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useHRAttendance } from '@/lib/integrations/hooks';

export default function AttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);

  const { data: attendanceResponse, isLoading } = useHRAttendance({
    date,
    page,
    limit: 15
  });

  const logs = attendanceResponse?.data || [];
  const pagination = attendanceResponse?.pagination;

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Attendance Logs</h1>
          <p className="text-gray-500 font-medium">Daily attendance tracking for all hospital personnel.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-indigo-400 ml-2" />
            <input
              type="date"
              className="bg-transparent border-none focus:ring-0 font-bold text-gray-700 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Entry/Exit</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="p-6 h-16 bg-gray-50/10"></td>
                  </tr>
                ))
              ) : logs.length > 0 ? (
                logs.map((log: any) => (
                  <tr key={log._id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{log.user?.name}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID: {log.user?.employeeId || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{log.user?.role}</span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                        <span className="p-1 px-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                          {log.checkIn?.time ? new Date(log.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gray-300" />
                        <span className="p-1 px-2 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                          {log.checkOut?.time ? new Date(log.checkOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                      </div>
                    </td>
                    <td className="p-6">
                      <p className="text-sm font-bold text-gray-900">{log.workingHours ? `${Math.floor(log.workingHours / 60)}h ${log.workingHours % 60}m` : '--'}</p>
                    </td>
                    <td className="p-6 text-right">
                      <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${
                        log.status === 'present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        log.status === 'late' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-gray-50 text-gray-600 border-gray-100'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-gray-500 font-medium">
                    No attendance records found for this date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.pages > 1 && (
          <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Showing Page {page} of {pagination.pages}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                disabled={page === pagination.pages}
                onClick={() => setPage(p => p + 1)}
                className="p-2 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
