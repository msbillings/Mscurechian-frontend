'use client';

import React, {  useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    Search,
    Truck,
    RefreshCw,
} from 'lucide-react';
import { SupplierService } from '@/lib/integrations/services/supplier.service';
import { Supplier } from '@/lib/integrations/types/supplier';
import SupplierTable from '@/components/pharmacy/suppliers/SupplierTable';
import AddSupplierModal from '@/components/pharmacy/suppliers/AddSupplierModal';
import { toast } from 'react-hot-toast';

const SuppliersPage = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    // ✅ CRITICAL FIX: Use React Query instead of useState + useEffect
    const { data: suppliers = [], isLoading: loading, error } = useQuery<Supplier[]>({
        queryKey: ['hospital-admin-pharma-suppliers'],
        queryFn: async () => {
            const apiStartTime = performance.now();
            console.log(`[API] Starting suppliers fetch`);
            try {
                const data = await SupplierService.getSuppliers();
                const apiEndTime = performance.now();
                console.log(`[API] Suppliers fetch completed in ${(apiEndTime - apiStartTime).toFixed(2)}ms, returned ${data?.length || 0} suppliers`);
                return data || [];
            } catch (error) {
                console.error('Failed to fetch suppliers:', error);
                toast.error('Failed to load supplier network');
                throw error;
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes cache
        gcTime: 15 * 60 * 1000,
        retry: 1,
    });

    const handleDelete = async (id: string) => {
        if (!window.confirm('Warning: Deleting this vendor will unlink them from all associated SKUs. Proceed?')) return;

        try {
            await SupplierService.deleteSupplier(id);
            toast.success('Vendor profile terminated');
            queryClient.invalidateQueries({ queryKey: ['hospital-admin-pharma-suppliers'] });
        } catch (error) {
            toast.error('Operation failed');
        }
    };

    const handleEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setIsAddModalOpen(true);
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone.includes(searchTerm) ||
        (s.gstNumber && s.gstNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-3 md:p-8 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Simple Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Supplier Network</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1 italic tracking-tight">Vendor Management & Institutional Procurement Hub</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['hospital-admin-pharma-suppliers'] })}
                        className="p-2.5 bg-white text-slate-400 border border-slate-200 rounded-xl hover:text-slate-900 transition-all font-black"
                    >
                        <RefreshCw size={18} strokeWidth={3} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => {
                            setEditingSupplier(null);
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-3 md:px-6 py-2.5 bg-primary-theme text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all shadow-sm"
                    >
                        <Plus size={14} strokeWidth={3} /> Add Vendor
                    </button>
                </div>
            </div>

            {/* Simple Controller */}
            <div className="bg-white p-2 md:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by vendor nomenclature, contact digits, or GSTIN taxonomy..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                </div>
                <div className="px-5 py-2 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-4 min-w-[140px]">
                    <div>
                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Active Nodes</p>
                        <p className="text-sm md:text-lg font-black text-slate-900 leading-none italic">{filteredSuppliers.length}</p>
                    </div>
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Truck size={16} strokeWidth={3} />
                    </div>
                </div>
            </div>

            {/* Clean Vendor List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <SupplierTable
                    suppliers={filteredSuppliers}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isLoading={loading}
                />
            </div>

            {/* Modals */}
            <AddSupplierModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['hospital-admin-pharma-suppliers'] })}
                initialData={editingSupplier}
            />
        </div>
    );
};

export default SuppliersPage;
