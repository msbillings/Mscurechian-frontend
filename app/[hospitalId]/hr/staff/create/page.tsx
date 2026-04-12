"use client";

import React, { useState, useCallback } from 'react';
import { useRouter, useParams } from "next/navigation";
import { hospitalAdminService } from "@/lib/integrations";
import {
  User, Mail, Phone, Briefcase, FileText,
  Clock, Globe, Eye, EyeOff, ArrowLeft,
  Activity, Plus, CreditCard, CheckCircle2,
  AlertCircle, Shield, MapPin, X
} from "lucide-react";
import toast from "react-hot-toast";

interface BankDetails { accountName: string; accountNumber: string; bankName: string; ifscCode: string; }

interface FormData {
  honorific: string;
  name: string; email: string; mobile: string; password: string; gender: string; dateOfBirth: string;
  street: string; city: string; state: string; pincode: string;
  department: string; designation: string; employeeId: string; employmentType: string;
  experienceYears: string; joiningDate: string;
  emergencyContactName: string; emergencyContactMobile: string; emergencyContactRelationship: string;
  shift: string; startTime: string; endTime: string; weeklyOff: string[];
  qualifications: string[]; certifications: string[]; skills: string[];
  bloodGroup: string; languages: string[]; notes: string;
  sickLeaveQuota: string; emergencyLeaveQuota: string; status: string;
  baseSalary: string; panNumber: string; pfNumber: string; esiNumber: string;
  uanNumber: string; aadharNumber: string; fatherName: string; workLocation: string;
  bankDetails: BankDetails;
}

type FieldErrors = Partial<Record<string, string>>;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/* ---------- tiny helpers ---------- */
const inputBase = "w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition-all";
const inputOk = `${inputBase} border-gray-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100`;
const inputErr = `${inputBase} border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-100`;
const inputDone = `${inputBase} border-green-400 bg-green-50 focus:border-green-400 focus:ring-2 focus:ring-green-100`;

