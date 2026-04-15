'use client';

import React, { useState, useEffect } from 'react';
import {
   Calendar as CalendarIcon, Clock, Filter, Search,
   MoreVertical, X, ChevronLeft, ChevronRight, Activity
} from 'lucide-react';
import { getAllAppointmentsAction } from '@/lib/integrations/actions/doctor.actions';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useTenantLink } from '@/hooks/useTenantLink';
import { useRealtimeRefetch } from '@/hooks/useRealtimeRefetch';
import { useAppointmentStore } from '@/stores/domainStores';

function DoctorAppointmentsPage() {
   const router = useRouter();
   const { getPath } = useTenantLink();
   const [appointments, setAppointments] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   // Filter States
   const [searchQuery, setSearchQuery] = useState('');
   const [debouncedSearch, setDebouncedSearch] = useState('');
   const [statusFilter, setStatusFilter] = useState('');
   const [dateFilter, setDateFilter] = useState('');
   const [typeFilter, setTypeFilter] = useState('all');
   const [sortBy, setSortBy] = useState('newest');

   // Pagination State
   const [currentPage, setCurrentPage] = useState(1);
   const [pagination, setPagination] = useState({
      total: 0,
      totalPages: 0,
      limit: 10
   });

   // Details Modal State
   const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
   const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

   // Debounce search query
   useEffect(() => {
      const timer = setTimeout(() => {
         setDebouncedSearch(searchQuery);
         setCurrentPage(1); // Reset to first page on search
      }, 500);
      return () => clearTimeout(timer);
   }, [searchQuery]);

  
   useEffect(() => {
      fetchAppointments();
   }, [currentPage, debouncedSearch, statusFilter, dateFilter, sortBy, typeFilter]);

   const fetchAppointments = async () => {
      setLoading(true);
      try {
         const res = await getAllAppointmentsAction({
            page: currentPage,
            limit: 10,
            search: debouncedSearch,
            status: statusFilter,
            date: dateFilter,
            type: typeFilter !== 'all' ? typeFilter : undefined,
            sort: sortBy
         });

         if (res.success && res.data) {
            setAppointments(res.data);
            if (res.pagination) {
               setPagination({
                  total: res.pagination.total,
                  totalPages: res.pagination.totalPages,
                  limit: res.pagination.limit
               });
            }
         } else {
            toast.error('Failed to load appointments');
         }
      } catch (error) {
         console.error(error);
      } finally {
         setLoading(false);
      }
   };

    // ✅ REAL-TIME: Auto-refetch whenever an appointment SSE event arrives
   useRealtimeRefetch(useAppointmentStore, fetchAppointments);

   const startIndex = (currentPage - 1) * pagination.limit + 1;
   const endIndex = Math.min(currentPage * pagination.limit, pagination.total);

   const clearFilters = () => {
      setSearchQuery('');
      setStatusFilter('');
      setDateFilter('');
      setTypeFilter('all');
      setCurrentPage(1);
      setSortBy('newest');
   };

   return (
      <div className="space-y-2 sm:space-y-6">
         <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-4">
            <div>
               <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white">Appointments</h1>
               <p className="text-[8px] sm:text-[9px] font-bold text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1">Manage your schedule and patient consultations.</p>
            </div>
         </div>

         {/* Filters */}
         <div className="bg-white dark:bg-[#111] p-1.5 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 items-stretch sm:items-center shadow-sm mx-1 sm:mx-0">
            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
               <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Patient or MRN..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
               />
            </div>

            <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2 sm:gap-4">
               <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                  <select
                     value={statusFilter}
                     onChange={(e) => setStatusFilter(e.target.value)}
                     className="w-full pl-9 pr-8 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold rounded-lg text-[10px] sm:text-xs border border-blue-100 dark:border-blue-800 outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                     <option value="">All Status</option>
                     <option value="Scheduled">Scheduled</option>
                     <option value="Completed">Completed</option>
                     <option value="Cancelled">Cancelled</option>
                     <option value="No Show">No Show</option>
                  </select>
               </div>

               <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                  <input
                     type="date"
                     value={dateFilter}
                     onChange={(e) => setDateFilter(e.target.value)}
                     className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold rounded-lg text-[10px] sm:text-xs border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
               </div>

               <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                  <select
                     value={sortBy}
                     onChange={(e) => {
                        setSortBy(e.target.value);
                        setCurrentPage(1);
                     }}
                     className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold rounded-lg text-[10px] sm:text-xs border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                     <option value="newest">Newest</option>
                     <option value="oldest">Oldest</option>
                  </select>
               </div>

               <div className="relative">
                  <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                  <select
                     value={typeFilter}
                     onChange={(e) => {
                        setTypeFilter(e.target.value);
                        setCurrentPage(1);
                     }}
                     className={`w-full pl-9 pr-8 py-2 font-bold rounded-lg text-[10px] sm:text-xs border outline-none focus:ring-2 appearance-none cursor-pointer transition-all ${typeFilter === 'all'
                        ? 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 focus:ring-blue-500'
                        : typeFilter === 'IPD'
                           ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-800 focus:ring-rose-500'
                           : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800 focus:ring-emerald-500'
                        }`}
                  >
                     <option value="all">All Dept</option>
                     <option value="OPD">OPD</option>
                     <option value="IPD">IPD</option>
                  </select>
               </div>
            </div>

            {(searchQuery || statusFilter || dateFilter || sortBy !== 'newest') && (
               <button
                  onClick={clearFilters}
                  className="w-full sm:w-auto px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 border border-red-100 dark:border-red-900/20 sm:border-transparent"
               >
                  <X size={14} /> Clear
               </button>
            )}
         </div>

         {/* Appointments List */}
         <div className="bg-white dark:bg-[#111] rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden min-h-[400px] shadow-sm mx-1 sm:mx-0">
            {loading ? (
               <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
               </div>
            ) : appointments.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-64 text-gray-400 p-4 text-center">
                  <CalendarIcon size={40} className="mb-4 opacity-20" />
                  <p className="text-base font-bold text-gray-900 dark:text-white">No appointments found</p>
                  <p className="text-xs mt-1">Try adjusting your filters or search query.</p>
               </div>
            ) : (
               <>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
                           <tr>
                              <th className="px-1.5 sm:px-6 py-3 sm:py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Time</th>
                              <th className="px-1.5 sm:px-6 py-3 sm:py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Patient Details</th>
                              <th className="px-1.5 sm:px-6 py-3 sm:py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">Symptoms</th>
                              <th className="px-1.5 sm:px-6 py-3 sm:py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                              <th className="px-1.5 sm:px-6 py-3 sm:py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                           {appointments.map((apt: any) => (
                              <tr key={apt.id || apt._id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 group transition-colors">
                                 <td className="px-1.5 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                       {!['completed', 'cancelled', 'no show', 'no-show', 'finished', 'rejected', 'in session', 'in-progress'].includes(apt.status?.toLowerCase()) ? (
                                          (() => {
                                             let targetTime = null;

                                             if (apt.date && apt.time) {
                                                try {
                                                   const d = new Date(apt.date);
                                                   const t = apt.time.match(/(\d+):(\d+) (AM|PM)/i);
                                                   if (t) {
                                                      let hours = parseInt(t[1]);
                                                      const mins = parseInt(t[2]);
                                                      const ampm = t[3].toUpperCase();
                                                      if (ampm === 'PM' && hours < 12) hours += 12;
                                                      if (ampm === 'AM' && hours === 12) hours = 0;
                                                      d.setHours(hours, mins, 0, 0);
                                                      targetTime = d;
                                                   }
                                                } catch (e) { }
                                             }

                                             if (!targetTime || isNaN(targetTime.getTime())) {
                                                return (
                                                   <div className="flex items-center gap-1.5 text-gray-900 dark:text-white font-bold text-xs">
                                                      <Clock size={14} className="text-gray-400" />
                                                      {apt.time}
                                                   </div>
                                                );
                                             }

                                             const diff = Math.floor((targetTime.getTime() - new Date().getTime()) / 60000);

                                             let label = '';
                                             let colorClass = '';

                                             if (diff > 0) {
                                                const timeStr = diff < 60 ? diff + 'm' : Math.floor(diff / 60) + 'h ' + (diff % 60) + 'm';
                                                label = `${timeStr}`;
                                                colorClass = 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
                                             } else {
                                                const absDiff = Math.abs(diff);
                                                const timeStr = absDiff < 60 ? absDiff + 'm' : Math.floor(absDiff / 60) + 'h ' + (absDiff % 60) + 'm';
                                                label = `-${timeStr}`;
                                                colorClass = 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800';
                                             }

                                             return (
                                                <span className={`inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest ${colorClass}`}>
                                                   <Clock size={10} /> {label}
                                                </span>
                                             );
                                          })()
                                       ) : (
                                          <div className="flex items-center gap-1.5 text-gray-900 dark:text-white font-bold text-xs">
                                             <Clock size={14} className="text-gray-400" />
                                             {apt.time}
                                          </div>
                                       )}
                                       {apt.date && (
                                          <span className="text-[9px] text-gray-400 font-medium sm:ml-5">
                                             {new Date(apt.date).toLocaleDateString()}
                                          </span>
                                       )}
                                    </div>
                                 </td>
                                 <td className="px-1.5 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-black text-[10px] capitalize">
                                          {(apt.patientName || '?').charAt(0)}
                                       </div>
                                       <div>
                                          <p className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm group-hover:text-blue-600">{apt.patientName}</p>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                             <p className="text-[10px] text-gray-500 font-medium">{apt.patientId || apt.mrn}</p>
                                             <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${apt.patientType === 'IPD' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'}`}>
                                                {apt.patientType || 'OPD'}
                                             </span>
                                          </div>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-1.5 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                                    <span className="text-xs text-gray-600 dark:text-gray-300 max-w-[150px] truncate block font-medium">
                                       {Array.isArray(apt.symptoms) && apt.symptoms.length > 0 ? apt.symptoms.join(', ') : (apt.symptoms || '-')}
                                    </span>
                                 </td>
                                 <td className="px-1.5 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${apt.status?.toLowerCase() === 'scheduled' || apt.status?.toLowerCase() === 'booked' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-800' :
                                       apt.status?.toLowerCase() === 'completed' || apt.status?.toLowerCase() === 'finished' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-800' :
                                          apt.status?.toLowerCase() === 'cancelled' || apt.status?.toLowerCase() === 'rejected' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-800' :
                                             'bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400 border border-gray-100 dark:border-gray-800'
                                       }`}>
                                       {apt.status}
                                    </span>
                                 </td>
                                 <td className="px-1.5 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-2">
                                       <button
                                          onClick={() => {
                                             setSelectedAppointment(apt);
                                             setIsDetailsModalOpen(true);
                                          }}
                                          className="p-1.5 sm:px-3 sm:py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] font-black rounded-lg flex items-center gap-1 uppercase transition-colors"
                                          title="View Details"
                                       >
                                          <MoreVertical size={14} className="sm:hidden" />
                                          <span className="hidden sm:inline">Details</span>
                                       </button>

                                       {!['completed', 'cancelled', 'no show', 'finished', 'rejected'].includes(apt.status?.toLowerCase()) && (
                                          <button
                                             onClick={() => router.push(getPath(`/doctor/appointment/${apt.id || apt._id}`))}
                                             className="px-3 sm:px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-xs font-black rounded-lg shadow-md shadow-blue-600/20 active:scale-95 transition-all uppercase tracking-widest"
                                          >
                                             Start
                                          </button>
                                       )}
                                    </div>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>

                  {/* Pagination */}
                  <div className="px-1.5 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                     <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">
                        Showing <span className="font-bold text-gray-900 dark:text-white">{startIndex}-{endIndex}</span> of <span className="font-bold text-gray-900 dark:text-white">{pagination.total}</span>
                     </div>
                     <div className="flex items-center gap-1 sm:gap-2">
                        <button
                           onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                           disabled={currentPage === 1}
                           className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                        >
                           <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center gap-1">
                           {Array.from({ length: Math.min(pagination.totalPages, pagination.totalPages > 5 ? 3 : 5) }, (_, i) => {
                              const totalPages = pagination.totalPages;
                              let pageNum = i + 1;
                              if (totalPages > 5 && currentPage > 3) {
                                 pageNum = currentPage - 1 + i;
                                 if (pageNum > totalPages) pageNum = totalPages - (2 - i);
                              }

                              return (
                                 <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-black ${currentPage === pageNum
                                       ? 'bg-blue-600 text-white'
                                       : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                       }`}
                                 >
                                    {pageNum}
                                 </button>
                              );
                           })}
                           {pagination.totalPages > 5 && <span className="text-gray-300 mx-1">...</span>}
                        </div>
                        <button
                           onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                           disabled={currentPage === pagination.totalPages}
                           className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                        >
                           <ChevronRight size={16} />
                        </button>
                     </div>
                  </div>
               </>
            )}
         </div>

         {/* Appointment Details Modal */}
         {isDetailsModalOpen && selectedAppointment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setIsDetailsModalOpen(false)}
               ></div>
               <div className="bg-white dark:bg-[#111] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500"></div>

                  <div className="flex justify-between items-start mb-6">
                     <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Appointment Details</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Summary of the completed consultation.</p>
                     </div>
                     <button
                        onClick={() => setIsDetailsModalOpen(false)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white"
                     >
                        <X size={20} />
                     </button>
                  </div>

                  <div className="space-y-6">
                     {/* Patient Info Card */}
                     <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-4 mb-4">
                           <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-lg">
                              {(selectedAppointment.patientName || '?').charAt(0)}
                           </div>
                           <div>
                              <div className="text-lg font-bold text-gray-900 dark:text-white">{selectedAppointment.patientName}</div>
                              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">MRN: {selectedAppointment.patient?.mrn || selectedAppointment.mrn || 'N/A'}</div>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                           <div className="space-y-1">
                              <div className="text-gray-500">Age</div>
                              <div className="font-semibold text-gray-900 dark:text-white">{selectedAppointment.patient?.age || 'N/A'} Years</div>
                           </div>
                           <div className="space-y-1">
                              <div className="text-gray-500">Gender</div>
                              <div className="font-semibold text-gray-900 dark:text-white capitalize">{selectedAppointment.patient?.gender || 'Unknown'}</div>
                           </div>
                        </div>
                     </div>

                     {/* Vital Signs (if available) */}
                     {selectedAppointment.vitals && (
                        <div className="space-y-3">
                           <div className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                              <Activity size={14} className="text-rose-500" /> Patient Vitals
                           </div>
                           <div className="grid grid-cols-4 gap-2">
                              <div className="bg-rose-50 dark:bg-rose-900/10 p-2 rounded-xl border border-rose-100 dark:border-rose-900/20 text-center">
                                 <div className="text-[8px] font-bold text-rose-600 uppercase">BP</div>
                                 <div className="text-xs font-black text-gray-900 dark:text-white">{selectedAppointment.vitals.bloodPressure || selectedAppointment.vitals.bp || '--'}</div>
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-900/10 p-2 rounded-xl border border-blue-100 dark:border-blue-900/20 text-center">
                                 <div className="text-[8px] font-bold text-blue-600 uppercase">Pulse</div>
                                 <div className="text-xs font-black text-gray-900 dark:text-white">{selectedAppointment.vitals.pulse || '--'}</div>
                              </div>
                              <div className="bg-amber-50 dark:bg-amber-900/10 p-2 rounded-xl border border-amber-100 dark:border-amber-900/20 text-center">
                                 <div className="text-[8px] font-bold text-amber-600 uppercase">Temp</div>
                                 <div className="text-xs font-black text-gray-900 dark:text-white">{selectedAppointment.vitals.temperature || '--'}°F</div>
                              </div>
                              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/20 text-center">
                                 <div className="text-[8px] font-bold text-emerald-600 uppercase">SpO2</div>
                                 <div className="text-xs font-black text-gray-900 dark:text-white">{selectedAppointment.vitals.spO2 || selectedAppointment.vitals.spo2 || '--'}%</div>
                              </div>
                           </div>
                        </div>
                     )}

                     {/* Consultation Time Info */}
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20">
                           <div className="text-[10px] uppercase tracking-wider text-green-600 dark:text-green-400 font-bold mb-1">Scheduled At</div>
                           <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              <Clock size={14} className="text-green-500" />
                              {selectedAppointment.time || 'N/A'}
                           </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                           <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Appointment Date</div>
                           <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              <CalendarIcon size={14} className="text-gray-400" />
                              {selectedAppointment.date ? new Date(selectedAppointment.date).toLocaleDateString() : 'N/A'}
                           </div>
                        </div>
                     </div>

                     {/* Symptoms & Diagnosis Summary */}
                     <div className="space-y-4">
                        <div>
                           <div className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <Activity size={16} className="text-blue-500" /> Symptoms
                           </div>
                           <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-sm text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-800 max-h-24 overflow-y-auto">
                              {Array.isArray(selectedAppointment.symptoms) && selectedAppointment.symptoms.length > 0
                                 ? selectedAppointment.symptoms.join(', ')
                                 : (selectedAppointment.symptoms || 'No symptoms recorded.')}
                           </div>
                        </div>

                        {selectedAppointment.diagnosis && (
                           <div>
                              <div className="text-sm font-bold text-gray-900 dark:text-white mb-2 border-l-2 border-green-500 pl-2">Diagnosis</div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic pr-2">
                                 {selectedAppointment.diagnosis}
                              </p>
                           </div>
                        )}
                     </div>

                     <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                        <button
                           onClick={() => setIsDetailsModalOpen(false)}
                           className="px-6 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-bold rounded-xl text-sm active:scale-95 shadow-lg shadow-gray-900/10"
                        >
                           Close Details
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}

export default React.memo(DoctorAppointmentsPage);
