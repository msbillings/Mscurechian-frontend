"use client";

import React from 'react';
import HourlyRecordClient from '../../hospital-admin/patient-hourly-record/HourlyRecordClient';

export default function DoctorHourlyRecordPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 sm:gap-2">
                <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 uppercase tracking-tight">Patient Hourly Monitoring</h1>
                <p className="text-[7px] md:text-[10px] lg:text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Consolidated Clinical Records for Assigned Patients</p>
            </div>

            <HourlyRecordClient />
        </div>
    );
}
