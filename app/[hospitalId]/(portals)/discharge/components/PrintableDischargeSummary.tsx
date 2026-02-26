'use client';

import React, { useState, useEffect } from 'react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';

export const PrintableDischargeSummary = React.forwardRef<HTMLDivElement, { data: any, consultants: string[] }>(({ data, consultants }, ref) => {
    const [hospitalInfo, setHospitalInfo] = useState<any>(null);

    useEffect(() => {
        const fetchHospital = async () => {
            try {
                const res = await hospitalAdminService.getHospital();
                setHospitalInfo(res.hospital);
            } catch (error) {
                console.error("Failed to fetch hospital info for print", error);
            }
        };
        fetchHospital();
    }, []);

    if (!data) return null;

    const sections = [
        { label: 'Provisional Diagnosis / ICD-10', value: `${data.provisionalDiagnosis || ''} ${data.icdCode ? `(ICD: ${data.icdCode})` : ''}`.trim() },
        { label: 'Final Diagnosis', value: data.diagnosis },
        { label: 'Reason for Admission', value: data.reasonForAdmission },
        { label: 'Chief Complaints', value: data.chiefComplaints },
        {
            label: 'Physical Examination & Clinical Status',
            subSections: [
                {
                    label: 'Vital Signs at Discharge',
                    value: data.vitals ? [
                        data.vitals.bloodPressure ? `BP: ${data.vitals.bloodPressure}` : '',
                        data.vitals.pulse ? `PR: ${data.vitals.pulse}/min` : '',
                        data.vitals.temperature ? `Temp: ${data.vitals.temperature}°F` : '',
                        data.vitals.spO2 ? `SpO2: ${data.vitals.spO2}%` : '',
                        data.vitals.height ? `Ht: ${data.vitals.height}cm` : '',
                        data.vitals.weight ? `Wt: ${data.vitals.weight}kg` : '',
                        (data.vitals.sugar || data.vitals.glucose) ? `Sugar: ${data.vitals.sugar || data.vitals.glucose}mg/dL` : ''
                    ].filter(Boolean).join(', ') : ''
                },
                { label: 'General Appearance', value: data.generalAppearance },
                { label: 'Allergy History', value: data.allergyHistory }
            ]
        },
        { label: 'Investigations Performed', value: data.investigationsPerformed },
        { label: 'Hospital Course', value: data.hospitalCourse },
        { label: 'Treatment Summary', value: data.treatmentGiven },
        { label: 'Surgical / Procedural Details', value: data.surgicalProcedures || data.surgeryNotes },
        { label: 'Condition at Discharge', value: data.conditionAtDischarge },
        { label: 'Discharge Medications', value: data.medicationsPrescribed },
        { label: 'Advice & Activity Restrictions', value: `${data.adviceAtDischarge || ''}\n${data.activityRestrictions || ''}`.trim() },
        { label: 'Dietary Instructions', value: data.dietInstructions || data.diet },
        { label: 'Warning Signs / Red Flags', value: data.warningSigns },
        {
            label: 'Follow-up Details',
            value: data.followUpInstructions,
            subSections: [
                { label: 'Next Appointment', value: data.followUpDate ? new Date(data.followUpDate).toLocaleString() : '' },
                { label: 'Department / Doctor', value: data.suggestedDoctorName || data.primaryDoctor }
            ]
        },
    ];

    return (
        <div ref={ref} className="bg-white text-black font-serif text-[11px] leading-relaxed w-full">
            <style>
                {`
                    @media print {
                        @page {
                            margin: 0; /* Strict 0 margin hides browser headers/footers (URL, Title, etc.) */
                        }
                        body {
                            margin: 0;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        /* Internal padding to replace @page margins */
                        .print-container {
                            padding: 15mm !important;
                        }
                        /* Repeating space at top of every page for clean look */
                        .content-page-buffer {
                            padding-top: 5mm;
                        }
                    }
                `}
            </style>

            <div className="p-0 min-h-screen flex flex-col relative scale-[0.98] content-page-buffer print-container">
                <div className="border-[1.5px] border-gray-200 p-8 flex-1 flex flex-col min-h-0 relative">

                    {/* Watermark Section */}


                    {/* 1. Header Section */}
                    <div className="flex justify-between items-start border-b-[1.5px] border-black pb-4 mb-4 relative z-10">
                        <div className="space-y-1">
                            <h1 className="text-[16px] font-black uppercase tracking-tight">{hospitalInfo?.name || data.hospitalName || ''}</h1>
                            {(() => {
                                // Construct standard address from granular fields
                                const parts = [
                                    hospitalInfo?.street,
                                    hospitalInfo?.landmark,
                                    hospitalInfo?.area,
                                    hospitalInfo?.city,
                                    hospitalInfo?.state
                                ].filter(Boolean);

                                // If granular fields exist, use them. Deduplicate to prevent redundancy.
                                const uniqueParts = Array.from(new Set(parts));

                                const displayAddress = uniqueParts.length > 0
                                    ? uniqueParts.join(', ')
                                    : (hospitalInfo?.address || data.hospitalAddress || '');

                                return (
                                    <>
                                        <p className="text-[10px] uppercase">{displayAddress}</p>
                                        <p className="text-[10px]">{hospitalInfo?.pincode ? `PIN: ${hospitalInfo.pincode}` : (data.pincode || '')}</p>
                                    </>
                                );
                            })()}
                            <p className="text-[10px]">Phone: {hospitalInfo?.phone || data.hospitalPhone || ''}</p>
                        </div>
                        <div className="w-28 h-28 flex items-center justify-center border border-black/5 rounded-xl overflow-hidden bg-gray-50/50 p-1">
                            {(() => {
                                let logoUrl = hospitalInfo?.logo || data.hospitalLogo;

                                // Defensive check: ignore junk values
                                if (!logoUrl || logoUrl === 'undefined' || logoUrl === 'null' || (typeof logoUrl === 'object' && Object.keys(logoUrl).length === 0) || (typeof logoUrl === 'string' && logoUrl.includes('example.com/logo.png'))) {
                                    logoUrl = '';
                                }

                                const baseUrl = 'http://localhost:5002';

                                // Resolve relative paths
                                const finalUrl = logoUrl && !logoUrl.startsWith('http') && !logoUrl.startsWith('data:')
                                    ? `${baseUrl}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`
                                    : logoUrl;

                                // Log diagnostic info to browser console
                                if (typeof window !== 'undefined' && finalUrl) {
                                    console.log('[Logo Diagnosis] Final URL:', finalUrl);
                                }

                                return finalUrl ? (
                                    <img
                                        src={finalUrl}
                                        alt="Hospital Logo"
                                        className="max-w-full max-h-full object-contain"
                                        crossOrigin="anonymous"
                                        onError={(e) => {
                                            if (typeof window !== 'undefined') console.error('[Logo Diagnosis] Failed to load:', finalUrl);
                                            (e.target as any).onerror = null;
                                            (e.target as any).style.display = 'none';
                                            (e.target as any).parentNode.innerHTML = `
                                                <div class="w-full h-full bg-[#0e639c] flex flex-col items-center justify-center text-white rounded-lg p-2 text-center">
                                                    <span class="font-black text-xl leading-none">KMSH</span>
                                                    <div class="w-6 h-[1px] bg-white/30 my-1"></div>
                                                    <span class="text-[6px] uppercase tracking-widest font-medium opacity-70">Medical Center</span>
                                                </div>
                                            `;
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-[#0e639c] flex flex-col items-center justify-center text-white rounded-lg p-2 text-center">
                                        <span className="font-black text-xl leading-none">KMSH</span>
                                        <div className="w-6 h-[1px] bg-white/30 my-1"></div>
                                        <span className="text-[6px] uppercase tracking-widest font-medium opacity-70">Medical Center</span>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-6 relative z-10">
                        <h2 className="text-[16px] font-bold uppercase underline decoration-2 underline-offset-4">DISCHARGE SUMMARY</h2>
                    </div>

                    {/* 2. Patient Details Grid */}
                    <div className="mb-6 relative z-10">
                        <h3 className="font-bold mb-1 border-b border-gray-200 pb-0.5">Patient Details</h3>
                        <div className="grid grid-cols-2 text-[11px] border-t border-gray-100">

                            {/* Row 1 */}
                            <div className="flex border-b border-r border-gray-100 p-1.5">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Patient Name</span>
                                <span>: {data.patientTitle} {data.patientName}</span>
                            </div>
                            <div className="flex border-b border-gray-100 p-1.5 pl-3">
                                <span className="font-bold w-36 shrink-0 text-gray-600">MRN / UHID</span>
                                <span>: {data.mrn}</span>
                            </div>

                            {/* Row 2 */}
                            <div className="flex border-b border-r border-gray-100 p-1.5">
                                <span className="font-bold w-36 shrink-0 text-gray-600">DOB / Age</span>
                                <span>: {data.dob ? new Date(data.dob).toLocaleDateString() : 'N/A'} ({data.age})</span>
                            </div>
                            <div className="flex border-b border-gray-100 p-1.5 pl-3">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Gender / Blood</span>
                                <span>: {data.gender} {data.bloodGroup ? `(${data.bloodGroup})` : ''}</span>
                            </div>

                            {/* Row 3 */}
                            <div className="flex border-b border-r border-gray-100 p-1.5">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Guardian Contact</span>
                                <span>: {data.phone || data.attendantPhone}</span>
                            </div>
                            <div className="flex border-b border-gray-100 p-1.5 pl-3">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Admission Type</span>
                                <span>: {data.admissionType || data.roomType}</span>
                            </div>

                            {/* Row 4 */}
                            <div className="flex border-b border-r border-gray-100 p-1.5">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Room / Bed</span>
                                <span>: {data.roomNo} / {data.bedNo || 'N/A'}</span>
                            </div>
                            <div className="flex border-b border-gray-100 p-1.5 pl-3">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Primary Doctor</span>
                                <span>: {data.primaryDoctor || data.suggestedDoctorName}</span>
                            </div>

                            {/* Row 5 */}
                            <div className="flex border-b border-r border-gray-100 p-1.5">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Date Admitted</span>
                                <span>: {data.admissionDate ? new Date(data.admissionDate).toLocaleString() : 'N/A'}</span>
                            </div>
                            <div className="flex border-b border-gray-100 p-1.5 pl-3">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Date Discharged</span>
                                <span>: {data.dischargeDate ? new Date(data.dischargeDate).toLocaleString() : 'N/A'}</span>
                            </div>

                            {/* Row 6 */}
                            <div className="flex border-b border-r border-gray-100 p-1.5">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Insurance / TPA</span>
                                <span>: {data.insuranceName || 'Self Pay'}</span>
                            </div>
                            <div className="flex border-b border-gray-100 p-1.5 pl-3">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Payment Mode</span>
                                <span>: {data.paymentMode || 'N/A'}</span>
                            </div>

                            {/* Row 7 */}
                            <div className="flex border-b border-r border-gray-100 p-1.5 bg-slate-50/30 text-blue-700">
                                <span className="font-bold w-36 shrink-0 italic text-black">Advance Amount</span>
                                <span className="font-bold">: ₹{data.advanceAmount?.toLocaleString() || '0.00'}</span>
                            </div>
                            <div className="flex border-b border-gray-100 p-1.5 pl-3 bg-slate-50/30 text-rose-700">
                                <span className="font-bold w-36 shrink-0 italic text-black">Due Amount</span>
                                <span className="font-bold">: ₹{data.finalPayment?.toLocaleString() || '0.00'}</span>
                            </div>

                            {/* Row 8 */}
                            <div className="flex p-1.5 bg-slate-100/50 col-span-2">
                                <span className="font-bold w-36 shrink-0 text-black text-xs uppercase tracking-tighter">Total Bill Amount</span>
                                <span className="font-black text-xs">: ₹{data.totalBillAmount?.toLocaleString() || '0.00'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="border-b border-black mb-4"></div>

                    {/* 3. Medical Content */}
                    <div className="space-y-4 flex-1 relative z-10">
                        {sections.map((section, idx) => {
                            const hasContent = section.value || (section.subSections && section.subSections.some(s => s.value));

                            return (
                                <div key={idx} className="break-inside-avoid border-b border-black/5 pb-2">
                                    <h3 className="font-bold border-b border-gray-200 mb-1">{section.label}</h3>
                                    {section.value ? (
                                        <p className="whitespace-pre-wrap mb-2 text-[11px] leading-snug">{section.value}</p>
                                    ) : (
                                        // If no value but has subsections (like vitals)
                                        !section.subSections && <p className="mb-2">-</p>
                                    )}

                                    {section.subSections && (
                                        <div className="mb-2 text-[11px]">
                                            {/* Specific formatting for vitals or follow up */}
                                            {section.subSections.map((sub, sIdx) => (
                                                sub.value && (
                                                    <div key={sIdx} className="mb-0.5">
                                                        {sub.label === 'Vital Signs at Discharge' ? (
                                                            <p>{sub.value}</p>
                                                        ) : (
                                                            <p><span className="font-medium">{sub.label}:</span> {sub.value}</p>
                                                        )}
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* 4. Footer */}
                    <div className="mt-auto relative z-10">
                        {/* Disclaimer Line */}
                        <div className="border-t border-gray-200 mb-2 mt-8"></div>
                        <div className="text-center text-[9px] mb-4">
                            <p>Regd. Office: {hospitalInfo?.name || data.hospitalName}, {
                                Array.from(new Set([
                                    hospitalInfo?.street,
                                    hospitalInfo?.area,
                                    hospitalInfo?.city,
                                    hospitalInfo?.state,
                                    hospitalInfo?.pincode
                                ].filter(Boolean))).join(', ') || (hospitalInfo?.address || data.hospitalAddress)
                            }</p>
                            <p>Tel: {hospitalInfo?.phone || data.hospitalPhone}</p>
                        </div>


                        <div className="text-center text-[10px] font-bold">
                            KEEP THE REPORTS CAREFULLY AND BRING THEM ALONG DURING YOUR NEXT VISIT TO OUR HOSPITAL
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

PrintableDischargeSummary.displayName = 'PrintableDischargeSummary';
