'use client';
import React from 'react';


import { FlaskConical, Calendar, User, FileText, AlertCircle } from 'lucide-react';
import { Card } from '@/components/admin';
import { format } from 'date-fns';

interface Test {
    name: string;
    testName?: string;
    category: string;
    instructions?: string;
    result?: string | null;
    status?: string;
    isAbnormal?: boolean;
    remarks?: string;
    subTests?: {
        name: string;
        result: string;
        unit: string;
        range: string;
    }[];
}

interface LabRecord {
    _id: string;
    tokenNumber: string;
    tests: Test[];
    priority: 'routine' | 'urgent' | 'stat';
    status: 'pending' | 'collected' | 'processing' | 'completed' | 'prescribed' | 'sample_collected';
    notes?: string;
    createdAt: string;
    source?: 'lab-token' | 'lab-order';
    paymentStatus?: string;
    resultsEnteredAt?: string;
    completedAt?: string;
    doctor: {
        user?: {
            name: string;
        };
        name?: string; // Fallback
        specialties?: string[];
    };
    hospital: {
        name: string;
    };
    appointment?: {
        appointmentId: string;
        date: string;
    };
}

interface LabRecordsSectionProps {
    labRecords: LabRecord[];
    patientName?: string;
    patientEmail?: string;
}

