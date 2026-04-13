'use client';

import React, { useEffect, useState } from 'react';
import {
    Eye, AlertTriangle, ShieldAlert, Info, Zap,
    Activity, FlaskConical, Target, ThumbsUp, ClipboardList
} from 'lucide-react';

interface OphthalmologyModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

type AlertEntry = { type: 'emergency' | 'error' | 'warning' | 'info'; message: string };

// ── Constants ──────────────────────────────────────────────────────────────────
const SYMPTOMS = [
    'Redness', 'Pain', 'Watering', 'Itching', 'Blurred Vision',
    'Photophobia', 'Discharge', 'Foreign Body Sensation', 'Sudden Vision Loss',
] as const;

const VISION_OPTIONS = ['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', 'HM', 'PL+', 'NPL'] as const;
const PUPIL_OPTIONS  = ['PERRLA', 'Sluggish', 'Fixed'] as const;

const CONJUNCTIVA_OPTS    = ['Normal', 'Congested', 'Pale'] as const;
const CORNEA_OPTS         = ['Clear', 'Ulcer', 'Opacity'] as const;
const ANTE_CHAMBER_OPTS   = ['Normal', 'Shallow', 'Deep'] as const;
const LENS_OPTS           = ['Clear', 'Cataract', 'Mature cataract'] as const;
const RETINA_OPTS         = ['Normal', 'Detachment', 'Degeneration'] as const;
const OPTIC_DISC_OPTS     = ['Normal', 'Cupping increased'] as const;
const MACULA_OPTS         = ['Normal', 'Edema'] as const;
const DIAGNOSES           = ['Conjunctivitis', 'Dry Eye', 'Cataract', 'Glaucoma', 'Refractive Error', 'Corneal Ulcer'] as const;

const EMERGENCY_SYMS = ['Sudden Vision Loss'];
const DANGER_SYMS    = ['Pain', 'Foreign Body Sensation'];

// ── Vision severity helper ────────────────────────────────────────────────────
const visionSeverity = (v: string): 'severe' | 'moderate' | 'normal' | 'unknown' => {
    if (!v) return 'unknown';
    const severe = ['HM', 'PL+', 'NPL', 'CF', 'PL', '6/60'];
    const moderate = ['6/36', '6/24'];
    if (severe.some(s => v.toUpperCase().startsWith(s))) return 'severe';
    if (moderate.some(s => v === s)) return 'moderate';
    if (v.match(/^6\/\d+$/)) {
        const d = parseInt(v.split('/')[1]);
        if (d >= 60) return 'severe';
        if (d >= 24) return 'moderate';
        return 'normal';
    }
    return 'unknown';
};

