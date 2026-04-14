'use client';

import React, { useEffect, useState } from 'react';
import {
    Heart, Activity, Calendar, AlertTriangle, Info,
    Baby, Thermometer, FlaskConical, ClipboardList, ShieldAlert
} from 'lucide-react';

interface GynecologyModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

type AlertEntry = { type: 'emergency' | 'error' | 'warning' | 'info'; message: string };

// ── Helper parsers ──────────────────────────────────────────────────────────
function parseBP(bp: string): { sys: number; dia: number } | null {
    if (!bp) return null;
    const parts = bp.split('/');
    if (parts.length !== 2) return null;
    const sys = parseInt(parts[0]);
    const dia = parseInt(parts[1]);
    if (isNaN(sys) || isNaN(dia)) return null;
    return { sys, dia };
}

export const GynecologyModule: React.FC<GynecologyModuleProps> = ({ formData, setFormData }) => {
    const [alerts, setAlerts] = useState<AlertEntry[]>([]);

    if (!formData.gynaecData) return null;
    const g = formData.gynaecData;

    // ── Real-time Clinical Validation Engine ────────────────────────────────
    useEffect(() => {
        const newAlerts: AlertEntry[] = [];
        const today = new Date();

        // 1. LMP validation
        if (g.lmp) {
            const lmpDate = new Date(g.lmp);
            if (lmpDate > today) {
                newAlerts.push({ type: 'error', message: 'LMP cannot be a future date.' });
            } else {
                const monthsAgo = (today.getTime() - lmpDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
                if (monthsAgo > 3 && g.pregnant === 'No') {
                    newAlerts.push({ type: 'warning', message: 'LMP > 3 months ago with no pregnancy reported — Possible amenorrhea / hormonal issue.' });
                }
            }
        }

        // 2. Pregnancy status requirements
        if (g.pregnant === 'Yes') {
            if (!g.gestationalAge) {
                newAlerts.push({ type: 'error', message: 'Gestational age is REQUIRED when patient is pregnant.' });
            }
            if (!g.edd) {
                newAlerts.push({ type: 'error', message: 'EDD (Expected Date of Delivery) is REQUIRED when patient is pregnant.' });
            }
        }

        // 3. Gestational age validation
        const ga = parseInt(g.gestationalAge);
        if (ga) {
            if (ga < 1 || ga > 42) {
                newAlerts.push({ type: 'error', message: 'Gestational age must be between 1 and 42 weeks.' });
            } else if (ga > 40) {
                newAlerts.push({ type: 'warning', message: `Post-term pregnancy detected (${ga} weeks). Requires urgent assessment.` });
            }
        }

        // 4. FHR validation
        const fhr = parseInt(g.obstetricExam?.fetalHeartRate);
        if (fhr && g.pregnant === 'Yes') {
            if (fhr < 110) {
                newAlerts.push({ type: 'emergency', message: `CRITICAL: FHR ${fhr} bpm — Fetal Bradycardia / Fetal Distress. Normal: 110–160 bpm.` });
            } else if (fhr > 160) {
                newAlerts.push({ type: 'warning', message: `FHR ${fhr} bpm — Fetal Tachycardia. Normal: 110–160 bpm.` });
            }
        }

        // 5. Blood Pressure validation
        const bp = parseBP(g.vitals?.bp || '');
        if (bp && g.pregnant === 'Yes') {
            if (bp.sys > 160 || bp.dia > 110) {
                newAlerts.push({ type: 'emergency', message: `CRITICAL: BP ${g.vitals.bp} — SEVERE PREECLAMPSIA RISK. Immediate intervention required.` });
            } else if (bp.sys > 140 || bp.dia > 90) {
                newAlerts.push({ type: 'warning', message: `BP ${g.vitals.bp} is HIGH — Possible preeclampsia. Monitor closely.` });
            }
        }

        // 6. Symptom-based validations
        const syms: string[] = g.symptoms || [];

        if (syms.includes('Bleeding PV') && g.pregnant === 'Yes') {
            newAlerts.push({ type: 'emergency', message: 'EMERGENCY: Bleeding PV in pregnancy — Possible abortion / placenta previa. Urgent evaluation required.' });
        }

        if (syms.includes('Decreased Fetal Movement') && g.pregnant === 'Yes') {
            newAlerts.push({ type: 'emergency', message: 'URGENT: Decreased fetal movement — Immediate fetal assessment required.' });
        }

        if (syms.includes('White Discharge') && g.gynExam?.discharge === 'Foul smelling') {
            newAlerts.push({ type: 'warning', message: 'Foul-smelling discharge + white discharge — Infection likely. Consider swab culture.' });
        }

        // 7. Cross-field validations
        if (bp && (bp.sys > 140 || bp.dia > 90) && syms.includes('Swelling') && g.pregnant === 'Yes') {
            newAlerts.push({ type: 'warning', message: 'High BP + Edema — Preeclampsia risk. Monitor proteinuria and reflexes.' });
        }

        if (syms.includes('Missed Periods') && g.pregnant === 'No') {
            newAlerts.push({ type: 'info', message: 'Missed periods with No pregnancy — Check pregnancy test / hormonal workup.' });
        }

        // 8. Drug safety in pregnancy
        if (g.pregnant === 'Yes') {
            newAlerts.push({ type: 'info', message: 'Pregnancy active — Check drug safety category (FDA A/B/C/D/X) before prescribing.' });
        }

        setAlerts(newAlerts);
    }, [g]);

    // ── State helpers ────────────────────────────────────────────────────────
    const updateGyn = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            gynaecData: { ...prev.gynaecData, [field]: value }
        }));
    };

    const updateObstetric = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            gynaecData: {
                ...prev.gynaecData,
                obstetric: { ...prev.gynaecData?.obstetric, [field]: value }
            }
        }));
    };

    const updateVitals = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            gynaecData: {
                ...prev.gynaecData,
                vitals: { ...prev.gynaecData?.vitals, [field]: value }
            }
        }));
    };

    const updateObstetricExam = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            gynaecData: {
                ...prev.gynaecData,
                obstetricExam: { ...prev.gynaecData?.obstetricExam, [field]: value }
            }
        }));
    };

    const updateGynExam = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            gynaecData: {
                ...prev.gynaecData,
                gynExam: { ...prev.gynaecData?.gynExam, [field]: value }
            }
        }));
    };

    const toggleSymptom = (sym: string) => {
        const curr = g.symptoms || [];
        updateGyn('symptoms', curr.includes(sym) ? curr.filter((s: string) => s !== sym) : [...curr, sym]);
    };

    const toggleInvestigation = (inv: string) => {
        const curr = g.investigations || [];
        updateGyn('investigations', curr.includes(inv) ? curr.filter((i: string) => i !== inv) : [...curr, inv]);
    };

    const alertColors: Record<string, string> = {
        emergency: 'bg-red-50 border-red-600 text-red-900',
        error:     'bg-rose-50 border-rose-500 text-rose-800',
        warning:   'bg-amber-50 border-amber-500 text-amber-800',
        info:      'bg-blue-50 border-blue-400 text-blue-800',
    };

    const btnBase = (active: boolean, color = 'pink') =>
        `px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            active
                ? `bg-${color}-600 text-white shadow-md`
                : `bg-slate-50 text-slate-400 hover:bg-slate-100`
        }`;

    return (
        <div className="space-y-5">

            {/* ── Clinical Alerts ─────────────────────────────────────────── */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((alert, idx) => (
                        <div
                            key={idx}
                            className={`flex items-start gap-3 p-3 rounded-xl border-l-4 animate-in fade-in slide-in-from-top-2 duration-300 ${alertColors[alert.type]}`}
                        >
                            {alert.type === 'emergency' || alert.type === 'error'
                                ? <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                                : alert.type === 'warning'
                                ? <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                : <Info size={16} className="shrink-0 mt-0.5" />
                            }
                            <p className="text-[11px] font-black uppercase tracking-tight">{alert.message}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Standardized Light Header */}
            <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center">
                        <Heart size={20} className="text-pink-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-pink-700">Gynecology Assessment</h2>
                        <p className="text-[9px] font-bold text-pink-600/60 uppercase tracking-widest">Obstetric & Gynecological Profile</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {alerts.length > 0 && (
                        <div className="bg-pink-100/50 px-3 py-2 rounded-lg flex items-center gap-2 border border-pink-200 hidden md:flex">
                             <AlertTriangle size={14} className="text-pink-600" />
                             <span className="text-[9px] font-black uppercase tracking-widest text-pink-700">Safety Alerts Active</span>
                        </div>
                    )}
                    <div className="bg-white border border-pink-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-pink-600">
                        Gyn - Module
                    </div>
                </div>
            </div>

            {/* ── A. MENSTRUAL HISTORY (white card) ────────────────────────── */}
            <div className="bg-white rounded-2xl border border-pink-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-6 bg-[#db2777] rounded-full"></div>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Menstrual History</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* LMP */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            LMP Date <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={g.lmp || ''}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => updateGyn('lmp', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                        />
                    </div>

                    {/* Cycle Length */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cycle Length (days)</label>
                        <input
                            type="number" min={14} max={60}
                            value={g.cycleLength || ''}
                            onChange={(e) => updateGyn('cycleLength', e.target.value)}
                            placeholder="28"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                        />
                        <div className="flex gap-1">
                            {['Regular', 'Irregular'].map(r => (
                                <button key={r} type="button"
                                    onClick={() => updateGyn('cycleRegularity', r)}
                                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${g.cycleRegularity === r ? 'bg-pink-600 text-white shadow' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                >{r}</button>
                            ))}
                        </div>
                    </div>

                    {/* Flow Duration */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Flow Duration (days)</label>
                        <input
                            type="number" min={1} max={15}
                            value={g.flowDuration || ''}
                            onChange={(e) => updateGyn('flowDuration', e.target.value)}
                            placeholder="5"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                        />
                        <div className="flex gap-1">
                            {['Normal', 'Heavy', 'Scanty'].map(f => (
                                <button key={f} type="button"
                                    onClick={() => updateGyn('flowType', f === 'Heavy' ? 'Heavy (Menorrhagia)' : f)}
                                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${g.flowType === (f === 'Heavy' ? 'Heavy (Menorrhagia)' : f) ? 'bg-pink-600 text-white shadow' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                >{f}</button>
                            ))}
                        </div>
                    </div>

                    {/* Pregnancy Status */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            Pregnancy Status <span className="text-rose-500">*</span>
                        </label>
                        <div className="bg-slate-50 p-1.5 rounded-2xl flex flex-col gap-1 border-2 border-slate-100">
                            {['Yes', 'No', 'Suspected'].map(status => (
                                <button key={status} type="button"
                                    onClick={() => updateGyn('pregnant', status)}
                                    className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                                        g.pregnant === status
                                            ? 'bg-white text-pink-600 shadow-sm ring-1 ring-slate-200 scale-[1.02]'
                                            : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >{status}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── B. OBSTETRIC HISTORY (Structured) ───────────────────────── */}
            <div className="bg-white rounded-2xl border border-pink-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-pink-700">
                    <Baby size={17} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Obstetric History (G·P·L·A)</h3>
                </div>
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { key: 'gravida', label: 'Gravida (G)', hint: 'Total pregnancies' },
                        { key: 'para', label: 'Para (P)', hint: 'Deliveries ≥20wks' },
                        { key: 'living', label: 'Living (L)', hint: 'Living children' },
                        { key: 'abortions', label: 'Abortions (A)', hint: 'Miscarriages + TOPs' },
                    ].map(({ key, label, hint }) => (
                        <div key={key} className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
                            <input
                                type="number" min={0} max={20}
                                value={g.obstetric?.[key] ?? ''}
                                onChange={(e) => updateObstetric(key, e.target.value === '' ? undefined : parseInt(e.target.value))}
                                placeholder="0"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-lg font-black text-center focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                            />
                            <p className="text-[8px] text-slate-400 font-medium text-center">{hint}</p>
                        </div>
                    ))}
                </div>
                {/* GPLA Summary */}
                {(g.obstetric?.gravida || g.obstetric?.para || g.obstetric?.living != null || g.obstetric?.abortions != null) && (
                    <div className="mt-3 bg-pink-50 rounded-xl px-4 py-2 text-center">
                        <span className="text-sm font-black text-pink-700 tracking-widest">
                            G{g.obstetric?.gravida ?? 0}&nbsp;
                            P{g.obstetric?.para ?? 0}&nbsp;
                            L{g.obstetric?.living ?? 0}&nbsp;
                            A{g.obstetric?.abortions ?? 0}
                        </span>
                    </div>
                )}
            </div>

            {/* ── C. PREGNANCY DETAILS (conditional) ──────────────────────── */}
            {g.pregnant === 'Yes' && (
                <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-sm ring-1 ring-rose-100">
                    <div className="flex items-center gap-2 mb-4 text-rose-700">
                        <Calendar size={17} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Pregnancy Details</h3>
                        <span className="ml-auto bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">Required</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Gestational Age (weeks) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="number" min={1} max={42}
                                value={g.gestationalAge || ''}
                                onChange={(e) => updateGyn('gestationalAge', e.target.value)}
                                placeholder="e.g. 24"
                                className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all ${!g.gestationalAge ? 'border-rose-300' : 'border-slate-200'}`}
                            />
                            {parseInt(g.gestationalAge) > 40 && (
                                <p className="text-[10px] text-amber-600 font-bold">⚠️ Post-term pregnancy</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                EDD (Expected Date of Delivery) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={g.edd || ''}
                                onChange={(e) => updateGyn('edd', e.target.value)}
                                className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all ${!g.edd ? 'border-rose-300' : 'border-slate-200'}`}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── D. CURRENT SYMPTOMS ─────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-700">
                    <ClipboardList size={17} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Current Symptoms</h3>
                    <span className="ml-auto text-[9px] font-bold text-slate-400">Select all that apply</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {[
                        'Abdominal Pain', 'Bleeding PV', 'White Discharge',
                        'Missed Periods', 'Nausea/Vomiting', 'Swelling', 'Decreased Fetal Movement'
                    ].map(sym => {
                        const active = (g.symptoms || []).includes(sym);
                        const isDanger = ['Bleeding PV', 'Decreased Fetal Movement'].includes(sym);
                        return (
                            <button key={sym} type="button"
                                onClick={() => toggleSymptom(sym)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                    active
                                        ? isDanger
                                            ? 'bg-red-600 text-white border-red-600 shadow-md'
                                            : 'bg-pink-600 text-white border-pink-600 shadow-md'
                                        : isDanger
                                            ? 'bg-red-50 text-red-400 border-red-200 hover:bg-red-100'
                                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                }`}
                            >{sym}</button>
                        );
                    })}
                </div>
            </div>

            {/* ── E. VITALS ───────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-blue-700">
                    <Activity size={17} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Vitals</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { key: 'bp', label: 'Blood Pressure', placeholder: '120/80', type: 'text',
                          hint: g.vitals?.bp && parseBP(g.vitals.bp)
                            ? (parseBP(g.vitals.bp)!.sys > 160 ? '🚨 Severe' : parseBP(g.vitals.bp)!.sys > 140 ? '⚠️ High' : '✓ Normal')
                            : '' },
                        { key: 'pulse', label: 'Pulse (bpm)', placeholder: '80', type: 'number', hint: '' },
                        { key: 'weight', label: 'Weight (kg)', placeholder: '60', type: 'number', hint: '' },
                        { key: 'temperature', label: 'Temp (°F)', placeholder: '98.6', type: 'number', hint: '' },
                    ].map(({ key, label, placeholder, type, hint }) => (
                        <div key={key} className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
                            <input
                                type={type}
                                value={(g.vitals?.[key]) ?? ''}
                                onChange={(e) => updateVitals(key, e.target.value)}
                                placeholder={placeholder}
                                className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                                    key === 'bp' && g.vitals?.bp && parseBP(g.vitals.bp)?.sys! > 140 ? 'border-amber-400 bg-amber-50' : 'border-slate-200'
                                }`}
                            />
                            {hint && (
                                <p className={`text-[10px] font-bold ${hint.includes('🚨') ? 'text-red-600' : hint.includes('⚠️') ? 'text-amber-600' : 'text-emerald-600'}`}>{hint}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── F. OBSTETRIC EXAMINATION (if pregnant) ──────────────────── */}
            {g.pregnant === 'Yes' && (
                <div className="bg-white rounded-2xl border border-purple-100 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-purple-700">
                        <Thermometer size={17} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Obstetric Examination</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Uterine Size */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Uterine Size (weeks)</label>
                            <input
                                type="number" min={4} max={45}
                                value={g.obstetricExam?.uterineSize || ''}
                                onChange={(e) => updateObstetricExam('uterineSize', e.target.value)}
                                placeholder="e.g. 24"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                            />
                        </div>

                        {/* Fetal Position */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Fetal Position</label>
                            <div className="flex flex-col gap-1.5">
                                {['Cephalic', 'Breech', 'Transverse'].map(pos => (
                                    <button key={pos} type="button"
                                        onClick={() => updateObstetricExam('fetalPosition', pos)}
                                        className={btnBase(g.obstetricExam?.fetalPosition === pos, 'purple')}
                                    >{pos}</button>
                                ))}
                            </div>
                        </div>

                        {/* FHR */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Fetal Heart Rate (bpm)
                            </label>
                            <input
                                type="number" min={60} max={200}
                                value={g.obstetricExam?.fetalHeartRate || ''}
                                onChange={(e) => updateObstetricExam('fetalHeartRate', e.target.value)}
                                placeholder="110–160 BPM"
                                className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-black focus:ring-2 outline-none transition-all ${
                                    g.obstetricExam?.fetalHeartRate &&
                                    (parseInt(g.obstetricExam.fetalHeartRate) < 110 || parseInt(g.obstetricExam.fetalHeartRate) > 160)
                                        ? 'border-red-400 bg-red-50 focus:ring-red-500/20 focus:border-red-500'
                                        : 'border-slate-200 focus:ring-purple-500/20 focus:border-purple-500'
                                }`}
                            />
                            {g.obstetricExam?.fetalHeartRate && (
                                <p className={`text-[10px] font-bold ${
                                    parseInt(g.obstetricExam.fetalHeartRate) < 110 ? 'text-red-600' :
                                    parseInt(g.obstetricExam.fetalHeartRate) > 160 ? 'text-amber-600' :
                                    'text-emerald-600'
                                }`}>
                                    {parseInt(g.obstetricExam.fetalHeartRate) < 110 ? '🚨 Bradycardia — Fetal Distress' :
                                     parseInt(g.obstetricExam.fetalHeartRate) > 160 ? '⚠️ Tachycardia' :
                                     '✓ Normal range'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── G. GYNECOLOGY EXAMINATION ───────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-rose-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-rose-700">
                    <FlaskConical size={17} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Gynecology Examination</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Cervix */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cervix</label>
                        <div className="flex flex-col gap-1.5">
                            {['Normal', 'Inflamed', 'Erosion'].map(c => (
                                <button key={c} type="button"
                                    onClick={() => updateGynExam('cervix', c)}
                                    className={btnBase(g.gynExam?.cervix === c)}
                                >{c}</button>
                            ))}
                        </div>
                    </div>

                    {/* Discharge */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Discharge</label>
                        <div className="flex flex-col gap-1.5">
                            {['None', 'White', 'Foul smelling'].map(d => (
                                <button key={d} type="button"
                                    onClick={() => updateGynExam('discharge', d)}
                                    className={`${btnBase(g.gynExam?.discharge === d, d === 'Foul smelling' && g.gynExam?.discharge === d ? 'red' : 'pink')}`}
                                >{d}</button>
                            ))}
                        </div>
                    </div>

                    {/* Tenderness */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tenderness</label>
                        <div className="flex gap-2">
                            {['Yes', 'No'].map(t => (
                                <button key={t} type="button"
                                    onClick={() => updateGynExam('tenderness', t)}
                                    className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${
                                        g.gynExam?.tenderness === t
                                            ? t === 'Yes' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                    }`}
                                >{t}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── H. INVESTIGATIONS ───────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-indigo-700">
                    <FlaskConical size={17} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Investigations Required</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {['USG', 'Hb%', 'Urine', 'Thyroid', 'OGTT'].map(inv => (
                        <button key={inv} type="button"
                            onClick={() => toggleInvestigation(inv)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                (g.investigations || []).includes(inv)
                                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-600'
                                    : 'bg-indigo-50 text-indigo-400 hover:bg-indigo-100'
                            }`}
                        >{inv}</button>
                    ))}
                </div>
            </div>

            {/* ── Patient-Friendly Summary ─────────────────────────────────── */}
            {(g.pregnant === 'Yes' || (g.symptoms || []).length > 0) && (
                <div className="bg-pink-50 border border-pink-100 rounded-2xl p-5 text-pink-900 mt-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Info size={16} />
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-pink-700">Patient Summary (Plain Language)</h3>
                    </div>
                    <div className="space-y-1.5 text-sm font-medium text-pink-800">
                        {g.pregnant === 'Yes' && g.gestationalAge && (
                            <p>🤰 Pregnancy: <span className="text-pink-900 font-bold">{g.gestationalAge} weeks</span></p>
                        )}
                        {g.obstetricExam?.fetalHeartRate && (
                            <p>💓 Baby heartbeat: <span className={`font-bold ${
                                parseInt(g.obstetricExam.fetalHeartRate) >= 110 && parseInt(g.obstetricExam.fetalHeartRate) <= 160 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                                {parseInt(g.obstetricExam.fetalHeartRate) >= 110 && parseInt(g.obstetricExam.fetalHeartRate) <= 160 ? 'Normal' : 'Requires attention'}
                            </span></p>
                        )}
                        {g.vitals?.bp && parseBP(g.vitals.bp) && (
                            <p>🩺 Blood pressure: <span className={`font-bold ${parseBP(g.vitals.bp)!.sys > 140 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {g.vitals.bp} {parseBP(g.vitals.bp)!.sys > 140 ? '— Slightly elevated' : '— Normal'}
                            </span></p>
                        )}
                        {(g.symptoms || []).length > 0 && (
                            <p>📋 Current complaints: <span className="text-pink-900 font-bold">{(g.symptoms || []).join(', ')}</span></p>
                        )}
                        <p className="text-indigo-300 text-xs font-bold mt-2">📌 Advice: Regular antenatal checkups recommended.</p>
                    </div>
                </div>
            )}
        </div>
    );
};
