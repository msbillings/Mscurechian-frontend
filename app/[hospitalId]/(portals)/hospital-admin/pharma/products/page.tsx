'use client';

import React, { useState, useMemo } from 'react';
import {
    Search,
    Plus,
    Filter,
    Download,
    FileSpreadsheet,
    ChevronDown,
    RefreshCcw,
    LayoutGrid
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ProductService } from '@/lib/integrations/services/product.service';
import { PharmacyProduct, PharmacyProductPayload } from '@/lib/integrations/types/product';
import ProductTable from '@/components/pharmacy/products/ProductTable';
import AddProductModal from '@/components/pharmacy/products/AddProductModal';
import BulkProductUploadModal from '@/components/pharmacy/products/BulkProductUploadModal';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ProductsPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<PharmacyProduct | null>(null);

    const searchParams = useSearchParams();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Stock');
    const [supplierFilter, setSupplierFilter] = useState('All Suppliers');
    const [expiryStatusFilter, setExpiryStatusFilter] = useState(searchParams.get('expiryStatus') || 'All');

    // ✅ CRITICAL FIX: Use React Query instead of useState + useEffect
    // ✅ STEP 3 FIX: Standardized query key with hospital-admin prefix
    const { data: products = [], isLoading, refetch } = useQuery<any[]>({
        queryKey: ['hospital-admin-pharma-products', searchTerm, statusFilter, supplierFilter, expiryStatusFilter],
        queryFn: async () => {
            const apiStartTime = performance.now();
            console.log(`[API] Starting products fetch with filters:`, { searchTerm, statusFilter, supplierFilter, expiryStatusFilter });
            try {
                const data = await ProductService.getProducts({
                    search: searchTerm,
                    status: statusFilter === 'All Stock' ? undefined : statusFilter,
                    supplier: supplierFilter === 'All Suppliers' ? undefined : supplierFilter,
                    expiryStatus: expiryStatusFilter === 'All' ? undefined : expiryStatusFilter
                });
                const apiEndTime = performance.now();
                console.log(`[API] Products fetch completed in ${(apiEndTime - apiStartTime).toFixed(2)}ms, returned ${data?.length || 0} products`);
                return data;
            } catch (error) {
                console.error('Failed to fetch products:', error);
                toast.error('Failed to load inventory data');
                return [];
            }
        },
        staleTime: 2 * 60 * 1000, // 2 minutes - will use cache for 2 min
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 min
    });

    const handleSaveProduct = async (data: PharmacyProductPayload) => {
        try {
            if (editingProduct) {
                await ProductService.updateProduct(editingProduct._id, data);
                toast.success('Inventory record updated');
            } else {
                await ProductService.addProduct(data);
                toast.success('SKU added to registry');
            }
            setIsModalOpen(false);
            setEditingProduct(null);
            refetch(); // ✅ Use React Query refetch
        } catch (error: any) {
            console.error('Failed to save product:', error);
            toast.error(error.message || 'Registry update failed');
            throw error;
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (window.confirm('Warning: This will permanently remove the SKU from the registry. Continue?')) {
            try {
                await ProductService.deleteProduct(id);
                toast.success('SKU deregistered');
                refetch(); // ✅ Use React Query refetch
            } catch (error) {
                console.error('Failed to delete product:', error);
                toast.error('Deregistration failed');
            }
        }
    };

    const handleEditProduct = (product: PharmacyProduct) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleExportExcel = async () => {
        if (products.length === 0) {
            toast.error('No registry data to export');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventory Manifest');

        // 1. Branding Header
        const headerTitle = ['INSTITUTIONAL PHARMA INVENTORY MANIFEST'];
        const subTitle = [`Global SKU Audit: ${new Date().toLocaleDateString('en-GB')} | Status: SYSTEM_VERIFIED`];

        const titleRow = worksheet.addRow(headerTitle);
        titleRow.font = { name: 'Arial Black', size: 16, color: { argb: 'FF1E293B' } };
        worksheet.mergeCells('A1:H1');
        titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

        const dateRow = worksheet.addRow(subTitle);
        dateRow.font = { name: 'Arial', size: 10, italic: true, bold: true, color: { argb: 'FF64748B' } };
        worksheet.mergeCells('A2:H2');
        dateRow.alignment = { vertical: 'middle', horizontal: 'center' };

        worksheet.addRow([]); // Spacer

        // 2. Define Columns
        worksheet.columns = [
            { header: 'SKU SIGNATURE', key: 'sku', width: 15 },
            { header: 'NOMENCLATURE', key: 'brandName', width: 25 },
            { header: 'COMPOSITION', key: 'genericName', width: 25 },
            { header: 'SCHEDULE', key: 'schedule', width: 10 },
            { header: 'MRP (₹)', key: 'mrp', width: 12 },
            { header: 'UNIT STOCK', key: 'stock', width: 12 },
            { header: 'STATUS', key: 'status', width: 15 },
            { header: 'EXPIRY', key: 'expiry', width: 12 },
        ];

        // 3. Add & Style Table Header
        const headerRow = worksheet.addRow([
            'SKU SIGNATURE', 'NOMENCLATURE', 'COMPOSITION', 'SCHEDULE',
            'MRP (₹)', 'UNIT STOCK', 'STATUS', 'EXPIRY'
        ]);

        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF0F172A' }
            };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // 4. Populate Data
        products.forEach((product, index) => {
            const row = worksheet.addRow({
                sku: (product.sku || 'N/A').toUpperCase(),
                brandName: product.brandName?.toUpperCase(),
                genericName: product.genericName?.toUpperCase(),
                schedule: (product.schedule?.split(' ')[0] || '-').toUpperCase(),
                mrp: Number(product.mrp) || 0,
                stock: Number(product.currentStock) || 0,
                status: (product.status || 'IN_STOCK').toUpperCase(),
                expiry: product.expiryDate ? new Date(product.expiryDate).toLocaleDateString('en-GB') : '-'
            });

            // Alternate row styling
            if (index % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            }

            row.font = { size: 9 };
            row.alignment = { vertical: 'middle' };
            row.eachCell((cell, colIndex) => {
                if (colIndex === 5) {
                    cell.numFmt = '#,##0.00';
                    cell.alignment = { horizontal: 'right' };
                }
                if (colIndex === 6) {
                    cell.font = { bold: true };
                    cell.alignment = { horizontal: 'center' };
                }
                if (colIndex === 7) {
                    cell.font = {
                        bold: true,
                        color: { argb: cell.value === 'OUT OF STOCK' ? 'FFDC2626' : 'FF10B981' }
                    };
                    cell.alignment = { horizontal: 'center' };
                }
                if (colIndex === 8) {
                    cell.alignment = { horizontal: 'center' };
                }
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const data = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(data, `Institutional_Pharma_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Manifest exported successfully');
    };

    const suppliers = ['All Suppliers', ...Array.from(new Set(products.map(p => {
        if (typeof p.supplier === 'object' && p.supplier !== null) {
            return (p.supplier as any).name;
        }
        return p.supplier;
    }))).filter(Boolean)];

    return (
        <div className="space-y-4 md:space-y-6 pb-20 w-full max-w-[100vw] overflow-x-hidden pt-2 md:pt-4">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 w-full lg:w-auto">
                    <h1 className="px-1 md:px-3 text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white shrink-0">Products</h1>

                    {/* Search Bar - Integrated in Header */}
                    <div className="relative w-full sm:min-w-[200px] xl:min-w-[400px]">
                        <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 absolute left-3 md:left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by name, brand, SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 md:pl-11 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        <span className="hidden sm:inline">Add Product</span>
                    </button>

                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold transition-colors shadow-sm ${isFilterOpen ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50'}`}
                    >
                        <Filter size={14} />
                        <span className="hidden sm:inline">Filters</span>
                    </button>

                    <button
                        onClick={() => refetch()}
                        className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors shadow-sm"
                    >
                        <Download size={16} />
                        <span className="hidden sm:inline">Export</span>
                    </button>

                    <button
                        onClick={() => setIsBulkModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <FileSpreadsheet size={16} />
                        <span className="hidden sm:inline">Import</span>
                    </button>
                </div>
            </div>

            {/* Filters Section (Optional/Expandable) */}
            {isFilterOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mx-1 md:mx-2">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Stock Status</label>
                        <select
                            className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option>All Stock</option>
                            <option>In Stock</option>
                            <option>Low Stock</option>
                            <option>Out of Stock</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Supplier</label>
                        <select
                            className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            value={supplierFilter}
                            onChange={(e) => setSupplierFilter(e.target.value)}
                        >
                            {suppliers.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Expiry Timeline</label>
                        <select
                            className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            value={expiryStatusFilter}
                            onChange={(e) => setExpiryStatusFilter(e.target.value)}
                        >
                            <option>All</option>
                            <option>Expired</option>
                            <option>Expiring Soon (30 days)</option>
                            <option>Expiring in 3 months</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Table Container */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mx-1 md:mx-2 overflow-hidden mt-2">
                <ProductTable
                    products={products}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                    isLoading={isLoading}
                />
            </div>

            {/* Modals */}
            <AddProductModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingProduct(null);
                }}
                onSubmit={handleSaveProduct}
                initialData={editingProduct}
            />

            <BulkProductUploadModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onSuccess={() => refetch()}
            />
        </div>
    );
};

export default ProductsPage;
