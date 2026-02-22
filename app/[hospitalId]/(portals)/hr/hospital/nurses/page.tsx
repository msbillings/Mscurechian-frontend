"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { hospitalAdminService } from "@/lib/integrations";
import {
    Users,
    Eye,
    Briefcase,
    Building2,
    Search,
    Filter,
    ShieldCheck,
    Info
} from "lucide-react";

export default function HRHospitalNurses() {
    const router = useRouter();
    const [nurses, setNurses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDepartment, setFilterDepartment] = useState("");

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const data = await hospitalAdminService.getNurses();
            setNurses(data.nurses || []);
        } catch (error: any) {
            console.error("Failed to fetch data:", error);
            toast.error(error.message || "Failed to load registry");
        } finally {
            setLoading(false);
        }
    };

    const departments = Array.from(new Set(nurses.map(n => n.department).filter(Boolean))).sort() as string[];

    const filteredNurses = nurses.filter((nurse) => {
        const matchesSearch =
            nurse.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nurse.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nurse.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDepartment =
            !filterDepartment || nurse.department === filterDepartment;

        return matchesSearch && matchesDepartment;
    });

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nursing Registry Overview</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Management view of {nurses.length} active nursing professionals (Read-Only)</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Governance Console</span>
                </div>
            </div>

            {/* Controller */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full lg:w-auto">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or employee ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
                <div className="relative w-full lg:w-48">
                    <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                    >
                        <option value="">All Units</option>
                        {departments.map((dept) => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="p-24 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-slate-500 font-medium italic">Syncing clinical staff nodes...</p>
                </div>
            ) : filteredNurses.length === 0 ? (
                <div className="p-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                    <Users className="mx-auto mb-6 text-slate-200" size={64} />
                    <h3 className="text-xl font-black text-slate-900 italic">Registry Empty</h3>
                    <p className="text-sm text-slate-400 mt-2 font-medium">Try recalibrating your search parameters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredNurses.map((nurse) => (
                        <div key={nurse._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all group">
                            <div className="p-6">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl font-black text-indigo-600 shadow-sm transition-transform group-hover:scale-110">
                                        {nurse.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 truncate max-w-[180px]">
                                            {nurse.name}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-400 mt-1">
                                            <ShieldCheck className="w-3.5 h-3.5" /> {nurse.employeeId || 'ID PENDING'}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                            <Briefcase size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Role</p>
                                            <p className="text-xs font-bold text-slate-700">{nurse.designation || 'Clinical Nurse'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                            <Building2 size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Unit</p>
                                            <p className="text-xs font-bold text-slate-700">{nurse.department || 'General Ward'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-50">
                                    <button
                                        disabled
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest cursor-not-allowed opacity-60"
                                    >
                                        <Eye size={14} /> View Registry Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
