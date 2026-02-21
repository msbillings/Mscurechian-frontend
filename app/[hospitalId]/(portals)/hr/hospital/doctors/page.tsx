"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useQuery } from '@tanstack/react-query';
import { hospitalAdminService } from "@/lib/integrations";
import {
  Stethoscope,
  Eye,
  Mail,
  Award,
  Calendar,
  Search,
  Filter,
  Info
} from "lucide-react";

function HRHospitalDoctors() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");

  const { data: doctors = [], isLoading: loading } = useQuery<any[]>({
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
    staleTime: 5 * 60 * 1000,
  });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium tracking-tight">Syncing clinical staff registry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical Staff Registry</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Personnel view of {doctors.length} verified physicians (Read-Only)</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Governance Mode</span>
        </div>
      </div>

      {/* Controller */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ID, or clinical email..."
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
            <option value="">All Specialties</option>
            {specialties.map((spec) => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {filteredDoctors.length === 0 ? (
        <div className="p-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Stethoscope className="text-slate-200 w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-slate-900 italic">No faculty members detected</h3>
          <p className="text-sm text-slate-400 mt-2 font-medium">Recalibrate your search parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doctor) => (
            <div key={doctor._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col group overflow-hidden">
              <div className="p-6 bg-slate-50 relative border-b border-slate-100">
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 overflow-hidden shadow-sm">
                    {doctor.profilePic ? (
                      <img src={doctor.profilePic} className="w-full h-full object-cover" alt={doctor.name} />
                    ) : (
                      <Stethoscope size={24} strokeWidth={2.5} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-black text-slate-900 truncate leading-tight">{doctor.name}</h3>
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

              <div className="p-6 flex-1 space-y-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  {(doctor.specialties || []).map((s: string, i: number) => (
                    <span key={i} className="text-[10px] font-black text-slate-500 uppercase tracking-tighter bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      {s}
                    </span>
                  ))}
                </div>

                <div className="space-y-2.5 pb-6 border-b border-slate-50">
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
                    <span className="text-xs font-bold text-slate-600">{doctor.experienceYears || '0'} Years Experience</span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-xl mb-4">
                  <div className="text-center flex-1 border-r border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Consultation</p>
                    <p className="text-sm font-black text-slate-900">₹{doctor.consultationFee || '0'}</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Performance</p>
                    <p className="text-sm font-black text-indigo-600 flex items-center justify-center gap-1">
                      4.8 <span className="text-[10px] text-slate-300 font-bold">★</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    disabled
                    className="flex-1 py-3 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed"
                  >
                    View Full Dossier
                  </button>
                  <button
                    disabled
                    className="px-4 py-3 rounded-xl bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(HRHospitalDoctors);
