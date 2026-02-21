'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  Calendar,
  Search,
  User,
  Download,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useHRPayroll } from '@/lib/integrations/hooks';

export default function PayrollPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);

  const { data: payrollResponse, isLoading } = useHRPayroll({
    month,
    year,
    page,
    limit: 15
  });

  const payrolls = payrollResponse?.data || [];
  const pagination = payrollResponse?.pagination;

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Payroll Management</h1>
          <p className="text-gray-500 font-medium">Manage and review monthly staff compensation.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-indigo-400 ml-2" />
            <select
              className="bg-transparent border-none focus:ring-0 font-bold text-gray-700 text-sm appearance-none"
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              className="bg-transparent border-none focus:ring-0 font-bold text-gray-700 text-sm appearance-none"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100">
            <Download className="w-5 h-5" />
            Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Payout</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-gray-900">₹0.00</h3>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Processed</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-gray-900">{payrolls.length} Employees</h3>
            <CheckCircle2 className="w-5 h-5 text-indigo-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pending Approval</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-gray-900">0</h3>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Salary</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Deductions</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Payable</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="p-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="p-6 h-16 bg-gray-50/10"></td>
                  </tr>
                ))
              ) : payrolls.length > 0 ? (
                payrolls.map((payroll: any) => (
                  <tr key={payroll._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold uppercase">
                          {payroll.user?.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{payroll.user?.name}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{payroll.user?.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-sm font-bold text-gray-700">₹{payroll.basicSalary?.toLocaleString()}</td>
                    <td className="p-6 text-sm font-bold text-rose-600">-₹{payroll.totalDeductions?.toLocaleString()}</td>
                    <td className="p-6 text-sm font-black text-gray-900">₹{payroll.netSalary?.toLocaleString()}</td>
                    <td className="p-6">
                      <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${
                        payroll.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {payroll.status}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <button className="text-indigo-600 hover:text-indigo-700 text-xs font-black uppercase tracking-widest">View Payslip</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-gray-500 font-medium">
                    No payroll records found for this period.
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
