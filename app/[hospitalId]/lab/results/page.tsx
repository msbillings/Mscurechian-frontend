'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LabSampleService } from '@/lib/integrations/services/labSample.service';
import { LabSample } from '@/lib/integrations/types/labSample';
import { toast } from 'react-hot-toast';
import { Search, Clock, ChevronRight, FileText, Download, CheckCircle2, ChevronLeft } from 'lucide-react';

type TabType = 'pending' | 'submitted';

export default function LabResultsEntryPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [pendingSamples, setPendingSamples] = useState<LabSample[]>([]);
    const [submittedSamples, setSubmittedSamples] = useState<LabSample[]>([]);
    const [isNavigating, startNavigation] = useTransition();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'pending');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15; // Items per page for submitted results

    // Sync tab with URL
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'submitted' || tab === 'pending') {
            setActiveTab(tab);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchSamples();

        const handleRefresh = () => {
            fetchSamples();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchSamples();
            }
        };

        window.addEventListener('refresh-lab-data', handleRefresh);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('refresh-lab-data', handleRefresh);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const fetchSamples = async () => {
        setLoading(true);
        try {
            // Fetch "In Processing" samples (pending results) - Force fresh fetch
            const processing = await LabSampleService.getSamples('In Processing', true);

            // Filter samples that need results entry (no results entered yet)
            const pending = processing.filter(s =>
                s.tests.some(test => !test.resultValue || test.resultValue.trim() === '')
            );

            // Fetch "Completed" samples (submitted results) - Force fresh fetch
            const completed = await LabSampleService.getSamples('Completed', true);

            setPendingSamples(pending.sort((a, b) =>
                new Date(b.collectionDate || b.createdAt || '').getTime() -
                new Date(a.collectionDate || a.createdAt || '').getTime()
            ));

            setSubmittedSamples(completed.sort((a, b) =>
                new Date(b.reportDate || b.createdAt || '').getTime() -
                new Date(a.reportDate || a.createdAt || '').getTime()
            ));
        } catch (error) {
            console.error('Failed to fetch samples:', error);
            toast.error('Failed to load results');
        } finally {
            setLoading(false);
        }
    };

    const displaySamples = activeTab === 'pending' ? pendingSamples : submittedSamples;

    const filteredSamples = displaySamples.filter(sample =>
        sample.patientDetails.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sample.sampleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sample.patientDetails.mobile && sample.patientDetails.mobile.includes(searchQuery))
    );

    // Calculate total pages
    const totalPages = Math.ceil(filteredSamples.length / itemsPerPage);

    // Reset to page 1 when switching tabs or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading results...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 lg:space-y-6">
            {/* Page Header */}
            <div className="bg-gradient-to-br from-slate-50 to-purple-50/30 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8">
                <div className="flex items-start sm:items-center justify-between mb-4 lg:mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700">
                                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h1 className="text-lg md:text-xl lg:text-xl font-semibold text-gray-900 dark:text-white">Lab Results</h1>
                        </div>
                        <p className="text-xs md:text-sm lg:text-base text-gray-600 dark:text-gray-400">Manage pending and submitted lab results</p>
                        <div className="flex items-center gap-2 mt-3">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                Results are automatically saved as you type
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-slate-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Pending Results Entry</p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{pendingSamples.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-slate-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Submitted Results</p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{submittedSamples.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Professional Toggle Buttons */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-1.5 sm:p-2 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                    {/* Pending Results Toggle */}
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`relative flex-1 px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 ${activeTab === 'pending'
                            ? 'bg-primary-theme text-white shadow-md'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'pending' ? 'text-white' : 'text-gray-400'}`} />
                        <span>Pending Results</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${activeTab === 'pending'
                            ? 'bg-white/25 text-white backdrop-blur-sm'
                            : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            }`}>
                            {pendingSamples.length}
                        </span>
                    </button>

                    {/* Submitted Results Toggle */}
                    <button
                        onClick={() => setActiveTab('submitted')}
                        className={`relative flex-1 px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 ${activeTab === 'submitted'
                            ? 'bg-primary-theme text-white shadow-md'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        <CheckCircle2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'submitted' ? 'text-white' : 'text-gray-400'}`} />
                        <span>Submitted Results</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${activeTab === 'submitted'
                            ? 'bg-white/25 text-white backdrop-blur-sm'
                            : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            }`}>
                            {submittedSamples.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by patient name, sample ID, or mobile..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Results List */}
            {activeTab === 'pending' ? (
                filteredSamples.length > 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left text-xs md:text-sm min-w-[750px]">
                                <thead className="bg-slate-50 dark:bg-gray-900/50 border-b border-slate-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Patient Details</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Sample ID</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Tests</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Collection Date</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Status</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                    {filteredSamples.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((sample) => (
                                        <tr key={sample._id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-4 md:px-6 py-3 md:py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-primary-theme flex items-center justify-center text-white font-bold text-xs">
                                                        {sample.patientDetails.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{sample.patientDetails.name}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {sample.patientDetails.age}Y • {sample.patientDetails.gender}
                                                            {sample.patientDetails.mobile && ` • ${sample.patientDetails.mobile}`}
                                                        </div>
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
                                                {new Date(sample.collectionDate || '').toLocaleDateString()}
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 uppercase tracking-wider">
                                                    <Clock className="w-3 h-3" />
                                                    Pending
                                                </span>
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                                <button
                                                    onClick={() => startNavigation(() => router.push(`/lab/samples/${sample._id}`))}
                                                    disabled={isNavigating}
                                                    className={`px-4 py-2 bg-primary-theme hover:bg-primary-theme/90 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 ml-auto ${isNavigating ? 'opacity-70' : ''}`}
                                                >
                                                    Enter Results
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination for Pending */}
                        {totalPages > 1 && (
                            <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/30">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredSamples.length)}</span> of <span className="font-medium">{filteredSamples.length}</span> pending results
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
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-amber-50 dark:bg-amber-900/20">
                            <FileText className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Pending Results</h3>
                        <p className="text-gray-500 dark:text-gray-400">All collected samples have results entered.</p>
                    </div>
                )
            ) : (
                // Submitted Results Table View
                filteredSamples.length > 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left text-xs md:text-sm min-w-[700px]">
                                <thead className="bg-slate-50 dark:bg-gray-900/50 border-b border-slate-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Patient Details</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Sample ID</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Test Info</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Report Date</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                    {filteredSamples.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((sample) => (
                                        <tr key={sample._id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-4 md:px-6 py-3 md:py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-xs">
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
                                            <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => startNavigation(() => router.push(`/lab/samples/${sample._id}`))}
                                                        disabled={isNavigating}
                                                        className={`p-2 hover:bg-slate-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-gray-600 ${isNavigating ? 'opacity-70' : ''}`}
                                                        title="View Details"
                                                    >
                                                        <FileText size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => startNavigation(() => router.push(`/lab/samples/${sample._id}`))}
                                                        disabled={isNavigating}
                                                        className={`p-2 hover:bg-slate-100 dark:hover:bg-gray-700 text-green-600 dark:text-green-400 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-gray-600 ${isNavigating ? 'opacity-70' : ''}`}
                                                        title="View Report"
                                                    >
                                                        <Download size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/30">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredSamples.length)}</span> of <span className="font-medium">{filteredSamples.length}</span> submitted results
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
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-green-50 dark:bg-green-900/20">
                            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Submitted Results</h3>
                        <p className="text-gray-500 dark:text-gray-400">No completed results available.</p>
                    </div>
                )
            )}


        </div>
    );
}
