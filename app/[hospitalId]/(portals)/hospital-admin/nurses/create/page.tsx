"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { hospitalAdminService } from "@/lib/integrations";
import {
  Edit,
  User,
  Mail,
  Phone,
  Briefcase,
  FileText,
  MapPin,
  Clock,
  Globe,
  Eye,
  EyeOff,
  ArrowLeft,
  Calendar,
  Activity,
  Plus,
  CreditCard
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, Card, FormInput, Button } from "@/components/admin";

interface FormData {
  // Personal
  name: string;
  email: string;
  mobile: string;
  password: string;
  gender: string;
  dateOfBirth: string;

  // Address
  street: string;
  city: string;
  state: string;
  pincode: string;

  // Professional
  department: string;
  assignedRoom: string;
  designation: string;
  employeeId: string;
  employmentType: string;
  experienceYears: string;
  joiningDate: string;

  // Contact
  emergencyContactName: string;
  emergencyContactMobile: string;
  emergencyContactRelationship: string;

  // Work
  shift: string;
  startTime: string;
  endTime: string;
  weeklyOff: string[];

  // Qualifications
  qualifications: string[];
  certifications: string[];
  skills: string[];


  // Additional
  bloodGroup: string;
  languages: string[];
  notes: string;

  sickLeaveQuota: string;
  emergencyLeaveQuota: string;
  status: string;
  baseSalary: string;
  panNumber: string;
  pfNumber: string;
  esiNumber: string;
  uanNumber: string;
  aadharNumber: string;
  fatherName: string;
  workLocation: string;
  bankDetails: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifscCode: string;
  };
}

const DAYS_OF_WEEK = [
  "Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday", "Sunday"
];

