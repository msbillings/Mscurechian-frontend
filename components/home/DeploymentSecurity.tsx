'use client';

import React from 'react';
import { Server, ShieldAlert, ShieldCheck, Database, Cloud, Lock } from 'lucide-react';
import ScrollReveal from '../animations/ScrollReveal';

const DeploymentSecurity = () => {
    const features = [
       {
    title:  "Built for 100% NABH Compliance",
    description: "We follow NABH regulations 100% by deploying the platform on the hospital’s own servers or private cloud. This ensures full control over patient data, system security, availability, and compliance without depending on third-party SaaS platforms.",
    icon: (
        <div className="relative">
            <Cloud className="w-16 h-16 text-slate-300" />
            <Server className="w-8 h-8 text-slate-700 absolute inset-0 m-auto mt-5" />
        </div>
    )
},
        {
            title: "Hospital Data Ownership",
            description: "All patient, clinical, and operational data remains fully owned and controlled by the hospital. No external storage, sharing, or unauthorized access is involved.",
            icon: (
                <div className="relative">
                    <ShieldAlert className="w-16 h-16 text-slate-300" />
                    <Database className="w-8 h-8 text-slate-700 absolute inset-0 m-auto" />
                </div>
            )
        },
        {
            title: "Secure Infrastructure",
            description: "Built with healthcare-grade security including data encryption, role-based access control, audit logs, and secure deployment practices to protect sensitive medical information.",
            icon: (
                <div className="relative">
                    <ShieldCheck className="w-16 h-16 text-slate-300" />
                    <Lock className="w-8 h-8 text-slate-700 absolute bottom-0 right-0 -mr-1 -mb-1" />
                    <ShieldCheck className="w-8 h-8 text-blue-600 absolute bottom-0 right-0 -mr-1 -mb-1 fill-blue-600" />
                </div>
            )
        }
    ];

    return (
        <section className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid md:grid-cols-3 gap-8">
                    {features.map((feature, idx) => (
                        <ScrollReveal key={idx} distance="30px" delay={idx * 150}>
                            <div className="group border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                                <div className="p-8 flex flex-col items-center justify-center bg-white border-b border-slate-100 flex-1 min-h-[180px]">
                                    <div className="mb-6 transform group-hover:scale-110 transition-transform duration-500">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 text-center uppercase tracking-tight">
                                        {feature.title}
                                    </h3>
                                </div>
                                <div className="p-6 bg-slate-50/50 flex-[2]">
                                    <p className="text-slate-600 text-[13px] leading-relaxed text-center font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default DeploymentSecurity;
