'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import {
    LayoutDashboard,
    User,
    Settings,
    LogOut,
    Activity
} from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LogoutModal from '@/components/auth/LogoutModal';
import SharedNavbar from '@/components/navbar/SharedNavbar';
import SharedSidebar from '@/components/navbar/SharedSidebar';


const queryClient = new QueryClient();

const patientMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/patient' },
];

function PatientPortalLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout, isAuthenticated, checkAuth, isLoading, isInitialized } = useAuthStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        useAuthStore.getState().initEvents();
        checkAuth();
    }, []);

    useEffect(() => {
        if (isInitialized) {
            if (!isAuthenticated) {
                router.push('/auth/login');
            } else if (user?.role !== 'patient') {
                const routeMap: Record<string, string> = {
                    'staff': '/staff',
                    'doctor': '/doctor',
                    'hospital-admin': '/hospital-admin',
                    'lab': '/lab/dashboard',
                    'pharma-owner': '/pharmacy/dashboard',
                    'super-admin': '/admin',
                    'admin': '/admin',
                    'helpdesk': '/helpdesk'
                };
                router.push(routeMap[user?.role || ''] || '/auth/login');
            }
        }
    }, [isAuthenticated, isInitialized, user?.role, router]);

    const handleConfirmLogout = async () => {
        await logout();
        router.push('/auth/login');
    };

    if (isLoading || !isInitialized) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] text-center">CureChain</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center mt-1">Accessing Patient Portal</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || user?.role !== 'patient') return null;

    return (
        <div className="flex min-h-screen bg-white">
            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleConfirmLogout}
                userName={user?.name}
            />

            <SharedSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                menuItems={patientMenuItems}
                branding={{
                    logo: Activity,
                    title: "CureChain",
                    subtitle: "Patient Portal"
                }}
                onMenuItemClick={(path) => {
                    setIsSidebarOpen(false);
                    startTransition(() => {
                        router.push(path);
                    });
                }}
                currentPath={pathname}
            />

            <div className="flex-1 flex flex-col lg:ml-64 min-h-screen transition-all duration-300 w-full max-w-full">
                <SharedNavbar
                    onMenuClick={() => setIsSidebarOpen(true)}
                    title="Patient Dashboard"
                    description="Personal Health & Medical Records"
                    profileLinks={[
                        { label: "My Profile", path: "/patient?tab=profile", icon: User },
                    ]}
                    onLogout={() => setIsLogoutModalOpen(true)}
                />

                <main className="p-4 sm:p-6 flex-1 bg-white relative mt-16">
                    {isPending && (
                        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300">
                            <div className="flex flex-col items-center gap-4">
                                <div className="h-10 w-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bridging Data...</p>
                            </div>
                        </div>
                    )}
                    <QueryClientProvider client={queryClient}>
                        {children}
                    </QueryClientProvider>
                </main>
            </div>
        </div>
    );
}

export default React.memo(PatientPortalLayout);
