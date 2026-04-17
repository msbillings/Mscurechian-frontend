'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
    AreaChart, Area
} from 'recharts';
import {
    Pill, FlaskConical, Building2, Users,
    Search, Download
} from 'lucide-react';
import { apiClient } from '@/lib/integrations/api/apiClient';
import { HOSPITAL_ADMIN_ENDPOINTS } from '@/lib/integrations/config/endpoints';
import { Card } from '@/components/admin/Card';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const AnalyticsPage = () => {
    const [range, setRange] = useState('30d');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Fetch Current Data
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['hospital-analytics-v4', range, startDate, endDate],
        queryFn: async () => {
            const url = new URL(`${window.location.origin}${HOSPITAL_ADMIN_ENDPOINTS.ANALYTICS}`);
            url.searchParams.append('range', range);
            if (startDate) url.searchParams.append('startDate', startDate);
            if (endDate) url.searchParams.append('endDate', endDate);
            return await apiClient<any>(url.pathname + url.search);
        },
        staleTime: 60000, // 1 min cache for analytics
        gcTime: 15 * 60 * 1000,
        placeholderData: (previousData) => previousData, 
    });

    const summary = data?.summary || {};
    const trends = data?.revenueTrends || [];
    const bedStats = data?.bedManagement || { vacant: 0, occupied: 0, cleaning: 0, blocked: 0 };
    const doctors = data?.doctorPerformance || [];
    const depts = data?.departmentDistribution || [];

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    // ✅ PERFORMANCE: Memoize shared calculations
    const { totalRevenue, totalBeds, bedUtilization, avgLengthOfStay } = React.useMemo(() => {
        const rev = (summary.appointments?.totalRevenue || 0) + (summary.ipd?.totalRevenue || 0) + (summary.pharmacy?.totalRevenue || 0) + (summary.lab?.totalRevenue || 0);
        const beds = (Number(bedStats.vacant) || 0) + (Number(bedStats.occupied) || 0) + (Number(bedStats.cleaning) || 0) + (Number(bedStats.blocked) || 0);
        const util = beds > 0 ? Math.round((Number(bedStats.occupied) / beds) * 100) : 0;
        const stay = summary.ipd?.avgLengthOfStay || 0;
        return { totalRevenue: rev, totalBeds: beds, bedUtilization: util, avgLengthOfStay: stay };
    }, [summary, bedStats]);

    const getMetricDetails = React.useCallback((stat: any, idx: number) => {
        const details = {
            0: {
                title: 'OPD Revenue Stream',
                items: [
                    { label: 'Total Patients', value: summary.appointments?.aptCount || summary.appointments?.totalCount || 0 },
                    { label: 'Avg Revenue', value: formatCurrency(summary.appointments?.averageRevenue || 0) },
                    { label: 'Total Revenue', value: formatCurrency(summary.appointments?.totalRevenue || 0) },
                    { label: 'Share', value: totalRevenue > 0 ? `${Math.round((summary.appointments?.totalRevenue || 0) / totalRevenue * 100)}%` : '0%' }
                ],
                insight: `OPD generated ${formatCurrency(summary.appointments?.totalRevenue || 0)} from ${summary.appointments?.aptCount || summary.appointments?.totalCount || 0} consultations.`
            },
            1: {
                title: 'IPD Financial Hub',
                items: [
                    { label: 'Admissions', value: summary.ipd?.admissionCount || summary.ipd?.totalAdmissions || 0 },
                    { label: 'Avg Stay', value: avgLengthOfStay > 0 ? `${avgLengthOfStay.toFixed(1)} Days` : 'N/A' },
                    { label: 'Bed Util.', value: `${bedUtilization}%` },
                    { label: 'Occupied', value: bedStats.occupied || 0 }
                ],
                insight: `${summary.ipd?.admissionCount || summary.ipd?.totalAdmissions || 0} admissions with ${bedUtilization}% bed occupancy. Average stay: ${avgLengthOfStay > 0 ? avgLengthOfStay.toFixed(1) : 'N/A'} days.`
            },
            2: {
                title: 'Pharmacy Node',
                items: [
                    { label: 'Bills Issued', value: summary.pharmacy?.billCount || summary.pharmacy?.totalBills || 0 },
                    { label: 'Total Revenue', value: formatCurrency(summary.pharmacy?.totalRevenue || 0) },
                    { label: 'Avg Bill', value: formatCurrency((summary.pharmacy?.totalRevenue || 0) / Math.max(1, summary.pharmacy?.billCount || summary.pharmacy?.totalBills || 1)) },
                    { label: 'Share', value: totalRevenue > 0 ? `${Math.round((summary.pharmacy?.totalRevenue || 0) / totalRevenue * 100)}%` : '0%' }
                ],
                insight: `Pharmacy processed ${summary.pharmacy?.billCount || summary.pharmacy?.totalBills || 0} transactions totaling ${formatCurrency(summary.pharmacy?.totalRevenue || 0)}.`
            },
            3: {
                title: 'Laboratory Intelligence',
                items: [
                    { label: 'Tests Run', value: summary.lab?.orderCount || summary.lab?.totalTests || 0 },
                    { label: 'Total Revenue', value: formatCurrency(summary.lab?.totalRevenue || 0) },
                    { label: 'Per Test Avg', value: formatCurrency((summary.lab?.totalRevenue || 0) / Math.max(1, summary.lab?.orderCount || summary.lab?.totalTests || 1)) },
                    { label: 'Share', value: totalRevenue > 0 ? `${Math.round((summary.lab?.totalRevenue || 0) / totalRevenue * 100)}%` : '0%' }
                ],
                insight: `Laboratory completed ${summary.lab?.orderCount || summary.lab?.totalTests || 0} tests generating ${formatCurrency(summary.lab?.totalRevenue || 0)} in revenue.`
            }
        };
        return details[idx as keyof typeof details] || details[0];
    }, [summary, bedStats, totalRevenue, totalBeds, bedUtilization, avgLengthOfStay]);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const workbook = new ExcelJS.Workbook();

            // --- Common Styles ---
            const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } } as ExcelJS.Fill; // Black
            const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } } as ExcelJS.Fill; // Light Gray
            const whiteFont = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            const titleFont = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
            const borderStyle: Partial<ExcelJS.Borders> = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            // --- Sheet 1: Executive Summary ---
            const summarySheet = workbook.addWorksheet('Executive Summary');

            // Title
            summarySheet.mergeCells('A1:D1');
            const titleRow = summarySheet.getRow(1);
            titleRow.getCell(1).value = 'HOSPITAL ANALYTICS EXECUTIVE DASHBOARD';
            titleRow.getCell(1).fill = headerFill;
            titleRow.getCell(1).font = titleFont;
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow.height = 30;

            // Meta
            summarySheet.mergeCells('A2:D2');
            const metaRow = summarySheet.getRow(2);
            metaRow.getCell(1).value = `Report Generated: ${new Date().toLocaleString()} | Range: ${range.toUpperCase()}`;
            metaRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            metaRow.getCell(1).font = { italic: true, size: 10 };

            summarySheet.addRow([]);

            // Financial Performance Section
            const finHeaderRow = summarySheet.addRow(['FINANCIAL PERFORMANCE METRICS']);
            summarySheet.mergeCells(`A${finHeaderRow.number}:D${finHeaderRow.number}`);
            finHeaderRow.getCell(1).font = { bold: true, size: 12 };
            finHeaderRow.getCell(1).fill = subHeaderFill;

            const tableHeader = summarySheet.addRow(['Department / Unit', 'Revenue Generated', 'Status', 'Notes']);
            tableHeader.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
                cell.font = whiteFont;
                cell.alignment = { horizontal: 'center' };
                cell.border = borderStyle as ExcelJS.Borders;
            });

            const totalDocRevenue = (doctors || []).reduce((acc: number, curr: any) => acc + (curr.revenue || 0), 0);

            const statsData = [
                ['OPD Operations', summary.appointments?.totalRevenue || 0, 'Active', 'Outpatient flow'],
                ['IPD Admissions', summary.ipd?.totalRevenue || 0, 'Stable', 'Inpatient retention'],
                ['Pharmacy Sales', summary.pharmacy?.totalRevenue || 0, 'Growth', 'Retail pharmacy'],
                ['Laboratory Services', summary.lab?.totalRevenue || 0, 'High Perf.', 'Diagnostic revenue'],
                ['Professional Fees (Doctors)', totalDocRevenue, 'Direct', 'Generated by consultations'],
            ];

            let totalRev = 0;
            statsData.forEach(row => {
                totalRev += (row[1] as number);
                const r = summarySheet.addRow(row);
                r.getCell(2).numFmt = '₹#,##0.00';
                r.eachCell(cell => cell.border = borderStyle as ExcelJS.Borders);
            });

            // Total Row
            const totalRow = summarySheet.addRow(['TOTAL AGGREGATE REVENUE', totalRev, '', '']);
            totalRow.getCell(1).font = { bold: true };
            totalRow.getCell(2).font = { bold: true };
            totalRow.getCell(2).numFmt = '₹#,##0.00';
            totalRow.eachCell(cell => {
                cell.fill = subHeaderFill;
                cell.border = borderStyle as ExcelJS.Borders;
            });

            summarySheet.addRow([]);

            // Bed Status Section
            const bedHeaderRow = summarySheet.addRow(['BED OCCUPANCY STATUS']);
            summarySheet.mergeCells(`A${bedHeaderRow.number}:D${bedHeaderRow.number}`);
            bedHeaderRow.getCell(1).font = { bold: true, size: 12 };
            bedHeaderRow.getCell(1).fill = subHeaderFill;

            const bedTableHead = summarySheet.addRow(['Category', 'Count', 'Percentage', '']);
            bedTableHead.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
                cell.font = whiteFont;
                cell.border = borderStyle as ExcelJS.Borders;
            });

            const totalBeds = (Number(bedStats.vacant) || 0) + (Number(bedStats.occupied) || 0) + (Number(bedStats.cleaning) || 0) + (Number(bedStats.blocked) || 0);

            [
                ['Vacant', bedStats.vacant],
                ['Occupied', bedStats.occupied],
                ['Cleaning', bedStats.cleaning],
                ['Blocked', bedStats.blocked]
            ].forEach(row => {
                const r = summarySheet.addRow([
                    row[0],
                    row[1],
                    totalBeds > 0 ? (Number(row[1]) / totalBeds) : 0,
                    ''
                ]);
                r.getCell(3).numFmt = '0.0%';
                r.eachCell(cell => cell.border = borderStyle as ExcelJS.Borders);
            });

            // Total Bed Row
            const bedTotalRow = summarySheet.addRow(['TOTAL BEDS', totalBeds, '100.0%', '']);
            bedTotalRow.eachCell(cell => {
                cell.font = { bold: true };
                cell.fill = subHeaderFill;
                cell.border = borderStyle as ExcelJS.Borders;
            });

            summarySheet.getColumn(1).width = 30;
            summarySheet.getColumn(2).width = 20;
            summarySheet.getColumn(3).width = 20;
            summarySheet.getColumn(4).width = 35;


            // --- Sheet 2: Doctor Performance ---
            const docSheet = workbook.addWorksheet('Doctor Performance');

            // Header
            docSheet.mergeCells('A1:E1');
            const docTitle = docSheet.getRow(1);
            docTitle.getCell(1).value = 'CLINICAL PERFORMANCE REPORT';
            docTitle.getCell(1).fill = headerFill;
            docTitle.getCell(1).font = titleFont;
            docTitle.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            docTitle.height = 30;

            docSheet.addRow([]);

            const docHead = docSheet.addRow(['Doctor Name', 'Department', 'Patients Consulted', 'Revenue Generated', 'Efficiency Rating']);
            docHead.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
                cell.font = whiteFont;
                cell.alignment = { horizontal: 'center' };
                cell.border = borderStyle as ExcelJS.Borders;
            });

            let totalPatients = 0;
            let totalDocRev = 0;

            (doctors || []).forEach((doc: any) => {
                totalPatients += (doc.count || 0);
                totalDocRev += (doc.revenue || 0);
                const r = docSheet.addRow([
                    doc.name,
                    doc.department,
                    doc.count,
                    doc.revenue,
                    doc.count > 50 ? 'High' : 'Normal'
                ]);
                r.getCell(4).numFmt = '₹#,##0.00';
                r.eachCell(cell => cell.border = borderStyle as ExcelJS.Borders);
            });

            // Doctor Performance Totals
            const docTotalRow = docSheet.addRow(['TOTAL PERFORMANCE', '', totalPatients, totalDocRev, '']);
            docTotalRow.getCell(4).numFmt = '₹#,##0.00';
            docTotalRow.eachCell(cell => {
                cell.font = { bold: true };
                cell.fill = subHeaderFill;
                cell.border = borderStyle as ExcelJS.Borders;
            });

            docSheet.getColumn(1).width = 30;
            docSheet.getColumn(2).width = 25;
            docSheet.getColumn(3).width = 20;
            docSheet.getColumn(4).width = 25;
            docSheet.getColumn(5).width = 20;


            // --- Sheet 3: Financial Trends ---
            const trendSheet = workbook.addWorksheet('Daily Trends');

            trendSheet.mergeCells('A1:C1');
            const trendTitle = trendSheet.getRow(1);
            trendTitle.getCell(1).value = 'DAILY REVENUE TRAJECTORY';
            trendTitle.getCell(1).fill = headerFill;
            trendTitle.getCell(1).font = titleFont;
            trendTitle.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            trendTitle.height = 30;

            trendSheet.addRow([]);

            const trendHead = trendSheet.addRow(['Date', 'Net Revenue', 'Trend Indicator']);
            trendHead.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
                cell.font = whiteFont;
                cell.alignment = { horizontal: 'center' };
                cell.border = borderStyle as ExcelJS.Borders;
            });

            let prevVal = 0;
            (trends || []).forEach((t: any) => {
                const val = Number(t.total);
                const trend = val > prevVal ? '↑ Up' : val < prevVal ? '↓ Down' : '- Stable';
                prevVal = val;

                const r = trendSheet.addRow([
                    new Date(t.date).toLocaleDateString(),
                    val,
                    trend
                ]);
                r.getCell(2).numFmt = '₹#,##0.00';

                // Monochrome trend indicator
                if (trend.includes('Up')) r.getCell(3).font = { bold: true };
                if (trend.includes('Down')) r.getCell(3).font = { italic: true };

                r.eachCell(cell => cell.border = borderStyle as ExcelJS.Borders);
            });

            trendSheet.getColumn(1).width = 20;
            trendSheet.getColumn(2).width = 25;
            trendSheet.getColumn(3).width = 20;

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Hospital_Analytics_Pro_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error('Export failed', error);
        } finally {
            setIsExporting(false);
        }
    };

    const stats = [
        { label: 'OPD Revenue', value: summary.appointments?.totalRevenue || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'IPD Revenue', value: summary.ipd?.totalRevenue || 0, icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Pharmacy', value: summary.pharmacy?.totalRevenue || 0, icon: Pill, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Laboratory', value: summary.lab?.totalRevenue || 0, icon: FlaskConical, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    const filteredDoctors = doctors.filter((doc: any) =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.department || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading && !data) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-6">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute top-0 w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="flex flex-col items-center gap-1">
                <p className="text-slate-900 font-black text-xs uppercase tracking-[0.2em]">Synchronizing Diagnostics</p>
                <p className="text-slate-400 font-bold text-[10px] uppercase">Retrieving hospital performance metrics...</p>
            </div>
        </div>
    );

    return (
    <div className="space-y-6 md:space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <h1 className="text-lg md:text-xl lg:text-xl font-black text-slate-900">HOSPITAL ANALYTICS</h1>
                            {isFetching && (
                                <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></div>
                                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Syncing</span>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Clinical and Financial Performance</p>
                    </div>
                </div>

                {/* Controls Bar */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-2 md:p-4 shadow-sm">
                    {/* Date Range Filters */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-600 uppercase">From</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setRange('custom');
                                }}
                                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <span className="text-slate-200">-</span>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-600 uppercase">To</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setRange('custom');
                                }}
                                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Quick Range + Download */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                            {['7d', '30d', '90d'].map((r) => (
                                <button
                                    key={r}
                                    onClick={() => {
                                        setRange(r);
                                        setStartDate('');
                                        setEndDate('');
                                    }}
                                    className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${range === r
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="w-4 h-4" />
                            {isExporting ? 'Processing...' : 'Download Report'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Simple Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {stats.map((s, i) => {
                    const details = getMetricDetails(s, i);
                    return (
                        <div
                            key={i}
                            className="relative"
                            onMouseEnter={() => setHoveredCard(i)}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <Card className="p-2 md:p-6 border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full min-w-0">
                                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 md:gap-4">
                                    <div className={`p-2 md:p-3 rounded-xl ${s.bg} shrink-0`}>
                                        <s.icon className={`w-5 h-5 md:w-6 md:h-6 ${s.color}`} />
                                    </div>
                                    <div className="text-center sm:text-left min-w-0">
                                        <p className="text-[8px] md:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">{s.label}</p>
                                        <p className="text-xs md:text-xl font-black text-slate-900 truncate">{formatCurrency(s.value)}</p>
                                    </div>
                                </div>
                            </Card>

                            {/* Popup Detail Card - Below Card Design */}
                            {hoveredCard === i && (
                                <div className="absolute top-full left-0 right-0 mt-4 p-3 md:p-5 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 w-full">
                                    <div className="bg-white/98 dark:bg-gray-900/98 rounded-2xl border-2 border-indigo-600 shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-3 md:p-5 backdrop-blur-xl flex flex-col pointer-events-auto">
                                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                                            <h4 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-wider">
                                                {details.title}
                                            </h4>
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                            {details.items.map((item: any, idx: number) => (
                                                <div key={idx} className="flex flex-col p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                        {item.label}
                                                    </span>
                                                    <span className="text-xs font-black text-slate-900">
                                                        {item.value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                                            <p className="text-[10px] font-bold text-indigo-800 leading-relaxed italic">
                                                💡 {details.insight}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Simple Revenue Trend */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="p-2 md:p-6 border-slate-200 shadow-sm">
                    <h3 className="text-sm md:text-lg font-bold text-slate-900 mb-6">Revenue Trend</h3>
                    <div className="h-[300px] min-h-[300px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <AreaChart data={trends}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    tickFormatter={(v) => `₹${v >= 1000 ? v / 1000 + 'k' : v}`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                    formatter={(v: any) => [formatCurrency(v), 'Monthly Revenue']}
                                />
                                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Simple Unit Comparison */}
                <Card className="p-2 md:p-6 border-slate-200 shadow-sm">
                    <h3 className="text-sm md:text-lg font-bold text-slate-900 mb-6">Unit Performance</h3>
                    <div className="h-[300px] min-h-[300px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <BarChart data={[
                                { name: 'OPD', value: summary.appointments?.totalRevenue || 0 },
                                { name: 'IPD', value: summary.ipd?.totalRevenue || 0 },
                                { name: 'PHM', value: summary.pharmacy?.totalRevenue || 0 },
                                { name: 'LAB', value: summary.lab?.totalRevenue || 0 },
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                    formatter={(v: any) => formatCurrency(v)}
                                />
                                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Simple Doctor Table */}
                <Card className="p-2 md:p-6 border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm md:text-lg font-bold text-slate-900">Doctor Performance</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full">
                            <thead>
                                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                    <th className="pb-3">Doctor</th>
                                    <th className="pb-3">Department</th>
                                    <th className="pb-3 text-center">Patients</th>
                                    <th className="pb-3 text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredDoctors.length > 0 ? filteredDoctors.map((doc: any, i: number) => (
                                    <tr key={i} className="text-sm hover:bg-slate-50 transition-colors">
                                        <td className="py-4 font-bold text-slate-700">{doc.name}</td>
                                        <td className="py-4 text-slate-500 text-xs">{doc.department}</td>
                                        <td className="py-4 text-center font-medium">{doc.count}</td>
                                        <td className="py-4 text-right font-bold text-slate-900">{formatCurrency(doc.revenue)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-slate-400 text-xs italic">No clinical data found for this range</td>
                                    </tr>
                                )}
                            </tbody>
                        </table></div>
                    </div>
                </Card>

                {/* Right Column: Bed Status & Depts */}
                <div className="space-y-6">
                    <Card className="p-2 md:p-6 border-slate-200 shadow-sm">
                        <h3 className="text-sm md:text-lg font-bold text-slate-900 mb-6">Bed Status</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Vacant', count: bedStats.vacant, color: 'bg-emerald-500' },
                                { label: 'Occupied', count: bedStats.occupied, color: 'bg-rose-500' },
                                { label: 'Cleaning', count: bedStats.cleaning, color: 'bg-amber-500' },
                                { label: 'Blocked', count: bedStats.blocked, color: 'bg-slate-300' },
                            ].map((s, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${s.color}`}></div>
                                        <span className="text-xs font-medium text-slate-600">{s.label}</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-900">{s.count}</span>
                                </div>
                            ))}
                            <div className="pt-4 border-t border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Occupancy</span>
                                    <span className="text-sm font-bold text-slate-900">
                                        {(() => {
                                            const total = (Number(bedStats.vacant) || 0) + (Number(bedStats.occupied) || 0) + (Number(bedStats.cleaning) || 0) + (Number(bedStats.blocked) || 0);
                                            return total > 0 ? Math.round((Number(bedStats.occupied) / total) * 100) : 0;
                                        })()}%
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className="bg-blue-600 h-full transition-all duration-1000"
                                        style={{
                                            width: `${(() => {
                                                const total = (Number(bedStats.vacant) || 0) + (Number(bedStats.occupied) || 0) + (Number(bedStats.cleaning) || 0) + (Number(bedStats.blocked) || 0);
                                                return total > 0 ? Math.round((Number(bedStats.occupied) / total) * 100) : 0;
                                            })()}%`
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-2 md:p-6 border-slate-200 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Top Departments</h3>
                        <div className="space-y-4">
                            {depts.slice(0, 4).map((dept: any, i: number) => (
                                <div key={i} className="flex flex-col gap-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="font-bold text-slate-700">{dept.department}</span>
                                        <span className="text-slate-400">{dept.count} pts</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                        <div
                                            className="bg-indigo-500 h-full"
                                            style={{ width: `${Math.min(100, (dept.revenue / (summary.appointments?.totalRevenue || 1)) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                            {depts.length === 0 && <p className="text-xs text-slate-400 italic">No departmental flow detected</p>}
                        </div>
                    </Card>

                    <Card className="p-2 md:p-6 border-slate-200 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Billing Overview</h3>
                        <div className="space-y-4">
                            {(data?.paymentDistribution || []).map((p: any, i: number) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700 uppercase">{p.method}</span>
                                        <span className="text-[10px] text-slate-400">{p.count} transactions</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-900">{formatCurrency(p.revenue)}</span>
                                </div>
                            ))}
                            {(data?.paymentDistribution || []).length === 0 && (
                                <p className="text-xs text-slate-400 italic">No transactional data found</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-2 md:p-6 border-slate-200 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Total Breakdown</h3>
                        <div className="space-y-4">
                            {[
                                { method: 'OPD Consultations', revenue: summary.appointments?.totalRevenue || 0 },
                                { method: 'IPD Services', revenue: summary.ipd?.totalRevenue || 0 },
                                { method: 'Pharmacy Sales', revenue: summary.pharmacy?.totalRevenue || 0 },
                                { method: 'Lab Tests', revenue: summary.lab?.totalRevenue || 0 },
                            ].map((p: any, i: number) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700 uppercase">{p.method}</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-900">{formatCurrency(p.revenue)}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
