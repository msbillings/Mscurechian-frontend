"use client";

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart3,
    Clock,
    Bed,
    Calendar,
    Wallet,
    ShieldAlert,
    RefreshCw,
    Download,
    TrendingUp,
    AlertTriangle,
    FileCheck,
    Lock,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Info,
    LayoutDashboard,
    Activity,
    User,
    BarChart,
    FileText,
    FileSpreadsheet
} from 'lucide-react';
import { exportQualityToExcel } from '@/lib/excel-utils';
import {
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    XAxis,
    YAxis,
    AreaChart,
    Area,
    BarChart as RechartsBarChart,
    Bar
} from 'recharts';
import { analyticsService } from '@/lib/integrations/services/analytics.service';
import { generateQualityReportHtml } from '@/lib/print-utils';
import { Card } from '@/components/admin';
import toast from 'react-hot-toast';
import IndicatorDetailModal from '@/components/admin/analytics/IndicatorDetailModal';

const INDICATOR_METADATA: Record<string, any> = {
    opdWaitingTime: {
        definition: "Average time from patient registration to the start of clinical consultation.",
        formula: "Σ(Consultation Start Time - Registration Time) / Total OPD Visits",
        source: "HMS Queue Management System",
        owner: "OPD Operations Manager",
        id: 'opdWaitingTime'
    },
    bedOccupancyRate: {
        definition: "Percentage of hospital beds occupied by patients over a specific period.",
        formula: "(Total Patient Days / Total Available Bed Days) × 100",
        source: "IPD Census & Bed Registry",
        owner: "Nursing Superintendent",
        id: 'bedOccupancyRate'
    },
    alos: {
        definition: "Average number of days that patients spend in the hospital.",
        formula: "Total Patient Days / Total Discharges",
        source: "IPD Discharge Records",
        owner: "Medical Superintendent",
        id: 'alos'
    },
    billingTat: {
        definition: "Time taken from discharge advice to final bill settlement.",
        formula: "Σ(Settlement Time - Discharge Advice Time) / Total Billable Discharges",
        source: "Hospital Billing Module",
        owner: "Finance & Accounts Head",
        id: 'billingTat'
    },
    incidentRate: {
        definition: "Rate of reported medical incidents occurring in the hospital.",
        formula: "(Total Incidents / Total Patient Days) × 1000",
        source: "Incident Reporting Module",
        owner: "Safety & Compliance Officer",
        id: 'incidentRate'
    },
    readmissionRate: {
        definition: "Percentage of patients readmitted with the same diagnosis within 30 days.",
        formula: "(Total Readmissions / Total Discharges) × 100",
        source: "Discharge & Readmission Audit",
        owner: "Quality Assurance Cell",
        id: 'readmissionRate'
    }
};

