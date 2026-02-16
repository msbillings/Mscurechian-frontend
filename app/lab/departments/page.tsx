'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Building2, Edit3, X, FlaskConical, TrendingUp } from 'lucide-react';
import { DepartmentService } from '@/lib/integrations/services/department.service';
import { Department } from '@/lib/integrations/types/department';
import { toast } from 'react-hot-toast';

function DepartmentMasterPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [suggestedDepts, setSuggestedDepts] = useState<string[]>([]);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [deptData, meta] = await Promise.all([
                DepartmentService.getDepartments(),
                DepartmentService.getMeta()
            ]);
            setDepartments(deptData);
            if (meta?.departmentNames) {
                setSuggestedDepts(meta.departmentNames);
            }
        } catch (error) {
            console.error("Failed to fetch initial data", error);
        }
    };

    const fetchDepartments = async () => {
        try {
            const data = await DepartmentService.getDepartments();
            setDepartments(data);
        } catch (error) {
            console.error("Failed to fetch departments", error);
        }
    };

    const handleAddDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setLoading(true);
        try {
            if (editingId) {
                await DepartmentService.updateDepartment(editingId, formData);
                toast.success("Department updated successfully!");
            } else {
                await DepartmentService.addDepartment(formData);
                toast.success("Department created successfully!");
            }
            setFormData({ name: '', description: '' });
            setEditingId(null);
            fetchDepartments();
        } catch (error: any) {
            toast.error(error.message || "Operation failed");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this department? Active tests in this department might be affected.")) return;
        try {
            await DepartmentService.deleteDepartment(id);
            toast.success("Department deleted successfully");
            fetchDepartments();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete department");
        }
    };

    const filteredDepartments = departments.filter(dept =>
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalTests = departments.reduce((sum, dept) => sum + (dept.testCount || 0), 0);

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-12 px-4 md:px-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-8 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-100 dark:shadow-none">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    Laboratory Divisions
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Manage detailed department configurations and test mappings
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="px-6 py-3 bg-slate-50 dark:bg-gray-700/50 rounded-xl border border-slate-100 dark:border-gray-600">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Units</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{departments.length}</p>
                        </div>
                        <div className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">Active Tests</p>
                            <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{totalTests}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Configuration Panel */}
                <div className="lg:col-span-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm sticky top-24">
                        <div className="p-6 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="font-bold text-gray-900 dark:text-white">
                                {editingId ? 'Edit Division' : 'Add New Division'}
                            </h2>
                            <span className="px-2 py-1 bg-slate-100 dark:bg-gray-700 text-xs font-medium text-slate-600 dark:text-slate-300 rounded-md">
                                {editingId ? 'Updating' : 'Creating'}
                            </span>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleAddDepartment} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Division Name <span className="text-rose-500">*</span></label>
                                    {suggestedDepts.length > 0 && !editingId && (
                                        <select
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all mb-3"
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            value={formData.name}
                                        >
                                            <option value="">Select a template...</option>
                                            {suggestedDepts.map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    )}
                                    <input
                                        type="text"
                                        placeholder="e.g. Hematology, Biochemistry..."
                                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                                    <textarea
                                        placeholder="Brief description of the department's function..."
                                        rows={4}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    {editingId && (
                                        <button
                                            type="button"
                                            onClick={() => { setEditingId(null); setFormData({ name: '', description: '' }); }}
                                            className="flex-1 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-70 flex justify-center items-center"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            editingId ? 'Save Changes' : 'Create Division'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Explorer Panel */}
                <div className="lg:col-span-8">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm flex flex-col min-h-[600px]">
                        <div className="p-6 border-b border-slate-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Department List</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    {filteredDepartments.length} active departments found
                                </p>
                            </div>
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search departments..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col">
                            {filteredDepartments.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                        <Building2 className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-gray-900 dark:text-white font-medium mb-1">No departments found</h3>
                                    <p className="text-sm text-gray-500 max-w-xs">
                                        Try adjusting your search or add a new department to get started.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto flex-1">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-slate-50/50 dark:bg-gray-900/50 border-b border-slate-100 dark:border-gray-700">
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Department</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Description</th>
                                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Tests</th>
                                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Status</th>
                                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                                {filteredDepartments.map((dept) => (
                                                    <tr
                                                        key={dept._id}
                                                        className="hover:bg-slate-50/80 dark:hover:bg-gray-700/20 transition-colors cursor-pointer group"
                                                        onClick={() => setSelectedDepartment(dept)}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm border border-indigo-100 dark:border-indigo-800 flex-shrink-0">
                                                                    {dept.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-indigo-600 transition-colors">
                                                                    {dept.name}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 max-w-md">
                                                                {dept.description || 'No description provided'}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-gray-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                                {dept.testCount || 0}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-500">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                Active
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setEditingId(dept._id); setFormData({ name: dept.name, description: dept.description || '' }); }}
                                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <Edit3 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDelete(dept._id); }}
                                                                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Detail View */}
            {selectedDepartment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedDepartment(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-gray-700 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-md">
                                    {selectedDepartment.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedDepartment.name}</h3>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Department Details</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedDepartment(null)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="mb-8">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">About Division</h4>
                                <div className="p-4 bg-slate-50 dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {selectedDepartment.description || 'No detailed description available for this department.'}
                                </div>
                            </div>

                            {selectedDepartment.tests && selectedDepartment.tests.length > 0 ? (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Associated Tests</h4>
                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-semibold">{selectedDepartment.tests.length} Total</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {selectedDepartment.tests.map((test: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg hover:border-indigo-300 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-mono text-gray-400 w-5">{String(i + 1).padStart(2, '0')}</span>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{test.testName}</span>
                                                </div>
                                                <span className="text-sm font-bold text-emerald-600">₹{test.price.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-gray-700 rounded-xl">
                                    <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">No tests assigned to this department yet.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-gray-900 border-t border-slate-200 dark:border-gray-700 text-center rounded-b-2xl">
                            <p className="text-xs text-gray-400 font-mono">ID: {selectedDepartment._id}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default React.memo(DepartmentMasterPage);
