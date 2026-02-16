import React from 'react';
import { FileText, Download, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getDoctorReportsAction } from '@/lib/integrations';

export default async function DoctorReportsPage() {
  const { data: reports } = await getDoctorReportsAction();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lab Reports</h1>
          <p className="text-gray-500 mt-1">Review diagnostic results and patient files.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Test Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Patient</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {reports?.map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                            <td className="px-6 py-4">
                                {report.status === 'Ready' ? (
                                    <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                                        <CheckCircle2 size={16} /> Ready
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-orange-600 font-medium text-sm">
                                        <div className="w-2 h-2 rounded-full bg-orange-500"></div> Generating
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                                {report.testName}
                            </td>
                            <td className="px-6 py-4">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{report.patientName}</p>
                                    <p className="text-xs text-gray-500">{report.patientId}</p>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                                {report.date}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                    report.priority === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {report.priority}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-blue-500" title="View">
                                        <Eye size={18} />
                                    </button>
                                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-700" title="Download">
                                        <Download size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
      </div>
    </div>
  );
}
