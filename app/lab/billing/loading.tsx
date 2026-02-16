import React from 'react';

export default function Loading() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-pulse">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                    <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800/50 rounded-lg" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Patient Details Form */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="space-y-2">
                                    <div className="h-4 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
                                    <div className="h-14 bg-gray-50 dark:bg-gray-900/50 rounded-2xl" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex justify-between">
                            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                        </div>
                        <div className="h-64 bg-gray-50 dark:bg-gray-900/50 rounded-3xl" />
                    </div>
                </div>

                {/* Bill Summary */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-indigo-600 rounded-[40px] p-8 min-h-[500px] opacity-20" />
                </div>
            </div>
        </div>
    );
}
