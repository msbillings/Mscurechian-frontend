'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SupportFloatingButton from '@/components/common/SupportFloatingButton';

const LabSupportFloatingBox = () => {
    const router = useRouter();
    const pathname = usePathname();

    const handleClick = () => {
        // Lab portal uses top-level support for now assuming no /lab/support as checked earlier
        if (pathname === '/support') {
            router.push('/lab/dashboard');
        } else {
            router.push('/support');
        }
    };

    return <SupportFloatingButton onClick={handleClick} />;
};

export default LabSupportFloatingBox;
