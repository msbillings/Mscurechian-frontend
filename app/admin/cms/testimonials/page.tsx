'use client';

import React, { useEffect, useState } from 'react';
import { contentService } from '@/lib/integrations/services/content.service';
import { Testimonial, CreateTestimonialRequest } from '@/lib/integrations/types/cms';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Quote,
  Star,
  Loader2,
  CheckCircle2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ManageTestimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Testimonial | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<CreateTestimonialRequest>({
    name: '',
    designation: '',
    company: '',
    content: '',
    avatar: '',
    rating: 5,
    status: 'active'
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await contentService.getAdminTestimonials();
      setTestimonials(data);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleEdit = (item: Testimonial) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      designation: item.designation,
      company: item.company || '',
      content: item.content,
      avatar: item.avatar || '',
      rating: item.rating,
      status: item.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return;
    try {
      await contentService.deleteTestimonial(id);
      fetchItems();
    } catch (error) {
      alert('Failed to delete testimonial');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingItem) {
        await contentService.updateTestimonial(editingItem._id, formData);
      } else {
        await contentService.createTestimonial(formData);
      }
      setIsModalOpen(false);
      fetchItems();
      resetForm();
    } catch (error) {
      alert('Failed to save testimonial');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
      setFormData({
        name: '',
        designation: '',
        company: '',
        content: '',
        avatar: '',
        rating: 5,
        status: 'active'
      });
      setEditingItem(null);
  };

  const filteredItems = testimonials.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.company?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const testimonialStatuses: ("active" | "inactive")[] = ["active", "inactive"];

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Testimonial Management</h1>
          <p className="text-slate-500 font-medium">Manage social proof and success stories from your users.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary-theme text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary-theme/20 active:scale-95"
        >
          <Plus size={20} /> Add New Testimonial
        </button>
      </div>

      <div className="mb-8 relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search by name or company..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-theme/10 focus:border-primary-theme transition-all outline-none font-medium shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
             [1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 animate-pulse h-64" />
             ))
        ) : filteredItems.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-slate-200">
               <Quote size={48} className="text-slate-200 mx-auto mb-4" />
               <p className="text-slate-900 font-bold text-xl">No testimonials yet</p>
               <p className="text-slate-500">Be the first to share a success story.</p>
            </div>
        ) : filteredItems.map((item) => (
            <motion.div
              layout
              key={item._id}
              className="group bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-primary-theme/5 hover:border-primary-theme/30 transition-all flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-1 text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className={i < item.rating ? 'fill-yellow-500' : 'text-slate-200'} />
                  ))}
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(item)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-primary-theme">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(item._id)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <blockquote className="text-slate-600 font-medium italic mb-8 flex-1 leading-relaxed">
                "{item.content}"
              </blockquote>

              <div className="flex items-center gap-4">
                <img 
                  src={item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`} 
                  className="w-12 h-12 rounded-2xl object-cover bg-slate-100" 
                  alt=""
                />
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-primary-theme transition-colors">{item.name}</p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
                    {item.designation} {item.company && `@ ${item.company}`}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                 <span className={`text-[10px] font-black uppercase tracking-widest ${item.status === 'active' ? 'text-green-500' : 'text-slate-400'}`}>
                   {item.status}
                 </span>
                 <p className="text-[10px] text-slate-300 font-medium">Added {new Date(item.createdAt).toLocaleDateString()}</p>
              </div>
            </motion.div>
        ))}
      </div>

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{editingItem ? 'Edit Testimonial' : 'New Testimonial'}</h2>
                  <p className="text-slate-500 text-sm font-medium">Share how you helped someone today.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Name</label>
                    <input
                      required
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-theme/10 focus:border-primary-theme transition-all outline-none font-bold"
                      placeholder="e.g. Sarah J. Johnson"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Designation</label>
                    <input
                      required
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-theme/10 focus:border-primary-theme transition-all outline-none font-bold"
                      placeholder="e.g. Lead Surgeon"
                      value={formData.designation}
                      onChange={(e) => setFormData({...formData, designation: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Company / Branch</label>
                    <input
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-theme/10 focus:border-primary-theme transition-all outline-none font-bold"
                      placeholder="e.g. Metro Hospital"
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Avatar Image URL</label>
                    <input
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-theme/10 focus:border-primary-theme transition-all outline-none font-medium text-sm"
                      placeholder="Optional"
                      value={formData.avatar}
                      onChange={(e) => setFormData({...formData, avatar: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Rating</label>
                    <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFormData({...formData, rating: r})}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            formData.rating >= r ? 'bg-yellow-100 text-yellow-500 shadow-sm' : 'text-slate-300'
                          }`}
                        >
                          <Star size={20} className={formData.rating >= r ? 'fill-yellow-500' : ''} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Status</label>
                    <div className="flex gap-2">
                       {testimonialStatuses.map((s) => (
                         <button
                           key={s}
                           type="button"
                           onClick={() => setFormData({...formData, status: s})}
                           className={`flex-1 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all border ${
                             formData.status === s 
                               ? 'bg-primary-theme text-white border-primary-theme shadow-lg shadow-primary-theme/20' 
                               : 'bg-white text-slate-400 border-slate-100'
                           }`}
                         >
                           {s}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Content (Message)</label>
                    <textarea
                      required
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-theme/10 focus:border-primary-theme transition-all outline-none font-medium min-h-[150px]"
                      placeholder="What did they say about the service?"
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                    />
                  </div>
                </div>
              </form>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={submitting}
                    onClick={handleSubmit}
                    className="flex items-center gap-2 bg-primary-theme text-white px-10 py-3 rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary-theme/20 active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={20} className="animate-spin" /> : editingItem ? 'Save Changes' : 'Add Testimonial'}
                  </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageTestimonials;
