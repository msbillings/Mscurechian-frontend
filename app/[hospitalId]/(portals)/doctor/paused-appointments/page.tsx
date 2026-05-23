"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Clock, User, AlertCircle, Loader2, Timer, Pause, Activity, ArrowLeft, Search, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doctorService } from '@/lib/integrations/services/doctor.service';
import { useTenantLink } from '@/hooks/useTenantLink';

export default function PausedAppointmentsPage() {
  const router = useRouter();
  const { getPath } = useTenantLink();
  const [loading, setLoading] = useState(true);
  const [pausedAppointments, setPausedAppointments] = useState<any[]>([]);
  const [resuming, setResuming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchPausedAppointments();
  }, []);

  // Search Debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchPausedAppointments = async () => {
    try {
      setLoading(true);
      const data = await doctorService.getPausedAppointments();
      setPausedAppointments(data.appointments || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load paused appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeConsultation = async (appointmentId: string) => {
    try {
      setResuming(appointmentId);
      await doctorService.resumeConsultation(appointmentId);
      toast.success('Consultation resumed successfully!');
      router.push(getPath(`/doctor/prescription?appointmentId=${appointmentId}`));
    } catch (error: any) {
      toast.error(error.message || 'Failed to resume consultation');
      setResuming(null);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(appointmentId);
      await doctorService.deleteAppointment(appointmentId);
      toast.success('Appointment deleted successfully');
      setPausedAppointments(prev => prev.filter(apt => apt._id !== appointmentId));
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete appointment');
    } finally {
      setDeleting(null);
    }
  };

  const formatPausedDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  };

  const formatElapsedTime = (pausedAt: string, consultationStartTime: string) => {
    const paused = new Date(pausedAt).getTime();
    const started = new Date(consultationStartTime).getTime();
    const elapsed = Math.floor((paused - started) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter Logic
  const filteredAppointments = pausedAppointments.filter(apt => {
    const pName = (apt.patient?.name || '').toLowerCase();
    const pMrn = (apt.patient?.mrn || apt.mrn || '').toLowerCase();
    const search = debouncedSearch.toLowerCase();
    return pName.includes(search) || pMrn.includes(search);
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const paginatedData = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-primary-theme/20 border-t-primary-theme rounded-full animate-spin"></div>
            <Pause className="absolute inset-0 m-auto text-primary-theme animate-pulse" size={24} />
          </div>
          <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em] animate-pulse">Syncing Paused Sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4 pb-10">
      {/* Header Section */}
      <div className="bg-white border border-border-theme rounded-xl py-3 px-4 mb-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button onClick={() => router.back()} className="p-2 hover:bg-secondary-theme rounded-full text-muted hover:text-foreground transition-colors shrink-0">
              <ArrowLeft size={18} />
            </button>
            <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20 rotate-3 shrink-0">
              <Pause size={16} className="text-white fill-current" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl lg:text-xl font-black text-foreground flex items-center gap-2 truncate uppercase tracking-tight">
                Paused Sessions
              </h1>
              <p className="text-[10px] text-muted font-bold uppercase tracking-widest leading-tight opacity-60">
                {pausedAppointments.length} Clinically Pended Node{pausedAppointments.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
              <input
                type="text"
                placeholder="Search Patient or MRN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-border-theme rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/10 placeholder:text-muted/50 uppercase tracking-widest"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        {/* Mobile View: Cards */}
        <div className="grid grid-cols-1 gap-4 sm:hidden">
          {paginatedData.length > 0 ? (
            paginatedData.map((appointment) => (
              <div key={appointment._id} className="bg-card rounded-3xl border border-border-theme p-5 shadow-sm active:scale-[0.98] transition-transform">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-theme/10 rounded-xl flex items-center justify-center border border-primary-theme/20 shadow-inner">
                      <User size={18} className="text-primary-theme" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-foreground uppercase tracking-tight">{appointment.patient?.name || 'Unknown Node'}</h3>
                      <p className="text-[10px] font-black text-primary-theme uppercase tracking-wider opacity-70">MRN: {appointment.patient?.mrn || appointment.mrn || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-black text-muted uppercase tracking-widest bg-secondary-theme px-2 py-1 rounded-lg border border-border-theme">
                      #{appointment.patient?.mrn?.slice(-4) || 'SCAN'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5 px-1">
                  <div className="bg-secondary-theme/30 rounded-2xl p-3 border border-border-theme/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={12} className="text-amber-500" />
                      <span className="text-[8px] font-black text-muted uppercase tracking-widest">Wait Time</span>
                    </div>
                    <p className="text-xs font-black text-foreground tabular-nums tracking-widest">
                      {formatPausedDuration(Math.floor((Date.now() - new Date(appointment.pausedAt).getTime()) / 1000))}
                    </p>
                  </div>
                  <div className="bg-secondary-theme/30 rounded-2xl p-3 border border-border-theme/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Timer size={12} className="text-blue-500" />
                      <span className="text-[8px] font-black text-muted uppercase tracking-widest">Active Leg</span>
                    </div>
                    <p className="text-xs font-black text-foreground tabular-nums tracking-widest">
                      {appointment.consultationStartTime && appointment.pausedAt
                        ? formatElapsedTime(appointment.pausedAt, appointment.consultationStartTime)
                        : '0:00'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResumeConsultation(appointment._id)}
                    disabled={resuming === appointment._id || deleting === appointment._id}
                    className="flex-1 py-3 bg-primary-theme hover:bg-primary-theme/90 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-theme/20"
                  >
                    {resuming === appointment._id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Play size={14} fill="currentColor" />
                        Resume Node
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteAppointment(appointment._id)}
                    disabled={resuming === appointment._id || deleting === appointment._id}
                    className="w-12 h-12 flex items-center justify-center bg-rose-50 text-rose-500 border border-rose-100 rounded-2xl active:bg-rose-100 transition-colors"
                  >
                    {deleting === appointment._id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-card rounded-3xl border border-secondary-theme p-12 text-center">
              <AlertCircle size={40} className="mx-auto text-muted mb-4 opacity-20" />
              <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">No Pended Records</p>
            </div>
          )}
        </div>

        {/* Desktop View: Enhanced Table */}
        <div className="bg-white border border-border-theme rounded-xl overflow-hidden shadow-sm mx-1 sm:mx-0">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-border-theme/60">
                  <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest w-12 italic">Idx</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest">Patient Node</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest text-center">Duration</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest text-center">Pended At</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme/30">
                {paginatedData.length > 0 ? (
                  paginatedData.map((appointment, index) => (
                    <tr key={appointment._id} className="hover:bg-slate-50 transition-colors group text-[11px] sm:text-xs">
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-black text-muted/40 italic">{(currentPage - 1) * itemsPerPage + index + 1}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center border border-border-theme shadow-sm">
                            <User size={16} className="text-primary-theme" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground uppercase tracking-tight group-hover:text-primary-theme">
                              {appointment.patient?.name || 'Unknown'}
                            </p>
                            <p className="text-[10px] font-bold text-muted uppercase tracking-[0.1em] mt-0.5 opacity-60">
                              MRN: {appointment.patient?.mrn || appointment.mrn || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-lg border border-blue-100">
                          <Timer size={12} className="text-blue-600" />
                          <span className="text-[11px] font-bold text-blue-600 tabular-nums">
                            {appointment.consultationStartTime && appointment.pausedAt
                              ? formatElapsedTime(appointment.pausedAt, appointment.consultationStartTime)
                              : '0:00'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-2 px-2 py-1 bg-amber-50 rounded-lg border border-amber-100">
                          <Clock size={12} className="text-amber-600" />
                          <span className="text-[11px] font-bold text-amber-600">
                            {formatPausedDuration(Math.floor((Date.now() - new Date(appointment.pausedAt).getTime()) / 1000))}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResumeConsultation(appointment._id)}
                            disabled={resuming === appointment._id || deleting === appointment._id}
                            className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-amber-600/10"
                          >
                            {resuming === appointment._id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Play size={12} fill="currentColor" />
                            )}
                            Resume
                          </button>
                          <button
                            onClick={() => handleDeleteAppointment(appointment._id)}
                            disabled={resuming === appointment._id || deleting === appointment._id}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all border border-transparent hover:border-rose-100"
                            title="Abort"
                          >
                            {deleting === appointment._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-24 text-center">
                      <div className="max-w-xs mx-auto flex flex-col items-center">
                        <div className="w-20 h-20 bg-secondary-theme rounded-[2.5rem] flex items-center justify-center mb-6 opacity-40">
                          <Activity size={32} className="text-muted" />
                        </div>
                        <p className="text-sm font-black text-foreground uppercase tracking-[0.2em] mb-2 italic">Null Session State</p>
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest opacity-60">No clinically pended nodes match your query.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="bg-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-border-theme shadow-sm mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[9px] sm:text-[10px] font-black text-muted uppercase tracking-[0.3em] italic opacity-40">
              Registry Page {currentPage} / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border border-border-theme bg-white dark:bg-card hover:bg-primary-theme/5 hover:border-primary-theme/30 disabled:opacity-20 transition-all font-black"
              >
                <ChevronLeft size={16} className="text-primary-theme" />
              </button>
              
              <div className="hidden sm:flex items-center gap-2">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center border ${
                      currentPage === i + 1
                        ? 'bg-primary-theme text-white border-primary-theme shadow-lg shadow-primary-theme/10 scale-105 z-10'
                        : 'bg-white dark:bg-card border-border-theme text-muted hover:border-primary-theme/30'
                    }`}
                  >
                    {(i + 1).toString().padStart(2, '0')}
                  </button>
                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border border-border-theme bg-white dark:bg-card hover:bg-primary-theme/5 hover:border-primary-theme/30 disabled:opacity-20 transition-all font-black"
              >
                <ChevronRight size={16} className="text-primary-theme" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
