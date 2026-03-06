'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Clock, CreditCard, Trophy } from 'lucide-react';
import { useTenantLink } from '@/hooks/useTenantLink';

const actions = [
    { label: 'Leave Requests', icon: Calendar, path: '/hr/leaves' },
    { label: 'Attendance', icon: Clock, path: '/hr/attendance' },
    { label: 'Payroll', icon: CreditCard, path: '/hr/payroll' },
    { label: 'Performance', icon: Trophy, path: '/hr/performance' },
];

export default function HRNavQuickActions() {
    const router = useRouter();
    const pathname = usePathname();
    const { getPath } = useTenantLink();

    return (
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50 backdrop-blur-sm shadow-sm">
            {actions.map((action, i) => {
                const tenantPath = getPath(action.path);
                const isActive = pathname === tenantPath || pathname.startsWith(tenantPath + '/');
                const Icon = action.icon;
                return (
                    <React.Fragment key={action.path}>
                        <button
                            onClick={() => router.push(tenantPath)}
                            className={`flex items-center gap-2 py-1.5 px-4 rounded-xl transition-all ${isActive
                                    ? 'bg-white shadow-sm text-indigo-600'
                                    : 'text-slate-600 hover:bg-white hover:shadow-sm hover:text-indigo-600'
                                }`}
                        >
                            <Icon size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden xl:block">
                                {action.label}
                            </span>
                        </button>
                        {i < actions.length - 1 && (
                            <div className="w-px h-4 bg-slate-300 mx-0.5 self-center" />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
