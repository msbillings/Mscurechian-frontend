'use client';

import React, { useMemo } from 'react';
import {
  Users,
  Calendar,
  Clock,
  Briefcase,
  TrendingUp,
  UserPlus,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { useHRStats } from '@/lib/integrations/hooks';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function HRDashboard() {
  const { hospitalId } = useParams();
  const { data: statsResponse, isLoading } = useHRStats();
  const stats = statsResponse?.data;

  const dashboardCards = useMemo(() => [
    {
      title: 'Total Staff',
      value: stats?.totalStaff || 0,
      icon: Users,
      color: 'bg-blue-500',
      link: `/${hospitalId}/hr/staff`,
    },
    {
      title: 'Pending Leaves',
      value: stats?.pendingLeaves || 0,
      icon: Calendar,
      color: 'bg-amber-500',
      link: `/${hospitalId}/hr/leaves`,
    },
    {
      title: 'Today Present',
      value: stats?.todayAttendance || 0,
      icon: Clock,
      color: 'bg-emerald-500',
      link: `/${hospitalId}/hr/attendance`,
    },
    {
      title: 'Departments',
      value: stats?.breakdown?.length || 0,
      icon: Briefcase,
      color: 'bg-purple-500',
      link: `/${hospitalId}/hr/staff`,
    },
  ], [stats, hospitalId]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-gray-200 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">HR Dashboard</h1>
          <p className="text-gray-500 font-medium">Manage hospital personnel, attendance, and leaves.</p>
        </div>
        <Link
          href={`/${hospitalId}/hr/staff/create`}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100"
        >
          <UserPlus className="w-5 h-5" />
          Add New Staff
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardCards.map((card, idx) => (
          <Link
            key={idx}
            href={card.link}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative overflow-hidden"
          >
            <div className={`p-3 rounded-xl ${card.color} text-white w-fit mb-4 group-hover:scale-110 transition-transform`}>
              <card.icon className="w-6 h-6" />
            </div>
            <h3 className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{card.title}</h3>
            <p className="text-3xl font-black text-gray-900 mt-1">{card.value}</p>
            <div className="absolute top-0 right-0 p-4 text-gray-50 opacity-10 group-hover:opacity-20 transition-opacity">
              <card.icon className="w-24 h-24 -mr-8 -mt-8" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900">Recent Recruitments</h3>
            <Link href={`/${hospitalId}/hr/staff`} className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:underline">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 pb-4 text-left">
                  <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                  <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                  <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Joined</th>
                  <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats?.recentStaff?.map((staff: any) => (
                  <tr key={staff._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-gray-900">{staff.name}</div>
                      <div className="text-xs text-gray-400">{staff.email}</div>
                    </td>
                    <td className="py-4">
                      <span className="text-xs font-bold text-gray-600 bg-gray-50 px-3 py-1 rounded-full border border-gray-100 uppercase tracking-wider">
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-4 text-sm text-gray-500 font-medium">
                      {new Date(staff.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4">
                      <span className={`flex items-center gap-1 text-[10px] font-black uppercase ${staff.status === 'active' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {staff.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {staff.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm h-full">
            <h3 className="text-xl font-bold text-gray-900 mb-8">Role Breakdown</h3>
            <div className="space-y-6">
              {stats?.breakdown?.map((item: any) => (
                <div key={item.role} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-gray-600 uppercase tracking-wider">{item.role}</span>
                    <span className="font-black text-gray-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full transition-all duration-1000" 
                      style={{ width: `${(item.count / stats.totalStaff) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
