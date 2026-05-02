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
} from "lucide-react";
import {
  LabDashboardService,
  LabDashboardStats,
} from "@/lib/integrations/services/labDashboard.service";
import { LabSampleService } from "@/lib/integrations/services/labSample.service";
import { LabSample } from "@/lib/integrations/types/labSample";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";

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
};

function LabDashboard() {
  const [range, setRange] = useState("today");
  const [stats, setStats] = useState<LabDashboardStats | null>(null);
  const [activeTests, setActiveTests] = useState<LabSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNavigating, startNavigation] = useTransition();
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
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
  }, [range, user]);

  const fetchStats = async (silent = false, skipCache = false) => {
    if (!silent) setLoading(true);
    try {
      const [statsData, samplesData] = await Promise.all([
        LabDashboardService.getStats(range, skipCache),
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 py-4 lg:py-2">
        <div>
          <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-[7px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">
            Hello {user?.name || "User"}, here's what's happening today.
          </p>
        </div>

        <div className="flex flex-row md:items-center justify-between gap-3 bg-white/50 dark:bg-gray-800/50 p-1.5 md:p-1 rounded-2xl border border-gray-100/50 dark:border-gray-700/50 backdrop-blur-sm lg:shrink-0">
          <div className="flex items-center gap-3 md:gap-1.5 bg-white dark:bg-gray-800 p-1 md:p-0.5 lg:p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            {Object.keys(rangeLabels).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 md:px-4 lg:px-5 py-1.5 md:py-1 lg:py-2 text-[9px] md:text-[8px] lg:text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${range === r
                  ? "bg-primary-theme text-white shadow-md scale-105"
                  : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
              >
                {rangeLabels[r]}
              </button>
            ))}
          </div>
          <div className="flex items-center">
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 md:mx-0.5" />
            <button
              onClick={() => fetchStats(false, true)}
              disabled={loading}
              className="p-2 md:p-1 text-gray-400 hover:text-indigo-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 md:w-4 md:h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
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
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-base md:text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <span className="w-2 h-6 bg-indigo-500 rounded-full" />
                Recent Lab Orders
              </h2>
              <button
                onClick={() => startNavigation(() => router.push("/lab/samples"))}
                disabled={isNavigating}
                className="text-xs font-bold uppercase tracking-wider text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
              >
                {isNavigating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                View Full List
              </button>
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
                    {activeTests.map((test) => (
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
                          <div className="font-semibold text-xs md:text-sm text-gray-900 dark:text-white">
                            {test.patientDetails.name}
                          </div>
                          <div className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5 md:mt-1">
                            {test.patientDetails.age}Y •{" "}
                            {test.patientDetails.gender}
                          </div>
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
