"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { hospitalAdminService } from "@/lib/integrations";
import { ConfirmModal } from '@/components/admin/Modal';
import {
    Users,
    Plus,
    Trash2,
    Edit,
    Eye,
    Mail,
    Phone,
    Briefcase,
    Calendar,
    Search,
    Filter,
    ShieldCheck,
    Building2
} from "lucide-react";
import { PageHeader } from "@/components/admin";

export default function HospitalAdminNurses() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDepartment, setFilterDepartment] = useState("");
    const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: "", message: "", onConfirm: () => { } });

    const { data: nursesData, isLoading: loading, refetch } = useQuery({
        queryKey: ['hospital-admin-nurses'],
        queryFn: async () => {
            const [nursesResp, typesData] = await Promise.all([
                hospitalAdminService.getNurses(),
                import('@/lib/integrations/services/ipd.service').then(m => m.ipdService.getUnitTypes().catch(() => []))
            ]);
            return {
                nurses: nursesResp.nurses || [],
                unitTypes: typesData || []
            };
        },
        staleTime: 0,
        refetchOnMount: 'always',
    });

    const nurses = nursesData?.nurses || [];
    const unitTypes = nursesData?.unitTypes || [];

    const handleRetract = async (id: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Retract Nurse",
            message: `Are you sure you want to retract ${name} from the active nursing registry?`,
            onConfirm: async () => {
                try {
                    setDeleteLoading(id);
                    await hospitalAdminService.updateStaff(id, { status: 'inactive' });
                    toast.success("Nursing credentials retracted");
                    refetch();
                } catch (error: any) {
                    console.error("Failed to retract nurse:", error);
                    toast.error(error.message || "Failed to update status");
                } finally {
                    setDeleteLoading(null);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const departments = Array.from(new Set(unitTypes.filter(Boolean))).sort();

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
        <div className="space-y-6 animate-in fade-in duration-500 p-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <PageHeader
                    icon={<Users className="text-emerald-500" />}
                    title="Nursing Registry"
                    subtitle={`Command & Control for ${nurses.length} active clinical nursing nodes`}
                />
                <button
                    onClick={() => router.push('/hospital-admin/nurses/create')}
                    className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-primary-theme rounded-xl hover:bg-primary-theme/80 active:scale-95 transition-all "
                >
                    <Plus className="w-4 h-4" /> Add Nurse
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full lg:w-auto">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-48">
                        <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                            value={filterDepartment}
                            onChange={(e) => setFilterDepartment(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">All Departments</option>
                            {departments.map((dept: any) => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
                    <p className="text-sm text-gray-500">Accessing secure nodes...</p>
                </div>
            ) : filteredNurses.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <Users className="mx-auto mb-4 text-gray-300" size={48} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No personnel found</h3>
                    <p className="text-sm text-gray-500 mt-1">Registry is empty for current criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredNurses.map((nurse) => (
                        <div key={nurse._id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl hover:shadow-emerald-500/5 transition-all group">
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-primary-theme/40 dark:bg-primary-theme/20 flex items-center justify-center text-xl font-black text-primary-theme dark:text-primary-theme border border-primary-theme/10 dark:border-primary-theme/80 shadow-sm">
                                            {nurse.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white truncate max-w-[180px]">
                                                {nurse.name}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary-theme mt-1">
                                                <ShieldCheck className="w-3.5 h-3.5" /> {nurse.employeeId || 'ID PENDING'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400">
                                            <Briefcase size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Designation</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{nurse.designation || 'Clinical Nurse'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400">
                                            <Building2 size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Department</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {(Array.isArray(nurse.department)
                                                    ? nurse.department
                                                    : String(nurse.department || 'General Facility').split(',').map((d: string) => d.trim()).filter(Boolean)
                                                ).map((dept: string, i: number) => (
                                                    <span key={i} className="inline-block px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 uppercase tracking-wide">
                                                        {dept}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-slate-50 dark:border-slate-700">
                                    <button
                                        onClick={() => router.push(`/hospital-admin/staff/${nurse._id}`)}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-primary-theme/80 hover:text-white transition-all text-xs font-black uppercase tracking-widest"
                                    >
                                        <Eye size={14} /> Profile
                                    </button>
                                    <button
                                        onClick={() => router.push(`/hospital-admin/staff/edit/${nurse._id}`)}
                                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:bg-blue-500 hover:text-white transition-all"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleRetract(nurse._id, nurse.name)}
                                        disabled={deleteLoading === nurse._id}
                                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50"
                                    >
                                        {deleteLoading === nurse._id ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        ) : (
                                            <Trash2 size={16} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
            />
        </div>
    );
}
