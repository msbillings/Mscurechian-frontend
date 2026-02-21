'use client';

import React, { useState } from 'react';
import {
  Briefcase,
  Users,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  MoreVertical,
  ChevronRight,
} from 'lucide-react';
import { useHRRecruitment } from '@/lib/integrations/hooks';

export default function RecruitmentPage() {
  const [activeTab, setActiveTab] = useState<'postings' | 'applicants'>('postings');
  const { data: recruitmentResponse, isLoading } = useHRRecruitment();

  const postings = [
    { id: '1', title: 'Senior Pathologist', department: 'Laboratory', type: 'Full-time', status: 'open', applicants: 12, date: '2024-03-15' },
    { id: '2', title: 'ER Nurse', department: 'Emergency', type: 'Full-time', status: 'open', applicants: 8, date: '2024-03-18' },
    { id: '3', title: 'Medical Officer', department: 'General Medicine', type: 'Full-time', status: 'paused', applicants: 24, date: '2024-03-10' },
  ];

  const applicants = [
    { id: '1', name: 'Dr. Sarah Wilson', role: 'Senior Pathologist', status: 'interview', experience: '8 Years', appliedDate: '2024-03-20' },
    { id: '2', name: 'James Thompson', role: 'ER Nurse', status: 'new', experience: '4 Years', appliedDate: '2024-03-21' },
    { id: '3', name: 'Emily Davis', role: 'Senior Pathologist', status: 'offered', experience: '12 Years', appliedDate: '2024-03-18' },
  ];

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Recruitment Management</h1>
          <p className="text-gray-500 font-medium">Manage job postings and evaluate talent across departments.</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100">
          <Plus className="w-5 h-5" />
          Create Job Posting
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Postings', value: '12', icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Total Applicants', value: '154', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'In Interview', value: '28', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Hired this Month', value: '6', icon: CheckCircle2, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('postings')}
            className={`px-8 py-5 text-sm font-black uppercase tracking-widest transition-all relative ${
              activeTab === 'postings' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Job Postings
            {activeTab === 'postings' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 shadow-[0_-2px_10px_rgba(79,70,229,0.3)]" />}
          </button>
          <button
            onClick={() => setActiveTab('applicants')}
            className={`px-8 py-5 text-sm font-black uppercase tracking-widest transition-all relative ${
              activeTab === 'applicants' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Recent Applicants
            {activeTab === 'applicants' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 shadow-[0_-2px_10px_rgba(79,70,229,0.3)]" />}
          </button>
        </div>

        <div className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
            />
          </div>

          <div className="space-y-4">
            {activeTab === 'postings' ? (
              postings.map((job) => (
                <div key={job.id} className="group p-4 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/10 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{job.title}</h4>
                      <p className="text-xs text-gray-500 font-medium">{job.department} • {job.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Applicants</p>
                      <p className="text-sm font-bold text-gray-900">{job.applicants}</p>
                    </div>
                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${
                      job.status === 'open' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {job.status}
                    </span>
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              applicants.map((app) => (
                <div key={app.id} className="group p-4 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/10 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold uppercase ring-2 ring-white shadow-sm">
                      {app.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{app.name}</h4>
                      <p className="text-xs text-gray-500 font-medium">Applied for {app.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Experience</p>
                      <p className="text-sm font-bold text-gray-900">{app.experience}</p>
                    </div>
                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${
                      app.status === 'interview' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                      app.status === 'offered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      'bg-gray-50 text-gray-600 border-gray-100'
                    }`}>
                      {app.status}
                    </span>
                    <button className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-xs font-black uppercase tracking-widest">
                      View Profile
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
