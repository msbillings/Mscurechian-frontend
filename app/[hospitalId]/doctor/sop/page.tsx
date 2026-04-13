'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sopService, SOP } from '@/lib/integrations/services/sop.service';
import { ShieldCheck, Info, Search, X } from 'lucide-react';
import { SOPTable } from '@/components/sop/SOPTable';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { PDFViewerModal } from '@/components/sop/PDFViewerModal';

export default function StaffSOPPage() {
    const queryClient = useQueryClient();
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

    // Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Preview Modal State
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedSOPName, setSelectedSOPName] = useState<string | null>(null);

    const { data: sops = [], isLoading } = useQuery({
        queryKey: ['staff-sops'],
        queryFn: () => sopService.getSOPs({ status: 'Active' }), // Only active for staff
        refetchInterval: 5000 // Real-time updates every 5 seconds
    });

    const handleAcknowledge = async (id: string) => {
        try {
            setAcknowledgingId(id);
            await sopService.acknowledgeSOP(id);
            toast.success('Protocol acknowledged');
            queryClient.invalidateQueries({ queryKey: ['staff-sops'] });
        } catch (error) {
            console.error('Acknowledgment error:', error);
            toast.error('Failed to acknowledge protocol');
        } finally {
            setAcknowledgingId(null);
        }
    };

    const handleView = async (id: string, fileName: string) => {
        try {
            setDownloadingId(id);
            const response = await sopService.fetchSignedUrl(id);
            if (response.downloadUrl) {
                try {
                    // Fetch directly to ensure PDF type
                    const pdfResponse = await fetch(response.downloadUrl);
                    if (!pdfResponse.ok) throw new Error('Fetch failed');

                    const blob = await pdfResponse.blob();
                    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
                    const blobUrl = window.URL.createObjectURL(pdfBlob);

                    setPreviewUrl(blobUrl);
                    setSelectedSOPName(fileName);
                    setIsPreviewModalOpen(true);
                } catch (err) {
                    console.warn('Blob fetch failed, falling back to direct tab', err);
                    window.open(response.downloadUrl, '_blank');
                }
            }
        } catch (error) {
            console.error('View error:', error);
            toast.error('Failed to view protocol');
        } finally {
            setDownloadingId(null);
        }
    };

    const triggerDirectDownload = async () => {
        if (previewUrl && selectedSOPName) {
            try {
                const link = document.createElement('a');

                // If blob, use directly
                if (previewUrl.startsWith('blob:')) {
                    link.href = previewUrl;
                } else {
                    // Fetch again if needed (fallback)
                    const response = await fetch(previewUrl);
                    const blob = await response.blob();
                    link.href = window.URL.createObjectURL(blob);
                }

                const safeName = selectedSOPName.replace(/[^a-zA-Z0-9-_]/g, '_');
                link.download = `${safeName}.pdf`;

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                if (!previewUrl.startsWith('blob:')) {
                    window.URL.revokeObjectURL(link.href);
                }
                toast.success('Download started');
            } catch (error) {
                toast.error('Download failed');
            }
        }
    };

    const categories = ['all', 'OPD', 'IPD', 'Billing', 'Infection Control', 'Emergency', 'HR', 'Pharmacy', 'Lab', 'General'];

    const filteredSops = sops.filter((sop: SOP) => {
        const matchesSearch = sop.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'all' || sop.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    // Reset pagination on filter change
    const updateSearch = (val: string) => {
        setSearchTerm(val);
        setCurrentPage(1);
    };

    const updateCategory = (cat: string) => {
        setActiveCategory(cat);
        setCurrentPage(1);
        setShowFilters(false);
    };

    return (
        <div className="min-h-screen space-y-4 sm:space-y-6 pt-2 sm:pt-4 pb-16 max-w-7xl mx-auto">
            {/* Header Tier */}
            <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border-theme shadow-sm relative z-20">
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                </div>
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
                    <div className="flex items-center gap-6 sm:gap-10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-xl shadow-emerald-500/10 rotate-3 transition-transform hover:rotate-0 duration-500">
                            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-xl lg:text-xl font-bold text-foreground uppercase tracking-tight">SOP Registry</h1>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="text-muted font-bold uppercase tracking-[0.4em] text-[10px] sm:text-xs opacity-60 flex items-center gap-3 text-emerald-600/70">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Active Institutional Standards Network
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 w-full lg:w-auto">
                        <div className="relative w-full lg:min-w-[280px]">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`w-full flex items-center justify-between gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] border transition-all active:scale-95 shadow-lg ${showFilters
                                    ? 'bg-secondary-theme border-primary-theme/30 text-primary-theme shadow-none'
                                    : 'bg-card border-border-theme text-muted hover:border-emerald-500/50 hover:text-emerald-600 shadow-black/5'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Search size={16} />
                                    <span className="truncate">{activeCategory === 'all' ? 'Protocol Analytics' : activeCategory}</span>
                                </div>
                                <motion.div
                                    animate={{ rotate: showFilters ? 180 : 0 }}
                                    className="shrink-0"
                                >
                                    <X size={14} className={showFilters ? 'opacity-100' : 'opacity-40'} />
                                </motion.div>
                            </button>

                            <AnimatePresence>
                                {showFilters && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute right-0 mt-4 w-full sm:w-80 bg-card border border-border-theme rounded-[2.5rem] shadow-2xl z-[50] overflow-hidden p-3"
                                    >
                                        <div className="relative mb-3">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/40" size={16} />
                                            <input
                                                type="text"
                                                placeholder="SEARCH DOMAINS..."
                                                value={searchTerm}
                                                onChange={(e) => updateSearch(e.target.value)}
                                                className="w-full pl-12 pr-6 py-4 bg-secondary-theme/50 border border-transparent focus:border-primary-theme/20 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest outline-none transition-all"
                                            />
                                        </div>
                                        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-1 grid grid-cols-1 gap-1">
                                            {categories.map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => updateCategory(cat)}
                                                    className={`w-full text-left px-5 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-between group ${activeCategory === cat
                                                        ? 'bg-primary-theme text-white shadow-xl shadow-primary-theme/20'
                                                        : 'bg-transparent text-muted hover:bg-primary-theme/5 hover:text-primary-theme'
                                                        }`}
                                                >
                                                    {cat}
                                                    <div className={`w-1.5 h-1.5 rounded-full transition-all ${activeCategory === cat ? 'bg-white scale-125' : 'bg-transparent group-hover:bg-primary-theme/30'}`} />
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table View */}
            <div className="bg-card rounded-xl sm:rounded-2xl p-2 sm:p-4 border border-border-theme shadow-sm overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-secondary-theme/5 pointer-events-none"></div>
                <div className="relative z-10">
                    <SOPTable
                        sops={filteredSops}
                        isLoading={isLoading}
                        onAcknowledge={handleAcknowledge}
                        onDownload={handleView}
                        acknowledgingId={acknowledgingId}
                        downloadingId={downloadingId}
                        showInternalFilters={false}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>

            <PDFViewerModal
                isOpen={isPreviewModalOpen}
                onClose={() => {
                    if (previewUrl && previewUrl.startsWith('blob:')) {
                        window.URL.revokeObjectURL(previewUrl);
                    }
                    setIsPreviewModalOpen(false);
                    setPreviewUrl(null);
                }}
                pdfUrl={previewUrl}
                sopName={selectedSOPName || 'Document'}
                onDownload={triggerDirectDownload}
            />
        </div>
    );
}
