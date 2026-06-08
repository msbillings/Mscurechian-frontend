'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LabSampleService } from '@/lib/integrations/services/labSample.service';
import { LabSample } from '@/lib/integrations/types/labSample';
import { toast } from 'react-hot-toast';
import { Search, FileText, Download, CheckCircle2, ChevronLeft, ChevronRight, Edit3, Clock } from 'lucide-react';

export default function LabEditedResultsPage() {
    const router = useRouter();
    const [editedSamples, setEditedSamples] = useState<LabSample[]>([]);
    const [isNavigating, startNavigation] = useTransition();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    useEffect(() => {
        fetchEditedSamples();

        const handleRefresh = () => {
            fetchEditedSamples();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchEditedSamples();
            }
        };

        window.addEventListener('refresh-lab-data', handleRefresh);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('refresh-lab-data', handleRefresh);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const fetchEditedSamples = async () => {
        setLoading(true);
        try {
            const data = await LabSampleService.getEditedSamples(true);
            setEditedSamples(data.sort((a, b) =>
                new Date((b as any).editedAt || b.createdAt || '').getTime() -
                new Date((a as any).editedAt || a.createdAt || '').getTime()
            ));
        } catch (error) {
            console.error('Failed to fetch edited samples:', error);
            toast.error('Failed to load edited results');
        } finally {
            setLoading(false);
        }
    };

    const filteredSamples = editedSamples.filter(sample =>
        sample.patientDetails.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sample.sampleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sample.patientDetails.mobile && sample.patientDetails.mobile.includes(searchQuery))
    );

    // Calculate total pages
    const totalPages = Math.ceil(filteredSamples.length / itemsPerPage);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading edited results...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 lg:space-y-6">
            {/* Page Header */}
            <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8">
                <div className="flex items-start sm:items-center justify-between mb-4 lg:mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700">
                                <Edit3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h1 className="text-lg md:text-xl lg:text-xl font-semibold text-gray-900 dark:text-white">Edited Results History</h1>
                        </div>
                        <p className="text-xs md:text-sm lg:text-base text-gray-600 dark:text-gray-400">
                            View lab test results that have been modified after submission
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                Showing only modified results with exact edit timestamps
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 gap-3 md:gap-4 max-w-md">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-slate-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Edited Test Reports</p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{editedSamples.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by patient name, sample ID, or mobile..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Edited Results Table View */}
            {filteredSamples.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left text-xs md:text-sm min-w-[800px]">
                            <thead className="bg-slate-50 dark:bg-gray-900/50 border-b border-slate-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Patient Details</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Sample ID</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Test Info</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Original Report Date</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Edit Date & Time</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                {filteredSamples.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((sample) => {
                                    const editDate = (sample as any).editedAt ? new Date((sample as any).editedAt) : null;
                                    const formattedEditTime = editDate
                                        ? `${editDate.toLocaleDateString()} ${editDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                        : 'N/A';

                                    return (
                                        <tr key={sample._id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-4 md:px-6 py-3 md:py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-xs">
                                                        {sample.patientDetails.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{sample.patientDetails.name}</div>
                                                        <div className="text-xs text-gray-500">{sample.patientDetails.age}Y • {sample.patientDetails.gender}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4">
                                                <span className="px-2.5 py-1 bg-slate-100 dark:bg-gray-800 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700">
                                                    {sample.sampleId}
                                                </span>
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4">
                                                <div className="relative group/tooltip">
                                                    <div className="max-w-[200px] truncate text-gray-600 dark:text-gray-300" title={sample.tests.map(t => t.testName).join(', ')}>
                                                        {sample.tests.map(t => t.testName).join(', ')}
                                                    </div>
                                                    {sample.tests.length > 2 && (
                                                        <>
                                                            <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 cursor-help hover:underline">
                                                                +{sample.tests.length - 2} more
                                                            </div>
                                                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block z-50 w-64 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-slate-200 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-2">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Full Test List</p>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {sample.tests.map((test, idx) => (
                                                                        <span key={idx} className="px-2 py-1 bg-slate-50 dark:bg-gray-700/50 border border-slate-100 dark:border-gray-600 rounded-md text-[10px] font-bold text-gray-700 dark:text-gray-300">
                                                                            {test.testName}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4 text-gray-600 dark:text-gray-400">
                                                {new Date(sample.reportDate || sample.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4 text-gray-900 dark:text-white font-semibold">
                                                {formattedEditTime}
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => startNavigation(() => router.push(`/lab/samples/${sample._id}`))}
                                                        disabled={isNavigating}
                                                        className={`px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition-all border border-indigo-100 dark:border-indigo-800 flex items-center gap-1.5 ${isNavigating ? 'opacity-70' : ''}`}
                                                        title="Edit Results"
                                                    >
                                                        <Edit3 size={14} />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => startNavigation(() => router.push(`/lab/samples/${sample._id}`))}
                                                        disabled={isNavigating}
                                                        className={`p-2 hover:bg-slate-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-gray-600 ${isNavigating ? 'opacity-70' : ''}`}
                                                        title="View Report"
                                                    >
                                                        <FileText size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/30">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredSamples.length)}</span> of <span className="font-medium">{filteredSamples.length}</span> edited results
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                                    title="Previous page"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => (p < totalPages ? p + 1 : p))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                                    title="Next page"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-16 text-center shadow-sm">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-indigo-50 dark:bg-indigo-900/20">
                        <CheckCircle2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Edited Test Reports</h3>
                    <p className="text-gray-500 dark:text-gray-400">No test results have been modified yet.</p>
                </div>
            )}
        </div>
    );
}
