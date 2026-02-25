'use client';

import React, { useState, useEffect } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import {
    LayoutDashboard,
    Users,
    Bell,
    Activity,
    Clock,
    AlertTriangle,
    ClipboardCheck,
    TestTube,
    Pause,
    FileText,
    Calendar
} from "lucide-react";
import { ThemeToggle } from '@/components/ThemeToggle';
import NotificationCenter from "@/components/navbar/NotificationCenter";
import LogoutModal from "@/components/auth/LogoutModal";
import { getSocket, joinSocketRoom } from '@/lib/integrations/api/socket';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import toast from 'react-hot-toast';
import { useNotifications, useDoctorInpatients } from '@/lib/integrations/hooks';
import Navbar from "@/components/navbar/Navbar";
import Link from "next/link";
import { useThemeStore } from '@/stores/themeStore';
import DoctorSupportFloatingBox from "@/components/doctor/DoctorSupportFloatingBox";
import { useTenantLink } from "@/hooks/useTenantLink";


const doctorMenu = [
    {
        group: "Main",
        items: [
            { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: "/doctor" },
            { icon: <Activity size={20} />, label: "Analytics", path: "/doctor/analytics" },
        ]
    },
    {
        group: "Clinical Management",
        items: [
            { icon: <Users size={20} />, label: "Patients", path: "/doctor/patients" },
            { icon: <Pause size={20} />, label: "Paused Appointments", path: "/doctor/paused-appointments" },
            { icon: <TestTube size={20} />, label: "Lab Results", path: "/doctor/lab-results" },
            { icon: <Activity size={20} />, label: "Hourly Monitoring", path: "/doctor/patient-hourly-record" },
        ]
    },
    {
        group: "Personnel",
        items: [
            { icon: <Clock size={20} />, label: "Leave Requests", path: "/doctor/leaves" },
            { icon: <AlertTriangle size={20} />, label: "Medical Incident", path: "/doctor/incidents" },
            { icon: <ClipboardCheck size={20} />, label: "SOP & Policies", path: "/doctor/sop" },
        ]
    },
    {
        group: "System",
        items: [
            { icon: <Bell size={20} />, label: "Announcements", path: "/doctor/announcements" },

        ]
    }
];

