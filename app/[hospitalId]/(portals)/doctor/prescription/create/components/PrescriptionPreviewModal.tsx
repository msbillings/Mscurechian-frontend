import React from 'react';
import { 
    X, 
    Printer, 
    FileText, 
    CheckCircle2 
} from 'lucide-react';
import MainHeader from '@/components/printers/MainHeader';
import MainFooter from '@/components/printers/MainFooter';
import { Frequency, formatFrequency } from '@/lib/frequencyUtils';

interface Medicine {
    productId?: string;
    name: string;
    form: string;
    dosage: string;
    freq: Frequency;
    duration: string;
    quantity: string;
    price: number;
    unitsPerPack?: number;
    availableUnits?: number;
    pricePerUnit?: number;
    error?: string;
    mgPerKg?: string;
    calculatedDose?: string;
}

interface PrescriptionPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    formData: any;
    activeSpecialty: string;
    hospitalBranding: any;
    handlePrintDocument: (type: 'prescription' | 'billing') => void;
    handleFinalizeFromPreview: () => void;
    handleSendToPharma: () => void;
    sentToPharma: boolean;
}

const PrescriptionPreviewModal: React.FC<PrescriptionPreviewModalProps> = ({
    isOpen,
    onClose,
    formData,
    activeSpecialty,
    hospitalBranding,
    handlePrintDocument,
    handleFinalizeFromPreview,
    handleSendToPharma,
    sentToPharma
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-white/10 backdrop-blur-3xl overflow-y-auto scroll-smooth">
            <style jsx>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                .preview-paper {
                    font-family: 'Inter', Arial, sans-serif;
                    width: 210mm;
                    min-height: 297mm;
                    background: white;
                    padding: 15mm 15mm 15mm 20mm;
                    box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.05);
                    position: relative;
                    margin: 0 auto;
                    color: #1e293b;
                    border-radius: 8px;
                }
                @media (max-width: 210mm) {
                    .preview-paper {
                        width: 100%;
                        min-height: auto;
                        padding: 8mm;
                        margin: 0 auto;
                    }
                }
                @media (max-width: 640px) {
                    .preview-paper {
                        padding: 5mm;
                    }
                }
            `}</style>

            <div className="min-h-full w-full flex items-center justify-center p-4 sm:p-8 lg:p-12">
                <div className="w-full max-w-5xl flex flex-col items-center gap-8 relative animate-in fade-in zoom-in-95 duration-500">
                    
                    {/* Modal Toolbar */}
                    <div className="sticky top-0 z-[75] w-full max-w-4xl bg-white/70 backdrop-blur-3xl p-4 sm:p-6 rounded-[32px] shadow-2xl border border-white/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-linear-to-br from-indigo-600 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 ring-4 ring-white/50">
                                <FileText size={24} className="text-white" />
                            </div>
                            <div className="text-center sm:text-left">
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Prescription Preview</h2>
                                <div className="flex items-center gap-2 justify-center sm:justify-start">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visual Parity with Printout</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handlePrintDocument('prescription')}
                                className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-100 transition-all active:scale-95 flex items-center gap-2 border border-indigo-100"
                            >
                                <Printer size={16} />
                                <span>Test Print</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="p-3 bg-white/80 hover:bg-rose-50 rounded-2xl text-slate-400 hover:text-rose-500 transition-all active:scale-95 border border-slate-100"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* The Actual "Paper" Preview */}
                    <div className="preview-paper animate-in fade-in zoom-in-95 duration-300">
                        <MainHeader initialDetails={hospitalBranding} />

                        <div className="mt-6 flex justify-between items-center border-b-[3px] border-indigo-600/10 pb-4">
                            <div className="flex items-center gap-4">
                                <div className="text-[32px] font-[900] text-indigo-700 leading-none">Rx</div>
                                <div className="h-8 w-[1px] bg-slate-200"></div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">Prescription</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[13px] font-black text-slate-900 uppercase tracking-tight">{formData.doctorName}</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase">{formData.doctorSpecialization}</div>
                                <div className="text-[9px] font-black text-indigo-500 mt-1 uppercase tracking-[2px] bg-indigo-50 px-2 py-0.5 rounded-sm">{activeSpecialty} Portal</div>
                            </div>
                        </div>

                        <div className="my-6 grid grid-cols-4 gap-0 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            {[
                                ['Patient Name', formData.patientName, 'bg-white'],
                                ['Age / Gender', `${formData.age || '--'} / ${formData.gender}`, 'bg-slate-50/50'],
                                ['MRN / UHID', formData.mrn || 'N/A', 'bg-white'],
                                ['Clinical Date', formData.date, 'bg-slate-50/50']
                            ].map(([label, val, bg], idx) => (
                                <div key={label} className={`p-4 ${bg} ${idx < 3 ? 'border-r border-slate-100' : ''}`}>
                                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</div>
                                    <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">{val}</div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-6 flex-1 min-h-[150mm]">
                            {/* chief complaints & diagnosis */}
                            <div className="grid grid-cols-1 gap-4">
                                {(formData.symptoms || formData.diagnosis) && (
                                    <div className="border-l-4 border-indigo-500 pl-4 py-1">
                                        {formData.symptoms && (
                                            <div className="mb-3">
                                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-0.5">Chief Complaints</span>
                                                <div className="text-sm font-bold text-slate-700">{formData.symptoms}</div>
                                            </div>
                                        )}
                                        {formData.diagnosis && (
                                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100/50">
                                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block mb-0.5">Clinical Diagnosis</span>
                                                <div className="text-sm font-black text-indigo-900">{formData.diagnosis}</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Specialty Clinical Sections */}
                            {activeSpecialty.toUpperCase().includes('CARDIO') && formData.cardiologyData && (() => {
                                const c = formData.cardiologyData;
                                return (
                                    <div className="mb-[25px] p-[18px] border-2 border-red-100 rounded-[16px] bg-red-50/20">
                                        <div className="flex justify-between items-center border-b-[1.5px] border-red-200 mb-[15px] pb-[8px]">
                                            <span className="text-[10px] font-[900] uppercase text-red-600 tracking-[1px]">Cardiac Evaluation Report</span>
                                            <span className="text-[11px] font-[900] text-red-600 bg-red-100 px-[12px] py-[4px] rounded-[6px]">Risk: {c.riskLevel?.toUpperCase()}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-[15px] mb-[15px]">
                                            <div>
                                                <span className="text-[8px] text-red-800 font-[800] uppercase block">Blood Pressure</span>
                                                <span className="text-[16px] font-[900] text-slate-800">{c.bpSystolic}/{c.bpDiastolic} <small className="text-[9px] font-[600] text-slate-500">mmHg</small></span>
                                            </div>
                                            <div>
                                                <span className="text-[8px] text-red-800 font-[800] uppercase block">Heart Rate</span>
                                                <span className="text-[16px] font-[900] text-slate-800">{c.heartRate} <small className="text-[9px] font-[600] text-slate-500">BPM</small></span>
                                            </div>
                                            <div>
                                                <span className="text-[8px] text-red-800 font-[800] uppercase block">Rhythm</span>
                                                <span className="text-[13px] font-[800] text-slate-800">{c.rhythm || 'Normal'}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-[20px] border-t border-dashed border-red-200 pt-[12px] mb-[12px]">
                                            <div>
                                                <span className="text-[8px] font-[800] text-red-600 uppercase block mb-[4px]">Clinical Profile</span>
                                                <div className="text-[10px] font-[700] text-slate-700">NYHA Class: <span className="font-[900] text-red-600">{c.nyhaClass || 'N/A'}</span></div>
                                                <div className="text-[9px] font-[700] text-slate-700 mt-[2px]">Risk Factors: {c.riskFactors?.join(', ') || 'None reported'}</div>
                                            </div>
                                            <div>
                                                <span className="text-[8px] font-[800] text-red-600 uppercase block mb-[4px]">ECG Findings</span>
                                                <div className="text-[11px] font-[900] text-indigo-900">{c.ecgType || 'Normal Sinus'}</div>
                                                <div className="text-[9px] font-[700] text-slate-600">Leads: {c.ecgLeads?.join(', ') || 'N/A'}</div>
                                            </div>
                                        </div>
                                        <div className="border-t border-dashed border-red-200 pt-[10px]">
                                            <span className="text-[8px] text-red-800 font-[800] uppercase block mb-[4px]">Auscultation & Physical Exam</span>
                                            <div className="text-[10px] font-[700] text-slate-800">
                                                S1: {c.s1} | S2: {c.s2} | Murmur: {c.murmur === 'Present' ? (c.murmurType || 'Yes') : 'None'}
                                            </div>
                                            {c.notes && <div className="mt-[6px] text-[9px] text-slate-500 italic">Notes: {c.notes}</div>}
                                        </div>
                                    </div>
                                );
                            })()}

                            {activeSpecialty.toUpperCase().includes('GASTRO') && formData.gastroData && (() => {
                                const g = formData.gastroData;
                                return (
                                    <div className="mb-[25px] p-[18px] border-2 border-amber-100 rounded-[16px] bg-amber-50/20">
                                        <div className="flex justify-between items-center border-b-[1.5px] border-amber-200 mb-[14px] pb-[8px]">
                                            <span className="text-[11px] font-[900] uppercase text-amber-800 tracking-[1px]">Gastroenterology Assessment</span>
                                            <span className="text-[10px] font-[900] text-white bg-amber-600 px-[10px] py-[4px] rounded-[6px]">{g.painLocation || 'No Pain'}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6 mt-2">
                                            <div>
                                                <span className="text-[8px] font-bold text-amber-600 uppercase block">Bowel & Digestion</span>
                                                <div className="text-[10px] font-bold text-slate-700">Habits: {g.bowelHabits} | Stool: {g.stoolType}</div>
                                                <div className="text-[10px] font-bold text-slate-700">Sounds: {g.bowelSounds} | Distention: {g.distention}</div>
                                            </div>
                                            <div>
                                                <span className="text-[8px] font-bold text-amber-600 uppercase block">Palpation Findings</span>
                                                <div className="text-[10px] font-bold text-slate-700">Liver: {g.liver?.status} | Spleen: {g.spleen?.status}</div>
                                                <div className="text-[10px] font-bold text-slate-700">Tenderness: {g.tenderness} | Guarding: {g.guarding}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {activeSpecialty.toUpperCase().includes('PSYCH') && formData.psychiatryData && (() => {
                                const p = formData.psychiatryData;
                                return (
                                    <div className="mb-[25px] p-[18px] border-2 border-purple-100 rounded-[16px] bg-purple-50/20">
                                        <div className="flex justify-between items-center border-b-[1.5px] border-purple-200 mb-[14px] pb-[8px]">
                                            <span className="text-[11px] font-[900] uppercase text-purple-800 tracking-[1px]">Psychiatric Progress Note</span>
                                            <span className={`text-[10px] font-[900] px-[10px] py-[4px] rounded-[6px] ${p.suicideRisk === 'High' ? 'bg-red-600 text-white' : 'bg-purple-600 text-white'}`}>Risk: {p.suicideRisk?.toUpperCase()}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6 mt-2">
                                            <div>
                                                <span className="text-[8px] font-bold text-purple-600 uppercase block">MSE Summary</span>
                                                <div className="text-[10px] font-bold text-slate-700">Mood: {p.mse?.mood} | Thought: {p.mse?.thought?.join(', ')}</div>
                                                <div className="text-[10px] font-bold text-slate-700">Insight: Grade {p.mse?.insight} | Judgment: {p.mse?.judgment}</div>
                                            </div>
                                            <div>
                                                <span className="text-[8px] font-bold text-purple-600 uppercase block">Clinical Scores</span>
                                                <div className="text-[10px] font-bold text-slate-700">PHQ-9: {p.scores?.phq9} | GAD-7: {p.scores?.gad7}</div>
                                                <div className="text-[10px] font-bold text-slate-700">Severity: {p.severity} | Duration: {p.duration}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {activeSpecialty.toUpperCase().includes('DERMA') && formData.dermatologyData && (() => {
                                const d = formData.dermatologyData;
                                return (
                                    <div className="mb-[25px] p-[18px] border-2 border-orange-100 rounded-[16px] bg-orange-50/10">
                                        <div className="flex justify-between items-center border-b-[1.5px] border-orange-200 mb-[14px] pb-[8px]">
                                            <span className="text-[11px] font-[900] uppercase text-orange-800 tracking-[1px]">Dermatological Assessment</span>
                                            <span className="text-[10px] font-[900] text-white bg-orange-600 px-[10px] py-[4px] rounded-[6px]">{d.location}</span>
                                        </div>
                                        <div className="mt-2">
                                            <span className="text-[8px] font-bold text-orange-600 uppercase block">Lesion Characteristics</span>
                                            <div className="text-[13px] font-black text-slate-900">{d.lesionType || 'N/A'}</div>
                                            <div className="text-[10px] font-bold text-slate-700">Pattern: {d.pattern} | Appearance: {d.appearance}</div>
                                            <div className="text-[10px] font-bold text-slate-700">Symptoms: {d.associatedSymptoms}</div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {activeSpecialty.toUpperCase().includes('SURGERY') && formData.generalSurgeryData && (() => {
                                const s = formData.generalSurgeryData;
                                return (
                                    <div className="mb-[25px] p-[18px] border-2 border-slate-100 rounded-[16px] bg-slate-50/50">
                                        <div className="flex justify-between items-center border-b-[1.5px] border-slate-200 mb-[14px] pb-[8px]">
                                            <span className="text-[11px] font-[900] uppercase text-slate-800 tracking-[1px]">Surgical Pre/Post-Op Assessment</span>
                                            <span className="text-[10px] font-[900] text-white bg-slate-800 px-[10px] py-[4px] rounded-[6px]">Plan: {s.plan}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6 mt-2">
                                            <div>
                                                <span className="text-[8px] font-bold text-slate-600 uppercase block">Abdominal Exam</span>
                                                <div className="text-[10px] font-bold text-slate-700">Tenderness: {s.abdomen?.tenderness} | Guarding: {s.abdomen?.guarding}</div>
                                                <div className="text-[10px] font-bold text-slate-700">Distention: {s.abdomen?.distention} | Bowel Sounds: {s.abdomen?.bowelSounds}</div>
                                            </div>
                                            <div>
                                                <span className="text-[8px] font-bold text-slate-600 uppercase block">Specific Site</span>
                                                <div className="text-[10px] font-bold text-slate-700">Hernia: {s.hernia?.present ? `${s.hernia.site} (${s.hernia.type})` : 'None'}</div>
                                                <div className="text-[10px] font-bold text-slate-700">Surgical Site: {s.surgicalSite?.dressing} | Infection: {s.surgicalSite?.infection ? 'Yes' : 'No'}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                            
                            {activeSpecialty.toUpperCase().includes('PEDIATRI') && formData.pediatricData && (() => {
                                const peds = formData.pediatricData;
                                return (
                                    <div className="mb-[25px] p-[18px] border-2 border-pink-100 rounded-[16px] bg-pink-50/20">
                                        <div className="flex justify-between items-center border-b-[1.5px] border-pink-200 mb-[15px] pb-[8px]">
                                            <span className="text-[10px] font-[900] uppercase text-pink-700 tracking-[1px]">Pediatric Growth & Assessment</span>
                                            <span className="text-[12px] font-[900] text-pink-600 bg-pink-100 px-[10px] py-[4px] rounded-[6px]">Weight: {peds.weight} kg</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-[15px] mb-[15px]">
                                            <div><span className="text-[8px] text-pink-800 font-[800] uppercase block">Temperature</span><span className="text-[13px] font-[800] text-slate-800">{peds.temperature}°F</span></div>
                                            <div><span className="text-[8px] text-pink-800 font-[800] uppercase block">Heart Rate</span><span className="text-[13px] font-[800] text-slate-800">{peds.heartRate || '--'} BPM</span></div>
                                            <div><span className="text-[8px] text-pink-800 font-[800] uppercase block">Resp Rate</span><span className="text-[13px] font-[800] text-slate-800">{peds.respRate || '--'} min</span></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-[20px] border-t border-dashed border-pink-200 pt-[12px]">
                                            <div>
                                                <div className="text-[8px] font-[800] text-pink-700 uppercase mb-[5px]">Development</div>
                                                <div className="text-[11px] font-[700] text-slate-700 whitespace-pre-wrap">Milestones: <span className="text-pink-600">{peds.milestones || 'Appropriate'}</span></div>
                                            </div>
                                            <div>
                                                <div className="text-[8px] font-[800] text-pink-700 uppercase mb-[5px]">Immunization</div>
                                                <div className="text-[11px] font-[800] text-slate-900">{peds.immunizationStatus || 'Up-to-Date'}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {activeSpecialty.toUpperCase().includes('RADIO') && formData.radiologyOrder && (() => {
                                const r = formData.radiologyOrder;
                                return (
                                    <div className="mb-[25px] p-[18px] border-2 border-slate-200 rounded-[20px] bg-slate-50/30">
                                        <div className="flex justify-between items-center border-b-[2px] border-slate-300 mb-[15px] pb-[10px]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-[10px] h-[10px] bg-indigo-600 rounded-full animate-pulse"></div>
                                                <span className="text-[12px] font-[900] uppercase text-slate-800 tracking-[1.5px]">Radiology Imaging Order</span>
                                            </div>
                                            <span className={`text-[10px] font-[900] px-[12px] py-[4px] rounded-[6px] ${r.priority === 'Emergency' ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'}`}>{r.priority?.toUpperCase()} PRIORITY</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                    <span className="text-[8px] font-[800] text-indigo-600 uppercase block mb-1">Target Modality</span>
                                                    <div className="text-[18px] font-[900] text-slate-900">{r.modality}</div>
                                                    <div className="text-[11px] font-[700] text-indigo-600 mt-1">{r.bodyPart}</div>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                    <span className="text-[8px] font-[800] text-emerald-600 uppercase block mb-1">Safety Clearance</span>
                                                    <div className="flex gap-4 mt-1">
                                                        <div className={`text-[9px] font-[900] px-2 py-1 rounded-md ${r.contrast?.requested ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>CONTRAST: {r.contrast?.requested ? 'YES' : 'NO'}</div>
                                                        <div className={`text-[9px] font-[900] px-2 py-1 rounded-md ${r.safety?.pregnancy ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>PREGNANCY: {r.safety?.pregnancy ? 'YES' : 'NO'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {activeSpecialty.toUpperCase().includes('NEPHRO') && formData.nephroData && (() => {
                                const n = formData.nephroData;
                                const creat = parseFloat(n.creatinine) || 0;
                                const egfr = parseFloat(n.egfr) || 0;
                                const k = parseFloat(n.electrolytes?.potassium) || 0;
                                const assessments: string[] = [];
                                if (creat > 5) assessments.push('Severe Renal Failure');
                                else if (creat > 1.5) assessments.push('Renal Impairment');
                                if (egfr > 0 && egfr < 15) assessments.push('ESRD — Dialysis evaluation required');
                                if (k > 5.5) assessments.push('Hyperkalemia — Avoid K+ sparing drugs');
                                return (
                                    <div className="mb-[25px] p-[18px] border-2 border-indigo-100 rounded-[16px] bg-indigo-50/20">
                                        <div className="flex justify-between items-center border-b-[1.5px] border-indigo-200 mb-[14px] pb-[8px]">
                                            <span className="text-[10px] font-[900] uppercase text-indigo-800 tracking-[1px]">Renal Evaluation Summary</span>
                                            <span className="text-[11px] font-[900] text-indigo-700 bg-indigo-100 px-[12px] py-[4px] rounded-[6px]">CKD: {n.ckdStage || 'Stage N/A'}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-[15px] mb-[12px]">
                                            <div>
                                                <span className="text-[8px] text-indigo-800 font-[800] uppercase block">Creatinine</span>
                                                <span className={`text-[14px] font-[800] ${creat > 1.5 ? 'text-red-600' : 'text-slate-800'}`}>{n.creatinine || '--'} <small className="text-[9px] font-[600] text-slate-500">mg/dL</small></span>
                                            </div>
                                            <div>
                                                <span className="text-[8px] text-indigo-800 font-[800] uppercase block">Blood Urea</span>
                                                <span className="text-[14px] font-[800] text-slate-800">{n.urea || '--'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[8px] text-indigo-800 font-[800] uppercase block">eGFR</span>
                                                <span className={`text-[14px] font-[800] ${egfr < 60 && egfr > 0 ? 'text-red-600' : 'text-slate-800'}`}>{n.egfr || '--'}</span>
                                            </div>
                                        </div>
                                        {assessments.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {assessments.map(a => <div key={a} className="text-[10px] font-[800] text-red-600">&rarr; {a}</div>)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {(activeSpecialty.toUpperCase().includes('NEURO')) && formData.neuroData && (() => {
                                const mp = formData.neuroData.motorPower || { ru: '', lu: '', rl: '', ll: '' };
                                return (
                                    <div className="mb-[25px] p-[18px] border-2 border-violet-100 rounded-[16px] bg-violet-50/20">
                                        <div className="flex justify-between items-center border-b-[1.5px] border-violet-200 mb-[14px] pb-[8px]">
                                            <span className="text-[10px] font-[900] uppercase text-violet-800 tracking-[1px]">Neurological Examination</span>
                                            <span className="text-[11px] font-[900] text-violet-700 bg-violet-100 px-[12px] py-[4px] rounded-[6px]">GCS: {formData.neuroData.gcs?.eye || '?'}/{formData.neuroData.gcs?.verbal || '?'}/{formData.neuroData.gcs?.motor || '?'}</span>
                                        </div>
                                        <div className="mb-3">
                                            <span className="text-[8px] color-violet-800 font-[800] uppercase block mb-1">Motor Power (0–5 per limb)</span>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[
                                                    ['RU', mp.ru], ['LU', mp.lu], ['RL', mp.rl], ['LL', mp.ll]
                                                ].map(([label, val]) => (
                                                    <div key={label} className="text-center p-2 bg-white rounded-lg border border-violet-100">
                                                        <span className="text-[8px] text-violet-500 font-bold block">{label}</span>
                                                        <span className={`text-[14px] font-black ${parseInt(val) < 5 ? 'text-red-600' : 'text-emerald-600'}`}>{val || '?'}/5</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-700">Reflexes: {formData.neuroData.reflexes || 'Normal'} | Mental Status: {formData.neuroData.mentalStatus || 'Alert'}</div>
                                    </div>
                                );
                            })()}

                            {activeSpecialty.toUpperCase().includes('URO') && formData.urologyData && (() => {
                                const u = formData.urologyData;
                                return (
                                    <div className="mb-[25px] p-[18px] border-2 border-sky-100 rounded-[16px] bg-sky-50/20">
                                        <div className="flex justify-between items-center border-b-[1.5px] border-sky-200 mb-[14px] pb-[8px]">
                                            <span className="text-[10px] font-[900] uppercase text-sky-800 tracking-[1px]">Urology Assessment</span>
                                            <span className="text-[11px] font-[900] text-sky-700 bg-sky-100 px-[12px] py-[4px] rounded-[6px]">IPSS Score: {u.ipss?.score || '--'}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div><span className="text-[8px] font-bold text-sky-600 uppercase block">Creatinine</span><div className="text-sm font-bold text-slate-800">{u.renal?.creatinine || '--'} mg/dL</div></div>
                                            <div><span className="text-[8px] font-bold text-sky-600 uppercase block">PVR Volume</span><div className="text-sm font-bold text-slate-800">{u.pvr || '--'} ml</div></div>
                                            <div><span className="text-[8px] font-bold text-sky-600 uppercase block">Prostate Size</span><div className="text-sm font-bold text-slate-800">{u.prostate?.size || 'Normal'}</div></div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {(activeSpecialty.toUpperCase().includes('ORTHO')) && formData.orthoData && (() => {
                                const o = formData.orthoData;
                                return (
                                    <div className="mb-[25px] p-[18px] border-2 border-orange-100 rounded-[16px] bg-orange-50/20">
                                        <div className="flex justify-between items-center border-b-[1.5px] border-orange-200 mb-[14px] pb-[8px]">
                                            <span className="text-[10px] font-[900] uppercase text-orange-800 tracking-[1px]">Orthopedic Evaluation</span>
                                            <span className="text-[11px] font-[900] text-orange-700 bg-orange-100 px-[12px] py-[4px] rounded-[6px]">{o.side} {o.joint}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <span className="text-[8px] font-bold text-orange-600 uppercase block mb-1">Pain & Range of Motion</span>
                                                <div className="text-sm font-black text-slate-800">Pain: {o.pain?.score}/10 <small className="text-orange-600">({o.pain?.type})</small></div>
                                                <div className="text-xs font-bold text-slate-600">ROM: {o.rom || 'Normal'}</div>
                                            </div>
                                            <div>
                                                <span className="text-[8px] font-bold text-orange-600 uppercase block mb-1">Physical Exam</span>
                                                <div className="text-[10px] font-bold text-slate-700">Swelling: {o.exam?.swelling} | Tenderness: {o.exam?.tenderness}</div>
                                                <div className="text-[10px] font-bold text-slate-700">Motor: {o.motorPower}/5 | Pulse: {o.neurovascular?.pulse}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {(activeSpecialty.toUpperCase().includes('OPHTHAL') || activeSpecialty.toUpperCase().includes('EYE')) && formData.ophthaData && (() => {
                                const o = formData.ophthaData;
                                return (
                                    <div className="mb-[25px] p-[18px] border-2 border-emerald-100 rounded-[16px] bg-emerald-50/20">
                                        <div className="flex justify-between items-center border-b-[1.5px] border-emerald-200 mb-[14px] pb-[8px]">
                                            <span className="text-[10px] font-[900] uppercase text-emerald-800 tracking-[1px]">Ophthalmology Report</span>
                                            <span className="text-[11px] font-[900] text-emerald-700 bg-emerald-100 px-[12px] py-[4px] rounded-[6px]">IOP: OD {o.iop?.od} | OS {o.iop?.os}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="bg-white p-2 rounded-lg border border-emerald-100">
                                                <span className="text-[8px] font-bold text-emerald-600 uppercase block">Vision OD</span>
                                                <div className="text-xs font-black">{o.vision?.od?.unaided} &rarr; {o.vision?.od?.corrected || 'No correction'}</div>
                                            </div>
                                            <div className="bg-white p-2 rounded-lg border border-emerald-100">
                                                <span className="text-[8px] font-bold text-emerald-600 uppercase block">Vision OS</span>
                                                <div className="text-xs font-black">{o.vision?.os?.unaided} &rarr; {o.vision?.os?.corrected || 'No correction'}</div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-700">Lens: {o.slitLamp?.lens} | Fundus: {o.fundus?.retina}</div>
                                    </div>
                                );
                            })()}

                            {activeSpecialty.toUpperCase().includes('PULMO') && formData.pulmoData && (() => {
                                const p = formData.pulmoData;
                                return (
                                    <div className="mb-[25px] p-[18px] border-2 border-cyan-100 rounded-[16px] bg-cyan-50/20">
                                        <div className="flex justify-between items-center border-b-[1.5px] border-cyan-200 mb-[14px] pb-[8px]">
                                            <span className="text-[11px] font-[900] uppercase text-cyan-800 tracking-[1px]">Pulmonary Status Review</span>
                                            <span className="text-[11px] font-[900] text-white bg-cyan-600 px-[10px] py-[4px] rounded-[6px]">SpO2: {p.vitals?.spo2}%</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-6">
                                            <div><span className="text-[8px] font-bold text-cyan-600 uppercase block">Resp Rate</span><div className="text-sm font-black">{p.vitals?.respRate || '--'} /min</div></div>
                                            <div><span className="text-[8px] font-bold text-cyan-600 uppercase block">Oxygen</span><div className="text-[10px] font-bold text-slate-700">{p.vitals?.oxygenSupport}</div></div>
                                            <div><span className="text-[8px] font-bold text-cyan-600 uppercase block">Chest Exam</span><div className="text-[10px] font-bold text-slate-700">{p.auscultation?.airEntry} Air Entry</div></div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {activeSpecialty.toUpperCase().includes('ENDOCRIN') && formData.endocrinologyData && (() => {
                                const e = formData.endocrinologyData;
                                return (
                                    <div className="mb-[25px] p-[18px] border-2 border-rose-100 rounded-[16px] bg-rose-50/20">
                                        <div className="flex justify-between items-center border-b-[1.5px] border-rose-200 mb-[14px] pb-[8px]">
                                            <span className="text-[11px] font-[900] uppercase text-rose-800 tracking-[1px]">Endocrine Assessment</span>
                                            <div className="flex gap-2">
                                                <span className="text-[10px] font-[800] bg-rose-100 text-rose-700 px-2 py-1 rounded">BMI: {e.bmi}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-3 rounded-xl border border-rose-100">
                                                <span className="text-[8px] font-bold text-rose-600 uppercase block mb-1">Glycemic Status</span>
                                                <div className="text-xs font-bold">HbA1c: <span className="text-rose-600">{e.glycemic?.hba1c}%</span></div>
                                                <div className="text-xs font-bold">FBS: {e.glycemic?.fbs} | PPBS: {e.glycemic?.ppbs}</div>
                                            </div>
                                            <div className="bg-white p-3 rounded-xl border border-rose-100">
                                                <span className="text-[8px] font-bold text-rose-600 uppercase block mb-1">Thyroid Profile</span>
                                                <div className="text-xs font-bold">TSH: {e.thyroid?.tsh} | T3: {e.thyroid?.t3} | T4: {e.thyroid?.t4}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {activeSpecialty.toUpperCase().includes('DENT') && formData.dentistryData && (() => {
                                const d = formData.dentistryData;
                                return (
                                    <div className="mb-[25px] p-[18px] border-2 border-teal-100 rounded-[16px] bg-teal-50/20">
                                        <div className="flex justify-between items-center border-b-[1.5px] border-teal-200 mb-[14px] pb-[8px]">
                                            <span className="text-[11px] font-[900] uppercase text-teal-800 tracking-[1px]">Dental Clinical Report</span>
                                            <span className="text-[10px] font-[900] text-white bg-teal-600 px-[10px] py-[4px] rounded-[6px]">Teeth Assessed: {d.teeth?.length || 0}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6 mt-2">
                                            <div>
                                                <span className="text-[8px] font-bold text-teal-600 uppercase block">Oral Findings</span>
                                                <div className="text-[10px] font-bold text-slate-700">Caries: {d.oralFindings?.caries} | Gingivitis: {d.oralFindings?.gingivitis}</div>
                                                <div className="text-[10px] font-bold text-slate-700">Mobility: {d.oralFindings?.mobility} | Plaque: {d.oralFindings?.plaqueIndex}</div>
                                            </div>
                                            {d.procedure && (
                                                <div>
                                                    <span className="text-[8px] font-bold text-teal-600 uppercase block">Planned Procedure</span>
                                                    <div className="text-[11px] font-black text-slate-900">{d.procedure}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {activeSpecialty.toUpperCase().includes('ENT') && formData.entData && (() => {
                                const ent = formData.entData;
                                return (
                                    <div className="mb-[25px] p-[18px] border-2 border-sky-100 rounded-[16px] bg-sky-50/20">
                                        <div className="flex justify-between items-center border-b-[1.5px] border-sky-200 mb-[14px] pb-[8px]">
                                            <span className="text-[11px] font-[900] uppercase text-sky-800 tracking-[1px]">ENT / Otolaryngology Examination</span>
                                            <span className="text-[10px] font-[900] text-sky-600 bg-sky-100 px-[10px] py-[4px] rounded-[6px]">Ear, Nose, Throat Profile</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6 mt-2">
                                            {/* Ear Assessment */}
                                            <div className="col-span-2 grid grid-cols-2 gap-4 bg-white/50 p-3 rounded-xl border border-sky-100">
                                                <div>
                                                    <span className="text-[8px] font-bold text-sky-600 uppercase block mb-1">Left Ear</span>
                                                    <div className="text-[10px] space-y-1">
                                                        <div className="text-slate-700 font-bold">External: <span className="text-slate-900">{ent.ear?.left?.externalEar || 'Normal'}</span></div>
                                                        <div className="text-slate-700 font-bold">Canal: <span className="text-sky-600 font-black">{ent.ear?.left?.earCanal?.join(', ') || 'Normal'}</span></div>
                                                        <div className="text-slate-700 font-bold">TM: <span className="text-rose-600 font-black">{ent.ear?.left?.tympanicMembrane || 'Normal'}</span></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-[8px] font-bold text-sky-600 uppercase block mb-1">Right Ear</span>
                                                    <div className="text-[10px] space-y-1">
                                                        <div className="text-slate-700 font-bold">External: <span className="text-slate-900">{ent.ear?.right?.externalEar || 'Normal'}</span></div>
                                                        <div className="text-slate-700 font-bold">Canal: <span className="text-rose-600 font-black">{ent.ear?.right?.earCanal?.join(', ') || 'Normal'}</span></div>
                                                        <div className="text-slate-700 font-bold">TM: <span className="text-slate-900 font-black">{ent.ear?.right?.tympanicMembrane || 'Normal'}</span></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Nose & Throat */}
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="text-[8px] font-bold text-sky-600 uppercase block">Nasal Exam</span>
                                                    <div className="text-[10px] font-bold text-slate-700">Mucosa: {ent.nose?.mucosa || 'Normal'} | Septum: {ent.nose?.septum || 'Central'}</div>
                                                    {ent.nose?.discharge && <div className="text-[10px] text-rose-600 font-black">Discharge: {ent.nose.discharge}</div>}
                                                </div>
                                                <div>
                                                    <span className="text-[8px] font-bold text-sky-600 uppercase block">Oral / Throat</span>
                                                    <div className="text-[10px] font-bold text-slate-700">Tonsils: {ent.throat?.tonsils || 'Normal'} | Pharynx: {ent.throat?.pharynx || 'Clear'}</div>
                                                </div>
                                            </div>

                                            {/* Hearing & Extra */}
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="text-[8px] font-bold text-sky-600 uppercase block">Aural Assessment</span>
                                                    <div className="text-[10px] font-bold text-slate-700">Hearing: {ent.hearing?.status || 'Normal'}</div>
                                                    {ent.hearing?.tuningForkTest?.length > 0 && <div className="text-[9px] text-sky-700">Test: {ent.hearing.tuningForkTest.join(', ')}</div>}
                                                </div>
                                                <div>
                                                    <span className="text-[8px] font-bold text-sky-600 uppercase block">Lymphatic / Voice</span>
                                                    <div className="text-[10px] font-bold text-slate-700">cervical: {ent.lymphNodes?.cervical || 'None'} | Voice: {ent.voice?.quality || 'Normal'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Medications Table */}
                            {formData.medicines.length > 0 && (
                                <div>
                                    <div className="text-[11px] font-[900] uppercase text-slate-800 tracking-[1.5px] mb-[12px] pb-[4px] border-b-2 border-indigo-600/20 inline-block">Medications & Dosage</div>
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/80 border-b-2 border-indigo-600/10">
                                                <th className="text-left text-[9px] font-[900] text-slate-500 uppercase py-[12px] px-[12px]" style={{ width: activeSpecialty.toUpperCase().includes('PEDIATRI') ? '35%' : '45%' }}>Medicine</th>
                                                <th className="text-left text-[9px] font-[900] text-slate-500 uppercase py-[12px] px-[12px]">Dosage</th>
                                                <th className="text-left text-[9px] font-[900] text-slate-500 uppercase py-[12px] px-[12px]">Frequency</th>
                                                <th className="text-left text-[9px] font-[900] text-slate-500 uppercase py-[12px] px-[12px]">Duration</th>
                                                {activeSpecialty.toUpperCase().includes('PEDIATRI') && (
                                                    <>
                                                        <th className="text-left text-[8px] font-[900] text-pink-600 uppercase py-[12px] px-[8px]">mg/kg</th>
                                                        <th className="text-left text-[8px] font-[900] text-pink-600 uppercase py-[12px] px-[8px]">Calc</th>
                                                    </>
                                                )}
                                                <th className="text-right text-[9px] font-[900] text-slate-500 uppercase py-[12px] px-[12px]">Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.medicines.map((med: Medicine, idx: number) => (
                                                <tr key={idx} className="border-b border-slate-50">
                                                    <td className="py-[15px] px-[10px]">
                                                        <div className="text-[13px] font-[800] text-slate-900">{med.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">{med.form}</div>
                                                    </td>
                                                    <td className="py-[15px] px-[10px] text-[13px] font-[600] text-slate-700">{med.dosage}</td>
                                                    <td className="py-[15px] px-[10px] text-[13px] font-[600] text-slate-500">{formatFrequency(med.freq)}</td>
                                                    <td className="py-[15px] px-[10px] text-[13px] font-[600] text-slate-700">{med.duration}</td>
                                                    {activeSpecialty.toUpperCase().includes('PEDIATRI') && (
                                                        <>
                                                            <td className="py-[15px] px-[5px] text-[11px] font-[700] text-pink-600">{med.mgPerKg || '--'}</td>
                                                            <td className="py-[15px] px-[5px] text-[11px] font-[800] text-slate-900">{med.calculatedDose || '--'}</td>
                                                        </>
                                                    )}
                                                    <td className="py-[15px] px-[10px] text-right text-[13px] font-[900] text-slate-900">{med.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Advice Grid */}
                            <div className="grid grid-cols-2 gap-8 pt-4">
                                {formData.dietAdvice.length > 0 && (
                                    <div>
                                        <div className="text-[11px] font-[900] uppercase text-slate-800 tracking-[1.5px] mb-[12px]">Clinical Advice</div>
                                        <ul className="space-y-1.5 list-none">
                                            {formData.dietAdvice.filter((i: string) => i.trim()).map((d: string, i: number) => (
                                                <li key={i} className="text-[12px] text-slate-600 font-[600] flex gap-2">
                                                    <span className="text-indigo-400">●</span> {d}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {formData.suggestedTests.length > 0 && (
                                    <div>
                                        <div className="text-[11px] font-[900] uppercase text-slate-800 tracking-[1.5px] mb-[12px]">Requested Tests</div>
                                        <ul className="space-y-1.5 list-none">
                                            {formData.suggestedTests.filter((i: string) => i.trim()).map((t: string, i: number) => (
                                                <li key={i} className="text-[12px] text-slate-600 font-[600] flex gap-2">
                                                    <span className="text-indigo-400">●</span> {t}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Follow up */}
                            { (formData.followUp || formData.followUpDate) && (
                                <div className="mt-8 p-6 bg-amber-50 rounded-2xl border-2 border-amber-100 flex justify-between items-center">
                                    <div>
                                        <span className="text-[9px] font-[800] text-amber-600 uppercase tracking-widest block mb-1">Follow-up Instructions</span>
                                        <div className="text-sm font-bold text-amber-900">{formData.followUp || 'Follow Standard Protocol'}</div>
                                    </div>
                                    {formData.followUpDate && (
                                        <div className="text-right">
                                            <span className="text-[9px] font-[800] text-amber-600 uppercase tracking-widest block mb-1">Scheduled Date</span>
                                            <div className="text-sm font-black text-amber-900">{new Date(formData.followUpDate).toLocaleDateString('en-GB')}</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-12 pt-8 border-t border-slate-100 flex justify-end">
                                <div className="text-center">
                                    <div className="w-[180px] h-[60px] border-b border-slate-300 mb-2 flex items-center justify-center">
                                        {formData.doctorSignature ? <img src={formData.doctorSignature} className="max-h-full" alt="Signature" /> : <span className="text-slate-300 text-[10px]">Digital Signature</span>}
                                    </div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Authorized Specialist Signature</div>
                                </div>
                            </div>

                            <div className="mt-10">
                                <MainFooter initialDetails={hospitalBranding} />
                            </div>
                        </div>
                    </div>

                {/* Action Bar */}

                    {/* Action Bar */}
                    <div className="sticky bottom-0 w-full max-w-4xl bg-slate-900/90 backdrop-blur-3xl p-6 rounded-[32px] border border-slate-800 flex flex-col sm:flex-row justify-end items-center gap-6 shadow-2xl shadow-indigo-500/10 mb-4">
                        <div className="flex gap-4 w-full sm:w-auto">
                            {!sentToPharma && formData.medicines.length > 0 && (
                                <button
                                    onClick={handleSendToPharma}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-600/30"
                                >
                                    <CheckCircle2 size={18} />
                                    <span>Send to Pharma</span>
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="flex-1 sm:flex-none px-8 py-4 bg-slate-800 text-slate-300 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 transition-all active:scale-95 border border-slate-700"
                            >
                                Modify Details
                            </button>
                            <button
                                onClick={handleFinalizeFromPreview}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-10 py-4 bg-teal-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-teal-700 transition-all active:scale-95 shadow-xl shadow-teal-600/30 ring-2 ring-teal-400/20"
                            >
                                <Printer size={18} />
                                <span>{sentToPharma ? 'Finalize & Print' : 'Sign & Finalize'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrescriptionPreviewModal;
