import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { API_CONFIG } from '@/lib/integrations/config';

export function useVitalsSocket(patientId: string | null, onVitalsUpdate: (vitals: any) => void, doctorId?: string | null) {
    const socketRef = useRef<Socket | null>(null);
    const callbackRef = useRef(onVitalsUpdate);

    // Keep callback ref up to date
    useEffect(() => {
        callbackRef.current = onVitalsUpdate;
    }, [onVitalsUpdate]);

    useEffect(() => {
        if (!patientId) return;

        // Connect to WebSocket server using dynamic API config
        const socketUrl = API_CONFIG.WS_URL;

        const socket = io(socketUrl, {
            withCredentials: true,
            transports: ['websocket', 'polling']
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('✅ WebSocket connected');
            // Subscribe to patient updates
            socket.emit('subscribe-patient', patientId);

            // If doctorId is provided, join the doctor's room to receive real-time vital alerts
            if (doctorId) {
                console.log(`📡 Joining doctor room: doctor_${doctorId}`);
                socket.emit('join_room', {
                    role: 'doctor',
                    userId: doctorId
                });
            }
        });

        socket.on('vitals-updated', (data) => {
            console.log('📡 Received vitals update:', data);
            if (data.patientId === patientId) {
                callbackRef.current(data.vitals);
            }
        });

        // Listen for high-priority doctoral vital alerts
        socket.on('doctoral_vital_alert', (data) => {
            console.log('🚨 Received high-priority vital alert:', data);
            if (data.severity === 'CRITICAL') {
                toast.error(data.message, {
                    duration: 10000,
                    icon: '🚨',
                    style: {
                        background: '#dc2626',
                        color: '#fff',
                        fontWeight: 'bold'
                    }
                });
            } else {
                toast.error(data.message, {
                    duration: 6000,
                    icon: '⚠️',
                    style: {
                        background: '#f59e0b',
                        color: '#fff',
                        fontWeight: 'bold'
                    },
                });
            }
        });

        socket.on('disconnect', () => {
            console.log('âŒ WebSocket disconnected');
        });

        socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
        });

        // Cleanup on unmount
        return () => {
            if (patientId) {
                socket.emit('unsubscribe-patient', patientId);
            }
            socket.disconnect();
        };
    }, [patientId, doctorId]); // Re-connect if patientId or doctorId changes

    return socketRef.current;
}
