'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, FileText, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface TermsSectionProps {
    onAccept: () => void;
    hasAgreed: boolean;
}

const TermsSection: React.FC<TermsSectionProps> = ({ onAccept, hasAgreed }) => {
    const [agreed, setAgreed] = useState(false);
    const [showError, setShowError] = useState(false);

    useEffect(() => {
        if (hasAgreed) {
            setAgreed(true);
        }
    }, [hasAgreed]);

    const handleContinue = () => {
        if (agreed) {
            onAccept();
        } else {
            setShowError(true);
        }
    };

    return (
        <section id="terms-section" className="py-24 bg-white relative overflow-hidden border-t border-slate-100">
            <div className="max-w-4xl mx-auto px-6">
                <div className="bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">
                    {/* Header */}
                    <div className="bg-primary-theme p-8 text-white flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                <ShieldCheck size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight">Terms & Conditions</h2>
                                <p className="text-white/70 text-sm font-medium">Please review and agree to proceed with MSCureChain portals</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 sm:p-12">
                        <div className="grid md:grid-cols-2 gap-12">
                            {/* Left Column: Terms */}
                            <div className="space-y-8 text-slate-600">
                                <section className="space-y-3">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                        <FileText size={18} className="text-primary-theme" />
                                        1. Data Privacy & Security
                                    </h3>
                                    <p className="text-sm leading-relaxed">
                                        MSCureChain prioritizes the security of patient and clinical data. All information stored on our platform is encrypted using AES-256 standards.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                        <FileText size={18} className="text-primary-theme" />
                                        2. Professional Usage
                                    </h3>
                                    <p className="text-sm leading-relaxed">
                                        Access to clinical portals is strictly for authorized medical personnel. Unauthorized access may lead to legal action.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                        <FileText size={18} className="text-primary-theme" />
                                        3. AI-Powered Suggestions
                                    </h3>
                                    <p className="text-sm leading-relaxed">
                                        AI-powered suggestions assist clinical decision-making. Final judgment lies solely with the medical practitioner.
                                    </p>
                                </section>
                            </div>

                            {/* Right Column: Agreement */}
                            <div className="bg-white rounded-3xl border border-slate-100 p-8 flex flex-col justify-center space-y-8 shadow-sm">
                                <div className="space-y-4">
                                    <label className="flex items-start gap-4 cursor-pointer group">
                                        <div className="relative flex items-center mt-1">
                                            <input
                                                type="checkbox"
                                                checked={agreed}
                                                disabled={hasAgreed}
                                                onChange={(e) => {
                                                    const isChecked = e.target.checked;
                                                    setAgreed(isChecked);
                                                    if (isChecked) {
                                                        setShowError(false);
                                                        onAccept();
                                                    }
                                                }}
                                                className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-slate-200 transition-all checked:bg-primary-theme checked:border-primary-theme hover:border-primary-theme/50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                            />
                                            <CheckCircle2
                                                size={16}
                                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-base font-bold text-slate-800 uppercase tracking-tight block">
                                                I agree to the Terms & Conditions
                                            </span>
                                            <p className="text-xs text-slate-500 font-medium">
                                                Checking this box will automatically unlock and navigate you to the portal.
                                            </p>
                                        </div>
                                    </label>

                                    {showError && (
                                        <motion.p
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="text-red-500 text-xs font-bold flex items-center gap-1.5 uppercase mt-4 ml-10"
                                        >
                                            <AlertCircle size={14} />
                                            Please check the agreement box to proceed
                                        </motion.p>
                                    )}
                                </div>

                                {hasAgreed ? (
                                    <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
                                        <CheckCircle2 size={20} className="shrink-0" />
                                        <span className="text-sm font-bold uppercase tracking-tight">Terms Accepted - Portals Unlocked</span>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 text-slate-500 p-4 rounded-xl border border-slate-100 flex items-center gap-3 italic">
                                        <ArrowRight size={18} className="shrink-0 animate-pulse" />
                                        <span className="text-xs font-bold uppercase tracking-tight">Agree to proceed immediately</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TermsSection;
