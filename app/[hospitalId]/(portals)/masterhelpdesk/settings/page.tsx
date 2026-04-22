"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    User, Mail, Phone, Briefcase, Award,
    CreditCard, Building, Landmark, Wallet,
    Save, ArrowLeft, Plus, X,
    Calendar, FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { helpdeskService } from '@/lib/integrations/services/helpdesk.service';

const DocumentViewerModal = ({ isOpen, onClose, url, title }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8 md:p-12 bg-[#020617]/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#0a0a09] w-full h-full max-h-[90vh] max-w-6xl rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden flex flex-col relative shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] border border-white/10">
                <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white/50 dark:bg-black/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600">
                            <FileText size={20} />
                        </div>
                        <h3 className="font-black text-xs sm:text-sm text-gray-900 dark:text-white uppercase tracking-widest truncate max-w-[200px] sm:max-w-md">{title}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 sm:p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 active:scale-90 transition-all">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto bg-gray-50 dark:bg-[#050505] flex items-center justify-center">
                    {url?.toLowerCase().includes('.pdf') || url?.toLowerCase().includes('raw') || url?.toLowerCase().includes('pdf') ? (
                        <iframe src={`${url}#toolbar=0`} className="w-full h-full border-none" title={title} />
                    ) : (
                        <img src={url} alt={title} className="max-w-full h-auto shadow-lg" />
                    )}
                </div>
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-black/50 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Institutional Secure Document Viewer</p>
                </div>
            </div>
        </div>
    );
};

