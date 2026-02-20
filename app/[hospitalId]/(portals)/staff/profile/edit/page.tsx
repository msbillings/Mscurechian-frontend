"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    User, Mail, Phone, Briefcase, Award,
    CreditCard, Building, Landmark, Wallet,
    Save, ArrowLeft, Image as ImageIcon, Plus, X,
    Calendar, Clock, FileText, Upload, CheckCircle2, Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getStaffProfileAction, updateStaffProfileAction } from '@/lib/integrations/actions/staff.actions';

export default function EditStaffProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('personal');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [files, setFiles] = useState<Record<string, File>>({});

    const [formData, setFormData] = useState<any>({
        // Personal & Account
        name: '',
        email: '',
        mobile: '',
        profilePic: '',
        gender: '',
        dateOfBirth: '',

        // Professional & Placement
        designation: '',
        department: '',
        employeeId: '',
        joiningDate: '',
        experienceYears: '',
        workingHours: {
            start: '',
            end: ''
        },

        // Bank & Payroll
        bankDetails: {
            bankName: '',
            accountNumber: '',
            accountName: '',
            ifscCode: ''
        },
        panNumber: '',
        aadharNumber: '',
        baseSalary: '',
        pfNumber: '',
        esiNumber: '',
        uanNumber: '',

        // Qualifications
        registrationNumber: '',
        licenseValidityDate: '',
        qualifications: [] as string[],

        // Existing Documents (URLs)
        documents: {
            degreeCertificate: null,
            medicalCouncilRegistration: null,
            nursingCouncilRegistration: null
        }
    });

    useEffect(() => {
        async function loadProfile() {
            setLoading(true);
            try {
                const res = await getStaffProfileAction();
                if (res && res.staff) {
                    const s = res.staff;
                    const dept = s.department;

                    let deptString = '';
                    if (Array.isArray(dept)) {
                        // Repair potential double-stringification in array items
                        const cleanedDepts = dept.flatMap(item => {
                            if (typeof item === 'string' && item.startsWith('[') && item.endsWith(']')) {
                                try {
                                    const parsed = JSON.parse(item);
                                    return Array.isArray(parsed) ? parsed : [parsed];
                                } catch { return [item]; }
                            }
                            return [item];
                        });
                        deptString = [...new Set(cleanedDepts)].join(', ');
                    } else if (typeof dept === 'string') {
                        // If it's a corrupted string like "Staff,IPD,OPD, [\"Staff\",...]"
                        // We extract the unique words
                        const matches = dept.match(/[a-zA-Z0-9_-]+/g);
                        deptString = matches ? [...new Set(matches)].join(', ') : dept;
                    }

                    setFormData({
                        name: s.user?.name || '',
                        email: s.user?.email || '',
                        mobile: s.user?.mobile || '',
                        profilePic: (s.user as any)?.image || (s.user as any)?.profilePic || '',
                        gender: (s.user as any)?.gender || '',
                        dateOfBirth: (s.user as any)?.dateOfBirth ? new Date((s.user as any).dateOfBirth).toISOString().split('T')[0] : '',
                        designation: s.designation || '',
                        department: deptString,
                        employeeId: s.employeeId || '',
                        joiningDate: s.joiningDate ? new Date(s.joiningDate).toISOString().split('T')[0] : '',
                        experienceYears: s.experienceYears || '',
                        workingHours: {
                            start: s.workingHours?.start || '',
                            end: s.workingHours?.end || ''
                        },
                        bankDetails: {
                            bankName: s.bankDetails?.bankName || '',
                            accountNumber: s.bankDetails?.accountNumber || '',
                            accountName: s.bankDetails?.accountName || '',
                            ifscCode: s.bankDetails?.ifscCode || ''
                        },
                        panNumber: s.panNumber || '',
                        aadharNumber: s.aadharNumber || '',
                        baseSalary: s.baseSalary || '',
                        pfNumber: s.pfNumber || '',
                        esiNumber: s.esiNumber || '',
                        uanNumber: s.uanNumber || '',
                        registrationNumber: s.qualificationDetails?.registrationNumber || '',
                        licenseValidityDate: s.qualificationDetails?.licenseValidityDate ? new Date(s.qualificationDetails.licenseValidityDate).toISOString().split('T')[0] : '',
                        qualifications: s.qualificationDetails?.qualifications || [],
                        documents: s.documents || {}
                    });
                }
            } catch (error) {
                toast.error('Failed to load profile');
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, []);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }

        if (formData.mobile && !/^\d{10}$/.test(formData.mobile)) {
            newErrors.mobile = "Mobile number must be exactly 10 digits";
        }

        if (formData.bankDetails.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bankDetails.ifscCode.toUpperCase())) {
            newErrors['bankDetails.ifscCode'] = "Invalid IFSC Code format";
        }

        if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase())) {
            newErrors.panNumber = "Invalid PAN format";
        }

        if (formData.aadharNumber && !/^\d{12}$/.test(formData.aadharNumber)) {
            newErrors.aadharNumber = "Aadhar number must be 12 digits";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (errors[name]) {
            setErrors(prev => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }

        if (name.includes('.')) {
            const keys = name.split('.');
            if (keys.length === 2) {
                const [parent, child] = keys;
                setFormData((prev: any) => ({
                    ...prev,
                    [parent]: { ...prev[parent], [child]: value }
                }));
            }
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files: selectedFiles } = e.target;
        if (selectedFiles && selectedFiles[0]) {
            setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
        }
    };

    const handleQualificationChange = (index: number, value: string) => {
        const updated = [...formData.qualifications];
        updated[index] = value;
        setFormData((prev: any) => ({ ...prev, qualifications: updated }));
    };

    const addQualification = () => {
        setFormData((prev: any) => ({ ...prev, qualifications: [...prev.qualifications, ''] }));
    };

    const removeQualification = (index: number) => {
        const updated = formData.qualifications.filter((_: any, i: number) => i !== index);
        setFormData((prev: any) => ({ ...prev, qualifications: updated }));
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!validate()) {
            toast.error("Please correct the errors in the form");
            return;
        }

        setIsSaving(true);
        try {
            const formDataToSubmit = new FormData();

            // Add all non-object fields
            Object.keys(formData).forEach(key => {
                if (typeof formData[key] !== 'object' && key !== 'profilePic' && key !== 'documents') {
                    formDataToSubmit.append(key, formData[key]);
                }
            });

            // Add nested objects as JSON strings or flat fields
            formDataToSubmit.append('workingHours', JSON.stringify(formData.workingHours));
            formDataToSubmit.append('bankDetails', JSON.stringify(formData.bankDetails));

            // Special handling for qualification details
            formDataToSubmit.append('qualificationDetails', JSON.stringify({
                registrationNumber: formData.registrationNumber,
                licenseValidityDate: formData.licenseValidityDate,
                qualifications: formData.qualifications
            }));

            // Add department as array mapping done in backend usually, but here we follow existing logic
            const deptArray = typeof formData.department === 'string'
                ? formData.department.split(',').map((d: string) => d.trim()).filter(Boolean)
                : formData.department;
            formDataToSubmit.append('department', JSON.stringify(deptArray));

            // Add files
            Object.keys(files).forEach(key => {
                formDataToSubmit.append(key, files[key]);
            });

            // Handle profilePic if it's a URL (existing logic)
            if (formData.profilePic) {
                formDataToSubmit.append('profilePic', formData.profilePic);
            }

            const res = await updateStaffProfileAction(formDataToSubmit);
            if (res.success) {
                toast.success('Profile updated successfully');
                router.push('/staff/profile');
            } else {
                toast.error(res.error || 'Failed to update profile');
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const tabs = [
        { id: 'personal', label: 'Personal & Account', icon: <User size={18} /> },
        { id: 'professional', label: 'Work & Employment', icon: <Briefcase size={18} /> },
        { id: 'qualifications', label: 'Qualifications', icon: <Award size={18} /> },
        { id: 'bank', label: 'Bank & Payroll', icon: <Landmark size={18} /> },
    ];

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Your Profile</h1>
                        <p className="text-gray-500 mt-1">Manage all your personal, professional, and payroll details.</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                    {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={20} />}
                    Save All Changes
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="lg:w-64 space-y-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'bg-white dark:bg-[#111] text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Main Form Content */}
                <div className="flex-1 bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                    {activeTab === 'personal' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Account Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Full Name <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.name ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all`} />
                                            <User className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                        {errors.name && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.name}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Email Address <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.email ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all`} />
                                            <Mail className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                        {errors.email && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.email}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Mobile Number</label>
                                        <div className="relative">
                                            <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.mobile ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all`} />
                                            <Phone className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                        {errors.mobile && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.mobile}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Gender</label>
                                        <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                                            <option value="">Select Gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Date of Birth</label>
                                        <div className="relative">
                                            <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.dateOfBirth ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all`} />
                                            <Calendar className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                        {errors.dateOfBirth && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.dateOfBirth}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-50 dark:border-gray-800">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Profile Photo</h3>
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl flex items-center justify-center overflow-hidden border border-indigo-100 dark:border-indigo-800">
                                        {formData.profilePic ? <img src={formData.profilePic} className="w-full h-full object-cover" /> : <User size={40} className="text-indigo-500/50" />}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <input type="url" name="profilePic" value={formData.profilePic} onChange={handleChange} placeholder="Image URL (Cloudinary, etc)" className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        <p className="text-[10px] text-gray-500">Provide a direct URL to your professional headshot for registry identification.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'professional' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Work & Institutional Presence</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Designation</label>
                                        <div className="relative">
                                            <input type="text" name="designation" value={formData.designation} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            <Award className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Department(s)</label>
                                        <div className="relative">
                                            <input type="text" name="department" value={formData.department} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Nursing, ICU" />
                                            <Building className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                        <p className="text-[10px] text-gray-400 italic">Comma-separated for multiple.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Employee ID</label>
                                        <input type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Joining Date</label>
                                            <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Exp. (Years)</label>
                                            <input type="number" name="experienceYears" value={formData.experienceYears} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-50 dark:border-gray-800">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Clock className="text-indigo-500" /> Working Hours
                                </h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Start Time</label>
                                        <input type="time" name="workingHours.start" value={formData.workingHours.start} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">End Time</label>
                                        <input type="time" name="workingHours.end" value={formData.workingHours.end} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <p className="mt-4 text-xs text-gray-500 italic">This will be used to calculate your late markings and on-time performance.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'qualifications' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Award className="text-indigo-500" /> Professional Qualifications
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Registration Number</label>
                                        <div className="relative">
                                            <input type="text" name="registrationNumber" value={formData.registrationNumber} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. MC-12345" />
                                            <FileText className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">License Validity Date</label>
                                        <div className="relative">
                                            <input type="date" name="licenseValidityDate" value={formData.licenseValidityDate} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            <Calendar className="absolute right-4 top-3.5 text-gray-300 pointer-events-none" size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-50 dark:border-gray-800">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Award className="text-indigo-500" /> Professional Degrees & Certifications
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addQualification}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                                    >
                                        <Plus size={14} /> Add Degree
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {formData.qualifications.map((qual: string, index: number) => (
                                        <div key={index} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    value={qual}
                                                    onChange={(e) => handleQualificationChange(index, e.target.value)}
                                                    placeholder="e.g. MBBS, MD (General Medicine), etc."
                                                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeQualification(index)}
                                                className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    {formData.qualifications.length === 0 && (
                                        <div className="py-12 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem] text-center">
                                            <p className="text-sm text-gray-400 italic font-medium">No qualifications added yet. Click 'Add Degree' to begin.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-50 dark:border-gray-800">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Upload className="text-indigo-500" /> Document Uploads
                                </h3>
                                <div className="space-y-6">
                                    {[
                                        { id: 'degreeCertificate', label: 'Degree Certificate', key: 'degreeCertificate' },
                                        { id: 'medicalCouncilRegistration', label: 'Medical Council Registration', key: 'medicalCouncilRegistration' },
                                        { id: 'nursingCouncilRegistration', label: 'Nursing Council Registration', key: 'nursingCouncilRegistration' }
                                    ].map((doc: any) => (
                                        <div key={doc.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-500">
                                                    <FileText size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">{doc.label}</h4>
                                                    <p className="text-[10px] text-gray-500">Upload PDF or high-resolution image</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {formData.documents?.[doc.key]?.url && (
                                                    <a
                                                        href={formData.documents[doc.key].url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all border border-indigo-100"
                                                        title="View Document"
                                                    >
                                                        <Eye size={18} />
                                                    </a>
                                                )}
                                                <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all">
                                                    <Upload size={14} />
                                                    {files[doc.id] ? files[doc.id].name : 'Choose File'}
                                                    <input type="file" name={doc.id} onChange={handleFileChange} className="hidden" accept=".pdf,image/*" />
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'bank' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 transition-all">
                                    <Wallet className="text-indigo-500" /> Settlement Bank Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Account Holder Name</label>
                                        <input type="text" name="bankDetails.accountName" value={formData.bankDetails.accountName} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Bank Name</label>
                                        <input type="text" name="bankDetails.bankName" value={formData.bankDetails.bankName} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Account Number</label>
                                        <input type="text" name="bankDetails.accountNumber" value={formData.bankDetails.accountNumber} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">IFSC Code</label>
                                        <input type="text" name="bankDetails.ifscCode" value={formData.bankDetails.ifscCode} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors['bankDetails.ifscCode'] ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none`} />
                                        {errors['bankDetails.ifscCode'] && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors['bankDetails.ifscCode']}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-50 dark:border-gray-800">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Payroll & Tax Identifiers</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Base Salary (Per Month)</label>
                                        <input type="number" name="baseSalary" value={formData.baseSalary} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">PAN Card Number</label>
                                        <input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.panNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase`} />
                                        {errors.panNumber && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.panNumber}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Aadhar Number</label>
                                        <input type="text" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.aadharNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none`} />
                                        {errors.aadharNumber && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.aadharNumber}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">PF Number</label>
                                        <input type="text" name="pfNumber" value={formData.pfNumber} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">ESI Number</label>
                                        <input type="text" name="esiNumber" value={formData.esiNumber} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">UAN Number</label>
                                        <input type="text" name="uanNumber" value={formData.uanNumber} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase" />
                                    </div>
                                </div>
                                <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                                    <p className="text-xs text-gray-500 leading-relaxed font-medium">
                                        <strong>SECURITY NOTICE:</strong> All financial and statutory identifiers (PAN, PF, ESI, Bank Details) are encrypted at rest using institutional hardware security modules. Ensure the information matches your official documents to prevent payroll processing failures.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
