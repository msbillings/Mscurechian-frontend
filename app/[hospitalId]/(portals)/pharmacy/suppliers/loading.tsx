import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

export default function Loading() {
    return (
        <div className="space-y-6 md:space-y-8 pb-20">
            {/* Header Skeleton */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
                    <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                </div>
                <div className="flex gap-3">
                    <div className="h-12 w-40 bg-teal-100 dark:bg-teal-900/20 rounded-2xl animate-pulse" />
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="p-6 border-b dark:border-gray-800 flex gap-4">
                    <div className="h-12 flex-1 bg-gray-50 dark:bg-gray-800 rounded-2xl animate-pulse" />
                </div>
                <TableSkeleton rows={6} columns={4} />
            </div>
        </div>
    );
}
