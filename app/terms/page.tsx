'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, FileText, CheckCircle, X, ChevronRight, Lock, Globe, Server } from 'lucide-react';
import { useRouter } from 'next/navigation';

const TermsPage = () => {
  const [agreed, setAgreed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  const handleContinue = () => {
    if (agreed) {
        setShowSuccess(true);
        setTimeout(() => {
            router.push('/');
        }, 1200);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-700">
      
      {/* Top Header Section - Premium Global Style */}
      <div className="w-full bg-[#1e40af] py-10 px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between relative z-10 gap-6">
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/15 backdrop-blur-xl rounded-[1.25rem] flex items-center justify-center border border-white/20 shadow-2xl">
                    <ShieldCheck className="text-white" size={32} strokeWidth={1.5} />
                </div>
                <div className="text-left">
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight italic">
                        Legal <span className="opacity-60 text-blue-200">&</span> Compliance
                    </h1>
                    <p className="text-blue-100/70 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">
                        Portal Accreditation Protocols v2.4
                    </p>
                </div>
            </div>
            
            <button 
                onClick={handleCancel}
                className="group flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-all border border-white/10 px-5 py-2.5 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-sm shadow-sm"
            >
                Return to Landing <X size={14} className="group-hover:rotate-90 transition-transform" />
            </button>
        </div>

        {/* Backdrop patterns */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-[80px]" />
      </div>

      {/* Main Body Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-10 lg:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left: Professional Document Area (70%) */}
            <div className="lg:col-span-8 bg-white rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.03)] border border-slate-100/80 overflow-hidden flex flex-col">
                <div className="p-8 md:p-12 h-[600px] overflow-y-auto custom-scrollbar bg-white/50 backdrop-blur-sm">
                    <div className="space-y-12">
                        {/* Section 1 */}
                        <div className="relative pl-12">
                            <div className="absolute left-0 top-1 w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                                <FileText size={16} className="text-blue-600" />
                            </div>
                            <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tight mb-4">1. Identification & Services</h2>
                            <p className="text-slate-500 font-medium leading-relaxed text-sm antialiased">
                                Welcome to the <span className="font-black text-slate-900 italic">MSCureChain Platform</span>. These terms govern your professional engagement with our clinical services, software solutions, and diagnostic modules. By authenticating your portal credentials, you acknowledge and agree to abide by these established protocols.
                            </p>
                        </div>

                        {/* Section 2 */}
                        <div className="relative pl-12">
                            <div className="absolute left-0 top-1 w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                                <Lock size={16} className="text-blue-600" />
                            </div>
                            <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tight mb-4">2. Data Sovereignty & Encryption</h2>
                            <p className="text-slate-500 font-medium leading-relaxed text-sm antialiased">
                                MSCureChain enforces strict AES-256 bit encryption for all patient-identifiable data. Our system maintains compliance with international healthcare standards including HIPAA and GDPR. Users are strictly prohibited from attempting to bypass encryption layers or exfiltrate private diagnostic data.
                            </p>
                        </div>

                        {/* Section 3 */}
                        <div className="relative pl-12">
                            <div className="absolute left-0 top-1 w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                                <Server size={16} className="text-blue-600" />
                            </div>
                            <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tight mb-4">3. User Credentials & Liabilities</h2>
                            <p className="text-slate-500 font-medium leading-relaxed text-sm antialiased">
                                Access keys are personal and non-transferable. Authorized medical practitioners are responsible for all actions performed under their verified credentials. MSCureChain provides clinical decision-support but does not replace the specialized judgment of licensed medical personnel.
                            </p>
                        </div>

                        {/* Section 4 */}
                        <div className="relative pl-12">
                            <div className="absolute left-0 top-1 w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                                <Globe size={16} className="text-blue-600" />
                            </div>
                            <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tight mb-4">4. Global Service Level Agreement</h2>
                            <p className="text-slate-500 font-medium leading-relaxed text-sm antialiased">
                                Our infrastructure guarantees 99.9% uptime for core clinical portals. Maintenance windows are professionally scheduled to minimize disruption to critical hospital operations. We reserve the right to suspend accounts found to be in violation of ethical medical computing standards.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Sticky Action Sidebar (30%) */}
            <div className="lg:col-span-4 sticky top-12 space-y-6">
                <div className="bg-white rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.06)] border border-slate-100 p-8 md:p-10 flex flex-col gap-8">
                    
                    <div 
                        className="flex flex-col gap-6"
                    >
                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Agreement Status</h3>
                            <div 
                                onClick={() => setAgreed(!agreed)}
                                className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer group ${
                                    agreed 
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200' 
                                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-200 hover:bg-slate-100'
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                    agreed ? 'bg-white border-white' : 'border-slate-300'
                                }`}>
                                    {agreed && <CheckCircle size={14} className="text-blue-600 stroke-[3]" />}
                                </div>
                                <span className={`text-[11px] font-black uppercase tracking-widest leading-none selection:bg-none ${
                                    agreed ? 'text-white' : 'text-slate-500'
                                }`}>
                                    I accept all protocols & terms
                                </span>
                            </div>
                        </div>

                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed tracking-wider italic">
                            By checking this box, you confirm that you have read, understood, and agreed to the clinical governance of MSCureChain.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            disabled={!agreed}
                            onClick={handleContinue}
                            className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.25em] transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 ${
                                agreed 
                                ? 'bg-[#1e40af] text-white shadow-2xl shadow-blue-600/30 hover:bg-[#1e3a8a]' 
                                : 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200/50'
                            }`}
                        >
                           Proceed to Portal <ChevronRight size={14} />
                        </button>
                        <button 
                            onClick={handleCancel}
                            className="w-full py-4 rounded-xl border border-slate-100 bg-white text-slate-400 font-black text-[10px] uppercase tracking-[0.25em] hover:text-slate-900 transition-all shadow-sm active:scale-95"
                        >
                            Decline Access
                        </button>
                    </div>

                    <AnimatePresence>
                        {showSuccess && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className="p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3"
                            >
                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-200 text-white">
                                    <CheckCircle size={16} />
                                </div>
                                <div className="text-left font-black tracking-tight uppercase italic flex flex-col">
                                    <span className="text-[10px] text-green-600">Authentication</span>
                                    <span className="text-[8px] text-green-400 uppercase tracking-widest leading-none">Access Granted</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Visual context labels */}
                <div className="flex items-center justify-between px-6 opacity-40 grayscale group hover:grayscale-0 transition-all cursor-default">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">MSCUREÂ® SECURITY</p>
                    <div className="flex gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                         <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    </div>
                </div>
            </div>
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default TermsPage;
