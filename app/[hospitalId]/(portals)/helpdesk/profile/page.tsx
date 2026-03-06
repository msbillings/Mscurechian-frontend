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
        <div className="max-w-7xl mx-auto space-y-5 pb-20 pt-6 animate-in fade-in duration-500 px-4 sm:px-0">

            {/* PROFILE HEADER */}
            <div className="relative group overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7 transition-all hover:shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-teal-500/10 transition-colors duration-700"></div>

                <div className="relative flex flex-col md:flex-row items-center gap-4 sm:gap-6">
                    <div className="relative">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-xl relative z-10 overflow-hidden">
                            {(user as any)?.image ? <img src={(user as any).image} className="w-full h-full object-cover" /> : name?.charAt(0)}
                        </div>
                        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-teal-500 rounded-lg flex items-center justify-center border-2 border-white z-20 shadow">
                            <ShieldCheck size={12} className="text-white" />
                        </div>
                    </div>

                    <div className="text-center md:text-left space-y-2 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight">{name}</h1>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                    <span className="px-2.5 py-0.5 bg-teal-50 text-teal-600 text-[9px] font-black rounded-full border border-teal-100 uppercase tracking-widest">{designation || "Frontdesk Specialist"}</span>
                                    <span className="px-2.5 py-0.5 bg-slate-50 text-slate-400 text-[9px] font-black rounded-full border border-slate-100 uppercase tracking-widest">Verified Account</span>
                                </div>
                            </div>
                            <button
                                onClick={handleEdit}
                                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow active:scale-95"
                            >
                                <Edit3 size={12} /> Edit Profile
                            </button>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-1">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Hospital size={12} className="text-teal-500" />
                                <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{hospital?.name || "Main Hospital"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <MapPin size={12} className="text-teal-500" />
                                <span className="text-[10px] font-bold uppercase tracking-widest leading-none truncate max-w-[200px]">{hospital?.address || "Global HQ Facility"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* LEFT COLUMN */}
                <div className="lg:col-span-4 space-y-5">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <div className="flex items-center gap-2.5 border-b border-slate-50 pb-3">
                            <div className="p-1.5 bg-teal-50 rounded-lg text-teal-600">
                                <UserIcon size={15} />
                            </div>
                            <h3 className="font-black text-xs uppercase tracking-[0.15em] text-slate-900">Personal Registry</h3>
                        </div>
                        <div className="space-y-3">
                            <InfoItem icon={<Mail size={14} />} label="Email Address" value={email} />
                            <InfoItem icon={<Phone size={14} />} label="Contact Number" value={mobile} />
                            <InfoItem icon={<Briefcase size={14} />} label="Employee ID" value={employeeId} />
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <div className="flex items-center gap-2.5 border-b border-slate-50 pb-3">
                            <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
                                <CreditCard size={15} />
                            </div>
                            <h3 className="font-black text-xs uppercase tracking-[0.15em] text-slate-900">Tax &amp; Payroll</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <SecureItem label="PAN" value={panNumber} />
                            <SecureItem label="PF No" value={pfNumber} />
                            <SecureItem label="ESI" value={esiNumber} />
                            <SecureItem label="UAN" value={uanNumber} />
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: BANK */}
                <div className="lg:col-span-8">
                    <div className="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <div className="flex items-center gap-2.5 border-b border-slate-50 pb-4">
                            <div className="p-2 bg-teal-600 rounded-xl text-white">
                                <Landmark size={16} />
                            </div>
                            <h3 className="font-black text-sm text-slate-900 tracking-tight uppercase">Settlement Bank</h3>
                        </div>

                        <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden group shadow-xl">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full -mr-24 -mt-24 blur-3xl transition-all group-hover:bg-teal-500/20"></div>

                            <div className="relative space-y-5">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-black text-teal-400 uppercase tracking-[0.2em]">Primary Salary Node</p>
                                        <h4 className="text-lg sm:text-xl font-black tracking-tight">{bankDetails?.bankName || "BANK NOT LINKED"}</h4>
                                    </div>
                                    <div className="px-2.5 py-1 bg-white/10 rounded-lg text-[10px] font-mono tracking-widest">{bankDetails?.ifscCode || "IFSC"}</div>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Account Number</p>
                                    <p className="text-2xl sm:text-3xl font-mono tracking-[0.15em] text-teal-50">
                                        {bankDetails?.accountNumber ? `•••• •••• ${bankDetails.accountNumber.slice(-4)}` : "•••• •••• ••••"}
                                    </p>
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                                    <div className="space-y-0.5">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Account Holder</p>
                                        <p className="text-xs font-black uppercase tracking-tight">{bankDetails?.accountName || name}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black border border-emerald-500/20 uppercase tracking-widest">
                                        <CheckCircle2 size={11} /> Encrypted
                                    </div>
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
