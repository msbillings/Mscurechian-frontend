"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useQuery } from '@tanstack/react-query';
import { hospitalAdminService } from "@/lib/integrations";
import {
  Stethoscope,
  Plus,
  Trash2,
  Edit,
  Mail,
  Phone,
  Award,
  Calendar,
  Search,
  Filter,
  ShieldCheck,
  ShieldOff
} from "lucide-react";
import { RegistrySkeleton } from "@/components/admin/Skeletons";
import { ConfirmModal } from '@/components/admin/Modal';
import { useTenantLink } from '@/hooks/useTenantLink';

function MasterHelpdeskDoctors() {
  const router = useRouter();
  const { getPath } = useTenantLink();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const { data: doctors = [], isLoading: loading, refetch } = useQuery<any[]>({
    queryKey: ['masterhelpdesk-doctors'],
    queryFn: async () => {
      try {
        const data = await hospitalAdminService.getDoctors();
        return data.doctors || [];
      } catch (error: any) {
        console.error("Failed to fetch doctors:", error);
        toast.error(error.message || "Failed to load doctors");
        throw error;
      }
    },
    staleTime: 30000,
  });

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: () => { } });

  const handleDeactivate = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Deactivate Doctor",
      message: `Are you sure you want to deactivate Dr. ${name}?`,
      onConfirm: async () => {
        setDeleteLoading(`${id}:toggle`);
        try {
          await hospitalAdminService.deactivateDoctor(id);
          toast.success(`Dr. ${name} deactivated successfully`);
          refetch();
        } catch (error: any) {
          toast.error(error.message || "Failed to deactivate doctor");
        } finally {
          setDeleteLoading(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleActivate = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Activate Doctor",
      message: `Ready to restore Dr. ${name}?`,
      onConfirm: async () => {
        setDeleteLoading(`${id}:toggle`);
        try {
          await hospitalAdminService.activateDoctor(id);
          toast.success(`Dr. ${name} activated successfully`);
          refetch();
        } catch (error: any) {
          toast.error(error.message || "Failed to activate doctor");
        } finally {
          setDeleteLoading(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDelete = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Permanent Deletion",
      message: `Are you absolutely sure you want to PERMANENTLY DELETE Dr. ${name}? This action cannot be undone.`,
      onConfirm: async () => {
        setDeleteLoading(`${id}:delete`);
        try {
          await hospitalAdminService.deleteDoctor(id);
          toast.success(`Dr. ${name} deleted from hospital records`);
          refetch();
        } catch (error: any) {
          toast.error(error.message || "Failed to delete doctor");
        } finally {
          setDeleteLoading(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const specialties = useMemo(() =>
    Array.from(new Set(doctors.flatMap((d) => (d.specialties || []).map((s: string) => String(s || '').trim())))).sort(),
    [doctors]
  );

  const filteredDoctors = useMemo(() => doctors.filter((doctor) => {
    const matchesSearch =
      doctor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.doctorId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpecialty =
      !filterSpecialty ||
      doctor.specialties?.includes(filterSpecialty);

    return matchesSearch && matchesSpecialty;
  }), [doctors, searchTerm, filterSpecialty]);


  if (loading && !doctors.length) {
    return (
      <div className="p-3 md:p-8 space-y-8 bg-slate-50/50 min-h-screen">
        <RegistrySkeleton gridCol={3} count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-slate-50/50 min-h-screen p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Doctors Registry</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage and view all registered doctors ({doctors.length})</p>
        </div>
        <button
          onClick={() => router.push(getPath('/masterhelpdesk/doctors/create'))}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <Plus size={16} strokeWidth={3} /> Add New Doctor
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search doctors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
        <div className="relative w-full md:w-64">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            value={filterSpecialty}
            onChange={(e) => setFilterSpecialty(e.target.value)}
            className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Specialties</option>
            {specialties.map((spec) => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredDoctors.length === 0 ? (
        <div className="p-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
          <Stethoscope className="text-slate-200 w-16 h-16 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No doctors found</h3>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doctor) => (
            <div key={doctor._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col group overflow-hidden">
              <div className="p-6 bg-slate-50 relative border-b border-slate-100">
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm">
                    {doctor.profilePic ? (
                      <img src={doctor.profilePic} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Stethoscope size={24} strokeWidth={2.5} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-slate-900 truncate">{doctor.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-400/10 px-2 py-0.5 rounded border border-indigo-400/20">
                        {doctor.doctorId || 'N/A'}
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${doctor.status === 'inactive' ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {doctor.status || 'Active'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 flex-1 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(doctor.specialties || []).slice(0, 2).map((s: string, i: number) => (
                    <span key={i} className="text-[10px] font-black text-slate-500 uppercase tracking-tighter bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      {s}
                    </span>
                  ))}
                </div>

                <div className="space-y-2 pb-4 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <Phone size={14} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-600">{doctor.mobile || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail size={14} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-600 truncate">{doctor.email || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Award size={14} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-600 truncate">{doctor.qualifications?.join(', ') || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-600">
                      {doctor.experienceYears ? `${doctor.experienceYears} Years Exp.` : 'Exp. N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => router.push(getPath(`/masterhelpdesk/doctors/edit/${doctor._id}`))}
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
                  >
                    Manage
                  </button>
                  <button
                    onClick={() => doctor.status === 'inactive' ? handleActivate(doctor._id, doctor.name) : handleDeactivate(doctor._id, doctor.name)}
                    className={`px-3 py-2 rounded-xl border transition-all ${doctor.status === 'inactive' ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' : 'border-amber-200 text-amber-500 hover:bg-amber-50'}`}
                    disabled={!!deleteLoading}
                  >
                    {doctor.status === 'inactive' ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
                  </button>
                  <button
                    onClick={() => handleDelete(doctor._id, doctor.name)}
                    className="px-3 py-2 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 transition-all"
                    disabled={!!deleteLoading}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}

export default React.memo(MasterHelpdeskDoctors);
