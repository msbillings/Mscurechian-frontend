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
  const { data: announcements = [], isLoading: loading, error, refetch } = useQuery<Announcement[]>({
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

  const [search, setSearch] = useState('');

  // Helper: get current datetime string for `datetime-local` min (format: YYYY-MM-DDTHH:MM)
  const getNowDatetimeLocal = () => {
    const now = new Date();
    // offset to local time
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  // Filter nodes based on search + client-side expiry guard (full datetime comparison)
  const filteredAnnouncements = useMemo(() => {
    const now = new Date();
    return announcements.filter(ann => {
      // Client-side expiry guard — full datetime precision
      if (ann.expiryDate) {
        const expiry = new Date(ann.expiryDate);
        if (expiry <= now) return false; // expired
      }
      return (
        ann.title.toLowerCase().includes(search.toLowerCase()) ||
        ann.content.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [announcements, search]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAnnouncements.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);

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
      // Force immediate refresh of the registry
      await queryClient.invalidateQueries({ queryKey: ['hospital-admin-announcements'] });
      await refetch(); // Use refetch() to ensure the list updates immediately
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
      await queryClient.invalidateQueries({ queryKey: ['hospital-admin-announcements'] });
      await refetch(); // Use refetch() to ensure the list updates immediately
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
    <div className="space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">Notice Board</h1>
            <p className="text-xs text-slate-500 font-medium italic tracking-tight">Hospital-wide Global Broadcasts & Personnel Awareness</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-theme text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all w-fit self-center mt-1"
          >
            <Plus size={12} strokeWidth={3} /> New Broadcast
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {[
            { label: "Active Sector", value: announcements.filter(a => a.isActive).length, icon: Megaphone, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Critical Priority", value: announcements.filter(a => a.priority === 'high').length, icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50" },
            { label: "Aggregate Sent", value: announcements.length, icon: Send, color: "text-emerald-600", bg: "bg-emerald-50" }
          ].map((stat, i) => (
            <div key={i} className="bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 min-w-[140px]">
              <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon size={14} strokeWidth={3} />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">{stat.label}</p>
                <h3 className="text-sm font-black text-slate-900 italic mt-0.5">{stat.value}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clean Content Registry */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-2 md:p-4 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter announcements by nomenclature or entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
            <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4">Title</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4">Content</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Target</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiry</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentItems.map((announcement) => (
                  <tr key={announcement._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-2 md:px-6 py-4">
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
                    <td className="px-2 md:px-6 py-4">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <Calendar size={12} strokeWidth={3} />
                        {new Date(announcement.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      <p
                        className="text-xs font-medium text-slate-500 line-clamp-1 cursor-help"
                        title={announcement.content}
                      >
                        "{announcement.content}"
                      </p>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {announcement.targetRoles.map(role => (
                          <span key={role} className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${announcement.priority === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        announcement.priority === 'medium' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                        {announcement.priority}
                      </span>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      {announcement.expiryDate ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
                            <Clock size={11} strokeWidth={3} />
                            {new Date(announcement.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </span>
                          <span className="text-[9px] font-bold text-amber-400 pl-4">
                            {new Date(announcement.expiryDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No Expiry</span>
                      )}
                    </td>
                    <td className="px-2 md:px-6 py-4 text-right">
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
            </table></div>
          ) : (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Megaphone className="text-slate-200 w-8 h-8" />
              </div>
              <h3 className="text-sm md:text-lg font-black text-slate-900 italic">Static Channel</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 max-w-[240px] mx-auto">
                No active broadcasts detected within the current transmission cycle.
              </p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {announcements.length > 0 && (
          <div className="flex items-center justify-between px-3 md:px-6 py-4 border-t border-slate-50 bg-slate-50/30">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 italic leading-none">Create Announcement</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Send a notice to selected staff groups</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl hover:bg-slate-100 transition-all"
              >
                <XCircle size={20} strokeWidth={3} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-2 md:p-6 space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Notice Headline</label>
                  <input
                    required
                    type="text"
                    maxLength={80}
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    placeholder="e.g. SYSTEM_MAINTENANCE_ID_094"
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <div className="flex justify-end mt-1 px-1">
                    <span className="text-[9px] font-bold text-slate-400">{newAnnouncement.title.length}/80</span>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Broadcast Details</label>
                  <textarea
                    required
                    rows={3}
                    maxLength={400}
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    placeholder="Provide concise operational information..."
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none resize-none transition-all"
                  ></textarea>
                  <div className="flex justify-end mt-1 px-1">
                    <span className="text-[9px] font-bold text-slate-400">{newAnnouncement.content.length}/400</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Target Sector</label>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'doctor', label: 'Medical Consultants (Doctors)' },
                        { id: 'nurse', label: 'Nurses' },
                        { id: 'staff', label: 'Staff' },
                        { id: 'helpdesk', label: 'Frontdesk' }
                      ].map((role) => (
                        <label key={role.id} className="flex items-center gap-3 group cursor-pointer">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              className="peer appearance-none w-5 h-5 bg-white border-2 border-slate-200 rounded-lg checked:bg-slate-900 checked:border-slate-900 transition-all cursor-pointer"
                              checked={newAnnouncement.targetRoles.includes(role.id)}
                              onChange={(e) => {
                                let roles = [...newAnnouncement.targetRoles];
                                if (e.target.checked) {
                                  // If 'all' is being checked, unique selection
                                  if (role.id === 'all') {
                                    roles = ['all'];
                                  } else {
                                    // Remove 'all' if another specific role is checked
                                    roles = roles.filter(r => r !== 'all');
                                    roles.push(role.id);
                                  }
                                } else {
                                  roles = roles.filter(r => r !== role.id);
                                  // Default back to all if nothing selected? Let's leave it empty for now.
                                }
                                setNewAnnouncement({ ...newAnnouncement, targetRoles: roles });
                              }}
                            />
                            <CheckCircle2 size={12} strokeWidth={4} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                          </div>
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-900 transition-colors">{role.label}</span>
                        </label>
                      ))}
                    </div>
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
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">
                         Expiry Sector <span className="text-amber-500 ml-1">(Date &amp; Time)</span>
                       </label>
                       <input
                         type="datetime-local"
                         value={newAnnouncement.expiryDate}
                         min={getNowDatetimeLocal()}
                         onChange={(e) => setNewAnnouncement({ ...newAnnouncement, expiryDate: e.target.value })}
                         className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                       />
                       <p className="text-[8px] font-bold text-slate-400 px-1 mt-1">
                         Leave empty for no expiry. Set a near time to test.
                       </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Discard Draft
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-sm"
                >
                 Send Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-3 md:p-6 text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} strokeWidth={3} />
            </div>

            <h3 className="text-sm md:text-lg font-black text-slate-900 italic mb-2">Delete Broadcast</h3>
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