function FieldStatus({ error, value }: { error?: string; value: string }) {
  if (error) return <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center gap-1"><AlertCircle size={10} />{error}</p>;
  if (value) return <p className="mt-1 text-[10px] font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={10} />Looks good</p>;
  return null;
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50 bg-gray-50/60">
        {icon}
        <span className="text-xs font-black uppercase tracking-widest text-gray-600">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ---------- validators ---------- */
const VALIDATORS: Record<string, (v: string) => string | undefined> = {
  name: v => !v.trim() ? "Full name is required" : !/^[a-zA-Z\s.'"-]+$/.test(v) ? "Only letters, spaces, dots, hyphens" : v.length > 80 ? "Max 80 characters" : undefined,
  email: v => !v.trim() ? "Email is required" : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Enter a valid email" : undefined,
  mobile: v => !v ? "Mobile is required" : v.length !== 10 ? "Must be exactly 10 digits" : undefined,
  password: v => !v ? "Password is required" : v.length < 6 ? "Min 6 characters" : v.length > 50 ? "Max 50 characters" : undefined,
  pincode: v => v && v.length !== 6 ? "Must be 6 digits" : undefined,
  panNumber: v => v && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.toUpperCase()) ? "Format: ABCDE1234F" : undefined,
  aadharNumber: v => v && v.length !== 12 ? "Must be exactly 12 digits" : undefined,
  emergencyContactMobile: v => v && v.length !== 10 ? "Must be 10 digits" : undefined,
  accountNumber: v => v && (v.length < 9 || v.length > 18) ? "9–18 digits required" : undefined,
  ifscCode: v => v && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(v) ? "Format: ABCD0123456" : undefined,
  accountName: v => v && v.length > 60 ? "Max 60 characters" : undefined,
  bankName: v => v && v.length > 60 ? "Max 60 characters" : undefined,
  esiNumber: v => v && v.length > 17 ? "Max 17 characters" : undefined,
  uanNumber: v => v && !/^\d{0,12}$/.test(v) ? "Only digits allowed" : undefined,
  pfNumber: v => v && v.length > 22 ? "Max 22 characters" : undefined,
  fatherName: v => v && v.length > 60 ? "Max 60 characters" : undefined,
  employeeId: v => !v.trim() ? "Employee ID is required" : undefined,
};

export default function HRCreateStaff() {
  const router = useRouter();
  const { hospitalId } = useParams();
  const [shifts, setShifts] = useState<any[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    honorific: "Mr",
    name: "", email: "", mobile: "", password: "", gender: "", dateOfBirth: "",
    street: "", city: "", state: "", pincode: "",
    department: "", designation: "Nurse", employeeId: "", employmentType: "full-time",
    experienceYears: "", joiningDate: "",
    emergencyContactName: "", emergencyContactMobile: "", emergencyContactRelationship: "",
    shift: "", startTime: "09:00", endTime: "17:00", weeklyOff: ["Saturday", "Sunday"],
    qualifications: [], certifications: [], skills: [],
    bloodGroup: "", languages: [], notes: "",
    sickLeaveQuota: "1", emergencyLeaveQuota: "1", status: "active",
    baseSalary: "0", panNumber: "", pfNumber: "", esiNumber: "", uanNumber: "",
    aadharNumber: "", fatherName: "", workLocation: "",
    bankDetails: { accountName: "", accountNumber: "", bankName: "", ifscCode: "" }
  });

  const [tempQ, setTempQ] = useState(""); const [tempC, setTempC] = useState("");
  const [tempS, setTempS] = useState(""); const [tempL, setTempL] = useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const [sd, td] = await Promise.all([
          hospitalAdminService.getShifts(),
          import('@/lib/integrations/services/ipd.service').then(m => m.ipdService.getUnitTypes().catch(() => []))
        ]);
        setShifts(sd); setAvailableDepartments(td);
        if (sd.length > 0) setFormData(p => ({ ...p, shift: sd[0]._id, startTime: sd[0].startTime, endTime: sd[0].endTime }));
        if (td.length > 0) setFormData(p => ({ ...p, department: td[0] }));
      } catch { toast.error("Failed to load configuration"); } finally { setLoadingShifts(false); }
    })();
  }, []);

  /* validate single field and update errors state */
  const validateField = useCallback((name: string, value: string) => {
    const fn = VALIDATORS[name];
    const msg = fn ? fn(value) : undefined;
    setErrors(prev => ({ ...prev, [name]: msg }));
    return !msg;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Numeric guards
    if (name === "mobile" && !/^\d{0,10}$/.test(value)) return;
    if (name === "pincode" && !/^\d{0,6}$/.test(value)) return;
    if (name === "emergencyContactMobile" && !/^\d{0,10}$/.test(value)) return;
    if (name === "aadharNumber" && !/^\d{0,12}$/.test(value)) return;
    if (name === "uanNumber" && !/^\d{0,12}$/.test(value)) return;
    if (name === "panNumber" && value.length > 10) return;
    if (name === "ifscCode" && value.length > 11) return;
    if (["sickLeaveQuota", "emergencyLeaveQuota", "baseSalary", "experienceYears"].includes(name) && !/^\d*$/.test(value)) return;

    if (name === "honorific") {
      let gender = formData.gender;
      if (value === "Mr") gender = "male";
      else if (value === "Mrs" || value === "Ms") gender = "female";
      setFormData(prev => ({ ...prev, [name]: value, gender }));
      if (touched[name]) validateField(name, value);
      return;
    }

    const finalValue = name === "panNumber" ? value.toUpperCase() : value;

    if (name === "shift") {
      const s = shifts.find(s => s._id === value);
      if (s) { setFormData(p => ({ ...p, shift: value, startTime: s.startTime, endTime: s.endTime })); return; }
    }
    setFormData(p => ({ ...p, [name]: finalValue }));
    if (touched[name]) validateField(name, finalValue);
  };

  const handleBankChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "accountNumber" && !/^\d{0,18}$/.test(value)) return;
    if (name === "ifscCode" && value.length > 11) return;
    const finalValue = name === "ifscCode" ? value.toUpperCase() : value;
    setFormData(p => ({ ...p, bankDetails: { ...p.bankDetails, [name]: finalValue } }));
    if (touched[name]) validateField(name, finalValue);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched(p => ({ ...p, [name]: true }));
    validateField(name, value);
  };

  const getInputClass = (name: string, value: string) => {
    if (errors[name]) return inputErr;
    if (touched[name] && value) return inputDone;
    return inputOk;
  };

  const toggleWeeklyOff = (day: string) =>
    setFormData(p => ({ ...p, weeklyOff: p.weeklyOff.includes(day) ? p.weeklyOff.filter(d => d !== day) : [...p.weeklyOff, day] }));

  const addItem = (arr: keyof Pick<FormData, 'qualifications' | 'certifications' | 'skills'>, val: string, clear: () => void) => {
    if (!val.trim()) return;
    setFormData(p => ({ ...p, [arr]: [...p[arr], val.trim()] })); clear();
  };
  const removeItem = (arr: keyof Pick<FormData, 'qualifications' | 'certifications' | 'skills'>, item: string) =>
    setFormData(p => ({ ...p, [arr]: p[arr].filter(i => i !== item) }));

  const validateAll = (): boolean => {
    const fields = ['name', 'email', 'mobile', 'password', 'employeeId', 'panNumber', 'aadharNumber', 'emergencyContactMobile', 'pincode', 'accountNumber', 'ifscCode', 'accountName', 'bankName'];
    const newErrors: FieldErrors = {};
    let ok = true;
    fields.forEach(f => {
      let val = (formData as any)[f] ?? formData.bankDetails[f as keyof BankDetails] ?? "";
      const fn = VALIDATORS[f];
      const msg = fn ? fn(val) : undefined;
      if (msg) { newErrors[f] = msg; ok = false; }
    });
    if (!formData.department) { toast.error("Department is required"); ok = false; }
    if (!formData.shift) { toast.error("Please assign a work shift"); ok = false; }
    setErrors(newErrors);
    const allTouched: Record<string, boolean> = {};
    fields.forEach(f => allTouched[f] = true);
    setTouched(allTouched);
    return ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) { toast.error("Please fix the errors before submitting"); return; }
    setLoading(true);
    try {
      await hospitalAdminService.createStaff({
        honorific: formData.honorific,
        name: formData.name.trim(), email: formData.email.trim(), mobile: formData.mobile,
        password: formData.password, gender: formData.gender || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        address: formData.street ? { street: formData.street, city: formData.city, state: formData.state, pincode: formData.pincode, country: "India" } : undefined,
        department: formData.department, designation: formData.designation.trim(),
        employeeId: formData.employeeId.trim() || undefined, employmentType: formData.employmentType,
        experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : 0,
        joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
        emergencyContact: formData.emergencyContactName ? { name: formData.emergencyContactName, mobile: formData.emergencyContactMobile, relationship: formData.emergencyContactRelationship } : undefined,
        shift: formData.shift, workingHours: { start: formData.startTime, end: formData.endTime },
        weeklyOff: formData.weeklyOff, qualifications: formData.qualifications,
        certifications: formData.certifications, skills: formData.skills,
        bloodGroup: formData.bloodGroup || undefined, languages: formData.languages,
        notes: formData.notes.trim() || undefined,
        sickLeaveQuota: parseInt(formData.sickLeaveQuota) || 1,
        emergencyLeaveQuota: parseInt(formData.emergencyLeaveQuota) || 1,
        baseSalary: parseInt(formData.baseSalary) || 0,
        panNumber: formData.panNumber, pfNumber: formData.pfNumber,
        esiNumber: formData.esiNumber, uanNumber: formData.uanNumber,
        aadharNumber: formData.aadharNumber, fatherName: formData.fatherName,
        workLocation: formData.workLocation, bankDetails: formData.bankDetails, role: 'staff'
      });
      toast.success(`Staff "${formData.name}" created successfully!`);
      setTimeout(() => router.push(`/${hospitalId}/hr/staff`), 800);
    } catch (err: any) {
      toast.error(err.message || "Failed to create staff member");
    } finally { setLoading(false); }
  };

  /* ───────── RENDER ───────── */
  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-5 pt-1">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
        <button onClick={() => router.push(`/${hospitalId}/hr/staff`)}
          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-all">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 tracking-tight uppercase">Add New Staff Member</h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Personnel Registration · HR Portal</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── LEFT: main fields ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Personal Information */}
          <SectionCard title="Personal Information" icon={<User size={14} className="text-blue-500" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Honorific <span className="text-red-400">*</span></label>
                <select name="honorific" value={formData.honorific} onChange={handleChange} className={inputOk}>
                  <option value="Mr">Mr</option><option value="Mrs">Mrs</option><option value="Ms">Ms</option><option value="Dr">Dr</option>
                </select>
              </div>
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Full Name <span className="text-red-400">*</span></label>
                <input name="name" value={formData.name} maxLength={80}
                  onChange={handleChange} onBlur={handleBlur}
                  placeholder="e.g. Ramesh Kumar"
                  className={getInputClass("name", formData.name)} />
                <FieldStatus error={errors.name} value={touched.name ? formData.name : ""} />
              </div>

              {/* Gender */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className={inputOk}>
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Email Address <span className="text-red-400">*</span></label>
                <input name="email" type="email" value={formData.email}
                  onChange={handleChange} onBlur={handleBlur}
                  placeholder="name@hospital.com"
                  className={getInputClass("email", formData.email)} />
                <FieldStatus error={errors.email} value={touched.email ? formData.email : ""} />
              </div>

              {/* Mobile */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Mobile Number <span className="text-red-400">*</span></label>
                <input name="mobile" type="tel" value={formData.mobile} maxLength={10}
                  onChange={handleChange} onBlur={handleBlur}
                  placeholder="10-digit number"
                  className={getInputClass("mobile", formData.mobile)} />
                <FieldStatus error={errors.mobile} value={touched.mobile ? formData.mobile : ""} />
              </div>

              {/* Father's Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Father's Name</label>
                <input name="fatherName" value={formData.fatherName} maxLength={60}
                  onChange={handleChange} onBlur={handleBlur}
                  placeholder="Father's full name"
                  className={getInputClass("fatherName", formData.fatherName)} />
                <FieldStatus error={errors.fatherName} value={touched.fatherName ? formData.fatherName : ""} />
              </div>

              {/* DOB */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Date of Birth</label>
                <input name="dateOfBirth" type="date" value={formData.dateOfBirth}
                  onChange={handleChange} className={inputOk} />
              </div>

              {/* Password */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Password <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input name="password" type={showPassword ? "text" : "password"} value={formData.password}
                    onChange={handleChange} onBlur={handleBlur}
                    placeholder="Min 6 characters"
                    className={`${getInputClass("password", formData.password)} pr-10`} />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <FieldStatus error={errors.password} value={touched.password ? formData.password : ""} />
              </div>
            </div>
          </SectionCard>

          {/* Employment Details */}
          <SectionCard title="Employment Details" icon={<Briefcase size={14} className="text-blue-500" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Department <span className="text-red-400">*</span></label>
                <select name="department" value={formData.department} onChange={handleChange} className={inputOk}>
                  <option value="">Select Department</option>
                  {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Designation <span className="text-red-400">*</span></label>
                <input name="designation" value={formData.designation} maxLength={60}
                  onChange={handleChange} className={inputOk} placeholder="e.g. Nurse, Doctor" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Employee ID <span className="text-red-400">*</span></label>
                <input name="employeeId" value={formData.employeeId} maxLength={20}
                  onChange={handleChange} onBlur={handleBlur}
                  placeholder="e.g. EMP-001"
                  className={getInputClass("employeeId", formData.employeeId)} />
                <FieldStatus error={errors.employeeId} value={touched.employeeId ? formData.employeeId : ""} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Contract Type</label>
                <select name="employmentType" value={formData.employmentType} onChange={handleChange} className={inputOk}>
                  <option value="full-time">Full-Time</option>
                  <option value="part-time">Part-Time</option>
                  <option value="contract">Contract</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Joining Date</label>
                <input name="joiningDate" type="date" value={formData.joiningDate}
                  onChange={handleChange} className={inputOk} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Experience (Years)</label>
                <input name="experienceYears" value={formData.experienceYears} maxLength={2}
                  onChange={handleChange} className={inputOk} placeholder="e.g. 5" />
              </div>
            </div>
          </SectionCard>

          {/* Shift Details */}
          <SectionCard title="Shift & Schedule" icon={<Clock size={14} className="text-yellow-500" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Shift <span className="text-red-400">*</span></label>
                <select name="shift" value={formData.shift} onChange={handleChange} className={inputOk}>
                  <option value="">Select Shift</option>
                  {shifts.map((s: any) => <option key={s._id} value={s._id}>{s.name} [{s.startTime}–{s.endTime}]</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start</label>
                  <div className="px-3.5 py-2.5 bg-yellow-50 rounded-xl text-sm font-bold text-yellow-700 border border-yellow-100">{formData.startTime}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End</label>
                  <div className="px-3.5 py-2.5 bg-yellow-50 rounded-xl text-sm font-bold text-yellow-700 border border-yellow-100">{formData.endTime}</div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Weekly Off Days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button key={day} type="button" onClick={() => toggleWeeklyOff(day)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${formData.weeklyOff.includes(day)
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-blue-300'}`}>
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* Financial & Identity */}
          <SectionCard title="Financial & Identity Details" icon={<CreditCard size={14} className="text-green-600" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Base Salary */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Base Salary (Monthly ₹)</label>
                <input name="baseSalary" value={formData.baseSalary} maxLength={10}
                  onChange={handleChange} className={`${inputOk} font-bold text-green-700`} placeholder="0" />
              </div>

              {/* PAN */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">PAN Number</label>
                <input name="panNumber" value={formData.panNumber} maxLength={10}
                  onChange={handleChange} onBlur={handleBlur}
                  placeholder="ABCDE1234F"
                  className={getInputClass("panNumber", formData.panNumber)} />
                <FieldStatus error={errors.panNumber} value={touched.panNumber ? formData.panNumber : ""} />
              </div>

              {/* Aadhar */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Aadhar Number</label>
                <input name="aadharNumber" value={formData.aadharNumber} maxLength={12}
                  onChange={handleChange} onBlur={handleBlur}
                  placeholder="12-digit Aadhar"
                  className={getInputClass("aadharNumber", formData.aadharNumber)} />
                <FieldStatus error={errors.aadharNumber} value={touched.aadharNumber ? formData.aadharNumber : ""} />
              </div>

              {/* PF */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">PF Number</label>
                <input name="pfNumber" value={formData.pfNumber} maxLength={22}
                  onChange={handleChange} onBlur={handleBlur}
                  placeholder="Optional"
                  className={getInputClass("pfNumber", formData.pfNumber)} />
                <FieldStatus error={errors.pfNumber} value={touched.pfNumber ? formData.pfNumber : ""} />
              </div>

              {/* ESI */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ESI Number</label>
                <input name="esiNumber" value={formData.esiNumber} maxLength={17}
                  onChange={handleChange} onBlur={handleBlur}
                  placeholder="Optional"
                  className={getInputClass("esiNumber", formData.esiNumber)} />
                <FieldStatus error={errors.esiNumber} value={touched.esiNumber ? formData.esiNumber : ""} />
              </div>

              {/* UAN */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">UAN Number</label>
                <input name="uanNumber" value={formData.uanNumber} maxLength={12}
                  onChange={handleChange} onBlur={handleBlur}
                  placeholder="12-digit UAN"
                  className={getInputClass("uanNumber", formData.uanNumber)} />
                <FieldStatus error={errors.uanNumber} value={touched.uanNumber ? formData.uanNumber : ""} />
              </div>

              {/* Bank Details sub-section */}
              <div className="md:col-span-2">
                <div className="mt-2 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={12} className="text-green-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-700">Bank Account Details</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Account Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Account Holder Name</label>
                      <input name="accountName" value={formData.bankDetails.accountName} maxLength={60}
                        onChange={handleBankChange} onBlur={(e) => { setTouched(p => ({ ...p, accountName: true })); validateField("accountName", e.target.value); }}
                        placeholder="As per bank records"
                        className={getInputClass("accountName", formData.bankDetails.accountName)} />
                      <FieldStatus error={errors.accountName} value={touched.accountName ? formData.bankDetails.accountName : ""} />
                    </div>

                    {/* Account Number */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Account Number</label>
                      <input name="accountNumber" value={formData.bankDetails.accountNumber} maxLength={18}
                        onChange={handleBankChange} onBlur={(e) => { setTouched(p => ({ ...p, accountNumber: true })); validateField("accountNumber", e.target.value); }}
                        placeholder="9–18 digits"
                        className={getInputClass("accountNumber", formData.bankDetails.accountNumber)} />
                      <FieldStatus error={errors.accountNumber} value={touched.accountNumber ? formData.bankDetails.accountNumber : ""} />
                    </div>

                    {/* Bank Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Bank Name</label>
                      <input name="bankName" value={formData.bankDetails.bankName} maxLength={60}
                        onChange={handleBankChange} onBlur={(e) => { setTouched(p => ({ ...p, bankName: true })); validateField("bankName", e.target.value); }}
                        placeholder="e.g. State Bank of India"
                        className={getInputClass("bankName", formData.bankDetails.bankName)} />
                      <FieldStatus error={errors.bankName} value={touched.bankName ? formData.bankDetails.bankName : ""} />
                    </div>

                    {/* IFSC */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">IFSC Code</label>
                      <input name="ifscCode" value={formData.bankDetails.ifscCode} maxLength={11}
                        onChange={handleBankChange} onBlur={(e) => { setTouched(p => ({ ...p, ifscCode: true })); validateField("ifscCode", e.target.value.toUpperCase()); }}
                        placeholder="ABCD0123456"
                        className={getInputClass("ifscCode", formData.bankDetails.ifscCode)} />
                      <FieldStatus error={errors.ifscCode} value={touched.ifscCode ? formData.bankDetails.ifscCode : ""} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── RIGHT: sidebar cards ── */}
        <div className="space-y-5">

          {/* Emergency Contact */}
          <SectionCard title="Emergency Contact" icon={<Activity size={14} className="text-red-500" />}>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Full Name</label>
                <input name="emergencyContactName" value={formData.emergencyContactName} maxLength={60}
                  onChange={handleChange} placeholder="Contact person" className={inputOk} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Mobile</label>
                <input name="emergencyContactMobile" value={formData.emergencyContactMobile} maxLength={10}
                  onChange={handleChange} onBlur={handleBlur} placeholder="10-digit" className={getInputClass("emergencyContactMobile", formData.emergencyContactMobile)} />
                <FieldStatus error={errors.emergencyContactMobile} value={touched.emergencyContactMobile ? formData.emergencyContactMobile : ""} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Relationship</label>
                <input name="emergencyContactRelationship" value={formData.emergencyContactRelationship} maxLength={30}
                  onChange={handleChange} placeholder="e.g. Spouse / Parent" className={inputOk} />
              </div>
            </div>
          </SectionCard>

          {/* Qualifications */}
          <SectionCard title="Qualifications" icon={<Globe size={14} className="text-blue-500" />}>
            <div className="space-y-4">
              {/* Qualifications list */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Degrees</label>
                <div className="flex gap-2">
                  <input value={tempQ} onChange={e => setTempQ(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('qualifications', tempQ, () => setTempQ("")))}
                    placeholder="MBBS, MD…" className={`${inputOk} flex-1 text-xs`} />
                  <button type="button" onClick={() => addItem('qualifications', tempQ, () => setTempQ(""))}
                    className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {formData.qualifications.map(q => (
                    <span key={q} className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-100">
                      {q}<button type="button" onClick={() => removeItem('qualifications', q)}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Certifications</label>
                <div className="flex gap-2">
                  <input value={tempC} onChange={e => setTempC(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('certifications', tempC, () => setTempC("")))}
                    placeholder="ACLS, BLS…" className={`${inputOk} flex-1 text-xs`} />
                  <button type="button" onClick={() => addItem('certifications', tempC, () => setTempC(""))}
                    className="p-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {formData.certifications.map(c => (
                    <span key={c} className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold border border-green-100">
                      {c}<button type="button" onClick={() => removeItem('certifications', c)}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Skills</label>
                <div className="flex gap-2">
                  <input value={tempS} onChange={e => setTempS(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('skills', tempS, () => setTempS("")))}
                    placeholder="e.g. Wound Care" className={`${inputOk} flex-1 text-xs`} />
                  <button type="button" onClick={() => addItem('skills', tempS, () => setTempS(""))}
                    className="p-2.5 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {formData.skills.map(s => (
                    <span key={s} className="flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-[10px] font-bold border border-yellow-100">
                      {s}<button type="button" onClick={() => removeItem('skills', s)}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* System Status */}
          <SectionCard title="System Status" icon={<Activity size={14} className="text-blue-500" />}>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Initial Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className={inputOk}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </SectionCard>

          {/* Submit */}
          <div className="pt-2 sticky bottom-6 space-y-2">
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/20">
              {loading
                ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Plus size={16} /> Create Staff Record</>}
            </button>
            <button type="button" onClick={() => router.push(`/${hospitalId}/hr/staff`)} disabled={loading}
              className="w-full py-2.5 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
              Cancel Registration
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
