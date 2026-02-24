'use client';

import React, { useState } from 'react';
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hrService } from "@/lib/integrations/services/hr.service";
import {
  Briefcase,
  Users,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  MoreVertical,
  ChevronRight,
  AlertCircle,
  FileText,
} from 'lucide-react';
import toast from "react-hot-toast";

export default function RecruitmentPage() {
  const { hospitalId } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'postings' | 'applicants'>('postings');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    department: "",
    description: "",
    requirements: "",
    numberOfPositions: 1,
    type: "Full-time"
  });

  const { data: recruitmentResponse, isLoading } = useQuery({
    queryKey: ["hr", "recruitment"],
    queryFn: () => hrService.getRecruitment(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => hrService.createRecruitmentRequest({
      ...data,
      requirements: data.requirements.split(',').map((r: string) => r.trim()).filter(Boolean)
    }),
    onSuccess: () => {
      toast.success("Recruitment request sent to Hospital Admin for approval");
      setIsModalOpen(false);
      setFormData({ title: "", department: "", description: "", requirements: "", numberOfPositions: 1, type: "Full-time" });
      queryClient.invalidateQueries({ queryKey: ["hr", "recruitment"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send request");
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => hrService.updateRecruitmentStatus(id, status),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["hr", "recruitment"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update status");
    }
  });

  const recruitments = recruitmentResponse?.data || [];

  const filteredPostings = recruitments.filter((job: any) => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: 'Active Postings', value: recruitments.filter((r: any) => r.status === 'open').length, icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pending Approval', value: recruitments.filter((r: any) => r.status === 'pending_approval').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Approved Requests', value: recruitments.filter((r: any) => r.status === 'approved').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Positions', value: recruitments.reduce((acc: number, r: any) => acc + (r.numberOfPositions || 0), 0), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Recruitment Management</h1>
          <p className="text-gray-500 font-medium">Manage job postings and evaluate talent across departments.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100"
        >
          <Plus className="w-5 h-5" />
          Raise Recruitment Request
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('postings')}
            className={`px-8 py-5 text-sm font-black uppercase tracking-widest transition-all relative ${
              activeTab === 'postings' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Job Postings / Requests
            {activeTab === 'postings' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 shadow-[0_-2px_10px_rgba(79,70,229,0.3)]" />}
          </button>
          <button
            onClick={() => setActiveTab('applicants')}
            className={`px-8 py-5 text-sm font-black uppercase tracking-widest transition-all relative ${
              activeTab === 'applicants' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Candidates (Coming Soon)
            {activeTab === 'applicants' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 shadow-[0_-2px_10px_rgba(79,70,229,0.3)]" />}
          </button>
        </div>

        <div className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {activeTab === 'postings' ? (
              filteredPostings.length > 0 ? (
                filteredPostings.map((job: any) => (
                  <div key={job._id} className="group p-4 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/10 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{job.title}</h4>
                        <p className="text-xs text-gray-500 font-medium">{job.department} • {job.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Positions</p>
                        <p className="text-sm font-bold text-gray-900">{job.numberOfPositions}</p>
                      </div>
                      <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${
                        job.status === 'open' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                        job.status === 'pending_approval' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        job.status === 'approved' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        job.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-gray-50 text-gray-600 border-gray-100'
                      }`}>
                        {job.status.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        {job.status === 'approved' && (
                          <button 
                            onClick={() => statusMutation.mutate({ id: job._id, status: 'open' })}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-indigo-700 transition-all"
                          >
                            Open Posting
                          </button>
                        )}
                        {job.status === 'open' && (
                          <button 
                            onClick={() => statusMutation.mutate({ id: job._id, status: 'closed' })}
                            className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-400">
                  <AlertCircle size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-medium">No recruitment postings found</p>
                </div>
              )
            ) : (
              <div className="py-20 text-center text-gray-400">
                <Users size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-medium">Applicant management is being integrated...</p>
                <p className="text-sm">Once a posting is "Open", candidates will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recruitment Requisition</h2>
                <p className="text-slate-500 text-sm font-medium">Draft a new recruitment notice for administrative review.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white rounded-full transition-colors"
              >
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreateRequest} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Job Title</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Senior Pathologist"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 placeholder:text-slate-300 transition-all"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Department</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 transition-all"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                  >
                    <option value="">Select Unit</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Nursing">Nursing</option>
                    <option value="Radiology">Radiology</option>
                    <option value="Pharmacy">Pharmacy</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Employment Basis</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 transition-all"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Vacancies</label>
                  <input 
                    type="number" 
                    min="1"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 transition-all"
                    value={formData.numberOfPositions}
                    onChange={(e) => setFormData({...formData, numberOfPositions: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Notice Description</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Summarize the core responsibilities and clinical expectations..."
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 placeholder:text-slate-300 transition-all"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Clinical Requirements (Comma separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. MBBS, MD Pathology, 5+ Years Exp..."
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 placeholder:text-slate-300 transition-all"
                  value={formData.requirements}
                  onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  disabled={createMutation.isPending}
                  type="submit"
                  className="flex-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  {createMutation.isPending ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FileText size={20} />
                      Send for Approval
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
