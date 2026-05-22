'use client';

import React, { useState } from 'react';
import { Pill, Send, Save, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { MedicineSearchInput } from './MedicineSearchInput';
import { PrescriptionTable, MedicineEntry } from './PrescriptionTable';
import { PrescriptionSummary } from './PrescriptionSummary';
import { VoicePrescriptionInput } from './VoicePrescriptionInput';
import { PrescriptionPreview } from './PrescriptionPreview';
import { apiClient } from '@/lib/integrations/api/apiClient';
import toast from 'react-hot-toast';

interface SmartPrescriptionCardProps {
  hospitalId: string;
  appointmentId: string;
  patientId: string;
  patientAllergies?: string;
  onSuccess?: () => void;
}

export const SmartPrescriptionCard: React.FC<SmartPrescriptionCardProps> = ({
  hospitalId,
  appointmentId,
  patientId,
  patientAllergies,
  onSuccess
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [medicines, setMedicines] = useState<MedicineEntry[]>([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleAddMedicine = (med: any) => {
    const isDuplicate = medicines.some(m => m.name.toLowerCase() === med.name.toLowerCase());
    
    let mappedFrequency = 'OD (Once a day)';
    if (med.frequency) {
        const f = med.frequency.toUpperCase();
        if (f === 'BD') mappedFrequency = 'BD (Twice a day)';
        else if (f === 'TDS' || f === 'TID') mappedFrequency = 'TID (Thrice a day)';
        else if (f === 'QID') mappedFrequency = 'QID (Four times)';
        else if (f === 'SOS') mappedFrequency = 'SOS (As needed)';
    }

    const newMed: MedicineEntry = {
      id: Math.random().toString(36).substr(2, 9),
      name: med.name,
      productId: med.productId,
      dosage: med.dosage || '100mg',
      frequency: mappedFrequency,
      duration: med.duration || '5 Days',
      quantity: med.quantity || '5',
      foodTiming: med.instructions || 'After Food',
      notes: '',
      stockStatus: med.stockStatus,
      isDuplicate
    };

    setMedicines(prev => [...prev, newMed]);
    if (isDuplicate) {
      toast.error('Duplicate medicine added', { icon: '⚠️' });
    }
  };

  const updateMedicine = (id: string, field: keyof MedicineEntry, value: string) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeMedicine = (id: string) => {
    setMedicines(prev => prev.filter(m => m.id !== id));
  };

  const submitPrescription = async (sendToPharma: boolean) => {
    if (medicines.length === 0) {
      toast.error('Please add at least one medicine');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload = {
        appointmentId,
        patientId,
        diagnosis: diagnosis || 'General Checkup',
        notes,
        medicines: medicines.map(m => ({
          name: m.name,
          drug: m.productId,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          quantity: m.quantity,
          instructions: `${m.foodTiming} - ${m.notes}`.trim()
        })),
        sendToPharma
      };

      await apiClient('/api/prescriptions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast.success(sendToPharma ? 'Prescription sent to pharmacy!' : 'Prescription saved as draft');
      if (sendToPharma) {
        setMedicines([]);
        setDiagnosis('');
        setNotes('');
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit prescription');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-[#151515] rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-border-theme mb-6 transition-all duration-300">
      {/* Header section with gradient */}
      <div 
        className="px-6 py-5 bg-gradient-to-r from-blue-600 to-teal-500 cursor-pointer flex justify-between items-center group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
            <Pill className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">WRITE YOUR OWN PRESCRIPTION</h2>
            <p className="text-blue-100 text-xs font-medium tracking-wide uppercase mt-0.5">Digital Smart Prescription & Pharmacy Integration</p>
          </div>
        </div>
        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-transform duration-300 group-hover:bg-white/20">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {/* Expandable Content */}
      <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="p-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Clinical Diagnosis (Optional)</label>
              <input 
                type="text" 
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Enter primary diagnosis..."
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-border-theme rounded-xl text-sm focus:ring-2 focus:ring-primary-theme outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Prescription Notes</label>
              <input 
                type="text" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dietary advice, next visit instructions..."
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-border-theme rounded-xl text-sm focus:ring-2 focus:ring-primary-theme outline-none"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Search & Add Medicines</label>
            <MedicineSearchInput hospitalId={hospitalId} onSelect={handleAddMedicine} />
          </div>

          <div className="mb-6">
            <VoicePrescriptionInput 
              onPrescriptionParsed={(parsedMedicines) => {
                parsedMedicines.forEach(med => handleAddMedicine(med));
              }}
            />
          </div>

          <PrescriptionSummary medicines={medicines} patientAllergies={patientAllergies} />

          <PrescriptionTable 
            medicines={medicines} 
            updateMedicine={updateMedicine} 
            removeMedicine={removeMedicine} 
          />

          {/* Footer Actions */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-border-theme">
            <div className="flex items-center gap-2 text-muted-foreground mb-4 sm:mb-0">
              <AlertCircle size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Verify medicines before sending to pharmacy</span>
            </div>
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <button 
                className="flex-1 sm:flex-none px-6 py-2.5 bg-white dark:bg-gray-800 border border-border-theme text-foreground hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={() => setShowPreview(true)}
                disabled={medicines.length === 0}
              >
                Print Preview
              </button>
              <button 
                className="flex-1 sm:flex-none px-6 py-2.5 bg-white dark:bg-gray-800 border border-border-theme text-foreground hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={() => submitPrescription(false)}
                disabled={isSubmitting || medicines.length === 0}
              >
                <Save size={16} /> Save Draft
              </button>
              <button 
                className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 text-white hover:from-blue-700 hover:to-teal-600 rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={() => submitPrescription(true)}
                disabled={isSubmitting || medicines.length === 0}
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Send to Pharmacy
              </button>
            </div>
          </div>

        </div>
      </div>

      {showPreview && (
        <PrescriptionPreview
          hospitalName="Apollo Apollo Multispecialty Hospital"
          hospitalAddress="123 Health Ave, Medical District"
          hospitalPhone="+1 234 567 8900"
          doctorName="Dr. John Doe"
          patientName="Patient Name"
          patientAge="35"
          patientGender="Male"
          patientId="MRN-12345"
          date={new Date()}
          diagnosis={diagnosis}
          clinicalNotes={notes}
          plan=""
          medicines={medicines.map(m => ({ ...m, instructions: `${m.foodTiming}${m.notes ? ' - ' + m.notes : ''}`.trim() }))}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};
