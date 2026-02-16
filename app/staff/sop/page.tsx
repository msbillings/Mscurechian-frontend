'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sopService, SOP } from '@/lib/integrations/services/sop.service';
import { ShieldCheck, Info, Search } from 'lucide-react';
import { SOPTable } from '@/components/sop/SOPTable';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { PDFViewerModal } from '@/components/sop/PDFViewerModal';

export default function GeneralStaffSOPPage() {
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
        queryKey: ['staff-general-sops'],
        queryFn: () => sopService.getSOPs({ status: 'Active' }),
        refetchInterval: 5000 // Real-time updates every 5 seconds
    });

    const handleAcknowledge = async (id: string) => {
        try {
            setAcknowledgingId(id);
            await sopService.acknowledgeSOP(id);
            toast.success('Protocol acknowledged');
            queryClient.invalidateQueries({ queryKey: ['staff-general-sops'] });
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
        <div className="p-4 md:p-8 space-y-6 md:space-y-10 max-w-7xl mx-auto min-h-screen">
            {/* Header Tier */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-4">

                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Institutional Protocols</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-bold mt-2 uppercase tracking-[0.2em] text-[8px] md:text-[10px] ml-1 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            Staff Compliance & Operational Registry
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-auto">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center justify-between md:justify-start gap-3 w-full md:w-auto px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${showFilters
                                ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 hover:border-emerald-500/50 hover:text-emerald-600'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <Search size={16} />
                                {activeCategory === 'all' ? 'Filters' : activeCategory}
                            </div>
                            <Info size={14} className="md:hidden opacity-50" />
                        </button>

                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute right-0 mt-2 w-full md:w-64 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl z-[50] overflow-hidden p-2"
                                >
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <input
                                            type="text"
                                            placeholder="Search Categories..."
                                            value={searchTerm}
                                            onChange={(e) => updateSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-[10px] font-bold outline-none"
                                        />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => updateCategory(cat)}
                                                className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all mb-1 ${activeCategory === cat
                                                    ? 'bg-primary-theme text-white shadow-lg'
                                                    : 'bg-transparent text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800/50 p-4 md:p-6 rounded-[0.5rem] border border-gray-100 dark:border-gray-700/50">
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
