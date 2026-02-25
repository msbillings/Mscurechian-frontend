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
    FileText,
    Calendar
} from 'lucide-react';
import { ipdService, staffService, NurseService } from '@/lib/integrations';
import toast from 'react-hot-toast';

export default function DailyTasksPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [nurseDept, setNurseDept] = useState<string | string[] | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isHistorical, setIsHistorical] = useState(false);
    const apiLimit = 20;

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const profileData = await staffService.getProfile();
            const dept = profileData.staff.department || undefined;
            setNurseDept(dept || null);

            // Fetch from backend
            const response = await NurseService.getTasks(1, 100, {
                date: selectedDate
            });

            if (response.data) {
                setTasks(response.data);
                setIsHistorical(response.isHistorical || false);
            }
        } catch (error) {
            console.error("Fetch tasks error:", error);
            toast.error("Failed to load tasks from server");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [selectedDate]);

    const toggleTaskCompletion = async (taskId: string, currentStatus: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (isHistorical) {
            toast.error("Historical tasks cannot be modified");
            return;
        }

        const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';

        try {
            // Update on backend
            const res = await NurseService.updateTaskStatus(
                taskId,
                newStatus as any
            );

            if (res) {
                setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
                toast.success(`Task marked as ${newStatus}`);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update task");
        }
    };

    const handleDateChange = (days: number) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
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
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight leading-none">Nurse Dashboard</h1>
                            <p className="text-[10px] sm:text-sm text-slate-500 mt-1">
                                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                {isHistorical && <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] uppercase font-bold">Historical View</span>}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-1 shadow-inner">
                            <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-white hover:text-emerald-600 transition-all rounded-lg text-slate-400">
                                <ChevronLeft size={18} />
                            </button>
                            <span className="px-3 text-xs font-bold text-slate-600 min-w-[100px] text-center">
                                {isHistorical ? selectedDate : "Today"}
                            </span>
                            <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-white hover:text-emerald-600 transition-all rounded-lg text-slate-400">
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-50/50 border border-emerald-100 rounded-lg sm:rounded-xl flex items-center gap-2 sm:gap-3 shadow-sm">
                            <div className="text-right">
                                <p className="text-[7px] sm:text-xs text-emerald-600/60 font-bold uppercase tracking-wider leading-none mb-1">Shift Progress</p>
                                <p className="text-[10px] sm:text-sm font-bold text-emerald-700 leading-none">{completedCount} / {tasks.length}</p>
                            </div>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 relative flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-emerald-100/50" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                    <path className="text-emerald-500 transition-all duration-1000 ease-out" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                </svg>
                                <span className="absolute text-[8px] sm:text-[10px] font-black text-emerald-600">{progress}%</span>
                            </div>
                        </div>
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
                                        key={task._id}
                                        onClick={(e) => toggleTaskCompletion(task._id, task.status, e)}
                                        className={`group relative p-3 sm:p-5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${task.status === 'Completed'
                                            ? 'bg-slate-100/30 border-slate-100'
                                            : isHistorical
                                                ? 'bg-white border-slate-200 opacity-80'
                                                : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4">
                                            {/* CHECKBOX */}
                                            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${task.status === 'Completed' ? 'bg-emerald-500 text-white shadow-sm' :
                                                !isHistorical ? 'border-2 border-slate-300 group-hover:border-emerald-400' : 'bg-slate-100 border-2 border-slate-100'
                                                }`}>
                                                {task.status === 'Completed' && <CheckCircle2 size={12} className="sm:size-[14px]" />}
                                            </div>

                                            {/* CONTENT */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-0.5 sm:mb-1">
                                                    <h3 className={`text-xs sm:text-[15px] font-bold truncate ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                                        {task.title}
                                                    </h3>
                                                    {task.priority === 'High' || task.priority === 'Critical' ? (
                                                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[8px] sm:text-[10px] font-bold uppercase tracking-wide rounded border border-rose-100">Urgent</span>
                                                    ) : null}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-sm text-slate-500">
                                                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[11px] font-bold uppercase tracking-tight ${task.type === 'Medication' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                                        task.type === 'Vitals' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                            'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        {task.type}
                                                    </span>
                                                    <span className="truncate hidden sm:inline text-[11px] font-medium text-slate-400">• {task.description}</span>
                                                </div>
                                            </div>

                                            {/* PATIENT INFO */}
                                            <div className="text-right hidden sm:block">
                                                <p className="text-[10px] font-bold text-slate-900 mb-0.5">{task.patient?.name}</p>
                                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                                                    ADMISSION: {task.admission?.admissionId || 'N/A'}
                                                </p>
                                            </div>
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
