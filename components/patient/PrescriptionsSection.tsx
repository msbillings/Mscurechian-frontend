'use client';
import React from 'react';
import { Pill, Calendar, User, Download, Building2 } from 'lucide-react';
import { Card } from '@/components/admin';
import { format } from 'date-fns';

interface Medicine {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
}

interface Prescription {
    _id: string;
    prescriptionDate: string;
    diagnosis: string;
    symptoms?: string[];
    medicines: Medicine[];
    advice?: string;
    dietAdvice?: string[];
    suggestedTests?: string[];
    avoid?: string[];
    followUpDate?: string;
    notes?: string;
    doctor: {
        user?: {
            name: string;
        };
        name?: string; // Fallback
        specialties?: string[];
    };
    hospital: {
        name: string;
        address?: string;
        phone?: string;
        email?: string;
    };
    displayType?: string;
    createdAt?: string;
    appointment?: {
        appointmentId: string;
        date: string;
    };
}

interface PrescriptionsSectionProps {
    prescriptions: Prescription[];
    patientName?: string;
    patientEmail?: string;
}

export default function PrescriptionsSection({
    prescriptions,
    patientName = 'Valued Patient',
    patientEmail = ''
}: PrescriptionsSectionProps) {

    const formatFrequency = (freq: string) => {
        if (!freq) return '';
        const parts = freq.split('-');
        if (parts.length !== 3) return freq;

        const times = [];
        if (parts[0] !== '0') times.push('Morning');
        if (parts[1] !== '0') times.push('Afternoon');
        if (parts[2] !== '0') times.push('Night');

        return times.length > 0 ? times.join(', ') : 'As needed';
    };

    const handleDownloadPDF = async (prescription: Prescription) => {
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF('p', 'mm', 'a4');
            const primaryBlue = [25, 118, 210]; // Professional Blue

            // --- HEADER SECTION ---
            doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
            doc.rect(0, 0, 210, 45, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text(prescription.hospital?.name?.toUpperCase() || 'HOSPITAL CENTER', 15, 18);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            const hospitalAddress = prescription.hospital?.address || 'Health District, Medical City';
            const hospitalPhone = prescription.hospital?.phone || '+1 (555) 000-0000';
            const hospitalEmail = prescription.hospital?.email || 'contact@hospital.com';

            doc.text(hospitalAddress, 15, 25);
            doc.text(`Phone: ${hospitalPhone}  •  Email: ${hospitalEmail}`, 15, 30);

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('PATIENT MEDICATION RECEIPT', 15, 40);

            // --- PATIENT & DOCTOR INFO ---
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('PATIENT INFORMATION', 15, 55);
            doc.setFont('helvetica', 'normal');
            doc.text(`Name: ${patientName}`, 15, 61);
            doc.text(`Email: ${patientEmail || 'N/A'}`, 15, 67);
            doc.text(`ID: #${prescription._id.toUpperCase()}`, 15, 73);

            doc.setFont('helvetica', 'bold');
            doc.text('PRESCRIBED BY', 120, 55);
            doc.setFont('helvetica', 'normal');
            doc.text(`Dr. ${prescription.doctor?.user?.name || prescription.doctor?.name || 'Medical Specialist'}`, 120, 61);
            doc.text(`${prescription.doctor?.specialties?.[0] || 'Consultant'}`, 120, 67);
            doc.text(`Date: ${format(new Date(prescription.prescriptionDate || prescription.createdAt || new Date()), 'PPPP')}`, 120, 73);

            doc.setDrawColor(200);
            doc.line(15, 80, 195, 80);

            // --- DIAGNOSIS ---
            let y = 90;
            if (prescription.diagnosis) {
                doc.setFont('helvetica', 'bold');
                doc.text('DIAGNOSIS:', 15, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 100, 100);
                doc.text(prescription.diagnosis.toUpperCase(), 40, y);
                y += 12;
            }

            // --- MEDICATIONS TABLE ---
            doc.setFillColor(240, 244, 248);
            doc.rect(15, y - 5, 180, 8, 'F');
            doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
            doc.setFont('helvetica', 'bold');
            doc.text('MEDICATION', 18, y);
            doc.text('DOSAGE', 85, y);
            doc.text('TIMING / FREQUENCY', 125, y);
            doc.text('DURATION', 170, y);
            y += 10;

            doc.setTextColor(60, 60, 60);
            doc.setFont('helvetica', 'normal');
            prescription.medicines.forEach((m) => {
                if (y > 260) { doc.addPage(); y = 30; }
                doc.setFont('helvetica', 'bold');
                doc.text(m.name.toUpperCase(), 18, y);
                doc.setFont('helvetica', 'normal');
                doc.text(m.dosage, 85, y);
                doc.text(formatFrequency(m.frequency), 125, y);
                doc.text(m.duration, 170, y);

                if (m.instructions) {
                    y += 5;
                    doc.setFontSize(8);
                    doc.setTextColor(100);
                    doc.text(`Instructions: ${m.instructions}`, 18, y);
                    doc.setFontSize(10);
                    doc.setTextColor(60, 60, 60);
                }

                y += 8;
                doc.setDrawColor(240);
                doc.line(15, y - 4, 195, y - 4);
                y += 4;
            });

            // --- CLINICAL ADVICE & NOTES ---
            y += 10;
            if (prescription.advice || prescription.notes) {
                if (y > 240) { doc.addPage(); y = 30; }
                doc.setFont('helvetica', 'bold');
                doc.text('CLINICAL ADVICE & NOTES', 15, y);
                y += 6;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                const notes = prescription.advice || prescription.notes || '';
                const splitNotes = doc.splitTextToSize(notes, 175);
                doc.text(splitNotes, 15, y);
                y += (splitNotes.length * 5) + 5;
            }

            // --- FOLLOW UP ---
            if (prescription.followUpDate) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(25, 118, 210); // Primary Blue
                doc.text(`FOLLOW-UP DATE: ${format(new Date(prescription.followUpDate), 'PPPP')}`, 15, y);
            }

            // --- FOOTER ---
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`This is a system generated medical receipt. No signature required.`, 105, 285, { align: 'center' });
                doc.text(`Page ${i} of ${pageCount}`, 195, 285, { align: 'right' });
            }

            doc.save(`Medication_Receipt_${prescription._id.slice(-8).toUpperCase()}.pdf`);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Failed to generate medication receipt.');
        }
    };

    const filteredPrescriptions = (prescriptions || []).filter(p =>
        p.displayType !== 'Hospital Administration'
    );

    if (filteredPrescriptions.length === 0) {
        return (
            <Card className="p-8 text-center border-dashed bg-gray-50/50 dark:bg-white/5">
                <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Pill className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">No Active Prescriptions</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[200px] mx-auto">Your medical care directives from physicians will appear here.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3 px-1">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Pill className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        Medication <span className="text-blue-600">History</span>
                    </h2>
                    <p className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">Verified Clinical Directives</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {filteredPrescriptions.map((prescription: Prescription) => (
                    <div key={prescription._id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-xl sm:rounded-3xl p-3 sm:p-5 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden hover:border-blue-200">
                        <div className="flex flex-row md:flex-row gap-3 sm:gap-6">
                            {/* Date Column - Compact on Mobile */}
                            <div className="flex-none flex flex-col items-center justify-center w-10 h-10 sm:w-20 sm:h-20 bg-gray-50 dark:bg-white/5 rounded-lg sm:rounded-2xl shrink-0">
                                <span className="text-[7px] sm:text-xs font-black uppercase text-gray-400 tracking-tighter sm:mb-1 leading-none mb-0.5">
                                    {format(new Date(prescription.prescriptionDate || prescription.createdAt || new Date()), 'MMM')}
                                </span>
                                <span className="text-sm sm:text-3xl font-black text-gray-950 dark:text-white leading-none">
                                    {format(new Date(prescription.prescriptionDate || prescription.createdAt || new Date()), 'dd')}
                                </span>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[7px] font-black uppercase rounded tracking-widest shrink-0">
                                                {prescription.displayType || 'Prescription'}
                                            </span>
                                            <span className="text-[8px] sm:text-[10px] font-mono text-gray-400">
                                                #{prescription._id.slice(-8).toUpperCase()}
                                            </span>
                                        </div>
                                        <h3 className="font-black text-gray-950 dark:text-white text-sm sm:text-lg uppercase tracking-tight truncate italic">
                                            Dr. {prescription.doctor?.user?.name || prescription.doctor?.name || 'Medical Specialist'}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                                            <Building2 className="w-2.5 h-2.5 text-blue-600" />
                                            {prescription.hospital?.name}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDownloadPDF(prescription)}
                                        className="self-start px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-950 dark:bg-white text-white dark:text-gray-950 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-1.5 shrink-0"
                                    >
                                        <Download className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                        PDF Report
                                    </button>
                                </div>

                                {/* Medication List - Very Compact on Mobile */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {prescription.medicines.map((m: Medicine, idx: number) => (
                                        <div key={idx} className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-lg sm:rounded-xl p-2 sm:p-4 hover:border-blue-200 transition-colors group/med">
                                            <div className="flex items-start justify-between gap-2 mb-1 sm:mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-xs sm:text-sm text-gray-900 dark:text-white uppercase tracking-tight truncate leading-tight group-hover/med:text-blue-600">
                                                        {m.name}
                                                    </h4>
                                                    <p className="text-[7px] sm:text-[10px] font-bold text-blue-500 uppercase italic mt-0.5 tracking-tight truncate">
                                                        {m.dosage} • {m.duration}
                                                    </p>
                                                </div>
                                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 dark:border-white/10 shrink-0">
                                                    <Pill className="w-3 h-3 sm:w-4 sm:h-4" />
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-1">
                                                <span className="px-1.5 py-0.5 bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[7px] font-black uppercase tracking-tighter">
                                                    {formatFrequency(m.frequency)}
                                                </span>
                                                {m.instructions && (
                                                    <span className="px-1.5 py-0.5 bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded text-[7px] font-black uppercase tracking-tighter truncate max-w-[100px]">
                                                        {m.instructions}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Notes/Diagnosis Summary */}
                                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                                    {prescription.diagnosis && (
                                        <div className="flex-1 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100/50 dark:border-blue-900/20">
                                            <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest block mb-1">Diagnosis</span>
                                            <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase leading-relaxed line-clamp-2">
                                                {prescription.diagnosis}
                                            </p>
                                        </div>
                                    )}
                                    {prescription.notes && (
                                        <div className="flex-1 bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100/50 dark:border-amber-900/20">
                                            <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest block mb-1">Clinical Note</span>
                                            <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 italic uppercase leading-relaxed line-clamp-2">
                                                &ldquo;{prescription.notes}&rdquo;
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
