'use client';
import React from 'react';


import { FlaskConical, Calendar, User, FileText, AlertCircle } from 'lucide-react';
import { Card } from '@/components/admin';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface Test {
    name: string;
    category: string;
    instructions?: string;
}

interface LabRecord {
    _id: string;
    tokenNumber: string;
    tests: Test[];
    priority: 'routine' | 'urgent' | 'stat';
    status: 'pending' | 'collected' | 'processing' | 'completed';
    notes?: string;
    createdAt: string;
    doctor: {
        user?: {
            name: string;
        };
        name?: string; // Fallback
        specialties?: string[];
    };
    hospital: {
        name: string;
    };
    appointment?: {
        appointmentId: string;
        date: string;
    };
}

interface LabRecordsSectionProps {
    labRecords: LabRecord[];
    patientName?: string;
    patientEmail?: string;
}

export default function LabRecordsSection({
    labRecords,
    patientName = 'Valued Patient',
    patientEmail = ''
}: LabRecordsSectionProps) {
    const downloadPDF = async (recordId: string) => {
        const record = labRecords.find(r => r._id === recordId);
        if (!record) return;

        // 1. DATA PREP
        const doctorName = record.doctor?.name || record.doctor?.user?.name || 'Staff Practitioner';
        const hospitalName = record.hospital?.name || 'Diagnostic Center';
        const pName = patientName || 'Valued Patient';
        const pEmail = patientEmail || '';
        const date = record.createdAt ? new Date(record.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

        // 2. CREATE CLEAN CONTAINER
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '800px';
        container.style.minWidth = '800px';
        container.style.maxWidth = '800px';
        container.style.padding = '60px';
        container.style.background = '#ffffff';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.color = '#1e293b';
        container.style.boxSizing = 'border-box';

        container.innerHTML = `
            <table style="width: 100%; margin-bottom: 30px; border-bottom: 3px solid #1e293b; padding-bottom: 20px; border-collapse: separate; border-spacing: 0;">
                <tr>
                    <td style="vertical-align: bottom; text-align: left;">
                        <h1 style="margin: 0; font-size: 32px; color: #1e293b; letter-spacing: 2px; white-space: nowrap;">LABORATORY REPORT</h1>
                        <p style="margin: 5px 0 0 0; color: #64748b;">Report Date: ${date}</p>
                    </td>
                    <td style="vertical-align: bottom; text-align: right;">
                        <p style="margin: 0; font-weight: bold; font-size: 18px; white-space: nowrap;">${hospitalName}</p>
                        <p style="margin: 2px 0 0 0; font-size: 14px;">Ref: #LAB-${recordId.slice(-6).toUpperCase()}</p>
                        <p style="margin: 2px 0 0 0; font-size: 14px; color: #3b82f6; font-weight: bold;">Status: ${record.status.toUpperCase()}</p>
                    </td>
                </tr>
            </table>

            <div style="margin-bottom: 40px; background: #f8fafc; padding: 25px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #64748b; font-size: 10px; font-weight: bold; text-transform: uppercase; padding-bottom: 5px;">Patient Details</td>
                        <td style="color: #64748b; font-size: 10px; font-weight: bold; text-transform: uppercase; padding-bottom: 5px;">Referred By</td>
                    </tr>
                    <tr>
                        <td>
                            <div style="font-size: 22px; font-weight: bold; color: #000;">${pName}</div>
                            ${pEmail ? `<div style="font-size: 13px; color: #64748b; margin-top: 2px;">${pEmail}</div>` : ''}
                        </td>
                        <td style="font-size: 16px; vertical-align: top;">Dr. ${doctorName}</td>
                    </tr>
                </table>
            </div>

            <h2 style="font-size: 16px; font-weight: bold; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">TESTS REQUESTED</h2>
            <div style="margin-bottom: 40px;">
                ${record.tests.map(test => `
                    <div style="padding: 15px; border-bottom: 1px solid #f1f5f9; background: #fff;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <span style="font-size: 16px; font-weight: bold; color: #000;">${test.name}</span>
                            <span style="font-size: 12px; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 12px;">${test.category}</span>
                        </div>
                        ${test.instructions ? `<p style="margin: 5px 0 0 0; font-size: 13px; color: #64748b; font-style: italic;">Inst: ${test.instructions}</p>` : ''}
                    </div>
                `).join('')}
            </div>

            ${record.notes ? `
                <div style="margin-top: 30px; background: #fffbeb; border: 1px solid #fde68a; padding: 15px; border-radius: 8px;">
                    <h3 style="font-size: 14px; color: #92400e; margin: 0 0 5px 0; text-transform: uppercase;">Clinical Notes</h3>
                    <p style="margin: 0; font-size: 13px; color: #92400e;">${record.notes}</p>
                </div>
            ` : ''}

            <div style="margin-top: 100px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div style="font-size: 11px; color: #94a3b8;">
                    <p style="margin: 0;">Verified digitally at ${hospitalName}</p>
                    <p style="margin: 2px 0 0 0;">CureChain Secure Medical Ecosystem</p>
                </div>
                <div style="text-align: center; width: 220px;">
                    <div style="border-top: 2px solid #1e293b; padding-top: 10px;">
                        <p style="margin: 0; font-weight: bold; font-size: 14px;">Authorized Medical Officer</p>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">(Digital Authentication)</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(container);

        try {
            const canvas = await html2canvas(container, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: 800, // Match container width
                windowWidth: 1200,
                x: 0,
                y: 0
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`LabReport_${pName.replace(/\s+/g, '_')}_${date}.pdf`);
        } catch (error) {
            console.error('Lab Report Export Error:', error);
            alert('Lab Report Export failed. Please try again.');
        } finally {
            document.body.removeChild(container);
        }
    };

    const getStatusColor = (status: string) => {
        const s = (status || '').toLowerCase();
        const colors: Record<string, string> = {
            'pending': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            'collected': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            'processing': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            'completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        };
        return colors[s] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    };

    const getPriorityColor = (priority: string) => {
        const p = (priority || '').toLowerCase();
        const colors: Record<string, string> = {
            'routine': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            'urgent': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            'stat': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        return colors[p] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    };

    if (!labRecords || labRecords.length === 0) {
        return (
            <Card className="p-8 text-center">
                <FlaskConical className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No lab records found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your lab test records will appear here</p>
            </Card>
        );
    }

    return (
        <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 px-1">
                <div>
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">
                        Lab <span className="text-purple-600">Results</span>
                    </h2>
                    <p className="text-gray-400 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mt-0.5">Analytical Test Reports</p>
                </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
                {labRecords.map((record) => (
                    <div key={record._id} id={`lab-record-${record._id}`} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-lg group relative">
                        {/* Status Accents */}
                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-600 rounded-l-xl sm:rounded-l-2xl" />

                        {/* Metadata Header */}
                        <div className="flex flex-col md:flex-row gap-2 sm:gap-3 mb-3 sm:mb-4 border-b border-gray-50 dark:border-white/5 pb-3 sm:pb-4">
                            <div className="flex-1 space-y-1 sm:space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-50 dark:bg-purple-900/20 rounded-lg sm:rounded-xl flex items-center justify-center text-purple-600">
                                        <FlaskConical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-950 dark:text-white text-sm sm:text-base uppercase tracking-tight">
                                            Lab Record
                                        </h3>
                                        <p className="text-xs sm:text-sm font-black font-mono text-purple-600 tracking-wider">#{record.tokenNumber}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
                                <span className={`px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest shadow-sm ${getStatusColor(record.status)}`}>
                                    {record.status?.toUpperCase() || 'UNKNOWN'}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest shadow-sm ${getPriorityColor(record.priority)}`}>
                                    {record.priority?.toUpperCase() || 'ROUTINE'}
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
                            {/* Record Details */}
                            <div className="lg:col-span-4 space-y-2 sm:space-y-3">
                                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-1 gap-2">
                                    <div className="bg-gray-50 dark:bg-white/5 p-2.5 sm:p-3 rounded-lg sm:rounded-xl space-y-0.5">
                                        <h4 className="text-[7px] sm:text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                            <User className="w-2.5 h-2.5 text-purple-600" />
                                            Doctor
                                        </h4>
                                        <p className="text-[10px] sm:text-xs font-black text-gray-900 dark:text-white uppercase truncate">
                                            {record.doctor?.user?.name || record.doctor?.name || 'Authorized'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-white/5 p-2.5 sm:p-3 rounded-lg sm:rounded-xl space-y-0.5">
                                        <h4 className="text-[7px] sm:text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                            <Calendar className="w-2.5 h-2.5 text-purple-600" />
                                            Order Date
                                        </h4>
                                        <p className="text-[10px] sm:text-xs font-black text-gray-900 dark:text-white uppercase truncate">
                                            {format(new Date(record.createdAt), 'MMM dd, p')}
                                        </p>
                                    </div>
                                </div>

                                {record.notes && (
                                    <div className="bg-amber-50/50 dark:bg-amber-900/10 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-amber-100/50 dark:border-amber-900/20 space-y-0.5">
                                        <h4 className="text-[7px] sm:text-[8px] font-black text-amber-600 uppercase tracking-widest">Notes</h4>
                                        <p className="text-[9px] sm:text-[10px] font-bold text-amber-800 dark:text-amber-300 leading-relaxed italic uppercase">
                                            &ldquo;{record.notes}&rdquo;
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Tests */}
                            <div className="lg:col-span-8">
                                <div className="space-y-2">
                                    <h4 className="text-[8px] sm:text-[9px] font-black text-gray-950 dark:text-white uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                        <FlaskConical className="w-3 h-3 text-purple-600" />
                                        Tests
                                    </h4>

                                    <div className="grid grid-cols-1 gap-2">
                                        {record.tests.map((test, idx) => (
                                            <div key={idx} className="bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-white/5 rounded-lg sm:rounded-xl p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 group-hover:border-purple-200">
                                                <div className="space-y-0.5">
                                                    <h5 className="font-black text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-tight">
                                                        {test.name}
                                                    </h5>
                                                    <p className="text-[7px] sm:text-[8px] font-bold text-gray-400 uppercase">{test.category}</p>
                                                </div>
                                                {test.instructions && (
                                                    <div className="flex items-center gap-2 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg max-w-[200px]">
                                                        <AlertCircle className="w-3 h-3 shrink-0" />
                                                        <span className="text-[9px] font-bold uppercase truncate">{test.instructions}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-50 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                            <div className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="text-gray-300">Facility:</span>
                                {record.hospital?.name}
                            </div>
                            <div className="text-[8px] sm:text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest font-mono">
                                HASH: {record._id.slice(-12).toUpperCase()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


