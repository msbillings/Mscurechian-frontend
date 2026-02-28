"use client";

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
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
    Hospital,
    Edit3,
    CreditCard,
    FileText,
    CheckCircle2,
    Briefcase,
    Landmark
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getStaffProfileAction } from '@/lib/integrations/actions/staff.actions';
import { HelpdeskDashboardSkeleton } from "@/components/ui/skeletons";

export default function HelpdeskProfilePage() {
    const router = useRouter();
    const params = useParams();
    const hospitalId = params?.hospitalId;

    const { data: staffData, isLoading } = useQuery({
        queryKey: ['staff-profile', 'my'],
        queryFn: async () => {
            const res = await getStaffProfileAction();
            return res.staff;
        }
    });

    if (isLoading) {
        return <HelpdeskDashboardSkeleton />;
    }

    if (!staffData) {
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

    const { user, bankDetails, panNumber, pfNumber, esiNumber, uanNumber, employeeId, designation, department } = staffData;
    const name = user?.name;
    const email = user?.email;
    const mobile = user?.mobile;
    const hospital = staffData.hospital;

    const handleEdit = () => {
        router.push(`/${hospitalId}/frontdesk/profile/edit`);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32 pt-8 animate-in fade-in duration-500 px-4 sm:px-0">

            {/* PROFILE HEADER */}
            <div className="relative group overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 transition-all hover:shadow-xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full -mr-48 -mt-48 blur-3xl group-hover:bg-teal-500/10 transition-colors duration-700"></div>

                <div className="relative flex flex-col md:flex-row items-center gap-6 sm:gap-10">
                    <div className="relative">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[32px] sm:rounded-[40px] bg-slate-900 flex items-center justify-center text-white font-black text-4xl sm:text-5xl shadow-2xl relative z-10 overflow-hidden">
                            {(user as any)?.image ? <img src={(user as any).image} className="w-full h-full object-cover" /> : name?.charAt(0)}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 sm:w-10 sm:h-10 bg-teal-500 rounded-xl sm:rounded-2xl flex items-center justify-center border-4 border-white z-20 shadow-lg">
                            <ShieldCheck size={16} className="text-white" />
                        </div>
                    </div>

                    <div className="text-center md:text-left space-y-3 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-tight">{name}</h1>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                                    <span className="px-3 py-1 bg-teal-50 text-teal-600 text-[9px] font-black rounded-full border border-teal-100 uppercase tracking-widest shadow-sm">{designation || "Frontdesk Specialist"}</span>
                                    <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[9px] font-black rounded-full border border-slate-100 uppercase tracking-widest shadow-sm">Verified Account</span>
                                </div>
                            </div>
                            <button
                                onClick={handleEdit}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95"
                            >
                                <Edit3 size={14} /> Edit Profile
                            </button>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-4 sm:gap-6 pt-2">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Hospital size={14} className="text-teal-500" />
                                <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{hospital?.name || "Main Hospital"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <MapPin size={14} className="text-teal-500" />
                                <span className="text-[10px] font-bold uppercase tracking-widest leading-none truncate max-w-[200px]">{hospital?.address || "Global HQ Facility"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT COLUMN: CONTACT & BASE INFO */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                            <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
                                <UserIcon size={18} />
                            </div>
                            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-900">Personal Registry</h3>
                        </div>

                        <div className="space-y-5">
                            <InfoItem icon={<Mail size={16} />} label="Email Address" value={email} />
                            <InfoItem icon={<Phone size={16} />} label="Contact Number" value={mobile} />
                            <InfoItem icon={<Briefcase size={16} />} label="Employee ID" value={employeeId} />
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                                <CreditCard size={18} />
                            </div>
                            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-900">Tax & Payroll</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <SecureItem label="PAN" value={panNumber} />
                            <SecureItem label="PF No" value={pfNumber} />
                            <SecureItem label="ESI" value={esiNumber} />
                            <SecureItem label="UAN" value={uanNumber} />
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: BANK & PERFORMANCE */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
                            <div className="p-3 bg-teal-600 rounded-2xl text-white">
                                <Landmark size={20} />
                            </div>
                            <h3 className="font-black text-lg text-slate-900 tracking-tight uppercase">Settlement Bank</h3>
                        </div>

                        <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden group shadow-2xl">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full -mr-32 -mt-32 blur-3xl transition-all group-hover:bg-teal-500/20"></div>

                            <div className="relative space-y-8">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-teal-400 uppercase tracking-[0.2em]">Primary Salary Node</p>
                                        <h4 className="text-xl sm:text-2xl font-black tracking-tight">{bankDetails?.bankName || "BANK NOT LINKED"}</h4>
                                    </div>
                                    <div className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-mono tracking-widest">{bankDetails?.ifscCode || "IFSC"}</div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Account Number</p>
                                    <p className="text-3xl sm:text-4xl font-mono tracking-[0.2em] text-teal-50">
                                        {bankDetails?.accountNumber ? `•••• •••• ${bankDetails.accountNumber.slice(-4)}` : "•••• •••• ••••"}
                                    </p>
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                    <div className="space-y-0.5">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Account Holder</p>
                                        <p className="text-xs font-black uppercase tracking-tight">{bankDetails?.accountName || name}</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black border border-emerald-500/20 uppercase tracking-widest">
                                        <CheckCircle2 size={12} /> Encrypted
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-500/5 rounded-full -mr-40 -mb-40 blur-3xl"></div>

                        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
                            <div className="md:col-span-2 space-y-6 text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-4">
                                    <div className="w-14 h-14 bg-teal-50 rounded-[20px] flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
                                        <Activity size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl text-slate-900 font-black leading-tight uppercase tracking-tight">Deployment Profile</h3>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Operational impact summary</p>
                                    </div>
                                </div>
                                <p className="text-slate-500 text-xs font-bold leading-relaxed max-w-lg uppercase tracking-wider">
                                    Assigned to <span className="text-slate-900 font-black">{department || "Frontdesk"}</span> division. Responsible for patient lifecycle management and institutional queue orchestration.
                                </p>
                            </div>

                            <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 space-y-6 text-center">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Registry Health</p>
                                    <div className="text-5xl font-black text-slate-900 tracking-tighter">98<span className="text-xs text-teal-500">%</span></div>
                                </div>
                                <div className="pt-4 border-t border-slate-200">
                                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-teal-500 w-[98%] rounded-full shadow-[0_0_10px_rgba(20,184,166,0.3)]"></div>
                                    </div>
                                    <p className="text-[8px] font-black mt-3 text-slate-500 uppercase tracking-[0.2em]">Institutional Standard</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Components
function InfoItem({ icon, label, value }: any) {
    return (
        <div className="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 group">
            <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 group-hover:text-teal-500 transition-colors">
                {icon}
            </div>
            <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">{label}</p>
                <p className="text-xs font-black text-slate-900 tracking-tight">{value || "Not Set"}</p>
            </div>
        </div>
    );
}

function SecureItem({ label, value }: any) {
    return (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 hover:border-teal-200 transition-colors group">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-teal-600">{label}</p>
            <p className="text-[11px] font-mono font-black text-slate-700">
                {value ? `•••• ${value.slice(-4)}` : "NOT SET"}
            </p>
        </div>
    );
}
