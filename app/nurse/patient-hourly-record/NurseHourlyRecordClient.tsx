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
    Printer
} from 'lucide-react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { Card } from '@/components/admin';
import { format, differenceInCalendarDays } from 'date-fns';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import { generateNurseHourlyRecordHtml } from '@/lib/utils/nurse-print-vitals';

export default function NurseHourlyRecordClient() {
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
        const html = generateNurseHourlyRecordHtml({
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
        worksheet.addRow(['Doctor:', admission.doctorName, '', 'Admission Date:', format(new Date(admission.admissionDate), 'dd MMM yyyy HH:mm')]);
        worksheet.addRow(['Diet Plan:', admission.diet || 'Regular Diet']);
        worksheet.addRow([]);

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
            d.items?.join(', '),
            d.category,
            d.recordedTime,
            format(new Date(d.timestamp), 'dd MMM yyyy (EEEE)'),
            d.recordedBy?.name,
            d.notes || '-'
        ]);
        worksheet.addRows(dietRows);

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
                                <span className="truncate">
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
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:shadow-none group"
                    >
                        <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
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
                                            <p className="text-sm font-black text-slate-700 truncate">
                                                Dr. {hourlyData.data.admission.doctorName}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
                                                <ClipboardList size={10} className="text-indigo-500" />
                                                Ward Details
                                            </p>
                                            <p className="text-sm font-black text-slate-700 truncate">
                                                {hourlyData.data.admission.wardName ? (
                                                    <span>
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

                    {/* Tables and other logs omitted for brevity in Nurse copy, keeping core structure */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
                                    <Activity size={18} />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Hourly Observation History</h3>
                            </div>
                        </div>
                        <div className="p-6 text-center py-20 text-slate-400">
                            <FileText size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest">Select "Download Report" to view consolidated PDF logic</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-[450px] bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-8">
                    <Activity size={48} className="text-slate-200 mb-6" />
                    <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Awaiting Patient Selection</h3>
                </div>
            )}

            {/* RESPONSIVE Nurse Print Preview Modal */}
            {showPrintModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full h-full sm:max-w-6xl sm:h-[92vh] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header - Responsive Padding */}
                        <div className="px-4 py-3 sm:px-8 sm:py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="p-2 sm:p-3 bg-blue-600 text-white rounded-xl sm:rounded-2xl shadow-lg">
                                    <FileText size={20} className="sm:w-6 sm:h-6" />
                                </div>
                                <div>
                                    <h2 className="text-sm sm:text-xl font-black text-slate-900 uppercase tracking-tight">Preview</h2>
                                    <p className="text-[8px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Hourly Monitoring Record</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <button
                                    onClick={() => {
                                        const iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
                                        if (iframe?.contentWindow) {
                                            iframe.contentWindow.print();
                                        }
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-lg sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all group"
                                >
                                    <Printer size={14} className="sm:w-4 sm:h-4 group-hover:rotate-12 transition-transform" />
                                    <span className="hidden xs:inline">Print Document</span>
                                </button>
                                <button
                                    onClick={() => setShowPrintModal(false)}
                                    className="p-2 sm:p-3 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg sm:rounded-2xl transition-all"
                                >
                                    <X size={20} className="sm:w-6 sm:h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content - Responsive Padding */}
                        <div className="flex-1 bg-slate-100/50 p-2 sm:p-8 overflow-hidden">
                            <iframe
                                id="print-iframe"
                                srcDoc={printHtml}
                                className="w-full h-full bg-white sm:rounded-3xl shadow-inner border border-slate-200"
                                title="Print Preview"
                            />
                        </div>

                        {/* Modal Footer - Hidden on very small screens to save space */}
                        <div className="hidden sm:flex p-4 bg-white border-t border-slate-100 justify-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">MS CureChain Hospital Management System &bull; Secure Report Gateway</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
