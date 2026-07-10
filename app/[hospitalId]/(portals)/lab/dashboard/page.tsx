"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Users,
  ClipboardList,
  Wallet,
  Activity,
  RefreshCw,
  ArrowRight,
  ArrowRightCircle,
} from "lucide-react";
import {
  LabDashboardService,
  LabDashboardStats,
} from "@/lib/integrations/services/labDashboard.service";
import { LabSampleService } from "@/lib/integrations/services/labSample.service";
import { LabSample } from "@/lib/integrations/types/labSample";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { clearApiCache } from "@/lib/integrations/api/apiClient";
import { toast } from "react-hot-toast";

// Clean Skeleton
const StatCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-4 w-20 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-8 w-28 bg-gray-50 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse" />
    </div>
  </div>
);

const rangeLabels: Record<string, string> = {
  today: "Today",
  "7days": "Week",
  "1month": "Month",
  custom: "Custom",
};

function LabDashboard() {
  const [range, setRange] = useState("today");
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [stats, setStats] = useState<LabDashboardStats | null>(null);
  const [activeTests, setActiveTests] = useState<LabSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNavigating, startNavigation] = useTransition();
  const router = useRouter();
  const { user } = useAuthStore();

  // Billing Type Filter state
  const [typeFilter, setTypeFilter] = useState<'all' | 'opd' | 'ipd' | 'lab'>('all');

  // Helper to identify a sample's patient type
  const getSamplePatientType = (sample: LabSample): 'opd' | 'ipd' | 'lab' => {
      if (sample.patientDetails?.patientType) return sample.patientDetails.patientType.toLowerCase() as 'opd' | 'ipd' | 'lab';
      if (sample.patientDetails?.bedInfo) return 'ipd';
      if (sample.patientDetails?.originalPatientName) return 'lab';
      
      const nameLower = (sample.patientDetails?.name || '').toLowerCase();
      if (nameLower.includes('lab') || nameLower.includes('diagnostic') || nameLower.includes('center') || nameLower.includes('hospital')) {
          return 'lab';
      }

      if (sample.isWalkIn) return 'opd';
      return 'opd';
  };

  useEffect(() => {
    if (range === "custom") {
      if (!startDate || !endDate) return;
      if (startDate > endDate) {
        toast.error("Start Date cannot be after End Date");
        return;
      }
    }
    fetchStats();

    // 2. Listen for socket-triggered events
    const handleRefresh = () => fetchStats(true, true);
    window.addEventListener("refresh-lab-data", handleRefresh);

    // 3. Socket.IO Real-time Updates
    const hospitalId = (user as any)?.hospital;
    if (hospitalId) {
      import('@/lib/integrations/api/socket').then(({ subscribeToSocket }) => {
        subscribeToSocket('new_lab_order', () => {
          console.log("🔔 New Lab Order Received via Socket");
          fetchStats(true, true);
        });
      });
    }

    // 4. Poll as a fallback every 30 seconds
    const pollInterval = setInterval(() => {
      console.log('🔄 Periodic Sync: Fetching fresh dashboard data');
      fetchStats(true, true);
    }, 30000);

    return () => {
      window.removeEventListener("refresh-lab-data", handleRefresh);
      clearInterval(pollInterval);
      if (hospitalId) {
        import('@/lib/integrations/api/socket').then(({ unsubscribeFromSocket }) => {
          unsubscribeFromSocket('new_lab_order', handleRefresh);
        });
      }
    };
  }, [range, user, startDate, endDate]);

  const fetchStats = async (silent = false, skipCache = false) => {
    if (!silent) setLoading(true);
    try {
      const [statsData, samplesData] = await Promise.all([
        LabDashboardService.getStats(
          range,
          skipCache,
          range === "custom" ? startDate : undefined,
          range === "custom" ? endDate : undefined
        ),
        LabSampleService.getSamples("Pending", skipCache),
      ]);
      setStats(statsData);
      setActiveTests(samplesData.slice(0, 5));
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    colorClass,
    iconColorClass,
  }: any) => {
    return (
      <div
        className={`p-4 xl:p-6 rounded-2xl shadow-sm hover:shadow-md transition-all border border-transparent ${colorClass}`}
      >
        <div className="flex justify-between items-start mb-2 xl:mb-3">
          <div
            className={`p-2.5 xl:p-3 rounded-xl bg-white/80 dark:bg-black/20 backdrop-blur-sm ${iconColorClass}`}
          >
            <Icon className="w-5 h-5 xl:w-6 xl:h-6" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl xl:text-3xl font-bold text-gray-800 dark:text-white mb-0.5 xl:mb-1 tracking-tight">
            {value}
          </h3>
          <p className="text-[10px] xl:text-sm font-semibold text-gray-600 dark:text-gray-300 opacity-90 tracking-widest uppercase">
            {title}
          </p>
        </div>
      </div>
    );
  };

  if (loading && !stats) {
    return (
      <div className="max-w-full mx-auto p-6 space-y-6 bg-slate-50 dark:bg-gray-900 min-h-screen">
        <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto space-y-4 lg:space-y-4 pb-8 bg-slate-50/50 dark:bg-gray-900 min-h-screen">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 md:gap-4 mb-2">
        {/* Heading */}
        <div className="shrink-0 flex items-center gap-2 px-1">
          <div className="p-1.5 md:p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600">
             <Activity className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white leading-tight uppercase tracking-wide">
              Dashboard Overview
            </h1>
            <p className="text-[10px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">
              Hello {user?.name || "User"}, here's what's happening today.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between xl:justify-end gap-3 w-full xl:w-auto">
          {range === "custom" && (
            <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-right duration-300">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-inner">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Start</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-inner">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">End</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
                />
              </div>
              {startDate > endDate && (
                <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider px-2 py-1 bg-rose-50 dark:bg-rose-950/20 rounded">
                  Invalid Range
                </span>
              )}
            </div>
          )}

          <div className="flex bg-slate-50 dark:bg-gray-900 p-1 rounded-lg border border-gray-100 dark:border-gray-800">
            {Object.keys(rangeLabels).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all rounded-md flex items-center gap-1 ${range === r
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-gray-600"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-800"
                  }`}
              >
                {rangeLabels[r]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Core Metrics Grid - Vibrant Light Colors */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        <StatCard
          title="Total Revenue"
          value={`₹${stats?.revenue.toLocaleString() || 0}`}
          icon={TrendingUp}
          colorClass="bg-indigo-50/80 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800"
          iconColorClass="text-indigo-600 dark:text-indigo-400"
        />
        <StatCard
          title="Total Patients"
          value={stats?.patients || 0}
          icon={Users}
          colorClass="bg-blue-50/80 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800"
          iconColorClass="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          title="New Tests"
          value={stats?.totalTests || 0}
          icon={Activity}
          colorClass="bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800"
          iconColorClass="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          title="Pending Reports"
          value={stats?.pendingSamples || 0}
          icon={ClipboardList}
          colorClass="bg-orange-50/80 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800"
          iconColorClass="text-orange-600 dark:text-orange-400"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6 h-full">
        {/* Pending Lab Orders Table - Maximized Height */}
        <div className="xl:col-span-2 flex flex-col h-full">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex-1 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 border-b border-gray-100 dark:border-gray-700 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-5 bg-indigo-500 rounded-full" />
                <h2 className="text-sm md:text-base font-bold text-gray-800 dark:text-white">
                  Recent Lab Orders
                </h2>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/lab/samples"
                  className="px-2.5 py-1 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-900/50"
                >
                  View All Orders
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 no-scrollbar">
              {activeTests.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                  <ClipboardList className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">
                    No pending orders right now.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left min-w-[500px]">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                      <th className="px-4 md:px-6 py-3 md:py-4 text-[9px] md:text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Sample
                      </th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-[9px] md:text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-[9px] md:text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Tests
                      </th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-[9px] md:text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {activeTests
                      .filter(test => typeFilter === 'all' || getSamplePatientType(test) === typeFilter)
                      .map((test) => (
                      <tr
                        key={test._id}
                        className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors group"
                      >
                        <td className="px-4 md:px-6 py-3 md:py-4">
                          <span className="font-bold text-xs md:text-sm text-gray-800 dark:text-white">
                            #{test.sampleId}
                          </span>
                          <div className="text-[9px] md:text-[10px] font-medium text-gray-400 mt-0.5 md:mt-1">
                            {new Date(test.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4">
                          <div className="font-semibold text-xs md:text-sm text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                            {getSamplePatientType(test) === 'lab' ? (
                              <>
                                <span className="font-bold text-gray-950 dark:text-white">
                                  {test.patientDetails.name}
                                </span>
                                <span className="px-1.5 py-0.5 text-[9px] bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-100 rounded uppercase">
                                  {test.patientDetails.refDoctor || 'Lab'}
                                </span>
                              </>
                            ) : test.patientDetails.originalPatientName ? (
                              <>
                                <span className="font-bold text-gray-950 dark:text-white">
                                  {test.patientDetails.originalPatientName}
                                </span>
                                <span className="px-1.5 py-0.5 text-[9px] bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-100 rounded uppercase">
                                  {test.patientDetails.name}
                                </span>
                              </>
                            ) : (
                              test.patientDetails.name
                            )}
                            {test.priority && test.priority !== 'routine' && (
                              <span className="bg-red-500 text-white font-black text-[8px] px-1.5 py-0.5 rounded uppercase animate-pulse">
                                🚨 {test.priority}
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5 md:mt-1">
                            {test.patientDetails.age}Y •{" "}
                            {test.patientDetails.gender}
                          </div>
                          {test.clinicalAnnotations && (
                            <div className="text-[9px] bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 p-1 rounded mt-1 font-semibold border border-amber-200 dark:border-amber-800 line-clamp-1">
                              📝 {test.clinicalAnnotations}
                            </div>
                          )}
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4">
                          <div className="flex flex-wrap gap-1 md:gap-1.5">
                            {test.tests.slice(0, 2).map((t, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-2 md:px-2.5 py-0.5 md:py-1 rounded-md text-[9px] md:text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300"
                              >
                                {t.testName}
                              </span>
                            ))}
                            {test.tests.length > 2 && (
                              <span className="inline-flex items-center px-1.5 md:px-2 py-0.5 md:py-1 rounded-md text-[9px] md:text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500">
                                +{test.tests.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                          <button
                            onClick={() => startNavigation(() => router.push("/lab/samples"))}
                            disabled={isNavigating}
                            className={`inline-flex items-center justify-center px-3 md:px-4 py-1.5 md:py-2 bg-primary-theme hover:bg-primary-theme/80 text-white rounded-lg text-[10px] md:text-xs font-bold shadow-lg shadow-gray-200 dark:shadow-none transition-all transform group-hover:scale-105 ${isNavigating ? 'opacity-70' : ''}`}
                          >
                            Process
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Financials */}
        <div className="flex flex-col gap-4 lg:gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 md:p-6 flex flex-col gap-4 lg:gap-6 h-full">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 dark:text-white">
                Revenue Sources
              </h3>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <Wallet className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              </div>
            </div>

            <div className="space-y-5 flex-1 justify-center flex flex-col">
              {[
                {
                  label: "Cash Collection",
                  value: stats?.paymentBreakdown.Cash || 0,
                  color: "bg-emerald-500",
                  bg: "bg-emerald-100",
                },
                {
                  label: "Card Transactions",
                  value: stats?.paymentBreakdown.Card || 0,
                  color: "bg-indigo-500",
                  bg: "bg-indigo-100",
                },
                {
                  label: "UPI Payments",
                  value: stats?.paymentBreakdown.UPI || 0,
                  color: "bg-blue-500",
                  bg: "bg-blue-100",
                },
              ].map((item, i) => (
                <div key={i} className="group">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-gray-500 font-medium">
                      {item.label}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      ₹{item.value.toLocaleString()}
                    </span>
                  </div>
                  <div
                    className={`h-3 w-full ${item.bg} dark:bg-gray-700 rounded-full overflow-hidden`}
                  >
                    <div
                      className={`h-full ${item.color} transition-all duration-1000 ease-out`}
                      style={{
                        width: `${(item.value / (stats?.collections || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Total Collections
                  </p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">
                    ₹{stats?.collections.toLocaleString()}
                  </p>
                </div>
                <div className="h-10 w-10 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(LabDashboard);
