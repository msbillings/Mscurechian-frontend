'use client';

import React from 'react';
import { Calendar, Clock, MapPin, User, FileText, ChevronRight } from 'lucide-react';
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
    patientName?: string;
    patientEmail?: string;
}

function AppointmentsSection({
    appointments,
    patientName = 'Valued Patient',
    patientEmail = ''
}: AppointmentsSectionProps) {
    const getStatusColor = (status: string) => {
        const s = (status || '').toLowerCase();
        const colors: Record<string, string> = {
            'booked': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
            'confirmed': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
            'completed': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            'cancelled': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
            'in-progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        };
        return colors[s] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    };

    if (!appointments || appointments.length === 0) {
        return (
            <Card className="p-8 text-center border-dashed bg-gray-50/50 dark:bg-white/5">
                <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Calendar className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">No Visit History</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[200px] mx-auto">Your upcoming and past hospital visits will appear here.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-3 sm:space-y-6">
            <div className="flex items-center gap-2 sm:gap-3 px-1">
                <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg sm:rounded-xl">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-base sm:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        Clinical <span className="text-blue-600">Visits</span>
                    </h2>
                    <p className="text-[7px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5 sm:mt-0.5">Appointment Schedule & History</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {appointments.map((appointment) => (
                    <div key={appointment._id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-xl sm:rounded-3xl p-3 sm:p-5 shadow-sm hover:shadow-lg transition-all group overflow-hidden">
                        <div className="flex flex-row items-center sm:items-center gap-3 sm:gap-6">
                            {/* Date Chip - Compact on Mobile */}
                            <div className="flex-none flex flex-col items-center justify-center w-10 h-10 sm:w-16 sm:h-16 bg-gray-50 dark:bg-white/5 rounded-lg sm:rounded-2xl shrink-0">
                                <span className="text-[7px] sm:text-xs font-black uppercase text-gray-400 tracking-tighter leading-none mb-0.5 sm:mb-1">
                                    {format(new Date(appointment.date), 'MMM')}
                                </span>
                                <span className="text-sm sm:text-2xl font-black text-gray-950 dark:text-white leading-none">
                                    {format(new Date(appointment.date), 'dd')}
                                </span>
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1 sm:mb-3">
                                    <div className="space-y-0 text-left min-w-0">
                                        <h3 className="font-black text-gray-950 dark:text-white text-[11px] sm:text-base uppercase tracking-tight truncate">
                                            Dr. {appointment.doctor?.user?.name || appointment.doctor?.name || 'Medical Specialist'}
                                        </h3>
                                        <p className="text-[7px] sm:text-[10px] font-black uppercase text-blue-600 tracking-widest truncate">
                                            {appointment.doctor?.specialties?.[0] || appointment.doctor?.department || 'Authorized Physician'}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[7px] sm:text-[9px] font-black uppercase tracking-widest shrink-0 ${getStatusColor(appointment.status)}`}>
                                        {appointment.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 pt-1 sm:pt-2 border-t border-gray-50 dark:border-white/5">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <Clock className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-gray-400" />
                                        <div className="min-w-0">
                                            <p className="hidden sm:block text-[7px] font-black uppercase text-gray-400 tracking-widest leading-none mb-0.5">Time</p>
                                            <p className="text-[9px] sm:text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase truncate">{appointment.appointmentTime || 'TBD'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <MapPin className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-gray-400" />
                                        <div className="min-w-0">
                                            <p className="hidden sm:block text-[7px] font-black uppercase text-gray-400 tracking-widest leading-none mb-0.5">Location</p>
                                            <p className="text-[9px] sm:text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase truncate">{appointment.hospital?.name}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Arrow - Tiny on Mobile */}
                            <div className="shrink-0 flex sm:hidden">
                                <ChevronRight className="w-3 h-3 text-gray-300" />
                            </div>
                            <div className="hidden sm:block">
                                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all cursor-pointer shadow-sm">
                                    <ChevronRight className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default React.memo(AppointmentsSection);
