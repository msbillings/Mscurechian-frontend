"use client";

import React, { useState } from 'react';
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hrService } from "@/lib/integrations/services/hr.service";
import { useAuthStore } from "@/stores/authStore";
import {
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Users,
  Eye,
  CheckCircle2,
  XCircle as XIcon,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminRecruitmentPage() {
  const { hospitalId } = useParams();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const authUser = useAuthStore((state) => state.user) as any;

  const { data: recruitmentsResponse, isLoading } = useQuery({
    queryKey: ["hospital-admin", "recruitment"],
    queryFn: () => hrService.getRecruitment(),
    refetchInterval: 15000,
    staleTime: 5000,
  });

  // Real-time synchronization
  React.useEffect(() => {
    let isMounted = true;
    const initSocket = async () => {
      try {
        const { getSocket, joinSocketRoom } = await import('@/lib/integrations/api/socket');
        const socket = await getSocket();
        
        if (socket && isMounted) {
          const userId = authUser?.id || authUser?._id;
          if (userId) {
            joinSocketRoom({
              userId,
              role: 'hospital-admin',
              hospitalId: (hospitalId as string) || authUser?.hospital
            });

            socket.on('new_recruitment_request', (data: any) => {
              queryClient.invalidateQueries({ queryKey: ["hospital-admin", "recruitment"] });
              toast.success("New recruitment request received");
            });

            socket.on('recruitment_review_update', (data: any) => {
              queryClient.invalidateQueries({ queryKey: ["hospital-admin", "recruitment"] });
            });
          }
        }
      } catch (err) {
        console.error("Socket init error:", err);
      }
    };

    initSocket();

    return () => {
      isMounted = false;
      import('@/lib/integrations/api/socket').then(({ getSocket }) => {
        getSocket().then(socket => {
          if (socket) {
            socket.off('new_recruitment_request');
            socket.off('recruitment_review_update');
          }
        });
      });
    };
  }, [queryClient, authUser, hospitalId]);

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, rejectionReason }: { id: string, status: string, rejectionReason?: string }) =>
      hrService.reviewRecruitmentRequest(id, { status, rejectionReason }),
    onSuccess: (res) => {
      toast.success(res.message || "Request updated successfully");
      queryClient.invalidateQueries({ queryKey: ["hospital-admin", "recruitment"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update request");
    }
  });

  const recruitments = recruitmentsResponse?.data || [];

  const filteredRecruitments = recruitments.filter((r: any) =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleReview = (id: string, status: "approved" | "rejected") => {
    let rejectionReason = "";
    if (status === "rejected") {
      rejectionReason = prompt("Please enter a reason for rejection:") || "";
      if (!rejectionReason) return;
    }

    reviewMutation.mutate({ id, status, rejectionReason });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-3 md:p-4 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 sm:p-8 md:p-10 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Recruitment Registry</h1>
          <p className="text-slate-500 text-xs font-medium">Review and approve recruitment notices from HR.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-6 px-3 md:px-6 py-2 bg-slate-50/50 rounded-xl border border-slate-100">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-amber-600 mb-0.5">
                <Clock size={12} />
                <span className="text-[8px] font-black uppercase tracking-widest">Pending</span>
              </div>
              <p className="text-sm md:text-lg font-black text-slate-900 leading-none">
                {recruitments.filter((r: any) => r.status === 'pending_approval').length}
              </p>
            </div>

            <div className="w-px h-8 bg-slate-200" />

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-emerald-600 mb-0.5">
                <CheckCircle size={12} />
                <span className="text-[8px] font-black uppercase tracking-widest">Active</span>
              </div>
              <p className="text-sm md:text-lg font-black text-slate-900 leading-none">
                {recruitments.filter((r: any) => r.status === 'open').length}
              </p>
            </div>

            <div className="w-px h-8 bg-slate-200" />

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-indigo-600 mb-0.5">
                <Users size={12} />
                <span className="text-[8px] font-black uppercase tracking-widest">Total</span>
              </div>
              <p className="text-sm md:text-lg font-black text-slate-900 leading-none">
                {recruitments.reduce((acc: number, r: any) => acc + (r.numberOfPositions || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-2 md:p-6 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by title or department..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-2 md:px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Notice Details</th>
                <th className="px-2 md:px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type & Vacancy</th>
                <th className="px-2 md:px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Created By</th>
                <th className="px-2 md:px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-2 md:px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRecruitments.length > 0 ? (
                filteredRecruitments.map((r: any) => (
                  <tr key={r._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-2 md:px-6 py-4">
                      <div className="font-bold text-slate-900">{r.title}</div>
                      <div className="text-xs text-slate-500 font-medium">{r.department}</div>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      <div className="text-sm font-semibold text-slate-700">{r.type}</div>
                      <div className="text-[10px] text-indigo-600 font-bold uppercase">{r.numberOfPositions} Openings</div>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      <div className="text-sm font-medium text-slate-700">{r.createdBy?.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {new Date(r.createdAt).toLocaleDateString()} • {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${r.status === 'pending_approval' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        r.status === 'open' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          r.status === 'approved' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            r.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-2 md:px-6 py-4 text-right space-x-2">
                      {r.status === 'pending_approval' ? (
                        <>
                          <button
                            onClick={() => handleReview(r._id, 'approved')}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            title="Approve"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          <button
                            onClick={() => handleReview(r._id, 'rejected')}
                            className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                            title="Reject"
                          >
                            <XIcon size={18} />
                          </button>
                        </>
                      ) : (
                        <div className="text-[10px] font-bold text-slate-400 italic">No actions available</div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-2 md:px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={32} className="text-slate-200" />
                      <p className="text-sm font-medium">No recruitment notices found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table></div>
        </div>
      </div>
    </div>
  );
}
