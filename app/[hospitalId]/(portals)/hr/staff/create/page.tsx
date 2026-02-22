'use client';

import React, { useState } from 'react';
import {
  UserPlus,
  ArrowLeft,
  Mail,
  Phone,
  User,
  Lock,
  Calendar,
  Briefcase,
  Save,
  Loader2,
} from 'lucide-react';
import { useCreateStaff } from '@/lib/integrations/hooks';
import { useParams, useRouter } from 'next/navigation';
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

export default function CreateStaffPage() {
  const { hospitalId } = useParams();
  const router = useRouter();
  const createStaffMutation = useCreateStaff();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    role: 'staff',
    gender: 'male',
    dateOfBirth: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStaffMutation.mutateAsync(formData);
      toast.success('Staff member created successfully!');
      router.push(`/${hospitalId}/hr/staff`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create staff member');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2.5 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Add New Personnel</h1>
          <p className="text-gray-500 font-medium">Onboard a new staff member to the hospital system.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <input
                required
                type="text"
                name="name"
                placeholder="John Doe"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-gray-900 transition-all"
                onChange={handleChange}
                value={formData.name}
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned Role</label>
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <select
                required
                name="role"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-gray-600 appearance-none uppercase text-xs tracking-widest"
                onChange={handleChange}
                value={formData.role}
              >
                {STAFF_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <input
                required
                type="email"
                name="email"
                placeholder="john@hospital.com"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-gray-900 transition-all"
                onChange={handleChange}
                value={formData.email}
              />
            </div>
          </div>

          {/* Mobile */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <input
                required
                type="tel"
                name="mobile"
                placeholder="+1 234 567 890"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-gray-900 transition-all"
                onChange={handleChange}
                value={formData.mobile}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <input
                required
                type="password"
                name="password"
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-gray-900 transition-all"
                onChange={handleChange}
                value={formData.password}
              />
            </div>
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date of Birth</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <input
                name="dateOfBirth"
                type="date"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-gray-600 transition-all"
                onChange={handleChange}
                value={formData.dateOfBirth}
              />
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Gender</label>
            <select
              name="gender"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-gray-600 appearance-none uppercase text-xs tracking-widest"
              onChange={handleChange}
              value={formData.gender}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-50 flex justify-end">
          <button
            type="submit"
            disabled={createStaffMutation.isPending}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-xl font-black transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {createStaffMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
            )}
            Onboard Staff Member
          </button>
        </div>
      </form>
    </div>
  );
}
