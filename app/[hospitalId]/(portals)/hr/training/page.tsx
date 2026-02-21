'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  PlayCircle,
  Award,
  Users,
  Search,
  ChevronRight,
} from 'lucide-react';
import { useHRTraining } from '@/lib/integrations/hooks';

export default function TrainingPage() {
  const { data: trainingResponse, isLoading } = useHRTraining();

  const activePrograms = [
    { id: '1', title: 'HIPAA Compliance 2024', department: 'All Staff', completion: 65, duration: '2 hours', enrollments: 120 },
    { id: '2', title: 'Advanced Cardiac Life Support', department: 'Critical Care', completion: 40, duration: '8 hours', enrollments: 45 },
    { id: '3', title: 'Patient Privacy & Safety', department: 'Nursing', completion: 85, duration: '1.5 hours', enrollments: 80 },
    { id: '4', title: 'Emergency Protocols 101', department: 'Emergency', completion: 15, duration: '3 hours', enrollments: 60 },
  ];

  const recentCertifications = [
    { id: '1', name: 'Dr. Michael Chen', course: 'Radiology Informatics', date: '18 Mar 2024', status: 'verified' },
    { id: '2', name: 'Nurse Clara Oswald', course: 'Infection Control', date: '20 Mar 2024', status: 'verified' },
    { id: '3', name: 'Robert Fox', course: 'Customer Service Excellence', date: '15 Mar 2024', status: 'pending' },
  ];

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Training & Development</h1>
          <p className="text-gray-500 font-medium">Track staff certifications, manage learning programs, and foster professional growth.</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100">
          <BookOpen className="w-5 h-5" />
          Assign New Course
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Programs', value: '8', icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Courses Completed', value: '452', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Staff Enrolled', value: '184', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Certifs Pending', value: '12', icon: Award, color: 'text-rose-600', bg: 'bg-rose-50' },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-gray-900">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 tracking-tight">Active Training Programs</h3>
            <button className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:text-indigo-700">View All</button>
          </div>
          <div className="p-6 space-y-6">
            {activePrograms.map((course) => (
              <div key={course.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 transition-colors">
                      <PlayCircle size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{course.title}</h4>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{course.department} • {course.duration}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900">{course.completion}%</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Completion</p>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      course.completion > 80 ? 'bg-emerald-500' : 
                      course.completion > 50 ? 'bg-indigo-600' : 
                      'bg-amber-500'
                    }`}
                    style={{ width: `${course.completion}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-gray-900">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 tracking-tight">Recent Certifications</h3>
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search certs..."
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border-none rounded-lg text-[11px] font-medium"
              />
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {recentCertifications.map((cert) => (
              <div key={cert.id} className="p-6 flex items-center justify-between group hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase shadow-sm border border-indigo-100">
                    {cert.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{cert.name}</h4>
                    <p className="text-xs text-gray-500 font-medium">Earned "{cert.course}"</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</p>
                    <p className="text-xs font-bold text-gray-700">{cert.date}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border ${
                    cert.status === 'verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {cert.status}
                  </span>
                  <button className="text-gray-400 hover:text-indigo-600 transition-colors">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-gray-50/50 border-t border-gray-50 text-center">
            <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700">Download All Reports</button>
          </div>
        </div>
      </div>
    </div>
  );
}
