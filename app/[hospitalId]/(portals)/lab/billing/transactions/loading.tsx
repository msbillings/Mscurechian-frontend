import React from 'react';

export default function Loading() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-pulse">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="space-y-4">
                    <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                    <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800/50 rounded-lg" />
                </div>
                <div className="h-10 w-32 bg-indigo-600/20 rounded-xl" />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-8 border-b border-gray-50 dark:border-gray-700">
                    <div className="h-12 w-full bg-gray-50 dark:bg-gray-900/50 rounded-2xl" />
                </div>
                <div className="p-8 space-y-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-20 bg-gray-50 dark:bg-gray-900/30 rounded-2xl" />
                    ))}
                </div>
            </div>
        </div>
    );
}
