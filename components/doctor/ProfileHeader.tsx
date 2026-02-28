'use client';

import { Edit2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

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

    return (
        <>
            <div className={`px-6 relative flex flex-col md:flex-row gap-8 md:items-center ${profile?.profilePic ? 'pt-4' : ''}`}>
                <div className="relative shrink-0 mx-auto md:mx-0">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-gray-50 dark:bg-gray-800 border-4 border-white dark:border-gray-900 shadow-2xl overflow-hidden flex items-center justify-center transform hover:rotate-2 transition-transform duration-300">
                        {profile?.profilePic || profile?.user?.image || profile?.user?.avatar ? (
                            <img
                                src={profile.profilePic || profile.user?.image || profile.user?.avatar}
                                alt={doctorName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center">
                                <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
                                    {doctorName.charAt(0)}
                                </span>
                            </div>
                        )}
                    </div>
                    {(profile?.profilePic || profile?.user?.image) && (
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-2xl shadow-lg border-2 border-white dark:border-gray-900">
                            <Edit2 size={12} />
                        </div>
                    )}
                </div>

                <div className="flex-1 pb-2 text-center md:text-left">
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic">{doctorName}</h1>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-widest">{doctorSpecialty}</p>
                    <div className="flex items-center justify-center md:justify-start gap-4 mt-3">
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-gray-700">
                            {doctorExperience} Experience
                        </span>
                        <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800/30">
                            Clinical Expert
                        </span>
                    </div>
                </div>
                <div className="pb-4">
                    <button
                        onClick={() => router.push('/doctor/profile/edit')}
                        className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-xl flex items-center gap-2 shadow-lg hover:opacity-90 transition-all active:scale-95"
                    >
                        <Edit2 size={16} /> Edit Profile
                    </button>
                </div>
            </div>
        </>
    );
}

