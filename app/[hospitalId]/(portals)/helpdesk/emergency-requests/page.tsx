"use client";

import React, { useState, useEffect } from "react";
import {
    Loader2,
    ArrowLeft,
    RefreshCw,
    Clock,
    Activity,
    Navigation,
    Siren
} from "lucide-react";
import Link from "next/link";
import { helpdeskEmergencyService } from "@/lib/integrations/services/helpdesk-emergency.service";
import { EmergencyRequest } from "@/lib/integrations/types/emergency";

function EmergencyRequestsPage() {
    const [requests, setRequests] = useState<EmergencyRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null);
    const [notes, setNotes] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");

    useEffect(() => {
        loadRequests();
        // Poll every 30 seconds for new requests
        const interval = setInterval(loadRequests, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadRequests = async () => {
        try {
            const response = await helpdeskEmergencyService.getHospitalEmergencyRequests();
            setRequests(response.requests);
        } catch (error) {
            console.error("Error loading emergency requests:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!selectedRequest) return;

        setProcessingId(selectedRequest._id);
        try {
            await helpdeskEmergencyService.acceptRequest(selectedRequest._id, notes);
            await loadRequests();
            setShowAcceptModal(false);
            setNotes("");
            setSelectedRequest(null);
        } catch (error: any) {
            alert(error.message || "Failed to accept request");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async () => {
        if (!selectedRequest) return;

        setProcessingId(selectedRequest._id);
        try {
            await helpdeskEmergencyService.rejectRequest(
                selectedRequest._id,
                rejectionReason
            );
            await loadRequests();
            setShowRejectModal(false);
            setRejectionReason("");
            setSelectedRequest(null);
        } catch (error: any) {
            alert(error.message || "Failed to reject request");
        } finally {
            setProcessingId(null);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "critical":
                return "bg-red-100 text-red-800 border-red-300";
            case "high":
                return "bg-orange-100 text-orange-800 border-orange-300";
            case "medium":
                return "bg-yellow-100 text-yellow-800 border-yellow-300";
            case "low":
                return "bg-green-100 text-green-800 border-green-300";
            default:
                return "bg-gray-100 text-gray-800 border-gray-300";
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "accepted":
                return "bg-green-100 text-green-800";
            case "rejected":
                return "bg-red-100 text-red-800";
            case "pending":
                return "bg-yellow-100 text-yellow-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const pendingRequests = requests.filter((r: EmergencyRequest) => r.status === "pending");
    const respondedRequests = requests.filter((r: EmergencyRequest) => r.status !== "pending");

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Critical Signal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">

            {/* PROFESSIONAL HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 max-w-full mx-auto">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/helpdesk" className="p-1.5 bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600">
                            <ArrowLeft size={16} />
                        </Link>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol Delta / Emergency Flux</span>
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        Clinical Response Queue
                    </h1>
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">Hospital Node / Critical Admission Control</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadRequests}
                        className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-teal-600 hover:border-teal-100 shadow-sm"
                        aria-label="Refresh Grid"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricTile label="Pending Admission" value={pendingRequests.length} color="amber" icon={<Clock size={20} />} />
                <MetricTile label="Active Responses" value={requests.filter((r: EmergencyRequest) => r.status === "accepted").length} color="teal" icon={<Activity size={20} />} />
                <MetricTile label="Mission Lifetime" value={requests.length} color="slate" icon={<Navigation size={20} />} />
            </div>

            {/* LIVE ALERT FEED */}
            {pendingRequests.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
                        <h2 className="text-xs font-bold text-rose-700 uppercase tracking-widest flex items-center gap-2">
                            <Siren size={16} className="" /> Active Emergency Alerts ({pendingRequests.length})
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {pendingRequests.map((request: EmergencyRequest) => (
                            <div key={request._id} className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-2xl uppercase shadow-inner">
                                            {request.patientName?.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                                                {request.patientName}
                                            </h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                {request.patientAge}Y • {request.patientGender}
                                                {request.patientMobile && ` • TEL: ${request.patientMobile}`}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`px-3 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-widest ${getSeverityColor(
                                            request.severity
                                        )}`}
                                    >
                                        {request.severity}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                                    <StatusItem label="Index Case" value={request.emergencyType} color="rose" />
                                    <StatusItem label="Location" value={request.currentLocation} color="slate" />
                                    <StatusItem label="Arrival ETA" value={request.eta ? `${request.eta} MINS` : 'URGENT'} color="amber" />
                                    <StatusItem label="Field Asset" value={request.ambulancePersonnel?.vehicleNumber} color="teal" />
                                </div>

                                <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Field Observation</p>
                                    <p className="text-sm text-slate-700 italic font-medium">"{request.description}"</p>
                                </div>

                                {request.vitals && (
                                    <div className="mb-6 p-4 bg-teal-50 border border-teal-100 rounded-xl grid grid-cols-4 gap-4">
                                        <VitalMini label="BP" value={request.vitals.bloodPressure} />
                                        <VitalMini label="HR" value={request.vitals.heartRate ? `${request.vitals.heartRate} BPM` : null} />
                                        <VitalMini label="TEMP" value={request.vitals.temperature ? `${request.vitals.temperature}°F` : null} />
                                        <VitalMini label="SPO2" value={request.vitals.oxygenLevel ? `${request.vitals.oxygenLevel}%` : null} />
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                        Relayed: {new Date(request.createdAt).toLocaleTimeString()}
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setSelectedRequest(request);
                                                setShowRejectModal(true);
                                            }}
                                            disabled={processingId === request._id}
                                            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-rose-200 hover:text-rose-600 active:scale-95"
                                        >
                                            Defer
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedRequest(request);
                                                setShowAcceptModal(true);
                                            }}
                                            disabled={processingId === request._id}
                                            className="px-8 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-700 active:scale-95 shadow-lg shadow-rose-900/20"
                                        >
                                            Commit Admission
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* RESPONDED LOG */}
            {respondedRequests.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Response History ({respondedRequests.length})</h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {respondedRequests.map((request: EmergencyRequest) => (
                            <div key={request._id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-900 uppercase">
                                        {request.patientName}
                                    </h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                        {request.emergencyType} • {request.currentLocation}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(request.createdAt).toLocaleDateString()}</p>
                                    <span
                                        className={`px-3 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest border ${getStatusColor(
                                            request.status
                                        )}`}
                                    >
                                        {request.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {requests.length === 0 && (
                <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-20 text-center">
                    <Activity size={32} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sector Clear. No Active Critical Signals.</p>
                </div>
            )}

            {/* MODALS */}
            {showAcceptModal && selectedRequest && (
                <Modal
                    title="Commit Emergency Admission"
                    onClose={() => setShowAcceptModal(false)}
                    onConfirm={handleAccept}
                    confirmLabel={processingId ? "Relaying..." : "Confirm Deployment"}
                    confirmColor="rose"
                >
                    <div className="space-y-4">
                        <p className="text-xs font-medium text-slate-500 leading-relaxed uppercase">
                            Verify arrival protocols and preparation status. Mission assets will be notified of clearance.
                        </p>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-rose-500"
                            rows={3}
                            placeholder="PRE-ADMISSION NOTES..."
                        />
                    </div>
                </Modal>
            )}

            {showRejectModal && selectedRequest && (
                <Modal
                    title="Deflect Critical Signal"
                    onClose={() => setShowRejectModal(false)}
                    onConfirm={handleReject}
                    confirmLabel={processingId ? "Deflecting..." : "Confirm Deferral"}
                    confirmColor="slate"
                    disabled={!rejectionReason.trim()}
                >
                    <div className="space-y-4">
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-rose-500"
                            rows={3}
                            placeholder="MANDATORY DEFERRAL REASON..."
                            required
                        />
                    </div>
                </Modal>
            )}
        </div>
    );
}

// COMPONENTS
function MetricTile({ label, value, color, icon }: any) {
    const colors: any = {
        rose: 'bg-rose-50 text-rose-600',
        amber: 'bg-amber-50 text-amber-600',
        teal: 'bg-teal-50 text-teal-600',
        slate: 'bg-slate-50 text-slate-600'
    };
    return (
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
            </div>
        </div>
    );
}

function StatusItem({ label, value, color }: any) {
    const textColors: any = {
        rose: 'text-rose-600',
        teal: 'text-teal-600',
        amber: 'text-amber-600',
        slate: 'text-slate-600'
    };
    return (
        <div>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-sm font-bold uppercase truncate ${textColors[color]}`}>{value || 'N/A'}</p>
        </div>
    );
}

function VitalMini({ label, value }: any) {
    if (!value) return null;
    return (
        <div>
            <p className="text-[8px] font-bold text-teal-400 uppercase tracking-widest">{label}</p>
            <p className="text-sm font-bold text-teal-900">{value}</p>
        </div>
    );
}

function Modal({ title, children, onClose, onConfirm, confirmLabel, confirmColor, disabled }: any) {
    const colors: any = {
        rose: 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20',
        teal: 'bg-teal-600 hover:bg-teal-700 shadow-teal-900/20',
        slate: 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'
    };
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                <h3 className="text-xl font-bold text-slate-900 mb-6 uppercase tracking-tight italic">{title}</h3>
                <div className="mb-8">{children}</div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 px-6 py-3 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200">Abort</button>
                    <button
                        onClick={onConfirm}
                        disabled={disabled}
                        className={`flex-2 px-6 py-3 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50 ${colors[confirmColor]}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default React.memo(EmergencyRequestsPage);
