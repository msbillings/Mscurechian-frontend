"use client";

import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Activity,
    Pill,
    ClipboardList,
    Utensils,
    Download,
    FileText,
    FileSpreadsheet,
    Search,
    User,
    ChevronDown,
    Clock,
    AlertCircle,
    Calendar,
    Stethoscope,
    Thermometer,
    HeartPulse,
    Droplets,
    X,
    Printer,
    FlaskConical
} from 'lucide-react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { Card } from '@/components/admin';
import { format, differenceInCalendarDays } from 'date-fns';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import { generatePatientHourlyRecordHtml } from '@/lib/utils/print-patient-vitals';

export default function HourlyRecordClient() {
    const [selectedAdmissionId, setSelectedAdmissionId] = useState<string>('');
    const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSelectOpen, setIsSelectOpen] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printHtml, setPrintHtml] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 1. Fetch Active Admissions
    const { data: admissions, isLoading: loadingAdmissions } = useQuery({
        queryKey: ['active-admissions'],
        queryFn: () => hospitalAdminService.getActiveAdmissions()
    });

    // 2. Fetch Hourly Monitoring Data
    const { data: hourlyData, isLoading: loadingData, refetch } = useQuery({
        queryKey: ['hourly-monitoring', selectedAdmissionId],
        queryFn: () => hospitalAdminService.getPatientHourlyRecord(selectedAdmissionId),
        enabled: !!selectedAdmissionId
    });

    // 3. Fetch Hospital Config (for printing)
    const { data: hospitalData } = useQuery({
        queryKey: ['hospital-config'],
        queryFn: () => hospitalAdminService.getHospital()
    });

    // 4. Click Outside Logic
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsSelectOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredAdmissions = useMemo(() => {
        if (!admissions) return [];
        return admissions.filter((adm: any) =>
            adm.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            adm.admissionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            adm.patient?.mrn?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [admissions, searchTerm]);

    const handlePrint = () => {
        if (!hourlyData?.data) return;
        const html = generatePatientHourlyRecordHtml({
            ...hourlyData.data,
            hospital: hospitalData?.hospital,
            returnUrl: window.location.pathname + (selectedAdmissionId ? `?admissionId=${selectedAdmissionId}` : '')
        });
        setPrintHtml(html);
        setShowPrintModal(true);
    };

    const handleExcelExport = async () => {
        if (!hourlyData?.data) return;

        const { admission, vitals, meds, diet, labOrders } = hourlyData.data;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Hourly Monitoring');

        // Header Styling
        worksheet.mergeCells('A1:K1');
        const headerCell = worksheet.getCell('A1');
        headerCell.value = 'MS CURECHAIN HOSPITAL - PATIENT HOURLY MONITORING RECORD';
        headerCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
        headerCell.alignment = { horizontal: 'center' };
        headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };

        // Patient Info
        worksheet.addRow(['Patient Name:', admission.patientName, '', 'Admission ID:', admission.admissionId]);
        const docName = admission.doctorName?.startsWith('Dr.') ? admission.doctorName : `Dr. ${admission.doctorName}`;
        worksheet.addRow(['Doctor:', docName, '', 'Admission Date:', format(new Date(admission.admissionDate), 'dd MMM yyyy HH:mm')]);
        worksheet.addRow(['Diet Plan:', admission.diet || 'Regular Diet']);
        worksheet.addRow([]);

        // Lab Investigations
        if (labOrders && labOrders.length > 0) {
            worksheet.addRow(['LAB INVESTIGATIONS']).font = { bold: true };
            worksheet.addRow(['Date', 'Test Name', 'Status', 'Result', 'Unit']);
            labOrders.forEach((order: any) => {
                const date = format(new Date(order.createdAt), 'dd MMM HH:mm');
                order.tests?.forEach((test: any) => {
                    const testName = test.testName || test.test?.testName || 'Test';

                    // Add subtests if they exist
                    if (test.subTests && test.subTests.length > 0) {
                        test.subTests.forEach((st: any) => {
                            if (st.result !== undefined && st.result !== null && st.result !== '') {
                                worksheet.addRow([date, `${testName} - ${st.name}`, order.status, st.result, st.unit || '-']);
                            }
                        });
                    } else if (test.resultValue) {
                        worksheet.addRow([date, testName, order.status, test.resultValue, test.unit || '-']);
                    } else {
                        worksheet.addRow([date, testName, order.status, 'Pending', '-']);
                    }
                });
            });
            worksheet.addRow([]);
        }

        // Vitals Table
        worksheet.addRow(['HOURLY VITALS']).font = { bold: true };
        worksheet.addRow(['Date', 'Day', 'Time', 'Heart Rate', 'Blood Pressure', 'SpO2 (%)', 'Temp (°F)', 'Resp. Rate', 'Glucose', 'Nurse', 'Status']);

        const vitalRows = vitals.map((v: any) => [
            format(new Date(v.timestamp), 'dd MMM yyyy'),
            format(new Date(v.timestamp), 'EEEE'),
            format(new Date(v.timestamp), 'HH:mm'),
            v.heartRate,
            `${v.systolicBP}/${v.diastolicBP}`,
            v.spO2,
            v.temperature,
            v.respiratoryRate,
            v.glucose ? `${v.glucose} (${v.glucoseType})` : '-',
            v.recordedBy?.name,
            v.status
        ]);
        worksheet.addRows(vitalRows);
        worksheet.addRow([]);

        // Medications Table
        worksheet.addRow(['MEDICATION ADMINISTRATION LOG']).font = { bold: true };
        worksheet.addRow(['Drug Name', 'Dose', 'Route', 'Time Given', 'Nurse', 'Time Slot', 'Status']);

        const medRows = meds.map((m: any) => [
            m.drugName,
            m.dose,
            m.route,
            format(new Date(m.timestamp), 'dd/MM HH:mm'),
            m.administeredBy?.name,
            m.timeSlot,
            m.status
        ]);
        worksheet.addRows(medRows);
        worksheet.addRow([]);

        // Diet Table
        worksheet.addRow(['DIETARY INTAKE LOG']).font = { bold: true };
        worksheet.addRow(['Items', 'Category', 'Time', 'Date', 'Nurse', 'Notes']);

        const dietRows = (diet || []).map((d: any) => [
            d.items?.map((item: any) => `${item.name || item} ${item.quantity ? `(${item.quantity})` : ''}`).join(', '),
            d.category,
            d.recordedTime,
            format(new Date(d.timestamp), 'dd MMM yyyy (EEEE)'),
            d.recordedBy?.name,
            d.notes || '-'
        ]);
        worksheet.addRows(dietRows);

        // Footer
        const rowCount = worksheet.rowCount;
        worksheet.addRow([]);
        worksheet.addRow(['This is a system generated report. All timestamps are in IST.']);

        // Set style for all headers
        ['B6', 'B16'].forEach(cell => {
            // Styling as needed
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Hourly_Record_${admission.patientName}_${format(new Date(), 'ddMMyy')}.xlsx`);
        toast.success('Excel Report Exported');
    };

    const handleDownload = () => {
        if (!selectedAdmissionId) {
            toast.error('Please select a patient first');
            return;
        }
        if (exportFormat === 'pdf') {
            handlePrint();
        } else {
            handleExcelExport();
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white p-3 sm:p-5 rounded-[2rem] border border-slate-200 shadow-sm transition-all duration-300">
                <div className="w-full md:w-96 space-y-2" ref={dropdownRef}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Patient / Admission</label>
                    <div className="relative">
                        <div
                            onClick={() => setIsSelectOpen(!isSelectOpen)}
                            className="flex items-center justify-between w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 cursor-pointer hover:border-blue-500 transition-all focus:ring-2 focus:ring-blue-500/20"
                        >
                            <div className="flex items-center gap-3">
                                <Search size={16} className="text-slate-400" />
                                <span>
                                    {selectedAdmissionId ?
                                        admissions?.find((a: any) => a.admissionId === selectedAdmissionId)?.patient?.name || 'Selected'
                                        : 'Search & Choose Patient...'}
                                </span>
                            </div>
                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isSelectOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isSelectOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-3 border-b border-slate-100 bg-slate-50">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            type="text"
                                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all"
                                            placeholder="Type name, MRN or ADM number..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                    {filteredAdmissions.length > 0 ? (
                                        filteredAdmissions.map((adm: any) => (
                                            <div
                                                key={adm._id}
                                                onClick={() => {
                                                    setSelectedAdmissionId(adm.admissionId);
                                                    setIsSelectOpen(false);
                                                }}
                                                className={`px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-l-4 ${selectedAdmissionId === adm.admissionId ? 'bg-blue-50 border-blue-500' : 'border-transparent'}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{adm.patient?.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{adm.patient?.mrn}</p>
                                                    </div>
                                                    <span className="text-[9px] font-black text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded uppercase">{adm.admissionId}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-8 text-center text-xs font-bold text-slate-400 uppercase">No matching patients found</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                    <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl border border-slate-200">
                        <button
                            onClick={() => setExportFormat('pdf')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${exportFormat === 'pdf' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <FileText size={14} />
                            PDF
                        </button>
                        <button
                            onClick={() => setExportFormat('excel')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${exportFormat === 'excel' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <FileSpreadsheet size={14} />
                            Excel
                        </button>
                    </div>

                    <button
                        onClick={handleDownload}
                        disabled={!selectedAdmissionId}
                        className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:shadow-none group"
                    >
                        <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                        Download Report
                    </button>
                </div>
            </div>

            {loadingData ? (
                <div className="flex flex-col items-center justify-center h-96 gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest animate-pulse">Compiling Patient History...</p>
                </div>
            ) : hourlyData?.data ? (
                <div className="space-y-6 pt-2">
                    {/* Patient Card */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2 space-y-6">
                            {/* Patient Core Info Card */}
                            <Card className="relative overflow-hidden group border-none shadow-xl bg-white rounded-[2.5rem]">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
                                <div className="relative z-10 p-4 sm:p-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform flex-shrink-0">
                                                <User size={28} />
                                            </div>
                                            <div>
                                                <h2 className="text-md sm:text-lg font-black text-slate-900 tracking-tight">{hourlyData.data.admission.patientName}</h2>
                                                <div className="flex flex-wrap items-center gap-2 text-[9px] sm:text-xs font-bold text-slate-500 uppercase">
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">ID: {hourlyData.data.admission.admissionId}</span>
                                                    <span className="hidden sm:inline w-1 h-1 bg-slate-300 rounded-full"></span>
                                                    <span className="text-blue-600 font-black">{hourlyData.data.admission.admissionType}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full sm:w-auto text-left sm:text-right flex flex-col items-start sm:items-end">
                                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase border border-emerald-100">
                                                <Activity size={12} strokeWidth={3} />
                                                {hourlyData.data.admission.status}
                                            </div>
                                            <div className="mt-3 flex flex-col items-start sm:items-end">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                    Adm: {format(new Date(hourlyData.data.admission.admissionDate), 'dd MMM yyyy, HH:mm')}
                                                </p>
                                                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-xl inline-block mt-1 border border-blue-100 shadow-sm">
                                                    <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 justify-end">
                                                        <Clock size={10} strokeWidth={3} />
                                                        Stay: {Math.max(0, differenceInCalendarDays(new Date(), new Date(hourlyData.data.admission.admissionDate)))} Days
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t border-slate-100">
                                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
                                                <Stethoscope size={10} className="text-blue-500" />
                                                Primary Doctor
                                            </p>
                                            <p className="text-xs font-black text-slate-700 truncate">
                                                {hourlyData.data.admission.doctorName?.startsWith('Dr.') ? hourlyData.data.admission.doctorName : `Dr. ${hourlyData.data.admission.doctorName}`}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
                                                <ClipboardList size={10} className="text-indigo-500" />
                                                Ward Details
                                            </p>
                                            <p className="text-xs font-black text-slate-700">
                                                {hourlyData.data.admission.wardName ? (
                                                    <span className="truncate block">
                                                        {hourlyData.data.admission.wardName}
                                                        {hourlyData.data.admission.roomName && `/${hourlyData.data.admission.roomName}`}
                                                        {hourlyData.data.admission.bedName && `/${hourlyData.data.admission.bedName}`}
                                                    </span>
                                                ) : 'Clinical Transit'}
                                            </p>
                                        </div>
                                        <div className="sm:col-span-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                                                <Activity size={10} className="text-rose-500" />
                                                Live Vitals Snapshot
                                            </p>
                                            <div className="flex flex-wrap items-center gap-4">
                                                <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                                                    <HeartPulse size={14} className="text-rose-500" />
                                                    {hourlyData.data.vitals?.[hourlyData.data.vitals.length - 1]?.heartRate || '--'}
                                                    <span className="text-[8px] text-slate-400 uppercase">bpm</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                                                    <Thermometer size={14} className="text-orange-500" />
                                                    {hourlyData.data.vitals?.[hourlyData.data.vitals.length - 1]?.temperature || '--'}
                                                    <span className="text-[8px] text-slate-400 uppercase">°F</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                                                    <Droplets size={14} className="text-blue-500" />
                                                    {hourlyData.data.vitals?.[hourlyData.data.vitals.length - 1]?.spO2 || '--'}
                                                    <span className="text-[8px] text-slate-400 uppercase">%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            {/* Diet Card */}
                            <Card className="h-full p-4 sm:p-6 bg-gradient-to-br from-emerald-500 to-teal-600 border-none shadow-xl text-white rounded-[2.5rem] relative overflow-hidden">
                                <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2.5">
                                            <Utensils size={18} />
                                            Dietary Plan
                                        </h3>
                                        <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                                            <Utensils size={20} />
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-6">
                                        <div className="p-5 bg-white/10 rounded-3xl backdrop-blur-md border border-white/20 shadow-inner">
                                            <p className="text-[10px] font-black text-emerald-100 uppercase mb-3 tracking-widest opacity-80">Nursing Instructions</p>
                                            <p className="text-sm font-black italic leading-relaxed">
                                                "{hourlyData.data.admission.diet || 'Standard nutrition applies.'}"
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="px-4 py-2 bg-white/20 rounded-2xl text-[10px] font-black uppercase border border-white/30 backdrop-blur-sm">Low Sodium</div>
                                            <div className="px-4 py-2 bg-white/20 rounded-2xl text-[10px] font-black uppercase border border-white/30 backdrop-blur-sm">High Fiber</div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* Vitals Log */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
                                    <Activity size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Hourly Vitals Observation</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Nurse Monitoring History</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mr-4">
                                    Total Readings: <span className="text-blue-600 font-black">{hourlyData.data.vitals.length}</span>
                                </div>
                                {hourlyData.data.vitals.length > 0 && (
                                    <div className="flex items-center bg-slate-100/80 rounded-xl p-1 border border-slate-200 shadow-sm no-print">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="p-1.5 hover:bg-white rounded-lg disabled:opacity-30 transition-all"
                                        >
                                            <ChevronDown size={14} className="rotate-90 text-slate-600" />
                                        </button>
                                        <div className="px-3 flex flex-col items-center">
                                            <span className="text-[10px] font-black text-blue-600 leading-none">{currentPage}</span>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">
                                                {Math.max(0, Math.ceil(hourlyData.data.vitals.length / itemsPerPage) - currentPage)} more
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(hourlyData.data.vitals.length / itemsPerPage), prev + 1))}
                                            disabled={currentPage === Math.ceil(hourlyData.data.vitals.length / itemsPerPage) || hourlyData.data.vitals.length === 0}
                                            className="p-1.5 hover:bg-white rounded-lg disabled:opacity-30 transition-all"
                                        >
                                            <ChevronDown size={14} className="-rotate-90 text-slate-600" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Time</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Heart Rate</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">BP (Sys/Dia)</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">SpO2</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Temp</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center text-rose-500">Resp. Rate</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Glucose</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nurse</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {hourlyData.data.vitals.length > 0 ? (
                                        [...hourlyData.data.vitals].reverse().map((v: any, idx: number) => {
                                            const isPageRecord = idx >= (currentPage - 1) * itemsPerPage && idx < currentPage * itemsPerPage;
                                            return (
                                                <tr key={idx} className={`hover:bg-slate-50/50 transition-colors group ${!isPageRecord ? 'hidden-on-ui' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <Clock size={14} className="text-slate-300" />
                                                            <span className="text-xs font-black text-slate-700">{format(new Date(v.timestamp), 'HH:mm')}</span>
                                                        </div>
                                                        <div className="flex flex-col mt-0.5">
                                                            <span className="text-[10px] font-black text-slate-500 uppercase">{format(new Date(v.timestamp), 'dd MMM (EEE)')}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`text-sm font-black ${v.heartRate > 100 || v.heartRate < 60 ? 'text-rose-500' : 'text-slate-700'}`}>
                                                            {v.heartRate}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 ml-1">bpm</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-xs font-black text-slate-700">
                                                            {v.systolicBP}/{v.diastolicBP}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className={`text-sm font-black ${v.spO2 < 94 ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>
                                                                {v.spO2}%
                                                            </span>
                                                            <div className="w-12 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                                <div
                                                                    className={`h-full ${v.spO2 < 94 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                                    style={{ width: `${v.spO2}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-xs font-bold text-slate-700">{v.temperature}°F</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-xs font-black text-rose-500">{v.respiratoryRate || '--'}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-slate-700">{v.glucose || '--'} mg/dL</span>
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">{v.glucoseType}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-[10px] font-black uppercase border border-indigo-100">
                                                                {v.recordedBy?.name?.charAt(0)}
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-600">{v.recordedBy?.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${v.status === 'Critical' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                            v.status === 'Warning' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                            }`}>
                                                            {v.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="px-6 py-12 text-center">
                                                <div className="bg-slate-50 inline-flex p-4 rounded-3xl mb-4">
                                                    <Activity size={32} className="text-slate-300" />
                                                </div>
                                                <p className="text-sm font-black text-slate-500 uppercase tracking-widest">No vitals logged yet</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Medication Log */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                    <Pill size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Medication Administration</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Treatment Execution Record</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Drug & Dose</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Time & Slot</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Nurse</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {hourlyData.data.meds.length > 0 ? (
                                            [...hourlyData.data.meds].map((m: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black text-slate-800">{m.drugName}</span>
                                                            <span className="text-[10px] font-bold text-slate-500">{m.dose} • {m.route}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black text-slate-700">{format(new Date(m.timestamp), 'HH:mm')}</span>
                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${m.timeSlot === 'Morning' ? 'text-amber-500' :
                                                                m.timeSlot === 'Afternoon' ? 'text-blue-500' : 'text-indigo-600'
                                                                }`}>{m.timeSlot}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs font-bold text-slate-600">{m.administeredBy?.name}</span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-8 text-center text-xs font-bold text-slate-400 uppercase">No Medications Administered</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Diet Log */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                                <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                                    <Utensils size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Dietary Intake Log</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Food & Drink Consumption</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Items</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Category</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Time/Nurse</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {hourlyData.data.diet?.length > 0 ? (
                                            [...hourlyData.data.diet].map((d: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black text-slate-800">
                                                                {d.items?.map((item: any) => `${item.name || item} ${item.quantity ? `(${item.quantity})` : ''}`).join(', ')}
                                                            </span>
                                                            {d.items?.some((item: any) => item.calories) && (
                                                                <span className="text-[7px] font-bold text-amber-600 uppercase tracking-widest">
                                                                    {d.items.reduce((sum: number, i: any) => sum + (Number(i.calories) || 0), 0)} Kcal
                                                                </span>
                                                            )}
                                                            {d.notes && <span className="text-[9px] text-slate-400 italic font-medium">{d.notes}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-[9px] font-black uppercase tracking-widest border border-orange-100">
                                                            {d.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black text-slate-700">{d.recordedTime}</span>
                                                            <span className="text-[9px] font-black text-slate-500 uppercase">{format(new Date(d.timestamp), 'dd MMM (EEE)')}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{d.recordedBy?.name}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-8 text-center text-xs font-bold text-slate-400 uppercase">No Diet Logs Recorded</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Tests */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm lg:col-span-2">
                            <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <ClipboardList size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Diagnostics & Investigations</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Recent Lab Results</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    {hourlyData.data.labOrders.length > 0 ? (
                                        <div className="space-y-4">
                                            {hourlyData.data.labOrders.map((order: any, idx: number) => (
                                                <div key={idx} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 group hover:border-indigo-200 transition-all shadow-sm">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex gap-3">
                                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform flex-shrink-0">
                                                                <FlaskConical size={18} />
                                                            </div>
                                                            <div>
                                                                <div className="flex flex-wrap gap-2 mb-1">
                                                                    {order.tests?.map((t: any, tidx: number) => (
                                                                        <span key={tidx} className="text-xs font-black text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                                                                            {t.testName || t.test?.testName || 'Lab Investigation'}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                    By {hourlyData.data.admission.doctorName?.startsWith('Dr.') ? hourlyData.data.admission.doctorName : `Dr. ${hourlyData.data.admission.doctorName}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${order.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                                                }`}>
                                                                {order.status}
                                                            </span>
                                                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{format(new Date(order.createdAt), 'dd MMM, HH:mm')}</p>
                                                        </div>
                                                    </div>

                                                    {/* Lab Results Detail Display */}
                                                    <div className="mt-4 pt-4 border-t border-slate-200/50 space-y-3">
                                                        {order.tests?.map((test: any, testIdx: number) => (
                                                            <div key={testIdx} className="space-y-2">
                                                                {(test.subTests && test.subTests.length > 0) ? (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                        {test.subTests.map((st: any, stIdx: number) => (
                                                                            st.result !== undefined && st.result !== null && st.result !== '' ? (
                                                                                <div key={stIdx} className="flex justify-between items-center bg-white/50 p-2.5 rounded-xl border border-slate-100 transition-colors hover:bg-white">
                                                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{st.name}</span>
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <span className="text-xs font-black text-slate-900">{st.result}</span>
                                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{st.unit || '-'}</span>
                                                                                    </div>
                                                                                </div>
                                                                            ) : null
                                                                        ))}
                                                                    </div>
                                                                ) : test.resultValue ? (
                                                                    <div className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-slate-100">
                                                                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Result</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm font-black text-blue-600">{test.resultValue}</span>
                                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{test.unit || '-'}</span>
                                                                        </div>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <AlertCircle size={24} className="text-slate-200 mx-auto mb-2" />
                                            <p className="text-xs font-bold text-slate-400 uppercase">No lab reports found for this admission</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-[450px] bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
                        <Activity size={48} className="text-slate-200" />
                    </div>
                    <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Awaiting Patient Selection</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-2 max-w-sm leading-relaxed">
                        Please select an active inpatient from the dropdown above to view and download their consolidated hourly monitoring records.
                    </p>
                    <div className="mt-8 flex gap-3">
                        <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase border border-slate-100">ICU Registry</div>
                        <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase border border-slate-100">ER Monitoring</div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 15mm 10mm;
                    }
                    .no-print { display: none !important; }
                    body { 
                        background: white !important; 
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        font-size: 10pt;
                    }
                    .print-container { 
                        width: 100% !important; 
                        margin: 0 !important; 
                        padding: 0 !important;
                    }
                    /* Force layout to be visible and properly spaced */
                    .grid { display: flex !important; flex-wrap: wrap !important; gap: 15px !important; }
                    .lg\\:grid-cols-3 > :nth-child(1) { width: 65% !important; }
                    .lg\\:grid-cols-3 > :nth-child(2) { width: 32% !important; }
                    .lg\\:grid-cols-2 > * { width: 48% !important; }
                    
                    .Card, .bg-white {
                        border: 1px solid #f1f5f9 !important;
                        box-shadow: none !important;
                        border-radius: 12px !important;
                        margin-bottom: 12px !important;
                        break-inside: avoid;
                    }
                    
                    tbody { display: table-row-group !important; }
                    tr { page-break-inside: avoid !important; }
                    
                    /* Reset sticky for print */
                    .sticky { position: static !important; }
                    
                    /* Ensure all data shows in PDF */
                    .hidden-on-ui {
                        display: table-row !important;
                    }
                    
                    /* Tighten table spacing for "near near" look */
                    th, td {
                        padding: 6px 8px !important;
                    }
                    
                    /* Maintain colors */
                    .bg-blue-600 { background-color: #2563eb !important; border-radius: 8px !important; }
                    .text-white { color: white !important; }
                    .bg-emerald-500 { background-color: #10b981 !important; }
                }

                .hidden-on-ui {
                    display: none;
                }

                /* Custom Scrollbar for Dropdown */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>

            {/* Print Preview Modal */}
            {showPrintModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Print Preview</h2>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Patient Hourly Monitoring Record</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        const iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
                                        if (iframe?.contentWindow) {
                                            iframe.contentWindow.print();
                                        }
                                    }}
                                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 group"
                                >
                                    <Printer size={16} className="group-hover:rotate-12 transition-transform" />
                                    Print Document
                                </button>
                                <button
                                    onClick={() => setShowPrintModal(false)}
                                    className="p-3 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-2xl transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content - Iframe for isolation */}
                        <div className="flex-1 bg-slate-100/50 p-8 overflow-hidden">
                            <iframe
                                id="print-iframe"
                                srcDoc={printHtml}
                                className="w-full h-full bg-white rounded-3xl shadow-inner border border-slate-200"
                                title="Print Preview"
                            />
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-white border-t border-slate-100 flex justify-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">MS CureChain Hospital Management System &bull; Secure Report Gateway</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
