"use client";

import React, { useState, useEffect } from 'react';
import {
    Building2,
    Users,
    Search,
    FileText,
    CheckCircle2,
    Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ipdService } from '@/lib/integrations/services/ipd.service';

const HRHospitalDepartments = () => {
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const data = await ipdService.getIPDDepartments();
            setDepartments(data);
        } catch (error) {
            toast.error("Failed to load departments");
        } finally {
            setLoading(false);
        }
    };

    const filtered = departments.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header Area */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <Building2 className="text-indigo-600" size={24} />
                        Clinical Infrastructure
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Management view of {departments.length} active hospital units (Read-Only)</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Governance Console</span>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Strategic Units', value: departments.length, icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Resource Codes', value: departments.filter(d => d.code).length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Node Health', value: '100%', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-xl font-black text-slate-900 mt-0.5">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Filter units by name or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                    />
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="p-24 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-slate-500 font-medium italic">Syncing departmental nodes...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="p-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                    <Building2 className="mx-auto mb-6 text-slate-200" size={64} />
                    <h3 className="text-xl font-black text-slate-900 italic">No Units Detected</h3>
                    <p className="text-sm text-slate-400 mt-2 font-medium">Try recalibrating your search parameters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filtered.map((dept) => (
                        <div key={dept._id} className="group bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between aspect-square">
                            <div>
                                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center mb-4 shadow-md transition-transform group-hover:scale-110">
                                    <Building2 size={18} />
                                </div>
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate leading-tight mb-1">{dept.name}</h3>
                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                                    REF: {dept.code || "N/A"}
                                </p>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-50">
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-black uppercase tracking-widest border border-emerald-100">
                                        Verified
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-300">
                                        #{dept._id.slice(-4).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HRHospitalDepartments;
