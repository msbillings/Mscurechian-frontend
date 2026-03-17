'use client';

import React, { useState, useCallback } from "react";
import {
    ChevronDown,
    X
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useTenantLink } from "@/hooks/useTenantLink";

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
    /** Called with `true` when sidebar expands (hover/open), `false` when collapsed */
    onHoverChange?: (expanded: boolean) => void;
}

const SharedSidebar: React.FC<SharedSidebarProps> = ({
    isOpen,
    onClose,
    menuItems,
    branding,
    onMenuItemClick,
    currentPath,
    onHoverChange,
}) => {
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
    const [isHovered, setIsHovered] = useState(false);
    const { getPath } = useTenantLink();

    const toggleMenu = (label: string) => {
        setExpandedMenus((prev) => ({
            ...prev,
            [label]: !prev[label],
        }));
    };

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
        onHoverChange?.(true);
    }, [onHoverChange]);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
        onHoverChange?.(false);
    }, [onHoverChange]);

    const handleCollapse = useCallback(() => {
        // On mobile: close the drawer
        // On md: collapse the hover-expanded sidebar
        setIsHovered(false);
        onHoverChange?.(false);
        onClose();
    }, [onClose, onHoverChange]);

    // Sidebar is "expanded" if: mobile drawer is open, OR on md it's being hovered, OR on lg+ always
    // We control width & label visibility via isOpen (mobile) and isHovered (md)
    const isExpanded = isOpen || isHovered;

    const BrandingIcon = branding.logo;

    return (
        <>
            {/* Backdrop for mobile drawer */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-slate-900/30 z-30 backdrop-blur-sm transition-all duration-300"
                    onClick={handleCollapse}
                />
            )}

            {/* Backdrop for md hover-expanded sidebar — semi-transparent, clickable to collapse */}
            {isHovered && !isOpen && (
                <div
                    className="hidden md:block lg:hidden fixed inset-0 bg-slate-900/10 z-30"
                    onClick={handleCollapse}
                />
            )}

            {/* Sidebar */}
            <aside
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`
                    fixed left-0 top-0 h-full flex flex-col z-40
                    transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
                    border-r border-slate-200 bg-white shadow-xl lg:shadow-none
                    ${isOpen
                        ? "translate-x-0 w-64"                            // mobile: full drawer
                        : isHovered
                            ? "translate-x-0 md:translate-x-0 w-64"      // md hover: expanded
                            : "-translate-x-full md:translate-x-0 md:w-16 lg:w-64" // default
                    }
                `}
            >
                {/* Brand */}
                <div className="h-16 flex items-center px-3 border-b border-slate-100 justify-between overflow-hidden shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 shrink-0 bg-primary-theme rounded-lg flex items-center justify-center shadow-lg shadow-primary-theme-200">
                            <BrandingIcon className="text-white" size={18} />
                        </div>
                        {/* Title: hidden when collapsed on md */}
                        <div
                            className={`
                                min-w-0 overflow-hidden transition-all duration-300
                                ${isExpanded ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0 lg:opacity-100 lg:max-w-[160px]"}
                            `}
                        >
                            <h1 className="text-sm font-black text-slate-900 leading-none uppercase tracking-tighter whitespace-nowrap">
                                {branding.title}
                            </h1>
                            {branding.subtitle && (
                                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-[0.2em] whitespace-nowrap">
                                    {branding.subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* X button — visible when expanded (mobile open OR md hovered) but hidden on lg */}
                    <button
                        onClick={handleCollapse}
                        className={`
                            shrink-0 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all lg:hidden
                            ${isExpanded ? "flex" : "hidden"}
                        `}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable menu area */}
                <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 custom-scrollbar overflow-x-hidden">
                    {menuItems.map((item) => {
                        const hasSubItems = item.subItems && item.subItems.length > 0;
                        const isAutoExpanded = item.subItems?.some(s => currentPath === getPath(s.path));
                        const isMenuExpanded = expandedMenus[item.label] ?? isAutoExpanded;

                        const isActive = item.path
                            ? (item.path.split('/').length <= 2
                                ? currentPath.endsWith(item.path)
                                : currentPath === getPath(item.path) || currentPath.includes(getPath(item.path) + '/'))
                            : item.subItems?.some((s) => currentPath.endsWith(s.path));
                        const IconComponent = item.icon;

                        return (
                            <div key={item.label} className="space-y-0.5">
                                <button
                                    onClick={() => {
                                        if (hasSubItems) {
                                            toggleMenu(item.label);
                                        } else if (item.path) {
                                            onMenuItemClick(item.path);
                                        }
                                    }}
                                    title={item.label}
                                    className={`
                                        flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold
                                        transition-all duration-200 w-full text-left group/btn
                                        ${isActive
                                            ? "bg-primary-theme-50 text-primary-theme shadow-sm border border-primary-theme-100/50"
                                            : "hover:bg-slate-50 text-slate-500 hover:text-slate-900"
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <IconComponent
                                            size={18}
                                            className={`transition-colors duration-200 shrink-0 ${isActive
                                                ? "text-primary-theme"
                                                : "text-slate-400 group-hover/btn:text-primary-theme"
                                                }`}
                                        />
                                        {/* Label: hidden when icon-only on md */}
                                        <span
                                            className={`
                                                uppercase tracking-widest whitespace-nowrap transition-all duration-300 overflow-hidden
                                                ${isExpanded ? "opacity-100 max-w-[150px]" : "opacity-0 max-w-0 lg:opacity-100 lg:max-w-[150px]"}
                                            `}
                                        >
                                            {item.label}
                                        </span>
                                    </div>

                                    {hasSubItems && (
                                        <div
                                            className={`
                                                transition-all duration-300 shrink-0
                                                ${isMenuExpanded ? "rotate-180" : ""}
                                                ${isExpanded ? "opacity-100" : "opacity-0 lg:opacity-100"}
                                            `}
                                        >
                                            <ChevronDown size={14} className={isActive ? "text-primary-theme" : "text-slate-300"} />
                                        </div>
                                    )}
                                </button>

                                {/* Sub Items — show when expanded and menu is toggled open */}
                                {hasSubItems && (isMenuExpanded || isAutoExpanded) && (isExpanded || /* always on lg */true) && (
                                    <div
                                        className={`
                                            ml-3 pl-3 border-l-2 border-slate-100 space-y-0.5 mt-0.5
                                            animate-in slide-in-from-top-2 duration-200
                                            ${isExpanded ? "block" : "hidden lg:block"}
                                        `}
                                    >
                                        {item.subItems?.map((sub) => (
                                            <button
                                                key={sub.path}
                                                onClick={() => onMenuItemClick(sub.path)}
                                                className={`
                                                    w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-black
                                                    uppercase tracking-widest transition-all
                                                    ${currentPath === getPath(sub.path)
                                                        ? "text-primary-theme bg-primary-theme-50"
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

                {/* Footer */}
                <div className="p-2 border-t border-slate-100 overflow-hidden shrink-0">
                    <div className="bg-slate-50 p-2 rounded-2xl flex items-center gap-2 border border-slate-200/50 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm shrink-0 flex items-center justify-center text-primary-theme font-bold text-xs border border-primary-theme-100">
                            SYS
                        </div>
                        <div
                            className={`
                                transition-all duration-300 min-w-0 overflow-hidden
                                ${isExpanded ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0 lg:opacity-100 lg:max-w-[160px]"}
                            `}
                        >
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter whitespace-nowrap">System Node</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Active Status</p>
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

export default React.memo(SharedSidebar);
