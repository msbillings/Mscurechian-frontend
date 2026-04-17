'use client';

import React, { useEffect, useState } from 'react';
import {
    Brain, Activity, AlertTriangle, ShieldAlert, Info,
    Zap, Eye, Mic, Dumbbell, ClipboardList, Radio
} from 'lucide-react';

interface NeurologyModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

type AlertEntry = { type: 'emergency' | 'error' | 'warning' | 'info'; message: string };

export const NeurologyModule: React.FC<NeurologyModuleProps> = ({ formData, setFormData }) => {
    const [alerts, setAlerts] = useState<AlertEntry[]>([]);

    if (!formData.neuroData) return null;
    const n = formData.neuroData;

    // ── GCS derived values ──────────────────────────────────────────────────
    const gcsE = parseInt(n.gcs?.eye) || 0;
    const gcsV = parseInt(n.gcs?.verbal) || 0;
    const gcsM = parseInt(n.gcs?.motor) || 0;
    const gcsTotal = gcsE + gcsV + gcsM;
    const gcsValid = gcsE >= 1 && gcsE <= 4 && gcsV >= 1 && gcsV <= 5 && gcsM >= 1 && gcsM <= 6;

    const gcsLabel = !gcsValid ? ''
        : gcsTotal >= 13 ? 'Mild'
        : gcsTotal >= 9  ? 'Moderate'
        : '⚠️ SEVERE COMA';

    const gcsColor = !gcsValid ? 'text-slate-400'
        : gcsTotal >= 13 ? 'text-emerald-600'
        : gcsTotal >= 9  ? 'text-amber-600'
        : 'text-red-600';

    // ── Real-time Clinical Validation Engine ────────────────────────────────
    useEffect(() => {
        const newAlerts: AlertEntry[] = [];
        const syms: string[] = n.symptoms || [];

        // 1. GCS ≤ 8 → airway critical
        if (gcsValid && gcsTotal <= 8) {
            newAlerts.push({
                type: 'emergency',
                message: `CRITICAL: GCS ${gcsTotal} (≤8) — SEVERE COMA. Airway protection required immediately.`,
            });
        }

        // 2. GCS ≤ 8 + Coma mental status
        if (gcsValid && gcsTotal <= 8 && n.mentalStatus === 'Coma') {
            newAlerts.push({
                type: 'emergency',
                message: 'COMA CONFIRMED: GCS ≤ 8 + Mental Status = Coma. ICU care required.',
            });
        }

        // 3. Motor deficit → stroke suggestion
        const ru = parseInt(n.motorPower?.ru);
        const lu = parseInt(n.motorPower?.lu);
        const rl = parseInt(n.motorPower?.rl);
        const ll = parseInt(n.motorPower?.ll);

        const rightWeak = (!isNaN(ru) && ru < 5) || (!isNaN(rl) && rl < 5);
        const leftWeak  = (!isNaN(lu) && lu < 5) || (!isNaN(ll) && ll < 5);

        if (rightWeak && !leftWeak) {
            newAlerts.push({ type: 'warning', message: 'Right-sided weakness detected — Possible left hemisphere stroke.' });
        } else if (leftWeak && !rightWeak) {
            newAlerts.push({ type: 'warning', message: 'Left-sided weakness detected — Possible right hemisphere stroke.' });
        } else if (rightWeak && leftWeak) {
            newAlerts.push({ type: 'warning', message: 'Bilateral weakness detected — Consider spinal cord pathology or bilateral cortical lesion.' });
        }

        // 4. Reflexes
        if (n.reflexes === 'Hyperreflexia (3+)') {
            newAlerts.push({ type: 'info', message: 'Hyperreflexia — Suggests Upper Motor Neuron (UMN) lesion.' });
        }
        if (n.reflexes === 'Hyporeflexia (1+)' || n.reflexes === 'Absent (0)') {
            newAlerts.push({ type: 'info', message: 'Hyporeflexia / Areflexia — Suggests Lower Motor Neuron (LMN) lesion or peripheral neuropathy.' });
        }

        // 5. Cranial nerve deficit must be specified
        if (n.cranialNerves === 'Abnormal' && (!n.cranialNerveDeficits || n.cranialNerveDeficits.length === 0)) {
            newAlerts.push({ type: 'error', message: 'Cranial nerves marked Abnormal — At least one deficit must be selected.' });
        }

        // Cross-field Rule 1 — STROKE DETECTION
        if (n.onset === 'Sudden' && syms.includes('Weakness') && syms.includes('Speech difficulty')) {
            newAlerts.push({
                type: 'emergency',
                message: '🚨 SUSPECTED STROKE: Sudden onset + Weakness + Speech difficulty — Immediate CT brain required. Activate stroke protocol.',
            });
        }

        // Cross-field Rule 2 — SEIZURE EVENT
        if (syms.includes('Seizures') && syms.includes('Loss of consciousness')) {
            newAlerts.push({ type: 'warning', message: 'Seizures + Loss of Consciousness — Possible epileptic event. Evaluate EEG.' });
        }

        // Cross-field Rule 3 — INCREASED ICP
        if (syms.includes('Headache') && syms.includes('Vomiting') && (n.mentalStatus === 'Drowsy' || n.mentalStatus === 'Stupor' || n.mentalStatus === 'Coma')) {
            newAlerts.push({ type: 'emergency', message: '⚠️ Headache + Vomiting + Altered sensorium — Raised Intracranial Pressure (ICP). Urgent imaging required.' });
        }

        // Pharma reminder
        if (syms.includes('Seizures')) {
            newAlerts.push({ type: 'info', message: 'Seizures documented — Ensure compliance with anti-epileptic drug (AED) regimen.' });
        }

        setAlerts(newAlerts);
    }, [n, gcsTotal, gcsValid]);

    // ── Helper updaters ─────────────────────────────────────────────────────
    const updateNeuro = (field: string, value: any) =>
        setFormData((prev: any) => ({ ...prev, neuroData: { ...prev.neuroData, [field]: value } }));

    const updateGCS = (subField: string, value: string) =>
        setFormData((prev: any) => ({
            ...prev,
            neuroData: { ...prev.neuroData, gcs: { ...prev.neuroData?.gcs, [subField]: value } }
        }));

    const updateMotor = (limb: string, value: string) =>
        setFormData((prev: any) => ({
            ...prev,
            neuroData: { ...prev.neuroData, motorPower: { ...prev.neuroData?.motorPower, [limb]: value } }
        }));

    const toggleSymptom = (sym: string) => {
        const curr = n.symptoms || [];
        updateNeuro('symptoms', curr.includes(sym) ? curr.filter((s: string) => s !== sym) : [...curr, sym]);
    };

    const toggleCNDeficit = (deficit: string) => {
        const curr = n.cranialNerveDeficits || [];
        updateNeuro('cranialNerveDeficits', curr.includes(deficit) ? curr.filter((d: string) => d !== deficit) : [...curr, deficit]);
    };

    // ── Styles ──────────────────────────────────────────────────────────────
    const alertColors: Record<string, string> = {
        emergency: 'bg-red-50 border-red-600 text-red-900',
        error:     'bg-rose-50 border-rose-500 text-rose-800',
        warning:   'bg-amber-50 border-amber-500 text-amber-800',
        info:      'bg-blue-50 border-blue-400 text-blue-800',
    };

    const btnPill = (active: boolean, danger = false) =>
        `px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
            active
                ? danger
                    ? 'bg-red-600 text-white border-red-600 shadow-md'
                    : 'bg-violet-600 text-white border-violet-600 shadow-md'
                : danger
                    ? 'bg-red-50 text-red-400 border-red-200 hover:bg-red-100'
                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
        }`;

    const numInput = (
        label: string, value: string, onChange: (v: string) => void,
        min: number, max: number, highlight?: boolean
    ) => (
        <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">{label}</label>
            <input
                type="number" min={min} max={max}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={`${min}–${max}`}
                className={`w-full rounded-xl px-3 py-3 text-lg font-black text-center outline-none transition-all border focus:ring-2 ${
                    highlight
                        ? 'border-red-400 bg-red-50 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-slate-200 bg-slate-50 focus:ring-violet-500/20 focus:border-violet-500'
                }`}
            />
            <p className="text-[8px] text-slate-400 text-center">{min}–{max}</p>
        </div>
    );

    const redFlagSymptoms = ['Weakness', 'Speech difficulty', 'Seizures', 'Loss of consciousness'];

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
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <Zap size={20} className="text-purple-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-purple-700">Neurology Assessment</h2>
                        <p className="text-[9px] font-bold text-purple-600/60 uppercase tracking-widest">Neurological & GCS Assessment Profile</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {alerts.some(a => a.type === 'emergency') && (
                        <div className="bg-purple-100/50 px-3 py-2 rounded-lg flex items-center gap-2 border border-purple-200 hidden md:flex">
                             <AlertTriangle size={14} className="text-purple-600" />
                             <span className="text-[9px] font-black uppercase tracking-widest text-purple-700">Safety Alerts Active</span>
                        </div>
                    )}
                    <div className="bg-white border border-purple-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-purple-600">
                        Neuro - Module
                    </div>
                </div>
            </div>

            {/* ── A. GCS — STRUCTURED ─────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-violet-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-violet-700">
                    <div className="w-1.5 h-6 bg-violet-600 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Glasgow Coma Scale (GCS)</h3>
                    <span className="ml-auto text-[9px] font-bold text-slate-400">REQUIRED</span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                    {numInput('Eye (E)', n.gcs?.eye || '', v => updateGCS('eye', v), 1, 4, gcsE > 0 && (gcsE < 1 || gcsE > 4))}
                    {numInput('Verbal (V)', n.gcs?.verbal || '', v => updateGCS('verbal', v), 1, 5, gcsV > 0 && (gcsV < 1 || gcsV > 5))}
                    {numInput('Motor (M)', n.gcs?.motor || '', v => updateGCS('motor', v), 1, 6, gcsM > 0 && (gcsM < 1 || gcsM > 6))}
                </div>

                {/* GCS Total Display */}
                {gcsValid && (
                    <div className={`rounded-xl px-5 py-3 flex items-center justify-between transition-all ${
                        gcsTotal <= 8 ? 'bg-red-50 border-2 border-red-300' :
                        gcsTotal <= 12 ? 'bg-amber-50 border-2 border-amber-300' :
                        'bg-emerald-50 border-2 border-emerald-200'
                    }`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            GCS Total = E{gcsE} + V{gcsV} + M{gcsM}
                        </span>
                        <div className="text-right">
                            <span className={`text-3xl font-black ${gcsColor}`}>{gcsTotal}</span>
                            <span className={`block text-[10px] font-black uppercase ${gcsColor}`}>{gcsLabel}</span>
                        </div>
                    </div>
                )}

                {/* GCS Reference */}
                <div className="mt-3 grid grid-cols-3 gap-2 text-[8px] text-slate-400 font-bold">
                    <div className="bg-slate-50 rounded-lg p-2">
                        <div className="font-black text-slate-600 mb-1">👁 EYE</div>
                        <div>1 = None</div><div>2 = To Pain</div><div>3 = To Voice</div><div>4 = Spontaneous</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                        <div className="font-black text-slate-600 mb-1">🗣 VERBAL</div>
                        <div>1 = None</div><div>2 = Sounds</div><div>3 = Words</div><div>4 = Confused</div><div>5 = Oriented</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                        <div className="font-black text-slate-600 mb-1">✋ MOTOR</div>
                        <div>1 = None</div><div>2 = Extension</div><div>3 = Flexion</div><div>4 = Withdrawal</div><div>5 = Localize</div><div>6 = Obeys</div>
                    </div>
                </div>
            </div>

            {/* ── B. MENTAL STATUS ────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-700">
                    <Eye size={17} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Mental Status</h3>
                </div>
                <div className="flex gap-2">
                    {(['Alert', 'Drowsy', 'Stupor', 'Coma'] as const).map(status => (
                        <button
                            key={status} type="button"
                            onClick={() => updateNeuro('mentalStatus', status)}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                                n.mentalStatus === status
                                    ? status === 'Coma' ? 'bg-red-600 text-white shadow-md'
                                    : status === 'Stupor' ? 'bg-orange-500 text-white shadow-md'
                                    : status === 'Drowsy' ? 'bg-amber-500 text-white shadow-md'
                                    : 'bg-emerald-500 text-white shadow-md'
                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }`}
                        >{status}</button>
                    ))}
                </div>
            </div>

            {/* ── C. MOTOR POWER — PER LIMB ───────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-blue-700">
                    <Dumbbell size={17} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Motor Power (0–5 per limb)</h3>
                    <span className="ml-auto text-[9px] font-bold text-slate-400">REQUIRED</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Right side */}
                    <div className="space-y-3">
                        <div className="text-[9px] font-black uppercase text-blue-600 tracking-widest text-center bg-blue-50 py-1 rounded-lg">Right Side</div>
                        {numInput(
                            'Right Upper Limb (RUL)',
                            n.motorPower?.ru ?? '',
                            v => updateMotor('ru', v), 0, 5,
                            n.motorPower?.ru !== undefined && n.motorPower?.ru !== '' && parseInt(n.motorPower.ru) < 5
                        )}
                        {numInput(
                            'Right Lower Limb (RLL)',
                            n.motorPower?.rl ?? '',
                            v => updateMotor('rl', v), 0, 5,
                            n.motorPower?.rl !== undefined && n.motorPower?.rl !== '' && parseInt(n.motorPower.rl) < 5
                        )}
                    </div>
                    {/* Left side */}
                    <div className="space-y-3">
                        <div className="text-[9px] font-black uppercase text-indigo-600 tracking-widest text-center bg-indigo-50 py-1 rounded-lg">Left Side</div>
                        {numInput(
                            'Left Upper Limb (LUL)',
                            n.motorPower?.lu ?? '',
                            v => updateMotor('lu', v), 0, 5,
                            n.motorPower?.lu !== undefined && n.motorPower?.lu !== '' && parseInt(n.motorPower.lu) < 5
                        )}
                        {numInput(
                            'Left Lower Limb (LLL)',
                            n.motorPower?.ll ?? '',
                            v => updateMotor('ll', v), 0, 5,
                            n.motorPower?.ll !== undefined && n.motorPower?.ll !== '' && parseInt(n.motorPower.ll) < 5
                        )}
                    </div>
                </div>

                {/* Motor Power Grade Reference */}
                <div className="mt-3 bg-slate-50 rounded-xl p-3 text-[8px] text-slate-500 font-bold grid grid-cols-3 gap-x-4 gap-y-1">
                    <span>0 = No contraction</span>
                    <span>1 = Flicker only</span>
                    <span>2 = Active (gravity-free)</span>
                    <span>3 = Gravity only</span>
                    <span>4 = Against resistance</span>
                    <span className="text-emerald-600">5 = Full strength ✓</span>
                </div>
            </div>

            {/* ── D. REFLEXES ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-700">
                    <Activity size={17} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Deep Tendon Reflexes</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['Normal (2+)', 'Hyperreflexia (3+)', 'Hyporeflexia (1+)', 'Absent (0)'].map(reflex => (
                        <button key={reflex} type="button"
                            onClick={() => updateNeuro('reflexes', reflex)}
                            className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${
                                n.reflexes === reflex
                                    ? reflex.includes('Hyper') ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                                    : reflex.includes('Absent') ? 'bg-red-600 text-white border-red-600 shadow-md'
                                    : reflex.includes('Hypo') ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                                    : 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                            }`}
                        >{reflex}</button>
                    ))}
                </div>
                {n.reflexes && (
                    <p className={`mt-2 text-[10px] font-black ${
                        n.reflexes.includes('Hyper') ? 'text-orange-600' :
                        n.reflexes.includes('Absent') || n.reflexes.includes('Hypo') ? 'text-amber-600' :
                        'text-emerald-600'
                    }`}>
                        {n.reflexes.includes('Hyper') ? '→ Upper Motor Neuron (UMN) lesion suggested'
                        : n.reflexes.includes('Absent') ? '→ Lower Motor Neuron (LMN) lesion / peripheral neuropathy suggested'
                        : n.reflexes.includes('Hypo') ? '→ Lower Motor Neuron (LMN) lesion suggested'
                        : '✓ Reflexes within normal limits'}
                    </p>
                )}
            </div>

            {/* ── E. CRANIAL NERVES ───────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-700">
                    <Radio size={17} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Cranial Nerves (I–XII)</h3>
                </div>
                <div className="flex gap-3 mb-3">
                    {(['Normal', 'Abnormal'] as const).map(cn => (
                        <button key={cn} type="button"
                            onClick={() => updateNeuro('cranialNerves', cn)}
                            className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${
                                n.cranialNerves === cn
                                    ? cn === 'Abnormal' ? 'bg-red-600 text-white shadow-md'
                                    : 'bg-emerald-500 text-white shadow-md'
                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }`}
                        >{cn}</button>
                    ))}
                </div>
                {n.cranialNerves === 'Abnormal' && (
                    <div className="mt-3 space-y-2">
                        <label className="text-[9px] font-bold text-red-500 uppercase tracking-widest">
                            Select deficit(s) — REQUIRED when Abnormal
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {['Facial weakness', 'Diplopia', 'Vision loss', 'Hearing loss'].map(deficit => {
                                const active = (n.cranialNerveDeficits || []).includes(deficit);
                                return (
                                    <button key={deficit} type="button"
                                        onClick={() => toggleCNDeficit(deficit)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                            active
                                                ? 'bg-red-600 text-white border-red-600 shadow-md'
                                                : 'bg-red-50 text-red-400 border-red-200 hover:bg-red-100'
                                        }`}
                                    >{deficit}</button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ── F. SENSORY SYSTEM ───────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-700">
                    <Mic size={17} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Sensory System</h3>
                </div>
                <div className="flex gap-3">
                    {(['Normal', 'Reduced', 'Absent'] as const).map(s => (
                        <button key={s} type="button"
                            onClick={() => updateNeuro('sensory', s)}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                                n.sensory === s
                                    ? s === 'Absent' ? 'bg-red-600 text-white shadow-md'
                                    : s === 'Reduced' ? 'bg-amber-500 text-white shadow-md'
                                    : 'bg-emerald-500 text-white shadow-md'
                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }`}
                        >{s}</button>
                    ))}
                </div>
            </div>

            {/* ── G. COORDINATION ─────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-700">
                    <Activity size={17} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Coordination</h3>
                </div>
                <div className="flex gap-3">
                    {(['Normal', 'Ataxia', 'Positive Romberg'] as const).map(c => (
                        <button key={c} type="button"
                            onClick={() => updateNeuro('coordination', c)}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                                n.coordination === c
                                    ? c !== 'Normal' ? 'bg-orange-500 text-white shadow-md'
                                    : 'bg-emerald-500 text-white shadow-md'
                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }`}
                        >{c}</button>
                    ))}
                </div>
            </div>

            {/* ── I. ONSET ────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-700">
                    <Zap size={17} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Symptom Onset</h3>
                </div>
                <div className="flex gap-3">
                    {(['Sudden', 'Gradual', 'Chronic'] as const).map(o => (
                        <button key={o} type="button"
                            onClick={() => updateNeuro('onset', o)}
                            className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${
                                n.onset === o
                                    ? o === 'Sudden' ? 'bg-red-600 text-white shadow-md'
                                    : o === 'Gradual' ? 'bg-amber-500 text-white shadow-md'
                                    : 'bg-violet-600 text-white shadow-md'
                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }`}
                        >
                            {o === 'Sudden' ? '⚡ ' : o === 'Gradual' ? '📈 ' : '🔄 '}{o}
                        </button>
                    ))}
                </div>
                {n.onset === 'Sudden' && (
                    <p className="mt-2 text-[10px] font-black text-red-600">
                        ⚠️ Sudden onset — Always consider vascular emergency (stroke, haemorrhage).
                    </p>
                )}
            </div>

            {/* ── J. RED FLAG SUMMARY (auto) ──────────────────────────────── */}
            {(() => {
                const redFlags: string[] = [];
                if (n.onset === 'Sudden' && (n.symptoms || []).includes('Weakness')) redFlags.push('Sudden weakness');
                if ((n.symptoms || []).includes('Speech difficulty')) redFlags.push('Slurred / absent speech');
                if ((n.symptoms || []).includes('Seizures')) redFlags.push('Active seizures');
                if ((n.symptoms || []).includes('Loss of consciousness')) redFlags.push('Unconsciousness');
                if (gcsValid && gcsTotal <= 8) redFlags.push(`GCS ${gcsTotal} — Severe coma`);
                if (n.mentalStatus === 'Coma') redFlags.push('Coma mental status');

                return redFlags.length > 0 ? (
                    <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <ShieldAlert size={18} className="text-red-600" />
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-red-700">🔴 Active Red Flags</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {redFlags.map(f => (
                                <span key={f} className="px-3 py-1 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase">
                                    {f}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : null;
            })()}

            {/* ── Notes ───────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">
                    Additional Notes
                </label>
                <textarea
                    value={n.notes || ''}
                    onChange={e => updateNeuro('notes', e.target.value)}
                    rows={3}
                    placeholder="Additional clinical observations, special tests, clinical impression..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none outline-none"
                />
            </div>

            {/* ── Patient Summary (Plain Language) ────────────────────────── */}
            {((n.symptoms || []).length > 0 || gcsValid) && (
                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 text-violet-900 mt-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Info size={16} />
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-violet-700">Brain Condition Summary (Patient-Friendly)</h3>
                    </div>
                    <div className="space-y-1.5 text-sm font-medium text-violet-800">
                        {gcsValid && (
                            <p>🧠 Consciousness level: <span className={`font-black ${gcsColor}`}>
                                {gcsTotal >= 13 ? 'Good (Mild / Normal)' : gcsTotal >= 9 ? 'Moderate impairment' : 'Severely impaired — needs urgent care'}
                            </span></p>
                        )}
                        {(n.symptoms || []).length > 0 && (
                            <p>📋 Current complaints: <span className="text-violet-900 font-bold">{(n.symptoms || []).join(', ')}</span></p>
                        )}
                        {n.onset && (
                            <p>⏱ Onset: <span className={`font-bold ${n.onset === 'Sudden' ? 'text-red-600' : 'text-violet-900'}`}>{n.onset}</span></p>
                        )}
                        {n.motorPower && (parseInt(n.motorPower.ru) < 5 || parseInt(n.motorPower.lu) < 5 || parseInt(n.motorPower.rl) < 5 || parseInt(n.motorPower.ll) < 5) && (
                            <p>💪 Muscle weakness detected: <span className="text-amber-400 font-bold">One or more limbs affected</span></p>
                        )}
                        {alerts.some(a => a.type === 'emergency') && (
                            <p className="text-red-400 font-black mt-2">⚠️ Doctor suspects: possible stroke / emergency — urgent evaluation required.</p>
                        )}
                        {(n.symptoms || []).includes('Seizures') && (
                            <p className="text-amber-300 font-bold">📌 Ensure anti-epileptic medication compliance at all times.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
