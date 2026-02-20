'use client';

import React from 'react';

export default function AnnouncementsLoading() {
    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-20 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-gray-200 dark:bg-emerald-900/30 rounded-[28px] shadow-sm rotate-3" />
                <div className="space-y-2">
                    <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="h-3 w-64 bg-gray-100 dark:bg-gray-800 rounded" />
                </div>
            </div>

            {/* Feed Skeleton */}
            <div className="space-y-10">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="relative">
                        <div className="flex gap-8">
                            {/* Date Stamp */}
                            <div className="hidden md:flex flex-col items-center justify-start py-2 min-w-[80px] gap-2">
                                <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="w-1 h-8 bg-gray-100 dark:bg-gray-800 rounded-full mt-4" />
                            </div>

                            {/* Content Card */}
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] border border-gray-100 dark:border-gray-700 shadow-sm grow space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-6 w-20 bg-gray-100 dark:bg-gray-700 rounded-full" />
                                        <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="h-8 w-3/4 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                                    <div className="space-y-2">
                                        <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded" />
                                        <div className="h-4 w-5/6 bg-gray-100 dark:bg-gray-800 rounded" />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                                        <div className="space-y-1">
                                            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                                            <div className="h-2 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
                                        </div>
                                    </div>
                                    <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
