'use client';

import { Edit2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
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
    const router = useRouter();
    const params = useParams();
    const hospitalId = params?.hospitalId as string;

    return (
        <div className="px-6 relative flex flex-col md:flex-row gap-6 md:items-center">
            <div className="w-32 h-32 md:w-40 md:h-40 bg-white dark:bg-[#111] p-1.5 rounded-full">
                <div className="w-full h-full bg-indigo-100 rounded-full flex items-center justify-center text-4xl font-bold text-indigo-700 overflow-hidden">
                    {(profile?.user as any)?.image || (profile?.user as any)?.profilePic ? (
                        <img src={(profile.user as any).image || (profile.user as any).profilePic} alt={staffName} className="w-full h-full object-cover" />
                    ) : (
                        staffName.charAt(0)
                    )}
                </div>
            </div>
            <div className="flex-1 pb-2 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{staffName}</h1>

                </div>
                <p className="text-lg text-gray-500">{staffDesignation} • {staffExperience} Experience</p>
            </div>
            <div className="pb-4">
                <Link
                    href={`/${hospitalId}/staff/profile/edit`}
                    className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-xl flex inline-flex items-center gap-2 shadow-lg hover:opacity-90 transition-all active:scale-95"
                >
                    <Edit2 size={16} /> Edit Profile
                </Link>
            </div>
        </div>
    );
}
