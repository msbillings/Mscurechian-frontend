'use client';

import React, { useState, useEffect } from 'react';
import { Search, User, Filter, ArrowRight, Activity, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getDoctorPatientsAction } from '@/lib/integrations/actions/doctor.actions';
import { DoctorPatient } from '@/lib/integrations/types/doctor';
import toast from 'react-hot-toast';

function PatientsPage() {
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
      <div className="space-y-6 pt-10">
         {/* Header */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <h1 className="text-2xl font-bold text-gray-900">My Patients</h1>
               <p className="text-gray-500 text-sm mt-1">View and manage patient health records.</p>
            </div>
         </div>

         {/* Filters & Search */}
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
               <input
                  type="text"
                  placeholder="Search patients by name, MRN, or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
               <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <Filter size={16} className="text-gray-400" />
                  <select
                     className="bg-transparent text-sm font-medium focus:outline-none text-gray-700 cursor-pointer"
                     value={sortBy}
                     onChange={(e) => {
                        setSortBy(e.target.value);
                        setCurrentPage(1);
                     }}
                  >
                     <option value="newest">Recent Visit First</option>
                     <option value="oldest">Oldest Visit First</option>
                  </select>
               </div>

               <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 min-w-[140px]">
                  <Activity size={16} className="text-gray-400" />
                  <select
                     className="bg-transparent text-sm font-medium focus:outline-none text-gray-700 cursor-pointer w-full"
                     value={patientTypeFilter}
                     onChange={(e) => {
                        setPatientTypeFilter(e.target.value);
                        setCurrentPage(1);
                     }}
                  >
                     <option value="all">All Departments</option>
                     <option value="OPD">OPD (Out-Patient)</option>
                     <option value="IPD">IPD (In-Patient)</option>
                  </select>
               </div>
            </div>
         </div>

         {/* Patients List */}
         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
            {isLoading ? (
               <div className="flex h-[400px] items-center justify-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
               </div>
            ) : (
               <>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                           <tr>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Patient Name</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Demographics</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Last Visit</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Type</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Latest Condition</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Action</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                           {patients.length > 0 ? (
                              patients.map((patient, idx) => (
                                 <tr key={`${patient.id}-${idx}`} className="hover:bg-blue-50/50 group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                       <div className="flex items-center gap-3">
                                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${patient.patientType === 'IPD'
                                             ? 'bg-rose-100 text-rose-600 border border-rose-200'
                                             : 'bg-blue-100 text-blue-600 border border-blue-200'
                                             }`}>
                                             {patient.name.charAt(0)}
                                          </div>
                                          <div>
                                             <p className="font-bold text-gray-900 group-hover:text-blue-600">{patient.name}</p>
                                             <p className="text-xs text-gray-500">MRN: {patient.mrn || 'N/A'}</p>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                       <div className="text-sm text-gray-700">
                                          <p>{patient.age ? `${patient.age} Years` : 'N/A'}</p>
                                          <p className="text-xs text-gray-500">{patient.gender || 'Unknown'}</p>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                       <div className="flex items-center gap-2 text-sm text-gray-600">
                                          <Calendar size={14} className="text-gray-400" />
                                          {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'N/A'}
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                       {(
                                          patient.patientType === 'IPD' ||
                                          // Fallback: some APIs may expose a boolean isIPD/isIpd flag
                                          (patient as any).isIPD === true ||
                                          (patient as any).isIpd === true
                                       ) ? (
                                          <span className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-100 dark:border-rose-800 flex items-center gap-1 w-fit">
                                             <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> IPD Node
                                          </span>
                                       ) : (
                                          <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800 flex items-center gap-1 w-fit">
                                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> OPD Active
                                          </span>
                                       )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                       {patient.condition ? (
                                          <span className="px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-full border border-yellow-100 inline-flex items-center gap-1 max-w-[200px] truncate">
                                             <Activity size={12} className="shrink-0" /> {patient.condition}
                                          </span>
                                       ) : (
                                          <span className="text-gray-400 text-sm">-</span>
                                       )}
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                       <Link href={`/doctor/patients/${patient.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-blue-600 hover:text-white transform hover:scale-110">
                                          <ArrowRight size={16} />
                                       </Link>
                                    </td>
                                 </tr>
                              ))
                           ) : (
                              <tr>
                                 <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                       <User size={48} className="text-gray-200 mb-4" />
                                       <p className="text-lg font-medium">No patients found</p>
                                       <p className="text-sm">Try adjusting your search or filters.</p>
                                    </div>
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>

                  {/* Pagination */}
                  {patients.length > 0 && (
                     <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between pr-20">
                        <div className="text-sm text-gray-500">
                           Showing <span className="font-medium text-gray-900">{startIndex}</span> to <span className="font-medium text-gray-900">{endIndex}</span> of <span className="font-medium text-gray-900">{pagination.total}</span> patients
                        </div>
                        <div className="flex items-center gap-2">
                           <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                              <ChevronLeft size={18} />
                           </button>
                           <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                                 const totalPages = pagination.totalPages;
                                 let pageNum = i + 1;
                                 if (totalPages > 5 && currentPage > 3) {
                                    pageNum = currentPage - 2 + i;
                                    if (pageNum + (4 - i) > totalPages) pageNum = totalPages - (4 - i);
                                 }

                                 return (
                                    <button
                                       key={pageNum}
                                       onClick={() => setCurrentPage(pageNum)}
                                       className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === pageNum
                                          ? 'bg-blue-600 text-white'
                                          : 'text-gray-600 hover:bg-gray-100'
                                          }`}
                                    >
                                       {pageNum}
                                    </button>
                                 );
                              })}
                           </div>
                           <button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                              disabled={currentPage === pagination.totalPages}
                              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                              <ChevronRight size={18} />
                           </button>
                        </div>
                     </div>
                  )}
               </>
            )}
         </div>
      </div>
   );
}

export default React.memo(PatientsPage);