export const OphthalmologyModule: React.FC<OphthalmologyModuleProps> = ({ formData, setFormData }) => {
    const [alerts, setAlerts] = useState<AlertEntry[]>([]);

    if (!formData.ophthaData) return null;
    const o = formData.ophthaData;

    // ── Updater helpers ───────────────────────────────────────────────────────
    const update = (field: string, value: any) =>
        setFormData((prev: any) => ({ ...prev, ophthaData: { ...prev.ophthaData, [field]: value } }));

    const updateNested = (key: string, sub: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev, ophthaData: {
                ...prev.ophthaData,
                [key]: { ...prev.ophthaData?.[key], [sub]: value },
            },
        }));

    const updateDeep = (key: string, eye: string, sub: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev, ophthaData: {
                ...prev.ophthaData,
                [key]: {
                    ...prev.ophthaData?.[key],
                    [eye]: { ...prev.ophthaData?.[key]?.[eye], [sub]: value },
                },
            },
        }));

    const toggleSymptom = (sym: string) => {
        const curr: string[] = o.symptoms || [];
        update('symptoms', curr.includes(sym) ? curr.filter((s: string) => s !== sym) : [...curr, sym]);
    };

    // ── Clinical Validation Engine ────────────────────────────────────────────
    useEffect(() => {
        const newAlerts: AlertEntry[] = [];
        const syms: string[] = o.symptoms || [];
        const iopOD = parseFloat(o.iop?.od) || 0;
        const iopOS = parseFloat(o.iop?.os) || 0;
        const maxIOP = Math.max(iopOD, iopOS);

        // Required fields
        if (!o.vision?.od?.unaided) newAlerts.push({ type: 'error', message: '❗ OD (Right Eye) unaided vision is required.' });
        if (!o.vision?.os?.unaided) newAlerts.push({ type: 'error', message: '❗ OS (Left Eye) unaided vision is required.' });
        if (!syms.length)           newAlerts.push({ type: 'error', message: '❗ At least one symptom must be documented.' });

        // 1. Sudden Vision Loss — EMERGENCY
        if (syms.includes('Sudden Vision Loss')) {
            newAlerts.push({ type: 'emergency', message: '🚨 OPHTHALMIC EMERGENCY — Sudden Vision Loss. Immediate assessment required. Rule out CRAO, retinal detachment, vitreous haemorrhage.' });
        }

        // 2. Visual Acuity
        const odSev = visionSeverity(o.vision?.od?.unaided || '');
        const osSev = visionSeverity(o.vision?.os?.unaided || '');
        if (odSev === 'severe' || osSev === 'severe') {
            newAlerts.push({ type: 'emergency', message: `🚨 SEVERE VISION IMPAIRMENT — ${odSev === 'severe' ? `OD: ${o.vision.od.unaided}` : ''}${osSev === 'severe' ? ` OS: ${o.vision.os.unaided}` : ''}. Urgent evaluation required.` });
        } else if (odSev === 'moderate' || osSev === 'moderate') {
            newAlerts.push({ type: 'warning', message: `⚠️ Reduced visual acuity detected. Check for refractive error, cataract, or retinal pathology.` });
        }

        // 3. IOP — Glaucoma risk
        if (maxIOP > 30) {
            newAlerts.push({ type: 'emergency', message: `🚨 HIGH INTRAOCULAR PRESSURE — IOP ${maxIOP} mmHg. Risk of optic nerve damage. Urgent anti-glaucoma therapy required.` });
        } else if (maxIOP > 21) {
            newAlerts.push({ type: 'warning', message: `⚠️ Elevated IOP (${maxIOP} mmHg) — Ocular hypertension. Possible glaucoma. Optic nerve assessment required.` });
        }

        // 4. Axis validation
        const odAxis = parseFloat(o.refraction?.od?.axis) || -1;
        const osAxis = parseFloat(o.refraction?.os?.axis) || -1;
        if ((odAxis > 0 && (odAxis < 0 || odAxis > 180)) || (osAxis > 0 && (osAxis < 0 || osAxis > 180))) {
            newAlerts.push({ type: 'error', message: '❗ Axis value must be between 0° and 180°.' });
        }

        // 5. Glaucoma: IOP > 21 + Cupping
        if (maxIOP > 21 && o.fundus?.opticDisc === 'Cupping increased') {
            newAlerts.push({ type: 'emergency', message: '🚨 GLAUCOMA SUSPECTED — Elevated IOP + Increased optic disc cupping. Urgent glaucoma workup (perimetry, OCT, gonioscopy).' });
        }

        // 6. Corneal Ulcer + Pain
        if (o.slitLamp?.cornea === 'Ulcer' && syms.includes('Pain')) {
            newAlerts.push({ type: 'emergency', message: '🚨 CORNEAL ULCER + PAIN — Urgent treatment required. Start intensive topical antibiotics. Ophthalmology referral immediately.' });
        } else if (o.slitLamp?.cornea === 'Ulcer') {
            newAlerts.push({ type: 'warning', message: '⚠️ Corneal ulcer detected. Intensive antibiotic eye drops required. Avoid steroids until infection excluded.' });
        }

        // 7. Cataract detection
        if (o.slitLamp?.lens === 'Cataract' || o.slitLamp?.lens === 'Mature cataract') {
            newAlerts.push({
                type: o.slitLamp.lens === 'Mature cataract' ? 'warning' : 'info',
                message: `${o.slitLamp.lens === 'Mature cataract' ? '⚠️ Mature cataract — Surgical evaluation (phacoemulsification) recommended.' : '💡 Cataract detected — Monitor progression. Consider surgical referral when vision significantly impaired.'}`,
            });
        }

        // 8. Retinal Detachment
        if (o.fundus?.retina === 'Detachment') {
            newAlerts.push({ type: 'emergency', message: '🚨 RETINAL DETACHMENT — Ophthalmic surgical emergency. Immediate vitreoretinal surgery consultation required.' });
        }

        // 9. Macula edema
        if (o.fundus?.macula === 'Edema') {
            newAlerts.push({ type: 'warning', message: '⚠️ Macular edema detected — Evaluate for diabetic maculopathy or AMD. OCT macula recommended.' });
        }

        // 10. Infection pattern: Redness + Discharge
        if (syms.includes('Redness') && syms.includes('Discharge')) {
            newAlerts.push({ type: 'info', message: '💡 Redness + Discharge pattern — Likely Infective Conjunctivitis. Start topical antibiotics. Isolate patient.' });
        }

        // 11. Refractive error: vision improves with glasses
        const odImproves = o.vision?.od?.corrected && o.vision?.od?.unaided &&
            o.vision.od.corrected !== o.vision.od.unaided &&
            VISION_OPTIONS.indexOf(o.vision.od.corrected as any) < VISION_OPTIONS.indexOf(o.vision.od.unaided as any);
        const osImproves = o.vision?.os?.corrected && o.vision?.os?.unaided &&
            o.vision.os.corrected !== o.vision.os.unaided;
        if (odImproves || osImproves) {
            newAlerts.push({ type: 'info', message: '💡 Vision improves with correction — Refractive error (myopia / hyperopia / astigmatism). Advise spectacle/contact lens correction.' });
        }

        // 12. Fixed pupil — emergency
        if (o.pupils === 'Fixed') {
            newAlerts.push({ type: 'emergency', message: '🚨 FIXED PUPILS — Rule out third nerve palsy, Adie pupil, pharmacological mydriasis. Urgent neurological assessment.' });
        }

        // Pharma reminders
        if (o.diagnosis === 'Glaucoma' || maxIOP > 21) {
            newAlerts.push({ type: 'info', message: '💊 Ensure compliance with anti-glaucoma drops (Timolol, Latanoprost). Follow-up IOP check in 4 weeks.' });
        }
        if (syms.includes('Redness') && syms.includes('Discharge')) {
            newAlerts.push({ type: 'info', message: '💊 Complete full antibiotic course. Avoid touching eyes. Hand hygiene essential to prevent spread.' });
        }

        setAlerts(newAlerts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        o.vision?.od?.unaided, o.vision?.od?.corrected, o.vision?.os?.unaided, o.vision?.os?.corrected,
        o.iop?.od, o.iop?.os, o.refraction?.od?.axis, o.refraction?.os?.axis,
        o.slitLamp?.cornea, o.slitLamp?.lens, o.fundus?.opticDisc, o.fundus?.retina, o.fundus?.macula,
        o.pupils, o.symptoms, o.diagnosis,
    ]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const hasEmergency = alerts.some(a => a.type === 'emergency');
    const syms: string[]  = o.symptoms || [];
    const iopOD = parseFloat(o.iop?.od) || 0;
    const iopOS = parseFloat(o.iop?.os) || 0;

    // ── Style helpers ─────────────────────────────────────────────────────────
    const alertColors: Record<string, string> = {
        emergency: 'bg-red-50 border-red-600 text-red-900',
        error:     'bg-rose-50 border-rose-500 text-rosese-800',
        warning:   'bg-amber-50 border-amber-500 text-amber-800',
        info:      'bg-blue-50 border-blue-400 text-blue-800',
    };

    const btnPill = (active: boolean, danger = false, warn = false) =>
        `px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
            active
                ? danger ? 'bg-red-600 text-white border-red-600 shadow-md'
                  : warn  ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                  : 'bg-blue-600 text-white border-blue-600 shadow-md'
                : danger ? 'bg-red-50 text-red-400 border-red-200 hover:bg-red-100'
                  : warn  ? 'bg-amber-50 text-amber-500 border-amber-200 hover:bg-amber-100'
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
        }`;

    const sectionCard = (children: React.ReactNode, borderColor = 'border-slate-200') =>
        <div className={`bg-white rounded-2xl border ${borderColor} p-5 shadow-sm`}>{children}</div>;

    const sectionHeader = (icon: React.ReactNode, title: string, required = false, note?: string) => (
        <div className="flex items-center gap-2 mb-4">
            <div className="text-blue-700">{icon}</div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-700">{title}</h3>
            {required && <span className="ml-auto text-[9px] font-bold text-red-400 uppercase tracking-wider">Required</span>}
            {note && !required && <span className="ml-auto text-[9px] font-bold text-slate-400">{note}</span>}
        </div>
    );

    // Vision selection row (pills + free text)
    const VisionRow = ({ eye, label }: { eye: 'od' | 'os'; label: string }) => {
        const sev = visionSeverity(o.vision?.[eye]?.unaided || '');
        return (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
                    {sev === 'severe' && <span className="text-[9px] font-black text-red-600">🚨 Severe</span>}
                    {sev === 'moderate' && <span className="text-[9px] font-black text-amber-600">⚠️ Reduced</span>}
                    {sev === 'normal' && <span className="text-[9px] font-black text-emerald-600">✓ Normal</span>}
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="block text-[8px] font-black uppercase text-slate-400 mb-1.5">Unaided (Without Glasses)</label>
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                            {['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60'].map(v => (
                                <button key={v} type="button"
                                    onClick={() => updateDeep('vision', eye, 'unaided', v)}
                                    className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${
                                        o.vision?.[eye]?.unaided === v
                                            ? (visionSeverity(v) === 'severe' ? 'bg-red-600 text-white border-red-600' : visionSeverity(v) === 'moderate' ? 'bg-amber-500 text-white border-amber-500' : 'bg-emerald-600 text-white border-emerald-600')
                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >{v}</button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            {['HM', 'PL+', 'NPL', 'CF'].map(v => (
                                <button key={v} type="button"
                                    onClick={() => updateDeep('vision', eye, 'unaided', v)}
                                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${o.vision?.[eye]?.unaided === v ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-400 border-slate-200 hover:bg-red-50 hover:text-red-400'}`}
                                >{v}</button>
                            ))}
                            <input type="text" placeholder="Custom"
                                value={!['6/6','6/9','6/12','6/18','6/24','6/36','6/60','HM','PL+','NPL','CF'].includes(o.vision?.[eye]?.unaided || '') ? (o.vision?.[eye]?.unaided || '') : ''}
                                onChange={e => updateDeep('vision', eye, 'unaided', e.target.value)}
                                className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-black text-center focus:ring-2 focus:ring-blue-300 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[8px] font-black uppercase text-slate-400 mb-1.5">With Glasses / Corrected</label>
                        <div className="flex flex-wrap gap-1.5">
                            {['6/6', '6/9', '6/12', '6/18', '6/24', '6/36'].map(v => (
                                <button key={v} type="button"
                                    onClick={() => updateDeep('vision', eye, 'corrected', o.vision?.[eye]?.corrected === v ? '' : v)}
                                    className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${o.vision?.[eye]?.corrected === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                                >{v}</button>
                            ))}
                            <input type="text" placeholder="Custom"
                                value={!['6/6','6/9','6/12','6/18','6/24','6/36'].includes(o.vision?.[eye]?.corrected || '') ? (o.vision?.[eye]?.corrected || '') : ''}
                                onChange={e => updateDeep('vision', eye, 'corrected', e.target.value)}
                                className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-black text-center focus:ring-2 focus:ring-blue-300 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ── Auto-suggested diagnosis ───────────────────────────────────────────────
    const autoSuggest = (() => {
        if (syms.includes('Sudden Vision Loss') || o.fundus?.retina === 'Detachment') return '🚨 Ophthalmic Emergency';
        if (iopOD > 21 || iopOS > 21) return o.fundus?.opticDisc === 'Cupping increased' ? '🟠 Glaucoma' : '🟡 Ocular Hypertension';
        if (o.slitLamp?.lens === 'Mature cataract') return '🟠 Mature Cataract — Surgery';
        if (o.slitLamp?.lens === 'Cataract') return '🟡 Cataract';
        if (o.slitLamp?.cornea === 'Ulcer') return '🔴 Corneal Ulcer';
        if (syms.includes('Redness') && syms.includes('Discharge')) return '🟡 Infective Conjunctivitis';
        if (o.vision?.od?.corrected || o.vision?.os?.corrected) return '🟢 Refractive Error';
        return null;
    })();

    return (
        <div className="space-y-4">

            {/* ── Clinical Alerts Panel ──────────────────────────────────── */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((alert, idx) => (
                        <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border-l-4 ${alertColors[alert.type]}`}>
                            {alert.type === 'emergency' || alert.type === 'error'
                                ? <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                                : alert.type === 'warning'
                                ? <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                : <Info size={16} className="shrink-0 mt-0.5" />
                            }
                            <p className="text-[11px] font-black uppercase tracking-tight leading-snug">{alert.message}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Standardized Light Header */}
            <div className="bg-lime-50 border border-lime-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-lime-500/10 rounded-xl flex items-center justify-center">
                        <Eye size={20} className="text-lime-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-lime-700">Ophthalmology Assessment</h2>
                        <p className="text-[9px] font-bold text-lime-600/60 uppercase tracking-widest">Vision & Ocular Health Profile</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {hasEmergency && (
                        <div className="bg-lime-100/50 px-3 py-2 rounded-lg flex items-center gap-2 border border-lime-200 hidden md:flex">
                             <AlertTriangle size={14} className="text-lime-600" />
                             <span className="text-[9px] font-black uppercase tracking-widest text-lime-700">Safety Alerts Active</span>
                        </div>
                    )}
                    {autoSuggest && (
                        <div className="bg-white border border-lime-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-lime-600">
                             {autoSuggest}
                        </div>
                    )}
                </div>
            </div>

            {/* ── A. VISUAL ACUITY ──────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Eye size={17} />, 'A. Visual Acuity', true, 'OD = Right Eye | OS = Left Eye')}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <VisionRow eye="od" label="🔵 OD — Right Eye (Oculus Dexter)" />
                        <VisionRow eye="os" label="🟢 OS — Left Eye (Oculus Sinister)" />
                    </div>
                    {/* Summary row */}
                    {(o.vision?.od?.unaided || o.vision?.os?.unaided) && (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 text-center">
                                <span className="text-[8px] font-black uppercase text-blue-400 block">OD Unaided → Corrected</span>
                                <span className="text-sm font-black text-blue-800">
                                    {o.vision?.od?.unaided || '--'}{o.vision?.od?.corrected ? ` → ${o.vision.od.corrected}` : ''}
                                </span>
                            </div>
                            <div className="bg-cyan-50 border border-cyan-100 rounded-xl px-4 py-2 text-center">
                                <span className="text-[8px] font-black uppercase text-cyan-400 block">OS Unaided → Corrected</span>
                                <span className="text-sm font-black text-cyan-800">
                                    {o.vision?.os?.unaided || '--'}{o.vision?.os?.corrected ? ` → ${o.vision.os.corrected}` : ''}
                                </span>
                            </div>
                        </div>
                    )}
                </>,
                'border-blue-100',
            )}

            {/* ── B. REFRACTION ─────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Target size={17} />, 'B. Refraction', false, 'SPH / CYL / Axis')}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(['od', 'os'] as const).map(eye => (
                            <div key={eye} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <span className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                    {eye === 'od' ? '🔵 OD (Right)' : '🟢 OS (Left)'}
                                </span>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['sph', 'cyl', 'axis'] as const).map(field => (
                                        <div key={field}>
                                            <label className="block text-[8px] font-black uppercase text-slate-400 mb-1 text-center">
                                                {field === 'sph' ? 'SPH' : field === 'cyl' ? 'CYL' : 'Axis (°)'}
                                            </label>
                                            <input
                                                type="text"
                                                placeholder={field === 'axis' ? '0–180' : field === 'sph' ? '+/-' : 'CYL'}
                                                value={o.refraction?.[eye]?.[field] || ''}
                                                onChange={e => updateDeep('refraction', eye, field, e.target.value)}
                                                className={`w-full rounded-lg px-2 py-2 text-sm font-black text-center border outline-none focus:ring-2 focus:ring-blue-300 ${
                                                    field === 'axis' && parseFloat(o.refraction?.[eye]?.axis) > 180
                                                        ? 'border-red-400 bg-red-50 text-red-700'
                                                        : 'bg-white border-slate-200 text-slate-800'
                                                }`}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {parseFloat(o.refraction?.[eye]?.axis) > 180 && (
                                    <p className="mt-1 text-[9px] font-black text-red-600">Axis must be 0°–180°</p>
                                )}
                            </div>
                        ))}
                    </div>
                </>,
                'border-slate-200',
            )}

            {/* ── C. IOP ────────────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Activity size={17} />, 'C. Intraocular Pressure (IOP)', false, 'Normal: 10–21 mmHg')}
                    <div className="grid grid-cols-2 gap-4">
                        {(['od', 'os'] as const).map(eye => {
                            const val = parseFloat(o.iop?.[eye]) || 0;
                            const isHigh  = val > 21;
                            const isVHigh = val > 30;
                            return (
                                <div key={eye} className={`rounded-xl p-4 border text-center ${isVHigh ? 'bg-red-50 border-red-300' : isHigh ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                                    <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-slate-500">
                                        {eye === 'od' ? '🔵 OD Right' : '🟢 OS Left'}
                                    </label>
                                    <input
                                        type="text" placeholder="16"
                                        value={o.iop?.[eye] || ''}
                                        onChange={e => updateNested('iop', eye, e.target.value)}
                                        className={`w-full border rounded-lg p-2.5 text-xl font-black text-center outline-none focus:ring-2 ${
                                            isVHigh ? 'bg-red-100 border-red-400 text-red-700 focus:ring-red-300' :
                                            isHigh  ? 'bg-amber-100 border-amber-400 text-amber-700 focus:ring-amber-300' :
                                            'bg-white border-slate-200 text-slate-800 focus:ring-blue-300'
                                        }`}
                                    />
                                    <span className="text-[8px] text-slate-400 mt-1 block">mmHg</span>
                                    {isVHigh  && <p className="mt-1 text-[9px] font-black text-red-700">🚨 Very High — Emergency</p>}
                                    {isHigh && !isVHigh && <p className="mt-1 text-[9px] font-black text-amber-700">⚠️ Elevated — Glaucoma risk</p>}
                                    {val > 0 && val <= 21 && <p className="mt-1 text-[9px] font-black text-emerald-600">✓ Normal</p>}
                                </div>
                            );
                        })}
                    </div>
                </>,
                'border-sky-100',
            )}

            {/* ── D. PUPILS ─────────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Eye size={17} />, 'D. Pupil Response')}
                    <div className="flex gap-3">
                        {PUPIL_OPTIONS.map(opt => (
                            <button key={opt} type="button"
                                onClick={() => update('pupils', o.pupils === opt ? '' : opt)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${
                                    o.pupils === opt
                                        ? opt === 'Fixed' ? 'bg-red-600 text-white border-red-600 shadow-md'
                                          : opt === 'Sluggish' ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                                          : 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                {opt === 'PERRLA' ? '✓ PERRLA' : opt === 'Fixed' ? '🔴 Fixed' : '⚠️ Sluggish'}
                            </button>
                        ))}
                    </div>
                    {o.pupils === 'Fixed' && (
                        <p className="mt-2 text-[10px] font-black text-red-600">🚨 Fixed pupils — Rule out 3rd nerve palsy, Horner syndrome, pharmacological. Urgent neurological assessment.</p>
                    )}
                </>,
                'border-slate-200',
            )}

            {/* ── E. SYMPTOMS ───────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<ClipboardList size={17} />, 'E. Symptoms', true, 'select all that apply')}
                    <div className="flex flex-wrap gap-2">
                        {SYMPTOMS.map(sym => {
                            const isEmergency = EMERGENCY_SYMS.includes(sym);
                            const isDanger    = DANGER_SYMS.includes(sym);
                            return (
                                <button key={sym} type="button"
                                    onClick={() => toggleSymptom(sym)}
                                    className={btnPill(syms.includes(sym), isEmergency, isDanger)}
                                >
                                    {isEmergency ? '🚨 ' : isDanger ? '⚠️ ' : ''}{sym}
                                </button>
                            );
                        })}
                    </div>
                    {syms.includes('Sudden Vision Loss') && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-400 rounded-xl">
                            <p className="text-[10px] font-black text-red-700 uppercase">🚨 Sudden Vision Loss = Ophthalmic Emergency — Rule out CRAO, retinal detachment, vitreous haemorrhage</p>
                        </div>
                    )}
                </>,
                'border-red-50',
            )}

            {/* ── F. SLIT LAMP ──────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<FlaskConical size={17} />, 'F. Slit Lamp Examination')}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Conjunctiva */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Conjunctiva</label>
                            <div className="flex gap-2">
                                {CONJUNCTIVA_OPTS.map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => updateNested('slitLamp', 'conjunctiva', o.slitLamp?.conjunctiva === opt ? '' : opt)}
                                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                            o.slitLamp?.conjunctiva === opt
                                                ? opt === 'Normal' ? 'bg-emerald-500 text-white shadow-md' : 'bg-amber-500 text-white shadow-md'
                                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                        }`}
                                    >{opt}</button>
                                ))}
                            </div>
                        </div>

                        {/* Cornea */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Cornea</label>
                            <div className="flex gap-2">
                                {CORNEA_OPTS.map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => updateNested('slitLamp', 'cornea', o.slitLamp?.cornea === opt ? '' : opt)}
                                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                            o.slitLamp?.cornea === opt
                                                ? opt === 'Clear' ? 'bg-emerald-500 text-white shadow-md' : 'bg-red-600 text-white shadow-md'
                                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                        }`}
                                    >
                                        {opt !== 'Clear' ? '🔴 ' : ''}{opt}
                                    </button>
                                ))}
                            </div>
                            {o.slitLamp?.cornea === 'Ulcer' && (
                                <p className="mt-2 text-[10px] font-black text-red-600">🚨 Corneal ulcer — Intensive topical antibiotics. AVOID steroids until culture result.</p>
                            )}
                        </div>

                        {/* Anterior Chamber */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Anterior Chamber</label>
                            <div className="flex gap-2">
                                {ANTE_CHAMBER_OPTS.map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => updateNested('slitLamp', 'anteriorChamber', o.slitLamp?.anteriorChamber === opt ? '' : opt)}
                                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                            o.slitLamp?.anteriorChamber === opt
                                                ? opt === 'Normal' ? 'bg-emerald-500 text-white shadow-md' : 'bg-amber-500 text-white shadow-md'
                                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                        }`}
                                    >{opt}</button>
                                ))}
                            </div>
                            {o.slitLamp?.anteriorChamber === 'Shallow' && (
                                <p className="mt-2 text-[10px] font-black text-amber-600">⚠️ Shallow AC — Risk of angle closure glaucoma. Check gonioscopy.</p>
                            )}
                        </div>

                        {/* Lens */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Lens</label>
                            <div className="flex gap-2">
                                {LENS_OPTS.map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => updateNested('slitLamp', 'lens', o.slitLamp?.lens === opt ? '' : opt)}
                                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border ${
                                            o.slitLamp?.lens === opt
                                                ? opt === 'Clear' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                                                  : opt === 'Mature cataract' ? 'bg-red-600 text-white border-red-600 shadow-md'
                                                  : 'bg-amber-500 text-white border-amber-500 shadow-md'
                                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >{opt}</button>
                                ))}
                            </div>
                            {o.slitLamp?.lens === 'Mature cataract' && (
                                <p className="mt-2 text-[10px] font-black text-red-600">🔴 Mature cataract — Surgical referral for phacoemulsification required.</p>
                            )}
                        </div>
                    </div>
                </>,
                'border-blue-100',
            )}

            {/* ── G. FUNDUS EXAM ────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Target size={17} />, 'G. Fundus Examination')}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Retina */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Retina</label>
                            <div className="flex flex-col gap-2">
                                {RETINA_OPTS.map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => updateNested('fundus', 'retina', o.fundus?.retina === opt ? '' : opt)}
                                        className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                                            o.fundus?.retina === opt
                                                ? opt === 'Normal' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-red-600 text-white border-red-600 shadow-md'
                                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        {opt !== 'Normal' ? '🔴 ' : ''}{opt}
                                    </button>
                                ))}
                            </div>
                            {o.fundus?.retina === 'Detachment' && (
                                <p className="mt-2 text-[9px] font-black text-red-600">🚨 Surgical emergency — Immediate vitreoretinal referral</p>
                            )}
                        </div>

                        {/* Optic Disc */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Optic Disc</label>
                            <div className="flex flex-col gap-2">
                                {OPTIC_DISC_OPTS.map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => updateNested('fundus', 'opticDisc', o.fundus?.opticDisc === opt ? '' : opt)}
                                        className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                                            o.fundus?.opticDisc === opt
                                                ? opt === 'Normal' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-amber-500 text-white border-amber-500 shadow-md'
                                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >{opt}</button>
                                ))}
                            </div>
                            {o.fundus?.opticDisc === 'Cupping increased' && (
                                <p className="mt-2 text-[9px] font-black text-amber-600">⚠️ Increased C/D ratio — Glaucoma evaluation (OCT, perimetry)</p>
                            )}
                        </div>

                        {/* Macula */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Macula</label>
                            <div className="flex flex-col gap-2">
                                {MACULA_OPTS.map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => updateNested('fundus', 'macula', o.fundus?.macula === opt ? '' : opt)}
                                        className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                                            o.fundus?.macula === opt
                                                ? opt === 'Normal' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-amber-500 text-white border-amber-500 shadow-md'
                                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >{opt}</button>
                                ))}
                            </div>
                            {o.fundus?.macula === 'Edema' && (
                                <p className="mt-2 text-[9px] font-black text-amber-600">⚠️ Macular edema — OCT macula. Check for diabetic maculopathy or AMD.</p>
                            )}
                        </div>
                    </div>
                </>,
                'border-indigo-100',
            )}

            {/* ── H. DIAGNOSIS ──────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<FlaskConical size={17} />, 'H. Ophthalmic Diagnosis', false, 'select one')}
                    {autoSuggest && (
                        <div className="mb-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                            <Info size={14} className="text-blue-500 shrink-0" />
                            <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Auto-suggested: {autoSuggest}</p>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {DIAGNOSES.map(dx => (
                            <button key={dx} type="button"
                                onClick={() => update('diagnosis', o.diagnosis === dx ? '' : dx)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                    o.diagnosis === dx
                                        ? 'bg-blue-700 text-white border-blue-700 shadow-md'
                                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
                                }`}
                            >{dx}</button>
                        ))}
                    </div>
                </>,
                'border-blue-100',
            )}

            {/* ── Notes ─────────────────────────────────────────────────── */}
            {sectionCard(
                <>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">
                        Clinical Notes / Additional Observations
                    </label>
                    <textarea
                        value={o.notes || ''}
                        onChange={e => update('notes', e.target.value)}
                        rows={3}
                        placeholder="Colour vision, contrast sensitivity, additional investigations requested, specialist referral notes..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none outline-none"
                    />
                </>,
                'border-slate-200',
            )}

            {/* ── Pharma Warning Banner ─────────────────────────────────── */}
            {(o.diagnosis === 'Glaucoma' || iopOD > 21 || iopOS > 21 || o.slitLamp?.cornea === 'Ulcer') ? (
                <div className="bg-blue-700 rounded-2xl p-4 text-white flex items-start gap-3">
                    <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-widest mb-1">💊 Pharma Warning</p>
                        <p className="text-[10px] font-bold text-blue-200">
                            {(o.diagnosis === 'Glaucoma' || (iopOD > 21 || iopOS > 21)) && 'Ensure compliance with anti-glaucoma drops (Timolol/Latanoprost). Follow-up IOP in 4 weeks. '}
                            {o.slitLamp?.cornea === 'Ulcer' && 'Complete full antibiotic course. Do NOT use steroids until infection is excluded by culture.'}
                            {syms.includes('Redness') && syms.includes('Discharge') && 'Complete antibiotic course. Avoid touching eyes. Hand hygiene essential.'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-blue-700/10 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                    <ThumbsUp size={18} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-blue-700 mb-1">💊 Eye Care Reminder</p>
                        <p className="text-[10px] font-bold text-blue-700">Use eye drops as prescribed. Avoid rubbing eyes. Wear protective eyewear. Follow-up as scheduled.</p>
                    </div>
                </div>
            )}

            {/* ── Patient-Friendly Summary ──────────────────────────────── */}
            {(o.vision?.od?.unaided || o.vision?.os?.unaided || o.diagnosis) && (
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-2 mb-3">
                        <Info size={16} />
                        <h3 className="text-[11px] font-black uppercase tracking-widest">Eye Summary (Patient-Friendly)</h3>
                    </div>
                    <div className="space-y-1.5 text-sm font-medium text-slate-300">
                        {o.vision?.od?.unaided && (
                            <p>👁️ Right eye vision: <span className={`font-bold ${visionSeverity(o.vision.od.unaided) === 'severe' ? 'text-red-400' : visionSeverity(o.vision.od.unaided) === 'moderate' ? 'text-amber-400' : 'text-emerald-400'}`}>{o.vision.od.unaided}{o.vision?.od?.corrected ? ` (improves to ${o.vision.od.corrected} with glasses)` : ''}</span></p>
                        )}
                        {o.vision?.os?.unaided && (
                            <p>👁️ Left eye vision: <span className={`font-bold ${visionSeverity(o.vision.os.unaided) === 'severe' ? 'text-red-400' : visionSeverity(o.vision.os.unaided) === 'moderate' ? 'text-amber-400' : 'text-emerald-400'}`}>{o.vision.os.unaided}{o.vision?.os?.corrected ? ` (improves to ${o.vision.os.corrected} with glasses)` : ''}</span></p>
                        )}
                        {(iopOD > 21 || iopOS > 21) && (
                            <p>📈 Eye pressure: <span className="font-bold text-amber-400">Elevated — follow-up required</span></p>
                        )}
                        {o.slitLamp?.lens && o.slitLamp.lens !== 'Clear' && (
                            <p>🔬 Lens: <span className="font-bold text-amber-400">{o.slitLamp.lens} detected</span></p>
                        )}
                        {o.diagnosis && (
                            <p>🩺 Doctor&apos;s assessment: <span className="text-white font-bold">{o.diagnosis}</span></p>
                        )}
                        <p className="mt-2 text-blue-300 font-bold text-xs">
                            📌 Advice: Use all eye drops as prescribed. Do not rub your eyes. Wear sunglasses outdoors. Return immediately if vision suddenly worsens.
                        </p>
                    </div>
                </div>
            )}

        </div>
    );
};
