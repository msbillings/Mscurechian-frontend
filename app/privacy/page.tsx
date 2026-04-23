'use client';

import React from 'react';
import { ShieldCheck, Eye, Lock, Server, FileText, Smartphone, MapPin, HardDrive, Bell, Mail, ChevronRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

const PrivacyPolicyPage = () => {
  const router = useRouter();

  const sections = [
    {
      id: 's1',
      icon: <FileText size={18} className="text-blue-600" />,
      title: '1. Information We Collect',
      content: 'When you register for an account on the MS CureChain Patient App, we collect personal details including your Full Name, Mobile Number, Email Address, and encrypted Password. We also maintain profile information such as your Date of Birth, Gender, and Blood Group to provide tailored healthcare services.'
    },
    {
      id: 's2',
      icon: <Smartphone size={18} className="text-blue-600" />,
      title: '2. Mobile App Permissions',
      content: 'To provide essential digital healthcare features, our mobile application requires specific permissions:',
      subsections: [
        {
          label: 'Camera Permission',
          icon: <ShieldCheck size={14} className="text-blue-500" />,
          text: 'Used to scan QR codes for quick doctor/hospital discovery and appointment booking. Images are processed locally for scanning.'
        },
        {
          label: 'Location Permission',
          icon: <MapPin size={14} className="text-blue-500" />,
          text: 'Used to help you find nearby hospitals and clinics based on your current geographical area.'
        },
        {
          label: 'Storage Permission',
          icon: <HardDrive size={14} className="text-blue-500" />,
          text: 'Used to allow you to securely download and save medical reports, prescriptions, and lab results to your device.'
        },
        {
          label: 'Notification Permission',
          icon: <Bell size={14} className="text-blue-500" />,
          text: 'Used to send critical health alerts, appointment reminders, and status updates regarding your medical records.'
        }
      ]
    },
    {
      id: 's3',
      icon: <Lock size={18} className="text-blue-600" />,
      title: '3. Data Sovereignty & Security',
      content: 'All patient and hospital data entered into MS CureChain belongs exclusively to the patient and the respective hospital. We implement AES-256 bit encryption for all patient-identifiable data at rest and in transit. Your medical records are accessible only to you and the doctors you explicitly grant access to.'
    },
    {
      id: 's4',
      icon: <Server size={18} className="text-blue-600" />,
      title: '4. Data Usage & Sharing',
      content: 'We do NOT sell your personal health data to third-party marketers. Data is shared only with healthcare providers you book appointments with, integrated payment gateways for secure fee processing, and government regulatory bodies (like ABDM) when required by law.'
    },
    {
      id: 's5',
      icon: <Mail size={18} className="text-blue-600" />,
      title: '5. Contact & Legal',
      content: 'If you have any questions regarding our data practices or this policy, please contact our Data Protection Officer at privacy@mscurechain.com or legal@mscurechain.com.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-700">
      
      {/* Premium Header */}
      <div className="w-full bg-[#1e40af] py-12 px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between relative z-10 gap-6">
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/15 backdrop-blur-xl rounded-[1.25rem] flex items-center justify-center border border-white/20 shadow-2xl">
                    <ShieldCheck className="text-white" size={32} strokeWidth={1.5} />
                </div>
                <div className="text-left">
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight italic">
                        Privacy <span className="opacity-60 text-blue-200">&</span> Security
                    </h1>
                    <p className="text-blue-100/70 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">
                        Global Data Protection Protocols v3.1
                    </p>
                </div>
            </div>
            
            <button 
                onClick={() => router.push('/')}
                className="group flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-all border border-white/10 px-5 py-2.5 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-sm shadow-sm"
            >
                Back to Home <X size={14} className="group-hover:rotate-90 transition-transform" />
            </button>
        </div>

        {/* Backdrop patterns */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-[80px]" />
      </div>

      {/* Content Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-12">
        <div className="bg-white rounded-[2.5rem] shadow-[0_30px_80px_rgba(0,0,0,0.02)] border border-slate-100 p-8 md:p-16">
          <div className="mb-12 border-b border-slate-50 pb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-4">
              <Eye size={12} /> Compliance Notice
            </div>
            <h2 className="text-3xl font-black text-slate-900 italic tracking-tight">Last Updated: April 23, 2026</h2>
            <p className="text-slate-500 mt-4 font-medium leading-relaxed max-w-2xl">
              This policy governs how MS CureChain processes patient data across our web portals and mobile applications to ensure compliance with the Digital Personal Data Protection Act and international healthcare standards.
            </p>
          </div>

          <div className="space-y-16">
            {sections.map((section) => (
              <div key={section.id} className="relative pl-14">
                <div className="absolute left-0 top-1 w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                  {section.icon}
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight mb-4">
                  {section.title}
                </h3>
                <p className="text-slate-600 font-medium leading-relaxed antialiased">
                  {section.content}
                </p>

                {section.subsections && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    {section.subsections.map((sub, i) => (
                      <div key={i} className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 hover:border-blue-200 transition-colors group">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm text-blue-600">
                            {sub.icon}
                          </div>
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wider">{sub.label}</span>
                        </div>
                        <p className="text-[13px] text-slate-500 leading-relaxed font-medium">
                          {sub.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer Statement */}
          <div className="mt-20 pt-10 border-t border-slate-50 text-center">
            <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] italic mb-6">
              MS CureChain Security Division Â· Zero Trust Architecture
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                <ShieldCheck size={14} className="text-green-500" /> HIPAA Compliant
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                <ShieldCheck size={14} className="text-green-500" /> AES-256 Protected
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                <ShieldCheck size={14} className="text-green-500" /> DPDP Ready
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Sticky Action */}
      <div className="p-8 text-center bg-white border-t border-slate-100">
        <p className="text-xs font-medium text-slate-500 mb-4 italic">
          Looking for our Terms of Service instead?
        </p>
        <button 
          onClick={() => router.push('/terms')}
          className="inline-flex items-center gap-2 text-blue-600 font-black text-[11px] uppercase tracking-widest hover:text-blue-800 transition-colors"
        >
          View Terms of Conditions <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
