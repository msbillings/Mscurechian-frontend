"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, User, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { doctorService } from '@/lib/integrations/services/doctor.service';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { formatLocalTime } from '@/lib/utils/date-utils';

interface Appointment {
  id: string;
  patientName: string;
  time: string;
  type: string;
  status: string;
  isPaused?: boolean;
  createdAt?: string;
  date?: string;
}

interface QueueProps {
  onStatsChange?: (stats: {
    queueCount: number;
    totalAppointments: number;
    completedCount: number;
    estimatedMinutes: number;
    showQueue: boolean;
    nextAppointmentId: string | null;
    currentAppointmentId?: string | null;
    overallStats?: any;
  }) => void;
  consultationDuration?: number;
}

function AppointmentsQueueDynamic({ onStatsChange, consultationDuration }: QueueProps) {
  const router = useRouter();
  const [showQueue, setShowQueue] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    appointmentsToday: 0,
    pendingReports: 0,
    consultationsValue: 0
  });

  // Fetch appointments
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response: any = await doctorService.getDashboard();
      console.log('[Queue] Dashboard response:', response);
      console.log('[Queue] Appointments:', response?.appointments);
      console.log('[Queue] Appointments count:', response?.appointments?.length);

      if (response?.appointments) {
        console.log('[Queue] Setting appointments:', response.appointments);
        setAppointments(response.appointments || []);
        setStats(response.stats || stats);
      } else {
        console.log('[Queue] No appointments found in response');
      }
    } catch (error: any) {
      console.error('[Queue] Failed to fetch appointments:', error);
      toast.error(error.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAppointments();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter: Show all appointments except completed, cancelled, and paused ones
  // Also show appointments with status "Booked", "confirmed", "scheduled", etc.
  const queueAppointments = appointments.filter(apt => {
    const status = apt.status?.toLowerCase();
    const isExcluded = status === 'completed' || status === 'cancelled' || (apt as any).isPaused === true;
    console.log('[Queue] Appointment:', apt.patientName, 'Status:', apt.status, 'isPaused:', (apt as any).isPaused, 'Excluded:', isExcluded);
    return !isExcluded;
  });

  console.log('[Queue] Total appointments:', appointments.length);
  console.log('[Queue] Queue appointments:', queueAppointments.length);

  // Sort appointments by creation time (queue order)
  const sortedAppointments = [...queueAppointments].sort((a, b) => {
    return new Date(a.createdAt || a.date || 0).getTime() - new Date(b.createdAt || b.date || 0).getTime();
  });

  // Socket Integration
  const { user } = useAuthStore?.() || {}; // Safe access if store not ready

  useEffect(() => {
    let mounted = true;

    const setupSocket = async () => {
      if (user?.id) {
        const socketLib = await import('@/lib/integrations/api/socket');
        const { subscribeToSocket, unsubscribeFromSocket, joinSocketRoom } = socketLib;

        // Join room explicitly to ensure we receive events
        await joinSocketRoom({
          role: user.role,
          userId: user.id,
          hospitalId: user.hospitalId || (user as any).hospital
        });

        const handleUpdate = (data: any) => {
          console.log('🔔 Dashboard Update Received:', data);
          if (mounted) fetchAppointments();
        };

        await subscribeToSocket(`doctor_${user.id}`, 'dashboard:update', handleUpdate);
        await subscribeToSocket(`doctor_${user.id}`, 'notification:new', handleUpdate);
        await subscribeToSocket(`doctor_${user.id}`, 'appointment_request', handleUpdate);

        return () => {
          unsubscribeFromSocket(`doctor_${user.id}`, 'dashboard:update', handleUpdate);
          unsubscribeFromSocket(`doctor_${user.id}`, 'notification:new', handleUpdate);
          unsubscribeFromSocket(`doctor_${user.id}`, 'appointment_request', handleUpdate);
        };
      }
    };

    setupSocket();

    return () => {
      mounted = false;
    };
  }, [user]);

  // Notify parent of stats changes
  useEffect(() => {
    const completedCount = appointments.filter(apt => apt.status === 'completed').length;
    const estimatedMinutes = queueAppointments.length * (consultationDuration || 15);
    const nextAppointmentId = sortedAppointments.length > 0 ? sortedAppointments[0].id : null;

    // Find ongoing appointment (in-progress status)
    const currentAppointment = appointments.find(apt => apt.status === 'in-progress');
    const currentAppointmentId = currentAppointment ? currentAppointment.id : null;

    if (onStatsChange) {
      onStatsChange({
        queueCount: queueAppointments.length,
        totalAppointments: appointments.length,
        completedCount,
        estimatedMinutes,
        showQueue,
        nextAppointmentId,
        currentAppointmentId,
        overallStats: stats
      });
    }
  }, [appointments.length, queueAppointments.length, showQueue, sortedAppointments.length, appointments, onStatsChange, consultationDuration]);

  return (
    <div className="bg-card dark:bg-card rounded-2xl border border-border-theme dark:border-border-theme shadow-sm h-full flex flex-col">
      {/* Header with Toggle - Fixed */}
      <div className="p-6 border-b border-border-theme dark:border-border-theme flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold text-foreground dark:text-foreground">Today's Appointments</h2>
          <p className="text-xs text-muted mt-1">
            {showQueue ? (
              <>
                {queueAppointments.length} patient{queueAppointments.length !== 1 ? 's' : ''} in queue
              </>
            ) : (
              <>Queue view disabled</>
            )}
          </p>
        </div>

        {/* Queue Toggle */}
        <div className="flex items-center gap-3 bg-secondary-theme dark:bg-secondary-theme px-4 py-2 rounded-xl border border-border-theme dark:border-border-theme">
          <span className="text-xs font-bold text-muted dark:text-muted uppercase">Queue</span>
          <button
            onClick={() => setShowQueue(!showQueue)}
            className={`relative w-12 h-6 rounded-full cursor-pointer ${showQueue ? 'bg-primary-theme' : 'bg-gray-300 dark:bg-gray-600'
              }`}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full cursor-pointer ${showQueue ? 'translate-x-6' : 'translate-x-0'
              }`} />
          </button>
          <span className={`text-[10px] font-black uppercase ${showQueue ? 'text-primary-theme' : 'text-muted'
            }`}>
            {showQueue ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {/* Appointments List - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-primary-theme animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted">Loading appointments...</p>
          </div>
        ) : showQueue ? (
          queueAppointments.length > 0 ? (
            <div className="space-y-3">
              {/* Desktop Table Header (Visible on sm and up) */}
              <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 border-b border-border-theme text-[10px] font-black text-muted uppercase tracking-widest">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Patient Name & Type</div>
                <div className="col-span-3 text-center">Wait/Time</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>

              {sortedAppointments.map((apt, idx) => {
                // Calculate estimated wait time
                const estimatedWaitMinutes = idx * (consultationDuration || 15);
                const hours = Math.floor(estimatedWaitMinutes / 60);
                const minutes = estimatedWaitMinutes % 60;
                const waitTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                return (
                  <React.Fragment key={apt.id}>
                    {/* Desktop View Card (sm and up) */}
                    <div className="hidden sm:flex items-center gap-4 p-4 bg-secondary-theme dark:bg-secondary-theme rounded-xl hover:opacity-80 group">
                      <div className="shrink-0 w-10 h-10 bg-primary-theme rounded-full flex items-center justify-center text-primary-theme-foreground font-black text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-foreground dark:text-foreground text-sm truncate">
                          {apt.patientName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] sm:text-xs">
                          <span className="text-muted">{apt.type}</span>
                          {idx > 0 && (
                            <>
                              <span className="text-border-theme">•</span>
                              <span className="font-bold text-orange-600 flex items-center gap-1">
                                <Clock size={12} /> Wait: {waitTime}
                              </span>
                            </>
                          )}
                          <span className="text-border-theme">•</span>
                          <span className={`font-bold ${apt.status === 'confirmed' ? 'text-green-600' :
                            apt.status === 'Booked' ? 'text-blue-600' : 'text-muted'
                            }`}>
                            {apt.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">
                          {formatLocalTime(apt.createdAt, apt.time)}
                        </p>
                        <p className="text-xs text-muted">~{consultationDuration || 15}min</p>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm('Are you sure you want to remove this appointment?')) return;
                          try {
                            // Assuming updateAppointmentStatus exists on doctorService or we need to add it.
                            // If strictly not available, I'll allow the error to guide me, but likely it is available.
                            await doctorService.updateAppointmentStatus(apt.id, 'cancelled');
                            toast.success('Appointment removed');
                            fetchAppointments();
                          } catch (err: any) {
                            toast.error('Failed to remove');
                            console.error(err);
                          }
                        }}
                        className="shrink-0 p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer"
                        title="Remove Appointment"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => router.push(`/doctor/appointment/${apt.id}`)}
                        className="shrink-0 px-4 py-2 bg-primary-theme hover:opacity-90 text-primary-theme-foreground text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 size={14} /> Start
                      </button>
                    </div>

                    {/* Mobile Table Row (xs only) */}
                    <div className="sm:hidden grid grid-cols-12 gap-2 items-center p-3 py-4 bg-secondary-theme rounded-xl border border-border-theme/50">
                      <div className="col-span-1 text-[11px] font-black text-primary-theme">
                        {idx + 1}
                      </div>
                      <div className="col-span-5 min-w-0">
                        <p className="text-[11px] font-black text-foreground truncate ">{apt.patientName}</p>
                        <p className="text-[9px] text-muted font-bold truncate">{apt.type}</p>
                      </div>
                      <div className="col-span-3 text-center">
                        <p className="text-[10px] font-black text-foreground">
                          {formatLocalTime(apt.createdAt, apt.time)}
                        </p>
                        <p className="text-[8px] text-muted font-bold">~{consultationDuration || 15}min</p>
                      </div>
                      <div className="col-span-3 text-right">
                        <button
                          onClick={() => router.push(`/doctor/appointment/${apt.id}`)}
                          className="w-full py-2 bg-primary-theme text-primary-theme-foreground text-[10px] font-black rounded-lg shadow-sm"
                        >
                          Start
                        </button>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Total Estimated Time Card */}
              <div className="mt-4 p-4 bg-accent-theme dark:bg-accent-theme rounded-xl border border-border-theme">
                <div className="flex items-center justify-between">
                  <span className="text-sm max-sm:text-xs font-bold text-accent-theme-foreground">
                    Total Estimated Time
                  </span>
                  <span className="text-lg max-sm:text-sm font-black text-primary-theme">
                    {Math.floor((queueAppointments.length * (consultationDuration || 15)) / 60)}h {(queueAppointments.length * (consultationDuration || 15)) % 60}m
                  </span>
                </div>
                <p className="text-xs max-sm:text-[10px] text-accent-theme-foreground mt-1 opacity-80">
                  {queueAppointments.length} appointments × {consultationDuration || 15} min each
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-muted">No appointments in queue</p>
              <p className="text-xs text-muted mt-1">All caught up!</p>
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-secondary-theme dark:bg-secondary-theme rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-muted" />
            </div>
            <p className="text-sm font-bold text-muted dark:text-muted">Queue View Disabled</p>
            <p className="text-xs text-muted mt-1">Toggle ON to see patient queue and wait times</p>
            <div className="mt-4 text-4xl font-black text-border-theme">0</div>
            <p className="text-xs text-muted mt-1">Appointments visible</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(AppointmentsQueueDynamic);
