"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import {
  Building2,
  Stethoscope,
  Headphones,
  Pill,
  FlaskConical,
  User,
  LayoutDashboard,
  CreditCard,
  LifeBuoy,
  LineChart,
  ClipboardCheck,
  Bell,
  BarChart3,
  AlertTriangle,
  MessageSquare,
  ExternalLink,
  BookOpenCheck,
  Settings,
} from "lucide-react";
import LogoutModal from "@/components/auth/LogoutModal";
import SharedNavbar from "@/components/navbar/SharedNavbar";
import SharedSidebar from "@/components/navbar/SharedSidebar";
import { getSocket, joinSocketRoom } from "@/lib/integrations/api/socket";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNotifications } from "@/lib/integrations/hooks";
import TransactionDropdown from "./components/TransactionDropdown";
import ClinicalTeamDropdown from "./components/ClinicalTeamDropdown";
import HospitalAdminSupportFloatingBox from "./components/HospitalAdminSupportFloatingBox";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import { useTenantLink } from "@/hooks/useTenantLink";

interface MenuItem {
  icon: any;
  label: string;
  path?: string;
  subItems?: { label: string; path: string }[];
}

const hospitalAdminMenu: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/hospital-admin" },
  { icon: LineChart, label: "Analytics", path: "/hospital-admin/analytics" },


  {
    icon: BarChart3,
    label: "Quality Indicator",
    path: "/hospital-admin/analytics/quality-indicators",
  },
  {
    icon: ClipboardCheck,
    label: "Management",
    subItems: [


      { label: "Leave Requests", path: "/hospital-admin/leaves" },
      { label: "Attendance Logs", path: "/hospital-admin/attendance" },
      { label: "Internship Training", path: "/hospital-admin/training" },
      { label: "Payroll Management", path: "/hospital-admin/payroll" },
      { label: "Recruitment Registry", path: "/hospital-admin/recruitment" },
      { label: "SOP & Policies", path: "/hospital-admin/sop" },
      { label: "HR Management", path: "/hospital-admin/management/hr" },
      {
        label: "Shift Management",
        path: "/hospital-admin/attendance/schedules",
      },
    ],
  },
  // {
  //   icon: Stethoscope,
  //   label: "Clinical Team",
  //   subItems: [
  //     { label: "Doctors List", path: "/hospital-admin/doctors" },
  //     { label: "Nursing Registry", path: "/hospital-admin/nurses" },
  //   ],
  // },
  {
    icon: Building2,
    label: "Hospital Meta",
    subItems: [
      { label: "Profile & Identity", path: "/hospital-admin/hospital/details" },
      { label: "Departments", path: "/hospital-admin/management/departments" },
      { label: "Room Master", path: "/hospital-admin/management/rooms" },
      { label: "Bed Inventory", path: "/hospital-admin/management/beds" },
      { label: "Vitals Thresholds", path: "/hospital-admin/management/vitals-thresholds" },
    ],
  },
  { icon: Headphones, label: "Helpdesk Support", path: "/hospital-admin/helpdesks" },
  { icon: ClipboardCheck, label: "Discharge Audit", path: "/hospital-admin/discharge/history" },
  { icon: Bell, label: "Notice Board", path: "/hospital-admin/announcements" },
  {
    icon: Pill,
    label: "Pharmacy Unit",
    subItems: [
      { label: "Overview", path: "/hospital-admin/pharma/dashboard" },
      { label: "Medicine Inventory", path: "/hospital-admin/pharma/products" },
      { label: "Vendor Network", path: "/hospital-admin/pharma/suppliers" },
      { label: "Pharmacy Settings", path: "/hospital-admin/management/pharmacy-settings" },
    ],
  },
  {
    icon: FlaskConical,
    label: "Diagnostics Lab",
    subItems: [
      { label: "Dashboard", path: "/hospital-admin/labs/dashboard" },

      { label: "Departments", path: "/hospital-admin/labs/departments" },
      { label: "Test Master", path: "/hospital-admin/labs/tests" },
    ],
  },
  { icon: AlertTriangle, label: "Medical Incidents", path: "/hospital-admin/incidents" },

  { icon: MessageSquare, label: "Feedbacks", path: "/hospital-admin/feedbacks" },

];

const HospitalAdminLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const userName = useAuthStore(state => state.user?.name);
  const userRole = useAuthStore(state => state.user?.role);
  const userId = useAuthStore(state => state.user?.id);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isInitialized = useAuthStore(state => state.isInitialized);
  const isLoading = useAuthStore(state => state.isLoading);
  const logout = useAuthStore(state => state.logout);
  const checkAuth = useAuthStore(state => state.checkAuth);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { getPath } = useTenantLink(); // ✅ MULTI-TENANCY

  const hasInitialized = useRef(false);
  const isInitializing = useRef(false);

  /** 🔐 Init auth once */
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      useAuthStore.getState().initEvents();
      checkAuth();
    }
  }, []);

  /** 🔁 Role-safe redirect */
  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      console.warn(`[Layout: hospital-admin] 🚫 Not authenticated. Redirecting to login.`);
      router.replace("/auth/login");
      return;
    }

    if (userRole !== "hospital-admin") {
      const routeMap: Record<string, string> = {
        staff: "/staff",
        helpdesk: "/helpdesk",
        lab: "/lab/dashboard",
        pharmacy: "/pharmacy/dashboard",
        "pharma-owner": "/pharmacy/dashboard",
        pharmacist: "/pharmacy/dashboard",
        pharma: "/pharmacy/dashboard",
        admin: "/admin",
        "super-admin": "/admin",
        patient: "/patient/dashboard",
        doctor: "/doctor",
        nurse: "/nurse",
        emergency: "/emergency",
        hr: "/hr",
        frontdesk: "/frontdesk"
      };

      const redirectPath = routeMap[userRole || ""] || "/auth/login";
      console.warn(`[Layout: hospital-admin] 🔄 Role mismatch (${userRole}). Redirecting to: ${redirectPath}`);
      router.replace(redirectPath);
    } else {
      console.log(`[Layout: hospital-admin] ✅ Access Granted. Role: ${userRole}`);
    }
  }, [isAuthenticated, isInitialized, userRole, router]);

  /** 📡 Realtime Governance Sync */
  useEffect(() => {
    if (!isAuthenticated) return;

    const initSocket = async () => {
      if (isInitializing.current) return;
      isInitializing.current = true;
      try {
        const socket = await getSocket();
        if (!socket) return;

        const rawUser = useAuthStore.getState().user as any;
        const uId = userId || rawUser?.id || rawUser?._id;
        const hId = rawUser?.hospital || rawUser?.hospitalId;

        joinSocketRoom({
          userId: uId,
          role: userRole || "hospital-admin",
          hospitalId: hId,
        });

        socket.off("leave:new").on("leave:new", (data: any) => {
          const requester =
            data.leave?.requester?.name ||
            data.leave?.applicant?.name ||
            "Staff Member";

          toast(`New Leave Request From ${requester}`, {
            icon: "📅",
            duration: 6000,
          });

          queryClient.invalidateQueries({ queryKey: ["hospital-admin"] });
          queryClient.invalidateQueries({ queryKey: ["hospital-admin", "leaves"] });
        });

        socket.off("new_recruitment_request").on("new_recruitment_request", (data: any) => {
          toast(data.message || "New Recruitment Request", {
            icon: "👔",
            duration: 6000,
          });

          queryClient.invalidateQueries({ queryKey: ["hospital-admin", "recruitment"] });
        });

        socket.off("new_incident").on("new_incident", (data: any) => {
          toast(`Governance Alert: ${data.message}`, {
            icon: "⚠️",
            duration: 7000,
          });

          queryClient.invalidateQueries({ queryKey: ["admin-incidents"] });
          queryClient.invalidateQueries({ queryKey: ["hospital-admin", "stats"] });
        });

        socket.off("incident_update").on("incident_update", () => {
          queryClient.invalidateQueries({ queryKey: ["admin-incidents"] });
        });

        socket.off("notification:new").on("notification:new", (notif: any) => {
          if (notif.type === "leave_request") {
            queryClient.invalidateQueries({ queryKey: ["hospital-admin", "leaves"] });
          }
          if (notif.type === "discharge_audit") {
            toast(`New Discharge Audit Notification: ${notif.message}`, {
              icon: "📋",
              duration: 5000,
            });
            queryClient.invalidateQueries({ queryKey: ["hospital-admin", "discharge"] });
          }
        });

        // 🚀 Performance Optimization: Prefetch critical section data
        queryClient.prefetchQuery({
          queryKey: ['hospital-admin', 'dashboard', 'today', '', '', 'all'],
          queryFn: () => hospitalAdminService.getDashboard({ range: 'today' }),
          staleTime: 5000,
        });

        queryClient.prefetchQuery({
          queryKey: ['hospital-admin', 'doctors-list'],
          queryFn: () => hospitalAdminService.getDoctors(),
          staleTime: 5 * 60 * 1000,
        });
      } catch (err) {
        console.error("Socket initialization error:", err);
      } finally {
        isInitializing.current = false;
      }
    };

    initSocket();

    return () => {
      getSocket().then(socket => {
        if (!socket) return;
        socket.off("leave:new");
        socket.off("new_recruitment_request");
        socket.off("new_incident");
        socket.off("incident_update");
        socket.off("notification:new");
      });
    };
  }, [isAuthenticated, userId, userRole, queryClient]);

  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || userRole !== "hospital-admin") return null;

  return (
    <div className="flex min-h-screen bg-background">
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={async () => {
          await logout();
          router.push("/auth/login");
        }}
        userName={userName}
      />

      <SharedSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        menuItems={hospitalAdminMenu}
        branding={{ logo: Building2, title: "CureChain", subtitle: "Hospital Admin" }}
        currentPath={pathname}
        onHoverChange={(expanded) => setIsSidebarHovered(expanded)}
        onMenuItemClick={path => {
          setIsSidebarOpen(false);
          startTransition(() => router.push(getPath(path)));
        }}
      />

      <div className={`flex flex-col flex-1 min-h-screen transition-all duration-300 ${
        isSidebarOpen
          ? "ml-0"                   // mobile: drawer overlaps, no margin
          : isSidebarHovered
            ? "md:ml-64"             // md hover expanded: shift content right
            : "md:ml-16 lg:ml-64"   // default: 16 on md, 64 on lg
      }`}>

        <SharedNavbar
          onMenuClick={() => setIsSidebarOpen(true)}
          centerActions={
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50 backdrop-blur-sm shadow-sm">
              <ClinicalTeamDropdown />
              <div className="w-px h-4 bg-slate-300 mx-1"></div>
              <TransactionDropdown />
            </div>
          }
          profileLinks={[
            { label: "Official Profile", path: getPath('/hospital-admin/profile'), icon: User },
          ]}
          onLogout={() => setIsLogoutModalOpen(true)}
        />

        <main className="relative flex-1 p-1 mt-16 max-w-[100vw] overflow-x-hidden">
          {isPending && (
            <div className="fixed top-0 left-0 right-0 h-1 bg-primary-theme/20 z-[100] overflow-hidden">
               <div className="h-full bg-primary-theme animate-progress-indeterminate w-full origin-left shrink-0" />
            </div>
          )}
          {children}
        </main>

        {/* Floating Support & Feedback Box */}
        <HospitalAdminSupportFloatingBox />
      </div>
    </div>
  );
};

export default HospitalAdminLayout;
