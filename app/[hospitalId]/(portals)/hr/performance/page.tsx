'use client';

import React, { useState } from 'react';
import {
  Trophy,
  Target,
  TrendingUp,
  Star,
  Users,
  ChevronRight,
  Search,
  AlertCircle,
} from 'lucide-react';
import { useHRPerformance } from '@/lib/integrations/hooks';

export default function PerformancePage() {
  const [period, setPeriod] = useState('Q1 2024');
  const { data: performanceResponse, isLoading } = useHRPerformance({ period });

  const stats = [
    { label: 'Avg Review Score', value: '4.2/5', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Reviews Completed', value: '85%', icon: Trophy, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'High Performers', value: '24', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Need Improvement', value: '3', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const staffReviews = [
    { id: '1', name: 'Dr. Michael Chen', role: 'Radiologist', score: 4.8, status: 'completed', lastReview: '12 Mar 2024' },
    { id: '2', name: 'Nurse Linda May', role: 'Head Nurse', score: 4.5, status: 'completed', lastReview: '15 Mar 2024' },
    { id: '3', name: 'Robert Fox', role: 'Helpdesk Executive', score: 3.2, status: 'pending', lastReview: 'N/A' },
    { id: '4', name: 'Dr. Anna Stone', role: 'Surgeon', score: 4.9, status: 'completed', lastReview: '20 Mar 2024' },
  ];

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Performance & Appraisals</h1>
          <p className="text-gray-500 font-medium">Track staff growth, set targets, and manage review cycles.</p>
        </div>
        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2">
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-transparent border-none focus:ring-0 font-bold text-gray-700 text-sm appearance-none pr-8 cursor-pointer"
          >
            <option>Q1 2024</option>
            <option>Q4 2023</option>
            <option>Annual 2023</option>
          </select>
          <div className="h-4 w-px bg-gray-200 mx-2" />
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all">
            New Cycle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} mb-4`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-gray-900">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search staff performance..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg font-medium text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">Filter</button>
            <button className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">Export</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Score</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Trend</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Review</th>
                <th className="p-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staffReviews.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs uppercase text-gray-500 overflow-hidden ring-2 ring-white shadow-sm">
                        {review.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{review.name}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{review.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <div className="flex text-amber-500">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} size={14} fill={i < Math.floor(review.score) ? "currentColor" : "none"} />
                        ))}
                      </div>
                      <span className="text-sm font-black text-gray-900">{review.score}</span>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <TrendingUp className={`w-4 h-4 mx-auto ${review.score > 4 ? 'text-emerald-500' : 'text-amber-500'}`} />
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${
                      review.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {review.status}
                    </span>
                  </td>
                  <td className="p-6 text-xs font-bold text-gray-500 uppercase">{review.lastReview}</td>
                  <td className="p-6 text-right">
                    <button className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-xs font-black uppercase tracking-widest">
                      Full Record
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
