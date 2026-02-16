'use client';

import React from 'react';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

export default function NurseLoading() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-10 pb-12 px-6 lg:px-0 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="space-y-4">
                    <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded-full" />
                </div>
                <div className="h-12 w-64 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700" />
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-white dark:bg-gray-800 rounded-[40px] border border-gray-100 dark:border-gray-700 p-8 flex items-center gap-6">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-2xl shrink-0" />
                        <div className="space-y-2">
                            <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
                            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area Skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-6">
                    <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="bg-white dark:bg-gray-800 rounded-[40px] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <TableSkeleton rows={6} columns={4} />
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="h-[400px] bg-gray-900 dark:bg-slate-900 rounded-[40px]" />
                </div>
            </div>
        </div>
    );
}
