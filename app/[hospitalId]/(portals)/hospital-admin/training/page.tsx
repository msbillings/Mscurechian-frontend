"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    BookOpen, Plus, Search, Filter, Calendar,
    Briefcase, Users, MoreVertical, Edit, Trash2,
    CheckCircle2, Clock, XCircle, FileCheck, ChevronDown
} from 'lucide-react';
import { getAllTrainingsAction, deleteTrainingAction } from '@/lib/integrations';
import AddTrainingModal from '@/components/admin/training/AddTrainingModal';
import { ConfirmModal } from '@/components/admin/Modal';
import { useDebounce } from '@/hooks/useDebounce';

export default function TrainingManagementPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTraining, setSelectedTraining] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const [filterStatus, setFilterStatus] = useState("");
    const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [trainingToDelete, setTrainingToDelete] = useState<string | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Fetch Trainings
    const { data: trainingData, isLoading } = useQuery({
        queryKey: ['trainings'],
        queryFn: getAllTrainingsAction
    });

    const trainings = trainingData?.data?.trainings || [];

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: deleteTrainingAction,
        onSuccess: () => {
            toast.success("Training record deleted successfully");
            queryClient.invalidateQueries({ queryKey: ['trainings'] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete training record");
        }
    });

    const handleDelete = (id: string) => {
        setTrainingToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (trainingToDelete) {
            deleteMutation.mutate(trainingToDelete);
            setDeleteModalOpen(false);
            setTrainingToDelete(null);
        }
    };

    const filteredTrainings = useMemo(() => {
        return trainings.filter((t: any) => {
            const matchesSearch = debouncedSearchTerm.length < 3 ||
                t.trainingName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                t.department.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
            const matchesStatus = !filterStatus || t.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [trainings, debouncedSearchTerm, filterStatus]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredTrainings.length / itemsPerPage);
    const paginatedTrainings = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredTrainings.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredTrainings, currentPage, itemsPerPage]);

    // Reset page when filter changes
    useMemo(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, filterStatus]);

    const handleEdit = (training: any) => {
        if (training.status?.toLowerCase() === 'completed') {
            toast.error("Completed trainings cannot be edited");
            return;
        }
        setSelectedTraining(training);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedTraining(null);
        setIsModalOpen(true);
    };

    return (
        <div className="p-3 md:p-8 space-y-8 bg-slate-50/50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight">Staff Training Records</h1>
                    <p className="text-sm text-slate-500 font-medium flex items-center gap-2 mt-1">
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
                        Manage professional development & compliance
                    </p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-3 md:px-6 py-2.5 bg-indigo-600 text-white rounded-[0.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
                >
                    <Plus className="w-4 h-4" strokeWidth={3} /> Log New Training
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-2 md:p-4 rounded-[0.5rem] border border-slate-200  flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search training name or department..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-48">
                        <Filter className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 z-10" />
                        <div
                            onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                            className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer flex justify-between items-center group hover:border-indigo-200 transition-colors"
                        >
                            <span className={filterStatus ? 'text-slate-900' : 'text-slate-400'}>
                                {filterStatus ? `Status: ${filterStatus}` : 'Status: All'}
                            </span>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isStatusFilterOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isStatusFilterOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-[60]"
                                    onClick={() => setIsStatusFilterOpen(false)}
                                />
                                <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-xl z-[70] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-1">
                                        <div
                                            onClick={() => { setFilterStatus(''); setIsStatusFilterOpen(false); }}
                                            className="px-4 py-2.5 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 cursor-pointer"
                                        >
                                            Status: All
                                        </div>
                                        {['Scheduled', 'Completed', 'Cancelled'].map(s => (
                                            <div
                                                key={s}
                                                onClick={() => { setFilterStatus(s); setIsStatusFilterOpen(false); }}
                                                className={`px-4 py-2.5 hover:bg-indigo-50/50 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors ${filterStatus === s ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
                                            >
                                                {s}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Table View */}
            <div className="bg-white rounded-[0.5rem] border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-2 md:px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Training Name</th>
                                <th className="px-2 md:px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Date/Dept</th>
                                <th className="px-2 md:px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Participants</th>
                                <th className="px-2 md:px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                                <th className="px-2 md:px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-2 md:px-6 py-4"><div className="h-4 w-32 bg-slate-100 rounded" /></td>
                                        <td className="px-2 md:px-6 py-4"><div className="h-4 w-24 bg-slate-100 rounded mx-auto" /></td>
                                        <td className="px-2 md:px-6 py-4"><div className="h-4 w-12 bg-slate-100 rounded mx-auto" /></td>
                                        <td className="px-2 md:px-6 py-4"><div className="h-4 w-20 bg-slate-100 rounded mx-auto" /></td>
                                        <td className="px-2 md:px-6 py-4"><div className="h-8 w-16 bg-slate-100 rounded ml-auto" /></td>
                                    </tr>
                                ))
                            ) : paginatedTrainings.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-2 md:px-6 py-12 text-center text-slate-500 font-medium">
                                        No training records found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedTrainings.map((training: any) => (
                                    <tr key={training._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-2 md:px-6 py-4">
                                            <div className="flex items-start gap-4">
                                                <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center text-xs md:text-base md:text-lg ${training.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                                                    training.status === 'Cancelled' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                                    }`}>
                                                    <BookOpen size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{training.trainingName}</p>
                                                    {training.description && (
                                                        <p className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-[200px]">{training.description}</p>
                                                    )}
                                                    {training.status?.toLowerCase().includes('cancel') && (
                                                        <span className="inline-block mt-1 text-[9px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                                            Reason: {training.cancellationReason || training.reason}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-6 py-4">
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-slate-700">{new Date(training.trainingDate).toLocaleDateString()}</p>
                                                <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase tracking-wider">
                                                    {training.department}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg inline-flex border border-slate-100">
                                                <Users size={14} />
                                                <span className="text-xs font-bold">{training.participants?.length || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${training.status?.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                                training.status?.toLowerCase() === 'cancelled' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                                }`}>
                                                {training.status?.toLowerCase() === 'completed' ? <CheckCircle2 size={12} /> :
                                                    training.status?.toLowerCase() === 'cancelled' ? <XCircle size={12} /> : <Clock size={12} />}
                                                {training.status}
                                            </span>
                                        </td>
                                        <td className="px-2 md:px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {training.certificateUrl && (
                                                    <a
                                                        href={training.certificateUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="View Certificate"
                                                    >
                                                        <FileCheck size={16} />
                                                    </a>
                                                )}

                                                {training.status?.toLowerCase() !== 'cancelled' && (
                                                    <button
                                                        onClick={() => handleEdit(training)}
                                                        disabled={training.status?.toLowerCase() === 'completed'}
                                                        className={`p-2 rounded-lg transition-colors ${training.status?.toLowerCase() === 'completed'
                                                            ? 'text-slate-200 cursor-not-allowed'
                                                            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                                                            }`}
                                                        title={training.status?.toLowerCase() === 'completed' ? "Completed" : "Edit"}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleDelete(training._id)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table></div>
                </div>

                {/* Pagination Controls */}
                {!isLoading && filteredTrainings.length > itemsPerPage && (
                    <div className="px-2 md:px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                            Showing <span className="text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filteredTrainings.length)}</span> of <span className="text-slate-900">{filteredTrainings.length}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-900">
                                {currentPage}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <AddTrainingModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    training={selectedTraining}
                />
            )}

            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Training Record"
                message="Are you sure you want to delete this training record? This action cannot be undone."
                confirmText="Delete"
                type="danger"
                loading={deleteMutation.isPending}
            />
        </div>
    );
}
