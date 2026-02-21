'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentService } from '@/lib/integrations/services/incident.service';
import MedicalIncidentForm from '@/components/medical-incident/MedicalIncidentForm';
import IncidentActivityLog from '@/components/medical-incident/IncidentActivityLog';
import { AlertTriangle, Plus, X, BadgeAlert, AlertCircle, Clock } from 'lucide-react';

export default function DoctorIncidentPage() {
    const [isReporting, setIsReporting] = useState(false);

    const queryClient = useQueryClient();
    const { data: incidents = [], isLoading } = useQuery({
        queryKey: ['my-incidents'],
        queryFn: () => incidentService.getIncidents(),
        refetchOnMount: true,
        staleTime: 0
    });

    // Derived Stats for instant reactivity
    const stats = React.useMemo(() => ({
        total: incidents.length,
        inReview: incidents.filter(i => i.status === 'IN REVIEW').length,
        closed: incidents.filter(i => i.status === 'CLOSED').length
    }), [incidents]);

    return (
        <div className="p-8 space-y-10 max-w-7xl mx-auto mt-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white font-semibold uppercase">Safety Protocols</h1>
                    <div className="flex items-center gap-4 mt-2">
                        <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] ml-1 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                            Medical Incident Reporting & Governance
                        </p>

                    </div>
                </div>

                <button
                    onClick={() => setIsReporting(!isReporting)}
                    className={`
                        px-8 py-4 rounded-[1rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all active:scale-95 flex items-center gap-3
                        ${isReporting
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                            : 'bg-primary-theme hover:bg-primary-theme/80 text-white dark:text-white'}
                    `}
                >
                    {isReporting ? <><X size={16} /> Cancel Report</> : <><Plus size={16} /> Report New Incident</>}
                </button>
            </div>

            {isReporting ? (
                <div className="bg-white dark:bg-gray-900 p-1 rounded-[0.5rem] border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="p-2">
                        <MedicalIncidentForm onSuccess={() => {
                            setIsReporting(false);
                            // Multi-pronged refresh approach
                            queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
                            queryClient.refetchQueries({ queryKey: ['my-incidents'] });
                        }} />
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Insights / Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-[0.5rem] border border-gray-100 dark:border-gray-700 group">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <BadgeAlert size={24} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Logs</span>
                            </div>
                            <div className="text-4xl font-black font-semibold ">{stats.total}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-[0.5rem] border border-gray-100 dark:border-gray-700 group">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Clock size={24} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">In Review</span>
                            </div>
                            <div className="text-4xl font-black font-semibold">
                                {stats.inReview}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-[0.5rem] border border-gray-100 dark:border-gray-700 group">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <AlertCircle size={24} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Closed</span>
                            </div>
                            <div className="text-4xl font-black font-semibold">
                                {stats.closed}
                            </div>
                        </div>
                    </div>

                    {/* History Table */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 ml-4">
                           
                            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase font-semibold">Recent Activity Log</h3>
                        </div>

                        <IncidentActivityLog
                            incidents={incidents}
                            isLoading={isLoading}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
