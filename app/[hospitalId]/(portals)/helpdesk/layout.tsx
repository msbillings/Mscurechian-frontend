'use client';

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import {
    LayoutDashboard,
    UserPlus,
    CalendarCheck,
    Stethoscope,
    Truck,
    CreditCard,
    AlertCircle,
    Settings,
    LogOut,
    Menu,
    X,
    Bell,
    Search,
    User,
    Users,
    LifeBuoy,
    ChevronRight,
    Activity,
    ClipboardList
} from "lucide-react";
import { ThemeToggle } from '@/components/ThemeToggle';
import NotificationCenter from "@/components/navbar/NotificationCenter";
import HelpdeskNavbar from "@/components/navbar/HelpdeskNavbar";
import LogoutModal from "@/components/auth/LogoutModal";
import { usePrefetch } from "@/lib/integrations";
import HelpdeskSupportFloatingBox from "./components/HelpdeskSupportFloatingBox";
import { useTenantLink } from "@/hooks/useTenantLink";

const helpdeskMenu = [
    { icon: <LayoutDashboard size={18} />, label: "Dashboard", path: "/helpdesk" },

    { icon: <Activity size={18} />, label: "IPD Center", path: "/helpdesk/ipd" },
    { icon: <Users size={18} />, label: "Patient List", path: "/helpdesk/patients" },
    { icon: <Stethoscope size={18} />, label: "Doctors List", path: "/helpdesk/doctors" },
    { icon: <Truck size={18} />, label: "Files & Receipts", path: "/helpdesk/transits" },
    { icon: <AlertCircle size={18} />, label: "Emergency Cases", path: "/helpdesk/emergency-accept" },
    { icon: <ClipboardList size={18} />, label: "Discharge Queue", path: "/helpdesk/discharge" },
   
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout, isAuthenticated, checkAuth, isLoading, isInitialized } = useAuthStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const { getPath } = useTenantLink(); // ✅ MULTI-TENANCY

    // ⚡ PERFORMANCE: Prefetch hook for zero-latency navigation
    const {
        prefetchHelpdeskDashboard,
        prefetchHelpdeskDoctors,
        prefetchHelpdeskPatients,
        prefetchHelpdeskAppointments,
        prefetchHelpdeskTransactions,
    } = usePrefetch();

    // Map paths to their prefetch functions
    const getPrefetchFunction = (path: string) => {
        switch (path) {
            case '/helpdesk': return prefetchHelpdeskDashboard;
            case '/helpdesk/patients': return () => prefetchHelpdeskPatients('', 1, 10);
            case '/helpdesk/doctors': return prefetchHelpdeskDoctors;
            case '/helpdesk/appointment-booking': return () => prefetchHelpdeskAppointments(1, 10);
            case '/helpdesk/transactions': return () => prefetchHelpdeskTransactions(1, 10);
            default: return undefined;
        }
    };

    useEffect(() => {
        useAuthStore.getState().initEvents();
        checkAuth();

        // ⚡⚡⚡ OPTIMIZED PREFETCH: Staggered loading to prevent DB timeouts
        const prefetchAll = async () => {
            // Small delay to let the initial page finish its critical requests
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Prefetch high priority
            prefetchHelpdeskDashboard();

            // Stagger remaining requests
            setTimeout(() => prefetchHelpdeskPatients('', 1, 10), 500);
            setTimeout(() => prefetchHelpdeskDoctors(), 1000);
            setTimeout(() => prefetchHelpdeskAppointments(1, 10), 1500);
            setTimeout(() => prefetchHelpdeskTransactions(1, 10), 2000);
        };

        prefetchAll();
    }, [checkAuth, prefetchHelpdeskDashboard, prefetchHelpdeskPatients, prefetchHelpdeskDoctors, prefetchHelpdeskAppointments, prefetchHelpdeskTransactions]);

    useEffect(() => {
        if (isInitialized) {
            if (!isAuthenticated) {
                // Use hard navigation for auth failures to prevent RSC errors
                window.location.href = '/auth/login';
                return;
            } else if (user?.role !== 'helpdesk') {
                const routeMap: Record<string, string> = {
                    'staff': '/staff',
                    'doctor': '/doctor',
                    'hospital-admin': '/hospital-admin',
                    'lab': '/lab/dashboard',
                    'pharma-owner': '/pharmacy/dashboard',
                    'super-admin': '/admin',
                    'admin': '/admin',
                    'patient': '/patient'
                };
                const targetRoute = routeMap[user?.role || ''] || '/auth/login';
                window.location.href = targetRoute;
            }
        }
    }, [isAuthenticated, isInitialized, user?.role]);

    const handleConfirmLogout = async () => {
        await logout();
        // Use hard navigation for logout to ensure clean state
        window.location.href = '/auth/login';
    };

    if (isLoading || !isInitialized) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-teal-600/10 border-t-teal-600 rounded-full animate-spin"></div>
                    <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] text-center">CureChain</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center mt-1">Starting System...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || user?.role !== 'helpdesk') return null;

    return (
        <div className="flex min-h-screen bg-[#F8FAFC] font-sans selection:bg-teal-100 selection:text-teal-900">
            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleConfirmLogout}
                userName={user?.name}
            />

            {/* SIDEBAR */}
            <aside className={`
                fixed left-0 top-0 h-full w-64 bg-slate-900 z-50
                transform transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                flex flex-col shadow-2xl lg:shadow-none
            `}>
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center">
                            <Activity size={16} className="text-white" strokeWidth={3} />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-white tracking-widest leading-none">CURECHAIN</h1>
                            <p className="text-[7px] font-bold text-teal-400 uppercase tracking-[0.3em] mt-1">HEALTHCARE PORTAL</p>
                        </div>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden ml-auto p-2 text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                    <p className="px-3 text-[8px] font-bold text-slate-500 uppercase tracking-[0.4em] mb-3 mt-1">Navigation</p>
                    {helpdeskMenu.map((item) => {
                        const isActive = pathname === item.path;
                        const prefetchFn = getPrefetchFunction(item.path);

                        return (
                            <button
                                key={item.path}
                                onClick={() => {
                                    router.push(getPath(item.path));
                                    setIsSidebarOpen(false);
                                }}
                                onMouseEnter={() => {
                                    // ⚡ PREFETCH: Load data on hover for instant navigation
                                    prefetchFn?.();
                                }}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-200 group
                                    ${isActive
                                        ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                                `}
                                aria-label={`Navigate to ${item.label}`}
                            >
                                <div className={`
                                    w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200
                                    ${isActive ? 'bg-white/20 text-white' : 'text-slate-500 group-hover:text-teal-400'}
                                `}>
                                    {item.icon}
                                </div>
                                <span className="flex-1 text-left">
                                    {item.label}
                                </span>
                                {isActive && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                                )}
                            </button>
                        );
                    })}
                </div>

            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen pt-16">
                {/* TOP NAVBAR */}
                <HelpdeskNavbar
                    onMenuClick={() => setIsSidebarOpen(true)}
                    onLogoutClick={() => setIsLogoutModalOpen(true)}
                />

                <main className="flex-1 bg-[#F8FAFC]">
                    <div className="p-4 lg:p-6">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-md"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                    height: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #E2E8F0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #CBD5E1;
                }
            `}</style>

            {/* Floating Support & Feedback Box */}
            <HelpdeskSupportFloatingBox />
        </div>
    );
}