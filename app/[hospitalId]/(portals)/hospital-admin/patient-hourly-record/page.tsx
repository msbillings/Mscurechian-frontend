import React from 'react';
import HourlyRecordClient from "@/app/[hospitalId]/(portals)/hospital-admin/patient-hourly-record/HourlyRecordClient";

export const metadata = {
    title: 'Patient Hourly Monitoring | CureChain Admin',
    description: 'Detailed hourly monitoring records for ICU and Emergency patients.',
};

export default function PatientHourlyRecordPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 sm:gap-1.5">
                <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">
                    Patient Hourly Monitoring
                </h1>
                <p className="text-[10px] sm:text-xs md:text-sm text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                    Consolidated record of vitals, medications, diet, and lab tests.
                </p>
            </div>

            <HourlyRecordClient />
        </div>
    );
}