const DoctorLayout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, isInitialized, logout, checkAuth, isLoading } = useAuthStore();
    const { theme, toggleTheme } = useThemeStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const queryClient = useQueryClient();
    const { getPath } = useTenantLink(); // ✅ MULTI-TENANCY: Tenant-aware path generator


    // ✅ HOOKS MUST BE AT THE TOP (Rules of Hooks)

    // Initial Auth Load
    useEffect(() => {
        useAuthStore.getState().initEvents();
        checkAuth();
    }, [checkAuth]);

    // Clinical Alerts hook - Optimized with aggressive caching
    const { data: activeAlerts } = useQuery({
        queryKey: ['active-alerts', user?.id],
        queryFn: () => ipdService.getActiveAlerts({ doctorId: user?.id }),
        enabled: !!user?.id && user?.role === 'doctor',
        staleTime: 20000, // Cache for 20 seconds - instant load on navigation
        refetchInterval: 20000, // Auto-refresh every 20 seconds for live updates
        refetchOnWindowFocus: true,
        refetchOnReconnect: true
    });

    // Inpatient Count hook - Optimized with caching & unified hook
    const { data: admissionsData, isLoading: isInpatientsLoading } = useDoctorInpatients(user?.id, user?.role);
    const admissions = admissionsData || [];
    const inpatientCount = admissions.length;

    // Notifications hook
    const { data: notifications } = useNotifications();

    // Redirect Effect
    useEffect(() => {
        if (isInitialized) {
            if (!isAuthenticated) {
                router.push('/auth/login');
            } else if (!['doctor', 'hospital-admin', 'super-admin', 'helpdesk', 'nurse'].includes(user?.role || '')) {
                const routeMap: Record<string, string> = {
                    'staff': '/staff',
                    'lab': '/lab/dashboard',
                    'patient': '/patient/dashboard'
                };
                router.push(routeMap[user?.role || ''] || '/auth/login');
            }
        }
    }, [isAuthenticated, isInitialized, user?.role, router]);

    // Socket Effect
    useEffect(() => {
        if (isAuthenticated && user) {
            const initSocket = async () => {
                const socket = await getSocket();
                if (socket) {
                    joinSocketRoom({
                        userId: user.id || (user as any)._id,
                        role: user.role,
                        hospitalId: user.hospitalId || (user as any).hospital
                    });

                    socket.on('leave:status_change', (data: any) => {
                        console.log('📡 [Doctor] Leave Status Sync Received:', data);
                        const status = data.leave.status;
                        const toastIcon = status === 'approved' ? '✅' : '❌';
                        toast(`Leave Request ${status.toUpperCase()}!`, { icon: toastIcon, duration: 4000 });

                        queryClient.refetchQueries({ queryKey: ['staff'] });
                        queryClient.invalidateQueries({ queryKey: ['staff'] });
                    });

                    socket.on('incident_update', (data: any) => {
                        console.log('📡 [Doctor] Incident Status Sync Received:', data);
                        toast(`Incident ${data.status.toUpperCase()}: ${data.incidentId}`, {
                            icon: '🏥',
                            duration: 5000
                        });
                        queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
                    });

                    socket.on('new_incident', (data: any) => {
                        queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
                    });

                    socket.on('vitals_updated', (data: any) => {
                        console.log('📡 [Doctor] Vitals Update Received:', data);
                        queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
                        queryClient.invalidateQueries({ queryKey: ['patient-details'] });
                        queryClient.invalidateQueries({ queryKey: ['doctor-inpatients'] });
                    });

                    socket.on('doctoral_vital_alert', (data: any) => {
                        console.log('🚨 [Doctor] High Priority Vital Alert:', data);
                        const { patientName, message, severity } = data;
                        toast.error(
                            <div className="flex flex-col gap-1">
                                <span className="font-black uppercase tracking-tighter flex items-center gap-2">
                                    <AlertTriangle size={14} className="animate-pulse" />
                                    {severity} VITAL ALERT
                                </span>
                                <span className="text-xs font-bold">{patientName}: {message}</span>
                            </div>,
                            { duration: 8000 }
                        );
                        queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
                        queryClient.invalidateQueries({ queryKey: ['doctor-inpatients'] });
                    });
                }
            };
            initSocket();

            return () => {
                const cleanup = async () => {
                    const socket = await getSocket();
                    if (socket) {
                        socket.off('leave:status_change');
                        socket.off('incident_update');
                        socket.off('new_incident');
                        socket.off('vitals_updated');
                        socket.off('doctoral_vital_alert');
                    }
                };
                cleanup();
            };
        }
    }, [isAuthenticated, user, queryClient]);

    // Expiry Header Alerts Effect
    useEffect(() => {
        if (notifications && Array.isArray(notifications)) {
            const unreadExpiry = notifications.filter(n => !n.isRead && n.type === 'license_expiry');
            if (unreadExpiry.length > 0) {
                const sorted = unreadExpiry.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                const latestNotif = sorted[0];

                toast(latestNotif.message, {
                    icon: '⚠️',
                    duration: 10000,
                    id: `expiry-${latestNotif._id}`,
                    style: {
                        borderRadius: '16px',
                        background: '#fffbeb',
                        color: '#92400e',
                        border: '1px solid #fde68a',
                        fontWeight: 'bold'
                    }
                });
            }
        }
    }, [notifications]);

    const handleConfirmLogout = async () => {
        await logout();
        router.push('/auth/login');
    };

    // ✅ CONDITIONAL RETURNS MUST BE AFTER ALL HOOKS

    // Authorization Guard
    if (isInitialized && isAuthenticated && user?.role && !['doctor', 'hospital-admin', 'super-admin', 'helpdesk', 'nurse'].includes(user.role)) {
        return null;
    }

    // Initialization Loading UI
    if (isLoading || !isInitialized) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-4 border-4 border-teal-600/20 border-b-teal-600 rounded-full animate-spin-reverse"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                        </div>
                    </div>
                    <div>
                        <p className="text-xl font-black text-foreground uppercase tracking-tighter italic text-center">Doctor Portal</p>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest text-center mt-1">Verifying Clinical Node</p>
                    </div>
                </div>
            </div>
        );
    }

    // Role safeguard final check
    if (!isAuthenticated || !['doctor', 'hospital-admin', 'super-admin', 'helpdesk', 'nurse'].includes(user?.role || '')) return null;

    const doctorUser = {
        name: user?.name || 'Doctor',
        role: 'doctor',
        image: (user as any)?.image || '',
    };

    const inpatientStats = {
        total: admissions.length,
        critical: admissions.filter(a => a.vitals?.status === 'Critical' || a.vitals?.condition === 'Critical' || (a.vitals?.spO2 && Number(a.vitals.spO2) < 90)).length,
        warning: admissions.filter(a => (a.vitals?.status === 'Warning' || ['Fair', 'Serious'].includes(a.vitals?.condition)) && !(a.vitals?.status === 'Critical' || (a.vitals?.spO2 && Number(a.vitals.spO2) < 90))).length
    };

    const doctorActions = (
        <div className="flex items-center p-1 bg-slate-100 dark:bg-gray-800/40 rounded-full border border-slate-200/50 dark:border-gray-700/50 backdrop-blur-sm shadow-sm">
            <Link
                href={getPath('/doctor/inpatients')}
                className={`px-3 py-1.5 sm:px-6 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-2.5 ${pathname.includes('/doctor/inpatients')
                    ? "bg-primary-theme text-white shadow-lg shadow-primary-theme/20"
                    : "text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
            >
                Inpatients
                <div className="flex items-center gap-1.5 border-l border-white/20 pl-2">
                    <span className={`px-1.5 py-0.5 rounded-md tabular-nums text-[9px] min-w-[20px] text-center ${pathname.includes('/doctor/inpatients') ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-gray-700 text-slate-600"}`}>
                        {inpatientStats.total}
                    </span>
                    {inpatientStats.critical > 0 && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[9px] font-black animate-pulse shadow-sm shadow-rose-500/20">
                            <AlertTriangle size={10} />
                            {inpatientStats.critical}
                        </span>
                    )}
                    {inpatientStats.warning > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-black shadow-sm shadow-amber-500/20">
                            {inpatientStats.warning}
                        </span>
                    )}
                </div>
            </Link>

            <Link
                href={getPath('/doctor/appointments')}
                className={`px-3 py-1.5 sm:px-6 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${pathname.includes('/doctor/appointments')
                    ? "bg-primary-theme text-white  dark:shadow-none"
                    : "text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
            >
                Appointments
            </Link>

            <Link
                href={getPath('/doctor/prescription')}
                className={`px-3 py-1.5 sm:px-6 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${pathname.includes('/doctor/prescription')
                    ? "bg-primary-theme text-white  dark:shadow-none"
                    : "text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
            >
                Prescriptions
            </Link>
        </div>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Logout Modal */}
            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleConfirmLogout}
                userName={user?.name}
            />

            <aside className={`
                fixed left-0 top-0 h-full w-64 bg-card border-r border-border-theme z-40
                transform-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="h-16 flex items-center px-6 border-b border-border-theme gap-2">
                    <div className="w-8 h-8 bg-primary-theme rounded-lg flex items-center justify-center text-primary-theme-foreground">
                        <Activity size={20} />
                    </div>
                    <h1 className="text-lg font-bold text-foreground">
                        Doctor Portal
                    </h1>
                </div>

                <nav className="p-4 space-y-8 h-[calc(100vh-64px)] overflow-y-auto border-t border-border-theme/50">
                    {doctorMenu.map((group) => (
                        <div key={group.group} className="space-y-2">
                            <h3 className="px-4 text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-70">
                                {group.group}
                            </h3>
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const tenantPath = getPath(item.path);
                                    const isDashboard = item.path === '/doctor';
                                    const isActive = isDashboard
                                        ? pathname === tenantPath
                                        : pathname === tenantPath || pathname.startsWith(tenantPath + '/');
                                    const isInpatients = item.path === '/doctor/inpatients';
                                    const showCriticalAlert = isInpatients && inpatientStats.critical > 0;
                                    const showWarningAlert = isInpatients && inpatientStats.warning > 0 && !showCriticalAlert;
                                    const showInpatientAlert = showCriticalAlert || showWarningAlert;
                                    const showInpatientCount = isInpatients && inpatientStats.total > 0;

                                    return (
                                        <button
                                            key={item.path}
                                            onClick={() => {
                                                router.push(tenantPath);
                                                setIsSidebarOpen(false);
                                            }}
                                            className={`
                                                flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold w-full group transition-all relative
                                                ${isActive
                                                    ? 'bg-primary-theme/10 text-primary-theme font-black '
                                                    : 'text-muted hover:bg-secondary-theme hover:text-foreground'}
                                                ${showCriticalAlert && !isActive ? 'border border-rose-500/50 bg-rose-50/10' : ''}
                                                ${showWarningAlert && !isActive ? 'border border-amber-500/50 bg-amber-50/10' : ''}
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`
                                                    ${isActive ? 'text-primary-theme-foreground' : 'text-muted group-hover:text-primary-theme'}
                                                    ${showCriticalAlert ? 'animate-pulse text-rose-500' : ''}
                                                    ${showWarningAlert ? 'text-amber-500' : ''}
                                                `}>
                                                    {item.icon}
                                                </span>
                                                <span className={
                                                    showCriticalAlert ? 'text-rose-600 font-black' :
                                                        showWarningAlert ? 'text-amber-600 font-black' : ''
                                                }>
                                                    {item.label}
                                                </span>
                                            </div>

                                            {showCriticalAlert && (
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                                                    <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100 uppercase tracking-tighter">
                                                        {inpatientStats.critical}
                                                    </span>
                                                </div>
                                            )}
                                            {showWarningAlert && (
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                                                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100 uppercase tracking-tighter">
                                                        {inpatientStats.warning}
                                                    </span>
                                                </div>
                                            )}
                                            {showInpatientCount && !showInpatientAlert && (
                                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/50 tabular-nums">
                                                    {inpatientStats.total}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full min-w-0 lg:ml-64 relative">
                <Navbar
                    title="Doctor Portal"
                    user={doctorUser}
                    onMenuClick={() => setIsSidebarOpen(true)}
                    isDarkMode={theme === 'dark'}
                    onThemeToggle={toggleTheme}
                    onLogout={() => setIsLogoutModalOpen(true)}
                    className="sticky top-0 z-30 shrink-0"
                    profileHref={getPath('/doctor/profile')}
                    centerActions={doctorActions}
                    titleHref={getPath('/doctor')}
                    showLogo={false}
                />

                <main className="p-4 lg:p-8 flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                    <div className="max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm transition-all"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
            {/* Floating Support & Feedback Box */}
            <DoctorSupportFloatingBox />
        </div>
    );
}

export default React.memo(DoctorLayout);
