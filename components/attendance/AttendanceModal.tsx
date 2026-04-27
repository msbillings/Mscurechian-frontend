'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    X, 
    MapPin, 
    Camera, 
    RefreshCw, 
    Scan, 
    LocateFixed,
    Smartphone
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

interface AttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [step, setStep] = useState<'location' | 'camera'>('location');
    const [location, setLocation] = useState<string>('');
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [capturing, setCapturing] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    
    const params = useParams();
    const hospitalId = params?.hospitalId as string;
    const { user, verifyHospitalId } = useAuthStore();
    const [retryCount, setRetryCount] = useState(0);

    // Fetch hospital address from logged-in user data
    const getHospitalAddress = async () => {
        console.log("[AttendanceModal] User Context:", { user, hospitalId });
        console.log("[AttendanceModal] Secure Context:", window.isSecureContext);
        
        // 1. Try user profile first
        if (user?.hospital && user?.address) {
            return `${user.hospital}, ${user.address}`;
        }

        // 2. Try to fetch hospital name via verify endpoint
        if (hospitalId) {
            try {
                const res = await verifyHospitalId(hospitalId);
                if (res?.valid && res.hospitalName) {
                    return res.hospitalName;
                }
            } catch (err) {
                console.error("[AttendanceModal] Error verifying hospital ID:", err);
            }
        }
        
        return '';
    };

    useEffect(() => {
        if (isOpen) {
            console.log("[AttendanceModal] Modal Opened. Initializing Step 1: Location...");
            setStep('location');
            setLocation('');
            setIsCameraActive(false);
            setCameraError(null);
            
            const resolveAddress = async () => {
                const addr = await getHospitalAddress();
                console.log("[AttendanceModal] Resolved Final Address:", addr || "EMPTY");
                setLocation(addr);
                setStep('camera');
            };

            const timer = setTimeout(resolveAddress, 800);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        let stream: MediaStream | null = null;

        if (step === 'camera' && isOpen) {
            const startCamera = async () => {
                console.log("[AttendanceModal] Activating Camera... Retry:", retryCount);
                
                if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
                    const errMsg = "Browser does not support camera access in this context.";
                    setCameraError(errMsg);
                    return;
                }

                try {
                    // Try with ideal constraints first
                    const constraints = { 
                        video: { 
                            facingMode: 'user',
                            width: { ideal: 640 },
                            height: { ideal: 480 }
                        } 
                    };

                    console.log("[AttendanceModal] Requesting Permission with constraints:", constraints);
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                    
                    console.log("[AttendanceModal] Stream ID:", stream.id);
                    
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        
                        videoRef.current.oncanplay = () => setIsCameraActive(true);
                        videoRef.current.onerror = (e) => console.error("[AttendanceModal] Video Error:", e);

                        try {
                            await videoRef.current.play();
                            console.log("[AttendanceModal] Playback started");
                        } catch (playErr: any) {
                            console.error("[AttendanceModal] Play failed:", playErr.message);
                            setCameraError("Camera blocked. Please click the camera icon in address bar.");
                        }
                    }
                } catch (err: any) {
                    console.error("[AttendanceModal] getUserMedia Error:", err);
                    if (err.name === 'NotAllowedError') {
                        setCameraError("Camera Permission Denied. Please enable it in browser settings.");
                    } else {
                        setCameraError(`Camera Error: ${err.message}`);
                    }
                }
            };

            startCamera();
            
            return () => {
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
            };
        }
    }, [step, isOpen, retryCount]);

    if (!isOpen) return null;

    const handleCapture = () => {
        setCapturing(true);
        setTimeout(() => {
            setCapturing(false);
            onConfirm();
            onClose();
        }, 800);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-12 sm:pt-20">
            {/* Minimal White Backdrop */}
            <div 
                className="absolute inset-0 bg-white/40 backdrop-blur-[2px]"
                onClick={onClose}
            />

            {/* Simple Clean Modal Container */}
            <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in slide-in-from-top-8 duration-300">
                
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Attendance Check</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-50 text-slate-400 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    
                    {/* Compact Indicators */}
                    <div className="flex items-center justify-center gap-4">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${step === 'location' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'text-slate-300'}`}>
                            <MapPin size={10} /> Location
                        </div>
                        <div className="w-4 h-[1px] bg-slate-100" />
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${step === 'camera' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'text-slate-300'}`}>
                            <Camera size={10} /> Face Scan
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="relative aspect-square w-full bg-white rounded-2xl border border-slate-100 overflow-hidden flex items-center justify-center shadow-inner" style={{ backgroundColor: '#ffffff' }}>
                        
                        {step === 'location' ? (
                            <div className="flex flex-col items-center text-center space-y-3 animate-in fade-in duration-300">
                                <LocateFixed className="w-10 h-10 text-emerald-500 animate-bounce" style={{ color: '#10b981' }} />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Identifying Location...</span>
                            </div>
                        ) : (
                            <div className="w-full h-full relative bg-white" style={{ backgroundColor: '#ffffff' }}>
                                {/* Video element with white background forced */}
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    playsInline 
                                    muted 
                                    className="w-full h-full object-cover bg-white"
                                    style={{ backgroundColor: '#ffffff', background: '#ffffff' }}
                                />
                                
                                {/* White background loader when not active */}
                                {!isCameraActive && !cameraError && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 text-slate-400 bg-white z-10" style={{ backgroundColor: '#ffffff', background: '#ffffff' }}>
                                        <RefreshCw className="animate-spin" size={32} style={{ color: '#10b981' }} />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500" style={{ color: '#64748b' }}>Activating Camera...</span>
                                    </div>
                                )}

                                {cameraError && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-white z-20" style={{ backgroundColor: '#ffffff', background: '#ffffff' }}>
                                        <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500" style={{ backgroundColor: '#fff1f2', color: '#f43f5e' }}>
                                            <Smartphone size={24} />
                                        </div>
                                        <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest leading-relaxed" style={{ color: '#f43f5e' }}>{cameraError}</span>
                                        <div className="flex flex-col gap-2 w-full max-w-[140px]">
                                            <button 
                                                onClick={() => setRetryCount(prev => prev + 1)}
                                                className="px-4 py-2 bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-sm"
                                            >
                                                Retry Camera
                                            </button>
                                            <button 
                                                onClick={() => setIsCameraActive(true)}
                                                className="px-4 py-2 bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-widest rounded-full"
                                            >
                                                Bypass (Dummy)
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Only simple flash effect, no lens overlays */}
                                {capturing && <div className="absolute inset-0 bg-white animate-in fade-in duration-75" />}
                            </div>
                        )}
                    </div>

                    {/* Minimal Footer */}
                    <div className="space-y-3">
                        <button
                            onClick={handleCapture}
                            disabled={step !== 'camera' || (!isCameraActive && !cameraError) || capturing}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-50 disabled:text-slate-300 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all active:scale-[0.97] shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-2"
                        >
                            {capturing ? (
                                <RefreshCw className="animate-spin" size={14} />
                            ) : (
                                <>
                                    <Scan size={14} />
                                    Capture & Clock In
                                </>
                            )}
                        </button>
                        {location && (
                            <p className="text-[8px] text-center text-slate-500 font-bold uppercase tracking-[0.15em] px-4 leading-relaxed">
                                {location}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
