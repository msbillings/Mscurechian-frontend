'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { userService } from '@/lib/integrations/services/user.service';
import { pharmacyService } from '@/lib/integrations/services/pharmacy.service';
import { toast } from 'react-hot-toast';
import {
    User as UserIcon,
    Mail,
    Phone,
    MapPin,
    Building,
    Camera,
    Save,
    CreditCard,
    FileText,
    Loader2,
    CheckCircle2,
    ImageIcon,
    ExternalLink,
    ChevronDown,
    Plus,
    X,
    Award,
    CloudUpload,
    Eye,
    ShieldCheck
} from 'lucide-react';
import { PharmacyProfileSkeleton } from '@/components/ui/skeletons';
import { DocumentViewerModal } from '@/components/common/DocumentViewerModal';
import ImageCropper from '@/components/ui/ImageCropper';
import PrinterSettingsCard from '@/components/printers/PrinterSettingsCard';

/**
 * PharmacyProfile Component
 * Handles branding, entity details, and node configuration for pharmacy owners.
 */
const PharmacyProfile = () => {
    // Auth Store for persistent user data
    const { user, setUser, checkAuth } = useAuthStore();

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: '',
        address: '',
        gstin: '',
        shopName: '',
        licenseNo: '',
        qualificationDetails: {
            qualifications: [] as string[]
        },
        documents: {
            degreeCertificate: { url: '', publicId: '' },
            registrationCertificate: { url: '', publicId: '' }
        }
    });

    // File Name State for UI Feedback
    const [uploadedFileNames, setUploadedFileNames] = useState({
        degreeCertificate: '',
        registrationCertificate: ''
    });

    // Document Viewer State
    const [docViewer, setDocViewer] = useState<{ url: string; label: string } | null>(null);

    // Image/Logo State
    const [logo, setLogo] = useState<string | null>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isLogoDropdownOpen, setIsLogoDropdownOpen] = useState(false);

    // Cropper State
    const [cropper, setCropper] = useState<{
        isOpen: boolean;
        image: string;
    }>({
        isOpen: false,
        image: ''
    });

    // LOGO PRESETS
    const LOGO_PRESETS = [
        { name: 'Pharmacy 1', url: 'https://cdn-icons-png.flaticon.com/512/3063/3063380.png' },
        { name: 'Pharmacy 2', url: 'https://cdn-icons-png.flaticon.com/512/883/883407.png' },
        { name: 'Medical Store', url: 'https://cdn-icons-png.flaticon.com/512/4320/4320350.png' },
        { name: 'Clinical', url: 'https://cdn-icons-png.flaticon.com/512/2966/2966334.png' },
        { name: 'Healthcare', url: 'https://cdn-icons-png.flaticon.com/512/1004/1004419.png' },
    ];

    // Initialize form with user data
    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                mobile: user.mobile || '',
                address: user.address || '',
                gstin: user.gstin || '',
                shopName: user.shopName || user.name || '',
                licenseNo: user.licenseNo || '',
                qualificationDetails: {
                    qualifications: user.qualificationDetails?.qualifications || []
                },
                documents: {
                    degreeCertificate: {
                        url: user.documents?.degreeCertificate?.url || '',
                        publicId: user.documents?.degreeCertificate?.publicId || ''
                    },
                    registrationCertificate: {
                        url: user.documents?.registrationCertificate?.url || '',
                        publicId: user.documents?.registrationCertificate?.publicId || ''
                    }
                }
            });
            setLogo(user.image || null);
            setIsLoading(false);
        }
    }, [user]);

    // Handle Input Changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setHasChanges(true);
    };

    const handleFieldChange = (fieldPath: string, value: any) => {
        const keys = fieldPath.split('.');
        setFormData((prev: any) => {
            if (keys.length === 2) {
                return {
                    ...prev,
                    [keys[0]]: { ...prev[keys[0]], [keys[1]]: value }
                };
            }
            return { ...prev, [fieldPath]: value };
        });
        setHasChanges(true);
    };

    const handleQualificationChange = (index: number, value: string) => {
        const updatedQuals = [...(formData.qualificationDetails.qualifications || [])];
        updatedQuals[index] = value;
        handleFieldChange('qualificationDetails.qualifications', updatedQuals);
    };

    const addQualification = () => {
        const updatedQuals = [...(formData.qualificationDetails.qualifications || []), ''];
        handleFieldChange('qualificationDetails.qualifications', updatedQuals);
    };

    const removeQualification = (index: number) => {
        const updatedQuals = (formData.qualificationDetails.qualifications || []).filter((_: any, i: number) => i !== index);
        handleFieldChange('qualificationDetails.qualifications', updatedQuals);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Only PDF and Image files are allowed');
            return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return;
        }

        try {
            setIsSaving(true);
            const fileName = `${fieldName}_${Date.now()}`;

            // UI Feedback: Show selected filename immediately
            setUploadedFileNames(prev => ({ ...prev, [fieldName]: file.name }));

            const response = await pharmacyService.uploadDocument(file, fileName);

            if (response.success) {
                setFormData((prev: any) => ({
                    ...prev,
                    documents: {
                        ...prev.documents,
                        [fieldName]: { url: response.url, publicId: response.publicId }
                    }
                }));
                setHasChanges(true);
                toast.success('Document uploaded successfully');
            }
        } catch (error) {
            console.error('File upload failed:', error);
            toast.error('File upload failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoSelect = (url: string) => {
        setLogo(url);
        setIsLogoDropdownOpen(false);
        setHasChanges(true);
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
        setIsUploadingLogo(true);
        const uploadToast = toast.loading('Uploading logo...');

        try {
            const file = new File([blob], `pharmacy_logo_${Date.now()}.png`, { type: 'image/png' });
            const response = await pharmacyService.uploadDocument(file, `pharmacy_logo_${Date.now()}`);

            if (response.success) {
                const newLogo = response.url;
                const cacheBustedLogo = `${newLogo}${newLogo.includes('?') ? '&' : '?'}t=${Date.now()}`;
                setLogo(cacheBustedLogo);
                setHasChanges(true);

                // Sync with store for immediate navbar update
                if (setUser && user) {
                    setUser({
                        ...user,
                        image: cacheBustedLogo,
                        avatar: cacheBustedLogo,
                        profilePic: cacheBustedLogo
                    } as any);
                }

                toast.success('Logo updated successfully', { id: uploadToast });
            } else {
                toast.error('Logo upload failed', { id: uploadToast });
            }
        } catch (error) {
            console.error('Logo upload failed:', error);
            toast.error('An error occurred during upload', { id: uploadToast });
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        handlePhotoSelected(e);
    };

    // Handle Save/Commit
    const handleSave = async () => {
        if (!formData.shopName) {
            toast.error('Entity Name is required');
            return;
        }

        setIsSaving(true);
        try {
            // Clean up empty qualifications before saving
            const cleanedQualifications = (formData.qualificationDetails.qualifications || [])
                .filter(q => q.trim() !== '');

            const updatedData = {
                ...formData,
                qualificationDetails: {
                    ...formData.qualificationDetails,
                    qualifications: cleanedQualifications
                },
                image: logo
            };

            // Call API
            const response: any = await userService.updateProfile(updatedData as any);

            // Map backend response to store's User interface if needed
            const newUser = {
                ...user,
                ...response,
                id: response._id || user?.id, // Ensure ID is preserved
                // Sync all image fields for Navbar consistency
                image: logo || response.image || user?.image,
                avatar: logo || response.image || user?.image,
                profilePic: logo || response.image || user?.image
            };

            // Update local store immediately for instant UI feedback
            setUser(newUser);

            // Secondary refresh to ensure everything is in sync
            await checkAuth(true); // Force fresh data

            setHasChanges(false);
            setIsEditing(false);
            toast.success('Pharmacist Profile Updated', {
                icon: <CheckCircle2 className="text-teal-500" />,
                style: { borderRadius: '16px', background: '#111', color: '#fff' }
            });
        } catch (error: any) {
            console.error('[Profile Update Error]', error);
            toast.error(error.message || 'Transmission Interrupted');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <PharmacyProfileSkeleton />;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 dark:border-gray-800">
                <div>
                    <h1 className="text-lg md:text-xl font-black text-gray-900 dark:text-white tracking-tight ">Pharmacist Profile</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-bold mt-1 uppercase tracking-widest text-[10px] md:text-[12px]">Registry Configuration & Branding</p>
                </div>
                <div className="flex items-center gap-3">
                    {hasChanges && (
                        <span className="text-xs font-black text-orange-500 uppercase tracking-widest animate-pulse px-3 py-1 bg-orange-50 dark:bg-orange-900/20 rounded-full border border-orange-100 dark:border-orange-900/30">
                            Unsaved Edits
                        </span>
                    )}
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-4 py-2 md:py-3 md:px-8 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all active:scale-95 bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-200 dark:shadow-none"
                        >
                            Edit Profile
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    // Reset form data if needed or just leave as is since user can re-edit
                                }}
                                className="px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all active:scale-95 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200"
                            >
                                <X size={16} />
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !hasChanges}
                                className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all active:scale-95 ${isSaving || !hasChanges
                                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700 shadow-xl shadow-green-200 dark:shadow-none'
                                    }`}
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                Commit Changes
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Branding Sidebar */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-4xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center text-center">
                        <div className="relative group mb-6 w-full">
                            <div className="w-40 h-40 mx-auto rounded-3xl bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden shadow-inner group-hover:border-blue-400 transition-colors">
                                {logo ? (
                                    <img src={logo} alt="Shop Logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <Camera size={32} />
                                        <span className="text-xs font-black uppercase">No Logo</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 space-y-4 w-full">
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => isEditing && setIsLogoDropdownOpen(!isLogoDropdownOpen)}
                                        disabled={!isEditing}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="flex items-center gap-2">
                                            <ImageIcon size={14} className="text-blue-500" />
                                            Preset Logos
                                        </span>
                                        <ChevronDown size={14} className={`transition-transform duration-200 ${isLogoDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isLogoDropdownOpen && (
                                        <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="p-2 grid grid-cols-4 gap-2">
                                                {LOGO_PRESETS.map((preset) => (
                                                    <button
                                                        key={preset.name}
                                                        type="button"
                                                        onClick={() => handleLogoSelect(preset.url)}
                                                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${logo === preset.url ? 'border-blue-500 scale-105 shadow-lg shadow-blue-500/20' : 'border-transparent hover:border-blue-200'}`}
                                                        title={preset.name}
                                                    >
                                                        <img src={preset.url} alt={preset.name} className="w-full h-full object-contain p-1" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 text-left">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider px-1 flex items-center gap-2">
                                        <CloudUpload size={12} />
                                        Upload Logo
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            className="hidden"
                                            id="logo-upload"
                                            disabled={!isEditing}
                                        />
                                        <label
                                            htmlFor="logo-upload"
                                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isEditing ? 'hover:bg-gray-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                                        >
                                            {isUploadingLogo ? <Loader2 className="animate-spin" size={14} /> : <Camera size={14} />}
                                            {logo ? 'Change Logo' : 'Choose File'}
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-2 text-left">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider px-1 flex items-center gap-2">
                                        <ExternalLink size={12} />
                                        Custom Logo URL
                                    </label>
                                    <input
                                        type="url"
                                        value={logo || ''}
                                        onChange={(e) => {
                                            setLogo(e.target.value);
                                            setHasChanges(true);
                                        }}
                                        disabled={!isEditing}
                                        placeholder="https://example.com/logo.png"
                                        className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight truncate w-full">{formData.shopName || 'Node Identifier'}</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Branding Visual</p>
                    </div>

                    <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-4xl border border-blue-100 dark:border-blue-800/30">
                        <div className="flex gap-3 mb-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
                                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase text-blue-900 dark:text-blue-200 tracking-widest">Compliance Status</h4>
                                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mt-0.5">Verified Registry Node</p>
                            </div>
                        </div>
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400/80 leading-relaxed italic">
                            Official pharmacy branding and certificates ensure transparency in clinical manifests.
                        </p>
                    </div>

                    <PrinterSettingsCard />
                </div>

                {/* Data Configuration Section */}
                <div className="md:col-span-2 space-y-6">
                    {/* Entity Details */}
                    <div className="bg-white dark:bg-gray-800 rounded-4xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl dark:bg-indigo-900/30">
                                <Building size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white italic">Entity Details</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Base configuration</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Shop / Entity Name</label>
                                <input
                                    name="shopName"
                                    value={formData.shopName}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="ENTER SHOP NAME"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Owner Name</label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="FULL LEGAL NAME"
                                />
                            </div>
                            <div className="space-y-2 col-span-full">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Full Service Address</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl pl-12 pr-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="STREET, CITY, STATE, ZIP"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Legal & Contact Protocol */}
                    <div className="bg-white dark:bg-gray-800 rounded-4xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl dark:bg-teal-900/30">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white italic">Compliance & Registry</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contact & legal metrics</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">GSTIN Number</label>
                                <div className="relative group">
                                    <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                                    <input
                                        name="gstin"
                                        value={formData.gstin}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl pl-12 pr-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500 dark:text-white uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="22AAAAA0000A1Z5"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Drug License No.</label>
                                <input
                                    name="licenseNo"
                                    value={formData.licenseNo}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500 dark:text-white uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="DL-00000-00"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Communication Line</label>
                                <div className="relative group">
                                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        name="mobile"
                                        value={formData.mobile}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl pl-12 pr-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="PHONE NUMBER"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Registry Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl pl-12 pr-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="EMAIL@DOMAIN.COM"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Academic Qualifications & Professional Documents - Combined Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-4xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl dark:bg-blue-900/30">
                                    <Award size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-thin uppercase text-gray-900 dark:text-white">Qualifications & Documents</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pharmacist expertise registry & compliance uploads</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={addQualification}
                                disabled={!isEditing}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={14} /> Add Qualification
                            </button>
                        </div>

                        {/* Qualifications List */}
                        <div className="space-y-4 mb-8">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Educational Qualifications</label>
                            {formData.qualificationDetails.qualifications?.map((qual: string, index: number) => (
                                <div key={`qual-${index}`} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <div className="flex-1 relative group">
                                        <Award className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            type="text"
                                            value={qual}
                                            onChange={(e) => handleQualificationChange(index, e.target.value)}
                                            disabled={!isEditing}
                                            placeholder="e.g. B.Pharm, M.Pharm, Pharm.D"
                                            className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl pl-12 pr-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeQualification(index)}
                                        disabled={!isEditing}
                                        className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ))}
                            {(formData.qualificationDetails.qualifications || []).length === 0 && (
                                <div className="py-8 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl text-center">
                                    <Award className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                                    <p className="text-xs text-gray-400 italic font-bold uppercase tracking-widest">No certifications cataloged in node. Initial entry required.</p>
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-4 bg-white dark:bg-gray-800 text-xs font-black text-gray-400 uppercase tracking-widest">Supporting Documents</span>
                            </div>
                        </div>

                        {/* Document Uploads */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { id: 'degreeCertificate', label: 'Degree Certificate', key: 'degreeCertificate' },
                                { id: 'registrationCertificate', label: 'Registration Certificate', key: 'registrationCertificate' },
                            ].map((doc: any) => (
                                <div key={doc.id} className="space-y-4">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{doc.label} (PDF/JPG/PNG)</label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => handleFileUpload(e, doc.key)}
                                            className="hidden"
                                            id={`${doc.id}-upload-pharma`}
                                            disabled={!isEditing}
                                        />
                                        <label
                                            htmlFor={`${doc.id}-upload-pharma`}
                                            className={`flex flex-col gap-3 p-5 bg-gray-50 dark:bg-gray-900/50 border-2 border-dashed ${formData.documents?.[doc.key as keyof typeof formData.documents]?.url ? 'border-teal-500/50 bg-teal-50/10 dark:bg-teal-500/5' : 'border-gray-200 dark:border-gray-700'} rounded-3xl transition-all group ${isEditing ? 'cursor-pointer hover:border-blue-400 hover:bg-blue-50/10 dark:hover:bg-blue-500/5' : 'cursor-not-allowed opacity-70'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className={`p-2 rounded-xl ${formData.documents?.[doc.key as keyof typeof formData.documents]?.url ? 'bg-teal-100 dark:bg-teal-900/30' : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'} transition-colors`}>
                                                    {formData.documents?.[doc.key as keyof typeof formData.documents]?.url ?
                                                        <CheckCircle2 size={16} className="text-teal-600 dark:text-teal-400" /> :
                                                        <CloudUpload size={16} className="text-gray-400 dark:text-gray-500 group-hover:text-blue-500" />
                                                    }
                                                </div>
                                                {formData.documents?.[doc.key as keyof typeof formData.documents]?.url && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setDocViewer({
                                                                url: formData.documents?.[doc.key as keyof typeof formData.documents]?.url,
                                                                label: doc.label
                                                            });
                                                        }}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                        title="View Document"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider truncate">
                                                    {uploadedFileNames[doc.key as keyof typeof uploadedFileNames] || (formData.documents?.[doc.key as keyof typeof formData.documents]?.url ? `${doc.label} Verified` : `Upload ${doc.label}`)}
                                                </p>
                                                <p className="text-xs font-bold text-gray-400 uppercase mt-0.5">Max 5MB • PDF/IMAGE</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* DOCUMENT VIEWER MODAL */}
            <DocumentViewerModal
                isOpen={!!docViewer}
                onClose={() => setDocViewer(null)}
                url={docViewer?.url || ''}
                title={docViewer?.label || ''}
            />

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
                    isUploading={isUploadingLogo}
                />
            )}
        </div>
    );
};

export default PharmacyProfile;
