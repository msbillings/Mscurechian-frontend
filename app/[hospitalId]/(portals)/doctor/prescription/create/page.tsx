'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import MainHeader from '@/components/printers/MainHeader';
import MainFooter from '@/components/printers/MainFooter';
import {
    Printer,
    Sparkles,
    User,
    Stethoscope,
    Plus,
    Trash2,
    FileText,
    Activity,
    Calendar,
    Save,
    Eraser,
    PenTool,
    ArrowLeft,
    Loader2,
    Search,
    Pill,
    AlertCircle,
    CheckCircle2,
    X,
    FlaskConical,
    Baby,
    Eye,
    Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAppointmentDetailsAction, getDoctorProfileAction } from '@/lib/integrations/actions/doctor.actions';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import medicineData from '@/medicine.json';
import { doctorService } from '@/lib/integrations/services/doctor.service';
import { PediatricsModule } from './modules/PediatricsModule';
import { OphthalmologyModule } from './modules/OphthalmologyModule';
import { GeneralSurgeryModule } from './modules/GeneralSurgeryModule';

// --- Types ---
interface Medicine {
    productId?: string;
    name: string;
    form: string;
    dosage: string;
    freq: string;
    duration: string;
    quantity: string;
    price: number;
    unitsPerPack?: number;
    availableUnits?: number;
    pricePerUnit?: number;
    error?: string;
}


interface PrescriptionForm {
    patientName: string;
    age: string;
    gender: string;
    duration: string;
    mrn: string;
    date: string;
    symptoms: string;
    diagnosis: string;
    medicines: Medicine[];
    dietAdvice: string[];
    suggestedTests: string[];
    followUp: string;
    followUpDate: string;
    avoid: string[];
    doctorName: string;
    doctorSpecialization: string;
    doctorSignature?: string; // URL or base64
    subtotal: number;
    tax: number;
    total: number;
    notes: string;
    pediatricData?: any;
    ophthaData?: any;
    surgeryData?: any;
}

const INITIAL_FORM: PrescriptionForm = {
    patientName: '',
    age: '',
    gender: 'Male',
    duration: '',
    mrn: '',
    date: new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY
    symptoms: '',
    diagnosis: '',
    medicines: [],
    dietAdvice: [],
    suggestedTests: [],
    followUp: '',
    followUpDate: '',
    avoid: [],
    doctorName: '',
    doctorSpecialization: '',
    subtotal: 0,
    tax: 0,
    total: 0,
    pediatricData: {
        weight: '',
        height: '',
        headCircumference: '',
        temperature: '98.6',
        heartRate: '',
        respRate: '',
        growth: { weightForAge: '', heightForAge: '' },
        milestones: '',
        milestoneNotes: '',
        immunizationStatus: '',
        dueVaccines: [],
        symptoms: [],
        redFlags: [],
        notes: ''
    },
    ophthaData: {
        vision: { od: { unaided: '', corrected: '' }, os: { unaided: '', corrected: '' } },
        refraction: { od: { sph: '', cyl: '', axis: '' }, os: { sph: '', cyl: '', axis: '' } },
        iop: { od: '', os: '' },
        pupils: '',
        symptoms: [],
        slitLamp: { conjunctiva: '', cornea: '', anteriorChamber: '', lens: '' },
        fundus: { retina: '', opticDisc: '', macula: '' },
        diagnosis: '',
        notes: ''
    },
    surgeryData: {
        surgeryType: '',
        procedurePlanned: '',
        indication: '',
        physicalExam: { abdomen: '', thorax: '', limbs: '', others: '' },
        vitals: {},
        systemicReview: { cvs: '', rs: '', cns: '', git: '' },
        preOpChecklist: { npoStatus: false, consentSigned: false, investigationsDone: false, bloodCrossMatched: false },
        diagnosis: '',
        notes: ''
    },
    notes: ''
};

