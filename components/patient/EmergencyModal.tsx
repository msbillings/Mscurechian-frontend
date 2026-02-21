'use client';
 
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, Navigation, Loader2, Send, Activity, ShieldAlert, Check, Building2 } from 'lucide-react';
import { emergencyService } from '@/lib/integrations/services/emergency.service';
import toast from 'react-hot-toast';
 
interface EmergencyModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientProfile: any;
    availableHospitals?: any[];
}
 
const EMERGENCY_TYPES = [
    "Chest Pain", "Breathing Difficulty", "Severe Injury", "Unconsciousness",
    "High Fever", "Severe Bleeding", "Poisoning", "Other"
];
 
const SEVERITY_LEVELS = [
    { value: "critical", label: "Critical", color: "bg-red-600", bg: "bg-red-50" },
    { value: "high", label: "High", color: "bg-orange-500", bg: "bg-orange-50" },
    { value: "medium", label: "Medium", color: "bg-yellow-500", bg: "bg-yellow-50" },
    { value: "low", label: "Low", color: "bg-blue-500", bg: "bg-blue-50" }
];
 
export const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose, patientProfile, availableHospitals = [] }) => {
    const [loading, setLoading] = useState(false);
    const [selectedHospitalIds, setSelectedHospitalIds] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        emergencyType: '',
        description: '',
        severity: 'high' as "critical" | "high" | "medium" | "low",
        currentLocation: '',
    });

    // Initialize selected hospitals when modal opens
    React.useEffect(() => {
        if (isOpen && availableHospitals.length > 0) {
            // Default to all acquainted hospitals for maximum safety, or just the primary one
            // The user said "make it as a checkbox to select", so let's pre-select the primary one if it exists
            const primaryId = patientProfile?.hospital?._id || patientProfile?.hospital;
            if (primaryId) {
                setSelectedHospitalIds([primaryId.toString()]);
            } else if (availableHospitals.length > 0) {
                 // Or pre-select all if no primary
                 setSelectedHospitalIds(availableHospitals.map(h => h._id.toString()));
            }
        }
    }, [isOpen, availableHospitals, patientProfile]);
 
    if (!isOpen) return null;

    const toggleHospital = (id: string) => {
        setSelectedHospitalIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };
 
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.emergencyType || !formData.description || !formData.currentLocation) {
            toast.error("Please fill all mandatory fields");
            return;
        }

        if (selectedHospitalIds.length === 0) {
            toast.error("Please select at least one hospital to alert");
            return;
        }
 
        try {
            setLoading(true);
            
            await emergencyService.createPatientEmergencyRequest({
                ...formData,
                hospitalIds: selectedHospitalIds
            });
 
            toast.success(`Emergency alert broadcasted to ${selectedHospitalIds.length} hospital(s)!`, {
                duration: 6000,
                icon: '🚨'
            });
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to send emergency request");
        } finally {
            setLoading(false);
        }
    };
 
    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[28px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
                >
                    {/* Header */}
                    <div className="bg-red-600 p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                            <ShieldAlert size={120} />
                        </div>
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                    <AlertCircle className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black uppercase tracking-tight">Emergency Alert</h2>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Instant Helpdesk Response</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
 
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Emergency Type */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Emergency Type *</label>
                                <select
                                    value={formData.emergencyType}
                                    onChange={(e) => setFormData(prev => ({ ...prev, emergencyType: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-red-500 font-bold text-sm transition-all"
                                    required
                                >
                                    <option value="">Select Type</option>
                                    {EMERGENCY_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
 
                            {/* Severity */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Severity Level</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {SEVERITY_LEVELS.map(level => (
                                        <button
                                            key={level.value}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, severity: level.value as any }))}
                                            className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                                                formData.severity === level.value 
                                                ? `${level.color} border-transparent text-white shadow-lg` 
                                                : `bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400`
                                            }`}
                                        >
                                            {level.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
 
                        {/* Current Location */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
                                <Navigation size={10} className="text-red-500" /> Current Location / Address *
                            </label>
                            <input
                                type="text"
                                value={formData.currentLocation}
                                onChange={(e) => setFormData(prev => ({ ...prev, currentLocation: e.target.value }))}
                                placeholder="Where are you right now?"
                                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-red-500 font-bold text-sm transition-all"
                                required
                            />
                        </div>
 
                        {/* Hospital Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
                                <Building2 size={10} className="text-red-500" /> Select Hospitals to Alert *
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                                {availableHospitals.map((hospital) => {
                                    const isSelected = selectedHospitalIds.includes(hospital._id.toString());
                                    return (
                                        <button
                                            key={hospital._id}
                                            type="button"
                                            onClick={() => toggleHospital(hospital._id.toString())}
                                            className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                                                isSelected
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                                                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Building2 size={14} className={isSelected ? 'text-blue-500' : 'text-slate-400'} />
                                                <span className="text-[10px] font-bold uppercase truncate tracking-tight">{hospital.name}</span>
                                            </div>
                                            {isSelected && (
                                                <div className="bg-blue-500 rounded-full p-0.5">
                                                    <Check size={10} className="text-white" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
                                <Activity size={10} className="text-red-500" /> Describe Symptoms / Situation *
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                rows={3}
                                placeholder="Explain the emergency briefly..."
                                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-red-500 font-bold text-sm transition-all resize-none"
                                required
                            />
                        </div>
 
                        {/* Submit */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-red-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                    <>
                                        <Send size={18} />
                                        Call for Emergency
                                    </>
                                )}
                            </button>
                            <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-widest mt-4">
                                By clicking, an immediate alert will be broadcasted to the hospital helpdesk
                            </p>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
