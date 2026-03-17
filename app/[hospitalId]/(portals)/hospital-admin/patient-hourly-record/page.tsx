import React from 'react';
import HourlyRecordClient from "@/app/[hospitalId]/(portals)/hospital-admin/patient-hourly-record/HourlyRecordClient";

export const metadata = {
    title: 'Patient Hourly Monitoring | CureChain Admin',
    description: 'Detailed hourly monitoring records for ICU and Emergency patients.',
};

export default function PatientHourlyRecordPage() {
    return (
        <div className="p-2 sm:p-4 md:p-5 space-y-6 bg-slate-50/50 min-h-screen">
            <div className="flex flex-col gap-1 sm:gap-1.5 ml-1">
                <h1 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">
                    Patient Hourly Monitoring
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                    Consolidated record of vitals, medications, diet, and lab tests.
                </p>
            </div>

            <HourlyRecordClient />
        </div>
    );
}
