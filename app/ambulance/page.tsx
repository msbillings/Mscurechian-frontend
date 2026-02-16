"use client";
import React, { useState, useEffect } from 'react';
import { emergencyService } from "@/lib/integrations/services/emergency.service";
import {
    EmergencyRequest,
    CreateEmergencyRequestData,
    Hospital
} from "@/lib/integrations/types/emergency";

function AmbulanceDashboard() {
    const [activeTab, setActiveTab] = useState<"new" | "history">("new");
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [myRequests, setMyRequests] = useState<EmergencyRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [fieldErrors, setFieldErrors] = useState({
        patientName: "",
        patientAge: "",
        patientMobile: "",
        emergencyType: "",
        description: "",
        currentLocation: "",
        eta: "",
        heartRate: "",
        temperature: "",
        oxygenLevel: "",
        bloodPressure: ""
    });

    // Form state
    const [formData, setFormData] = useState<CreateEmergencyRequestData>({
        patientName: "",
        patientAge: 0,
        patientGender: "male",
        patientMobile: "",
        emergencyType: "",
        description: "",
        severity: "high",
        currentLocation: "",
        eta: undefined,
        vitals: {
            bloodPressure: "",
            heartRate: undefined,
            temperature: undefined,
            oxygenLevel: undefined,
        },
        targetHospitals: [], // Empty = send to all
    });

    // Load hospitals and requests on mount
    useEffect(() => {
        const checkAuth = async () => {
            // Wait a tiny bit for sessionStorage to be ready
            await new Promise(resolve => setTimeout(resolve, 100));

            const token = sessionStorage.getItem("accessToken");
            if (!token) {
                console.error("❌ No token found! Redirecting to login...");
                window.location.href = "/emergency-login";
                return;
            }

            console.log("✅ Token found, loading dashboard data...");
            loadData();
        };

        checkAuth();
    }, []);

    const loadData = async () => {
        const token = sessionStorage.getItem("accessToken");
        if (!token) return;

        setLoading(true);
        try {
            const [hospitalsData, requestsData] = await Promise.all([
                emergencyService.getAvailableHospitals(),
                emergencyService.getMyRequests(),
            ]);
            setHospitals(hospitalsData.hospitals);
            setMyRequests(requestsData.requests);
        } catch (error: any) {
            console.error("❌ Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Validation functions
    const validateMobile = () => {
        if (!formData.patientMobile) {
            setFieldErrors(prev => ({ ...prev, patientMobile: "This field is required" }));
        } else if (formData.patientMobile.length !== 10) {
            setFieldErrors(prev => ({ ...prev, patientMobile: "Enter a valid 10-digit mobile number." }));
        } else {
            setFieldErrors(prev => ({ ...prev, patientMobile: "" }));
        }
    };

    const validateAge = () => {
        if (!formData.patientAge && formData.patientAge !== 0) {
            setFieldErrors(prev => ({ ...prev, patientAge: "This field is required" }));
        } else if (formData.patientAge < 0 || formData.patientAge > 120) {
            setFieldErrors(prev => ({ ...prev, patientAge: "Age must be between 0 and 120 years." }));
        } else {
            setFieldErrors(prev => ({ ...prev, patientAge: "" }));
        }
    };

    const validateHeartRate = () => {
        const hr = formData.vitals?.heartRate;
        if (hr !== undefined && hr !== null) {
            if (hr < 30 || hr > 220) {
                setFieldErrors(prev => ({ ...prev, heartRate: "Heart rate must be between 30 and 220 bpm." }));
            } else {
                setFieldErrors(prev => ({ ...prev, heartRate: "" }));
            }
        } else {
            setFieldErrors(prev => ({ ...prev, heartRate: "" }));
        }
    };

    const validateTemperature = () => {
        const temp = formData.vitals?.temperature;
        if (temp !== undefined && temp !== null) {
            if (temp < 95 || temp > 108) {
                setFieldErrors(prev => ({ ...prev, temperature: "Temperature must be between 95°F and 108°F." }));
            } else {
                setFieldErrors(prev => ({ ...prev, temperature: "" }));
            }
        } else {
            setFieldErrors(prev => ({ ...prev, temperature: "" }));
        }
    };

    const validateOxygenLevel = () => {
        const oxygen = formData.vitals?.oxygenLevel;
        if (oxygen !== undefined && oxygen !== null) {
            if (oxygen < 50 || oxygen > 100) {
                setFieldErrors(prev => ({ ...prev, oxygenLevel: "Oxygen level must be between 50% and 100%." }));
            } else {
                setFieldErrors(prev => ({ ...prev, oxygenLevel: "" }));
            }
        } else {
            setFieldErrors(prev => ({ ...prev, oxygenLevel: "" }));
        }
    };

    const validateRequiredField = (fieldName: keyof typeof fieldErrors, value: string | undefined) => {
        if (!value || value.trim() === "") {
            setFieldErrors(prev => ({ ...prev, [fieldName]: "This field is required" }));
        } else {
            setFieldErrors(prev => ({ ...prev, [fieldName]: "" }));
        }
    };

    const handleBloodPressureChange = (value: string) => {
        // Only allow numbers and slash (e.g., 120/80)
        const filtered = value.replace(/[^0-9\/]/g, '');

        // Check if any number exceeds 180
        const parts = filtered.split('/');
        let hasLimitError = false;
        const validParts = parts.map(part => {
            if (part === '') return part;
            const num = parseInt(part);
            if (!isNaN(num) && num > 180) {
                hasLimitError = true;
                return part.slice(0, -1); // Remove last digit
            }
            return part;
        });

        const finalValue = validParts.join('/');
        setFormData({
            ...formData,
            vitals: { ...formData.vitals, bloodPressure: finalValue },
        });

        // Show error if blood pressure is invalid format or exceeds limit
        if (hasLimitError || (finalValue && !/^\d{1,3}\/\d{1,3}$/.test(finalValue) && finalValue !== '')) {
            setFieldErrors(prev => ({ ...prev, bloodPressure: "Blood pressure must be in format XXX/XXX (max 180/180)" }));
        } else {
            setFieldErrors(prev => ({ ...prev, bloodPressure: "" }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // Comprehensive validation before submission
        let hasErrors = false;
        const errors = { ...fieldErrors };

        // Patient Name validation
        if (!formData.patientName.trim()) {
            errors.patientName = "This field is required";
            hasErrors = true;
        }

        // Patient Age validation
        if (formData.patientAge === undefined || formData.patientAge === null) {
            errors.patientAge = "This field is required";
            hasErrors = true;
        } else if (formData.patientAge < 0 || formData.patientAge > 120) {
            errors.patientAge = "Age must be between 0 and 120 years.";
            hasErrors = true;
        }

        // Patient Mobile validation
        if (!formData.patientMobile) {
            errors.patientMobile = "This field is required";
            hasErrors = true;
        } else if (formData.patientMobile.length !== 10) {
            errors.patientMobile = "Enter a valid 10-digit mobile number.";
            hasErrors = true;
        }

        // Emergency Type validation
        if (!formData.emergencyType.trim()) {
            errors.emergencyType = "This field is required";
            hasErrors = true;
        }

        // Description validation
        if (!formData.description.trim()) {
            errors.description = "This field is required";
            hasErrors = true;
        }

        // Current Location validation
        if (!formData.currentLocation.trim()) {
            errors.currentLocation = "This field is required";
            hasErrors = true;
        }

        // ETA validation
        if (!formData.eta || formData.eta <= 0) {
            errors.eta = "This field is required";
            hasErrors = true;
        }

        // Vitals validation (optional but must be in range if provided)
        if (formData.vitals?.heartRate !== undefined && formData.vitals?.heartRate !== null) {
            if (formData.vitals.heartRate < 30 || formData.vitals.heartRate > 220) {
                errors.heartRate = "Heart rate must be between 30 and 220 bpm.";
                hasErrors = true;
            }
        }

        if (formData.vitals?.temperature !== undefined && formData.vitals?.temperature !== null) {
            if (formData.vitals.temperature < 95 || formData.vitals.temperature > 108) {
                errors.temperature = "Temperature must be between 95°F and 108°F.";
                hasErrors = true;
            }
        }

        if (formData.vitals?.oxygenLevel !== undefined && formData.vitals?.oxygenLevel !== null) {
            if (formData.vitals.oxygenLevel < 50 || formData.vitals.oxygenLevel > 100) {
                errors.oxygenLevel = "Oxygen level must be between 50% and 100%.";
                hasErrors = true;
            }
        }

        // If there are any errors, set them and prevent submission
        if (hasErrors) {
            setFieldErrors(errors);
            setMessage({
                type: "error",
                text: "Please fix all validation errors before submitting."
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setSubmitting(true);
        try {
            await emergencyService.createEmergencyRequest(formData);
            setMessage({
                type: "success",
                text: (formData.targetHospitals?.length || 0) > 0
                    ? `Emergency request sent to ${formData.targetHospitals?.length} selected hospital(s)!`
                    : "Emergency request sent successfully to all available hospitals!",
            });

            // Reset form and errors
            setFormData({
                patientName: "",
                patientAge: 0,
                patientGender: "male",
                patientMobile: "",
                emergencyType: "",
                description: "",
                severity: "high",
                currentLocation: "",
                eta: undefined,
                vitals: {
                    bloodPressure: "",
                    heartRate: undefined,
                    temperature: undefined,
                    oxygenLevel: undefined,
                },
                targetHospitals: [],
            });
            setFieldErrors({
                patientName: "",
                patientAge: "",
                patientMobile: "",
                emergencyType: "",
                description: "",
                currentLocation: "",
                eta: "",
                heartRate: "",
                temperature: "",
                oxygenLevel: "",
                bloodPressure: ""
            });

            // Reload requests
            loadData();
            setActiveTab("history");
        } catch (error: any) {
            setMessage({
                type: "error",
                text: error.message || "Failed to send emergency request",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "critical": return "bg-red-100 text-red-800 border-red-200";
            case "high": return "bg-orange-100 text-orange-800 border-orange-200";
            case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "low": return "bg-green-100 text-green-800 border-green-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "accepted": return "bg-green-100 text-green-800";
            case "rejected": return "bg-red-100 text-red-800";
            case "pending": return "bg-yellow-100 text-yellow-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Available Hospitals</p>
                            <p className="text-3xl font-bold text-gray-900">{hospitals.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Pending Requests</p>
                            <p className="text-3xl font-bold text-orange-600">
                                {myRequests.filter(r => r.status === "pending").length}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Total Requests</p>
                            <p className="text-3xl font-bold text-gray-900">{myRequests.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="border-b border-gray-200">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab("new")}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "new"
                                ? "border-red-600 text-red-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            New Emergency Request
                        </button>
                        <button
                            onClick={() => setActiveTab("history")}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "history"
                                ? "border-red-600 text-red-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            Request History
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === "new" ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {message && (
                                <div
                                    className={`px-4 py-3 rounded-lg text-sm ${message.type === "success"
                                        ? "bg-green-50 text-green-800 border border-green-200"
                                        : "bg-red-50 text-red-800 border border-red-200"
                                        }`}
                                >
                                    {message.text}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Patient Details */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Patient Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.patientName}
                                        onChange={(e) => {
                                            const filtered = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                            setFormData({ ...formData, patientName: filtered });
                                            if (fieldErrors.patientName) {
                                                setFieldErrors(prev => ({ ...prev, patientName: "" }));
                                            }
                                        }}
                                        onBlur={() => validateRequiredField('patientName', formData.patientName)}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all ${fieldErrors.patientName ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                            }`}
                                        placeholder="Enter patient name (letters only)"
                                        required
                                    />
                                    {fieldErrors.patientName && (
                                        <p className="text-red-600 text-xs mt-1 font-medium">{fieldErrors.patientName}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Patient Age *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.patientAge || ""}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value && !/^\d*$/.test(value)) return;
                                            setFormData({ ...formData, patientAge: value ? parseInt(value) : 0 });
                                            if (fieldErrors.patientAge) {
                                                setFieldErrors(prev => ({ ...prev, patientAge: "" }));
                                            }
                                        }}
                                        onBlur={validateAge}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all ${fieldErrors.patientAge ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                            }`}
                                        placeholder="0-120"
                                        required
                                        maxLength={3}
                                    />
                                    {fieldErrors.patientAge && (
                                        <p className="text-red-600 text-xs mt-1 font-medium">{fieldErrors.patientAge}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Gender *
                                    </label>
                                    <select
                                        value={formData.patientGender}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                patientGender: e.target.value as "male" | "female" | "other",
                                            })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                        required
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Patient Mobile *
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.patientMobile || ""}
                                        onChange={(e) => {
                                            const filtered = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            setFormData({ ...formData, patientMobile: filtered });
                                            if (fieldErrors.patientMobile) {
                                                setFieldErrors(prev => ({ ...prev, patientMobile: "" }));
                                            }
                                        }}
                                        onBlur={validateMobile}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all ${fieldErrors.patientMobile ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                            }`}
                                        placeholder="10-digit mobile number"
                                        maxLength={10}
                                        required
                                    />
                                    {fieldErrors.patientMobile && (
                                        <p className="text-red-600 text-xs mt-1 font-medium">{fieldErrors.patientMobile}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Emergency Type *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.emergencyType}
                                        onChange={(e) => {
                                            const filtered = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                            setFormData({ ...formData, emergencyType: filtered });
                                            if (fieldErrors.emergencyType) {
                                                setFieldErrors(prev => ({ ...prev, emergencyType: "" }));
                                            }
                                        }}
                                        onBlur={() => validateRequiredField('emergencyType', formData.emergencyType)}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all ${fieldErrors.emergencyType ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                            }`}
                                        placeholder="e.g., Heart Attack, Accident"
                                        required
                                    />
                                    {fieldErrors.emergencyType && (
                                        <p className="text-red-600 text-xs mt-1 font-medium">{fieldErrors.emergencyType}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Severity *
                                    </label>
                                    <select
                                        value={formData.severity}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                severity: e.target.value as "critical" | "high" | "medium" | "low",
                                            })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                        required
                                    >
                                        <option value="critical">Critical</option>
                                        <option value="high">High</option>
                                        <option value="medium">Medium</option>
                                        <option value="low">Low</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description *
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => {
                                            setFormData({ ...formData, description: e.target.value });
                                            if (fieldErrors.description) {
                                                setFieldErrors(prev => ({ ...prev, description: "" }));
                                            }
                                        }}
                                        onBlur={() => validateRequiredField('description', formData.description)}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all ${fieldErrors.description ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                            }`}
                                        rows={3}
                                        required
                                    />
                                    {fieldErrors.description && (
                                        <p className="text-red-600 text-xs mt-1 font-medium">{fieldErrors.description}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Current Location *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.currentLocation}
                                        onChange={(e) => {
                                            setFormData({ ...formData, currentLocation: e.target.value });
                                            if (fieldErrors.currentLocation) {
                                                setFieldErrors(prev => ({ ...prev, currentLocation: "" }));
                                            }
                                        }}
                                        onBlur={() => validateRequiredField('currentLocation', formData.currentLocation)}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all ${fieldErrors.currentLocation ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                            }`}
                                        required
                                    />
                                    {fieldErrors.currentLocation && (
                                        <p className="text-red-600 text-xs mt-1 font-medium">{fieldErrors.currentLocation}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        ETA (minutes) *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.eta || ""}
                                        onChange={(e) => {
                                            setFormData({
                                                ...formData,
                                                eta: e.target.value ? parseInt(e.target.value) : undefined,
                                            });
                                            if (fieldErrors.eta) {
                                                setFieldErrors(prev => ({ ...prev, eta: "" }));
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
                                        }}
                                        onBlur={() => validateRequiredField('eta', formData.eta?.toString())}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all ${fieldErrors.eta ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                            }`}
                                        min="0"
                                        required
                                    />
                                    {fieldErrors.eta && (
                                        <p className="text-red-600 text-xs mt-1 font-medium">{fieldErrors.eta}</p>
                                    )}
                                </div>
                            </div>

                            {/* Vitals */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-4">
                                    Vitals (Optional)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-2">
                                            Blood Pressure
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.vitals?.bloodPressure || ""}
                                            onChange={(e) => handleBloodPressureChange(e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all ${fieldErrors.bloodPressure ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                                }`}
                                            placeholder="120/80 (max 180/180)"
                                        />
                                        {fieldErrors.bloodPressure && (
                                            <p className="text-red-600 text-[10px] mt-1 font-medium">{fieldErrors.bloodPressure}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-2">
                                            Heart Rate (bpm)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.vitals?.heartRate || ""}
                                            onChange={(e) => {
                                                setFormData({
                                                    ...formData,
                                                    vitals: {
                                                        ...formData.vitals,
                                                        heartRate: e.target.value ? parseInt(e.target.value) : undefined,
                                                    },
                                                });
                                                if (fieldErrors.heartRate) {
                                                    setFieldErrors(prev => ({ ...prev, heartRate: "" }));
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
                                            }}
                                            onBlur={validateHeartRate}
                                            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all ${fieldErrors.heartRate ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                                }`}
                                            placeholder="60-100 (max 220)"
                                        />
                                        {fieldErrors.heartRate && (
                                            <p className="text-red-600 text-[10px] mt-1 font-medium">{fieldErrors.heartRate}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-2">
                                            Temperature (°F)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.vitals?.temperature || ""}
                                            onChange={(e) => {
                                                setFormData({
                                                    ...formData,
                                                    vitals: {
                                                        ...formData.vitals,
                                                        temperature: e.target.value ? parseFloat(e.target.value) : undefined,
                                                    },
                                                });
                                                if (fieldErrors.temperature) {
                                                    setFieldErrors(prev => ({ ...prev, temperature: "" }));
                                                }
                                            }}
                                            onBlur={validateTemperature}
                                            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all ${fieldErrors.temperature ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                                }`}
                                            placeholder="98.6 (95-108)"
                                        />
                                        {fieldErrors.temperature && (
                                            <p className="text-red-600 text-[10px] mt-1 font-medium">{fieldErrors.temperature}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-2">
                                            Oxygen Level (%)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.vitals?.oxygenLevel || ""}
                                            onChange={(e) => {
                                                setFormData({
                                                    ...formData,
                                                    vitals: {
                                                        ...formData.vitals,
                                                        oxygenLevel: e.target.value ? parseInt(e.target.value) : undefined,
                                                    },
                                                });
                                                if (fieldErrors.oxygenLevel) {
                                                    setFieldErrors(prev => ({ ...prev, oxygenLevel: "" }));
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
                                            }}
                                            onBlur={validateOxygenLevel}
                                            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all ${fieldErrors.oxygenLevel ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                                }`}
                                            placeholder="95-100 (min 50)"
                                            min="0"
                                            max="100"
                                        />
                                        {fieldErrors.oxygenLevel && (
                                            <p className="text-red-600 text-[10px] mt-1 font-medium">{fieldErrors.oxygenLevel}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Hospital Selection */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Send to Hospitals (Select specific or leave empty for ALL)
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {hospitals.map((hospital) => (
                                        <label
                                            key={hospital._id}
                                            className={`flex items-start p-3 border rounded-xl cursor-pointer ${formData.targetHospitals?.includes(hospital._id)
                                                ? "border-red-500 bg-red-50 ring-1 ring-red-500"
                                                : "border-gray-200 hover:border-gray-300 bg-white"
                                                }`}
                                        >
                                            <div className="flex items-center h-5">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.targetHospitals?.includes(hospital._id)}
                                                    onChange={() => {
                                                        const current = [...(formData.targetHospitals || [])];
                                                        if (current.includes(hospital._id)) {
                                                            setFormData({
                                                                ...formData,
                                                                targetHospitals: current.filter((id) => id !== hospital._id),
                                                            });
                                                        } else {
                                                            setFormData({
                                                                ...formData,
                                                                targetHospitals: [...current, hospital._id],
                                                            });
                                                        }
                                                    }}
                                                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                                />
                                            </div>
                                            <div className="ml-3 text-sm">
                                                <span className="font-medium text-gray-900">{hospital.name}</span>
                                                <p className="text-gray-500 text-xs truncate">{hospital.address}</p>
                                            </div>
                                        </label>
                                    ))}
                                    {hospitals.length === 0 && (
                                        <div className="col-span-full p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center">
                                            <p className="text-sm text-gray-500 italic">No hospitals available. Request will be broadcasted.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-lg hover:from-red-700 hover:to-orange-700 transition-all disabled:opacity-50 shadow-lg"
                                >
                                    {submitting ? "Sending..." : "Send Emergency Request"}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                                    <p className="mt-4 text-gray-600">Loading requests...</p>
                                </div>
                            ) : myRequests.length === 0 ? (
                                <div className="text-center py-12">
                                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-gray-600">No emergency requests yet</p>
                                </div>
                            ) : (
                                myRequests.map((request) => (
                                    <div key={request._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{request.patientName}</h3>
                                                <p className="text-sm text-gray-600">{request.patientAge} years, {request.patientGender}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(request.severity)}`}>
                                                    {request.severity.toUpperCase()}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                                    {request.status.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                                            <div>
                                                <span className="text-gray-600">Emergency:</span> <span className="font-medium">{request.emergencyType}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Location:</span> <span className="font-medium">{request.currentLocation}</span>
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-700 mb-3">{request.description}</p>

                                        {/* Hospital Responses */}
                                        <div className="border-t border-gray-200 pt-3">
                                            <p className="text-xs font-medium text-gray-600 mb-2">Hospital Responses:</p>
                                            <div className="space-y-2">
                                                {request.requestedHospitals.map((rh, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-sm">
                                                        <span className="text-gray-700">{rh.hospital?.name || "Unknown Hospital"}</span>
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(rh.status)}`}>
                                                            {rh.status}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {request.acceptedByHospital && (
                                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <p className="text-sm font-medium text-green-800">✓ Accepted by {request.acceptedByHospital?.name || "Hospital"}</p>
                                                {request.notes && <p className="text-xs text-green-700 mt-1">Notes: {request.notes}</p>}
                                            </div>
                                        )}

                                        <p className="text-xs text-gray-500 mt-3">Submitted: {new Date(request.createdAt).toLocaleString()}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default React.memo(AmbulanceDashboard);
