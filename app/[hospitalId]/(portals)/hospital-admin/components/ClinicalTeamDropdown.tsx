'use client';

import React, { useState, useRef, useEffect } from "react";
import {
    Stethoscope,
    Activity,
    Users,
    ChevronDown,
    UserPlus
} from "lucide-react";
import { useRouter } from "next/navigation";

const ClinicalTeamDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const teamLinks = [
        {
            label: "Doctor List",
            path: "/hospital-admin/doctors",
            icon: Stethoscope,
            color: "text-emerald-500",
            bg: "bg-emerald-50"
        },
        {
            label: "Nurse Registry",
            path: "/hospital-admin/nurses",
            icon: Activity,
            color: "text-blue-500",
            bg: "bg-blue-50"
        },
        {
            label: "Personnel List",
            path: "/hospital-admin/staff",
            icon: Users,
            color: "text-indigo-500",
            bg: "bg-indigo-50"
        },
        {
            label: "Patient Hourly Record",
            path: "/hospital-admin/patient-hourly-record",
            icon: Activity,
            color: "text-rose-500",
            bg: "bg-rose-50"
        }
    ];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 hover:bg-white hover:shadow-sm py-1.5 px-4 rounded-xl transition-all group"
            >
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider hidden sm:block">
                    Clinical Team
                </span>
                <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl shadow-xl border border-slate-200 bg-white/95 backdrop-blur-md z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-1.5">
                    <div className="px-3 py-2 border-b border-slate-50 mb-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medical Personnel</p>
                    </div>
                    {teamLinks.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => {
                                router.push(item.path);
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-3 text-xs font-bold transition-all hover:bg-slate-50 rounded-xl group text-slate-600 hover:text-slate-900"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${item.bg} ${item.color} transition-colors`}>
                                    <item.icon size={16} />
                                </div>
                                <span>{item.label}</span>
                            </div>
                            <ChevronDown size={14} className="text-slate-300 -rotate-90 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClinicalTeamDropdown;
