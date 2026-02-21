"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from "next/navigation";
import { hospitalAdminService } from "@/lib/integrations";
import {
  User,
  Mail,
  Phone,
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Briefcase
} from "lucide-react";
import toast from "react-hot-toast";
import { Card, FormInput } from "@/components/admin";

function EditHR() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    gender: "",
    dateOfBirth: "",
    employeeId: "",
    designation: "HR Manager",
    department: "Human Resources",
    status: "active"
  });

  useEffect(() => {
    const fetchHR = async () => {
      try {
        const { staff } = await hospitalAdminService.getHRById(id as string);
        setFormData({
          name: staff.name || "",
          email: staff.email || "",
          mobile: staff.mobile || "",
          gender: staff.gender || "",
          dateOfBirth: staff.dateOfBirth ? staff.dateOfBirth.split('T')[0] : "",
          employeeId: staff.employeeId || "",
          designation: staff.designation || "HR Manager",
          department: staff.department || "Human Resources",
          status: staff.status || "active"
        });
      } catch (error: any) {
        toast.error("Failed to load HR manager details");
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchHR();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "mobile" && !/^\d{0,10}$/.test(value)) return;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await hospitalAdminService.updateHR(id as string, formData);
      toast.success("HR Manager updated successfully");
      router.push("../../hr");
    } catch (error: any) {
      toast.error(error.message || "Failed to update HR");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-12 w-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Edit HR Manager</h1>
          <p className="text-gray-500 text-xs">Update personnel details for {formData.name}.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Personal Information" icon={<User className="text-blue-500" />} padding="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormInput label="Full Name" type="text" name="name" required
              value={formData.name} onChange={handleChange} />
            
            <FormInput label="Email Address" type="email" name="email" required
              value={formData.email} onChange={handleChange} />

            <FormInput label="Mobile Number" type="tel" name="mobile" required
              value={formData.mobile} onChange={handleChange} />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 ml-1">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none">
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <FormInput label="Date of Birth" type="date" name="dateOfBirth"
              value={formData.dateOfBirth} onChange={handleChange} />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 ml-1">Status</label>
              <select name="status" value={formData.status} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </Card>

        <Card title="Work Information" icon={<Briefcase className="text-indigo-500" />} padding="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormInput label="Employee ID" type="text" name="employeeId"
              value={formData.employeeId} onChange={handleChange} />
            <FormInput label="Designation" type="text" name="designation"
              value={formData.designation} onChange={handleChange} readOnly />
            <FormInput label="Department" type="text" name="department"
              value={formData.department} onChange={handleChange} readOnly />
          </div>
        </Card>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {saving ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={18} /> Update HR Manager</>}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditHR;
