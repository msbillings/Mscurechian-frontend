'use client';

import React, { useState, useEffect } from 'react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import MainHeader from '@/components/printers/MainHeader';
import MainFooter from '@/components/printers/MainFooter';

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

    // 4. Clinical Information
    const clinicalSections = [
        { label: 'Provisional Diagnosis / ICD-10', value: `${data.provisionalDiagnosis || ''} ${data.icdCode ? `(ICD: ${data.icdCode})` : ''}`.trim() },
        { label: 'Final Diagnosis', value: data.diagnosis },
        { label: 'Reason for Admission', value: data.reasonForAdmission },
        { label: 'Chief Complaints', value: data.chiefComplaints },
        { label: 'Past Medical History', value: data.pastMedicalHistory },
        { label: 'Allergy History', value: data.allergyHistory },
    ];

    // 5. Treatment & Procedures
    const treatmentSections = [
        { label: 'General Appearance', value: data.generalAppearance },
        { label: 'Treatment Summary', value: data.treatmentGiven },
        { label: 'Surgical / Procedural Details', value: data.surgicalProcedures || data.surgeryNotes },
        { label: 'Investigations Performed', value: data.investigationsPerformed },
        { label: 'Hospital Course', value: data.hospitalCourse },
        { label: 'Condition at Discharge', value: data.conditionAtDischarge },
    ];

    // 6. Discharge Advice
    const adviceSections = [
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
                            margin: 0;
                        }
                        body {
                            margin: 0;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .print-container {
                            padding: 15mm !important;
                        }
                        .content-page-buffer {
                            padding-top: 5mm;
                        }
                        .vitals-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 5px;
                        }
                        .vitals-table td, .vitals-table th {
                            border: 1px solid #e2e8f0;
                            padding: 4px 8px;
                            text-align: left;
                        }
                        .vitals-table th {
                            background-color: #f8fafc;
                            font-weight: bold;
                            width: 30%;
                        }
                    }
                    .vitals-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 5px;
                    }
                    .vitals-table td, .vitals-table th {
                        border: 1px solid #e2e8f0;
                        padding: 4px 8px;
                        text-align: left;
                    }
                    .vitals-table th {
                        background-color: #f8fafc;
                        font-weight: bold;
                        width: 30%;
                    }
                `}
            </style>

            <div className="p-0 min-h-screen flex flex-col relative scale-[0.98] content-page-buffer print-container">
                <div className="border-[1.5px] border-gray-200 p-8 flex-1 flex flex-col min-h-0 relative">

                    {/* 1. Header Section */}
                    <MainHeader
                        initialDetails={{
                            name: hospitalInfo?.name || data.hospitalName || 'Hospital Name',
                            address: (() => {
                                const parts = [
                                    hospitalInfo?.street,
                                    hospitalInfo?.landmark,
                                    hospitalInfo?.area,
                                    hospitalInfo?.city,
                                    hospitalInfo?.state
                                ].filter(Boolean);
                                const uniqueParts = Array.from(new Set(parts));
                                return uniqueParts.length > 0
                                    ? uniqueParts.join(', ')
                                    : (hospitalInfo?.address || data.hospitalAddress || '');
                            })(),
                            phone: hospitalInfo?.phone || data.hospitalPhone || '',
                            email: hospitalInfo?.email || data.hospitalEmail || '',
                            logo: hospitalInfo?.logo || data.hospitalLogo
                        }}
                    />

                    {/* Title */}
                    <div className="text-center mb-6 relative z-10">
                        <h2 className="text-[16px] font-bold uppercase underline decoration-2 underline-offset-4">DISCHARGE SUMMARY</h2>
                    </div>

                    {/* 2. Patient Information */}
                    <div className="mb-6 relative z-10">
                        <h3 className="font-bold mb-1 border-b border-gray-200 pb-0.5">Patient Information</h3>
                        <div className="grid grid-cols-2 text-[11px] border-t border-gray-100">
                            <div className="flex border-b border-r border-gray-100 p-1.5">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Patient Name</span>
                                <span>: {data.patientTitle} {data.patientName}</span>
                            </div>
                            <div className="flex border-b border-gray-100 p-1.5 pl-3">
                                <span className="font-bold w-36 shrink-0 text-gray-600">MRN / UHID</span>
                                <span>: {data.mrn}</span>
                            </div>
                            <div className="flex border-b border-r border-gray-100 p-1.5">
                                <span className="font-bold w-36 shrink-0 text-gray-600">DOB / Age</span>
                                <span>: {data.dob ? new Date(data.dob).toLocaleDateString() : 'N/A'} ({data.age})</span>
                            </div>
                            <div className="flex border-b border-gray-100 p-1.5 pl-3">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Gender / Blood Group</span>
                                <span>: {data.gender} {data.bloodGroup ? `(${data.bloodGroup})` : ''}</span>
                            </div>
                            <div className="flex border-b border-r border-gray-100 p-1.5">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Guardian Contact</span>
                                <span>: {data.phone || data.attendantPhone}</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Admission Details */}
                    <div className="mb-6 relative z-10">
                        <h3 className="font-bold mb-1 border-b border-gray-200 pb-0.5">Admission Details</h3>
                        <div className="grid grid-cols-2 text-[11px] border-t border-gray-100">
                            <div className="flex border-b border-r border-gray-100 p-1.5">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Admission ID</span>
                                <span>: {data.admissionId}</span>
                            </div>
                            <div className="flex border-b border-gray-100 p-1.5 pl-3">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Admission Type</span>
                                <span>: {data.admissionType || 'IPD'}</span>
                            </div>
                            <div className="flex border-b border-r border-gray-100 p-1.5">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Room / Bed</span>
                                <span>: {data.roomNo} / {data.bedNo || 'N/A'}</span>
                            </div>
                            <div className="flex border-b border-gray-100 p-1.5 pl-3">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Primary Doctor</span>
                                <span>: {data.primaryDoctor || data.suggestedDoctorName}</span>
                            </div>
                            <div className="flex border-b border-r border-gray-100 p-1.5">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Date Admitted</span>
                                <span>: {data.admissionDate ? new Date(data.admissionDate).toLocaleString() : 'N/A'}</span>
                            </div>
                            <div className="flex border-b border-gray-100 p-1.5 pl-3">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Date Discharged</span>
                                <span>: {data.dischargeDate ? new Date(data.dischargeDate).toLocaleString() : 'N/A'}</span>
                            </div>
                            <div className="col-span-2 flex border-b border-gray-100 p-1.5">
                                <span className="font-bold w-36 shrink-0 text-gray-600">Stay Duration</span>
                                <span>: {(() => {
                                    if (!data.admissionDate) return 'N/A';
                                    const startTime = new Date(data.admissionDate).getTime();
                                    const endTime = data.dischargeDate ? new Date(data.dischargeDate).getTime() : new Date().getTime();
                                    const diffInMs = Math.max(0, endTime - startTime);
                                    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
                                    const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
                                    if (hours >= 24) {
                                        const days = Math.floor(hours / 24);
                                        const remainingHours = hours % 24;
                                        return `${days} Day${days !== 1 ? 's' : ''}${remainingHours > 0 ? ` ${remainingHours} Hrs` : ''}`;
                                    }
                                    return `${hours} Hrs, ${minutes} Mins`;
                                })()}</span>
                            </div>
                        </div>
                    </div>

                    {/* 4. Vitals Section (Table Format) */}
                    {data.vitals && (
                        <div className="mb-6 break-inside-avoid relative z-10">
                            <h3 className="font-bold border-b border-gray-200 mb-1">Vital Signs at Discharge</h3>
                            <table className="vitals-table text-[10px]">
                                <tbody>
                                    <tr>
                                        <th>Height</th><td>{data.vitals.height || '-'} cm</td>
                                        <th>Weight</th><td>{data.vitals.weight || '-'} kg</td>
                                    </tr>
                                    <tr>
                                        <th>Blood Pressure</th><td>{data.vitals.bloodPressure || '-'} mmHG</td>
                                        <th>Temperature</th><td>{data.vitals.temperature || '-'} °F</td>
                                    </tr>
                                    <tr>
                                        <th>Pulse</th><td>{data.vitals.pulse || '-'} /min</td>
                                        <th>Respiratory Rate</th><td>{data.vitals.respiratoryRate || '-'} /min</td>
                                    </tr>
                                    <tr>
                                        <th>SpO2</th><td>{data.vitals.spO2 || '-'} %</td>
                                        <th>Glucose / Sugar</th><td>{data.vitals.glucose || data.vitals.sugar || '-'} {data.vitals.glucoseType ? `(${data.vitals.glucoseType})` : ''}</td>
                                    </tr>
                                    <tr>
                                        <th>Status</th><td>{data.vitals.status || '-'}</td>
                                        <th>Condition</th><td>{data.vitals.condition || '-'}</td>
                                    </tr>
                                    {data.vitals.notes && (
                                        <tr>
                                            <th>Vitals Notes</th><td colSpan={3}>{data.vitals.notes}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* 5, 6, 7. Clinical Content */}
                    <div className="space-y-4 relative z-10">
                        {/* Clinical Information */}
                        <div className="break-inside-avoid">
                            <h3 className="font-bold border-b border-black mb-1 uppercase text-xs">Clinical Information</h3>
                            <div className="space-y-3 mt-2">
                                {clinicalSections.map((s, idx) => s.value && (
                                    <div key={idx} className="mb-2">
                                        <span className="font-bold underline text-[10px]">{s.label}:</span>
                                        <p className="whitespace-pre-wrap ml-2 mt-1">{s.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Treatment & Procedures */}
                        <div className="break-inside-avoid">
                            <h3 className="font-bold border-b border-black mb-1 uppercase text-xs">Treatment & Procedures</h3>
                            <div className="space-y-3 mt-2">
                                {treatmentSections.map((s, idx) => s.value && (
                                    <div key={idx} className="mb-2">
                                        <span className="font-bold underline text-[10px]">{s.label}:</span>
                                        <p className="whitespace-pre-wrap ml-2 mt-1">{s.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Discharge Advice */}
                        <div className="break-inside-avoid">
                            <h3 className="font-bold border-b border-black mb-1 uppercase text-xs">Discharge Advice</h3>
                            <div className="space-y-3 mt-2">
                                {adviceSections.map((s, idx) => (s.value || s.subSections) && (
                                    <div key={idx} className="mb-2">
                                        <span className="font-bold underline text-[10px]">{s.label}:</span>
                                        {s.value && <p className="whitespace-pre-wrap ml-2 mt-1">{s.value}</p>}
                                        {s.subSections && (
                                            <div className="ml-4 mt-1 grid grid-cols-2 gap-2">
                                                {s.subSections.map((sub, sIdx) => sub.value && (
                                                    <p key={sIdx}><span className="font-medium underline">{sub.label}:</span> {sub.value}</p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 7. Billing & Insurance Section (Last) */}
                    <div className="mt-6 mb-6 relative z-10 break-inside-avoid">
                        <h3 className="font-bold mb-1 border-b border-gray-200 pb-0.5 uppercase text-xs">Billing & Insurance Details</h3>
                        <div className="grid grid-cols-2 text-[11px] border border-gray-200">
                            <div className="flex border-b border-r border-gray-100 p-2">
                                <span className="font-bold w-48 shrink-0 text-gray-600">Insurance / TPA Name</span>
                                <span>: {data.insuranceName || 'Self Pay'}</span>
                            </div>
                            <div className="flex border-b border-gray-100 p-2 pl-3">
                                <span className="font-bold w-48 shrink-0 text-gray-600">Payment Mode</span>
                                <span>: {data.paymentMode || 'N/A'}</span>
                            </div>

                            <div className="flex border-b border-r border-gray-100 p-2 bg-slate-50/50">
                                <span className="font-bold w-48 shrink-0 text-blue-800">Total Paid Amount</span>
                                <span className="font-bold text-blue-900">: ₹{data.totalPaidAmount?.toLocaleString() || (data.advanceAmount + (data.remainingAmount || 0))?.toLocaleString() || '0.00'}</span>
                            </div>
                            <div className="flex border-b border-gray-100 p-2 pl-3 bg-slate-50/50">
                                <span className="font-bold w-48 shrink-0 text-black">Total Bill Amount</span>
                                <span className="font-bold">: ₹{data.totalBillAmount?.toLocaleString() || '0.00'}</span>
                            </div>
                        </div>
                    </div>

                    {/* 8. Footer */}
                    <div className="mt-auto relative z-10">
                        <MainFooter
                            initialDetails={{
                                name: hospitalInfo?.name || data.hospitalName || 'Hospital Name',
                                address: hospitalInfo?.address || data.hospitalAddress || '',
                                phone: hospitalInfo?.phone || data.hospitalPhone || '',
                                email: hospitalInfo?.email || data.hospitalEmail || '',
                            }}
                        />
                        <div className="text-center text-[10px] font-bold mt-4 border-t border-gray-100 pt-2">
                            KEEP THE REPORTS CAREFULLY AND BRING THEM ALONG DURING YOUR NEXT VISIT TO OUR HOSPITAL
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

PrintableDischargeSummary.displayName = 'PrintableDischargeSummary';
