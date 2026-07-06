'use client';

import React, { useEffect, useState } from 'react';
import { LabSettingsService, LabSettings } from '@/lib/integrations/services/labSettings.service';
import { toast } from 'react-hot-toast';
import { Save, Building2, Phone, Mail, Globe, MapPin, FileText, ImageIcon } from 'lucide-react';
import ImageCropper from '@/components/ui/ImageCropper';
import { useAuthStore } from '@/stores/authStore';
import PrinterSettingsCard from '@/components/printers/PrinterSettingsCard';
import SupportBadgeToggle from '@/components/common/SupportBadgeToggle';

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
    const { user, setUser } = useAuthStore();

    // Cropper State
    const [cropper, setCropper] = useState<{
        isOpen: boolean;
        image: string;
    }>({
        isOpen: false,
        image: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await LabSettingsService.getSettings();
            if (data) {
                let draftData: any = null;
                if (typeof window !== 'undefined') {
                    const draft = localStorage.getItem('curechain_lab_settings_draft');
                    if (draft) {
                        try { draftData = JSON.parse(draft); } catch (e) {}
                    }
                }
                const merged = { ...data, ...draftData };

                setSettings(prev => ({
                    ...prev,
                    ...merged,
                    name: merged.name || '',
                    tagline: merged.tagline || '',
                    address: merged.address || '',
                    phone: merged.phone || '',
                    email: merged.email || '',
                    logo: merged.logo || '',
                    website: merged.website || '',
                    gstin: merged.gstin || '',
                    footerText: merged.footerText || ''
                }));
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            toast.error('Could not load lab settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (settings.name || settings.phone || settings.email) {
            localStorage.setItem('curechain_lab_settings_draft', JSON.stringify(settings));
        }
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value || '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await LabSettingsService.updateSettings(settings);
            
            // Sync with store for navbar
            if (setUser && user) {
                setUser({
                    ...user,
                    logo: settings.logo,
                    image: settings.logo,
                    avatar: settings.logo,
                    profilePic: settings.logo
                } as any);
            }

            if (typeof window !== 'undefined') {
                localStorage.removeItem('curechain_lab_settings_draft');
            }

            toast.success('Lab settings updated successfully');
        } catch (error) {
            console.error('Failed to update settings:', error);
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setCropper({
                    isOpen: true,
                    image: reader.result as string
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = async (blob: Blob) => {
        setCropper(prev => ({ ...prev, isOpen: false }));
        setSaving(true);
        const toastId = toast.loading('Uploading logo...');

        try {
            const file = new File([blob], `lab_logo_${Date.now()}.png`, { type: 'image/png' });
            const { url } = await LabSettingsService.uploadLogo(file);
            
            const cacheBustedLogo = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
            setSettings(prev => ({ ...prev, logo: cacheBustedLogo }));

            // Sync with store for navbar
            if (setUser && user) {
                setUser({
                    ...user,
                    logo: cacheBustedLogo,
                    image: cacheBustedLogo,
                    avatar: cacheBustedLogo,
                    profilePic: cacheBustedLogo
                } as any);
            }

            toast.success('Logo uploaded successfully', { id: toastId });
        } catch (error) {
            console.error('Logo upload failed:', error);
            toast.error('Failed to upload logo', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        handlePhotoSelected(e);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <>
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 border-b border-slate-100 dark:border-gray-700 pb-3 sm:pb-4">
                    <div className="p-2.5 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl shrink-0">
                        <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white">Lab Settings</h1>
                        <p className="text-xs md:text-sm lg:text-base text-gray-500 dark:text-gray-400">Manage your laboratory details, branding, and report configurations.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" /> Basic Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Lab Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={settings.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm sm:text-base font-medium"
                                    placeholder="e.g. Medi Lab Laboratory"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tagline</label>
                                <input
                                    type="text"
                                    name="tagline"
                                    value={settings.tagline}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm sm:text-base font-medium"
                                    placeholder="e.g. Advanced Diagnostic Center"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" /> Contact Information
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Complete Address</label>
                                <textarea
                                    name="address"
                                    rows={3}
                                    value={settings.address}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm sm:text-base font-medium resize-none"
                                    placeholder="Lab full address..."
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5" /> Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={settings.phone}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm sm:text-base font-medium"
                                        placeholder="+91..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5" /> Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={settings.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm sm:text-base font-medium"
                                        placeholder="lab@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Globe className="w-3.5 h-3.5" /> Website
                                    </label>
                                    <input
                                        type="text"
                                        name="website"
                                        value={settings.website}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm sm:text-base font-medium"
                                        placeholder="www.example.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Legal \u0026 Branding */}
                    <div className="space-y-4">
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" /> Legal \u0026 Branding
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">GSTIN / Tax ID</label>
                                <input
                                    type="text"
                                    name="gstin"
                                    value={settings.gstin}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm sm:text-base font-medium"
                                    placeholder="22AAAAA0000A1Z5"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Logo URL or Upload</label>
                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                    <input
                                        type="text"
                                        name="logo"
                                        value={settings.logo}
                                        onChange={handleChange}
                                        className="flex-1 px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm sm:text-base font-medium"
                                        placeholder="https://..."
                                    />
                                    <div className="relative shrink-0">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <button
                                            type="button"
                                            disabled={saving}
                                            className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 rounded-xl hover:bg-slate-200 dark:hover:bg-gray-600 transition-all border border-slate-200 dark:border-gray-600 font-bold text-sm whitespace-nowrap shadow-sm"
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

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 pt-4">
                         <SupportBadgeToggle />
                         <PrinterSettingsCard />
                     </div>

                    {/* Submit Button */}
                    <div className="pt-8 border-t border-slate-100 dark:border-gray-700">
                        <button
                            type="submit"
                            disabled={saving}
                            className={`w-full sm:w-auto sm:ml-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-100 dark:shadow-none transition-all flex items-center justify-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0'}`}
                        >
                            <Save className={`${saving ? 'animate-spin' : ''} w-5 h-5`} />
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        
        {/* IMAGE CROPPER MODAL */}
        {cropper.isOpen && (
            <ImageCropper
                src={cropper.image}
                onCancel={() => setCropper(prev => ({ ...prev, isOpen: false }))}
                onCrop={(dataUrl) => {
                    // Convert dataUrl to blob and call handleCropComplete
                    fetch(dataUrl)
                        .then(res => res.blob())
                        .then(handleCropComplete);
                }}
                isUploading={saving}
            />
        )}
        </>
    );
}
