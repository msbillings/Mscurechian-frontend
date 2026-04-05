'use client';

import React, { useEffect, useState } from 'react';
import { contentService } from '@/lib/integrations/services/content.service';
import { Blog, CreateBlogRequest } from '@/lib/integrations/types/cms';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye, 
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Type,
  ImageIcon,
  Layout,
  Tag as TagIcon,
  ChevronRight,
  Monitor,
  Calendar,
  Sparkles,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ManageBlogs = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'settings' | 'preview'>('content');

  // Form State
  const [formData, setFormData] = useState<CreateBlogRequest>({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    category: 'General',
    tags: [],
    status: 'draft',
    featuredImage: ''
  });

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const data = await contentService.getAdminBlogs();
      setBlogs(data);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleEdit = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      excerpt: blog.excerpt,
      category: blog.category,
      tags: blog.tags,
      status: blog.status,
      featuredImage: blog.featuredImage || ''
    });
    setIsModalOpen(true);
    setActiveTab('content');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) return;
    try {
      await contentService.deleteBlog(id);
      fetchBlogs();
    } catch (error) {
      alert('Failed to delete article');
    }
  };

  const handleSubmit = async (e: React.FormEvent, forceStatus?: 'draft' | 'published') => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Headline is required to publish.');
      setActiveTab('content');
      return;
    }
    if (!formData.content.trim()) {
      alert('Article content cannot be empty.');
      setActiveTab('content');
      return;
    }

    const payload = { ...formData };
    if (forceStatus) {
       payload.status = forceStatus;
    }

    setSubmitting(true);
    try {
      if (editingBlog) {
        await contentService.updateBlog(editingBlog._id, payload);
      } else {
        await contentService.createBlog(payload);
      }
      setIsModalOpen(false);
      fetchBlogs();
      resetForm();
    } catch (error: any) {
      console.error("Submission Error:", error);
      alert(error.message || 'Failed to save article. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      category: 'General',
      tags: [],
      status: 'draft',
      featuredImage: ''
    });
    setEditingBlog(null);
  };

  const filteredBlogs = blogs.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 py-6">
        <div className="space-y-2">
           <div className="flex items-center gap-3 text-primary-theme font-black text-xs uppercase tracking-widest pl-1">
             <div className="w-8 h-[2px] bg-primary-theme" />
             Content Management
           </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter italic">
            Article <span className="text-primary-theme underline decoration-primary-theme/20 underline-offset-8">Studio</span>
          </h1>
          <p className="text-slate-500 font-medium max-w-lg">
            Craft, curate, and publish medical breakthroughs to the global MSCureChain network.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
           <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="flex -space-x-2">
                 {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold">U{i}</div>)}
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Editors</p>
           </div>
           
           <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
              setActiveTab('content');
            }}
            className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-primary-theme transition-all shadow-xl shadow-slate-200 active:scale-95 group"
          >
            <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" /> 
            Draft New Story
          </button>
        </div>
      </div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Published Articles', val: blogs.filter(b => b.status === 'published').length, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Work in Progress', val: blogs.filter(b => b.status === 'draft').length, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Monthly Readers', val: '2.4k', icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-50' },
          { label: 'Avg. Engagement', val: '84%', icon: Layout, color: 'text-blue-500', bg: 'bg-blue-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center justify-between group hover:border-primary-theme/30 transition-all shadow-sm">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900">{stat.val}</p>
            </div>
            <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner`}>
              <stat.icon size={28} />
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Table Container */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Filter by title, category, or status..."
              className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-theme/10 focus:border-primary-theme transition-all outline-none font-bold shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
             <button className="px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50">Exports</button>
             <button className="px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50">Advanced Filter</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Story Info</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Metadata</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timeline</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Tools</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-10 h-24 bg-slate-50/30" />
                  </tr>
                ))
              ) : filteredBlogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                        <FileText size={48} />
                      </div>
                      <div className="max-w-xs space-y-2">
                        <p className="text-xl font-black text-slate-900">Desk is empty</p>
                        <p className="text-slate-500 font-medium">No articles matched your current workspace filter. Clear search or draft a new story.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredBlogs.map((blog) => (
                <tr key={blog._id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      <div className="relative w-24 h-16 shrink-0 rounded-xl overflow-hidden shadow-md group-hover:shadow-primary-theme/20 transition-all border border-slate-100">
                        <img 
                          src={blog.featuredImage || 'https://via.placeholder.com/150x100?text=No+Image'} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                          alt=""
                        />
                      </div>
                      <div className="max-w-[300px]">
                        <p className="font-black text-slate-900 group-hover:text-primary-theme transition-colors line-clamp-1 text-lg leading-tight uppercase tracking-tight italic">
                          {blog.title}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                          <Layout size={10} /> {blog.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center lg:text-left">
                     <div className="flex flex-col gap-1.5 ">
                        <span className="w-fit text-[10px] font-black uppercase tracking-widest text-primary-theme bg-primary-theme/5 px-2.5 py-1 rounded-lg">
                           {blog.category}
                        </span>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                           <User size={10} /> {blog.author}
                        </div>
                     </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      blog.status === 'published' 
                        ? 'bg-green-50 text-green-600 border border-green-100' 
                        : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${blog.status === 'published' ? 'bg-green-600 shadow-green-200' : 'bg-amber-600 shadow-amber-200'} shadow-sm animate-pulse`} />
                      {blog.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-black text-slate-900">{new Date(blog.createdAt).toLocaleDateString(undefined, {month: 'short', day: '2-digit', year: 'numeric'})}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Added by System</p>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <button 
                         className="p-3 bg-white hover:bg-slate-900 hover:text-white rounded-2xl text-slate-400 shadow-xl shadow-slate-200/50 border border-slate-100 transition-all overflow-hidden relative group/tool"
                         onClick={() => window.open(`/blogs/${blog.slug}`, '_blank')}
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => handleEdit(blog)} 
                        className="p-3 bg-white hover:bg-primary-theme hover:text-white rounded-2xl text-slate-400 shadow-xl shadow-slate-200/50 border border-slate-100 transition-all group/tool"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(blog._id)} 
                        className="p-3 bg-white hover:bg-red-500 hover:text-white rounded-2xl text-slate-400 shadow-xl shadow-slate-200/50 border border-slate-100 transition-all group/tool"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Full-Screen Modal Editor */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full h-full lg:w-[90%] lg:h-[95%] lg:rounded-4xl bg-white shadow-2xl overflow-hidden flex flex-col"
            >
              <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
              {/* Editor Toolbar */}
              <div className="px-10 py-8 border-b border-slate-100 flex flex-wrap items-center justify-between gap-6 bg-white/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-300">
                     <FileText size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight italic">
                      {editingBlog ? 'Refining Article' : 'Drafting Masterpiece'}
                    </h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                      {activeTab === 'preview' ? 'Visual verification layer' : 'Creative Studio Environment'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100">
                  {[
                    { id: 'content', icon: Type, label: 'Editor' },
                    { id: 'settings', icon: Layout, label: 'Metadata' },
                    { id: 'preview', icon: Monitor, label: 'Live Preview' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        activeTab === tab.id 
                          ? 'bg-white text-slate-900 shadow-lg shadow-slate-200/50 border border-slate-100' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <tab.icon size={16} /> {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                   <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-50 uppercase text-[10px] tracking-widest"
                   >
                     Discard
                   </button>
                   <button
                    type="button"
                    onClick={(e) => handleSubmit(e, 'draft')}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-slate-100 text-slate-600 px-6 py-3.5 rounded-2xl font-black hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    {submitting && formData.status === 'draft' ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                    Save Draft
                   </button>
                   <button
                    type="button"
                    onClick={(e) => handleSubmit(e, 'published')}
                    disabled={submitting}
                    className="flex items-center gap-3 bg-primary-theme text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-primary-theme/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {submitting && formData.status === 'published' ? <Loader2 size={20} className="animate-spin" /> : (editingBlog ? 'Update & Publish' : 'Publish Story')}
                    <ChevronRight size={18} />
                   </button>
                </div>
              </div>

              {/* Editor Workspace */}
              <div className="flex-1 overflow-y-auto bg-slate-50/30">
                 <div className="max-w-6xl mx-auto p-10 h-full">
                    {activeTab === 'content' && (
                       <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-12"
                       >
                         {/* Giant Title Input */}
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-2">Headline</label>
                            <input
                              required
                              autoFocus
                              className="w-full bg-transparent border-none text-4xl md:text-6xl font-black text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 italic tracking-tighter"
                              placeholder="Type your story headline..."
                              value={formData.title}
                              onChange={(e) => {
                                 const title = e.target.value;
                                 const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                 setFormData({...formData, title, slug});
                              }}
                            />
                         </div>

                         {/* Editor Area */}
                         <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                             <div className="lg:col-span-8 space-y-8">
                               <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/20 p-12 space-y-6">
                                  <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                                    <label className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                      <FileText size={16} className="text-primary-theme" /> Editorial Workspace
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <Layout size={12} className="text-slate-300" />
                                      <input 
                                        className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-md border-none outline-none focus:ring-1 focus:ring-primary-theme/20"
                                        value={formData.slug}
                                        onChange={(e) => setFormData({...formData, slug: e.target.value})}
                                        placeholder="url-slug-here"
                                      />
                                    </div>
                                  </div>
                                  <textarea
                                    required
                                    className="w-full min-h-[600px] bg-transparent border-none outline-none font-medium text-xl text-slate-800 leading-[1.6] placeholder:text-slate-200 no-scrollbar selection:bg-primary-theme/10"
                                    placeholder="The world is waiting for your research..."
                                    value={formData.content}
                                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                                  />
                               </div>
                            </div>

                            <div className="lg:col-span-4 space-y-8">
                               {/* Featured Image Premium Preview */}
                               <div className="bg-white rounded-4xl border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden">
                                  <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                       <ImageIcon size={14} /> Art Direction
                                     </span>
                                  </div>
                                  <div className="p-8 space-y-6">
                                     <div className="aspect-video rounded-2xl bg-slate-50 border-2 border-dashed border-slate-100 flex items-center justify-center relative group overflow-hidden">
                                        {formData.featuredImage ? (
                                           <img src={formData.featuredImage} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                                        ) : (
                                           <div className="text-center space-y-2">
                                              <ImageIcon size={32} className="mx-auto text-slate-200" />
                                              <p className="text-[10px] font-bold text-slate-300 uppercase">Visual Placeholder</p>
                                           </div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                           <button className="bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-black shadow-lg">Change Cover</button>
                                        </div>
                                     </div>
                                     <input
                                        className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold text-xs focus:ring-4 focus:ring-primary-theme/5 outline-none transition-all"
                                        placeholder="Enter image URL..."
                                        value={formData.featuredImage}
                                        onChange={(e) => setFormData({...formData, featuredImage: e.target.value})}
                                     />
                                  </div>
                               </div>

                               {/* Excerpt Card */}
                               <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 p-10 space-y-4">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles size={14} className="text-primary-theme" /> Executive Summary
                                  </label>
                                  <textarea
                                    className="w-full bg-slate-50 border border-slate-100 p-8 rounded-3xl font-medium text-sm focus:ring-4 focus:ring-primary-theme/5 outline-none min-h-[180px] leading-relaxed italic"
                                    placeholder="Write a catchy 2-sentence summary..."
                                    value={formData.excerpt}
                                    onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                                  />
                               </div>
                            </div>
                         </div>
                       </motion.div>
                    )}

                    {activeTab === 'settings' && (
                       <motion.div 
                        initial={{ opacity: 0, x: 20 }} 
                        animate={{ opacity: 1, x: 0 }}
                        className="max-w-4xl mx-auto py-12"
                       >
                         <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-16 space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                               <div className="space-y-4">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Display Category</label>
                                  <div className="grid grid-cols-2 gap-3">
                                     {['Technology', 'General', 'Healthcare', 'Research', 'Updates'].map(cat => (
                                        <button
                                          key={cat}
                                          type="button"
                                          onClick={() => setFormData({...formData, category: cat})}
                                          className={`py-4 rounded-2xl font-bold text-xs transition-all ${
                                             formData.category === cat 
                                               ? 'bg-primary-theme text-white shadow-lg' 
                                               : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                          }`}
                                        >
                                           {cat}
                                        </button>
                                     ))}
                                  </div>
                               </div>

                               <div className="space-y-4">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Workflow Status</label>
                                  <div className="flex flex-col gap-4">
                                     {['draft', 'published'].map(s => (
                                        <button
                                          key={s}
                                          type="button"
                                          onClick={() => setFormData({...formData, status: s as any})}
                                          className={`p-6 rounded-[2rem] border-2 transition-all text-left flex items-center justify-between ${
                                             formData.status === s 
                                               ? 'border-primary-theme bg-primary-theme/5' 
                                               : 'border-slate-50 bg-slate-50/50'
                                          }`}
                                        >
                                           <div>
                                              <p className={`font-black uppercase tracking-widest text-xs ${formData.status === s ? 'text-primary-theme' : 'text-slate-400'}`}>{s}</p>
                                              <p className="text-[10px] font-medium text-slate-400 mt-1">
                                                {s === 'draft' ? 'Only visible to the admin team.' : 'Propagated to public landing hubs.'}
                                              </p>
                                           </div>
                                           {formData.status === s && <CheckCircle2 className="text-primary-theme" size={24} />}
                                        </button>
                                     ))}
                                  </div>
                               </div>
                            </div>

                            <div className="space-y-4">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 flex items-center gap-2">
                                  <TagIcon size={14} /> Search Tags & Keywords
                               </label>
                               <div className="flex flex-wrap gap-4 p-8 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                                  {formData.tags?.map(t => (
                                     <span key={t} className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-sm flex items-center gap-3">
                                        {t} <button type="button" onClick={() => setFormData({...formData, tags: formData.tags?.filter(tag => tag !== t)})}>&times;</button>
                                     </span>
                                  ))}
                                  <input 
                                     className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-slate-900 placeholder:text-slate-200" 
                                     placeholder="Add new tag..."
                                     onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                           e.preventDefault();
                                           const val = e.currentTarget.value.trim();
                                           if (val && !formData.tags?.includes(val)) {
                                              setFormData({...formData, tags: [...(formData.tags || []), val]});
                                              e.currentTarget.value = '';
                                           }
                                        }
                                     }}
                                  />
                               </div>
                            </div>
                         </div>
                       </motion.div>
                    )}

                    {activeTab === 'preview' && (
                       <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }} 
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-4xl mx-auto py-12"
                       >
                         <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden min-h-screen">
                            <div className="h-2 bg-primary-theme" />
                            <div className="p-16 space-y-12">
                               <div className="space-y-6">
                                  <div className="flex items-center gap-3">
                                     <span className="px-4 py-1.5 rounded-full bg-primary-theme/5 text-primary-theme text-[10px] font-black uppercase tracking-widest">
                                       {formData.category}
                                     </span>
                                     <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Live Preview Node</span>
                                  </div>
                                  <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-[1.1]">
                                    {formData.title || 'Draft Article Headline'}
                                  </h1>
                               </div>
                               
                               {formData.featuredImage && (
                                  <div className="aspect-[21/9] rounded-[2.5rem] overflow-hidden shadow-2xl">
                                     <img src={formData.featuredImage} className="w-full h-full object-cover" />
                                  </div>
                               )}

                               <div className="flex items-center gap-4 py-8 border-y border-slate-100">
                                  <div className="w-12 h-12 rounded-2xl bg-slate-100" />
                                  <div>
                                     <p className="text-sm font-black text-slate-900">Dr. System Admin</p>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                       <Calendar size={10} /> {new Date().toLocaleDateString(undefined, {month: 'long', day: 'numeric', year: 'numeric'})}
                                     </p>
                                  </div>
                               </div>

                               <div className="space-y-8">
                                  <p className="text-2xl font-black text-slate-900 italic leading-relaxed opacity-60">
                                     {formData.excerpt || 'Article summary will appear here to hook the reader.'}
                                  </p>
                                  <div className="text-xl text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                                     {formData.content || 'Wait for it... The main content is still being drafted.'}
                                  </div>
                               </div>
                            </div>
                         </div>
                       </motion.div>
                    )}
                 </div>
              </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageBlogs;
