'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  Filter,
  Calendar,
  ChevronRight,
  Info,
  AlertTriangle,
  FileText,
  User,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { staffService } from '@/lib/integrations';
import toast from 'react-hot-toast';

function HRAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await staffService.getAnnouncements();
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error('Failed to load announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-600 border-red-100 ring-red-500';
      case 'medium': return 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-500';
      case 'low': return 'bg-blue-50 text-blue-600 border-blue-100 ring-blue-500';
      default: return 'bg-gray-50 text-gray-600 border-gray-100 ring-gray-500';
    }
  };

  const filteredAnnouncements = filter === 'all'
    ? announcements
    : announcements.filter(a => a.priority === filter);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);
  const paginatedAnnouncements = filteredAnnouncements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const truncateText = (text: string, wordCount: number = 2) => {
    if (!text) return '';
    const words = text.trim().split(/\s+/);
    if (words.length <= wordCount) return text;
    return words.slice(0, wordCount).join(' ') + '...';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
        <div className="space-y-6 sm:space-y-8 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                <div>
                    <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
                        Hospital Announcements
                        {announcements.filter(a => a.priority === 'high').length > 0 && (
                            <span className="flex items-center gap-1 bg-red-100 text-red-600 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-red-200">
                                <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Urgent
                            </span>
                        )}
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Internal hospital updates and administrative bulletins.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 tracking-tight text-sm uppercase">Categories</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                            {[
                                { label: 'All Updates', value: 'all', count: announcements.length },
                                { label: 'High Priority', value: 'high', count: announcements.filter(a => a.priority === 'high').length },
                                { label: 'General', value: 'medium', count: announcements.filter(a => a.priority === 'medium').length },
                                { label: 'Information', value: 'low', count: announcements.filter(a => a.priority === 'low').length }
                            ].map(cat => (
                                <button
                                    key={cat.value}
                                    onClick={() => setFilter(cat.value as any)}
                                    className={`w-full flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl transition-all ${filter === cat.value ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-gray-50 text-gray-600'
                                        }`}
                                >
                                    <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-left">{cat.label}</span>
                                    <span className={`text-[8px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full ${filter === cat.value ? 'bg-white/20' : 'bg-gray-100'
                                        }`}>{cat.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[400px] sm:min-h-[600px]">
                        <div className="flex-1 overflow-x-auto">
                            {paginatedAnnouncements.length > 0 ? (
                                <div className="min-w-[500px] sm:min-w-full">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                                <th className="px-4 sm:px-6 py-4 text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Title</th>
                                                <th className="px-4 sm:px-6 py-4 text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                                <th className="px-4 sm:px-6 py-4 text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Priority</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {paginatedAnnouncements.map((announcement) => (
                        <tr key={announcement._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <FileText size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{announcement.title}</p>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1 italic">"{announcement.content}"</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <span className="text-xs font-bold text-gray-500">
                              {new Date(announcement.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <span className={`px-3 py-1 rounded-full text-[9px] uppercase font-black tracking-widest border ${getPriorityStyles(announcement.priority)}`}>
                              {announcement.priority}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                  <Bell className="w-16 h-16 text-gray-200 mb-6" />
                  <h3 className="text-xl font-bold text-gray-900">No announcements found</h3>
                  <p className="text-gray-500 mt-2">There are no updates to display at this time.</p>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-all font-bold text-xs"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-all font-bold text-xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(HRAnnouncementsPage);
