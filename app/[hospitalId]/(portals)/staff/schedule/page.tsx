'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Info,
  BookOpenCheck,
  Briefcase,
  TrendingUp
} from 'lucide-react';
import { staffService } from '@/lib/integrations';
import toast from 'react-hot-toast';

function SchedulePage() {
  const [schedule, setSchedule] = useState<any>(null);
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await staffService.getSchedule();
      setSchedule(data.schedule);
      setApprovedLeaves(data.approvedLeaves || []);
    } catch (error) {
      console.error('Failed to load schedule:', error);
      toast.error('Failed to load work schedule');
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-1 sm:space-y-2 max-w-7xl mx-auto pb-2 sm:pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 sm:gap-2 px-1 sm:px-0">
        <div className="space-y-0.5">
          <h1 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-tighter leading-none">Work Schedule Protocol</h1>
          <p className="text-gray-500 font-bold flex items-center gap-1.5 text-[6px] sm:text-[8px] uppercase tracking-widest leading-none mt-1">
            <Clock className="w-3 h-3 text-indigo-600" />
            Registry of assigned shifts, working hours, and weekly offs.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-2">
        {/* Left Column: Shift Summary */}
        <div className="lg:w-1/3 w-full space-y-2">
          <div className="bg-white p-2 rounded shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-50 rounded-full group-hover:scale-125 transition-transform duration-500"></div>

            <div className="relative z-10">
              <h2 className="text-[10px] font-black text-gray-900 uppercase tracking-tighter mb-2 flex items-center gap-1.5 leading-none">
                <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  <Clock size={12} />
                </div>
                Shift Assignment
              </h2>

              <div className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm text-gray-900 relative overflow-hidden group/shift hover:border-indigo-200 transition-colors">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-indigo-50 rounded-full blur-2xl group-hover/shift:scale-150 transition-transform"></div>
                <p className="text-gray-400 text-[8px] font-black uppercase tracking-widest relative">Current Designation</p>
                <div className="flex items-center justify-between mt-0.5 relative">
                  <h3 className="text-base font-black text-gray-900 uppercase tracking-tighter">{schedule?.shift || 'General'}</h3>
                  <span className="bg-emerald-500/10 px-1.5 py-0.5 rounded-lg text-[7px] font-black text-emerald-600 border border-emerald-500/20 uppercase tracking-tighter">Active</span>
                </div>
                <div className="flex items-center gap-4 mt-4 relative">
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Hours</p>
                    <p className="text-[11px] font-bold">{schedule?.workingHours?.start || '09:00'} - {schedule?.workingHours?.end || '17:00'}</p>
                  </div>
                  <div className="h-6 w-px bg-gray-100"></div>
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Type</p>
                    <p className="text-[11px] font-bold text-gray-600">8.0 HRS</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-1">
                <div className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600 transition-colors">
                      <Briefcase size={14} />
                    </div>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Contract</span>
                  </div>
                  <span className="text-[11px] font-bold text-gray-900 uppercase">{schedule?.employmentType || 'Full-Time'}</span>
                </div>
                <div className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600 transition-colors">
                      <Calendar size={14} />
                    </div>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Weekly Off</span>
                  </div>
                  <span className="text-[11px] font-bold text-gray-900 uppercase">
                    {schedule?.weeklyOff?.length > 0 ? schedule.weeklyOff[0] : 'None'}
                  </span>
                </div>
              </div>

              <div className="p-2 bg-amber-50/50 rounded-xl border border-amber-100 flex gap-3">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[8px] text-amber-800 leading-tight font-bold uppercase tracking-tight">Modify: Request HR for shift rotation or node reassignment.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded p-2 shadow-sm border border-gray-100 overflow-hidden group">
          <h2 className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-tight mb-2 leading-none">Performance Ledger</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-emerald-50 rounded border border-emerald-100 group/score">
              <div>
                <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest mb-0.5 leading-none">Punctuality Score</p>
                <p className="text-sm font-black text-emerald-900 leading-none">{schedule?.stats?.onTimePercentage || 0}%</p>
              </div>
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm group-hover/score:scale-110 transition-transform">
                <TrendingUp size={20} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-gray-50 rounded border border-gray-100">
                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-0.5 leading-none">Present</p>
                <p className="text-xs font-black text-gray-900 leading-none">{schedule?.stats?.presentDays || 0} D</p>
              </div>
              <div className="p-2 bg-gray-50 rounded border border-gray-100">
                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-0.5 leading-none">Absent</p>
                <p className="text-xs font-black text-rose-600 leading-none">{schedule?.stats?.absentDays || 0} D</p>
              </div>
            </div>

            <div className="p-2 bg-indigo-50 rounded border border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                  <User size={10} />
                </div>
                <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest leading-none">Active Leaves</span>
              </div>
              <span className="text-[10px] font-black text-indigo-900 uppercase leading-none">{schedule?.stats?.onLeaveDays || 0} Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Calendar View */}
      <div className="lg:w-2/3 w-full">
        <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
          <div className="px-2 py-2 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-50/30">
            <div>
              <h2 className="text-[16px] font-black text-gray-900 uppercase tracking-tight">{monthNames[currentMonth]} {currentYear}</h2>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Shift Deployment Schedule</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-gray-50 text-gray-500 hover:text-indigo-600 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setCurrentMonth(new Date().getMonth());
                    setCurrentYear(new Date().getFullYear());
                  }}
                  className="px-4 py-1.5 hover:bg-indigo-50 text-[9px] font-black text-indigo-600 uppercase tracking-widest rounded-lg transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-gray-50 text-gray-500 hover:text-indigo-600 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 p-1 md:p-2 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <div className="grid grid-cols-7 gap-px bg-gray-100 rounded overflow-hidden border border-gray-100 w-full min-w-[300px]">
                {/* Weekdays */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="bg-gray-50/50 py-1 sm:py-2 text-center text-[7px] sm:text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 leading-none">
                    {day}
                  </div>
                ))}

                {/* Empty slots for first week */}
                {Array.from({ length: firstDayOfMonth(currentMonth, currentYear) }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-white/40 h-10 sm:h-12 md:h-14"></div>
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth(currentMonth, currentYear) }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(currentYear, currentMonth, day);
                  date.setHours(0, 0, 0, 0);

                  const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
                  const isOff = schedule?.weeklyOff?.includes(date.toLocaleDateString('en-US', { weekday: 'long' }));

                  // Check for leaves
                  const leaveOnThisDay = approvedLeaves.find(leave => {
                    const start = new Date(leave.startDate);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(leave.endDate);
                    end.setHours(23, 59, 59, 999);
                    return date >= start && date <= end;
                  });

                  return (
                    <div key={day} className={`bg-white p-0.5 sm:p-1 h-10 sm:h-12 md:h-14 relative group transition-all duration-300 hover:bg-indigo-50/20 ${isToday ? 'z-10 shadow-[inset_0_0_0_1px_theme(colors.indigo.500)]' : ''}`}>
                      <div className="flex justify-between items-start mb-0.5">
                        <span className={`text-[7px] sm:text-[8px] font-black leading-none ${isToday ? 'text-indigo-600' : isOff ? 'text-gray-200' : 'text-gray-900'}`}>
                          {day}
                        </span>
                        {isToday && (
                          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_4px_theme(colors.indigo.400)]"></span>
                        )}
                      </div>

                      <div className="space-y-0.5 mt-0.5">
                        {leaveOnThisDay ? (
                          <div className="px-0.5 py-0 bg-rose-50 text-rose-500 border border-rose-100 rounded">
                            <p className="text-[5px] font-black uppercase tracking-tighter truncate leading-none">Leave</p>
                          </div>
                        ) : isOff ? (
                          <div className="h-full flex flex-col justify-end pb-0.5">
                            <span className="text-[5px] font-black text-gray-200 uppercase tracking-tighter text-center italic leading-none">OFF</span>
                          </div>
                        ) : (
                          <div className="px-0.5 py-0 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <p className="text-[5px] font-black uppercase tracking-tighter truncate leading-none">{schedule?.shift}</p>
                            <p className="text-[4px] font-bold opacity-60 mt-[1px] truncate leading-none">{schedule?.workingHours?.start}-{schedule?.workingHours?.end}</p>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-2 py-2 bg-gray-50/50 border-t border-gray-100 flex flex-wrap items-center gap-x-2 gap-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Active Shift</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">On Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Weekly Rest</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 border-2 border-indigo-600 rounded-full"></div>
              <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">Today</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(SchedulePage);
