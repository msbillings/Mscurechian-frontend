'use client';

import React, { useState } from 'react';
import {
  FileText,
  Shield,
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderOpen,
  Filter,
  Eye,
} from 'lucide-react';
import { useHRDocuments } from '@/lib/integrations/hooks';

export default function DocumentVaultPage() {
  const [filter, setFilter] = useState('all');
  const { data: documentResponse, isLoading } = useHRDocuments({ category: filter });

  const stats = [
    { label: 'Total Documents', value: '1,245', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Compliance Status', value: '98%', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Expiring Soon', value: '14', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Pending Review', value: '42', icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const documents = [
    { id: '1', title: 'Employment Contract - Dr. Stone', type: 'Contract', staff: 'Anna Stone', size: '2.4 MB', date: '15 Mar 2024', status: 'verified' },
    { id: '2', title: 'Medical License - Dr. Wilson', type: 'License', staff: 'Sarah Wilson', size: '1.8 MB', date: '20 Mar 2024', status: 'expiring', expiry: 'in 15 days' },
    { id: '3', title: 'Training Certificate - CPR', type: 'Certificate', staff: 'James May', size: '0.5 MB', date: '10 Mar 2024', status: 'verified' },
    { id: '4', title: 'Govt ID Proof - Emma Watson', type: 'Identity', staff: 'Emma Watson', size: '1.2 MB', date: '18 Mar 2024', status: 'pending' },
  ];

  const categories = [
    { name: 'All Documents', value: 'all', count: 1245 },
    { name: 'Contracts', value: 'contracts', count: 240 },
    { name: 'ID Proofs', value: 'ids', count: 450 },
    { name: 'Medical Licenses', value: 'licenses', count: 320 },
    { name: 'Certificates', value: 'certificates', count: 235 },
  ];

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Document Vault</h1>
          <p className="text-gray-500 font-medium">Securely manage staff contracts, identification, and medical credentials.</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-6 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-all shadow-sm">
            <Filter className="w-5 h-5" />
            Bulk Actions
          </button>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100">
            <FolderOpen className="w-5 h-5" />
            Upload Document
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} mb-4`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-6 tracking-tight">Document Categories</h3>
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setFilter(cat.value)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    filter === cat.value ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">{cat.name}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    filter === cat.value ? 'bg-white/20' : 'bg-gray-100'
                  }`}>{cat.count}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
            <div className="relative z-10">
              <Shield className="w-8 h-8 mb-4 opacity-80" />
              <h4 className="font-bold text-lg leading-tight mb-2">Compliance Alert</h4>
              <p className="text-xs text-indigo-100 font-medium mb-4 leading-relaxed">14 medical licenses are expiring within the next 30 days. Action required.</p>
              <button className="w-full bg-white/20 hover:bg-white/30 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Review Now</button>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-gray-900">
            <div className="p-6 border-b border-gray-50">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search staff documents by name or title..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Document Name</th>
                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Staff Member</th>
                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="p-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 transition-colors group-hover:bg-indigo-100">
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{doc.title}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{doc.size} • Uploaded {doc.date}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-sm font-bold text-gray-500 uppercase tracking-wider">{doc.type}</td>
                      <td className="p-6 text-sm font-bold text-gray-700">{doc.staff}</td>
                      <td className="p-6">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border flex items-center gap-1.5 w-fit ${
                          doc.status === 'verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          doc.status === 'expiring' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-gray-50 text-gray-600 border-gray-100'
                        }`}>
                          {doc.status === 'verified' && <CheckCircle2 size={12} />}
                          {doc.status === 'expiring' && <AlertCircle size={12} />}
                          {doc.status}
                          {doc.expiry && <span className="opacity-60">({doc.expiry})</span>}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="View Document">
                            <Eye size={18} />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Download Document">
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
      </div>
    </div>
  );
}
