'use client';

import React, { useState, useEffect } from 'react';
import {
    ClipboardCheck,
    CheckCircle2,
    Circle,
    ChevronLeft,
    ChevronRight,
    ListTodo,
    AlertCircle,
    RotateCcw,
    Filter,
    Stethoscope,
    FileText
} from 'lucide-react';
import { ipdService, staffService } from '@/lib/integrations';
import toast from 'react-hot-toast';

export default function DailyTasksPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [nurseDept, setNurseDept] = useState<string | string[] | null>(null);
    const apiLimit = 10;

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const profileData = await staffService.getProfile();
            const dept = profileData.staff.department || undefined;
            setNurseDept(dept || null);

            const data = await ipdService.getActiveAdmissions(Array.isArray(dept) ? dept.join(',') : dept);
            const activeAdmissions = data.filter((a: any) => a.status === 'Active');

            const savedCompletions = localStorage.getItem('nurse_task_completions');
            const completedTasks: Record<string, boolean> = savedCompletions ? JSON.parse(savedCompletions) : {};

            const generatedTasks = activeAdmissions.flatMap((adm: any) => {
                const hasVitals = adm.vitals && (adm.vitals.pulse || adm.vitals.bloodPressure || adm.vitals.spO2 || adm.vitals.temperature);
                const hasClinicalNotes = adm.clinicalNotes && adm.clinicalNotes.trim().length > 0;

                return [
                    {
                        id: `vitals-${adm._id}`,
                        admissionId: adm.admissionId,
                        patientId: adm.patient?._id,
                        patient: adm.patient?.name,
                        type: 'Vitals Check',
                        icon: <Stethoscope size={16} />,
                        note: 'Record vitals (BP, Pulse, Temp)',
                        status: completedTasks[`vitals-${adm._id}`] ? 'Completed' : 'Pending',
                        priority: adm.vitals?.status === 'Critical' ? 'High' : 'Medium',
                        canComplete: hasVitals,
                        admission: adm
                    },
                    {
                        id: `note-${adm._id}`,
                        admissionId: adm.admissionId,
                        patientId: adm.patient?._id,
                        patient: adm.patient?.name,
                        type: 'Clinical Notes',
                        icon: <FileText size={16} />,
                        note: 'Update daily progress notes',
                        status: completedTasks[`note-${adm._id}`] ? 'Completed' : 'Pending',
                        priority: 'Low',
                        canComplete: hasClinicalNotes,
                        admission: adm
                    }
                ];
            });
            setTasks(generatedTasks);
        } catch (error) {
            toast.error("Failed to load tasks");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const toggleTaskCompletion = (taskId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (!task.canComplete && task.status !== 'Completed') {
            toast.error(task.type === 'Vitals Check' ? "Please enter vitals first" : "Please enter clinical notes first");
            return;
        }

        const updatedTasks = tasks.map(t =>
            t.id === taskId ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' } : t
        );
        setTasks(updatedTasks);

        const savedCompletions = localStorage.getItem('nurse_task_completions');
        const completedTasks: Record<string, boolean> = savedCompletions ? JSON.parse(savedCompletions) : {};
        const updatedTask = updatedTasks.find(t => t.id === taskId);
        if (updatedTask) {
            completedTasks[taskId] = updatedTask.status === 'Completed';
            localStorage.setItem('nurse_task_completions', JSON.stringify(completedTasks));
        }
        toast.success("Task updated");
    };

    const clearCompletedTasks = () => {
        localStorage.removeItem('nurse_task_completions');
        fetchTasks();
        toast.success("All tasks reset");
    };

    const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);
    const completedCount = tasks.filter(t => t.status === 'Completed').length;
    const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    const totalPages = Math.ceil(filteredTasks.length / apiLimit);
    const paginatedTasks = filteredTasks.slice((currentPage - 1) * apiLimit, currentPage * apiLimit);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-slate-500">Loading Task Board...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm">
                    <div>
                        <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight leading-none">Daily Tasks</h1>
                        <p className="text-[10px] sm:text-sm text-slate-500 mt-1">Care for <span className="font-semibold text-emerald-600">{nurseDept || 'All Wards'}</span></p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl flex items-center gap-2 sm:gap-3">
                            <div className="text-right">
                                <p className="text-[7px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Progress</p>
                                <p className="text-[10px] sm:text-sm font-bold text-slate-900 leading-none">{completedCount} / {tasks.length}</p>
                            </div>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 relative flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-slate-200" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                    <path className="text-emerald-500 transition-all duration-1000 ease-out" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                </svg>
                                <span className="absolute text-[8px] sm:text-[10px] font-bold text-emerald-600">{progress}%</span>
                            </div>
                        </div>
                        {completedCount > 0 && (
                            <button onClick={clearCompletedTasks} className="p-2 sm:p-3 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-500 rounded-lg sm:rounded-xl transition-all shadow-sm" title="Reset All Tasks">
                                <RotateCcw size={14} className="sm:size-[18px]" />
                            </button>
                        )}
                    </div>
                </div>

                {/* FILTERS & CONTENT */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                    {/* LEFT SIDEBAR FILTERS */}
                    <div className="lg:col-span-1 space-y-3 sm:space-y-4">
                        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-[10px] sm:text-sm font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                                <Filter size={12} className="text-slate-400 sm:size-4" /> Filter Tasks
                            </h3>
                            <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 lg:space-y-2">
                                {['All', 'Pending', 'Completed'].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => { setFilter(f); setCurrentPage(1); }}
                                        className={`flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-medium transition-all ${filter === f
                                            ? 'bg-primary-theme text-white shadow-md'
                                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                            }`}
                                    >
                                        <span>{f}</span>
                                        <span className={`hidden lg:inline px-2 py-0.5 rounded text-[10px] font-bold ${filter === f ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                            {f === 'All' ? tasks.length : tasks.filter(t => t.status === f).length}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-blue-100 hidden sm:block">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5 sm:size-5" />
                                <div>
                                    <h4 className="text-[10px] sm:text-sm font-bold text-blue-900">Task Policy</h4>
                                    <p className="text-[8px] sm:text-xs text-blue-700 mt-1 leading-relaxed">
                                        Tasks activate only after data entry.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MAIN TASK LIST */}
                    <div className="lg:col-span-3 space-y-3 sm:space-y-4">
                        {paginatedTasks.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2 sm:gap-3">
                                {paginatedTasks.map((task: any) => (
                                    <div
                                        key={task.id}
                                        onClick={(e) => toggleTaskCompletion(task.id, e)}
                                        className={`group relative p-3 sm:p-5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${task.status === 'Completed'
                                            ? 'bg-slate-50 border-slate-100'
                                            : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4">
                                            {/* CHECKBOX */}
                                            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${task.status === 'Completed' ? 'bg-emerald-500 text-white' :
                                                task.canComplete ? 'border-2 border-slate-300 group-hover:border-emerald-400' : 'bg-slate-100 border-2 border-slate-100'
                                                }`}>
                                                {task.status === 'Completed' && <CheckCircle2 size={12} className="sm:size-[14px]" />}
                                            </div>

                                            {/* CONTENT */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-0.5 sm:mb-1">
                                                    <h3 className={`text-xs sm:text-base font-bold truncate ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                                        {task.patient}
                                                    </h3>
                                                    {task.priority === 'High' && (
                                                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[8px] sm:text-[10px] font-bold uppercase tracking-wide rounded border border-rose-100">High</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-sm text-slate-500">
                                                    <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 leading-none">
                                                        R-{task.admission?.bed?.room || '?'} • B-{task.admission?.bed?.bedId || '-'}
                                                    </div>
                                                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[11px] ${task.status === 'Completed' ? 'bg-slate-100' : 'bg-slate-100 text-slate-700 font-bold uppercase tracking-tight'}`}>
                                                        {task.type}
                                                    </span>
                                                    <span className="truncate hidden sm:inline text-[11px]">• {task.note}</span>
                                                </div>
                                            </div>

                                            {/* STATUS INDICATOR */}
                                            {!task.canComplete && task.status !== 'Completed' && (
                                                <div className="shrink-0 px-2 py-0.5 bg-amber-50 text-amber-600 text-[8px] sm:text-xs font-bold rounded-md border border-amber-100">
                                                    Pending Entry
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                    <ListTodo size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">All Caught Up!</h3>
                                <p className="text-sm text-slate-500">No tasks matching your current filter.</p>
                            </div>
                        )}

                        {/* PAGINATION */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4">
                                <p className="text-sm text-slate-500">Page {currentPage} of {totalPages}</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
