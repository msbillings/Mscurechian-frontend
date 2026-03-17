"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutConfirmationModal from "@/components/common/LogoutConfirmationModal";

function AmbulanceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    useEffect(() => {
        // Fallback to cookies for refresh resilience
        const getCookie = (name: string) => {
            if (typeof document === 'undefined') return null;
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return null;
        };

        const sessionRole = sessionStorage.getItem("userRole");
        const sessionUser = sessionStorage.getItem("user");
        const sessionToken = sessionStorage.getItem("accessToken");
        
        console.log("🚑 Layout Auth Check:", { sessionRole, hasSessionUser: !!sessionUser, hasSessionToken: !!sessionToken });

        // Multi-tab sync: If we don't have a sessionRole but we have an 'ambulance' cookieRole, 
        // we might be in a refreshed state. 
        const cookieRole = getCookie('userRole');
        const effectiveRole = sessionRole || cookieRole;

        if (effectiveRole !== "ambulance") {
            console.warn("⚠️ Layout: No ambulance credentials, redirecting to login");
            // Clear any partial data to prevent loops
            sessionStorage.removeItem("accessToken");
            sessionStorage.removeItem("userRole");
            router.push("/emergency-login");
            return;
        }

        // Even with the correct role, we need a token
        const cookieToken = getCookie('accessToken');
        const hasToken = !!sessionToken || !!cookieToken;
        
        console.log("🚑 Layout Token Check:", { hasSessionToken: !!sessionToken, hasCookieToken: !!cookieToken, hasToken });

        if (!hasToken) {
            console.warn("⚠️ Layout: No token found, redirecting to login");
            router.push("/emergency-login");
            return;
        }

        if (sessionUser) {
            try {
                const parsedUser = JSON.parse(sessionUser);
                console.log("🚑 Layout: Restored user from session", parsedUser.name);
                setUser(parsedUser);
            } catch (e) {
                console.error("🚑 Layout: Failed to parse user from session", e);
            }
        } else {
            console.warn("🚑 Layout: sessionUser key is MISSING from sessionStorage");
        }
    }, [router]);

    const handleLogout = () => {
        // Clear storage from sessionStorage
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("refreshToken");
        sessionStorage.removeItem("userRole");
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("tabAuthorized");

        // Clear cookies
        document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
        document.cookie = "hospitalId=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
        document.cookie = "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";

        // Kill active legacy connections to prevent post-logout 401s
        import('@/lib/integrations/api/socket').then(({ disconnectSocket }) => {
            disconnectSocket();
        }).catch(() => {});

        router.push("/emergency-login");
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Navigation */}
            <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
                <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-14 sm:h-16">
                        {/* Logo */}
                        <Link href="/ambulance" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-linear-to-br from-red-600 to-orange-600 rounded-lg flex items-center justify-center">
                                <svg
                                    className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-[11px] sm:text-base font-black text-gray-900 truncate tracking-tighter uppercase">
                                    Emergency System
                                </h1>
                                <p className="text-[8px] sm:text-[10px] font-bold text-gray-500 truncate tracking-widest uppercase">
                                    {user.vehicleNumber}
                                </p>
                            </div>
                        </Link>

                        {/* User Profile */}
                        <div className="relative">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center space-x-1 sm:space-x-3 px-1 sm:px-3 py-1 sm:py-2 rounded-lg hover:bg-gray-50"
                            >
                                <div className="w-7 h-7 sm:w-9 sm:h-9 bg-linear-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs sm:text-base font-semibold">
                                    {user.name.charAt(0)}
                                </div>
                                <div className="text-left hidden sm:block">
                                    <div className="text-sm font-medium text-gray-900">
                                        {user.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {user.employeeId}
                                    </div>
                                </div>
                                <svg
                                    className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>

                            {showProfileMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                                    <div className="px-4 py-2 border-b border-gray-100 mb-2 sm:hidden">
                                        <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                                        <p className="text-[10px] text-gray-500 truncate">{user.employeeId}</p>
                                    </div>
                                    <Link
                                        href="/ambulance/profile"
                                        onClick={() => setShowProfileMenu(false)}
                                        className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                                    >
                                        <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        My Profile
                                    </Link>
                                    <Link
                                        href="/ambulance"
                                        onClick={() => setShowProfileMenu(false)}
                                        className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                                    >
                                        <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                        Dashboard
                                    </Link>
                                    <div className="border-t border-gray-100 mt-2 pt-2">
                                        <button
                                            onClick={() => {
                                                setShowProfileMenu(false);
                                                setIsLogoutModalOpen(true);
                                            }}
                                            className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-bold"
                                        >
                                            <svg
                                                className="w-4 h-4 mr-3"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                                />
                                            </svg>
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-4">
                {children}
            </main>

            {/* Logout Confirmation Modal */}
            <LogoutConfirmationModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleLogout}
            />
        </div>
    );
}

export default React.memo(AmbulanceLayout);
