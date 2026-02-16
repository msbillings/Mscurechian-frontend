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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1, 2].map(i => (
                    <div key={i} className="h-40 bg-white dark:bg-gray-800 rounded-[40px] border border-gray-100 dark:border-gray-700 shadow-sm" />
                ))}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-[40px] border border-gray-100 dark:border-gray-700 p-8 space-y-6">
                <div className="h-12 w-full bg-gray-50 dark:bg-gray-900/50 rounded-2xl" />
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-28 bg-gray-50 dark:bg-gray-900/30 rounded-3xl" />
                ))}
            </div>
        </div>
    );
}
