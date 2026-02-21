"use client";

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    TrendingUp,
    Users,
    Microscope,
    Wallet,
    DollarSign,
    Activity,
    TestTube,
    RefreshCw,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { LabDashboardService, LabDashboardStats } from '@/lib/integrations/services/labDashboard.service';
import { toast } from 'react-hot-toast';

function HospitalAdminLabDashboard() {
    const [range, setRange] = useState('today');
    const [lastUpdate, setLastUpdate] = useState(new Date());

    const { data: stats, isLoading, refetch } = useQuery<LabDashboardStats>({
        queryKey: ['hospital-admin-lab-dashboard-stats', range],
        queryFn: async () => {
            try {
                const data = await LabDashboardService.getStats(range, true);
                setLastUpdate(new Date());
                return data;
            } catch (error) {
                toast.error('Failed to load lab analytics');
                throw error;
            }
        },
        refetchInterval: 30000, // Auto-refresh every 30 seconds
        staleTime: 10000,
        retry: 2,
    });

    // Manual refresh
    const handleRefresh = () => {
        refetch();
        toast.success('Dashboard refreshed');
    };

    const rangeLabels: any = {
        'today': 'Today',
        '7days': 'Last 7 Days',
        '1month': 'This Month'
    };

    if (isLoading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-emerald-600/10 border-t-emerald-600 rounded-full animate-spin" />
                <p className="text-sm font-semibold text-gray-500">Loading lab analytics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Laboratory Dashboard
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Last updated: {lastUpdate.toLocaleTimeString()}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>

                    {/* Range Selector */}
                    <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        {Object.keys(rangeLabels).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                    range === r
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                {rangeLabels[r]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Core Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Revenue"
                    value={`₹${stats?.revenue?.toLocaleString() || 0}`}
                    icon={DollarSign}
                    color="blue"
                />
                <StatCard
                    title="Collections"
                    value={`₹${stats?.collections?.toLocaleString() || 0}`}
                    icon={Wallet}
                    color="emerald"
                />
                <StatCard
                    title="Patients"
                    value={stats?.patients || 0}
                    icon={Users}
                    color="purple"
                />
                <StatCard
                    title="Tests Conducted"
                    value={stats?.totalTests || 0}
                    icon={TestTube}
                    color="orange"
                />
            </div>

            {/* Detailed Analytics */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Payment Breakdown */}
                <div className="xl:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Payment Breakdown</h2>
                            <p className="text-sm text-gray-500 mt-1">Revenue by payment method</p>
                        </div>
                        <Activity className="w-5 h-5 text-emerald-500" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <PaymentCard
                            label="Cash"
                            amount={stats?.paymentBreakdown?.Cash || 0}
                            color="emerald"
                        />
                        <PaymentCard
                            label="UPI"
                            amount={stats?.paymentBreakdown?.UPI || 0}
                            color="blue"
                        />
                        <PaymentCard
                            label="Card"
                            amount={stats?.paymentBreakdown?.Card || 0}
                            color="purple"
                        />
                    </div>
                </div>

                {/* Lab Summary */}
                <div className="bg-primary-theme rounded-xl p-6 text-white">

                    <h3 className="text-sm font-semibold opacity-90 mb-6">Lab Overview</h3>
                    
                    <div className="space-y-4">
                        <SummaryItem 
                            label="Total Test Catalog" 
                            value={stats?.totalTestMaster || 0} 
                        />
                        <SummaryItem 
                            label="Departments" 
                            value={stats?.totalDepartments || 0} 
                        />
                        <SummaryItem 
                            label="Pending Samples" 
                            value={stats?.pendingSamples || 0} 
                        />
                        
                        <div className="pt-4 mt-4 border-t border-white/20 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-xs font-medium">System Active</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Tests */}
            {stats?.topTests && stats.topTests.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Performing Tests</h2>
                    <div className="space-y-3">
                        {stats.topTests.slice(0, 5).map((test, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                        <Microscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{test.name}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">₹{test.revenue.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">{test.count} tests</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

const StatCard = ({ title, value, icon: Icon, color }: any) => {
    const colorClasses: any = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
        orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                    <Icon size={20} />
                </div>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
            </div>
        </div>
    );
};

const PaymentCard = ({ label, amount, color }: any) => {
    const colorClasses: any = {
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200',
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200',
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold mb-3 ${colorClasses[color]}`}>
                {label}
            </span>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white">₹{amount.toLocaleString()}</h4>
        </div>
    );
};

const SummaryItem = ({ label, value }: any) => (
    <div className="flex items-center justify-between">
        <span className="text-sm font-medium opacity-90">{label}</span>
        <span className="text-lg font-bold">{value}</span>
    </div>
);

export default React.memo(HospitalAdminLabDashboard);
