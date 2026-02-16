'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, Calendar, Package } from 'lucide-react';
import { ProductService } from '@/lib/integrations/services/product.service';
import { PharmacyProduct } from '@/lib/integrations/types/product';

interface ExpiryAlertsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ExpiryAlertsModal: React.FC<ExpiryAlertsModalProps> = ({ isOpen, onClose }) => {
    const [products, setProducts] = useState<PharmacyProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchExpilingProducts();
        }
    }, [isOpen]);

    const fetchExpilingProducts = async () => {
        setIsLoading(true);
        try {
            const data = await ProductService.getProducts({ expiryStatus: 'Expiring Soon (30 days)' });
            setProducts(data);
        } catch (error) {
            console.error('Failed to fetch expiring products:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl border dark:border-gray-800 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b dark:border-gray-800 flex items-center justify-between bg-red-50/50 dark:bg-red-950/10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Expiry Alerts (Short-term)</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Products expiring within the next 30 days</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                            <p className="text-sm font-medium text-gray-500">Scanning inventory for expiry dates...</p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Package size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">All Clear!</h3>
                            <p className="text-gray-500 dark:text-gray-400">No products are expiring in the next 30 days.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border dark:border-gray-800 shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 dark:bg-gray-800/50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Brand / SKU</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Generic Name</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Batch</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Expiry</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Stock</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-800">
                                    {products.map((product) => {
                                        const expiry = product.expiryDate ? new Date(product.expiryDate) : null;
                                        const isExpiringThisWeek = expiry ? (expiry.getTime() - new Date().getTime()) < 7 * 24 * 60 * 60 * 1000 : false;
                                        
                                        return (
                                            <tr key={product._id} className="hover:bg-red-50/30 dark:hover:bg-red-950/5 group">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 dark:text-white group-hover:text-red-600">
                                                        {product.brandName}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 dark:text-gray-500 font-mono">
                                                        {product.sku}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                                        {product.genericName}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center text-xs text-gray-500 dark:text-gray-500">
                                                    {product.batchNumber || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className={`flex items-center justify-center gap-2 text-sm font-bold ${isExpiringThisWeek ? 'text-red-600' : 'text-amber-600'}`}>
                                                        <Calendar size={14} />
                                                        {expiry ? expiry.toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' }) : '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                                                        {product.currentStock}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/10 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold shadow-lg hover:scale-[1.02] active:scale-95"
                    >
                        Close Window
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExpiryAlertsModal;
