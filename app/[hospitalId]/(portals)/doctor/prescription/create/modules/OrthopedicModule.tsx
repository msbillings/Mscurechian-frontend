'use client';

import React, { useEffect, useState } from 'react';
import {
    Activity, AlertTriangle, ShieldAlert, Info, Zap,
    Target, ThumbsUp, ClipboardList, Move, Thermometer,
    FlaskConical
} from 'lucide-react';

interface OrthopedicModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

type AlertEntry = { type: 'emergency' | 'error' | 'warning' | 'info'; message: string };

// ── Constants ──────────────────────────────────────────────────────────────────
const JOINTS = ['Neck', 'Shoulder', 'Elbow', 'Wrist', 'Spine', 'Hip', 'Knee', 'Ankle'] as const;
const SIDES = ['Left', 'Right', 'Bilateral'] as const;
const PAIN_TYPES = ['Sharp', 'Dull', 'Radiating', 'Burning'] as const;
const ROM_OPTIONS = ['Normal', 'Restricted', 'Painful', 'Severely restricted'] as const;

const TENDERNESS_OPTS = ['None', 'Mild', 'Severe'] as const;
const YES_NO = ['Yes', 'No'] as const;
const PRESENT_ABSENT = ['Present', 'Absent'] as const;
const SENSATION_OPTS = ['Normal', 'Reduced', 'Absent'] as const;
const PULSE_OPTS = ['Normal', 'Weak', 'Absent'] as const;

const SPECIAL_TESTS = [
    'Lachman test', 'McMurray test', 'Straight leg raise (SLR)',
    'Drawer test', 'Phalen test', 'Tinel sign', 'Finkelstein test',
    'Thompson test', 'Hawkins test'
] as const;

const XRAY_FINDINGS = ['Normal', 'Fracture', 'Degenerative changes'] as const;
const MRI_FINDINGS = ['Normal', 'Ligament tear', 'Disc prolapse'] as const;
const DIAGNOSES = ['Osteoarthritis', 'Rheumatoid Arthritis', 'Fracture', 'Ligament Injury', 'Spondylosis', 'Disc Prolapse'] as const;
const ORTHO_SYMPTOMS = ['Acute Pain', 'Joint Swelling', 'Stiffness', 'Inability to bear weight', 'Locking', 'Numbness', 'Weakness', 'Instability'] as const;

