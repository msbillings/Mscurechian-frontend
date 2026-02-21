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

function AnnouncementsPage() {
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

  // Pagination logic
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Hospital Announcements
            {announcements.filter(a => a.priority === 'high').length > 0 && (
              <span className="flex items-center gap-1 bg-red-100 text-red-600 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-red-200">
                <AlertTriangle className="w-3 h-3" /> Urgent Action Required
              </span>
            )}
          </h1>
          <p className="text-gray-500 mt-1">Stay updated with the latest news, guidelines, and events from the hospital administration.</p>
        </div>

      </div>

      {/* Featured / Important Section */}
      {announcements.some(a => a.priority === 'high') && (
        <div className="bg-white rounded-[0.5rem] p-6 text-gray-900 relative overflow-hidden shadow-sm hover:shadow-indigo-500/20 group">
        

          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
              <Sparkles className="w-8 h-8 " />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em] mb-1">Featured Announcement</p>
              <h2 className="text-2xl font-bold">{announcements.find(a => a.priority === 'high')?.title}</h2>
              <p className="text-gray-500 mt-2 max-w-2xl text-sm leading-relaxed line-clamp-2">
                {announcements.find(a => a.priority === 'high')?.content}
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filter Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">Categories</h3>
            <div className="space-y-1">
              {[
                { label: 'All Updates', value: 'all', count: announcements.length },
                { label: 'High Priority', value: 'high', count: announcements.filter(a => a.priority === 'high').length },
                { label: 'General', value: 'medium', count: announcements.filter(a => a.priority === 'medium').length },
                { label: 'Information', value: 'low', count: announcements.filter(a => a.priority === 'low').length }
              ].map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setFilter(cat.value as any)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl ${filter === cat.value ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-gray-50 text-gray-600'
                    }`}
                >
                  <span className="text-sm">{cat.label}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === cat.value ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}>{cat.count}</span>
                </button>
              ))}
            </div>
          </div>


        </div>

        {/* Announcements List */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-[0.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
            <div className="flex-1 overflow-auto">
              {paginatedAnnouncements.length > 0 ? (
                <div className="w-full">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Title</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Date</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Content</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Priority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginatedAnnouncements.map((announcement) => (
                        <tr key={announcement._id} className="hover:bg-gray-50/50 group transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-xs">
                                <FileText size={14} />
                              </div>
                              <span className="text-xs font-bold text-gray-900">{announcement.title}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-[11px] font-bold text-gray-500 uppercase">
                              {new Date(announcement.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <p
                              className="text-[11px] font-bold text-gray-600 italic leading-relaxed cursor-help hover:text-indigo-600 transition-colors"
                              title={announcement.content}
                            >
                              "{truncateText(announcement.content, 2)}"
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
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
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-gray-900 font-bold">No announcements found</h3>
                  <p className="text-gray-500 text-sm mt-1">There are no updates for this category.</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Showing <span className="text-gray-900">{filteredAnnouncements.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}</span> to <span className="text-gray-900">{Math.min(currentPage * itemsPerPage, filteredAnnouncements.length)}</span> of <span className="text-gray-900">{filteredAnnouncements.length}</span>
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || totalPages <= 1}
                  className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-gray-600 uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1.5">
                  {totalPages > 0 ? (
                    [...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black transition-all ${currentPage === i + 1
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                            : 'bg-white text-gray-400 hover:text-gray-600 border border-gray-100'
                          }`}
                      >
                        {i + 1}
                      </button>
                    ))
                  ) : (
                    <button disabled className="w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black bg-indigo-600 text-white">1</button>
                  )}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages <= 1}
                  className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-gray-600 uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(AnnouncementsPage);
