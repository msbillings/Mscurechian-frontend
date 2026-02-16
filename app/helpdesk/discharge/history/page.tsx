'use client';

import React from 'react';
import DischargeHistory from '@/app/discharge/components/DischargeHistory';

export default function HelpdeskDischargeHistoryPage() {
    return (
        <div className="px-6">
            <DischargeHistory basePath="/helpdesk/discharge" />
        </div>
    );
}
