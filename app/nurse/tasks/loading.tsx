'use client';

import React from 'react';

export default function TasksLoading() {
    return (
        <div className="max-w-[1200px] mx-auto space-y-10 pb-20 px-6 lg:px-0 animate-pulse">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-8 border-b border-gray-100 dark:border-gray-800">
                <div className="space-y-6 flex-1">
                    <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    <div className="h-24 w-full max-w-md bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700" />
                </div>
                <div className="h-12 w-64 bg-gray-50 dark:bg-gray-900 rounded-2xl" />
            </div>

            <div className="space-y-4">
                {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center gap-6 p-6 rounded-[32px] border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="w-20 h-10 bg-gray-100 dark:bg-gray-900 rounded-xl" />
                        <div className="grow space-y-3">
                            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-3 w-full max-w-sm bg-gray-100 dark:bg-gray-800 rounded" />
                        </div>
                        <div className="w-14 h-14 bg-gray-50 dark:bg-gray-900 rounded-2xl" />
                    </div>
                ))}
            </div>
        </div>
    );
}
