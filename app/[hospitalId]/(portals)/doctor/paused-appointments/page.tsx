"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Clock, User, AlertCircle, Loader2, Timer, Pause, Activity, ArrowLeft, Search, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doctorService } from '@/lib/integrations/services/doctor.service';

export default function PausedAppointmentsPage() {
  const router = useRouter();
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
      router.push(`/doctor/appointment/${appointmentId}`);
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
      <div className="flex items-center justify-center min-h-[calc(100vh-16rem)] bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-sm font-bold text-muted uppercase tracking-wider">Loading paused consultations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8 pt-10 pb-12">
      {/* Header Section */}
      <div className="bg-card rounded-2xl p-6 border border-border-theme shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-theme/10 rounded-xl flex items-center justify-center">
            <Pause className="text-primary-theme" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Paused Consultations</h1>
            <p className="text-sm text-muted">
              {pausedAppointments.length} sessions currently on hold
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              placeholder="Search patient name or MRN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary-theme border border-border-theme rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-theme/20 transition-all"
            />
          </div>
          
          <button
            onClick={() => router.push('/doctor')}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-muted hover:text-foreground hover:bg-secondary-theme rounded-xl transition-colors border border-border-theme w-full sm:w-auto shrink-0"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-card rounded-2xl border border-border-theme shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary-theme/50 border-b border-border-theme">
                <th className="px-6 py-4 text-[11px] font-black text-muted uppercase tracking-widest w-16">#</th>
                <th className="px-6 py-4 text-[11px] font-black text-muted uppercase tracking-widest">Patient Details</th>
                <th className="px-6 py-4 text-[11px] font-black text-muted uppercase tracking-widest text-center">Active Time</th>
                <th className="px-6 py-4 text-[11px] font-black text-muted uppercase tracking-widest text-center">Paused For</th>
                <th className="px-6 py-4 text-[11px] font-black text-muted uppercase tracking-widest">Paused At</th>
                <th className="px-6 py-4 text-[11px] font-black text-muted uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-theme">
              {paginatedData.length > 0 ? (
                paginatedData.map((appointment, index) => (
                  <tr key={appointment._id} className="hover:bg-secondary-theme/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-muted">{(currentPage - 1) * itemsPerPage + index + 1}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary-theme/5 rounded-full flex items-center justify-center border border-primary-theme/10">
                          <User size={18} className="text-primary-theme" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {appointment.patient?.name || 'Unknown'}
                          </p>
                          <p className="text-[10px] font-black text-primary-theme uppercase tracking-wider">
                            MRN: {appointment.patient?.mrn || appointment.mrn || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <Timer size={12} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                          {appointment.consultationStartTime && appointment.pausedAt
                            ? formatElapsedTime(appointment.pausedAt, appointment.consultationStartTime)
                            : '0:00'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                        <Clock size={12} className="text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                          {formatPausedDuration(
                            Math.floor((Date.now() - new Date(appointment.pausedAt).getTime()) / 1000)
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-foreground">
                        {appointment.pausedAt ? formatDateTime(appointment.pausedAt) : 'N/A'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleResumeConsultation(appointment._id)}
                          disabled={resuming === appointment._id || deleting === appointment._id}
                          className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-theme hover:bg-primary-theme/90 text-primary-theme-foreground rounded-lg text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
                        >
                          {resuming === appointment._id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Play size={12} fill="currentColor" />
                          )}
                          Resume
                        </button>
                        <button
                          onClick={() => handleDeleteAppointment(appointment._id)}
                          disabled={resuming === appointment._id || deleting === appointment._id}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete Appointment"
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
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="max-w-xs mx-auto">
                      <AlertCircle className="w-10 h-10 text-muted mx-auto mb-4 opacity-20" />
                      <p className="text-sm font-bold text-foreground mb-1">No appointments found</p>
                      <p className="text-xs text-muted">Try adjusting your search terms</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border-theme flex items-center justify-between bg-secondary-theme/20">
            <p className="text-xs text-muted font-medium">
              Showing <span className="font-bold text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-bold text-foreground">
                {Math.min(currentPage * itemsPerPage, filteredAppointments.length)}
              </span> of{' '}
              <span className="font-bold text-foreground">{filteredAppointments.length}</span> results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-border-theme hover:bg-secondary-theme disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      currentPage === i + 1
                        ? 'bg-primary-theme text-primary-theme-foreground shadow-md'
                        : 'hover:bg-secondary-theme text-muted'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-border-theme hover:bg-secondary-theme disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
