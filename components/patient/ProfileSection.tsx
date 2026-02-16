import React from 'react';
import { User, Phone, Activity, FileText, Droplets, Thermometer, Heart, Wind } from 'lucide-react';
import { Card } from '@/components/admin';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ProfileSectionProps {
    profile: any;
    appointments: any[];
}

function ProfileSection({ profile, appointments }: ProfileSectionProps) {
    if (!profile) {
        return (
            <Card className="p-8 text-center border-dashed border-2">
                <User className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium tracking-tight">Profile credentials not found in vault</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 uppercase font-black text-[10px] tracking-widest">Authentication Required</p>
            </Card>
        );
    }

    // Extract vitals history from appointments
    const vitalsHistory = (appointments || [])
        .filter(app => app.vitals && (app.vitals.bloodPressure || app.vitals.bp || app.vitals.temperature || app.vitals.weight))
        .map(app => ({
            date: app.date,
            hospital: app.hospital?.name,
            vitals: app.vitals
        }));

    // Get latest vitals (either from profile or most recent appointment)
    const latestAppointmentVitals = vitalsHistory[0]?.vitals || {};
    const displayVitals = {
        height: latestAppointmentVitals.height || profile.height,
        weight: latestAppointmentVitals.weight || profile.weight,
        bloodPressure: latestAppointmentVitals.bloodPressure || latestAppointmentVitals.bp || profile.bloodPressure,
        temperature: latestAppointmentVitals.temperature || profile.temperature,
        pulse: latestAppointmentVitals.pulse || latestAppointmentVitals.pulseRate || profile.pulse,
        spO2: latestAppointmentVitals.spO2 || latestAppointmentVitals.spo2 || profile.spO2,
        glucose: latestAppointmentVitals.glucose || latestAppointmentVitals.sugar || profile.glucose || profile.sugar,
        glucoseType: latestAppointmentVitals.glucoseType || profile.glucoseType,
        bloodGroup: profile.bloodGroup
    };

    const downloadPDF = async () => {
        // 1. DATA PREP
        const name = profile.user?.name || profile.name || 'N/A';
        const mrn = profile.mrn || 'N/A';
        const age = profile.dob ? (profile as any).age + ' Y' : profile.age ? profile.age + ' Y' : '---';
        const gender = profile.gender || '---';
        const email = profile.user?.email || profile.email || profile.emergencyContactEmail || profile.contactEmail || '---';
        const mobile = profile.contactNumber || profile.user?.mobile || profile.mobile || '---';
        const address = profile.address || '---';

        // 2. CREATE CLEAN CONTAINER
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '800px';
        container.style.minWidth = '800px';
        container.style.maxWidth = '800px';
        container.style.padding = '50px';
        container.style.background = '#ffffff';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.color = '#1e293b';
        container.style.boxSizing = 'border-box';

        container.innerHTML = `
            <table style="width: 100%; margin-bottom: 30px; border-bottom: 3px solid #1e293b; padding-bottom: 20px; border-collapse: separate; border-spacing: 0;">
                <tr>
                    <td style="vertical-align: bottom; text-align: left;">
                        <h1 style="margin: 0; font-size: 32px; letter-spacing: 1px; white-space: nowrap;">MEDICAL REPORT</h1>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px; font-weight: bold;">CURECHAIN HEALTH SYSTEMS</p>
                    </td>
                    <td style="vertical-align: bottom; text-align: right;">
                        <p style="margin: 0; font-size: 14px; color: #64748b; white-space: nowrap;">Report Date: ${new Date().toLocaleDateString()}</p>
                        <p style="margin: 2px 0 0 0; font-size: 14px; color: #3b82f6; font-weight: bold; white-space: nowrap;">MRN: ${mrn}</p>
                    </td>
                </tr>
            </table>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
                <div>
                    <h2 style="font-size: 14px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase;">Patient Identity</h2>
                    <p style="margin: 5px 0; font-size: 18px; font-weight: bold;">${name}</p>
                    <p style="margin: 2px 0; font-size: 14px;">Gender: ${gender}</p>
                    <p style="margin: 2px 0; font-size: 14px;">Age: ${age}</p>
                </div>
                <div>
                    <h2 style="font-size: 14px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase;">Contact info</h2>
                    <p style="margin: 5px 0; font-size: 14px;">Phone: ${mobile}</p>
                    <p style="margin: 2px 0; font-size: 14px;">Email: ${email}</p>
                    <p style="margin: 2px 0; font-size: 14px;">Address: ${address}</p>
                </div>
            </div>

            <h2 style="font-size: 14px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 15px; text-transform: uppercase;">Current Vitals</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 40px;">
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase;">Height/Weight</p>
                    <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold;">${displayVitals.height}cm / ${displayVitals.weight}kg</p>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase;">Blood Pressure</p>
                    <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: #ef4444;">${displayVitals.bloodPressure}</p>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase;">Heart Rate</p>
                    <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: #10b981;">${displayVitals.pulse} BPM</p>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
                <div>
                    <h2 style="font-size: 14px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase;">Medical Conditions</h2>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Issues:</strong> ${profile.conditions || 'None'}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Allergies:</strong> ${profile.allergies || 'None'}</p>
                </div>
                <div>
                    <h2 style="font-size: 14px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase;">Medical History</h2>
                    <p style="margin: 5px 0; font-size: 13px; line-height: 1.5;">${profile.medicalHistory || 'No history recorded.'}</p>
                </div>
            </div>

            <p style="margin-top: 100px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
                This is a computer-generated medical document. Patient confidentiality applies.
            </p>
        `;

        document.body.appendChild(container);

        try {
            // No nuclear purge needed because we aren't using global classes in this container!
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
            pdf.save(`Medical_Report_${name.replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error('PDF Export Error:', error);
            alert('PDF Export failed. Please try again.');
        } finally {
            document.body.removeChild(container);
        }
    };

    return (
        <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 px-1">
                <div>
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">
                        My <span className="text-blue-600">Profile</span>
                    </h2>
                    <p className="text-gray-400 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mt-0.5">Identity & Vitals</p>
                </div>
            </div>

            <div id="profile-content" className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                    {/* Identity Card */}
                    <div className="bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-blue-50 dark:bg-blue-900/20 rounded-lg sm:rounded-xl flex items-center justify-center text-blue-600">
                                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </div>
                            <h3 className="font-black uppercase text-[8px] sm:text-[9px] tracking-widest text-gray-400">Identity</h3>
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                            {[
                                { label: 'Name', value: profile.user?.name || profile.name },
                                { label: 'ID', value: profile.mrn, mono: true, color: 'text-blue-600' },
                                { label: 'Gender', value: profile.gender || '---' },
                                { label: 'Age', value: profile.dob ? (profile as any).age + ' Y' : profile.age ? profile.age + ' Y' : '---' }
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center py-1 sm:py-1.5 border-b border-gray-50 dark:border-white/5 last:border-0">
                                    <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider ">{item.label}</span>
                                    <span className={`font-bold text-[10px] sm:text-xs uppercase ${item.mono ? 'font-mono' : ''} ${item.color || 'text-gray-900 dark:text-white'}`}>
                                        {item.value || '---'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Contact Card */}
                    <div className="bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-green-50 dark:bg-green-900/20 rounded-lg sm:rounded-xl flex items-center justify-center text-green-600">
                                <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </div>
                            <h3 className="font-black uppercase text-[8px] sm:text-[9px] tracking-widest text-gray-400">Contact</h3>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            {[
                                { label: 'Mobile', value: profile.contactNumber || profile.user?.mobile || profile.mobile },
                                { label: 'Email', value: profile.user?.email || profile.email || profile.emergencyContactEmail || '---', lowercase: true },
                                { label: 'Address', value: profile.address || '---' }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col gap-0.5 py-2 border-b border-gray-50 dark:border-white/5 last:border-0">
                                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider ">{item.label}</span>
                                    <span className={`font-bold text-xs sm:text-sm ${item.lowercase ? '' : 'uppercase'} text-gray-900 dark:text-white truncate`}>
                                        {item.value || '---'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Vitals */}
                    <div className="bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-red-50 dark:bg-red-900/20 rounded-lg sm:rounded-xl flex items-center justify-center text-red-600">
                                <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </div>
                            <h3 className="font-black uppercase text-[8px] sm:text-[9px] tracking-widest text-gray-400">Vitals</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                            {[
                                { label: 'Height', value: displayVitals.height, unit: 'cm' },
                                { label: 'Weight', value: displayVitals.weight, unit: 'kg' },
                                { label: 'Blood', value: displayVitals.bloodGroup, color: 'text-red-500' },
                                { label: 'Temp', value: displayVitals.temperature, unit: '°F' },
                                { label: 'BP', value: displayVitals.bloodPressure, unit: 'mmHg', color: 'text-blue-600' },
                                { label: 'Pulse', value: displayVitals.pulse, unit: 'bpm', color: 'text-green-600' },
                                { label: 'Glucose', value: displayVitals.glucose, unit: displayVitals.glucoseType ? `(${displayVitals.glucoseType})` : '', color: 'text-amber-600' }
                            ].map((item, i) => (
                                <div key={i} className="bg-gray-50 dark:bg-white/5 p-1.5 sm:p-2 rounded-lg border border-gray-100 dark:border-white/5">
                                    <span className="text-[7px] sm:text-[8px] font-black uppercase text-gray-400 tracking-wider block mb-0.5">{item.label}</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`font-black text-[10px] sm:text-xs ${item.color || 'text-gray-900 dark:text-white'}`}>{item.value || '---'}</span>
                                        {item.unit && <span className="text-[7px] sm:text-[8px] text-gray-400 font-bold">{item.unit}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm space-y-5 sm:space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-orange-50 dark:bg-orange-900/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-orange-600">
                                < Droplets className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <h3 className="font-black uppercase text-[9px] sm:text-[10px] tracking-widest text-gray-400">Conditions</h3>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            {[
                                { label: 'Issues', value: profile.conditions || 'None' },
                                { label: 'Allergies', value: profile.allergies || 'None', color: 'text-red-500' },
                                { label: 'Meds', value: profile.medications || 'None' }
                            ].map((item, i) => (
                                <div key={i} className="space-y-0.5">
                                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">{item.label}</span>
                                    <p className={`font-bold text-[11px] sm:text-xs uppercase leading-relaxed ${item.color || 'text-gray-700 dark:text-gray-300'}`}>
                                        {item.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* History */}
                    <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm space-y-5 sm:space-y-6 md:col-span-2">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-purple-50 dark:bg-purple-900/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-purple-600">
                                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <h3 className="font-black uppercase text-[9px] sm:text-[10px] tracking-widest text-gray-400">History</h3>
                        </div>
                        <p className="font-bold text-[11px] sm:text-xs uppercase leading-relaxed text-gray-700 dark:text-gray-300 italic">
                            {profile.medicalHistory || 'No history recorded.'}
                        </p>
                    </div>
                </div>

                {/* Vitals History */}
                {vitalsHistory.length > 0 && (
                    <div className="space-y-3 sm:space-y-4 py-6 sm:py-8">
                        <div>
                            <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-600" />
                                Vitals <span className="text-blue-600">Trend</span>
                            </h3>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-white/5 uppercase font-black text-[8px] sm:text-[9px] tracking-widest text-gray-400">
                                            <th className="py-4 px-4 sm:px-6">Timeline</th>
                                            <th className="py-4 px-4 sm:px-6">Weight/Height</th>
                                            <th className="py-4 px-4 sm:px-6">BP/Pulse</th>
                                            <th className="py-4 px-4 sm:px-6">Temp/O2</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                        {vitalsHistory.map((item, idx) => (
                                            <tr key={idx} className="group hover:bg-gray-50 dark:hover:bg-white/5">
                                                <td className="py-4 sm:py-6 px-4 sm:px-6">
                                                    <p className="font-black text-gray-900 dark:text-white text-xs sm:text-sm">
                                                        {format(new Date(item.date), 'MMM dd, yy')}
                                                    </p>
                                                    <p className="text-[8px] sm:text-[9px] text-gray-400 font-bold uppercase truncate max-w-[80px] sm:max-w-none">{item.hospital || 'Vault'}</p>
                                                </td>
                                                <td className="py-4 sm:py-6 px-4 sm:px-6">
                                                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 items-center">
                                                        <div className="flex items-center gap-1.5">
                                                            <Activity className="w-3 h-3 text-gray-400" />
                                                            <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300">{item.vitals.weight || '-'}kg</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <User className="w-3 h-3 text-gray-400" />
                                                            <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300">{item.vitals.height || '-'}cm</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 sm:py-6 px-4 sm:px-6">
                                                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 items-center">
                                                        <div className="flex items-center gap-1.5">
                                                            <Heart className="w-3 h-3 text-red-500" />
                                                            <span className="text-[10px] sm:text-xs font-bold text-blue-600">{item.vitals.bloodPressure || item.vitals.bp || '-'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Activity className="w-3 h-3 text-green-500" />
                                                            <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300">{item.vitals.pulse || item.vitals.pulseRate || '-'}bpm</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 sm:py-6 px-4 sm:px-6">
                                                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 items-center">
                                                        <div className="flex items-center gap-1.5">
                                                            <Thermometer className="w-3 h-3 text-orange-500" />
                                                            <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300">{item.vitals.temperature || '-'}°F</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Wind className="w-3 h-3 text-blue-400" />
                                                            <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300">{item.vitals.spO2 || item.vitals.spo2 || '-'}%</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Activity className="w-3 h-3 text-amber-600" />
                                                            <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300">{item.vitals.glucose || item.vitals.sugar || '-'}{item.vitals.glucoseType ? ` (${item.vitals.glucoseType})` : ''}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default React.memo(ProfileSection);
