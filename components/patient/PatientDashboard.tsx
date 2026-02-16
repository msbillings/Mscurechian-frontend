'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Pill, FlaskConical, FileCheck, Activity, Loader2, UserCircle, AlertTriangle } from 'lucide-react';
import { patientService } from '@/lib/integrations/services/patient.service';
import AppointmentsSection from './AppointmentsSection';
import PrescriptionsSection from './PrescriptionsSection';
import LabRecordsSection from './LabRecordsSection';
import ProfileSection from './ProfileSection';
import DischargeRecordsSection from './DischargeRecordsSection';
import { EmergencyModal } from './EmergencyModal';

type TabType = 'appointments' | 'prescriptions' | 'lab-records' | 'discharge' | 'profile';
import { useSearchParams } from 'next/navigation';

interface DashboardData {
    profile: any;
    appointments: { count: number; data: any[] };
    prescriptions: { count: number; data: any[] };
    labRecords: { count: number; data: any[] };
    dischargeRecords: { count: number; data: any[] };
    helpdeskPrescriptions: { count: number; data: any[] };
}

interface PatientDashboardProps {
    initialData?: DashboardData;
}

function PatientDashboard({ initialData }: PatientDashboardProps) {
    const [activeTab, setActiveTab] = useState<TabType>('appointments');
    const [loading, setLoading] = useState(!initialData);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(initialData || null);
    const [error, setError] = useState<string | null>(null);
    const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

    const searchParams = useSearchParams();
    const queryTab = searchParams.get('tab') as TabType;

    useEffect(() => {
        if (queryTab && ['appointments', 'prescriptions', 'lab-records', 'discharge', 'profile'].includes(queryTab)) {
            setActiveTab(queryTab);
        }
    }, [queryTab]);

    useEffect(() => {
        console.log("[Dashboard Debug] initialData received:", initialData);
        if (!initialData) {
            fetchDashboardData();
        }
    }, [initialData]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log("[Dashboard Debug] Calling getDashboardData...");
            const response = await patientService.getDashboardData();
            console.log("[Dashboard Debug] Response from service:", response);

            if (response.success && response.data) {
                setDashboardData(response.data);
            } else {
                setError('Failed to load dashboard data');
            }
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError('An error occurred while loading your medical records');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        {
            id: 'appointments' as TabType,
            label: 'Visits',
            icon: Calendar,
            count: dashboardData?.appointments?.count || 0,
            color: 'blue',
        },
        {
            id: 'prescriptions' as TabType,
            label: 'Medication',
            icon: Pill,
            count: dashboardData?.prescriptions?.count || 0,
            color: 'green',
        },
        {
            id: 'lab-records' as TabType,
            label: 'Lab',
            icon: FlaskConical,
            count: dashboardData?.labRecords?.count || 0,
            color: 'purple',
        },
        {
            id: 'discharge' as TabType,
            label: 'Discharge',
            icon: FileCheck,
            count: dashboardData?.dischargeRecords?.count || 0,
            color: 'red',
        },
    ];

    const getTabColorClasses = (color: string, isActive: boolean) => {
        const colors: Record<string, { active: string; inactive: string; badge: string }> = {
            blue: {
                active: 'bg-blue-600 text-white',
                inactive: 'text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20',
                badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
            },
            green: {
                active: 'bg-green-600 text-white',
                inactive: 'text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20',
                badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
            },
            purple: {
                active: 'bg-purple-600 text-white',
                inactive: 'text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20',
                badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
            },
            red: {
                active: 'bg-red-600 text-white',
                inactive: 'text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20',
                badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
            },
            orange: {
                active: 'bg-orange-600 text-white',
                inactive: 'text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20',
                badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
            },
        };

        return isActive ? colors[color].active : colors[color].inactive;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <p className="text-gray-600 dark:text-gray-300 font-medium tracking-tight">Loading Records...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-md p-6">
                    <Activity className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Access Error
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={fetchDashboardData}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-6 space-y-4 sm:space-y-6">
            {/* Simple Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-gray-100 dark:border-white/5">
                <div>
                    <h1 className="text-lg sm:text-xl font-black text-gray-950 dark:text-white uppercase tracking-tight italic flex items-center gap-2">
                        <div className="w-1 h-6 sm:w-1.5 sm:h-8 bg-blue-600 rounded-full" />
                        Health <span className="text-blue-600">Records</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-[0.2em] text-[8px] sm:text-[10px] mt-1 ml-0.5">
                        Your Personal Medical History
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 bg-gray-50 dark:bg-white/5 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-sm">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                        <UserCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                        <p className="text-[7px] sm:text-[9px] font-black uppercase text-gray-400 tracking-widest">Signed In</p>
                        <p className="font-black text-gray-900 dark:text-white uppercase tracking-tight italic text-xs sm:text-sm">
                            {dashboardData?.profile?.user?.name || 'Member'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setIsEmergencyModalOpen(true)}
                    className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all outline-none animate-pulse"
                >
                    <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Emergency
                </button>
            </div>

            {/* Responsive Tabs - More Compact on Mobile */}
            <div className="sticky top-16 sm:top-20 z-30">
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-1 sm:p-1.5 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-white/10 flex overflow-x-auto no-scrollbar md:grid md:grid-cols-4 gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-none min-w-[90px] sm:min-w-[100px] md:min-w-0 md:flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                                    }`}
                            >
                                <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5`} />
                                <span className="hidden xs:inline">{tab.label}</span>
                                <span className="xs:hidden">{tab.id === 'appointments' ? 'Visits' : tab.id === 'lab-records' ? 'Labs' : tab.label}</span>
                                {tab.count > 0 && (
                                    <span className={`ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.5 rounded-full text-[7px] sm:text-[8px] ${isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px] sm:min-h-[600px] pb-10">
                {activeTab === 'profile' && (
                    <ProfileSection
                        profile={dashboardData?.profile}
                        appointments={dashboardData?.appointments?.data || []}
                    />
                )}
                {activeTab === 'appointments' && (
                    <AppointmentsSection appointments={dashboardData?.appointments?.data || []} />
                )}
                {activeTab === 'prescriptions' && (
                    <PrescriptionsSection
                        prescriptions={dashboardData?.prescriptions?.data || []}
                        patientName={dashboardData?.profile?.user?.name}
                        patientEmail={dashboardData?.profile?.user?.email || dashboardData?.profile?.email}
                    />
                )}
                {activeTab === 'lab-records' && (
                    <LabRecordsSection
                        labRecords={dashboardData?.labRecords?.data || []}
                        patientName={dashboardData?.profile?.user?.name}
                        patientEmail={dashboardData?.profile?.user?.email || dashboardData?.profile?.email}
                    />
                )}
                {activeTab === 'discharge' && (
                    <DischargeRecordsSection />
                )}
            </div>
 
            <EmergencyModal
                isOpen={isEmergencyModalOpen}
                onClose={() => setIsEmergencyModalOpen(false)}
                patientProfile={dashboardData?.profile}
            />
        </div>
    );
}

export default React.memo(PatientDashboard);
