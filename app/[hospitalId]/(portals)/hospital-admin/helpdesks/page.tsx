"use client";

import React, { useState, useCallback } from 'react';
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import {
  Headphones, Plus, Edit2, Trash2, Phone, Mail, Search,
  Copy, Check, KeyRound, Eye, EyeOff, ShieldCheck, ShieldOff, AlertCircle, CheckCircle2,
} from "lucide-react";
import { Modal, ConfirmModal, FormInput, FormSelect, FormTextarea } from "@/components/admin";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Helpdesk {
  _id: string; name?: string; email?: string; mobile?: string;
  loginId?: string; status?: string; additionalNotes?: string;
  assignedStaff?: { user?: { name: string } };
}
interface Credentials { name: string; loginId: string; password: string; }
type Errs = Partial<Record<string, string>>;

// ─── Validators ──────────────────────────────────────────────────────────────
const V: Record<string, (v: string) => string> = {
  name:          v => !v.trim() ? "Full name is required" : !/^[a-zA-Z\s.'-]+$/.test(v.trim()) ? "Only letters, spaces, dots & hyphens" : "",
  email:         v => v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Invalid email — e.g. user@hospital.com" : "",
  mobile:        v => !v ? "Mobile is required" : v.length !== 10 ? `${v.length}/10 digits — must be exactly 10` : "",
  password:      v => !v ? "Password is required" : v.length < 6 ? `Too short — ${v.length}/6 chars minimum` : "",
  designation:   v => !v.trim() ? "Designation is required" : "",
  panNumber:     v => v && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.toUpperCase()) ? "Invalid PAN — e.g. ABCDE1234F" : "",
  aadharNumber:  v => v && v.length !== 12 ? `${v.length}/12 digits — must be exactly 12` : "",
  accountNumber: v => v && (v.length < 9 || v.length > 18) ? "Must be 9–18 digits" : "",
  ifscCode:      v => v && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase()) ? "Invalid IFSC — e.g. HDFC0001234" : "",
};
const vld = (f: string, v: string) => V[f] ? V[f](v) : "";

