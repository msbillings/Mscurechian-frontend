"use client";

import React, { useState } from 'react';
import AppointmentsQueueDynamic from './AppointmentsQueueDynamic';
import DoctorQueueStats from './DoctorQueueStats';

function DoctorAppointmentsSection() {
  const [queueStats, setQueueStats] = useState({
    queueCount: 0,
    totalAppointments: 0,
    completedCount: 0,
    estimatedMinutes: 0,
    showQueue: true
  });

  return (
    <>
      {/* Appointments Queue */}
      <div className="lg:col-span-2">
        <AppointmentsQueueDynamic onStatsChange={setQueueStats} />
      </div>

      {/* Stats Sidebar */}
      <div className="lg:col-span-1">
        <DoctorQueueStats 
          queueCount={queueStats.queueCount}
          showQueue={queueStats.showQueue}
          totalAppointments={queueStats.totalAppointments}
          completedCount={queueStats.completedCount}
        />
      </div>
    </>
  );
}

export default React.memo(DoctorAppointmentsSection);