export default function LabRecordsSection({
    labRecords,
    patientName = 'Valued Patient',
    patientEmail = ''
}: LabRecordsSectionProps) {
    const [expandedResults, setExpandedResults] = React.useState<Record<string, boolean>>({});

    const toggleResults = (id: string) => {
        setExpandedResults(prev => ({ ...prev, [id]: !prev[id] }));
    };



    const getStatusColor = (status: string) => {
        const s = (status || '').toLowerCase();
        const colors: Record<string, string> = {
            'pending': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            'collected': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            'sample_collected': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            'processing': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            'completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            'prescribed': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        };
        return colors[s] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    };

    const getPriorityColor = (priority: string) => {
        const p = (priority || '').toLowerCase();
        const colors: Record<string, string> = {
            'routine': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            'urgent': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            'stat': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        return colors[p] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    };

    if (!labRecords || labRecords.length === 0) {
        return (
            <Card className="p-8 text-center">
                <FlaskConical className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No lab records found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your lab test records will appear here</p>
            </Card>
        );
    }

    // Split records into results (completed) and requests (pending)
    const results = labRecords.filter(r => r.status === 'completed');
    const requests = labRecords.filter(r => r.status !== 'completed');

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* New Results Section - Highlighted */}
            {results.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1 border-l-4 border-green-500 pl-4 py-1">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
                                Latest <span className="text-green-600">Results</span>
                            </h2>
                            <p className="text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">Available Laboratory Reports</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {results.map((record) => (
                            <div key={record._id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-4xl p-6 sm:p-8 shadow-2xl shadow-purple-500/10 dark:shadow-none mb-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 dark:bg-green-900/10 rounded-full -mr-16 -mt-16 opacity-50" />
                                
                                <div className="flex flex-col md:flex-row justify-between gap-4 relative z-10">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-gray-950 dark:text-white text-lg uppercase tracking-tight leading-none">
                                                    Report #{record.tokenNumber}
                                                </h3>
                                                <p className="text-xs font-bold text-gray-400 uppercase mt-1">Completed {format(new Date(record.completedAt || record.createdAt), 'MMM dd, yyyy')}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                                            <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl">
                                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Clinic/Hospital</p>
                                                <p className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase truncate">{record.hospital.name}</p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl">
                                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Physician</p>
                                                <p className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase truncate">
                                                    {record.doctor?.user?.name || record.doctor?.name || 'Staff'}
                                                </p>
                                            </div>
                                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-2xl border border-green-100 dark:border-green-900/30 flex items-center justify-center">
                                                <span className="text-[10px] font-black uppercase tracking-tightest text-green-700 dark:text-green-400">READY TO VIEW</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button 
                                                onClick={() => toggleResults(record._id)}
                                                className="w-full sm:w-auto px-10 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-gray-500/10 hover:scale-[1.02] active:scale-95 transition-all"
                                            >
                                                {expandedResults[record._id] ? 'Hide Record Details' : 'View Medical Results'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {expandedResults[record._id] && (
                                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <div className="grid grid-cols-1 gap-3">
                                            {record.tests.map((test, tidx) => (
                                                <div key={tidx} className={`p-4 rounded-2xl border ${test.isAbnormal ? 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' : 'bg-slate-50 border-slate-100 dark:bg-white/5 dark:border-white/10'}`}>
                                                    <div className="flex flex-col sm:flex-row justify-between gap-3 mb-3">
                                                        <div>
                                                             <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                                 {test.name || (test as any).testName || (test as any).test?.testName || (test as any).test?.name || 'Unknown Test'}
                                                             </h4>
                                                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{test.category || (test as any).test?.category}</p>
                                                         </div>
                                                        {test.result && (
                                                            <div className={`px-4 py-2 rounded-xl text-center flex flex-col justify-center ${test.isAbnormal ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                                <p className="text-[10px] font-bold uppercase opacity-60 leading-none mb-1">Outcome</p>
                                                                <p className="text-sm font-black uppercase tracking-tight">{test.result}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {test.subTests && test.subTests.length > 0 && (
                                                        <div className="mt-4 overflow-x-auto">
                                                            <table className="w-full text-left border-collapse">
                                                                <thead>
                                                                    <tr className="border-b border-gray-200 dark:border-white/10">
                                                                        <th className="py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Parameter</th>
                                                                        <th className="py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Result</th>
                                                                        <th className="py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Unit</th>
                                                                        <th className="py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Range</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {test.subTests.map((s, sidx) => (
                                                                        <tr key={sidx} className="border-b border-gray-100 dark:border-white/5 last:border-0">
                                                                            <td className="py-2 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">{s.name}</td>
                                                                            <td className="py-2 text-xs font-black text-gray-900 dark:text-white uppercase">{s.result}</td>
                                                                            <td className="py-2 text-[10px] font-medium text-gray-400">{s.unit}</td>
                                                                            <td className="py-2 text-[10px] font-medium text-gray-400">{s.range}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                    
                                                    {test.remarks && (
                                                        <div className="mt-3 flex items-start gap-2 p-2 bg-white/50 dark:bg-black/20 rounded-lg">
                                                            <AlertCircle className="w-3 h-3 text-red-500 mt-0.5" />
                                                            <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase italic leading-tight">
                                                                {test.remarks}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {record.notes && (
                                            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                                                <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                    <FileText className="w-3 h-3" />
                                                    Clinical Conclusion
                                                </h4>
                                                <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase leading-relaxed italic">
                                                    "{record.notes}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pending Requests Section */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 px-1">
                    <div>
                        <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">
                            Active <span className="text-purple-600">Requests</span>
                        </h2>
                        <p className="text-gray-400 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mt-0.5">Tests in Queue or Processing</p>
                    </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                    {requests.map((record) => (
                        <div key={record._id} id={`lab-record-${record._id}`} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-lg group relative">
                            {/* Status Accents */}
                            <div className="absolute top-0 left-0 w-1 h-full bg-purple-600 rounded-l-xl sm:rounded-l-2xl" />

                            {/* Metadata Header */}
                            <div className="flex flex-col md:flex-row gap-2 sm:gap-3 mb-3 sm:mb-4 border-b border-gray-50 dark:border-white/5 pb-3 sm:pb-4">
                                <div className="flex-1 space-y-1 sm:space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-50 dark:bg-purple-900/20 rounded-lg sm:rounded-xl flex items-center justify-center text-purple-600">
                                            <FlaskConical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-950 dark:text-white text-sm sm:text-base uppercase tracking-tight">
                                                Lab Record
                                            </h3>
                                            <p className="text-xs sm:text-sm font-black font-mono text-purple-600 tracking-wider">#{record.tokenNumber}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4 items-center">
                                    <div>
                                        <p className="text-[8px] sm:text-[9px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Hospital</p>
                                        <p className="font-black text-gray-900 dark:text-white text-xs sm:text-sm uppercase flex items-center gap-1">
                                            {record.hospital?.name || 'Medical Facility'}
                                        </p>
                                    </div>
                                    <div className="hidden lg:block w-px h-8 bg-gray-100 dark:bg-white/5 mx-2" />
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <span className={`px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest shadow-sm ${getStatusColor(record.status)}`}>
                                            {record.status?.toUpperCase() || 'UNKNOWN'}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest shadow-sm ${getPriorityColor(record.priority)}`}>
                                            {record.priority?.toUpperCase() || 'ROUTINE'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
                                {/* Record Details */}
                                <div className="lg:col-span-4 space-y-2 sm:space-y-3">
                                    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-1 gap-2">
                                        <div className="bg-gray-50 dark:bg-white/5 p-2.5 sm:p-3 rounded-lg sm:rounded-xl space-y-0.5">
                                            <h4 className="text-[7px] sm:text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                <User className="w-2.5 h-2.5 text-purple-600" />
                                                Doctor
                                            </h4>
                                            <p className="text-[10px] sm:text-xs font-black text-gray-900 dark:text-white uppercase truncate">
                                                {record.doctor?.user?.name || record.doctor?.name || 'Authorized'}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-white/5 p-2.5 sm:p-3 rounded-lg sm:rounded-xl space-y-0.5">
                                            <h4 className="text-[7px] sm:text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                <Calendar className="w-2.5 h-2.5 text-purple-600" />
                                                Order Date
                                            </h4>
                                            <p className="text-[10px] sm:text-xs font-black text-gray-900 dark:text-white uppercase truncate">
                                                {format(new Date(record.createdAt), 'MMM dd, p')}
                                            </p>
                                        </div>
                                    </div>

                                    {record.notes && (
                                        <div className="bg-amber-50/50 dark:bg-amber-900/10 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-amber-100/50 dark:border-amber-900/20 space-y-0.5">
                                            <h4 className="text-[7px] sm:text-[8px] font-black text-amber-600 uppercase tracking-widest">Notes</h4>
                                            <p className="text-[9px] sm:text-[10px] font-bold text-amber-800 dark:text-amber-300 leading-relaxed italic uppercase">
                                                &ldquo;{record.notes}&rdquo;
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Tests */}
                                <div className="lg:col-span-8">
                                    <div className="space-y-2">
                                        <h4 className="text-[8px] sm:text-[9px] font-black text-gray-950 dark:text-white uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                            <FlaskConical className="w-3 h-3 text-purple-600" />
                                            Tests
                                        </h4>

                                        <div className="grid grid-cols-1 gap-2">
                                            {record.tests.map((test, idx) => (
                                                <div key={idx} className="bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-white/5 rounded-lg sm:rounded-xl p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 group-hover:border-purple-200">
                                                    <div className="space-y-0.5">
                                                        <h5 className="font-black text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-tight">
                                                            {test.name || test.testName || (test as any).test?.testName || (test as any).test?.name || 'Unknown Test'}
                                                        </h5>
                                                        <p className="text-[7px] sm:text-[8px] font-bold text-gray-400 uppercase">{test.category || (test as any).test?.category}</p>
                                                    </div>
                                                    {test.instructions && (
                                                        <div className="flex items-center gap-2 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg max-w-[200px]">
                                                            <AlertCircle className="w-3 h-3 shrink-0" />
                                                            <span className="text-[9px] font-bold uppercase truncate">{test.instructions}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-50 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                                <div className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="text-gray-300">CureChain Integrated Records</span>
                                </div>
                                <div className="text-[8px] sm:text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest font-mono">
                                    HASH: {record._id.slice(-12).toUpperCase()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}


