'use client';
import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Search, FlaskConical, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { LabTestService } from '@/lib/integrations/services/labTest.service';
import { LabTest } from '@/lib/integrations/types/labTest';
import { toast } from 'react-hot-toast';
import { useTenantLink } from '@/hooks/useTenantLink';
import DeleteConfirmationModal from '@/components/common/DeleteConfirmationModal';

function HospitalAdminTestListPage() {
    const router = useRouter();
    const { getPath } = useTenantLink();
    const [tests, setTests] = useState<LabTest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isNavigating, startNavigation] = useTransition();

    // Filters & Pagination
    const [deptFilter, setDeptFilter] = useState('');
    const [sampleFilter, setSampleFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Delete modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [testToDelete, setTestToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchTests();

        const handleRefresh = () => {
            fetchTests();
        };

        window.addEventListener('refresh-lab-data', handleRefresh);
        return () => window.removeEventListener('refresh-lab-data', handleRefresh);
    }, []);

    const fetchTests = async () => {
        setLoading(true);
        try {
            const data = await LabTestService.getTests();
            setTests(data);
        } catch (error) {
            console.error("Failed to fetch tests", error);
            toast.error("Failed to load test catalog");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        setTestToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!testToDelete) return;
        setIsDeleting(true);
        try {
            await LabTestService.deleteTest(testToDelete);
            toast.success("Test deactivated");
            fetchTests();
            setDeleteModalOpen(false);
            setTestToDelete(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to delete");
        } finally {
            setIsDeleting(false);
        }
    };

    // Derived Lists
    const uniqueDepartments = useMemo(() => Array.from(new Set(tests.map(t =>
        typeof t.departmentId === 'object' ? (t.departmentId as any).name : 'General'
    ))).sort(), [tests]);

    const uniqueSamples = useMemo(() => Array.from(new Set(tests.map(t =>
        t.sampleType || 'Unknown'
    ))).sort(), [tests]);

    // Filtering
    const filteredTests = useMemo(() => tests.filter(test => {
        const name = test.testName || test.name || '';
        const dept = typeof test.departmentId === 'object' ? (test.departmentId as any).name : 'General';
        const sample = test.sampleType || 'Unknown';

        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            dept.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = deptFilter ? dept === deptFilter : true;
        const matchesSample = sampleFilter ? sample === sampleFilter : true;

        return matchesSearch && matchesDept && matchesSample;
    }), [tests, searchTerm, deptFilter, sampleFilter]);

    const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
    const paginatedTests = filteredTests.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-12 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none shrink-0">
                            <FlaskConical className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
                                Lab Test Catalog
                            </h1>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold">
                                {filteredTests.length} Total Tests
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-1 max-w-md mx-4 hidden lg:block">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search tests..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {totalPages > 1 && (
                            <div className="hidden xl:flex items-center gap-1 px-3 py-1.5 bg-slate-50 dark:bg-gray-900/50 rounded-lg border border-slate-100 dark:border-gray-700 mr-2">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    className="p-1 hover:bg-white dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 rounded-md transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-[10px] font-black text-gray-500 min-w-[60px] text-center uppercase tracking-widest">
                                    Page {currentPage}/{totalPages}
                                </span>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    className="p-1 hover:bg-white dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 rounded-md transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => startNavigation(() => router.push(getPath('/hospital-admin/labs/tests/bulk-import')))}
                            disabled={isNavigating}
                            className={`flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all uppercase tracking-wider ${isNavigating ? 'opacity-70' : ''}`}
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            Import
                        </button>
                        <button
                            onClick={() => startNavigation(() => router.push(getPath('/hospital-admin/labs/tests/manage')))}
                            disabled={isNavigating}
                            className={`flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all uppercase tracking-wider ${isNavigating ? 'opacity-70' : ''}`}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Test
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                    <div className="lg:hidden relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search tests..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <select
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                        value={deptFilter}
                        onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="">All Departments</option>
                        {uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                        value={sampleFilter}
                        onChange={(e) => { setSampleFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="">All Samples</option>
                        {uniqueSamples.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="text-sm text-gray-500">Loading catalog...</p>
                    </div>
                ) : filteredTests.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12">
                        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-full">
                            <FlaskConical size={48} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">No tests found</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-gray-900/50 border-b border-slate-100 dark:border-gray-700">
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Test Identity</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Department</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Sample Type</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Price (₹)</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
                                    {paginatedTests.map((test) => (
                                        <tr key={test._id} className="hover:bg-slate-50/80 dark:hover:bg-gray-700/20 group transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 text-[10px] md:text-xs">
                                                        {(test.testName || test.name || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] md:text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tight leading-none mb-1">
                                                            {test.testName || test.name}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-gray-400 tracking-widest leading-none">
                                                            CODE: {test.testCode || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                                                    {typeof test.departmentId === 'object' ? (test.departmentId as any).name : 'General'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                                                    {test.sampleType || 'General'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-sm font-black text-gray-900 dark:text-white font-mono">
                                                    {test.price.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="inline-flex items-center gap-2">
                                                    <button
                                                        onClick={() => startNavigation(() => router.push(getPath(`/hospital-admin/labs/tests/manage?id=${test._id}`)))}
                                                        disabled={isNavigating}
                                                        className={`p-2.5 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-indigo-600 dark:text-indigo-400 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm transition-all ${isNavigating ? 'opacity-70' : ''}`}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(test._id)}
                                                        className="p-2.5 bg-white dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="p-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/50">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Page <span className="font-semibold text-gray-900 dark:text-white">{currentPage}</span> of {totalPages}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => p - 1)}
                                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            Previous
                                        </button>
                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => p + 1)}
                                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                isDeleting={isDeleting}
                title="Delete Test"
                message="Are you sure you want to deactivate this test?"
                confirmText="Delete Test"
            />
        </div>
    );
}

export default React.memo(HospitalAdminTestListPage);
