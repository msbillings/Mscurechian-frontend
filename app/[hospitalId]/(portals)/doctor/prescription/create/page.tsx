'use client';

import React, { useState, useEffect, useRef } from 'react';
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
    FlaskConical
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { doctorService } from '@/lib/integrations/services/doctor.service';
import { getAppointmentDetailsAction, getDoctorProfileAction } from '@/lib/integrations/actions/doctor.actions';
import medicineData from '@/medicine.json';

// --- Types ---
interface Medicine {
    name: string;
    dosage: string;
    freq: string;
    duration: string;
    quantity: string;
    price: number;
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
    doctorSignature?: string; // URL or base64
    subtotal: number;
    tax: number;
    total: number;
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
    subtotal: 0,
    tax: 0,
    total: 0
};

function CreatePrescriptionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const appointmentId = searchParams.get('appointmentId');
    const patientId = searchParams.get('patientId');

    const [mode, setMode] = useState<'AI' | 'SELF'>('SELF');
    const [formData, setFormData] = useState<PrescriptionForm>(INITIAL_FORM);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Suggestion State
    const [activeMedIndex, setActiveMedIndex] = useState<number | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Success State
    const [showSuccess, setShowSuccess] = useState(false);
    const [generatedHtml, setGeneratedHtml] = useState<{ prescription: string, billing: string } | null>(null);
    const [hospitalData, setHospitalData] = useState<any>(null);

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

    // -- Fetch Doctor Profile --
    useEffect(() => {
        const fetchDoctorProfile = async () => {
            const res = await getDoctorProfileAction();
            if (res.success && res.data) {
                const doc = res.data;
                setFormData(prev => ({
                    ...prev,
                    doctorName: doc.user?.name || doc.name || prev.doctorName,
                    doctorSignature: doc.signature
                }));
                if (doc.hospital) {
                    setHospitalData(doc.hospital);
                }
            }
        };
        fetchDoctorProfile();
    }, []);

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

        newMeds[index] = {
            ...newMeds[index],
            name: fullName,
            dosage: med.form || '', // Default dosage form
            price: med.mrp || 0
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
            medicines: [...prev.medicines, { name: '', dosage: '', freq: '', duration: '', quantity: '', price: 0 }]
        }));
    };

    const updateMedicine = (index: number, field: string, value: string | number) => {
        const newMeds = [...formData.medicines];
        (newMeds[index] as any)[field] = value;
        setFormData(prev => ({ ...prev, medicines: newMeds }));

        if (field === 'name') {
            handleMedicineSearch(value as string, index);
        }

        if (field === 'price') {
            calculateBilling(newMeds);
        }
    };

    const calculateBilling = (meds = formData.medicines) => {
        const subtotal = meds.reduce((sum, med) => sum + (Number(med.price) || 0), 0);
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

    const handleSubmit = async () => {
        if (!appointmentId && !patientId) return toast.error("Appointment ID or Patient ID is required");
        if (!formData.patientName) return toast.error("Patient Name is required");
        if (!formData.diagnosis) return toast.error("Diagnosis is required");
        if (formData.medicines.length === 0) return toast.error("At least one medicine is required");

        try {
            setIsSaving(true);

            // Save prescription
            await doctorService.createPrescription({
                appointmentId,
                patientId, // Pass patientId
                diagnosis: formData.diagnosis,
                symptoms: formData.symptoms.split(',').map(s => s.trim()),
                medicines: formData.medicines.map(m => ({
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
                avoid: formData.avoid,
                aiGenerated: mode === 'AI',
                age: formData.age,
                gender: formData.gender
            });

            // Re-use current styled generation logic
            const prescriptionHtml = generatePrescriptionHTML();
            const billingHtml = generateBillingHTML();

            // Save HTML for printing
            setGeneratedHtml({
                prescription: prescriptionHtml,
                billing: billingHtml
            });
            setShowSuccess(true);
            toast.success("Prescription Saved & Sent to Pharmacy/Lab Successfully!");

        } catch (error: any) {
            toast.error(error.message || "Failed to save prescription");
        } finally {
            setIsSaving(false);
        }
    };




    const generatePrescriptionHTML = () => {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Prescription - ${formData.patientName}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                    
                    @media print {
                        @page { size: A4; margin: 0; }
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    }

                    body { 
                        font-family: 'Inter', sans-serif; 
                        margin: 0;
                        padding: 0;
                        background: white;
                        font-size: 11px;
                        line-height: 1.4;
                        color: #111;
                    }

                    .container {
                        width: 210mm;
                        min-height: 297mm;
                        margin: 0 auto;
                        padding: 15mm 20mm;
                        position: relative;
                        box-sizing: border-box;
                    }

                    /* Header */
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        padding-bottom: 20px;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #000;
                    }
                    .brand h1 { margin: 0; font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
                    .brand p { margin: 4px 0 0; font-size: 9px; color: #555; }
                    
                    .doctor { text-align: right; }
                    .doctor h2 { margin: 0; font-size: 14px; font-weight: 700; }
                    .doctor p { margin: 2px 0 0; font-size: 9px; font-weight: 600; text-transform: uppercase; color: #555; }

                    /* Patient Grid - Clean, No Box */
                    .patient-info {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 15px;
                        margin-bottom: 25px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid #eee;
                    }
                    .info-label { display: block; font-size: 8px; font-weight: 700; text-transform: uppercase; color: #777; margin-bottom: 3px; letter-spacing: 0.5px; }
                    .info-val { font-size: 12px; font-weight: 600; }

                    /* Diagnosis */
                    .diagnosis-box { margin-bottom: 20px; }
                    .diagnosis-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #777; letter-spacing: 0.5px; }
                    .diagnosis-val { font-size: 12px; font-weight: 600; margin-left: 6px; }

                    /* Med List/Table */
                    .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #000; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px; letter-spacing: 0.5px; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th { text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #777; padding: 0 0 8px 0; border-bottom: 1px solid #eee; }
                    td { padding: 10px 0; border-bottom: 1px solid #f9f9f9; vertical-align: top; }
                    
                    .med-name { font-size: 12px; font-weight: 700; margin-bottom: 2px; }
                    .med-meta { font-size: 10px; color: #555; }
                    
                    /* Advice Grid */
                    .advice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
                    .advice-list { list-style: none; padding: 0; margin: 0; }
                    .advice-list li { margin-bottom: 6px; padding-left: 10px; position: relative; font-size: 11px; }
                    .advice-list li:before { content: "•"; position: absolute; left: 0; color: #aaa; }

                    /* Follow up */
                    .follow-up { margin-top: 30px; padding-top: 15px; border-top: 1px dashed #eee; font-size: 11px; display: flex; justify-content: space-between; }
                    .follow-up strong { font-weight: 700; text-transform: uppercase; font-size: 9px; color: #777; margin-right: 5px; }
                    .follow-up-date { font-weight: 700; color: #d946ef; }

                    /* Footer */
                    .footer { position: absolute; bottom: 15mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; align-items: flex-end; }
                    .footer-l span { display: block; font-size: 8px; color: #999; line-height: 1.5; }
                    
                    .sig-block { text-align: center; }
                    .sig-img { height: 40px; display: block; margin: 0 auto 5px; }
                    .sig-line { border-top: 1px solid #ccc; padding-top: 5px; font-size: 9px; font-weight: 600; text-transform: uppercase; min-width: 120px; }

                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="brand">
                            <h1>${hospitalData?.name || 'Kadapa Multi-Speciality'}</h1>
                            <p>${hospitalData?.address || 'RIMS Road, Putlampalli, Kadapa, AP'} • ${hospitalData?.phone || '+91 8562 245555'}</p>
                        </div>
                        <div class="doctor">
                            <h2>${formData.doctorName}</h2>
                            <p>Consultant Physician</p>
                        </div>
                    </div>

                    <div class="patient-info">
                        <div>
                            <span class="info-label">Name</span>
                            <span class="info-val">${formData.patientName}</span>
                        </div>
                        <div>
                            <span class="info-label">Age / Gender</span>
                            <span class="info-val">${formData.age} Y / ${formData.gender}</span>
                        </div>
                        <div>
                            <span class="info-label">ID</span>
                            <span class="info-val">${formData.mrn || '-'}</span>
                        </div>
                        <div>
                            <span class="info-label">Date</span>
                            <span class="info-val">${formData.date}</span>
                        </div>
                    </div>

                    ${formData.diagnosis ? `
                    <div class="diagnosis-box">
                        <span class="diagnosis-label">Diagnosis:</span>
                        <span class="diagnosis-val">${formData.diagnosis}</span>
                    </div>
                    ` : ''}

                    <div class="section-label">Medications</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40%">Medicine</th>
                                <th style="width: 20%">Dosage</th>
                                <th style="width: 20%">Frequency</th>
                                <th style="width: 10%">Days</th>
                                <th style="width: 10%">Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${formData.medicines.map(med => `
                            <tr>
                                <td>
                                    <div class="med-name">${med.name}</div>
                                </td>
                                <td class="med-meta">${med.dosage}</td>
                                <td class="med-meta">${med.freq}</td>
                                <td class="med-meta">${med.duration}</td>
                                <td class="med-meta">${med.quantity}</td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="advice-grid">
                        ${formData.dietAdvice.length > 0 ? `
                        <div>
                            <div class="section-label" style="border-bottom: 1px solid #eee; margin-top: 10px;">General Advice</div>
                            <ul class="advice-list">
                                ${formData.dietAdvice.filter(i => i.trim()).map(d => `<li>${d}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                        
                        ${formData.suggestedTests.length > 0 ? `
                        <div>
                            <div class="section-label" style="border-bottom: 1px solid #eee; margin-top: 10px;">Suggested Tests</div>
                            <ul class="advice-list">
                                ${formData.suggestedTests.filter(i => i.trim()).map(t => `<li>${t}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}

                        ${formData.avoid.length > 0 ? `
                        <div>
                            <div class="section-label" style="border-bottom: 1px solid #eee; margin-top: 10px;">Things to Avoid</div>
                            <ul class="advice-list" style="color: #dc2626;">
                                ${formData.avoid.filter(i => i.trim()).map(a => `<li>${a}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                    </div>

                    ${formData.followUp || formData.followUpDate ? `
                    <div class="follow-up">
                        <div><strong>Instructions:</strong> ${formData.followUp || 'N/A'}</div>
                        ${formData.followUpDate ? `<div><strong>Follow Up Date:</strong> <span class="follow-up-date">${new Date(formData.followUpDate).toLocaleDateString()}</span></div>` : ''}
                    </div>
                    ` : ''}

                    <div class="footer">
                        <div class="footer-l">
                            <span>Generated by MsCurechain Systems</span>
                            <span>Valid for 30 days</span>
                        </div>
                        <div class="sig-block">
                            ${formData.doctorSignature ? `<img src="${formData.doctorSignature}" class="sig-img" />` : '<div style="height: 40px;"></div>'}
                            <div class="sig-line">Authorized Signature</div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
    };

    const generateBillingHTML = () => {
        return `
            <html>
                <head>
                    <title>Pharmacy Bill Estimate</title>
                    <style>
                        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { text-align: left; padding: 12px; background: #f8fafc; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
                        td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; }
                        .total-row td { font-weight: 700; color: #0f172a; font-size: 16px; border-top: 2px solid #e2e8f0; }
                        h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
                        p { font-size: 12px; color: #64748b; margin: 0 0 20px; }
                    </style>
                </head>
                <body>
                    <h1>ESTIMATED BILL</h1>
                    <p>Patient: ${formData.patientName} | MRN: ${formData.mrn || 'N/A'}</p>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Dosage</th>
                                <th>Qty</th>
                                <th>Days</th>
                                <th style="text-align: right;">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${formData.medicines.map(med => `
                                <tr>
                                    <td>${med.name}</td>
                                    <td>${med.dosage}</td>
                                    <td>${med.quantity}</td>
                                    <td>${med.duration}</td>
                                    <td style="text-align: right;">₹${(Number(med.price) || 0).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="2">Total Amount</td>
                                <td style="text-align: right;">₹${formData.total.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                    <p style="margin-top: 40px; font-size: 10px; text-align: center;">This is an estimated bill based on inventory prices. Actual prices may vary at pharmacy counter.</p>
                </body>
            </html>
        `;
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
                                <Sparkles size={12} /> AI Assist
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
                        <div className="grid-cols-12 gap-3 px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:grid">
                            <div className="col-span-4">Medicine (Search)</div>
                            <div className="col-span-2">Dosage</div>
                            <div className="col-span-2">Freq</div>
                            <div className="col-span-2">Days</div>
                            <div className="col-span-2">Qty</div>
                        </div>

                        {formData.medicines.map((med, idx) => (
                            <div key={idx} className="relative group bg-slate-50 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 rounded-xl p-3">
                                <div className="grid grid-cols-12 gap-3 items-start">
                                    <div className="col-span-12 md:col-span-4 relative">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                                            <Search size={14} />
                                        </div>
                                        <input
                                            type="text"
                                            value={med.name}
                                            onChange={(e) => updateMedicine(idx, 'name', e.target.value)}
                                            onFocus={() => setActiveMedIndex(idx)}
                                            placeholder="Search medicine (Brand, Generic)..."
                                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 placeholder:font-normal focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 uppercase"
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
                                                            </div>
                                                            <div className="text-right">
                                                                {s.stock > 0 ? (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                                        Stock: {s.stock}
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                                                                        Out of Stock
                                                                    </span>
                                                                )}
                                                                <div className="text-xs font-bold text-slate-700 mt-1">₹{s.mrp}</div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                        <input
                                            value={med.dosage}
                                            onChange={(e) => updateMedicine(idx, 'dosage', e.target.value)}
                                            placeholder="Dosage (e.g. 500mg)"
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                        />
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                        <input
                                            value={med.freq}
                                            onChange={(e) => updateMedicine(idx, 'freq', e.target.value)}
                                            placeholder="Freq (e.g. 1-0-1)"
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                        />
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                        <input
                                            value={med.duration}
                                            onChange={(e) => updateMedicine(idx, 'duration', e.target.value)}
                                            placeholder="Days (e.g. 5 days)"
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                        />
                                    </div>
                                    <div className="col-span-6 md:col-span-2 flex items-center gap-2">
                                        <input
                                            value={med.quantity}
                                            onChange={(e) => updateMedicine(idx, 'quantity', e.target.value)}
                                            placeholder="Qty"
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                        />
                                        <button onClick={() => removeMedicine(idx)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg">
                                            <Trash2 size={16} />
                                        </button>
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
                        onClick={() => setFormData(INITIAL_FORM)}
                        className="px-6 py-3 bg-white text-slate-600 shadow-lg shadow-slate-200 rounded-xl font-bold uppercase text-xs tracking-wider border border-slate-200 hover:bg-slate-50"
                    >
                        Clear Form
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="px-10 py-3 bg-teal-600 text-white shadow-xl shadow-teal-600/20 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-teal-700 active:scale-95 flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Printer size={16} />}
                        Save, Send & Print
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
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-teal-50 border-2 border-teal-100 text-teal-700 hover:bg-teal-100 hover:border-teal-200 group w-48"
                            >
                                <Printer size={32} className="group-hover:scale-110" />
                                <span className="font-bold text-sm">Print Prescription</span>
                            </button>
                        </div>
                        <button
                            onClick={() => { setShowSuccess(false); router.back(); }}
                            className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest mt-4"
                        >
                            Close & Return
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default React.memo(CreatePrescriptionPage);