function CreateNurse() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [shifts, setShifts] = useState<any[]>([]);
  const [unitTypes, setUnitTypes] = useState<string[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    name: "", email: "", mobile: "", password: "", gender: "",
    dateOfBirth: "",
    street: "", city: "", state: "", pincode: "",
    department: "Nursing", assignedRoom: "", designation: "Nurse", employeeId: "", employmentType: "full-time",
    experienceYears: "", joiningDate: "",
    emergencyContactName: "", emergencyContactMobile: "", emergencyContactRelationship: "",
    shift: "", startTime: "09:00", endTime: "17:00", weeklyOff: ["Saturday", "Sunday"],
    qualifications: [], certifications: [], skills: [],
    bloodGroup: "", languages: [], notes: "",
    sickLeaveQuota: "1", emergencyLeaveQuota: "1",
    status: "active",
    baseSalary: "0",
    panNumber: "",
    pfNumber: "",
    esiNumber: "",
    uanNumber: "",
    aadharNumber: "",
    fatherName: "",
    workLocation: "",
    bankDetails: {
      accountName: "",
      accountNumber: "",
      bankName: "",
      ifscCode: ""
    }
  });

  const [tempQualification, setTempQualification] = useState("");
  const [tempCertification, setTempCertification] = useState("");
  const [tempSkill, setTempSkill] = useState("");
  const [tempLanguage, setTempLanguage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [shiftsData, typesData, roomsData] = await Promise.all([
        hospitalAdminService.getShifts(),
        import('@/lib/integrations/services/ipd.service').then(m => m.ipdService.getUnitTypes().catch(() => [])),
        import('@/lib/integrations/services/ipd.service').then(m => m.ipdService.getRooms().catch(() => []))
      ]);
      setShifts(shiftsData);
      setUnitTypes(typesData);
      setAllRooms(roomsData);

      if (shiftsData.length > 0) {
        setFormData(prev => ({
          ...prev,
          shift: shiftsData[0]._id,
          startTime: shiftsData[0].startTime,
          endTime: shiftsData[0].endTime
        }));
      }

      // Automatically set default department to first unit type if available
      if (typesData.length > 0) {
        setFormData(prev => ({ ...prev, department: typesData[0] }));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load registry configurations");
    } finally {
      setLoadingShifts(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Restrictions
    if (name === "mobile" && !/^\d{0,10}$/.test(value)) return;
    if (name === "pincode" && !/^\d{0,6}$/.test(value)) return;
    if (name === "emergencyContactMobile" && !/^\d{0,10}$/.test(value)) return;
    if (name === "aadharNumber" && !/^\d{0,12}$/.test(value)) return;
    if (name === "accountNumber" && !/^\d{0,18}$/.test(value)) return;
    if (name === "panNumber" && value.length > 10) return;
    if (name === "ifscCode" && value.length > 11) return;
    
    if (["sickLeaveQuota", "emergencyLeaveQuota", "baseSalary", "experienceYears"].includes(name) && !/^\d*$/.test(value)) return;

    if (name === 'shift') {
      const selectedShift = shifts.find(s => s._id === value);
      if (selectedShift) {
        setFormData(prev => ({
          ...prev,
          shift: value,
          startTime: selectedShift.startTime,
          endTime: selectedShift.endTime
        }));
        return;
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const toggleWeeklyOff = (day: string) => {
    setFormData(prev => ({
      ...prev,
      weeklyOff: prev.weeklyOff.includes(day)
        ? prev.weeklyOff.filter(d => d !== day)
        : [...prev.weeklyOff, day]
    }));
  };

  const addItem = (type: 'qualification' | 'certification' | 'skill' | 'language', value: string) => {
    const tempValue = type === 'qualification' ? tempQualification :
      type === 'certification' ? tempCertification :
        type === 'skill' ? tempSkill : tempLanguage;

    const key = type + 's' as keyof Pick<FormData, 'qualifications' | 'certifications' | 'skills' | 'languages'>;

    if (tempValue && !formData[key].includes(tempValue)) {
      setFormData(prev => ({
        ...prev,
        [key]: [...prev[key], tempValue]
      }));

      if (type === 'qualification') setTempQualification("");
      else if (type === 'certification') setTempCertification("");
      else if (type === 'skill') setTempSkill("");
      else setTempLanguage("");
    }
  };

  const removeItem = (type: keyof Pick<FormData, 'qualifications' | 'certifications' | 'skills' | 'languages'>, item: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((i: string) => i !== item)
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) return toast.error("Please enter nurse name"), false;
    if (!/^[a-zA-Z\s.'-]+$/.test(formData.name.trim())) return toast.error("Nurse name can only contain letters, spaces, dots, and hyphens"), false;
    
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      return toast.error("Please enter a valid email address"), false;
    
    if (formData.mobile.length !== 10) return toast.error("Mobile number must be exactly 10 digits"), false;
    
    if (!formData.password || formData.password.length < 6)
      return toast.error("Password must be at least 6 characters"), false;
    
    if (!formData.department.trim()) return toast.error("Please enter department"), false;
    
    if (!formData.designation.trim()) return toast.error("Please enter designation"), false;

    // Financial & Identity Validations
    if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase())) {
      return toast.error("Invalid PAN number format (e.g., ABCDE1234F)"), false;
    }
    
    if (formData.aadharNumber && formData.aadharNumber.length !== 12) {
      return toast.error("Aadhar number must be exactly 12 digits"), false;
    }
    
    if (formData.bankDetails.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bankDetails.ifscCode.toUpperCase())) {
      return toast.error("Invalid IFSC code format (e.g., ABCD0123456)"), false;
    }
    
    if (formData.bankDetails.accountNumber && (formData.bankDetails.accountNumber.length < 9 || formData.bankDetails.accountNumber.length > 18)) {
      return toast.error("Bank account number should be between 9 and 18 digits"), false;
    }

    if (formData.emergencyContactMobile && formData.emergencyContactMobile.length !== 10) {
      return toast.error("Emergency contact mobile must be 10 digits"), false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const nurseData: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile,
        password: formData.password,
        gender: formData.gender || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,

        address: formData.street || formData.city ? {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: "India"
        } : undefined,

        department: formData.department.trim(),
        assignedRoom: formData.assignedRoom.trim(),
        designation: formData.designation.trim(),
        employeeId: formData.employeeId.trim() || undefined,
        employmentType: formData.employmentType,
        experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : 0,
        joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],

        emergencyContact: formData.emergencyContactName ? {
          name: formData.emergencyContactName,
          mobile: formData.emergencyContactMobile,
          relationship: formData.emergencyContactRelationship
        } : undefined,

        shift: formData.shift,
        workingHours: {
          start: formData.startTime,
          end: formData.endTime
        },
        weeklyOff: formData.weeklyOff,

        qualifications: formData.qualifications,
        certifications: formData.certifications,
        skills: formData.skills,


        bloodGroup: formData.bloodGroup || undefined,
        languages: formData.languages,
        notes: formData.notes.trim() || undefined,

        sickLeaveQuota: parseInt(formData.sickLeaveQuota) || 1,
        emergencyLeaveQuota: parseInt(formData.emergencyLeaveQuota) || 1,

        baseSalary: parseInt(formData.baseSalary) || 0,
        panNumber: formData.panNumber,
        pfNumber: formData.pfNumber,
        esiNumber: formData.esiNumber,
        uanNumber: formData.uanNumber,
        aadharNumber: formData.aadharNumber,
        fatherName: formData.fatherName,
        workLocation: formData.workLocation,
        bankDetails: formData.bankDetails,

        role: 'nurse' // Explicitly set role for backend validation
      };

      await hospitalAdminService.createStaff(nurseData);
      queryClient.invalidateQueries({ queryKey: ['hospital-admin-nurses'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-admin', 'dashboard'] });

      toast.success(`Nurse "${formData.name}" added to registry successfully!`, { duration: 4000 });

      setTimeout(() => {
        router.push("/hospital-admin/nurses");
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || "Failed to add nurse to registry", { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/hospital-admin/nurses')}
            className="p-2 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Register Clinical Nurse</h1>
            <p className="text-gray-500 text-xs mt-0.5">Add a new clinical nursing node to the hospital registry.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Personal Information" icon={<User className="text-emerald-500" />} padding="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormInput label="Full Name" type="text" name="name" required
                value={formData.name} onChange={handleChange}
                className="rounded-xl" />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all">
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <FormInput label="Email Address" type="email" name="email" required
                value={formData.email} onChange={handleChange}
                className="rounded-xl" />

              <FormInput label="Mobile Number" type="tel" name="mobile" required
                value={formData.mobile} onChange={handleChange}
                className="rounded-xl" />

              <FormInput label="Father's Name" type="text" name="fatherName"
                value={formData.fatherName} onChange={handleChange}
                className="rounded-xl" />

              <FormInput label="Date of Birth" type="date" name="dateOfBirth"
                value={formData.dateOfBirth} onChange={handleChange}
                className="rounded-xl" />

              <FormInput label="Work Location" type="text" name="workLocation"
                value={formData.workLocation} onChange={handleChange}
                className="rounded-xl" />

              <div className="relative space-y-1.5 lg:col-span-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Access Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Set initial password for dashboard access"
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500 transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Clinical Employment Details" icon={<Briefcase className="text-indigo-500" />} padding="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Department / Unit Type</label>
                <select name="department" value={formData.department} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/10 outline-none cursor-pointer">
                  <option value="">Select Department</option>
                  {unitTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Assigned Room</label>
                <select name="assignedRoom" value={formData.assignedRoom} onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/10 outline-none cursor-pointer">
                  <option value="">Select Room (Optional)</option>
                  {allRooms
                    .filter(room => room.type === formData.department)
                    .map(room => (
                      <option key={room._id} value={room.label}>{room.label}</option>
                    ))}
                </select>
              </div>

              <FormInput label="Designation" type="text" name="designation" required
                value={formData.designation} onChange={handleChange} className="rounded-xl" />
              <FormInput label="Nursng License / Employee ID" type="text" name="employeeId"
                value={formData.employeeId} onChange={handleChange} className="rounded-xl font-bold text-indigo-600" />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Contract Type</label>
                <select name="employmentType" value={formData.employmentType} onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/10 outline-none cursor-pointer">
                  <option value="full-time">Full-Time</option>
                  <option value="part-time">Part-Time</option>
                  <option value="contract">Contract</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title="Clinical Shift Registry" icon={<Clock className="text-amber-500" />} padding="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Active Duty Shift</label>
                <select name="shift" value={formData.shift} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/10 outline-none cursor-pointer">
                  <option value="">Select Shift</option>
                  {shifts.map((s: any) => (
                    <option key={s._id} value={s._id}>{s.name} [{s.startTime} - {s.endTime}]</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Check-in</label>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-white/5">
                    {formData.startTime}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Check-out</label>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-white/5">
                    {formData.endTime}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Weekly Offline Interval</h4>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <button key={day} type="button"
                    onClick={() => toggleWeeklyOff(day)}
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${formData.weeklyOff.includes(day)
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-gray-50 dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/10 hover:border-emerald-500/30'
                      }`}>
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Financial Disclosure & Bank Registry" icon={<CreditCard className="text-emerald-600" />} padding="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormInput label="Monthly Base Salary" type="text" name="baseSalary" required
                value={formData.baseSalary} onChange={handleChange} className="rounded-xl font-bold text-emerald-600 bg-emerald-50/30" />

              <FormInput label="PAN Number" type="text" name="panNumber" required
                value={formData.panNumber} onChange={handleChange} className="rounded-xl uppercase font-bold" />

              <FormInput label="Aadhar Number" type="text" name="aadharNumber" required
                value={formData.aadharNumber} onChange={handleChange} className="rounded-xl font-bold" />

              <FormInput label="Provident Fund (PF) No." type="text" name="pfNumber" required
                value={formData.pfNumber} onChange={handleChange} className="rounded-xl" />

              <FormInput label="ESI Number" type="text" name="esiNumber" required
                value={formData.esiNumber} onChange={handleChange} className="rounded-xl" />

              <FormInput label="UAN Number" type="text" name="uanNumber" required
                value={formData.uanNumber} onChange={handleChange} className="rounded-xl" />

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-gray-50 dark:border-white/5">
                <FormInput label="Bank Account Holder" type="text" required
                  value={formData.bankDetails.accountName}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, accountName: e.target.value } }))}
                  className="rounded-xl uppercase" />
                <FormInput label="Account Number" type="text" required
                  value={formData.bankDetails.accountNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, accountNumber: e.target.value } }))}
                  className="rounded-xl font-bold" />
                <FormInput label="Bank Name" type="text" required
                  value={formData.bankDetails.bankName}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, bankName: e.target.value } }))}
                  className="rounded-xl uppercase" />
                <FormInput label="IFSC Code" type="text" required
                  value={formData.bankDetails.ifscCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, ifscCode: e.target.value } }))}
                  className="rounded-xl uppercase" />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Metadata & Assets */}
        <div className="space-y-6">
          <Card title="Emergency Contact" icon={<Activity className="text-rose-500" />} padding="p-6">
            <div className="space-y-4">
              <FormInput label="Full Name" type="text" name="emergencyContactName"
                value={formData.emergencyContactName} onChange={handleChange} placeholder="Contact person" />
              <FormInput label="Mobile" type="tel" name="emergencyContactMobile"
                value={formData.emergencyContactMobile} onChange={handleChange} placeholder="10-digit number" />
              <FormInput label="Relationship" type="text" name="emergencyContactRelationship"
                value={formData.emergencyContactRelationship} onChange={handleChange} placeholder="e.g. Spouse / Parent" />
            </div>
          </Card>

          <Card title="Academic Qualifications" icon={<Globe className="text-indigo-500" />} padding="p-6">
            <div className="space-y-6">
              {/* Qualifications */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Nursing Degrees / Diplomas</label>
                <div className="flex gap-2">
                  <input type="text" value={tempQualification} onChange={(e) => setTempQualification(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('qualification', tempQualification))}
                    placeholder="e.g. B.Sc Nursing, GNM"
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/10 outline-none" />
                  <button type="button" onClick={() => addItem('qualification', tempQualification)}
                    className="p-2.5 bg-emerald-600 text-white rounded-xl active:scale-90 transition-transform"><Plus size={16} /></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.qualifications.map(q => (
                    <button key={q} type="button" onClick={() => removeItem('qualifications', q)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 transition-all">
                      {q} <span>×</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Certifications</label>
                <div className="flex gap-2">
                  <input type="text" value={tempCertification} onChange={(e) => setTempCertification(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('certification', tempCertification))}
                    placeholder="e.g. ACLS, BLS"
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/10 outline-none" />
                  <button type="button" onClick={() => addItem('certification', tempCertification)}
                    className="p-2.5 bg-emerald-600 text-white rounded-xl active:scale-90 transition-transform"><Plus size={16} /></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.certifications.map(c => (
                    <button key={c} type="button" onClick={() => removeItem('certifications', c)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 transition-all">
                      {c} <span>×</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Clinical Skills & Certs" icon={<FileText className="text-emerald-500" />} padding="p-6">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Add Specialized Skill</label>
                <div className="flex gap-2">
                  <input type="text" value={tempSkill} onChange={(e) => setTempSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('skill', tempSkill))}
                    placeholder="ICU, Pediatric, etc."
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/10 outline-none" />
                  <button type="button" onClick={() => addItem('skill', tempSkill)}
                    className="p-2.5 bg-emerald-600 text-white rounded-xl active:scale-90 transition-transform"><Plus size={16} /></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map(s => (
                    <button key={s} type="button" onClick={() => removeItem('skills', s)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 transition-all">
                      {s} <span>×</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Registry Status" icon={<Activity className="text-emerald-500" />} padding="p-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Duty Status</label>
              <select name="status" value={formData.status} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-emerald-50/30 dark:bg-gray-800 border border-emerald-100 dark:border-white/10 rounded-xl text-sm font-bold text-emerald-600 outline-none transition-all">
                <option value="active">Active Duty</option>
                <option value="inactive">On Leave</option>
              </select>
            </div>
          </Card>

          <div className="pt-4 sticky bottom-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <><Plus size={18} /> Confirm Registry Addition</>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push("/hospital-admin/nurses")}
              disabled={loading}
              className="w-full mt-3 py-3 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Abort Registration
            </button>
          </div>
        </div>
      </form >
    </div >
  );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(CreateNurse);
