"use client";

import React, { useState } from 'react';
import toast from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import {
  Headphones,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Search,
  Copy,
  RefreshCw,
  User,
  MoreVertical,
  ChevronRight
} from "lucide-react";
import { Modal, ConfirmModal, FormInput, FormSelect, FormTextarea } from "@/components/admin";

interface Helpdesk {
  _id: string;
  name?: string;
  email?: string;
  mobile?: string;
  loginId?: string;
  status?: string;
  additionalNotes?: string;
  assignedStaff?: {
    user?: {
      name: string;
    };
  };
}

interface StaffMember {
  _id: string;
  staffProfileId?: string;
  name: string;
  mobile?: string;
}

export default function HelpdeskManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Data state
  const [selectedHelpdesk, setSelectedHelpdesk] = useState<Helpdesk | null>(null);
  const [formData, setFormData] = useState({
    staffId: "",
    name: "",
    email: "",
    mobile: "",
    password: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);

  // Queries
  const { data: helpdesks = [], isLoading: isHelpdesksLoading } = useQuery({
    queryKey: ['helpdesks'],
    queryFn: async () => {
      const resp = await hospitalAdminService.getHelpdesks();
      return (resp.helpdesks || []).map((h: any) => ({
        ...h,
        loginId: h.loginId || h.logid || `HELP-${h._id?.slice(-4)}`
      }));
    }
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-simple'],
    queryFn: async () => {
      const resp = await hospitalAdminService.getStaff();
      return resp.staff || [];
    }
  });

  // Handlers
  const handleEditClick = (helpdesk: Helpdesk) => {
    setSelectedHelpdesk(helpdesk);
    setFormData({
      staffId: "",
      name: helpdesk.name || "",
      email: helpdesk.email || "",
      mobile: helpdesk.mobile || "",
      password: "",
      notes: helpdesk.additionalNotes || ""
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (helpdesk: Helpdesk) => {
    setSelectedHelpdesk(helpdesk);
    setIsDeleteModalOpen(true);
  };

  const onAddHelpdesk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.staffId) return toast.error("Select a staff member");
    
    // Additional notes character limit
    if (formData.notes.length > 500) return toast.error("Notes cannot exceed 500 characters");

    try {
      setLoading(true);
      const loginId = `HUB-${Math.floor(1000 + Math.random() * 9000)}`;
      const password = Math.random().toString(36).slice(-8).toUpperCase();
      
      await hospitalAdminService.createHelpdesk({
        staffId: formData.staffId,
        loginId,
        password,
        additionalNotes: formData.notes
      });
      toast.success("Helpdesk staff added");
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['helpdesks'] });
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const onUpdateHelpdesk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHelpdesk) return;

    // Field Validations
    if (!formData.name.trim()) return toast.error("Name is required");
    if (!/^[a-zA-Z\s.'-]+$/.test(formData.name.trim())) return toast.error("Name can only contain letters, spaces, dots, and hyphens");
    
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      return toast.error("Please enter a valid email address");
    
    if (formData.mobile.length !== 10) return toast.error("Mobile number must be exactly 10 digits");

    try {
      setLoading(true);
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile,
        additionalNotes: formData.notes
      };
      if (formData.password) payload.password = formData.password;

      await hospitalAdminService.updateHelpdesk(selectedHelpdesk._id, payload);
      toast.success("Details updated");
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['helpdesks'] });
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    }
  };

  const onDeleteConfirm = async () => {
    if (!selectedHelpdesk) return;
    try {
      await hospitalAdminService.deleteHelpdesk(selectedHelpdesk._id);
      toast.success("Staff removed");
      setIsDeleteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['helpdesks'] });
    } catch (err: any) {
      toast.error("Delete failed");
    }
  };

  const copyToClipboard = (val?: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    toast.success("Copied");
  };

  const onResetPassword = async (helpdesk: Helpdesk) => {
    const confirm = window.confirm(`Reset password for ${helpdesk.name || 'this staff'}?`);
    if (!confirm) return;

    try {
      const newPass = Math.random().toString(36).slice(-8).toUpperCase();
      await hospitalAdminService.updateHelpdesk(helpdesk._id, { password: newPass });
      toast.success(`New Password: ${newPass}`, { duration: 6000 });
      copyToClipboard(newPass);
    } catch (err) {
      toast.error("Reset failed");
    }
  };

  const filtered = helpdesks.filter(h => 
    h.name?.toLowerCase().includes(search.toLowerCase()) ||
    h.loginId?.toLowerCase().includes(search.toLowerCase()) ||
    h.mobile?.includes(search)
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
            <Headphones size={24} className="text-blue-500" />
            Helpdesk Staff
          </h1>
          <p className="text-sm text-slate-500">Manage support hub personnel and credentials</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm"
        >
          <Plus size={18} />
          Add Hub Staff
        </button>
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
        <input 
          type="text"
          placeholder="Search by name, email, login ID, or mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 outline-none transition-all text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">HELPDESK DETAILS</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">CONTACT</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">LOGIN ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">STATUS</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isHelpdesksLoading ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 text-sm italic">Loading personnel records...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 text-sm italic">No helpdesk accounts found.</td></tr>
              ) : filtered.map((h) => (
                <tr key={h._id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone size={14} className="text-slate-400" />
                        {h.mobile}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Mail size={14} className="text-slate-400" />
                        {h.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-700">{h.name || h.assignedStaff?.user?.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                      <span className="text-xs font-mono font-bold text-slate-700">{h.loginId}</span>
                      <button onClick={() => copyToClipboard(h.loginId)} className="text-slate-300 hover:text-blue-500 transition-colors">
                        <Copy size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      {h.status?.toUpperCase() || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => onResetPassword(h)} className="text-orange-400 hover:text-orange-600 transition-colors" title="Reset Password">
                        <RefreshCw size={18} />
                      </button>
                      <button onClick={() => handleEditClick(h)} className="text-blue-400 hover:text-blue-600 transition-colors" title="Edit">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDeleteClick(h)} className="text-red-400 hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Hub Staff" maxWidth="max-w-md">
        <form onSubmit={onAddHelpdesk} className="space-y-4 pt-2">
          <FormSelect 
            label="Select Personnel Profile"
            value={formData.staffId}
            onChange={(e) => setFormData({...formData, staffId: e.target.value})}
            options={[
              { label: "Choose an existing staff member", value: "" },
              ...staff.map(s => ({ label: `${s.name} (${s.mobile || 'No Mobile'})`, value: s._id }))
            ]}
            required
          />
          <FormTextarea 
            label="Access Notes"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Instructions or specific access details..."
            rows={3}
            maxLength={500}
          />
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-blue-700 transition-all">Initialize Hub Account</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Staff Details" maxWidth="max-w-md">
        <form onSubmit={onUpdateHelpdesk} className="space-y-4 pt-2">
          <FormInput 
            label="Display Name" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput 
              label="Email" 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
            <FormInput 
              label="Mobile" 
              value={formData.mobile}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d{0,10}$/.test(val)) setFormData({...formData, mobile: val});
              }}
            />
          </div>
          <FormInput 
            label="Update Password (Optional)" 
            type="password"
            placeholder="Stay blank to keep current"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
          <FormTextarea 
            label="Internal Notes"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            rows={2}
            maxLength={500}
          />
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-blue-700 transition-all">Save Changes</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={onDeleteConfirm}
        title="Remove Hub Staff"
        message="Are you sure? This will immediately revoke their dashboard access and dashboard credentials. This action cannot be undone."
        confirmText="Remove Access"
      />
    </div>
  );
}
