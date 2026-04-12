'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getSocket, joinSocketRoom } from '@/lib/integrations/api/socket';
import { toast } from 'react-hot-toast';
import { TestTube, AlertCircle, User, Calendar, FileText, ChevronRight, Trash2, Clock, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTenantLink } from '@/hooks/useTenantLink';
import Link from 'next/link';
import { API_CONFIG } from '@/lib/integrations/config/api-config';
import { apiClient } from '@/lib/integrations/api/apiClient';
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
    const { getPath } = useTenantLink();
    const [results, setResults] = useState<LabResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
    const [socketConnected, setSocketConnected] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const itemsPerPage = 15;

    const fetchLabResults = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setIsRefreshing(true);

        try {
            // Added cache busting and slightly higher limit to ensure reliability
            const data = await apiClient<any>(`/doctor/lab-results?limit=60&_cb=${Date.now()}`);
            if (data?.success) {
                setResults(data.data);
            }
        } catch (error) {
            // Silently fail background fetches unless loading
            if (!silent) toast.error('Failed to fetch lab results');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchLabResults();

        let socketInstance: any = null;

        const initSocket = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
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
    }, [fetchLabResults]);

    const playNotificationSound = () => {
        try {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => { });
        } catch (error) {
            console.log('Could not play notification sound');
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
            await apiClient(`/lab/orders/${idToDelete}`, {
                method: 'DELETE'
            });
            toast.success('Lab result deleted successfully');
            setResults(results.filter(r => r._id !== idToDelete));
            setIsDeleteModalOpen(false);
            setIdToDelete(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete lab result');
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
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-4 border-primary-theme/20 border-t-primary-theme rounded-full animate-spin"></div>
                        <TestTube className="absolute inset-0 m-auto text-primary-theme animate-pulse" size={24} />
                    </div>
                    <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em] animate-pulse">Analyzing Diagnostic Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-4 sm:space-y-6 pt-1 sm:pt-3 pb-20">
            {/* Header Area */}
            <div className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-border-theme shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary-theme/5 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                    <div className="flex items-center gap-4 sm:gap-8">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 rotate-3">
                            <TestTube className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-lg md:text-xl lg:text-xl font-bold text-foreground uppercase tracking-tight">Lab Results</h1>
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] border ${socketConnected ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                                    <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                    {socketConnected ? 'LIVE FEED' : 'OFFLINE'}
                                </div>
                            </div>
                            <p className="text-[7px] md:text-[10px] lg:text-[10px] font-black text-muted uppercase tracking-[0.3em] mt-2 opacity-60">Real-time Diagnostic Intelligence Network</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => {
                                    fetchLabResults(true);
                                }}
                                className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-secondary-theme hover:bg-primary-theme/5 text-muted hover:text-primary-theme rounded-xl border border-border-theme transition-all active:scale-90"
                                title="Refresh Stream"
                                disabled={loading || isRefreshing}
                            >
                                <Clock className={`w-5 h-5 sm:w-6 sm:h-6 ${loading || isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                            
                            <div className="flex-1 sm:flex-none flex items-center bg-secondary-theme/50 p-1 rounded-xl sm:rounded-2xl border border-border-theme shadow-inner overflow-x-auto no-scrollbar">
                                {[
                                    { id: 'all', label: 'All Results', count: results.length, color: 'blue' },
                                    { id: 'completed', label: 'Verified', count: results.filter(r => r.status.toLowerCase() === 'completed' && r.doctorNotified).length, color: 'emerald' },
                                    { id: 'pending', label: 'In Queue', count: results.filter(r => !(r.status.toLowerCase() === 'completed' && r.doctorNotified)).length, color: 'amber' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setFilter(tab.id as any)}
                                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${filter === tab.id
                                            ? `bg-card text-${tab.color}-600 shadow-lg shadow-black/5`
                                            : 'text-muted hover:text-foreground'
                                            }`}
                                    >
                                        {tab.label}
                                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${filter === tab.id ? `bg-${tab.color}-50 text-${tab.color}-600` : 'bg-secondary-theme text-muted'}`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Grid logic */}
            {filteredResults.length > 0 ? (
                <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
                        {filteredResults.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((result) => (
                            <Link
                                key={result._id}
                                href={getPath(`/doctor/lab-results/${result._id}`)}
                                prefetch={true}
                                className="bg-card rounded-2xl border border-border-theme shadow-sm hover:shadow-2xl hover:shadow-primary-theme/5 transition-all cursor-pointer group flex flex-col overflow-hidden relative"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary-theme/5 rounded-full -mr-12 -mt-12 group-hover:bg-primary-theme/10 transition-colors"></div>
                                
                                {/* Card Header */}
                                <div className="p-6 pb-4 flex justify-between items-start relative z-10">
                                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border shadow-sm ${result.status.toLowerCase() === 'completed' && result.doctorNotified ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/30' :
                                        result.status.toLowerCase() === 'completed' && !result.doctorNotified ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-900/30' :
                                            'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-900/30'
                                        }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${result.status.toLowerCase() === 'completed' && result.doctorNotified ? 'bg-emerald-500' :
                                            result.status.toLowerCase() === 'completed' && !result.doctorNotified ? 'bg-indigo-500' :
                                                'bg-amber-500 animate-pulse'
                                            }`} />
                                        {result.status.toLowerCase() === 'completed' && !result.doctorNotified ? 'Pending Node' : result.status}
                                    </span>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-40 italic">
                                            #{result.sampleId}
                                        </span>
                                        <button
                                            onClick={(e) => handleDeleteResult(result._id, e)}
                                            className="p-2 text-muted hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all active:scale-90"
                                            title="Purge Record"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Patient Info */}
                                <div className="px-6 pb-4 flex items-center gap-4 relative z-10">
                                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg font-black shadow-lg shadow-black/5 shrink-0 transition-transform group-hover:scale-105 group-hover:rotate-3 ${result.status.toLowerCase() === 'completed' ? 'bg-blue-600 text-white' : 'bg-secondary-theme text-foreground border border-border-theme'}`}>
                                        {result.patient?.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base sm:text-lg font-black text-foreground group-hover:text-primary-theme transition-colors leading-tight truncate uppercase tracking-tight">
                                            {result.patient?.name || 'Unknown Patient'}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-1">
                                            <p className="text-[10px] font-black text-primary-theme uppercase tracking-widest opacity-70">
                                                MRN: {result.patient?.mrn || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Detail Stats */}
                                <div className="px-6 pb-6 grid grid-cols-2 gap-3">
                                    <div className="bg-secondary-theme/30 rounded-xl p-2.5 border border-border-theme/50">
                                        <div className="flex items-center gap-2 mb-1 opacity-50">
                                            <Calendar className="w-2.5 h-2.5 text-blue-500" />
                                            <span className="text-[8px] font-black uppercase tracking-widest">Released</span>
                                        </div>
                                        <p className="text-[9px] font-black text-foreground uppercase tracking-wider">
                                            {new Date(result.completedAt || result.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="bg-secondary-theme/30 rounded-xl p-2.5 border border-border-theme/50">
                                        <div className="flex items-center gap-2 mb-1 opacity-50">
                                            <Clock className="w-2.5 h-2.5 text-indigo-500" />
                                            <span className="text-[8px] font-black uppercase tracking-widest">Timestamp</span>
                                        </div>
                                        <p className="text-[9px] font-black text-foreground uppercase tracking-wider">
                                            {new Date(result.completedAt || result.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Referral Info */}
                                <div className="px-6 pb-6">
                                    <div className="bg-gradient-to-r from-secondary-theme to-transparent rounded-2xl p-3 flex items-center gap-3 border border-border-theme/50">
                                        <div className="w-9 h-9 bg-card rounded-xl flex items-center justify-center shadow-sm border border-border-theme/40 shrink-0">
                                            <User className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[8px] font-black text-muted uppercase tracking-[0.2em] opacity-50">Ordered By</p>
                                            <p className="text-[11px] font-black text-foreground truncate uppercase tracking-tight italic">
                                                {result.doctor?.name ? (result.doctor.name.startsWith('Dr.') ? result.doctor.name : `Dr. ${result.doctor.name}`) : 'Medical Staff Node'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Tests Section */}
                                <div className="px-6 pb-8 flex-1">
                                    <div className="flex flex-wrap gap-2">
                                        {result.tests.slice(0, 4).map((test, idx) => (
                                            <span
                                                key={idx}
                                                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${test.isAbnormal
                                                    ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:border-rose-900/30'
                                                    : 'bg-secondary-theme/50 border-border-theme/60 text-muted'
                                                    }`}
                                            >
                                                {test.testName}
                                            </span>
                                        ))}
                                        {result.tests.length > 4 && (
                                            <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-border-theme/60 bg-secondary-theme/50 text-muted italic">
                                                +{result.tests.length - 4} Cluster
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Footer Link */}
                                <div className="mt-auto px-6 py-4 bg-secondary-theme/20 border-t border-border-theme flex items-center justify-between text-muted group-hover:bg-primary-theme/5 group-hover:text-primary-theme transition-all">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Access Full Metadata Report</span>
                                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Pagination Controls - Optimized */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-4 py-8 bg-card rounded-[2.5rem] border border-border-theme shadow-sm">
                            <p className="text-[10px] sm:text-xs font-black text-muted uppercase tracking-[0.3em] italic opacity-40">
                                Registry Page <span className="text-primary-theme font-black">{currentPage}</span> of {totalPages}
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentPage(p => Math.max(1, p - 1));
                                    }}
                                    disabled={currentPage === 1}
                                    className="w-12 h-12 flex items-center justify-center bg-white dark:bg-card border border-border-theme rounded-2xl disabled:opacity-20 hover:border-primary-theme/30 hover:bg-primary-theme/5 transition-all shadow-sm"
                                >
                                    <ChevronLeft className="w-6 h-6 text-primary-theme" />
                                </button>
                                
                                <div className="hidden sm:flex items-center gap-2">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`w-12 h-12 rounded-2xl text-[10px] font-black flex items-center justify-center transition-all border ${
                                                currentPage === i + 1
                                                    ? 'bg-primary-theme text-white border-primary-theme shadow-lg shadow-primary-theme/20 scale-110 z-10'
                                                    : 'bg-white dark:bg-card border-border-theme text-muted hover:border-primary-theme/30'
                                            }`}
                                        >
                                            {(i + 1).toString().padStart(2, '0')}
                                        </button>
                                    )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentPage(p => (p < totalPages ? p + 1 : p));
                                    }}
                                    disabled={currentPage === totalPages}
                                    className="w-12 h-12 flex items-center justify-center bg-white dark:bg-card border border-border-theme rounded-2xl disabled:opacity-20 hover:border-primary-theme/30 hover:bg-primary-theme/5 transition-all shadow-sm"
                                >
                                    <ChevronRight className="w-6 h-6 text-primary-theme" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-card rounded-[3rem] border border-border-theme p-16 sm:p-24 text-center shadow-sm flex flex-col items-center">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] flex items-center justify-center mb-8 bg-secondary-theme relative">
                        <TestTube className="w-10 h-10 sm:w-14 sm:h-14 text-muted/30" />
                        <div className="absolute inset-0 border-2 border-dashed border-border-theme rounded-[2.5rem] animate-[spin_10s_linear_infinite]"></div>
                    </div>
                    <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground uppercase tracking-tight mb-3">Empty Clinical Result Set</h3>
                    <p className="text-[7px] md:text-[10px] lg:text-[10px] font-black text-muted uppercase tracking-[0.3em] opacity-60">
                        {filter === 'all'
                            ? 'No diagnostic intelligence captured in this cycle.'
                            : `No ${filter} records detected in the active ledger.`
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
