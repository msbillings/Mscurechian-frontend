import React from 'react';

export default function Loading() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-pulse">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="space-y-4">
                    <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                    <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800/50 rounded-lg" />
                </div>
                <div className="flex gap-3">
                    <div className="h-12 w-32 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl" />
                    <div className="h-12 w-48 bg-indigo-600/20 rounded-xl" />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-[40px] border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-8 space-y-8">
                    <div className="h-14 w-full bg-gray-50 dark:bg-gray-900/50 rounded-2xl" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                            <div key={i} className="h-48 bg-gray-50 dark:bg-gray-900/30 rounded-[32px] border border-gray-100/50 dark:border-gray-700/50" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
