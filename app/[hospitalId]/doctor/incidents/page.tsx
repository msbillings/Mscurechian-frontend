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
        <div className="min-h-screen space-y-4 sm:space-y-6 pt-2 sm:pt-4 pb-16 max-w-7xl mx-auto">
            {/* Header Area */}
            <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border-theme shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
                    <div className="flex items-center gap-6 sm:gap-10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-600 to-rose-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-xl shadow-red-500/10 rotate-3 transition-transform hover:rotate-0 duration-500">
                            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-xl lg:text-xl font-bold text-foreground uppercase tracking-tight">Safety Protocols</h1>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="text-muted font-bold uppercase tracking-[0.4em] text-[10px] sm:text-xs opacity-60 flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    Active Governance & Incident Network
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsReporting(!isReporting)}
                        className={`
                            w-full lg:w-auto px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black uppercase tracking-[0.2em] text-[9px] sm:text-[10px] transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg
                            ${isReporting
                                ? 'bg-secondary-theme text-muted hover:bg-secondary-theme/80 border border-border-theme shadow-none'
                                : 'bg-primary-theme hover:bg-primary-theme/90 text-white shadow-primary-theme/20'}
                        `}
                    >
                        {isReporting ? (
                            <><X size={18} /> Discard Session</>
                        ) : (
                            <><Plus size={18} /> Initialize Report</>
                        )}
                    </button>
                </div>
            </div>

            {isReporting ? (
                <div className="bg-card rounded-[2.5rem] sm:rounded-[3.5rem] p-4 sm:p-10 border border-border-theme shadow-2xl shadow-black/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="max-w-7xl mx-auto">
                        <MedicalIncidentForm onSuccess={() => {
                            setIsReporting(false);
                            queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
                            queryClient.refetchQueries({ queryKey: ['my-incidents'] });
                        }} />
                    </div>
                </div>
            ) : (
                <div className="space-y-8 sm:space-y-10">
                    {/* Insights / Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                        {[
                            { 
                                label: 'Total Logs', 
                                value: stats.total, 
                                icon: BadgeAlert, 
                                color: 'red',
                                description: 'Lifetime safety records'
                            },
                            { 
                                label: 'In Review', 
                                value: stats.inReview, 
                                icon: Clock, 
                                color: 'blue',
                                description: 'Active investigation nodes'
                            },
                            { 
                                label: 'Closed Cases', 
                                value: stats.closed, 
                                icon: AlertCircle, 
                                color: 'emerald',
                                description: 'Resolved protocols'
                            }
                        ].map((card, idx) => (
                            <div key={idx} className="bg-card p-4 sm:p-5 rounded-2xl border border-border-theme group hover:shadow-2xl hover:shadow-black/5 transition-all relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-20 h-20 bg-${card.color}-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150`}></div>
                                <div className="flex items-center gap-3 sm:gap-4 mb-4 relative z-10">
                                    <div className={`p-2.5 sm:p-3 bg-${card.color}-50 dark:bg-${card.color}-500/10 text-${card.color}-600 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-${card.color}-500/5`}>
                                        <card.icon size={18} className="sm:size-[20px]" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted opacity-60 block mb-0.5">{card.label}</span>
                                        <p className="text-[7px] font-black uppercase tracking-widest text-muted/40 italic leading-none">{card.description}</p>
                                    </div>
                                </div>
                                <div className="text-2xl sm:text-3xl font-black text-foreground relative z-10 tracking-tighter italic">
                                    {card.value.toString().padStart(2, '0')}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* History Table */}
                    <div className="space-y-8">
                        <div className="flex items-center justify-between px-6">
                            <div className="flex items-center gap-4">
                                <div className="w-1 h-8 bg-primary-theme rounded-full"></div>
                                <h3 className="text-lg md:text-xl lg:text-xl font-bold text-foreground uppercase tracking-tight">Recent Activity Log</h3>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-secondary-theme/50 rounded-full border border-border-theme">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted">Auto-Sync Active</span>
                            </div>
                        </div>

                        <div className="bg-card rounded-xl sm:rounded-2xl border border-border-theme shadow-sm overflow-hidden p-2 sm:p-4">
                            <IncidentActivityLog
                                incidents={incidents}
                                isLoading={isLoading}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
