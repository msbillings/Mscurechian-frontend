"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from "next/navigation";
import { hospitalAdminService } from "@/lib/integrations";
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  Briefcase,
  FileText,
  Award,
  Image as ImageIcon,
  MapPin,
  Clock,
  Shield,
  CreditCard,
  Globe,
  Edit,
  ArrowLeft
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, Card, FormInput, Button } from "@/components/admin";

const SPECIALTIES = [
  "Cardiology", "Dermatology", "Emergency Medicine", "Endocrinology",
  "Gastroenterology", "General Practice", "Gynecology", "Hematology",
  "Internal Medicine", "Nephrology", "Neurology", "Oncology",
  "Ophthalmology", "Orthopedics", "Otolaryngology (ENT)", "Pediatrics",
  "Psychiatry", "Pulmonology", "Radiology", "Rheumatology",
  "Surgery", "Urology"
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" }
];

const DESIGNATION_OPTIONS = [
  "Consultant", "Senior Consultant", "Surgeon", "Resident",
  "Fellow", "Professor", "Other"
];

const DEPARTMENTS = [
  "Cardiology", "Neurology", "Orthopedics", "Pediatrics",
  "General Surgery", "Internal Medicine", "Emergency",
  "ICU", "Radiology", "Pathology", "Anesthesiology"
];

const DAYS_OF_WEEK = [
  "Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday", "Sunday"
];

const LANGUAGES = [
  "English", "Hindi", "Tamil", "Telugu", "Kannada",
  "Malayalam", "Bengali", "Marathi", "Gujarati", "Punjabi"
];

interface FormData {
  name: string;
  email: string;
  mobile: string;
  password: string;
  gender: string;
  dateOfBirth: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  specialties: string[];
  qualifications: string[];
  medicalRegistrationNumber: string;
  registrationCouncil: string;
  registrationYear: string;
  registrationExpiryDate: string;
  experienceStart: string;
  department: string;
  designation: string;
  employeeId: string;
  consultationFee: string;
  consultationDuration: string;
  maxAppointmentsPerDay: string;
  room: string;
  permissions: {
    canAccessEMR: boolean;
    canAccessBilling: boolean;
    canAccessLabReports: boolean;
    canPrescribe: boolean;
    canAdmitPatients: boolean;
    canPerformSurgery: boolean;
  };
  bio: string;
  profilePic: string;
  signature: string;
  languages: string[];
  awards: string[];
}

interface AvailabilitySlot {
  days: string[];
  startTime: string;
  breakStart: string;
  breakEnd: string;
  endTime: string;
}

