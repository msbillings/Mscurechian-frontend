import React, { useEffect, useRef } from "react";
import { X, Printer } from "lucide-react";
import { generateClinicalReceiptHtml } from "@/lib/print-utils";

interface ReceiptProps {
  hospital: {
    name: string;
    address?: string;
    contact?: string;
    email?: string;
  };
  patient: {
    name: string;
    mrn: string;
    age: string | number;
    gender: string;
    mobile: string;
    email?: string;
    address?: string;
    emergencyContact?: string;
    bloodGroup?: string;
    dateOfBirth?: string;
    allergies?: string;
    medicalHistory?: string;
    symptoms?: string;
    vitals?: {
      height?: string;
      weight?: string;
      bp?: string;
      pulse?: string;
      temp?: string;
      spo2?: string;
      sugar?: string;
    };
  };
  appointment: {
    doctorName: string;
    specialization?: string;
    degree?: string;
    date: string;
    time: string;
    type: string;
    appointmentId: string;
  };
  payment: {
    amount: number;
    method: 'cash' | 'card' | 'upi' | string;
    status: string;
    receiptNumber?: string;
  };
  onClose: () => void;
}

function ClinicalReceipt({ hospital, patient, appointment, payment, onClose }: ReceiptProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        // Map props to match generateClinicalReceiptHtml expectations
        const mappedPatient = {
          ...patient,
          dob: patient.dateOfBirth, // crucial mapping
          vitals: patient.vitals ? {
            ...patient.vitals,
            temperature: patient.vitals.temp
          } : undefined
        };

        const rawHtml = generateClinicalReceiptHtml({
          hospital,
          patient: mappedPatient,
          appointment: {
            ...appointment,
            notes: patient.symptoms // Map symptoms to appointment notes as existing receipts do
          },
          payment,
          registrationType: appointment.type === 'IPD' ? 'IPD' : 'OPD',
          returnUrl: '#'
        });

        // Sanitize for preview
        const sanitizedHtml = rawHtml
          .replace('onload="window.print();"', '')
          .replace(/<div class="no-print">[\s\S]*?<\/div>/, '')
          .replace(/<script>[\s\S]*?window\.onafterprint[\s\S]*?<\/script>/, '');

        doc.open();
        doc.write(sanitizedHtml);
        doc.close();
      }
    }
  }, [hospital, patient, appointment, payment]);

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">

      {/* Container */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden relative border border-slate-200">

        {/* Header Actions */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white z-10 shrink-0">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Printer size={16} className="text-teal-600" /> Print Manager
          </h2>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all text-xs uppercase tracking-wider"
            >
              <Printer size={16} /> Print Receipt
            </button>
            <button
              onClick={onClose}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg active:scale-95 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Iframe Preview */}
        <div className="flex-1 bg-slate-100/50 p-8 overflow-hidden flex justify-center items-start overflow-y-auto custom-scrollbar">
          <iframe
            ref={iframeRef}
            className="bg-white shadow-2xl w-[210mm] min-h-[297mm] border border-slate-200 shrink-0 transform origin-top scale-[0.6] md:scale-90 transition-transform lg:scale-100"
            style={{ height: '297mm' }}
            title="Receipt Preview"
          />
        </div>

      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
           .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9; 
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1; 
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8; 
          }
      `}} />
    </div>
  );
}

export default React.memo(ClinicalReceipt);
