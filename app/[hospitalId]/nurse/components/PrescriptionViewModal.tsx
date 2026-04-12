'use client';

import React, { useEffect, useState } from 'react';
import { X, FileText, Pill, Calendar, User, Hash, Download } from 'lucide-react';
import { ipdService } from '@/lib/integrations';
import toast from 'react-hot-toast';
import { formatFrequency } from '@/lib/frequencyUtils';

interface PrescriptionViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    admissionId: string;
    patientName: string;
}

export default function PrescriptionViewModal({ isOpen, onClose, admissionId, patientName }: PrescriptionViewModalProps) {
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && admissionId) {
            fetchPrescriptions();
        }
    }, [isOpen, admissionId]);

    const fetchPrescriptions = async () => {
        try {
            setLoading(true);
            console.log("Fetching prescriptions for Admission ID (string):", admissionId);
            const data = await ipdService.getPrescriptions(admissionId);
            console.log("Fetched prescriptions data:", data);
            setPrescriptions(data);
        } catch (error: any) {
            toast.error("Failed to fetch prescriptions");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-3xl max-h-[80vh] rounded-[1rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* HEADER */}
                <div className="p-8 bg-primary-theme text-white flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <FileText size={24} className="text-blue-400" />
                            <h2 className="text-xl font-black uppercase ">IPD Prescriptions</h2>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{patientName} • ADM: {admissionId}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-2xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fetching Records...</p>
                        </div>
                    ) : prescriptions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4 bg-white rounded-[32px] border border-dashed border-slate-200">
                            <FileText size={48} strokeWidth={1} />
                            <p className="text-xs font-bold uppercase tracking-widest">No IPD prescriptions found</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {prescriptions.map((presc) => (
                                <div key={presc._id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden border-l-[6px] border-l-blue-500">
                                    {/* PRESC HEADER */}
                                    <div className="p-6 border-b border-slate-50 flex flex-wrap justify-between items-center gap-4">
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-400" />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                                                    {new Date(presc.createdAt).toLocaleDateString()} at {new Date(presc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-slate-400" />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                                                    {presc.doctor?.user?.name || presc.doctor?.name || 'UNKNOWN'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CLINICAL CONTEXT */}
                                    <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-50 flex flex-wrap gap-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Diagnosis</span>
                                            <span className="text-[10px] font-bold text-slate-700 uppercase">{presc.diagnosis}</span>
                                        </div>
                                        {presc.symptoms?.length > 0 && (
                                            <div className="flex flex-col gap-1 border-l border-slate-200 pl-4">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Symptoms / Reason</span>
                                                <span className="text-[10px] font-bold text-slate-600 uppercase">{presc.symptoms.join(', ')}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* MEDICINES */}
                                    <div className="p-0">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-slate-50/50">
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Medicine</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Dosage</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Frequency</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {presc.medicines?.map((med: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                                                                    <Pill size={14} className="text-blue-500" />
                                                                </div>
                                                                <span className="text-xs font-black text-slate-700">{med.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-[11px] font-bold text-slate-600">{med.dosage}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-wider border border-amber-100">
                                                                {formatFrequency(med.frequency)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-[11px] font-bold text-slate-500 italic">{med.duration}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* NOTES */}
                                    {presc.notes && (
                                        <div className="p-6 bg-slate-50/30 border-t border-slate-50">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Doctor's Instructions</p>
                                            <p className="text-xs font-medium text-slate-600 leading-relaxed">{presc.notes}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-8 border-t border-slate-100 bg-white flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-primary-theme text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all"
                    >
                        Close Portal
                    </button>
                </div>
            </div>
        </div>
    );
}
