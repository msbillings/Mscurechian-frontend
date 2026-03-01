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
  Loader2,
  Plus,
  X,
  User,
  Upload,
  Trash2,
} from 'lucide-react';
import { useHRDocuments, useHRStaff, useUploadHRDocument, useDeleteHRDocument } from '@/lib/integrations/hooks';
import { toast } from 'react-hot-toast';

const DocumentUploadModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [docType, setDocType] = useState('degreeCertificate');
  const [file, setFile] = useState<File | null>(null);

  const { data: staffListRes } = useHRStaff({ limit: 100 });
  const uploadMutation = useUploadHRDocument();

  const handleUpload = async () => {
    if (!selectedStaff || !docType || !file) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        staffId: selectedStaff,
        documentType: docType,
        file: file,
      });
      toast.success('Document uploaded successfully');
      onClose();
    } catch (err) {
      toast.error('Upload failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-5xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Upload Document</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
              Add a new credential to the vault
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
              Select Staff Member
            </label>
            <div className="relative">
              <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-[11px] uppercase tracking-widest appearance-none cursor-pointer"
              >
                <option value="">Choose Staff...</option>
                {staffListRes?.data?.map((staff: any) => (
                  <option key={staff._id} value={staff._id}>
                    {staff.name} ({staff.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
              Document Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Degree Certificate', value: 'degreeCertificate' },
                { label: 'Registration', value: 'registrationCertificate' },
                { label: 'Employment ID', value: 'employmentId' },
                { label: 'Contract', value: 'employmentContract' },
                { label: 'License', value: 'medicalLicense' },
                { label: 'Other', value: 'otherCertificate' },
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setDocType(type.value)}
                  className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all ${docType === type.value
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200'
                    }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
              Document File
            </label>
            <div className="relative group">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-3xl transition-all cursor-pointer ${file ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/50'
                  }`}
              >
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <span className="text-[11px] font-black text-emerald-600 uppercase tracking-tight">
                      {file.name}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-400 uppercase">Click to change file</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                      Select PDF or Image
                    </span>
                  </div>
                )}
              </label>
            </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50/50 border-t border-gray-50 flex gap-4">
          <button
            disabled={uploadMutation.isPending}
            onClick={onClose}
            className="flex-1 px-6 py-4 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all"
          >
            Cancel
          </button>
          <button
            disabled={uploadMutation.isPending}
            onClick={handleUpload}
            className="flex-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen size={16} />}
            {uploadMutation.isPending ? 'Uploading...' : 'Publish to Vault'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DocumentViewerModal = ({ isOpen, onClose, url, title }: any) => {
  if (!isOpen) return null;

  const getViewUrl = (originalUrl: string) => {
    if (!originalUrl) return '';
    if (originalUrl.includes('cloudinary.com')) {
      return originalUrl
        .replace('/upload/fl_attachment/', '/upload/')
        .replace('/upload/', '/upload/fl_attachment:false/');
    }
    return originalUrl;
  };

  const viewUrl = getViewUrl(url);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-6 bg-[#020617]/40 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#0a0a09] w-full h-full sm:h-[92vh] sm:max-w-5xl sm:rounded-[3rem] overflow-hidden flex flex-col relative shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] border border-white/10">
        <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800/50 flex items-center justify-between bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 dark:border-indigo-500/20">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="font-black text-xs sm:text-sm text-gray-900 dark:text-white uppercase tracking-[0.2em] truncate max-w-[200px] sm:max-w-md">{title}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Institutional Document Vault</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl text-gray-400 active:scale-95 transition-all shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-gray-50/50 dark:bg-[#050505] flex items-center justify-center p-4">
          {viewUrl?.toLowerCase().includes('.pdf') || viewUrl?.toLowerCase().includes('raw') || viewUrl?.toLowerCase().includes('pdf') ? (
            <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-gray-200/50 dark:border-gray-800/50">
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewUrl)}&embedded=true`}
                className="w-full h-full border-none"
                title={title}
              />
            </div>
          ) : (
            <div className="relative group p-4">
              <img src={viewUrl} alt={title} className="max-w-full h-auto shadow-2xl rounded-2xl border border-white/20" />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10 pointer-events-none" />
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-gray-800/50 bg-white/50 dark:bg-black/50 text-center">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 size={12} className="text-indigo-500" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Institutional Secure Document Viewer</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function DocumentVaultPage() {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewer, setViewer] = useState({ isOpen: false, url: '', title: '' });

  const { data: documentResponse, isLoading } = useHRDocuments({
    category: filter,
    search: searchTerm,
  } as any);

  const deleteMutation = useDeleteHRDocument();

  const statsData = documentResponse?.stats || {};
  const documents = documentResponse?.data || [];
  const categories = documentResponse?.categories || [
    { name: 'All Documents', value: 'all', count: 0 },
    { name: 'Contracts', value: 'contracts', count: 0 },
    { name: 'ID Proofs', value: 'ids', count: 0 },
    { name: 'Medical Licenses', value: 'licenses', count: 0 },
    { name: 'Certificates', value: 'certificates', count: 0 },
  ];

  const stats = [
    {
      label: 'Total Documents',
      value: statsData.totalDocuments?.toString() || '0',
      icon: FileText,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Compliance Status',
      value: statsData.complianceStatus || '100%',
      icon: Shield,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Expiring Soon',
      value: statsData.expiringSoon?.toString() || '0',
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Pending Review',
      value: statsData.pendingReview?.toString() || '0',
      icon: Clock,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ];

  const handleDownload = (url: string, title: string) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = title;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleView = (url: string, title?: string) => {
    if (url) setViewer({ isOpen: true, url, title: title || 'Document Preview' });
  };

  const handleDelete = async (doc: any) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await deleteMutation.mutateAsync({
        profileId: doc.profileId,
        documentKey: doc.documentKey,
        role: doc.role,
      });
      toast.success('Document deleted successfully');
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Document Vault</h1>
          <p className="text-gray-500 font-medium tracking-tight">
            Securely manage staff contracts, identification, and medical credentials.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-100"
          >
            <Plus className="w-5 h-5" />
            Upload Document
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
          >
            <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-black text-xs text-gray-400 uppercase tracking-[0.2rem] mb-6">Document Categories</h3>
            <div className="space-y-1.5">
              {categories.map((cat: any) => (
                <button
                  key={cat.value}
                  onClick={() => setFilter(cat.value)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${filter === cat.value
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">{cat.name}</span>
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full ${filter === cat.value ? 'bg-white/20' : 'bg-gray-100'
                      }`}
                  >
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-indigo-900 p-8 rounded-4xl text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden group">
            <div className="relative z-10">
              <Shield className="w-8 h-8 mb-4 text-indigo-400" />
              <h4 className="font-black text-xl leading-tight mb-2 uppercase italic tracking-tighter">
                Vault <br /> Compliance
              </h4>
              <p className="text-[10px] text-indigo-300 font-bold mb-6 leading-relaxed uppercase tracking-widest">
                Automated license tracking and expiry notifications for all staff.
              </p>
              <button className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2rem] transition-all border border-white/10">
                Manage Alerts
              </button>
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
            <div className="p-8 border-b border-gray-50 bg-gray-50/30">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search vault by staff name or document title..."
                  className="w-full pl-14 pr-6 py-4 bg-white border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-[11px] uppercase tracking-widest shadow-inner shadow-gray-100/50"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="p-6 pl-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2rem]">
                      Document Name
                    </th>
                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2rem]">Type</th>
                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2rem]">Staff Member</th>
                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2rem]">Status</th>
                    <th className="p-6 text-right pr-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2rem]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-32 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2rem]">
                            Synchronizing Vault...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : documents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-32 text-center">
                        <div className="flex flex-col items-center gap-6 text-gray-200">
                          <FolderOpen size={64} strokeWidth={1} />
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2rem] text-gray-400">
                              No documents found
                            </p>
                            <p className="text-[9px] font-bold text-gray-300 uppercase mt-1 tracking-widest">
                              Try adjusting your filters or search query
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc: any) => (
                      <tr key={doc.id} className="hover:bg-gray-50/50 transition-all group">
                        <td className="p-6 pl-8">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 transition-all group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-3 shadow-sm">
                              <FileText size={24} />
                            </div>
                            <div>
                              <p className="font-black text-gray-900 group-hover:text-indigo-600 transition-all uppercase tracking-tight text-[13px]">
                                {doc.title}
                              </p>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2rem] mt-0.5">
                                {doc.size} • Uploaded {doc.date}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className="text-[10px] font-black text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-gray-100">
                            {doc.type}
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400">
                              {doc.staff?.charAt(0)}
                            </div>
                            <span className="text-[11px] font-black text-gray-700 uppercase tracking-tight">{doc.staff}</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <span
                            className={`px-4 py-2 text-[9px] font-black uppercase tracking-[0.2rem] rounded-xl border flex items-center gap-2 w-fit ${doc.status === 'verified'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : doc.status === 'expiring'
                                ? 'bg-amber-50 text-amber-600 border-amber-100'
                                : 'bg-gray-50 text-gray-600 border-gray-100'
                              }`}
                          >
                            <div
                              className={`w-2 h-2 rounded-full shadow-sm animate-pulse ${doc.status === 'verified'
                                ? 'bg-emerald-500'
                                : doc.status === 'expiring'
                                  ? 'bg-amber-500'
                                  : 'bg-gray-400'
                                }`}
                            />
                            {doc.status}
                          </span>
                        </td>
                        <td className="p-6 text-right pr-8">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleView(doc.url, doc.title)}
                              className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm bg-white border border-gray-50"
                              title="View Document"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleDownload(doc.url, doc.title)}
                              className="p-3 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all shadow-sm bg-white border border-gray-50"
                              title="Download Document"
                            >
                              <Download size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(doc)}
                              className="p-3 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all shadow-sm bg-white border border-gray-50"
                              title="Delete Document"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <DocumentUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />
      <DocumentViewerModal
        isOpen={viewer.isOpen}
        onClose={() => setViewer({ ...viewer, isOpen: false })}
        url={viewer.url}
        title={viewer.title}
      />
    </div>
  );
}
