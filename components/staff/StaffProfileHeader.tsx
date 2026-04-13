'use client';

import { Edit2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface StaffProfileHeaderProps {
    profile: any;
    staffName: string;
    staffDesignation: string;
    staffExperience: string;
}

export default function StaffProfileHeader({
    profile,
    staffName,
    staffDesignation,
    staffExperience
}: StaffProfileHeaderProps) {
    const params = useParams();
    const hospitalId = params?.hospitalId as string;

    return (
        <div className="px-0.5 sm:px-2 relative flex flex-col md:flex-row gap-2 sm:gap-4 md:items-center">
            <div className="w-12 h-12 md:w-24 md:h-24 bg-white dark:bg-[#111] p-0.5 rounded-full mx-auto md:mx-0 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="w-full h-full bg-indigo-50 dark:bg-indigo-900/10 rounded-full flex items-center justify-center text-xl font-black text-indigo-700 overflow-hidden uppercase">
                    {(profile?.user as any)?.image || (profile?.user as any)?.profilePic ? (
                        <img
                            src={`${(profile.user as any).image || (profile.user as any).profilePic}${(profile.user as any).image?.includes('?') ? '&' : '?'}t=${Date.now()}`}
                            alt={staffName}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        staffName.charAt(0)
                    )}
                </div>
            </div>
            <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-1 mb-0">
                    <h1 className="text-xs sm:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">{staffName}</h1>
                </div>
                <p className="text-[8px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 mb-1 opacity-70 border-b border-gray-100 dark:border-gray-800/30 pb-1 inline-block">{staffDesignation} <span className="text-indigo-500 mx-1">Â·</span> {staffExperience} INDUCTION</p>
            </div>
            <div className="flex justify-center shrink-0">
                <Link
                    href={`/${hospitalId}/staff/profile/edit`}
                    className="px-2 py-1 bg-gray-900 dark:bg-white text-white dark:text-black font-black uppercase tracking-widest rounded-md flex items-center gap-1 shadow-sm hover:opacity-90 active:scale-95 text-[8px] sm:text-[9px] min-w-[80px]"
                >
                    <Edit2 size={10} />
                    <span>Edit Index</span>
                </Link>
            </div>
        </div>
    );
}
