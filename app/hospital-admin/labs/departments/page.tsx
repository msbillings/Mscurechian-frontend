'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Search, Building2, Building, Trash, Edit3, X, Network, Database, Layers } from 'lucide-react';
import { DepartmentService } from '@/lib/integrations/services/department.service';
import { LabTestService } from '@/lib/integrations/services/labTest.service';
import { Department } from '@/lib/integrations/types/department';
import { toast } from 'react-hot-toast';
import DeleteConfirmationModal from '@/components/common/DeleteConfirmationModal';

function HospitalAdminDepartmentMasterPage() {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

    // Initial Delete State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [departmentToDelete, setDepartmentToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // ✅ CRITICAL FIX: Use React Query for departments
    const { data: departments = [], isLoading: deptLoading, refetch: refetchDepts } = useQuery<Department[]>({
        queryKey: ['hospital-admin-lab-departments'],
        queryFn: async () => {
            const apiStartTime = performance.now();
            console.log(`[API] Starting departments fetch`);
            try {
                const data = await DepartmentService.getDepartments();
                const apiEndTime = performance.now();
                console.log(`[API] Departments fetch completed in ${(apiEndTime - apiStartTime).toFixed(2)}ms, returned ${data?.length || 0} departments`);
                return data || [];
            } catch (error) {
                console.error("Failed to fetch departments", error);
                throw error;
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000,
        retry: 1,
    });

    // ✅ Derive unique department names for dropdown from the fetched departments
    const suggestedDepts = useMemo(() => {
        if (!departments) return [];
        return Array.from(new Set(departments.map(d => d.name))).sort();
    }, [departments]);

    const handleAddDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setLoading(true);
        try {
            if (editingId) {
                await DepartmentService.updateDepartment(editingId, formData);
                toast.success("Department hierarchy updated");
            } else {
                await DepartmentService.addDepartment(formData);
                toast.success("New department node created");
            }
            setFormData({ name: '', description: '' });
            setEditingId(null);
            queryClient.invalidateQueries({ queryKey: ['hospital-admin-lab-departments'] });
        } catch (error: any) {
            toast.error(error.message || "Protocol operation failed");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        setDepartmentToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!departmentToDelete) return;

        setIsDeleting(true);
        try {
            await DepartmentService.deleteDepartment(departmentToDelete);
            toast.success("Department node purged");
            queryClient.invalidateQueries({ queryKey: ['hospital-admin-lab-departments'] });
            setDeleteModalOpen(false);
            setDepartmentToDelete(null);
        } catch (error: any) {
            toast.error(error.message || "Node purge failed");
        } finally {
            setIsDeleting(false);
        }
    };

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7;

    const filteredDepartments = useMemo(() => {
        return departments.filter(dept =>
            dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [departments, searchTerm]);

    const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
    const paginatedDepartments = useMemo(() => {
        return filteredDepartments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [filteredDepartments, currentPage]);

    return (
        <div className="space-y-10 ">
            {/* Header Tier */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase">Department Master</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-bold mt-2 uppercase tracking-[0.2em] text-[10px] ml-1 flex items-center gap-2">
                        <Network className="w-3 h-3 text-blue-500" />
                        Strategic Lab Infrastructure & Node Hierarchy
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left: Input Console */}
                <div className="lg:col-span-4">
                    <div className="bg-white dark:bg-gray-800 rounded-[0.5rem] shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden sticky top-24">

                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                                    {editingId ? <Edit3 size={24} /> : <Plus size={24} />}
                                </div>
                                <div>
                                    <h2 className="text-lg font-thin text-gray-900 dark:text-white uppercase ">
                                        {editingId ? 'Modify Node' : 'Initialize Node'}
                                    </h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Department registry Entry</p>
                                </div>
                            </div>

                            <form onSubmit={handleAddDepartment} className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nomenclature Hub *</label>
                                    {suggestedDepts.length > 0 && !editingId && (
                                        <select
                                            className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-black dark:text-white appearance-none"
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            value={formData.name}
                                        >
                                            <option value="">-- Choose Common Node --</option>
                                            {suggestedDepts.map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    )}
                                    <input
                                        type="text"
                                        placeholder="CUSTOM_DEPT_ID..."
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-black dark:text-white"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Functional Description</label>
                                    <textarea
                                        placeholder="OPERATIONAL_PROTOCOL_DETAILS..."
                                        rows={5}
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold dark:text-white resize-none tracking-tight leading-relaxed"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-4">
                                    {editingId && (
                                        <button
                                            type="button"
                                            onClick={() => { setEditingId(null); setFormData({ name: '', description: '' }); }}
                                            className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[9px] active:scale-95"
                                        >
                                            Abort
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] py-4 bg-primary-theme text-white rounded-2xl font-black uppercase  text-[10px] dark:shadow-none active:scale-95 disabled:opacity-50"
                                    >
                                        {loading ? 'Processing...' : editingId ? 'Update Node' : 'Initialize Node'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Right: Registry Terminal - Converted to Table */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Search Control */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[0.5rem] border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl">
                                <Database size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-thin text-gray-900 dark:text-white uppercase">Global Hierarchy</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{filteredDepartments.length} Departments Online</p>
                            </div>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="SEARCH_MANIFEST..."
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 text-[10px] font-black tracking-[0.2em] dark:text-white uppercase"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-[0.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Department Node</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Functional Abstract</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Protocols</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Operations</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {paginatedDepartments.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-30">
                                                    <Building2 size={64} className="text-gray-400" />
                                                    <p className="font-black uppercase tracking-[5px] text-xs text-gray-400">Node Database Empty</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedDepartments.map((dept) => (
                                            <tr
                                                key={dept._id}
                                                onClick={() => setSelectedDepartment(dept)}
                                                className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 group cursor-pointer transition-colors"
                                            >
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                            {dept.name.charAt(0)}
                                                        </div>
                                                        <span className="font-thin text-gray-900 dark:text-white text-[12px] uppercase">{dept.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium line-clamp-1 max-w-[250px]">
                                                        {dept.description || 'No description provided.'}
                                                    </p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-black text-blue-600 dark:text-blue-400">{(dept.testCount || 0).toString().padStart(2, '0')}</span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nodes</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex justify-end gap-2 transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setEditingId(dept._id); setFormData({ name: dept.name, description: dept.description || '' }); }}
                                                            className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                                            title="Edit Department"
                                                        >
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(dept._id); }}
                                                            className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                                                            title="Delete Department"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 border border-gray-100 dark:border-gray-700 shadow-sm"
                                >
                                    Previous
                                </button>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Page <span className="text-blue-600 dark:text-blue-400">{currentPage}</span> of {totalPages}
                                </span>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 border border-gray-100 dark:border-gray-700 shadow-sm"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Department Details Modal */}
            {selectedDepartment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedDepartment(null)}>
                    <div
                        className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md lg:max-w-lg max-h-[80vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-700 zoom-in "
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 rounded-t-3xl">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/20">
                                    {selectedDepartment.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{selectedDepartment.name}</h3>
                                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                        <Layers className="w-3 h-3 text-blue-500" />
                                        {selectedDepartment.testCount || 0} Registered Protocols
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedDepartment(null)}
                                className="p-3 bg-white dark:bg-gray-700 text-gray-400 hover:text-rose-500 dark:text-gray-400 dark:hover:text-rose-400 rounded-xl shadow-sm hover:shadow-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body / Scrollable List */}
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                            {selectedDepartment.description && (
                                <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-700">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Network className="w-3 h-3" />
                                        Functional Abstract
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                        {selectedDepartment.description}
                                    </p>
                                </div>
                            )}

                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-4">
                                Configured Test Protocols
                                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700 border-dashed border-b border-gray-200"></div>
                            </h4>

                            {selectedDepartment.tests && selectedDepartment.tests.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {selectedDepartment.tests.map((test: any, index: number) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm hover:border-blue-200 dark:hover:border-blue-800 group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-xs font-black text-blue-600 dark:text-blue-400">
                                                    {(index + 1).toString().padStart(2, '0')}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">{test.testName}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Parameter Configuration Active</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="block font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg text-xs">₹{test.price}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl bg-gray-50/50 dark:bg-gray-800/50">
                                    <Database size={40} className="text-gray-300 dark:text-gray-600 mb-4" />
                                    <p className="font-bold text-gray-400 dark:text-gray-500 mb-1 text-xs uppercase tracking-wider">No Protocols Linked</p>
                                    <p className="text-[10px] text-gray-400">Navigate to Test Master to assign protocols to this node.</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/30 rounded-b-3xl">
                            <button
                                onClick={() => setSelectedDepartment(null)}
                                className="w-full py-4 bg-gray-900 dark:bg-gray-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-black dark:hover:bg-gray-600 shadow-xl shadow-gray-200 dark:shadow-none hover:-translate-y-1"
                            >
                                Terminate Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                isDeleting={isDeleting}
                title="Delete Department Node"
                message="Warning: Are you sure you want to delete this department node?"
                confirmText="Yes"
            />
        </div>
    );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(HospitalAdminDepartmentMasterPage);
