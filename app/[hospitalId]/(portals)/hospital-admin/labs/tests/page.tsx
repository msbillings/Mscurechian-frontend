'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, FlaskConical, ListFilter, Trash, Edit3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { LabTestService } from '@/lib/integrations/services/labTest.service';
import { LabTest } from '@/lib/integrations/types/labTest';
import { toast } from 'react-hot-toast';
import { useTenantLink } from '@/hooks/useTenantLink';

import DeleteConfirmationModal from '@/components/common/DeleteConfirmationModal';

function HospitalAdminTestListPage() {
    const router = useRouter();
    const { getPath } = useTenantLink();

    // Filters & Pagination State
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [sampleFilter, setSampleFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [testToDelete, setTestToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // ... existing useQuery ...
    const { data: tests = [], isLoading: loading, refetch } = useQuery<LabTest[]>({
        queryKey: ['hospital-admin-lab-tests'],
        queryFn: async () => {
            try {
                const data = await LabTestService.getTests();
                return data;
            } catch (error) {
                console.error("Failed to fetch tests", error);
                toast.error("Failed to load test catalog");
                throw error;
            }
        },
        staleTime: 30 * 1000, 
        gcTime: 15 * 60 * 1000,
        retry: 1,
    });

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
            refetch(); 
            setDeleteModalOpen(false);
            setTestToDelete(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to delete");
        } finally {
            setIsDeleting(false);
        }
    };

    const uniqueDepartments = useMemo(() =>
        Array.from(new Set(tests.map(t =>
            typeof t.departmentId === 'object' ? t.departmentId.name : 'General'
        ))).sort(),
        [tests]
    );

    const uniqueSamples = useMemo(() =>
        Array.from(new Set(tests.map(t =>
            t.sampleType || 'Unknown'
        ))).sort(),
        [tests]
    );

    const filteredTests = useMemo(() => tests.filter(test => {
        const name = test.testName || test.name || '';
        const dept = typeof test.departmentId === 'object' ? test.departmentId.name : 'General';
        const sample = test.sampleType || 'Unknown';

        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            dept.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = deptFilter ? dept === deptFilter : true;
        const matchesSample = sampleFilter ? sample === sampleFilter : true;

        return matchesSearch && matchesDept && matchesSample;
    }), [tests, searchTerm, deptFilter, sampleFilter]);

    const totalPages = useMemo(() => Math.ceil(filteredTests.length / itemsPerPage), [filteredTests.length, itemsPerPage]);
    const paginatedTests = useMemo(() => filteredTests.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    ), [filteredTests, currentPage, itemsPerPage]);

    return (
        <div className="p-1 sm:p-2 md:p-3 h-full bg-gray-50 dark:bg-gray-900 flex flex-col items-center min-h-screen">
            <div className="max-w-7xl w-full flex-1 flex flex-col">

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 md:mb-8 gap-4">
                    <div>
                        <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white uppercase">Test Master Catalog</h1>
                        <p className="text-gray-400 text-[11px] font-black uppercase tracking-widest mt-1 flex items-center gap-2">
                            <FlaskConical size={14} className="text-blue-500" />
                            NABL & Hospital Grade Lab Catalog
                        </p>
                    </div>
                    <button
                        onClick={() => router.push(getPath('/hospital-admin/labs/tests/manage'))}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 active:scale-95"
                    >
                        <Plus size={18} />
                        Add New Test
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 md:p-4 rounded-[0.5rem] shadow-xl shadow-gray-200/40 dark:shadow-none border border-gray-100 dark:border-gray-700 mb-4 md:mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        <div className="md:col-span-5 relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 pointer-events-none" size={20} />
                            <input
                                type="text"
                                placeholder="SEARCH TEST OR DEPT..."
                                className="w-full pl-14 pr-6 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-800 dark:text-white placeholder:text-gray-400 uppercase tracking-wide"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>

                        <div className="md:col-span-3">
                            <div className="relative">
                                <ListFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                <select
                                    className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-[11px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 appearance-none cursor-pointer"
                                    value={deptFilter}
                                    onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
                                >
                                    <option value="">All Departments</option>
                                    {uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="md:col-span-3">
                            <div className="relative">
                                <FlaskConical className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                <select
                                    className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-[11px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 appearance-none cursor-pointer"
                                    value={sampleFilter}
                                    onChange={(e) => { setSampleFilter(e.target.value); setCurrentPage(1); }}
                                >
                                    <option value="">All Samples</option>
                                    {uniqueSamples.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="md:col-span-1 flex justify-end">
                            <div className="text-center">
                                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
                                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{filteredTests.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-[0.5rem] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-50 dark:border-gray-700 flex-1 overflow-hidden flex flex-col mb-4 md:mb-8">
                    <div className="overflow-x-auto flex-1">
                        <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full text-sm text-left">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-50 dark:border-gray-700">
                                    <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Test Detail</th>
                                    <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Department</th>
                                    <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Sample</th>
                                    <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">TAT / Method</th>
                                    <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Price</th>
                                    <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[2px] text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-2 md:px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fetching Test Matrix...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedTests.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-2 md:px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-30">
                                                <FlaskConical size={64} className="text-gray-400" />
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching tests found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedTests.map((test) => (
                                        <tr key={test._id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 group">
                                            <td className="px-2 md:px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 text-gray-400 rounded-2xl flex items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white shrink-0">
                                                        {(test.testName || test.name || '?').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-extrabold text-gray-800 dark:text-white text-sm tracking-tight">{test.testName || test.name}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Code: {test.testCode || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 md:px-8 py-6">
                                                <div className="flex flex-wrap gap-2">
                                                    {(test.departments && test.departments.length > 0) ? (
                                                        test.departments.map((dept: any) => (
                                                            <span key={dept._id} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100/50 dark:border-indigo-800/20">
                                                                {dept.name}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                                            {typeof test.departmentId === 'object' ? (test.departmentId as any).name : 'MISC'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 md:px-8 py-6">
                                                <p className="text-[11px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest">{test.sampleType || 'N/A'}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase">{test.sampleVolume || 'Standard volume'}</p>
                                            </td>
                                            <td className="px-2 md:px-8 py-6">
                                                <p className="text-[11px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider">{test.method || 'Auto'}</p>
                                                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{test.turnaroundTime || '24 hrs'}</p>
                                            </td>
                                            <td className="px-2 md:px-8 py-6">
                                                <p className="text-sm font-black text-gray-900 dark:text-white tracking-tight">₹{test.price.toLocaleString()}</p>
                                            </td>
                                            <td className="px-2 md:px-8 py-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleDelete(test._id)}
                                                        className="p-3 bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-xl hover:bg-red-600 hover:text-white shadow-sm active:scale-95"
                                                    >
                                                        <Trash size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table></div>
                    </div>

                    {totalPages > 1 && (
                        <div className="p-2 md:p-6 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="px-2 md:px-6 py-3 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Page <span className="text-blue-600 dark:text-blue-400">{currentPage}</span> of {totalPages}
                            </span>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="px-2 md:px-6 py-3 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                isDeleting={isDeleting}
                title="Delete Test Protocol"
                message="Are you sure you want to delete this test protocol?"
                confirmText="Delete Protocol"
            />
        </div>
    );
}

export default React.memo(HospitalAdminTestListPage);
