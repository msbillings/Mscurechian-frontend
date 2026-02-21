'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LabTestService } from '@/lib/integrations/services/labTest.service';
import { TestParameter } from '@/lib/integrations/types/labTest';
import { LabSampleService } from '@/lib/integrations/services/labSample.service';
import { LabSample, SampleTestResult } from '@/lib/integrations/types/labSample';
// Dynamic result parameters - loaded from test configuration
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import LabReportTemplate from '@/components/lab/LabReportTemplate';
import { toast } from 'react-hot-toast';
import { LabSettingsService } from '@/lib/integrations/services/labSettings.service';
import { Download, ArrowLeft, Printer, FileText, Send } from 'lucide-react';
import { invalidateCachePattern } from '@/lib/integrations/api/apiClient';
import { API_CONFIG } from '@/lib/integrations/config/api-config';

export default function LabResultEntryPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();

    const [sample, setSample] = useState<LabSample | null>(null);
    const [labInfo, setLabInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showReport, setShowReport] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Initialize form values from existing data (Moved Hook to Top Level)
    const [formValues, setFormValues] = useState<Record<number, Record<string, string>>>({});

    const isCompleted = sample?.status?.toLowerCase() === 'completed';
    const printRef = useRef<HTMLDivElement>(null);

    // Sync form values when sample data is loaded
    useEffect(() => {
        if (sample && sample.tests) {
            const initial: Record<number, Record<string, string>> = {};
            sample.tests.forEach((test, idx) => {
                // Use dynamic resultParameters from test configuration
                const testData = (test as any);
                const resultParams = testData.resultParameters || [];
                initial[idx] = {};

                if (resultParams && resultParams.length > 0) {
                    resultParams.forEach((param: any) => {
                        // Find existing result in subtests
                        const existing = test.subTests?.find(st => st.name === param.label);
                        if (existing) {
                            initial[idx][param.label] = existing.result || '';
                        }
                    });
                } else {
                    // Fallback for single-value tests
                    initial[idx]['main_result'] = test.resultValue || '';
                }
            });
            setFormValues(initial);
        }
    }, [sample]);

    // Memoized print handler
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Lab_Report_${sample?.sampleId || 'Unknown'}`,
    });

    const handleDownload = async () => {
        const element = printRef.current;
        if (!element) {
            toast.error('Report element not found');
            return;
        }

        const toastId = toast.loading('Generating PDF...');
        try {
            const canvas = await html2canvas(element, {
                scale: 3, // Increased for better quality
                logging: false,
                useCORS: true,
                backgroundColor: '#ffffff',
                allowTaint: true,
                imageTimeout: 0,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 5; // 5mm margin (User preferred previous width)

            const imgWidth = pdfWidth - (margin * 2);
            const imgHeight = pdfHeight - (margin * 2); // Force fit to height to ensure bottom border is visible

            pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
            pdf.save(`Lab_Report_${sample?.sampleId || 'download'}.pdf`);
            toast.success('PDF Downloaded', { id: toastId });
        } catch (error) {
            console.error('PDF generation failed:', error);
            toast.error('Failed to generate PDF', { id: toastId });
        }
    };

    const handleNotifyDoctor = async () => {
        if (!sample || !sample._id) {
            toast.error('Sample information not available');
            return;
        }

        const toastId = toast.loading('Notifying doctor...');
        try {
            const token = sessionStorage.getItem('accessToken');
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/lab/orders/${sample._id}/notify-doctor`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = await response.json();

            if (response.ok) {
                toast.success('Doctor notified successfully! 📧', { id: toastId });
            } else {
                toast.error(data.message || 'Failed to notify doctor', { id: toastId });
            }
        } catch (error) {
            console.error('Notify doctor error:', error);
            toast.error('Failed to send notification', { id: toastId });
        }
    };

    useEffect(() => {
        if (id) {
            // Parallel data fetching for better performance
            Promise.all([fetchSample(), fetchLabInfo()]);
        }
    }, [id]);

    const fetchLabInfo = async () => {
        try {
            const settings = await LabSettingsService.getSettings();
            if (settings) setLabInfo(settings);
        } catch (error) {
            console.error('Failed to load lab settings', error);
        }
    };

    const fetchSample = async (skipCache = false) => {
        setLoading(true);
        try {
            const data = await LabSampleService.getSampleById(id, skipCache);
            setSample(data);

            if (data.status?.toLowerCase() === 'completed') {
                setShowReport(true);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load sample details');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (testIndex: number, key: string, value: string) => {
        setFormValues(prev => ({
            ...prev,
            [testIndex]: {
                ...prev[testIndex],
                [key]: value
            }
        }));
    };

    const handleSubmit = async () => {
        if (!sample) return;
        setSubmitting(true);
        const toastId = toast.loading('Saving results...');

        try {
            // Reconstruct the tests array with new values
            const updatedTests = sample.tests.map((test, idx) => {
                // Use dynamic resultParameters from test
                const testData = (test as any);
                const resultParams = testData.resultParameters || [];
                const values = formValues[idx] || {};

                if (resultParams && resultParams.length > 0) {
                    // Map result params to subtests
                    const subTests = resultParams.map((param: any) => ({
                        name: param.label,
                        result: values[param.label] || '',
                        unit: param.unit || '',
                        range: param.normalRange || ''
                    }));

                    return {
                        ...test,
                        subTests: subTests,
                        resultValue: values['main_result'],
                        remarks: values['remarks'],
                        status: 'Completed' as const
                    };
                } else {
                    // Single value update
                    return {
                        ...test,
                        resultValue: values['main_result'],
                        remarks: values['remarks'],
                        status: 'Completed' as const
                    };
                }
            });

            // Check if all tests are completed
            const payload = {
                tests: updatedTests,
                status: 'Completed',
                reportDate: new Date().toISOString()
            };

            await LabSampleService.updateResults(sample._id, payload);

            invalidateCachePattern('/lab/dashboard-stats');
            window.dispatchEvent(new Event('refresh-lab-data'));

            toast.success('Results saved successfully!', { id: toastId });
            await fetchSample(true);
            setSubmitting(false);
        } catch (error) {
            console.error(error);
            toast.error('Failed to save results', { id: toastId });
            setSubmitting(false);
        }
    };

    // Conditional Renders (Must come after all hooks)
    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 animate-pulse">Loading report...</p>
        </div>
    );

    if (!sample) return <div className="p-20 text-center text-rose-500 font-semibold">Sample Not Found</div>;

    if (showReport && isCompleted) {
        return (
            <div className="max-w-[1200px] mx-auto space-y-6 pb-12 px-4 md:px-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/lab/samples')}
                                className="p-2.5 bg-slate-100 dark:bg-gray-700 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </button>
                            <div className="p-3 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-100 dark:shadow-none">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lab Report</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Sample ID: {sample.sampleId}</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handlePrint}
                                className="px-4 py-2.5 bg-gray-900 dark:bg-gray-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-sm"
                            >
                                <Printer size={16} /> Print Report
                            </button>
                            <button
                                onClick={handleDownload}
                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Download size={16} /> Download PDF
                            </button>
                            {/* Show Send to Doctor for doctor-referred tests */}
                            {(sample.referredBy || !sample.isWalkIn) && (
                                <button
                                    onClick={handleNotifyDoctor}
                                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Send size={16} /> Send to Doctor
                                </button>
                            )}
                            <button
                                onClick={() => router.push('/lab/samples')}
                                className="px-4 py-2.5 bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Back to Samples
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700 p-4 md:p-8 shadow-sm overflow-hidden">
                    <LabReportTemplate ref={printRef} sample={sample} labInfo={labInfo} />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto space-y-8 pb-12 px-4 md:px-8">
            <div className="flex items-center gap-4 mb-2">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Result Entry</h1>
                    <p className="text-sm text-gray-500">Sample #{sample.sampleId} • {sample.patientDetails.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                            Changes saved automatically to session
                        </span>
                    </div>
                </div>
            </div>

            {sample.tests.map((test, idx) => {
                // Use dynamic resultParameters from test configuration
                const testData = (test as any);
                const resultParams = testData.resultParameters || [];
                const hasParams = resultParams && resultParams.length > 0;

                return (
                    <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100 dark:border-gray-700">
                            <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{test.testName}</h2>
                        </div>

                        {hasParams ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                                {resultParams.map((param: any, paramIdx: number) => (
                                    <div key={paramIdx} className={`${param.fieldType === 'textarea' ? 'md:col-span-2' : ''}`}>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            {param.label} {param.unit && <span className="text-gray-400 normal-case">({param.unit})</span>}
                                            {param.isRequired && <span className="text-rose-500 ml-1">*</span>}
                                        </label>
                                        {param.normalRange && (
                                            <p className="text-xs text-gray-400 mb-1">Range: {param.normalRange}</p>
                                        )}
                                        {param.example && (
                                            <p className="text-xs text-indigo-500 mb-1">Example: {param.example}</p>
                                        )}

                                        <div className="relative">
                                            <input
                                                type={param.fieldType === 'number' ? 'number' : 'text'}
                                                value={formValues[idx]?.[param.label] || ''}
                                                onChange={(e) => handleInputChange(idx, param.label, e.target.value)}
                                                placeholder={param.example || `Enter ${param.label}`}
                                                required={param.isRequired}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-gray-900 dark:text-white"
                                            />
                                            {param.unit && (
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                                    {param.unit}
                                                </span>
                                            )}
                                        </div>
                                        {param.remarks && (
                                            <p className="text-xs text-gray-500 mt-1 italic">{param.remarks}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 px-6 bg-slate-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-slate-300 dark:border-gray-700">
                                <div className="mb-3">
                                    <svg className="w-16 h-16 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Result Fields Configured</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    This test doesn't have any result entry fields configured.
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Please edit the test in Test Master and add result fields using the "Result Fields" section.
                                </p>
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Overall Remarks (Optional)
                            </label>
                            <textarea
                                value={formValues[idx]?.['remarks'] || ''}
                                onChange={(e) => handleInputChange(idx, 'remarks', e.target.value)}
                                placeholder="Any additional observations..."
                                rows={3}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-none ring-1 ring-gray-100 dark:ring-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm resize-none"
                            />
                        </div>
                    </div>
                );
            })}

            <div className="flex justify-end gap-3 pt-4">
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:translate-y-[-2px] active:translate-y-[0px] transition-all flex items-center gap-2"
                >
                    {submitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Submitting Report...
                        </>
                    ) : (
                        'Report Submission'
                    )}
                </button>

                {/* Only show Send to Doctor if: 1) has doctor, 2) results submitted */}
                {(sample.referredBy || !sample.isWalkIn) && (sample.status?.toLowerCase() === 'completed' || sample.status?.toLowerCase() === 'processing') && (
                    <button
                        onClick={handleNotifyDoctor}
                        disabled={submitting}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold uppercase tracking-widest shadow-xl shadow-blue-100 dark:shadow-none hover:translate-y-[-2px] active:translate-y-[0px] transition-all flex items-center gap-2"
                    >
                        <Send size={20} />
                        Send to Doctor
                    </button>
                )}
            </div>
        </div>
    );
}
