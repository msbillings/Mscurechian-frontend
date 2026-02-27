'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, FileText, Lock, Server, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TermsSectionProps {
    onAccept: () => void;
    hasAgreed: boolean;
}

const TermsSection: React.FC<TermsSectionProps> = ({ onAccept, hasAgreed }) => {
    const [agreed, setAgreed] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (hasAgreed) {
            setAgreed(true);
        }
    }, [hasAgreed]);

    const handleContinue = () => {
        if (agreed) {
            onAccept();
            router.push('/auth/login');
        }
    };

    const handleCancel = () => {
        setAgreed(false);
    };

    return (
        <section id="terms-section" className="py-16 bg-gray-50 flex items-center justify-center border-t border-gray-200">
            <div className="max-w-3xl w-full mx-auto px-4 sm:px-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                            <ShieldCheck className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                                Terms & Conditions
                            </h2>
                            <p className="text-xs font-medium text-gray-500 mt-0.5">
                                Please review the clinical portal usage terms before proceeding.
                            </p>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 sm:p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <FileText size={14} className="text-gray-400" />
                                    <h3 className="text-sm font-semibold text-gray-900">1. Service Introduction</h3>
                                </div>
                                <p className="text-gray-500 text-xs leading-relaxed pl-5">
                                    Welcome to the MSCureChain Platform. By accessing and using this medical technology website, you agree to abide by the following highly confidential terms.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <Lock size={14} className="text-gray-400" />
                                    <h3 className="text-sm font-semibold text-gray-900">2. Clinical Data & Compliance</h3>
                                </div>
                                <p className="text-gray-500 text-xs leading-relaxed pl-5">
                                    Our platform manages critical healthcare data. All clinical modules and records are encrypted. You must maintain adherence to healthcare laws.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <Server size={14} className="text-gray-400" />
                                    <h3 className="text-sm font-semibold text-gray-900">3. Access Authorization</h3>
                                </div>
                                <p className="text-gray-500 text-xs leading-relaxed pl-5">
                                    Access is granted exclusively to verified personnel. You are responsible for maintaining credentials. Breaches will result in termination.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <Globe size={14} className="text-gray-400" />
                                    <h3 className="text-sm font-semibold text-gray-900">4. Liability & Responsibility</h3>
                                </div>
                                <p className="text-gray-500 text-xs leading-relaxed pl-5">
                                    MSCureChain provides computational assistance. However, the final clinical judgment and patient care responsibility rest solely with the medical practitioner.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                        <label 
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={(e) => {
                                e.preventDefault();
                                setAgreed(!agreed);
                            }}
                        >
                            <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                                agreed 
                                ? 'bg-blue-600 border-blue-600' 
                                : 'bg-white border-gray-300 group-hover:border-blue-400'
                            }`}>
                                {agreed && <Check size={12} strokeWidth={3} className="text-white" />}
                            </div>
                            <span className="text-sm font-semibold text-gray-700 select-none">
                                I agree to the Terms & Conditions
                            </span>
                        </label>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button 
                                onClick={handleCancel}
                                className="flex-1 sm:flex-none px-5 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                disabled={!agreed}
                                onClick={handleContinue}
                                className={`flex-1 sm:flex-none px-5 py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm ${
                                    agreed 
                                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-200'
                                }`}
                            >
                                Agree and Continue
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TermsSection;
