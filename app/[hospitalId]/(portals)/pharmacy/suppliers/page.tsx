'use client';

import React, { useState, useEffect } from 'react';
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
import { ConfirmModal } from '@/components/admin/Modal';
import { toast } from 'react-hot-toast';

const SuppliersPage = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { }
    });
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const data = await SupplierService.getSuppliers();
            setSuppliers(data);
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
            toast.error('Failed to load supplier network');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Terminate Vendor",
            message: `Warning: Deleting ${name} will unlink them from all associated SKUs in the registry. Proceed?`,
            onConfirm: async () => {
                setDeletingId(id);
                try {
                    await SupplierService.deleteSupplier(id);
                    toast.success('Vendor profile terminated');
                    fetchSuppliers();
                } catch (error) {
                    toast.error('Operation failed');
                } finally {
                    setDeletingId(null);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
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
        <div className="space-y-6 md:space-y-8 pb-20 w-full max-w-[100vw] overflow-x-hidden">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-2">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Suppliers</h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Vendor Management & Network</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search Bar - Integrated in Header */}
                    <div className="relative min-w-[300px] xl:min-w-[450px]">
                        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search suppliers by name, phone, or GST..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none dark:text-white shadow-sm font-medium"
                        />
                    </div>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm"
                    >
                        <Plus size={18} />
                        Add Vendor
                    </button>

                    <button
                        onClick={fetchSuppliers}
                        className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 hover:text-teal-600 hover:border-teal-200 transition-all shadow-sm"
                        title="Refresh List"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* List Section */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/30 dark:bg-gray-800/20">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Active Supplier Network</span>
                    </div>
                    <div className="flex items-center gap-3">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Total <span className="text-teal-600">{filteredSuppliers.length}</span> Vendors
                        </span>
                    </div>
                </div>

                <div className="w-full">
                    <SupplierTable
                        suppliers={filteredSuppliers}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        isLoading={loading}
                    />
                </div>
            </div>

            {/* Modals */}
            <AddSupplierModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingSupplier(null);
                }}
                onSuccess={fetchSuppliers}
                initialData={editingSupplier}
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

export default SuppliersPage;
