'use client';

import React from 'react';
import { Activity, Stethoscope, ClipboardCheck, Zap, Info, ShieldAlert } from 'lucide-react';

interface GeneralSurgeryModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const GeneralSurgeryModule: React.FC<GeneralSurgeryModuleProps> = ({ formData, setFormData }) => {
    if (!formData.surgeryData) return null;

    const surgeryData = formData.surgeryData;

    const updateSurgery = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            surgeryData: {
                ...prev.surgeryData,
                [field]: value
            }
        }));
    };

    const updateNested = (parent: string, child: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            surgeryData: {
                ...prev.surgeryData,
                [parent]: {
                    ...prev.surgeryData[parent],
                    [child]: value
                }
            }
        }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center">
                        <Zap size={20} className="text-rose-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-rose-700">General Surgery Assessment</h2>
                        <p className="text-[9px] font-bold text-rose-600/60 uppercase tracking-widest">Surgical Planning & Pre-Op Evaluation</p>
                    </div>
                </div>
                <div className="bg-white border border-rose-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-rose-600">
                    Surgery - Module
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* A. Surgical Assessment */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-rose-600">
                        <ClipboardCheck size={18} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Surgical Planning</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Surgery Type</label>
                            <select
                                value={surgeryData.surgeryType}
                                onChange={(e) => updateSurgery('surgeryType', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-rose-500/20 outline-none"
                            >
                                <option value="">Select Type</option>
                                <option value="Elective">Elective</option>
                                <option value="Emergency">Emergency</option>
                                <option value="Day Case">Day Case</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Procedure Name</label>
                            <input
                                value={surgeryData.procedurePlanned}
                                onChange={(e) => updateSurgery('procedurePlanned', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black"
                                placeholder="e.g. Laparoscopic Cholecystectomy"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Indication</label>
                            <textarea
                                value={surgeryData.indication}
                                onChange={(e) => updateSurgery('indication', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold"
                                rows={2}
                                placeholder="Clinical reason for surgery..."
                            />
                        </div>
                    </div>
                </div>

                {/* B. Physical Examination */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-sky-600">
                        <Stethoscope size={18} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Physical Examination</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {['Abdomen', 'Thorax', 'Limbs', 'Others'].map((part) => (
                            <div key={part} className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{part}</label>
                                <input
                                    value={(surgeryData.physicalExam as any)[part.toLowerCase()]}
                                    onChange={(e) => updateNested('physicalExam', part.toLowerCase(), e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black"
                                    placeholder="Findings..."
                                />
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 p-4 bg-sky-50 rounded-xl border border-sky-100 flex items-start gap-3">
                        <Info size={14} className="text-sky-600 mt-1 shrink-0" />
                        <p className="text-[9px] font-bold text-sky-700 leading-relaxed uppercase tracking-wide">
                            Focus on tenderness, guarding, palpable masses, or surgical scars in relevant areas.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* C. Systemic Review */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-emerald-600">
                        <Activity size={18} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Systemic Review</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {['CVS', 'RS', 'CNS', 'GIT'].map((sys) => (
                            <div key={sys} className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{sys}</label>
                                <input
                                    value={(surgeryData.systemicReview as any)[sys.toLowerCase()]}
                                    onChange={(e) => updateNested('systemicReview', sys.toLowerCase(), e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black"
                                    placeholder="NAD"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* D. Pre-Op Checklist */}
                <div className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-rose-600">
                        <ShieldAlert size={18} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Pre-Op Safety Checklist</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {[
                            { label: 'NPO Status (6-8 hours)', field: 'npoStatus' },
                            { label: 'Informed Consent Signed', field: 'consentSigned' },
                            { label: 'Baseline Investigations Done', field: 'investigationsDone' },
                            { label: 'Blood Cross-matched', field: 'bloodCrossMatched' },
                        ].map((check) => (
                            <button
                                key={check.field}
                                onClick={() => updateNested('preOpChecklist', check.field, !(surgeryData.preOpChecklist as any)[check.field])}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                    (surgeryData.preOpChecklist as any)[check.field]
                                        ? 'bg-rose-50 border-rose-500 text-rose-800'
                                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                                }`}
                            >
                                <span className="text-[10px] font-black uppercase tracking-wider">{check.label}</span>
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                                    (surgeryData.preOpChecklist as any)[check.field] ? 'bg-rose-600 border-rose-600 text-white' : 'border-slate-300'
                                }`}>
                                    {(surgeryData.preOpChecklist as any)[check.field] && <ClipboardCheck size={12} />}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
