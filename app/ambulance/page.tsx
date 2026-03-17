"use client";
import React, { useState, useEffect } from 'react';
import { emergencyService } from "@/lib/integrations/services/emergency.service";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import {
    EmergencyRequest,
    CreateEmergencyRequestData,
    Hospital
} from "@/lib/integrations/types/emergency";
import { ShieldCheck, Clock, MapPin, Activity, Building2, AlertCircle, Search, Info } from 'lucide-react';
import { format } from 'date-fns';

function AmbulanceDashboard() {
    const router = useRouter();
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
    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

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

    const { isAuthenticated, isInitialized } = useAuthStore();

    useEffect(() => {
        if (isInitialized && !isAuthenticated) {
            console.error("❌ Auth Failed: Redirecting to login corridor...");
            if (pollingInterval) clearInterval(pollingInterval);
            window.location.href = "/emergency-login";
        } else if (isInitialized && isAuthenticated) {
            loadData();
        }
    }, [isAuthenticated, isInitialized, router]);

    const loadData = async () => {
        const token = sessionStorage.getItem("accessToken");
        const role = sessionStorage.getItem("userRole");
        if (!token || role !== "ambulance") return;

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

    const startPolling = () => {
        if (pollingInterval) clearInterval(pollingInterval);
        const interval = setInterval(async () => {
            // Check if we still have a valid session before polling
            const currentToken = sessionStorage.getItem("accessToken");
            const currentRole = sessionStorage.getItem("userRole");
            
            if (!currentToken || currentRole !== "ambulance") {
                console.log("🛑 stopping poll - invalid session");
                if (interval) clearInterval(interval);
                return;
            }

            try {
                const requestsData = await emergencyService.getMyRequests();
                setMyRequests(requestsData.requests);
            } catch (error) {
                console.error("Polling error:", error);
            }
        }, 5000); // Poll every 5 seconds
        setPollingInterval(interval);
    };

    const stopPolling = () => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
        }
    };

    useEffect(() => {
        let isMounted = true;
        startPolling();

        const initSocket = async () => {
            try {
                const { getSocket, subscribeToSocket } = await import('@/lib/integrations/api/socket');
                const userData = sessionStorage.getItem('user');
                if (!userData) return;

                const user = JSON.parse(userData);
                const currentUserId = user.id || user._id;

                if (currentUserId) {
                    subscribeToSocket(`user_${currentUserId}`, 'emergency:update', (updatedReq: any) => {
                        console.log('📡 [SOCKET] Emergency Mission Flux Update:', updatedReq);
                        if (isMounted) {
                            // Instantly refresh the data list without waiting for the 5s poll
                            loadData();
                        }
                    });
                }
            } catch (err) {
                console.error("Socket error in Ambulance Dashboard:", err);
            }
        };

        initSocket();

        return () => {
            isMounted = false;
            stopPolling();
        };
    }, []);

    // Validation functions
    const validateMobile = () => {
        if (!formData.patientMobile) {
            setFieldErrors(prev => ({ ...prev, patientMobile: "Required" }));
        } else if (formData.patientMobile.length !== 10) {
            setFieldErrors(prev => ({ ...prev, patientMobile: "Invalid" }));
        } else {
            setFieldErrors(prev => ({ ...prev, patientMobile: "" }));
        }
    };

    const validateAge = () => {
        if (!formData.patientAge && formData.patientAge !== 0) {
            setFieldErrors(prev => ({ ...prev, patientAge: "Required" }));
        } else if (formData.patientAge < 0 || formData.patientAge > 120) {
            setFieldErrors(prev => ({ ...prev, patientAge: "Invalid" }));
        } else {
            setFieldErrors(prev => ({ ...prev, patientAge: "" }));
        }
    };

    const validateHeartRate = () => {
        const hr = formData.vitals?.heartRate;
        if (hr !== undefined && hr !== null) {
            if (hr < 30 || hr > 220) {
                setFieldErrors(prev => ({ ...prev, heartRate: "Invalid" }));
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
                setFieldErrors(prev => ({ ...prev, temperature: "Invalid" }));
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
                setFieldErrors(prev => ({ ...prev, oxygenLevel: "Invalid" }));
            } else {
                setFieldErrors(prev => ({ ...prev, oxygenLevel: "" }));
            }
        } else {
            setFieldErrors(prev => ({ ...prev, oxygenLevel: "" }));
        }
    };

    const validateRequiredField = (fieldName: keyof typeof fieldErrors, value: string | undefined) => {
        if (!value || value.trim() === "") {
            setFieldErrors(prev => ({ ...prev, [fieldName]: "Required" }));
        } else {
            setFieldErrors(prev => ({ ...prev, [fieldName]: "" }));
        }
    };

    const handleBloodPressureChange = (value: string) => {
        const filtered = value.replace(/[^0-9\/]/g, '');
        const parts = filtered.split('/');
        let hasLimitError = false;
        const validParts = parts.map(part => {
            if (part === '') return part;
            const num = parseInt(part);
            if (!isNaN(num) && num > 180) {
                hasLimitError = true;
                return part.slice(0, -1);
            }
            return part;
        });

        const finalValue = validParts.join('/');
        setFormData({
            ...formData,
            vitals: { ...formData.vitals, bloodPressure: finalValue },
        });

        if (hasLimitError || (finalValue && !/^\d{1,3}\/\d{1,3}$/.test(finalValue) && finalValue !== '')) {
            setFieldErrors(prev => ({ ...prev, bloodPressure: "Invalid" }));
        } else {
            setFieldErrors(prev => ({ ...prev, bloodPressure: "" }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        let hasErrors = false;
        const errors = { ...fieldErrors };

        if (!formData.patientName.trim()) { errors.patientName = "Required"; hasErrors = true; }
        if (formData.patientAge === undefined || formData.patientAge === null) { errors.patientAge = "Required"; hasErrors = true; }
        if (!formData.patientMobile) { errors.patientMobile = "Required"; hasErrors = true; }
        if (!formData.emergencyType.trim()) { errors.emergencyType = "Required"; hasErrors = true; }
        if (!formData.description.trim()) { errors.description = "Required"; hasErrors = true; }
        if (!formData.currentLocation.trim()) { errors.currentLocation = "Required"; hasErrors = true; }
        if (!formData.eta || formData.eta <= 0) { errors.eta = "Required"; hasErrors = true; }

        if (hasErrors) {
            setFieldErrors(errors);
            setMessage({ type: "error", text: "Please fix all validation errors." });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setSubmitting(true);
        try {
            await emergencyService.createEmergencyRequest(formData);
            setMessage({
                type: "success",
                text: "Emergency request sent successfully!",
            });

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
                patientName: "", patientAge: "", patientMobile: "", emergencyType: "",
                description: "", currentLocation: "", eta: "", heartRate: "",
                temperature: "", oxygenLevel: "", bloodPressure: ""
            });

            loadData();
            setActiveTab("history");
        } catch (error: any) {
            setMessage({ type: "error", text: error.message || "Failed to send emergency request" });
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
        <div className="space-y-2 sm:space-y-4">
            {/* Header Stats */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
                <div className="bg-white rounded-lg shadow-xs border border-gray-100 p-1.5 sm:p-4 transition-all hover:shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left gap-0.5">
                        <div className="min-w-0">
                            <p className="text-[6px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest truncate leading-none mb-0.5">Registry</p>
                            <p className="text-xs sm:text-2xl font-black text-gray-900 leading-none">{hospitals.length}</p>
                        </div>
                        <div className="hidden sm:flex w-8 h-8 bg-blue-50 rounded-lg items-center justify-center">
                            <Building2 size={16} className="text-blue-500" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-xs border border-gray-100 p-1.5 sm:p-4 transition-all hover:shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left gap-0.5">
                        <div className="min-w-0">
                            <p className="text-[6px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest truncate leading-none mb-0.5">Active</p>
                            <p className="text-xs sm:text-2xl font-black text-orange-600 leading-none">
                                {myRequests.filter(r => r.status === "pending").length}
                            </p>
                        </div>
                        <div className="hidden sm:flex w-8 h-8 bg-orange-50 rounded-lg items-center justify-center">
                            <Activity size={16} className="text-orange-500" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-xs border border-gray-100 p-1.5 sm:p-4 transition-all hover:shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left gap-0.5">
                        <div className="min-w-0">
                            <p className="text-[6px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest truncate leading-none mb-0.5">Archive</p>
                            <p className="text-xs sm:text-2xl font-black text-emerald-600 leading-none">{myRequests.length}</p>
                        </div>
                        <div className="hidden sm:flex w-8 h-8 bg-emerald-50 rounded-lg items-center justify-center">
                            <ShieldCheck size={16} className="text-emerald-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-xs">
                <div className="flex border-b border-gray-100 bg-gray-50/30">
                    <button
                        onClick={() => setActiveTab("new")}
                        className={`flex-1 px-3 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeTab === "new"
                            ? "bg-white text-red-600 border-b-2 border-red-600 shadow-sm"
                            : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        Initiate Request
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`flex-1 px-3 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeTab === "history"
                            ? "bg-white text-red-600 border-b-2 border-red-600 shadow-sm"
                            : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        <div className="flex items-center justify-center gap-1.5">
                            Mission Logs
                            <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        </div>
                    </button>
                </div>

                <div className="p-1.5 sm:p-5">
                    {activeTab === "new" ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {message && (
                                <div className={`p-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wide border ${message.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                                <div className="col-span-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Patient Name</label>
                                    <input
                                        type="text"
                                        value={formData.patientName}
                                        onChange={(e) => setFormData({ ...formData, patientName: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-red-500 outline-none"
                                        placeholder="Full Name"
                                        required
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Age</label>
                                    <input
                                        type="number"
                                        value={formData.patientAge || ""}
                                        onChange={(e) => setFormData({ ...formData, patientAge: parseInt(e.target.value) || 0 })}
                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none"
                                        placeholder="Age"
                                        required
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Gender</label>
                                    <select
                                        value={formData.patientGender}
                                        onChange={(e) => setFormData({ ...formData, patientGender: e.target.value as any })}
                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none"
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Mobile</label>
                                    <input
                                        type="tel"
                                        value={formData.patientMobile}
                                        onChange={(e) => setFormData({ ...formData, patientMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none"
                                        placeholder="10-digit #"
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Emergency Type</label>
                                    <input
                                        type="text"
                                        value={formData.emergencyType}
                                        onChange={(e) => setFormData({ ...formData, emergencyType: e.target.value })}
                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none"
                                        placeholder="Nature of Emergency"
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Location</label>
                                    <div className="relative">
                                        <MapPin size={10} className="absolute left-2 top-2.5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={formData.currentLocation}
                                            onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                                            className="w-full pl-6 pr-2 py-1.5 border border-gray-200 rounded text-xs outline-none"
                                            placeholder="Incident Location"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">ETA (m)</label>
                                    <input
                                        type="number"
                                        value={formData.eta || ""}
                                        onChange={(e) => setFormData({ ...formData, eta: parseInt(e.target.value) || undefined })}
                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none"
                                        placeholder="Min"
                                        required
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Severity</label>
                                    <select
                                        value={formData.severity}
                                        onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none font-bold text-red-600"
                                    >
                                        <option value="critical">Critical</option>
                                        <option value="high">High</option>
                                        <option value="medium">Medium</option>
                                        <option value="low">Low</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Incident Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none min-h-[60px]"
                                    placeholder="Brief summary of condition..."
                                    required
                                />
                            </div>

                            {/* Vitals */}
                            <div className="bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <Activity size={10} /> Clinical Vitals (Optional)
                                </p>
                                <div className="grid grid-cols-4 gap-2">
                                    <div>
                                        <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">BP</label>
                                        <input type="text" value={formData.vitals?.bloodPressure} onChange={(e) => handleBloodPressureChange(e.target.value)} className="w-full px-1.5 py-1 border border-gray-200 rounded text-[10px]" placeholder="120/80" />
                                    </div>
                                    <div>
                                        <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">HR</label>
                                        <input type="number" value={formData.vitals?.heartRate || ""} onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, heartRate: parseInt(e.target.value) || 0 } })} className="w-full px-1.5 py-1 border border-gray-200 rounded text-[10px]" placeholder="BPM" />
                                    </div>
                                    <div>
                                        <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Temp</label>
                                        <input type="number" step="0.1" value={formData.vitals?.temperature || ""} onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, temperature: parseFloat(e.target.value) || 0 } })} className="w-full px-1.5 py-1 border border-gray-200 rounded text-[10px]" placeholder="°F" />
                                    </div>
                                    <div>
                                        <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">O2</label>
                                        <input type="number" value={formData.vitals?.oxygenLevel || ""} onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, oxygenLevel: parseInt(e.target.value) || 0 } })} className="w-full px-1.5 py-1 border border-gray-200 rounded text-[10px]" placeholder="%" />
                                    </div>
                                </div>
                            </div>

                            {/* Hospital Registry */}
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Hospital Registry (Target Selection)</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                                    {hospitals.map((hospital) => (
                                        <label
                                            key={hospital._id}
                                            className={`flex items-start p-1.5 border rounded-lg cursor-pointer transition-all ${formData.targetHospitals?.includes(hospital._id)
                                                ? "border-red-500 bg-red-50"
                                                : "border-gray-100 hover:border-gray-200 bg-white"
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.targetHospitals?.includes(hospital._id)}
                                                onChange={() => {
                                                    const current = [...(formData.targetHospitals || [])];
                                                    setFormData({
                                                        ...formData,
                                                        targetHospitals: current.includes(hospital._id)
                                                            ? current.filter(id => id !== hospital._id)
                                                            : [...current, hospital._id]
                                                    });
                                                }}
                                                className="mt-0.5 h-3 w-3 text-red-600 rounded border-gray-300"
                                            />
                                            <div className="ml-1.5 min-w-0 flex-1">
                                                <p className="text-[8px] sm:text-[10px] font-black text-gray-900 truncate uppercase tracking-tighter" title={hospital.name}>{hospital.name}</p>
                                                <p className="text-[6px] sm:text-[9px] font-bold text-gray-400 truncate tracking-tight" title={hospital.address}>{hospital.address}</p>
                                            </div>
                                        </label>
                                    ))}
                                    {hospitals.length === 0 && (
                                        <div className="col-span-full py-3 border border-dashed border-gray-200 rounded-lg text-center">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Awaiting Registry Data...</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-2.5 bg-linear-to-r from-red-600 to-orange-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-lg shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {submitting ? "Processing..." : "Dispatch Emergency Alert"}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-2">
                            {loading ? (
                                <div className="py-10 flex flex-col items-center justify-center gap-2">
                                    <Clock className="animate-spin text-red-600" size={24} />
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-[.2em]">Synchronizing...</p>
                                </div>
                            ) : myRequests.length === 0 ? (
                                <div className="py-10 text-center">
                                    <AlertCircle className="mx-auto text-gray-200 mb-2" size={32} />
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No Active Logs Detected</p>
                                </div>
                            ) : (
                                myRequests.map((request) => (
                                    <div key={request._id} className="bg-white rounded-lg p-2.5 border border-gray-100 shadow-xs hover:border-gray-200 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="min-w-0">
                                                <h3 className="text-xs font-black text-gray-900 truncate uppercase tracking-tight">{request.patientName}</h3>
                                                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest italic">{request.patientAge}Y • {request.patientGender}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${getSeverityColor(request.severity)}`}>
                                                    {request.severity}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${getStatusColor(request.status)}`}>
                                                    {request.status}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                                            <div className="bg-gray-50 p-1.5 rounded">
                                                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Protocol</p>
                                                <p className="text-[9px] font-bold text-gray-700 truncate">{request.emergencyType}</p>
                                            </div>
                                            <div className="bg-gray-50 p-1.5 rounded">
                                                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Coordinate</p>
                                                <p className="text-[9px] font-bold text-gray-700 truncate">{request.currentLocation}</p>
                                            </div>
                                        </div>

                                        {/* Responses Table-like list */}
                                        <div className="border-t border-gray-50 pt-2 mt-2">
                                            <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Network Node Status</p>
                                            <div className="space-y-1">
                                                {request.requestedHospitals.map((rh, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-gray-50/50 px-2 py-1 rounded">
                                                        <span className="text-[9px] font-bold text-gray-600 truncate max-w-[70%]">{rh.hospital?.name || "Remote Node"}</span>
                                                        <span className={`text-[8px] font-black uppercase ${getStatusColor(rh.status)} bg-transparent`}>
                                                            {rh.status}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {request.acceptedByHospital && (
                                            <div className="mt-2 p-2 bg-emerald-50/50 border border-emerald-100 rounded flex items-center gap-2">
                                                <ShieldCheck size={12} className="text-emerald-500" />
                                                <p className="text-[9px] font-black text-emerald-800 uppercase tracking-tight">Accepted: {request.acceptedByHospital?.name}</p>
                                            </div>
                                        )}

                                        <div className="mt-2 flex items-center justify-between opacity-50">
                                            <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                <Clock size={8} /> {format(new Date(request.createdAt), 'MMM dd, HH:mm')}
                                            </p>
                                            <p className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">ID: {request._id.slice(-6)}</p>
                                        </div>
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
