"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useQuery } from '@tanstack/react-query';
import { hospitalAdminService } from "@/lib/integrations";
import {
  Users,

  Trash2,
  Edit,

  Mail,
  Phone,

  Search,
  Filter,
  UserPlus,
  Briefcase,



  Building2
} from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";

// ============================================================================
// PERFORMANCE: Pagination Settings
// ============================================================================
const ITEMS_PER_PAGE = 21; // 3 items per row, 7 rows

// ============================================================================
// PERFORMANCE: Memoized Staff Card
// ============================================================================
const StaffCard = React.memo(({
  member,
  onView,
  onEdit,
  onDelete,
  deleteLoading
}: {
  member: any;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleteLoading: boolean;
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-xl font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              {member.name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-black text-slate-900 truncate leading-tight">
                {member.name}
              </h3>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="px-2 py-0.5 bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-500 rounded-md border border-slate-100">
                  {member.employeeId || 'NO_ID'}
                </span>
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md ${member.status === 'active'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                  {member.status || 'Active'}
                </span>
              </div>
            </div>
          </div>

        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-100">
              <Briefcase size={14} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Designation</p>
              <p className="text-xs font-bold text-slate-700">{member.designation || 'Specialist'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-100">
              <Building2 size={14} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Department</p>
              <p className="text-xs font-bold text-slate-700">{member.department || 'General Admin'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6 px-1 border-t border-slate-50 pt-4">
          <div className="flex-1 flex items-center gap-2 text-[10px] font-bold text-slate-500 truncate">
            <Phone size={12} className="text-slate-400" />
            <span>{member.mobile || member.phone || 'N/A'}</span>
          </div>
          <div className="flex-1 flex items-center gap-2 text-[10px] font-bold text-slate-500 truncate">
            <Mail size={12} className="text-slate-400" />
            <span className="truncate">{member.email || 'N/A'}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onView}
            className="flex-1 py-3 rounded-xl bg-primary-theme text-white hover:bg-primary-theme/80 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
          >
            Profile
          </button>
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="px-4 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={onDelete}
              disabled={deleteLoading}
              className="px-4 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all disabled:opacity-50"
            >
              {deleteLoading ? (
                <div className="h-4 w-4 border-2 border-slate-200 border-t-rose-600 rounded-full animate-spin"></div>
              ) : (
                <Trash2 size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

StaffCard.displayName = 'StaffCard';

function HospitalAdminStaff() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterDepartment, setFilterDepartment] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data: staff = [], isLoading: loading, refetch } = useQuery<any[]>({
    queryKey: ['hospital-admin-staff'],
    queryFn: async () => {
      try {
        const data = await hospitalAdminService.getStaff();
        return data.staff || [];
      } catch (error: any) {
        console.error("Failed to fetch staff:", error);
        toast.error(error.message || "Failed to load staff");
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to retract ${name} from the active registry?`)) {
      return;
    }

    setDeleteLoading(id);
    try {
      await hospitalAdminService.deleteStaff(id);
      toast.success(`${name} has been removed from the directory`);
      refetch();
    } catch (error: any) {
      console.error("Failed to delete staff:", error);
      toast.error(error.message || "Operation failed");
    } finally {
      setDeleteLoading(null);
    }
  };

  const filteredStaff = useMemo(() => {
    return staff.filter((member) => {
      const matchesSearch =
        !debouncedSearch ||
        member.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        member.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        member.employeeId?.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesDepartment =
        !filterDepartment || member.department === filterDepartment;

      return matchesSearch && matchesDepartment;
    });
  }, [staff, debouncedSearch, filterDepartment]);

  const departments = useMemo(() => {
    return Array.from(
      new Set(staff.map((member) => member.department).filter(Boolean))
    ).sort();
  }, [staff]);

  const paginatedStaff = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredStaff.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStaff, page]);

  const totalPages = Math.ceil(filteredStaff.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterDepartment]);

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Simple Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Personnel Directory</h1>
          <p className="text-sm text-slate-500 font-medium flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
            {filteredStaff.length} active institutional nodes
          </p>
        </div>
        <button
          onClick={() => router.push('/hospital-admin/staff/create')}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
        >
          <UserPlus className="w-4 h-4" strokeWidth={3} /> Register Personnel
        </button>
      </div>

      {/* Simple Controller */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, employee ID, or secure email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Filter className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none cursor-pointer transition-all"
            >
              <option value="">Global Filter</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Clean Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-white rounded-3xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="p-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
          <Users className="mx-auto mb-6 text-slate-200" size={64} strokeWidth={1} />
          <h3 className="text-xl font-black text-slate-900 italic">No personnel detected</h3>
          <p className="text-sm text-slate-400 mt-2 font-medium">Try recalibrating your search parameters.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedStaff.map((member) => (
              <StaffCard
                key={member._id || member.staffProfileId}
                member={member}
                onView={() => router.push(`/hospital-admin/staff/${member._id || member.staffProfileId}`)}
                onEdit={() => router.push(`/hospital-admin/staff/edit/${member._id || member.staffProfileId}`)}
                onDelete={() => handleDelete(member._id || member.staffProfileId, member.name)}
                deleteLoading={deleteLoading === (member._id || member.staffProfileId)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-900 hover:text-white disabled:opacity-50 transition-all"
              >
                Prev
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Layer {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-900 hover:text-white disabled:opacity-50 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(HospitalAdminStaff);
