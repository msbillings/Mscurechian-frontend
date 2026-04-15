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
  Eye,
  Mail,
  Phone,
  Award,
  Calendar,
  IndianRupee,
  Search,
  Filter,
  Power,
  Ban,
  ShieldCheck,
  ShieldOff
} from "lucide-react";
import { PageHeader, Card, Button } from "@/components/admin";
import { RegistrySkeleton } from "@/components/admin/Skeletons";
import { ConfirmModal } from '@/components/admin/Modal';
import { useTenantLink } from '@/hooks/useTenantLink';

function HospitalAdminDoctors() {
  const router = useRouter();
  const { getPath } = useTenantLink();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // ✅ CRITICAL FIX: Use React Query instead of useState + useEffect
  const { data: doctors = [], isLoading: loading, error, refetch } = useQuery<any[]>({
    queryKey: ['hospital-admin-doctors'],
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
    gcTime: 15 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    retry: 1,
  });

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: () => { } });

  const handleDeactivate = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Deactivate Faculty",
      message: `Are you sure you want to deactivate Dr. ${name}? The physician node will be placed in suspension but metadata will be preserved.`,
      onConfirm: async () => {
        setDeleteLoading(`${id}:toggle`);
        try {
          await hospitalAdminService.deactivateDoctor(id);
          toast.success(`Dr. ${name} suspended successfully`);
          refetch();
        } catch (error: any) {
          console.error("Failed to deactivate doctor:", error);
          toast.error(error.message || "Failed to deactivate faculty node");
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
      title: "Reactivate Faculty",
      message: `Ready to restore operational status for Dr. ${name}?`,
      onConfirm: async () => {
        setDeleteLoading(`${id}:toggle`);
        try {
          await hospitalAdminService.activateDoctor(id);
          toast.success(`Dr. ${name} restored to active registry`);
          refetch();
        } catch (error: any) {
          console.error("Failed to activate doctor:", error);
          toast.error(error.message || "Failed to reactivate faculty node");
        } finally {
          setDeleteLoading(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handlePermanentDelete = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Permanent Node Purge",
      message: `CRITICAL: Are you sure you want to permanently purge Dr. ${name}? All clinical metadata, credentials, and links to this node will be wiped. Action is IRREVERSIBLE.`,
      onConfirm: async () => {
        setDeleteLoading(`${id}:delete`);
        try {
          await hospitalAdminService.deleteDoctor(id);
          toast.success(`Faculty node ${name} purged from mainframe`);
          refetch();
        } catch (error: any) {
          console.error("Failed to delete doctor:", error);
          toast.error(error.message || "Purge failed — ensure node is inactive first");
        } finally {
          setDeleteLoading(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // ✅ OPTIMIZATION: Memoize unique specialties
  const specialties = useMemo(() =>
    Array.from(new Set(doctors.flatMap((d) => (d.specialties || []).map((s: string) => String(s || '').trim())))).sort(),
    [doctors]
  );

  // ✅ OPTIMIZATION: Memoize filtered doctors
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
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 rounded-xl animate-pulse"></div>
            <div className="h-4 w-40 bg-slate-100 rounded-lg animate-pulse"></div>
          </div>
          <div className="h-10 w-44 bg-slate-200 rounded-xl animate-pulse"></div>
        </div>
        <RegistrySkeleton gridCol={3} count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-slate-50/50 min-h-screen">
      {/* Simple Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 tracking-tight">Clinical Consultants</h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">Registry of {doctors.length} verified medical staff</p>
        </div>
        <button
          onClick={() => router.push(getPath('/hospital-admin/doctors/create'))}
          className="flex items-center justify-center gap-2 px-3 py-2 md:px-6 md:py-2.5 bg-blue-600 text-white rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all self-start md:self-auto w-full md:w-auto"
        >
          <Plus size={16} strokeWidth={3} /> Onboard Physician
        </button>
      </div>

      {/* Simple Controller */}
      <div className="bg-white p-2 md:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by faculty name, physician ID, or clinical email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          />
        </div>
        <div className="relative w-full md:w-64">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            value={filterSpecialty}
            onChange={(e) => setFilterSpecialty(e.target.value)}
            className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none cursor-pointer transition-all"
          >
            <option value="">Global Specialties</option>
            {specialties.map((spec) => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Clean Grid */}
      {filteredDoctors.length === 0 ? (
        <div className="p-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Stethoscope className="text-slate-200 w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-slate-900 italic">No faculty members detected</h3>
          <p className="text-sm text-slate-400 mt-2 font-medium">Recalibrate your search parameters or onboard new staff.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doctor) => (
            <div key={doctor._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col group overflow-hidden">
              {/* Pro Header */}
              <div className="p-2 md:p-6 bg-slate-50 relative border-b border-slate-100">
                <div className="absolute top-0 right-0 p-2 md:p-4 md:p-8 opacity-5 pointer-events-none">
                  <Stethoscope size={80} className="text-slate-900" />
                </div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 overflow-hidden shadow-sm">
                    {doctor.profilePic ? (
                      <img src={doctor.profilePic} className="w-full h-full object-cover" />
                    ) : (
                      <Stethoscope size={24} strokeWidth={2.5} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm md:text-lg font-black text-slate-900 truncate leading-tight">{doctor.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">
                        {doctor.doctorId || 'ID_PENDING'}
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${doctor.status === 'inactive' ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                        {doctor.status || 'Active'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pro Body */}
              <div className="p-2 md:p-6 flex-1 space-y-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  {(doctor.specialties || []).slice(0, 2).map((s: string, i: number) => (
                    <span key={i} className="text-[10px] font-black text-slate-500 uppercase tracking-tighter bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      {s}
                    </span>
                  ))}
                  {(doctor.specialties || []).length > 2 && (
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                      +{(doctor.specialties || []).length - 2}
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 pb-6 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-slate-50 rounded-lg">
                      <Phone size={12} className="text-slate-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 truncate">{doctor.mobile || doctor.phone || "No phone number"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-slate-50 rounded-lg">
                      <Mail size={12} className="text-slate-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 truncate">{doctor.email || "No clinical email"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-slate-50 rounded-lg">
                      <Award size={12} className="text-slate-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 truncate">{doctor.qualifications?.join(', ') || 'General Physician'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-slate-50 rounded-lg">
                      <Calendar size={12} className="text-slate-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-600">
                      {doctor.experienceStart
                        ? `${Math.max(0, new Date().getFullYear() - new Date(doctor.experienceStart).getFullYear())} Years Experience`
                        : doctor.experienceYears
                          ? `${doctor.experienceYears} Years Experience`
                          : 'Experience N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50/50 p-2 md:p-4 rounded-xl mb-4">
                  <div className="text-center flex-1 border-r border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Consultation</p>
                    <p className="text-sm font-black text-slate-900">₹{doctor.consultationFee || '0'}</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Rating</p>
                    <p className="text-sm font-black text-blue-600 flex items-center justify-center gap-1">
                      4.8 <span className="text-[10px] text-slate-300 font-bold">★</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(getPath(`/hospital-admin/doctors/${doctor.doctorProfileId || doctor._id}`))}
                    className="flex-1 py-3 bg-primary-theme text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all"
                  >
                    Full Profile
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => router.push(getPath(`/hospital-admin/doctors/edit/${doctor._id}`))}
                      className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 transition-all hover:bg-slate-50"
                      title="Edit Profile"
                    >
                      <Edit size={16} />
                    </button>

                    {/* Activate/Deactivate Status Toggle */}
                    <button
                      onClick={() => doctor.status === 'inactive' ? handleActivate(doctor.doctorProfileId || doctor._id, doctor.name) : handleDeactivate(doctor.doctorProfileId || doctor._id, doctor.name)}
                      disabled={!!deleteLoading && deleteLoading.startsWith(doctor.doctorProfileId || doctor._id)}
                      className={`px-3 py-2 rounded-xl bg-white border border-slate-200 transition-all disabled:opacity-50 ${doctor.status === 'inactive'
                        ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200'
                        : 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200'
                        }`}
                      title={doctor.status === 'inactive' ? "Reactivate Physician" : "Suspend Physician"}
                    >
                      {deleteLoading === `${doctor.doctorProfileId || doctor._id}:toggle` ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        doctor.status === 'inactive' ? <ShieldCheck size={16} strokeWidth={2.5} /> : <ShieldOff size={16} strokeWidth={2.5} />
                      )}
                    </button>

                    {/* Permanent Delete - Only Visible when Inactive */}
                    {doctor.status === 'inactive' && (
                      <button
                        onClick={() => handlePermanentDelete(doctor.doctorProfileId || doctor._id, doctor.name)}
                        disabled={!!deleteLoading && deleteLoading.startsWith(doctor.doctorProfileId || doctor._id)}
                        className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all disabled:opacity-50"
                        title="Permanent Master Delete"
                      >
                        {deleteLoading === `${doctor.doctorProfileId || doctor._id}:delete` ? (
                          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    )}
                  </div>
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

// ✅ OPTIMIZED: Memoized component
export default React.memo(HospitalAdminDoctors);
