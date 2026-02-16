'use client';

import React from 'react';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

export default function PatientsLoading() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-12 px-6 lg:px-0 animate-pulse">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="space-y-3">
                    <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded-full" />
                </div>
                <div className="h-14 w-full md:w-96 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl" />
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-white dark:bg-gray-800 rounded-[40px] border border-gray-100 dark:border-gray-700" />
                ))}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-[40px] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden p-0">
                <TableSkeleton rows={8} columns={5} />
            </div>
        </div>
    );
}
