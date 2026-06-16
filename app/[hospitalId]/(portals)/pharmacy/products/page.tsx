'use client';

import React, { useState, useEffect } from 'react';
import {
    Search,
    Plus,
    Filter,
    Download,
    FileSpreadsheet,
    ChevronDown,
    RefreshCcw,
    Trash2
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ProductService } from '@/lib/integrations/services/product.service';
import { PharmacyProduct, PharmacyProductPayload } from '@/lib/integrations/types/product';
import ProductTable from '@/components/pharmacy/products/ProductTable';
import AddProductModal from '@/components/pharmacy/products/AddProductModal';
import BulkProductUploadModal from '@/components/pharmacy/products/BulkProductUploadModal';
import { ConfirmModal } from '@/components/admin/Modal';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ProductsPage = () => {
    const [products, setProducts] = useState<PharmacyProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<PharmacyProduct | null>(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { }
    });
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);

    const searchParams = useSearchParams();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Stock');
    const [supplierFilter, setSupplierFilter] = useState('All Suppliers');
    const [expiryStatusFilter, setExpiryStatusFilter] = useState(searchParams.get('expiryStatus') || 'All');

    const fetchProducts = React.useCallback(async (page = 1) => {
        setIsLoading(true);
        try {
            const data = await ProductService.getProductsPaginated(
                page,
                20, // Limit
                {
                    search: searchTerm,
                    status: statusFilter === 'All Stock' ? undefined : statusFilter,
                    supplier: supplierFilter === 'All Suppliers' ? undefined : supplierFilter,
                    expiryStatus: expiryStatusFilter === 'All' ? undefined : expiryStatusFilter
                }
            );
            setProducts(data.products);
            setTotalPages(data.totalPages);
            setCurrentPage(data.currentPage);
            setTotalProducts(data.totalProducts);
        } catch (error) {
            console.error('Failed to fetch products:', error);
            toast.error('Failed to load inventory data');
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, statusFilter, supplierFilter, expiryStatusFilter]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchProducts(1);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [fetchProducts]);

    useEffect(() => {
        fetchProducts(currentPage);
    }, [currentPage, fetchProducts]);

    const handleSaveProduct = async (data: PharmacyProductPayload) => {
        try {
            if (editingProduct) {
                await ProductService.updateProduct(editingProduct._id, data);
                toast.success('Product updated');
            } else {
                await ProductService.addProduct(data);
                toast.success('Medicine added');
            }
            setIsModalOpen(false);
            setEditingProduct(null);
            fetchProducts();
        } catch (error: any) {
            console.error('Failed to save product:', error);
            toast.error(error.message || 'Failed to save product');
            throw error;
        }
    };

    const handleDeleteProduct = async (id: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Deregister SKU",
            message: `Warning: This will permanently remove the SKU "${name}" from the registry. Continue?`,
            onConfirm: async () => {
                setDeletingId(id);
                try {
                    await ProductService.deleteProduct(id);
                    toast.success('SKU deregistered');
                    fetchProducts();
                } catch (error) {
                    console.error('Failed to delete product:', error);
                    toast.error('Deregistration failed');
                } finally {
                    setDeletingId(null);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleDeleteAllProducts = async () => {
        setConfirmModal({
            isOpen: true,
            title: "Delete All Products",
            message: "CRITICAL WARNING: This will permanently delete ALL products and their associated stock/batches from your pharmacy. This action cannot be undone. Are you sure you want to proceed?",
            onConfirm: async () => {
                setDeletingId('all');
                try {
                    await ProductService.deleteAllProducts();
                    toast.success('All products deleted successfully');
                    fetchProducts(1);
                } catch (error) {
                    console.error('Failed to delete all products:', error);
                    toast.error('Failed to delete all products');
                } finally {
                    setDeletingId(null);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleEditProduct = (product: PharmacyProduct) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleExportExcel = async () => {
        const loadToast = toast.loading('Generating catalog manifest...');
        try {
            // Fetch all products (high limit) instead of just current page
            const allProducts = await ProductService.getProducts({ limit: 5000 });

            if (allProducts.length === 0) {
                toast.error('No registry data to export', { id: loadToast });
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Inventory Report');

            // 1. Transaction Report Heading
            worksheet.mergeCells('A1:M1');
            const titleRow = worksheet.getRow(1);
            titleRow.getCell(1).value = 'Full Catalog Audit';
            titleRow.getCell(1).font = { size: 16, bold: true, name: 'Arial', color: { argb: '1E293B' } };
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow.height = 35;

            // 2. Export Date
            worksheet.getCell('A3').value = 'Export Date:';
            worksheet.getCell('B3').value = new Date().toLocaleDateString('en-GB');
            worksheet.getCell('A3').font = { bold: true };

            worksheet.addRow([]); // Spacer

            // Comprehensive Columns (Match to User Image)
            const columns = [
                { header: 'SKU', width: 15 },
                { header: 'Generic Name', width: 25 },
                { header: 'Brand Name', width: 25 },
                { header: 'Strength', width: 15 },
                { header: 'Form *', width: 12 },
                { header: 'Schedule *', width: 12 },
                { header: 'MRP (₹) *', width: 12 },
                { header: 'GST %', width: 10 },
                { header: 'Current Stock', width: 15 },
                { header: 'Units Per Pack', width: 15 },
                { header: 'HSN Code', width: 15 },
                { header: 'Batch Number', width: 15 },
                { header: 'Expiry Date', width: 15 },
            ];

            // Header Row Styling
            const headerRow = worksheet.addRow(columns.map(c => c.header));
            headerRow.height = 25;
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } }; // Slate-800
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'medium' },
                    left: { style: 'thin' },
                    bottom: { style: 'medium' },
                    right: { style: 'thin' }
                };
            });

            // Add Data Rows
            allProducts.forEach((product, index) => {
                const row = worksheet.addRow([
                    product.sku,
                    product.genericName,
                    product.brandName,
                    product.strength || '-',
                    product.form || '-',
                    product.schedule || 'OTC',
                    product.mrp,
                    product.gst || 0,
                    product.currentStock,
                    product.unitsPerPack || 1,
                    product.hsnCode || '-',
                    product.batchNumber || '-',
                    product.expiryDate ? new Date(product.expiryDate).toLocaleDateString('en-GB') : '-'
                ]);

                // Style data cells
                row.eachCell((cell, colNumber) => {
                    // Standard alignment
                    if (colNumber <= 6 || colNumber >= 11) {
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    } else {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    }

                    // Zebra striping
                    if (index % 2 === 0) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
                    }

                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };

                    // Format Amount columns
                    if (colNumber === 7) {
                        cell.numFmt = '₹#,##0.00';
                    }
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const data = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(data, `Pharmacy_Catalog_Complete_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success(`Exported ${allProducts.length} products successfully`, { id: loadToast });
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export catalog', { id: loadToast });
        }
    };

    const suppliers = ['All Suppliers', ...Array.from(new Set(products.map(p => {
        if (typeof p.supplier === 'object' && p.supplier !== null) {
            return (p.supplier as any).name;
        }
        return p.supplier;
    }))).filter(Boolean)];

    return (
        <div className="space-y-4 md:space-y-6 pb-20 w-full max-w-7xl mx-auto overflow-x-hidden pt-2 md:pt-4">
            {/* Header Area from Model */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 w-full lg:w-auto">
                    <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white shrink-0">Products</h1>

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
                    <Link
                        href="/pharmacy/products/add"
                        className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        <span className="hidden sm:inline">Add Product</span>
                    </Link>

                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold transition-colors shadow-sm ${isFilterOpen ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50'}`}
                    >
                        <Filter size={14} />
                        <span className="hidden sm:inline">Filters</span>
                    </button>

                    <button
                        onClick={() => fetchProducts(currentPage)}
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

                    <button
                        onClick={handleDeleteAllProducts}
                        className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors shadow-sm ml-1"
                    >
                        <Trash2 size={16} />
                        <span className="hidden sm:inline">Delete All</span>
                    </button>

                    {/* Pagination Box */}
                    <div className="flex items-center gap-1 ml-auto lg:ml-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1 || isLoading}
                            className="p-1 px-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 border border-gray-200 dark:border-gray-700"
                        >
                            <ChevronDown className="rotate-90" size={16} />
                        </button>
                        <div className="bg-green-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                            {currentPage} / {totalPages}
                        </div>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || isLoading}
                            className="p-1 px-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 border border-gray-200 dark:border-gray-700"
                        >
                            <ChevronDown className="-rotate-90" size={16} />
                        </button>
                    </div>
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

            {/* Table Container with Pagination Info at Top */}
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
                onSuccess={fetchProducts}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                loading={!!deletingId}
            />
        </div>
    );
};

export default ProductsPage;
