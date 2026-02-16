import React from 'react';
import { Users, Calendar, FileText, IndianRupee, TrendingUp } from 'lucide-react';

interface DoctorStatsCardsProps {
    stats: {
        totalPatients: number;
        appointmentsToday: number;
        totalPendingQueue?: number;
        pendingReports: number;
        activeInpatients: number;
        consultationsValue: number;
    };
}

function DoctorStatsCards({ stats }: DoctorStatsCardsProps) {
    const cards = [
        {
            label: 'Total Patients',
            value: stats.totalPatients,
            icon: Users,
            color: 'bg-blue-500',
            lightColor: 'bg-blue-50 dark:bg-blue-900/20',
            textColor: 'text-blue-600 dark:text-blue-400'
        },
        {
            label: 'Active Inpatients',
            value: stats.activeInpatients,
            icon: TrendingUp,
            color: 'bg-rose-500',
            lightColor: 'bg-rose-50 dark:bg-rose-900/20',
            textColor: 'text-rose-600 dark:text-rose-400',
            subValue: 'Currently admitted'
        },
        {
            label: 'Active Queue',
            value: stats.totalPendingQueue ?? stats.appointmentsToday,
            icon: TrendingUp,
            color: 'bg-indigo-500',
            lightColor: 'bg-indigo-50 dark:bg-indigo-900/20',
            textColor: 'text-indigo-600 dark:text-indigo-400',
            subValue: 'Total pending'
        },
        {
            label: 'Today\'s Schedule',
            value: stats.appointmentsToday,
            icon: Calendar,
            color: 'bg-emerald-500',
            lightColor: 'bg-emerald-50 dark:bg-emerald-900/20',
            textColor: 'text-emerald-600 dark:text-emerald-400',
            subValue: 'Scheduled for today'
        },
        {
            label: 'Consultation Value',
            value: `₹${stats.consultationsValue.toLocaleString()}`,
            icon: IndianRupee,
            color: 'bg-purple-500',
            lightColor: 'bg-purple-50 dark:bg-purple-900/20',
            textColor: 'text-purple-600 dark:text-purple-400'
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-sm:gap-3">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className="bg-card dark:bg-card p-6 max-sm:p-4 rounded-2xl shadow-sm border border-border-theme dark:border-border-theme hover:shadow-md"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm max-sm:text-[11px] font-medium text-muted dark:text-muted">{card.label}</p>
                            <h3 className="text-2xl max-sm:text-lg font-black text-foreground dark:text-foreground mt-1">{card.value}</h3>
                        </div>
                        <div className={`p-3 max-sm:p-2 rounded-xl ${card.lightColor}`}>
                            <card.icon className={`w-6 h-6 max-sm:w-5 max-sm:h-5 ${card.textColor}`} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default React.memo(DoctorStatsCards);
