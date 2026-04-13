'use client';

import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/integrations/api/apiClient';
import { toast } from 'react-hot-toast';
import {
    Upload, FileSpreadsheet, ChevronLeft, Download, CheckCircle2,
    AlertTriangle, SkipForward, X, FlaskConical, Building2, ArrowRight,
    Info, RefreshCw
} from 'lucide-react';

type ImportMode = 'tests' | 'departments';

interface PreviewRow {
    [key: string]: any;
}

// ─── column header normaliser ───────────────────────────────────────────────
// Maps every variant we might see to our canonical key
const TEST_COLUMNS: Record<string, string> = {
    testname: 'testName', 'test name': 'testName',
    price: 'price',
    unit: 'unit',
    sampletype: 'sampleType', 'sample type': 'sampleType',
    testcode: 'testCode', 'test code': 'testCode',
    shortname: 'shortName', 'short name': 'shortName',
    category: 'category',
    methodology: 'methodology', mentionto: 'methodology', method: 'methodology',
    turnaroundtime: 'turnaroundTime', 'turnaround time': 'turnaroundTime', tat: 'turnaroundTime',
    departmentname: 'departmentName', 'department name': 'departmentName', department: 'departmentName',
    fastingrequired: 'fastingRequired', fasting: 'fastingRequired',
    isactive: 'isActive',
};

const DEPT_COLUMNS: Record<string, string> = {
    name: 'name',
    code: 'code',
    description: 'description',
    isactive: 'isActive',
};

function normaliseKey(raw: string, map: Record<string, string>): string {
    const lower = raw.trim().toLowerCase();
    return map[lower] || raw.trim();
}

function normaliseRow(row: Record<string, any>, map: Record<string, string>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
        // Pass result parameter columns through unchanged
        if (/^(result_|Result_|label_|unit_|range_|type_|required_)/i.test(k)) {
            out[k] = v;
        } else {
            out[normaliseKey(k, map)] = v;
        }
    }
    return out;
}

