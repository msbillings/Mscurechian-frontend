"use client";

import React, { useState } from 'react';
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import {
  Headphones,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Search,
  Copy,
  RefreshCw,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  User,
} from "lucide-react";
import { Modal, ConfirmModal, FormInput, FormSelect, FormTextarea } from "@/components/admin";

interface Helpdesk {
  _id: string;
  name?: string;
  email?: string;
  mobile?: string;
  loginId?: string;
  status?: string;
  additionalNotes?: string;
  assignedStaff?: {
    user?: {
      name: string;
    };
  };
}

interface Credentials {
  name: string;
  loginId: string;
  password: string;
}

export default function HelpdeskManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCredModalOpen, setIsCredModalOpen] = useState(false);

  // Data state
  const [selectedHelpdesk, setSelectedHelpdesk] = useState<Helpdesk | null>(null);
  const [createdCreds, setCreatedCreds] = useState<Credentials | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [formData, setFormData] = useState({
    staffId: "",
    name: "",
    email: "",
    mobile: "",
    password: "",
    gender: "",
    dateOfBirth: "",
    department: "",
    designation: "Helpdesk",
    employeeId: "",
    employmentType: "full-time",
    experienceYears: "",
    joiningDate: new Date().toISOString().split('T')[0],
    shift: "",
    startTime: "09:00",
    endTime: "17:00",
    weeklyOff: ["Saturday", "Sunday"] as string[],
    baseSalary: "0",
    panNumber: "",
    aadharNumber: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);

  // Queries
  const { data: helpdesks = [], isLoading: isHelpdesksLoading } = useQuery({
    queryKey: ['helpdesks'],
    queryFn: async () => {
      const resp = await hospitalAdminService.getHelpdesks();
      return (resp.helpdesks || []).map((h: any) => ({
        ...h,
        loginId: h.loginId || h.logid || `HELP-${h._id?.slice(-4)}`
      }));
    }
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-simple'],
    queryFn: async () => {
      const resp = await hospitalAdminService.getStaff();
      return resp.staff || [];
    }
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['hospital-shifts'],
    queryFn: () => hospitalAdminService.getShifts()
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['hospital-departments'],
    queryFn: async () => {
      const res = await hospitalAdminService.getHospitalMetadata();
      return res.data.unitTypes || [];
    }
  });

  // Input handlers with restrictions
  const handleChange = (field: string, value: string) => {
    // Input-level restrictions
    if (field === 'mobile' && !/^\d{0,10}$/.test(value)) return;
    if (field === 'aadharNumber' && !/^\d{0,12}$/.test(value)) return;
    if (field === 'panNumber' && value.length > 10) return;
    if (field === 'experienceYears' && !/^\d{0,2}$/.test(value)) return;
    if (field === 'baseSalary' && (!/^\d*$/.test(value) || value.length > 10)) return;
    if (field === 'name' && value.length > 100) return;
    if (field === 'employeeId' && value.length > 20) return;
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handlers
  const handleEditClick = (helpdesk: Helpdesk) => {
    setSelectedHelpdesk(helpdesk);
    setFormData({
      staffId: "",
      name: helpdesk.name || "",
      email: helpdesk.email || "",
      mobile: helpdesk.mobile || "",
      password: "",
      gender: "",
      dateOfBirth: "",
      department: "",
      designation: "Helpdesk",
      employeeId: "",
      employmentType: "full-time",
      experienceYears: "",
      joiningDate: new Date().toISOString().split('T')[0],
      shift: "",
      startTime: "09:00",
      endTime: "17:00",
      weeklyOff: ["Saturday", "Sunday"],
      baseSalary: "0",
      panNumber: "",
      aadharNumber: "",
      notes: helpdesk.additionalNotes || ""
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (helpdesk: Helpdesk) => {
    setSelectedHelpdesk(helpdesk);
    setIsDeleteModalOpen(true);
  };

  const copyToClipboard = (val?: string, label = "Copied") => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    toast.success(label);
  };

  const onAddHelpdesk = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Comprehensive Validations
    const nameTrimmed = formData.name.trim();
    const emailTrimmed = formData.email.trim();
    
    if (!nameTrimmed) return toast.error("Full Name is required");
    if (!/^[a-zA-Z\s.'-]+$/.test(nameTrimmed)) return toast.error("Name can only contain letters, spaces, dots, and hyphens");
    
    if (!formData.mobile) return toast.error("Mobile number is required");
    if (formData.mobile.length !== 10) return toast.error("Mobile number must be exactly 10 digits");
    
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed))
      return toast.error("Please enter a valid email address");
      
    if (!formData.password) return toast.error("Account password is required");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters long");
    
    if (!formData.department) return toast.error("Department is required");
    if (!formData.designation.trim()) return toast.error("Designation is required");
    
    if (formData.aadharNumber && formData.aadharNumber.length !== 12) 
      return toast.error("Aadhar number must be exactly 12 digits");
      
    if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase()))
      return toast.error("Please enter a valid PAN number (e.g., ABCDE1234F)");

    if (formData.notes.length > 500) return toast.error("Notes cannot exceed 500 characters");

    try {
      setLoading(true);
      const loginId = formData.employeeId || `HUB-${Math.floor(1000 + Math.random() * 9000)}`;

      const resp: any = await hospitalAdminService.createHelpdesk({
        ...formData,
        loginId,
        additionalNotes: formData.notes,
        workingHours: {
          start: formData.startTime,
          end: formData.endTime
        }
      });

      // Close add modal and show credentials modal
      setIsAddModalOpen(false);
      setFormData({ 
        staffId: "", name: "", email: "", mobile: "", password: "", notes: "",
        gender: "", dateOfBirth: "", department: "", designation: "Helpdesk",
        employeeId: "", employmentType: "full-time", experienceYears: "",
        joiningDate: new Date().toISOString().split('T')[0],
        shift: "", startTime: "09:00", endTime: "17:00", weeklyOff: ["Saturday", "Sunday"],
        baseSalary: "0", panNumber: "", aadharNumber: ""
      });
      queryClient.invalidateQueries({ queryKey: ['helpdesks'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-admin', 'dashboard'] });

      const helpdeskName = resp?.helpdesk?.name || formData.name;
      setCreatedCreds({ name: helpdeskName, loginId, password: formData.password });
      setShowPassword(false);
      setIsCredModalOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSelect = (staffId: string) => {
    const selected = staff.find((s: any) => s._id === staffId);
    if (selected) {
      setFormData({
        ...formData,
        staffId,
        name: selected.name || "",
        email: selected.email || selected.user?.email || "",
        mobile: selected.mobile || selected.user?.mobile || "",
        gender: selected.gender || selected.user?.gender || "",
        dateOfBirth: selected.dateOfBirth || selected.user?.dateOfBirth || "",
        department: selected.department || "",
        designation: selected.designation || "Helpdesk",
        employeeId: selected.employeeId || "",
        baseSalary: selected.baseSalary ? selected.baseSalary.toString() : "0",
      });
    } else {
      setFormData({ 
        ...formData, staffId: "", name: "", email: "", mobile: "", 
        gender: "", dateOfBirth: "", department: "", designation: "Helpdesk",
        employeeId: "", baseSalary: "0" 
      });
    }
  };

  const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const toggleWeeklyOff = (day: string) => {
    setFormData(prev => ({
      ...prev,
      weeklyOff: prev.weeklyOff.includes(day)
        ? prev.weeklyOff.filter(d => d !== day)
        : [...prev.weeklyOff, day]
    }));
  };

  const onUpdateHelpdesk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHelpdesk) return;

    const nameTrimmed = formData.name.trim();
    const emailTrimmed = formData.email.trim();

    if (!nameTrimmed) return toast.error("Name is required");
    if (!/^[a-zA-Z\s.'-]+$/.test(nameTrimmed)) return toast.error("Name can only contain letters, spaces, dots, and hyphens");
    
    if (!formData.mobile) return toast.error("Mobile number is required");
    if (formData.mobile.length !== 10) return toast.error("Mobile number must be exactly 10 digits");
    
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed))
      return toast.error("Please enter a valid email address");

    if (formData.password && formData.password.length < 6) 
      return toast.error("New password must be at least 6 characters long");

    try {
      setLoading(true);
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile,
        additionalNotes: formData.notes
      };
      if (formData.password) payload.password = formData.password;

      await hospitalAdminService.updateHelpdesk(selectedHelpdesk._id, payload);
      toast.success("Details updated");
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['helpdesks'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-admin', 'dashboard'] });
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const onDeleteConfirm = async () => {
    if (!selectedHelpdesk) return;
    try {
      await hospitalAdminService.deleteHelpdesk(selectedHelpdesk._id);
      toast.success("Staff removed");
      setIsDeleteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['helpdesks'] });
    } catch (err: any) {
      toast.error("Delete failed");
    }
  };

  const onResetPassword = async (helpdesk: Helpdesk) => {
    const confirmed = window.confirm(`Reset password for ${helpdesk.name || 'this staff'}?`);
    if (!confirmed) return;

    try {
      const newPass = Math.random().toString(36).slice(-8).toUpperCase();
      await hospitalAdminService.updateHelpdesk(helpdesk._id, { password: newPass });

      // Show credentials modal with new password
      setCreatedCreds({
        name: helpdesk.name || "Helpdesk Staff",
        loginId: helpdesk.loginId || "",
        password: newPass
      });
      setShowPassword(false);
      setIsCredModalOpen(true);
    } catch (err) {
      toast.error("Reset failed");
    }
  };

  const filtered = helpdesks.filter(h =>
    h.name?.toLowerCase().includes(search.toLowerCase()) ||
    h.loginId?.toLowerCase().includes(search.toLowerCase()) ||
    h.mobile?.includes(search)
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
            <Headphones size={24} className="text-blue-500" />
            Helpdesk Staff
          </h1>
          <p className="text-sm text-slate-500">Manage support hub personnel and credentials</p>
        </div>
        <button
          onClick={() => { 
            setFormData({ 
              staffId: "", name: "", email: "", mobile: "", password: "", notes: "",
              gender: "", dateOfBirth: "", department: "", designation: "Helpdesk",
              employeeId: "", employmentType: "full-time", experienceYears: "",
              joiningDate: new Date().toISOString().split('T')[0],
              shift: "", startTime: "09:00", endTime: "17:00", weeklyOff: ["Saturday", "Sunday"],
              baseSalary: "0", panNumber: "", aadharNumber: ""
            }); 
            setIsAddModalOpen(true); 
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm"
        >
          <Plus size={18} />
          Add Hub Staff
        </button>
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
        <input
          type="text"
          placeholder="Search by name, login ID, or mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 outline-none transition-all text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">NAME</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">CONTACT</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">LOGIN ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">STATUS</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isHelpdesksLoading ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 text-sm italic">Loading personnel records...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 text-sm italic">No helpdesk accounts found.</td></tr>
              ) : filtered.map((h) => (
                <tr key={h._id} className="hover:bg-slate-50/30 transition-colors group">
                  {/* Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                        {(h.name || "H").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{h.name || h.assignedStaff?.user?.name || "—"}</span>
                    </div>
                  </td>
                  {/* Contact */}
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone size={13} className="text-slate-400" />
                        {h.mobile || "—"}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Mail size={13} className="text-slate-400" />
                        {h.email || "—"}
                      </div>
                    </div>
                  </td>
                  {/* Login ID */}
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                      <span className="text-xs font-mono font-bold text-slate-700">{h.loginId || "—"}</span>
                      {h.loginId && (
                        <button onClick={() => copyToClipboard(h.loginId, "Login ID copied!")} className="text-slate-300 hover:text-blue-500 transition-colors" title="Copy Login ID">
                          <Copy size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      {h.status?.toUpperCase() || 'ACTIVE'}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => onResetPassword(h)}
                        className="text-orange-400 hover:text-orange-600 transition-colors"
                        title="Reset Password"
                      >
                        <KeyRound size={17} />
                      </button>
                      <button onClick={() => handleEditClick(h)} className="text-blue-400 hover:text-blue-600 transition-colors" title="Edit">
                        <Edit2 size={17} />
                      </button>
                      <button onClick={() => handleDeleteClick(h)} className="text-red-400 hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Add Modal ─────────────────────────────────────────────────────── */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Initialize Hub Account" maxWidth="max-w-2xl">
        <form onSubmit={onAddHelpdesk} className="space-y-6 pt-2">
          {/* Modal Tabs */}
          <div className="flex border-b border-slate-100 gap-6 px-1">
            {["basic", "employment", "schedule", "financial"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === tab ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="min-h-[300px]">
            {activeTab === "basic" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Full Name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required />
                  <FormSelect 
                    label="Gender" 
                    value={formData.gender} 
                    onChange={(e) => handleChange('gender', e.target.value)}
                    options={[{label: "Select", value: ""}, {label: "Male", value: "male"}, {label: "Female", value: "female"}, {label: "Other", value: "other"}]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Mobile Number" value={formData.mobile} onChange={(e) => handleChange('mobile', e.target.value)} required placeholder="10-digit mobile" />
                  <FormInput label="Email Address" type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Date of Birth" type="date" value={formData.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)} />
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Account Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/10"
                        placeholder="Min. 6 characters"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "employment" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <FormSelect
                    label="Department"
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    options={[
                      { label: "Select Department", value: "" },
                      ...departments.map((d: string) => ({ label: d, value: d }))
                    ]}
                    required
                  />
                  <FormInput label="Designation" value={formData.designation} onChange={(e) => handleChange('designation', e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Employee ID (Internal)" value={formData.employeeId} onChange={(e) => handleChange('employeeId', e.target.value)} placeholder="e.g. HELP-001" />
                  <FormInput label="Joining Date" type="date" value={formData.joiningDate} onChange={(e) => handleChange('joiningDate', e.target.value)} />
                </div>
                <FormSelect
                  label="Contract Type"
                  value={formData.employmentType}
                  onChange={(e) => handleChange('employmentType', e.target.value)}
                  options={[{ label: "Full Time", value: "full-time" }, { label: "Part Time", value: "part-time" }, { label: "Contract", value: "contract" }]}
                />
              </div>
            )}

            {activeTab === "schedule" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <FormSelect
                    label="Assigned Shift"
                    value={formData.shift}
                    onChange={(e) => {
                      const selectedShift = (shifts as any[]).find(s => s._id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        shift: e.target.value,
                        startTime: selectedShift?.startTime || "09:00",
                        endTime: selectedShift?.endTime || "17:00"
                      });
                    }}
                    options={[
                      { label: "Select Work Shift", value: "" },
                      ...(shifts as any[]).map(s => ({ label: `${s.name} (${s.startTime} - ${s.endTime})`, value: s._id }))
                    ]}
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Shift Start</p>
                      <p className="text-sm font-bold text-slate-700">{formData.startTime}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Shift End</p>
                      <p className="text-sm font-bold text-slate-700">{formData.endTime}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Weekly Off Days</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <button 
                        key={day} 
                        type="button"
                        onClick={() => toggleWeeklyOff(day)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                          formData.weeklyOff.includes(day)
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                        }`}
                      >
                        {day.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "financial" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <FormInput
                  label="Monthly Base Salary"
                  type="text"
                  value={formData.baseSalary}
                  onChange={(e) => handleChange('baseSalary', e.target.value)}
                  placeholder="0"
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="PAN Number" value={formData.panNumber} onChange={(e) => handleChange('panNumber', e.target.value.toUpperCase())} placeholder="ABCDE1234F" />
                  <FormInput label="Aadhar Number" value={formData.aadharNumber} onChange={(e) => handleChange('aadharNumber', e.target.value)} placeholder="12-digit number" />
                </div>
                <FormTextarea
                  label="Access/Internal Notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Additional instructions..."
                  rows={3}
                  maxLength={500}
                />
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 max-w-[300px]">Registration will create a secure login and initial staff profile record.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-60"
              >
                {loading ? "Initializing..." : "Register Hub Account"}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ─── Credentials Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={isCredModalOpen}
        onClose={() => setIsCredModalOpen(false)}
        title="Helpdesk Credentials"
        maxWidth="max-w-md"
      >
        <div className="pt-2 space-y-5">
          {/* Success banner */}
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <ShieldCheck size={22} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-700">Account ready!</p>
              <p className="text-xs text-emerald-600">Save these credentials — the password won't be shown again.</p>
            </div>
          </div>

          {/* Staff name */}
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
              {(createdCreds?.name || "H").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Staff Member</p>
              <p className="text-sm font-semibold text-slate-700">{createdCreds?.name}</p>
            </div>
          </div>

          {/* Login ID */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login ID</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-mono font-bold text-slate-800 tracking-wider">{createdCreds?.loginId}</span>
              <button
                onClick={() => copyToClipboard(createdCreds?.loginId, "Login ID copied!")}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded-lg px-3 py-1.5 bg-white transition-colors"
              >
                <Copy size={13} /> Copy
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Password (one-time visible)</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-mono font-bold text-slate-800 tracking-wider">
                {showPassword ? createdCreds?.password : "••••••••"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPassword(v => !v)}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => copyToClipboard(createdCreds?.password, "Password copied!")}
                  className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-medium border border-amber-300 rounded-lg px-3 py-1.5 bg-white transition-colors"
                >
                  <Copy size={13} /> Copy
                </button>
              </div>
            </div>
          </div>

          {/* Copy all */}
          <button
            onClick={() => {
              const text = `Login ID: ${createdCreds?.loginId}\nPassword: ${createdCreds?.password}`;
              copyToClipboard(text, "Both credentials copied!");
            }}
            className="w-full border border-slate-200 rounded-xl py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Copy size={14} /> Copy Both Credentials
          </button>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => setIsCredModalOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Edit Modal ────────────────────────────────────────────────────── */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Staff Details" maxWidth="max-w-md">
        <form onSubmit={onUpdateHelpdesk} className="space-y-4 pt-2">
          <FormInput
            label="Display Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
            <FormInput
              label="Mobile"
              value={formData.mobile}
              onChange={(e) => handleChange('mobile', e.target.value)}
            />
          </div>
          <FormInput
            label="Update Password (Optional)"
            type="password"
            placeholder="Min. 6 characters"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
          />
          <FormTextarea
            label="Internal Notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={2}
            maxLength={500}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-blue-700 transition-all disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete Confirm ─────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={onDeleteConfirm}
        title="Remove Hub Staff"
        message="Are you sure? This will immediately revoke their dashboard access and credentials. This action cannot be undone."
        confirmText="Remove Access"
      />
    </div>
  );
}
