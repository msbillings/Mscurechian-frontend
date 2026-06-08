'use client';

import React, { useEffect, useState, useRef } from 'react';
import { LabSample } from '@/lib/integrations/types/labSample';
import { LabSampleService } from '@/lib/integrations/services/labSample.service';
import {
    FlaskConical,
    Download,
    Eye,
    Clock,
    CheckCircle2,
    History,
    Printer
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import ResultPrintView from '@/components/lab/ResultPrintView';
import { toast } from 'react-hot-toast';

function HospitalAdminEditedResultsPage() {
    const [editedSamples, setEditedSamples] = useState<LabSample[]>([]);
    const [loading, setLoading] = useState(true);
    const [printingSample, setPrintingSample] = useState<LabSample | null>(null);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        onAfterPrint: () => setPrintingSample(null),
    });

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (printingSample && printRef.current) {
            timer = setTimeout(() => {
                handlePrint();
            }, 150);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [printingSample, handlePrint]);

    useEffect(() => {
        fetchEditedSamples();
    }, []);

    const fetchEditedSamples = async () => {
        setLoading(true);
        try {
            const data = await LabSampleService.getEditedSamples(true);
            setEditedSamples(data.sort((a, b) =>
                new Date((b as any).editedAt || b.createdAt || '').getTime() -
                new Date((a as any).editedAt || a.createdAt || '').getTime()
            ));
        } catch (error) {
            console.error(error);
            toast.error("Failed to load edited results log");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10 ">
            {/* Header Tier */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase">Edited Test Reports</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-bold mt-2 uppercase tracking-[0.2em] text-[10px] ml-1 flex items-center gap-2">
                        <History className="w-3 h-3 text-indigo-500" />
                        Audit Trail of Modified Lab Results
                    </p>
                </div>
            </div>

            {/* Strategic Info Banner */}
            <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800/50 p-6 rounded-3xl flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">Quality Assurance Audit</h4>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">This log shows only those diagnostic test results that were modified by a technician after initial submission.</p>
                </div>
                <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Total Edited</p>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 text-center mt-1">{editedSamples.length.toString().padStart(2, '0')}</p>
                </div>
            </div>

            {/* Data manifest Console */}
            <div className="bg-white dark:bg-gray-800 rounded-[0.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                    <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID / Segment</th>
                                    <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Biological Patient</th>
                                    <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Material Type</th>
                                    <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Original Report Date</th>
                                    <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Edit Date & Time</th>
                                    <th className="px-2 md:px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Operation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                {loading ? (
                                    [...Array(3)].map((_, i) => (
                                        <tr key={i} className="opacity-50">
                                            <td colSpan={6} className="px-2 md:px-8 py-6"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full w-full"></div></td>
                                        </tr>
                                    ))
                                ) : editedSamples.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-2 md:px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-50">
                                                <FlaskConical className="w-12 h-12 text-gray-300" />
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">No Edited Reports Registered</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    editedSamples.map((sample) => {
                                        const editDate = (sample as any).editedAt ? new Date((sample as any).editedAt) : null;
                                        const formattedEditTime = editDate
                                            ? `${editDate.toLocaleDateString()} ${editDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                            : 'N/A';

                                        return (
                                            <tr key={sample._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 group">
                                                <td className="px-2 md:px-8 py-6">
                                                    <span className="text-[10px] font-black italic bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-xl uppercase">#{sample.sampleId}</span>
                                                </td>
                                                <td className="px-2 md:px-8 py-6">
                                                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tighter underline underline-offset-4 decoration-gray-100 dark:decoration-gray-800">{sample.patientDetails.name}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{sample.patientDetails.age}Y • {sample.patientDetails.gender}</p>
                                                </td>
                                                <td className="px-2 md:px-8 py-6">
                                                    <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-xl text-[9px] uppercase font-black tracking-widest border border-purple-100 dark:border-purple-800/30">
                                                        {sample.sampleType || 'LAB_UNIT'}
                                                    </span>
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {sample.tests.map((t, idx) => (
                                                            <span key={idx} className="text-[8px] font-bold text-gray-400 uppercase bg-gray-50 dark:bg-gray-900 px-2 py-0.5 rounded-full">{t.testName}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-2 md:px-8 py-6 text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(sample.reportDate || sample.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-2 md:px-8 py-6 text-xs font-bold text-gray-900 dark:text-white">
                                                    {formattedEditTime}
                                                </td>
                                                <td className="px-2 md:px-8 py-6 text-right">
                                                    <div className="flex justify-end gap-3 translate-x-4 group-hover:translate-x-0 opacity-100">
                                                        <button
                                                            onClick={() => setPrintingSample(sample)}
                                                            className="p-3 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl hover:bg-indigo-100"
                                                            title="Inspect / Print Report"
                                                        >
                                                            <Printer className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Hidden Print Anchor */}
            <div className="hidden">
                <div ref={printRef}>
                    {printingSample && <ResultPrintView sample={printingSample} />}
                </div>
            </div>
        </div>
    );
}

export default React.memo(HospitalAdminEditedResultsPage);