export default function MasterHelpdeskProfileSettings() {
    const router = useRouter();
    const params = useParams();
    const hospitalId = params?.hospitalId as string;
    
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('personal');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [files, setFiles] = useState<Record<string, File>>({});
    const [viewer, setViewer] = useState({ isOpen: false, url: '', title: '' });
    const [isIFSCValidating, setIsIFSCValidating] = useState(false);

    const [formData, setFormData] = useState<any>({
        // Personal & Account
        name: '',
        email: '',
        mobile: '',
        profilePic: '',
        gender: '',
        dateOfBirth: '',

        // Professional & Placement (UI Only / Extension allowed later)
        designation: 'Master Helpdesk Executive',
        department: 'Central Support',
        employeeId: '',
        joiningDate: '',
        experienceYears: '',
        workingHours: { start: '', end: '' },

        // Bank & Payroll 
        bankDetails: { bankName: '', accountNumber: '', accountName: '', ifscCode: '' },
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
        documents: {}
    });

    useEffect(() => {
        async function loadProfile() {
            setLoading(true);
            try {
                const res = await helpdeskService.getMe();
                if (res) {
                    setFormData((prev: any) => ({
                        ...prev,
                        name: res.name || '',
                        email: res.email || '',
                        mobile: res.mobile || '',
                        gender: (res as any).gender || '',
                        profilePic: (res as any).image || '',
                        dateOfBirth: (res as any).dateOfBirth ? new Date((res as any).dateOfBirth).toISOString().split('T')[0] : '',
                    }));
                }
            } catch (error) {
                toast.error('Failed to load profile details');
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
        
        // Strict Bank & Payroll Validation
        if (formData.bankDetails.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bankDetails.ifscCode.toUpperCase())) {
            newErrors['bankDetails.ifscCode'] = "Invalid IFSC Code format";
        }
        if (formData.bankDetails.accountNumber && !/^[0-9]{9,18}$/.test(formData.bankDetails.accountNumber)) {
            newErrors['bankDetails.accountNumber'] = "Account number must be 9-18 digits";
        }
        if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase())) {
            newErrors.panNumber = "Invalid PAN format";
        }
        if (formData.aadharNumber && !/^\d{12}$/.test(formData.aadharNumber)) {
            newErrors.aadharNumber = "Aadhar number must be 12 digits";
        }
        if (formData.esiNumber && !/^[0-9]{10,17}$/.test(formData.esiNumber)) {
            newErrors.esiNumber = "ESI must be 10-17 digits";
        }
        if (formData.uanNumber && !/^\d{12}$/.test(formData.uanNumber)) {
            newErrors.uanNumber = "UAN must be 12 digits";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let fieldError = "";

        if (name === 'bankDetails.accountName' || name === 'name') {
            if (!/^[A-Za-z ]{3,}$/.test(value) && value.length > 0) fieldError = "Only letters & spaces, min 3 chars";
        }
        if (name === 'bankDetails.bankName') {
            if (!/^[A-Za-z ]+$/.test(value) && value.length > 0) fieldError = "Only letters & spaces";
        }
        if (['mobile', 'bankDetails.accountNumber', 'aadharNumber', 'experienceYears', 'uanNumber'].includes(name)) {
            if (value && !/^\d*$/.test(value)) return; // Only allow digits
        }

        if (name === 'mobile' && value.length > 10) return;
        if (name === 'aadharNumber' && value.length > 12) return;
        if (name === 'panNumber' && value.length > 10) return;
        if (name === 'bankDetails.ifscCode' && value.length > 11) return;
        if (name === 'uanNumber' && value.length > 12) return;

        setErrors(prev => ({ ...prev, [name]: fieldError }));
        if (!fieldError && errors[name]) {
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
            // Update backend Profile
            await helpdeskService.updateProfile({
                name: formData.name,
                email: formData.email,
                mobile: formData.mobile,
                gender: formData.gender,
                dateOfBirth: formData.dateOfBirth,
                image: formData.profilePic
            } as any);

            toast.success('Master Helpdesk Profile updated successfully!');
            router.push(`/${hospitalId}/masterhelpdesk`);
        } catch (error: any) {
             toast.error(error.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
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
        <div className="max-w-7xl mx-auto py-2 sm:py-8 px-[5px] sm:px-4">
            <DocumentViewerModal
                isOpen={viewer.isOpen}
                onClose={() => setViewer({ ...viewer, isOpen: false })}
                url={viewer.url}
                title={viewer.title}
            />
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors"
                    >
                        <ArrowLeft size={20} className="sm:size-6" />
                    </button>
                    <div>
                        <h1 className="md:text-xl text-lg font-black text-gray-900 dark:text-white tracking-tighter">Master Helpdesk Profile</h1>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5 sm:mt-1">Healthcare Administration Registry</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 sm:px-8 py-2.5 sm:py-3 bg-teal-600 hover:bg-teal-700 text-white text-[10px] sm:text-sm font-black uppercase tracking-widest rounded-xl sm:rounded-2xl shadow-xl shadow-teal-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                    {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={16} className="sm:size-4" />}
                    Save Changes
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-64 shrink-0">
                    <div className="lg:hidden mb-6">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-3 block px-1">Navigation Registry</label>
                        <div className="relative">
                            <select 
                                value={activeTab}
                                onChange={(e) => setActiveTab(e.target.value)}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-teal-500 shadow-sm appearance-none"
                            >
                                {tabs.map(tab => (
                                    <option key={tab.id} value={tab.id}>{tab.label}</option>
                                ))}
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <Plus size={16} />
                            </div>
                        </div>
                    </div>

                    {/* Desktop Sidebar Navigation */}
                    <div className="hidden lg:flex lg:flex-col gap-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20 translate-x-1'
                                    : 'bg-white dark:bg-[#111] text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900 border border-gray-100 dark:border-gray-800'
                                    }`}
                            >
                                <span className={`shrink-0 ${activeTab === tab.id ? 'text-white' : 'text-teal-600'}`}>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-gray-800 p-3 sm:p-8 shadow-sm">
                    {activeTab === 'personal' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Account Information</h3>
                                
                                {/* Logo / Avatar Updater */}
                                <div className="mb-8 flex items-center gap-6">
                                    <div className="relative group w-24 h-24 rounded-full border-4 border-white dark:border-[#111] shadow-xl overflow-hidden bg-gray-50 dark:bg-gray-900 flex-shrink-0">
                                        {formData.profilePic ? (
                                            <img src={formData.profilePic} alt="Profile Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-10 h-10 text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                        )}
                                        <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <span className="text-white text-[10px] font-bold tracking-widest uppercase">Update</span>
                                            <input type="file" name="profilePic" accept="image/*" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setFormData(prev => ({...prev, profilePic: reader.result}));
                                                    reader.readAsDataURL(file);
                                                }
                                            }} className="hidden" />
                                        </label>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-1">Profile Logo</h4>
                                        <p className="text-xs text-gray-400">JPG, GIF or PNG. Max size of 5MB.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Full Name <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.name ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all`} />
                                            <User className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                        {errors.name && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.name}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Email Address <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.email ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all`} />
                                            <Mail className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                        {errors.email && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.email}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Mobile Number</label>
                                        <div className="relative">
                                            <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.mobile ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all`} />
                                            <Phone className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                        {errors.mobile && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.mobile}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Gender</label>
                                        <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all">
                                            <option value="">Select Gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Date of Birth</label>
                                        <div className="relative">
                                            <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.dateOfBirth ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all`} />
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
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Work & Institutional Presence</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Designation</label>
                                        <div className="relative">
                                            <input type="text" name="designation" value={formData.designation} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                                            <Award className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Department(s)</label>
                                        <div className="relative">
                                            <input type="text" name="department" value={formData.department} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                                            <Building className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Employee ID</label>
                                        <input type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} placeholder="MHD-###" className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Joining Date</label>
                                            <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Exp. (Years)</label>
                                            <input type="text" name="experienceYears" value={formData.experienceYears} onChange={handleChange} placeholder="e.g. 5" className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'qualifications' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Qualifications &amp; Credentials</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Registration / License Number</label>
                                        <input
                                            type="text"
                                            name="registrationNumber"
                                            value={formData.registrationNumber}
                                            onChange={handleChange}
                                            placeholder="e.g. MHD-2024-001"
                                            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">License Validity Date</label>
                                        <input
                                            type="date"
                                            name="licenseValidityDate"
                                            value={formData.licenseValidityDate}
                                            onChange={handleChange}
                                            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Qualifications / Degrees</label>
                                        <button
                                            type="button"
                                            onClick={addQualification}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95"
                                        >
                                            <Plus size={12} /> Add
                                        </button>
                                    </div>

                                    {formData.qualifications.length === 0 && (
                                        <p className="text-xs text-gray-400 italic py-4 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                            No qualifications added yet. Click &ldquo;Add&rdquo; to begin.
                                        </p>
                                    )}

                                    {formData.qualifications.map((q: string, i: number) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <input
                                                type="text"
                                                value={q}
                                                onChange={(e) => handleQualificationChange(i, e.target.value)}
                                                placeholder={`e.g. Masters in Hospital Administration`}
                                                className="flex-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeQualification(i)}
                                                className="p-2.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                            >
                                                <X size={16} />
                                            </button>
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
                                    <Wallet className="text-teal-500" /> Settlement Bank Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Account Holder Name</label>
                                        <input type="text" name="bankDetails.accountName" value={formData.bankDetails.accountName} onChange={handleChange} placeholder="e.g. John Doe" className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors['bankDetails.accountName'] ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none`} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Bank Name</label>
                                        <input type="text" name="bankDetails.bankName" value={formData.bankDetails.bankName} onChange={handleChange} placeholder="e.g. State Bank of India" className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors['bankDetails.bankName'] ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none`} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Account Number</label>
                                        <input type="text" name="bankDetails.accountNumber" value={formData.bankDetails.accountNumber} onChange={handleChange} placeholder="e.g. 1234567890" className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors['bankDetails.accountNumber'] ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none`} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">IFSC Code</label>
                                        <input type="text" name="bankDetails.ifscCode" value={formData.bankDetails.ifscCode} onChange={handleChange} placeholder="e.g. HDFC0001234" className={`w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm uppercase outline-none focus:ring-2 focus:ring-teal-500`} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-50 dark:border-gray-800">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Payroll & Tax Identifiers</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">PAN Card Number</label>
                                        <input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} placeholder="e.g. ABCDE1234F" className={`w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500`} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Aadhar Number</label>
                                        <input type="text" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} placeholder="e.g. 123456789012" className={`w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500`} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">ESI Number</label>
                                        <input type="text" name="esiNumber" value={formData.esiNumber} onChange={handleChange} placeholder="e.g. 11000000000000000" className={`w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500`} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">PF Number</label>
                                        <input type="text" name="pfNumber" value={formData.pfNumber} onChange={handleChange} placeholder="e.g. MHBAN0000000000" className={`w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500`} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">UAN Number</label>
                                        <input type="text" name="uanNumber" value={formData.uanNumber} onChange={handleChange} placeholder="e.g. 100000000000" className={`w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500`} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
