"use client";

import React, { useState, useEffect } from 'react';
import toast from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { userService } from "@/lib/integrations/services/user.service";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import {
    User,
    Mail,
    Phone,
    Shield,
    Building2,
    Calendar,
    Camera,
    LogOut,
    Save,
    ArrowRight,
    BadgeCheck,
    Hash,
    MapPin,
    Globe,
    Activity,
    Briefcase,
    Fingerprint
} from "lucide-react";

function HRProfile() {
    const router = useRouter();
    const { hospitalId } = useParams();
    const { user: authUser, logout, checkAuth } = useAuthStore();
    const [profile, setProfile] = useState<any>(null);
    const [hospital, setHospital] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Personal Info Form
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobile: "",
        gender: "",
        department: "",
        employeeId: ""
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [userRes, hospitalRes] = await Promise.all([
                userService.getProfile(),
                hospitalAdminService.getHospital()
            ]);

            const userData = userRes.user || userRes;
            setProfile(userData);
            setHospital(hospitalRes.hospital);

            setFormData({
                name: userData.name || "",
                email: userData.email || "",
                mobile: userData.mobile || "",
                gender: userData.gender || "",
                department: userData.department || "Human Resources",
                employeeId: userData.employeeId || ""
            });
        } catch (error: any) {
            console.error("Profile load error:", error);
            toast.error("Failed to load profile information");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await userService.updateProfile(formData);
            toast.success("Profile updated successfully");
            await checkAuth(); // Refresh global auth state
            await loadData(); // Refresh local state
        } catch (error: any) {
            toast.error(error.message || "Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Verifying Identity...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto space-y-6 pb-12">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                            <User className="text-indigo-600" size={32} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Personnel Profile</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Manage your HR account and portal preferences</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Personal Profile */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-1 px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                                <Shield className="text-indigo-600" size={18} />
                                <h2 className="text-sm font-bold text-gray-900 uppercase">Employee Credentials</h2>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
                                <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-3xl bg-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-lg shadow-indigo-100 uppercase tracking-tighter">
                                            {profile?.name?.charAt(0) || "H"}
                                        </div>
                                        <button type="button" className="absolute -bottom-2 -right-2 p-2 bg-white border border-gray-200 rounded-xl shadow-md text-gray-600 hover:scale-110 active:scale-95 transition-all">
                                            <Camera size={16} />
                                        </button>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <h3 className="text-xl font-bold text-gray-900">{profile?.name}</h3>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                                                HR Manager
                                            </span>
                                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                                                Authorized Access
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Full Legal Name</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 font-bold"
                                                placeholder="HR Manager Name"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Institutional Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                disabled
                                                className="w-full pl-12 pr-4 py-3 bg-gray-100 border border-gray-100 rounded-xl cursor-not-allowed text-gray-500 font-bold"
                                                placeholder="institution@curechain.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Direct Mobile Contact</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                value={formData.mobile}
                                                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 font-bold"
                                                placeholder="Contact number"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Gender Identification</label>
                                        <select
                                            value={formData.gender}
                                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 font-bold appearance-none"
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-gray-50">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
                                    >
                                        {isSaving ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <Save size={18} />
                                        )}
                                        Synchronize Profile
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="bg-indigo-600 rounded-2xl p-6 text-white overflow-hidden relative shadow-xl shadow-indigo-200">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Activity size={120} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Hospital Linkage */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-1 px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Building2 className="text-blue-600" size={18} />
                                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Hospital Details</h2>
                                </div>
                                <BadgeCheck className="text-blue-500" size={18} />
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-inner">
                                        <Building2 size={40} className="text-blue-600" />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 truncate px-2 uppercase tracking-tight">{hospital?.name}</h3>
                                    <code className="text-[10px] font-black bg-gray-100 px-2 py-0.5 rounded text-gray-500 mt-2 block w-fit mx-auto">#{hospital?.hospitalId || 'ID_N/A'}</code>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex gap-4 p-3 rounded-xl bg-gray-50 border border-gray-50">
                                        <MapPin className="text-rose-500 shrink-0" size={20} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</p>
                                            <p className="text-xs font-bold text-gray-700 line-clamp-2">{hospital?.address || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 p-3 rounded-xl bg-gray-50 border border-gray-50">
                                        <Globe className="text-indigo-500 shrink-0" size={20} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Domain Authority</p>
                                            <p className="text-xs font-bold text-gray-700 truncate">{hospital?.website || 'internal.curechain.com'}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 p-3 rounded-xl bg-gray-50 border border-gray-50">
                                        <Calendar className="text-amber-500 shrink-0" size={20} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registration Date</p>
                                            <p className="text-xs font-bold text-gray-700">{hospital?.createdAt ? new Date(hospital.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : 'Jan 2024'}</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => router.push(`/${hospitalId}/hr/hospital/departments`)}
                                    className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
                                >
                                    Manage Departments <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>

                        {/* HR specific quick reference */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Protocol Support</h4>
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div> Active
                                </span>
                            </div>
                            <div className="space-y-3">
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                                    <p className="text-xs font-bold text-gray-900 uppercase tracking-tight">Compliance Manual</p>
                                    <p className="text-[10px] text-gray-400 font-medium">Standard HR Operating Protocols</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                                    <p className="text-xs font-bold text-gray-900 uppercase tracking-tight">Escalation Matrix</p>
                                    <p className="text-[10px] text-gray-400 font-medium">Reporting Path for Hospital Ops</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default React.memo(HRProfile);
