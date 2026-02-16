export const dynamic = 'force-dynamic';

import React, { Suspense } from "react";
import { getAttendanceAction, getAttendanceStatsAction } from "@/lib/integrations";
import AttendanceClient from "./AttendanceClient";
import { PageHeader, Card } from "@/components/admin";
import { Users, Calendar } from "lucide-react";

async function AttendanceData() {
  let attendanceResponse, statsResponse;
  let error = null;

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // ✅ ROBUSTNESS: Multi-attempt fetch pattern for institutional reliability
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      try {
        [attendanceResponse, statsResponse] = await Promise.all([
          getAttendanceAction({ date: today }),
          getAttendanceStatsAction()
        ]);
        break; // Success! exit loop
      } catch (err) {
        attempts++;
        console.warn(`[Attendance] Fetch attempt ${attempts} failed.`, err);
        if (attempts === maxAttempts) throw err;
        // Exponential backoff or simple delay
        await new Promise(resolve => setTimeout(resolve, attempts * 500));
      }
    }
  } catch (err) {
    console.error("Critical failure in initial attendance ingestion:", err);
    error = err;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto pb-12">
        <PageHeader
          icon={<Users className="text-blue-500" />}
          title="Attendance Tracker"
          subtitle="Monitor and manage staff attendance"
        />

        <Card padding="p-12">
          <div className="text-center">
            <Calendar className="mx-auto mb-4 text-red-400" size={48} />
            <h3 className="text-xl font-semibold mb-2 text-red-600">
              Failed to load attendance data
            </h3>
            <p className="text-gray-600 mb-4">
              There was an error loading the attendance information. Please try refreshing the page.
            </p>
            <a
              href="/hospital-admin/attendance"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
            >
              Refresh Page
            </a>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <AttendanceClient
      initialAttendance={attendanceResponse?.attendance || []}
      initialStats={statsResponse?.stats as any}
    />
  );
}

function AttendanceLoading() {
  return (
    <div className="max-w-7xl mx-auto pb-12">
      <PageHeader
        icon={<Users className="text-blue-500" />}
        title="Attendance Tracker"
        subtitle="Monitor and manage staff attendance"
      />

      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-gray-200 border-t-blue-600 rounded-full spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    </div>
  );
}

function HospitalAdminAttendancePage() {
  return (
    <Suspense fallback={<AttendanceLoading />}>
      <AttendanceData />
    </Suspense>
  );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(HospitalAdminAttendancePage);
