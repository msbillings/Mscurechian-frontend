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
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Simple Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Institutional Registry</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1 italic tracking-tight">Global SKU Management & Stock Oversight</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsBulkModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                        <FileSpreadsheet size={14} strokeWidth={3} /> Bulk Manifest
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                        <Download size={14} strokeWidth={3} /> Export Audit
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary-theme text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all shadow-sm"
                    >
                        <Plus size={14} strokeWidth={3} /> Onboard SKU
                    </button>
                </div>
            </div>

            {/* Simple Controller */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by nomenclature, composition, or SKU signature..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`p-2.5 rounded-xl border transition-all ${isFilterOpen ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 hover:text-slate-900'}`}
                    >
                        <Filter size={18} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => refetch()}
                        className="p-2.5 bg-white text-slate-400 border border-slate-200 rounded-xl hover:text-slate-900 transition-all"
                    >
                        <RefreshCcw size={18} strokeWidth={2.5} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <div className="h-8 w-px bg-slate-100 hidden md:block mx-1" />
                    <button className="p-2.5 bg-white text-slate-400 border border-slate-200 rounded-xl hover:text-slate-900 transition-all">
                        <LayoutGrid size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Simple Filters Grid */}
            {isFilterOpen && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    {[
                        { label: 'Stock Threshold', value: statusFilter, setter: setStatusFilter, options: ['All Stock', 'In Stock', 'Low Stock', 'Out of Stock'] },
                        { label: 'Vendor Origin', value: supplierFilter, setter: setSupplierFilter, options: suppliers },
                        { label: 'Stability Status', value: expiryStatusFilter, setter: setExpiryStatusFilter, options: ['All', 'Expired', 'Expiring Soon (30 days)', 'Expiring in 3 months'] }
                    ].map((filter, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 leading-none">{filter.label}</p>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer appearance-none"
                                value={filter.value}
                                onChange={(e) => filter.setter(e.target.value)}
                            >
                                {filter.options.map(opt => <option key={opt}>{opt}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
            )}

            {/* Clean Registry */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <ProductTable
                    products={products}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                    isLoading={isLoading}
                />
            </div>

            {/* Registry Modals */}
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
