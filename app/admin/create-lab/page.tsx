"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminService, createLabsAction } from "@/lib/integrations";
import { FlaskConical, Search, Eye, EyeOff, Edit, Trash2, X, Building2, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, Card, FormInput, Button } from "@/components/admin";
import type { Hospital } from "@/lib/integrations/types";

interface LabData {
    name: string;
    email: string;
    mobile: string;
    password: string;
    hospitalId: string;
}

export default function CreateLab() {
    const router = useRouter();

    // Creation Form State
    const [formData, setFormData] = useState<LabData>({
        name: "",
        email: "",
        mobile: "",
        password: "",
        hospitalId: ""
    });

    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingHospitals, setLoadingHospitals] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);

    // Management State
    const [existingStaff, setExistingStaff] = useState<any[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);

    // Edit State
    const [editingStaff, setEditingStaff] = useState<any | null>(null);
    const [editForm, setEditForm] = useState<Partial<LabData>>({});
    const [showEditPassword, setShowEditPassword] = useState(false);

    useEffect(() => {
        fetchHospitals();
        fetchStaff();
    }, []);

    // ... (Dropdown Effects) ...
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.hospital-dropdown-container')) {
                setShowHospitalDropdown(false);
            }
        };

        if (showHospitalDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showHospitalDropdown]);

    useEffect(() => {
        if (searchQuery) {
            const filtered = hospitals.filter(hospital =>
                hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                hospital.hospitalId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                hospital.address?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredHospitals(filtered);
        } else {
            setFilteredHospitals(hospitals);
        }
    }, [searchQuery, hospitals]);

    const fetchHospitals = async () => {
        try {
            setLoadingHospitals(true);
            const data = await adminService.getHospitalsClient();
            setHospitals(data || []);
            setFilteredHospitals(data || []);
        } catch (error: any) {
            console.error("Failed to fetch hospitals:", error);
            toast.error(error.message || "Failed to load hospitals");
        } finally {
            setLoadingHospitals(false);
        }
    };

    const fetchStaff = async () => {
        try {
            setLoadingStaff(true);
            const data = await adminService.getUsersClient({ role: 'lab' });
            const staffArray = Array.isArray(data) ? data : (data as any)?.users || [];
            setExistingStaff(staffArray);
        } catch (error) {
            console.error("Failed to fetch lab staff:", error);
        } finally {
            setLoadingStaff(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === "mobile") {
            if (!/^\d{0,10}$/.test(value)) return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleHospitalSelect = (hospital: Hospital) => {
        setFormData(prev => ({ ...prev, hospitalId: hospital._id }));
        setShowHospitalDropdown(false);
        setSearchQuery(hospital.name);
    };

    const selectedHospital = hospitals.find(h => h._id === formData.hospitalId);

    const validateForm = (): boolean => {
        if (!formData.hospitalId) {
            toast.error("Please select a hospital.");
            return false;
        }
        if (!formData.name || !formData.email || !formData.mobile || !formData.password) {
            toast.error("Please fill all Lab Staff details.");
            return false;
        }
        if (formData.mobile.length !== 10) {
            toast.error("Mobile number must be exactly 10 digits.");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);

        try {
            const result = await createLabsAction({
                name: formData.name,
                email: formData.email,
                mobile: formData.mobile,
                password: formData.password,
                hospitalId: formData.hospitalId
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to create lab staff');
            }

            toast.success(`Lab Staff created successfully for ${selectedHospital?.name}!`);

            setFormData({ name: "", email: "", mobile: "", password: "", hospitalId: "" });
            setSearchQuery("");
            fetchStaff();

        } catch (err: any) {
            let errorMessage = "Failed to create lab staff";
            if (err.message) errorMessage = err.message;
            else if (err.error) errorMessage = typeof err.error === 'string' ? err.error : err.error.message || errorMessage;

            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this Lab Staff?")) return;
        const toastId = toast.loading("Deleting...");
        try {
            await adminService.deleteUserClient(id);
            toast.success("Deleted successfully", { id: toastId });
            fetchStaff();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete", { id: toastId });
        }
    };

    const handleEdit = (staff: any) => {
        setEditingStaff(staff);
        setEditForm({
            name: staff.name,
            email: staff.email,
            mobile: staff.mobile,
            password: ""
        });
        setShowEditPassword(false);
    };

    const handleUpdate = async () => {
        if (!editingStaff) return;
        const toastId = toast.loading("Updating...");

        const payload: any = { ...editForm };
        if (!payload.password) delete payload.password;

        try {
            await adminService.updateUserClient(editingStaff._id, payload);
            toast.success("Updated successfully", { id: toastId });
            setEditingStaff(null);
            fetchStaff();
        } catch (error: any) {
            toast.error(error.message || "Failed to update", { id: toastId });
        }
    };

    const getHospitalName = (hId: string | any) => {
        if (!hId) return "N/A";
        if (typeof hId === 'object') return hId.name || "N/A";
        const h = hospitals.find(x => x._id === hId);
        return h ? h.name : "Unknown Hospital";
    };

    return (
        <div className="max-w-[1600px] mx-auto pb-12 px-4">
            <PageHeader
                icon={<FlaskConical className="text-purple-500" />}
                title="Create Lab Staff"
                subtitle="Manage laboratory staff accounts"
            />

            <div className="flex flex-col xl:flex-row gap-8">
                {/* Left Column: Existing Staff List */}
                <div className="flex-1 order-2 xl:order-1">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                        <Building2 className="text-blue-500" /> Existing Lab Staff ({existingStaff.length})
                    </h2>

                    {loadingStaff ? (
                        <div className="text-center py-12 opacity-50">Loading staff...</div>
                    ) : existingStaff.length === 0 ? (
                        <div className="text-center py-12 opacity-50 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed">
                            No lab staff found.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {existingStaff.map((staff) => (
                                <Card key={staff._id} padding="p-5" className="hover:shadow-lg transition-shadow relative group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center font-bold text-lg">
                                                {staff.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg" style={{ color: 'var(--text-color)' }}>{staff.name}</h3>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                    {getHospitalName(staff.hospital)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(staff)}
                                                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Edit Details"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(staff._id)}
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Delete Staff"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3 text-sm" style={{ color: 'var(--secondary-color)' }}>
                                        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                            <span className="opacity-70 w-20">Email:</span>
                                            <span className="font-medium truncate flex-1">{staff.email}</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                            <span className="opacity-70 w-20">Mobile:</span>
                                            <span className="font-medium">{staff.mobile}</span>
                                        </div>
                                        {/* Dummy Password Field */}
                                        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                            <span className="opacity-70 w-20">Password:</span>
                                            <span className="font-medium tracking-widest">••••••••</span>
                                            <Lock size={14} className="ml-auto opacity-50" />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Create Form */}
                <div className="w-full xl:w-[450px] order-1 xl:order-2">
                    <div className="sticky top-6 space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Card title="Lab Staff Registration" icon={<FlaskConical className="text-purple-500" />} padding="p-6">
                                {/* Hospital Select */}
                                <div className="relative hospital-dropdown-container mb-6">
                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                                        Select Hospital <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchQuery || selectedHospital?.name || ""}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setShowHospitalDropdown(true);
                                            }}
                                            onFocus={() => setShowHospitalDropdown(true)}
                                            placeholder="Search hospital..."
                                            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            style={{
                                                backgroundColor: 'var(--card-bg)',
                                                color: 'var(--text-color)',
                                                borderColor: 'var(--border-color)'
                                            }}
                                            required
                                        />
                                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                    </div>

                                    {showHospitalDropdown && filteredHospitals.length > 0 && (
                                        <div
                                            className="absolute z-10 w-full mt-2 rounded-xl shadow-2xl max-h-60 overflow-y-auto border border-gray-100 dark:border-gray-700"
                                            style={{
                                                backgroundColor: 'var(--card-bg)',
                                                borderColor: 'var(--border-color)'
                                            }}
                                        >
                                            {filteredHospitals.map((hospital) => (
                                                <button
                                                    key={hospital._id}
                                                    type="button"
                                                    onClick={() => handleHospitalSelect(hospital)}
                                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 border-b last:border-b-0"
                                                    style={{ borderColor: 'var(--border-color)' }}
                                                >
                                                    <div className="font-semibold" style={{ color: 'var(--text-color)' }}>
                                                        {hospital.name}
                                                    </div>
                                                    <div className="text-sm mt-1" style={{ color: 'var(--secondary-color)' }}>
                                                        {hospital.hospitalId}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Form Fields */}
                                <div className="space-y-4">
                                    <FormInput
                                        label="Full Name"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Name"
                                    />
                                    <FormInput
                                        label="Email"
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Email"
                                    />
                                    <FormInput
                                        label="Mobile"
                                        type="tel"
                                        name="mobile"
                                        required
                                        value={formData.mobile}
                                        onChange={handleChange}
                                        placeholder="Mobile"
                                    />
                                    <div className="relative">
                                        <FormInput
                                            label="Password"
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            required
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-10 text-gray-500 hover:text-purple-500"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        loading={loading}
                                        icon={<FlaskConical size={18} />}
                                        className="w-full py-4 text-lg shadow-lg hover:shadow-xl bg-purple-600 hover:bg-purple-700"
                                    >
                                        Create Account
                                    </Button>
                                </div>
                            </Card>
                        </form>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editingStaff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95" style={{ backgroundColor: 'var(--card-bg)' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>Edit Staff Details</h3>
                            <button onClick={() => setEditingStaff(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <FormInput
                                label="Full Name"
                                value={editForm.name || ""}
                                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                            <FormInput
                                label="Email"
                                value={editForm.email || ""}
                                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                            />
                            <FormInput
                                label="Mobile"
                                value={editForm.mobile || ""}
                                onChange={(e) => setEditForm(prev => ({ ...prev, mobile: e.target.value }))}
                            />

                            <div className="relative">
                                <FormInput
                                    label="Set New Password (Optional)"
                                    type={showEditPassword ? "text" : "password"}
                                    value={editForm.password || ""}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                                    placeholder="Type to change password..."
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowEditPassword(!showEditPassword)}
                                    className="absolute right-3 top-10 text-gray-500 hover:text-purple-500"
                                >
                                    {showEditPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                                <p className="text-xs text-orange-500 mt-1">
                                    Note: Previous password cannot be viewed (securely Encrypted).
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <Button variant="secondary" onClick={() => setEditingStaff(null)}>Cancel</Button>
                            <Button variant="primary" onClick={handleUpdate}>Save Changes</Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
