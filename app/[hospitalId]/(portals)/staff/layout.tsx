'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import Sidebar, { SidebarItem } from '@/components/slidebar/Sidebar';
import { LayoutDashboard, CalendarCheck, Calendar, Clock, Bell, User, ReceiptText, BookOpenCheck, LogOut, AlertTriangle, ClipboardCheck, LifeBuoy } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import LogoutModal from '@/components/auth/LogoutModal';
import { getSocket, joinSocketRoom } from '@/lib/integrations/api/socket';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNotifications } from '@/lib/integrations/hooks';
import { staffService } from '@/lib/integrations';
import StaffSupportFloatingBox from '@/components/staff/StaffSupportFloatingBox';
import { useTenantLink } from '@/hooks/useTenantLink';


const staffMenuItems: SidebarItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/staff' },
    { icon: CalendarCheck, label: 'Leave & Absence', href: '/staff/leaves' },
    { icon: BookOpenCheck, label: 'My Schedule', href: '/staff/schedule' },
    { icon: AlertTriangle, label: 'Medical Incident', href: '/staff/incidents' },
    { icon: ClipboardCheck, label: 'SOP & Policies', href: '/staff/sop' },
    { icon: Bell, label: 'Announcements', href: '/staff/announcements' },
];

function StaffLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user, logout, isInitialized, isAuthenticated, isLoading, checkAuth, initEvents } = useAuthStore();
    const { theme, toggleTheme } = useThemeStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const { getPath } = useTenantLink(); // ✅ MULTI-TENANCY

    useEffect(() => {
        initEvents();
        checkAuth();

        // Prefetch critical routes for faster navigation
        const prefetchRoutes = [
            '/staff/leaves',
            '/staff/schedule',
            '/staff/announcements'
        ];

        prefetchRoutes.forEach(route => {
            router.prefetch(route);
        });
    }, [router]);

    useEffect(() => {
        if (isInitialized) {
            if (!isAuthenticated) {
                router.push('/auth/login');
            } else if (user?.role !== 'staff') {
                const routeMap: Record<string, string> = {
                    'doctor': '/doctor',
                    'hospital-admin': '/hospital-admin',
                    'lab': '/lab/dashboard',
                    'pharmacy': '/pharmacy/dashboard',
                    'pharma-owner': '/pharmacy/dashboard',
                    'super-admin': '/admin',
                    'admin': '/admin'
                };
                router.push(routeMap[user?.role || ''] || '/auth/login');
            }
        }
    }, [isInitialized, isAuthenticated, user?.role, router]);

    // ✅ REAL-TIME DYNAMICS: Leave Status Sync
    const queryClient = useQueryClient();
    useEffect(() => {
        if (isAuthenticated && user) {
            const initSocket = async () => {
                const socket = await getSocket();
                if (socket) {
                    joinSocketRoom({
                        userId: user.id,
                        role: user.role,
                        hospitalId: user.hospitalId || (user as any).hospital
                    });

                    socket.on('leave:status_change', (data: any) => {
                        console.log('📡 [Staff] Leave Status Sync Received:', data);
                        const status = data.leave.status;
                        const toastIcon = status === 'approved' ? '✅' : '❌';
                        toast(`Leave Request ${status.toUpperCase()}!`, { icon: toastIcon, duration: 4000 });

                        // ✅ INSTANT SYNC: Refetch and invalidate all staff-scoped data
                        queryClient.refetchQueries({ queryKey: ['staff'] });
                        queryClient.invalidateQueries({ queryKey: ['staff'] });
                    });

                    // ✅ NEW: Real-time Incident Status Sync
                    socket.on('incident_update', (data: any) => {
                        console.log('📡 [Staff] Incident Status Sync Received:', data);
                        toast(`Incident ${data.status.toUpperCase()}: ${data.incidentId}`, {
                            icon: '🏥',
                            duration: 5000
                        });
                        queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
                    });

                    // ✅ NEW: Real-time New Incident Sync
                    socket.on('new_incident', (data: any) => {
                        queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
                    });

                    // ✅ REAL-TIME: Notification Listener (Specifically for Expiry Alerts)
                    socket.on('notification:new', (notif: any) => {
                        console.log('📡 [Staff] New Notification Socket Received:', notif);
                        if (notif.type === 'license_expiry') {
                            toast(notif.message || 'License Expiry Warning', {
                                icon: '⚠️',
                                duration: 8000,
                                style: {
                                    borderRadius: '16px',
                                    background: '#fffbeb',
                                    color: '#92400e',
                                    border: '1px solid #fde68a',
                                    fontWeight: 'bold'
                                }
                            });
                        }
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
                        socket.off('notification:new');
                    }
                };
                cleanup();
            };
        }
    }, [isAuthenticated, user, queryClient]);

    // ✅ CHECK FOR UNREAD EXPIRY ALERTS ON MOUNT
    const { data: notifications } = useNotifications();
    useEffect(() => {
        if (notifications && Array.isArray(notifications)) {
            // Filter unread expiry notifications
            const unreadExpiry = notifications.filter(n => !n.isRead && n.type === 'license_expiry');

            // Sort by createdAt descending (newest first) and take the top one
            // This prevents stacking multiple alerts if old ones exist
            if (unreadExpiry.length > 0) {
                // Sort by creation time if available, or just take the last one assuming order
                // Safest to rely on array structure if sorted from backend, but explicit sort is better
                const sorted = unreadExpiry.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                const latestNotif = sorted[0];

                toast(latestNotif.message, {
                    icon: '⚠️',
                    duration: 10000,
                    id: `expiry-${latestNotif._id}`, // Prevent duplicate toasts
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
        router.push('/');
    };

    // ✅ Attendance Implementation
    const [todayAttendance, setTodayAttendance] = useState<any>(null);
    const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated && user?.role === 'staff') {
            fetchAttendanceStatus();
        }
    }, [isAuthenticated, user?.role]);

    const fetchAttendanceStatus = async () => {
        try {
            const data = await staffService.getTodayStatus();
            setTodayAttendance(data.attendance);
        } catch (error) {
            console.error('Failed to fetch attendance status:', error);
        }
    };

    const handleAttendanceAction = async (action: 'check-in' | 'check-out') => {
        try {
            setIsAttendanceLoading(true);
            let response;
            if (action === 'check-in') {
                response = await staffService.checkIn();
                toast.success('Successfully Checked In!', { icon: '🚀' });
            } else {
                response = await staffService.checkOut();
                toast.success('Successfully Checked Out!', { icon: '👋' });
            }
            setTodayAttendance(response.attendance);
            // ✅ Fix: Use correct query keys for reliable dashboard sync
            queryClient.invalidateQueries({ queryKey: ['staff', 'dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['staff', 'today-status'] });
        } catch (error: any) {
            toast.error(error?.message || `Failed to ${action}`);
        } finally {
            setIsAttendanceLoading(false);
        }
    };

    // Premium Loading State
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
                        <p className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Initializing Portal</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mt-1">Verifying Credentials • MScurechain</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || user?.role !== 'staff') return null;

    const attendanceButtons = (
        <div className="flex items-center gap-2">
            {!todayAttendance || !todayAttendance.checkIn ? (
                <button
                    onClick={() => handleAttendanceAction('check-in')}
                    disabled={isAttendanceLoading}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all disabled:opacity-50"
                >

                    <span>Check In Now</span>
                </button>
            ) : !todayAttendance.checkOut ? (
                <button
                    onClick={() => handleAttendanceAction('check-out')}
                    disabled={isAttendanceLoading}
                    className="flex items-center gap-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-rose-200 disabled:opacity-50"
                >
                    <LogOut size={14} className={isAttendanceLoading ? 'animate-spin' : ''} />
                    <span>Check Out</span>
                </button>
            ) : (
                <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-100">
                    <span>Duty Completed</span>
                </div>
            )}
        </div>
    );

    const staffUser = {
        name: user?.name || "Staff Member",
        role: user?.role || "Staff",
        image: (user as any)?.image || ""
    };

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleConfirmLogout}
                userName={user?.name}
            />
            {/* Sidebar */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                items={staffMenuItems}
                onLogout={() => setIsLogoutModalOpen(true)}
            />

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-64' /* Simple desktop persistence */}`}>

                {/* Navbar */}
                <Navbar
                    titleHref={getPath('/staff')}
                    user={staffUser}
                    onMenuClick={() => setIsSidebarOpen(true)}
                    isDarkMode={theme === 'dark'}
                    onThemeToggle={toggleTheme}
                    onLogout={() => setIsLogoutModalOpen(true)}
                    className="sticky top-0 z-30"
                    profileHref={getPath('/staff/profile')}
                    actions={attendanceButtons}
                />

                {/* Page Content */}
                <main className="p-1 sm:p-2.5 flex-1 overflow-y-auto bg-transparent">
                    {children}
                </main>
            </div>
            {/* Floating Support Icon */}
            <StaffSupportFloatingBox />
        </div>
    );
}


export default React.memo(StaffLayout);
