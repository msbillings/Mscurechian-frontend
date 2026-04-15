'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Phone, Mail, Calendar, MapPin, Activity, FileText, Clock, CreditCard, X, Printer, Loader2, Beaker, ClipboardList, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getDoctorPatientDetailsAction, getDoctorProfileAction, getAllAppointmentsAction, getDoctorInpatientsAction, getPatientHistoryAction } from '@/lib/integrations/actions/doctor.actions';
import { doctorService } from '@/lib/integrations/services/doctor.service';
import { ipdIssuanceService } from '@/lib/integrations/services/pharmacy.service';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import { PrescriptionDocument } from '@/components/documents/PrescriptionDocument';
import { DermatologyPrescriptionDocument } from '@/components/documents/DermatologyPrescriptionDocument';
import { CardiologyPrescriptionDocument } from '@/components/documents/CardiologyPrescriptionDocument';
import LabReportTemplate from '@/components/lab/LabReportTemplate';
import toast from 'react-hot-toast';
import { useVitalsSocket } from '@/lib/hooks/useVitalsSocket';
import { useTenantLink } from '@/hooks/useTenantLink';

const MonitoringTimer = ({ lastRecorded, nextDue, status }: { lastRecorded?: string | Date; nextDue?: string | Date; status?: string }): any => {
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isOverdue, setIsOverdue] = useState(false);

    useEffect(() => {
        if (!lastRecorded && !nextDue) return;
        if (status === 'Stable') return;

        const updateTimer = () => {
            const now = Date.now();
            let targetMs: number;

            if (nextDue) {
                targetMs = new Date(nextDue).getTime();
            } else {
                // Fallback logic if nextDue is missing
                const last = new Date(lastRecorded!).getTime();
                const intervalHours = status === 'Critical' ? 1 : 8;
                targetMs = last + (intervalHours * 60 * 60 * 1000);
            }

            const diffMs = targetMs - now;

            if (diffMs <= 0) {
                setIsOverdue(true);
                const overdueMs = Math.abs(diffMs);
                const hours = Math.floor(overdueMs / (1000 * 60 * 60));
                const mins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft(`Overdue ${hours}h ${mins}m`);
            } else {
                setIsOverdue(false);
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                if (hours === 0 && mins === 0) {
                    setTimeLeft("Due Now");
                } else {
                    setTimeLeft(`Due in ${hours}h ${mins}m`);
                }
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [lastRecorded, nextDue, status]);

    if (status === 'Stable' || (!lastRecorded && !nextDue)) return null;

    return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg ${isOverdue ? 'bg-rose-600 text-white animate-pulse' : 'bg-white/20 text-white backdrop-blur-md border border-white/10'}`}>
            <Clock size={12} />
            {timeLeft}
        </div>
    );
};

function PatientDetailsPage() {
    const { getPath } = useTenantLink();
    const params = useParams();
    const router = useRouter();
    const [patient, setPatient] = useState<any>(null);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [issuances, setIssuances] = useState<any[]>([]);
    const [billSummary, setBillSummary] = useState<any>(null); // NEW: Billing data
    const [patientHistory, setPatientHistory] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDoctorId, setCurrentDoctorId] = useState<string | null>(null);
    const [doctorUserId, setDoctorUserId] = useState<string | null>(null);

    // Prescription View State
    const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
    const [selectedDermData, setSelectedDermData] = useState<any>(null);
    const [selectedCardioData, setSelectedCardioData] = useState<any>(null);
    const [isPivoting, setIsPivoting] = useState(false);
    const [isRxModalOpen, setIsRxModalOpen] = useState(false);
    
    // Lab View State
    const [selectedLabReport, setSelectedLabReport] = useState<any>(null);
    const [isLabModalOpen, setIsLabModalOpen] = useState(false);
    const labPrintRef = React.useRef<HTMLDivElement>(null);

    // ✅ Summary of Issued Medicines
    const currentMedications = React.useMemo(() => {
        const medsMap = new Map();
        issuances.forEach(issuance => {
            issuance.items?.forEach((item: any) => {
                const identifier = item.productId?._id || item.productId || item.medicineName;
                if (!identifier) return; // Skip items without any identification

                const key = identifier.toString();
                if (!medsMap.has(key)) {
                    medsMap.set(key, {
                        name: item.medicineName || 'Unknown Medicine',
                        issued: 0,
                        returned: 0
                    });
                }
                const existing = medsMap.get(key);
                existing.issued += item.quantity || 0;
                existing.returned += item.returnedQty || 0;
            });
        });
        return Array.from(medsMap.values());
    }, [issuances]);

    // ✅ NEW: WebSocket for real-time vitals updates and high-priority alerts
    useVitalsSocket(patient?.user?._id || patient?._id, (newVitals) => {
        console.log('⚡ Vitals updated in real-time!', newVitals);

        // Update patient state with new vitals instantly
        setPatient((prev: any) => {
            if (!prev) return prev;
            return {
                ...prev,
                admission: {
                    ...prev.admission,
                    vitals: newVitals
                }
            };
        });
    }, doctorUserId);

    useEffect(() => {
        const fetchDoctorId = async () => {
            const res = await getDoctorProfileAction();
            if (res.success && res.data) {
                setCurrentDoctorId(res.data._id || res.data.id);
                setDoctorUserId(res.data.user?._id || res.data.user?.id);
            }
        };
        fetchDoctorId();

        if (params.id) {
            loadPatientData(params.id as string);
        }
    }, [params.id]);

    const loadPatientData = async (id: string) => {
        setIsLoading(true);
        try {
            // Use Promise.allSettled so a single failing call doesn't break the entire page load
            const [profileResult, appointmentsResult, inpatientsResult, historyResult] = await Promise.allSettled([
                getDoctorPatientDetailsAction(id),
                // Pass the patient user ID as a search hint; backend filters by it if it's a doctor role
                // We'll do additional client-side filtering after we know the patient IDs
                getAllAppointmentsAction({ limit: 100 }),
                getDoctorInpatientsAction(),
                getPatientHistoryAction(id)
            ]);

            // --- Handle Patient Profile ---
            const profileRes = profileResult.status === 'fulfilled' ? profileResult.value : { success: false, error: 'Failed to load patient profile' };

            if (!profileRes.success || !profileRes.data) {
                toast.error(profileRes.error || "Failed to load patient details");
                setIsLoading(false);
                return;
            }

            let patientData = profileRes.data;

            // --- Handle Inpatients (non-critical, gracefully ignored on failure) ---
            const inpatientsRes = inpatientsResult.status === 'fulfilled' ? inpatientsResult.value : { success: false, data: [] };

            if (inpatientsRes.success && inpatientsRes.data) {
                const pId = patientData._id || patientData.id;
                const pUserId = patientData.user?._id || patientData.user?.id;

                const activeAdmission = inpatientsRes.data.find((adm: any) => {
                    const admPId = adm.patient?._id || adm.patient?.id || adm.patient;
                    return admPId === pId || admPId === pUserId ||
                        String(admPId) === String(pId) || String(admPId) === String(pUserId);
                });

                if (activeAdmission && patientData.admission) {
                    // Merge bed info from inpatients API while preserving vitals from patient details API
                    patientData = {
                        ...patientData,
                        admission: {
                            ...patientData.admission,
                            bed: activeAdmission.bed || patientData.admission.bed,
                            vitals: patientData.admission.vitals // Preserve vitals from patient details API
                        }
                    };
                } else if (activeAdmission && !patientData.admission) {
                    patientData = { ...patientData, admission: activeAdmission };
                }
            }

            setPatient(patientData);

            // --- Handle Pharmacy and Bill data ONLY for confirmed active IPD admissions ---
            // Check if the admission is a real active IPD record (not a stub from appointment data)
            const hasRealActiveAdmission = (() => {
                if (!patientData.admission?.admissionId) return false;
                // Verify via inpatients list (most reliable source of truth)
                const inpData = inpatientsRes.success && inpatientsRes.data ? inpatientsRes.data : [];
                const pId = patientData._id || patientData.id;
                const pUserId = patientData.user?._id || patientData.user?.id;
                const confirmedInIpd = inpData.some((adm: any) => {
                    const admPId = adm.patient?._id || adm.patient?.id || adm.patient;
                    return admPId === pId || admPId === pUserId ||
                        String(admPId) === String(pId) || String(admPId) === String(pUserId);
                });
                // Also allow if the admission object itself has an explicit Active status
                const hasActiveStatus = patientData.admission.status === 'Active' || patientData.admission.status === 'active';
                return confirmedInIpd || hasActiveStatus;
            })();

            if (hasRealActiveAdmission) {
                const admId = patientData.admission!.admissionId;

                ipdIssuanceService.getIssuancesByAdmission(admId)
                    .then((data: any) => setIssuances(data || []))
                    .catch((err: any) => console.error("Issuance fetch failed (non-critical):", err));

                (ipdService as any).getBillSummary(admId)
                    .then((res: any) => setBillSummary(res.summary || res.data?.summary || null))
                    .catch((err: any) => console.error("Bill summary fetch failed (non-critical):", err));
            }

            // --- Handle Appointments & History ---
            const appointmentsRes = appointmentsResult.status === 'fulfilled' ? appointmentsResult.value : { success: false, data: [] };
            const historyRes = historyResult.status === 'fulfilled' ? historyResult.value : { success: false, data: null };

            if (appointmentsRes.success && appointmentsRes.data) {
                const pUserId = patientData.user?._id || patientData.user?.id;
                const pProfileId = patientData._id || patientData.id;

                let filtered = appointmentsRes.data.filter((appt: any) => {
                    const apptPId = appt.patient?._id || appt.patient?.id || appt.patientId || appt.patient;
                    return (pUserId && (apptPId === pUserId || String(apptPId) === String(pUserId))) ||
                        (pProfileId && (apptPId === pProfileId || String(apptPId) === String(pProfileId)));
                });

                // Augment with history data (prescriptions and lab results)
                if (historyRes.success && historyRes.data) {
                    const history = historyRes.data;
                    filtered = filtered.map((appt: any) => {
                        const apptId = String(appt._id || appt.id);
                        const apptDate = new Date(appt.date || appt.startTime).toLocaleDateString();

                        // Find linked prescription (Sync by ID then fallback to Date)
                        const linkedRx = history.prescriptions?.find((rx: any) => {
                            const rxApptId = String(rx.appointment?._id || rx.appointment?.id || rx.appointment || '');
                            const rxDate = new Date(rx.prescriptionDate || rx.createdAt).toLocaleDateString();
                            return rxApptId === apptId || (rxApptId === '' && rxDate === apptDate);
                        });

                        // Find linked lab results (Sync by ID then fallback to Date)
                        const linkedLabs = history.reports?.filter((report: any) => {
                            const repApptId = String(report.appointment?._id || report.appointment?.id || report.appointment || report.appointmentId || '');
                            const repDate = new Date(report.date || report.createdAt).toLocaleDateString();
                            return repApptId === apptId || (repApptId === '' && repDate === apptDate);
                        });

                        return {
                            ...appt,
                            prescriptionDetails: linkedRx || (typeof appt.prescription === 'object' ? appt.prescription : null),
                            labResults: (linkedLabs?.length > 0 ? linkedLabs : (appt.labResults ? (Array.isArray(appt.labResults) ? appt.labResults : [appt.labResults]) : []))
                        };
                    });
                }

                filtered.sort((a: any, b: any) => new Date(b.date || b.startTime).getTime() - new Date(a.date || a.startTime).getTime());
                setAppointments(filtered);
                setPatientHistory(historyRes.data);
            } else if (appointmentsResult.status === 'rejected') {
                console.warn('Appointments fetch failed (non-critical):', appointmentsResult.reason);
            }

        } catch (error) {
            console.error("Error loading patient data:", error);
            toast.error("An error occurred while loading patient data.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPrescriptionDetails = async (visit: any) => {
        const rxId = visit.prescriptionId || visit.prescription?._id || visit.prescription;

        if (!rxId) {
            toast.error("No prescription linked to this consultation.");
            return;
        }

        setIsPivoting(true);
        setIsRxModalOpen(true);
        setSelectedDermData(null);
        setSelectedCardioData(null);
        try {
            const rxRes = await doctorService.getPrescriptionById(rxId);

            if (rxRes.success && (rxRes.prescription || rxRes.data)) {
                const rx = rxRes.prescription || rxRes.data;
                setSelectedPrescription(rx);
                setSelectedDermData(null);
                setSelectedCardioData(null);

                // Fetch Specialty Extensions (Non-blocking)
                try {
                    const [dermRes, cardioRes] = await Promise.all([
                        doctorService.getDermatologyByPrescriptionId(rxId),
                        doctorService.getCardiologyByPrescriptionId(rxId)
                    ]);
                    
                    if (dermRes.success && dermRes.dermatologyData) {
                        setSelectedDermData(dermRes.dermatologyData);
                    }
                    
                    if (cardioRes.success && cardioRes.cardiologyData) {
                        setSelectedCardioData(cardioRes.cardiologyData);
                    }
                } catch (err) {
                    console.error("Failed to fetch specialty data:", err);
                }
            } else {
                toast.error(rxRes.message || "Could not retrieve prescription details.");
                setIsRxModalOpen(false);
            }
        } catch (error) {
            console.error("RX Fetch Error:", error);
            toast.error("Failed to load prescription.");
            setIsRxModalOpen(false);
        } finally {
            setIsPivoting(false);
        }
    };

    const handlePrintPrescription = () => {
        const printWindow = window.open('', '_blank');
        const content = document.querySelector('.print-prescription-container')?.innerHTML;

        if (printWindow && content) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Prescription Print</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                            @media print {
                                @page { size: A4; margin: 0; }
                                body { margin: 0; -webkit-print-color-adjust: exact; }
                            }
                        </style>
                    </head>
                    <body>
                        ${content}
                        <script>
                            window.onload = () => {
                                window.print();
                                // window.close();
                            }
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    const handlePrintLabReport = () => {
        const printWindow = window.open('', '_blank');
        const content = document.querySelector('.print-lab-report-container')?.innerHTML;

        if (printWindow && content) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Lab Report Print</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                            @media print {
                                @page { size: A4; margin: 0; }
                                body { margin: 0; -webkit-print-color-adjust: exact; }
                            }
                        </style>
                    </head>
                    <body>
                        ${content}
                        <script>
                            window.onload = () => {
                                window.print();
                                // window.close();
                            }
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="text-center py-20 bg-secondary-theme flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-muted/20">
                    <User size={40} />
                </div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight italic">Patient Logic Node Empty</h2>
                <button onClick={() => router.back()} className="px-6 py-2.5 bg-primary-theme text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 active:scale-95 shadow-lg shadow-primary-theme/20 transition-all">Go Back</button>
            </div>
        );
    }

    // Backend returns a flattened structure for vitals in PatientProfile
    // patient.user contains name, email, mobile
    const pUser = patient.user || {};

    return (
        <div className="space-y-3 sm:space-y-4 pb-16 pt-2 sm:pt-4">
            {/* Nav Back */}
            <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-foreground font-black text-[10px] uppercase tracking-widest transition-all group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Intelligence Node
            </button>

            {/* Header Card */}
            <div className="bg-card p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-border-theme flex flex-col lg:flex-row gap-4 lg:gap-6 items-start lg:items-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 text-primary-theme/5 rotate-12 group-hover:scale-110 transition-transform duration-700">
                    <User size={120} />
                </div>

                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary-theme to-indigo-600 text-white flex items-center justify-center text-xl sm:text-2xl font-black shadow-xl shadow-primary-theme/20 relative z-10 shrink-0">
                    {pUser.name?.charAt(0) || patient.name?.charAt(0) || 'P'}
                </div>

                <div className="flex-1 relative z-10">
                    <h1 className="text-lg md:text-xl lg:text-xl font-bold text-foreground tracking-tighter uppercase">{pUser.name || patient.name || 'Unknown Patient'}</h1>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 sm:mt-3 text-[10px] sm:text-xs text-muted font-bold uppercase tracking-widest leading-none">
                        <span className="flex items-center gap-1.5"><User size={14} className="text-primary-theme/50" /> {patient.age || '--'} Y / {patient.gender || '---'}</span>
                        <span className="flex items-center gap-1.5"><Activity size={14} className="text-primary-theme/50" /> {patient.bloodGroup || 'BLOOD ---'}</span>
                        <div className="hidden sm:block w-px h-3 bg-border-theme" />
                        <span className="flex items-center gap-1.5"><Phone size={14} className="text-primary-theme/50" /> {patient?.personal?.mobile || pUser.mobile || patient.mobile || '---'}</span>
                        <span className="flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-none">
                            <Mail size={14} className="text-primary-theme/50" />
                            {patient?.personal?.email && patient.personal.email !== 'N/A'
                                ? patient.personal.email
                                : patient?.personal?.emergencyContactEmail && patient.personal.emergencyContactEmail !== 'N/A'
                                    ? patient.personal.emergencyContactEmail
                                    : pUser.email || patient.email || '---'
                            }
                        </span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto relative z-10">
                    <Link href={getPath(`/doctor/prescription/create?patientId=${patient.user?._id || patient.user?.id || patient.id}`)} prefetch={true} className="flex-1 sm:flex-none px-4 py-2.5 bg-secondary-theme text-foreground text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] rounded-lg sm:rounded-xl hover:bg-primary-theme hover:text-white flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 group/btn">
                        <FileText size={14} className="group-hover/btn:rotate-12 transition-transform" /> Prescription
                    </Link>
                    <Link href={getPath(`/doctor/lab-token/create?patientId=${patient.user?._id || patient.user?.id || patient.id}`)} prefetch={true} className="flex-1 sm:flex-none px-4 py-2.5 bg-primary-theme text-white text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] rounded-lg sm:rounded-xl shadow-lg shadow-primary-theme/20 hover:opacity-95 flex items-center justify-center gap-2 transition-all active:scale-95 group/btn">
                        <Activity size={14} className="group-hover/btn:scale-110 transition-transform" /> Lab Token
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Left Col: Vitals & Info */}
                <div className="space-y-3 sm:space-y-4">
                    {/* Inpatient Admission & Bed Info */}
                    {patient.admission && (
                        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 sm:p-5 rounded-xl sm:rounded-2xl text-white relative overflow-hidden shadow-xl shadow-emerald-600/20">
                            <div className="absolute top-0 right-0 p-4 sm:p-6 opacity-10 rotate-12">
                                <Activity size={80} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6 sm:mb-8">
                                    <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-emerald-100/80">Admission Sync</h3>
                                    <MonitoringTimer
                                        lastRecorded={patient.admission.vitals?.lastVitalsRecordedAt}
                                        nextDue={patient.admission.vitals?.nextVitalsDue}
                                        status={patient.admission.vitals?.status}
                                    />
                                </div>
                                <div className="space-y-5">
                                    <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight text-emerald-100/60 italic">Bed Identification</span>
                                        <span className="text-lg sm:text-xl font-black uppercase tracking-tighter leading-none">{patient.admission.bed?.bedId || 'N-001'}</span>
                                    </div>
                                    <div className="flex justify-between items-end border-b border-white/10 pb-3">
                                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-tight text-emerald-100/60 italic">Level / Grid</span>
                                        <span className="text-xs sm:text-sm font-black uppercase tracking-[0.15em] leading-none">
                                            {typeof patient.admission.bed?.type === 'object' ? (patient.admission.bed.type.type || 'Standard') : (patient.admission.bed?.type || 'Standard')} / {typeof patient.admission.bed?.room === 'object' ? (patient.admission.bed.room.name || 'General') : (patient.admission.bed?.room || 'General')}
                                        </span>
                                    </div>
                                    <div className="pt-2 flex justify-between items-center">
                                        <span className="text-[8px] sm:text-[10px] font-black text-emerald-100/50 uppercase tracking-[0.2em]">Deployment Date</span>
                                        <span className="text-[10px] sm:text-xs font-black italic text-emerald-50">
                                            {patient.admission.admissionDate ? new Date(patient.admission.admissionDate).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Financial Summary - NEW */}
                    {patient.admission && billSummary && (
                        <div className="bg-card p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-border-theme transition-all hover:border-primary-theme/20">
                            <h3 className="text-[9px] sm:text-[10px] font-black text-muted uppercase tracking-[0.25em] mb-4 sm:mb-6 italic">Financial Operations</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-[10px] sm:text-xs font-black uppercase tracking-tight">
                                    <span className="text-muted/60 italic">Gross Resource Cost</span>
                                    <span className="text-foreground">₹{(billSummary.bedCharges + billSummary.extraCharges).toLocaleString()}</span>
                                </div>
                                {billSummary.returnCredits > 0 && (
                                    <div className="flex justify-between items-center text-[10px] sm:text-xs font-black uppercase tracking-tight">
                                        <span className="text-rose-500 italic">(-) Intelligence Return</span>
                                        <span className="text-rose-600 font-black">- ₹{billSummary.returnCredits.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-4 border-t border-dashed border-border-theme">
                                    <span className="text-[10px] sm:text-xs font-black text-primary-theme uppercase tracking-widest italic">Current Logic Bill</span>
                                    <span className="text-base sm:text-lg font-black text-primary-theme">₹{billSummary.finalAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center bg-secondary-theme/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border-theme shadow-inner">
                                    <div>
                                        <p className="text-[8px] font-black text-muted uppercase tracking-widest opacity-60">Sequence Balance</p>
                                        <p className="text-base sm:text-lg lg:text-xl font-black text-primary-theme leading-tight tracking-tighter">₹{billSummary.balanceOutstanding.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] sm:text-[9px] font-black text-muted uppercase tracking-widest opacity-60">Resolved</p>
                                        <p className="text-xs sm:text-sm font-black text-emerald-500 italic">₹{(billSummary.advancePaid + billSummary.settlementPaid).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Current Medication Monitoring */}
                    {patient.admission && issuances.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Inpatient Pharmacy</h3>
                                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg uppercase">{issuances.length} Issuances</span>
                            </div>
                            <div className="space-y-3">
                                {currentMedications.map((med: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex-1 min-w-0 mr-3">
                                            <p className="text-[11px] font-black text-slate-800 uppercase truncate">{med.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Issued: {med.issued}</span>
                                                {med.returned > 0 && (
                                                    <span className="text-[9px] font-black text-rose-500 uppercase">Returned: {med.returned}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs font-black text-slate-900">{med.issued - med.returned}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Balance</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Vitals - From Active Admission */}
                    <div className="bg-card p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-border-theme">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[9px] sm:text-[10px] font-black text-muted uppercase tracking-[0.25em] italic">
                                {patient.admission?.vitals ? 'Admission Sync' : 'Baseline Logic'}
                            </h3>
                            {(patient.admission?.vitals?.timestamp || patient.updatedAt) && (
                                <span className="text-[8px] sm:text-[9px] font-black text-muted uppercase tracking-widest opacity-50">
                                    {new Date(patient.admission?.vitals?.timestamp || patient.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                        {patient.admission?.vitals || patient.pulse || patient.bloodPressure || patient.spO2 || patient.temperature ? (
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div className="p-2 sm:p-3 bg-rose-50 dark:bg-rose-500/5 rounded-lg sm:rounded-xl border border-rose-100 dark:border-rose-900/10 group transition-all hover:scale-[1.02]">
                                    <p className="text-[8px] sm:text-[9px] font-black text-rose-500 uppercase mb-0.5 tracking-widest italic leading-none">Pulse</p>
                                    <p className="text-base sm:text-xl font-black text-rose-600 tracking-tighter">
                                        {patient.admission?.vitals?.heartRate || patient.pulse || '--'}
                                        <span className="text-[9px] sm:text-[10px] font-bold text-rose-400/60 ml-1 uppercase tracking-widest">bpm</span>
                                    </p>
                                </div>
                                <div className="p-2 sm:p-3 bg-primary-theme/5 rounded-lg sm:rounded-xl border border-primary-theme/10 group transition-all hover:scale-[1.02]">
                                    <p className="text-[8px] sm:text-[9px] font-black text-primary-theme uppercase mb-0.5 tracking-widest italic leading-none">Pressure</p>
                                    <p className="text-base sm:text-xl font-black text-primary-theme tracking-tighter">
                                        {patient.admission?.vitals?.bloodPressure || patient.bloodPressure || '--/--'}
                                        <span className="text-[9px] sm:text-[10px] font-bold text-primary-theme/40 ml-1 uppercase tracking-widest">mmHg</span>
                                    </p>
                                </div>
                                <div className="p-2 sm:p-3 bg-cyan-50 dark:bg-cyan-500/5 rounded-lg sm:rounded-xl border border-cyan-100 dark:border-cyan-900/10 group transition-all hover:scale-[1.02]">
                                    <p className="text-[8px] sm:text-[9px] font-black text-cyan-600 uppercase mb-0.5 tracking-widest italic leading-none">Saturation</p>
                                    <p className="text-base sm:text-xl font-black text-cyan-700 tracking-tighter">
                                        {patient.admission?.vitals?.spO2 || patient.spO2 || '--'}
                                        <span className="text-[9px] sm:text-[10px] font-bold text-cyan-500/40 ml-1 uppercase tracking-widest">%</span>
                                    </p>
                                </div>
                                <div className="p-2 sm:p-3 bg-orange-50 dark:bg-orange-500/5 rounded-lg sm:rounded-xl border border-orange-100 dark:border-orange-900/10 group transition-all hover:scale-[1.02]">
                                    <p className="text-[8px] sm:text-[9px] font-black text-orange-600 uppercase mb-0.5 tracking-widest italic leading-none">Thermal</p>
                                    <p className="text-base sm:text-xl font-black text-orange-700 tracking-tighter">
                                        {patient.admission?.vitals?.temperature || patient.temperature || '--'}
                                        <span className="text-[9px] sm:text-[10px] font-bold text-orange-500/40 ml-1 uppercase tracking-widest">°F</span>
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 opacity-40">
                                <Activity className="w-10 h-10 text-muted mx-auto mb-3" />
                                <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] italic">No Logic Sequence Sync</p>
                            </div>
                        )}
                    </div>

                    {/* Contact & Address */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">Contact Info</h3>
                        <div className="space-y-4 text-sm">
                            <div className="flex items-start gap-3">
                                <MapPin size={18} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="font-bold text-gray-900">Address</p>
                                    <p className="text-gray-500">{patient.address || 'No address provided'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col: Timeline/History */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Medical History */}
                    <div className="bg-card p-4 sm:p-7 rounded-2xl sm:rounded-[2rem] shadow-sm border border-border-theme transition-all hover:border-primary-theme/20 mb-6">
                        <div className="flex items-center justify-between mb-6 pb-2 border-b border-border-theme/30">
                            <h3 className="text-[9px] sm:text-[10px] font-black text-muted uppercase tracking-[0.25em] italic">Clinical History Node</h3>
                            <Activity size={16} className="text-primary-theme/30" />
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            {patient.medicalHistory ? (
                                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-secondary-theme text-foreground text-[10px] sm:text-xs rounded-xl font-black uppercase tracking-widest border border-border-theme shadow-sm">{patient.medicalHistory}</span>
                            ) : (
                                <p className="text-muted text-[10px] sm:text-xs font-bold uppercase tracking-widest italic opacity-50">No baseline allergic or chronic data synced.</p>
                            )}
                        </div>
                        <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                            {patient.conditions && patient.conditions !== 'None' && (
                                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] sm:text-[10px] rounded-xl font-black uppercase tracking-widest border border-rose-100 dark:border-rose-900/30">Conditions: {patient.conditions}</span>
                            )}
                            {patient.allergies && patient.allergies !== 'None' && (
                                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] sm:text-[10px] rounded-xl font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">Allergies: {patient.allergies}</span>
                            )}
                            {patient.medications && patient.medications !== 'None' && (
                                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary-theme/5 text-primary-theme text-[9px] sm:text-[10px] rounded-xl font-black uppercase tracking-widest border border-primary-theme/10">Meds: {patient.medications}</span>
                            )}
                        </div>
                    </div>

                    {/* Laboratory Intelligence Tracker - Dedicated Section */}
                    {patientHistory?.reports?.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-indigo-100 shadow-sm mb-6 transition-all hover:shadow-md animate-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-indigo-50 dark:border-indigo-900/20">
                                <div>
                                    <h3 className="text-[10px] sm:text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-[0.2em] italic">Laboratory Intelligence Tracker</h3>
                                    <p className="text-[7px] sm:text-[8px] font-bold text-muted uppercase tracking-widest mt-0.5 opacity-60">Verified Results & Diagnostic Billing Sequence</p>
                                </div>
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Beaker className="text-indigo-500" size={16} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {patientHistory.reports.slice(0, 4).map((report: any, idx: number) => (
                                    <div 
                                        key={idx} 
                                        className={`p-3 bg-indigo-50/20 dark:bg-indigo-900/5 border border-indigo-100/30 rounded-xl relative group transition-all duration-300 ${report.status?.toLowerCase() === 'completed' ? 'cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:border-indigo-300' : ''}`}
                                        onClick={() => {
                                            if (report.status?.toLowerCase() === 'completed') {
                                                const labTests = report.results || report.tests || [];
                                                const mappedSample = {
                                                    ...report,
                                                    patientDetails: {
                                                        name: pUser.name || patient.name,
                                                        age: patient.age,
                                                        gender: patient.gender,
                                                        mobile: pUser.mobile || patient.mobile,
                                                        refDoctor: report.referredBy || 'Self'
                                                    },
                                                    tests: labTests.map((t: any) => ({
                                                        ...t,
                                                        testName: t.testName || t.name || 'Investigation',
                                                        resultValue: t.result || t.resultValue
                                                    })),
                                                    reportDate: report.completedAt || report.updatedAt || report.createdAt
                                                };
                                                setSelectedLabReport(mappedSample);
                                                setIsLabModalOpen(true);
                                            }
                                        }}
                                    >
                                        <div
                                            className="flex items-center justify-between mb-2"
                                        >
                                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none">
                                                ID: {report.tokenNumber || report._id?.slice(-6) || 'N/A'} • {new Date(report.date || report.createdAt).toLocaleDateString()}
                                            </span>
                                            <div className="flex items-center gap-1.5 min-h-[16px]">
                                                <span className={`px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest rounded border ${report.status?.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                    {report.status}
                                                </span>
                                                <span className="px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest border border-indigo-100 bg-white/50 text-indigo-500 rounded">
                                                    {report.paymentStatus || 'Paid'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            {(report.results || report.tests || []).slice(0, 3).map((test: any, tIdx: number) => (
                                                <div key={tIdx} className="flex flex-col py-1 border-b border-indigo-100/10 last:border-0">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[9px] font-black text-foreground uppercase tracking-tight truncate">{test.testName || test.name || 'Investigation'}</span>
                                                            <span className="text-[7px] font-bold text-muted-foreground uppercase leading-none opacity-60">Status: {test.status || report.status}</span>
                                                        </div>
                                                        <span className={`text-[9px] font-black italic tracking-tighter ${test.isAbnormal ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
                                                            {test.result || test.resultValue || (test.subTests?.length > 0 ? 'Multiple' : 'Processing')}
                                                        </span>
                                                    </div>
                                                    {/* Sub-tests hint if they exist */}
                                                    {test.subTests?.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {test.subTests.slice(0, 2).map((sub: any, sIdx: number) => (
                                                                 <span key={sIdx} className="text-[6px] font-bold text-muted uppercase bg-indigo-50/50 px-1 rounded-sm opacity-60">
                                                                    {sub.name}: {sub.result}
                                                                </span>
                                                            ))}
                                                            {test.subTests.length > 2 && <span className="text-[6px] font-bold text-muted opacity-40">...</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {report.status?.toLowerCase() === 'completed' && (
                                            <div className="mt-3 block w-full text-center text-[7px] font-black text-indigo-600 bg-white dark:bg-indigo-900/20 border border-indigo-100/50 py-1.5 rounded uppercase tracking-[0.2em] shadow-xs group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                Access Certified Report
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Past Consultations */}
                    <div className="bg-card p-4 sm:p-8 rounded-2xl sm:rounded-[2.5rem] shadow-sm border border-border-theme">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border-theme/30">
                            <div>
                                <h3 className="text-lg md:text-xl lg:text-xl font-bold text-foreground uppercase tracking-tight ">Consultation Sequence</h3>
                                <p className="text-[10px] font-black text-muted uppercase tracking-[0.25em] mt-1 opacity-60">Historical Medical Timeline</p>
                            </div>
                            <FileText className="text-primary-theme/30" size={24} />
                        </div>

                        <div className="space-y-6 sm:space-y-10 pl-2">
                            {appointments.length > 0 ? (
                                appointments.map((visit: any, idx: number, arr: any[]) => (
                                    <div
                                        key={idx}
                                        className="flex gap-4 sm:gap-8 relative cursor-pointer group"
                                        onClick={() => fetchPrescriptionDetails(visit)}
                                    >
                                        {/* Timeline Line */}
                                        {idx !== arr.length - 1 && (
                                            <div className="absolute left-[19px] sm:left-[27px] top-10 sm:top-14 bottom-[-24px] sm:bottom-[-40px] w-0.5 bg-border-theme/60 dashed-timeline group-hover:bg-primary-theme/30 transition-all duration-300"></div>
                                        )}
                                        <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-secondary-theme text-primary-theme border border-border-theme shadow-sm flex items-center justify-center shrink-0 z-10 group-hover:bg-primary-theme group-hover:text-white transition-all group-hover:scale-110">
                                            <FileText size={16} className="sm:w-5 sm:h-5" />
                                        </div>
                                        <div className="flex-1 bg-secondary-theme/20 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-transparent group-hover:border-primary-theme/20 group-hover:bg-white dark:group-hover:bg-card group-hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                                                <div>
                                                    <h4 className="text-sm sm:text-lg font-bold text-foreground uppercase tracking-tight group-hover:text-primary-theme transition-colors">{visit.reason || visit.symptoms?.[0] || 'General Node'}</h4>
                                                    <p className="text-[10px] sm:text-xs text-muted font-bold flex items-center gap-2 mt-1 sm:mt-2 uppercase tracking-widest italic opacity-70">
                                                        <Clock size={12} className="text-primary-theme" /> {new Date(visit.date || visit.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} @ {visit.time || 'SCAN'}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                                    <span className={`px-2 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest rounded-full shadow-xs border ${visit.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                        visit.status === 'Cancelled' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                            'bg-amber-50 text-amber-600 border-amber-200'
                                                        }`}>
                                                        {visit.status || 'Active'}
                                                    </span>
                                                    {(visit.paymentStatus || visit.prescriptionDetails?.status) && (
                                                        <span className={`px-2 py-0.5 text-[7px] sm:text-[8px] font-black uppercase tracking-widest rounded-md flex items-center gap-1 shadow-xs border ${visit.paymentStatus === 'Paid' || visit.prescriptionDetails?.status?.toLowerCase() === 'paid' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-gray-50 text-muted border-border-theme'}`}>
                                                            <CreditCard size={9} /> {visit.prescriptionDetails?.status || visit.paymentStatus}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[10px] sm:text-xs text-muted font-bold uppercase tracking-tight leading-tight mb-2 line-clamp-1 italic opacity-80">{visit.notes || visit.diagnosis || 'Clinical sequence recorded.'}</p>


                                            <div className="flex flex-wrap items-center gap-3 mt-1 pt-2 border-t border-border-theme/10">
                                                {(visit.prescriptionId || visit.prescription || visit.prescription?._id || visit.prescriptionDetails) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (visit.prescriptionDetails?.medicines) {
                                                                setSelectedPrescription(visit.prescriptionDetails);
                                                                setIsRxModalOpen(true);
                                                            } else {
                                                                fetchPrescriptionDetails(visit);
                                                            }
                                                        }}
                                                        className="text-[9px] sm:text-xs font-black text-primary-theme hover:opacity-80 flex items-center gap-1.5 uppercase tracking-widest transition-all p-1.5 -ml-1.5 rounded-lg hover:bg-primary-theme/5"
                                                    >
                                                        <FileText size={12} /> Diagnosis Node
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 opacity-30">
                                    <Calendar className="w-16 h-16 text-muted mx-auto mb-4" />
                                    <p className="text-[10px] sm:text-xs font-black text-muted uppercase tracking-[0.3em] italic">Historic Ledger Empty</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Prescription Modal */}
            {isRxModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden relative border border-slate-200">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-2.5 sm:p-4 border-b border-slate-100 bg-white z-10 shrink-0">
                            <div className="min-w-0">
                                <h3 className="text-xs sm:text-lg font-black text-gray-900 uppercase tracking-tight truncate">Prescription Node</h3>
                                <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Verified Multi-Role Registry</p>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                {selectedPrescription && (
                                    <button
                                        onClick={handlePrintPrescription}
                                        className="p-1.5 sm:p-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg sm:rounded-xl font-black flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                                    >
                                        <Printer size={14} className="sm:size-[16px]" /> <span className="hidden xs:inline">Print</span><span className="xs:hidden">Print</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => { setIsRxModalOpen(false); setSelectedPrescription(null); setSelectedDermData(null); }}
                                    className="p-1.5 sm:p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg sm:rounded-xl active:scale-95 transition-all border border-transparent"
                                >
                                    <X size={18} className="sm:size-[20px]" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 bg-white p-0 sm:p-4 overflow-x-hidden overflow-y-auto no-scrollbar flex justify-center items-start">
                            {isPivoting ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4 w-full">
                                    <Loader2 className="w-12 h-12 text-teal-600 animate-spin" />
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Fetching Clinical Data...</p>
                                </div>
                            ) : selectedPrescription ? (
                                <div className="print-prescription-container shadow-none bg-white w-full sm:w-[210mm] shrink-0">
                                    {selectedCardioData ? (
                                        <CardiologyPrescriptionDocument 
                                            prescription={selectedPrescription} 
                                            patient={patient} 
                                            cardiologyData={selectedCardioData}
                                        />
                                    ) : selectedDermData ? (
                                        <DermatologyPrescriptionDocument 
                                            prescription={selectedPrescription} 
                                            patient={patient} 
                                            dermatologyData={selectedDermData}
                                        />
                                    ) : (
                                        <PrescriptionDocument 
                                            prescription={selectedPrescription} 
                                            patient={patient} 
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-20 flex flex-col items-center gap-4 w-full">
                                    <FileText size={48} className="text-gray-200" />
                                    <p className="text-sm font-bold text-gray-400">Prescription details could not be loaded.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Lab Report Modal */}
            {isLabModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden relative border border-slate-200">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-2.5 sm:p-4 border-b border-slate-100 bg-white z-10 shrink-0">
                            <div className="min-w-0">
                                <h3 className="text-xs sm:text-lg font-black text-gray-900 uppercase tracking-tight truncate">Lab Report Node</h3>
                                <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Certified Diagnostic Results</p>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                {selectedLabReport && (
                                    <button
                                        onClick={handlePrintLabReport}
                                        className="p-1.5 sm:p-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg sm:rounded-xl font-black flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                                    >
                                        <Printer size={14} className="sm:size-[16px]" /> <span className="hidden xs:inline">Print</span><span className="xs:hidden">Print</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => { setIsLabModalOpen(false); setSelectedLabReport(null); }}
                                    className="p-1.5 sm:p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg sm:rounded-xl active:scale-95 transition-all border border-transparent"
                                >
                                    <X size={18} className="sm:size-[20px]" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 bg-white p-0 sm:p-4 overflow-x-hidden overflow-y-auto no-scrollbar flex justify-center items-start">
                            {selectedLabReport ? (
                                <div className="print-lab-report-container shadow-none bg-white w-full sm:w-[210mm] shrink-0">
                                    <LabReportTemplate sample={selectedLabReport} />
                                </div>
                            ) : (
                                <div className="text-center py-20 flex flex-col items-center gap-4 w-full">
                                    <Beaker size={48} className="text-gray-200" />
                                    <p className="text-sm font-bold text-gray-400">Lab report details could not be loaded.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default React.memo(PatientDetailsPage);
