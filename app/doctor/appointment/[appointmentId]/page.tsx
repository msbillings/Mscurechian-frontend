"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Clock, FileText, Beaker, CheckCircle, Loader2, User, Pause, 
  Activity, Calendar, Heart, Thermometer, Droplets, Scale, ArrowsUpFromLine,
  History, Stethoscope, ClipboardList, Send, ArrowLeft, MoreHorizontal,
  ChevronRight, AlertCircle, Phone, MapPin, Search, Building, Bed
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doctorService } from '@/lib/integrations/services/doctor.service';
import { getSocket, joinSocketRoom } from '@/lib/integrations/api/socket';
import { useAuthStore } from '@/stores/authStore';
import { useQueryClient } from '@tanstack/react-query';

interface ConsultationPageProps {
  params: Promise<{
    appointmentId: string;
  }>;
}

export default function ConsultationPage({ params }: ConsultationPageProps) {
  const router = useRouter();
  const { appointmentId } = use(params);
  
  // State
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'consultation' | 'history'>('consultation');
  const [historySubTab, setHistorySubTab] = useState<'visits' | 'prescriptions' | 'labs'>('visits');
  const [patientHistory, setPatientHistory] = useState<{
    visits: any[];
    prescriptions: any[];
    reports: any[];
  } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Clinical Notes State
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [plan, setPlan] = useState('');
  const [wantsLabToken, setWantsLabToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const hasCompletedLabs = appointment?.labResults?.some((order: any) => order.status === 'completed');
  const isPrescriptionRestricted = wantsLabToken && !hasCompletedLabs;

  // Fetch appointment details
  const fetchAppointment = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await doctorService.startConsultation(appointmentId);
      setAppointment(data.appointment);
      
      // Update local states only on initial load or if they were empty
      if (showLoading || (!diagnosis && data.appointment.diagnosis)) setDiagnosis(data.appointment.diagnosis || '');
      if (showLoading || (!clinicalNotes && data.appointment.clinicalNotes)) setClinicalNotes(data.appointment.clinicalNotes || '');
      if (showLoading || (!plan && data.appointment.plan)) setPlan(data.appointment.plan || '');
    } catch (error: any) {
      if (showLoading) toast.error(error.message || 'Failed to load appointment');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment(true);
  }, [appointmentId]);

  // Real-time Lab Updates via Socket.IO
  useEffect(() => {
    let socket: any;
    
    const setupSocket = async () => {
      socket = await getSocket();
      if (!socket) return;

      // Join doctor and hospital rooms for updates
      if (user) {
        joinSocketRoom({
          role: user.role,
          userId: user.id || (user as any)._id,
          hospitalId: user.hospitalId || (appointment as any)?.hospital?._id || (appointment as any)?.hospital
        });
      }

      // If we have a patient, subscribe to their specific room for vitals
      if (appointment?.patient?._id) {
        socket.emit('subscribe-patient', appointment.patient._id);
        console.log(`📡 [Consultation] Subscribed to patient ${appointment.patient._id} for live vitals`);
      }

      console.log('📡 [Consultation] Listening for live lab updates...');

      // Listen for specific order updates
      socket.on('lab_order_updated', (data: any) => {
        console.log('📡 [Consultation] Lab Order Update Received:', data);
        // We refresh if any order is updated, as it might belong to this appointment
        // We do a background refresh (no loading state)
        fetchAppointment(false);
      });

      // Listen for sample collection
      socket.on('sample_collected', (data: any) => {
        console.log('📡 [Consultation] Sample Collected:', data);
        fetchAppointment(false);
      });

      // Listen for doctor-specific results ready notifications
      socket.on('lab_result_notification', (data: any) => {
        console.log('📡 [Consultation] Lab Result Ready:', data);
        fetchAppointment(false);
        toast.success(`Lab result ready for ${appointment?.patient?.name || 'patient'}`);
      });
    };

    setupSocket();

    return () => {
      if (socket) {
        socket.off('lab_order_updated');
        socket.off('sample_collected');
        socket.off('lab_result_notification');
        if (appointment?.patient?._id) {
           socket.emit('unsubscribe-patient', appointment.patient._id);
        }
      }
    };
  }, [appointmentId, appointment?.patient?.name]);

  // Handle initial state of lab mode if results exist
  useEffect(() => {
    if (appointment?.labResults && appointment.labResults.length > 0) {
      setWantsLabToken(true);
    }
  }, [appointment]);

  // Auto-save logic
  useEffect(() => {
    if (loading) return;

    const saveDraft = async () => {
      try {
        setIsAutoSaving(true);
        await doctorService.saveConsultationDraft(appointmentId, {
          diagnosis,
          clinicalNotes,
          plan
        });
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsAutoSaving(false);
      }
    };

    const timer = setTimeout(() => {
      // Check if there's actually something to save
      if (diagnosis !== appointment?.diagnosis || clinicalNotes !== appointment?.clinicalNotes || plan !== appointment?.plan) {
         saveDraft();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [diagnosis, clinicalNotes, plan, appointmentId, loading, appointment]);

  // Timer logic
  useEffect(() => {
    if (!appointment?.consultationStartTime) return;

    const start = new Date(appointment.consultationStartTime).getTime();
    const pausedDurationMs = (appointment.pausedDuration || 0) * 1000;

    const timer = setInterval(() => {
      const totalElapsed = Date.now() - start;
      const activeElapsed = Math.max(0, totalElapsed - pausedDurationMs);
      setElapsedTime(Math.floor(activeElapsed / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [appointment?.consultationStartTime, appointment?.pausedDuration]);

  const fetchPatientHistory = async () => {
    if (!appointment?.patient?._id) return;
    try {
      setLoadingHistory(true);
      const data = await doctorService.getPatientDetails(appointment.patient._id);
      
      // Filter out CURRENT appointment from history
      const visits = (data.history || []).filter((v: any) => v._id !== appointmentId);
      
      setPatientHistory({
        visits,
        prescriptions: data.prescriptions || [],
        reports: data.reports || [],
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to load patient history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && patientHistory === null) {
      fetchPatientHistory();
    }
  }, [activeTab, patientHistory, appointment]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndConsultation = async () => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      await doctorService.endConsultation(appointmentId, { 
        duration: elapsedTime,
        diagnosis,
        clinicalNotes,
        plan
      });
      toast.success('Consultation completed successfully!');
      window.location.href = '/doctor';
    } catch (error: any) {
      toast.error(error.message || 'Failed to end consultation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePauseConsultation = async () => {
    try {
      await doctorService.pauseConsultation(appointmentId);
      toast.success('Consultation paused');
      router.push('/doctor/paused-appointments');
    } catch (error: any) {
      toast.error(error.message || 'Failed to pause consultation');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-950">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-theme/20 border-t-primary-theme rounded-full animate-spin"></div>
          <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-theme animate-pulse" size={24} />
        </div>
        <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse tracking-wide uppercase">Initializing Consultation Workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950">
      {/* Header */}
      <header className="z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-border-theme px-3 sm:px-6 py-3 sm:py-4">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="h-10 w-px bg-border-theme mx-1 hidden sm:block" />
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 bg-primary-theme/10 rounded-xl flex items-center justify-center shrink-0">
                <User className="text-primary-theme" size={20} />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-bold text-foreground truncate">
                  {appointment?.patient?.name || 'In Consultation'}
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                    MRN: {appointment?.patient?.mrn || appointment?.mrn || 'N/A'}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span className="text-[10px] font-bold text-primary-theme uppercase tracking-widest whitespace-nowrap">
                    {appointment?.type || 'Consultation'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
            <div className="flex items-center gap-2 bg-gray-100/50 dark:bg-gray-800/50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-border-theme">
              <Clock className="text-primary-theme animate-pulse shrink-0" size={16} />
              <span className="text-sm sm:text-lg font-black text-primary-theme tabular-nums">
                {formatTime(elapsedTime)}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handlePauseConsultation}
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all border border-amber-200 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Pause size={14} className="shrink-0" /> 
                <span className="hidden sm:inline">Pause</span>
              </button>
              <button
                onClick={handleEndConsultation}
                disabled={isSubmitting}
                className="px-2 sm:px-5 py-1.5 sm:py-2 bg-primary-theme hover:bg-primary-theme/90 text-primary-theme-foreground rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-primary-theme/20 flex items-center gap-1.5 whitespace-nowrap"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin shrink-0" /> : <CheckCircle size={14} className="shrink-0" />}
                <span className="hidden sm:inline">Complete Session</span>
                <span className="sm:hidden">Complete</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 pt-6 max-w-[1600px] mx-auto grid grid-cols-12 gap-8">
        {/* Left Sidebar - Patient Context */}
        <aside className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-6">
          {/* Patient Quick Card */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-border-theme shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 -mt-6 -mr-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
              <User size={120} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 bg-primary-theme/10 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl font-black text-primary-theme uppercase">
                    {(appointment?.patient?.name || 'P').charAt(0)}
                  </span>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  appointment?.status === 'in-progress' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20' : 'bg-gray-100 text-gray-700 dark:bg-gray-800'
                }`}>
                  {appointment?.status || 'Active'}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                      {(appointment?.patient?.honorific || '')} {appointment?.patient?.name}
                    </h3>
                    {appointment?.ipdDetails && (
                      <span className="bg-primary-theme/10 text-primary-theme text-[9px] font-black px-2 py-0.5 rounded-md uppercase border border-primary-theme/20">
                        IPD
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-muted-foreground mt-1 flex items-center gap-2">
                    <User size={12} /> {appointment?.patient?.age || 'N/A'} yrs • {appointment?.patient?.gender || 'N/A'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Blood Group</p>
                    <p className="text-sm font-black text-rose-500">{appointment?.patient?.bloodGroup || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Payment Status</p>
                    <p className="text-sm font-black text-emerald-500">PAID</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 col-span-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">MRN Number</p>
                    <p className="text-sm font-black text-primary-theme uppercase tracking-tight">
                      {appointment?.patient?.mrn || appointment?.mrn || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3 text-xs">
                    <Phone size={14} className="text-muted-foreground" />
                    <span className="font-medium">{appointment?.patient?.mobile || 'N/A'}</span>
                  </div>
                  {appointment?.patient?.emergencyContact && (
                    <div className="flex items-center gap-3 text-xs">
                      <Phone size={14} className="text-rose-500" />
                      <span className="font-medium text-rose-600">SOS: {appointment?.patient?.emergencyContact}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs">
                    <MapPin size={14} className="text-muted-foreground" />
                    <span className="font-medium truncate">{appointment?.patient?.address || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* IPD Admission Context (Conditional) */}
              {appointment?.ipdDetails && (
                <div className="bg-linear-to-br from-primary-theme/10 to-transparent dark:from-primary-theme/20 rounded-4xl p-6 border border-primary-theme/20 space-y-5 shadow-sm relative overflow-hidden group/ipd">
                  <div className="absolute top-0 right-0 p-4 -mt-2 -mr-2 opacity-5 scale-150 rotate-12 group-hover/ipd:scale-[2] transition-transform duration-1000">
                    <Building size={80} />
                  </div>
                  <div className="flex items-center justify-between relative z-10">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary-theme flex items-center gap-2">
                       <Building size={14} className="animate-pulse" /> In-Patient Context
                    </h4>
                    <span className="px-3 py-1 rounded-full bg-primary-theme text-white text-[8px] font-black uppercase shadow-lg shadow-primary-theme/20">Active IPD</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3 relative z-10">
                    <div className="flex items-center gap-4 p-3.5 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-white/20 dark:border-gray-700/50 backdrop-blur-sm group-hover/ipd:bg-white dark:group-hover/ipd:bg-gray-800 transition-colors duration-500">
                      <div className="w-11 h-11 rounded-xl bg-primary-theme/10 flex items-center justify-center text-primary-theme shadow-inner shrink-0">
                        <Bed size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase leading-none mb-1.5 opacity-70">Assigned Bed</p>
                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase leading-none tracking-tight truncate">
                          Room {appointment.ipdDetails.bed?.room || '--'} <span className="mx-1.5 opacity-30">•</span> Bed {appointment.ipdDetails.bed?.bedId || '--'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-3.5 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-white/20 dark:border-gray-700/50 backdrop-blur-sm group-hover/ipd:bg-white dark:group-hover/ipd:bg-gray-800 transition-colors duration-500">
                      <div className="w-11 h-11 rounded-xl bg-primary-theme/10 flex items-center justify-center text-primary-theme shadow-inner shrink-0">
                        <Stethoscope size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase leading-none mb-1.5 opacity-70">Primary Doctor</p>
                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase leading-none tracking-tight truncate">
                          Dr. {appointment.ipdDetails.primaryDoctor}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 relative z-10">
                     <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase border-t border-primary-theme/10 pt-4 px-1">
                        <span className="opacity-60">Admission ID</span>
                        <span className="text-primary-theme tracking-wider font-black">{appointment.ipdDetails.admissionId}</span>
                     </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vitals Widget */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-border-theme shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                <Activity size={18} className={`${appointment?.ipdDetails ? 'text-primary-theme' : 'text-rose-500'}`} /> 
                {appointment?.ipdDetails ? 'IPD Ward Vitals' : 'Patient Vitals'}
              </h3>
              <span className="text-[10px] font-bold text-muted-foreground">
                {appointment?.ipdDetails?.latestVitals ? `Update: ${new Date(appointment.ipdDetails.latestVitals.timestamp).toLocaleTimeString()}` : 'Latest Update'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <VitalGridItem 
                icon={<Heart className="text-rose-500" size={14} />} 
                label="B.P" 
                value={
                  appointment?.ipdDetails?.latestVitals 
                    ? `${appointment.ipdDetails.latestVitals.systolicBP}/${appointment.ipdDetails.latestVitals.diastolicBP}` 
                    : (appointment?.vitals?.bloodPressure || appointment?.vitals?.bp || '--')
                } 
                unit="mmHg" 
                color="rose"
              />
              <VitalGridItem 
                icon={<Activity className="text-blue-500" size={14} />} 
                label={appointment?.ipdDetails ? "H.R" : "Pulse"} 
                value={appointment?.ipdDetails?.latestVitals?.heartRate || appointment?.vitals?.pulse || '--'} 
                unit="bpm" 
                color="blue"
              />
              <VitalGridItem 
                icon={<Thermometer className="text-amber-500" size={14} />} 
                label="Temp" 
                value={appointment?.ipdDetails?.latestVitals?.temperature || appointment?.vitals?.temperature || appointment?.vitals?.temp || '--'} 
                unit="°F" 
                color="amber"
              />
              <VitalGridItem 
                icon={<Droplets className="text-cyan-500" size={14} />} 
                label="SpO2" 
                value={appointment?.ipdDetails?.latestVitals?.spO2 || appointment?.vitals?.spO2 || appointment?.vitals?.spo2 || '--'} 
                unit="%" 
                color="cyan"
              />
              <VitalGridItem 
                icon={<Scale className="text-emerald-500" size={14} />} 
                label="Weight" 
                value={appointment?.vitals?.weight || '--'} 
                unit="kg" 
                color="emerald"
              />
              <VitalGridItem 
                icon={<ArrowsUpFromLine className="text-indigo-500" size={14} />} 
                label="Height" 
                value={appointment?.vitals?.height || '--'} 
                unit="cm" 
                color="indigo"
              />
            </div>
          </div>

          {/* Alerts & Notes */}
          <div className="bg-rose-50 dark:bg-rose-900/10 rounded-3xl p-6 border border-rose-100 dark:border-rose-900/20">
            <h3 className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-2 mb-4">
              <AlertCircle size={16} /> Critical Alerts
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  Allergies: {appointment?.patient?.allergies || 'None recorded'}
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  Last Diagnosis: Hypertension (Type II)
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content - Consultation Area */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-gray-900 rounded-2xl border border-border-theme w-fit">
            <TabButton 
              active={activeTab === 'consultation'} 
              onClick={() => setActiveTab('consultation')}
              icon={<Stethoscope size={16} />}
              label="Consultation"
            />
            <TabButton 
              active={activeTab === 'history'} 
              onClick={() => setActiveTab('history')}
              icon={<History size={16} />}
              label="Medical History"
            />
          </div>

          {activeTab === 'consultation' ? (
            <div className="space-y-6">
              {/* Lab Token Toggle */}
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-border-theme p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${wantsLabToken ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Beaker size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-tight text-foreground">Issue Lab Token</h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Toggle to prioritize laboratory diagnostics</p>
                  </div>
                </div>
                <button 
                  onClick={() => setWantsLabToken(!wantsLabToken)}
                  className={`w-14 h-7 rounded-full transition-all relative p-1 ${wantsLabToken ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-800'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-all transform ${wantsLabToken ? 'translate-x-7' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Quick Actions Bar */}
              <div className={`grid grid-cols-1 ${wantsLabToken ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                <ActionCard 
                  onClick={() => router.push(`/doctor/prescription/create?appointmentId=${appointmentId}`)}
                  icon={<FileText size={24} />}
                  title="Write Prescription"
                  subtitle={isPrescriptionRestricted ? "Restricted until Lab Results" : "AI Powered Medicine Suggestion"}
                  color="blue"
                  disabled={isPrescriptionRestricted}
                />
                <ActionCard 
                  onClick={() => router.push(`/doctor/lab-token/create?appointmentId=${appointmentId}`)}
                  icon={<Beaker size={24} />}
                  title="Order Lab Tests"
                  subtitle="Blood, Imaging & Diagnostics"
                  color="purple"
                  active={wantsLabToken}
                />
                {wantsLabToken && (
                  <ActionCard 
                    onClick={() => {
                      setActiveTab('history');
                      setHistorySubTab('labs');
                    }}
                    icon={<Search size={24} />}
                    title="Lab Results"
                    subtitle="View Diagnostic Findings"
                    color="emerald"
                  />
                )}
              </div>
              
              {/* Real-time Lab Results Tracking */}
              {appointment?.labResults && appointment.labResults.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-4xl border border-border-theme shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="p-5 border-b border-border-theme bg-purple-50/30 dark:bg-purple-900/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                        <Beaker size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-tight text-foreground">Active Lab Orders</h4>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Real-time Diagnostic Tracking</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                       <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Live Updates</span>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    {appointment.labResults.map((order: any, idx: number) => (
                      <div key={idx} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-md border border-purple-100 dark:border-purple-800/50 uppercase tracking-widest">
                              {order.tokenNumber}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                              Placed: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                             {order.status?.toLowerCase() === 'completed' && (
                               <Link 
                                 href={`/doctor/lab-results/${order._id}`}
                                 className="text-[10px] font-black text-blue-600 hover:text-blue-700 underline uppercase tracking-widest mr-2"
                               >
                                 View Full Report
                               </Link>
                             )}
                             <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                               order.status?.toLowerCase() === 'completed' 
                                 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                 : (order.status?.toLowerCase() === 'processing' || order.status?.toLowerCase() === 'sample_collected')
                                   ? 'bg-blue-50 text-blue-700 border-blue-100 px-4' 
                                   : 'bg-purple-50 text-purple-700 border-purple-100'
                             }`}>
                               {order.status?.replace('_', ' ')}
                             </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {order.tests.map((test: any, tIdx: number) => (
                            <div key={tIdx} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border border-gray-100 dark:border-gray-800/50 hover:border-purple-200 dark:hover:border-purple-900/30 transition-all group">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  (test.status === 'completed' || order.status?.toLowerCase() === 'completed') 
                                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                                    : test.status === 'processing'
                                      ? 'bg-blue-500 animate-pulse'
                                      : 'bg-purple-300'
                                }`} />
                                <div>
                                  <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    {test.test?.testName || test.test?.name || 'Diagnostic Test'}
                                  </p>
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase">
                                     {order.status?.toLowerCase() === 'completed' ? 'Finalized' : test.status}
                                  </p>
                                </div>
                              </div>
                              
                               {(test.status === 'completed' || order.status?.toLowerCase() === 'completed') ? (
                                 <div className="text-right">
                                   <p className={`text-sm font-black ${(test.isAbnormal || test.result === 'Abnormal') ? 'text-rose-600' : 'text-emerald-600'}`}>
                                     {test.result || 'Result Ready'}
                                   </p>
                                   {test.isAbnormal && (
                                     <span className="text-[8px] font-black text-rose-600 uppercase animate-pulse">Abnormal</span>
                                   )}
                                 </div>
                               ) : (
                                 <div className={`flex items-center gap-1.5 ${test.status === 'processing' ? 'opacity-100' : 'opacity-50'}`}>
                                   {test.status === 'processing' ? (
                                      <Loader2 size={12} className="text-blue-500 animate-spin" />
                                   ) : (
                                      <Clock size={12} className="text-muted-foreground" />
                                   )}
                                   <span className={`text-[10px] font-black uppercase tracking-widest ${test.status === 'processing' ? 'text-blue-600' : 'text-muted-foreground'}`}>
                                     {test.status === 'processing' ? 'Processing' : 'Waiting'}
                                   </span>
                                 </div>
                               )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Consultation Notes Section */}
              <div className="bg-white dark:bg-gray-900 rounded-4xl border border-border-theme shadow-sm p-8 space-y-8">
                {/* Subjective */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black uppercase tracking-widest text-primary-theme flex items-center gap-2">
                      <ClipboardList size={20} /> Subjective (Chief Complaints)
                    </h4>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Compulsory</span>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800">
                     <p className="text-xs font-bold text-muted-foreground mb-3">Recorded by Nursing Staff:</p>
                     <p className="text-sm font-medium text-gray-900 dark:text-white italic">
                        "{appointment?.notes || appointment?.reason || 'No initial complaints described by staff'}"
                     </p>
                  </div>
                  <textarea
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Enter detailed clinical findings, patient history, and symptoms..."
                    className="w-full min-h-[120px] p-5 bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 text-sm focus:ring-2 focus:ring-primary-theme outline-none transition-all placeholder:text-muted-foreground/50 font-medium"
                  />
                </div>

                {/* Assessment */}
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-black uppercase tracking-widest text-primary-theme flex items-center gap-2">
                    <Stethoscope size={20} /> Assessment (Diagnosis)
                  </h4>
                  <div className="relative group">
                    <div className="absolute left-4 top-4 text-primary-theme/30 group-focus-within:text-primary-theme transition-colors">
                      <Search size={18} />
                    </div>
                    <input
                      type="text"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="Enter ICD-10 Diagnosis or Clinical Assessment..."
                      className="w-full pl-12 pr-5 py-4 bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 text-sm font-bold focus:ring-2 focus:ring-primary-theme outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Plan */}
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-black uppercase tracking-widest text-primary-theme flex items-center gap-2">
                    <History size={20} /> Plan (Treatment & Follow-up)
                  </h4>
                  <textarea
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    placeholder="Describe treatment plan, advice, and follow-up instructions..."
                    className="w-full min-h-[140px] p-5 bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 text-sm focus:ring-2 focus:ring-primary-theme outline-none transition-all font-medium"
                  />
                </div>

                 <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 text-muted-foreground italic text-xs">
                       {isAutoSaving ? (
                         <>
                           <Loader2 size={12} className="animate-spin text-primary-theme" /> 
                           <span className="animate-pulse">Saving changes...</span>
                         </>
                       ) : lastSaved ? (
                         <>
                           <CheckCircle size={12} className="text-emerald-500" />
                           <span className="text-emerald-600/70 font-bold uppercase tracking-tighter text-[10px]">Last saved at {lastSaved.toLocaleTimeString()}</span>
                         </>
                       ) : (
                         <>
                           <Loader2 size={12} className="animate-spin" /> Auto-saving draft enabled
                         </>
                       )}
                    </div>
                   <button 
                      onClick={handleEndConsultation}
                      className="flex items-center gap-2 px-8 py-3 bg-primary-theme text-primary-theme-foreground font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-primary-theme/20 hover:scale-105 active:scale-95 transition-all"
                   >
                     <Send size={16} /> Finish consultation
                   </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* History Sub-tabs */}
              <div className="flex items-center gap-4 border-b border-border-theme pb-2 mb-6">
                <button 
                  onClick={() => setHistorySubTab('visits')}
                  className={`text-xs font-black uppercase tracking-widest pb-2 px-2 transition-all relative ${
                    historySubTab === 'visits' ? 'text-primary-theme' : 'text-muted-foreground'
                  }`}
                >
                  Visits {patientHistory && `(${patientHistory.visits.length})`}
                  {historySubTab === 'visits' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-theme rounded-full" />}
                </button>
                <button 
                  onClick={() => setHistorySubTab('prescriptions')}
                  className={`text-xs font-black uppercase tracking-widest pb-2 px-2 transition-all relative ${
                    historySubTab === 'prescriptions' ? 'text-primary-theme' : 'text-muted-foreground'
                  }`}
                >
                  Prescriptions {patientHistory && `(${patientHistory.prescriptions.length})`}
                  {historySubTab === 'prescriptions' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-theme rounded-full" />}
                </button>
                <button 
                  onClick={() => setHistorySubTab('labs')}
                  className={`text-xs font-black uppercase tracking-widest pb-2 px-2 transition-all relative ${
                    historySubTab === 'labs' ? 'text-primary-theme' : 'text-muted-foreground'
                  }`}
                >
                  Lab Reports {patientHistory && `(${patientHistory.reports.length})`}
                  {historySubTab === 'labs' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-theme rounded-full" />}
                </button>
              </div>

              {loadingHistory ? (
                <div className="bg-white dark:bg-gray-900 rounded-4xl border border-border-theme shadow-sm p-20 flex flex-col items-center justify-center">
                  <Loader2 className="w-10 h-10 text-primary-theme animate-spin mb-4" />
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Retrieving Medical Records...</p>
                </div>
              ) : patientHistory ? (
                <div className="space-y-4">
                  {/* VISITS TAB */}
                  {historySubTab === 'visits' && (
                    <div className="grid gap-4">
                      {patientHistory.visits.length > 0 ? patientHistory.visits.map((visit) => (
                        <div key={visit._id} className="bg-white dark:bg-gray-900 rounded-4xl border border-border-theme shadow-sm p-6 hover:shadow-md transition-all group">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-4">
                              <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary-theme/10 transition-colors">
                                <Calendar className="text-muted-foreground group-hover:text-primary-theme transition-colors" size={20} />
                              </div>
                              <div>
                                <p className="text-xs font-black text-primary-theme uppercase tracking-widest mb-1">
                                  {new Date(visit.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                                <h4 className="text-base font-black text-gray-900 dark:text-white mb-2 uppercase">
                                  {visit.reason || visit.symptoms?.join(', ') || 'General Visit'}
                                </h4>
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full">
                                    <Stethoscope size={14} className="text-primary-theme" />
                                    Dr. {visit.doctorName || 'Attending Physician'}
                                  </span>
                                  <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                    {visit.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <EmptyHistoryState message="No previous visits found" />
                      )}
                    </div>
                  )}

                  {/* PRESCRIPTIONS TAB */}
                  {historySubTab === 'prescriptions' && (
                    <div className="grid gap-4">
                      {patientHistory.prescriptions.length > 0 ? patientHistory.prescriptions.map((pres) => (
                        <div key={pres._id} className="bg-white dark:bg-gray-900 rounded-4xl border border-border-theme shadow-sm p-6 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                               <p className="text-xs font-black text-primary-theme uppercase tracking-widest mb-1">
                                 Prescribed on {new Date(pres.date || pres.createdAt).toLocaleDateString()}
                               </p>
                               <h4 className="text-sm font-bold text-gray-900 dark:text-white">Dr. {pres.doctorName}</h4>
                            </div>
                            <FileText className="text-muted-foreground" size={20} />
                          </div>
                          <div className="space-y-2">
                             {pres.medicines?.map((med: any, i: number) => (
                               <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                  <div>
                                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase">{med.name}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">{med.dosage} • {med.duration}</p>
                                  </div>
                                  <span className="text-[10px] font-black text-primary-theme uppercase">{med.frequency}</span>
                               </div>
                             ))}
                          </div>
                        </div>
                      )) : (
                        <EmptyHistoryState message="No prescriptions found" />
                      )}
                    </div>
                  )}

                  {/* LABS TAB */}
                  {historySubTab === 'labs' && (
                    <div className="grid gap-4">
                      {patientHistory.reports.length > 0 ? patientHistory.reports.map((report) => (
                        <div key={report._id} className="bg-white dark:bg-gray-900 rounded-4xl border border-border-theme shadow-sm p-6 hover:shadow-md transition-all flex items-center justify-between">
                           <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center">
                                <Beaker className="text-purple-600" size={20} />
                             </div>
                             <div>
                               <p className="text-xs font-black text-primary-theme uppercase tracking-widest mb-0.5">
                                 {new Date(report.date).toLocaleDateString()}
                               </p>
                               <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase">{report.name}</h4>
                               <p className="text-[10px] font-bold text-muted-foreground uppercase">{report.type || 'Diagnostic Report'}</p>
                             </div>
                           </div>
                           <a 
                             href={report.url} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-primary-theme"
                           >
                              <Search size={20} />
                           </a>
                        </div>
                      )) : (
                        <EmptyHistoryState message="No lab reports found" />
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <EmptyHistoryState message="History not initialized" />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Helper Components
function EmptyHistoryState({ message }: { message: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-4xl border border-border-theme shadow-sm p-20 flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-6">
        <History className="text-muted-foreground" size={32} />
      </div>
      <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Records Empty</h3>
      <p className="text-muted-foreground max-w-sm mt-2 font-medium">{message}</p>
    </div>
  );
}

// Helper Components
function VitalGridItem({ icon, label, value, unit, color }: any) {
  const colorMap: any = {
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20',
    cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20',
  };

  return (
    <div className={`p-3 rounded-2xl border border-transparent transition-all flex flex-col items-center gap-1 ${colorMap[color]}`}>
      <div className="flex items-center gap-1.5 opacity-80">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
      </div>
      <div className="flex items-baseline gap-0.5 mt-0.5">
        <span className="text-base font-black tabular-nums">{value}</span>
        <span className="text-[10px] font-bold opacity-60 italic">{unit}</span>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
        active 
          ? 'bg-primary-theme text-primary-theme-foreground shadow-lg shadow-primary-theme/20' 
          : 'text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function ActionCard({ onClick, icon, title, subtitle, color, disabled, active }: any) {
  const colorMap: any = {
    blue: 'bg-blue-500 shadow-blue-500/20',
    purple: 'bg-purple-500 shadow-purple-500/20',
    emerald: 'bg-emerald-500 shadow-emerald-500/20',
    disabled: 'bg-gray-400 shadow-none opacity-40 cursor-not-allowed grayscale scale-95',
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`p-5 rounded-[1.75rem] text-left text-white flex gap-4 transition-all relative overflow-hidden ${
        disabled ? colorMap.disabled : colorMap[color]
      } ${!disabled && 'hover:-translate-y-1 hover:shadow-xl active:scale-95'}`}
    >
      {active && (
        <div className="absolute top-0 right-0 p-2">
          <div className="w-2 h-2 bg-white rounded-full animate-ping" />
        </div>
      )}
      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-black tracking-tight uppercase">{title}</h4>
        <p className="text-[10px] font-medium opacity-80 mt-0.5 leading-snug">{subtitle}</p>
      </div>
    </button>
  );
}
