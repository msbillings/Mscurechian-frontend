'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Maximize2, FileText, Loader2 } from 'lucide-react';

interface PDFViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string | null;
    sopName: string | null;
    onDownload: () => void;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({
    isOpen,
    onClose,
    pdfUrl,
    sopName,
    onDownload
}) => {
    console.log(`[VIEWER DEBUG] Final PDF URL for iframe: ${pdfUrl}`);
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-10">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-6xl h-full bg-white dark:bg-gray-900 rounded-[1rem] shadow-2xl flex flex-col overflow-hidden border border-white/10"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                        {sopName || 'Document Preview'}
                                    </h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                        Official Hospital Protocol
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={onDownload}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                                >
                                    <Download size={14} />
                                    Download
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-red-500 hover:text-white rounded-xl transition-all active:scale-95"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* PDF Content */}
                        <div className="flex-1 bg-gray-100 dark:bg-gray-950 relative">
                            {pdfUrl ? (
                                <iframe
                                    src={`${pdfUrl}#toolbar=0`}
                                    className="w-full h-full border-none shadow-inner"
                                    title="SOP PDF Viewer"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                    <Loader2 size={48} className="animate-spin mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Loading Secured Content...</p>
                                </div>
                            )}
                        </div>

                        {/* Footer / Meta */}
                        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                &copy; {new Date().getFullYear()} CureChain Compliance Matrix
                            </p>
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Secure View
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
