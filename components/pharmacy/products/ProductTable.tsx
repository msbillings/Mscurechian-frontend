'use client';

import React from 'react';
import { Edit2, Trash2, Tag, Info } from 'lucide-react';
import { PharmacyProduct } from '@/lib/integrations/types/product';
import { PharmacyTableSkeleton } from '@/components/ui/skeletons';

interface ProductTableProps {
    products: PharmacyProduct[];
    onEdit: (product: PharmacyProduct) => void | Promise<void>;
    onDelete: (id: string, name: string) => void | Promise<void>;
    isLoading: boolean;
}

const ProductTable: React.FC<ProductTableProps> = ({ products, onEdit, onDelete, isLoading }) => {

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'In Stock':
                return 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400';
            case 'Low Stock':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
            case 'Out of Stock':
                return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400';
        }
    };

    const getExpiryStyle = (expiryDate: string | Date | undefined) => {
        if (!expiryDate) return 'text-gray-600 dark:text-gray-400';
        const date = new Date(expiryDate);
        const today = new Date();
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(today.getMonth() + 3);

        if (date < threeMonthsFromNow) {
            return 'text-red-600 font-bold';
        }
        return 'text-green-600 font-bold';
    };

    if (isLoading) {
        return <PharmacyTableSkeleton rows={8} />;
    }

    if (products.length === 0) {
        return (
            <div className="w-full bg-white dark:bg-gray-900 p-12 text-center">
                <Info className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No products found</h3>
                <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters or add a new product.</p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-y border-gray-100 dark:border-gray-800">
                        <th className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight text-center">Brand Name</th>
                        <th className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight text-center">Generic Name</th>
                        <th className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight text-center">Sch</th>
                        <th className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight text-center">Expiry</th>
                        <th className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight text-center">MRP</th>
                        <th className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight text-center">Stock</th>
                        <th className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight text-center">Pieces</th>
                        <th className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight text-center">Status</th>
                        <th className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {products.map((product) => (
                        <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 group transition-colors">
                            <td className="px-6 py-5 border-r border-gray-100 dark:border-gray-800">
                                <div className="font-bold text-gray-900 dark:text-white text-base uppercase">
                                    {product.brandName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    {product.strength} | {product.form?.toUpperCase()}
                                </div>
                            </td>
                            <td className="px-6 py-5 border-r border-gray-100 dark:border-gray-800">
                                <div className="text-base text-gray-700 dark:text-gray-300 font-medium">
                                    {product.genericName}
                                </div>
                            </td>
                            <td className="px-6 py-5 text-center border-r border-gray-100 dark:border-gray-800">
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                    {product.schedule?.split(' ')[0] || '-'}
                                </span>
                            </td>
                            <td className="px-6 py-5 text-center border-r border-gray-100 dark:border-gray-800">
                                <div className={`text-base ${getExpiryStyle(product.expiryDate)}`}>
                                    {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString('en-GB') : '-'}
                                </div>
                            </td>
                            <td className="px-6 py-5 text-center border-r border-gray-100 dark:border-gray-800 font-medium">
                                <div className="text-base text-gray-700 dark:text-gray-300">
                                    ₹{product.mrp.toFixed(2)}
                                </div>
                            </td>
                            <td className="px-6 py-5 text-center border-r border-gray-100 dark:border-gray-800">
                                <div className="text-base font-medium text-gray-700 dark:text-gray-300">
                                    {Math.round(product.currentStock * 100) / 100}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">{product.unitsPerPack || 1} / Pack</div>
                            </td>
                            <td className="px-6 py-5 text-center border-r border-gray-100 dark:border-gray-800">
                                <div className="text-base font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded inline-block">
                                    {Math.round((product.unitsPerPack || 1) * product.currentStock).toLocaleString()}
                                </div>
                            </td>
                            <td className="px-6 py-5 text-center border-r border-gray-100 dark:border-gray-800">
                                <span className={`px-3 py-1 rounded text-xs font-bold ${getStatusStyles(product.status)}`}>
                                    {product.status}
                                </span>
                            </td>
                            <td className="px-6 py-5">
                                <div className="flex items-center justify-center gap-3">
                                    <button
                                        onClick={() => onEdit(product)}
                                        className="text-blue-600 hover:text-blue-800 transition-colors"
                                        title="Edit Product"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(product._id, product.brandName)}
                                        className="text-red-500 hover:text-red-700 transition-colors"
                                        title="Delete Product"
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
    );
};

export default ProductTable;
