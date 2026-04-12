'use client';

import { Edit2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useTenantLink } from '@/hooks/useTenantLink';

interface ProfileHeaderProps {
    profile: any;
    doctorName: string;
    doctorSpecialty: string;
    doctorExperience: string;
}

export default function ProfileHeader({
    profile,
    doctorName,
    doctorSpecialty,
    doctorExperience
}: ProfileHeaderProps) {
    const router = useRouter();
    const { getPath } = useTenantLink();

    return (
        <>
            <div className={`px-2 sm:px-6 relative flex flex-col md:flex-row gap-4 sm:gap-8 md:items-center ${profile?.profilePic ? 'pt-2 sm:pt-4' : ''}`}>
                <div className="relative shrink-0 mx-auto md:mx-0">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-[2.5rem] bg-gray-50 dark:bg-gray-800 border-4 border-white dark:border-gray-900 shadow-xl sm:shadow-2xl overflow-hidden flex items-center justify-center transform hover:rotate-2 transition-transform duration-300">
                        {profile?.profilePic || profile?.user?.image || profile?.user?.avatar ? (
                            <img
                                src={profile.profilePic || profile.user?.image || profile.user?.avatar}
                                alt={doctorName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center">
                                <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                                    {doctorName.charAt(0)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 pb-2 text-center md:text-left">
                    <h1 className="text-xl md:text-xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic line-clamp-2">{doctorName}</h1>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-[0.2em] sm:tracking-widest">{doctorSpecialty}</p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-4 mt-3">
                        <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-gray-700">
                            {doctorExperience} Exp
                        </span>
                        <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800/30">
                            Clinical Expert
                        </span>
                    </div>
                </div>

                <div className="pb-4 flex justify-center md:block">
                    <button
                        onClick={() => router.push(getPath('/doctor/profile/edit'))}
                        className="w-full sm:w-auto px-5 sm:px-6 py-2 sm:py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs sm:text-sm font-black rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all active:scale-95 uppercase tracking-widest"
                    >
                        <Edit2 size={14} /> <span className="sm:inline">Edit Profile</span>
                    </button>
                </div>
            </div>
        </>
    );
}