const QualityIndicatorDashboard = () => {
    const [selectedDate, setSelectedDate] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });
    const [auditTimeframe, setAuditTimeframe] = useState<3 | 6>(3);
    const [chartType, setChartType] = useState<'area' | 'bar'>('area');
    const [selectedIndicator, setSelectedIndicator] = useState<any>(null);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Enhanced Query: Fetch current + previous + metadata
    const { data: enhancedMetrics, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['enhanced-quality-metrics', selectedDate],
        queryFn: () => analyticsService.getEnhancedQualityIndicators(selectedDate),
    });

    // Audit Trends Query
    const { data: auditTrends } = useQuery({
        queryKey: ['audit-trends', auditTimeframe],
        queryFn: () => analyticsService.getAuditTrends({ months: auditTimeframe }),
    });

    const metrics = enhancedMetrics?.data?.current;
    const prevIndicators = enhancedMetrics?.data?.previous;

    const metricCards = useMemo(() => [
        {
            id: "opdWaitingTime",
            title: "OPD Wait Time",
            value: metrics?.indicators?.opdWaitingTime || 0,
            prevValue: prevIndicators?.opdWaitingTime || 0,
            unit: "min",
            target: "< 30 min",
            status: (metrics?.indicators?.opdWaitingTime || 0) < 30 ? "success" : "warning",
            icon: Clock,
            color: "blue",
            description: "Registration to Consult"
        },
        {
            id: "bedOccupancyRate",
            title: "Bed Occupancy",
            value: metrics?.indicators?.bedOccupancyRate || 0,
            prevValue: prevIndicators?.bedOccupancyRate || 0,
            unit: "%",
            target: "80-90%",
            status: (metrics?.indicators?.bedOccupancyRate || 0) > 80 ? "success" : "danger",
            icon: Bed,
            color: "emerald",
            description: "Utilized vs Available"
        },
        {
            id: "alos",
            title: "Avg Length of Stay",
            value: metrics?.indicators?.alos || 0,
            prevValue: prevIndicators?.alos || 0,
            unit: "days",
            target: "< 5 days",
            status: (metrics?.indicators?.alos || 0) < 5 ? "success" : "warning",
            icon: Calendar,
            color: "violet",
            description: "Admission to Discharge"
        },
        {
            id: "billingTat",
            title: "Billing TAT",
            value: metrics?.indicators?.billingTat || 0,
            prevValue: prevIndicators?.billingTat || 0,
            unit: "min",
            target: "< 180 min",
            status: (metrics?.indicators?.billingTat || 0) < 180 ? "success" : "warning",
            icon: Wallet,
            color: "amber",
            description: "Advice to Settlement"
        },
        {
            id: "incidentRate",
            title: "Incident Rate",
            value: metrics?.indicators?.incidentRate || 0,
            prevValue: prevIndicators?.incidentRate || 0,
            unit: "‰",
            target: "< 1.0‰",
            status: (metrics?.indicators?.incidentRate || 0) < 1 ? "success" : "danger",
            icon: AlertTriangle,
            color: "rose",
            description: "Incidents per 1000 Days"
        },
        {
            id: "readmissionRate",
            title: "Readmission Rate",
            value: metrics?.indicators?.readmissionRate || 0,
            prevValue: prevIndicators?.readmissionRate || 0,
            unit: "%",
            target: "< 5%",
            status: (metrics?.indicators?.readmissionRate || 0) < 5 ? "success" : "warning",
            icon: TrendingUp,
            color: "indigo",
            description: "Readmit w/i 30 Days"
        }
    ], [metrics, prevIndicators]);

    const handleDateChange = (increment: number) => {
        let newMonth = selectedDate.month + increment;
        let newYear = selectedDate.year;

        if (newMonth > 12) {
            newMonth = 1;
            newYear += 1;
        } else if (newMonth < 1) {
            newMonth = 12;
            newYear -= 1;
        }

        setSelectedDate({ month: newMonth, year: newYear });
    };

    const handleExport = () => {
        const html = generateQualityReportHtml({
            metrics,
            trends: auditTrends,
            month: selectedDate.month,
            year: selectedDate.year,
            hospital: { name: 'CureChain Hospital' },
            metadata: INDICATOR_METADATA
        });
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
        }
        setShowExportMenu(false);
    };

    const handleExcelExport = async () => {
        setShowExportMenu(false);
        try {
            await exportQualityToExcel({
                metrics,
                trends: auditTrends,
                month: selectedDate.month,
                year: selectedDate.year,
                hospital: { name: 'CureChain Hospital' },
                metadata: INDICATOR_METADATA
            });
            toast.success("Excel report generated");
        } catch (error) {
            console.error("Excel Export Error:", error);
            toast.error("Failed to generate Excel");
        }
    };

    const handleFinalize = async () => {
        const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(selectedDate.year, selectedDate.month - 1));
        if (!confirm(`Finalize ${monthName} ${selectedDate.year} metrics? Data will be locked for audit.`)) return;

        setIsFinalizing(true);
        try {
            await analyticsService.finalizeMetrics(selectedDate.month, selectedDate.year);
            toast.success("Metrics finalized and locked.");
            refetch();
        } catch (error: any) {
            toast.error(error?.message || "Finalization failed");
        } finally {
            setIsFinalizing(false);
        }
    };

    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(selectedDate.year, selectedDate.month - 1));

    const formatMetricValue = (value: number, unit: string) => {
        if ((unit === 'min' || unit === 'mins') && value >= 60) {
            const hours = Math.floor(value / 60);
            const minutes = Math.round(value % 60);
            return `${hours}h ${minutes}m`;
        }
        // Round to 1 decimal place for small values
        if (value > 0 && value < 1) return value.toFixed(2);
        return value.toString();
    };

    const AuditTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border-none shadow-2xl p-4 rounded-2xl text-white space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 border-b border-white/10 pb-2 mb-2">{label}</p>
                    {payload.map((p: any, i: number) => {
                        const unit = p.name.includes('Occupancy') ? '%' : (p.name.includes('ALOS') ? ' days' : '');
                        return (
                            <div key={i} className="flex items-center justify-between gap-6">
                                <span className="text-[10px] font-bold text-slate-300 uppercase">{p.name}</span>
                                <span className={`text-xs font-black ${p.color === '#3b82f6' ? 'text-blue-400' : 'text-violet-400'}`}>
                                    {p.value}{unit}
                                </span>
                            </div>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="p-2 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Master Header */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-theme text-white rounded-xl">
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 uppercase">NABH Quality Indicators</h1>
                        <p className="text-xs text-slate-500 font-bold">Continuous Quality Improvement (CQI)</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
                        <button onClick={() => handleDateChange(-1)} className="p-1.5 hover:bg-white rounded-lg text-slate-400 transition-all">
                            <ChevronLeft size={16} />
                        </button>
                        <div className="px-3 py-1 text-xs font-black text-slate-700 uppercase flex items-center gap-2 min-w-[140px] justify-center">
                            <CalendarDays size={14} className="text-blue-500" />
                            {monthName} {selectedDate.year}
                        </div>
                        <button onClick={() => handleDateChange(1)} className="p-1.5 hover:bg-white rounded-lg text-slate-400 transition-all">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <button onClick={() => refetch()} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all">
                        <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-primary-theme text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all shadow-lg shadow-slate-200"
                        >
                            <Download size={14} />
                            Export
                        </button>

                        {showExportMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowExportMenu(false)}
                                />
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-20 animate-in fade-in zoom-in duration-200 origin-top-right">
                                    <button
                                        onClick={handleExport}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl transition-all group"
                                    >
                                        <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-100">
                                            <FileText size={16} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase tracking-tight">Download PDF</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Print Format</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={handleExcelExport}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-xl transition-all group mt-1"
                                    >
                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100">
                                            <FileSpreadsheet size={16} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase tracking-tight">Download Excel</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Spreadsheet</p>
                                        </div>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {metricCards.map((card, i) => {
                    const variance = card.prevValue ? ((card.value - card.prevValue) / card.prevValue) * 100 : 0;
                    const isImprovement = card.id === 'bedOccupancyRate' ? variance > 0 : variance < 0;

                    return (
                        <div
                            key={i}
                            onClick={() => setSelectedIndicator({ ...INDICATOR_METADATA[card.id], ...card })}
                            className="p-5 bg-white border-slate-200 shadow-sm hover:translate-y-[-2px] hover:shadow-md transition-all flex flex-col h-[170px] rounded-2xl border cursor-pointer group relative overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-auto">
                                <div className={`p-2.5 rounded-xl bg-${card.color}-50 text-${card.color}-600 shadow-sm group-hover:scale-110 transition-transform`}>
                                    <card.icon size={20} strokeWidth={2.5} />
                                </div>
                                <div className="text-right">
                                    <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border ${card.status === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                        {card.target}
                                    </div>
                                    {variance !== 0 && (
                                        <div className={`mt-1 flex items-center justify-end gap-0.5 text-[8px] font-black ${isImprovement ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {variance > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                            {Math.abs(variance).toFixed(0)}%
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mb-3">
                                <div className="flex items-baseline gap-0.5">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
                                        {formatMetricValue(card.value, card.unit)}
                                    </h3>
                                    <span className="text-xs font-bold text-slate-400 ml-0.5 uppercase">{card.unit}</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 truncate">{card.title}</p>
                            </div>

                            <div className="pt-3 border-t border-slate-100 mt-auto flex justify-between items-center">
                                <p className="text-[9px] font-bold text-slate-400 truncate tracking-tight uppercase group-hover:text-blue-500 transition-colors">Click for Trends</p>
                                <div className="group-hover:text-blue-500 transition-colors">
                                    <Info size={12} className="text-slate-300" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Audit Trend Center */}
                <Card className="lg:col-span-2 p-6 bg-white border-slate-200 shadow-sm flex flex-col h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <Activity size={14} className="text-blue-500" />
                                Audit Performance Trends
                            </h3>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Performance Analysis</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex bg-white border-2 border-blue-400/40 rounded-full p-1 shadow-[0_0_15px_rgba(59,130,246,0.15)] items-center">
                                <button
                                    onClick={() => setChartType('area')}
                                    className={`flex items-center gap-2 px-5 py-1.5 rounded-full text-[11px] font-black transition-all duration-300 ${chartType === 'area'
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                                        : 'text-slate-500 hover:text-blue-600 font-bold'
                                        }`}
                                >
                                    <TrendingUp size={14} strokeWidth={3} />
                                    Curve
                                </button>
                                <button
                                    onClick={() => setChartType('bar')}
                                    className={`flex items-center gap-2 px-5 py-1.5 rounded-full text-[11px] font-black transition-all duration-300 ${chartType === 'bar'
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                                        : 'text-slate-500 hover:text-blue-600 font-bold'
                                        }`}
                                >
                                    <BarChart size={14} strokeWidth={3} />
                                    Bar
                                </button>
                            </div>
                            <div className="flex gap-2 bg-slate-50 p-1 rounded-lg">
                                {[3, 6].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setAuditTimeframe(m as any)}
                                        className={`px-3 py-1 text-[8px] font-black uppercase rounded-md transition-all ${auditTimeframe === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        {m}M View
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'area' ? (
                                <AreaChart data={auditTrends?.data?.trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                    <RechartsTooltip content={<AuditTooltip />} />
                                    <Area type="monotone" name="Occupancy %" dataKey="bedOccupancyRate" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTrend)" />
                                    <Area type="monotone" name="ALOS (Days)" dataKey="alos" stroke="#8b5cf6" strokeWidth={2} fillOpacity={0} />
                                </AreaChart>
                            ) : (
                                <RechartsBarChart data={auditTrends?.data?.trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                    <RechartsTooltip content={<AuditTooltip />} />
                                    <Bar name="Occupancy %" dataKey="bedOccupancyRate" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar name="ALOS (Days)" dataKey="alos" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                                </RechartsBarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Audit Evidence */}
                <div className="space-y-4">
                    <Card className="p-6 bg-slate-900 border-none shadow-xl text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <ShieldAlert size={100} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[10px] font-black uppercase tracking-tight flex items-center gap-2">
                                    <Lock size={14} className="text-blue-400" />
                                    Governance
                                </h3>
                                <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${metrics?.status === 'locked' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                                    {metrics?.status === 'locked' ? 'VERIFIED' : 'OPEN'}
                                </div>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/10">
                                    <div>
                                        <p className="text-[7px] font-bold text-slate-500 uppercase">Compliance Score</p>
                                        <p className="text-xl font-black text-emerald-400">{metrics?.complianceScore || 0}%</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[7px] font-bold text-slate-500 uppercase">Data Gaps</p>
                                        <p className="text-xl font-black text-rose-400">
                                            {(metrics?.dataGaps?.missingDiagnoses || 0) + (metrics?.dataGaps?.untrackedInfections || 0)}
                                        </p>
                                    </div>
                                </div>
                                {metrics?.status === 'locked' && (
                                    <div className="text-[8px] font-bold text-slate-400 flex flex-col gap-1">
                                        <div className="flex items-center gap-2"><User size={10} /> {metrics.lockedBy?.name}</div>
                                        <div className="flex items-center gap-2"><CalendarDays size={10} /> {new Date(metrics.lockedAt).toLocaleDateString()}</div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleFinalize}
                                disabled={isFinalizing || metrics?.status === 'locked'}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                {metrics?.status === 'locked' ? <FileCheck size={12} /> : <RefreshCw className={isFinalizing ? 'animate-spin' : ''} size={12} />}
                                {metrics?.status === 'locked' ? 'Audit Locked' : 'Finalize Monthly Data'}
                            </button>
                        </div>
                    </Card>

                    <Card className="p-6 bg-white border-slate-200 shadow-sm flex-1">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                            <AlertTriangle className="text-amber-500" size={16} />
                            Critical Gaps
                        </h3>

                        <div className="space-y-2">
                            {[
                                { label: "Diagnosis Completeness", value: metrics?.dataGaps?.missingDiagnoses || 0 },
                                { label: "Infection Tracking", value: metrics?.dataGaps?.untrackedInfections || 0 }
                            ].map((gap, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">{gap.label}</span>
                                    <span className={`text-[10px] font-black ${gap.value > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {gap.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            <IndicatorDetailModal
                isOpen={!!selectedIndicator}
                onClose={() => setSelectedIndicator(null)}
                indicator={selectedIndicator}
                selectedDate={selectedDate}
            />

            <style jsx global>{`
                /* Global polish */
            `}</style>
        </div>
    );
};

export default QualityIndicatorDashboard;
