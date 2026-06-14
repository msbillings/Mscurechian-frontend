'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pharmacyService } from '@/lib/integrations/services/pharmacy.service';
import { format } from 'date-fns';
import { Search, Printer, Calendar, Package, IndianRupee, Loader2, ChevronDown, ChevronRight, User, Phone, Clock, FileText } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const EODSalesReportPage = () => {
    const { user } = useAuthStore();
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const { data: salesData, isLoading } = useQuery({
        queryKey: pharmacyService.queryKeys.reports.eodSales(selectedDate),
        queryFn: () => pharmacyService.getEODItemWiseSales(selectedDate),
    });

    const filteredData = (salesData || []).filter((item: any) => 
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.generic || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalQty = filteredData.reduce((sum: number, item: any) => sum + item.totalQtySold, 0);
    const totalRevenue = filteredData.reduce((sum: number, item: any) => sum + item.totalRevenue, 0);

    const toggleRow = (id: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 text-gray-900 dark:text-white pb-20 pt-2 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 print:hidden">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">EOD Sales Report</h1>
                    <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wider">Item-wise Summary & Stock Tally</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="date" 
                            className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                            value={selectedDate}
                            max={format(new Date(), 'yyyy-MM-dd')}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        Print
                    </button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block text-center mb-8 pb-6 border-b-2 border-gray-200">
                <h1 className="text-2xl font-black uppercase tracking-tight">{(user as any)?.shopName || 'Pharmacy'}</h1>
                <h2 className="text-xl font-bold text-gray-700 mt-2">End of Day Sales Report</h2>
                <p className="text-sm font-semibold text-gray-500 mt-1">Date: {format(new Date(selectedDate), 'dd MMM yyyy')}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="p-4 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-xl">
                        <Package className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Units Sold</p>
                        <h3 className="text-2xl font-black mt-1">{totalQty.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl">
                        <IndianRupee className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Collection</p>
                        <h3 className="text-2xl font-black mt-1">₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden print:border-none print:shadow-none">
                <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                    <h3 className="text-lg font-bold">Item Wise Sales</h3>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search product..."
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-black/20 text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 print:bg-transparent">
                                <th className="px-4 py-4 w-8 print:hidden"></th>
                                <th className="px-4 py-4">Product Name</th>
                                <th className="px-4 py-4">Composition (Generic)</th>
                                <th className="px-4 py-4 text-right">Units Sold</th>
                                <th className="px-4 py-4 text-right">Total Revenue</th>
                                <th className="px-4 py-4 text-right">Closing Stock</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm font-semibold">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
                                        <p className="text-xs font-bold text-gray-500 uppercase mt-4">Generating Report...</p>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm font-bold uppercase">No sales found</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item: any, idx: number) => {
                                    const rowId = item._id || String(idx);
                                    const isExpanded = expandedRows.has(rowId);
                                    const sales = item.sales || [];

                                    return (
                                        <React.Fragment key={rowId}>
                                            {/* Product summary row */}
                                            <tr 
                                                className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                                onClick={() => toggleRow(rowId)}
                                            >
                                                <td className="px-4 py-4 print:hidden">
                                                    {sales.length > 0 && (
                                                        isExpanded 
                                                            ? <ChevronDown className="w-4 h-4 text-teal-500" /> 
                                                            : <ChevronRight className="w-4 h-4 text-gray-400" />
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="font-bold text-gray-900 dark:text-white uppercase">{item.productName}</p>
                                                </td>
                                                <td className="px-4 py-4 text-xs text-gray-500">{item.generic || '-'}</td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-black">{item.totalQtySold}</span>
                                                </td>
                                                <td className="px-4 py-4 text-right text-teal-600 font-bold">
                                                    ₹{item.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className={`px-2.5 py-1 rounded-md font-black ${item.stockRemaining <= 0 ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-600'}`}>
                                                        {Number((item.stockRemaining || 0).toFixed(2))}
                                                    </span>
                                                </td>
                                            </tr>

                                            {/* Expanded patient details */}
                                            {isExpanded && sales.length > 0 && (
                                                <tr className="print:table-row">
                                                    <td colSpan={6} className="px-0 py-0">
                                                        <div className="bg-gray-50/80 dark:bg-gray-900/30 border-y border-gray-100 dark:border-gray-700">
                                                            <div className="px-6 py-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800">
                                                                <User className="w-3.5 h-3.5 text-teal-500" />
                                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Patient-wise Breakup</span>
                                                            </div>
                                                            <table className="w-full">
                                                                <thead>
                                                                    <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                                        <th className="px-6 py-2.5 text-left">Patient</th>
                                                                        <th className="px-4 py-2.5 text-left">Phone</th>
                                                                        <th className="px-4 py-2.5 text-left">Invoice</th>
                                                                        <th className="px-4 py-2.5 text-right">Qty</th>
                                                                        <th className="px-4 py-2.5 text-right">Amount</th>
                                                                        <th className="px-6 py-2.5 text-right">Time</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
                                                                    {sales.map((sale: any, sIdx: number) => (
                                                                        <tr key={sIdx} className="text-xs hover:bg-white/60 dark:hover:bg-gray-800/40 transition-colors">
                                                                            <td className="px-6 py-2.5">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                                                                                        <User className="w-3 h-3 text-teal-600" />
                                                                                    </div>
                                                                                    <span className="font-bold text-gray-800 dark:text-gray-200 uppercase">{sale.patientName || 'Walk-in'}</span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-2.5 text-gray-500">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <Phone className="w-3 h-3" />
                                                                                    <span>{sale.customerPhone || '-'}</span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-2.5">
                                                                                <div className="flex items-center gap-1.5 text-indigo-600">
                                                                                    <FileText className="w-3 h-3" />
                                                                                    <span className="font-bold">{sale.invoiceNo || '-'}</span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-2.5 text-right font-bold text-gray-700 dark:text-gray-300">{sale.qty}</td>
                                                                            <td className="px-4 py-2.5 text-right font-bold text-teal-600">₹{Number(sale.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                            <td className="px-6 py-2.5 text-right text-gray-500">
                                                                                <div className="flex items-center gap-1.5 justify-end">
                                                                                    <Clock className="w-3 h-3" />
                                                                                    <span>{sale.time ? format(new Date(sale.time), 'hh:mm a') : '-'}</span>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                        {filteredData.length > 0 && (
                            <tfoot className="bg-gray-50 dark:bg-black/20 font-black border-t-2 border-gray-200 dark:border-gray-700 print:bg-transparent">
                                <tr>
                                    <td className="print:hidden"></td>
                                    <td colSpan={2} className="px-4 py-4 text-right uppercase tracking-wider text-gray-500 text-xs">Grand Total</td>
                                    <td className="px-4 py-4 text-right text-blue-700 text-base">{totalQty.toLocaleString()}</td>
                                    <td className="px-4 py-4 text-right text-teal-600 text-base">₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Print Only Footer */}
            <div className="hidden print:block mt-16 pt-8 border-t border-gray-300">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-xs font-semibold text-gray-500">Generated on {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
                        <p className="text-xs font-semibold text-gray-500">System generated report - CureChain Pharmacy</p>
                    </div>
                    <div className="text-center">
                        <div className="w-48 border-b border-gray-800 mb-2"></div>
                        <p className="text-sm font-bold uppercase">Pharmacist Signature</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EODSalesReportPage;
