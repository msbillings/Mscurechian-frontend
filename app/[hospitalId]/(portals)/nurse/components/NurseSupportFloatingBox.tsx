'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SupportFloatingButton from '@/components/common/SupportFloatingButton';

const NurseSupportFloatingBox = () => {
    const router = useRouter();
    const pathname = usePathname();

    const handleClick = () => {
        if (pathname === '/nurse/support') {
            router.push('/nurse');
        } else {
            router.push('/nurse/support');
        }
    };

    return <SupportFloatingButton onClick={handleClick} />;
};

export default NurseSupportFloatingBox;