function CreatePrescriptionPage({ params }: { params: Promise<{ hospitalId: string }> }) {
    const resolvedParams = use(params);
    const hospitalId = resolvedParams.hospitalId;
    const router = useRouter();
    const searchParams = useSearchParams();
    const appointmentId = searchParams.get('appointmentId');
    const patientId = searchParams.get('patientId');
    const admissionId = searchParams.get('admissionId');

    const [mode, setMode] = useState<'AI' | 'SELF'>('SELF');
    const [formData, setFormData] = useState<PrescriptionForm>(INITIAL_FORM);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // UI states
    const [sentToPharma, setSentToPharma] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showNoPharmaWarn, setShowNoPharmaWarn] = useState(false);

    // Suggestion State
    const [activeMedIndex, setActiveMedIndex] = useState<number | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- Hospital Data ---
    const { data: hospitalDataRaw } = useQuery({
        queryKey: ['hospitalDetails', hospitalId],
        queryFn: () => hospitalAdminService.getHospital(),
        enabled: !!hospitalId
    });
    const hospitalBranding = hospitalDataRaw?.hospital;

    // Draft State
    const [showPharmaConfirm, setShowPharmaConfirm] = useState(false);
    const [isDraftLoaded, setIsDraftLoaded] = useState(false);

    // Success State
    const [showSuccess, setShowSuccess] = useState(false);
    const [generatedHtml, setGeneratedHtml] = useState<{ prescription: string, billing: string } | null>(null);

    // Module Toggles
    const [activeModule, setActiveModule] = useState<'NONE' | 'PEDS' | 'OPHTHA' | 'SURGERY'>('NONE');

    // Auto-detect specialist module
    useEffect(() => {
        if (formData.doctorSpecialization) {
            const spec = formData.doctorSpecialization.toLowerCase();
            if (spec.includes('pedia')) setActiveModule('PEDS');
            else if (spec.includes('ophthal')) setActiveModule('OPHTHA');
            else if (spec.includes('surger')) setActiveModule('SURGERY');
        }
    }, [formData.doctorSpecialization]);


    // -- Fetch Appointment Details if ID present --
    useEffect(() => {
        if (appointmentId) {
            const fetchDetails = async () => {
                try {
                    setLoading(true);
                    const res = await getAppointmentDetailsAction(appointmentId);

                    if (res.success && res.data) {
                        const apt = res.data;
                        const patientName = apt.patient?.name || apt.patientDetails?.name || '';
                        const age = apt.patient?.age || apt.patientDetails?.age || '';
                        const gender = apt.patient?.gender || apt.patientDetails?.gender || 'Male';
                        const mrn = apt.patient?.mrn || apt.mrn || '';
                        const symptoms = Array.isArray(apt.symptoms) ? apt.symptoms.join(', ') : (apt.symptoms || '');
                        const diagnosis = apt.reason || symptoms;

                        setFormData(prev => ({
                            ...prev,
                            patientName,
                            age: String(age),
                            gender: gender,
                            mrn,
                            symptoms,
                            diagnosis
                        }));
                    } else {
                        toast.error(res.error || "Failed to load appointment details");
                    }
                } catch (error) {
                    console.error("Failed to prefill", error);
                    toast.error("Failed to load appointment details");
                } finally {
                    setLoading(false);
                }
            };
            fetchDetails();
        } else if (patientId) {
            // Fetch Patient Details directly
            const fetchPatient = async () => {
                try {
                    setLoading(true);
                    const res = await doctorService.getPatientDetails(patientId);
                    const p = res.patient || res; // Handle both direct and nested formats
                    if (p) {
                        setFormData(prev => ({
                            ...prev,
                            patientName: p.name || '',
                            age: String(p.age || ''),
                            gender: p.gender || 'Male',
                            mrn: p.mrn || '',
                        }));
                    }
                } catch (err) {
                    console.error("Failed to fetch patient data", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchPatient();
        }
    }, [appointmentId, patientId]);

    // -- Load / Save Draft --
    useEffect(() => {
        const saved = localStorage.getItem(`prescription_draft_${appointmentId || patientId || 'default'}`);
        if (saved && !isDraftLoaded) {
            try {
                const parsed = JSON.parse(saved);
                setFormData(prev => ({ ...prev, ...parsed }));
                setIsDraftLoaded(true);
                toast.success("Resumed unsaved draft", { icon: '📝', duration: 2000 });
            } catch (e) {
                console.error("Draft load failed", e);
            }
        }
    }, [appointmentId, patientId, isDraftLoaded]);

    useEffect(() => {
        if (formData !== INITIAL_FORM) {
            localStorage.setItem(`prescription_draft_${appointmentId || patientId || 'default'}`, JSON.stringify(formData));
        }
    }, [formData, appointmentId, patientId]);

    useEffect(() => {
        const fetchDoctorProfile = async () => {
            const res = await getDoctorProfileAction();
            if (res.success && res.data) {
                const doc = res.data;
                const specialization = doc.specialties && Array.isArray(doc.specialties) && doc.specialties.length > 0 
                    ? doc.specialties.join(', ') 
                    : (doc.department || 'Medical Practitioner');

                setFormData(prev => ({
                    ...prev,
                    doctorName: doc.user?.name || doc.name || prev.doctorName,
                    doctorSpecialization: specialization,
                    doctorSignature: doc.signature
                }));
            }
        };
        fetchDoctorProfile();
    }, []);

    // -- Fetch Hospital Branding handled by useQuery --

    // -- Medicine Search Logic --
    const handleMedicineSearch = (query: string, index: number) => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        setActiveMedIndex(index);

        if (!query || query.length < 2) {
            setSuggestions([]);
            return;
        }

        setSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await doctorService.searchMedicines(query);
                if (res.success) {
                    setSuggestions(res.data);
                }
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setSearching(false);
            }
        }, 300); // Debounce
    };

    const selectMedicine = (med: any, index: number) => {
        const newMeds = [...formData.medicines];
        // Construct a nice name from the pharma data
        const fullName = `${med.brand} (${med.generic}) ${med.strength}`;

        const unitsPerPack = med.unitsPerPack || 1;
        const availableUnits = (med.stock || 0) * unitsPerPack;
        const pricePerUnit = (med.mrp || 0) / unitsPerPack;

        newMeds[index] = {
            ...newMeds[index],
            productId: med._id,
            name: fullName,
            form: med.form || '',              // Form type: TABLET / CAPSULE / SYRUP etc.
            dosage: med.strength || '',        // Auto-fill dosage from strength (e.g. "10mg")
            price: med.mrp || 0,
            unitsPerPack,
            availableUnits,
            pricePerUnit,
            error: ''
        };

        setFormData(prev => ({ ...prev, medicines: newMeds }));
        calculateBilling(newMeds);

        // Reset search
        setSuggestions([]);
        setActiveMedIndex(null);
    };


    const handleGeneratePrescription = () => {
        if (!formData.symptoms) {
            toast.error("No symptoms to generate prescription from");
            return;
        }

        const currentSymptoms = formData.symptoms.split(',').map(s => s.trim().toLowerCase());
        let matchedMeds: Medicine[] = [];
        let matchedDiet: string[] = [];
        let matchedTests: string[] = [];
        let matchedAvoid: string[] = [];
        let matchedFollowUp: string = '';
        let matchedDiagnosis: string[] = [];

        medicineData.symptoms_data.forEach((protocol: any) => {
            const protocolSymptomLower = protocol.symptom.toLowerCase();
            const keywords = protocol.keywords ? protocol.keywords.map((k: string) => k.toLowerCase()) : [];

            // Match against main symptom name OR any keywords
            const isMatch = currentSymptoms.some(userSym => {
                const userSymLower = userSym.toLowerCase();
                // Check if user symptom contains protocol name or vice versa
                const nameMatch = userSymLower.includes(protocolSymptomLower) || protocolSymptomLower.includes(userSymLower);
                // Check if user symptom contains any keyword or vice versa
                const keywordMatch = keywords.some((k: string) => userSymLower.includes(k) || k.includes(userSymLower));

                return nameMatch || keywordMatch;
            });

            if (isMatch) {
                matchedDiagnosis.push(protocol.symptom);
                const meds: Medicine[] = protocol.medicine.map((m: string) => {
                    // Try to parse the medicine string "Name Dosage (Frequency)"
                    let name = m;
                    let dosage = '-';
                    let freq = '-';
                    const duration = '-';
                    const notes = '-';

                    // Heuristic parsing
                    // 1. Extract Frequency from parens
                    if (m.includes('(')) {
                        const parts = m.split('(');
                        name = parts[0].trim();
                        freq = parts[1].replace(')', '').trim();
                    }

                    // 2. Extract Dosage Strength from Name (e.g. 500 mg, 650mg, 200-400mg)
                    const strengthRegex = /(\d+(?:-\d+)?\s*(?:mg|ml|g|mcg|iu))/i;
                    const strengthMatch = name.match(strengthRegex);

                    if (strengthMatch) {
                        dosage = strengthMatch[0]; // "500 mg"
                        name = name.replace(strengthRegex, '').trim(); // Remove strength from name
                    }

                    // Calculate Quantity
                    let qty = 1;
                    const durationDays = 5; // Default 5 days
                    // Parse freq e.g., "1-0-1" -> 2, "every 6 hrs" -> 4
                    let dailyCount = 1;
                    if (freq.includes('-')) {
                        // e.g. 1-0-1
                        const parts = freq.split('-').map(p => parseInt(p.trim()) || 0);
                        dailyCount = parts.reduce((a, b) => a + b, 0);
                    } else if (freq.toLowerCase().includes('hr')) {
                        const match = freq.match(/(\d+)/);
                        if (match) {
                            dailyCount = Math.floor(24 / parseInt(match[0]));
                        }
                    }

                    if (dailyCount > 0) {
                        qty = dailyCount * durationDays;
                    }

                    return {
                        name: name,
                        dosage: dosage,
                        freq: freq,
                        duration: `${durationDays} days`,
                        quantity: String(qty),
                        price: 0
                    };
                });
                matchedMeds = [...matchedMeds, ...meds];
                if (protocol.diet_advice) matchedDiet = [...matchedDiet, ...protocol.diet_advice];
                if (protocol.suggested_tests) matchedTests = [...matchedTests, ...protocol.suggested_tests];
                if (protocol.avoid) matchedAvoid = [...matchedAvoid, ...protocol.avoid];
                if (protocol.follow_up) matchedFollowUp = protocol.follow_up;
            }
        });

        if (matchedMeds.length === 0) {
            toast.error("No matching protocols found for these symptoms");
            return;
        }

        matchedDiet = Array.from(new Set(matchedDiet));
        matchedTests = Array.from(new Set(matchedTests));
        matchedAvoid = Array.from(new Set(matchedAvoid));
        matchedDiagnosis = Array.from(new Set(matchedDiagnosis));

        setFormData(prev => ({
            ...prev,
            diagnosis: matchedDiagnosis.join(', '),
            medicines: matchedMeds,
            dietAdvice: matchedDiet,
            suggestedTests: matchedTests,
            avoid: matchedAvoid,
            followUp: matchedFollowUp || prev.followUp,
            followUpDate: matchedFollowUp ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : prev.followUpDate
        }));

        toast.success("Prescription Generated Successfully");
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addMedicine = () => {
        setFormData(prev => ({
            ...prev,
            medicines: [...prev.medicines, { name: '', form: '', dosage: '', freq: '', duration: '', quantity: '', price: 0 }]
        }));
    };

    const updateMedicine = (index: number, field: string, value: string | number) => {
        const newMeds = [...formData.medicines];
        const med = newMeds[index] as Medicine;
        (newMeds[index] as any)[field] = value;

        // Real-time validation for quantity
        if (field === 'quantity') {
            const qty = parseInt(String(value)) || 0;
            if (med.availableUnits !== undefined && qty > med.availableUnits) {
                med.error = `Only ${med.availableUnits} available`;
            } else {
                med.error = '';
            }
        }

        setFormData(prev => ({ ...prev, medicines: newMeds }));

        if (field === 'name') {
            handleMedicineSearch(value as string, index);
        }

        if (field === 'price' || field === 'quantity') {
            calculateBilling(newMeds);
        }
    };

    const calculateBilling = (meds = formData.medicines) => {
        const subtotal = meds.reduce((sum, med) => {
            if (med.pricePerUnit && med.quantity) {
                return sum + (med.pricePerUnit * (parseInt(med.quantity) || 0));
            }
            return sum + (Number(med.price) || 0);
        }, 0);
        const tax = 0; // Tax removed
        const total = subtotal;
        setFormData(prev => ({ ...prev, subtotal, tax, total }));
    };


    const removeMedicine = (index: number) => {
        const newMeds = formData.medicines.filter((_, i) => i !== index);
        setFormData(prev => ({
            ...prev,
            medicines: newMeds
        }));
        calculateBilling(newMeds);
    };

    const addArrayItem = (field: 'dietAdvice' | 'suggestedTests' | 'avoid') => {
        setFormData(prev => ({
            ...prev,
            [field]: [...prev[field], '']
        }));
    };

    const updateArrayItem = (field: 'dietAdvice' | 'suggestedTests' | 'avoid', index: number, value: string) => {
        const newArr = [...formData[field]];
        newArr[index] = value;
        setFormData(prev => ({ ...prev, [field]: newArr }));
    };

    const removeArrayItem = (field: 'dietAdvice' | 'suggestedTests' | 'avoid', index: number) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };


    const generatePrescriptionHTML = () => {
        const initialHospitalDetails = {
            name: hospitalBranding?.name || 'KADAPA MULTI-SPECIALITY',
            address: hospitalBranding?.address || 'RIMS ROAD, PUTLAMPALLI, KADAPA, AP',
            phone: hospitalBranding?.phone || '+91 8562 245555',
            email: hospitalBranding?.email || 'hospital@example.com',
            logo: hospitalBranding?.logo
        };

        const headerHtml = renderToStaticMarkup(<MainHeader initialDetails={initialHospitalDetails} />);
        const footerHtml = renderToStaticMarkup(<MainFooter initialDetails={initialHospitalDetails} />);

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Prescription - ${formData.patientName}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                    
                    @media print {
                        @page { size: A4; margin: 0; }
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
                    }
                    body { 
                        font-family: 'Inter', Arial, sans-serif; 
                        background: white; 
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        width: 210mm;
                        min-height: 296mm;
                        margin: 0 auto;
                        padding: 10mm 15mm 10mm 25mm;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        background: white;
                    }
                    .content { flex: 1; }
                    .header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; }
                    .title { color: #1e40af; margin: 0; font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; line-height: 1; }
                    .doctor-info { text-align: right; }
                    .doctor-name { font-size: 14px; font-weight: 800; color: #1e293b; margin: 0; }
                    .doctor-spec { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin: 2px 0 0; }

                    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; background: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #eef2f6; }
                    .info-item { display: flex; flex-direction: column; gap: 2px; }
                    .info-label { font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
                    .info-value { font-size: 12px; font-weight: 700; color: #1e293b; }

                    .section-title { font-size: 10px; font-weight: 900; color: #1e40af; text-transform: uppercase; border-left: 4px solid #1e40af; padding-left: 10px; margin: 20px 0 10px 0; letter-spacing: 1px; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th { text-align: left; font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; padding: 12px 10px; border-bottom: 2px solid #f1f5f9; }
                    td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
                    .med-name { font-weight: 800; color: #1e293b; font-size: 13px; }
                    
                    .advice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 10px; }
                    .advice-list { list-style: none; padding: 0; margin: 0; }
                    .advice-list li { margin-bottom: 8px; padding-left: 15px; position: relative; font-size: 11px; font-weight: 600; color: #334155; }
                    .advice-list li:before { content: "→"; position: absolute; left: 0; color: #1e40af; font-weight: 900; }

                    .follow-up-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 30px; border-radius: 0 12px 12px 0; display: flex; justify-content: space-between; align-items: center; }
                    .follow-up-label { font-size: 9px; font-weight: 800; color: #b45309; text-transform: uppercase; }
                    .follow-up-date { font-weight: 900; color: #d97706; font-size: 14px; }

                    .signature-area { margin-top: 40px; text-align: right; }
                    .sig-img { height: 45px; margin-bottom: 5px; }
                    .sig-line { border-top: 1.5px solid #1e293b; width: 180px; margin-left: auto; padding-top: 5px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
                </style>
            </head>
            <body>
                <div class="container">
                    ${headerHtml}
                    <div class="content">
                        <div class="header-row">
                            <h1 class="title">Rx Prescription</h1>
                            <div class="doctor-info">
                                <p class="doctor-name">${formData.doctorName}</p>
                                <p class="doctor-spec">${formData.doctorSpecialization || 'Medical Practitioner'}</p>
                            </div>
                        </div>

                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">Patient Name</span>
                                <span class="info-value">${formData.patientName}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Age / Gender</span>
                                <span class="info-value">${formData.age} Y / ${formData.gender}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">MRN / ID</span>
                                <span class="info-value">${formData.mrn || 'N/A'}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Date</span>
                                <span class="info-value">${formData.date}</span>
                            </div>
                        </div>

                        ${(formData.pediatricData?.weight || formData.pediatricData?.height || formData.pediatricData?.milestones) ? `
                        <div style="margin-bottom: 20px; padding: 15px; background: #f0f9ff; border-radius: 12px; border: 1.5px solid #bae6fd;">
                            <div style="font-size: 10px; font-weight: 900; color: #0369a1; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #bae6fd; padding-bottom: 5px;">Pediatric Assessment</div>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px;">
                                <div style="font-size: 10px; color: #475569;">Weight: <b>${formData.pediatricData.weight || '--'} kg</b></div>
                                <div style="font-size: 10px; color: #475569;">Height: <b>${formData.pediatricData.height || '--'} cm</b></div>
                                <div style="font-size: 10px; color: #475569;">Temp: <b>${formData.pediatricData.temperature || '98.6'} °F</b></div>
                                <div style="font-size: 10px; color: #475569;">HC: <b>${formData.pediatricData.headCircumference || '--'} cm</b></div>
                                <div style="font-size: 10px; color: #475569;">HR: <b>${formData.pediatricData.heartRate || '--'} bpm</b></div>
                                <div style="font-size: 10px; color: #475569;">RR: <b>${formData.pediatricData.respRate || '--'} /min</b></div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px; border-top: 1px dashed #bae6fd; padding-top: 10px;">
                                <div>
                                    <div style="font-size: 9px; font-weight: 800; color: #0369a1; text-transform: uppercase; margin-bottom: 4px;">Development & Growth</div>
                                    <div style="font-size: 10px; color: #475569;">Milestones: <b>${formData.pediatricData.milestones || 'N/A'}</b></div>
                                    ${formData.pediatricData.milestoneNotes ? `<div style="font-size: 9px; color: #64748b; font-style: italic;">Notes: ${formData.pediatricData.milestoneNotes}</div>` : ''}
                                    <div style="font-size: 10px; color: #475569; margin-top: 4px;">Weight for Age: <b>${formData.pediatricData.growth?.weightForAge || 'N/A'}</b></div>
                                    <div style="font-size: 10px; color: #475569;">Height for Age: <b>${formData.pediatricData.growth?.heightForAge || 'N/A'}</b></div>
                                </div>
                                <div>
                                    <div style="font-size: 9px; font-weight: 800; color: #0369a1; text-transform: uppercase; margin-bottom: 4px;">Immunization & Safety</div>
                                    <div style="font-size: 10px; color: #475569;">Status: <b>${formData.pediatricData.immunizationStatus || 'N/A'}</b></div>
                                    ${formData.pediatricData.dueVaccines?.length > 0 ? `<div style="font-size: 9px; color: #e11d48;">Due: ${formData.pediatricData.dueVaccines.join(', ')}</div>` : ''}
                                    ${formData.pediatricData.redFlags?.length > 0 ? `<div style="font-size: 9px; color: #e11d48; font-weight: 800; margin-top: 4px;">⚠️ Red Flags: ${formData.pediatricData.redFlags.join(', ')}</div>` : ''}
                                </div>
                            </div>

                            ${formData.pediatricData.symptoms?.length > 0 ? `
                            <div style="margin-top: 10px; font-size: 10px; color: #475569;">
                                <b>Specific Symptoms:</b> ${formData.pediatricData.symptoms.join(', ')}
                            </div>` : ''}
                            
                            ${formData.pediatricData.notes ? `<div style="font-size: 10px; color: #475569; margin-top: 8px; border-top: 1px solid #bae6fd; padding-top: 5px;"><b>Additional Notes:</b> ${formData.pediatricData.notes}</div>` : ''}
                        </div>
                        ` : ''}

                        ${(formData.ophthaData?.vision?.od?.unaided || formData.ophthaData?.vision?.os?.unaided || formData.ophthaData?.iop?.od || formData.ophthaData?.diagnosis) ? `
                        <div style="margin-bottom: 20px; padding: 15px; background: #f5f3ff; border-radius: 12px; border: 1.5px solid #ddd6fe;">
                            <div style="font-size: 10px; font-weight: 900; color: #5b21b6; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #ddd6fe; padding-bottom: 5px;">Ophthalmology Findings</div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div>
                                    <div style="font-size: 9px; color: #6d28d9; font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">Vision (OD/OS)</div>
                                    <div style="font-size: 11px; font-weight: 700;">OD: ${formData.ophthaData.vision?.od?.unaided || '--'} ${formData.ophthaData.vision?.od?.corrected ? `(Corr: ${formData.ophthaData.vision.od.corrected})` : ''}</div>
                                    <div style="font-size: 11px; font-weight: 700;">OS: ${formData.ophthaData.vision?.os?.unaided || '--'} ${formData.ophthaData.vision?.os?.corrected ? `(Corr: ${formData.ophthaData.vision.os.corrected})` : ''}</div>
                                    
                                    <div style="margin-top: 8px;">
                                        <div style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">Refraction</div>
                                        <div style="font-size: 10px;">OD: ${formData.ophthaData.refraction?.od?.sph || '0'} / ${formData.ophthaData.refraction?.od?.cyl || '0'} x ${formData.ophthaData.refraction?.od?.axis || '0'}°</div>
                                        <div style="font-size: 10px;">OS: ${formData.ophthaData.refraction?.os?.sph || '0'} / ${formData.ophthaData.refraction?.os?.cyl || '0'} x ${formData.ophthaData.refraction?.os?.axis || '0'}°</div>
                                    </div>
                                </div>
                                <div>
                                    <div style="font-size: 9px; color: #6d28d9; font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">Pressure & Exam</div>
                                    <div style="font-size: 10px;">IOP: <b>OD ${formData.ophthaData.iop?.od || '--'}</b> | <b>OS ${formData.ophthaData.iop?.os || '--'}</b> mmHg</div>
                                    <div style="font-size: 10px;">Pupils: <b>${formData.ophthaData.pupils || 'Normal'}</b></div>
                                    
                                    <div style="margin-top: 8px;">
                                        <div style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">Slit Lamp</div>
                                        <div style="font-size: 9px;">Cornea: ${formData.ophthaData.slitLamp?.cornea || 'Clear'} | Lens: ${formData.ophthaData.slitLamp?.lens || 'Clear'}</div>
                                        <div style="font-size: 9px;">AC: ${formData.ophthaData.slitLamp?.anteriorChamber || 'Normal'} | Conj: ${formData.ophthaData.slitLamp?.conjunctiva || 'Normal'}</div>
                                    </div>
                                </div>
                            </div>

                            <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr; gap: 5px; border-top: 1px dashed #ddd6fe; padding-top: 8px;">
                                <div style="font-size: 9px; color: #475569;"><b>Fundus:</b> Disc: ${formData.ophthaData.fundus?.opticDisc || 'Normal'} | Retina: ${formData.ophthaData.fundus?.retina || 'Normal'} | Macula: ${formData.ophthaData.fundus?.macula || 'Normal'}</div>
                                ${formData.ophthaData.symptoms?.length > 0 ? `<div style="font-size: 9px; color: #475569;"><b>Ocular Symptoms:</b> ${formData.ophthaData.symptoms.join(', ')}</div>` : ''}
                                ${formData.ophthaData.diagnosis ? `<div style="font-size: 11px; font-weight: 800; color: #5b21b6; margin-top: 4px;">Specialty Dx: ${formData.ophthaData.diagnosis}</div>` : ''}
                            </div>
                            
                            ${formData.ophthaData.notes ? `<div style="font-size: 10px; color: #475569; margin-top: 8px; font-style: italic;">Note: ${formData.ophthaData.notes}</div>` : ''}
                        </div>
                        ` : ''}

                        ${(formData.surgeryData?.procedurePlanned || formData.surgeryData?.indication || formData.surgeryData?.diagnosis) ? `
                        <div style="margin-bottom: 20px; padding: 15px; background: #fff1f2; border-radius: 12px; border: 1.5px solid #fecdd3;">
                            <div style="font-size: 10px; font-weight: 900; color: #be123c; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #fecdd3; padding-bottom: 5px;">General Surgery Evaluation</div>
                            <div style="font-size: 13px; font-weight: 900; color: #9f1239; margin-bottom: 5px;">${formData.surgeryData.procedurePlanned || 'No Procedure Specified'}</div>
                            <div style="font-size: 10px; color: #475569; margin-bottom: 10px;">Type: <b>${formData.surgeryData.surgeryType || 'N/A'}</b> | Indication: ${formData.surgeryData.indication || 'N/A'}</div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; border-top: 1px dashed #fecdd3; padding-top: 10px;">
                                <div>
                                    <div style="font-size: 9px; font-weight: 800; color: #be123c; text-transform: uppercase; margin-bottom: 4px;">Physical Exam</div>
                                    <div style="font-size: 9px;">Abd: ${formData.surgeryData.physicalExam?.abdomen || 'NAD'} | Thorax: ${formData.surgeryData.physicalExam?.thorax || 'NAD'}</div>
                                    <div style="font-size: 9px;">Limbs: ${formData.surgeryData.physicalExam?.limbs || 'NAD'} | Others: ${formData.surgeryData.physicalExam?.others || 'NAD'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 9px; font-weight: 800; color: #be123c; text-transform: uppercase; margin-bottom: 4px;">Systemic Review</div>
                                    <div style="font-size: 9px;">CVS: ${formData.surgeryData.systemicReview?.cvs || 'NAD'} | RS: ${formData.surgeryData.systemicReview?.rs || 'NAD'}</div>
                                    <div style="font-size: 9px;">CNS: ${formData.surgeryData.systemicReview?.cns || 'NAD'} | GIT: ${formData.surgeryData.systemicReview?.git || 'NAD'}</div>
                                </div>
                            </div>

                            <div style="margin-top: 10px; padding: 8px; background: #fff; border-radius: 8px; border: 1px solid #fecdd3;">
                                <div style="font-size: 8px; font-weight: 800; color: #be123c; text-transform: uppercase; margin-bottom: 4px;">Pre-Op Checklist</div>
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px; font-size: 9px; font-weight: 700;">
                                    <div>NPO: ${formData.surgeryData.preOpChecklist?.npoStatus ? '✅ YES' : '❌ NO'}</div>
                                    <div>Consent: ${formData.surgeryData.preOpChecklist?.consentSigned ? '✅ SIGNED' : '❌ PENDING'}</div>
                                    <div>Investigations: ${formData.surgeryData.preOpChecklist?.investigationsDone ? '✅ DONE' : '❌ PENDING'}</div>
                                    <div>Cross-match: ${formData.surgeryData.preOpChecklist?.bloodCrossMatched ? '✅ DONE' : '❌ PENDING'}</div>
                                </div>
                            </div>

                            ${formData.surgeryData.diagnosis ? `<div style="font-size: 11px; font-weight: 800; color: #be123c; margin-top: 8px;">Specialty Dx: ${formData.surgeryData.diagnosis}</div>` : ''}
                            ${formData.surgeryData.notes ? `<div style="font-size: 10px; color: #475569; margin-top: 5px; font-style: italic;">Note: ${formData.surgeryData.notes}</div>` : ''}
                        </div>
                        ` : ''}

                        ${formData.diagnosis ? `
                        <div style="margin-bottom: 20px; background: #eff6ff; padding: 10px 15px; border-radius: 8px;">
                            <span class="info-label">Diagnosis / Impressions:</span>
                            <div style="font-size: 13px; font-weight: 700; color: #1e40af; margin-top: 2px;">${formData.diagnosis}</div>
                        </div>
                        ` : ''}


                        <div class="section-title">Medications & Dosage</div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 45%">Medicine</th>
                                    <th>Dosage</th>
                                    <th>Frequency</th>
                                    <th>Duration</th>
                                    <th style="text-align: right;">Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${formData.medicines.map(med => {
                                    const f = med.freq || '';
                                    let timing = '';
                                    if (f.includes('-')) {
                                        const p = f.split('-');
                                        const t = [];
                                        if (p[0] !== '0') t.push('Morning');
                                        if (p[1] !== '0') t.push('Afternoon');
                                        if (p[2] !== '0') t.push('Night');
                                        if (p[3] && p[3] !== '0') t.push('Late Night');
                                        timing = t.length > 0 ? `<div style="font-size: 8px; color: #64748b; font-weight: 700; margin-top: 2px;">${t.join('-')}</div>` : '';
                                    }
                                    return `
                                <tr>
                                    <td class="med-name">${med.name}</td>
                                    <td style="font-weight: 600;">${med.dosage}</td>
                                    <td style="font-weight: 600; color: #475569;">
                                        <div>${med.freq}</div>
                                        ${timing}
                                    </td>
                                    <td style="font-weight: 600;">${med.duration}</td>
                                    <td style="font-weight: 800; text-align: right;">${med.quantity}</td>
                                </tr>
                                `;
                                }).join('')}
                            </tbody>
                        </table>

                        <div class="advice-grid">
                            ${formData.dietAdvice.length > 0 ? `
                            <div>
                                <div class="section-title" style="margin-top: 0;">Clinical Advice</div>
                                <ul class="advice-list">
                                    ${formData.dietAdvice.filter(i => i.trim()).map(d => `<li>${d}</li>`).join('')}
                                </ul>
                            </div>
                            ` : ''}
                            
                            ${formData.suggestedTests.length > 0 ? `
                            <div>
                                <div class="section-title" style="margin-top: 0;">Requested Tests</div>
                                <ul class="advice-list">
                                    ${formData.suggestedTests.filter(i => i.trim()).map(t => `<li>${t}</li>`).join('')}
                                </ul>
                            </div>
                            ` : ''}
                        </div>

                        ${formData.followUp || formData.followUpDate ? `
                        <div class="follow-up-box">
                            <div>
                                <span class="follow-up-label">Follow-up Instructions:</span>
                                <div style="font-weight: 700; color: #92400e; margin-top: 4px;">${formData.followUp || 'Follow Standard Protocol'}</div>
                            </div>
                            ${formData.followUpDate ? `
                            <div style="text-align: right;">
                                <span class="follow-up-label">Scheduled Date:</span>
                                <div class="follow-up-date">${new Date(formData.followUpDate).toLocaleDateString('en-GB')}</div>
                            </div>
                            ` : ''}
                        </div>
                        ` : ''}

                        <div class="signature-area">
                            ${formData.doctorSignature ? `<img src="${formData.doctorSignature}" class="sig-img" />` : '<div style="height: 50px;"></div>'}
                            <div class="sig-line">Authorized Digital Signature</div>
                        </div>
                    </div>
                    ${footerHtml}
                </div>
            </body>
            </html>
        `;
    };

    const generateBillingHTML = () => {
        const initialHospitalDetails = {
            name: hospitalBranding?.name || 'KADAPA MULTI-SPECIALITY',
            address: hospitalBranding?.address || 'RIMS ROAD, PUTLAMPALLI, KADAPA, AP',
            phone: hospitalBranding?.phone || '+91 8562 245555',
            email: hospitalBranding?.email || 'hospital@example.com',
            logo: hospitalBranding?.logo
        };

        const headerHtml = renderToStaticMarkup(<MainHeader initialDetails={initialHospitalDetails} />);
        const footerHtml = renderToStaticMarkup(<MainFooter initialDetails={initialHospitalDetails} />);

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Pharmacy Bill Estimate</title>
                <meta charset="UTF-8">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                    @media print {
                        @page { size: A4; margin: 0; }
                        body { margin: 0; padding: 0; }
                    }
                    body { 
                        font-family: 'Inter', Arial, sans-serif; 
                        background: white; 
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        width: 210mm;
                        height: 296mm;
                        margin: 0 auto;
                        padding: 10mm 15mm 10mm 25mm;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        background: white;
                        overflow: hidden;
                    }
                    .content { flex: 1; }
                    .title { color: #1e40af; margin: 20px 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; }
                    
                    .bill-info { display: flex; justify-content: space-between; margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #eef2f6; }
                    .info-group { display: flex; flex-direction: column; gap: 4px; }
                    .info-label { font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
                    .info-value { font-size: 13px; font-weight: 700; color: #1e293b; }

                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { text-align: left; font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; padding: 12px 10px; border-bottom: 2.5px solid #f1f5f9; }
                    td { padding: 15px 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
                    .med-name { font-weight: 800; color: #1e293b; }
                    .amount { font-weight: 800; text-align: right; font-family: monospace; }

                    .summary-box { margin-left: auto; width: 280px; margin-top: 30px; background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #eef2f6; }
                    .summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
                    .summary-total { border-top: 2px solid #eef2f6; margin-top: 15px; padding-top: 15px; color: #16a34a; font-size: 20px; font-weight: 900; }
                </style>
            </head>
            <body>
                <div class="container">
                    ${headerHtml}
                    <div class="content">
                        <h1 class="title">Pharmacy Bill Estimate</h1>
                        
                        <div class="bill-info">
                            <div class="info-group">
                                <span class="info-label">Patient Details</span>
                                <span class="info-value">${formData.patientName}</span>
                                <span style="font-size: 11px; color: #64748b;">MRN: ${formData.mrn || 'N/A'}</span>
                            </div>
                            <div class="info-group" style="text-align: right;">
                                <span class="info-label">Doctor</span>
                                <span class="info-value">${formData.doctorName}</span>
                                <span style="font-size: 11px; color: #64748b;">Date: ${new Date().toLocaleDateString('en-GB')}</span>
                            </div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>Item Description</th>
                                    <th>Qty</th>
                                    <th style="text-align: right;">Unit Price</th>
                                    <th style="text-align: right;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${formData.medicines.map(med => `
                                <tr>
                                    <td>
                                        <div class="med-name">${med.name}</div>
                                        <div style="font-size: 10px; color: #64748b;">${med.form}</div>
                                    </td>
                                    <td style="font-weight: 700;">${med.quantity}</td>
                                    <td class="amount">₹${((med as any).pricePerUnit || med.price || 0).toFixed(2)}</td>
                                    <td class="amount">₹${((parseFloat(med.quantity) || 0) * ((med as any).pricePerUnit || med.price || 0)).toFixed(2)}</td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <div class="summary-box">
                            <div class="summary-row">
                                <span style="color: #64748b; font-weight: 600;">Gross Amount</span>
                                <span style="font-weight: 700;">₹${formData.subtotal.toFixed(2)}</span>
                            </div>
                            <div class="summary-row">
                                <span style="color: #64748b; font-weight: 600;">Tax (0%)</span>
                                <span style="font-weight: 700;">₹0.00</span>
                            </div>
                            <div class="summary-row summary-total">
                                <span>Total Payable</span>
                                <span>₹${formData.total.toFixed(2)}</span>
                            </div>
                        </div>

                        <div style="margin-top: 50px; text-align: center; border: 1px dashed #e2e8f0; padding: 15px; border-radius: 12px;">
                            <p style="font-size: 12px; color: #64748b; font-weight: 600; margin: 0;">This is an estimated bill generated by the clinical system. Actual prices may vary at the pharmacy counter.</p>
                        </div>
                    </div>
                    ${footerHtml}
                </div>
            </body>
            </html>
        `;
    };

    const handleClearForm = () => {
        setShowClearConfirm(true);
    };

    const confirmClearForm = () => {
        setFormData(INITIAL_FORM);
        setSentToPharma(false);
        setIsSubmitted(false);
        setGeneratedHtml(null);
        setShowClearConfirm(false);
        toast.success("Form cleared");
    };

    const handleSendToPharma = async () => {
        if (!appointmentId && !patientId) return toast.error("Appointment ID or Patient ID is required");
        if (!formData.patientName) return toast.error("Patient Name is required");
        if (!formData.diagnosis) return toast.error("Diagnosis is required");
        if (formData.medicines.length === 0) return toast.error("At least one medicine is required");

        const hasErrors = formData.medicines.some(m => m.error);
        if (hasErrors) return toast.error("Please resolve stock errors before sending to pharmacy");

        // Submit the prescription and send to pharma
        setIsSending(true);
        await executeSubmit(true, false);
        setIsSending(false);
        setSentToPharma(true);
    };

    const handleSaveAndPrint = async () => {
        if (isSubmitted) {
            handlePrintDocument('prescription');
            return;
        }

        if (!appointmentId && !patientId) return toast.error("Appointment ID or Patient ID is required");
        if (!formData.patientName) return toast.error("Patient Name is required");
        if (!formData.diagnosis) return toast.error("Diagnosis is required");
        if (formData.medicines.length === 0) return toast.error("At least one medicine is required");

        const hasErrors = formData.medicines.some(m => m.error);
        if (hasErrors) return toast.error("Please resolve stock errors before submitting");

        if (!sentToPharma && formData.medicines.length > 0) {
            setShowNoPharmaWarn(true);
            return;
        }

        executeSubmit(false, true);
    };

    const confirmSaveWithoutPharma = () => {
        setShowNoPharmaWarn(false);
        executeSubmit(false, true);
    };

    const executeSubmit = async (sendToPharmaFlag: boolean, showSuccessModal: boolean) => {
        try {
            setIsSaving(true);
            setShowPharmaConfirm(false);

            // Save prescription
            await doctorService.createPrescription({
                appointmentId,
                patientId, // Pass patientId
                admissionId, // Pass admissionId if present
                diagnosis: formData.diagnosis,
                symptoms: formData.symptoms.split(',').map(s => s.trim()),
                medicines: formData.medicines.map(m => ({
                    drug: (m as any).productId,
                    name: m.name,
                    dosage: m.dosage,
                    frequency: m.freq,
                    duration: m.duration,
                    quantity: m.quantity,
                    price: m.price
                })),
                advice: formData.followUp,
                followUpDate: formData.followUpDate,
                dietAdvice: formData.dietAdvice,
                suggestedTests: formData.suggestedTests,
                notes: formData.notes,
                age: formData.age,
                gender: formData.gender,
                sendToPharma: sendToPharmaFlag,
                // Specialty Data
                pediatricData: activeModule === 'PEDS' ? formData.pediatricData : undefined,
                ophthaData: activeModule === 'OPHTHA' ? formData.ophthaData : undefined,
                surgeryData: activeModule === 'SURGERY' ? formData.surgeryData : undefined,
            });

            // Re-use current styled generation logic
            const prescriptionHtml = generatePrescriptionHTML();
            const billingHtml = generateBillingHTML();

            // Save HTML for printing
            setGeneratedHtml({
                prescription: prescriptionHtml,
                billing: billingHtml
            });

            setIsSubmitted(true);

            if (showSuccessModal) {
                setShowSuccess(true);
            }

            if (sendToPharmaFlag) {
                toast.success("Prescription Saved & Sent to Pharmacy Successfully!");
            } else {
                toast.success("Prescription Saved Successfully!");
            }

            // Clear Draft
            localStorage.removeItem(`prescription_draft_${appointmentId || patientId || 'default'}`);

        } catch (error: any) {
            toast.error(error.message || "Failed to save prescription");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrintDocument = (type: 'prescription' | 'billing') => {
        if (!generatedHtml) return;
        const html = type === 'prescription' ? generatedHtml.prescription : generatedHtml.billing;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => { printWindow.print(); }, 500);
        } else {
            toast.error('Please allow popups to print documents');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="animate-spin text-teal-600" size={48} />
            </div>
        );
    }

    return (
        <div className="bg-slate-50/50 pt-16 pb-24">
            {/* Header */}
            <header className="border-b border-border-theme fixed top-16 left-0 lg:left-64 right-0 z-40 backdrop-blur-md bg-card/90">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-800">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <FileText size={18} className="text-teal-600" />
                                Create Prescription
                            </h1>
                            <p className="text-xs text-slate-500 font-medium">Drafting for {formData.patientName || 'New Patient'}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-slate-100 p-1 rounded-lg flex items-center">
                            <button
                                onClick={() => setMode('SELF')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 ${mode === 'SELF' ? 'bg-white shadow-sm text-primary-theme' : 'text-muted hover:bg-white/50'}`}
                            >
                                <PenTool size={12} /> Manual
                            </button>
                            <button
                                onClick={() => setMode('AI')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 ${mode === 'AI' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                            >
                                <Sparkles size={12} /> One Click Prescription
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8">

                {/* Patient Info Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
                        <User size={18} className="text-teal-600" />
                        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Patient Details</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                            <input
                                name="patientName"
                                value={formData.patientName}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">MRN</label>
                            <input
                                name="mrn"
                                value={formData.mrn}
                                onChange={handleInputChange}
                                placeholder="N/A"
                                className="w-full px-4 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Age & Gender</label>
                            <div className="flex gap-2">
                                <input
                                    name="age"
                                    value={formData.age}
                                    onChange={handleInputChange}
                                    placeholder="Age"
                                    className="w-20 px-4 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                />
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleInputChange}
                                    className="flex-1 px-4 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                >
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Date</label>
                            <input
                                name="date"
                                value={formData.date}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Clinical Modules Selection */}
                <div className="bg-white rounded-2xl border border-slate-200 p-2 flex items-center justify-center gap-2 shadow-sm overflow-x-auto">
                    {[
                        { id: 'NONE', label: 'Standard Rx', icon: FileText, color: 'text-slate-600', bg: 'bg-slate-50' },
                        { id: 'PEDS', label: 'Pediatrics', icon: Baby, color: 'text-sky-600', bg: 'bg-sky-50' },
                        { id: 'OPHTHA', label: 'Ophthalmology', icon: Eye, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { id: 'SURGERY', label: 'General Surgery', icon: Zap, color: 'text-rose-600', bg: 'bg-rose-50' },
                    ].map((mod) => (
                        <button
                            key={mod.id}
                            onClick={() => setActiveModule(mod.id as any)}
                            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl transition-all whitespace-nowrap ${activeModule === mod.id ? `${mod.bg} ring-1 ring-${mod.color.split('-')[1]}-200` : 'hover:bg-slate-50'}`}
                        >
                            <mod.icon size={18} className={activeModule === mod.id ? mod.color : 'text-slate-400'} />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${activeModule === mod.id ? 'text-slate-900' : 'text-slate-500'}`}>{mod.label}</span>
                        </button>
                    ))}
                </div>

                {/* Rendering Modules */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeModule === 'PEDS' && <PediatricsModule formData={formData} setFormData={setFormData} />}
                    {activeModule === 'OPHTHA' && <OphthalmologyModule formData={formData} setFormData={setFormData} />}
                    {activeModule === 'SURGERY' && <GeneralSurgeryModule formData={formData} setFormData={setFormData} />}
                </div>

                {/* Clinical Notes Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
                        <Stethoscope size={18} className="text-teal-600" />
                        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Clinical Assessment</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex justify-between">
                                Symptoms / Complaints
                                {mode === 'AI' && <span className="text-indigo-500 flex items-center gap-1"><Sparkles size={10} /> AI Ready</span>}
                            </label>
                            <textarea
                                name="symptoms"
                                value={formData.symptoms}
                                onChange={handleInputChange}
                                rows={3}
                                placeholder="e.g. Fever, Cough, Headache..."
                                className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                            />
                            {mode === 'AI' && (
                                <button
                                    onClick={handleGeneratePrescription}
                                    className="mt-3 w-full py-2.5 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Sparkles size={14} /> Auto-Generate Rx
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Diagnosis</label>
                            <textarea
                                name="diagnosis"
                                value={formData.diagnosis}
                                onChange={handleInputChange}
                                rows={3}
                                placeholder="e.g. Viral Fever"
                                className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Medicines Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[300px]">
                    <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Pill size={18} className="text-teal-600" />
                            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Medications</h2>
                        </div>
                        <button
                            onClick={addMedicine}
                            className="bg-teal-50 text-teal-600 hover:bg-teal-100 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                        >
                            <Plus size={12} /> Add Medicine
                        </button>
                    </div>

                    <div className="space-y-3">
                        {/* Column Headers */}
                        <div className="grid grid-cols-12 gap-2 sm:gap-3 px-3 py-1 text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <div className="col-span-3">Medicine</div>
                            <div className="col-span-2">Form</div>
                            <div className="col-span-2">Dosage</div>
                            <div className="col-span-2">Freq</div>
                            <div className="col-span-1">Days</div>
                            <div className="col-span-2">Qty</div>
                        </div>

                        {formData.medicines.map((med, idx) => (
                            <div key={idx} className="relative group bg-slate-50 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 rounded-xl p-3">
                                <div className="grid grid-cols-12 gap-2 sm:gap-3 items-center">
                                    <div className="col-span-3 relative">
                                        <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none text-slate-400">
                                            <Search size={12} className="sm:size-[14px]" />
                                        </div>
                                        <input
                                            type="text"
                                            value={med.name}
                                            onChange={(e) => updateMedicine(idx, 'name', e.target.value)}
                                            onFocus={() => setActiveMedIndex(idx)}
                                            placeholder="Search..."
                                            className="w-full pl-7 pr-2 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-[10px] sm:text-sm font-bold text-slate-800 placeholder:font-normal focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/10 uppercase"
                                        />

                                        {/* Suggestions Dropdown */}
                                        {activeMedIndex === idx && suggestions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 z-50 max-h-60 overflow-y-auto">
                                                <div className="p-2 border-b border-slate-50 text-[10px] font-bold text-slate-400 uppercase">Pharmacy Inventory</div>
                                                {suggestions.map((s, sIdx) => (
                                                    <button
                                                        key={sIdx}
                                                        onClick={() => selectMedicine(s, idx)}
                                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 group/item"
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className="font-bold text-slate-800 text-sm">{s.brand}</div>
                                                                <div className="text-xs text-slate-500">{s.generic}</div>
                                                                <div className="mt-1 text-[10px] font-bold text-slate-400">
                                                                    {s.unitsPerPack} units per pack
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                {s.stock > 0 ? (
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                                            {s.stock} Packs Available
                                                                        </span>
                                                                        <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                                                                            Total: {s.stock * (s.unitsPerPack || 1)} Units
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                                                                        Out of Stock
                                                                    </span>
                                                                )}
                                                                <div className="text-xs font-bold text-slate-700 mt-1">₹{s.mrp} <span className="text-[10px] font-normal text-slate-400">/ pack</span></div>
                                                                {s.unitsPerPack > 1 && (
                                                                    <div className="text-[9px] font-bold text-indigo-500 mt-0.5">₹{(s.mrp / s.unitsPerPack).toFixed(2)} per unit</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                    </div>
                                    {/* Form Type Badge */}
                                    <div className="col-span-2 flex items-center">
                                        {med.form ? (
                                            <span className="inline-flex items-center gap-1 px-1 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[8px] sm:text-xs font-black uppercase tracking-tighter sm:tracking-wide bg-violet-50 text-violet-700 border border-violet-100 w-full justify-center truncate">
                                                {med.form}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-1 py-1.5 rounded-lg text-[8px] font-bold text-slate-300 border border-dashed border-slate-200 w-full justify-center">
                                                —
                                            </span>
                                        )}
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            value={med.dosage}
                                            onChange={(e) => updateMedicine(idx, 'dosage', e.target.value)}
                                            placeholder="Dosage"
                                            className="w-full px-1.5 sm:px-3 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-[10px] sm:text-sm focus:outline-none focus:border-teal-500"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            value={med.freq}
                                            onChange={(e) => updateMedicine(idx, 'freq', e.target.value)}
                                            placeholder="Freq"
                                            className="w-full px-1.5 sm:px-3 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-[10px] sm:text-sm focus:outline-none focus:border-teal-500"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <input
                                            value={med.duration}
                                            onChange={(e) => updateMedicine(idx, 'duration', e.target.value)}
                                            placeholder="Days"
                                            className="w-full px-1 sm:px-3 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-[10px] sm:text-sm focus:outline-none focus:border-teal-500"
                                        />
                                    </div>
                                    <div className="col-span-2 relative group-med">
                                        <div className="flex items-center gap-1 sm:gap-2">
                                            <div className="flex-1">
                                                <input
                                                    value={med.quantity}
                                                    onChange={(e) => updateMedicine(idx, 'quantity', e.target.value)}
                                                    placeholder="Qty"
                                                    className={`w-full px-1.5 sm:px-3 py-1.5 sm:py-2 bg-white border ${med.error ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-teal-500'} rounded-lg text-[10px] sm:text-sm font-bold focus:outline-none focus:ring-2`}
                                                />
                                            </div>
                                            <button onClick={() => removeMedicine(idx)} className="p-1 sm:p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg shrink-0">
                                                <Trash2 size={12} className="sm:size-[16px]" />
                                            </button>
                                        </div>
                                        {med.availableUnits !== undefined && (
                                            <div className="mt-1 flex justify-between items-center px-1">
                                                <span className="text-[8px] font-bold text-slate-400">Stock: {med.availableUnits}</span>
                                                {med.pricePerUnit && (
                                                    <span className="text-[8px] font-bold text-teal-600">₹{(med.pricePerUnit * (parseInt(med.quantity) || 0)).toFixed(2)}</span>
                                                )}
                                            </div>
                                        )}
                                        {med.error && (
                                            <div className="text-[8px] font-bold text-rose-500 px-1 animate-pulse">
                                                {med.error}
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>
                        ))}
                        {formData.medicines.length === 0 && (
                            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                <p className="text-slate-400 text-sm font-medium">No medicines prescribed yet.</p>
                                <button onClick={addMedicine} className="mt-2 text-teal-600 text-xs font-bold uppercase hover:underline">Click to add first medicine</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Additional Advice */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Diet & Lifestyle</h2>
                            <button onClick={() => addArrayItem('dietAdvice')} className="text-teal-600 hover:bg-teal-50 p-1.5 rounded-lg"><Plus size={14} /></button>
                        </div>
                        <div className="space-y-2">
                            {formData.dietAdvice.map((item, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        value={item}
                                        onChange={(e) => updateArrayItem('dietAdvice', idx, e.target.value)}
                                        className="flex-1 px-3 py-2 bg-slate-50 border-slate-200 border rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                        placeholder="Add advice..."
                                    />
                                    <button onClick={() => removeArrayItem('dietAdvice', idx)} className="text-slate-300 hover:text-rose-500"><X size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Suggested Tests */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Lab Tests</h2>
                            <button onClick={() => addArrayItem('suggestedTests')} className="text-teal-600 hover:bg-teal-50 p-1.5 rounded-lg"><Plus size={14} /></button>
                        </div>
                        <div className="space-y-2">
                            {formData.suggestedTests.length === 0 && (
                                <p className="text-xs text-slate-400 font-medium italic">No tests suggested.</p>
                            )}
                            {formData.suggestedTests.map((item, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        value={item}
                                        onChange={(e) => updateArrayItem('suggestedTests', idx, e.target.value)}
                                        className="flex-1 px-3 py-2 bg-slate-50 border-slate-200 border rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                        placeholder="Test name (e.g. CBC)..."
                                    />
                                    <button onClick={() => removeArrayItem('suggestedTests', idx)} className="text-slate-300 hover:text-rose-500"><X size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Calendar size={16} className="text-teal-600" />
                                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Follow Up</h2>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Follow Up Date</label>
                                    <input
                                        type="date"
                                        name="followUpDate"
                                        value={formData.followUpDate}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                    />
                                </div>
                                <textarea
                                    name="followUp"
                                    value={formData.followUp}
                                    onChange={handleInputChange}
                                    placeholder="Special follow-up instructions..."
                                    className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <AlertCircle size={16} className="text-rose-500" />
                                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Things to Avoid</h2>
                                </div>
                                <button onClick={() => addArrayItem('avoid')} className="text-teal-600 text-[10px] font-bold uppercase transition-transform active:scale-90 hover:scale-110">+ Add Item</button>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {formData.avoid.length === 0 && (
                                    <p className="text-xs text-slate-400 font-medium italic py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">No specific restrictions added.</p>
                                )}
                                {formData.avoid.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 group">
                                        <input
                                            value={item}
                                            onChange={(e) => updateArrayItem('avoid', idx, e.target.value)}
                                            className="flex-1 px-3 py-2 bg-slate-50 border-slate-200 border rounded-lg text-sm focus:outline-none focus:border-teal-500 transition-colors group-hover:border-teal-200"
                                            placeholder="Restrict e.g. Smoking, Heavy Exercise..."
                                        />
                                        <button onClick={() => removeArrayItem('avoid', idx)} className="text-slate-300 hover:text-rose-500 transition-colors"><X size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                {/* Footer Actions */}
                <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-40 flex justify-center gap-4 p-4 bg-white/90 backdrop-blur-lg border-t border-slate-200">
                    <button
                        onClick={handleClearForm}
                        className="px-6 py-3 bg-white text-slate-600 shadow-lg shadow-slate-200 rounded-xl font-bold uppercase text-xs tracking-wider border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
                    >
                        Clear Form
                    </button>
                    <button
                        onClick={handleSendToPharma}
                        disabled={isSaving || isSending || sentToPharma}
                        className={`px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition-all active:scale-95 flex items-center gap-2 ${sentToPharma ? 'bg-emerald-100 text-emerald-700 shadow-none' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700'}`}
                    >
                        {isSending ? <Loader2 className="animate-spin" size={16} /> : (sentToPharma ? <CheckCircle2 size={16} /> : <Pill size={16} />)}
                        {sentToPharma ? 'Sent to Pharma' : 'Send to Pharma'}
                    </button>
                    <button
                        onClick={handleSaveAndPrint}
                        disabled={isSaving || isSending}
                        className="px-8 py-3 bg-teal-600 text-white shadow-lg shadow-teal-600/20 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-teal-700 active:scale-95 flex items-center gap-2 transition-all"
                    >
                        {isSaving && !isSending ? <Loader2 className="animate-spin" size={16} /> : <Printer size={16} />}
                        Save & Print
                    </button>
                </div>

            </main>

            {/* Success Modal */}
            {showSuccess && generatedHtml && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-r from-teal-400 to-indigo-500"></div>
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                            <CheckCircle2 size={40} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Prescription Ready!</h2>
                            <p className="text-slate-500 text-sm">The prescription has been saved and formatted for printing.</p>
                        </div>

                        <div className="flex justify-center pt-4">
                            <button
                                onClick={() => handlePrintDocument('prescription')}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-teal-50 border-2 border-teal-100 text-teal-700 hover:bg-teal-100 hover:border-teal-200 group w-48 transition-all active:scale-95"
                            >
                                <Printer size={32} className="group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-sm">Print Prescription</span>
                            </button>
                        </div>
                        <button
                            onClick={() => { setShowSuccess(false); router.back(); }}
                            className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest mt-4 transition-colors"
                        >
                            Close & Return
                        </button>
                    </div>
                </div>
            )}

            {/* Clear Confirmation Modal */}
            {showClearConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <Eraser size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Clear Prescription?</h3>
                            <p className="text-sm text-slate-500 font-medium mt-2">
                                Are you sure you want to clear all entered data? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmClearForm}
                                className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg shadow-rose-600/20 hover:bg-rose-700 active:scale-95 transition-all"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* No Pharma Warning Modal */}
            {showNoPharmaWarn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <AlertCircle size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Pharmacy Not Notified</h3>
                            <p className="text-sm text-slate-500 font-medium mt-2">
                                You have <span className="text-teal-600 font-bold">{formData.medicines.length} medications</span> in this prescription, but you haven't sent them to the pharmacy yet.
                            </p>
                            <p className="text-xs text-slate-400 font-medium mt-2">
                                Are you sure you want to save and print without notifying the pharmacy?
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowNoPharmaWarn(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-slate-200 transition-colors"
                            >
                                Go Back
                            </button>
                            <button
                                onClick={confirmSaveWithoutPharma}
                                className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg shadow-amber-500/20 hover:bg-amber-600 active:scale-95 transition-all"
                            >
                                Yes, Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default React.memo(CreatePrescriptionPage);
