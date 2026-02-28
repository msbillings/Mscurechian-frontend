"use client";

import React, { useState, useEffect } from 'react';
import { IndianRupee, Calendar as CalendarIcon, Loader2, Activity, Users, Filter, X } from 'lucide-react';
import { doctorService } from '@/lib/integrations/services/doctor.service';

function formatCurrency(amount: number) {
    return `₹${amount.toLocaleString()}`;
}

export default function DoctorIncomeStatsCard() {
    // We use the local timezone date intentionally to avoid boundaries mismatch
    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

    const [startDate, setStartDate] = useState<string>(todayStr);
    const [endDate, setEndDate] = useState<string>(todayStr);
    const [showPopover, setShowPopover] = useState(false);

    const [selectedType, setSelectedType] = useState<"ALL" | "OPD" | "IPD">("ALL");

    // Main card data (Today exactly)
    const [todayData, setTodayData] = useState({
        consultationsValue: 0,
        opdCount: 0,
        ipdCount: 0
    });
    const [todayLoading, setTodayLoading] = useState(false);

    // Filter modal data
    const [filterData, setFilterData] = useState({
        consultationsValue: 0,
        opdRevenue: 0,
        ipdRevenue: 0,
        opdCount: 0,
        ipdCount: 0,
        totalCount: 0
    });
    const [filterLoading, setFilterLoading] = useState(false);

    // Initial Fetch for Main Dashboard Card
    useEffect(() => {
        const fetchTodayStats = async () => {
            setTodayLoading(true);
            try {
                const res: any = await doctorService.getIncomeStats(todayStr, todayStr);
                if (res) {
                    setTodayData({
                        consultationsValue: res.consultationsValue || 0,
                        opdCount: res.opdCount || 0,
                        ipdCount: res.ipdCount || 0
                    });
                }
            } catch (err) {
                console.error("Failed to fetch today's income stats", err);
            } finally {
                setTodayLoading(false);
            }
        };
        fetchTodayStats();
    }, [todayStr]);

    // Fetch for the Popover specific range
    useEffect(() => {
        if (!showPopover) return;
        const fetchFilterStats = async () => {
            setFilterLoading(true);
            try {
                const res: any = await doctorService.getIncomeStats(startDate, endDate);
                if (res) {
                    setFilterData({
                        consultationsValue: res.consultationsValue || 0,
                        opdRevenue: res.opdRevenue || 0,
                        ipdRevenue: res.ipdRevenue || 0,
                        opdCount: res.opdCount || 0,
                        ipdCount: res.ipdCount || 0,
                        totalCount: res.totalCount || 0
                    });
                }
            } catch (err) {
                console.error("Failed to fetch filtered income stats", err);
            } finally {
                setFilterLoading(false);
            }
        };
        fetchFilterStats();
    }, [startDate, endDate, showPopover]);

    return (
        <div className="bg-card dark:bg-card p-6 max-sm:p-4 rounded-2xl shadow-sm border border-border-theme dark:border-border-theme hover:shadow-md relative">

            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm max-sm:text-[11px] font-medium text-muted dark:text-muted whitespace-nowrap">Consultation Fee</p>
                    {todayLoading ? (
                        <div className="mt-1 text-left">
                            <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                        </div>
                    ) : (
                        <h3 className="text-2xl max-sm:text-lg font-black text-foreground dark:text-foreground mt-1">
                            {formatCurrency(todayData.consultationsValue)}
                        </h3>
                    )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="p-3 max-sm:p-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                        <IndianRupee className="w-6 h-6 max-sm:w-5 max-sm:h-5" />
                    </div>
                    <div className="w-px h-6 bg-border-theme hidden sm:block"></div>
                    <button
                        onClick={() => setShowPopover(!showPopover)}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all border shadow-sm ${showPopover ? 'bg-purple-100 text-purple-600 border-purple-200' : 'bg-card text-muted hover:bg-secondary-theme hover:text-foreground border-border-theme'}`}
                        title="Filter Data"
                    >
                        <Filter size={14} />
                    </button>
                </div>
            </div>

            {/* Absolute Popover exactly above the card */}
            {showPopover && (
                <div className="absolute top-16 right-4 lg:-right-4 z-[60] w-[300px] sm:w-[340px] bg-card border border-border-theme rounded-2xl shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4 border-b border-border-theme border-dashed pb-3">
                        <span className="text-xs sm:text-sm flex items-center gap-2 font-black uppercase text-foreground">
                            <Filter size={16} className="text-purple-500" /> Revenue Analysis
                        </span>
                        <button onClick={() => setShowPopover(false)} className="p-1.5 hover:bg-secondary-theme rounded-lg transition-colors border border-transparent hover:border-border-theme">
                            <X size={16} className="text-muted" />
                        </button>
                    </div>

                    {/* Date Pickers */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div>
                            <span className="text-[10px] font-bold text-muted mb-1 block uppercase">Start Date</span>
                            <div className="bg-secondary-theme rounded-lg px-3 py-2 border border-border-theme transition-all focus-within:border-purple-500 hover:border-purple-300">
                                <input
                                    type="date"
                                    className="w-full text-xs sm:text-sm bg-transparent border-none outline-none font-bold text-foreground cursor-pointer"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        // Ensure end date doesn't stay behind a freshly advanced start date
                                        if (e.target.value > endDate) {
                                            setEndDate(e.target.value);
                                        }
                                    }}
                                    max={todayStr}
                                />
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-muted mb-1 block uppercase">End Date</span>
                            <div className="bg-secondary-theme rounded-lg px-3 py-2 border border-border-theme transition-all focus-within:border-purple-500 hover:border-purple-300">
                                <input
                                    type="date"
                                    className="w-full text-xs sm:text-sm bg-transparent border-none outline-none font-bold text-foreground cursor-pointer"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                    max={todayStr}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Filtered Data Blocks */}
                    <div className="relative p-4 bg-secondary-theme rounded-xl border border-border-theme">
                        {filterLoading && (
                            <div className="absolute inset-0 bg-secondary-theme/60 flex items-center justify-center z-10 backdrop-blur-[1px] rounded-xl">
                                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                            </div>
                        )}

                        <div className="mb-4 text-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setSelectedType("ALL")}>
                            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">
                                {selectedType === "ALL" ? "Total Period Revenue" : selectedType === "OPD" ? "OPD Revenue" : "IPD / Ward Revenue"}
                            </p>
                            <h4 className="text-2xl font-black text-purple-600 dark:text-purple-400">
                                {formatCurrency(selectedType === "ALL" ? filterData.consultationsValue : selectedType === "OPD" ? filterData.opdRevenue : filterData.ipdRevenue)}
                            </h4>
                            {selectedType !== "ALL" && (
                                <p className="text-[9px] text-muted mt-1 uppercase font-bold text-purple-500/80">Click here to clear selection</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div
                                onClick={() => setSelectedType(selectedType === "OPD" ? "ALL" : "OPD")}
                                className={`flex items-center justify-between p-2.5 bg-card/60 rounded-lg border transition-all cursor-pointer ${selectedType === "OPD" ? "border-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,1)]" : "border-border-theme hover:border-emerald-500/50"}`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                        <Users size={14} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-foreground uppercase tracking-tight">OPD Consultations</p>
                                    </div>
                                </div>
                                <p className="text-sm font-black text-emerald-600">{filterData.opdCount}</p>
                            </div>

                            <div
                                onClick={() => setSelectedType(selectedType === "IPD" ? "ALL" : "IPD")}
                                className={`flex items-center justify-between p-2.5 bg-card/60 rounded-lg border transition-all cursor-pointer ${selectedType === "IPD" ? "border-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,1)]" : "border-border-theme hover:border-rose-500/50"}`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-md bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
                                        <Activity size={14} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-foreground uppercase tracking-tight">IPD / Ward Visits</p>
                                    </div>
                                </div>
                                <p className="text-sm font-black text-rose-600">{filterData.ipdCount}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
