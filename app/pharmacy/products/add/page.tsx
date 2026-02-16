'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ChevronLeft, 
    Pill, 
    Box, 
    Building2, 
    DollarSign, 
    Calendar,
    Save,
    Info,
    Warehouse
} from 'lucide-react';
import { ProductService } from '@/lib/integrations/services/product.service';
import { SupplierService } from '@/lib/integrations/services/supplier.service';
import { PharmacyProductPayload } from '@/lib/integrations/types/product';
import { Supplier } from '@/lib/integrations/types/supplier';
import { toast } from 'react-hot-toast';

const AddProductPage = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    
    const [formData, setFormData] = useState<PharmacyProductPayload>({
        sku: '',
        genericName: '',
        brandName: '',
        strength: '',
        form: 'TABLET',
        schedule: 'OTC',
        mrp: 0,
        gst: 12,
        currentStock: 0,
        minStockLevel: 10,
        unitsPerPack: 1,
        supplier: '',
        hsnCode: '',
        batchNumber: '',
        expiryDate: '',
    });

    React.useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const data = await SupplierService.getSuppliers();
                setSuppliers(data);
            } catch (error) {
                console.error('Failed to fetch suppliers');
            }
        };
        fetchSuppliers();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.supplier) {
            toast.error('Please select a supplier');
            return;
        }
        setLoading(true);
        try {
            await ProductService.addProduct(formData);
            toast.success('Medicine registered successfully');
            router.push('/pharmacy/products');
        } catch (error: any) {
            toast.error(error.message || 'Failed to save product');
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none";
    const labelClasses = "text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block flex items-center gap-2";

    return (
        <div className="max-w-3xl mx-auto pb-20 pt-8 px-4">
            {/* Simple Breadcrumb/Back */}
            <button 
                onClick={() => router.back()}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors mb-6"
            >
                <ChevronLeft size={16} />
                Back to Registry
            </button>

            <div className="mb-10">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Register New Medicine</h1>
                <p className="text-sm text-gray-500">Add detailed information to register a new product in your pharmacy inventory.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Identification */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 text-teal-600">
                        <Info size={18} />
                        <h3 className="font-bold">Basic Information</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className={labelClasses}>Medicine / Item Name (Generic)</label>
                            <input name="genericName" value={formData.genericName} onChange={handleChange} required placeholder="e.g. Paracetamol IP" className={inputClasses} />
                        </div>
                        <div>
                            <label className={labelClasses}>Brand Name</label>
                            <input name="brandName" value={formData.brandName} onChange={handleChange} required placeholder="e.g. Crocin" className={inputClasses} />
                        </div>
                        <div>
                            <label className={labelClasses}>SKU / Item Code</label>
                            <input name="sku" value={formData.sku} onChange={handleChange} required placeholder="e.g. SKU-12345" className={inputClasses} />
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:col-span-2">
                            <div>
                                <label className={labelClasses}>Strength</label>
                                <input name="strength" value={formData.strength} onChange={handleChange} required placeholder="e.g. 500mg" className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>Form factor</label>
                                <select name="form" value={formData.form} onChange={handleChange} required className={inputClasses}>
                                    <option value="TABLET">Tablet</option>
                                    <option value="CAPSULE">Capsule</option>
                                    <option value="SYRUP">Syrup</option>
                                    <option value="INJECTION">Injection</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logistics & Stock */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 text-blue-600">
                        <Warehouse size={18} />
                        <h3 className="font-bold">Logistics & Supply Chain</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className={labelClasses}>Supplier / Distributor</label>
                            <select name="supplier" value={formData.supplier} onChange={handleChange} required className={inputClasses}>
                                <option value="">Select an authorized supplier</option>
                                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClasses}><Box size={14} /> Opening Stock</label>
                            <input type="number" name="currentStock" value={formData.currentStock} onChange={handleChange} className={inputClasses} />
                        </div>
                        <div>
                            <label className={labelClasses}>Min Stock Alert</label>
                            <input type="number" name="minStockLevel" value={formData.minStockLevel} onChange={handleChange} className={inputClasses} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelClasses}><Calendar size={14} /> Expiry Date</label>
                            <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className={inputClasses} />
                        </div>
                    </div>
                </div>

                {/* Pricing */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 text-emerald-600">
                        <DollarSign size={18} />
                        <h3 className="font-bold">Pricing & Taxation</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className={labelClasses}>MRP (Target Price)</label>
                            <input type="number" name="mrp" value={formData.mrp} onChange={handleChange} required step="0.01" className={inputClasses} />
                        </div>
                        <div>
                            <label className={labelClasses}>GST (%)</label>
                            <select name="gst" value={formData.gst} onChange={handleChange} className={inputClasses}>
                                {[0, 5, 12, 18, 28].map(v => <option key={v} value={v}>{v}%</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClasses}>HSN / SAC Code</label>
                            <input name="hsnCode" value={formData.hsnCode} onChange={handleChange} placeholder="e.g. 3004" className={inputClasses} />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4">
                    <button 
                        type="button" 
                        onClick={() => router.back()}
                        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        disabled={loading}
                        className="px-8 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 shadow-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save size={16} />
                                Register Medicine
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddProductPage;
