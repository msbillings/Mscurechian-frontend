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
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { helpdeskService, ipdService } from "@/lib/integrations";
import type { HelpdeskDoctor, HelpdeskProfile, Bed } from "@/lib/integrations/types";
import toast from "react-hot-toast";
import Link from "next/link";
import { renderToStaticMarkup } from 'react-dom/server';
import MainHeader from '@/components/printers/MainHeader';
import MainFooter from '@/components/printers/MainFooter';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { generateClinicalReceiptHtml } from "@/lib/print-utils";

export default function AppointmentBooking() {
    const router = useRouter();
    const searchParams = useSearchParams();
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
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        return today.toISOString().split('T')[0];
    });
    const [selectedTime, setSelectedTime] = useState(() => {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
    });
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [bookingMode, setBookingMode] = useState<'queue' | 'slot'>('queue');

    const [notes, setNotes] = useState("");
    const [appointmentType, setAppointmentType] = useState("consultation");
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
    const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
    const [sendToDoctor, setSendToDoctor] = useState(true);

    // IPD Specific State
    const registrationTypeFromQuery = searchParams.get('type') as 'OPD' | 'IPD' || 'OPD';
    const [registrationType, setRegistrationType] = useState<'OPD' | 'IPD'>(registrationTypeFromQuery);
    const [beds, setBeds] = useState<Bed[]>([]);
    const [admissionData, setAdmissionData] = useState({
        roomType: '',
        roomId: '',
        bedId: '',
        diet: '',
        clinicalNotes: ''
    });
    const [ipdFee, setIpdFee] = useState('500');
    const [roomSearch, setRoomSearch] = useState("");
    const [showRoomSelect, setShowRoomSelect] = useState(false);
    const [unitTypes, setUnitTypes] = useState<string[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);

    // Bed & Meta Fetching Effect - Trigger whenever registrationType switches to IPD
    useEffect(() => {
        if (registrationType === 'IPD') {
            const fetchIPDMeta = async () => {
                try {
                    const [bedsData, types, roomsData] = await Promise.all([
                        ipdService.getBeds({ status: 'Vacant' }),
                        ipdService.getUnitTypes().catch(() => []),
                        ipdService.getRooms().catch(() => [])
                    ]);
                    setBeds(bedsData);
                    setUnitTypes(types);
                    setRooms(roomsData);
                } catch (e) {
                    console.error("Failed to fetch IPD meta", e);
                }
            };
            fetchIPDMeta();
        }
    }, [registrationType]);

    // Vitals State
    const [vitals, setVitals] = useState({
        height: '', weight: '', bp: '', temperature: '', pulse: '', spo2: '', glucose: ''
    });

    const [vitalsErrors, setVitalsErrors] = useState<Record<string, string>>({});
    const [admissionErrors, setAdmissionErrors] = useState<Record<string, string>>({});

    const validateVital = (field: string, value: string) => {
        let error = '';
        if (!value) return ''; // No longer required
        const num = Number(value);

        switch (field) {
            case 'pulse':
                if (num < 30 || num > 200) error = '30-200';
                break;
            case 'spo2':
                if (num < 50 || num > 100) error = '50-100';
                break;
            case 'temperature':
                if (num < 95 || num > 108) error = '95-108';
                break;
            case 'glucose':
                if (value && (num < 50 || num > 500)) error = '50-500';
                break;
            case 'height':
                if (value && (num < 30 || num > 250)) error = '30-250';
                break;
            case 'weight':
                if (value && (num < 0.5 || num > 500)) error = '0.5-500';
                break;
            case 'bp':
                const bpParts = value.split('/');
                if (!/^\d{2,3}\/\d{2,3}$/.test(value)) {
                    error = 'Format: 120/80';
                } else {
                    const s = Number(bpParts[0]);
                    const d = Number(bpParts[1]);
                    if (s < 70 || s > 250) error = 'Sys: 70-250';
                    else if (d < 40 || d > 150) error = 'Dia: 40-150';
                    else if (d >= s) error = 'Dia < Sys';
                }
                break;
        }
        return error;
    };

    const handleVitalChange = (field: string, value: string) => {
        let cleanValue = value;

        // Stricter restrictions based on field type
        if (field === 'bp') {
            // Allow only digits and a single forward slash
            cleanValue = value.replace(/[^0-9/]/g, '');
            if ((cleanValue.match(/\//g) || []).length > 1) return;
        } else if (field === 'temperature') {
            // Allow only digits and a single decimal point
            cleanValue = value.replace(/[^0-9.]/g, '');
            const parts = cleanValue.split('.');
            if (parts.length > 2) return;
            if (parts[1] && parts[1].length > 1) return; // Only 1 decimal place
        } else {
            // All other vital fields are strictly numeric
            cleanValue = value.replace(/[^0-9]/g, '');
        }

        // Character length limits
        const limits: any = { height: 3, weight: 3, pulse: 3, spo2: 3, temperature: 5, glucose: 3, bp: 7 };
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

                // const uniqueDepartments = Array.from(new Set(validDocs.flatMap(doc => doc.specialties || []).filter(Boolean)));
                // setDepartments(uniqueDepartments);

                if (patientIdFromQuery) {
                    try {
                        const patientData = await helpdeskService.getPatientById(patientIdFromQuery);
                        const profileData = patientData.profile || {};
                        const lastVisitVitals = patientData.lastVisit?.vitals || {};

                        const transformed = {
                            _id: patientData.user?._id || patientData._id,
                            id: patientData.user?._id || patientData._id,
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
                            toast(`Restricted: Patient is currently admitted in IPD (ID: ${patientData.activeAdmission.admissionId})`, {
                                icon: '🚫',
                                duration: 5000,
                            });
                        } else if (patientData.activeConsultation) {
                            toast(`Restricted: Patient has an active consultation with ${(patientData.activeConsultation.doctor as any)?.user?.name || 'a doctor'}`, {
                                icon: '⏳',
                                duration: 5000,
                            });
                        }
                        if (transformed.lastVisitReason || transformed.lastVisitSymptoms) {
                            setNotes(transformed.lastVisitReason || transformed.lastVisitSymptoms);
                        }
                    } catch (e) {
                        console.error("Error fetching patient by ID", e);
                    }
                }
                if (registrationTypeFromQuery === 'IPD') {
                    // Handled by the registrationType useEffect now to avoid duplication
                    // Extraction of departments is still needed here OR in the other effect
                }
                else {
                    // Extract unique departments/specialties from physicians anyway
                    const uniqueDepts = Array.from(new Set(validDocs.map(d => d.specialty || d.specialties?.[0]).filter(Boolean)));
                    setDepartments(uniqueDepts as string[]);
                    // Still fetch unit types for the dropdown if registration type changes
                    ipdService.getUnitTypes().then(setUnitTypes).catch(() => []);
                }
            } catch (error: any) {
                toast.error("Process initialization failed. Please refresh.");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [patientIdFromQuery, registrationTypeFromQuery]);

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
            // Validate initial vitals
            const errors: Record<string, string> = {};
            for (const key in initialVitals) {
                errors[key] = validateVital(key, initialVitals[key as keyof typeof initialVitals]);
            }
            setVitalsErrors(errors);
        }
    }, [selectedPatient]);

    useEffect(() => {
        if (selectedPatient?.activeAdmission && registrationType === 'IPD') {
            setRegistrationType('OPD');
            toast.error(`Patient is already admitted (${selectedPatient.activeAdmission.admissionId}). Switching to OPD mode.`, {
                icon: '🏥'
            });
        }
    }, [selectedPatient, registrationType]);

    // Patient Search Logic
    useEffect(() => {
        if (patientSearch.length < 3) { setSearchResults([]); return; }
        const timer = setTimeout(async () => {
            try {
                setSearchingPatients(true);
                const results = await helpdeskService.searchPatients(patientSearch);
                setSearchResults(Array.isArray(results) ? results : ((results as any).data || []));
            } catch (error: any) {
                console.error("Search error", error);
            } finally {
                setSearchingPatients(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [patientSearch]);

    const filteredDoctors = selectedDept
        ? doctors.filter(d => (d.specialty === selectedDept || d.specialties?.[0] === selectedDept))
        : doctors;

    const fetchSlots = useCallback(async () => {
        if (!selectedDoctor?._id || !profile?.hospital?._id || !selectedDate) return;
        try {
            setLoadingSlots(true);
            setSelectedSlot(null);
            const res = await helpdeskService.getAvailability(selectedDoctor._id, profile.hospital._id, selectedDate);
            setAvailableSlots(res.slots || []);
            // Force queue mode regardless of availability
            setBookingMode('queue');
        } catch (e) {
            setBookingMode('queue');
            setAvailableSlots([]);
        } finally {
            setLoadingSlots(false);
        }
    }, [selectedDoctor, profile, selectedDate]);

    useEffect(() => { fetchSlots(); }, [fetchSlots]);



    const isBookingValid = () => {
        if (!selectedPatient || !selectedDoctor) return false;

        const hasEmptyRequired = false; // Vitals are no longer required
        const hasVitalErrors = Object.values(vitalsErrors).some(err => !!err);

        const hasNotesLimit = notes.length > 400;
        const hasEmptyNotes = notes.trim().length === 0; // Check if reason/notes is empty
        const hasAdmissionErrors = Object.values(admissionErrors).some(err => !!err);

        if (registrationType === 'IPD') {
            if (!admissionData.bedId) return false;
            if (admissionData.diet.length > 250 || admissionData.clinicalNotes.length > 400) return false;
        }

        return !hasEmptyRequired && !hasVitalErrors && !hasNotesLimit && !hasEmptyNotes && !hasAdmissionErrors;
    };

    const handleBooking = async () => {
        if (!selectedPatient) { toast.error("Select a patient object"); return; }
        if (!selectedDoctor) { toast.error("Select a physician"); return; }
        if (!isBookingValid()) {
            toast.error("Please correct the highlighted errors and fill all required fields.");
            return;
        }

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write('<html><body><div style="font-family:sans-serif;padding:20px;text-align:center;margin-top:20vh;"><h2>Processing Appointment...</h2><p>Please wait while we generate your receipt.</p></div></body></html>');
        }

        try {
            setSubmitting(true);
            const backendPaymentStatus = paymentStatus === 'unpaid' ? 'pending' : 'paid';

            const payload = {
                patientId: selectedPatient?._id || selectedPatient?.id,
                doctorId: selectedDoctor?._id,
                date: selectedDate,
                timeSlot: bookingMode === 'slot' ? selectedSlot : selectedTime,
                startTime: bookingMode === 'slot' ? selectedSlot : selectedTime,
                endTime: bookingMode === 'slot' ? selectedSlot : selectedTime,
                type: appointmentType,
                notes: notes,
                paymentMethod: paymentMethod,
                paymentStatus: backendPaymentStatus,
                patientDetails: {
                    age: selectedPatient.age,
                    gender: selectedPatient.gender,
                    duration: selectedDoctor?.consultationDuration ? `${selectedDoctor.consultationDuration} min` : "15 min"
                },
                // Pass extended details to ensure profile is updated/corrected
                honorific: selectedPatient.honorific || selectedPatient.profile?.honorific,
                address: selectedPatient.address || selectedPatient.profile?.address,
                bloodGroup: (selectedPatient.bloodGroup && selectedPatient.bloodGroup !== 'N/A') ? selectedPatient.bloodGroup : undefined,
                emergencyContact: selectedPatient.emergencyContact || selectedPatient.profile?.alternateNumber,
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

            // 1. Create Appointment first (especially for IPD to generate the admissionId linkage)
            const response = await helpdeskService.createAppointment({
                ...payload,
                type: registrationType === 'IPD' ? 'IPD' : appointmentType,
                amount: registrationType === 'IPD' ? parseFloat(ipdFee) : (selectedDoctor?.consultationFee || 0),
                paymentStatus: registrationType === 'IPD' ? backendPaymentStatus : payload.paymentStatus
            });
            const appointment = response.appointment || response;

            // 2. Then initiate admission if IPD
            if (registrationType === 'IPD') {
                if (!admissionData.bedId) {
                    toast.error("Please select a bed for IPD admission");
                    setSubmitting(false);
                    return;
                }
                const selectedBed = beds.find(b => b._id === admissionData.bedId);
                const finalAdmissionType = (selectedBed?.type || admissionData.roomType || 'GENERAL').toUpperCase();

                await ipdService.initiateAdmission({
                    patientId: selectedPatient?._id || selectedPatient?.id,
                    doctorId: selectedDoctor?._id,
                    bedId: admissionData.bedId,
                    admissionType: finalAdmissionType,
                    diet: admissionData.diet,
                    clinicalNotes: admissionData.clinicalNotes,
                    reason: notes, // Pass the primary symptoms/reason for visit
                    vitals: {
                        height: vitals.height,
                        weight: vitals.weight,
                        bloodPressure: vitals.bp,
                        temperature: vitals.temperature,
                        pulse: vitals.pulse,
                        spO2: vitals.spo2,
                        glucose: vitals.glucose
                    },
                    amount: parseFloat(ipdFee),
                    paymentMethod: paymentMethod,
                    paymentStatus: backendPaymentStatus
                });
                toast.success("IPD Admission Initiated");
            }

            if (sendToDoctor && (appointment._id || appointment.id)) {
                try {
                    await helpdeskService.updateAppointmentStatus(appointment._id || appointment.id, 'confirmed');
                } catch (e) { }
            }

            // 1. Fetch Hospital Branding
            let latestHospital: any = profile?.hospital;
            try {
                const hRes = await hospitalAdminService.getHospital();
                if (hRes?.hospital) {
                    latestHospital = {
                        ...profile?.hospital,
                        ...hRes.hospital
                    };
                }
            } catch (e) { }

            // 2. Render Header/Footer
            const headerHtml = renderToStaticMarkup(
                <MainHeader
                    initialDetails={{
                        name: latestHospital?.name || "Hospital Name",
                        address: latestHospital?.address || "",
                        phone: latestHospital?.phone || latestHospital?.mobile || "",
                        email: latestHospital?.email || "",
                        logo: latestHospital?.logo
                    }}
                />
            );

            const footerHtml = renderToStaticMarkup(
                <MainFooter
                    initialDetails={{
                        name: latestHospital?.name || "Hospital Name",
                        address: latestHospital?.address || "",
                        phone: latestHospital?.phone || latestHospital?.mobile || "",
                        email: latestHospital?.email || "",
                    }}
                />
            );

            const receiptData = {
                hospital: {
                    name: latestHospital?.name || "CureChain Medical Center",
                    address: latestHospital?.address || "Main Medical Node",
                    contact: latestHospital?.mobile || latestHospital?.phone || "System Support",
                    email: latestHospital?.email || "healthcare@curechain.io",
                    logo: latestHospital?.logo
                },
                patient: {
                    name: selectedPatient.name,
                    mrn: selectedPatient.mrn,
                    age: selectedPatient.age,
                    gender: selectedPatient.gender,
                    mobile: selectedPatient.mobile,
                    dob: selectedPatient.dob,
                    address: selectedPatient.address,
                    email: selectedPatient.email,
                    bloodGroup: selectedPatient.bloodGroup,
                    emergencyContact: selectedPatient.emergencyContact,
                    allergies: Array.isArray(selectedPatient.allergies)
                        ? Array.from(new Set(selectedPatient.allergies)).join(', ')
                        : Array.from(new Set((selectedPatient.allergies || '').split(',').map((s: string) => s.trim()).filter(Boolean))).join(', '),
                    medicalHistory: Array.from(new Set((selectedPatient.medicalHistory || '').split(',').map((s: string) => s.trim()).filter(Boolean))).join(', '),
                    vitals: {
                        height: vitals.height,
                        weight: vitals.weight,
                        bp: vitals.bp,
                        temperature: vitals.temperature,
                        pulse: vitals.pulse,
                        spo2: vitals.spo2,
                        glucose: vitals.glucose
                    }
                },
                appointment: {
                    doctorName: selectedDoctor.user?.name || selectedDoctor.name,
                    specialization: selectedDoctor.specialties?.[0] || 'General Physician',
                    qualification: selectedDoctor.qualifications?.[0] || 'MBBS, DM',
                    date: new Date(selectedDate).toLocaleDateString(),
                    time: bookingMode === 'slot' ? selectedSlot : (() => {
                        const [h, m] = selectedTime.split(':');
                        const d = new Date();
                        d.setHours(parseInt(h, 10));
                        d.setMinutes(parseInt(m, 10));
                        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                    })(),
                    type: appointmentType.toUpperCase(),
                    notes: notes,
                    appointmentId: appointment.appointmentId || appointment.id || appointment._id || 'APT-' + Math.random().toString(36).substr(2, 9).toUpperCase()
                },
                payment: {
                    amount: registrationType === 'IPD' ? parseFloat(ipdFee) : (selectedDoctor?.consultationFee || 0),
                    totalBillAmount: registrationType === 'IPD' ? parseFloat(ipdFee) : (selectedDoctor?.consultationFee || 0),
                    totalPaidAmount: registrationType === 'IPD' ? parseFloat(ipdFee) : (selectedDoctor?.consultationFee || 0),
                    advanceAmount: registrationType === 'IPD' ? parseFloat(ipdFee) : 0,
                    method: paymentMethod.toUpperCase(),
                    status: (paymentStatus === 'unpaid' ? 'pending' : paymentStatus).toUpperCase(),
                    date: new Date().toISOString()
                },
                registrationType: registrationType,
                headerHtml: headerHtml,
                footerHtml: footerHtml,
                returnUrl: '/helpdesk'
            };

            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(generateClinicalReceiptHtml(receiptData));
                printWindow.document.close();
            }
            toast.success("Booking Indexed & Receipt Generated");
            router.push('/helpdesk');
        } catch (error: any) {
            if (printWindow) printWindow.close();
            toast.error(error.message || "Execution failure during booking");
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
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-2 px-1 sm:px-0 min-h-fit sm:min-h-[52px] gap-2">
                {/* LEFT: Breadcrumb */}
                <div className="flex items-center gap-2 z-10">
                    <Link href="/helpdesk" className="p-1.5 bg-slate-100 rounded-lg text-slate-400 hover:text-teal-600 transition-all">
                        <ArrowLeft size={14} />
                    </Link>
                    <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Medical Scheduling / Booking</span>
                </div>
                {/* CENTER/TITLE: Title + Subtitle */}
                <div className="sm:absolute sm:inset-0 flex flex-col items-center justify-center text-center sm:pointer-events-none">
                    <h1 className="text-lg md:text-xl lg:text-xl font-black text-slate-900 tracking-tight">
                        {registrationType === 'IPD' ? 'IPD PATIENT ADMISSION' : 'SCHEDULE APPOINTMENT'}
                    </h1>
                    <p className="hidden sm:block text-[9px] font-bold text-teal-600 uppercase tracking-[0.2em]">Clinical Manifest Gateway</p>
                </div>
            </div>

            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden p-4 md:p-6 lg:p-8">
                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">

                    {/* LEFT SIDE: SELECTION & DATA */}
                    <div className="lg:col-start-1 lg:col-span-8 space-y-12 order-1 lg:order-1">

                        {/* 1. PATIENT OBJECT */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                                    <User size={14} />
                                </div>
                                <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Patient Selection</h2>
                            </div>

                            {selectedPatient ? (
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 p-5 bg-slate-50 rounded-[20px] border border-slate-200 group relative animate-in slide-in-from-left-4 duration-300">
                                    <div className="w-16 h-16 rounded-[16px] bg-slate-900 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-slate-200 text-center leading-none">
                                        {selectedPatient.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{selectedPatient.name}</h3>
                                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[9px] font-bold uppercase tracking-widest">
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-lg border border-slate-200 text-slate-600"><Hash size={10} className="text-teal-600" /> {selectedPatient.mrn}</span>
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-lg border border-slate-200 text-slate-600"><Phone size={10} className="text-teal-600" /> {selectedPatient.mobile}</span>
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-lg border border-slate-200 text-slate-600"><Activity size={10} className="text-teal-600" /> {selectedPatient.age} / {selectedPatient.gender}</span>
                                                {selectedPatient.bloodGroup && selectedPatient.bloodGroup !== 'N/A' && (
                                                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 rounded-lg border border-rose-100 text-rose-600">
                                                        <Droplets size={10} className="text-rose-500" /> {selectedPatient.bloodGroup}
                                                    </span>
                                                )}
                                                {selectedPatient.activeAdmission && (
                                                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-700 animate-pulse">
                                                        <Activity size={10} className="text-amber-600" /> ADMITTED (Bed Assigned)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-3 pt-1.5 border-t border-slate-200/50">
                                            <p className="text-[9px] font-bold text-rose-500 uppercase flex items-center gap-1">
                                                <AlertTriangle size={10} /> Allergies: <span className="text-slate-900">{Array.isArray(selectedPatient.allergies) ? (selectedPatient.allergies[0] || 'NONE') : (selectedPatient.allergies || 'NONE')}</span>
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                                <Info size={10} /> History: <span className="text-slate-900 truncate max-w-[200px]">{selectedPatient.medicalHistory || 'CLEAR'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedPatient(null); setPatientSearch(""); }}
                                        className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                    >
                                        <X size={16} />
                                    </button>

                                    {/* PREMIUM MINI TOGGLE */}
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 scale-75 md:scale-90 z-10">
                                        <div className="flex bg-slate-200/40 p-1 rounded-[16px] w-fit relative overflow-hidden backdrop-blur-lg border border-white/40 shadow-xl group">
                                            {/* SLIDING BACKGROUND WITH CURVED EDGE */}
                                            <motion.div
                                                className={`absolute top-1 bottom-1 shadow-lg z-0 ${registrationType === 'OPD'
                                                    ? 'bg-gradient-to-br from-teal-400 to-teal-600 shadow-teal-500/30'
                                                    : 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/30'
                                                    }`}
                                                initial={false}
                                                animate={{
                                                    left: registrationType === 'OPD' ? '4px' : 'calc(50% + 2px)',
                                                    width: 'calc(50% - 6px)',
                                                    borderRadius: registrationType === 'OPD' ? '12px 24px 4px 12px' : '24px 12px 12px 4px'
                                                }}
                                                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                                            />

                                            {/* CROSS CURVED DIVIDER (VISUAL) */}
                                            <div className="absolute inset-0 pointer-events-none flex justify-center z-10">
                                                <motion.div
                                                    animate={{
                                                        rotate: registrationType === 'OPD' ? 15 : -15,
                                                        x: registrationType === 'OPD' ? 4 : -4
                                                    }}
                                                    className="w-[1px] h-[150%] bg-white/20 blur-[0.5px] -top-1/4 relative shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all duration-500"
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setRegistrationType('OPD')}
                                                className={`relative z-20 w-20 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${registrationType === 'OPD' ? 'text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-white/30'}`}
                                            >
                                                <span className="flex items-center justify-center gap-1">
                                                    {registrationType === 'OPD' && (
                                                        <motion.div layoutId="mini-dot" className="w-1 h-1 rounded-full bg-white shadow-[0_0_8px_white]" />
                                                    )}
                                                    OPD
                                                </span>
                                            </button>
                                            <div className="relative group/toggle">
                                                <button
                                                    type="button"
                                                    disabled={!!selectedPatient.activeAdmission}
                                                    onClick={() => setRegistrationType('IPD')}
                                                    className={`relative z-20 w-20 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${registrationType === 'IPD' ? 'text-white' : selectedPatient.activeAdmission ? 'text-slate-300 opacity-50 cursor-not-allowed' : 'text-slate-500 hover:text-slate-900 hover:bg-white/30'}`}
                                                >
                                                    <span className="flex items-center justify-center gap-1">
                                                        {registrationType === 'IPD' && (
                                                            <motion.div layoutId="mini-dot" className="w-1 h-1 rounded-full bg-white shadow-[0_0_8px_white]" />
                                                        )}
                                                        IPD
                                                    </span>
                                                </button>
                                                {selectedPatient.activeAdmission && (
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-slate-900 text-white text-[8px] font-bold rounded-lg opacity-0 group-hover/toggle:opacity-100 transition-opacity pointer-events-none z-50 text-center uppercase tracking-widest leading-normal shadow-2xl">
                                                        Patient is already admitted ({selectedPatient.activeAdmission.admissionId})
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative group w-full max-w-2xl px-2 sm:px-0">
                                    <Search className="absolute left-6 sm:left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors sm:size-[20px]" size={18} />
                                    <input
                                        value={patientSearch}
                                        onChange={(e) => setPatientSearch(e.target.value)}
                                        placeholder="SEARCH PATIENT..."
                                        className="w-full pl-12 sm:pl-14 pr-10 sm:pr-12 py-3 sm:py-5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-[20px] focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white outline-none transition-all text-[10px] sm:text-xs font-bold uppercase placeholder:text-slate-300"
                                    />
                                    <div className="absolute right-5 top-1/2 -translate-x-0 -translate-y-1/2 flex items-center gap-3">
                                        {searchingPatients && <Loader2 className="animate-spin text-teal-600" size={20} />}
                                        {!searchingPatients && patientSearch && (
                                            <button onClick={() => { setPatientSearch(""); setSearchResults([]); }} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {(searchResults.length > 0 || (patientSearch.length > 3 && !searchingPatients)) && (
                                        <div className="absolute top-full left-0 right-0 mt-4 bg-white border border-slate-200 rounded-[24px] shadow-2xl z-30 max-h-[400px] overflow-y-auto p-3 space-y-1 animate-in zoom-in-95 duration-200">
                                            {searchResults.length === 0 ? (
                                                <div className="p-8 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
                                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                                                        <Search size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Patient Not Found</p>
                                                        <p className="text-[10px] font-medium mt-1">Try searching by mobile number or MRN</p>
                                                    </div>
                                                    <Link href="/helpdesk/patient-registration" className="mt-2 px-4 py-2 bg-teal-50 text-teal-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-teal-100 transition-colors">
                                                        Register New Patient
                                                    </Link>
                                                </div>
                                            ) : (
                                                searchResults.map(p => (
                                                    <button
                                                        key={p._id}
                                                        onClick={async () => {
                                                            const full = await helpdeskService.getPatientById(p._id);
                                                            const profileData = full.profile || {};
                                                            const lastVisitVitals = full.lastVisit?.vitals || {};

                                                            setSelectedPatient({
                                                                _id: full.user?._id || full._id,
                                                                id: full.user?._id || full._id,
                                                                name: full.user?.name || full.name,
                                                                honorific: profileData.honorific || full.honorific || '',
                                                                mobile: full.user?.mobile || profileData.contactNumber || full.mobile || 'N/A',
                                                                mrn: full.mrn || profileData.mrn || 'CC-' + (full.user?._id || full._id).slice(-6).toUpperCase(),
                                                                gender: profileData.gender || full.gender || 'N/A',
                                                                age: profileData.age || full.age || 'N/A',
                                                                dob: profileData.dob || full.dob || 'N/A',
                                                                address: profileData.address || full.address || 'N/A',
                                                                email: full.user?.email || profileData.emergencyContactEmail || profileData.email || 'N/A',
                                                                bloodGroup: profileData.bloodGroup || full.bloodGroup || '',
                                                                emergencyContact: profileData.alternateNumber || profileData.emergencyContact || full.emergencyContact || 'N/A',
                                                                allergies: profileData.allergies || full.allergies || [],
                                                                medicalHistory: profileData.medicalHistory || profileData.conditions || full.medicalHistory || '',
                                                                vitals: {
                                                                    height: lastVisitVitals.height || profileData.height || '',
                                                                    weight: lastVisitVitals.weight || profileData.weight || '',
                                                                    bp: lastVisitVitals.bp || lastVisitVitals.bloodPressure || profileData.bloodPressure || '',
                                                                    temperature: lastVisitVitals.temperature || profileData.temperature || '',
                                                                    pulse: lastVisitVitals.pulse || profileData.pulse || '',
                                                                    spo2: lastVisitVitals.spo2 || lastVisitVitals.spO2 || profileData.spO2 || '',
                                                                    glucose: lastVisitVitals.glucose || lastVisitVitals.sugar || profileData.glucose || profileData.sugar || ''
                                                                },
                                                                lastVisitReason: full.lastVisit?.reason || '',
                                                                lastVisitSymptoms: Array.isArray(full.lastVisit?.symptoms) ? full.lastVisit?.symptoms.join(', ') : (full.lastVisit?.symptoms || ''),
                                                                activeAdmission: full.activeAdmission,
                                                                activeConsultation: full.activeConsultation,
                                                                ...profileData
                                                            });
                                                            if (full.lastVisit?.reason || full.lastVisit?.symptoms) {
                                                                setNotes(full.lastVisit?.reason || (Array.isArray(full.lastVisit?.symptoms) ? full.lastVisit?.symptoms.join(', ') : full.lastVisit?.symptoms));
                                                            }
                                                            setPatientSearch("");
                                                            setSearchResults([]);

                                                            if (full.activeAdmission) {
                                                                toast(`Booking restricted: Patient is currently admitted in IPD (Admission ID: ${full.activeAdmission.admissionId}).`, {
                                                                    icon: '🚫',
                                                                    style: { borderRadius: '12px', background: '#0f172a', color: '#fff', fontSize: '11px', fontWeight: 'bold' },
                                                                    duration: 6000
                                                                });
                                                            } else if (full.activeConsultation) {
                                                                toast('Booking restricted: Patient has an active consultation currently in-progress. Please complete it first.', {
                                                                    icon: '⏳',
                                                                    style: { borderRadius: '12px', background: '#0f172a', color: '#fff', fontSize: '11px', fontWeight: 'bold' },
                                                                    duration: 6000
                                                                });
                                                            }
                                                        }}
                                                        className="w-full p-4 text-left hover:bg-slate-50 rounded-2xl flex items-center justify-between group transition-all"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-lg">
                                                                {p.name?.charAt(0) || p.user?.name?.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-900 uppercase">{p.name || p.user?.name}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.mobile || p.user?.mobile} • {p.mrn}</p>
                                                                    {p.activeAdmission && (
                                                                        <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[7px] font-black rounded-md tracking-tighter uppercase">Inpatient</span>
                                                                    )}
                                                                    {p.activeConsultation && (
                                                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[7px] font-black rounded-md tracking-tighter uppercase">In Consultation</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-teal-500 group-hover:text-white transition-all">
                                                            <ChevronRight size={16} />
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* 2. DOCTOR & SCHEDULING */}
                        <section className={`space-y-5 transition-all duration-500 ${!selectedPatient ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                                    <Stethoscope size={14} />
                                </div>
                                <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Consultant & Schedule</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <FormLabel label="Appointment Date" />
                                    <div className="relative group opacity-80">
                                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            readOnly
                                            disabled
                                            className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black uppercase outline-none cursor-not-allowed"
                                            style={{ colorScheme: 'light' }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <FormLabel label="Filter By Department" />
                                    <select
                                        value={selectedDept}
                                        onChange={(e) => { setSelectedDept(e.target.value); setSelectedDoctor(null); }}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <FormLabel label="Select Physician" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {filteredDoctors.map(doc => (
                                        <button
                                            key={doc._id}
                                            onClick={() => setSelectedDoctor(doc)}
                                            className={`p-3.5 rounded-[16px] border-2 text-left flex items-center gap-3 transition-all ${selectedDoctor?._id === doc._id
                                                ? 'border-teal-500 bg-teal-50/50 shadow-lg shadow-teal-500/5'
                                                : 'border-slate-50 hover:border-slate-100 bg-white'
                                                }`}
                                        >
                                            <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-black text-xl ${selectedDoctor?._id === doc._id ? 'bg-teal-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                {(doc.user?.name || doc.name)?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-[10px] font-black truncate text-slate-900 uppercase tracking-tight">{doc.user?.name || doc.name}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className={`text-[8px] font-bold uppercase tracking-[0.1em] ${selectedDoctor?._id === doc._id ? 'text-teal-600' : 'text-slate-400'}`}>
                                                        {doc.specialties?.[0] || 'Medical Officer'}
                                                    </p>
                                                    <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
                                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                                        ₹{doc.consultationFee ?? (doc as any).hospitals?.[0]?.consultationFee ?? '0'}
                                                    </p>
                                                </div>
                                            </div>
                                            {selectedDoctor?._id === doc._id && <CheckCircle2 size={16} className="text-teal-600 shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            </div>


                        </section>

                        {/* 3. CLINICAL SYMPTOMS & TRIAGE */}
                        <section className={`space-y-6 transition-all duration-700 ${!selectedPatient ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                                    <PenTool size={14} />
                                </div>
                                <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Clinical Matrix</h2>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center mb-0.5 px-1">
                                        <FormLabel label="Primary Symptoms / Reason for Visit" />
                                        <span className={`text-[7px] font-black uppercase tracking-widest ${notes.length > 400 ? 'text-rose-500' : 'text-slate-400'}`}>
                                            {notes.length}/400
                                        </span>
                                    </div>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => {
                                            if (e.target.value.length <= 400) setNotes(e.target.value);
                                        }}
                                        rows={3}
                                        placeholder="Describe current symptoms..."
                                        className={`w-full px-5 py-4 bg-slate-50 border ${notes.length > 400 ? 'border-rose-500' : 'border-slate-200'} rounded-[16px] focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white outline-none transition-all text-xs font-bold uppercase resize-none placeholder:text-slate-300`}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <FormLabel label="Vital Indicators (Triage)" />
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        <VitalField label="Height (cm)" value={vitals.height} placeholder="170" error={vitalsErrors.height} onChange={(v) => handleVitalChange('height', v)} />
                                        <VitalField label="Weight (kg)" value={vitals.weight} placeholder="70" error={vitalsErrors.weight} onChange={(v) => handleVitalChange('weight', v)} />
                                        <VitalField label="BP (mmHg)" value={vitals.bp} placeholder="120/80" error={vitalsErrors.bp} onChange={(v) => handleVitalChange('bp', v)} />
                                        <VitalField label="Pulse (bpm)" value={vitals.pulse} placeholder="72" error={vitalsErrors.pulse} onChange={(v) => handleVitalChange('pulse', v)} />
                                        <VitalField label="Temp (°F)" value={vitals.temperature} placeholder="98.6" error={vitalsErrors.temperature} onChange={(v) => handleVitalChange('temperature', v)} />
                                        <VitalField label="SpO2 (%)" value={vitals.spo2} placeholder="99" error={vitalsErrors.spo2} onChange={(v) => handleVitalChange('spo2', v)} />
                                        <VitalField label="Glucose (mg/dL)" value={vitals.glucose} placeholder="100" error={vitalsErrors.glucose} onChange={(v) => handleVitalChange('glucose', v)} />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT SIDE: FINALIZATION & REVENUE */}
                    <div className={`lg:col-start-9 lg:col-span-4 space-y-4 transition-all duration-700 order-3 lg:order-2 lg:row-start-1 lg:row-span-2 ${!selectedPatient ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        <div className="lg:sticky lg:top-24 space-y-4">
                            {/* REVENUE CYCLE */}
                            <div className="bg-slate-900 rounded-[20px] p-5 text-white space-y-4 shadow-xl">
                                <div className="flex items-center gap-2 border-b border-white/10 pb-4">
                                    <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-teal-400">
                                        <Receipt size={14} />
                                    </div>
                                    <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Revenue & Flow</h2>
                                </div>

                                <div className="space-y-2">
                                    <FormLabel label="Engagement Type" className="text-white/40" />
                                    <select
                                        value={appointmentType}
                                        onChange={(e) => setAppointmentType(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase outline-none focus:border-teal-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="consultation" className="bg-slate-900 text-white">General Consultation</option>
                                        <option value="emergency" className="bg-slate-900 text-white">Emergency Triage</option>
                                        <option value="follow-up" className="bg-slate-900 text-white">Follow-up Clinical</option>
                                        <option value="lab-referral" className="bg-slate-900 text-white">Lab Diagnostic Referral</option>
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <FormLabel label="Payment Method" className="text-white/40" />
                                    <div className="grid grid-cols-3 gap-2.5">
                                        {[
                                            { id: 'cash', icon: <Banknote size={16} />, label: 'Cash' },
                                            { id: 'card', icon: <CreditCard size={16} />, label: 'Card' },
                                            { id: 'upi', icon: <Smartphone size={16} />, label: 'UPI' }
                                        ].map(method => (
                                            <button
                                                key={method.id}
                                                onClick={() => setPaymentMethod(method.id as any)}
                                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${paymentMethod === method.id
                                                    ? 'bg-teal-500 border-teal-500 text-white shadow-lg shadow-teal-500/20'
                                                    : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                                                    }`}
                                            >
                                                {method.icon}
                                                <span className="text-[8px] font-black uppercase tracking-widest">{method.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <FormLabel label="Payment Status" className="text-white/40" />
                                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                                        <button
                                            onClick={() => setPaymentStatus('paid')}
                                            className={`flex-1 py-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${paymentStatus === 'paid' ? 'bg-teal-500 text-white shadow-lg' : 'text-white/30 hover:text-white/60'
                                                }`}
                                        >
                                            <Check size={12} /> Received
                                        </button>
                                        <button
                                            onClick={() => setPaymentStatus('unpaid')}
                                            className={`flex-1 py-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${paymentStatus === 'unpaid' ? 'bg-rose-500 text-white shadow-lg' : 'text-white/30 hover:text-white/60'
                                                }`}
                                        >
                                            Pending
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/10">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{registrationType === 'IPD' ? 'Initial Advance Payment' : 'Clinical Fee'}</p>
                                            {registrationType === 'IPD' ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-2xl font-black text-white">₹</span>
                                                    <input
                                                        type="number"
                                                        value={ipdFee}
                                                        onChange={(e) => setIpdFee(e.target.value)}
                                                        className="w-24 bg-white/10 border-b border-white/20 text-2xl font-black text-white outline-none focus:border-teal-400 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <h4 className="text-2xl font-black text-white">
                                                        ₹{selectedDoctor ? (selectedDoctor.consultationFee ?? (selectedDoctor as any).hospitals?.[0]?.consultationFee ?? '0') : '0'}.00
                                                    </h4>
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400">
                                            <Banknote size={20} />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/8 transition-all group">
                                            <input
                                                type="checkbox"
                                                checked={sendToDoctor}
                                                onChange={(e) => setSendToDoctor(e.target.checked)}
                                                className="w-5 h-5 rounded-lg accent-teal-500 border-white/20 bg-transparent"
                                            />
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-white uppercase tracking-tight">Direct Admission</p>
                                                <p className="text-[7.5px] font-bold text-white/30 uppercase mt-0.5">Push to live doctor queue</p>
                                            </div>
                                            <CheckCircle2 size={14} className={`transition-colors ${sendToDoctor ? 'text-teal-400' : 'text-white/10'}`} />
                                        </label>

                                        {(selectedPatient?.activeAdmission || selectedPatient?.activeConsultation) && (
                                            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-4 animate-pulse">
                                                <div className="flex items-center gap-3 text-rose-500">
                                                    <AlertTriangle size={18} />
                                                    <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">
                                                        {selectedPatient?.activeAdmission
                                                            ? `PATIENT IS CURRENTLY ADMITTED (ID: ${selectedPatient?.activeAdmission.admissionId}). CLOSE ADMISSION TO CONTINUE.`
                                                            : "PROCESS ERROR: PATIENT HAS AN ACTIVE RUNNING CONSULTATION. COMPLETE SESSION TO CONTINUE."
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleBooking}
                                            disabled={submitting || !isBookingValid()}
                                            className="w-full py-4 bg-teal-500 text-slate-900 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-teal-400 transition-all shadow-2xl shadow-teal-500/20 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 overflow-hidden group relative"
                                        >
                                            {submitting ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <Receipt size={16} />
                                                    Finish & Print
                                                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </button>
                                        <p className="text-center text-[8px] font-bold text-white/20 uppercase tracking-[0.3em]">Node: {profile?.hospital?.name?.slice(0, 8).toUpperCase() || 'SYSTEM'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* INFO WIDGET */}
                            <div className="bg-amber-50 rounded-[32px] p-6 border border-amber-100 flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                                    <Info size={20} />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Protocol Tip</h4>
                                    <p className="text-[10px] font-bold text-amber-700/70 mt-1">Verify symptoms and vitals before finalizing the print manifest.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. IPD ADMISSION FLOW (IPD ONLY) */}
                    {registrationType === 'IPD' && (
                        <div className="lg:col-start-1 lg:col-span-8 space-y-6 order-2 lg:order-3 pt-8 border-t border-slate-100 animate-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-2 pb-2">
                            <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                                <Activity size={14} />
                            </div>
                            <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">IPD Admission Flow</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                                <FormLabel label="Room Type" />
                                <select
                                    value={admissionData.roomType}
                                    onChange={(e) => setAdmissionData(prev => ({ ...prev, roomType: e.target.value as any, roomId: '', bedId: '' }))}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:border-rose-500 outline-none transition-all"
                                >
                                    <option value="">All Types</option>
                                    {unitTypes.map(type => (
                                        <option key={type} value={type as any}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-3 relative">
                                <FormLabel label="Select Room" />
                                <div
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase cursor-pointer flex justify-between items-center"
                                    onClick={() => setShowRoomSelect(!showRoomSelect)}
                                >
                                    <span className={admissionData.roomId ? 'text-slate-900' : 'text-slate-400'}>
                                        {admissionData.roomId ? (rooms.find(r => r._id === admissionData.roomId)?.label || rooms.find(r => r._id === admissionData.roomId)?.roomId || 'Select Room') : 'Select Room'}
                                    </span>
                                    <ChevronRight size={14} className={`transition-transform duration-200 ${showRoomSelect ? 'rotate-90' : ''}`} />
                                </div>

                                {showRoomSelect && (
                                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-[0_-8px_30px_rgb(0,0,0,0.12)] z-[100] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                                                <input
                                                    autoFocus
                                                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase outline-none focus:border-rose-500"
                                                    placeholder="SEARCH ROOM..."
                                                    value={roomSearch}
                                                    onChange={(e) => setRoomSearch(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto pt-1">
                                            {selectedPatient.activeAdmission && (
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 uppercase tracking-widest">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                    Admitted
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 uppercase tracking-widest">
                                                <span className="text-slate-400">#</span> {selectedPatient.mrn}
                                            </div>
                                            <div
                                                className="px-5 py-2.5 hover:bg-slate-50 text-[10px] font-bold uppercase text-slate-500 cursor-pointer border-b border-slate-50"
                                                onClick={() => {
                                                    setAdmissionData(prev => ({ ...prev, roomId: '', bedId: '' }));
                                                    setShowRoomSelect(false);
                                                }}
                                            >
                                                Clear Selection
                                            </div>
                                            {rooms
                                                .filter(r => !admissionData.roomType || String(r.type || '').toUpperCase() === String(admissionData.roomType || '').toUpperCase())
                                                .filter(r => (r.label || r.roomId || '').toLowerCase().includes(roomSearch.toLowerCase()))
                                                .map(room => (
                                                    <div
                                                        key={room._id}
                                                        className={`px-5 py-3 hover:bg-slate-900 hover:text-white cursor-pointer transition-colors border-b border-slate-50 group flex items-center justify-between ${admissionData.roomId === room._id ? 'bg-slate-900 text-white' : ''}`}
                                                        onClick={() => {
                                                            setAdmissionData(prev => ({ ...prev, roomId: room._id, bedId: '' }));
                                                            setShowRoomSelect(false);
                                                            setRoomSearch("");
                                                        }}
                                                    >
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-tight">{room.label || room.roomId}</p>
                                                            <p className={`text-[8px] font-bold uppercase ${admissionData.roomId === room._id ? 'text-white/60' : 'text-slate-400'}`}>{room.type}</p>
                                                        </div>
                                                        {admissionData.roomId === room._id && <Check size={12} />}
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <FormLabel label="Allocated Bed" />
                                <select
                                    value={admissionData.bedId}
                                    onChange={(e) => setAdmissionData(prev => ({ ...prev, bedId: e.target.value }))}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:border-rose-500 outline-none transition-all"
                                >
                                    <option value="">Select Bed</option>
                                    {beds.filter(b => {
                                        const bedType = String(b.type || '').toLowerCase();
                                        const filterType = String(admissionData.roomType || '').toLowerCase();
                                        const bedRoom = String(b.room || '').toLowerCase();
                                        const selectedRoom = rooms.find(r => r._id === admissionData.roomId);
                                        const selectedRoomLabel = String(selectedRoom?.label || selectedRoom?.roomId || '').toLowerCase();

                                        return (!filterType || bedType === filterType) &&
                                            (!admissionData.roomId || bedRoom === selectedRoomLabel);
                                    }).map(b => (
                                        <option key={b._id} value={b._id}>{b.bedId} (Room: {b.room || 'N/A'})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <FormLabel label="Diet Plan" />
                                    <span className={`text-[7px] font-black tracking-widest ${admissionData.diet.length > 250 ? 'text-rose-500' : 'text-slate-400'}`}>
                                        {admissionData.diet.length}/250
                                    </span>
                                </div>
                                <textarea
                                    value={admissionData.diet}
                                    onChange={(e) => {
                                        if (e.target.value.length <= 250) {
                                            setAdmissionData(prev => ({ ...prev, diet: e.target.value }));
                                        }
                                    }}
                                    rows={2}
                                    placeholder="Diet requirements..."
                                    className={`w-full px-5 py-3.5 bg-slate-50 border ${admissionData.diet.length > 250 ? 'border-rose-500' : 'border-slate-200'} rounded-xl text-xs font-bold uppercase focus:border-rose-500 outline-none transition-all`}
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <FormLabel label="Clinical Notes" />
                                    <span className={`text-[7px] font-black tracking-widest ${admissionData.clinicalNotes.length > 400 ? 'text-rose-500' : 'text-slate-400'}`}>
                                        {admissionData.clinicalNotes.length}/400
                                    </span>
                                </div>
                                <textarea
                                    value={admissionData.clinicalNotes}
                                    onChange={(e) => {
                                        if (e.target.value.length <= 400) {
                                            setAdmissionData(prev => ({ ...prev, clinicalNotes: e.target.value }));
                                        }
                                    }}
                                    rows={2}
                                    placeholder="Nursing instructions..."
                                    className={`w-full px-5 py-3.5 bg-slate-50 border ${admissionData.clinicalNotes.length > 400 ? 'border-rose-500' : 'border-slate-200'} rounded-xl text-xs font-bold uppercase focus:border-rose-500 outline-none transition-all`}
                                />
                            </div>
                        </div>
                        </div>
                    )}
                </div>

                <style jsx global>{`
                    ::-webkit-calendar-picker-indicator {
                        filter: invert(0.5);
                        cursor: pointer;
                    }
                `}</style>
            </div>
        </div>
    );
}

function FormLabel({ label, className = "" }: { label: string, className?: string }) {
    return (
        <label className={`text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 block ${className}`}>
            {label}
        </label>
    );
}

function VitalField({ label, value, onChange, placeholder, error }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string, error?: string }) {
    return (
        <div className="space-y-2 flex flex-col">
            <FormLabel label={label} className="text-[9px] text-slate-400" />
            <input
                type="text"
                value={value}
                placeholder={placeholder || "-"}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full bg-slate-50 border ${error ? 'border-rose-500 ring-4 ring-rose-500/5' : 'border-slate-200'} rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:ring-4 ${error ? 'focus:ring-rose-500/10 focus:border-rose-500' : 'focus:ring-teal-500/10 focus:border-teal-500'} outline-none transition-all placeholder:text-slate-200`}
            />
            {error && <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest px-1">{error}</p>}
        </div>
    );
}
