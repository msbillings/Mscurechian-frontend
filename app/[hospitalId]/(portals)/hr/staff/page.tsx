'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useHRStaff, useUpdateStaff } from '@/lib/integrations/hooks';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

const STAFF_ROLES = [
  "doctor",
  "nurse",
  "staff",
  "lab",
  "pharma-owner",
  "emergency",
  "helpdesk",
  "hr",
];

export default function StaffListPage() {
  const { hospitalId } = useParams();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);

  const { data: staffResponse, isLoading } = useHRStaff({ 
    search: search || undefined, 
    role: role || undefined,
    page,
    limit: 10
  });
  
  const updateStaffMutation = useUpdateStaff();

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateStaffMutation.mutateAsync({ id, data: { status: newStatus } });
      toast.success(`Staff member marked as ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const staffList = staffResponse?.data || [];
  const pagination = staffResponse?.pagination;

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Staff Directory</h1>
          <p className="text-gray-500 font-medium">Manage and view all staff members in your hospital.</p>
        </div>
        <Link
          href={`/${hospitalId}/hr/staff/create`}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100"
        >
          <UserPlus className="w-5 h-5" />
          Add New Staff
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or mobile..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-gray-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-48">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-gray-600 appearance-none uppercase text-xs tracking-wider"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">All Roles</option>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role & Dept</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Info</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="p-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="p-6 h-20 bg-gray-50/10"></td>
                  </tr>
                ))
              ) : staffList.length > 0 ? (
                staffList.map((staff: any) => (
                  <tr key={staff._id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold uppercase">
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{staff.name}</div>
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Joined {new Date(staff.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">
                        {staff.role}
                      </span>
                    </td>
                    <td className="p-6 space-y-1">
                      <div className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-300" />
                        {staff.email}
                      </div>
                      <div className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-300" />
                        {staff.mobile}
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        staff.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {staff.status}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(staff._id, staff.status)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            staff.status === 'active'
                              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {staff.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500 font-medium">
                    No staff members found matching your criteria.
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
