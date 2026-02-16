'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SupportFloatingButton from '@/components/common/SupportFloatingButton';

const DoctorSupportFloatingBox = () => {
    const router = useRouter();
    const pathname = usePathname();

    const handleClick = () => {
        if (pathname === '/doctor/support') {
            router.push('/doctor');
        } else {
            router.push('/doctor/support');
        }
    };

    return <SupportFloatingButton onClick={handleClick} />;
};

export default DoctorSupportFloatingBox;
