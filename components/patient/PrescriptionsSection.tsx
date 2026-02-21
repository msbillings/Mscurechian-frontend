'use client';
import React from 'react';


import { Pill, Calendar, User, FileText } from 'lucide-react';
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
    };
    displayType?: string; // NEW
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
    console.log("[PrescriptionsSection Debug] Prescriptions prop:", prescriptions);


    if (!prescriptions || prescriptions.length === 0) {
        return (
            <Card className="p-8 text-center">
                <Pill className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No prescriptions found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your prescriptions will appear here</p>
            </Card>
        );
    }

    return (
        <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 px-1">
                <div>
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">
                        Prescriptions
                    </h2>
                    <p className="text-gray-400 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mt-0.5">Medical Care Directives</p>
                </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
                {prescriptions.map((prescription) => (
                    <div key={prescription._id} id={`prescription-${prescription._id}`} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-lg group relative">
                        {/* Status Accents */}
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 rounded-l-xl sm:rounded-l-2xl" />

                        {/* Metadata Header */}
                        <div className="flex flex-col md:flex-row gap-2 sm:gap-3 mb-3 sm:mb-4 border-b border-gray-50 dark:border-white/5 pb-3 sm:pb-4">
                            <div className="flex-1 space-y-1 sm:space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg sm:rounded-xl flex items-center justify-center text-blue-600">
                                        <Pill className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-950 dark:text-white text-sm sm:text-base uppercase tracking-tight">
                                            {prescription.displayType || 'Prescription'}
                                        </h3>
                                        <p className="text-[8px] sm:text-[9px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1">
                                            <Calendar className="w-2.5 h-2.5" />
                                            {prescription.prescriptionDate ? format(new Date(prescription.prescriptionDate), 'MMM dd, yyyy') : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
                                <div>
                                    <p className="text-[8px] sm:text-[9px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Doctor</p>
                                    <p className="font-black text-gray-900 dark:text-white text-xs sm:text-sm uppercase">
                                        {prescription.doctor?.user?.name || prescription.doctor?.name || 'Authorized'}
                                    </p>
                                    <p className="text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase tracking-tighter">
                                        {prescription.doctor?.specialties?.[0] || 'Medical Unit'}
                                    </p>
                                </div>
                                <div className="hidden lg:block ml-4 pr-4 border-r border-gray-100 dark:border-white/5 h-8" />
                                <div>
                                    <p className="text-[8px] sm:text-[9px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Hospital</p>
                                    <p className="font-black text-gray-900 dark:text-white text-xs sm:text-sm uppercase">
                                        {prescription.hospital?.name || 'Global Care'}
                                    </p>
                                    <p className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                                        Medical Facility
                                    </p>
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-[8px] sm:text-[9px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Reference ID</p>
                                    <p className="font-mono text-[10px] sm:text-xs font-bold text-gray-500 uppercase">#{prescription.appointment?.appointmentId?.slice(-6) || prescription._id.slice(-6)}</p>
                                </div>

                            </div>
                        </div>

                        {/* Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
                            {/* Diagnosis & Advice */}
                            <div className="lg:col-span-4 space-y-2 sm:space-y-3">
                                <div className="bg-gray-50 dark:bg-white/5 p-2.5 sm:p-3 rounded-lg sm:rounded-xl space-y-1">
                                    <h4 className="text-[8px] sm:text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-blue-600" />
                                        Diagnosis
                                    </h4>
                                    <p className="text-[10px] sm:text-xs font-bold text-gray-800 dark:text-gray-200 leading-relaxed uppercase">
                                        {prescription.diagnosis}
                                    </p>
                                </div>

                                {prescription.symptoms && prescription.symptoms.length > 0 && (
                                    <div className="space-y-1">
                                        <h4 className="text-[7px] sm:text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Symptoms</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {prescription.symptoms.map((s, i) => (
                                                <span key={i} className="px-2.5 py-1 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-lg text-[9px] sm:text-[10px] font-black uppercase">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {prescription.advice && (
                                    <div className="bg-orange-50/50 dark:bg-orange-900/10 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-orange-100/50 dark:border-orange-900/20 space-y-1">
                                        <h4 className="text-[8px] sm:text-[9px] font-black text-orange-600 uppercase tracking-widest">Advice</h4>
                                        <p className="text-[9px] sm:text-[10px] font-bold text-orange-800 dark:text-orange-300 leading-relaxed italic uppercase">
                                            &ldquo;{prescription.advice}&rdquo;
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Medications */}
                            <div className="lg:col-span-8">
                                <div className="space-y-3 sm:space-y-4">
                                    <h4 className="text-[9px] sm:text-[10px] font-black text-gray-950 dark:text-white uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                        <Pill className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
                                        Medications
                                    </h4>

                                    <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                                        {prescription.medicines.map((m, idx) => (
                                            <div key={idx} className="bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-blue-200">
                                                <div className="flex justify-between items-start gap-4 mb-3 sm:mb-4">
                                                    <h5 className="font-black text-gray-900 dark:text-white text-sm sm:text-base uppercase tracking-tight">
                                                        {m.name}
                                                    </h5>
                                                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[8px] sm:text-[9px] font-black uppercase rounded-md">
                                                        {m.duration}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                                                    <div>
                                                        <p className="text-[7px] sm:text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Dosage</p>
                                                        <p className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">{m.dosage}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[7px] sm:text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Timing</p>
                                                        <p className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">{m.frequency}</p>
                                                    </div>
                                                    {m.instructions && (
                                                        <div className="col-span-2 md:col-span-1">
                                                            <p className="text-[7px] sm:text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Instructions</p>
                                                            <p className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase italic truncate">{m.instructions}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-50 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                            {prescription.followUpDate ? (
                                <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-900/30">
                                    <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    Next Follow-up: {format(new Date(prescription.followUpDate), 'MMM dd, yyyy')}
                                </div>
                            ) : (
                                <div className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest">Verified Digital Record</div>
                            )}
                            <div className="text-[8px] sm:text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest font-mono">
                                ID: {prescription._id.slice(-12).toUpperCase()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
