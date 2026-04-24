'use client';

import React, { useState, useEffect, useCallback } from "react";
import {
    Calendar,
    Search,
    Clock,
    User,
    Stethoscope,
    ChevronRight,
    CheckCircle2,
    Loader2,
    ArrowLeft,
    Activity,
    CreditCard,
    Banknote,
    Smartphone,
    Info,
    RefreshCw,
    AlertCircle,
    Hash,
    PenTool,
    CheckCircle,
    AlertTriangle,
    Receipt,
    Check,
    Phone,
    X,
    Droplets
} from "lucide-react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { helpdeskService } from "@/lib/integrations";
import type { HelpdeskDoctor, HelpdeskProfile } from "@/lib/integrations/types";
import toast from "react-hot-toast";
import { renderToStaticMarkup } from 'react-dom/server';
import MasterHeader from '@/components/printers/MasterHeader';
import MasterFooter from '@/components/printers/MasterFooter';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { generateClinicalReceiptHtml } from "@/lib/print-utils";

export default function MasterAppointmentBooking() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const hospitalId = params.hospitalId as string;
    const patientIdFromQuery = searchParams.get('patientId');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [profile, setProfile] = useState<HelpdeskProfile | null>(null);
    const [doctors, setDoctors] = useState<HelpdeskDoctor[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);

    // Selection State
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [patientSearch, setPatientSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchingPatients, setSearchingPatients] = useState(false);

    const [selectedDoctor, setSelectedDoctor] = useState<HelpdeskDoctor | null>(null);
    const [selectedDept, setSelectedDept] = useState("");
    const [selectedDate, setSelectedDate] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
        return tomorrow.toISOString().split('T')[0];
    });
    const [selectedTime, setSelectedTime] = useState("");
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [bookingMode, setBookingMode] = useState<'queue' | 'slot'>('slot');
    const [timeOfDayFilter, setTimeOfDayFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening' | 'night'>('all');

    // For Master Helpdesk, we hardcode registrationType to OPD
    const registrationType = 'OPD';

    const [notes, setNotes] = useState("");
    const [appointmentType, setAppointmentType] = useState("consultation");
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
    const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
    const [sendToDoctor, setSendToDoctor] = useState(true);

    // Duplicate-appointment confirmation state
    const [existingAptWarning, setExistingAptWarning] = useState<{
        show: boolean;
        patientName: string;
        aptStatus: string;
        doctorName: string;
        confirmed: boolean;
    } | null>(null);

    // Vitals State
    const [vitals, setVitals] = useState({
        height: '', weight: '', bp: '', temperature: '', pulse: '', spo2: '', glucose: ''
    });

    const [vitalsErrors, setVitalsErrors] = useState<Record<string, string>>({});

    const validateVital = (field: string, value: string) => {
        if (!value) return ''; // All vitals are optional
        const num = Number(value);

        switch (field) {
            case 'pulse':
                if (num < 10 || num > 300) return 'Valid range: 10–300 bpm';
                break;
            case 'spo2':
                if (num < 1 || num > 100) return 'Valid range: 1–100%';
                break;
            case 'temperature':
                if (num < 93 || num > 115) return 'Valid range: 93–115 °F';
                break;
            case 'glucose':
                if (num < 20 || num > 1000) return 'Valid range: 20–1000 mg/dL';
                break;
            case 'height':
                if (num < 30 || num > 272) return 'Valid range: 30–272 cm';
                break;
            case 'weight':
                if (num < 0.3 || num > 600) return 'Valid range: 0.3–600 kg';
                break;
            case 'bp': {
                if (!/^\d{1,3}\/\d{1,3}$/.test(value)) {
                    return 'Format: 120/80';
                }
                const [sStr, dStr] = value.split('/');
                const s = Number(sStr);
                const d = Number(dStr);
                if (s < 50 || s > 300) return 'Systolic: 50–300 mmHg';
                else if (d < 20 || d > 200) return 'Diastolic: 20–200 mmHg';
                else if (d >= s) return 'Diastolic must be less than Systolic';
                break;
            }
        }
        return '';
    };

    const handleVitalChange = (field: string, value: string) => {
        let cleanValue = value;
        if (field === 'bp') {
            cleanValue = value.replace(/[^0-9/]/g, '');
            if ((cleanValue.match(/\//g) || []).length > 1) return;
        } else if (field === 'temperature') {
            cleanValue = value.replace(/[^0-9.]/g, '');
            const parts = cleanValue.split('.');
            if (parts.length > 2) return;
            if (parts[1] && parts[1].length > 1) return;
        } else {
            cleanValue = value.replace(/[^0-9]/g, '');
        }

        const limits: Record<string, number> = {
            height: 3, weight: 6, pulse: 3, spo2: 3, temperature: 5, glucose: 4, bp: 7,
        };
        if (limits[field] && cleanValue.length > limits[field]) return;

        setVitals(prev => ({ ...prev, [field]: cleanValue }));
        setVitalsErrors(prev => ({ ...prev, [field]: validateVital(field, cleanValue) }));
    };

    // Initial Data Fetch
    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                const [me, allDocs] = await Promise.all([helpdeskService.getMe(), helpdeskService.getDoctors()]);
                setProfile(me);
                const validDocs = allDocs.filter((doc: any) => (doc.user?.name && doc.user.name !== 'Unknown') || (doc.name && doc.name !== 'Unknown'));
                setDoctors(validDocs);

                const uniqueDepts = Array.from(new Set(validDocs.map((d: any) => d.specialty || d.specialties?.[0]).filter(Boolean)));
                setDepartments(uniqueDepts as string[]);

                if (patientIdFromQuery) {
                    try {
                        const patientData = await helpdeskService.getPatientById(patientIdFromQuery);
                        const profileData = patientData.profile || {};
                        const lastVisitVitals = patientData.lastVisit?.vitals || {};

                        const transformed = {
                            _id: patientData.user?._id || patientData._id,
                            id: patientData.user?._id || patientData._id,
                            patientId: patientData._id,
                            name: patientData.user?.name || patientData.name,
                            honorific: profileData.honorific || patientData.honorific || '',
                            mobile: patientData.user?.mobile || profileData.contactNumber || patientData.profile?.contactNumber || patientData.mobile || 'N/A',
                            mrn: patientData.mrn || profileData.mrn || 'CC-' + (patientData.user?._id || patientData._id).slice(-6).toUpperCase(),
                            gender: profileData.gender || patientData.gender || 'N/A',
                            age: profileData.age || patientData.age || 'N/A',
                            dob: profileData.dob || patientData.dob || 'N/A',
                            address: profileData.address || patientData.address || 'N/A',
                            email: patientData.user?.email || profileData.emergencyContactEmail || profileData.email || 'N/A',
                            bloodGroup: profileData.bloodGroup || patientData.bloodGroup || '',
                            emergencyContact: profileData.alternateNumber || profileData.emergencyContact || patientData.emergencyContact || 'N/A',
                            allergies: profileData.allergies || patientData.allergies || [],
                            medicalHistory: profileData.medicalHistory || profileData.conditions || patientData.medicalHistory || '',
                            vitals: {
                                height: lastVisitVitals.height || profileData.height || '',
                                weight: lastVisitVitals.weight || profileData.weight || '',
                                bp: lastVisitVitals.bp || lastVisitVitals.bloodPressure || profileData.bloodPressure || '',
                                temperature: lastVisitVitals.temperature || profileData.temperature || '',
                                pulse: lastVisitVitals.pulse || profileData.pulse || '',
                                spo2: lastVisitVitals.spo2 || lastVisitVitals.spO2 || profileData.spO2 || '',
                                glucose: lastVisitVitals.glucose || lastVisitVitals.sugar || profileData.glucose || profileData.sugar || ''
                            },
                            lastVisitReason: patientData.lastVisit?.reason || '',
                            lastVisitSymptoms: Array.isArray(patientData.lastVisit?.symptoms) ? patientData.lastVisit?.symptoms.join(', ') : (patientData.lastVisit?.symptoms || ''),
                            activeAdmission: patientData.activeAdmission,
                            activeConsultation: patientData.activeConsultation,
                            ...profileData
                        };
                        setSelectedPatient(transformed);

                        if (patientData.activeAdmission) {
                            toast(`Patient is currently admitted in IPD (ID: ${patientData.activeAdmission.admissionId})`, { icon: '🏥' });
                        } else if (patientData.activeConsultation) {
                            toast(`Patient has an active consultation in-progress.`, { icon: '⏳' });
                        }
                        if (transformed.lastVisitReason || transformed.lastVisitSymptoms) {
                            setNotes(transformed.lastVisitReason || transformed.lastVisitSymptoms);
                        }
                    } catch (e) {
                        console.error("Error fetching patient", e);
                    }
                }
            } catch (error: any) {
                toast.error("Initialization failed.");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [patientIdFromQuery]);

    useEffect(() => {
        if (selectedPatient?.vitals) {
            const initialVitals = {
                height: selectedPatient.vitals.height || '',
                weight: selectedPatient.vitals.weight || '',
                bp: selectedPatient.vitals.bp || selectedPatient.vitals.bloodPressure || '',
                temperature: selectedPatient.vitals.temperature || selectedPatient.vitals.temp || '',
                pulse: selectedPatient.vitals.pulse || '',
                spo2: selectedPatient.vitals.spo2 || selectedPatient.vitals.spO2 || '',
                glucose: selectedPatient.vitals.glucose || selectedPatient.vitals.sugar || ''
            };
            setVitals(initialVitals);
            const errors: Record<string, string> = {};
            for (const key in initialVitals) {
                errors[key] = validateVital(key, initialVitals[key as keyof typeof initialVitals]);
            }
            setVitalsErrors(errors);
        }
    }, [selectedPatient]);

    useEffect(() => {
        setExistingAptWarning(null);
        const checkExistingAppointment = async () => {
            if (!selectedPatient) return;
            const hospitalId = profile?.hospital?._id;
            if (!hospitalId) return;

            try {
                const pId = selectedPatient?._id || selectedPatient?.id;
                const pName = selectedPatient?.name || "Patient";
                const todayStr = new Date().toISOString().split('T')[0];

                const broadResult = await helpdeskService.getAppointments(1, 100, undefined, todayStr, todayStr).catch(() => []);
                const normalize = (res: any) => res?.appointments || res?.data || [];
                const appointmentsList = normalize(broadResult);

                const activeStatuses = ['pending', 'confirmed', 'in-progress', 'waiting', 'booked', 'scheduled', 'arrived', 'checked-in'];
                const existing = appointmentsList.find((apt: any) => {
                    const aptStatus = String(apt.status || '').toLowerCase();
                    const aptPatientId = apt.patient?._id || apt.patient?.id || apt.patient || apt.patientId;
                    const aptUserId = apt.patient?.user?._id || apt.patient?.user || apt.userId;
                    const isActive = activeStatuses.includes(aptStatus);
                    return isActive && (pId === aptPatientId || pId === aptUserId);
                });

                if (existing) {
                    setExistingAptWarning({
                        show: true,
                        patientName: pName,
                        aptStatus: existing.status,
                        doctorName: existing.doctorName || 'the doctor',
                        confirmed: false,
                    });
                }
            } catch (err) { }
        };
        checkExistingAppointment();
    }, [selectedPatient?.id, selectedPatient?._id, profile?.hospital?._id]);

    useEffect(() => {
        if (!patientSearch.length || patientSearch.length < 3) { setSearchResults([]); return; }
        const timer = setTimeout(async () => {
            try {
                setSearchingPatients(true);
                const results = await helpdeskService.searchPatients(patientSearch);
                setSearchResults(Array.isArray(results) ? results : ((results as any).data || []));
            } catch (error) {
            } finally {
                setSearchingPatients(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [patientSearch]);

    const fetchSlots = useCallback(async () => {
        if (!selectedDoctor?._id || !profile?.hospital?._id || !selectedDate) return;
        try {
            setLoadingSlots(true);
            setSelectedSlot(null);
            
            // 1. Get availability (hourly containers)
            const res = await helpdeskService.getAvailability(selectedDoctor._id, profile.hospital._id, selectedDate);
            const hourlySlots = res.slots || [];
            
            // 2. Get all appointments for this doctor on this day to find exact occupied 5-min slots
            const aptRes = await helpdeskService.getAppointments(1, 200, undefined, selectedDate, selectedDate);
            const allApts = Array.isArray(aptRes) ? aptRes : (aptRes.appointments || aptRes.data || []);
            const doctorApts = allApts.filter((a: any) => {
                const aDocId = a.doctor?._id || a.doctor || a.doctorId;
                return aDocId === selectedDoctor._id;
            });

            const occupiedTimes = new Set(doctorApts.map((a: any) => {
                const t = a.startTime || a.time || a.timeSlot;
                if (!t) return null;
                // Normalize to "H:MM AM/PM"
                try {
                    const d = new Date(`2000-01-01 ${t}`);
                    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                } catch (e) { return t; }
            }).filter(Boolean));

            // 3. Expand each hourly container into 12 x 5-min slots
            const allExpandedSlots: any[] = [];
            hourlySlots.forEach((hour: any) => {
                const [startPart] = hour.timeSlot.split(' - ');
                const [hStr, mStrPart] = startPart.split(':');
                const [mStr, ampm] = mStrPart.split(' ');
                
                let h = parseInt(hStr);
                let m = parseInt(mStr);
                if (ampm === 'PM' && h < 12) h += 12;
                if (ampm === 'AM' && h === 12) h = 0;

                for (let i = 0; i < 12; i++) {
                    const slotDate = new Date(2000, 0, 1, h, m + (i * 5));
                    const timeLabel = slotDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    allExpandedSlots.push({
                        time: timeLabel,
                        available: !occupiedTimes.has(timeLabel)
                    });
                }
            });

            setAvailableSlots(allExpandedSlots);
            setBookingMode('slot');
        } catch (e) {
            setAvailableSlots([]);
            setBookingMode('queue');
        } finally {
            setLoadingSlots(false);
        }
    }, [selectedDoctor, profile, selectedDate]);

    useEffect(() => {
        fetchSlots();
    }, [fetchSlots]);

    const filteredDoctors = selectedDept
        ? doctors.filter((d: any) => (d.specialty === selectedDept || d.specialties?.[0] === selectedDept))
        : doctors;

    const isBookingValid = () => {
        if (!selectedPatient || !selectedDoctor) return false;
        if (bookingMode === 'slot' && !selectedSlot) return false;
        const hasVitalErrors = Object.values(vitalsErrors).some(err => !!err);
        return !hasVitalErrors && notes.trim().length > 0 && notes.length <= 400;
    };

    const handleBooking = async () => {
        if (!selectedPatient || !selectedDoctor) return;
        if (!isBookingValid()) {
            toast.error("Please fill all required fields and correct errors.");
            return;
        }

        if (existingAptWarning?.show && !existingAptWarning.confirmed) {
            setExistingAptWarning(prev => prev ? { ...prev, show: true } : null);
            return;
        }

        let printWindow: Window | null = null;
        try {
            printWindow = window.open('about:blank', '_blank');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Processing Receipt...</title></head><body><div style="text-align:center;padding:50px;"><h2>Generating Receipt...</h2><p>Please wait.</p></div></body></html>');
            }
        } catch (_) { }

        try {
            setSubmitting(true);
            const backendPaymentStatus = paymentStatus === 'unpaid' ? 'pending' : 'paid';

            const payload = {
                patientId: selectedPatient?._id || selectedPatient?.id,
                doctorId: selectedDoctor?._id,
                date: selectedDate,
                time: bookingMode === 'slot' ? selectedSlot : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                timeSlot: bookingMode === 'slot' ? selectedSlot : "General Queue",
                startTime: bookingMode === 'slot' ? selectedSlot : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                endTime: bookingMode === 'slot' ? selectedSlot : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                type: appointmentType,
                notes: notes,
                paymentMethod: paymentMethod,
                paymentStatus: backendPaymentStatus,
                patientDetails: {
                    age: selectedPatient.age,
                    gender: selectedPatient.gender,
                    duration: selectedDoctor?.consultationDuration ? `${selectedDoctor.consultationDuration} min` : "15 min"
                },
                honorific: selectedPatient.honorific,
                address: selectedPatient.address,
                bloodGroup: (selectedPatient.bloodGroup && selectedPatient.bloodGroup !== 'N/A') ? selectedPatient.bloodGroup : undefined,
                emergencyContact: selectedPatient.emergencyContact,
                allergies: Array.isArray(selectedPatient.allergies) ? selectedPatient.allergies.join(', ') : selectedPatient.allergies,
                medicalHistory: selectedPatient.medicalHistory,
                vitals: {
                    bp: vitals.bp || undefined,
                    temperature: vitals.temperature || undefined,
                    pulse: vitals.pulse || undefined,
                    spo2: vitals.spo2 || undefined,
                    height: vitals.height || undefined,
                    weight: vitals.weight || undefined,
                    glucose: vitals.glucose || undefined
                }
            };

            const response = await helpdeskService.createAppointment({
                ...payload,
                type: 'OPD',
                amount: selectedDoctor?.consultationFee || 0
            });
            const appointment = response.appointment || response;

            if (sendToDoctor && (appointment._id || appointment.id)) {
                try {
                    await helpdeskService.updateAppointmentStatus(appointment._id || appointment.id, 'confirmed');
                } catch (e) { }
            }

            // Prioritize details from Master Helpdesk Setting profile - Strictly use Helpdesk overrides
            const profileAsAny = profile as any;
            
            // 🚀 FE-Only Persistence: Load local overrides since backend strips non-schema fields
            let localOverrides: any = {};
            try {
                const saved = localStorage.getItem(`master_branding_${hospitalId}`);
                if (saved) localOverrides = JSON.parse(saved);
            } catch (e) {}

            const latestHospital: any = {
                name: localOverrides.hospitalName || profileAsAny?.hospitalName || profile?.hospital?.name || "Hospital",
                address: localOverrides.hospitalAddress || profileAsAny?.hospitalAddress || profile?.hospital?.address || "",
                phone: localOverrides.hospitalMobile || profileAsAny?.hospitalMobile || profile?.hospital?.mobile || (profile?.hospital as any)?.phone || "",
                email: localOverrides.hospitalEmail || profileAsAny?.hospitalEmail || profile?.hospital?.email || "",
                logo: profileAsAny?.image || (profile?.hospital as any)?.logo
            };
            
            const headerHtml = renderToStaticMarkup(<MasterHeader initialDetails={{ ...latestHospital }} />);
            const footerHtml = renderToStaticMarkup(<MasterFooter initialDetails={{ ...latestHospital }} />);
            
            const receiptData = {
                hospital: { 
                    name: latestHospital.name, 
                    address: latestHospital.address, 
                    contact: latestHospital.phone, 
                    email: latestHospital.email, 
                    logo: latestHospital.logo 
                },
                patient: { name: selectedPatient.name, mrn: selectedPatient.mrn, age: selectedPatient.age, gender: selectedPatient.gender, mobile: selectedPatient.mobile, dob: selectedPatient.dob, address: selectedPatient.address, email: selectedPatient.email, bloodGroup: selectedPatient.bloodGroup, emergencyContact: selectedPatient.emergencyContact, allergies: Array.isArray(selectedPatient.allergies) ? selectedPatient.allergies.join(', ') : selectedPatient.allergies, medicalHistory: selectedPatient.medicalHistory, vitals: { ...vitals } },
                appointment: { doctorName: selectedDoctor.user?.name || selectedDoctor.name, specialization: selectedDoctor.specialties?.[0] || 'General', qualification: selectedDoctor.qualifications?.[0] || 'MBBS', date: new Date(selectedDate).toLocaleDateString(), time: bookingMode === 'slot' ? selectedSlot : payload.time, type: appointmentType.toUpperCase(), notes: notes, appointmentId: appointment._id || appointment.id || 'PENDING' },
                payment: { amount: selectedDoctor?.consultationFee || 0, totalBillAmount: selectedDoctor?.consultationFee || 0, totalPaidAmount: selectedDoctor?.consultationFee || 0, advanceAmount: 0, method: paymentMethod.toUpperCase(), status: paymentStatus.toUpperCase(), date: new Date().toISOString() },
                registrationType: 'OPD',
                headerHtml, footerHtml, returnUrl: '/masterhelpdesk'
            };

            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(generateClinicalReceiptHtml(receiptData));
                printWindow.document.close();
            }
            toast.success("Booking Recorded.");
            router.push('/masterhelpdesk');
        } catch (error: any) {
            if (printWindow) printWindow.close();
            toast.error(error.message || "Booking failure.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="flex flex-col items-center gap-6">
                    <RefreshCw className="w-10 h-10 text-teal-600 animate-spin" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Initializing Booking Terminal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-full mx-auto space-y-4 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-2 px-1 gap-2">
                <div className="flex items-center gap-2 z-10">
                    <button onClick={() => router.push("/masterhelpdesk")} className="p-1.5 bg-slate-100 rounded-lg text-slate-400 hover:text-teal-600 transition-all">
                        <ArrowLeft size={14} />
                    </button>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Master Scheduling / Booking</span>
                </div>
                <div className="sm:absolute sm:inset-0 flex flex-col items-center justify-center text-center sm:pointer-events-none">
                    <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight uppercase">Schedule OPD Appointment</h1>
                    <p className="hidden sm:block text-[9px] font-bold text-teal-600 uppercase tracking-[0.2em]">Master Oversight Gateway</p>
                </div>
            </div>

            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden p-4 md:p-8">
                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
                    {/* LEFT SIDE */}
                    <div className="lg:col-span-8 space-y-12">
                        {/* 1. PATIENT SELECTION */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600"><User size={14} /></div>
                                <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Patient Selection</h2>
                            </div>

                            {selectedPatient ? (
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 p-5 bg-slate-50 rounded-[20px] border border-slate-200 group relative animate-in slide-in-from-left-4 duration-300">
                                    <div className="w-16 h-16 rounded-[16px] bg-slate-900 flex items-center justify-center text-white font-black text-2xl shadow-xl">
                                        {selectedPatient.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{selectedPatient.name}</h3>
                                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[9px] font-bold uppercase tracking-widest">
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-lg border border-slate-200 text-slate-600"><Hash size={10} className="text-teal-600" /> {selectedPatient.mrn}</span>
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-lg border border-slate-200 text-slate-600"><Phone size={10} className="text-teal-600" /> {selectedPatient.mobile}</span>
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-lg border border-slate-200 text-slate-600"><Activity size={10} className="text-teal-600" /> {selectedPatient.age} / {selectedPatient.gender}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => { setSelectedPatient(null); setPatientSearch(""); }} className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-all"><X size={16} /></button>
                                </div>
                            ) : (
                                <div className="relative group w-full max-w-2xl">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600" size={20} />
                                    <input value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="SEARCH PATIENT BY NAME / MOBILE / MRN..." className="w-full pl-14 pr-12 py-5 bg-slate-50 border border-slate-200 rounded-[20px] focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white outline-none transition-all text-xs font-bold uppercase" />
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-3">
                                        {searchingPatients && <Loader2 className="animate-spin text-teal-600" size={20} />}
                                    </div>

                                    {searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-4 bg-white border border-slate-200 rounded-[24px] shadow-2xl z-30 max-h-[400px] overflow-y-auto p-3 space-y-1">
                                            {searchResults.map(p => (
                                                <button key={p._id} onClick={async () => {
                                                    const full = await helpdeskService.getPatientById(p._id);
                                                    const profileData = full.profile || {};
                                                    setSelectedPatient({
                                                        _id: full.user?._id || full._id, id: full.user?._id || full._id, patientId: full._id,
                                                        name: full.user?.name || full.name, honorific: profileData.honorific || '',
                                                        mobile: full.user?.mobile || full.mobile, mrn: full.mrn, gender: full.gender, age: full.age,
                                                        vitals: full.lastVisit?.vitals || {}, ...profileData
                                                    });
                                                    setPatientSearch("");
                                                    setSearchResults([]);
                                                }} className="w-full p-4 text-left hover:bg-slate-50 rounded-2xl flex items-center justify-between group transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-lg">{p.name?.charAt(0)}</div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-900 uppercase">{p.name || p.user?.name}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.mobile || p.user?.mobile} • {p.mrn}</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* 2. DOCTOR */}
                        <section className={`space-y-5 transition-all duration-500 ${!selectedPatient ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600"><Stethoscope size={14} /></div>
                                <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Consultant & Schedule</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Date</label>
                                    <div className="relative group">
                                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase focus:border-teal-500 outline-none transition-all" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Department</label>
                                    <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-teal-500 transition-all">
                                        <option value="">All Departments</option>
                                        {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {filteredDoctors.map(doc => (
                                    <button key={doc._id} onClick={() => setSelectedDoctor(doc)} className={`p-3.5 rounded-[16px] border-2 text-left flex items-center gap-3 transition-all ${selectedDoctor?._id === doc._id ? 'border-teal-500 bg-teal-50/50 shadow-lg' : 'border-slate-50 bg-white hover:border-slate-100'}`}>
                                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-black text-xl ${selectedDoctor?._id === doc._id ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{doc.name?.charAt(0)}</div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[10px] font-black truncate text-slate-900 uppercase">{doc.name || doc.user?.name}</h4>
                                            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">{doc.specialty || doc.specialties?.[0] || 'Clinician'}</p>
                                            <p className="text-[8px] font-black text-teal-600 uppercase">₹{doc.consultationFee || 0}.00</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {selectedDoctor && (
                                <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-teal-100 flex items-center justify-center text-teal-600"><Clock size={12} /></div>
                                            <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Select Booking Slot</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                                            {[
                                                { id: 'all', label: 'All' },
                                                { id: 'morning', label: 'Morning' },
                                                { id: 'afternoon', label: 'Afternoon' },
                                                { id: 'evening', label: 'Evening' },
                                                { id: 'night', label: 'Night' }
                                            ].map(f => (
                                                <button 
                                                    key={f.id} 
                                                    onClick={() => setTimeOfDayFilter(f.id as any)} 
                                                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${timeOfDayFilter === f.id ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    {f.label}
                                                </button>
                                            ))}
                                            <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
                                            <button onClick={() => setBookingMode('slot')} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${bookingMode === 'slot' ? 'bg-teal-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Slot</button>
                                            <button onClick={() => setBookingMode('queue')} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${bookingMode === 'queue' ? 'bg-teal-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Queue</button>
                                        </div>
                                    </div>

                                    {bookingMode === 'slot' ? (
                                        <div className="space-y-4">
                                            {loadingSlots ? (
                                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                                                    {[...Array(16)].map((_, i) => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-xl" />)}
                                                </div>
                                            ) : (
                                                (() => {
                                                    const filtered = availableSlots.filter(s => {
                                                        if (timeOfDayFilter === 'all') return true;
                                                        
                                                        // Parse time "H:MM AM/PM"
                                                        const [timePart, ampm] = s.time.split(' ');
                                                        const [hStr, mStr] = timePart.split(':');
                                                        let h = parseInt(hStr);
                                                        if (ampm === 'PM' && h < 12) h += 12;
                                                        if (ampm === 'AM' && h === 12) h = 0;

                                                        if (timeOfDayFilter === 'morning') return h >= 5 && h < 12;
                                                        if (timeOfDayFilter === 'afternoon') return h >= 12 && h < 16;
                                                        if (timeOfDayFilter === 'evening') return h >= 16 && h < 20;
                                                        if (timeOfDayFilter === 'night') return h >= 20 || h < 5;
                                                        return true;
                                                    });

                                                    return filtered.length > 0 ? (
                                                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                                                            {filtered.map((s) => (
                                                                <button
                                                                    key={s.time}
                                                                    onClick={() => setSelectedSlot(s.time)}
                                                                    disabled={!s.available}
                                                                    className={`py-2.5 rounded-xl border-2 text-[8px] font-black transition-all ${
                                                                        selectedSlot === s.time
                                                                            ? 'bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-500/20'
                                                                            : s.available
                                                                                ? 'bg-white border-slate-100 text-slate-600 hover:border-teal-200 hover:bg-teal-50/30'
                                                                                : 'bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed opacity-50'
                                                                    }`}
                                                                >
                                                                    {s.time}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                                                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-4"><Clock size={24} /></div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No slots found for this category</p>
                                                            <button onClick={() => setTimeOfDayFilter('all')} className="mt-4 text-[9px] font-black text-teal-600 uppercase underline">View all slots</button>
                                                        </div>
                                                    );
                                                })()
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-teal-50/50 rounded-2xl border border-teal-100 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600"><Activity size={20} /></div>
                                            <div>
                                                <p className="text-[10px] font-black text-teal-900 uppercase">General Queue Entry</p>
                                                <p className="text-[9px] font-bold text-teal-600/70 uppercase">Patient will be added to the current queue</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* 3. VITALS & MANIFEST */}
                        <section className={`space-y-6 transition-all duration-700 ${!selectedPatient ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600"><PenTool size={14} /></div>
                                <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Clinical Matrix (Vitals)</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {['height', 'weight', 'bp', 'pulse', 'temperature', 'spo2', 'glucose'].map(v => (
                                    <div key={v} className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{v.toUpperCase()}</label>
                                        <input type="text" value={(vitals as any)[v]} onChange={(e) => handleVitalChange(v, e.target.value)} className={`w-full bg-slate-50 border ${vitalsErrors[v] ? 'border-rose-500' : 'border-slate-200'} rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:border-teal-500 outline-none transition-all placeholder:text-slate-200`} />
                                        {vitalsErrors[v] && <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest px-1">{vitalsErrors[v]}</p>}
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-3">
                                <FormLabel label="Reason for Visit / Symptoms" />
                                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Describe current symptoms..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[16px] focus:border-teal-500 focus:bg-white outline-none transition-all text-xs font-bold uppercase resize-none placeholder:text-slate-300" />
                            </div>
                        </section>
                    </div>

                    {/* REVENUE CYCLE */}
                    <div className={`lg:col-span-4 space-y-4 ${!selectedPatient ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="bg-slate-900 rounded-[24px] p-6 text-white space-y-6 shadow-xl sticky top-24">
                            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
                                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-teal-400"><Receipt size={14} /></div>
                                <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Revenue & Flow</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <FormLabel label="Payment Method" className="text-white/40" />
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'cash', icon: <Banknote size={16} />, label: 'Cash' },
                                            { id: 'card', icon: <CreditCard size={16} />, label: 'Card' },
                                            { id: 'upi', icon: <Smartphone size={16} />, label: 'UPI' }
                                        ].map(m => (
                                            <button key={m.id} onClick={() => setPaymentMethod(m.id as any)} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${paymentMethod === m.id ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                                {m.icon} <span className="text-[8px] font-black uppercase">{m.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <FormLabel label="Payment Status" className="text-white/40" />
                                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                                        <button onClick={() => setPaymentStatus('paid')} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${paymentStatus === 'paid' ? 'bg-teal-500 text-white shadow-lg' : 'text-white/30'}`}>Paid</button>
                                        <button onClick={() => setPaymentStatus('unpaid')} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${paymentStatus === 'unpaid' ? 'bg-rose-500 text-white shadow-lg' : 'text-white/30'}`}>Unpaid</button>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/10">
                                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest leading-none">Net Consultation Fee</p>
                                    <h4 className="text-4xl font-black text-white mt-1">₹{selectedDoctor?.consultationFee || 0}.00</h4>
                                    <button onClick={handleBooking} disabled={submitting || !isBookingValid() || !selectedDoctor} className="w-full mt-8 py-5 bg-teal-500 text-slate-900 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-teal-400 transition-all shadow-2xl shadow-teal-500/30 flex items-center justify-center gap-2 group relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-all" />
                                        {submitting ? <Loader2 size={18} className="animate-spin" /> : <><Receipt size={16} /> Finalize Engagement & Print</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{` @keyframes shimmer { 100% { transform: translateX(100%); } } `}</style>
        </div>
    );
}

function FormLabel({ label, className = "" }: { label: string, className?: string }) {
    return <label className={`text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 block ${className}`}>{label}</label>;
}
