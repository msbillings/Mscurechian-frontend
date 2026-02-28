'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Search,
  Filter,
  Calendar,
  ChevronRight,
  AlertTriangle,
  User,
  ExternalLink,
  Sparkles,
  FileText
} from 'lucide-react';

import { doctorService } from '@/lib/integrations';
import toast from 'react-hot-toast';

function DoctorAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadAnnouncements();
    // Enable real-time updates via polling (every 30 seconds)
    const interval = setInterval(loadAnnouncements, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await doctorService.getAnnouncements();
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
      case 'high': return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'medium': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
      case 'low': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      default: return 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    }
  };

  const filteredAnnouncements = useMemo(() => {
    const raw = filter === 'all'
      ? announcements
      : announcements.filter(a => a.priority === filter);

    // Frontend Filter: Only show if 'all' or 'doctor' is in targetRoles
    return raw.filter(a =>
      !a.targetRoles ||
      a.targetRoles.includes('all') ||
      a.targetRoles.includes('doctor')
    );
  }, [announcements, filter]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAnnouncements.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-theme"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pt-10 px-4 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            Hospital Announcements
            {announcements.filter(a => a.priority === 'high').length > 0 && (
              <span className="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                <AlertTriangle className="w-3 h-3" /> Urgent
              </span>
            )}
          </h1>
          <p className="text-muted mt-1">Stay updated with the latest news, guidelines, and events from the hospital administration.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filter Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border-theme">
            <h3 className="font-bold text-foreground mb-4">Categories</h3>
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${filter === cat.value ? 'bg-primary-theme/10 text-primary-theme font-bold' : 'hover:bg-secondary-theme text-muted'
                    }`}
                >
                  <span className="text-sm">{cat.label}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === cat.value ? 'bg-primary-theme/20' : 'bg-secondary-theme'
                    }`}>{cat.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Announcements Table */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-card rounded-[0.5rem] shadow-sm border border-gray-100 dark:border-border-theme overflow-hidden">
            <div className="overflow-x-auto">
              {currentItems.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-secondary-theme/30 border-b border-gray-100 dark:border-border-theme">
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest w-1/3">Title</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Date</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest w-1/3">Content</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-border-theme">
                    {currentItems.map((announcement) => (
                      <tr key={announcement._id} className="hover:bg-gray-50/50 dark:hover:bg-secondary-theme/30 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl flex items-center justify-center ${announcement.priority === 'high' ? 'bg-red-50 text-red-500' :
                              announcement.priority === 'medium' ? 'bg-amber-50 text-amber-500' :
                                'bg-blue-50 text-blue-500'
                              } dark:bg-secondary-theme`}>
                              <FileText className="w-5 h-5" />
                            </div>
                            <span className="font-thin text-foreground text-sm">{announcement.title}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="text-xs font-bold text-gray-500 dark:text-muted">
                            {new Date(announcement.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <p
                            className="text-sm text-gray-500 dark:text-muted line-clamp-1 italic cursor-help"
                            title={announcement.content}
                          >
                            "{announcement.content}"
                          </p>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getPriorityStyles(announcement.priority)}`}>
                            {announcement.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-secondary-theme rounded-2xl flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-muted" />
                  </div>
                  <h3 className="text-foreground font-bold">No announcements found</h3>
                  <p className="text-muted text-sm mt-1">There are no updates in this category.</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredAnnouncements.length > 0 && (
              <div className="flex items-center justify-between px-8 py-6 border-t border-gray-100 dark:border-border-theme bg-gray-50/30 dark:bg-card">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Showing <span className="text-foreground">{indexOfFirstItem + 1}</span> to <span className="text-foreground">{Math.min(indexOfLastItem, filteredAnnouncements.length)}</span> of <span className="text-foreground">{filteredAnnouncements.length}</span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white dark:bg-secondary-theme border border-gray-200 dark:border-border-theme rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-500 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-secondary-theme/80 transition-colors"
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${currentPage === page
                        ? 'bg-primary-theme text-white shadow-lg shadow-primary-theme/30'
                        : 'bg-white dark:bg-secondary-theme text-gray-500 hover:bg-gray-50 dark:hover:bg-secondary-theme/80 border border-gray-200 dark:border-border-theme'
                        }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white dark:bg-secondary-theme border border-gray-200 dark:border-border-theme rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-500 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-secondary-theme/80 transition-colors"
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

export default React.memo(DoctorAnnouncementsPage);
