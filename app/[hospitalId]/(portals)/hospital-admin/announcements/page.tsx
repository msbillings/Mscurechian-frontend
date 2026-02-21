'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  XCircle,
  Megaphone,
  Clock,
  User,
  AlertTriangle,
  Send,
  Calendar,
  Layers,
  RefreshCw
} from 'lucide-react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { toast } from 'react-hot-toast';

interface Announcement {
  _id: string;
  title: string;
  content: string;
  targetRoles: string[];
  priority: 'low' | 'medium' | 'high';
  isActive: boolean;
  expiryDate?: string;
  createdAt: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
}

function AnnouncementManagement() {
  const queryClient = useQueryClient();

  // ✅ CRITICAL FIX: Use React Query instead of useState + useEffect
  const { data: announcements = [], isLoading: loading, error } = useQuery<Announcement[]>({
    queryKey: ['hospital-admin-announcements'],
    queryFn: async () => {
      const apiStartTime = performance.now();
      console.log(`[API] Starting announcements fetch`);
      try {
        const data = await hospitalAdminService.getAnnouncements();
        const announcementsArray = data?.announcements || [];
        const apiEndTime = performance.now();
        console.log(`[API] Announcements fetch completed in ${(apiEndTime - apiStartTime).toFixed(2)}ms, returned ${announcementsArray.length} announcements`);
        return announcementsArray;
      } catch (error: any) {
        console.error("Failed to fetch announcements:", error);
        toast.error(error.message || "Failed to load announcements");
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    targetRoles: ['all'],
    priority: 'medium',
    expiryDate: ''
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = announcements.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(announcements.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hospitalAdminService.createAnnouncement(newAnnouncement);
      toast.success('Notice broadcasted successfully');
      setIsModalOpen(false);
      setNewAnnouncement({
        title: '',
        content: '',
        targetRoles: ['all'],
        priority: 'medium',
        expiryDate: ''
      });
      queryClient.invalidateQueries({ queryKey: ['hospital-admin-announcements'] });
    } catch (error) {
      toast.error('Failed to broadcast notice');
    }
  };

  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeleteConfirmationId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmationId) return;
    try {
      await hospitalAdminService.deleteAnnouncement(deleteConfirmationId);
      toast.success('Notice retracted');
      queryClient.invalidateQueries({ queryKey: ['hospital-admin-announcements'] });
      setDeleteConfirmationId(null);
    } catch (error) {
      toast.error('Failed to delete notice');
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmationId(null);
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-700 border-red-100';
      case 'medium': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'low': return 'bg-gray-50 text-gray-700 border-gray-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Simple Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Institutional Notice Board</h1>
          <p className="text-sm text-slate-500 font-medium mt-1 italic tracking-tight">Hospital-wide Global Broadcasts & Personnel Awareness</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-theme text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all "
        >
          <Plus size={14} strokeWidth={3} /> New Broadcast
        </button>
      </div>

      {/* Simple Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Active Sector", value: announcements.filter(a => a.isActive).length, icon: Megaphone, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Critical Priority", value: announcements.filter(a => a.priority === 'high').length, icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Aggregate Sent", value: announcements.length, icon: Send, color: "text-emerald-600", bg: "bg-emerald-50" }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} w-fit mb-4`}>
              <stat.icon size={20} strokeWidth={3} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-slate-900 leading-none italic">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Clean Content Registry */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter announcements by nomenclature or entity..."
              className="w-full pl-11 pr-4 py-2 bg-slate-100/50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center">
              <RefreshCw size={40} className="animate-spin text-slate-200 mx-auto" />
            </div>
          ) : currentItems.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4">Title</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4">Content</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Target</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentItems.map((announcement) => (
                  <tr key={announcement._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${announcement.priority === 'high' ? 'bg-rose-50 text-rose-500' :
                          announcement.priority === 'medium' ? 'bg-blue-50 text-blue-500' :
                            'bg-slate-50 text-slate-500'
                          }`}>
                          <Megaphone size={16} />
                        </div>
                        <span className="font-bold text-slate-900 text-sm">{announcement.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <Calendar size={12} strokeWidth={3} />
                        {new Date(announcement.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className="text-xs font-medium text-slate-500 line-clamp-1 cursor-help"
                        title={announcement.content}
                      >
                        "{announcement.content}"
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {announcement.targetRoles.map(role => (
                          <span key={role} className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${announcement.priority === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        announcement.priority === 'medium' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                        {announcement.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(announcement._id)}
                        className="p-2 bg-slate-50 text-slate-400 border border-slate-100 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                        title="Retract Notice"
                      >
                        <Trash2 size={14} strokeWidth={3} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Megaphone className="text-slate-200 w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 italic">Static Channel</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 max-w-[240px] mx-auto">
                No active broadcasts detected within the current transmission cycle.
              </p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {announcements.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-50 bg-slate-50/30">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Showing <span className="text-slate-900">{indexOfFirstItem + 1}</span> to <span className="text-slate-900">{Math.min(indexOfLastItem, announcements.length)}</span> of <span className="text-slate-900">{announcements.length}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${currentPage === page
                    ? 'bg-primary-theme text-white shadow-lg shadow-slate-900/20'
                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modern Broadcast Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 italic leading-none">Initiate Broadcast</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Configure institutional notice for dissemination</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl hover:bg-slate-100 transition-all"
              >
                <XCircle size={20} strokeWidth={3} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Notice Headline</label>
                  <input
                    required
                    type="text"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    placeholder="e.g. SYSTEM_MAINTENANCE_ID_094"
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Broadcast Details</label>
                  <textarea
                    required
                    rows={4}
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    placeholder="Provide concise operational information..."
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none resize-none transition-all"
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Target Sector</label>
                    <select
                      multiple
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 outline-none transition-all h-[120px]"
                      value={newAnnouncement.targetRoles}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        setNewAnnouncement({ ...newAnnouncement, targetRoles: values });
                      }}
                    >
                      <option value="all">Global Personnel</option>
                      <option value="doctor">Medical Consultants</option>
                      <option value="staff">Institutional Staff</option>
                      <option value="helpdesk">Reception Hub</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Priority Rating</label>
                      <select
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        value={newAnnouncement.priority}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value as any })}
                      >
                        <option value="low">Standard Aware</option>
                        <option value="medium">Action Recom</option>
                        <option value="high">Urgent Respond</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Expiry Sector</label>
                      <input
                        type="date"
                        value={newAnnouncement.expiryDate}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, expiryDate: e.target.value })}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Discard Draft
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-sm"
                >
                  Confirm Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} strokeWidth={3} />
            </div>

            <h3 className="text-lg font-black text-slate-900 italic mb-2">Delete Broadcast</h3>
            <p className="text-xs font-medium text-slate-500 mb-6">
              if you want to delete this broadcast permanently, click on confirm retraction
            </p>

            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 py-2.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-rose-500 text-white border border-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-md shadow-rose-200"
              >
                Confirm Retraction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(AnnouncementManagement);
