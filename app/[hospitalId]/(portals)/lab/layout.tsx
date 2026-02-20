'use client';

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import { Menu, LogOut } from "lucide-react";
import LogoutModal from "@/components/auth/LogoutModal";
import LabSidebar from "@/components/lab/Sidebar";
import Link from "next/link";

import { LabSampleService } from "@/lib/integrations/services/labSample.service";
import { LabDashboardService } from "@/lib/integrations/services/labDashboard.service";
import { getSocket } from "@/lib/integrations/api/socket";
import { clearApiCache } from "@/lib/integrations/api/apiClient";
import LabSupportFloatingBox from "@/components/lab/LabSupportFloatingBox";
import { useTenantLink } from "@/hooks/useTenantLink";

const LabLayout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout, isAuthenticated, checkAuth, isLoading, isInitialized } = useAuthStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [activeTestCount, setActiveTestCount] = useState(0);
    const { getPath } = useTenantLink(); // ✅ MULTI-TENANCY

    const labUser = user || {
        name: "Lab User",
        role: "lab",
        avatar: null,
    };

    // Shared refresh logic for all pages
    const triggerGlobalRefresh = () => {
        console.log('🔄 Live Update: Clearing cache and notifying components...');
        clearApiCache();
        window.dispatchEvent(new Event('refresh-lab-data'));
    };

    useEffect(() => {
        useAuthStore.getState().initEvents();
        checkAuth();

        // 🚀 Ensure cache is cleared whenever a refresh is requested (local OR socket)
        const handleRefresh = () => {
            console.log('🔄 Refresh Signal: Clearing API cache');
            clearApiCache();
        };
        window.addEventListener('refresh-lab-data', handleRefresh);
        return () => window.removeEventListener('refresh-lab-data', handleRefresh);
    }, []);

    const isLoginPage = pathname === '/lab/login';

    useEffect(() => {
        if (!isLoginPage && isInitialized) {
            if (!isAuthenticated) {
                router.push('/auth/login');
            } else if (user?.role !== 'lab') {
                const routeMap: Record<string, string> = {
                    'staff': '/staff',
                    'doctor': '/doctor',
                    'hospital-admin': '/hospital-admin',
                    'pharmacy': '/pharmacy/dashboard',
                    'pharma-owner': '/pharmacy/dashboard',
                    'super-admin': '/admin',
                    'admin': '/admin'
                };
                router.push(routeMap[user?.role || ''] || '/auth/login');
            }
        }
    }, [isAuthenticated, isInitialized, user?.role, router, isLoginPage]);

    // Aggressive Prefetching for sub-2s loads
    useEffect(() => {
        if (isAuthenticated && user?.role === 'lab') {
            const prefetchData = async () => {
                try {
                    await Promise.all([
                        LabSampleService.getSamples('Pending'),
                        LabSampleService.getSamples('In Processing'),
                        LabSampleService.getSamples('Completed'),
                        LabDashboardService.getStats('today')
                    ]);
                } catch (e) {
                    console.warn('Prefetch failed');
                }
            };
            prefetchData();
        }
    }, [isAuthenticated, user?.role]);

    // Fetch active count and listen for updates
    useEffect(() => {
        let socketInstance: any = null;

        if (isAuthenticated && user?.role === 'lab') {
            const fetchCount = async () => {
                try {
                    const pending = await LabSampleService.getSamples('Pending', true);
                    setActiveTestCount(pending.length);
                } catch (error) {
                    console.error("Failed to fetch active count", error);
                }
            };

            fetchCount();

            // Poll every 10 seconds to ensure count is accurate
            const intervalId = setInterval(fetchCount, 10000);

            const handleVisibilityChange = () => {
                if (!document.hidden) fetchCount();
            };

            const handleFocus = () => fetchCount();

            document.addEventListener('visibilitychange', handleVisibilityChange);
            window.addEventListener('focus', handleFocus);

            getSocket().then(socket => {
                socketInstance = socket;
                if (socketInstance && user) {
                    const hId = (user.hospital || user.hospitalId || (user as any).hospital?._id || '').toString();

                    if (hId) {
                        console.log(`🔌 Joining rooms for hospital: ${hId}`);
                        socketInstance.emit('join_room', {
                            userId: user.id || (user as any)._id,
                            role: user.role,
                            hospitalId: hId
                        });
                    }

                    // Listeners with explicit logging for debugging
                    socketInstance.on('new_lab_order', (data: any) => {
                        console.log('🔔 Received: new_lab_order', data);
                        fetchCount();
                        triggerGlobalRefresh();
                    });

                    const syncEvents = ['sample_collected', 'lab_order_updated', 'payment_status_changed', 'bill_generated', 'lab_refresh_forced'];
                    syncEvents.forEach(evt => {
                        socketInstance.on(evt, (data: any) => {
                            console.log(`🔔 Received: ${evt}`, data);
                            fetchCount();
                            triggerGlobalRefresh();
                        });
                    });
                }
            });

            return () => {
                clearInterval(intervalId);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                window.removeEventListener('focus', handleFocus);
                if (socketInstance) {
                    socketInstance.off('new_lab_order');
                    ['sample_collected', 'lab_order_updated', 'payment_status_changed', 'bill_generated'].forEach(evt => {
                        socketInstance.off(evt);
                    });
                }
            };
        }
    }, [isAuthenticated, user]);

    const handleConfirmLogout = async () => {
        await logout();
        router.push('/lab/login');
    };

    // Premium Loading UI
    // Do NOT show global loader on login page to prevent the "refresh" effect during submission
    if (!isLoginPage && (isLoading || !isInitialized)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-4 border-4 border-indigo-600/20 border-b-indigo-600 rounded-full animate-spin-reverse"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        </div>
                    </div>
                    <div>
                        <p className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic text-center">Lab Panel</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mt-1">Verifying Diagnostic Access</p>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoginPage) return <>{children}</>;
    if (!isAuthenticated || user?.role !== 'lab') return null;

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleConfirmLogout}
                userName={user?.name}
            />

            <LabSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                activeTestCount={activeTestCount}
                onLogout={() => setIsLogoutModalOpen(true)}
            />

            <div className="flex-1 flex flex-col lg:ml-64 h-screen transition-all duration-300 min-w-0">
                <header className="h-16 flex items-center justify-between px-6 border-b border-border-theme bg-card backdrop-blur-sm sticky top-0 z-20">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                    >
                        <Menu size={22} />
                    </button>

                    <div className="flex-1 flex justify-center items-center mx-4">
                        <div className="flex items-center p-1 bg-gray-50/50 dark:bg-gray-800/40 rounded-full border border-gray-100/50 dark:border-gray-700/50 backdrop-blur-sm">
                            <Link
                                href={getPath('/lab/billing')}
                                className={`px-3 py-1.5 sm:px-6 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${pathname.includes('/lab/billing')
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none"
                                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                                    }`}
                            >
                                Billing
                            </Link>

                            <Link
                                href={getPath('/lab/samples')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-6 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${pathname.includes('/lab/samples') || pathname.includes('/lab/dashboard')
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none"
                                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                                    }`}
                            >
                                Sample
                                <span className={`flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold ${pathname.includes('/lab/samples') || pathname.includes('/lab/dashboard')
                                    ? "bg-white text-blue-600"
                                    : "bg-blue-600 text-white"
                                    }`}>
                                    {activeTestCount}
                                </span>
                            </Link>

                            <Link
                                href={getPath('/lab/results')}
                                className={`px-3 py-1.5 sm:px-6 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${pathname.includes('/lab/results')
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none"
                                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                                    }`}
                            >
                                Result Entry
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">


                        <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-lg dark:from-gray-800 dark:to-gray-700 border border-purple-200 dark:border-gray-600">
                            <div className="w-9 h-9 rounded-full bg-primary-theme flex items-center justify-center text-white font-bold text-sm shadow-md">
                                {labUser.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">{labUser.name}</span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lab Technician</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsLogoutModalOpen(true)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 rounded-lg transition-colors"
                            title="Sign Out"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </header>

                <div className="p-6 max-[600px]:p-4 flex-1 overflow-y-auto bg-background">
                    {children}
                </div>
            </div>
            {/* Floating Support & Feedback Box */}
            <LabSupportFloatingBox />
        </div>
    );
};

export default LabLayout;
