'use client';

import React, { useEffect, useMemo, useCallback, Suspense } from 'react';
import {
    Clock,
    LogIn,
    LogOut,
    CheckCircle2,
    Key,
    Copy,
    X,
    Calendar,
    Bell,
    TrendingUp,
    ArrowUpRight,
    ChevronRight,
    ReceiptText,
    BookOpenCheck,
    User as UserIcon,
    Search,
    Zap
} from 'lucide-react';
import type { AttendanceHistory } from '@/lib/integrations/types';
import { API_CONFIG } from '@/lib/integrations/config/api-config';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useStaffDashboard, useAttendanceHistory, useAnnouncements, useCheckIn, useCheckOut } from '@/lib/integrations/hooks';
import { StaffDashboardSkeleton } from '@/components/ui/skeletons';

const StaffDashboardPage = React.memo(function StaffDashboardPage() {
    const router = useRouter();
    const [helpdeskNotification, setHelpdeskNotification] = React.useState<{
        loginId: string;
        password: string;
        hospital: string;
    } | null>(null);

    // ✅ React Query hooks with placeholderData for instant cached display
    const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard, isPlaceholderData: isDashboardPlaceholder } = useStaffDashboard();
    const { data: historyData, isPlaceholderData: isHistoryPlaceholder } = useAttendanceHistory({ limit: 5, page: 1 });
    const { data: announcementsData, isPlaceholderData: isAnnouncementsPlaceholder } = useAnnouncements();

    // ✅ Optimized mutations with automatic cache invalidation
    const checkInMutation = useCheckIn();
    const checkOutMutation = useCheckOut();

    // ✅ Memoized derived data
    const attendanceHistory = useMemo(() => historyData?.attendance || [], [historyData]);
    const announcements = useMemo(() => (announcementsData?.announcements || []).slice(0, 3), [announcementsData]);

    // Socket connection for helpdesk credentials
    useEffect(() => {
        let socket: any;
        const connectToSocket = async () => {
            try {
                if (dashboard?.staff) {
                    const socketIO = await import('socket.io-client');
                    const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
                    socket = socketIO.io(baseUrl, {
                        auth: { token: localStorage.getItem('token') },
                        transports: ['websocket'],
                    });

                    socket.emit('join_room', {
                        role: 'staff',
                        userId: dashboard.staff.staffProfileId || dashboard.staff._id
                    });

                    socket.on('helpdesk_credentials', (data: any) => {
                        setHelpdeskNotification({
                            loginId: data.loginId,
                            password: data.password,
                            hospital: data.hospital
                        });
                        toast.success('New Helpdesk Credentials Received!', { duration: 6000, icon: '🔑' });
                    });
                }
            } catch (err) {
                console.error('Socket connection error:', err);
            }
        };

        connectToSocket();

        return () => {
            if (socket) {
                socket.off('helpdesk_credentials');
                socket.disconnect();
            }
        };
    }, [dashboard?.staff]);

    // ✅ Optimized handlers with useCallback
    const handleCheckIn = useCallback(async () => {
        try {
            await checkInMutation.mutateAsync(undefined);
            toast.success('Checked in successfully!');
        } catch (error) {
            console.error('Check-in failed:', error);
            toast.error('Failed to check in');
        }
    }, [checkInMutation]);

    const handleCheckOut = useCallback(async () => {
        try {
            await checkOutMutation.mutateAsync(undefined);
            toast.success('Checked out successfully!');
        } catch (error) {
            console.error('Check-out failed:', error);
            toast.error('Failed to check out');
        }
    }, [checkOutMutation]);

    // ✅ Only show skeleton on true initial load (not on cached data)
    const showSkeleton = dashboardLoading && !dashboard;

    if (showSkeleton) {
        return <StaffDashboardSkeleton />;
    }

    if (!dashboard || !dashboard.staff) return null;

    const { staff, stats, todayAttendance } = dashboard;
    const hasCheckedIn = !!todayAttendance?.checkIn;
    const hasCheckedOut = !!todayAttendance?.checkOut;

    // Shift Enforcement Logic from Resolved Backend data
    const shiftStartTime = staff.resolvedShift?.startTime || '09:00';
    const shiftEndTime = staff.resolvedShift?.endTime || '17:00';
    const shiftName = staff.resolvedShift?.name || 'General';

    const now = new Date();
    const [startH, startM] = shiftStartTime.split(':').map(Number);
    const [endH, endM] = shiftEndTime.split(':').map(Number);

    const shiftStart = new Date();
    shiftStart.setHours(startH, startM, 0, 0);
    const shiftEnd = new Date();
    shiftEnd.setHours(endH, endM, 0, 0);
    if (shiftEnd < shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);

    const earlyBuffer = new Date(shiftStart.getTime() - 30 * 60000); // 30 mins before
    const isShiftTime = now >= earlyBuffer && now <= shiftEnd;
    const isShiftEnded = now > shiftEnd;
    const isTooEarly = now < earlyBuffer;

    const formatTime = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(h, m, 0, 0);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    return (
        <div
            className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in duration-150"
        >
            {/* Helpdesk Credentials Notification */}
            {helpdeskNotification && (
                <div className="bg-linear-to-r from-indigo-700 via-blue-800 to-indigo-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl"></div>

                    <div className="relative flex flex-col xl:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-inner border border-white/20">
                                <Key className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black flex items-center gap-3">
                                    New Helpdesk Assigned!
                                    <span className="bg-emerald-400 text-emerald-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">Live</span>
                                </h3>
                                <p className="text-indigo-100 font-medium mt-1">
                                    You have been assigned to <span className="font-black underline decoration-emerald-400 underline-offset-4">{helpdeskNotification.hospital}</span>.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 bg-black/30 p-5 rounded-2xl backdrop-blur-2xl border border-white/10 shadow-2xl">
                            <div className="space-y-1.5 min-w-[160px]">
                                <p className="text-[10px] uppercase tracking-widest text-indigo-200 font-black">Login ID</p>
                                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/5 group hover:bg-white/20">
                                    <code className="text-xl font-mono font-black tracking-widest">{helpdeskNotification.loginId}</code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(helpdeskNotification.loginId);
                                            toast.success('Login ID copied!');
                                        }}
                                        className="p-1.5 hover:bg-white/20 rounded-lg text-indigo-200 active:scale-90"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="hidden xl:block w-px h-12 bg-white/10 mx-2"></div>
                            <div className="space-y-1.5 min-w-[160px]">
                                <p className="text-[10px] uppercase tracking-widest text-indigo-200 font-black">Password</p>
                                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/5 group hover:bg-white/20">
                                    <code className="text-xl font-mono font-black tracking-widest">{helpdeskNotification.password}</code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(helpdeskNotification.password);
                                            toast.success('Password copied!');
                                        }}
                                        className="p-1.5 hover:bg-white/20 rounded-lg text-indigo-200 active:scale-90"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setHelpdeskNotification(null)}
                            className="absolute -top-4 -right-4 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white border border-white/10 group shadow-lg active:scale-95 backdrop-blur-md"
                        >
                            <X className="w-5 h-5 text-indigo-100 group-hover:scale-110" />
                        </button>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl max-sm:text-2xl font-black text-gray-900 tracking-tight">
                        Hello, {(staff.user?.name || (staff as any).name || 'Staff').split(' ')[0]}!
                    </h1>
                    <p className="text-gray-500 font-bold flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-600" />
                        Ready for another productive day at {staff.hospital.name}?
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden lg:flex flex-col items-end mr-2">
                        <span className="text-sm font-black text-gray-900">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</span>
                        <span className="text-xs font-bold text-gray-400">{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Attendance */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Check In/Out Card */}
                <div className="lg:col-span-4 h-full">
                    <div className="bg-white rounded-[0.5rem] p-6 shadow-sm border border-gray-100 h-full flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-50 rounded-full group-hover:scale-125"></div>

                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <h3 className="text-[18px]  max-sm:text-[17px] font-bold uppercase text-gray-900">Attendance</h3>
                            </div>

                            <div className="flex-1 space-y-8">
                                <div className="text-center space-y-2">
                                    {hasCheckedIn ? (
                                        <div className="space-y-4">
                                            <div className="p-4 bg-emerald-50 rounded-3xl border border-emerald-100 mb-6">
                                                <div className="flex items-center justify-center gap-2 text-emerald-600 font-black">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    <span>ACTIVE SHIFT</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-center gap-4">
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">In Time</p>
                                                    <p className="text-2xl font-black text-gray-900 mt-1">
                                                        {new Date(todayAttendance?.checkIn?.time!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                    </p>
                                                </div>
                                                <div className="h-10 w-px bg-gray-100 mx-4"></div>
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shift</p>
                                                    <p className="text-2xl font-black text-gray-600 mt-1 uppercase italic">
                                                        {shiftName}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-3xl max-sm:text-[20px] font-thin text-gray-900">{isShiftEnded ? 'Shift Ended' : isTooEarly ? 'Shift Not Started' : 'Ready to Work'}</p>
                                            <p className="text-gray-400 font-bold">
                                                {isShiftEnded ? `Shift ended at ${formatTime(shiftEndTime)}` : `Your shift: ${formatTime(shiftStartTime)} - ${formatTime(shiftEndTime)}`}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4">
                                    {!hasCheckedIn ? (
                                        <button
                                            onClick={handleCheckIn}
                                            disabled={checkInMutation.isPending || !isShiftTime}
                                            className="w-[90%] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-black py-3 rounded-[0.5rem] transform active:scale-95 flex items-center justify-center gap-3 group"
                                        >
                                            {checkInMutation.isPending ? (
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <LogIn className="w-6 h-6 group-hover:translate-x-1" />
                                                    <span className="text-sm">{isShiftEnded ? 'Shift Over' : isTooEarly ? 'Wait for Shift' : 'Clock In Now'}</span>
                                                </>
                                            )}
                                        </button>
                                    ) : !hasCheckedOut ? (
                                        <button
                                            onClick={handleCheckOut}
                                            disabled={checkOutMutation.isPending}
                                            className="w-full bg-primary-theme hover:bg-primary-theme/80 disabled:opacity-50 text-white font-black py-4 rounded-3xl shadow-xl transform active:scale-95 flex items-center justify-center gap-3 group"
                                        >
                                            {checkOutMutation.isPending ? (
                                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <LogOut className="w-6 h-6 group-hover:-translate-x-1" />
                                                    <span className="text-lg">Clock Out</span>
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <div className="w-full bg-emerald-50 text-emerald-600 font-black py-4 rounded-3xl border-2 border-emerald-100 flex items-center justify-center gap-3">
                                            <CheckCircle2 className="w-6 h-6" />
                                            <span className="text-sm uppercase">Shift Completed</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards Cluster */}
                <div className="lg:col-span-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                        {/* Attendance Stats Card */}
                        <div className="bg-white rounded-[0.5rem] p-8 text-gray-900  shadow-sm relative overflow-hidden flex flex-col justify-between group">
                           
                            <div>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[18px]  max-sm:text-[17px] font-bold uppercase">Productivity Metrics</h3>
                                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/5">
                                        <TrendingUp className="w-5 h-5 text-indigo-300" />
                                    </div>
                                </div>
                                <div className="mt-8 flex items-baseline gap-4">
                                    <span className="text-[30px] font-bold">{stats.onTimePercentage}%</span>
                                    <span className="flex items-center text-emerald-400 text-sm font-bold uppercase tracking-widest">
                                        <ArrowUpRight className="w-4 h-4 mr-1" /> Precision
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mt-8 pt-8 border-t border-white/10">
                                <div className="group/stat">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-indigo-400">Present Protocol</p>
                                    <p className="text-3xl font-black mt-1 text-white">{stats.presentDays} <small className="text-gray-500 text-[10px] font-black tracking-widest">DAYS</small></p>
                                </div>
                                <div className="group/stat">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-rose-400">Absent Ledger</p>
                                    <p className="text-3xl font-black mt-1 text-rose-500">{stats.absentDays} <small className="text-gray-500 text-[10px] font-black tracking-widest">DAYS</small></p>
                                </div>
                            </div>
                        </div>

                        {/* Leaves & Registry */}
                        <div className="bg-white rounded-[0.5rem] p-8 border border-gray-100 flex flex-col justify-between relative overflow-hidden group shadow-sm hover:border-indigo-200">
                            <div className="absolute bottom-0 right-0 -mb-10 -mr-10 w-40 h-40 bg-indigo-50/50 rounded-full blur-2xl"></div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-[18px]  max-sm:text-[17px] font-bold text-gray-900 uppercase">Leave Ledger</h3>
                                    <div className="flex flex-col items-end">
                                        <span className="text-4xl font-black text-indigo-600 tracking-tighter">{stats.pendingLeaves || 0}</span>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pending</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {stats.leaveTypeBreakdown && Object.keys(stats.leaveTypeBreakdown).length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(stats.leaveTypeBreakdown).map(([type, count]) => (
                                                <span key={type} className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-100 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                                    {type}: {count}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs font-bold text-gray-400 italic">No active leave protocols pending.</p>
                                    )}

                                    <div className="pt-6 border-t border-gray-50 space-y-3">
                                        <button
                                            onClick={() => router.push('/staff/leaves')}
                                            className="w-full flex items-center justify-between p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 active:scale-95 cursor-pointer shadow-lg shadow-indigo-100 group/btn"
                                        >
                                            <span className="text-xs font-black uppercase tracking-widest">Request Leave</span>
                                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1" />
                                        </button>
                                        <button
                                            onClick={() => router.push('/staff/schedule')}
                                            className="w-full flex items-center justify-between p-4 bg-gray-50 text-gray-600 rounded-2xl border border-gray-100 hover:border-indigo-100 active:scale-95 cursor-pointer group/btn"
                                        >
                                            <span className="text-xs font-black uppercase tracking-widest text-[9px]">View Schedule</span>
                                            <BookOpenCheck className="w-4 h-4 text-gray-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Section: History & Announcements */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Recent Attendance */}
                <div className="xl:col-span-8 bg-white rounded-[0.5rem] p-8 shadow-sm border border-gray-100 overflow-hidden relative group">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[18px]  max-sm:text-[17px] font-bold text-gray-900">Recent Activity</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 pb-4">
                                    <th className="pb-4 text-[10px]  max-sm:text-[8px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                    <th className="pb-4 text-[10px]  max-sm:text-[8px] font-black text-gray-400 uppercase tracking-widest">In Time</th>
                                    <th className="pb-4 text-[10px]  max-sm:text-[8px] font-black text-gray-400 uppercase tracking-widest">Out Time</th>
                                    <th className="pb-4 text-[10px]  max-sm:text-[8px] font-black text-gray-400 uppercase tracking-widest">Duration</th>
                                    <th className="pb-4 text-right text-[10px]  max-sm:text-[8px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {attendanceHistory.filter(entry => entry.status !== 'on-leave').map((entry) => (
                                    <tr key={entry._id} className="group/row hover:bg-gray-50">
                                        <td className="py-5 font-black text-gray-900  max-sm:text-[8px]">{new Date(entry.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}</td>
                                        <td className="py-5 text-gray-500 font-bold  max-sm:text-[10px]">{entry.checkIn?.time ? new Date(entry.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}</td>
                                        <td className="py-5 text-gray-500 font-bold  max-sm:text-[10px]">{entry.checkOut?.time ? new Date(entry.checkOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}</td>
                                        <td className="py-5 text-gray-500 font-bold  max-sm:text-[10px]">{entry.workingHours ? `${Math.floor(entry.workingHours / 60)}h ${entry.workingHours % 60}m` : '0h 0m'}</td>
                                        <td className="py-5 text-right  max-sm:text-[10px]">
                                            <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${entry.status === 'present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                entry.status === 'late' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                    'bg-gray-50 text-gray-600 border-gray-100'
                                                }`}>
                                                {entry.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Announcements Section */}
                <div className="xl:col-span-4 space-y-6">
                    <div className="bg-indigo-50 rounded-[0.5rem] p-8 border border-indigo-100 h-full">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[18px]  max-sm:text-[17px] font-bold text-indigo-950">Latest News</h3>
                            <Bell className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="space-y-6">
                            {announcements.length > 0 ? announcements.map((news, i) => (
                                <div key={i} className="group cursor-pointer">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{new Date(news.createdAt).toLocaleDateString()}</p>
                                    <h4 className="font-black text-indigo-950 group-hover:text-indigo-600 line-clamp-1">{news.title}</h4>
                                    <p className="text-sm text-indigo-700/60 mt-1 line-clamp-2 leading-relaxed">{news.content}</p>
                                </div>
                            )) : (
                                <div className="text-center py-8">
                                    <Bell className="w-12 h-12 text-indigo-200 mx-auto mb-4 opacity-50" />
                                    <p className="text-sm font-bold text-indigo-300">No new announcements</p>
                                </div>
                            )}
                            <button
                                onClick={() => router.push('/staff/announcements')}
                                className="w-full mt-4 py-3 bg-white text-indigo-600 text-xs font-black uppercase tracking-widest rounded-2xl border border-indigo-100 hover:shadow-lg active:scale-95"
                            >
                                View All Announcements
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default StaffDashboardPage;
