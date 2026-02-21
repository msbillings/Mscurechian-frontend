"use client";

import React, { useState } from 'react';
import {
    Shield,
    Building2,
    Activity,
    Bell,
    Lock,
    Users,
    Database,
    Smartphone,
    ArrowRight,
    CheckCircle2,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';
import Link from 'next/link';

interface SettingItem {
    label: string;
    desc: string;
    action?: string;
    status?: string;
    isToggle?: boolean;
    value?: boolean;
    link?: string;
}

interface SettingSection {
    id: string;
    title: string;
    icon: any;
    items: SettingItem[];
}

function HospitalAdminSettings() {
    const [activeSection, setActiveSection] = useState('security');

    const settingsSections: SettingSection[] = [
        {
            id: 'security',
            title: "Hospital Security",
            icon: Shield,
            items: [
                { label: "Access Control", desc: "Manage administrative roles and permissions", action: "Manage" },
                { label: "Data Encryption", desc: "Configure system-wide encryption protocols", action: "Active", status: "success" },
                { label: "Session Timeout", desc: "Auto-logout duration for inactive nodes", action: "15 Mins" }
            ]
        },
        {
            id: 'operational',
            title: "Operational Config",
            icon: Building2,
            items: [
                { label: "Facility Parameters", desc: "Update hospital-wide service configurations", action: "Update" },
                { label: "Clinical Note Parameters", desc: "Manage note types and visibility scopes", action: "Configure", link: "/hospital-admin/management/clinical-notes" },
                { label: "Resource Allocation", desc: "Optimized staffing and equipment logic", isToggle: true, value: true },
                { label: "Multi-Unit Sync", desc: "Synchronize data across ward clusters", isToggle: true, value: false }
            ]
        },
        {
            id: 'systems',
            title: "System Logs",
            icon: Activity,
            items: [
                { label: "Audit Frequency", desc: "Logging interval for system events", action: "Real-time" },
                { label: "Automated Reporting", desc: "Generate daily performance metrics", isToggle: true, value: true },
                { label: "Legacy Archive", desc: "Data retention policy for historical records", action: "3 Years" }
            ]
        }
    ];

    const activeData = settingsSections.find(s => s.id === activeSection) || settingsSections[0];

    return (
        <div className="max-w-6xl mx-auto space-y-8 p-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-1.5">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase">
                    Institutional Config
                </h1>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-1">
                    Hospital-Wide System Parameters & Topology
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-4 space-y-3">
                    {settingsSections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`w-full group flex items-center justify-between p-5 rounded-[1rem] transition-all border-2 ${activeSection === section.id
                                ? 'bg-primary-theme text-white shadow-xl shadow-slate-200'
                                : 'bg-white border-transparent hover:border-slate-100 text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <section.icon className={`w-5 h-5 ${activeSection === section.id ? 'text-blue-400' : 'text-slate-300 group-hover:text-blue-500'}`} />
                                <span className="text-xs font-black uppercase tracking-widest">{section.title}</span>
                            </div>
                            <ArrowRight size={14} className={activeSection === section.id ? 'opacity-100' : 'opacity-0'} />
                        </button>
                    ))}

                    <div className="mt-8 p-6 bg-white rounded-[1rem] text-gray-900 overflow-hidden relative group">
                        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <Building2 size={120} />
                        </div>
                        <h4 className="text-lg font-black uppercase leading-tight">Identity Mesh</h4>
                        <p className="text-gray-500 text-[9px] font-bold uppercase  mt-2 leading-relaxed">Update institutional information and branding</p>
                        <Link
                            href="/hospital-admin/hospital/details"
                            className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-white text-blue-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm active:scale-95"
                        >
                            Edit Profile
                        </Link>
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-8 bg-white border border-slate-100 rounded-[0.5rem] shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                    <div className="p-8 border-b border-slate-50 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                            <activeData.icon size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{activeData.title}</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Control Panel for {activeData.id} parameters</p>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-50 flex-1">
                        {activeData.items.map((item, i) => (
                            <div key={i} className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{item.label}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.desc}</p>
                                </div>

                                <div className="flex items-center">
                                    {item.isToggle ? (
                                        <button className={`p-1 rounded-full transition-all ${item.value ? 'text-blue-600' : 'text-slate-200'}`}>
                                            {item.value ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                        </button>
                                    ) : item.link ? (
                                        <Link href={item.link}>
                                            <span className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all active:scale-95 inline-block ${item.status === 'success'
                                                ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-600'
                                                : 'bg-white text-slate-500 border-slate-100 hover:border-slate-900 hover:text-slate-900'
                                                }`}>
                                                {item.action}
                                            </span>
                                        </Link>
                                    ) : (
                                        <button className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all active:scale-95 ${item.status === 'success'
                                            ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-600'
                                            : 'bg-white text-slate-500 border-slate-100 hover:border-slate-900 hover:text-slate-900'
                                            }`}>
                                            {item.action}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Parameter Integrity Verified</span>
                        </div>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Last Update: Real-time</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(HospitalAdminSettings);