// ─── download template helper ────────────────────────────────────────────────
function downloadTestTemplate() {
    const headers = [
        'testName', 'price', 'unit', 'sampleType', 'testCode', 'shortName',
        'category', 'methodology', 'turnaroundTime', 'departmentName',
        'fastingRequired', 'isActive',
        'Result_1', 'Result_1_Unit', 'Result_1_Range', 'Result_1_type', 'Result_1_Required',
        'Result_2', 'Result_2_Unit', 'Result_2_Range', 'Result_2_type', 'Result_2_Required',
        'Result_3', 'Result_3_Unit', 'Result_3_Range', 'Result_3_type', 'Result_3_Required',
        'Result_4', 'Result_4_Unit', 'Result_4_Range', 'Result_4_type', 'Result_4_Required',
        'Result_5', 'Result_5_Unit', 'Result_5_Range', 'Result_5_type', 'Result_5_Required',
    ];
    const example = [
        'Complete Blood Count', 400, 'mg/dL', 'Blood', 'CBC01', 'CBC',
        'Hematology', 'Automated', '17 Hours', 'Hematology',
        'FALSE', 'TRUE',
        'Hemoglobin', 'g/dL', '11.8-17.2', 'number', 'TRUE',
        'WBC Count', 'cells/µL', '4500-11000', 'number', 'FALSE',
        'Platelets', 'cells/µL', '150000-400000', 'number', 'FALSE',
        '', '', '', '', '',
        '', '', '', '', '',
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Lab_Test_Template');
    XLSX.writeFile(wb, 'lab_test_template.xlsx');
}

function downloadDeptTemplate() {
    const headers = ['Name', 'Code', 'Description', 'IsActive'];
    const examples = [
        ['Biochemistry', 'BIO01', 'Handles blood chemistry and metabolic panels', 'TRUE'],
        ['Hematology', 'HEM01', 'Handles blood cell counts and coagulation', 'TRUE'],
        ['Microbiology', 'MIC01', 'Deals with cultures and infectious diseases', 'TRUE'],
        ['Pathology', 'PAT01', 'General disease diagnosis through lab analysis', 'TRUE'],
        ['Immunology', 'IMM01', 'Handles immune system related testing', 'TRUE'],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Departments');
    XLSX.writeFile(wb, 'lab_departments_template.xlsx');
}

export default function BulkImportPage() {
    const router = useRouter();
    const [mode, setMode] = useState<ImportMode>('tests');
    const [dragging, setDragging] = useState(false);
    const [fileName, setFileName] = useState('');
    const [rows, setRows] = useState<PreviewRow[]>([]);
    const [previewCols, setPreviewCols] = useState<string[]>([]);
    const [importing, setImporting] = useState(false);
    const [forceUpdate, setForceUpdate] = useState(false);
    const [result, setResult] = useState<{ created: number; updated?: number; skipped: number; errors: string[] } | null>(null);

    const processFile = (file: File) => {
        setResult(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const jsonRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

                const colMap = mode === 'tests' ? TEST_COLUMNS : DEPT_COLUMNS;
                const normalised = jsonRows.map(r => normaliseRow(r, colMap));
                setRows(normalised);

                // Determine preview columns (first 8 key columns only to avoid horizontal overflow)
                const allKeys = Object.keys(normalised[0] || {});
                const primaryKeys = mode === 'tests'
                    ? ['testName', 'price', 'unit', 'sampleType', 'departmentName', 'methodology', 'turnaroundTime', 'isActive']
                    : ['name', 'code', 'description', 'isActive'];
                const visibleKeys = primaryKeys.filter(k => allKeys.includes(k));
                setPreviewCols(visibleKeys.length > 0 ? visibleKeys : allKeys.slice(0, 8));
                setFileName(file.name);
                toast.success(`Loaded ${normalised.length} rows from ${file.name}`);
            } catch (err) {
                toast.error('Failed to parse file. Make sure it is a valid .xlsx or .csv file.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, [mode]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleImport = async () => {
        if (rows.length === 0) { toast.error('No data to import'); return; }
        setImporting(true);
        const toastId = toast.loading(`Importing ${rows.length} ${mode}...`);
        try {
            let res: any;
            if (mode === 'tests') {
                res = await apiClient('/lab/tests/bulk', {
                    method: 'POST',
                    body: JSON.stringify({ tests: rows, forceUpdate }),
                });
            } else {
                res = await apiClient('/lab/departments/bulk', {
                    method: 'POST',
                    body: JSON.stringify({ departments: rows }),
                });
            }
            setResult(res);
            const msg = forceUpdate
                ? `Done! Created: ${res.created}, Updated: ${res.updated ?? 0}, Skipped: ${res.skipped}`
                : `Done! Created: ${res.created}, Skipped: ${res.skipped}`;
            toast.success(msg, { id: toastId });
        } catch (err: any) {
            toast.error(err.message || 'Import failed', { id: toastId });
        } finally {
            setImporting(false);
        }
    };

    const reset = () => {
        setRows([]);
        setFileName('');
        setResult(null);
        setPreviewCols([]);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">

            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors shrink-0"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none shrink-0">
                                <FileSpreadsheet className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white">Bulk Import</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Import lab tests or departments from an Excel / CSV file</p>
                            </div>
                        </div>
                    </div>

                    {/* Download Templates */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <button
                            onClick={downloadDeptTemplate}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Dept Template
                        </button>
                        <button
                            onClick={downloadTestTemplate}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Tests Template
                        </button>
                    </div>
                </div>

                {/* Mode Selector */}
                <div className="flex flex-col md:flex-row md:items-center gap-3 mt-6">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                        <button
                            onClick={() => { setMode('departments'); reset(); }}
                            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'departments'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 dark:shadow-none'
                                : 'bg-slate-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            <Building2 className="w-4 h-4" />
                            Import Departments
                        </button>
                        <div className="hidden sm:flex items-center justify-center">
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>
                        <button
                            onClick={() => { setMode('tests'); reset(); }}
                            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'tests'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none'
                                : 'bg-slate-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            <FlaskConical className="w-4 h-4" />
                            Import Lab Tests
                        </button>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-400 font-bold w-full md:w-auto">
                        <Info className="w-4 h-4 shrink-0" />
                        Import departments first, then tests
                    </div>
                </div>

                {/* Force Update Toggle — only for tests */}
                {mode === 'tests' && (
                    <div className="mt-4 flex items-center gap-3">
                        <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all w-full sm:w-auto ${
                            forceUpdate
                                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                                : 'bg-white dark:bg-gray-700/50 border-slate-200 dark:border-gray-700 hover:border-slate-300'
                        }`}>
                            <input
                                type="checkbox"
                                checked={forceUpdate}
                                onChange={e => setForceUpdate(e.target.checked)}
                                className="w-4 h-4 rounded accent-orange-500 shrink-0"
                            />
                            <div className="flex items-center gap-2">
                                <RefreshCw className={`w-4 h-4 shrink-0 ${forceUpdate ? 'text-orange-500' : 'text-gray-400'}`} />
                                <span className={`text-sm font-bold ${forceUpdate ? 'text-orange-700 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                    Force Update existing tests
                                </span>
                            </div>
                        </label>
                        {forceUpdate && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-orange-50/50 dark:bg-orange-900/10 rounded-lg">
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                <p className="text-xs text-orange-600 dark:text-orange-400 font-bold">
                                    Existing tests will be overwritten
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Column Guide */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-3">
                    {mode === 'departments' ? 'Departments Template Columns' : 'Lab Tests Template Columns'}
                </p>
                {mode === 'departments' ? (
                    <div className="flex flex-wrap gap-2">
                        {['Name *', 'Code', 'Description', 'IsActive (TRUE/FALSE)'].map(c => (
                            <span key={c} className="px-2.5 py-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg text-xs font-mono font-semibold text-blue-800 dark:text-blue-300">
                                {c}
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                            {['testName *', 'price *', 'sampleType', 'testCode', 'shortName', 'category', 'methodology', 'turnaroundTime', 'departmentName', 'fastingRequired', 'isActive'].map(c => (
                                <span key={c} className="px-2.5 py-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg text-xs font-mono font-semibold text-blue-800 dark:text-blue-300">
                                    {c}
                                </span>
                            ))}
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                            + Result columns (repeat pattern for each result field):
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {['Result_1', 'Result_1_Unit', 'Result_1_Range', 'Result_1_type (number/text)', 'Result_1_Required (TRUE/FALSE)', 'Result_2…'].map(c => (
                                <span key={c} className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs font-mono font-semibold text-indigo-800 dark:text-indigo-300">
                                    {c}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Upload Zone */}
            {rows.length === 0 ? (
                <label
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center w-full min-h-[240px] rounded-2xl border-2 border-dashed cursor-pointer transition-all
                        ${dragging
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.01]'
                            : 'border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10'
                        }`}
                >
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
                    <div className={`p-5 rounded-2xl mb-4 transition-all ${dragging ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-slate-100 dark:bg-gray-700'}`}>
                        <Upload className={`w-10 h-10 transition-colors ${dragging ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                    <p className="text-base font-bold text-gray-700 dark:text-gray-200 mb-1">
                        Drop your Excel / CSV file here
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                        or <span className="text-indigo-600 font-semibold">click to browse</span> — .xlsx, .xls, .csv supported
                    </p>
                    <p className="text-xs text-gray-400 mt-3 font-medium">
                        Download the template above ↑ and fill it in
                    </p>
                </label>
            ) : (
                <div className="space-y-4">
                    {/* File info bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-4 sm:px-6 sm:py-4 shadow-sm gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl shrink-0">
                                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 break-all">{fileName}</p>
                                <p className="text-xs text-gray-500 font-medium">{rows.length} rows ready to import</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleImport}
                                disabled={importing}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 dark:shadow-none transition-all"
                            >
                                {importing ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importing...</>
                                ) : (
                                    <><Upload className="w-4 h-4" />Import {rows.length} Rows</>
                                )}
                            </button>
                            <button 
                                onClick={reset} 
                                className="p-3 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl border border-slate-200 dark:border-gray-700 transition-all shadow-sm"
                                title="Cancel Import"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Result banner */}
                        {result && (
                        <div className={`flex flex-wrap items-center gap-6 px-6 py-4 rounded-xl border text-sm font-semibold ${
                            result.errors.length > 0
                                ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                                : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                            }`}>
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Created: <strong>{result.created}</strong></span>
                            {(result.updated ?? 0) > 0 && (
                                <span className="flex items-center gap-1.5"><RefreshCw className="w-4 h-4" /> Updated: <strong>{result.updated}</strong></span>
                            )}
                            <span className="flex items-center gap-1.5"><SkipForward className="w-4 h-4" /> Skipped: <strong>{result.skipped}</strong></span>
                            {result.errors.length > 0 && (
                                <span className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Errors: <strong>{result.errors.length}</strong></span>
                            )}
                            {result.errors.length > 0 && (
                                <details className="w-full mt-2 text-xs">
                                    <summary className="cursor-pointer font-bold">Show error details</summary>
                                    <ul className="mt-2 space-y-1">
                                        {result.errors.map((e, i) => <li key={i} className="text-rose-600">• {e}</li>)}
                                    </ul>
                                </details>
                            )}
                        </div>
                    )}

                    {/* Preview Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Preview (first 20 rows)</p>
                            <span className="text-xs text-gray-400 font-medium">{rows.length} total rows</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-gray-900/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">#</th>
                                        {previewCols.map(col => (
                                            <th key={col} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
                                    {rows.slice(0, 20).map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-gray-700/20 transition-colors">
                                            <td className="px-4 py-3 text-xs text-gray-400 font-mono">{i + 1}</td>
                                            {previewCols.map(col => (
                                                <td key={col} className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[200px] truncate">
                                                    {row[col] !== undefined && row[col] !== '' ? String(row[col]) : <span className="text-gray-300">—</span>}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {rows.length > 20 && (
                                <div className="px-6 py-3 bg-slate-50 dark:bg-gray-900/30 border-t border-slate-100 dark:border-gray-700 text-xs text-gray-400 text-center font-medium">
                                    +{rows.length - 20} more rows not shown in preview
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
