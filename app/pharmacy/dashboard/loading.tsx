import { CardSkeleton } from '@/components/skeletons/TableSkeleton';

/**
 * Loading state for Pharmacy Dashboard
 * Renders instantly (<300ms) while data loads in background
 * This dramatically improves perceived performance and LCP
 */
export default function Loading() {
    return (
        <div className="space-y-8">
            {/* Header - renders immediately */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Pharmacy Dashboard
                    </h1>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider">
                        Real-time operational overview
                    </p>
                </div>
            </div>

            {/* Skeleton for stats cards - instant render */}
            <CardSkeleton count={4} />

            {/* Skeleton for action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="h-32 bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse"
                    />
                ))}
            </div>
        </div>
    );
}
