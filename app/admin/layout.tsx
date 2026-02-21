
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import { Settings, LogOut, X, User, ChevronDown, ChevronRight } from "lucide-react";
import LogoutModal from "@/components/auth/LogoutModal";
import { ThemeToggle } from '@/components/ThemeToggle';
import NotificationCenter from "@/components/navbar/NotificationCenter";
import AdminSupportFloatingBox from "@/components/admin/AdminSupportFloatingBox";
import HospitalSwitcher from "@/components/admin/HospitalSwitcher";

interface MenuItem {
    icon: string;
    label: string;
    path: string;
    children?: MenuItem[];
}

const adminMenu: MenuItem[] = [
    { icon: "/dashboard.png", label: "Dashboard", path: "/admin" },
    { icon: "/assets/reports.png", label: "Analytics", path: "/admin/analytics" },
    { icon: "/assets/user.png", label: "All Users", path: "/admin/users" },
    { icon: "/assets/doctor.png", label: "Hospitals", path: "/admin/hospitals" },
    { icon: "/assets/doctor.png", label: "Doctors", path: "/admin/doctors" },
    { icon: "/assets/user.png", label: "Patients", path: "/admin/patients" },
    { icon: "/assets/user.png", label: "Front Desk", path: "/admin/helpdesks" },
    { icon: "/assets/user.png", label: "HR Management", path: "/admin/hr" },

    // Creating Credentials Dropdown
    {
        icon: "/assets/user.png",
        label: "Creating Credentials",
        path: "#credentials",
        children: [

            { icon: "/assets/doctor.png", label: "Create Hospital Admin", path: "/admin/create-hospital-admin" },
            { icon: "/assets/user.png", label: "Create HR", path: "/admin/create-hr" },
            { icon: "/assets/prescription.png", label: "Create Pharmacy", path: "/admin/create-pharma" },
            { icon: "/assets/reports.png", label: "Create Lab", path: "/admin/create-lab" },
            { icon: "/assets/eme.png", label: "Create Emergency", path: "/admin/create-emergency" },
            { icon: "/assets/user.png", label: "Create HelpDesk", path: "/admin/create-helpdesk" },
            { icon: "/assets/doctor.png", label: "Create Hospital", path: "/admin/create-hospital" },
            { icon: "/assets/doctor.png", label: "Create Doctor", path: "/admin/create-doctor" },
            { icon: "/assets/user.png", label: "Assign Doctor", path: "/admin/assign-doctor" },
        ]
    },

    { icon: "/assets/doctor.png", label: "Hospital Admins", path: "/admin/hospital-admins" },
    { icon: "/assets/reports.png", label: "Audit Logs", path: "/admin/audits" },
    { icon: "/assets/help.png", label: "Support & Feedback", path: "/admin/support" },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();
    // @ts-ignore - accessing new property
    const { user, logout, isAuthenticated, checkAuth, isLoading, isInitialized } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchPlaceholder, setSearchPlaceholder] = useState("Search...");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    // Sidebar Expansion State
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
        "Creating Credentials": true // Default open for better UX
    });

    const toggleSubMenu = (label: string) => {
        setExpandedMenus(prev => ({
            ...prev,
            [label]: !prev[label]
        }));
    };

    const adminUser = user || {
        name: "Super Admin",
        role: "Super Admin",
        avatar: null,
    };

    // Auth guard - check authentication on mount
    useEffect(() => {
        useAuthStore.getState().initEvents();
        checkAuth();
    }, []);

    // Redirect to login if not authenticated after initialization
    useEffect(() => {
        if (isInitialized) {
            if (!isAuthenticated) {
                router.push('/auth/login');
            } else if (user?.role !== 'admin' && user?.role !== 'super-admin') {
                const routeMap: Record<string, string> = {
                    'staff': '/staff',
                    'doctor': '/doctor',
                    'hospital-admin': '/hospital-admin',
                    'lab': '/lab/dashboard',
                    'pharma-owner': '/pharmacy/dashboard',
                    'pharmacy': '/pharmacy/dashboard',
                    'helpdesk': '/helpdesk',
                    'patient': '/patient'
                };
                router.push(routeMap[user?.role || ''] || '/auth/login');
            }
        }
    }, [isAuthenticated, isInitialized, user?.role, router]);

    const handleConfirmLogout = async () => {
        await logout();
        router.push('/');
    };

    // Premium Loading UI
    if (isLoading || !isInitialized) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-4 border-4 border-indigo-600/20 border-b-indigo-600 rounded-full animate-spin-reverse"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                    </div>
                    <div>
                        <p className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic text-center">Super Admin</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mt-1">Verifying Root Node</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super-admin')) return null;

    return (
        <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-color)' }}>
            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleConfirmLogout}
                userName={user?.name}
            />
            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Close button for mobile */}
            {isSidebarOpen && (
                <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="lg:hidden fixed top-2 right-4 z-50 p-2 rounded-md shadow-md"
                    style={{
                        backgroundColor: 'var(--card-bg)',
                        color: 'var(--secondary-color)'
                    }}
                >
                    <X size={24} />
                </button>
            )}

            {/* Sidebar */}
            <div className={`
                fixed left-0 top-0 h-full w-72 text-(--secondary-color) flex flex-col z-40
                transform-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                border-r
            `}
                style={{
                    backgroundColor: 'var(--sidebar-bg)',
                    borderColor: 'var(--border-color)'
                }}
            >
                {/* Brand */}
                <div className="h-16 flex items-center justify-between px-6 border-b"
                    style={{ borderColor: 'var(--border-color)' }}
                >
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold bg-linear-to-r from-blue-600 to-cyan-500 text-transparent bg-clip-text tracking-wide">
                            Admin Panel
                        </h1>
                    </div>
                </div>

                {/* Scrollable menu area */}
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 hide-scrollbar">
                    {adminMenu.map((item) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const isExpanded = expandedMenus[item.label];
                        const isActive = pathname === item.path || (hasChildren && item.children?.some(child => pathname === child.path));

                        if (hasChildren) {
                            return (
                                <div key={item.label}>
                                    <button
                                        onClick={() => toggleSubMenu(item.label)}
                                        className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium w-full text-left
                                            ${isActive ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
                                        `}
                                        style={{ color: isActive ? 'var(--primary-color)' : 'var(--secondary-color)' }}
                                    >
                                        <div className="flex items-center gap-3">
                                            {item.icon && (
                                                <img src={item.icon} alt={item.label} className="w-5 h-5 object-contain" />
                                            )}
                                            {item.label}
                                        </div>
                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>

                                    {isExpanded && (
                                        <div className="pl-4 mt-1 space-y-1 border-l-2 border-gray-100 dark:border-gray-800 ml-4">
                                            {item.children?.map((child) => {
                                                const isChildActive = pathname === child.path;
                                                return (
                                                    <button
                                                        key={child.path}
                                                        onClick={() => {
                                                            router.push(child.path);
                                                            setIsSidebarOpen(false);
                                                        }}
                                                        className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium w-full text-left
                                                            ${isChildActive
                                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                                : 'hover:text-(--text-color) hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                                            }`}
                                                        style={!isChildActive ? {
                                                            color: 'var(--secondary-color)'
                                                        } : {}}
                                                    >
                                                        {child.icon && (
                                                            <img src={child.icon} alt={child.label} className="w-4 h-4 object-contain opacity-70" />
                                                        )}
                                                        {child.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <button
                                key={item.path}
                                onClick={() => {
                                    router.push(item.path);
                                    setIsSidebarOpen(false);
                                }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left
                                    ${isActive
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'hover:text-(--text-color)'
                                    }`}
                                style={!isActive ? {
                                    backgroundColor: 'transparent',
                                    color: 'var(--secondary-color)'
                                } : {}}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.backgroundColor = 'var(--card-bg)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                {item.icon && (
                                    <img
                                        src={item.icon}
                                        alt={item.label}
                                        className="w-5 h-5 object-contain"
                                    />
                                )}
                                {item.label}
                            </button>
                        );
                    })}
                </div>


            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:ml-72 min-h-screen w-full max-w-full overflow-x-hidden">
                {/* Navbar */}
                <header className="h-16 flex items-center justify-between px-4 border-b"
                    style={{
                        backgroundColor: 'var(--navbar-bg)',
                        borderColor: 'var(--border-color)'
                    }}
                >
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="lg:hidden"
                        style={{ color: 'var(--text-color)' }}
                    >
                        ☰
                    </button>
                    <div className="flex-1 max-w-md mx-4">
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{
                                backgroundColor: 'var(--card-bg)',
                                color: 'var(--text-color)',
                                border: '1px solid var(--border-color)'
                            }}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <HospitalSwitcher />
                        <NotificationCenter />
                        <ThemeToggle />
                        <div className="h-6 w-px" style={{ backgroundColor: 'var(--border-color)' }}></div>
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                className="flex items-center gap-2 hover:opacity-80"
                            >
                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg hover:shadow-xl">
                                    {adminUser.name?.charAt(0).toUpperCase() || "A"}
                                </div>
                                <div className="hidden md:block text-left">
                                    <p className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>
                                        {adminUser.name}
                                    </p>
                                    <p className="text-xs opacity-60">Super Admin</p>
                                </div>
                            </button>

                            {/* Dropdown Menu */}
                            {isProfileDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setIsProfileDropdownOpen(false)} />
                                    <div
                                        className="absolute right-0 mt-2 w-64 rounded-xl shadow-2xl border z-40 overflow-hidden"
                                        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                                    >
                                        <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow">
                                                    {adminUser.name?.charAt(0).toUpperCase() || "A"}
                                                </div>
                                                <div>
                                                    <p className="font-bold" style={{ color: 'var(--text-color)' }}>{adminUser.name}</p>
                                                    <p className="text-xs opacity-60">Super Administrator</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="py-2">
                                            <button
                                                onClick={() => { router.push('/admin/profile'); setIsProfileDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
                                                style={{ color: 'var(--text-color)' }}
                                            >
                                                <User size={18} className="text-blue-500" />
                                                <span>My Profile</span>
                                            </button>
                                            <button
                                                onClick={() => { setIsLogoutModalOpen(true); setIsProfileDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                                            >
                                                <LogOut size={18} />
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <div className="p-4 max-[600px]:p-2 flex-1 overflow-y-auto"
                    style={{ backgroundColor: 'var(--bg-color)' }}
                >
                    {children}
                </div>
            </div>
            {/* Floating Support & Feedback Box */}
            <AdminSupportFloatingBox />
        </div>
    );
};

export default AdminLayout;