function HREditDoctor() {
  const router = useRouter();
  const params = useParams();
  const hospitalId = params.hospitalId as string;
  const id = params.id as string;

  const [formData, setFormData] = useState<FormData>({
    name: "", email: "", mobile: "", password: "", gender: "",
    dateOfBirth: "",
    street: "", city: "", state: "", pincode: "",
    specialties: [], qualifications: [],
    medicalRegistrationNumber: "",
    registrationCouncil: "National Medical Commission (NMC)",
    registrationYear: "",
    registrationExpiryDate: "",
    experienceStart: "",
    department: "", designation: "Consultant", employeeId: "",
    consultationFee: "", consultationDuration: "15",
    maxAppointmentsPerDay: "20", room: "",
    permissions: {
      canAccessEMR: true,
      canAccessBilling: false,
      canAccessLabReports: true,
      canPrescribe: true,
      canAdmitPatients: false,
      canPerformSurgery: false
    },
    bio: "", profilePic: "", signature: "",
    languages: [], awards: []
  });

  const [availability, setAvailability] = useState<AvailabilitySlot[]>([
    { days: [], startTime: "09:00", breakStart: "13:00", breakEnd: "14:00", endTime: "17:00" }
  ]);

  const [tempSpecialty, setTempSpecialty] = useState("");
  const [tempQualification, setTempQualification] = useState("");
  const [tempLanguage, setTempLanguage] = useState("");
  const [tempAward, setTempAward] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDoctor();
    }
  }, [id]);

  const fetchDoctor = async () => {
    try {
      const { doctor } = await hospitalAdminService.getDoctorById(id);

      setFormData({
        name: doctor.name || "",
        email: doctor.email || "",
        mobile: doctor.mobile || "",
        password: "",
        gender: doctor.gender || "",
        dateOfBirth: doctor.dateOfBirth ? new Date(doctor.dateOfBirth).toISOString().split('T')[0] : "",
        street: doctor.address?.street || "",
        city: doctor.address?.city || "",
        state: doctor.address?.state || "",
        pincode: doctor.address?.pincode || "",
        specialties: doctor.specialties || [],
        qualifications: doctor.qualifications || [],
        medicalRegistrationNumber: doctor.medicalRegistrationNumber || "",
        registrationCouncil: doctor.registrationCouncil || "National Medical Commission (NMC)",
        registrationYear: doctor.registrationYear?.toString() || "",
        registrationExpiryDate: doctor.registrationExpiryDate ? new Date(doctor.registrationExpiryDate).toISOString().split('T')[0] : "",
        experienceStart: doctor.experienceStart ? new Date(doctor.experienceStart).toISOString().split('T')[0] : "",
        department: doctor.department || "",
        designation: doctor.designation || "Consultant",
        employeeId: doctor.employeeId || "",
        consultationFee: doctor.consultationFee?.toString() || "",
        consultationDuration: doctor.consultationDuration?.toString() || "15",
        maxAppointmentsPerDay: doctor.maxAppointmentsPerDay?.toString() || "20",
        room: doctor.room || "",
        permissions: {
          canAccessEMR: doctor.permissions?.canAccessEMR ?? true,
          canAccessBilling: doctor.permissions?.canAccessBilling ?? false,
          canAccessLabReports: doctor.permissions?.canAccessLabReports ?? true,
          canPrescribe: doctor.permissions?.canPrescribe ?? true,
          canAdmitPatients: doctor.permissions?.canAdmitPatients ?? false,
          canPerformSurgery: doctor.permissions?.canPerformSurgery ?? false
        },
        bio: doctor.bio || "",
        profilePic: doctor.profilePic || "",
        signature: doctor.signature || "",
        languages: doctor.languages || [],
        awards: doctor.awards || []
      });

      if (doctor.availability && doctor.availability.length > 0) {
        setAvailability(doctor.availability.map((slot: any) => ({
          days: slot.days || [],
          startTime: slot.startTime || "09:00",
          breakStart: slot.breakStart || "13:00",
          breakEnd: slot.breakEnd || "14:00",
          endTime: slot.endTime || "17:00"
        })));
      }
    } catch (error: any) {
      toast.error("Failed to fetch doctor details");
      router.push(`/${hospitalId}/hr/hospital/doctors`);
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "mobile" && !/^\d{0,10}$/.test(value)) return;
    if ((name === "consultationFee" || name === "maxAppointmentsPerDay" || name === "consultationDuration") && !/^\d*$/.test(value)) return;
    if (name === "pincode" && !/^\d{0,6}$/.test(value)) return;
    if (name === "registrationYear" && !/^\d{0,4}$/.test(value)) return;

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (permissionName: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permissionName]: checked
      }
    }));
  };

  const addItem = (type: 'specialty' | 'qualification' | 'language' | 'award', value: string) => {
    const tempValue = type === 'specialty' ? tempSpecialty :
      type === 'qualification' ? tempQualification :
        type === 'language' ? tempLanguage : tempAward;

    const key: 'specialties' | 'qualifications' | 'languages' | 'awards' =
      type === 'specialty' ? 'specialties' :
        type === 'qualification' ? 'qualifications' :
          type === 'language' ? 'languages' : 'awards';

    if (tempValue && !formData[key].includes(tempValue)) {
      setFormData(prev => ({
        ...prev,
        [key]: [...prev[key], tempValue]
      }));

      if (type === 'specialty') setTempSpecialty("");
      else if (type === 'qualification') setTempQualification("");
      else if (type === 'language') setTempLanguage("");
      else setTempAward("");
    }
  };

  const removeItem = (type: 'specialties' | 'qualifications' | 'languages' | 'awards', item: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((i: string) => i !== item)
    }));
  };

  const addAvailabilitySlot = () => {
    setAvailability([...availability, {
      days: [], startTime: "09:00", breakStart: "13:00",
      breakEnd: "14:00", endTime: "17:00"
    }]);
  };

  const updateAvailability = (index: number, field: keyof AvailabilitySlot, value: any) => {
    const updated = [...availability];
    updated[index] = { ...updated[index], [field]: value };
    setAvailability(updated);
  };

  const removeAvailabilitySlot = (index: number) => {
    setAvailability(availability.filter((_, i) => i !== index));
  };

  const toggleDay = (slotIndex: number, day: string) => {
    const updated = [...availability];
    const days = updated[slotIndex].days;
    if (days.includes(day)) {
      updated[slotIndex].days = days.filter(d => d !== day);
    } else {
      updated[slotIndex].days = [...days, day];
    }
    setAvailability(updated);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) return toast.error("Doctor name required"), false;
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      return toast.error("Valid email required"), false;
    if (formData.mobile.length !== 10) return toast.error("Mobile must be 10 digits"), false;
    if (formData.password && formData.password.length < 6)
      return toast.error("Password too short"), false;
    if (!formData.gender) return toast.error("Select gender"), false;
    if (formData.specialties.length === 0) return toast.error("Add at least one specialty"), false;
    if (!formData.medicalRegistrationNumber.trim())
      return toast.error("Registration number required"), false;
    if (!formData.experienceStart) return toast.error("Experience start date required"), false;
    if (!formData.consultationFee || parseInt(formData.consultationFee) <= 0)
      return toast.error("Valid consultation fee required"), false;

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const doctorData: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth || undefined,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: "India"
        },
        specialties: formData.specialties,
        qualifications: formData.qualifications,
        medicalRegistrationNumber: formData.medicalRegistrationNumber.trim(),
        registrationCouncil: formData.registrationCouncil,
        registrationYear: formData.registrationYear ? parseInt(formData.registrationYear) : undefined,
        registrationExpiryDate: formData.registrationExpiryDate || undefined,
        experienceStart: formData.experienceStart,
        department: formData.department || undefined,
        designation: formData.designation || "Consultant",
        employeeId: formData.employeeId || undefined,
        consultationFee: parseInt(formData.consultationFee),
        consultationDuration: parseInt(formData.consultationDuration) || 15,
        maxAppointmentsPerDay: formData.maxAppointmentsPerDay ? parseInt(formData.maxAppointmentsPerDay) : undefined,
        availability: availability.filter(slot => slot.days.length > 0),
        room: formData.room || undefined,
        permissions: formData.permissions,
        bio: formData.bio.trim(),
        profilePic: formData.profilePic || undefined,
        signature: formData.signature || undefined,
        languages: formData.languages,
        awards: formData.awards
      };

      if (formData.password) {
        doctorData.password = formData.password;
      }

      await hospitalAdminService.updateDoctor(id, doctorData);
      toast.success("Doctor profile updated successfully");
      router.push(`/${hospitalId}/hr/hospital/doctors`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update doctor");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-12 w-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 p-8">
      <button
        onClick={() => router.push(`/${hospitalId}/hr/hospital/doctors`)}
        className="flex items-center gap-2 mb-6 text-gray-500 hover:text-blue-600 font-medium text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Directory
      </button>

      <PageHeader
        icon={<Edit className="text-blue-600" />}
        title="Edit Physician Profile"
        subtitle={`Administrative node override for Dr. ${formData.name}`}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Core Profile" icon={<User className="text-blue-600" />} padding="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormInput label="Full Name" type="text" name="name" required
              value={formData.name} onChange={handleChange} placeholder="Full legal name" />

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Gender *</label>
              <select name="gender" value={formData.gender} onChange={handleChange} required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                <option value="">Select Gender</option>
                {GENDER_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Birth Date</label>
              <input type="date" name="dateOfBirth" value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </Card>

        <Card title="Communication & Auth" icon={<Mail className="text-emerald-600" />} padding="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-50">
            <FormInput label="Clinical Email" type="email" name="email" required
              value={formData.email} onChange={handleChange} placeholder="Internal hospital email" />
            <FormInput label="Verified Mobile" type="tel" name="mobile" required
              value={formData.mobile} onChange={handleChange} placeholder="10-digit primary contact" />
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400">Credential Reset (Leave blank to keep)</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="New secure password"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <MapPin size={14} /> Geographical Node
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormInput label="Street" type="text" name="street" value={formData.street} onChange={handleChange} />
              <FormInput label="City" type="text" name="city" value={formData.city} onChange={handleChange} />
              <FormInput label="State" type="text" name="state" value={formData.state} onChange={handleChange} />
              <FormInput label="Pincode" type="text" name="pincode" value={formData.pincode} onChange={handleChange} />
            </div>
          </div>
        </Card>

        <Card title="Clinical Credentials" icon={<Briefcase className="text-purple-600" />} padding="p-6">
          <div className="space-y-6">
            <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
              <h4 className="text-xs font-black uppercase tracking-widest text-blue-600 mb-4 flex items-center gap-2">
                <CreditCard size={18} /> Regulatory Compliance
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FormInput label="NMC/State Reg No." type="text" name="medicalRegistrationNumber" required
                  value={formData.medicalRegistrationNumber} onChange={handleChange} />
                <FormInput label="Certifying Council" type="text" name="registrationCouncil"
                  value={formData.registrationCouncil} onChange={handleChange} />
                <FormInput label="Year Of Reg" type="text" name="registrationYear"
                  value={formData.registrationYear} onChange={handleChange} placeholder="YYYY" />
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Expiry Date</label>
                  <input type="date" name="registrationExpiryDate" value={formData.registrationExpiryDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Clinical Specialties *</label>
                <div className="flex gap-2 mb-3">
                  <select value={tempSpecialty} onChange={(e) => setTempSpecialty(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                    <option value="">Select Domain</option>
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button type="button" onClick={() => addItem('specialty', tempSpecialty)}
                    className="px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-blue-700 transition-colors">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.specialties.map(s => (
                    <span key={s} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 border border-blue-200">
                      {s} <button type="button" onClick={() => removeItem('specialties', s)} className="hover:text-red-500 text-lg">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Academic Qualifications</label>
                <div className="flex gap-2 mb-3">
                  <input type="text" value={tempQualification} onChange={(e) => setTempQualification(e.target.value)}
                    placeholder="MBBS, MD, FRCS..."
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  <button type="button" onClick={() => addItem('qualification', tempQualification)}
                    className="px-4 py-3 bg-slate-800 text-white rounded-xl font-bold text-xs uppercase hover:bg-slate-900 transition-colors">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.qualifications.map(q => (
                    <span key={q} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 border border-emerald-200">
                      <Award size={12} /> {q} <button type="button" onClick={() => removeItem('qualifications', q)} className="hover:text-red-500 text-lg">×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-4 pt-8">
          <button type="button" onClick={() => router.push(`/${hospitalId}/hr/hospital/doctors`)}
            disabled={loading} className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
          <button type="submit" disabled={loading}
            className="px-12 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-3">
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Edit size={16} />}
            Synchronize Profile
          </button>
        </div>
      </form>
    </div>
  );
}

export default React.memo(HREditDoctor);
