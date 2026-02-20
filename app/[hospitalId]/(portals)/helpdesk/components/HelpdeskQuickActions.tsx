'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UserPlus, CalendarCheck, CreditCard } from 'lucide-react';

const HelpdeskQuickActions = () => {
    const router = useRouter();
    const pathname = usePathname();

    const actions = [
        {
            label: 'Register Patient',
            icon: UserPlus,
            path: '/helpdesk/patient-registration',
        },
        {
            label: 'Book Appointment',
            icon: CalendarCheck,
            path: '/helpdesk/appointment-booking',
        },
        {
            label: 'Transactions',
            icon: CreditCard,
            path: '/helpdesk/transactions',
        },
    ];

    return (
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50 backdrop-blur-sm shadow-sm">
            {actions.map((action, index) => {
                const isActive = pathname === action.path;
                const Icon = action.icon;

                return (
                    <React.Fragment key={action.path}>
                        <button
                            onClick={() => router.push(action.path)}
                            className={`
                                flex items-center gap-2 py-1.5 px-4 rounded-xl transition-all group
                                ${isActive
                                    ? 'bg-white shadow-sm text-teal-600'
                                    : 'text-slate-600 hover:bg-white hover:shadow-sm hover:text-teal-600'}
                            `}
                        >
                    
                            <span className="text-[10px] font-black uppercase tracking-widest hidden xl:block">
                                {action.label}
                            </span>
                        </button>
                        {index < actions.length - 1 && (
                            <div className="w-px h-4 bg-slate-300 mx-0.5 self-center"></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default HelpdeskQuickActions;
