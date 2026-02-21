'use client';

import React, { useState } from 'react';
import { X, FileText, CheckCircle2, ChevronDown, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { ipdService, hospitalAdminService } from '@/lib/integrations';

interface ClinicalNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    admissionId: string;
    patientName: string;
    patientAge?: string;
    patientGender?: string;
    mrn?: string;
    onSuccess?: () => void;
}

const DEFAULT_NOTE_TYPES = [
    'Progress Note',
    'Nursing Assessment',
    'Medication Administration Note',
    'Post-Op Monitoring',
    'Incident',
    'Shift Handover'
];

const DEFAULT_VISIBILITIES = ['Nurse', 'Doctor', 'Admin'];

const VISIBILITY_LABELS: Record<string, string> = {
    'Nurse': 'Nurses Only',
    'Doctor': 'Doctors & Nurses',
    'Admin': 'All Staff'
};

export default function ClinicalNotesModal({ isOpen, onClose, admissionId, patientName, patientAge, patientGender, mrn, onSuccess }: ClinicalNotesModalProps) {
    const [loading, setLoading] = useState(false);
    const [noteTypes, setNoteTypes] = useState<string[]>(DEFAULT_NOTE_TYPES);
    const [visibilities, setVisibilities] = useState<string[]>(DEFAULT_VISIBILITIES);
    const [formData, setFormData] = useState({
        type: '',
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
        visibility: ''
    });

    // Fetch clinical note metadata
    React.useEffect(() => {
        if (isOpen) {
            const fetchMetadata = async () => {
                try {
                    const response = await hospitalAdminService.getHospitalMetadata({ skipCache: true });
                    if (response.success && response.data) {
                        const types = response.data.clinicalNoteTypes || DEFAULT_NOTE_TYPES;
                        const vis = response.data.clinicalNoteVisibilities || DEFAULT_VISIBILITIES;
                        setNoteTypes(types);
                        setVisibilities(vis);

                        // Set defaults if not already set by fetchLatestNote
                        setFormData(prev => ({
                            ...prev,
                            type: prev.type || types[0] || '',
                            visibility: prev.visibility || vis[0] || ''
                        }));
                    }
                } catch (error) {
                    console.error("Failed to fetch hospital metadata:", error);
                }
            };
            fetchMetadata();
        }
    }, [isOpen]);

    // Fetch latest note to pre-fill on open
    React.useEffect(() => {
        if (isOpen && admissionId) {
            const fetchLatestNote = async () => {
                try {
                    setLoading(true);
                    const history = await ipdService.getClinicalHistory(admissionId);
                    if (history.notes && history.notes.length > 0) {
                        const latest = history.notes[0];
                        setFormData({
                            type: latest.type || 'Progress Note',
                            subjective: latest.subjective || '',
                            objective: latest.objective || '',
                            assessment: latest.assessment || '',
                            plan: latest.plan || '',
                            visibility: latest.visibility || 'Nurse'
                        });
                    }
                } catch (error) {
                    console.error("Failed to fetch clinical notes:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchLatestNote();
        }
    }, [isOpen, admissionId]);

    if (!isOpen) return null;

    const isFormValid = () => {
        const sLen = formData.subjective.trim().length;
        const oLen = formData.objective.trim().length;
        const aLen = formData.assessment.trim().length;
        const pLen = formData.plan.trim().length;

        return (
            formData.type &&
            formData.visibility &&
            sLen >= 5 && sLen <= 300 &&
            oLen >= 5 && oLen <= 300 &&
            aLen >= 5 && aLen <= 400 &&
            pLen >= 5 && pLen <= 400
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isFormValid()) {
            toast.error("Please fill all fields within character limits");
            return;
        }

        try {
            setLoading(true);
            await ipdService.addClinicalNote({
                admissionId,
                ...formData
            });
            toast.success("Clinical note added");
            onSuccess?.();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to add note");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl max-h-[95vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* HEADER */}
                <div className="p-4 sm:p-8 bg-primary-theme text-white flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-2 sm:gap-3 mb-1">
                            <FileText size={18} className="text-white sm:size-6" />
                            <h2 className="text-sm sm:text-xl font-black uppercase tracking-tight leading-none">Clinical Note</h2>
                        </div>
                        <p className="text-[7px] sm:text-[10px] font-bold text-white/80 uppercase tracking-widest leading-none mt-1">
                            {patientName} {mrn ? `• ID: ${mrn}` : ''} {patientAge ? `• ${patientAge}` : ''} {patientGender ? `• ${patientGender}` : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 sm:p-2 hover:bg-white/10 rounded-xl sm:rounded-2xl transition-all">
                        <X size={16} className="text-white sm:size-5" />
                    </button>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="p-3 sm:p-8 space-y-3 sm:space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="grid grid-cols-2 gap-3 sm:gap-6">
                        <div className="space-y-1 sm:space-y-2">
                            <label className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Note Type</label>
                            <div className="relative">
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-3 sm:px-5 py-2 sm:py-3.5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold outline-none appearance-none cursor-pointer focus:border-teal-500"
                                >
                                    {!formData.type && <option value="">Type</option>}
                                    {noteTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-1 sm:space-y-2">
                            <label className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Visibility</label>
                            <div className="relative">
                                <select
                                    value={formData.visibility}
                                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                                    className="w-full px-3 sm:px-5 py-2 sm:py-3.5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold outline-none appearance-none cursor-pointer focus:border-teal-500"
                                >
                                    {!formData.visibility && <option value="">Visibility</option>}
                                    {visibilities.map(v => <option key={v} value={v}>{VISIBILITY_LABELS[v] || v}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                        <div className="space-y-1 sm:space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Subjective</label>
                                <span className={`text-[7px] sm:text-[8px] font-bold ${formData.subjective.length < 5 || formData.subjective.length > 300 ? 'text-rose-500' : 'text-slate-400'}`}>
                                    {formData.subjective.length}/300
                                </span>
                            </div>
                            <textarea
                                value={formData.subjective}
                                onChange={(e) => {
                                    if (e.target.value.length <= 300) {
                                        setFormData({ ...formData, subjective: e.target.value });
                                    }
                                }}
                                placeholder="Patient reports..."
                                rows={2}
                                className="w-full px-3 sm:px-5 py-2 sm:py-3.5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold outline-none focus:border-teal-500 transition-all resize-none"
                            />
                        </div>
                        <div className="space-y-1 sm:space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Objective</label>
                                <span className={`text-[7px] sm:text-[8px] font-bold ${formData.objective.length < 5 || formData.objective.length > 300 ? 'text-rose-500' : 'text-slate-400'}`}>
                                    {formData.objective.length}/300
                                </span>
                            </div>
                            <textarea
                                value={formData.objective}
                                onChange={(e) => {
                                    if (e.target.value.length <= 300) {
                                        setFormData({ ...formData, objective: e.target.value });
                                    }
                                }}
                                placeholder="Findings..."
                                rows={2}
                                className="w-full px-3 sm:px-5 py-2 sm:py-3.5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold outline-none focus:border-teal-500 transition-all resize-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1 sm:space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Assessment</label>
                            <span className={`text-[7px] sm:text-[8px] font-bold ${formData.assessment.length < 5 || formData.assessment.length > 400 ? 'text-rose-500' : 'text-slate-400'}`}>
                                {formData.assessment.length}/400
                            </span>
                        </div>
                        <textarea
                            value={formData.assessment}
                            onChange={(e) => {
                                if (e.target.value.length <= 400) {
                                    setFormData({ ...formData, assessment: e.target.value });
                                }
                            }}
                            placeholder="Clinical impression..."
                            rows={2}
                            className="w-full px-3 sm:px-5 py-2 sm:py-3.5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold outline-none focus:border-teal-500 transition-all resize-none"
                        />
                    </div>

                    <div className="space-y-1 sm:space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan</label>
                            <span className={`text-[7px] sm:text-[8px] font-bold ${formData.plan.length < 5 || formData.plan.length > 400 ? 'text-rose-500' : 'text-slate-400'}`}>
                                {formData.plan.length}/400
                            </span>
                        </div>
                        <textarea
                            value={formData.plan}
                            onChange={(e) => {
                                if (e.target.value.length <= 400) {
                                    setFormData({ ...formData, plan: e.target.value });
                                }
                            }}
                            placeholder="Next steps..."
                            rows={2}
                            className="w-full px-3 sm:px-5 py-2 sm:py-3.5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold outline-none focus:border-teal-500 transition-all resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !isFormValid()}
                        className="w-full py-2.5 sm:py-4 bg-primary-theme text-white rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-primary-theme/80 transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                        Save Note
                    </button>
                </form>
            </div>
        </div>
    );
}


