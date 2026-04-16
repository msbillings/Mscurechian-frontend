"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Users,
  Calendar,
  Clock,
  Search,
  Stethoscope,
  ChevronRight,
  Activity,
  AlertCircle,
  Plus,
  RefreshCw,
  CheckCircle2,
  LogIn,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  useHelpdeskDashboard,
  useHelpdeskDoctors,
  useUpdateAppointmentStatus,
  useCheckIn,
  useCheckOut,
  useTodayStatus
} from "@/lib/integrations/hooks";
import { HelpdeskDashboardSkeleton } from "@/components/ui/skeletons";
import { useAuthStore } from "@/stores/authStore";
import { formatLocalTime } from "@/lib/utils/date-utils";

function HelpdeskDashboard() {
  const [activeTab, setActiveTab] = useState('active');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [visitTypeFilter, setVisitTypeFilter] = useState<'all' | 'opd' | 'ipd'>('all');

  // ✅ React Query hooks for real-time updates (backend handles caching with Redis)
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard, isPlaceholderData: isDashboardPlaceholder } = useHelpdeskDashboard();
  const { data: doctorsData, isLoading: doctorsLoading, isPlaceholderData: isDoctorsPlaceholder } = useHelpdeskDoctors();
  const updateStatusMutation = useUpdateAppointmentStatus();

  // ✅ Attendance Hooks for Shift Management
  const { data: attendanceResponse, isLoading: attendanceLoading, refetch: refetchAttendance } = useTodayStatus();
  const todayAttendance = attendanceResponse?.attendance;
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const handleCheckIn = useCallback(async () => {
    try {
      await checkInMutation.mutateAsync(undefined);
      toast.success("Clocked in successfully!");
    } catch (err: any) {
      toast.error(err.message || "Clock-in failed");
    }
  }, [checkInMutation]);

  const handleCheckOut = useCallback(async () => {
    try {
      await checkOutMutation.mutateAsync(undefined);
      toast.success("Clocked out successfully!");
    } catch (err: any) {
      toast.error(err.message || "Clock-out failed");
    }
  }, [checkOutMutation]);

  // ✅ Memoized computed values to prevent unnecessary recalculations
  const allDoctors = useMemo(() => {
    if (!doctorsData) return [];
    // Filter out invalid/placeholder doctor records
    return doctorsData.filter((doc: any) => {
      const name = doc.user?.name || doc.name;
      return name &&
        name.toLowerCase() !== 'unknown' &&
        name.toLowerCase() !== 'unknown doctor' &&
        name.toLowerCase() !== 'unknown physician';
    });
  }, [doctorsData]);

  const appointments = useMemo(() => {
    let list = dashboardData?.appointments || [];

    // Filter by Doctor if selected
    if (selectedDoctorId) {
      list = list.filter((apt: any) => {
        const docId = selectedDoctorId.toString().toLowerCase();
        return (
          (apt.doctorId?.toString().toLowerCase() === docId) ||
          (apt.doctor?._id?.toString().toLowerCase() === docId) ||
          (apt.doctorName?.toString().toLowerCase() === docId) ||
          (apt.doctorName === selectedDoctorId)
        );
      });
    }

    return list;
  }, [dashboardData, selectedDoctorId]);

  const doctorQueues = useMemo(() => {
    const counts: Record<string, { count: number, id: string, specialty?: string }> = {};

    allDoctors.forEach((doc: any) => {
      const name = doc.user?.name || doc.name || "Unknown Doctor";
      counts[name] = {
        count: 0,
        id: doc._id, // Use _id as it's the MongoDB standard
        specialty: doc.specialties?.[0] || doc.department
      };
    });

    const sourceAppointments = dashboardData?.appointments || [];

    sourceAppointments.forEach((apt: any) => {
      const status = apt.status?.toLowerCase();
      if (['booked', 'pending', 'confirmed', 'in-progress'].includes(status)) {
        const docName = apt.doctorName;
        const docId = apt.doctorId || apt.doctor?._id;

        if (docName && docName.toLowerCase() !== 'unknown doctor' && docName.toLowerCase() !== 'unknown physician') {
          let matched = false;

          // Try matching by ID first (most accurate)
          if (docId) {
            const entryById = Object.entries(counts).find(([_, data]) => data.id === docId);
            if (entryById) {
              entryById[1].count++;
              matched = true;
            }
          }

          // Fallback to name match
          if (!matched && counts[docName]) {
            counts[docName].count++;
          }
        }
      }
    });

    return Object.entries(counts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [allDoctors, appointments]);

  // ✅ Search/Sort & Calculate Wait Times
  const waitTimes = useMemo(() => {
    const map: Record<string, string> = {};
    const queues: Record<string, any[]> = {};

    // Create a map of doctor durations for quick lookup
    const doctorDurationMap: Record<string, number> = {};
    if (allDoctors) {
      allDoctors.forEach((doc: any) => {
        // Map both by _id and user._id/user.id/name to be safe
        if (doc._id) doctorDurationMap[doc._id] = doc.consultationDuration || 0;
        if (doc.user?._id) doctorDurationMap[doc.user._id] = doc.consultationDuration || 0;
        if (doc.user?.name) doctorDurationMap[doc.user.name] = doc.consultationDuration || 0;
      });
    }

    // 1. Group active appointments by doctor
    appointments.forEach((apt: any) => {
      // Filter for active statuses (Waiting queue)
      if (['booked', 'pending', 'confirmed', 'scheduled', 'in-progress'].includes(apt.status?.toLowerCase())) {
        // Use doctor ID if available, otherwise fallback to name
        const docId = apt.doctor?._id || apt.doctorId || apt.doctorName;
        if (!docId) return;

        if (!queues[docId]) queues[docId] = [];
        queues[docId].push(apt);
      }
    });

    // 2. Sort queues and assign times
    Object.entries(queues).forEach(([docKey, queue]) => {
      // Sort: Earliest Created -> First in Queue
      queue.sort((a, b) => {
        const tA = new Date(a.createdAt || a.date || 0).getTime();
        const tB = new Date(b.createdAt || b.date || 0).getTime();
        return tA - tB;
      });

      // Get duration for this doctor (default to 0 if not found)
      // docKey could be ID or Name
      const duration = doctorDurationMap[docKey] || 0;

      // Assign time: Index * duration
      queue.forEach((apt, idx) => {
        const totalMins = idx * duration;
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        map[apt._id || apt.id] = h > 0 ? `${h}h ${m}m` : `${m}m`;
      });
    });

    return map;
  }, [appointments, allDoctors]);

  // ✅ Calculated stats based on current view/filter
  const stats = useMemo(() => {
    const rawAppointments = dashboardData?.appointments || [];

    // Define active and completed statuses
    const activeStatStatuses = ['booked', 'pending', 'confirmed', 'in-progress', 'scheduled'];
    const completedStatStatuses = ['completed'];

    // Helper to filter by visit type
    const filterByType = (apt: any) => {
      if (visitTypeFilter === 'all') return true;
      const type = apt.type?.toLowerCase() || 'opd';
      return type === visitTypeFilter.toLowerCase();
    };

    const todayApts = rawAppointments.filter(apt => {
      const status = apt.status?.toLowerCase();
      return (activeStatStatuses.includes(status) || completedStatStatuses.includes(status)) && filterByType(apt);
    });

    const completedApts = rawAppointments.filter(apt => {
      const status = apt.status?.toLowerCase();
      return completedStatStatuses.includes(status) && filterByType(apt);
    });

    return {
      totalPatients: dashboardData?.stats?.totalPatients ?? 0,
      todayPatients: todayApts.length,
      emergencyCases: rawAppointments.filter(a => a.type?.toLowerCase() === 'emergency').length,
      completedToday: completedApts.length,
      hospitalName: (dashboardData?.stats as any)?.hospitalName ?? 'Hospital Main',
    };
  }, [dashboardData, visitTypeFilter]);

  // ✅ Optimized handler with useCallback to prevent re-renders
  const handleRefresh = useCallback(() => {
    refetchDashboard();
  }, [refetchDashboard]);

  // ✅ Socket Integration for real-time updates
  const { user } = useAuthStore?.() || {};

  React.useEffect(() => {
    let mounted = true;

    const setupSocket = async () => {
      if (user?.id) {
        const socketLib = await import("@/lib/integrations/api/socket");
        const { subscribeToSocket, unsubscribeFromSocket, joinSocketRoom } =
          socketLib;

        await joinSocketRoom({
          role: user.role,
          userId: user.id,
          hospitalId: user.hospitalId || (user as any).hospital,
        });

        const handleUpdate = (data: any) => {
          console.log("🔔 Helpdesk Dashboard Update Received:", data);
          if (mounted) refetchDashboard();
        };

        // Subscribe to helpdesk and hospital events
        await subscribeToSocket(`hospital_${user.hospitalId || (user as any).hospital}`, "dashboard:update", handleUpdate);
        await subscribeToSocket(`hospital_${user.hospitalId || (user as any).hospital}`, "appointment_request", handleUpdate);
        await subscribeToSocket(`helpdesk_${user.id}`, "appointment:updated", handleUpdate);

        return () => {
          unsubscribeFromSocket(`hospital_${user.hospitalId || (user as any).hospital}`, "dashboard:update", handleUpdate);
          unsubscribeFromSocket(`hospital_${user.hospitalId || (user as any).hospital}`, "appointment_request", handleUpdate);
          unsubscribeFromSocket(`helpdesk_${user.id}`, "appointment:updated", handleUpdate);
        };
      }
    };

    setupSocket();

    return () => {
      mounted = false;
    };
  }, [user, refetchDashboard]);

  const handleUpdateStatus = useCallback(async (appointmentId: string, status: string) => {
    try {
      await updateStatusMutation.mutateAsync({ appointmentId, status });
      toast.success("Appointment sent to doctor");
    } catch (err: any) {
      toast.error("Update Failed");
    }
  }, [updateStatusMutation]);

  // ✅ Only show skeleton on true initial load (not on cached data)
  const showSkeleton = (dashboardLoading && !dashboardData) || (doctorsLoading && !doctorsData);

  if (showSkeleton) {
    return <HelpdeskDashboardSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-150">


      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3 max-w-full mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Front Desk Dashboard
          </h1>
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">CureChain Health / Front Desk Portal</p>
        </div>

        {/* GLOWING MESSAGE - HEADER CENTER */}
        <div className="hidden md:flex items-center justify-center">
          <p className="text-xs font-bold text-teal-600 uppercase tracking-widest" style={{ animation: 'glow 2s ease-in-out infinite' }}>
            ✨ Your data is storing continuously
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* ATTENDANCE CONTROLS */}
          <div className="flex items-center gap-2 mr-2 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-inner">
            {!todayAttendance?.checkIn ? (
              <button
                onClick={handleCheckIn}
                disabled={checkInMutation.isPending || attendanceLoading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-md active:scale-95 disabled:opacity-50 transition-all border border-emerald-500/20"
              >
                {checkInMutation.isPending ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <LogIn size={14} strokeWidth={3} />
                )}
                Clock In
              </button>
            ) : !todayAttendance?.checkOut ? (
              <div className="flex items-center gap-2">
                <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest tabular-nums">
                    {todayAttendance?.checkIn?.time ? new Date(todayAttendance.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </span>
                </div>
                <button
                  onClick={handleCheckOut}
                  disabled={checkOutMutation.isPending || attendanceLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 shadow-md active:scale-95 disabled:opacity-50 transition-all border border-rose-500/20"
                >
                  {checkOutMutation.isPending ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <LogOut size={14} strokeWidth={3} />
                  )}
                  Clock Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-300/50">
                <CheckCircle2 size={14} strokeWidth={3} />
                Shift Ended
              </div>
            )}
          </div>

          {/* Global Search/Filter Indicator */}
          {selectedDoctorId && (
            <button
              onClick={() => setSelectedDoctorId(null)}
              className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-rose-100 animate-pulse hover:bg-rose-100"
            >
              Reset Doctor Filter
            </button>
          )}
          <button
            onClick={handleRefresh}
            className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-teal-600 shadow-sm active:scale-95"
            aria-label="Refresh Dashboard"
          >
            <RefreshCw size={16} />
          </button>
          <Link
            href="/helpdesk/patient-registration"
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-teal-700 shadow-lg shadow-teal-900/20"
          >
            <Plus size={16} /> Register Patient
          </Link>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-full mx-auto">
        <StatCard
          icon={<Users size={16} />}
          title="Total Patients"
          value={stats.totalPatients || 0}
          trend="In Registry"
          color="slate"
        />
        <StatCard
          icon={<Calendar size={16} />}
          title="Today's"
          value={stats.todayPatients || 0}
          trend="Live Now"
          color="teal"
          typeFilter={visitTypeFilter}
          onTypeChange={setVisitTypeFilter}
        />
        <StatCard
          icon={<AlertCircle size={16} />}
          title="Emergency"
          value={stats.emergencyCases || 0}
          trend="Critical"
          color="rose"
        />
        <StatCard
          icon={<CheckCircle2 size={16} />}
          title="Completed"
          value={stats.completedToday || 0}
          trend="Discharged"
          color="emerald"
          typeFilter={visitTypeFilter}
          onTypeChange={setVisitTypeFilter}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-12 gap-4 items-start max-w-full mx-auto">

        {/* DOCTOR QUEUES (LEFT SIDE) */}
        <div className="md:col-span-1 lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Doctors</h2>
              {/* Specialized "All" Button at header level */}
              <button
                onClick={() => setSelectedDoctorId(null)}
                className={`flex items-center justify-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all shadow-sm border ${!selectedDoctorId
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                  : 'bg-white text-slate-400 border-slate-200 hover:text-teal-600 hover:border-teal-200'
                  }`}
                title="Clear Doctor Filter"
              >
                All
              </button>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg uppercase tracking-widest border border-teal-100">
              Live Tracker
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 h-[380px] overflow-y-auto pr-2 custom-scrollbar">
            {doctorQueues.length > 0 ? doctorQueues.map((doc, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedDoctorId(selectedDoctorId === (doc.id || doc.name) ? null : (doc.id || doc.name))}
                className={`w-full text-left p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between group cursor-pointer ${selectedDoctorId === (doc.id || doc.name)
                  ? 'border-teal-500 bg-teal-50/30 ring-1 ring-teal-500/20 shadow-md'
                  : 'bg-white border-slate-200 shadow-sm hover:border-teal-400'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${selectedDoctorId === (doc.id || doc.name) ? 'bg-teal-600 text-white' :
                    doc.count > 0 ? 'bg-teal-50 text-teal-600' : 'bg-slate-50 text-slate-300'
                    }`}>
                    <Stethoscope size={16} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 uppercase max-w-[300px]">{doc.name}</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                      {doc.specialty || "General Medicine"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <div className={`text-2xl font-bold tabular-nums ${doc.count > 3 ? 'text-rose-600' : doc.count > 0 ? 'text-teal-600' : 'text-slate-200'
                    }`}>
                    {doc.count}
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Waiting</span>
                </div>
              </button>
            )) : (
              <div className="bg-slate-50/50 p-12 rounded-[32px] border border-dashed border-slate-200 text-center">
                <Stethoscope className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">No Doctors Available</p>
              </div>
            )}
          </div>
        </div>

        {/* APPOINTMENT LIST (RIGHT SIDE) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[425px]">

            {/* TABS & SEARCH */}
            <div className="p-2.5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ${activeTab === 'active' ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20' : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    Waiting
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ${activeTab === 'history' ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20' : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    History
                  </button>
                </div>
              </div>
            </div>

            {/* LIST CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-50 px-2">
              {appointments.filter(a => activeTab === 'history' ? ['completed', 'cancelled', 'no-show', 'rejected'].includes(a.status?.toLowerCase()) : !['completed', 'cancelled', 'no-show', 'rejected'].includes(a.status?.toLowerCase())).length > 0 ? (
                <>
                  <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <div className="col-span-1 border-r border-slate-100">#</div>
                    <div className="col-span-3">Patient Details</div>
                    <div className="col-span-1 text-center whitespace-nowrap">Time</div>
                    <div className="col-span-1 text-center">Type</div>
                    <div className="col-span-3">Assigned Doctor</div>
                    <div className="col-span-3 text-right pr-2">Status</div>
                  </div>
                  {appointments
                    .filter(a => activeTab === 'history' ? ['completed', 'cancelled', 'no-show', 'rejected'].includes(a.status?.toLowerCase()) : !['completed', 'cancelled', 'no-show', 'rejected'].includes(a.status?.toLowerCase()))
                    .map((apt, idx) => (
                      <div key={idx} className="p-3 grid grid-cols-1 sm:grid-cols-12 items-center gap-3 hover:bg-slate-50 group rounded-xl">
                        <div className="col-span-1 border-r border-slate-100">
                          <span className="text-xs font-black text-slate-300">{(idx + 1).toString().padStart(2, '0')}</span>
                        </div>

                        <div className="col-span-3 flex items-center gap-4 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${apt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-900 text-white group-hover:scale-105'
                            }`}>
                            {(apt.patientName || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight truncate">
                              {apt.patientName || "Unknown Patient"}
                            </h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              MRN: {(apt as any).mrn || 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="col-span-1 flex justify-center">
                          <span className="text-[9px] font-black uppercase tracking-tight text-slate-400">
                            {formatLocalTime(apt.createdAt, apt.time || "N/A")}
                          </span>
                        </div>

                        <div className="col-span-1 flex justify-center">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest inline-block ${(apt as any).type === 'EMERGENCY' ? 'bg-rose-50 text-rose-600 border border-rose-100' : (apt as any).type === 'IPD' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                            {(apt as any).type || 'OPD'}
                          </span>
                        </div>

                        <div className="col-span-3 min-w-0">
                          <div className="flex items-center gap-2">
                            <Stethoscope size={16} className="text-slate-400 shrink-0" />
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight truncate">
                              {apt.doctorName || "Pending Assign"}
                            </span>
                          </div>
                        </div>

                        <div className="col-span-3 flex items-center gap-3 justify-end">
                          {['Booked', 'pending'].includes(apt.status) ? (
                            <button
                              onClick={() => handleUpdateStatus((apt as any).id || (apt as any)._id, 'confirmed')}
                              className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-teal-700 shadow-md active:scale-95"
                            >
                              Send
                            </button>
                          ) : (
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${apt.status?.toLowerCase() === 'confirmed' ? 'bg-teal-50 text-teal-600 border-teal-100' :
                              apt.status?.toLowerCase() === 'in-progress' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                apt.status?.toLowerCase() === 'Completed' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-slate-50 text-slate-400 border-slate-100'
                              }`}>
                              {apt.status?.toLowerCase() === 'confirmed' ? (
                                <><CheckCircle2 size={12} /> Waiting</>
                              ) : apt.status?.toLowerCase() === 'in-progress' ? (
                                <><Activity size={12} className="animate-pulse" /> Waiting</>
                              ) : apt.status.toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-20 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mb-6 border border-slate-100">
                    <Activity size={32} className="text-slate-200" />
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">No Appointments</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 tracking-widest">Everything is clear on the schedule</p>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="p-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between px-6">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">System Status: Online</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Facility: {stats.hospitalName || "Hospital Main"}</p>
            </div>
          </div>
        </div>

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
        
        @keyframes glow {
          0%, 100% {
            text-shadow: 0 0 5px rgba(13, 148, 136, 0.5), 0 0 10px rgba(13, 148, 136, 0.3);
            opacity: 1;
          }
          50% {
            text-shadow: 0 0 10px rgba(13, 148, 136, 0.8), 0 0 20px rgba(13, 148, 136, 0.5);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}

const colors = {
  teal: "bg-teal-600 text-white shadow-teal-500/10",
  slate: "bg-slate-900 text-white shadow-slate-900/10",
  rose: "bg-rose-600 text-white shadow-rose-500/10",
  emerald: "bg-emerald-600 text-white shadow-emerald-500/10"
} as const;

const StatCard = React.memo(function StatCard({ icon, title, value, trend, color, typeFilter, onTypeChange }: {
  icon: React.ReactElement;
  title: string;
  value: string | number;
  trend?: string;
  color: keyof typeof colors;
  typeFilter?: 'all' | 'opd' | 'ipd';
  onTypeChange?: (type: 'all' | 'opd' | 'ipd') => void;
}) {

  return (
    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm group flex flex-col gap-3 hover:border-teal-500/30 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]} group-hover:scale-110 shadow-lg transition-transform`}>
          {React.cloneElement(icon as React.ReactElement<any>, { size: 16, strokeWidth: 3 })}
        </div>
        {/* OPD/IPD Toggle */}
        {onTypeChange && (
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shadow-inner">
            {(['all', 'opd', 'ipd'] as const).map((type) => (
              <button
                key={type}
                onClick={(e) => {
                  e.stopPropagation();
                  onTypeChange(type);
                }}
                className={`px-1.5 py-0.5 text-[7px] font-black uppercase rounded-md transition-all ${typeFilter === type
                  ? 'bg-white text-teal-600 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1 text-[7px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded uppercase border border-teal-100">
            <Activity size={8} /> Live
          </div>


        </div>
      </div>
      <div>
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{title}</p>
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-bold text-slate-900 tabular-nums tracking-tight">{value}</h3>
          <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{trend}</p>
        </div>
      </div>
    </div>
  );
});

export default React.memo(HelpdeskDashboard);
