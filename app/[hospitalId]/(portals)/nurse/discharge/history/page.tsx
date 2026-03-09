'use client';

import React from 'react';
import DischargeHistory from '@/app/[hospitalId]/(portals)/discharge/components/DischargeHistory';

export default function NurseDischargeHistoryPage() {
    return (
        <div className="px-1 sm:px-6">
            <DischargeHistory basePath="/nurse/discharge" />
        </div>
    );
}
