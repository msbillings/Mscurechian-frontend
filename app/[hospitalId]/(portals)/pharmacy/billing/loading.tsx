export default function Loading() {
    return (
        <div className="space-y-6 md:space-y-8 pb-20">
            {/* Header Skeleton */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
                    <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                </div>
                <div className="h-12 w-48 bg-teal-50 dark:bg-teal-950/20 rounded-2xl animate-pulse" />
            </div>

            {/* Layout Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side - Form */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] border border-gray-100 dark:border-gray-700 animate-pulse space-y-6">
                        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-xl" />
                            <div className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-xl" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] border border-gray-100 dark:border-gray-700 animate-pulse space-y-6">
                        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                        <div className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-xl" />
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-gray-50 dark:bg-gray-700/30 rounded-2xl" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side - Summary */}
                <div className="space-y-8">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] border border-gray-100 dark:border-gray-700 animate-pulse space-y-6">
                        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                        <div className="space-y-3">
                            <div className="h-4 bg-gray-100 dark:bg-gray-700/50 rounded w-full" />
                            <div className="h-4 bg-gray-100 dark:bg-gray-700/50 rounded w-full" />
                            <div className="h-10 bg-teal-100 dark:bg-teal-900/30 rounded-xl w-full" />
                        </div>
                        <div className="h-14 bg-gray-900 dark:bg-white rounded-2xl w-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}
