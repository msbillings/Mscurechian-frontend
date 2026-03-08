'use client';

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Building2,
  Stethoscope,
  Headphones,
  Bell,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import LogoutModal from "@/components/auth/LogoutModal";
import { useTenantLink } from "@/hooks/useTenantLink";
import { getSocket, joinSocketRoom } from "@/lib/integrations/api/socket";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import NotificationCenter from "@/components/navbar/NotificationCenter";
import HRNavQuickActions from "./components/HRNavQuickActions";

const hrMenu = [
  {
    group: "Personnel",
    items: [
      { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: "/hr" },
      { icon: <Users size={20} />, label: "Staff Directory", path: "/hr/staff" },
      { icon: <Briefcase size={20} />, label: "Recruitment", path: "/hr/recruitment" },
    ]
  },
  {
    group: "Development & Compliance",
    items: [
      { icon: <FileText size={20} />, label: "Document Vault", path: "/hr/documents" },
    ]
  },
  {
    group: "Hospital Governance",
    items: [
      { icon: <Building2 size={20} />, label: "Departments", path: "/hr/hospital/departments" },
      { icon: <Stethoscope size={20} />, label: "Doctors", path: "/hr/hospital/doctors" },
      { icon: <Users size={20} />, label: "Nursing Registry", path: "/hr/hospital/nurses" },
      { icon: <Headphones size={20} />, label: "Helpdesk", path: "/hr/hospital/helpdesk" },
    ]
  },
  {
    group: "System",
    items: [
      { icon: <Bell size={20} />, label: "Announcements", path: "/hr/announcements" },
    ]
  }
];

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isInitialized, logout, checkAuth, isLoading } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { getPath } = useTenantLink();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push('/hr/login');
    }
  }, [isAuthenticated, isInitialized, router]);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const initSocket = async () => {
      const socket = await getSocket();
      if (!socket) return;

      const uId = user.id || (user as any)._id;
      const hId = (user as any).hospital || (user as any).hospitalId;

      joinSocketRoom({
        userId: uId,
        role: user.role || "hr",
        hospitalId: hId,
      });

      socket.on("recruitment_review_update", (data: any) => {
        toast(data.message || "Recruitment Request Updated", {
          icon: data.status === 'approved' ? "✅" : "❌",
          duration: 6000,
        });

        queryClient.invalidateQueries({ queryKey: ["hr", "recruitment"] });
      });

      socket.on("leave:status_change", (data: any) => {
        toast(data.message || `Leave request ${data.leave.status}`, {
          icon: data.leave.status === 'approved' ? "✅" : "❌",
          duration: 6000,
        });

        queryClient.invalidateQueries({ queryKey: ["hr", "leaves"] });
      });
    };

    initSocket();

    return () => {
      getSocket().then(socket => {
        if (socket) socket.off("recruitment_review_update");
      });
    };
  }, [isAuthenticated, user, queryClient]);

  const handleConfirmLogout = async () => {
    await logout();
    router.push('/hr/login');
  };

  if (isLoading || !isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const hrUser = {
    name: user?.name || 'HR Manager',
    role: 'HR',
    image: (user as any)?.image || '',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        userName={user?.name}
      />

      <aside className={`
        fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-100 z-40 transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-20 flex items-center px-8 border-b border-gray-50">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 mr-3">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight">HR PORTAL</h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Personnel Node</p>
          </div>
        </div>

        <nav className="p-6 space-y-10 h-[calc(100vh-80px)] overflow-y-auto no-scrollbar">
          {hrMenu.map((group) => (
            <div key={group.group} className="space-y-4">
              <h3 className="px-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                {group.group}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const tenantPath = getPath(item.path);
                  const isDashboard = item.path === '/hr';
                  const isActive = isDashboard
                    ? pathname === tenantPath
                    : pathname === tenantPath || pathname.startsWith(tenantPath + '/');
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        router.push(tenantPath);
                        setIsSidebarOpen(false);
                      }}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold w-full transition-all
                        ${isActive
                          ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                      `}
                    >
                      <span className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600'}>
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col h-full min-w-0 lg:ml-64 relative">
        {/* ── HR Navbar (mirrors Helpdesk pattern) ── */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shrink-0 shadow-sm">
          {/* Mobile hamburger */}
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600">
            <Menu size={20} />
          </button>

          {/* CENTER: quick-action tabs */}
          <div className="flex-1 hidden lg:flex justify-center">
            <HRNavQuickActions />
          </div>

          {/* RIGHT: notifications + user */}
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <div className="h-8 w-px bg-slate-100 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{hrUser.name}</p>
                <p className="text-[8px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5">HR Portal</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                {hrUser.name?.charAt(0)}
              </div>
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar">
          {children}
        </main>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/20 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
