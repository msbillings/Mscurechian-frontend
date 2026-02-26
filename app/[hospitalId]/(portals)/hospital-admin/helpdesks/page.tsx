"use client";

import React, { useState } from 'react';
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  User,
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

interface Credentials {
  name: string;
  loginId: string;
  password: string;
}

export default function HelpdeskManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCredModalOpen, setIsCredModalOpen] = useState(false);

  // Data state
  const [selectedHelpdesk, setSelectedHelpdesk] = useState<Helpdesk | null>(null);
  const [createdCreds, setCreatedCreds] = useState<Credentials | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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

  const copyToClipboard = (val?: string, label = "Copied") => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    toast.success(label);
  };

  const onAddHelpdesk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.staffId) return toast.error("Select a staff member");
    if (formData.notes.length > 500) return toast.error("Notes cannot exceed 500 characters");

    try {
      setLoading(true);
      const loginId = `HUB-${Math.floor(1000 + Math.random() * 9000)}`;
      const password = Math.random().toString(36).slice(-8).toUpperCase();

      const resp: any = await hospitalAdminService.createHelpdesk({
        staffId: formData.staffId,
        loginId,
        password,
        additionalNotes: formData.notes
      });

      // Close add modal and show credentials modal
      setIsAddModalOpen(false);
      setFormData({ staffId: "", name: "", email: "", mobile: "", password: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ['helpdesks'] });

      const helpdeskName = resp?.helpdesk?.name || "Helpdesk Staff";
      setCreatedCreds({ name: helpdeskName, loginId, password });
      setShowPassword(false);
      setIsCredModalOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const onUpdateHelpdesk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHelpdesk) return;

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
    } finally {
      setLoading(false);
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

  const onResetPassword = async (helpdesk: Helpdesk) => {
    const confirmed = window.confirm(`Reset password for ${helpdesk.name || 'this staff'}?`);
    if (!confirmed) return;

    try {
      const newPass = Math.random().toString(36).slice(-8).toUpperCase();
      await hospitalAdminService.updateHelpdesk(helpdesk._id, { password: newPass });

      // Show credentials modal with new password
      setCreatedCreds({
        name: helpdesk.name || "Helpdesk Staff",
        loginId: helpdesk.loginId || "",
        password: newPass
      });
      setShowPassword(false);
      setIsCredModalOpen(true);
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
          onClick={() => { setFormData({ staffId: "", name: "", email: "", mobile: "", password: "", notes: "" }); setIsAddModalOpen(true); }}
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
          placeholder="Search by name, login ID, or mobile..."
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
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">NAME</th>
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
                  {/* Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                        {(h.name || "H").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{h.name || h.assignedStaff?.user?.name || "—"}</span>
                    </div>
                  </td>
                  {/* Contact */}
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone size={13} className="text-slate-400" />
                        {h.mobile || "—"}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Mail size={13} className="text-slate-400" />
                        {h.email || "—"}
                      </div>
                    </div>
                  </td>
                  {/* Login ID */}
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                      <span className="text-xs font-mono font-bold text-slate-700">{h.loginId || "—"}</span>
                      {h.loginId && (
                        <button onClick={() => copyToClipboard(h.loginId, "Login ID copied!")} className="text-slate-300 hover:text-blue-500 transition-colors" title="Copy Login ID">
                          <Copy size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      {h.status?.toUpperCase() || 'ACTIVE'}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => onResetPassword(h)}
                        className="text-orange-400 hover:text-orange-600 transition-colors"
                        title="Reset Password"
                      >
                        <KeyRound size={17} />
                      </button>
                      <button onClick={() => handleEditClick(h)} className="text-blue-400 hover:text-blue-600 transition-colors" title="Edit">
                        <Edit2 size={17} />
                      </button>
                      <button onClick={() => handleDeleteClick(h)} className="text-red-400 hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Add Modal ─────────────────────────────────────────────────────── */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Hub Staff" maxWidth="max-w-md">
        <form onSubmit={onAddHelpdesk} className="space-y-4 pt-2">
          <FormSelect
            label="Select Personnel Profile"
            value={formData.staffId}
            onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
            options={[
              { label: "Choose an existing staff member", value: "" },
              ...staff.map((s: any) => ({ label: `${s.name} (${s.mobile || 'No Mobile'})`, value: s._id }))
            ]}
            required
          />
          <FormTextarea
            label="Access Notes (optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Instructions or specific access details..."
            rows={3}
            maxLength={500}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-blue-700 transition-all disabled:opacity-60"
            >
              {loading ? "Creating..." : "Initialize Hub Account"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Credentials Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={isCredModalOpen}
        onClose={() => setIsCredModalOpen(false)}
        title="Helpdesk Credentials"
        maxWidth="max-w-md"
      >
        <div className="pt-2 space-y-5">
          {/* Success banner */}
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <ShieldCheck size={22} className="text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-700">Account ready!</p>
              <p className="text-xs text-emerald-600">Save these credentials — the password won't be shown again.</p>
            </div>
          </div>

          {/* Staff name */}
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
              {(createdCreds?.name || "H").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Staff Member</p>
              <p className="text-sm font-semibold text-slate-700">{createdCreds?.name}</p>
            </div>
          </div>

          {/* Login ID */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login ID</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-mono font-bold text-slate-800 tracking-wider">{createdCreds?.loginId}</span>
              <button
                onClick={() => copyToClipboard(createdCreds?.loginId, "Login ID copied!")}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded-lg px-3 py-1.5 bg-white transition-colors"
              >
                <Copy size={13} /> Copy
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Password (one-time visible)</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-mono font-bold text-slate-800 tracking-wider">
                {showPassword ? createdCreds?.password : "••••••••"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPassword(v => !v)}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => copyToClipboard(createdCreds?.password, "Password copied!")}
                  className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-medium border border-amber-300 rounded-lg px-3 py-1.5 bg-white transition-colors"
                >
                  <Copy size={13} /> Copy
                </button>
              </div>
            </div>
          </div>

          {/* Copy all */}
          <button
            onClick={() => {
              const text = `Login ID: ${createdCreds?.loginId}\nPassword: ${createdCreds?.password}`;
              copyToClipboard(text, "Both credentials copied!");
            }}
            className="w-full border border-slate-200 rounded-xl py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Copy size={14} /> Copy Both Credentials
          </button>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => setIsCredModalOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Edit Modal ────────────────────────────────────────────────────── */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Staff Details" maxWidth="max-w-md">
        <form onSubmit={onUpdateHelpdesk} className="space-y-4 pt-2">
          <FormInput
            label="Display Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <FormInput
              label="Mobile"
              value={formData.mobile}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d{0,10}$/.test(val)) setFormData({ ...formData, mobile: val });
              }}
            />
          </div>
          <FormInput
            label="Update Password (Optional)"
            type="password"
            placeholder="Leave blank to keep current"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <FormTextarea
            label="Internal Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            maxLength={500}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-blue-700 transition-all disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete Confirm ─────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={onDeleteConfirm}
        title="Remove Hub Staff"
        message="Are you sure? This will immediately revoke their dashboard access and credentials. This action cannot be undone."
        confirmText="Remove Access"
      />
    </div>
  );
}
