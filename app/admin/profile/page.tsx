'use client';

import React, { useState, useEffect } from 'react';
import {
    User,
    Mail,
    Shield,
    Key,
    Lock,
    CheckCircle,
    AlertCircle,
    Save,
    Eye,
    EyeOff,
    Crown,
    Clock,
    Activity,
} from 'lucide-react';
import { apiClient } from '@/lib/integrations/api/apiClient';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

// ─── Super Admin Profile Page ─────────────────────────────────────────────────
export default function SuperAdminProfilePage() {
    const { user: authUser } = useAuthStore();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Edit form
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    // Password change
    const [showPwSection, setShowPwSection] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);

    // ── Fetch profile ──────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const data: any = await apiClient('/super-admin/profile');
                const user = data?.user || data;
                setProfile(user);
                setName(user?.name || '');
                setEmail(user?.email || '');
            } catch (err: any) {
                console.error('Failed to load profile:', err);
                // Fallback to auth store user if API fails
                if (authUser) {
                    setProfile(authUser);
                    setName((authUser as any).name || '');
                    setEmail((authUser as any).email || '');
                } else {
                    toast.error('Failed to load profile');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    // ── Save profile ───────────────────────────────────────────────────────────
    const handleSaveProfile = async () => {
        if (!name.trim()) return toast.error('Name cannot be empty');
        try {
            setSaving(true);
            await apiClient('/super-admin/profile', {
                method: 'PUT',
                body: JSON.stringify({ name, email }),
            });
            setProfile((prev: any) => ({ ...prev, name, email }));
            toast.success('Profile updated successfully');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    // ── Change password ────────────────────────────────────────────────────────
    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            return toast.error('Fill in all password fields');
        }
        if (newPassword !== confirmPassword) {
            return toast.error('New passwords do not match');
        }
        if (newPassword.length < 8) {
            return toast.error('New password must be at least 8 characters');
        }
        try {
            setSaving(true);
            await apiClient('/super-admin/profile', {
                method: 'PUT',
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            toast.success('Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPwSection(false);
        } catch (err: any) {
            toast.error(err.message || 'Failed to change password');
        } finally {
            setSaving(false);
        }
    };

    // ── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    const displayUser = profile || authUser;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">

            {/* ── HERO CARD ──────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8 text-white shadow-xl">
                {/* Decorative circles */}
                <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5" />
                <div className="absolute -right-8 -bottom-20 w-72 h-72 rounded-full bg-white/5" />

                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-black shadow-lg">
                        {(displayUser?.name || 'S').charAt(0).toUpperCase()}
                    </div>

                    <div className="text-center sm:text-left">
                        <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                            <Crown size={16} className="text-yellow-300" />
                            <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Super Administrator</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight">{displayUser?.name || 'Super Admin'}</h1>
                        <p className="text-white/70 text-sm mt-1">{displayUser?.email || 'No email'}</p>

                        <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
                            <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                                <Shield size={10} />
                                Full Access
                            </span>
                            <span className="px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-bold uppercase tracking-wide flex items-center gap-1 border border-emerald-400/30">
                                <Activity size={10} />
                                Active
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ── EDIT PROFILE ──────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><User size={18} /></div>
                        <div>
                            <h2 className="text-sm font-black text-slate-900 uppercase">Account Details</h2>
                            <p className="text-[10px] text-slate-400 font-medium">Edit your display name and email</p>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
                            <div className="relative">
                                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Your full name"
                                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email Address</label>
                            <div className="relative">
                                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Role</label>
                            <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                <Shield size={14} className="text-indigo-500" />
                                <span className="text-sm font-bold text-indigo-700">Super Admin</span>
                                <span className="ml-auto text-[9px] font-black text-indigo-400 uppercase tracking-wider bg-indigo-100 px-2 py-0.5 rounded">Global Access</span>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={14} />
                            )}
                            Save Changes
                        </button>
                    </div>
                </div>

                {/* ── SECURITY ──────────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-rose-50 rounded-xl text-rose-600"><Lock size={18} /></div>
                        <div>
                            <h2 className="text-sm font-black text-slate-900 uppercase">Security</h2>
                            <p className="text-[10px] text-slate-400 font-medium">Manage password and access</p>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Password toggle */}
                        <button
                            onClick={() => setShowPwSection(!showPwSection)}
                            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <Key size={16} className="text-slate-400 group-hover:text-slate-600" />
                                <div className="text-left">
                                    <p className="text-sm font-bold text-slate-700">Change Password</p>
                                    <p className="text-[10px] text-slate-400">Update your authentication credentials</p>
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${showPwSection ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'}`}>
                                {showPwSection ? 'Hide' : 'Change'}
                            </span>
                        </button>

                        {showPwSection && (
                            <div className="space-y-3 border border-rose-100 bg-rose-50/30 p-4 rounded-xl">
                                {/* Current */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrentPw ? 'text' : 'password'}
                                            value={currentPassword}
                                            onChange={e => setCurrentPassword(e.target.value)}
                                            placeholder="Current password"
                                            className="w-full pl-3 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400/20"
                                        />
                                        <button onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                                            {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>

                                {/* New */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNewPw ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            placeholder="Min. 8 characters"
                                            className="w-full pl-3 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400/20"
                                        />
                                        <button onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                                            {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Confirm New Password</label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter new password"
                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400/20"
                                        />
                                        {confirmPassword && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {newPassword === confirmPassword
                                                    ? <CheckCircle size={14} className="text-emerald-500" />
                                                    : <AlertCircle size={14} className="text-rose-400" />
                                                }
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleChangePassword}
                                    disabled={saving}
                                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Key size={13} />}
                                    Update Password
                                </button>
                            </div>
                        )}

                        {/* Account info */}
                        <div className="space-y-2 pt-2">
                            {[
                                { label: 'Account ID', value: (displayUser as any)?._id?.toString()?.slice(-8)?.toUpperCase() || 'N/A', icon: <Shield size={12} /> },
                                { label: 'Last Login', value: 'Active Session', icon: <Clock size={12} /> },
                            ].map(item => (
                                <div key={item.label} className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wide">
                                        {item.icon}
                                        {item.label}
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 font-mono">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
