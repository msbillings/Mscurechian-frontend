"use client";

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    Mail, Phone, Award, MapPin,
    Calendar as CalendarIcon,
    Landmark, ShieldCheck,
    Building, BookOpen, FileText, CheckCircle2, Loader2,
    Eye, Upload, X
} from 'lucide-react';
import { getStaffProfileAction, getStaffDashboardAction } from '@/lib/integrations/actions/staff.actions';
import StaffProfileHeader from '@/components/staff/StaffProfileHeader';
import StaffTrainingHistoryClient from '@/components/staff/StaffTrainingHistoryClient';

// --- Document Viewer Modal ---
const DocViewerModal = ({ isOpen, onClose, url, title }: { isOpen: boolean; onClose: () => void; url: string; title: string }) => {
    if (!isOpen) return null;
    const getViewUrl = (u: string) => {
        if (!u) return '';
        if (u.includes('cloudinary.com')) {
            return u.replace('/upload/fl_attachment/', '/upload/').replace('/upload/', '/upload/fl_attachment:false/');
        }
        return u;
    };
    const viewUrl = getViewUrl(url);
    const isPdf = viewUrl?.toLowerCase().includes('pdf') || viewUrl?.toLowerCase().includes('raw');
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-6 bg-black/50 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0a0a09] w-full h-full sm:h-[92vh] sm:max-w-5xl sm:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl border border-white/10">
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 z-10 bg-white/90 dark:bg-black/90 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 dark:border-indigo-500/20">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-wider truncate max-w-[220px] sm:max-w-md">{title}</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Institutional Document Vault</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl text-gray-400 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                        <X size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto bg-gray-50 dark:bg-[#050505] flex items-center justify-center p-4">
                    {isPdf ? (
                        <div className="w-full h-full rounded-2xl overflow-hidden shadow-xl border border-gray-200/50 dark:border-gray-800/50">
                            <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewUrl)}&embedded=true`} className="w-full h-full border-none" title={title} />
                        </div>
                    ) : (
                        <div className="relative p-4">
                            <img src={viewUrl} alt={title} className="max-w-full h-auto shadow-2xl rounded-2xl border border-white/20" />
                        </div>
                    )}
                </div>
                <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-black/50 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <CheckCircle2 size={11} className="text-indigo-500" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Secure Institutional Document Viewer</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Credentials Document Viewer Component ---
const CredentialsDocViewer = ({ documents }: { documents: any }) => {
    const [viewer, setViewer] = useState({ isOpen: false, url: '', title: '' });
    const docs = [
        { id: 'degreeCertificate', label: 'Degree Certificate' },
        { id: 'medicalCouncilRegistration', label: 'Medical Council Registration' },
        { id: 'nursingCouncilRegistration', label: 'Nursing Council Registration' },
        { id: 'doctorateCertificate', label: 'Doctorate Certificate' },
        { id: 'internshipCertificate', label: 'Internship Certificate' },
    ];
    const uploadedCount = docs.filter(d => documents?.[d.id]?.url).length;

    return (
        <div className="md:col-span-2 flex flex-col gap-4">
            <DocViewerModal isOpen={viewer.isOpen} onClose={() => setViewer(v => ({ ...v, isOpen: false }))} url={viewer.url} title={viewer.title} />

            {/* Progress header */}
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {uploadedCount} of {docs.length} certificates uploaded
                </p>
                <div className="flex items-center gap-1">
                    {docs.map((d, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${documents?.[d.id]?.url ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    ))}
                </div>
            </div>

            {/* Document rows */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800/60">
                {docs.map((doc) => {
                    const docData = documents?.[doc.id];
                    const hasDoc = !!docData?.url;
                    const fileName = docData?.name || (docData?.url ? decodeURIComponent(docData.url.split('/').pop()?.split('?')[0] || '').replace(/^\d+_/, '') : null);
                    const isPdf = fileName?.toLowerCase().includes('.pdf');

                    return (
                        <div key={doc.id} className={`flex items-center gap-3 px-4 py-3.5 transition-all ${hasDoc ? 'bg-white dark:bg-[#111]' : 'bg-gray-50/70 dark:bg-gray-900/30'} hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 group`}>
                            {/* Status icon */}
                            <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border ${hasDoc ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                                {hasDoc ? <CheckCircle2 size={16} /> : <FileText size={15} />}
                            </div>

                            {/* Name + filename */}
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] sm:text-xs font-black text-gray-900 dark:text-white uppercase tracking-wide truncate">{doc.label}</p>
                                {hasDoc ? (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`inline-flex text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${isPdf ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500' : 'bg-sky-50 dark:bg-sky-500/10 text-sky-500'}`}>
                                            {isPdf ? 'PDF' : 'IMG'}
                                        </span>
                                        <p className="text-[9px] text-gray-400 truncate max-w-[100px] sm:max-w-[160px]" title={fileName || ''}>{fileName || 'Uploaded'}</p>
                                    </div>
                                ) : (
                                    <p className="text-[9px] text-amber-500 font-bold uppercase tracking-tighter mt-0.5">Not uploaded</p>
                                )}
                            </div>

                            {/* Status badge (sm+) */}
                            <div className="hidden sm:block shrink-0">
                                {hasDoc ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase rounded-full border border-emerald-100 dark:border-emerald-500/20">
                                        <CheckCircle2 size={9} /> Uploaded
                                    </span>
                                ) : (
                                    <span className="inline-flex px-2 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase rounded-full border border-amber-100 dark:border-amber-500/20">
                                        Missing
                                    </span>
                                )}
                            </div>

                            {/* View / Upload button */}
                            {hasDoc ? (
                                <button
                                    type="button"
                                    onClick={() => setViewer({ isOpen: true, url: docData.url, title: doc.label })}
                                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500/60 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-all shadow-sm hover:shadow-md"
                                >
                                    <Eye size={13} />
                                    <span className="hidden sm:inline">View</span>
                                </button>
                            ) : (
                                <Link
                                    href="edit"
                                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
                                >
                                    <Upload size={11} />
                                    <span className="hidden sm:inline">Upload</span>
                                </Link>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default function StaffProfileClient() {
    const params = useParams();
    const hospitalId = params?.hospitalId as string;

    const { data: profileRes, isLoading: profileLoading } = useQuery({
        queryKey: ['staff-profile', 'my'],
        queryFn: getStaffProfileAction,
        refetchInterval: 2000,
    });

    const { data: dashboardRes, isLoading: dashboardLoading } = useQuery({
        queryKey: ['staff-dashboard', 'my'],
        queryFn: getStaffDashboardAction,
        refetchInterval: 2000,
    });

    if (profileLoading || dashboardLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (!profileRes || !profileRes.staff) {
        return (
            <div className="max-w-4xl mx-auto py-20 px-4 text-center space-y-4">
                <div className="bg-red-50 dark:bg-red-900/10 p-8 rounded-3xl border border-red-100 dark:border-red-900/30">
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Profile Missing</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        We couldn&apos;t fetch your profile details. This might be because your profile hasn&apos;t been set up yet.
                    </p>
                    <div className="pt-6">
                        <Link href={`/${hospitalId}/staff/profile/edit`} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl inline-block shadow-lg shadow-indigo-500/20">
                            Set Up Profile Now
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const profile = profileRes.staff;
    const stats = dashboardRes?.stats;

    const staffName = profile.user?.name || 'Staff Member';
    const staffDesignation = profile.designation || 'Staff Member';
    const staffExperience = profile.experienceYears ? `${profile.experienceYears} Years` : 'N/A';
    const staffEmail = profile.user?.email || 'N/A';
    const staffPhone = profile.user?.mobile || 'N/A';
    const staffDepartments = Array.isArray(profile.department) ? profile.department.join(', ') : (profile.department || 'General');

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32 pt-12 px-4 animate-in fade-in duration-700">
            <StaffProfileHeader
                profile={profile}
                staffName={staffName}
                staffDesignation={staffDesignation}
                staffExperience={staffExperience}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Sidebar Details */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Contact Info Card */}
                    <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-5">
                        <h3 className="font-black text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Contact & Base Info</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl text-gray-400">
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Email Address</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{staffEmail}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl text-gray-400">
                                    <Phone size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Phone Number</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{staffPhone}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl text-gray-400">
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Hospital Placement</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-relaxed">
                                        {profile.hospital?.name || 'Main Campus Center'}
                                    </p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5 tracking-tighter">Code: {profile.hospital?.code}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-5">
                        <h3 className="font-black text-xs uppercase tracking-widest text-gray-400">Profile Metadata</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Gender</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{(profile.user as any)?.gender || 'N/A'}</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">DOB</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                    {(profile.user as any)?.dateOfBirth ? new Date((profile.user as any).dateOfBirth).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                <ShieldCheck size={18} className="text-indigo-500" /> Identity Tokens
                            </h3>
                            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 text-[10px] font-black rounded-lg">VERIFIED</span>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">PAN Number</p>
                                <p className="text-sm font-black text-gray-900 dark:text-white uppercase">{profile.panNumber || 'Not Provided'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Aadhar Card</p>
                                <p className="text-sm font-black text-gray-900 dark:text-white">
                                    {profile.aadharNumber ? `**** **** ${profile.aadharNumber.slice(-4)}` : 'Not Provided'}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-xl">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">UAN NO.</p>
                                    <p className="text-xs font-bold text-indigo-600 uppercase">{profile.uanNumber || 'N/A'}</p>
                                </div>
                                <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-xl">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Employee ID</p>
                                    <p className="text-xs font-bold">{profile.employeeId || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-[#111] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Building size={20} className="text-indigo-600" /> Infrastructure Deployment
                            </h3>
                            <div className="space-y-5">
                                <div className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-gray-800">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Department</span>
                                    <span className="text-sm font-black text-gray-900 dark:text-white">{staffDepartments}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-gray-800">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Designation</span>
                                    <span className="text-sm font-black text-gray-900 dark:text-white">{profile.designation || 'Staff Member'}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-gray-800">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Joined On</span>
                                    <span className="text-sm font-black text-gray-900 dark:text-white">
                                        {profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Shift Registry</span>
                                    <span className="text-sm font-black text-indigo-600">
                                        {profile.resolvedShift?.name || 'Standard Central Shift'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#111] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Award size={20} className="text-indigo-600" /> Professional Overview
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">Total Exp.</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{profile.experienceYears || 0} <span className="text-xs font-bold text-gray-400">Yrs</span></p>
                                </div>
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Status</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">Active</p>
                                </div>
                            </div>
                            <div className="pt-4 space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Work Schedule</h4>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                                    <CalendarIcon size={16} className="text-indigo-600" />
                                    <p className="text-xs font-bold text-gray-600 dark:text-gray-400">
                                        {profile.workingHours?.start || '09:00 AM'} - {profile.workingHours?.end || '05:00 PM'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <Award size={20} className="text-indigo-600" /> Qualifications & Documentation
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1 space-y-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Registration Number</p>
                                    <p className="text-sm font-black text-gray-900 dark:text-white">
                                        {profile.qualificationDetails?.registrationNumber || 'NOT REGISTERED'}
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">License Validity</p>
                                    <p className="text-sm font-black text-gray-900 dark:text-white">
                                        {profile.qualificationDetails?.licenseValidityDate
                                            ? new Date(profile.qualificationDetails.licenseValidityDate).toLocaleDateString()
                                            : 'PENDING'}
                                    </p>
                                </div>
                                {profile.qualificationDetails?.qualifications && profile.qualificationDetails.qualifications.length > 0 && (
                                    <div className="pt-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Degrees & Certifications</p>
                                        <div className="flex flex-wrap gap-2">
                                            {profile.qualificationDetails.qualifications.map((qual: string, idx: number) => (
                                                <span key={idx} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                                                    {qual}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Full 5-doc credentials list with View modal */}
                            <CredentialsDocViewer documents={profile.documents} />
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="relative flex flex-col md:flex-row gap-8 items-start">
                            <div className="flex-1 space-y-6 w-full">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-indigo-500/20 rounded-2xl">
                                        <Landmark size={24} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Financial & Payout Registry</h3>
                                        <p className="text-slate-400 text-xs mt-1">Institutional data securely stored for payroll processing.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Bank Account</p>
                                        <p className="text-sm font-bold tracking-widest">
                                            {profile.bankDetails?.accountNumber ? `****${profile.bankDetails.accountNumber.slice(-4)}` : 'NOT PROVIDED'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{profile.bankDetails?.bankName || 'NOT REGISTERED'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">IFSC Code</p>
                                        <p className="text-sm font-bold uppercase">{profile.bankDetails?.ifscCode || 'NOT PROVIDED'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">PF Registry No.</p>
                                        <p className="text-sm font-bold uppercase tracking-tighter text-indigo-400">{profile.pfNumber || 'PENDING'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Base Salary</p>
                                        <p className="text-sm font-black text-emerald-400 tracking-tighter">₹{profile.baseSalary?.toLocaleString() || '0'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <BookOpen size={20} className="text-indigo-600" /> Training History & Compliance
                        </h3>
                        <StaffTrainingHistoryClient />
                    </div>
                </div>
            </div>
        </div>
    );
}
