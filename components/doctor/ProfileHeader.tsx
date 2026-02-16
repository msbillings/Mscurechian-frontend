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
            <div className="px-6 relative flex flex-col md:flex-row gap-6 md:items-center">
                <div className="flex-1 pb-2 text-center md:text-left">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{doctorName}</h1>
                    <p className="text-lg text-gray-500">{doctorSpecialty} • {doctorExperience} Experience</p>
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

