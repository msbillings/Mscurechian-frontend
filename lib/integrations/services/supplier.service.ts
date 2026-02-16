import { apiClient } from "../api";
import { Supplier, SupplierPayload } from "../types/supplier";
import { PharmacyProduct } from "../types/product";
import { PHARMACY_ENDPOINTS } from "../config/endpoints";

export const SupplierService = {
    getSuppliers: async (): Promise<Supplier[]> => {
        const response: any = await apiClient<any>(PHARMACY_ENDPOINTS.SUPPLIERS.BASE, {
            method: 'GET'
        });
        const suppliers = response.data || [];
        return suppliers.map((s: any) => ({
            ...s,
            address: s.address && typeof s.address === 'object'
                ? `${s.address.street || ''}, ${s.address.city || ''}, ${s.address.state || ''} - ${s.address.pincode || ''}`.replace(/^, |, , /g, '').trim()
                : s.address
        }));
    },

    getSupplierById: async (id: string): Promise<Supplier> => {
        return apiClient<Supplier>(PHARMACY_ENDPOINTS.SUPPLIERS.BY_ID(id), {
            method: 'GET'
        });
    },

    createSupplier: async (data: SupplierPayload): Promise<{ message: string; supplier: Supplier }> => {
        return apiClient<{ message: string; supplier: Supplier }>(PHARMACY_ENDPOINTS.SUPPLIERS.BASE, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    updateSupplier: async (id: string, data: Partial<SupplierPayload>): Promise<{ message: string; supplier: Supplier }> => {
        return apiClient<{ message: string; supplier: Supplier }>(PHARMACY_ENDPOINTS.SUPPLIERS.BY_ID(id), {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    deleteSupplier: async (id: string): Promise<{ message: string }> => {
        return apiClient<{ message: string }>(PHARMACY_ENDPOINTS.SUPPLIERS.BY_ID(id), {
            method: 'DELETE'
        });
    },

    getSupplierProducts: async (id: string): Promise<PharmacyProduct[]> => {
        const response: any = await apiClient<any>(PHARMACY_ENDPOINTS.SUPPLIERS.PRODUCTS(id), {
            method: 'GET'
        });
        const products = response.data || [];
        return products.map((p: any) => ({
            ...p,
            brandName: p.brand,
            genericName: p.generic,
            currentStock: p.stock,
            minStockLevel: p.minStock
        }));
    }
};
