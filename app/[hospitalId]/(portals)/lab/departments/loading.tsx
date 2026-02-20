import React from 'react';

export default function Loading() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-pulse">
            <div className="flex items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                    <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800/50 rounded-lg" />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-10">
                <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                <div className="grid grid-cols-1 gap-8">
                    {[1, 2].map(i => (
                        <div key={i} className="space-y-3">
                            <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded" />
                            <div className="h-16 bg-gray-50 dark:bg-gray-900/50 rounded-xl" />
                        </div>
                    ))}
                    <div className="h-14 w-full bg-indigo-600/20 rounded-xl mt-4" />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-6">
                <div className="h-8 w-40 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-gray-50 dark:bg-gray-900/30 rounded-xl" />
                    ))}
                </div>
            </div>
        </div>
    );
}
