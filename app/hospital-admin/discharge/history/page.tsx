'use client';

import React from 'react';
import DischargeHistory from '@/app/discharge/components/DischargeHistory';

export default function HospitalAdminDischargeHistoryPage() {
    return (
        <div className="px-6">
            <DischargeHistory basePath="/hospital-admin/dashboard" />
        </div>
    );
}
