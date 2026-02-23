'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PharmacyBillingService } from '@/lib/integrations/services/pharmacyBilling.service';
import { PharmacyBill } from '@/lib/integrations/types/pharmacyBilling';
import PharmacyBillPrint, { ShopDetails } from '@/components/pharmacy/billing/PharmacyBillPrint';
import { useAuthStore } from '@/stores/authStore';
import { Loader2, ArrowLeft, Printer, CheckCircle } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-hot-toast';
import { useTenantLink } from '@/hooks/useTenantLink';
const InvoicePreviewPage = () => {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuthStore();
    const { getPath } = useTenantLink();
    const [bill, setBill] = useState<PharmacyBill | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const componentRef = useRef<HTMLDivElement>(null);

    const invoiceId = params?.id as string;

    const shopDetails: ShopDetails = {
        name: (user as any)?.shopName || user?.name || 'Pharmacy Store',
        address: (user as any)?.address || 'No Address Provided',
        phone: (user as any)?.mobile || (user as any)?.phone || '-',
        email: (user as any)?.email || '-',
        gstin: (user as any)?.gstin || '-',
        dlNo: (user as any)?.licenseNo,
        logo: (user as any)?.image || (user as any)?.logo
    };

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: bill ? `Invoice_${bill.invoiceId}` : 'Invoice',
    });

    useEffect(() => {
        const fetchBill = async () => {
            if (!invoiceId) return;
            try {
                const data = await PharmacyBillingService.getBillById(invoiceId);
                setBill(data);
            } catch (error) {
                console.error("Failed to fetch bill", error);
                toast.error("Could not load invoice details");
            } finally {
                setIsLoading(false);
            }
        };

        fetchBill();
    }, [invoiceId]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Loading Invoice Metadata...</p>
                </div>
            </div>
        );
    }

    if (!bill) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <p className="text-xl font-black text-gray-900 dark:text-white mb-4">Invoice Not Found</p>
                    <button
                        onClick={() => router.push(getPath('/pharmacy/dashboard'))}
                        className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold uppercase tracking-wider"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-950 p-6 md:p-8">
            {/* Top Navigation */}
            <div className="max-w-7xl mx-auto flex items-center justify-between mb-8">
                <button
                    onClick={() => router.push(getPath('/pharmacy/dashboard'))}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                >
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>

                <div className="flex items-center gap-3">
                    <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-teal-200 flex items-center gap-1">
                        <CheckCircle size={12} /> Generated
                    </span>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-bold">Filesystem / Invoices / {bill.invoiceId}</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Actions Sidebar */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 sticky top-24">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-1">Actions</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-6">Manage Document</p>

                        <div className="space-y-4">
                            <button
                                onClick={() => handlePrint()}
                                className="w-full flex items-center justify-between p-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 group"
                            >
                                <span className="flex items-center gap-3">
                                    <Printer size={20} /> <span className="uppercase text-xs tracking-wider">Print Invoice</span>
                                </span>
                            </button>

                            <button
                                onClick={() => router.push(getPath('/pharmacy/dashboard'))}
                                className="w-full flex items-center justify-between p-4 bg-white text-gray-700 border border-gray-300 rounded-xl font-bold hover:bg-gray-50 group"
                            >
                                <span className="flex items-center gap-3">
                                    <ArrowLeft size={20} /> <span className="uppercase text-xs tracking-wider">Back to Dashboard</span>
                                </span>
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">MetaData</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 font-bold">Date</span>
                                    <span className="text-gray-900 dark:text-white font-mono">{new Date(bill.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 font-bold">Total</span>
                                    <span className="text-gray-900 dark:text-white font-mono">₹{bill.paymentSummary.grandTotal}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 font-bold">Items</span>
                                    <span className="text-gray-900 dark:text-white font-mono">{bill.items.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="lg:col-span-9">
                    <div className="bg-gray-200/50 dark:bg-gray-900/50 rounded-3xl p-8 md:p-12 flex justify-center items-start min-h-[800px] overflow-x-auto shadow-inner border border-gray-200 dark:border-gray-800">
                        <div className="shadow-2xl hover:scale-[1.005] origin-top">
                            <div ref={componentRef} style={{ width: '210mm', minHeight: '297mm', background: '#ffffff' }}>
                                <PharmacyBillPrint billData={bill} shopDetails={shopDetails} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePreviewPage;
