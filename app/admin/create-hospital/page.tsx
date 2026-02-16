'use client';

import React, { useState } from "react";
import { adminService } from "@/lib/integrations";
import { Building2, Plus, Trash2, MapPin, Globe, Phone, Mail, Calendar, Clock, Star, Bed, Activity } from "lucide-react";
import toast from "react-hot-toast";
import {
    PageHeader,
    Card,
    FormInput,
    Button
} from "@/components/admin";
import type { CreateHospitalRequest } from "@/lib/integrations";

function CreateHospital() {
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        phone: "",
        email: "",
        pincode: "",
        establishedYear: "",
        website: "",
        operatingHours: "24/7",
        numberOfBeds: "",
        ICUBeds: "",
        numberOfDoctors: "",
        ambulanceAvailability: true,
        rating: "4.5",
        location: { lat: "", lng: "" },
        specialities: [] as string[],
        services: [] as string[]
    });

    const [loading, setLoading] = useState(false);
    const [tempSpecialty, setTempSpecialty] = useState("");
    const [tempService, setTempService] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        if (name === "phone") {
            if (/^\d{0,10}$/.test(value)) {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
            return;
        }

        if (name === "name") {
            // Assume "Hospital Name" should be characters/spaces only as requested
            // Note: Hospital names often have numbers, but user strictly requested "characters only"
            if (/^[a-zA-Z\s]*$/.test(value)) {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
            return;
        }

        if (name === "pincode") {
            // "only it take 6 digits" - restricting input to numbers and max 6
            if (/^\d{0,6}$/.test(value)) {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
            return;
        }

        if (name.includes(".")) {
            const parts = name.split(".");
            const field = parts[1]; // lat or lng

            if (field === 'lat' || field === 'lng') {
                // "take number and . special chara ctes only"
                if (/^[0-9.]*$/.test(value)) {
                    setFormData(prev => ({
                        ...prev,
                        [parts[0]]: { ...((prev as any)[parts[0]] || {}), [parts[1]]: value }
                    }));
                }
            } else {
                setFormData(prev => ({
                    ...prev,
                    [parts[0]]: { ...((prev as any)[parts[0]] || {}), [parts[1]]: value }
                }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const addItem = (field: 'specialities' | 'services', value: string, setter: (v: string) => void) => {
        if (!value.trim()) return;
        if (formData[field].includes(value.trim())) {
            toast.error(`${value} already added`);
            return;
        }
        setFormData(prev => ({ ...prev, [field]: [...prev[field], value.trim()] }));
        setter("");
    };

    const removeItem = (field: 'specialities' | 'services', index: number) => {
        setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.phone.length !== 10) {
            toast.error("Phone number must be exactly 10 digits.");
            return;
        }

        if (formData.pincode.length !== 6) {
            toast.error("Pincode must be exactly 6 digits.");
            return;
        }

        setLoading(true);

        try {
            // Prepare payload similar to old frontend - send data directly, backend handles conversion
            const payload: any = {
                name: formData.name.trim(),
                address: formData.address.trim(),
                phone: formData.phone.trim(),
                email: formData.email?.trim() || "",
                pincode: formData.pincode?.trim() || "",
                establishedYear: formData.establishedYear || "",
                numberOfBeds: formData.numberOfBeds || "",
                ICUBeds: formData.ICUBeds || "",
                numberOfDoctors: formData.numberOfDoctors || "",
                website: formData.website?.trim() || "",
                operatingHours: formData.operatingHours?.trim() || "24/7",
                ambulanceAvailability: formData.ambulanceAvailability,
                rating: formData.rating || "",
                specialities: formData.specialities || [],
                services: formData.services || [],
            };

            // Add location only if both lat and lng are provided
            if (formData.location.lat && formData.location.lng) {
                payload.location = {
                    lat: formData.location.lat,
                    lng: formData.location.lng
                };
            }

            const result = await adminService.createHospitalClient(payload);
            const hospitalId = result?.hospitalId || "Unknown ID";
            toast.success(`Hospital created successfully! ID: ${hospitalId}`, { duration: 5000 });

            // Reset form
            setFormData({
                name: "", address: "", phone: "", email: "", pincode: "",
                establishedYear: "", website: "", operatingHours: "24/7",
                numberOfBeds: "", ICUBeds: "", numberOfDoctors: "",
                ambulanceAvailability: true, rating: "4.5",
                location: { lat: "", lng: "" }, specialities: [], services: []
            });
        } catch (err: any) {
            console.error("Create hospital error:", err);
            // Show detailed error message from backend
            const errorMessage = err.message || err.error || "Failed to create hospital";
            toast.error(errorMessage, { duration: 5000 });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <PageHeader
                title="Create New Hospital"
                subtitle="Register a new healthcare facility into the system"
                icon={<Building2 className="text-orange-500" />}
            />

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Info */}
                <Card title="Basic Information" padding="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FormInput
                            label="Hospital Name"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Sunrise Medical Center"
                            icon={<Building2 size={18} className="text-gray-400" />}
                        />
                        <FormInput
                            label="Email Address"
                            name="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="contact@hospital.com"
                            icon={<Mail size={18} className="text-gray-400" />}
                        />
                        <FormInput
                            label="Phone Number"
                            name="phone"
                            required
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="10 digit number"
                            icon={<Phone size={18} className="text-gray-400" />}
                        />
                        <FormInput
                            label="Website URL"
                            name="website"
                            value={formData.website}
                            onChange={handleChange}
                            placeholder="https://www.hospital.com"
                            icon={<Globe size={18} className="text-gray-400" />}
                        />
                        <FormInput
                            label="Established Year"
                            name="establishedYear"
                            type="number"
                            value={formData.establishedYear}
                            onChange={handleChange}
                            placeholder="Eg. 1995"
                            icon={<Calendar size={18} className="text-gray-400" />}
                        />
                        <FormInput
                            label="Operating Hours"
                            name="operatingHours"
                            value={formData.operatingHours}
                            onChange={handleChange}
                            placeholder="Eg. 24/7 or 9am - 8pm"
                            icon={<Clock size={18} className="text-gray-400" />}
                        />
                        <FormInput
                            label="Hospital Rating"
                            name="rating"
                            value={formData.rating}
                            onChange={handleChange}
                            placeholder="Eg. 4.5"
                            icon={<Star size={18} className="text-yellow-500" />}
                        />
                    </div>
                </Card>

                {/* Location Info */}
                <Card title="Location & Address" padding="p-8">
                    <div className="space-y-6">
                        <FormInput
                            label="Physical Street Address"
                            name="address"
                            required
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Street, Landmark, City"
                            icon={<MapPin size={18} className="text-gray-400" />}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormInput
                                label="Pincode"
                                name="pincode"
                                required
                                value={formData.pincode}
                                onChange={handleChange}
                                placeholder="6-digit PIN"
                            />
                            <FormInput
                                label="Latitude"
                                name="location.lat"
                                value={formData.location.lat}
                                onChange={handleChange}
                                placeholder="Eg. 12.9716"
                            />
                            <FormInput
                                label="Longitude"
                                name="location.lng"
                                value={formData.location.lng}
                                onChange={handleChange}
                                placeholder="Eg. 77.5946"
                            />
                        </div>
                    </div>
                </Card>

                {/* Infrastructure Info */}
                <Card title="Infrastructure & Capacity" padding="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <FormInput
                            label="Total Bed Count"
                            name="numberOfBeds"
                            type="number"
                            value={formData.numberOfBeds}
                            onChange={handleChange}
                            placeholder="Eg. 100"
                            icon={<Bed size={18} className="text-blue-500" />}
                        />
                        <FormInput
                            label="ICU Bed Count"
                            name="ICUBeds"
                            type="number"
                            value={formData.ICUBeds}
                            onChange={handleChange}
                            placeholder="Eg. 20"
                            icon={<Bed size={18} className="text-red-500" />}
                        />
                        <FormInput
                            label="Total Doctors"
                            name="numberOfDoctors"
                            type="number"
                            value={formData.numberOfDoctors}
                            onChange={handleChange}
                            placeholder="Eg. 15"
                            icon={<Activity size={18} className="text-green-500" />}
                        />
                        <div className="flex flex-col justify-end">
                            <label className="flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 group" style={{ borderColor: 'var(--border-color)' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.ambulanceAvailability}
                                    onChange={(e) => setFormData(prev => ({ ...prev, ambulanceAvailability: e.target.checked }))}
                                    className="w-5 h-5 accent-blue-600 rounded"
                                />
                                <span className="text-sm font-medium">Ambulance Available</span>
                            </label>
                        </div>
                    </div>
                </Card>

                {/* Specialties & Services */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card title="Medical Specialties" padding="p-6">
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <FormInput
                                    label="Specialty Name"
                                    value={tempSpecialty}
                                    onChange={(e) => setTempSpecialty(e.target.value)}
                                    placeholder="Add eg. Cardiology"
                                    className="flex-1"
                                />
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={() => addItem('specialities', tempSpecialty, setTempSpecialty)}
                                        className="bg-blue-600 text-white h-[46px] px-4 rounded-xl hover:bg-blue-700 shadow-md active:scale-95"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {formData.specialities.length > 0 ? formData.specialities.map((item, idx) => (
                                    <div key={idx} className="bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border border-blue-500/20">
                                        {item}
                                        <button type="button" onClick={() => removeItem('specialities', idx)} className="hover:text-red-500">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )) : (
                                    <p className="text-xs text-gray-400 italic">No specialties added yet.</p>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card title="Hospital Services" padding="p-6">
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <FormInput
                                    label="Service Name"
                                    value={tempService}
                                    onChange={(e) => setTempService(e.target.value)}
                                    placeholder="Add eg. 24/7 Pharmacy"
                                    className="flex-1"
                                />
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={() => addItem('services', tempService, setTempService)}
                                        className="bg-green-600 text-white h-[46px] px-4 rounded-xl hover:bg-green-700 shadow-md active:scale-95"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {formData.services.length > 0 ? formData.services.map((item, idx) => (
                                    <div key={idx} className="bg-green-500/10 text-green-500 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border border-green-500/20">
                                        {item}
                                        <button type="button" onClick={() => removeItem('services', idx)} className="hover:text-red-500">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )) : (
                                    <p className="text-xs text-gray-400 italic">No services added yet.</p>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="flex justify-end pt-4 pb-12">
                    <Button
                        type="submit"
                        loading={loading}
                        icon={<Building2 size={20} />}
                        className="w-full md:w-auto px-16 py-4 text-lg"
                    >
                        Finalize & Create Hospital
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default React.memo(CreateHospital);
