'use client';

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import {
    LayoutDashboard,
    CalendarDays,
    Settings,
    Headphones,
    ClipboardList,
    Menu,
    LogOut,
    Bell,
    Clock
} from "lucide-react";
import SharedSidebar from "@/components/navbar/SharedSidebar";
import LogoutModal from "@/components/auth/LogoutModal";
import { useTenantLink } from "@/hooks/useTenantLink";
import ProgressBar from "@/components/ui/ProgressBar";
import { Toaster } from "react-hot-toast";

const masterhelpdeskMenu: any[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/masterhelpdesk" },
    { icon: CalendarDays, label: "Appointments", path: "/masterhelpdesk/appointments" },
    { icon: Clock, label: "Queue", path: "/masterhelpdesk/queue" },
    { icon: Settings, label: "Settings", path: "/masterhelpdesk/settings" },
    { icon: Headphones, label: "Support", path: "/masterhelpdesk/support" },
    { icon: ClipboardList, label: "Transactions", path: "/masterhelpdesk/transactions" },
];

export function MasterHelpdeskLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout, isAuthenticated, checkAuth, isLoading, isInitialized } = useAuthStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isMounted, setIsMounted] = useState(false);
    const { getPath } = useTenantLink();

    useEffect(() => {
        setIsMounted(true);
        useAuthStore.getState().initEvents();
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (isInitialized) {
            if (!isAuthenticated) {
                window.location.href = '/auth/login';
                return;
            } else if (user?.role !== 'masterhelpdesk') {
                 const routeMap: Record<string, string> = {
                     'staff': '/staff',
                     'doctor': '/doctor',
                     'hospital-admin': '/hospital-admin',
                     'lab': '/lab/dashboard',
                     'pharma-owner': '/pharmacy/dashboard',
                     'super-admin': '/admin',
                     'admin': '/admin',
                     'patient': '/patient/dashboard',
                     'helpdesk': '/helpdesk'
                 };
                 const targetRoute = routeMap[user?.role || ''] || '/auth/login';
                 window.location.href = targetRoute;
            }
        }
    }, [isAuthenticated, isInitialized, user?.role]);

    if (!isMounted || isLoading || !isInitialized) {
        return (
            <div key="loader" className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
                <div key="loader-inner" className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] text-center">CureChain</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center mt-1">Starting System...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || user?.role !== 'masterhelpdesk') return null;

    return (
        <div className="flex min-h-screen bg-[#F8FAFC] font-sans selection:bg-indigo-100 selection:text-indigo-900">
            <LogoutModal
                key="logout-modal"
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={async () => {
                    await logout();
                    window.location.href = '/auth/login';
                }}
                userName={user?.name}
            />

            <SharedSidebar
                key="shared-sidebar"
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                menuItems={masterhelpdeskMenu}
                branding={{
                    logo: Headphones,
                    title: "CureChain",
                    subtitle: "Master Helpdesk"
                }}
                currentPath={pathname}
                onMenuItemClick={(path) => {
                    startTransition(() => {
                        router.push(getPath(path));
                        setIsSidebarOpen(false);
                    });
                }}
            />

            <div key="main-content" className="flex-1 flex flex-col min-h-screen w-full min-w-0 relative">
                {/* Minimal Navbar for Master Helpdesk */}
                <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="hidden lg:block">
                            <h2 className="text-sm font-bold text-slate-800">Master portal</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="h-6 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-indigo-200">
                                {user?.name?.charAt(0).toUpperCase() || 'M'}
                            </div>
                            <div className="hidden md:block">
                                <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                                <p className="text-[10px] font-medium text-slate-500">Master Helpdesk</p>
                            </div>
                            <button 
                                onClick={() => setIsLogoutModalOpen(true)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 bg-[#F8FAFC] w-full min-w-0">
                    <div className="p-2 md:p-6 w-full min-w-0 max-w-[1600px] mx-auto">
                        <ProgressBar key="progress" isPending={isPending} color="#4f46e5" />
                        <React.Fragment key="children">
                            {children}
                        </React.Fragment>
                        <Toaster position="top-right" />
                    </div>
                </main>
            </div>
        </div>
    );
}

export default React.memo(MasterHelpdeskLayout);