export const OrthopedicModule: React.FC<OrthopedicModuleProps> = ({ formData, setFormData }) => {
    const [alerts, setAlerts] = useState<AlertEntry[]>([]);

    if (!formData.orthoData) return null;
    const o = formData.orthoData;

    // ── Updater helpers ───────────────────────────────────────────────────────
    const update = (field: string, value: any) =>
        setFormData((prev: any) => ({ ...prev, orthoData: { ...prev.orthoData, [field]: value } }));

    const updateNested = (key: string, sub: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev, orthoData: {
                ...prev.orthoData,
                [key]: { ...prev.orthoData?.[key], [sub]: value },
            },
        }));

    const toggleSpecialTest = (test: string) => {
        const curr: string[] = o.specialTests || [];
        update('specialTests', curr.includes(test) ? curr.filter((t: string) => t !== test) : [...curr, test]);
    };

    const toggleSymptom = (sym: string) => {
        const curr: string[] = o.symptoms || [];
        update('symptoms', curr.includes(sym) ? curr.filter((s: string) => s !== sym) : [...curr, sym]);
    };

    // ── Clinical Validation Engine (Orthopedics) ──────────────────────────────
    useEffect(() => {
        const newAlerts: AlertEntry[] = [];
        const painScore = o.pain?.score || 0;
        const motor = o.motorPower || 5;

        // Basic Requirements


        // 1. Severe Pain
        if (painScore >= 8) {
            newAlerts.push({ type: 'emergency', message: `🚨 SEVERE PAIN — Score ${painScore}/10. Immediate analgesia and urgent evaluation required.` });
        } else if (painScore >= 5) {
            newAlerts.push({ type: 'warning', message: `⚠️ Moderate pain detected. Consider systematic NSAID or physiotherapy evaluation.` });
        }

        // 2. Fracture Detection
        if (o.exam?.deformity === 'Present' && (painScore >= 7 || o.exam?.tenderness === 'Severe')) {
            newAlerts.push({ type: 'emergency', message: '🚨 POSSIBLE FRACTURE — Deformity present with severe clinical signs. Immobilize immediately and order urgent X-rays.' });
        }

        // 3. Neurovascular Compromise — CRITICAL
        if (o.neurovascular?.pulse === 'Absent') {
            newAlerts.push({ type: 'emergency', message: '🚨 ABSENT PULSE — Orthopedic Emergency. Rule out compartment syndrome or arterial injury. Immediate vascular/ortho surgical review.' });
        } else if (o.neurovascular?.pulse === 'Weak' || o.neurovascular?.sensation === 'Absent') {
            newAlerts.push({ type: 'emergency', message: '🚨 NEUROVASCULAR COMPROMISE — Reduced sensation or weak pulse. Close monitoring for compartment syndrome required.' });
        }

        // 4. Motor Power
        if (motor < 3) {
            newAlerts.push({ type: 'emergency', message: `🚨 SIGNIFICANT MOTOR DEFICIT — Power ${motor}/5. Rule out nerve root compression or spinal cord involvement.` });
        } else if (motor < 5) {
            newAlerts.push({ type: 'warning', message: `⚠️ Reduced motor power (${motor}/5). Investigate neurological or structural cause.` });
        }

        // 5. Nerve Involvement
        if (o.neurovascular?.sensation === 'Reduced' && motor < 5) {
            newAlerts.push({ type: 'warning', message: '⚠️ NERVE INVOLVEMENT — Combined sensory reduction and motor weakness detected.' });
        }

        // 6. Spine: Disc Prolapse Pattern
        if (o.joint === 'Spine' && o.pain?.type === 'Radiating' && (o.specialTests || []).includes('Straight leg raise (SLR)')) {
            newAlerts.push({ type: 'info', message: '💡 DISC PROLAPSE PATTERN — Back pain + Radiating pain + Positive SLR. Consider MRI Spine and neural block evaluation.' });
        }

        // 7. Osteoarthritis Pattern
        if (painScore > 0 && o.rom === 'Restricted' && o.imaging?.xray === 'Degenerative changes') {
            newAlerts.push({ type: 'info', message: '💡 OSTEOARTHRITIS PATTERN — Chronic pain, restricted ROM, and degenerative X-ray changes. Advice weight management and low-impact exercise.' });
        }

        // 8. Ligament Injury
        if (o.joint === 'Knee' && o.exam?.swelling === 'Yes' && ((o.specialTests || []).includes('Lachman test') || (o.specialTests || []).includes('Drawer test'))) {
            newAlerts.push({ type: 'warning', message: '⚠️ LIGAMENT INJURY SUSPECTED — Positive stability tests with acute swelling. MRI recommended to rule out ACL/PCL tear.' });
        }

        // 9. Cauda Equina Warning
        if (o.joint === 'Spine' && (o.neurovascular?.sensation === 'Absent' || motor < 3)) {
            newAlerts.push({ type: 'emergency', message: '🚨 RED FLAG — Rule out Cauda Equina Syndrome. Check for saddle anesthesia and bowel/bladder dysfunction immediately.' });
        }

        // Pharma rules
        if (o.diagnosis === 'Fracture' || o.exam?.deformity === 'Present') {
            newAlerts.push({ type: 'info', message: '💊 Immobilization/Splinting required. Avoid weight-bearing until confirmed by radiology.' });
        }
        if (painScore > 0) {
            newAlerts.push({ type: 'info', message: '💊 Pharma Note: Avoid long-term high-dose NSAIDs without renal/gastric monitoring.' });
        }

        setAlerts(newAlerts);
    }, [o.joint, o.side, o.pain?.score, o.pain?.type, o.rom, o.exam, o.motorPower, o.neurovascular, o.specialTests, o.imaging, o.diagnosis]);

    // ── derived ───────────────────────────────────────────────────────────────
    const hasEmergency = alerts.some(a => a.type === 'emergency');
    const tests: string[] = o.specialTests || [];

    // ── Style helpers ─────────────────────────────────────────────────────────
    const alertColors: Record<string, string> = {
        emergency: 'bg-red-50 border-red-600 text-red-900',
        error: 'bg-rose-50 border-rose-500 text-rose-800',
        warning: 'bg-amber-50 border-amber-500 text-amber-800',
        info: 'bg-blue-50 border-blue-400 text-blue-800',
    };

    const sectionCard = (children: React.ReactNode, borderColor = 'border-slate-200') =>
        <div className={`bg-white rounded-2xl border ${borderColor} p-5 shadow-sm`}>{children}</div>;

    const sectionHeader = (icon: React.ReactNode, title: string, required = false, note?: string) => (
        <div className="flex items-center gap-2 mb-4">
            <div className="text-orange-600">{icon}</div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-700">{title}</h3>
            {note && <span className="ml-auto text-[9px] font-bold text-slate-400">{note}</span>}
        </div>
    );

    const btnPill = (active: boolean, color = 'blue') =>
        `px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${active
            ? color === 'red' ? 'bg-red-600 text-white border-red-600 shadow-md'
                : color === 'orange' ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                    : 'bg-blue-600 text-white border-blue-600 shadow-md'
            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
        }`;

    return (
        <div className="space-y-4">

            {/* ── Alerts Panel ────────────────────────────────────────── */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((alert, idx) => (
                        <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border-l-4 ${alertColors[alert.type]}`}>
                            {alert.type === 'emergency' || alert.type === 'error'
                                ? <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                                : <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            }
                            <p className="text-[11px] font-black uppercase tracking-tight leading-snug">{alert.message}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Standardized Light Header */}
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                        <Activity size={20} className="text-orange-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-orange-700">Orthopedic Assessment</h2>
                        <p className="text-[9px] font-bold text-orange-600/60 uppercase tracking-widest">Bone & Joint Clinical Profile</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {hasEmergency && (
                        <div className="bg-orange-100/50 px-3 py-2 rounded-lg flex items-center gap-2 border border-orange-200 hidden md:flex">
                            <AlertTriangle size={14} className="text-orange-600" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-orange-700">Safety Alerts Active</span>
                        </div>
                    )}
                    <div className="bg-white border border-orange-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-orange-600">
                        Ortho - Module
                    </div>
                </div>
            </div>

            {/* SYMPTOMS ────────────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Info size={17} />, 'Complaints / Symptoms', false, 'Select all that apply')}
                    <div className="flex flex-wrap gap-2">
                        {ORTHO_SYMPTOMS.map(s => (
                            <button key={s} type="button"
                                onClick={() => toggleSymptom(s)}
                                className={btnPill(o.symptoms?.includes(s), 'orange')}
                            >{s}</button>
                        ))}
                    </div>
                </>
            )}

            {/* ── A. REGION & SIDE ────────────────────────────────────── */}
            {sectionCard(
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        {sectionHeader(<Target size={17} />, 'A. Affected Region')}
                        <div className="grid grid-cols-4 gap-2">
                            {JOINTS.map(j => (
                                <button key={j} type="button"
                                    onClick={() => update('joint', o.joint === j ? '' : j)}
                                    className={btnPill(o.joint === j, 'orange')}
                                >{j}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        {sectionHeader(<Activity size={17} />, 'B. Side')}
                        <div className="flex gap-2">
                            {SIDES.map(s => (
                                <button key={s} type="button"
                                    onClick={() => update('side', o.side === s ? '' : s)}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${o.side === s ? 'bg-orange-600 text-white border-orange-600' : 'bg-slate-50 text-slate-400 border-slate-200'
                                        }`}
                                >{s}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── C. PAIN & D. ROM ────────────────────────────────────── */}
            {sectionCard(
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        {sectionHeader(<Thermometer size={17} />, 'C. Pain Assessment', false, '0 (No Pain) - 10 (Worst)')}
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <span className={`text-4xl font-black ${o.pain?.score >= 8 ? 'text-red-600' : o.pain?.score >= 5 ? 'text-orange-500' : 'text-slate-800'}`}>
                                    {o.pain?.score || 0}
                                </span>
                                <input type="range" min="0" max="10"
                                    value={o.pain?.score || 0}
                                    onChange={(e) => updateNested('pain', 'score', parseInt(e.target.value))}
                                    className="flex-1 accent-orange-600"
                                />
                            </div>
                            <div className="flex gap-2">
                                {PAIN_TYPES.map(t => (
                                    <button key={t} type="button"
                                        onClick={() => updateNested('pain', 'type', o.pain?.type === t ? '' : t)}
                                        className={btnPill(o.pain?.type === t, 'orange')}
                                    >{t}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div>
                        {sectionHeader(<Move size={17} />, 'D. Range of Motion (ROM)')}
                        <div className="grid grid-cols-2 gap-2">
                            {ROM_OPTIONS.map(opt => (
                                <button key={opt} type="button"
                                    onClick={() => update('rom', o.rom === opt ? '' : opt)}
                                    className={btnPill(o.rom === opt, opt.includes('Restricted') || opt === 'Painful' ? 'orange' : 'blue')}
                                >{opt}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── E. PHYSICAL EXAM ────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<ClipboardList size={17} />, 'E. Physical Examination')}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">Swelling</label>
                            <div className="flex gap-1">
                                {YES_NO.map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => updateNested('exam', 'swelling', opt)}
                                        className={`flex-1 py-2 rounded-lg text-[9px] font-black ${o.exam?.swelling === opt ? 'bg-orange-600 text-white' : 'bg-slate-50 text-slate-400'}`}
                                    >{opt}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">Tenderness</label>
                            <div className="flex gap-1">
                                {TENDERNESS_OPTS.map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => updateNested('exam', 'tenderness', opt)}
                                        className={`flex-1 py-2 rounded-lg text-[9px] font-black ${o.exam?.tenderness === opt ? (opt === 'Severe' ? 'bg-red-600' : 'bg-orange-500') + ' text-white' : 'bg-slate-50 text-slate-400'}`}
                                    >{opt}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">Deformity</label>
                            <div className="flex gap-1">
                                {PRESENT_ABSENT.map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => updateNested('exam', 'deformity', opt)}
                                        className={`flex-1 py-2 rounded-lg text-[9px] font-black ${o.exam?.deformity === opt ? (opt === 'Present' ? 'bg-red-600' : 'bg-emerald-600') + ' text-white' : 'bg-slate-50 text-slate-400'}`}
                                    >{opt}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">Muscle Spasm</label>
                            <div className="flex gap-1">
                                {YES_NO.map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => updateNested('exam', 'spasm', opt)}
                                        className={`flex-1 py-2 rounded-lg text-[9px] font-black ${o.exam?.spasm === opt ? 'bg-orange-500 text-white' : 'bg-slate-50 text-slate-400'}`}
                                    >{opt}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── F. MOTOR & G. NEUROVASCULAR ─────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sectionCard(
                    <>
                        {sectionHeader(<Activity size={17} />, 'F. Motor Power', false, 'Scale 0-5')}
                        <div className="flex items-center gap-4 mb-4">
                            <span className={`text-4xl font-black ${o.motorPower < 3 ? 'text-red-600' : o.motorPower < 5 ? 'text-orange-500' : 'text-emerald-600'}`}>
                                {o.motorPower || 5}/5
                            </span>
                            <input type="range" min="0" max="5"
                                value={o.motorPower || 5}
                                onChange={(e) => update('motorPower', parseInt(e.target.value))}
                                className="flex-1 accent-orange-600"
                            />
                        </div>
                        <div className="text-[9px] font-black uppercase text-slate-400 flex justify-between">
                            <span>0 Paralysis</span>
                            <span>3 Against Gravity</span>
                            <span>5 Normal</span>
                        </div>
                    </>
                )}
                {sectionCard(
                    <>
                        {sectionHeader(<ShieldAlert size={17} />, 'G. Neurovascular Status')}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[8px] font-black uppercase text-slate-400 mb-1.5 text-center">Sensation</label>
                                <div className="flex flex-col gap-1">
                                    {SENSATION_OPTS.map(opt => (
                                        <button key={opt} type="button"
                                            onClick={() => updateNested('neurovascular', 'sensation', opt)}
                                            className={`py-1.5 rounded-lg text-[9px] font-black ${o.neurovascular?.sensation === opt ? (opt === 'Normal' ? 'bg-emerald-600' : 'bg-red-600') + ' text-white' : 'bg-slate-50 text-slate-400'}`}
                                        >{opt}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[8px] font-black uppercase text-slate-400 mb-1.5 text-center">Pulses</label>
                                <div className="flex flex-col gap-1">
                                    {PULSE_OPTS.map(opt => (
                                        <button key={opt} type="button"
                                            onClick={() => updateNested('neurovascular', 'pulse', opt)}
                                            className={`py-1.5 rounded-lg text-[9px] font-black ${o.neurovascular?.pulse === opt ? (opt === 'Normal' ? 'bg-emerald-600' : 'bg-red-600') + ' text-white' : 'bg-slate-50 text-slate-400'}`}
                                        >{opt}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── H. SPECIAL TESTS ────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<FlaskConical size={17} />, 'H. Special Tests', false, 'Select positive findings')}
                    <div className="flex flex-wrap gap-2">
                        {SPECIAL_TESTS.map(test => (
                            <button key={test} type="button"
                                onClick={() => toggleSpecialTest(test)}
                                className={btnPill(tests.includes(test), 'orange')}
                            >{test}</button>
                        ))}
                    </div>
                </>
            )}

            {/* ── I. IMAGING & J. DIAGNOSIS ───────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sectionCard(
                    <>
                        {sectionHeader(<Target size={17} />, 'I. Imaging Findings')}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">X-ray</label>
                                <div className="flex gap-1">
                                    {XRAY_FINDINGS.map(f => (
                                        <button key={f} type="button"
                                            onClick={() => updateNested('imaging', 'xray', o.imaging?.xray === f ? '' : f)}
                                            className={`flex-1 py-2 rounded-lg text-[9px] font-black ${o.imaging?.xray === f ? (f === 'Normal' ? 'bg-emerald-600' : 'bg-orange-600') + ' text-white' : 'bg-slate-50 text-slate-400'}`}
                                        >{f}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">MRI</label>
                                <div className="flex gap-1">
                                    {MRI_FINDINGS.map(f => (
                                        <button key={f} type="button"
                                            onClick={() => updateNested('imaging', 'mri', o.imaging?.mri === f ? '' : f)}
                                            className={`flex-1 py-2 rounded-lg text-[9px] font-black ${o.imaging?.mri === f ? (f === 'Normal' ? 'bg-emerald-600' : 'bg-orange-600') + ' text-white' : 'bg-slate-50 text-slate-400'}`}
                                        >{f}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}
                {sectionCard(
                    <>
                        {sectionHeader(<ClipboardList size={17} />, 'J. Clinical Diagnosis')}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {DIAGNOSES.map(dx => (
                                <button key={dx} type="button"
                                    onClick={() => update('diagnosis', dx)}
                                    className={`py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${o.diagnosis === dx ? 'bg-orange-700 text-white border-orange-700' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                                >{dx}</button>
                            ))}
                        </div>
                        <input type="text" placeholder="Other Diagnosis..."
                            value={!DIAGNOSES.includes(o.diagnosis) ? o.diagnosis : ''}
                            onChange={(e) => update('diagnosis', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-300"
                        />
                    </>
                )}
            </div>

            {/* ── Patient-Friendly Summary ──────────────────────────── */}
            {(o.joint || o.diagnosis) && (
                <div className="bg-orange-50 rounded-3xl p-6 border border-orange-200 border-l-8 border-l-orange-600 shadow-sm">
                    <div className="flex items-center gap-3 mb-4 text-orange-600">
                        <Info size={18} />
                        <h3 className="text-[11px] font-black uppercase tracking-widest">Bone &amp; Joint Health Summary</h3>
                    </div>
                    <div className="space-y-2 text-sm font-medium text-slate-700">
                        {o.joint && (
                            <p>🦴 Evaluation of the <span className="text-orange-600 font-bold">{o.side} {o.joint}</span></p>
                        )}
                        {o.pain?.score > 0 && (
                            <p>⚡ Pain level recorded as <span className="text-orange-600 font-bold">{o.pain.score}/10 ({o.pain.score >= 8 ? 'Severe' : o.pain.score >= 5 ? 'Moderate' : 'Mild'})</span></p>
                        )}
                        {o.rom !== 'Normal' && (
                            <p>🦿 Movement is currently <span className="text-orange-600 font-bold">{o.rom}</span></p>
                        )}
                        {o.diagnosis && (
                            <p>🩺 Professional assessment: <span className="text-slate-800 font-black">{o.diagnosis}</span></p>
                        )}
                        <div className="mt-4 pt-4 border-t border-orange-200 text-xs text-slate-500 italic">
                            📌 Advice: Avoid strenuous activity. Follow physiotherapy instructions exactly as prescribed. Return immediately if you notice coldness in limbs or complete loss of sensation.
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

