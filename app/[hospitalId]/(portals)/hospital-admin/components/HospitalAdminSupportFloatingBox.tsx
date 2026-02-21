'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SupportFloatingButton from '@/components/common/SupportFloatingButton';

const HospitalAdminSupportFloatingBox = () => {
    const router = useRouter();
    const pathname = usePathname();

    const handleClick = () => {
        if (pathname === '/hospital-admin/support') {
            router.push('/hospital-admin');
        } else {
            router.push('/hospital-admin/support');
        }
    };

    return <SupportFloatingButton onClick={handleClick} />;
};

export default HospitalAdminSupportFloatingBox;
