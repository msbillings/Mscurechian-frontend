'use client';

import React, { useEffect, useState } from 'react';
import { getSocket, joinSocketRoom } from '@/lib/integrations/api/socket';
import { toast } from 'react-hot-toast';
import { TestTube, AlertCircle, User, Calendar, FileText, ChevronRight, Trash2, Clock, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { API_CONFIG } from '@/lib/integrations/config/api-config';
import DeleteConfirmationModal from '@/components/common/DeleteConfirmationModal';

interface LabResult {
    _id: string;
    sampleId: string;
    patient: {
        _id: string;
        name: string;
        mobile?: string;
        email?: string;
        mrn?: string;
    };
    tests: Array<{
        testName: string;
        status: string;
        result: any;
        isAbnormal?: boolean;
        remarks?: string;
    }>;
    status: string;
    doctorNotified?: boolean;
    doctor?: {
        name: string;
    };
    hospital?: {
        name: string;
    };
    completedAt?: Date;
    createdAt: Date;
}

export default function DoctorLabResultsPage() {
    const router = useRouter();
    const [results, setResults] = useState<LabResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
    const [socketConnected, setSocketConnected] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const itemsPerPage = 15;

    useEffect(() => {
        fetchLabResults();

        let socketInstance: any = null;

        const initSocket = async () => {
            try {
                const user = JSON.parse(sessionStorage.getItem('user') || '{}');
                const userId = user._id || user.id;

                if (userId && user.role) {
                    socketInstance = await getSocket();
                    if (socketInstance) {
                        // Function to join rooms (re-usable for reconnection)
                        const performRoomJoin = async () => {
                            console.log('📡 Attempting to join clinical rooms for:', user.role);
                            await joinSocketRoom({
                                role: user.role,
                                userId: userId,
                                hospitalId: user.hospital
                            });
                            setSocketConnected(true);
                        };

                        if (socketInstance.connected) {
                            await performRoomJoin();
                        }

                        socketInstance.on('connect', performRoomJoin);
                        socketInstance.on('disconnect', () => setSocketConnected(false));

                        // Listen for final notifications (Send to Doctor)
                        socketInstance.on('lab_result_notification', (notification: any) => {
                            console.log('📬 NEW LAB RESULT:', notification);
                            toast.success(`Lab results ready for ${notification.patientName}`, {
                                duration: 8000,
                                icon: '🧪',
                                position: 'top-right'
                            });
                            fetchLabResults();
                            playNotificationSound();
                        });

                        // Listen for status-wide updates (Processing, Collected, etc)
                        const handleGenericUpdate = () => {
                            console.log('🔄 Live Update: Refreshing result list...');
                            fetchLabResults();
                        };

                        socketInstance.on('lab_order_updated', handleGenericUpdate);
                        socketInstance.on('new_lab_order', handleGenericUpdate);
                        socketInstance.on('sample_collected', handleGenericUpdate);
                        socketInstance.on('bill_generated', handleGenericUpdate);
                    }
                }
            } catch (error) {
                console.error('Socket setup error:', error);
            }
        };

        initSocket();

        // Listen for internal refresh events
        const handleRefresh = () => fetchLabResults();
        window.addEventListener('refresh-lab-results', handleRefresh);

        return () => {
            if (socketInstance) {
                socketInstance.off('connect');
                socketInstance.off('disconnect');
                socketInstance.off('lab_result_notification');
                socketInstance.off('lab_order_updated');
                socketInstance.off('new_lab_order');
                socketInstance.off('sample_collected');
                socketInstance.off('bill_generated');
            }
            window.removeEventListener('refresh-lab-results', handleRefresh);
        };
    }, []);

    const playNotificationSound = () => {
        try {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => { });
        } catch (error) {
            console.log('Could not play notification sound');
        }
    };

    const fetchLabResults = async () => {
        try {
            const token = sessionStorage.getItem('accessToken');
            // Added cache busting and slightly higher limit to ensure reliability
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/doctor/lab-results?limit=60&_cb=${Date.now()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                }
            );

            const data = await response.json();
            if (data.success) {
                setResults(data.data);
            }
        } catch (error) {
            // Silently fail background fetches unless loading
            if (loading) toast.error('Failed to fetch lab results');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteResult = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setIdToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!idToDelete) return;

        setIsDeleting(true);
        try {
            const token = sessionStorage.getItem('accessToken');
            const response = await fetch(`${API_CONFIG.BASE_URL}/lab/orders/${idToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (response.ok) {
                toast.success('Lab result deleted successfully');
                setResults(results.filter(r => r._id !== idToDelete));
                setIsDeleteModalOpen(false);
                setIdToDelete(null);
            } else {
                toast.error(data.message || 'Failed to delete lab result');
            }
        } catch (error) {
            toast.error('Error deleting lab result');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredResults = results.filter(result => {
        const isOfficiallyCompleted = result.status.toLowerCase() === 'completed' && result.doctorNotified;
        if (filter === 'all') return true;
        if (filter === 'completed') return isOfficiallyCompleted;
        if (filter === 'pending') return !isOfficiallyCompleted;
        return true;
    });

    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading lab results...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 pt-2 pb-10 border-t border-gray-100 dark:border-gray-800/50">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-100 dark:shadow-none">
                        <TestTube className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lab Results</h1>
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${socketConnected ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                {socketConnected ? 'Live Connection' : 'Offline'}
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Monitor and review patient diagnostic reports</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2 mr-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentPage(p => Math.max(1, p - 1));
                                }}
                                disabled={currentPage === 1}
                                className="p-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:border-blue-200 transition-all shadow-sm"
                                title="Previous Page"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentPage(p => (p < totalPages ? p + 1 : p));
                                }}
                                disabled={currentPage === totalPages}
                                className="p-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:border-blue-200 transition-all shadow-sm"
                                title="Next Page"
                            >
                                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => {
                            setLoading(true);
                            fetchLabResults();
                        }}
                        className="p-2.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 shadow-sm transition-all"
                        title="Refresh Data"
                    >
                        <Clock className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex items-center bg-gray-50 dark:bg-gray-900 p-1.5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-inner">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-5 py-2 rounded-[14px] text-xs font-bold transition-all duration-300 ${filter === 'all'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            ALL ({results.length})
                        </button>
                        <button
                            onClick={() => setFilter('completed')}
                            className={`px-5 py-2 rounded-[14px] text-xs font-bold transition-all duration-300 ${filter === 'completed'
                                ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            COMPLETED ({results.filter(r => r.status.toLowerCase() === 'completed' && r.doctorNotified).length})
                        </button>
                        <button
                            onClick={() => setFilter('pending')}
                            className={`px-5 py-2 rounded-[14px] text-xs font-bold transition-all duration-300 ${filter === 'pending'
                                ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            PENDING ({results.filter(r => !(r.status.toLowerCase() === 'completed' && r.doctorNotified)).length})
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Grid logic */}
            {filteredResults.length > 0 ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredResults.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((result) => (
                            <div
                                key={result._id}
                                onClick={() => router.push(`/doctor/lab-results/${result._id}`)}
                                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col overflow-hidden"
                            >
                                {/* Card Header */}
                                <div className="p-4 pb-2 flex justify-between items-start">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${result.status.toLowerCase() === 'completed' && result.doctorNotified ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                        result.status.toLowerCase() === 'completed' && !result.doctorNotified ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400' :
                                            'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400'
                                        }`}>
                                        <div className={`w-1 h-1 rounded-full ${result.status.toLowerCase() === 'completed' && result.doctorNotified ? 'bg-emerald-500' :
                                            result.status.toLowerCase() === 'completed' && !result.doctorNotified ? 'bg-indigo-500' :
                                                'bg-amber-500'
                                            }`} />
                                        {result.status.toLowerCase() === 'completed' && !result.doctorNotified ? 'Review Pending' : result.status}
                                    </span>
                                    <div className="text-right">
                                        <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                                            {result.patient?.mrn || 'No MRN'}
                                        </div>
                                        <div className="flex items-center justify-end gap-2 mt-0.5">
                                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 font-mono">
                                                #{result.sampleId}
                                            </span>
                                            <button
                                                onClick={(e) => handleDeleteResult(result._id, e)}
                                                className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                                                title="Delete Result"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Patient Info */}
                                <div className="px-4 pb-4 flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm ${result.status.toLowerCase() === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                        {result.patient?.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors leading-tight">
                                            {result.patient?.name || 'Unknown Patient'}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-1.5">
                                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                                <Calendar className="w-3 h-3 text-blue-400" />
                                                {new Date(result.completedAt || result.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                                <Clock className="w-3 h-3 text-indigo-400" />
                                                {new Date(result.completedAt || result.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Referral Info */}
                                <div className="px-4 pb-4">
                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-2.5 flex items-center gap-2 border border-gray-50 dark:border-gray-700/50">
                                        <div className="p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-xs">
                                            <User className="w-3.5 h-3.5 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Referred By</p>
                                            <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                                {result.doctor?.name ? (result.doctor.name.startsWith('Dr.') ? result.doctor.name : `Dr. ${result.doctor.name}`) : 'Medical Staff'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Tests Section */}
                                <div className="px-4 pb-4 flex-1">
                                    <div className="flex flex-wrap gap-1.5">
                                        {result.tests.map((test, idx) => (
                                            <span
                                                key={idx}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${test.isAbnormal
                                                    ? 'bg-red-50 border-red-100 text-red-600 dark:bg-red-900/20 dark:border-red-800'
                                                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                                                    }`}
                                            >
                                                {test.testName}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Footer Link */}
                                <div className="mt-auto px-4 py-3 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between text-gray-400 group-hover:bg-blue-50/30 dark:group-hover:bg-blue-900/10 transition-colors">
                                    <span className="text-[11px] font-bold uppercase tracking-wider">View Detailed Report</span>
                                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-2 pr-20">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                Page <span className="text-blue-600 font-black">{currentPage}</span> of {totalPages}
                            </p>
                            <div className="flex items-center gap-2.5">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentPage(p => Math.max(1, p - 1));
                                    }}
                                    disabled={currentPage === 1}
                                    className="p-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:border-blue-200 transition-all shadow-sm"
                                >
                                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentPage(p => (p < totalPages ? p + 1 : p));
                                    }}
                                    disabled={currentPage === totalPages}
                                    className="p-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:border-blue-200 transition-all shadow-sm"
                                >
                                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-16 text-center shadow-sm">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-blue-50 dark:bg-blue-900/20">
                        <TestTube className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Lab Results</h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        {filter === 'all'
                            ? 'No lab results available yet.'
                            : `No ${filter} lab results found.`
                        }
                    </p>
                </div>
            )}

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    if (!isDeleting) {
                        setIsDeleteModalOpen(false);
                        setIdToDelete(null);
                    }
                }}
                onConfirm={confirmDelete}
                isDeleting={isDeleting}
                title="Delete Lab Result"
                message="Are you sure you want to delete this lab result? This action cannot be undone and will remove the record from the system."
            />
        </div>
    );
}
