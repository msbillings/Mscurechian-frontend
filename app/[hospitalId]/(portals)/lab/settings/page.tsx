'use client';

import React, { useEffect, useState } from 'react';
import { LabSettingsService, LabSettings } from '@/lib/integrations/services/labSettings.service';
import { toast } from 'react-hot-toast';
import { Save, Building2, Phone, Mail, Globe, MapPin, FileText, ImageIcon } from 'lucide-react';

export default function LabSettingsPage() {
    const [settings, setSettings] = useState<LabSettings>({
        name: '',
        tagline: '',
        address: '',
        phone: '',
        email: '',
        logo: '',
        website: '',
        gstin: '',
        footerText: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await LabSettingsService.getSettings();
            if (data) {
                setSettings(prev => ({
                    ...prev,
                    ...data,
                    // Ensure no null/undefined values for controlled inputs
                    name: data.name || '',
                    tagline: data.tagline || '',
                    address: data.address || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    logo: data.logo || '',
                    website: data.website || '',
                    gstin: data.gstin || '',
                    footerText: data.footerText || ''
                }));
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            toast.error('Could not load lab settings');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value || '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await LabSettingsService.updateSettings(settings);
            toast.success('Lab settings updated successfully');
        } catch (error) {
            console.error('Failed to update settings:', error);
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSaving(true);
        const toastId = toast.loading('Uploading logo...');
        try {
            const { url } = await LabSettingsService.uploadLogo(file);
            setSettings(prev => ({ ...prev, logo: url }));
            toast.success('Logo uploaded successfully', { id: toastId });
        } catch (error) {
            console.error('Logo upload failed:', error);
            toast.error('Failed to upload logo', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-8">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-gray-700 pb-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lab Settings</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your laboratory details, branding, and report configurations.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-gray-400" /> Basic Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lab Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={settings.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="e.g. Medi Lab Laboratory"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tagline</label>
                                <input
                                    type="text"
                                    name="tagline"
                                    value={settings.tagline}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="e.g. Advanced Diagnostic Center"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-gray-400" /> Contact Information
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Complete Address</label>
                                <textarea
                                    name="address"
                                    rows={3}
                                    value={settings.address}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Lab full address..."
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5" /> Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={settings.phone}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="+91..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5" /> Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={settings.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="lab@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Globe className="w-3.5 h-3.5" /> Website
                                    </label>
                                    <input
                                        type="text"
                                        name="website"
                                        value={settings.website}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="www.example.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Legal \u0026 Branding */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-gray-400" /> Legal \u0026 Branding
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">GSTIN / Tax ID</label>
                                <input
                                    type="text"
                                    name="gstin"
                                    value={settings.gstin}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="22AAAAA0000A1Z5"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Logo URL or Upload</label>
                                <div className="flex gap-4">
                                    <input
                                        type="text"
                                        name="logo"
                                        value={settings.logo}
                                        onChange={handleChange}
                                        className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="https://..."
                                    />
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <button
                                            type="button"
                                            disabled={saving}
                                            className="px-4 py-2.5 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-600 transition-all border border-slate-200 dark:border-gray-600 font-medium whitespace-nowrap"
                                        >
                                            Upload Image
                                        </button>
                                    </div>
                                </div>
                                {settings.logo && (
                                    <div className="mt-2 p-2 border rounded-lg w-fit bg-gray-50">
                                        <img src={settings.logo} alt="Logo Preview" className="h-16 object-contain" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-6 border-t border-slate-100 dark:border-gray-700 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className={`px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
