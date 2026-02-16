'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SupportFloatingButton from '@/components/common/SupportFloatingButton';

const PharmacySupportFloatingBox = () => {
    const router = useRouter();
    const pathname = usePathname();

    const handleClick = () => {
        // Pharmacy portal routes to top-level support
        if (pathname === '/support') {
            router.push('/pharmacy/dashboard');
        } else {
            router.push('/support');
        }
    };

    return <SupportFloatingButton onClick={handleClick} />;
};

export default PharmacySupportFloatingBox;
