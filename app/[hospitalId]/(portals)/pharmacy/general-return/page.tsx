'use client';

import React, { useState } from 'react';
import { Undo2, Search, Package, IndianRupee, RotateCcw, AlertCircle, FileText } from 'lucide-react';
import { apiClient } from '@/lib/integrations/api/apiClient';
import toast from 'react-hot-toast';

export default function GeneralReturnPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [invoice, setInvoice] = useState<any>(null);
    const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
    const [refundMode, setRefundMode] = useState<string>('CASH');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const searchInvoice = async () => {
        if (!searchQuery.trim()) {
            toast.error("Please enter an invoice number to search");
            return;
        }

        try {
            setIsSearching(true);
            setInvoice(null);
            setReturnQuantities({});

            // Find invoice logic
            // Assuming getInvoices returns paginated list. Let's use it for searching by invoiceNo.
            const response = await apiClient(`/pharmacy/invoices?search=${encodeURIComponent(searchQuery)}&limit=1`) as any;
            
            if (response.data && response.data.length > 0) {
                // To get full populated items, we might need to fetch by ID
                const fullInvoice = await apiClient(`/pharmacy/invoices/${response.data[0]._id}`) as any;
                setInvoice(fullInvoice.data);
            } else {
                toast.error("No invoice found with that number");
            }
        } catch (error: any) {
            console.error("Search error", error);
            toast.error(error.message || "Failed to search invoice");
        } finally {
            setIsSearching(false);
        }
    };

    const handleReturnQtyChange = (drugId: string, qty: number, maxQty: number) => {
        if (qty < 0) qty = 0;
        if (qty > maxQty) qty = maxQty;
        
        setReturnQuantities(prev => ({
            ...prev,
            [drugId]: qty
        }));
    };

    const calculateTotalRefund = () => {
        if (!invoice) return 0;
        let total = 0;
        invoice.items.forEach((item: any) => {
            const returnQty = returnQuantities[item.drug._id] || 0;
            if (returnQty > 0) {
                const unitRefund = item.amount / item.qty;
                total += unitRefund * returnQty;
            }
        });
        return total;
    };

    const submitReturn = async () => {
        const returnItems = Object.entries(returnQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([drugId, returnQty]) => ({ drugId, returnQty }));

        if (returnItems.length === 0) {
            toast.error("Please enter return quantities for at least one item");
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await apiClient(`/pharmacy/invoices/${invoice._id}/return`, {
                method: 'POST',
                body: JSON.stringify({ returnItems, refundMode })
            }) as any;

            if (response.success) {
                toast.success(`Successfully returned items. Refund amount: ₹${response.refundAmount.toFixed(2)}`);
                // Refresh invoice data
                const fullInvoice = await apiClient(`/pharmacy/invoices/${invoice._id}`) as any;
                setInvoice(fullInvoice.data);
                setReturnQuantities({});
            }
        } catch (error: any) {
            console.error("Return error", error);
            toast.error(error.message || "Failed to process return");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                            <Undo2 size={20} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">General Medicine Return</h1>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 ml-13">Process returns and deduct from past invoices</p>
                </div>
            </div>

            {/* Search Box */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Search Invoice
                </label>
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && searchInvoice()}
                            placeholder="Enter Invoice Number (e.g., INV-1234)"
                            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-all"
                        />
                    </div>
                    <button 
                        onClick={searchInvoice} 
                        disabled={isSearching || !searchQuery.trim()}
                        className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isSearching ? 'Searching...' : 'Find Invoice'}
                    </button>
                </div>
            </div>

            {/* Invoice Details & Return Form */}
            {invoice && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <FileText size={18} className="text-teal-600" />
                                Invoice: {invoice.invoiceNo}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Patient: <span className="font-medium text-gray-700">{invoice.patientName || 'N/A'}</span> • 
                                Date: {new Date(invoice.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Net Payable</p>
                            <p className="text-xl font-black text-gray-900">₹{invoice.netPayable?.toFixed(2)}</p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                                invoice.status === 'RETURN' ? 'bg-rose-100 text-rose-800' : 'bg-green-100 text-green-800'
                            }`}>
                                {invoice.status}
                            </span>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Purchased</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Already Returned</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Available</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Unit Price</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-rose-600 uppercase tracking-wider">Return Qty</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {invoice.items.map((item: any, idx: number) => {
                                        const returnedQty = item.returnedQty || 0;
                                        const availableQty = item.qty - returnedQty;
                                        const unitPrice = item.amount / item.qty;
                                        const currentReturnQty = returnQuantities[item.drug._id] || 0;

                                        return (
                                            <tr key={idx} className={availableQty === 0 ? 'bg-gray-50 opacity-60' : ''}>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-8 w-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                                                            <Package size={16} />
                                                        </div>
                                                        <div className="ml-3">
                                                            <div className="text-sm font-bold text-gray-900">{item.productName}</div>
                                                            <div className="text-xs text-gray-500">Batch: {item.batchNo}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900 font-medium">
                                                    {item.qty}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                                    {returnedQty}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-bold text-teal-600">
                                                    {availableQty}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-medium">
                                                    ₹{unitPrice.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={availableQty}
                                                        value={currentReturnQty || ''}
                                                        onChange={(e) => handleReturnQtyChange(item.drug._id, parseInt(e.target.value) || 0, availableQty)}
                                                        disabled={availableQty === 0}
                                                        className="w-20 text-center border border-gray-300 rounded-md py-1 focus:ring-rose-500 focus:border-rose-500 disabled:bg-gray-100 disabled:text-gray-400"
                                                        placeholder="0"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary & Action */}
                        <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div className="flex items-center gap-2 text-rose-600 text-sm font-medium">
                                <AlertCircle size={16} />
                                Returning items will restore inventory and deduct from the bill.
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Refund Method</p>
                                    <select
                                        value={refundMode}
                                        onChange={(e) => setRefundMode(e.target.value)}
                                        className="border border-gray-300 rounded-lg px-3 py-1 text-sm font-bold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                                    >
                                        <option value="CASH">CASH</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CARD">CARD</option>
                                        <option value="MIXED">MIXED</option>
                                    </select>
                                </div>
                                <div className="text-right border-l border-gray-200 pl-6">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Refund</p>
                                    <p className="text-2xl font-black text-rose-600">₹{calculateTotalRefund().toFixed(2)}</p>
                                </div>
                                <button
                                    onClick={submitReturn}
                                    disabled={isSubmitting || calculateTotalRefund() === 0 || invoice.status === 'RETURN'}
                                    className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-8 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <RotateCcw size={18} />
                                    {isSubmitting ? 'Processing...' : 'Process Return'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