// ─── Tiny inline components ───────────────────────────────────────────────────
function FErr({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 mt-1"><AlertCircle size={11}/>{msg}</p>;
}

interface IFProps {
  label: string; name: string; value: string;
  onChange: (v: string) => void; onBlur?: () => void;
  error?: string; touched?: boolean; type?: string;
  placeholder?: string; required?: boolean; extraCls?: string;
}
function IField({ label, name, value, onChange, onBlur, error, touched, type = "text", placeholder, required, extraCls = "" }: IFProps) {
  const hasErr = touched && !!error;
  const isOk   = touched && !error && value.trim() !== "";
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-700">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={type} name={name} value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full px-4 py-2 pr-8 border rounded-lg text-sm outline-none transition-all ${extraCls}
            ${hasErr ? "border-rose-400 bg-rose-50/40 focus:ring-2 focus:ring-rose-400/20"
              : isOk  ? "border-emerald-400 bg-white focus:ring-2 focus:ring-emerald-400/20"
              : "border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/10"}`}
        />
        {isOk && <CheckCircle2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"/>}
      </div>
      <FErr msg={hasErr ? error : undefined}/>
    </div>
  );
}

// ─── Default form data ────────────────────────────────────────────────────────
const EMPTY_FORM = () => ({
  name: "", email: "", mobile: "", password: "", gender: "", dateOfBirth: "",
  designation: "Helpdesk", employeeId: "", employmentType: "full-time",
  joiningDate: new Date().toISOString().split('T')[0],
  shift: "", startTime: "09:00", endTime: "17:00",
  weeklyOff: ["Saturday", "Sunday"] as string[],
  baseSalary: "0", panNumber: "", aadharNumber: "",
  pfNumber: "", esiNumber: "", uanNumber: "",
  accountName: "", accountNumber: "", bankName: "", ifscCode: "",
  notes: "",
});

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const TAB_ORDER = ["basic", "employment", "schedule", "financial", "bank"] as const;


// ─── Component ────────────────────────────────────────────────────────────────
export default function HelpdeskManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const [isAddModalOpen,    setIsAddModalOpen]    = useState(false);
  const [isEditModalOpen,   setIsEditModalOpen]   = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCredModalOpen,   setIsCredModalOpen]   = useState(false);

  const [selectedHelpdesk, setSelectedHelpdesk] = useState<Helpdesk | null>(null);
  const [createdCreds,     setCreatedCreds]      = useState<Credentials | null>(null);
  const [showPassword,     setShowPassword]      = useState(false);
  const [activeTab,        setActiveTab]         = useState("basic");
  const [copiedField,      setCopiedField]       = useState<string | null>(null);

  const [formData, setFormData] = useState(EMPTY_FORM());
  const [errors,   setErrors]   = useState<Errs>({});
  const [touched,  setTouched]  = useState<Record<string,boolean>>({});
  const [loading,  setLoading]  = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: helpdesks = [], isLoading: isHelpdesksLoading } = useQuery({
    queryKey: ['helpdesks'],
    queryFn: async () => {
      const resp = await hospitalAdminService.getHelpdesks();
      return (resp.helpdesks || []).map((h: any) => ({
        ...h, loginId: h.loginId || h.logid || `HELP-${h._id?.slice(-4)}`
      }));
    }
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['hospital-shifts'],
    queryFn: () => hospitalAdminService.getShifts()
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const set = (field: string, value: string) => {
    // Input-level guards
    if (field === 'mobile'        && !/^\d{0,10}$/.test(value)) return;
    if (field === 'aadharNumber'  && !/^\d{0,12}$/.test(value)) return;
    if (field === 'accountNumber' && !/^\d{0,18}$/.test(value)) return;
    if (field === 'panNumber'     && value.length > 10)          return;
    if (field === 'ifscCode'      && value.length > 11)          return;
    if (field === 'baseSalary'    && !/^\d*$/.test(value))       return;
    if (['pfNumber','esiNumber','uanNumber'].includes(field) && value.length > 30) return;
    if (field === 'name'          && value.length > 100)          return;
    if (field === 'employeeId'    && value.length > 20)           return;

    setFormData(p => ({ ...p, [field]: value }));
    if (touched[field]) setErrors(p => ({ ...p, [field]: vld(field, value) }));
  };

  const blur = (field: string, value: string) => {
    setTouched(p => ({ ...p, [field]: true }));
    setErrors(p => ({ ...p, [field]: vld(field, value) }));
  };

  const touchAll = () => {
    const fields = ["name","email","mobile","password","designation","panNumber","aadharNumber","accountNumber","ifscCode"];
    const nt: Record<string,boolean> = {}, ne: Errs = {};
    fields.forEach(f => { nt[f] = true; ne[f] = vld(f, (formData as any)[f] ?? ""); });
    setTouched(p => ({ ...p, ...nt }));
    setErrors(p => ({ ...p, ...ne }));
    return Object.values(ne).every(e => !e);
  };

  const toggleDay = (day: string) =>
    setFormData(p => ({ ...p, weeklyOff: p.weeklyOff.includes(day) ? p.weeklyOff.filter(d => d !== day) : [...p.weeklyOff, day] }));

  // ── Clipboard ──────────────────────────────────────────────────────────────
  const copyToClipboard = useCallback((val?: string, label = "Copied", fieldKey?: string) => {
    if (!val) return;
    const afterCopy = () => {
      toast.success(label);
      if (fieldKey) { setCopiedField(fieldKey); setTimeout(() => setCopiedField(null), 2000); }
    };
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = val;
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
        document.body.appendChild(ta); ta.focus(); ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? afterCopy() : toast.error('Copy failed — please copy manually');
      } catch { toast.error('Copy not supported in this browser'); }
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(val).then(afterCopy).catch(fallback);
    } else { fallback(); }
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onAddHelpdesk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!touchAll()) { toast.error("Please fix the highlighted errors before submitting"); return; }

    try {
      setLoading(true);
      const loginId = formData.employeeId || `HUB-${Math.floor(1000 + Math.random() * 9000)}`;
      const resp: any = await hospitalAdminService.createHelpdesk({
        ...formData,
        loginId,
        additionalNotes: formData.notes,
        bankDetails: { accountName: formData.accountName, accountNumber: formData.accountNumber, bankName: formData.bankName, ifscCode: formData.ifscCode },
        workingHours: { start: formData.startTime, end: formData.endTime }
      });
      setIsAddModalOpen(false);
      setFormData(EMPTY_FORM()); setErrors({}); setTouched({});
      queryClient.invalidateQueries({ queryKey: ['helpdesks'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-admin', 'dashboard'] });
      setCreatedCreds({ name: resp?.helpdesk?.name || formData.name, loginId, password: formData.password });
      setShowPassword(false); setIsCredModalOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to create helpdesk account");
    } finally { setLoading(false); }
  };

  // ── Edit / Delete / Reset ──────────────────────────────────────────────────
  const handleEditClick = (h: Helpdesk) => {
    setSelectedHelpdesk(h);
    setFormData({ ...EMPTY_FORM(), name: h.name||"", email: h.email||"", mobile: h.mobile||"", notes: h.additionalNotes||"" });
    setErrors({}); setTouched({});
    setIsEditModalOpen(true);
  };

  const onUpdateHelpdesk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHelpdesk) return;
    if (!formData.name.trim()) return void toast.error("Name is required");
    if (!/^[a-zA-Z\s.'-]+$/.test(formData.name.trim())) return void toast.error("Name has invalid characters");
    if (!formData.mobile || formData.mobile.length !== 10) return void toast.error("Mobile must be exactly 10 digits");
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return void toast.error("Invalid email");
    if (formData.password && formData.password.length < 6) return void toast.error("Password must be at least 6 chars");
    try {
      setLoading(true);
      const payload: any = { name: formData.name.trim(), email: formData.email.trim(), mobile: formData.mobile, additionalNotes: formData.notes };
      if (formData.password) payload.password = formData.password;
      await hospitalAdminService.updateHelpdesk(selectedHelpdesk._id, payload);
      toast.success("Details updated");
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['helpdesks'] });
    } catch (err: any) { toast.error(err.message || "Update failed"); }
    finally { setLoading(false); }
  };

  const handleToggleStatus = async (h: Helpdesk) => {
    const isActivating = h.status === 'inactive';
    const action = isActivating ? 'Reactivate' : 'Deactivate';

    setConfirmModal({
      isOpen: true,
      title: `${action} Hub Account`,
      message: isActivating 
        ? `Ready to restore operational status for ${h.name || 'this personnel'}?` 
        : `Are you sure you want to deactivate ${h.name || 'this personnel'}? Dashboard access will be suspended but credentials will be preserved.`,
      onConfirm: async () => {
        try {
          setLoading(true);
          await hospitalAdminService.updateHelpdesk(h._id, { status: isActivating ? 'active' : 'inactive' });
          toast.success(isActivating ? "Account reactivated" : "Account suspended");
          queryClient.invalidateQueries({ queryKey: ['helpdesks'] });
        } catch (err: any) {
          toast.error(err.message || "Status change failed");
        } finally {
          setLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: () => { } });

  const onDeleteConfirm = async () => {
    if (!selectedHelpdesk) return;
    if (selectedHelpdesk.status !== 'inactive') {
      toast.error("Account must be deactivated (status: inactive) before permanent deletion.");
      setIsDeleteModalOpen(false);
      return;
    }
    try {
      await hospitalAdminService.deleteHelpdesk(selectedHelpdesk._id);
      toast.success("Staff removed permanently"); 
      setIsDeleteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['helpdesks'] });
    } catch (err: any) { 
      toast.error(err.message || "Delete failed"); 
    }
  };

  const onResetPassword = async (h: Helpdesk) => {
    if (!window.confirm(`Reset password for ${h.name || 'this staff'}?`)) return;
    try {
      const newPass = Math.random().toString(36).slice(-8).toUpperCase();
      await hospitalAdminService.updateHelpdesk(h._id, { password: newPass });
      setCreatedCreds({ name: h.name||"Helpdesk Staff", loginId: h.loginId||"", password: newPass });
      setShowPassword(false); setIsCredModalOpen(true);
    } catch { toast.error("Reset failed"); }
  };

  const filtered = helpdesks.filter(h =>
    h.name?.toLowerCase().includes(search.toLowerCase()) ||
    h.loginId?.toLowerCase().includes(search.toLowerCase()) ||
    h.mobile?.includes(search)
  );

  const atCapacity = helpdesks.length >= 2;

  // ── Field helpers ──────────────────────────────────────────────────────────
  const f = (field: string): IFProps => ({
    label: "", name: field,
    value: (formData as any)[field] ?? "",
    onChange: v => set(field, v),
    onBlur:   () => blur(field, (formData as any)[field] ?? ""),
    error:   errors[field],
    touched: touched[field],
  });

  const bCls = (field: string, val: string) =>
    touched[field] && errors[field]  ? "border-rose-400 bg-rose-50/40 focus:ring-2 focus:ring-rose-400/20"
    : touched[field] && !errors[field] && val ? "border-emerald-400 bg-white focus:ring-2 focus:ring-emerald-400/20"
    : "border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/10";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
            <Headphones size={24} className="text-blue-500"/> Helpdesk Staff
          </h1>
          <p className="text-sm text-slate-500">Manage support hub personnel and credentials</p>
          {/* Capacity indicator */}
          <div className="flex items-center gap-2 mt-1.5">
            {[0,1].map(i => (
              <span key={i} className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                helpdesks[i]
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                {helpdesks[i] ? `● Desk ${i+1}: ${helpdesks[i].name?.split(' ')[0] || 'Active'}` : `○ Desk ${i+1}: Empty`}
              </span>
            ))}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              atCapacity ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
            }`}>
              {helpdesks.length}/2 slots used
            </span>
          </div>
        </div>
        <div className="text-right">
          <button
            disabled={atCapacity}
            onClick={() => {
              if (atCapacity) return;
              setFormData(EMPTY_FORM()); setErrors({}); setTouched({}); setActiveTab("basic"); setIsAddModalOpen(true);
            }}
            title={atCapacity ? "Maximum 2 helpdesk accounts allowed per hospital" : "Add new helpdesk staff"}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm ${
              atCapacity
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Plus size={18}/> Add Hub Staff
          </button>
          {atCapacity && (
            <p className="text-[10px] text-amber-600 font-semibold mt-1.5">
              ⚠ Max 2 helpdesk pairs allowed per hospital
            </p>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18}/>
        <input type="text" placeholder="Search by name, login ID, or mobile..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 outline-none transition-all text-sm"/>
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
              ) : filtered.map(h => (
                <tr key={h._id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                        {(h.name || "H").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{h.name || h.assignedStaff?.user?.name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600"><Phone size={13} className="text-slate-400"/>{h.mobile||"—"}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-400"><Mail size={13} className="text-slate-400"/>{h.email||"—"}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                      <span className="text-xs font-mono font-bold text-slate-700">{h.loginId||"—"}</span>
                      {h.loginId && (
                        <button type="button" onClick={() => copyToClipboard(h.loginId, "Login ID copied!", h._id)}
                          className="text-slate-300 hover:text-blue-500 transition-colors" title="Copy Login ID">
                          <Copy size={13}/>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      h.status === 'inactive' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {h.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => onResetPassword(h)} className="text-orange-400 hover:text-orange-600 transition-colors" title="Reset Password"><KeyRound size={17}/></button>
                      <button type="button" onClick={() => handleEditClick(h)} className="text-blue-400 hover:text-blue-600 transition-colors" title="Edit"><Edit2 size={17}/></button>
                      
                      {/* Toggle Status */}
                      <button type="button" onClick={() => handleToggleStatus(h)} className={`${h.status === 'inactive' ? 'text-emerald-500 hover:text-emerald-700' : 'text-amber-400 hover:text-amber-600'} transition-colors`} title={h.status === 'inactive' ? "Activate" : "Deactivate"}>
                        {h.status === 'inactive' ? <ShieldCheck size={17}/> : <ShieldOff size={17}/>}
                      </button>

                      {/* Delete - Only enabled if inactive */}
                      <button 
                        type="button" 
                        onClick={() => { setSelectedHelpdesk(h); setIsDeleteModalOpen(true); }} 
                        className={`${h.status === 'inactive' ? 'text-red-400 hover:text-red-600' : 'text-slate-300 cursor-not-allowed'} transition-colors`} 
                        title={h.status === 'inactive' ? "Permanently Remove" : "Deactivate before deleting"}
                        disabled={h.status !== 'inactive'}
                      >
                        <Trash2 size={17}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Add Modal ──────────────────────────────────────────────────────── */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Initialize Hub Account" maxWidth="max-w-2xl">
        <form onSubmit={onAddHelpdesk} noValidate className="space-y-6 pt-2">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 gap-6 px-1">
            {["basic","employment","schedule","financial","bank"].map(tab => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab===tab?"text-blue-600 border-b-2 border-blue-600":"text-slate-400 hover:text-slate-600"}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="min-h-[320px]">

            {/* ── BASIC ── */}
            {activeTab === "basic" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <IField label="Full Name" name="name" value={formData.name} onChange={v=>set('name',v)} onBlur={()=>blur('name',formData.name)}
                    error={errors.name} touched={touched.name} required placeholder="e.g. Ramesh Kumar"/>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Gender</label>
                    <select value={formData.gender} onChange={e=>set('gender',e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/10">
                      <option value="">Select</option>
                      <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <IField label="Mobile Number" name="mobile" value={formData.mobile} onChange={v=>set('mobile',v)} onBlur={()=>blur('mobile',formData.mobile)}
                    error={errors.mobile} touched={touched.mobile} required type="tel" placeholder="10-digit mobile"/>
                  <IField label="Email Address" name="email" value={formData.email} onChange={v=>set('email',v)} onBlur={()=>blur('email',formData.email)}
                    error={errors.email} touched={touched.email} type="email" placeholder="email@hospital.com"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Date of Birth</label>
                    <input type="date" value={formData.dateOfBirth} onChange={e=>set('dateOfBirth',e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/10"/>
                  </div>
                  {/* Password with show/hide */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Account Password<span className="text-rose-500 ml-0.5">*</span></label>
                    <div className="relative">
                      <input type={showPassword?"text":"password"} value={formData.password}
                        onChange={e=>set('password',e.target.value)} onBlur={()=>blur('password',formData.password)}
                        placeholder="Min 6 characters"
                        className={`w-full px-4 py-2 pr-8 border rounded-lg text-sm outline-none transition-all ${bCls('password',formData.password)}`}/>
                      <button type="button" onClick={()=>setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500">
                        {showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                    <FErr msg={touched.password ? errors.password : undefined}/>
                    {touched.password && !errors.password && formData.password &&
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1"><CheckCircle2 size={11}/>Password looks good</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ── EMPLOYMENT ── */}
            {activeTab === "employment" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <IField label="Designation" name="designation" value={formData.designation} onChange={v=>set('designation',v)} onBlur={()=>blur('designation',formData.designation)}
                    error={errors.designation} touched={touched.designation} required placeholder="e.g. Support Agent"/>
                  <IField label="Employee ID (Internal)" name="employeeId" value={formData.employeeId} onChange={v=>set('employeeId',v)}
                    error={errors.employeeId} touched={touched.employeeId} placeholder="e.g. HELP-001"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Joining Date</label>
                    <input type="date" value={formData.joiningDate} onChange={e=>set('joiningDate',e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/10"/>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Contract Type</label>
                    <select value={formData.employmentType} onChange={e=>set('employmentType',e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/10">
                      <option value="full-time">Full Time</option>
                      <option value="part-time">Part Time</option>
                      <option value="contract">Contract</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── SCHEDULE ── */}
            {activeTab === "schedule" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <FormSelect label="Assigned Shift" value={formData.shift}
                    onChange={e => {
                      const s = (shifts as any[]).find(s => s._id === e.target.value);
                      setFormData(p => ({ ...p, shift: e.target.value, startTime: s?.startTime||"09:00", endTime: s?.endTime||"17:00" }));
                    }}
                    options={[{ label:"Select Work Shift", value:"" }, ...(shifts as any[]).map(s => ({ label:`${s.name} (${s.startTime} - ${s.endTime})`, value:s._id }))]}/>
                  <div className="grid grid-cols-2 gap-4">
                    {[["Shift Start",formData.startTime],["Shift End",formData.endTime]].map(([l,v])=>(
                      <div key={l} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{l}</p>
                        <p className="text-sm font-bold text-slate-700">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weekly Off Days</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(day => (
                      <button key={day} type="button" onClick={()=>toggleDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                          formData.weeklyOff.includes(day) ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"}`}>
                        {day.substring(0,3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── FINANCIAL ── */}
            {activeTab === "financial" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Monthly Base Salary</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                    <input type="text" value={formData.baseSalary} onChange={e=>set('baseSalary',e.target.value)} placeholder="0"
                      className="w-full pl-7 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-blue-600 outline-none focus:ring-2 focus:ring-blue-500/10"/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* PAN */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">PAN Number</label>
                    <div className="relative">
                      <input type="text" value={formData.panNumber} onChange={e=>set('panNumber',e.target.value.toUpperCase())} onBlur={()=>blur('panNumber',formData.panNumber)}
                        placeholder="ABCDE1234F" maxLength={10}
                        className={`w-full px-4 py-2 pr-8 uppercase border rounded-lg text-sm font-bold outline-none transition-all ${bCls('panNumber',formData.panNumber)}`}/>
                      {touched.panNumber && !errors.panNumber && formData.panNumber && <CheckCircle2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500"/>}
                    </div>
                    <FErr msg={touched.panNumber ? errors.panNumber : undefined}/>
                    {!formData.panNumber && <p className="text-[10px] text-slate-400">Format: ABCDE1234F</p>}
                  </div>
                  {/* Aadhar */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Aadhar Number</label>
                    <div className="relative">
                      <input type="text" value={formData.aadharNumber} onChange={e=>set('aadharNumber',e.target.value)} onBlur={()=>blur('aadharNumber',formData.aadharNumber)}
                        placeholder="12-digit Aadhar"
                        className={`w-full px-4 py-2 pr-8 border rounded-lg text-sm font-bold outline-none transition-all ${bCls('aadharNumber',formData.aadharNumber)}`}/>
                      {touched.aadharNumber && !errors.aadharNumber && formData.aadharNumber && <CheckCircle2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500"/>}
                    </div>
                    <FErr msg={touched.aadharNumber ? errors.aadharNumber : undefined}/>
                    {!formData.aadharNumber && <p className="text-[10px] text-slate-400">Must be exactly 12 digits</p>}
                  </div>
                  {/* PF */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">PF Number</label>
                    <input type="text" value={formData.pfNumber} onChange={e=>set('pfNumber',e.target.value)}
                      placeholder="Provident Fund No."
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/10"/>
                  </div>
                  {/* ESI */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">ESI Number</label>
                    <input type="text" value={formData.esiNumber} onChange={e=>set('esiNumber',e.target.value)}
                      placeholder="ESI Number"
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/10"/>
                  </div>
                </div>
                {/* UAN */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">UAN Number</label>
                  <input type="text" value={formData.uanNumber} onChange={e=>set('uanNumber',e.target.value)}
                    placeholder="Universal Account No."
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/10"/>
                </div>
                <FormTextarea label="Access / Internal Notes" value={formData.notes}
                  onChange={e=>set('notes',(e as any).target.value)} placeholder="Additional instructions..." rows={3} maxLength={500}/>
              </div>
            )}

            {/* ── BANK ── */}
            {activeTab === "bank" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bank Account Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Account Holder Name</label>
                    <input type="text" value={formData.accountName} onChange={e=>set('accountName',e.target.value)}
                      placeholder="As per bank records"
                      className="w-full px-4 py-2 uppercase bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/10"/>
                  </div>
                  {/* Account Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Account Number</label>
                    <div className="relative">
                      <input type="text" value={formData.accountNumber} onChange={e=>set('accountNumber',e.target.value)} onBlur={()=>blur('accountNumber',formData.accountNumber)}
                        placeholder="9–18 digit number"
                        className={`w-full px-4 py-2 pr-8 border rounded-lg text-sm font-bold outline-none transition-all ${bCls('accountNumber',formData.accountNumber)}`}/>
                      {touched.accountNumber && !errors.accountNumber && formData.accountNumber && <CheckCircle2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500"/>}
                    </div>
                    <FErr msg={touched.accountNumber ? errors.accountNumber : undefined}/>
                    {!formData.accountNumber && <p className="text-[10px] text-slate-400">Must be 9 to 18 digits</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Bank Name</label>
                    <input type="text" value={formData.bankName} onChange={e=>set('bankName',e.target.value)}
                      placeholder="e.g. HDFC Bank"
                      className="w-full px-4 py-2 uppercase bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/10"/>
                  </div>
                  {/* IFSC */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">IFSC Code</label>
                    <div className="relative">
                      <input type="text" value={formData.ifscCode} onChange={e=>set('ifscCode',e.target.value.toUpperCase())} onBlur={()=>blur('ifscCode',formData.ifscCode)}
                        placeholder="e.g. HDFC0001234" maxLength={11}
                        className={`w-full px-4 py-2 pr-8 uppercase border rounded-lg text-sm font-bold outline-none transition-all ${bCls('ifscCode',formData.ifscCode)}`}/>
                      {touched.ifscCode && !errors.ifscCode && formData.ifscCode && <CheckCircle2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500"/>}
                    </div>
                    <FErr msg={touched.ifscCode ? errors.ifscCode : undefined}/>
                    {!formData.ifscCode && <p className="text-[10px] text-slate-400">Format: ABCD0123456</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 max-w-[280px]">
              Fields marked <span className="text-rose-500">*</span> are required. Registration creates a secure login.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={()=>setIsAddModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>

              {/* Back button — hidden on first tab */}
              {TAB_ORDER.indexOf(activeTab as any) > 0 && (
                <button type="button"
                  onClick={() => setActiveTab(TAB_ORDER[TAB_ORDER.indexOf(activeTab as any) - 1])}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
                  ← Back
                </button>
              )}

              {/* Next button — all tabs except last */}
              {activeTab !== "bank" ? (
                <button type="button"
                  onClick={() => setActiveTab(TAB_ORDER[TAB_ORDER.indexOf(activeTab as any) + 1])}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
                  Next →
                </button>
              ) : (
                /* Register button — only on last tab */
                <button type="submit" disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-60">
                  {loading ? "Initializing..." : "Register Hub Account"}
                </button>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* ─── Credentials Modal ────────────────────────────────────────────── */}
      <Modal isOpen={isCredModalOpen} onClose={()=>setIsCredModalOpen(false)} title="Helpdesk Credentials" maxWidth="max-w-md">
        <div className="pt-2 space-y-5">
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <ShieldCheck size={22} className="text-emerald-500 shrink-0"/>
            <div>
              <p className="text-sm font-semibold text-emerald-700">Account ready!</p>
              <p className="text-xs text-emerald-600">Save these credentials — the password won't be shown again.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
              {(createdCreds?.name||"H").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Staff Member</p>
              <p className="text-sm font-semibold text-slate-700">{createdCreds?.name}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login ID</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-mono font-bold text-slate-800 tracking-wider select-all">{createdCreds?.loginId}</span>
              <button type="button" onClick={()=>copyToClipboard(createdCreds?.loginId,"Login ID copied!","loginId")}
                className={`flex items-center gap-1.5 text-xs font-medium border rounded-lg px-3 py-1.5 bg-white transition-all ${copiedField==='loginId'?'text-emerald-600 border-emerald-300 bg-emerald-50':'text-blue-600 hover:text-blue-700 border-blue-200'}`}>
                {copiedField==='loginId'?<><Check size={13}/>Copied!</>:<><Copy size={13}/>Copy</>}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Password (one-time visible)</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-mono font-bold text-slate-800 tracking-wider">
                {showPassword ? createdCreds?.password : "••••••••"}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={()=>setShowPassword(v=>!v)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  {showPassword?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
                <button type="button" onClick={()=>copyToClipboard(createdCreds?.password,"Password copied!","password")}
                  className={`flex items-center gap-1.5 text-xs font-medium border rounded-lg px-3 py-1.5 bg-white transition-all ${copiedField==='password'?'text-emerald-600 border-emerald-300 bg-emerald-50':'text-amber-700 hover:text-amber-800 border-amber-300'}`}>
                  {copiedField==='password'?<><Check size={13}/>Copied!</>:<><Copy size={13}/>Copy</>}
                </button>
              </div>
            </div>
          </div>

          <button type="button"
            onClick={()=>{const t=`Name: ${createdCreds?.name}\nLogin ID: ${createdCreds?.loginId}\nPassword: ${createdCreds?.password}`;copyToClipboard(t,"All credentials copied!","both");}}
            className={`w-full border rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all ${copiedField==='both'?'border-emerald-300 bg-emerald-50 text-emerald-700':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {copiedField==='both'?<><Check size={14}/>All Credentials Copied!</>:<><Copy size={14}/>Copy All Credentials</>}
          </button>

          <div className="flex justify-end pt-1">
            <button type="button" onClick={()=>setIsCredModalOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Edit Modal ────────────────────────────────────────────────────── */}
      <Modal isOpen={isEditModalOpen} onClose={()=>setIsEditModalOpen(false)} title="Edit Staff Details" maxWidth="max-w-md">
        <form onSubmit={onUpdateHelpdesk} noValidate className="space-y-4 pt-2">
          <FormInput label="Display Name" value={formData.name} onChange={e=>set('name',e.target.value)} required/>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Email" type="email" value={formData.email} onChange={e=>set('email',e.target.value)}/>
            <FormInput label="Mobile" value={formData.mobile} onChange={e=>set('mobile',e.target.value)}/>
          </div>
          <FormInput label="Update Password (Optional)" type="password" placeholder="Min. 6 characters" value={formData.password} onChange={e=>set('password',e.target.value)}/>
          <FormTextarea label="Internal Notes" value={formData.notes} onChange={e=>set('notes',(e as any).target.value)} rows={2} maxLength={500}/>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={()=>setIsEditModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            <button type="submit" disabled={loading}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-blue-700 transition-all disabled:opacity-60">
              {loading?"Saving...":"Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete Confirm ─────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={()=>setIsDeleteModalOpen(false)}
        onConfirm={onDeleteConfirm}
        title="Remove Hub Staff"
        message="Are you sure? This will immediately revoke their dashboard access and credentials. This action cannot be undone."
        confirmText="Remove Access"
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}
