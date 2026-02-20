import React from 'react';
import { Microscope, Activity, TrendingUp } from 'lucide-react';

export default function Loading() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                    </div>
                    <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800/50 rounded-lg" />
                </div>
                <div className="h-12 w-80 bg-gray-100 dark:bg-gray-800/50 rounded-2xl" />
            </div>

            {/* Metrics Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 h-32" />
                ))}
            </div>

            {/* Content Section Skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                        <div className="h-4 w-24 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 min-h-[400px]">
                        <div className="p-8 space-y-6">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-16 bg-gray-50 dark:bg-gray-900/50 rounded-2xl" />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-4 space-y-6">
                    <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-28 bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700" />
                        ))}
                    </div>
                    <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-[40px]" />
                </div>
            </div>
        </div>
    );
}
