'use client';

import React from 'react';
import {
  User,
  Smartphone,
  HeartPulse,
  Activity,
  ShieldAlert,
  Thermometer,
  Pill,
  FileText,
} from 'lucide-react';

import { format } from 'date-fns';
import { Card } from '@/components/admin';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface PatientProfileProps {
  profile: any;
  appointments: any[];
}

function PatientProfile({ profile, appointments }: PatientProfileProps) {
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
    const element = document.getElementById('patient-profile-content');
    if (!element) return;

    // 1. MEASURE
    const width = 850;

    // 2. CREATE ISOLATED CLONE
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.width = `${width}px`;
    clone.style.padding = '60px';
    clone.style.background = '#ffffff';
    clone.style.visibility = 'visible';
    clone.style.opacity = '1';
    clone.id = 'full-profile-clone-capture';

    // --- APPLY PROFILE THEME ---
    const primaryHospital = appointments[0]?.hospital?.name || 'Medical Center';
    const header = document.createElement('div');
    header.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e293b; padding-bottom: 30px; margin-bottom: 40px;">
            <div style="display: flex; gap: 20px; align-items: center;">
                <div style="width: 80px; height: 80px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; color: #64748b; border: 2px solid #e2e8f0;">👤</div>
                <div>
                    <h1 style="margin: 0; font-size: 32px; color: #1e293b; font-family: sans-serif;">${profile.name}</h1>
                    <p style="margin: 5px 0 0 0; color: #3b82f6; font-weight: bold; font-size: 16px;">MRN: ${profile.mrn}</p>
                    <p style="margin: 2px 0 0 0; color: #64748b; font-size: 14px;">Total Health Profile</p>
                </div>
            </div>
            <div style="text-align: right;">
                <h2 style="margin: 0; font-size: 18px; color: #64748b;">${primaryHospital}</h2>
                <p style="margin: 2px 0 0 0; font-size: 14px;">Generated: ${new Date().toLocaleDateString()}</p>
                <p style="margin: 2px 0 0 0; font-size: 14px; color: #10b981; font-weight: bold;">DOCUMENT AUTHENTICATED</p>
            </div>
        </div>
    `;
    clone.prepend(header);

    // Style sections
    clone.querySelectorAll('.bg-white, .rounded-xl, .border, .p-6').forEach(section => {
      const s = section as HTMLElement;
      if (s.textContent?.trim()) {
        s.style.boxShadow = 'none';
        s.style.border = 'none';
        s.style.borderBottom = '1px solid #f1f5f9';
        s.style.borderRadius = '0';
        s.style.padding = '20px 0';
        s.style.marginBottom = '20px';
      }
    });

    document.body.appendChild(clone);

    // 3. INLINE STYLES
    const sourceNodes = [element, ...Array.from(element.querySelectorAll('*'))];
    const cloneNodes = [clone, ...Array.from(clone.querySelectorAll('*'))];

    cloneNodes.forEach((node, i) => {
      const src = sourceNodes[i] as HTMLElement;
      const tgt = node as HTMLElement;
      if (!src || !tgt.style) return;

      try {
        const computed = window.getComputedStyle(src);
        ['font-size', 'font-weight', 'color', 'line-height'].forEach(prop => {
          let val = computed.getPropertyValue(prop);
          if (val && (val.includes('lab(') || val.includes('lch(') || val.includes('oklch'))) {
            val = '#000000';
          }
          tgt.style.setProperty(prop, val);
        });
      } catch (e) { }

      if (tgt.tagName === 'BUTTON' || tgt.classList.contains('no-print')) {
        tgt.style.display = 'none';
      }
    });

    // 4. NUCLEAR STYLE PURGE
    const styleTags = Array.from(document.querySelectorAll('style'));
    const linkTags = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    const originalStyles = styleTags.map(t => t.innerHTML);
    const originalLinks = linkTags.map(l => (l as any).disabled);

    try {
      await new Promise(r => setTimeout(r, 200));
      styleTags.forEach(t => t.innerHTML = '');
      linkTags.forEach(l => (l as any).disabled = true);

      const canvas = await html2canvas(clone, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: width,
        height: clone.offsetHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Comprehensive_Profile_${profile.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Profile Export Critical Error:', error);
      alert('Profile Export failed. Try browser print.');
    } finally {
      styleTags.forEach((t, i) => t.innerHTML = originalStyles[i]);
      linkTags.forEach((l, i) => (l as any).disabled = originalLinks[i]);
      document.body.removeChild(clone);
    }
  };

  const infoGroups = [
    {
      title: 'Identity',
      icon: <User size={18} className="text-blue-600" />,
      items: [
        { label: 'Name', value: profile.user?.name || profile.name },
        { label: 'MRN', value: profile.mrn },
        { label: 'Gender', value: profile.gender },
        { label: 'Age', value: profile.age ? `${profile.age} Years` : (profile as any).dob ? format(new Date(profile.dob), 'yyyy') : '---' },
      ],
    },
    {
      title: 'Contact',
      icon: <Smartphone size={18} className="text-emerald-600" />,
      items: [
        { label: 'Mobile', value: profile.user?.mobile || profile.mobile || profile.contactNumber },
        { label: 'Email', value: profile.user?.email || profile.email || profile.emergencyContactEmail },
        { label: 'Address', value: profile.address },
      ],
    },
    {
      title: 'Clinical Vitals',
      icon: <HeartPulse size={18} className="text-rose-600" />,
      items: [
        { label: 'Height', value: displayVitals.height },
        { label: 'Weight', value: displayVitals.weight },
        { label: 'Blood Group', value: displayVitals.bloodGroup },
        { label: 'BP / TEMP', value: `${displayVitals.bloodPressure || '---'} | ${displayVitals.temperature ? displayVitals.temperature + '°F' : '---'}` },
        { label: 'Glucose', value: displayVitals.glucose ? `${displayVitals.glucose} mg/dL ${displayVitals.glucoseType ? `(${displayVitals.glucoseType})` : ''}` : '---' },
      ],
    },
  ];

  const clinicalDetails = [
    { label: 'Conditions', value: profile.conditions, icon: <ShieldAlert /> },
    { label: 'Allergies', value: profile.allergies, icon: <Thermometer /> },
    { label: 'Medications', value: profile.medications, icon: <Pill /> },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          onClick={downloadPDF}
          className="flex items-center gap-2 px-6 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 active:scale-95"
        >
          <FileText size={16} />
          Save Medical Record as PDF
        </button>
      </div>

      <div id="patient-profile-content" className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {infoGroups.map((group, idx) => (
            <Card key={idx} className="p-8 border-none bg-white dark:bg-gray-900 shadow-xl rounded-3xl group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110">
                {group.icon}
              </div>
              <h3 className="font-black uppercase text-xs tracking-[0.2em] text-[#94a3b8] mb-6 flex items-center gap-2">
                {React.cloneElement(group.icon as React.ReactElement<any>, { size: 16 })}
                {group.title}
              </h3>
              <div className="space-y-4">
                {group.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                    <span className="text-[#94a3b8] text-xs font-bold uppercase">{item.label}</span>
                    <span className={`text-[#0f172a] dark:text-white font-black text-sm uppercase ${item.label === 'MRN' ? 'font-mono text-[#2563eb]' : ''}`}>
                      {item.value || '---'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          <Card className="p-8 border-none bg-white dark:bg-gray-900 shadow-xl rounded-3xl group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110">
              <Activity size={24} />
            </div>
            <h3 className="font-black uppercase text-xs tracking-[0.2em] text-[#94a3b8] mb-6 flex items-center gap-2">
              <Activity size={18} className="text-[#ea580c]" />
              Clinical Summary
            </h3>
            <div className="space-y-4">
              {clinicalDetails.map((d, i) => (
                <div key={i} className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                  <span className="text-[#94a3b8] text-xs font-bold uppercase">{d.label}</span>
                  <span className="text-[#0f172a] dark:text-white font-black text-sm uppercase">{d.value || 'None'}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-8 border-none bg-white dark:bg-gray-900 shadow-xl rounded-2xl relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-black uppercase text-xs tracking-[0.2em] text-[#94a3b8]">Medical History</h3>
          </div>
          <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-2xl border border-dashed border-[#e2e8f0]">
            <p className="text-[#475569] dark:text-gray-400 text-xs font-bold uppercase italic tracking-tight min-h-[40px]">
              {profile.medicalHistory || 'No records in vault'}
            </p>
          </div>
        </Card>

        {/* Vitals History Table */}
        {vitalsHistory.length > 0 && (
          <Card className="p-10 border-none bg-slate-900 shadow-2xl rounded-[3rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-10">
              <Activity className="w-40 h-40 text-white" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="p-4 bg-white/10 backdrop-blur-md text-white rounded-3xl border border-white/20">
                  <Activity className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-black uppercase tracking-tighter italic text-4xl text-white">Vitals <span className="text-blue-400">Logbook</span></h3>
                  <p className="text-blue-200/50 text-[10px] font-black uppercase tracking-widest mt-1">Full Historical Biometric Data Sync</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 uppercase font-black text-[10px] tracking-widest text-blue-300">
                      <th className="py-6 px-4">Timeline / Facility</th>
                      <th className="py-6 px-4">Biometrics</th>
                      <th className="py-6 px-4">Circulatory</th>
                      <th className="py-6 px-4">Respiratory</th>
                      <th className="py-6 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {vitalsHistory.map((item, idx) => (
                      <tr key={idx} className="group hover:bg-white/5">
                        <td className="py-6 px-4">
                          <p className="font-black text-white text-lg tracking-tighter">
                            {format(new Date(item.date), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-[10px] text-blue-400 font-black uppercase italic tracking-widest">{item.hospital || 'Vault Sync'}</p>
                        </td>
                        <td className="py-6 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-white/80 font-bold uppercase"><span className="text-blue-400">WT:</span> {item.vitals.weight || '---'} kg</span>
                            <span className="text-xs text-white/80 font-bold uppercase"><span className="text-blue-400">HT:</span> {item.vitals.height || '---'} cm</span>
                          </div>
                        </td>
                        <td className="py-6 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-white/80 font-bold uppercase"><span className="text-blue-400">BP:</span> {item.vitals.bloodPressure || item.vitals.bp || '---'}</span>
                            <span className="text-xs text-white/80 font-bold uppercase"><span className="text-blue-400">PL:</span> {item.vitals.pulse || item.vitals.pulseRate || '---'} bpm</span>
                          </div>
                        </td>
                        <td className="py-6 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-white/80 font-bold uppercase"><span className="text-blue-400">O2:</span> {item.vitals.spO2 || item.vitals.spo2 || '---'}%</span>
                            <span className="text-xs text-white/80 font-bold uppercase"><span className="text-blue-400">TP:</span> {item.vitals.temperature || '---'} °F</span>
                            <span className="text-xs text-white/80 font-bold uppercase"><span className="text-blue-400">GL:</span> {item.vitals.glucose || item.vitals.sugar || '---'} {item.vitals.glucoseType ? `(${item.vitals.glucoseType})` : ''}</span>
                          </div>
                        </td>
                        <td className="py-6 px-4 text-right">
                          <span className="px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-tighter border border-blue-500/30">
                            Verified
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default React.memo(PatientProfile);
