'use client';

import React, { useState, useEffect } from 'react';
import { Search, User, Users, Filter, ArrowRight, Activity, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getDoctorPatientsAction } from '@/lib/integrations/actions/doctor.actions';
import { DoctorPatient } from '@/lib/integrations/types/doctor';
import { useTenantLink } from '@/hooks/useTenantLink';
import toast from 'react-hot-toast';

function PatientsPage() {
   const { getPath } = useTenantLink();
   const [patients, setPatients] = useState<DoctorPatient[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [debouncedSearch, setDebouncedSearch] = useState('');
   const [currentPage, setCurrentPage] = useState(1);
   const [sortBy, setSortBy] = useState('newest');
   const [patientTypeFilter, setPatientTypeFilter] = useState('all');
   const [pagination, setPagination] = useState({
      total: 0,
      totalPages: 0,
      limit: 10
   });

   // Debounce search query
   useEffect(() => {
      const timer = setTimeout(() => {
         setDebouncedSearch(searchQuery);
         setCurrentPage(1); // Reset to first page on search
      }, 500);
      return () => clearTimeout(timer);
   }, [searchQuery]);

   const loadPatients = async () => {
      setIsLoading(true);
      const { success, data, pagination: pagData, error } = await getDoctorPatientsAction({
         page: currentPage,
         limit: 10,
         sort: sortBy,
         search: debouncedSearch,
         type: patientTypeFilter !== 'all' ? patientTypeFilter : undefined
      });

      if (success && data) {
         setPatients(data);
         if (pagData) {
            setPagination({
               total: pagData.total,
               totalPages: pagData.totalPages,
               limit: pagData.limit
            });
         }
      } else {
         toast.error(error || "Failed to load patients");
      }
      setIsLoading(false);
   };

   useEffect(() => {
      loadPatients();
   }, [currentPage, sortBy, debouncedSearch, patientTypeFilter]);

   const startIndex = (currentPage - 1) * pagination.limit + 1;
   const endIndex = Math.min(currentPage * pagination.limit, pagination.total);

   return (
      <div className="space-y-4 sm:space-y-6 pt-3 md:pt-0 lg:pt-0 translate-y-[-10px] sm:translate-y-0">
         {/* Header */}
         <div className="bg-card p-4 sm:p-6 sm:pt-3 rounded-2xl sm:rounded-3xl shadow-sm border border-border-theme flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-primary-theme/10 rounded-xl">
                  <Users className="text-primary-theme" size={20} />
               </div>
               <div>
                  <h1 className="text-lg md:text-xl lg:text-xl font-bold text-foreground uppercase tracking-tight">My Patients</h1>
                  <p className="text-muted font-bold uppercase tracking-[0.2em] text-[8px] sm:text-[9px] mt-0.5">Clinical Registry & Archives</p>
               </div>
            </div>
            <div className="text-right hidden sm:block">
               <p className="text-[10px] font-black text-muted uppercase tracking-widest leading-none">Total Patients</p>
               <p className="text-2xl font-black text-foreground tracking-tighter">{pagination.total}</p>
            </div>
         </div>

         {/* Filters & Search - Mobile Compact */}
         <div className="bg-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border border-border-theme flex flex-col lg:flex-row gap-3 sm:gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row items-center gap-3 sm:gap-4 flex-1 w-full">
               <div className="relative flex-1 w-full group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary-theme" size={16} />
                  <input
                     type="text"
                     placeholder="ID, Name or Mobile..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-11 pr-4 py-3 sm:py-3 bg-secondary-theme border border-transparent focus:border-primary-theme/30 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold uppercase tracking-widest placeholder:text-muted/50 focus:ring-4 focus:ring-primary-theme/5 outline-none transition-all"
                  />
               </div>

               <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="flex-1 md:flex-none flex items-center gap-2 bg-secondary-theme border border-transparent rounded-xl sm:rounded-2xl px-3 sm:px-4 py-3 sm:py-3 transition-all">
                     <Filter size={14} className="text-muted" />
                     <select
                        className="bg-transparent text-[10px] sm:text-[11px] font-black uppercase tracking-widest focus:outline-none text-foreground cursor-pointer w-full"
                        value={sortBy}
                        onChange={(e) => {
                           setSortBy(e.target.value);
                           setCurrentPage(1);
                        }}
                     >
                        <option value="newest">Recent</option>
                        <option value="oldest">Historical</option>
                     </select>
                  </div>

                  <div className="flex-1 md:flex-none flex items-center gap-2 bg-secondary-theme border border-transparent rounded-xl sm:rounded-2xl px-3 sm:px-4 py-3 sm:py-3 min-w-[120px] sm:min-w-[140px] transition-all">
                     <Activity size={14} className="text-muted" />
                     <select
                        className="bg-transparent text-[10px] sm:text-[11px] font-black uppercase tracking-widest focus:outline-none text-foreground cursor-pointer w-full"
                        value={patientTypeFilter}
                        onChange={(e) => {
                           setPatientTypeFilter(e.target.value);
                           setCurrentPage(1);
                        }}
                     >
                        <option value="all">Global</option>
                        <option value="OPD">Outpatient</option>
                        <option value="IPD">Inpatient</option>
                     </select>
                  </div>
               </div>
            </div>

            {/* Pagination Controls in Header */}
            {patients.length > 0 && (
               <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-border-theme/30">
                  <div className="hidden xl:block text-[10px] text-muted font-black uppercase tracking-widest mr-2">
                     <span className="text-foreground">{startIndex}-{endIndex}</span> / {pagination.total}
                  </div>
                  <div className="flex items-center gap-2">
                     <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border border-border-theme bg-secondary-theme text-foreground hover:bg-primary-theme hover:text-white disabled:opacity-30 transition-all active:scale-95 shadow-sm"
                     >
                        <ChevronLeft size={16} />
                     </button>

                     <div className="flex items-center gap-1.5 px-2 text-[10px] font-black text-foreground lg:hidden xl:flex">
                        <span>{currentPage}</span>
                        <span className="text-muted">/</span>
                        <span className="text-muted">{pagination.totalPages}</span>
                     </div>

                     <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                        disabled={currentPage === pagination.totalPages}
                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border border-border-theme bg-secondary-theme text-foreground hover:bg-primary-theme hover:text-white disabled:opacity-30 transition-all active:scale-95 shadow-sm"
                     >
                        <ChevronRight size={16} />
                     </button>
                  </div>
               </div>
            )}
         </div>

         {/* Patients List */}
         <div className="bg-card rounded-2xl sm:rounded-3xl shadow-sm border border-border-theme overflow-hidden min-h-[400px] transition-all">
            {isLoading ? (
               <div className="flex h-[400px] items-center justify-center bg-secondary-theme/10">
                  <div className="flex flex-col items-center gap-4">
                     <div className="w-10 h-10 border-2 border-primary-theme border-t-transparent rounded-full animate-spin"></div>
                     <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Syncing Clinical Data...</p>
                  </div>
               </div>
            ) : (
               <>
                  <div className="overflow-x-auto no-scrollbar">
                     <table className="w-full text-left">
                        <thead className="bg-secondary-theme/50 border-b border-border-theme/50">
                           <tr>
                              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[9px] sm:text-[10px] font-black text-muted uppercase tracking-[0.2em] whitespace-nowrap">Subject Identity</th>
                              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[9px] sm:text-[10px] font-black text-muted uppercase tracking-[0.2em] whitespace-nowrap hidden sm:table-cell">Profiling</th>
                              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[9px] sm:text-[10px] font-black text-muted uppercase tracking-[0.2em] whitespace-nowrap">Timeline</th>
                              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[9px] sm:text-[10px] font-black text-muted uppercase tracking-[0.2em] whitespace-nowrap">Flux Case</th>
                              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[9px] sm:text-[10px] font-black text-muted uppercase tracking-[0.2em] text-right whitespace-nowrap">Navigate</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-border-theme/30">
                           {patients.length > 0 ? (
                              patients.map((patient, idx) => (
                                 <tr key={`${patient.id}-${idx}`} className="hover:bg-secondary-theme/40 group transition-all duration-300">
                                    <td className="px-4 sm:px-8 py-4 sm:py-6 whitespace-nowrap">
                                       <div className="flex items-center gap-3 sm:gap-4">
                                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-xs sm:text-base transition-all group-hover:scale-110 shadow-sm ${patient.patientType === 'IPD'
                                             ? 'bg-rose-50 text-rose-500 border border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/30'
                                             : 'bg-emerald-50 text-emerald-500 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/30'
                                             }`}>
                                             {patient.name.charAt(0)}
                                          </div>
                                          <div>
                                             <p className="font-black text-foreground text-xs sm:text-sm group-hover:text-primary-theme uppercase tracking-tight">{patient.name}</p>
                                             <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                                                <span className="text-[10px] text-muted font-bold uppercase tracking-tight px-1.5 py-0.5 bg-secondary-theme rounded-md">{patient.mrn || '---'}</span>
                                             </div>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="px-4 sm:px-8 py-4 sm:py-6 whitespace-nowrap hidden sm:table-cell">
                                       <div className="text-xs sm:text-sm text-foreground">
                                          <p className="font-black">{patient.age ? `${patient.age}Y` : '---'}</p>
                                          <p className="text-[10px] text-muted font-black uppercase tracking-widest">{patient.gender || '---'}</p>
                                       </div>
                                    </td>
                                    <td className="px-4 sm:px-8 py-4 sm:py-6 whitespace-nowrap text-[10px] sm:text-xs">
                                       <div className="flex items-center gap-2 text-muted font-black uppercase tracking-tight">
                                          <Calendar size={12} className="text-primary-theme/40" />
                                          {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' }) : 'N/A'}
                                       </div>
                                    </td>
                                    <td className="px-4 sm:px-8 py-4 sm:py-6 whitespace-nowrap">
                                       {(
                                          patient.patientType === 'IPD' ||
                                          (patient as any).isIPD === true ||
                                          (patient as any).isIpd === true
                                       ) ? (
                                          <span className="px-3 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] border border-rose-100 dark:border-rose-900/30 flex items-center gap-2 w-fit">
                                             <div className="w-1 h-1 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]" /> IP-CASE
                                          </span>
                                       ) : (
                                          <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2 w-fit">
                                             <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> OP-CASE
                                          </span>
                                       )}
                                    </td>
                                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-right whitespace-nowrap">
                                       <Link href={getPath(`/doctor/patients/${patient.id}`)} prefetch={true} className="inline-flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-secondary-theme text-foreground hover:bg-primary-theme hover:text-white transition-all transform group-hover:rotate-[-45deg] active:scale-90 border border-border-theme shadow-sm group-hover:shadow-lg group-hover:shadow-primary-theme/20">
                                          <ArrowRight size={16} className="sm:size-[18px]" />
                                       </Link>
                                    </td>
                                 </tr>
                              ))
                           ) : (
                              <tr>
                                 <td colSpan={5} className="px-6 py-20 text-center text-muted">
                                    <div className="flex flex-col items-center justify-center gap-4">
                                       <div className="w-20 h-20 bg-secondary-theme rounded-full flex items-center justify-center text-muted/20">
                                          <User size={40} />
                                       </div>
                                       <div>
                                          <p className="text-sm font-black uppercase tracking-widest">Clinical Archive Empty</p>
                                          <p className="text-[10px] font-bold uppercase tracking-tight mt-1">No matches found for current filters</p>
                                       </div>
                                    </div>
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </>
            )}
         </div>
      </div>
   );
}

export default React.memo(PatientsPage);
