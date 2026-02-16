'use client';

import React from 'react';
import { Calendar, Clock, MapPin, User, FileText } from 'lucide-react';
import { Card } from '@/components/admin';
import { format } from 'date-fns';

interface Appointment {
    _id: string;
    appointmentId: string;
    date: string;
    appointmentTime?: string;
    status: string;
    doctor: {
        user?: {
            name: string;
        };
        name?: string; // Fallback
        specialties?: string[];
        department?: string;
    };
    hospital: {
        name: string;
        address?: string;
    };
    reason?: string;
    type?: string;
}

interface AppointmentsSectionProps {
    appointments: Appointment[];
}

function AppointmentsSection({ appointments }: AppointmentsSectionProps) {
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'Booked': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            'confirmed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            'completed': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            'cancelled': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            'in-progress': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        };
        return colors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    };

    if (!appointments || appointments.length === 0) {
        return (
            <Card className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No appointments found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your appointment history will appear here</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {appointments.map((appointment) => (
                <div key={appointment._id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm hover:border-blue-200 group">
                    <div className="flex flex-row items-center gap-4 sm:gap-6">
                        {/* Compact Date Chip */}
                        <div className="flex-none flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gray-50 dark:bg-white/5 rounded-xl sm:rounded-2xl group-hover:bg-blue-600">
                            <span className="text-[8px] sm:text-[10px] font-black uppercase text-gray-400 group-hover:text-blue-200 tracking-tighter">
                                {format(new Date(appointment.date), 'MMM')}
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white group-hover:text-white leading-none">
                                {format(new Date(appointment.date), 'dd')}
                            </span>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                                <div>
                                    <h3 className="font-black text-gray-950 dark:text-white text-sm sm:text-base uppercase tracking-tight truncate">
                                        {appointment.doctor?.user?.name || appointment.doctor?.name || 'Medical Specialist'}
                                    </h3>
                                    <p className="text-[8px] sm:text-[10px] font-black uppercase text-blue-600 tracking-widest truncate">
                                        {appointment.doctor?.specialties?.[0] || 'Healthcare Unit'}
                                    </p>
                                </div>
                                <span className={`self-start sm:self-center px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${getStatusColor(appointment.status)}`}>
                                    {appointment.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-y-1 gap-x-4 pt-1">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-gray-400" />
                                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">{appointment.appointmentTime || 'TBD'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3 text-gray-400" />
                                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase truncate">{appointment.hospital?.name}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default React.memo(AppointmentsSection);
