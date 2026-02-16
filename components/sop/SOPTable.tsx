'use client';

import React, { useState } from 'react';
import {
  Download,
  Search,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
  FileText,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  FileCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { SOP } from '@/lib/integrations/services/sop.service';

interface SOPTableProps {
  sops: SOP[];
  isLoading: boolean;
  onAcknowledge: (id: string) => Promise<void>;
  onDownload: (id: string, fileName: string) => Promise<void>;
  acknowledgingId: string | null;
  downloadingId: string | null;
  showInternalFilters?: boolean;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
}

export const SOPTable: React.FC<SOPTableProps> = ({
  sops,
  isLoading,
  onAcknowledge,
  onDownload,
  acknowledgingId,
  downloadingId,
  showInternalFilters = true,
  currentPage: externalPage,
  onPageChange: externalOnPageChange,
  itemsPerPage = 7
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [internalPage, setInternalPage] = useState(1);

  const currentPage = externalPage ?? internalPage;
  const onPageChange = externalOnPageChange ?? setInternalPage;

  const categories = ['all', 'OPD', 'IPD', 'Billing', 'Infection Control', 'Emergency', 'HR', 'Pharmacy', 'Lab', 'General'];

  const filteredSops = sops.filter(sop => {
    const matchesSearch = sop.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || sop.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredSops.length / itemsPerPage);
  const paginatedSops = filteredSops.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 size={32} className="animate-spin text-emerald-500 mx-auto mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Protocol Registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Internal Filters Section (if enabled) */}
      {showInternalFilters && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-[0.5rem] border border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  onPageChange(1);
                }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeCategory === cat
                  ? 'bg-primary-theme text-white'
                  : 'bg-gray-50 dark:bg-gray-900 text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search protocols..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                onPageChange(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      )}

      {paginatedSops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white dark:bg-gray-800/50 rounded-[0.5rem] border border-dashed border-gray-200 dark:border-gray-700">
          <AlertCircle className="mx-auto text-gray-200 dark:text-gray-700 mb-4" size={48} />
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No matching protocols found</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-[0.5rem] border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Protocol</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Version</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Acknowledgment</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {paginatedSops.map((sop) => (
                    <tr key={sop._id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-lg">
                            <FileCheck size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{sop.name}</p>
                            <p className="text-[9px] text-gray-400 font-black uppercase mt-1 flex items-center gap-1">
                              <Clock size={10} /> {format(new Date(sop.lastUpdated), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 text-[9px] font-black uppercase rounded-lg">
                          {sop.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">v{sop.version}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => !sop.isAcknowledged && onAcknowledge(sop._id)}
                            disabled={sop.isAcknowledged || acknowledgingId === sop._id}
                            className={`p-2 rounded-xl flex items-center gap-2 transition-all ${sop.isAcknowledged
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                              : 'bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-500 dark:bg-gray-900'
                              }`}
                          >
                            {sop.isAcknowledged ? <CheckSquare size={16} /> : <Square size={16} />}
                            <span className="text-[9px] font-black uppercase">{sop.isAcknowledged ? 'Acknowledged' : 'Read & Accept'}</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onDownload(sop._id, sop.fileName)}
                          disabled={!sop.isAcknowledged || downloadingId === sop._id}
                          className={`px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider inline-flex items-center justify-center min-w-[70px] ${sop.isAcknowledged
                            ? 'bg-primary-theme dark:bg-white text-white dark:text-black hover:bg-primary-theme/80 dark:hover:bg-emerald-500 hover:text-white dark:hover:text-white'
                            : 'bg-primary-theme/50 dark:bg-gray-900 text-gray-300 dark:text-gray-700 cursor-not-allowed'
                            }`}
                          title={sop.isAcknowledged ? "View Protocol" : "Acknowledge first to view"}
                        >
                          {downloadingId === sop._id ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            "View"
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col gap-4 p-4 bg-slate-50 dark:bg-gray-950/20">
            {paginatedSops.map((sop) => (
              <div key={sop._id} className="bg-white dark:bg-gray-800 p-5 rounded-[1.2rem] border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-4 active:scale-[0.98] transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0 shadow-sm border border-emerald-100 dark:border-emerald-500/20">
                      <FileCheck size={18} />
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900 dark:text-white text-sm leading-tight uppercase tracking-tight">{sop.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-black bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-100/50">v{sop.version}</span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase flex items-center gap-1">
                          <Clock size={10} className="text-gray-300" /> {format(new Date(sop.lastUpdated), 'MMM dd')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 text-[8px] font-black uppercase rounded-lg whitespace-nowrap tracking-wider">
                    {sop.category}
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-50 dark:border-gray-800">
                  <button
                    onClick={() => !sop.isAcknowledged && onAcknowledge(sop._id)}
                    disabled={sop.isAcknowledged || acknowledgingId === sop._id}
                    className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-[9px] uppercase tracking-widest ${sop.isAcknowledged
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 border border-emerald-100/50'
                      : 'bg-white dark:bg-gray-900 text-gray-400 border border-gray-100 dark:border-gray-800 hover:border-emerald-500/30'
                      }`}
                  >
                    {sop.isAcknowledged ? <CheckSquare size={14} className="text-emerald-500" /> : <Square size={14} />}
                    {sop.isAcknowledged ? 'Accepted' : 'Accept'}
                  </button>

                  <button
                    onClick={() => onDownload(sop._id, sop.fileName)}
                    disabled={!sop.isAcknowledged || downloadingId === sop._id}
                    className={`flex-1 py-3 px-4 rounded-xl transition-all font-black text-[10px] uppercase tracking-[0.1em] flex items-center justify-center shadow-lg active:scale-95 ${sop.isAcknowledged
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-slate-200 dark:shadow-none'
                      : 'bg-gray-100 dark:bg-gray-900 text-gray-300 dark:text-gray-700 cursor-not-allowed shadow-none'
                      }`}
                  >
                    {downloadingId === sop._id ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <>View <ChevronRight size={14} className="ml-1 opacity-50" /></>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-4 py-4 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between rounded-lg">
          <p className=" hidden md:block text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Page {currentPage} of {totalPages}
          </p>
          <p className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {currentPage} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 hover:text-emerald-500 disabled:opacity-50 transition-all active:scale-95"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 hover:text-emerald-500 disabled:opacity-50 transition-all active:scale-95"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
