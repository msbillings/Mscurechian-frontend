import React, { useEffect, useRef } from "react";
import { X, Printer } from "lucide-react";
import { generateClinicalReceiptHtml } from "@/lib/print-utils";
import { renderToStaticMarkup } from "react-dom/server";
import MainHeader from "../printers/MainHeader";
import MainFooter from "../printers/MainFooter";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";

interface ReceiptProps {
  hospital: {
    name: string;
    address?: string;
    contact?: string;
    email?: string;
    logo?: string;
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
    diagnosis?: string;
    provisionalDiagnosis?: string;
    treatmentGiven?: string;
    surgicalProcedures?: string;
    investigationsPerformed?: string;
    hospitalCourse?: string;
    conditionAtDischarge?: string;
    medicationsPrescribed?: string;
    adviceAtDischarge?: string;
    activityRestrictions?: string;
    dietInstructions?: string;
    warningSigns?: string;
    followUpDate?: string;
    dischargeType?: string;
    vitals?: {
      height?: string;
      weight?: string;
      bp?: string;
      bloodPressure?: string;
      pulse?: string;
      temp?: string;
      temperature?: string;
      spo2?: string;
      spO2?: string;
      sugar?: string;
      glucose?: string;
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
    stayDuration?: string;
  };
  payment: {
    amount: number;
    method: 'cash' | 'card' | 'upi' | string;
    status: string;
    receiptNumber?: string;
  };
  onClose: () => void;
  onConfirm?: () => Promise<void>;
}

function ClinicalReceipt({ hospital: propHospital, patient, appointment, payment, onClose, onConfirm }: ReceiptProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hospital, setHospital] = React.useState(propHospital);
  const [dataLoaded, setDataLoaded] = React.useState(false);

  useEffect(() => {
    const fetchAdminDetails = async () => {
      try {
        const response = await hospitalAdminService.getHospital();
        if (response?.hospital) {
          const h = response.hospital;
          setHospital({
            name: h.name || propHospital.name,
            address: h.address || propHospital.address,
            contact: h.phone || propHospital.contact,
            email: h.email || propHospital.email,
            logo: h.logo || propHospital.logo
          });
        }
      } catch (error) {
        console.error("Failed to fetch admin hospital details for receipt", error);
      } finally {
        setDataLoaded(true);
      }
    };
    fetchAdminDetails();
  }, [propHospital]);

  useEffect(() => {
    if (dataLoaded && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        // Map props to match generateClinicalReceiptHtml expectations
        const mappedPatient = {
          ...patient,
          dob: patient.dateOfBirth, // crucial mapping
          vitals: patient.vitals ? {
            ...patient.vitals,
            temperature: patient.vitals.temperature || patient.vitals.temp,
            temp: patient.vitals.temp || patient.vitals.temperature,
            bloodPressure: patient.vitals.bp || patient.vitals.bloodPressure,
            bp: patient.vitals.bp || patient.vitals.bloodPressure,
            spO2: patient.vitals.spo2 || patient.vitals.spO2,
            spo2: patient.vitals.spo2 || patient.vitals.spO2,
            glucose: patient.vitals.sugar || patient.vitals.glucose,
            sugar: patient.vitals.sugar || patient.vitals.glucose
          } : undefined
        };

        // 1. Render React Components to Static HTML
        const headerHtml = renderToStaticMarkup(
          <MainHeader initialDetails={{
            name: hospital.name,
            address: hospital.address || "",
            phone: hospital.contact || "",
            email: hospital.email || "",
            logo: hospital.logo
          }} />
        );

        const footerHtml = renderToStaticMarkup(
          <MainFooter initialDetails={{
            name: hospital.name,
            address: hospital.address || "",
            phone: hospital.contact || "",
            email: hospital.email || "",
          }} />
        );

        const rawHtml = generateClinicalReceiptHtml({
          hospital,
          patient: mappedPatient,
          appointment: {
            ...appointment,
            notes: patient.symptoms // Map symptoms to appointment notes as existing receipts do
          },
          payment,
          registrationType: ((patient.dischargeType && patient.dischargeType.toUpperCase() !== 'NONE') || 
            (appointment.type && (appointment.type.toUpperCase().includes('DISCHARGE') || appointment.type.toUpperCase().includes('SETTLEMENT'))) ||
            (appointment.specialization && appointment.specialization.toUpperCase().includes('DISCHARGE'))) 
            ? 'DISCHARGE' 
            : (appointment.specialization?.toUpperCase().includes('IPD') || appointment.type?.toUpperCase().includes('IPD') || appointment.stayDuration) 
              ? 'IPD' 
              : 'OPD',
          headerHtml,
          footerHtml,
          returnUrl: '#'
        });

        // 2. Sanitize for iframe preview
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

  const [isConfirming, setIsConfirming] = React.useState(false);

  const handlePrint = async () => {
    if (onConfirm) {
      try {
        setIsConfirming(true);
        await onConfirm();
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.print();
        }
      } catch (err) {
        console.error("Confirmation failed", err);
      } finally {
        setIsConfirming(false);
      }
    } else {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.print();
      }
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
              disabled={isConfirming}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all text-xs uppercase tracking-wider disabled:opacity-50"
            >
              <Printer size={16} /> {isConfirming ? 'Processing...' : onConfirm ? 'Confirm & Print' : 'Print Receipt'}
            </button>
            <button
              onClick={onClose}
              disabled={isConfirming}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg active:scale-95 transition-all disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Iframe Preview */}
        <div className="flex-1 bg-slate-100/50 p-8 overflow-hidden flex justify-center items-start overflow-y-auto custom-scrollbar">
          <iframe
            ref={iframeRef}
            className="bg-white shadow-2xl w-[210mm] border border-slate-200 shrink-0 transform origin-top scale-[0.6] md:scale-90 transition-transform lg:scale-100 mb-20"
            style={{ minHeight: '600mm', height: 'auto' }}
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