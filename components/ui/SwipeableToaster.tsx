'use client';

import React from 'react';
import { Toaster, ToastBar, toast, Toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SwipeableToaster
 * A global toast handler that adds swipe-to-dismiss functionality
 * using framer-motion and react-hot-toast.
 */
const SwipeableToaster = () => {
    return (
        <Toaster
            position="top-center"
            toastOptions={{
                // Maintain existing styles or provide decent defaults
                duration: 4000,
                style: {
                    background: 'rgba(255, 255, 255, 0.9)',
                    color: '#1f2937',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    fontSize: '14px',
                    fontWeight: 500,
                    maxWidth: '400px',
                },
            }}
        >
            {(t: Toast) => (
                <motion.div
                    layout
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, x: t.height ? 100 : 0, transition: { duration: 0.2 } }}
                    drag="x"
                    dragConstraints={{ left: -100, right: 100 }}
                    dragElastic={0.1}
                    onDragEnd={(_, info) => {
                        // If dragged more than 80px in either direction, dismiss it
                        if (Math.abs(info.offset.x) > 80) {
                            toast.dismiss(t.id);
                        }
                    }}
                    className="cursor-grab active:cursor-grabbing pointer-events-auto"
                >
                    <ToastBar toast={t}>
                        {({ icon, message }) => (
                            <div className="flex items-center gap-2 p-1">
                                {icon}
                                <div className="flex-1 min-w-0 pr-2">
                                    {message}
                                </div>
                                {t.type !== 'loading' && (
                                    <button
                                        onClick={() => toast.dismiss(t.id)}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors shrink-0"
                                        aria-label="Close"
                                    >
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        )}
                    </ToastBar>
                </motion.div>
            )}
        </Toaster>
    );
};

export default SwipeableToaster;
