'use client';

import React, { useState, useEffect } from 'react';
import { 
    X, Stethoscope, FileText, Activity, Pill, CheckCircle2, 
    AlertTriangle, Clock, Calendar, ChevronRight, Plus, 
    LogOut, ArrowRightLeft, Receipt, History, User, HeartPulse,
    ShieldAlert, Check, Sparkles
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const fadeInStyle = { animation: 'fadeIn 0.2s ease-out forwards' };
const slideLeftStyle = { animation: 'slideLeft 0.3s ease-out forwards' };
const globalStyles = `
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
`;

interface InpatientRoundingModalProps {
    isOpen: boolean;
    onClose: () => void;
    admission: any;
    onDischargeRequest: (id: string) => void;
    onTransferRequest: (id: string) => void;
    onOpenPrescription: (adm: any) => void;
    onRoundStatusChange: () => void;
}

export default function InpatientRoundingModal({
    isOpen,
    onClose,
    admission,
    onDischargeRequest,
    onTransferRequest,
    onOpenPrescription,
    onRoundStatusChange
}: InpatientRoundingModalProps) {
    const [activeTab, setActiveTab] = useState<'soap' | 'vitals' | 'emar' | 'discharge'>('soap');
    const [isRoundedToday, setIsRoundedToday] = useState(false);

    // SOAP Form state
    const [subjective, setSubjective] = useState('');
    const [objective, setObjective] = useState('');
    const [assessment, setAssessment] = useState('');
    const [plan, setPlan] = useState('');
    const [savedNotes, setSavedNotes] = useState<any[]>([]);

    // Discharge Checklist State
    const [checklist, setChecklist] = useState({
        medsReconciled: false,
        vitalsStable: false,
        woundCareDone: false,
        summaryWritten: false
    });

    const admId = admission?._id || admission?.id;
    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (!admId) return;
        // Load rounded today status
        const roundedKey = `ipd_rounded_${admId}_${todayStr}`;
        setIsRoundedToday(localStorage.getItem(roundedKey) === 'true');

        // Load SOAP notes
        const notesKey = `ipd_soap_notes_${admId}`;
        const storedNotes = localStorage.getItem(notesKey);
        if (storedNotes) {
            try {
                setSavedNotes(JSON.parse(storedNotes));
            } catch (e) {
                setSavedNotes([]);
            }
        } else {
            // Seed default note if empty
            setSavedNotes([
                {
                    id: 'seed-1',
                    date: new Date(Date.now() - 86400000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
                    doctor: 'DR. RAMESH (Attending)',
                    subjective: 'Patient admitted yesterday with acute symptoms. Complaining of moderate fatigue.',
                    objective: 'BP 124/82, HR 78, SpO2 98%. Afebrile. Lungs clear bilaterally.',
                    assessment: 'Day 1 hospital course stable. IV antibiotics initiated.',
                    plan: 'Continue IV therapy. Monitor vitals Q4H. Advance diet as tolerated.'
                }
            ]);
        }

        // Load checklist
        const checkKey = `ipd_checklist_${admId}`;
        const storedCheck = localStorage.getItem(checkKey);
        if (storedCheck) {
            try { setChecklist(JSON.parse(storedCheck)); } catch (e) {}
        }
    }, [admId, todayStr]);

    if (!isOpen || !admission) return null;

    const patient = admission.patient || {};
    const vitals = admission.vitals || {};

    const toggleRoundedToday = () => {
        const nextState = !isRoundedToday;
        setIsRoundedToday(nextState);
        const roundedKey = `ipd_rounded_${admId}_${todayStr}`;
        localStorage.setItem(roundedKey, String(nextState));
        toast.success(nextState ? "Marked as Rounded Today" : "Rounding status reset");
        onRoundStatusChange();
    };

    const handleSaveNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!subjective && !objective && !assessment && !plan) {
            toast.error("Please fill in at least one section of the SOAP note");
            return;
        }

        const newNote = {
            id: 'note_' + Date.now(),
            date: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
            doctor: 'DR. RAMESH (Attending)',
            subjective: subjective || 'No subjective complaints reported.',
            objective: objective || `Vitals: BP ${vitals.bloodPressure || '120/80'}, HR ${vitals.heartRate || '76'}, SpO2 ${vitals.spO2 || '98'}%`,
            assessment: assessment || 'Clinical status stable on ward rounds.',
            plan: plan || 'Continue current inpatient orders.'
        };

        const updatedNotes = [newNote, ...savedNotes];
        setSavedNotes(updatedNotes);
        localStorage.setItem(`ipd_soap_notes_${admId}`, JSON.stringify(updatedNotes));

        // Automatically mark as rounded today when a note is saved!
        if (!isRoundedToday) {
            setIsRoundedToday(true);
            localStorage.setItem(`ipd_rounded_${admId}_${todayStr}`, 'true');
            onRoundStatusChange();
        }

        setSubjective('');
        setObjective('');
        setAssessment('');
        setPlan('');
        toast.success("Daily SOAP Progress Note Signed & Saved!");
    };

    const toggleCheckitem = (key: keyof typeof checklist) => {
        const updated = { ...checklist, [key]: !checklist[key] };
        setChecklist(updated);
        localStorage.setItem(`ipd_checklist_${admId}`, JSON.stringify(updated));
    };

    const allChecked = checklist.medsReconciled && checklist.vitalsStable && checklist.woundCareDone && checklist.summaryWritten;

    return (
        <>
        <style>{globalStyles}</style>
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end" style={fadeInStyle}>
            <div className="w-full max-w-4xl bg-white dark:bg-[#111] h-full shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800" style={slideLeftStyle}>
                
                {/* 1. Header Section */}
                <div className="p-4 md:p-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shrink-0 relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 relative z-10">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-inner shrink-0">
                                {patient.name?.[0] || 'P'}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">{patient.name || 'Patient'}</h2>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-bold text-[9px] sm:text-[10px] uppercase">
                                        MRN: {patient.mrn || 'N/A'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-white font-black text-[9px] sm:text-[10px] uppercase">
                                        BED: {admission.bed?.bedId || 'WARD'} ({admission.bed?.type || 'General'})
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-gray-300 flex-wrap">
                                    <span>Age/Gender: <strong className="text-white">{patient.age || '45'}Y / {patient.gender || 'M'}</strong></span>
                                    <span className="hidden sm:inline">•</span>
                                    <span>Principal Dx: <strong className="text-emerald-300 font-bold">{admission.reasonForAdmission || 'Pending Assessment'}</strong></span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <button
                                onClick={toggleRoundedToday}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all shadow-md ${
                                    isRoundedToday 
                                        ? 'bg-emerald-500 text-white border border-emerald-400' 
                                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                                }`}
                            >
                                <CheckCircle2 size={16} strokeWidth={2.5} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>{isRoundedToday ? 'Rounded Today ✓' : 'Mark Rounded'}</span>
                            </button>
                            <button 
                                onClick={onClose}
                                className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white transition-colors border border-white/10"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Clinical Safety Banner */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10 flex-wrap text-[10px] sm:text-[11px]">
                        <span className="font-bold text-gray-300 uppercase tracking-wider">Clinical Alerts:</span>
                        {patient.allergies?.length > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-400/40 font-black uppercase">
                                ⚠️ Allergy: {patient.allergies[0]}
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 rounded bg-white/10 text-gray-200 border border-white/10 font-bold">
                                🛡️ No Known Allergies
                            </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/40 font-black uppercase">
                            📋 Code Status: Full Resuscitation
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-400/40 font-black uppercase">
                            🍽️ Diet: Standard Ward Diet
                        </span>
                    </div>
                </div>

                {/* 2. Navigation Tabs */}
                <div className="flex items-center border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] px-3 md:px-6 shrink-0 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'soap', label: '1. SOAP Notes', icon: FileText, count: savedNotes.length },
                        { id: 'vitals', label: '2. Vitals & Labs', icon: Activity },
                        { id: 'emar', label: '3. eMAR Meds', icon: Pill },
                        { id: 'discharge', label: '4. Discharge', icon: LogOut, alert: admission.dischargeRequested }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-1.5 py-3 px-2.5 sm:px-4 font-black text-[10px] sm:text-xs uppercase tracking-wider border-b-2 transition-all shrink-0 ${
                                    isActive 
                                        ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#111]' 
                                        : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                                }`}
                            >
                                <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                                <span>{tab.label}</span>
                                {tab.count !== undefined && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                                        {tab.count}
                                    </span>
                                )}
                                {tab.alert && (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* 3. Tab Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* TAB 1: DAILY SOAP REVIEW */}
                    {activeTab === 'soap' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* Left: New SOAP Entry Form */}
                            <div className="lg:col-span-6 bg-gray-50/70 dark:bg-[#161616] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                                <form onSubmit={handleSaveNote} className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
                                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black uppercase text-xs tracking-wider">
                                            <Stethoscope size={16} strokeWidth={2.5} />
                                            <span>Document Morning Ward Round</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400">{todayStr}</span>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                                            Subjective (Patient Complaints / Symptoms)
                                        </label>
                                        <textarea
                                            value={subjective}
                                            onChange={(e) => setSubjective(e.target.value)}
                                            placeholder="e.g. Patient states mild nausea resolved overnight. Pain score 2/10."
                                            rows={2}
                                            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#111] p-3 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                                            Objective (Physical Exam & Morning Vitals)
                                        </label>
                                        <textarea
                                            value={objective}
                                            onChange={(e) => setObjective(e.target.value)}
                                            placeholder="e.g. Vitals stable. T 37.1 C, HR 76, SpO2 98%. Surgical wound clean, no discharge."
                                            rows={2}
                                            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#111] p-3 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                                            Assessment (Clinical Impression)
                                        </label>
                                        <textarea
                                            value={assessment}
                                            onChange={(e) => setAssessment(e.target.value)}
                                            placeholder="e.g. Day 3 post-op appendectomy. Recovering well, sepsis resolved."
                                            rows={2}
                                            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#111] p-3 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                                            Plan (Daily Orders & Next Steps)
                                        </label>
                                        <textarea
                                            value={plan}
                                            onChange={(e) => setPlan(e.target.value)}
                                            placeholder="e.g. Switch IV Rocephin to oral Cefuroxime. Advance diet to solids. Clear for ambulation."
                                            rows={2}
                                            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#111] p-3 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98"
                                    >
                                        <CheckCircle2 size={16} strokeWidth={2.5} />
                                        <span>Sign & Save Daily Progress Note</span>
                                    </button>
                                </form>
                            </div>

                            {/* Right: Previous Progress Notes Timeline */}
                            <div className="lg:col-span-6 space-y-4">
                                <h3 className="font-black text-xs uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                    <History size={15} />
                                    <span>Past Clinical Rounding Notes ({savedNotes.length})</span>
                                </h3>

                                <div className="space-y-4">
                                    {savedNotes.map((note) => (
                                        <div key={note.id} className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
                                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                                                <div className="flex items-center gap-2 font-black text-xs text-gray-900 dark:text-white">
                                                    <User size={14} className="text-emerald-600" />
                                                    <span>{note.doctor}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                                    {note.date}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="bg-gray-50 dark:bg-[#111] p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/80">
                                                    <span className="block text-[9px] font-black text-emerald-600 uppercase">Subjective</span>
                                                    <p className="text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-3">{note.subjective}</p>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-[#111] p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/80">
                                                    <span className="block text-[9px] font-black text-blue-600 uppercase">Objective</span>
                                                    <p className="text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-3">{note.objective}</p>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-[#111] p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/80">
                                                    <span className="block text-[9px] font-black text-purple-600 uppercase">Assessment</span>
                                                    <p className="text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-3">{note.assessment}</p>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-[#111] p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/80">
                                                    <span className="block text-[9px] font-black text-amber-600 uppercase">Plan</span>
                                                    <p className="text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-3">{note.plan}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: VITALS FLOWSHEET & LABS */}
                    {activeTab === 'vitals' && (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-[#161616] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                                        <HeartPulse className="text-rose-500" size={16} />
                                        <span>24-Hour Vitals Flowsheet Summary</span>
                                    </h3>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-200">
                                        Telemetry Stream Active
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800">
                                        <span className="text-[10px] font-black uppercase text-gray-400">Blood Pressure</span>
                                        <p className="text-xl font-black text-gray-900 dark:text-white mt-1">{vitals.bloodPressure || '120/80'} <span className="text-xs font-normal text-gray-400">mmHg</span></p>
                                        <span className="text-[9px] font-bold text-emerald-600 mt-1 block">✓ Within Target</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800">
                                        <span className="text-[10px] font-black uppercase text-gray-400">Heart Rate</span>
                                        <p className="text-xl font-black text-gray-900 dark:text-white mt-1">{vitals.heartRate || '74'} <span className="text-xs font-normal text-gray-400">bpm</span></p>
                                        <span className="text-[9px] font-bold text-emerald-600 mt-1 block">✓ Regular Rhythm</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800">
                                        <span className="text-[10px] font-black uppercase text-gray-400">Oxygen Saturation</span>
                                        <p className="text-xl font-black text-gray-900 dark:text-white mt-1">{vitals.spO2 || '98'}% <span className="text-xs font-normal text-gray-400">Room Air</span></p>
                                        <span className="text-[9px] font-bold text-emerald-600 mt-1 block">✓ Good Perfusion</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800">
                                        <span className="text-[10px] font-black uppercase text-gray-400">Temperature</span>
                                        <p className="text-xl font-black text-gray-900 dark:text-white mt-1">{vitals.temperature || '37.1'} <span className="text-xs font-normal text-gray-400">°C</span></p>
                                        <span className="text-[9px] font-bold text-emerald-600 mt-1 block">✓ Afebrile</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#161616] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                                <h3 className="font-black text-xs uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                                    <Activity className="text-blue-500" size={16} />
                                    <span>Morning Diagnostic & Laboratory Highlights</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111] flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Complete Blood Count</span>
                                            <p className="font-black text-sm text-gray-900 dark:text-white">WBC: 7.2 | Hb: 13.4</p>
                                        </div>
                                        <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[9px] uppercase">Normal</span>
                                    </div>
                                    <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111] flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Renal & Electrolytes</span>
                                            <p className="font-black text-sm text-gray-900 dark:text-white">Na: 140 | K: 4.1 | Cr: 0.9</p>
                                        </div>
                                        <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[9px] uppercase">Normal</span>
                                    </div>
                                    <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111] flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Liver Function Panel</span>
                                            <p className="font-black text-sm text-gray-900 dark:text-white">AST: 24 | ALT: 28 | Bil: 0.6</p>
                                        </div>
                                        <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[9px] uppercase">Normal</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: ACTIVE MEDICATIONS (eMAR) */}
                    {activeTab === 'emar' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                                <div>
                                    <h4 className="font-black text-xs uppercase tracking-wider text-emerald-900 dark:text-emerald-300">Inpatient Medication Administration Record (eMAR)</h4>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">Review active floor prescriptions and bedside IV orders.</p>
                                </div>
                                <button
                                    onClick={() => onOpenPrescription(admission)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2"
                                >
                                    <Plus size={15} strokeWidth={2.5} />
                                    <span>Write New Order / Rx</span>
                                </button>
                            </div>

                            <div className="bg-white dark:bg-[#161616] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-[9px] font-black uppercase tracking-widest text-gray-400">
                                            <th className="px-4 py-3">Medication Order</th>
                                            <th className="px-4 py-3">Dose & Route</th>
                                            <th className="px-4 py-3">Schedule</th>
                                            <th className="px-4 py-3">Last Administered</th>
                                            <th className="px-4 py-3 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                                        <tr>
                                            <td className="px-4 py-3 font-black text-gray-900 dark:text-white">Inj. Piperacillin-Tazobactam</td>
                                            <td className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">4.5g / IV Infusion</td>
                                            <td className="px-4 py-3 text-gray-500">Every 8 Hours (Q8H)</td>
                                            <td className="px-4 py-3 text-gray-400">Today @ 06:00 AM</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 font-black text-[10px] uppercase">Active Floor Order</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 font-black text-gray-900 dark:text-white">Tab. Pantoprazole</td>
                                            <td className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">40mg / Oral</td>
                                            <td className="px-4 py-3 text-gray-500">Once Daily (OD Before Breakfast)</td>
                                            <td className="px-4 py-3 text-gray-400">Today @ 07:30 AM</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 font-black text-[10px] uppercase">Active Floor Order</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 font-black text-gray-900 dark:text-white">Normal Saline (0.9% NaCl)</td>
                                            <td className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">1000ml / Continuous IV</td>
                                            <td className="px-4 py-3 text-gray-500">Run @ 80 ml/hour</td>
                                            <td className="px-4 py-3 text-gray-400">Ongoing Infusion</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 font-black text-[10px] uppercase">Continuous Infusion</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: DISCHARGE READINESS CHECKLIST */}
                    {activeTab === 'discharge' && (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <div className="bg-white dark:bg-[#161616] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
                                <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
                                    <h3 className="font-black text-sm uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                                        <ShieldAlert className="text-amber-500" size={18} />
                                        <span>Physician Clinical Discharge Safety Verification</span>
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">Verify that clinical milestones are met before initiating hospital discharge summary.</p>
                                </div>

                                <div className="space-y-3">
                                    {[
                                        { key: 'medsReconciled', title: '1. Discharge Medications Reconciled', desc: 'Home prescriptions written and explained to patient.' },
                                        { key: 'vitalsStable', title: '2. 24-Hour Afebrile & Vitals Stable', desc: 'Patient hemodynamically stable without IV support.' },
                                        { key: 'woundCareDone', title: '3. Bedside Wound Care / Drain Removal Done', desc: 'Surgical sites clean, dressings applied.' },
                                        { key: 'summaryWritten', title: '4. Clinical Hospital Course Summary Documented', desc: 'Final SOAP progress note signed off.' }
                                    ].map((item) => (
                                        <label 
                                            key={item.key} 
                                            onClick={() => toggleCheckitem(item.key as any)}
                                            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                                                checklist[item.key as keyof typeof checklist] 
                                                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' 
                                                    : 'bg-gray-50 dark:bg-[#111] border-gray-200 dark:border-gray-800 hover:border-gray-400'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 transition-colors ${
                                                checklist[item.key as keyof typeof checklist] ? 'bg-emerald-600 text-white' : 'border-2 border-gray-300 dark:border-gray-600'
                                            }`}>
                                                {checklist[item.key as keyof typeof checklist] && <Check size={14} strokeWidth={3} />}
                                            </div>
                                            <div>
                                                <h4 className={`font-black text-xs uppercase tracking-tight ${checklist[item.key as keyof typeof checklist] ? 'text-emerald-900 dark:text-emerald-300' : 'text-gray-900 dark:text-white'}`}>
                                                    {item.title}
                                                </h4>
                                                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                                    <button
                                        onClick={() => {
                                            if (!allChecked) {
                                                if (!confirm("Not all safety checks are marked complete. Request discharge anyway?")) return;
                                            }
                                            onDischargeRequest(admission._id);
                                            onClose();
                                        }}
                                        className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 ${
                                            allChecked
                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                                                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                                        }`}
                                    >
                                        <LogOut size={16} strokeWidth={2.5} />
                                        <span>Initiate Official Hospital Discharge Request</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* 4. Footer Bar */}
                <div className="p-4 bg-gray-50 dark:bg-[#161616] border-t border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 text-xs">
                    <div className="flex items-center gap-2 text-gray-500 font-bold">
                        <span>Rounding Physician: <strong className="text-gray-900 dark:text-white">DR. RAMESH</strong></span>
                        <span>•</span>
                        <span>Department: <strong className="text-gray-900 dark:text-white">Inpatient Clinical Ward</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onTransferRequest(admission._id)}
                            className="px-3.5 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-black text-[10px] uppercase tracking-wider border border-amber-300 dark:border-amber-800 transition-all flex items-center gap-1.5"
                        >
                            <ArrowRightLeft size={13} strokeWidth={2.5} />
                            <span>Request Ward Step-down / Transfer</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-black text-xs uppercase tracking-wider transition-all"
                        >
                            Close Chart
                        </button>
                    </div>
                </div>

            </div>
        </div>
        </>
    );
}
