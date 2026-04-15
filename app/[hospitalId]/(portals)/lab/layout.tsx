'use client';

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import { Menu, LogOut, LayoutDashboard, Activity, ClipboardList, FlaskConical, Settings } from "lucide-react";
import LogoutModal from "@/components/auth/LogoutModal";
import LabQuickActions from "@/components/lab/LabQuickActions";
import ProgressBar from "@/components/ui/ProgressBar";
import { getSocket } from "@/lib/integrations/api/socket";
import { clearApiCache } from "@/lib/integrations/api/apiClient";
import LabSupportFloatingBox from "@/components/lab/LabSupportFloatingBox";
import { useTenantLink } from "@/hooks/useTenantLink";
import { useRealtime } from '@/hooks/useRealtime';
import SharedSidebar from "@/components/navbar/SharedSidebar";

const labMenuLinks = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/lab/dashboard" },
    { icon: Activity, label: "Transactions", path: "/lab/billing/transactions" },
    { icon: ClipboardList, label: "Departments", path: "/lab/departments" },
    { icon: FlaskConical, label: "Test Master", path: "/lab/tests" },
    { icon: Settings, label: "Settings", path: "/lab/settings" },
];

const LabLayout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout, isAuthenticated, checkAuth, isLoading, isInitialized } = useAuthStore();
    const [labLogo, setLabLogo] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [activeTestCount, setActiveTestCount] = useState(0);
    const [isPending, startTransition] = useTransition();
    const [isMounted, setIsMounted] = useState(false);
    const { getPath } = useTenantLink();

    useRealtime(['lab', 'billing', 'patients', 'system']);

    const triggerGlobalRefresh = () => {
        clearApiCache();
        window.dispatchEvent(new Event('refresh-lab-data'));
    };

    useEffect(() => {
        setIsMounted(true);
        useAuthStore.getState().initEvents();
        checkAuth();
        const handleRefresh = () => clearApiCache();
        window.addEventListener('refresh-lab-data', handleRefresh);
        return () => window.removeEventListener('refresh-lab-data', handleRefresh);
    }, [checkAuth]);

    const isLoginPage = pathname.includes('/lab/login');

    useEffect(() => {
        if (!isLoginPage && isInitialized) {
            if (!isAuthenticated) {
                router.push(getPath('/auth/login'));
            } else if (user?.role !== 'lab') {
                const routeMap: Record<string, string> = {
                    'staff': getPath('/staff'),
                    'doctor': getPath('/doctor'),
                    'hospital-admin': getPath('/hospital-admin'),
                    'pharma-owner': getPath('/pharmacy/dashboard'),
                    'pharmacy': getPath('/pharmacy/dashboard'),
                    'admin': '/admin'
                };
                router.push(routeMap[user?.role || ''] || getPath('/auth/login'));
            }
        }
    }, [isAuthenticated, isInitialized, user?.role, router, isLoginPage, getPath]);

    useEffect(() => {
        if (isAuthenticated && user?.role === 'lab') {
            getSocket().then(socket => {
                if (socket) {
                    socket.on('new_lab_order', () => { triggerGlobalRefresh(); });
                    ['sample_collected', 'lab_order_updated', 'payment_status_changed', 'bill_generated', 'lab_refresh_forced'].forEach(evt => {
                        socket.on(evt, () => triggerGlobalRefresh());
                    });
                }
            });
        }
    }, [isAuthenticated, user]);

    if (!isLoginPage && (!isMounted || isLoading || !isInitialized)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-purple-600 font-bold">LAB</div>
                    </div>
                    <p className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">Lab Panel</p>
                </div>
            </div>
        );
    }

    if (isLoginPage) return <>{children}</>;
    if (!isAuthenticated || user?.role !== 'lab') return null;

    return (
        <div className="flex min-h-screen bg-background text-slate-900">
            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={async () => { await logout(); router.push(getPath('/lab/login')); }}
                userName={user?.name}
            />

            <SharedSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                menuItems={labMenuLinks}
                branding={{ logo: FlaskConical, title: "CureChain", subtitle: "Lab Portal" }}
                currentPath={pathname}
                onMenuItemClick={(path) => {
                    startTransition(() => {
                        router.push(getPath(path));
                        setIsSidebarOpen(false);
                    });
                }}
            />

            <div className="flex-1 flex flex-col min-h-screen min-w-0 relative">
                <ProgressBar isPending={isPending} color="blue" />
                <header className="h-16 flex items-center justify-between px-6 border-b border-border-theme bg-card sticky top-0 z-20 shrink-0">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    >
                        <Menu size={22} />
                    </button>

                    <div className="flex-1 flex justify-center items-center mx-4">
                        <LabQuickActions activeTestCount={activeTestCount} startTransition={startTransition} />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden">
                                {(labLogo || (user as any)?.image) ? (
                                    <img src={labLogo || (user as any)?.image} alt={user?.name} className="w-full h-full object-cover" />
                                ) : (
                                    user?.name?.charAt(0).toUpperCase() || 'L'
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm text-gray-700">{user?.name || "Lab User"}</span>
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Lab Technician</span>
                            </div>
                        </div>

                        <button onClick={() => setIsLogoutModalOpen(true)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors">
                            <LogOut size={20} />
                        </button>
                    </div>
                </header>

                <main className="p-2 md:p-6 flex-1 overflow-y-auto bg-background">
                    <div className="max-w-[1600px] mx-auto w-full">
                        <React.Fragment>
                            {children}
                        </React.Fragment>
                    </div>
                </main>
                <LabSupportFloatingBox />
            </div>
        </div>
    );
};

export default LabLayout;
