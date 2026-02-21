'use client';

import React from 'react';
import { Activity, Search, RefreshCw } from 'lucide-react';

export default function WardLoading() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-20 px-4 md:px-0 animate-pulse">
            {/* HEADER SKELETON */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 dark:border-gray-800 pb-6">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    <div className="h-3 w-64 bg-gray-100 dark:border-gray-800 rounded-full" />
                </div>
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
                    <div className="h-12 w-40 bg-gray-900 dark:bg-gray-800 rounded-[20px]" />
                </div>
            </div>

            {/* FILTERS SKELETON */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex-1 h-14 bg-gray-50 dark:bg-gray-900/50 rounded-[20px]" />
                <div className="h-14 w-32 bg-gray-50 dark:bg-gray-900/50 rounded-[20px]" />
                <div className="h-14 w-32 bg-gray-50 dark:bg-gray-900/50 rounded-[20px]" />
            </div>

            {/* GRID SKELETON */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-9">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {Array(18).fill(0).map((_, i) => (
                            <div key={i} className="aspect-[4/5] bg-white dark:bg-gray-800 rounded-[32px] border-2 border-transparent shadow-sm p-3 space-y-3">
                                <div className="flex justify-between">
                                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-900 rounded-xl" />
                                    <div className="w-10 h-4 bg-gray-100 dark:bg-gray-900 rounded-lg" />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                                    <div className="h-2 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DETAIL PANEL SKELETON */}
                <div className="xl:col-span-3">
                    <div className="h-[400px] bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-2xl" />
                </div>
            </div>
        </div>
    );
}
