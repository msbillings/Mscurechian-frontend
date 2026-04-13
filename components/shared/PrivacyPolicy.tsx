'use client';

import React from "react";
import { XCircle } from "lucide-react";

export default function PrivacyPolicyModal({ onClose }: { onClose: () => void }) {
  const points = [
    "Identity Verification: We store your name, mobile number, and email to securely verify your identity for login.",
    "Role-Based Access: Access to patient records and hospital tools is strictly determined by your assigned role (Doctor, Nurse, Admin, etc.).",
    "Hospital Context: Your data is isolated to specific hospitals you are associated with to prevent unauthorized cross-hospital data access.",
    "Security Measures: We store passwords in a secure, non-readable format and use temporary sessions to keep your account safe.",
    "Multi-Tenancy Isolation: Each healthcare provider's data is logically separated, ensuring your information is never mixed with other facilities.",
    "Patient Record Keeping: We maintain medical history, vitals, and treatment plans solely for providing healthcare services.",
    "Audit Logs: For safety and accountability, we track when and what medical information is being accessed or modified by staff members.",
    "Session Management: We use cookies to keep you signed in so you don't have to re-enter your details on every page.",
    "Emergency Response: In urgent situations, your location and contact details may be shared with emergency services like ambulances.",
    "Regulatory Compliance: We keep records of clinical activities, pharmacy licenses, and employee IDs for reporting and legal healthcare requirements.",
    "Pharmacy & Lab Management: Details like shop names and license numbers are handled specifically for pharmacy and lab operations.",
    "Incident Tracking: We record vital alerts and escalations to ensure timely response to clinical emergencies.",
    "Data Retention: Information is kept only as long as necessary for clinical care or as required by healthcare regulations.",
    "Communication: We send essential updates like OTPs or security alerts to your registered mobile or email.",
    "User Consent: We track when you agree to our terms to ensure we have your permission to process your data for healthcare purposes."
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-lg sm:text-2xl font-black tracking-tight">Privacy Policy</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted/20 rounded-full transition-colors">
            <XCircle size={20} className="text-muted" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4">
          <p className="text-muted text-[10px] sm:text-sm leading-relaxed">
            At MSCureChain, we take your privacy and data security seriously. This policy explains how we handle your information within our healthcare ecosystem.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:gap-3">
            {points.map((point, i) => {
              const [title, desc] = point.split(": ");
              return (
                <div key={i} className="flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-muted/5 border border-border/50">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-primary-theme/10 flex items-center justify-center shrink-0 text-primary-theme font-bold text-[9px] sm:text-xs">
                    {i + 1}
                  </div>
                  <div className="space-y-0.5 sm:space-y-1">
                    <h3 className="font-bold text-[10px] sm:text-sm text-foreground">{title}</h3>
                    <p className="text-muted text-[9px] sm:text-[11px] leading-relaxed">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-border bg-muted/5">
          <button
            onClick={onClose}
            className="w-full bg-primary-theme py-2.5 sm:py-3 rounded-xl text-white font-bold text-[10px] sm:text-sm transition-all active:scale-[0.98]"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
