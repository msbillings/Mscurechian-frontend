'use client';

import React, { useState } from "react";
import {
    ChevronDown,
    ChevronRight,
    X
} from "lucide-react";
import { usePathname } from "next/navigation";

interface MenuItem {
    icon: any;
    label: string;
    path?: string;
    subItems?: { label: string; path: string }[];
}

interface SharedSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    menuItems: MenuItem[];
    branding: {
        logo: any;
        title: string;
        subtitle?: string;
    };
    onMenuItemClick: (path: string) => void;
    currentPath: string;
}

const SharedSidebar: React.FC<SharedSidebarProps> = ({
    isOpen,
    onClose,
    menuItems,
    branding,
    onMenuItemClick,
    currentPath
}) => {
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

    const toggleMenu = (label: string) => {
        setExpandedMenus((prev) => ({
            ...prev,
            [label]: !prev[label],
        }));
    };

    const BrandingIcon = branding.logo;

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-slate-900/20 z-30 backdrop-blur-sm transition-all duration-300"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed left-0 top-0 h-full w-64 flex flex-col z-40
                    transform transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                    ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                    border-r border-slate-200 bg-white shadow-xl lg:shadow-none
                `}
            >
                {/* Brand */}
                <div className="h-16 flex items-center px-6 border-b border-slate-100 justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-theme rounded-lg flex items-center justify-center shadow-lg shadow-primary-theme-200">
                            <BrandingIcon className="text-white" size={18} />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-slate-900 leading-none uppercase tracking-tighter">
                                {branding.title}
                            </h1>
                            {branding.subtitle && (
                                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-[0.2em]">
                                    {branding.subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable menu area */}
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
                    {menuItems.map((item) => {
                        const hasSubItems = item.subItems && item.subItems.length > 0;
                        const isExpanded = expandedMenus[item.label] || item.subItems?.some(s => currentPath === s.path);
                        const isActive = item.path
                            ? currentPath === item.path
                            : item.subItems?.some((s) => currentPath === s.path);
                        const IconComponent = item.icon;

                        return (
                            <div key={item.label} className="space-y-1">
                                <button
                                    onClick={() => {
                                        if (hasSubItems) {
                                            toggleMenu(item.label);
                                        } else if (item.path) {
                                            onMenuItemClick(item.path);
                                        }
                                    }}
                                    className={`
                                        flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 w-full text-left group
                                        ${isActive
                                            ? "bg-primary-theme-50 text-primary-theme shadow-sm border border-primary-theme-100/50"
                                            : "hover:bg-slate-50 text-slate-500 hover:text-slate-900"
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <IconComponent
                                            size={18}
                                            className={`transition-colors duration-300 ${isActive
                                                ? "text-primary-theme"
                                                : "text-slate-400 group-hover:text-primary-theme"
                                                }`}
                                        />
                                        <span className="uppercase tracking-widest">{item.label}</span>
                                    </div>
                                    {hasSubItems && (
                                        <div className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                                            <ChevronDown size={14} className={isActive ? "text-emerald-500" : "text-slate-300"} />
                                        </div>
                                    )}
                                </button>

                                {/* Sub Items */}
                                {hasSubItems && isExpanded && (
                                    <div className="ml-5 pl-4 border-l-2 border-slate-100 space-y-1 mt-1 animate-in slide-in-from-top-2 duration-300">
                                        {item.subItems?.map((sub) => (
                                            <button
                                                key={sub.path}
                                                onClick={() => onMenuItemClick(sub.path)}
                                                className={`
                                                    w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                                                    ${currentPath === sub.path
                                                        ? "text-primary-theme-700 bg-primary-theme-50"
                                                        : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                                                    }
                                                `}
                                            >
                                                {sub.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Footer area if needed */}
                <div className="p-4 border-t border-slate-100">
                    <div className="bg-slate-50 p-3 rounded-2xl flex items-center gap-3 border border-slate-200/50">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary-theme font-bold text-xs border border-primary-theme-100">
                            SYS
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">System Node</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active Status</p>
                        </div>
                    </div>
                </div>
            </aside>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #f1f5f9;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #e2e8f0;
                }
            `}</style>
        </>
    );
};

export default SharedSidebar;
