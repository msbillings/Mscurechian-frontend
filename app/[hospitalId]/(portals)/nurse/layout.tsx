'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/navbar/Navbar';
import Sidebar, { SidebarItem } from '@/components/slidebar/Sidebar';
import {
  LayoutDashboard,
  Users,
  Activity,
  ClipboardList,
  Calendar,
  Bell,
  Clock,
  AlertTriangle,
  BookOpenCheck,
  LifeBuoy,
  Settings
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import LogoutModal from '@/components/auth/LogoutModal';
import { getSocket, joinSocketRoom } from '@/lib/integrations/api/socket';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNotifications } from '@/lib/integrations/hooks';
import NurseShiftButton from './components/NurseShiftButton';
import NurseSupportFloatingBox from './components/NurseSupportFloatingBox';
import { useTenantLink } from '@/hooks/useTenantLink';


const nurseMenuItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/nurse' },
  { icon: Activity, label: 'My Ward Status', href: '/nurse/ward' },
  { icon: Users, label: 'Patient Monitoring', href: '/nurse/patients' },
  { icon: Activity, label: 'Hourly Monitoring', href: '/nurse/patient-hourly-record' },
  { icon: ClipboardList, label: 'Daily Tasks', href: '/nurse/tasks' },
  { icon: ClipboardList, label: 'Discharge Management', href: '/nurse/discharge' },
  { icon: Clock, label: 'Attendance', href: '/nurse/attendance' },
  { icon: Calendar, label: 'Leave Management', href: '/nurse/leaves' },
  { icon: Calendar, label: 'My Schedule', href: '/nurse/schedule' },
  { icon: AlertTriangle, label: 'Medical Incident', href: '/nurse/incidents' },
  { icon: BookOpenCheck, label: 'Sop & Policies', href: '/nurse/sop' },
  { icon: Bell, label: 'Announcements', href: '/nurse/announcements' },


];

export default function NurseLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isInitialized, isAuthenticated, isLoading, checkAuth, initEvents } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { getPath } = useTenantLink(); // ✅ MULTI-TENANCY

  useEffect(() => {
    initEvents();
    checkAuth();
  }, []);

  useEffect(() => {
    if (isInitialized) {
      if (!isAuthenticated) {
        router.push('/auth/login');
      } else if (user?.role !== 'nurse') {
        // Allow helpdesk/admin to view for testing if needed, or strict redirect
        const roleMap: Record<string, string> = {
          'helpdesk': '/helpdesk',
          'staff': '/staff',
          'doctor': '/doctor',
          'hospital-admin': '/hospital-admin',
        };
        if (roleMap[user?.role || '']) router.push(roleMap[user?.role || '']!);
      }
    }
  }, [isInitialized, isAuthenticated, user?.role, router]);

  // ✅ REAL-TIME DYNAMICS: Leave Status Sync
  // ✅ REAL-TIME DYNAMICS: Hyper-Reactive Leave Sync
  const queryClient = useQueryClient();
  useEffect(() => {
    if (isAuthenticated && user) {
      const initSocket = async () => {
        const socket = await getSocket();
        if (socket) {
          const uId = user.id || (user as any)._id;
          const hId = user.hospitalId || (user as any).hospital;

          joinSocketRoom({
            userId: uId,
            role: user.role,
            hospitalId: hId
          });

          socket.on('leave:status_change', (data: any) => {
            console.log('📡 [Nurse] Leave Status Sync Received:', data);
            const status = data.leave.status;
            const toastIcon = status === 'approved' ? '✅' : '❌';
            toast(`Leave Request ${status.toUpperCase()}!`, { icon: toastIcon, duration: 4000 });

            // ✅ INSTANT SYNC: Refetch and invalidate all staff-related data
            queryClient.refetchQueries({ queryKey: ['staff'] });
            queryClient.invalidateQueries({ queryKey: ['staff'] });
          });

          // ✅ NEW: Real-time Incident Status Sync
          socket.on('incident_update', (data: any) => {
            console.log('📡 [Nurse] Incident Status Sync Received:', data);
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
        }
      };
      initSocket();

      return () => {
        const socketPromise = getSocket();
        socketPromise.then(socket => {
          if (socket) {
            socket.off('leave:status_change');
            socket.off('incident_update');
            socket.off('new_incident');
          }
        });
      };
    }
  }, [isAuthenticated, user, queryClient]);

  const handleConfirmLogout = async () => {
    await logout();
    router.push('/nurse-login');
  };

  if (isLoading || !isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="w-16 h-16 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'nurse') return null;

  const nurseUser = {
    name: user?.name || "Nurse Member",
    role: "nurse",
    image: (user as any)?.image || ""
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        userName={user?.name}
      />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        items={nurseMenuItems}
        onLogout={() => setIsLogoutModalOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full lg:ml-64">

        <Navbar
          title="Nurse Care Portal"
          user={nurseUser}
          onMenuClick={() => setIsSidebarOpen(true)}
          isDarkMode={theme === 'dark'}
          onThemeToggle={toggleTheme}
          actions={<NurseShiftButton />}
          onLogout={() => setIsLogoutModalOpen(true)}
          className="sticky top-0 z-30"
          profileHref={getPath('/nurse/profile')}
        />
        <main className="p-2 sm:p-4 md:p-6 flex-1 overflow-y-auto relative">
          {children}

          {/* Global Floating Support Button */}
          <NurseSupportFloatingBox />
        </main>

      </div>
    </div>
  );
}
