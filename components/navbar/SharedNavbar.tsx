'use client';

import React, { useState, useRef, useEffect } from "react";
import {
    Menu,
    ChevronDown,
    User,
    Settings,
    LogOut
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useTenantLink } from "@/hooks/useTenantLink";
import NotificationCenter from "./NotificationCenter";

interface SharedNavbarProps {
    onMenuClick: () => void;
    title?: string;
    description?: string;
    actions?: React.ReactNode;
    centerActions?: React.ReactNode;
    showNotificationCenter?: boolean;
    profileLinks?: { label: string; path: string; icon: any }[];
    onLogout?: () => void;
}

const SharedNavbar: React.FC<SharedNavbarProps> = ({
    onMenuClick,
    title,
    description,
    actions,
    centerActions,
    showNotificationCenter = true,
    profileLinks,
    onLogout
}) => {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const { getPath } = useTenantLink();
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        if (onLogout) {
            onLogout();
        } else {
            await logout();
            router.push("/auth/login");
        }
    };

    return (
        <header className="h-16 flex items-center justify-between px-3 sm:px-4 border-b border-slate-200 fixed top-0 right-0 left-0 md:left-16 lg:left-64 z-20 bg-white/80 backdrop-blur-md transition-all duration-300">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-700"
                    aria-label="Open sidebar"
                >
                    <Menu size={20} />
                </button>
                {title && (
                    <div className="hidden sm:block">
                        <h2 className="text-sm font-bold text-slate-900 leading-none uppercase tracking-tight">{title}</h2>
                        {description && <p className="text-[10px] text-slate-500 mt-1 font-medium">{description}</p>}
                    </div>
                )}
            </div>

            {centerActions && (
                <div className="flex flex-1 justify-center items-center">
                    <div className="scale-75 sm:scale-90 xl:scale-100 origin-center">
                        {centerActions}
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3">
                {actions && <div className="flex items-center gap-2">{actions}</div>}

                {showNotificationCenter && (
                    <div className="flex items-center gap-2">
                        <NotificationCenter />
                    </div>
                )}

                <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                        className="flex items-center gap-2 hover:bg-slate-50 py-1.5 px-2 rounded-lg transition-colors group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-primary-theme flex items-center justify-center text-white font-bold text-sm shadow-sm transition-transform group-hover:scale-105">
                            {user?.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="hidden lg:block text-left">
                            <p className="text-xs font-bold text-slate-900 leading-tight">
                                {user?.name || "User Account"}
                            </p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                {user?.role || "Member"}
                            </p>
                        </div>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isProfileDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl border border-slate-200 bg-white z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-1">
                            {profileLinks?.map((link) => (
                                <button
                                    key={link.path}
                                    onClick={() => {
                                        router.push(link.path);
                                        setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold transition-all hover:bg-slate-50 rounded-lg group text-slate-600 hover:text-slate-900"
                                >
                                    <link.icon size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                    <span>{link.label}</span>
                                </button>
                            ))}

                            {!profileLinks && (
                                <>
                                    <button
                                        onClick={() => {
                                            router.push(getPath(`/${user?.role}/profile`));
                                            setIsProfileDropdownOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold transition-all hover:bg-slate-50 rounded-xl group text-slate-600 hover:text-slate-900"
                                    >
                                        <User size={16} className="text-slate-400 group-hover:text-indigo-500" />
                                        <span>Official Profile</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            router.push(getPath(`/${user?.role}/settings`));
                                            setIsProfileDropdownOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold transition-all hover:bg-slate-50 rounded-xl group text-slate-600 hover:text-slate-900"
                                    >
                                        <Settings size={16} className="text-slate-400 group-hover:text-indigo-500" />
                                        <span>Preferences</span>
                                    </button>
                                </>
                            )}

                            <div className="h-px bg-slate-100 my-1 mx-2"></div>

                            <button
                                onClick={() => {
                                    setIsProfileDropdownOpen(false);
                                    handleLogout();
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all rounded-lg group"
                            >
                                <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                <span>Terminate Session</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default React.memo(SharedNavbar);
