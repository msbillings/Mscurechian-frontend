'use client';

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import Sidebar, { SidebarItem } from '@/components/slidebar/Sidebar';
import Navbar from '@/components/navbar/Navbar';
import LogoutModal from '@/components/auth/LogoutModal';
import PharmacySupportFloatingBox from '@/components/pharmacy/PharmacySupportFloatingBox';
import { useTenantLink } from '@/hooks/useTenantLink';
import { useQuery } from '@tanstack/react-query';
import { pharmacyService } from '@/lib/integrations/services/pharmacy.service';
import {
    LayoutDashboard,
    Package,
    PlusCircle,
    Users,
    RotateCcw,
    Receipt,
    ShoppingCart,
    ArrowLeftRight,
} from "lucide-react";

// Pharmacy specific menu items (sidebar)
const pharmacyMenu: SidebarItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/pharmacy/dashboard" },
    { icon: PlusCircle, label: "Create Invoice", href: "/pharmacy/billing" },
    { icon: ArrowLeftRight, label: "IPD Issuance", href: "/pharmacy/ipd-issuance" },
    { icon: RotateCcw, label: "Medicine Returns", href: "/pharmacy/medicine-return" },
    { icon: Package, label: "Products", href: "/pharmacy/products" },
    { icon: Users, label: "Suppliers", href: "/pharmacy/suppliers" },
];

const PharmacyLayout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout, isAuthenticated, checkAuth, isInitialized, isLoading } = useAuthStore();
    const { theme, toggleTheme } = useThemeStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const { getPath } = useTenantLink(); // ✅ MULTI-TENANCY

    const isPharma = user?.role === 'pharma-owner' || user?.role === 'pharmacy';
    const isLoginPage = pathname === '/pharmacy/login';

    const pharmacyUser = user || {
        name: "Pharmacy User",
        role: "pharmacy",
        image: undefined,
    };

    const { data: activeOrdersCountData } = useQuery<{ count: number }>({
        queryKey: ['pharmacy', 'active-orders-count', user?.hospital],
        queryFn: () => pharmacyService.getActiveOrdersCount(user?.hospital as string),
        enabled: !!user?.hospital && isPharma && isAuthenticated && !isLoginPage,
        refetchInterval: 10000,
    });

    // Auth guard
    useEffect(() => {
        useAuthStore.getState().initEvents();
        checkAuth();
    }, []);

    useEffect(() => {
        if (!isLoginPage && isInitialized) {
            if (!isAuthenticated) {
                router.push('/auth/login');
            } else if (!isPharma) {
                const routeMap: Record<string, string> = {
                    'staff': '/staff',
                    'doctor': '/doctor',
                    'hospital-admin': '/hospital-admin',
                    'lab': '/lab/dashboard',
                    'super-admin': '/admin',
                    'admin': '/admin'
                };
                router.push(routeMap[user?.role || ''] || '/auth/login');
            }
        }
    }, [isAuthenticated, isInitialized, user?.role, router, isPharma, isLoginPage]);

    // Handle logout
    const handleLogout = async () => {
        await logout();
        router.push('/pharmacy/login');
    };

    // Premium Loading UI
    // Do NOT show global loader on login page to prevent the "refresh" effect during submission
    if (!isLoginPage && (isLoading || !isInitialized)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-teal-600/20 border-t-teal-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-4 border-4 border-teal-600/20 border-b-teal-600 rounded-full animate-spin-reverse"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
                        </div>
                    </div>
                    <div>
                        <p className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic text-center">Pharmacy Panel</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mt-1">Verifying Inventory Node</p>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoginPage) {
        return <>{children}</>;
    }

    if (!isAuthenticated || !isPharma) {
        return null;
    }

    const dynamicMenu = pharmacyMenu.map(item => {
        if (item.label === "Active Orders" && activeOrdersCountData?.count && activeOrdersCountData.count > 0) {
            return { ...item, badge: activeOrdersCountData.count.toString() };
        }
        return item;
    });

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                items={dynamicMenu}
                onLogout={() => setIsLogoutModalOpen(true)}
                activeColor="teal"
            />

            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleLogout}
                userName={user?.name}
            />

            <div className="flex-1 flex flex-col lg:ml-64 h-screen overflow-hidden">
                <Navbar
                    user={{
                        name: pharmacyUser.name,
                        role: pharmacyUser.role,
                        image: (pharmacyUser as any).image
                    }}
                    onMenuClick={() => setIsSidebarOpen(true)}
                    isDarkMode={theme === 'dark'}
                    onThemeToggle={toggleTheme}
                    onLogout={() => setIsLogoutModalOpen(true)}
                    title="Pharmacy Panel"
                    profileHref={getPath('/pharmacy/profile')}
                    centerActions={
                        <div className="hidden md:flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                            {[
                                { label: 'IPD Billing', href: getPath('/pharmacy/ipd-billing'), icon: Receipt },
                                { label: 'Active Orders', href: getPath('/pharmacy/orders'), icon: ShoppingCart, badge: activeOrdersCountData?.count },
                                { label: 'Transactions', href: getPath('/pharmacy/transactions'), icon: ArrowLeftRight },
                            ].map(({ label, href, icon: Icon, badge }) => {
                                const isActive = pathname.includes(href.split('/').pop() || '');
                                return (
                                    <a
                                        key={label}
                                        href={href}
                                        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            isActive
                                                ? 'bg-white dark:bg-gray-700 text-teal-700 dark:text-teal-400 shadow-sm'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {label}
                                        {badge && badge > 0 ? (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-teal-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                                                {badge > 9 ? '9+' : badge}
                                            </span>
                                        ) : null}
                                    </a>
                                );
                            })}
                        </div>
                    }
                />

                <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
            {/* Floating Support & Feedback Box */}
            <PharmacySupportFloatingBox />
        </div>
    );
};

export default PharmacyLayout;

// Force sync trigger
