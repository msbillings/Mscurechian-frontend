"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    User, Mail, Phone, Briefcase, Award,
    CreditCard, Building, Landmark, Wallet, Globe,
    Save, ArrowLeft, Plus, X,
    Calendar, Clock, DollarSign, FileText, Upload, CheckCircle2,
    ShieldCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getDoctorProfileAction, updateDoctorProfileAction } from '@/lib/integrations/actions/doctor.actions';

export default function EditDoctorProfilePage() {
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
        signature: '',
        gender: '',
        dateOfBirth: '',

        // Professional
        specialties: [],
        qualifications: [],
        bio: '',
        experienceStart: '',
        languages: [],
        awards: [],
        degreeCertificate: '',
        doctorateCertificate: '',
        internshipCertificate: '',

        // Medical Registration
        medicalRegistrationNumber: '',
        registrationCouncil: '',
        registrationYear: '',
        registrationExpiryDate: '',
        registrationCertificate: '',

        // Practice
        department: '',
        designation: '',
        employeeId: '',
        consultationFee: '',
        consultationDuration: '',
        maxAppointmentsPerDay: '',
        room: '',

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
        uanNumber: ''
    });

    // Helper states for adding items
    const [tempSpecialty, setTempSpecialty] = useState("");
    const [tempQualification, setTempQualification] = useState("");
    const [tempLanguage, setTempLanguage] = useState("");
    const [tempAward, setTempAward] = useState("");


    useEffect(() => {
        async function loadProfile() {
            setLoading(true);
            try {
                const res = await getDoctorProfileAction();
                if (res.success && res.data) {
                    const d = res.data;
                    setFormData({
                        name: d.user?.name || '',
                        email: d.user?.email || '',
                        mobile: d.user?.mobile || '',
                        profilePic: d.profilePic || '',
                        signature: d.signature || '',
                        gender: d.user?.gender || d.gender || '',
                        dateOfBirth: d.user?.dateOfBirth ? new Date(d.user.dateOfBirth).toISOString().split('T')[0] : (d.dateOfBirth ? new Date(d.dateOfBirth).toISOString().split('T')[0] : ''),
                        specialties: d.specialties || [],
                        qualifications: d.qualifications || [],
                        bio: d.bio || '',
                        experienceStart: d.experienceStart ? new Date(d.experienceStart).toISOString().split('T')[0] : '',
                        languages: d.languages || [],
                        awards: d.awards || [],
                        medicalRegistrationNumber: d.medicalRegistrationNumber || '',
                        registrationCouncil: d.registrationCouncil || '',
                        registrationYear: d.registrationYear || '',
                        registrationExpiryDate: d.registrationExpiryDate ? new Date(d.registrationExpiryDate).toISOString().split('T')[0] : '',
                        degreeCertificate: d.degreeCertificate || '',
                        registrationCertificate: d.registrationCertificate || '',
                        doctorateCertificate: d.doctorateCertificate || '',
                        internshipCertificate: d.internshipCertificate || '',
                        department: d.department || '',
                        designation: d.designation || '',
                        employeeId: d.employeeId || '',
                        consultationFee: d.consultationFee || '',
                        consultationDuration: d.consultationDuration || '',
                        maxAppointmentsPerDay: d.maxAppointmentsPerDay || '',
                        room: d.room || '',
                        bankDetails: {
                            bankName: d.bankDetails?.bankName || '',
                            accountNumber: d.bankDetails?.accountNumber || '',
                            accountName: d.bankDetails?.accountName || '',
                            ifscCode: d.bankDetails?.ifscCode || ''
                        },
                        panNumber: d.panNumber || '',
                        aadharNumber: d.aadharNumber || '',
                        baseSalary: d.baseSalary || '',
                        pfNumber: d.pfNumber || '',
                        esiNumber: d.esiNumber || '',
                        uanNumber: d.uanNumber || ''
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

        // Basic Info
        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }

        if (formData.mobile && !/^\d{10}$/.test(formData.mobile)) {
            newErrors.mobile = "Mobile number must be exactly 10 digits";
        }

        if (formData.dateOfBirth) {
            const dob = new Date(formData.dateOfBirth);
            if (dob > new Date()) {
                newErrors.dateOfBirth = "Date of Birth cannot be in the future";
            }
        }

        // Bank Details
        if (formData.bankDetails.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bankDetails.ifscCode.toUpperCase())) {
            newErrors['bankDetails.ifscCode'] = "Invalid IFSC Code format (e.g. SBIN0012345)";
        }

        // Tax IDs
        if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase())) {
            newErrors.panNumber = "Invalid PAN format (e.g. ABCDE1234F)";
        }

        if (formData.aadharNumber && !/^\d{12}$/.test(formData.aadharNumber)) {
            newErrors.aadharNumber = "Aadhar number must be 12 digits";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Clear error when user changes the field
        if (errors[name]) {
            setErrors(prev => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData((prev: any) => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: value }));
        }
    };

    const addItem = (type: 'specialties' | 'qualifications' | 'languages' | 'awards', value: string) => {
        if (!value.trim()) return;
        if (!formData[type].includes(value)) {
            setFormData((prev: any) => ({
                ...prev,
                [type]: [...prev[type], value]
            }));
        }
        if (type === 'specialties') setTempSpecialty("");
        else if (type === 'qualifications') setTempQualification("");
        else if (type === 'languages') setTempLanguage("");
        else setTempAward("");
    };

    const removeItem = (type: 'specialties' | 'qualifications' | 'languages' | 'awards', item: string) => {
        setFormData((prev: any) => ({
            ...prev,
            [type]: prev[type].filter((i: string) => i !== item)
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files: selectedFiles } = e.target;
        if (selectedFiles && selectedFiles[0]) {
            setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
        }
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

            // Add all simple fields
            Object.keys(formData).forEach(key => {
                if (typeof formData[key] !== 'object' && key !== 'profilePic' && key !== 'degreeCertificate' && key !== 'registrationCertificate') {
                    formDataToSubmit.append(key, formData[key]);
                }
            });

            // Complex fields handled explicitly if needed, but here simple append works for arrays usually via loop or JSON
            // But for arrays like specialties, we might need to stringify or append multiple times depending on backend expectation.
            // Doctor backend likely receives JSON body usually. Since we switched to FormData, we must ensure backend parses it.
            // CAUTION: Multer populates `req.body` but array fields need careful handling. 
            // `updateDoctorProfile` expects arrays. `JSON.stringify` for arrays is safe if backend uses `JSON.parse` or if standard express body parser isn't interfering.
            // The BEST approach for mixed content with multer: send arrays as stringified JSON if Controller expects arrays.

            formDataToSubmit.append('specialties', JSON.stringify(formData.specialties));
            formDataToSubmit.append('qualifications', JSON.stringify(formData.qualifications));
            formDataToSubmit.append('languages', JSON.stringify(formData.languages));
            formDataToSubmit.append('awards', JSON.stringify(formData.awards));
            formDataToSubmit.append('bankDetails', JSON.stringify(formData.bankDetails));

            // Files
            Object.keys(files).forEach(key => {
                formDataToSubmit.append(key, files[key]);
            });

            // Existing URLs or Strings (Only send if NO new file is selected for that field)
            if (formData.profilePic && !files['profilePic']) formDataToSubmit.append('profilePic', formData.profilePic);
            if (formData.degreeCertificate && !files['degreeCertificate']) formDataToSubmit.append('degreeCertificate', formData.degreeCertificate);
            if (formData.registrationCertificate && !files['registrationCertificate']) formDataToSubmit.append('registrationCertificate', formData.registrationCertificate);
            if (formData.doctorateCertificate && !files['doctorateCertificate']) formDataToSubmit.append('doctorateCertificate', formData.doctorateCertificate);
            if (formData.internshipCertificate && !files['internshipCertificate']) formDataToSubmit.append('internshipCertificate', formData.internshipCertificate);


            const res = await updateDoctorProfileAction(formDataToSubmit);
            if (res.success) {
                toast.success('Your data is safe');
                router.push('/doctor/profile');
            } else {
                toast.error(res.error || 'Failed to update profile');
            }
        } catch (error: any) {
            console.error(error);
            const message =
                (error && typeof error === 'object' && 'message' in error)
                    ? (error as any).message as string
                    : String(error ?? '');

            if (message.includes('Body exceeded 1 MB limit')) {
                toast.error('Uploaded files are too large. Maximum total size is 5 MB.');
            } else {
                toast.error('An unexpected error occurred while saving your profile.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const tabs = [
        { id: 'personal', label: 'Personal & Account', icon: <User size={18} /> },
        { id: 'professional', label: 'Professional Info', icon: <Briefcase size={18} /> },
        { id: 'practice', label: 'Practice & clinical', icon: <Building size={18} /> },
        { id: 'bank', label: 'Bank & Payroll', icon: <Landmark size={18} /> },
        { id: 'documents', label: 'My Documents', icon: <FileText size={18} /> },
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
                    className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
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
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
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
                                            <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.name ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all`} />
                                            <User className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                        {errors.name && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.name}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Email Address <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.email ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all`} />
                                            <Mail className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                        {errors.email && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.email}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Mobile Number</label>
                                        <div className="relative">
                                            <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.mobile ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all`} />
                                            <Phone className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                        {errors.mobile && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.mobile}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Gender</label>
                                        <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                                            <option value="">Select Gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Date of Birth</label>
                                        <div className="relative">
                                            <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.dateOfBirth ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all`} />
                                            <Calendar className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                        {errors.dateOfBirth && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.dateOfBirth}</p>}
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                    {activeTab === 'professional' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Medical Qualifications</h3>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Professional Bio</label>
                                        <textarea name="bio" value={formData.bio} onChange={handleChange} rows={4} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none" placeholder="Experience, philosophy of care, and expertise..." />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Experience Start Date</label>
                                            <div className="relative">
                                                <input type="date" name="experienceStart" value={formData.experienceStart} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                                <Calendar className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 pt-6 border-t border-gray-50 dark:border-gray-800">
                                <div>
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider mb-3 block">Specialties</label>
                                    <div className="flex gap-2 mb-3">
                                        <input type="text" value={tempSpecialty} onChange={(e) => setTempSpecialty(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addItem('specialties', tempSpecialty)} placeholder="e.g. Cardiology, Pediatrics" className="flex-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <button onClick={() => addItem('specialties', tempSpecialty)} className="bg-emerald-100 text-emerald-700 px-4 rounded-xl font-bold hover:bg-emerald-200"><Plus size={18} /></button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.specialties.map((s: string) => (
                                            <span key={s} className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold border border-gray-200 flex items-center gap-2">
                                                {s} <button onClick={() => removeItem('specialties', s)}><X size={12} /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider mb-3 block">Qualifications</label>
                                    <div className="flex gap-2 mb-3">
                                        <input type="text" value={tempQualification} onChange={(e) => setTempQualification(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addItem('qualifications', tempQualification)} placeholder="e.g. MBBS, MD" className="flex-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <button onClick={() => addItem('qualifications', tempQualification)} className="bg-emerald-100 text-emerald-700 px-4 rounded-xl font-bold hover:bg-emerald-200"><Plus size={18} /></button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.qualifications.map((q: string) => (
                                            <span key={q} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-100 flex items-center gap-2">
                                                <Award size={12} /> {q} <button onClick={() => removeItem('qualifications', q)}><X size={12} /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-50 dark:border-gray-800">
                                <div>
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider mb-3 block">Languages Spoken</label>
                                    <div className="flex gap-2 mb-3">
                                        <input type="text" value={tempLanguage} onChange={(e) => setTempLanguage(e.target.value)} placeholder="English, Hindi..." className="flex-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <button onClick={() => addItem('languages', tempLanguage)} className="bg-gray-100 text-gray-600 px-4 rounded-xl font-bold hover:bg-gray-200"><Plus size={18} /></button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.languages.map((l: string) => (
                                            <span key={l} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/10 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 flex items-center gap-2">
                                                <Globe size={12} /> {l} <button onClick={() => removeItem('languages', l)}><X size={12} /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider mb-3 block">Awards & Recognition</label>
                                    <div className="flex gap-2 mb-3">
                                        <input type="text" value={tempAward} onChange={(e) => setTempAward(e.target.value)} placeholder="Best Doctor Award..." className="flex-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <button onClick={() => addItem('awards', tempAward)} className="bg-amber-100 text-amber-700 px-4 rounded-xl font-bold hover:bg-amber-200"><Plus size={18} /></button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.awards.map((a: string) => (
                                            <span key={a} className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/10 text-amber-600 rounded-lg text-xs font-bold border border-amber-100 flex items-center gap-2">
                                                <Award size={12} /> {a} <button onClick={() => removeItem('awards', a)}><X size={12} /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-50 dark:border-gray-800">
                                <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-4 block">Proof of Qualification</h4>
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-500">
                                            <Award size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Degree Certificate</h4>
                                            <p className="text-[10px] text-gray-500">Upload your highest degree certificate (PDF/Image)</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {formData.degreeCertificate && (
                                            <a href={formData.degreeCertificate} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-lg border border-green-100 dark:border-green-800/30">
                                                <CheckCircle2 size={12} /> View
                                            </a>
                                        )}
                                        <div className="flex flex-col items-end gap-1">
                                            <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all">
                                                <Upload size={14} />
                                                {files['degreeCertificate'] ? 'Change File' : 'Upload'}
                                                <input type="file" name="degreeCertificate" onChange={handleFileChange} className="hidden" accept=".pdf,image/*" />
                                            </label>
                                            {files['degreeCertificate'] && (
                                                <span className="text-[10px] text-gray-500 font-medium max-w-[150px] truncate">
                                                    {files['degreeCertificate'].name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-500">
                                            <Award size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Doctorate Certificate</h4>
                                            <p className="text-[10px] text-gray-500">Upload your Doctorate/PhD certificate (PDF/Image)</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {formData.doctorateCertificate && (
                                            <a href={formData.doctorateCertificate} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-lg border border-green-100 dark:border-green-800/30">
                                                <CheckCircle2 size={12} /> View
                                            </a>
                                        )}
                                        <div className="flex flex-col items-end gap-1">
                                            <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all">
                                                <Upload size={14} />
                                                {files['doctorateCertificate'] ? 'Change File' : 'Upload'}
                                                <input type="file" name="doctorateCertificate" onChange={handleFileChange} className="hidden" accept=".pdf,image/*" />
                                            </label>
                                            {files['doctorateCertificate'] && (
                                                <span className="text-[10px] text-gray-500 font-medium max-w-[150px] truncate">
                                                    {files['doctorateCertificate'].name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-500">
                                            <Award size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Internship Completion</h4>
                                            <p className="text-[10px] text-gray-500">Upload your Internship Completion certificate (PDF/Image)</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {formData.internshipCertificate && (
                                            <a href={formData.internshipCertificate} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-lg border border-green-100 dark:border-green-800/30">
                                                <CheckCircle2 size={12} /> View
                                            </a>
                                        )}
                                        <div className="flex flex-col items-end gap-1">
                                            <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all">
                                                <Upload size={14} />
                                                {files['internshipCertificate'] ? 'Change File' : 'Upload'}
                                                <input type="file" name="internshipCertificate" onChange={handleFileChange} className="hidden" accept=".pdf,image/*" />
                                            </label>
                                            {files['internshipCertificate'] && (
                                                <span className="text-[10px] text-gray-500 font-medium max-w-[150px] truncate">
                                                    {files['internshipCertificate'].name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-[#111] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                                    <FileText className="text-indigo-500" size={24} /> Previously Submitted Documents
                                </h3>
                                <p className="text-sm text-gray-500 mb-8">Review all the documents and certificates you have previously submitted. To replace any of these, upload a new file in the Professional or Practice tabs.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Degree Certificate */}
                                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center gap-4 transition-all hover:border-indigo-200">
                                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-500">
                                            <Award size={32} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Degree Certificate</h4>
                                            {formData.degreeCertificate ? (
                                                <a href={formData.degreeCertificate} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-100 dark:border-emerald-800/30 hover:bg-emerald-100 transition-colors">
                                                    <CheckCircle2 size={16} /> View Document
                                                </a>
                                            ) : (
                                                <p className="mt-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Not Submitted</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Doctorate Certificate */}
                                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center gap-4 transition-all hover:border-indigo-200">
                                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-500">
                                            <Award size={32} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Doctorate Certificate</h4>
                                            {formData.doctorateCertificate ? (
                                                <a href={formData.doctorateCertificate} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-100 dark:border-emerald-800/30 hover:bg-emerald-100 transition-colors">
                                                    <CheckCircle2 size={16} /> View Document
                                                </a>
                                            ) : (
                                                <p className="mt-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Not Submitted</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Internship Completion */}
                                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center gap-4 transition-all hover:border-indigo-200">
                                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-500">
                                            <Award size={32} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Internship Completion</h4>
                                            {formData.internshipCertificate ? (
                                                <a href={formData.internshipCertificate} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-100 dark:border-emerald-800/30 hover:bg-emerald-100 transition-colors">
                                                    <CheckCircle2 size={16} /> View Document
                                                </a>
                                            ) : (
                                                <p className="mt-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Not Submitted</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Registration Certificate */}
                                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center gap-4 transition-all hover:border-emerald-200">
                                        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-500">
                                            <ShieldCheck size={32} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Registration Certificate</h4>
                                            {formData.registrationCertificate ? (
                                                <a href={formData.registrationCertificate} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-100 dark:border-emerald-800/30 hover:bg-emerald-100 transition-colors">
                                                    <CheckCircle2 size={16} /> View Document
                                                </a>
                                            ) : (
                                                <p className="mt-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Not Submitted</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'practice' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 underline decoration-emerald-500 decoration-4 underline-offset-8">Medical Registration</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Registration Number</label>
                                        <input type="text" name="medicalRegistrationNumber" value={formData.medicalRegistrationNumber} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Medical Council</label>
                                        <input type="text" name="registrationCouncil" value={formData.registrationCouncil} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Registration Year</label>
                                        <input type="text" name="registrationYear" value={formData.registrationYear} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Expiry Date</label>
                                        <input type="date" name="registrationExpiryDate" value={formData.registrationExpiryDate} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                </div>
                                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-500">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Registration Certificate</h4>
                                            <p className="text-[10px] text-gray-500">Upload your Medical Council Registration (PDF/Image)</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {formData.registrationCertificate && (
                                            <a href={formData.registrationCertificate} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-lg border border-green-100 dark:border-green-800/30">
                                                <CheckCircle2 size={12} /> View
                                            </a>
                                        )}
                                        <div className="flex flex-col items-end gap-1">
                                            <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all">
                                                <Upload size={14} />
                                                {files['registrationCertificate'] ? 'Change File' : 'Upload'}
                                                <input type="file" name="registrationCertificate" onChange={handleFileChange} className="hidden" accept=".pdf,image/*" />
                                            </label>
                                            {files['registrationCertificate'] && (
                                                <span className="text-[10px] text-gray-500 font-medium max-w-[150px] truncate">
                                                    {files['registrationCertificate'].name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-50 dark:border-gray-800">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Hospital Assignment</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Department</label>
                                        <input type="text" name="department" value={formData.department} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Designation</label>
                                        <input type="text" name="designation" value={formData.designation} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Employee ID</label>
                                        <input type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Room/Cabin</label>
                                        <input type="text" name="room" value={formData.room} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-50 dark:border-gray-800">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Scheduling Defaults</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Consultation Fee (₹)</label>
                                        <div className="relative">
                                            <input type="number" name="consultationFee" value={formData.consultationFee} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                            <DollarSign className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Duration (mins)</label>
                                        <div className="relative">
                                            <input type="number" name="consultationDuration" value={formData.consultationDuration} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                            <Clock className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Max Appt/Day</label>
                                        <div className="relative">
                                            <input type="number" name="maxAppointmentsPerDay" value={formData.maxAppointmentsPerDay} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                            <Plus className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'bank' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Wallet className="text-emerald-500" /> Settlement Bank Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Account Holder Name</label>
                                        <input type="text" name="bankDetails.accountName" value={formData.bankDetails.accountName} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Bank Name</label>
                                        <input type="text" name="bankDetails.bankName" value={formData.bankDetails.bankName} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Account Number</label>
                                        <input type="text" name="bankDetails.accountNumber" value={formData.bankDetails.accountNumber} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">IFSC Code</label>
                                        <input type="text" name="bankDetails.ifscCode" value={formData.bankDetails.ifscCode} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors['bankDetails.ifscCode'] ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none`} />
                                        {errors['bankDetails.ifscCode'] && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors['bankDetails.ifscCode']}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-50 dark:border-gray-800">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Payroll & Tax Identifiers</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Base Salary (Per Month)</label>
                                        <input type="number" name="baseSalary" value={formData.baseSalary} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">PAN Card Number</label>
                                        <input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.panNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none`} />
                                        {errors.panNumber && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.panNumber}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Aadhar Number</label>
                                        <input type="text" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.aadharNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none`} />
                                        {errors.aadharNumber && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.aadharNumber}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">PF Number</label>
                                        <input type="text" name="pfNumber" value={formData.pfNumber} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">ESI Number</label>
                                        <input type="text" name="esiNumber" value={formData.esiNumber} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">UAN Number</label>
                                        <input type="text" name="uanNumber" value={formData.uanNumber} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                </div>
                                <p className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs text-gray-500 leading-relaxed">
                                    <strong>Note:</strong> These details are essential for generating accurate monthly payslips. Please ensure the information matches your official documents. The hospital administration uses this data for financial compliance.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Removed Cropper Modal for performance */}
        </div>
    );
}
