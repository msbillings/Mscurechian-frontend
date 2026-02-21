"use client";

import React from 'react';
import { 
    Mail, 
    Phone, 
    MapPin, 
    Building, 
    User as UserIcon,
    ShieldCheck,
    Calendar,
    Award,
    Activity,
    Hospital
} from 'lucide-react';
import { useHelpdeskProfile } from '@/lib/integrations/hooks/useHelpdeskQueries';
import { HelpdeskDashboardSkeleton } from "@/components/ui/skeletons";

export default function HelpdeskProfilePage() {
    const { data: profileData, isLoading } = useHelpdeskProfile();

    if (isLoading) {
        return <HelpdeskDashboardSkeleton />;
    }

    if (!profileData) {
        return (
            <div className="max-w-4xl mx-auto py-20 px-4 text-center">
                <div className="bg-red-50 p-8 rounded-[32px] border border-red-100">
                    <h1 className="text-2xl font-black text-red-600 mb-2 uppercase tracking-tighter">Profile Data Missing</h1>
                    <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">
                        We couldn't fetch your profile details. Please contact the administrator.
                    </p>
                </div>
            </div>
        );
    }

    const { name, email, mobile, hospital } = profileData;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32 pt-8 animate-in fade-in duration-500">
            
            {/* PROFILE HEADER */}
            <div className="relative group overflow-hidden bg-white rounded-[0.5rem] border border-slate-200 shadow-sm p-10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full -mr-48 -mt-48 blur-3xl group-hover:bg-teal-500/10 transition-colors duration-700"></div>
                
                <div className="relative flex flex-col md:flex-row items-center gap-10">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-[40px] bg-slate-900 flex items-center justify-center text-white font-black text-5xl shadow-2xl relative z-10">
                            {name?.charAt(0)}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-teal-500 rounded-2xl flex items-center justify-center border-4 border-white z-20 shadow-lg">
                            <ShieldCheck size={18} className="text-white" />
                        </div>
                    </div>
                    
                    <div className="text-center md:text-left space-y-3">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{name}</h1>
                            <div className="flex items-center justify-center md:justify-start gap-3">
                                <span className="px-4 py-1.5 bg-teal-50 text-teal-600 text-[10px] font-black rounded-full border border-teal-100 uppercase tracking-widest shadow-sm">Helpdesk Specialist</span>
                                <span className="px-4 py-1.5 bg-slate-50 text-slate-400 text-[10px] font-black rounded-full border border-slate-100 uppercase tracking-widest shadow-sm">Verified Account</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-2">
                             <div className="flex items-center gap-2 text-slate-400">
                                <Hospital size={14} className="text-teal-500" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{hospital?.name || "Main Hospital Center"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <MapPin size={14} className="text-teal-500" />
                                <span className="text-[10px] font-bold uppercase tracking-widest leading-tight">{hospital?.address || "Global HQ Facility"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT COLUMN: CONTACT & BASE INFO */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white p-8 rounded-[0.5rem] border border-slate-200 shadow-sm space-y-8">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                            <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
                                <UserIcon size={18} />
                            </div>
                            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-900">Personal Registry</h3>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-3xl transition-colors border border-transparent hover:border-slate-100">
                                <div className="p-2.5 bg-slate-50 rounded-2xl text-slate-400 ring-4 ring-white">
                                    <Mail size={18} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Staff Email</p>
                                    <p className="text-xs font-black text-slate-900 tracking-tight">{email}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-3xl transition-colors border border-transparent hover:border-slate-100">
                                <div className="p-2.5 bg-slate-50 rounded-2xl text-slate-400 ring-4 ring-white">
                                    <Phone size={18} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Direct Contact</p>
                                    <p className="text-xs font-black text-slate-900 tracking-tight">{mobile || "N/A"}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-3xl transition-colors border border-transparent hover:border-slate-100">
                                <div className="p-2.5 bg-slate-50 rounded-2xl text-slate-400 ring-4 ring-white">
                                    <ShieldCheck size={18} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Staff ID Token</p>
                                    <p className="text-xs font-black text-teal-600 tracking-tight">HD-{hospital?._id?.slice(-6).toUpperCase() || "ADMIN"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STATUS CARD */}
                    <div className="bg-white p-8 rounded-[0.5rem] text-gray-900 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-teal-500/30 transition-colors"></div>
                        <div className="relative space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">System Presence</h4>
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-teal-500/20 text-teal-400 rounded-full text-[9px] font-black border border-teal-500/20">
                                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.8)]"></div>
                                    ACTIVE NOW
                                </div>
                            </div>
                            <div className="pt-2">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Current Session Intensity</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-4xl font-black text-white tracking-tighter">100<span className="text-xs text-teal-500">%</span></h3>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Operational Ready</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: PROFESSIONAL CONTEXT */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* INFRASTRUCTURE ASSIGNMENT */}
                        <div className="bg-white p-10 rounded-[0.5rem] border border-slate-200 shadow-sm space-y-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-slate-900 rounded-2xl text-white">
                                    <Building size={20} />
                                </div>
                                <h3 className="font-black text-lg text-slate-900 tracking-tight uppercase">Hospital Node</h3>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="flex justify-between items-center py-4 border-b border-slate-50">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Assignment</span>
                                    <span className="text-xs font-black text-slate-900 uppercase">{hospital?.name || "Main Center"}</span>
                                </div>
                                <div className="flex justify-between items-center py-4 border-b border-slate-50">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Deployment</span>
                                    <span className="text-xs font-black text-slate-400 uppercase italic">Front Desk Ops</span>
                                </div>
                                <div className="flex justify-between items-center py-4">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Security Clearance</span>
                                    <span className="text-xs font-black text-teal-600 uppercase">Level 3 (Node Admin)</span>
                                </div>
                            </div>
                        </div>

                        {/* PROFESSIONAL STANDARDS */}
                        <div className="bg-white p-10 rounded-[0.5rem] border border-slate-200 shadow-sm space-y-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-teal-600 rounded-2xl text-white">
                                    <Award size={20} />
                                </div>
                                <h3 className="font-black text-lg text-slate-900 tracking-tight uppercase">Role Scope</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-slate-50 rounded-[32px] border border-slate-100 text-center space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status</p>
                                    <p className="text-xl font-black text-teal-600 tracking-tighter uppercase">Primary</p>
                                </div>
                                <div className="p-5 bg-slate-50 rounded-[32px] border border-slate-100 text-center space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Shift</p>
                                    <p className="text-xl font-black text-slate-900 tracking-tighter uppercase">Standard</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Core Competencies</h4>
                                <div className="flex flex-wrap gap-2">
                                    {["Patient Intake", "Emergency Dispatch", "Crisis Mgmt", "Financial Registry"].map((skill, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-slate-900 text-white text-[8px] font-black rounded-xl uppercase tracking-widest">{skill}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PERFORMANCE SUMMARY */}
                    <div className="bg-white rounded-[0.5rem] p-12 text-white shadow-sm relative overflow-hidden group">
                         <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mb-40 blur-3xl group-hover:bg-white/20 transition-all duration-1000"></div>
                         
                         <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
                            <div className="md:col-span-2 space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-white backdrop-blur-md rounded-[20px] flex items-center justify-center">
                                       <Activity size={28} className="text-gray-800" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl text-gray-900 leading-tight  uppercase">Institutional impact Profile</h3>
                                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-80">Helpdesk efficiency metrics</p>
                                    </div>
                                </div>
                                <p className="text-gray-800 text-xs font-medium leading-relaxed max-w-lg opacity-90 tracking-wide uppercase">
                                    This staff member maintains an exceptional throughput rate in patient registration and emergency coordination nodes. Registered security clearance for medical record orchestration.
                                </p>
                            </div>
                            
                            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[40px] border border-white/20 space-y-6 text-center shadow-2xl">
                                <div>
                                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em] mb-2">Registration Velocity</p>
                                    <div className="text-5xl text-gray-900">0.9<span className="text-xs">min</span></div>
                                </div>
                                <div className="pt-4 border-t border-white/10">
                                    <p className="text-[9px] font-bold text-gray-900 uppercase tracking-[0.4em] mb-4">Registry Quality</p>
                                    <div className="h-2 bg-white/20 rounded-full overflow-hidden ring-4 ring-gray-700/20">
                                        <div className="h-full bg-white w-[98%] rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"></div>
                                    </div>
                                    <p className="text-[8px] font-black mt-3 text-gray-900 uppercase tracking-[0.2em]">Critical Systems: Normal</p>
                                </div>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
