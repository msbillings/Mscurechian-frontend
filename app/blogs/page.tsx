'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Calendar, 
  ArrowRight, 
  Clock, 
  BookOpen
} from 'lucide-react';
import LandingNavbar from "@/components/navbar/LandingNavbar";
import Footer from "@/components/footer/Footer";
import { contentService } from '@/lib/integrations/services/content.service';
import { Blog } from '@/lib/integrations/types/cms';
import Link from 'next/link';

const BlogsPage = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const data = await contentService.getPublicBlogs();
        setBlogs(data);
      } catch (error) {
        console.error('Error fetching blogs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  const categories = ['All', ...Array.from(new Set(blogs.map(b => b.category)))];

  const filteredBlogs = blogs.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         b.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || b.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 selection:bg-primary-theme/10 selection:text-primary-theme text-left">
      <LandingNavbar variant="detail" />
      
      <main className="pt-24 pb-20">
        {/* Compact Header */}
        <section className="px-6 mb-12">
          <div className="max-w-5xl mx-auto text-center space-y-3">
             <div className="flex items-center justify-center gap-2 text-primary-theme font-black text-[8px] uppercase tracking-[0.3em]">
               <div className="w-6 h-px bg-primary-theme/30" />
               Knowledge Base
               <div className="w-6 h-px bg-primary-theme/30" />
             </div>
             <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight italic uppercase">
               Medical <span className="text-primary-theme">Insights</span> & Research
             </h1>
             <p className="text-slate-500 font-medium max-w-xl mx-auto text-xs leading-relaxed">
               Latest medical breakthroughs and clinical studies from our global MSCureChain laboratory.
             </p>
          </div>
        </section>

        {/* Tight Filter Bar */}
        <section className="px-6 mb-10 sticky top-[72px] z-40">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-3 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/20">
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar w-full md:w-auto px-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-all relative py-1.5 ${
                    selectedCategory === cat ? 'text-primary-theme' : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {cat}
                  {selectedCategory === cat && (
                    <motion.div layoutId="activeCat" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary-theme" />
                  )}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary-theme transition-colors" size={12} />
              <input
                type="text"
                placeholder="Search resources..."
                className="w-full bg-slate-50/50 border border-slate-100 pl-9 pr-4 py-2 rounded-xl text-[10px] font-bold placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-primary-theme/5 focus:border-primary-theme transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Scaled Blog Grid */}
        <section className="px-6">
          <div className="max-w-5xl mx-auto">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="animate-pulse space-y-3">
                     <div className="aspect-video bg-slate-200/60 rounded-2xl" />
                     <div className="h-4 bg-slate-200/60 rounded-lg w-3/4" />
                     <div className="h-3 bg-slate-200/60 rounded-lg w-full" />
                  </div>
                ))}
              </div>
            ) : filteredBlogs.length === 0 ? (
              <div className="py-24 text-center bg-white rounded-3xl border border-slate-100 shadow-sm transition-all">
                 <BookOpen size={32} className="mx-auto text-slate-200 mb-4" />
                 <h3 className="text-lg font-black text-slate-900 uppercase italic">No records found</h3>
                 <p className="text-slate-400 font-medium text-[10px] mt-1">Try adjusting your keyword or filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBlogs.map((blog, idx) => (
                  <motion.article 
                    key={blog._id}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx % 3 * 0.1 }}
                    className="group bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-1 transition-all duration-500 flex flex-col h-full"
                  >
                    <Link href={`/blogs/${blog.slug}`} className="block relative aspect-video overflow-hidden">
                      <img 
                        src={blog.featuredImage || 'https://images.unsplash.com/photo-1576091160550-2173dba9697a?auto=format&fit=crop&q=80&w=800'} 
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute top-3 left-3">
                         <span className="px-2 py-1 rounded-md bg-white/90 backdrop-blur-md text-slate-900 text-[7px] font-black uppercase tracking-widest shadow-sm">
                           {blog.category}
                         </span>
                      </div>
                    </Link>

                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-3 text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} className="text-primary-theme" /> {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString()}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                        <span className="flex items-center gap-1">
                          <Clock size={10} className="text-primary-theme" /> 5 MIN
                        </span>
                      </div>
                      
                      <Link href={`/blogs/${blog.slug}`}>
                        <h2 className="text-sm font-black text-slate-900 leading-snug tracking-tight mb-3 group-hover:text-primary-theme transition-colors line-clamp-2 italic uppercase">
                          {blog.title}
                        </h2>
                      </Link>
                      
                      <p className="text-slate-500 font-medium text-[10px] leading-relaxed line-clamp-2 mb-5">
                        {blog.excerpt}
                      </p>

                      <Link 
                        href={`/blogs/${blog.slug}`}
                        className="mt-auto inline-flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary-theme transition-colors shadow-none border-none p-0 bg-transparent"
                      >
                        Discover More 
                        <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BlogsPage;
