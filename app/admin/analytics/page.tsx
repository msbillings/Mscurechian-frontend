"use client";

import React, { useEffect, useState } from 'react';
import { getAnalyticsAction } from '@/lib/integrations/actions/admin.actions';
import { Card } from '@/components/admin';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    Building2, Stethoscope, Pill, Users, Activity,
    TrendingUp, HeartPulse, Ambulance, Headphones, Briefcase, HeartHandshake
} from 'lucide-react';
import { PageHeader } from '@/components/admin';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getAnalyticsAction();
                setData(res);
            } catch (e) {
                console.error("Failed to load analytics", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Loading Analytics...</p>
                </div>
            </div>
        );
    }

    // Prepare chart data
    const revenueData = [
        { name: 'Pharmacy', amount: data?.pharmaRevenue || 0 },
        { name: 'Laboratory', amount: data?.labRevenue || 0 },
    ];

    const doctorStats = [
        { name: 'On Duty', value: data?.doctorsPresent || 0, color: '#10B981' },
        { name: 'Off Duty', value: (data?.totalDoctors || 0) - (data?.doctorsPresent || 0), color: '#E5E7EB' }
    ];

    const userDistribution = [
        { name: 'Doctors', value: data?.totalDoctors || 0 },
        { name: 'Nurses', value: data?.totalNurses || 0 },
        { name: 'Patients', value: data?.totalPatients || 0 },
        { name: 'Helpdesk', value: data?.totalHelpdesks || 0 },
        { name: 'Emergency', value: data?.totalEmergencies || 0 },
        { name: 'Other Staff', value: data?.totalStaff || 0 },
    ];

    return (
        <div className="max-w-[1600px] mx-auto pb-12 px-4 space-y-8 animate-in fade-in duration-500">
            <PageHeader
                icon={<Activity className="text-blue-600" />}
                title="Super Admin Analytics"
                subtitle="Overview of financial performance and system users"
            />

            {/* Financial & High Level Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">

                {/* Pharmacy Revenue */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Pharmacy Revenue</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-end gap-1">
                                <span className="text-sm text-gray-400 mb-1">₹</span>
                                {(data?.pharmaRevenue || 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                            <Pill className="text-green-600" size={24} />
                        </div>
                    </div>
                </div>

                {/* Lab Revenue */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Lab Revenue</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-end gap-1">
                                <span className="text-sm text-gray-400 mb-1">₹</span>
                                {(data?.labRevenue || 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                            <Stethoscope className="text-blue-600" size={24} />
                        </div>
                    </div>
                </div>

                {/* Total Users */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Users</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {(data?.totalUsers || 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                            <Users className="text-orange-600" size={24} />
                        </div>
                    </div>
                </div>

                {/* Total Hospitals */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Hospitals</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {data?.totalHospitals || 0}
                            </h3>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                            <Building2 className="text-purple-600" size={24} />
                        </div>
                    </div>
                </div>

                {/* Total Patients */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Patients</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {(data?.totalPatients || 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-xl group-hover:bg-pink-100 dark:group-hover:bg-pink-900/30 transition-colors">
                            <HeartPulse className="text-pink-600" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Role Breakdown */}
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">User Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all">
                    <div className="p-2 rounded-full bg-emerald-50 text-emerald-600"><HeartPulse size={20} /></div>
                    <span className="text-2xl font-bold">{data?.totalPatients || 0}</span>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Patients</span>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all">
                    <div className="p-2 rounded-full bg-blue-50 text-blue-600"><Stethoscope size={20} /></div>
                    <span className="text-2xl font-bold">{data?.totalDoctors || 0}</span>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Doctors</span>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all">
                    <div className="p-2 rounded-full bg-pink-50 text-pink-600"><HeartHandshake size={20} /></div>
                    <span className="text-2xl font-bold">{data?.totalNurses || 0}</span>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Nurses</span>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all">
                    <div className="p-2 rounded-full bg-indigo-50 text-indigo-600"><Headphones size={20} /></div>
                    <span className="text-2xl font-bold">{data?.totalHelpdesks || 0}</span>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">HelpDesk</span>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all">
                    <div className="p-2 rounded-full bg-red-50 text-red-600"><Ambulance size={20} /></div>
                    <span className="text-2xl font-bold">{data?.totalEmergencies || 0}</span>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Emergency/Drivers</span>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all">
                    <div className="p-2 rounded-full bg-gray-100 text-gray-600"><Briefcase size={20} /></div>
                    <span className="text-2xl font-bold">{data?.totalStaff || 0}</span>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Other Staff</span>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Revenue Comparison Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold mb-6 text-gray-800 dark:text-gray-200">Revenue Distribution</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => `₹${value / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    formatter={(value: number | undefined) => [`₹${(value || 0).toLocaleString()}`, 'Revenue']}
                                />
                                <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={60}>
                                    {revenueData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#3B82F6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Doctor Presence Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold mb-6 text-gray-800 dark:text-gray-200">Doctor Availability Today</h3>
                    <div className="flex flex-col md:flex-row items-center justify-center h-80">
                        <div className="h-64 w-64 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={doctorStats}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {doctorStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold">{data?.doctorsPresent || 0}</span>
                                <span className="text-xs text-gray-400 uppercase font-semibold">Present</span>
                            </div>
                        </div>
                        <div className="mt-8 md:mt-0 md:ml-12 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-900 dark:text-white text-lg">{data?.doctorsPresent || 0}</span>
                                    <span className="text-sm text-gray-500">Currently Present</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-900 dark:text-white text-lg">{(data?.totalDoctors || 0) - (data?.doctorsPresent || 0)}</span>
                                    <span className="text-sm text-gray-500">Offline / Absent</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
