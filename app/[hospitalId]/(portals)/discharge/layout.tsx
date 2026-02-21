'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import Sidebar, { SidebarItem } from '@/components/slidebar/Sidebar';
import { LayoutDashboard, FileText, ClipboardList, LogOut, Settings, User } from 'lucide-react';
import LogoutModal from '@/components/auth/LogoutModal';
import { useAuthStore } from '@/stores/authStore';


const dischargeMenuItems: SidebarItem[] = [
    { icon: FileText, label: 'Discharge Form', href: '/discharge' },
    { icon: ClipboardList, label: 'Discharge History', href: '/discharge/history' },
    { icon: User, label: 'My Profile', href: '/discharge/profile' },
];

function DischargeLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user: authUser, checkAuth } = useAuthStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const isLoginPage = pathname === '/discharge/login';

    useEffect(() => {
        // Only run auth check if not on login page
        if (isLoginPage) {
            setTimeout(() => setIsLoading(false), 0);
            return;
        }

        const storedUser = sessionStorage.getItem("user");
        let userRole = sessionStorage.getItem("userRole");

        // If userRole is missing (common when coming from helpdesk), extract it from user object
        if (!userRole && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                userRole = parsedUser.role;
            } catch (e) {
                console.error("Failed to parse stored user", e);
            }
        }

        const allowedRoles = ["nurse", "helpdesk", "doctor", "admin", "super-admin", "hospital-admin"];

        if (!storedUser || !allowedRoles.includes(userRole || "")) {
            router.push("/discharge/login");
            return;
        }

        // Initialize auth store
        checkAuth().finally(() => setIsLoading(false));
    }, [router, isLoginPage, checkAuth]);

    // Listen for storage changes (when profile is updated)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'user' && e.newValue) {
                // Refresh auth when user data changes
                checkAuth();
            }
        };

        // Custom event for same-tab updates (storage event doesn't fire in same tab)
        const handleCustomStorageChange = () => {
            checkAuth();
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('userUpdated', handleCustomStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('userUpdated', handleCustomStorageChange);
        };
    }, [checkAuth]);

    const handleLogout = () => {
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("refreshToken");
        sessionStorage.removeItem("userRole");
        sessionStorage.removeItem("user");
        router.push("/");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest">Checking Credentials</p>
                </div>
            </div>
        );
    }

    const navUser = {
        name: authUser?.name || "User",
        role: authUser?.role || "Personnel",
        image: authUser?.image || ""
    };

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen bg-[#f8fafc]">
            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleLogout}
                userName={authUser?.name}
            />

            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                items={dischargeMenuItems}
                onLogout={() => setIsLogoutModalOpen(true)}
            />

            <div className="flex-1 flex flex-col lg:ml-64">
                <Navbar
                    title="Discharge Portal"
                    user={navUser}
                    onMenuClick={() => setIsSidebarOpen(true)}
                    onLogout={() => setIsLogoutModalOpen(true)}
                    className="fixed! top-0 left-0 lg:left-64 right-0 z-40 w-auto!"
                    profileHref="/discharge/profile"
                />

                <main className="p-6 lg:p-10 pt-24 flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default React.memo(DischargeLayout);
