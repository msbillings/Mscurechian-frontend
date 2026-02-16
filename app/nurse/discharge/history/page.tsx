'use client';

import React from 'react';
import DischargeHistory from '@/app/discharge/components/DischargeHistory';

export default function NurseDischargeHistoryPage() {
    return (
        <div className="px-6">
            <DischargeHistory basePath="/nurse/discharge" />
        </div>
    );
}
