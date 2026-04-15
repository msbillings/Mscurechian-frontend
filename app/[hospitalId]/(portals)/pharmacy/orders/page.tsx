'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PharmacyBillingService } from '@/lib/integrations/services/pharmacyBilling.service';
import { Pill, Activity, Clock, FileText, RefreshCcw, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { PharmacyTableSkeleton } from '@/components/ui/skeletons';
import { useTenantLink } from '@/hooks/useTenantLink';

interface PharmacyOrder {
    _id: string;
    tokenNumber: string;
    patient: {
        name: string;
        age?: number;
        gender?: string;
        mobile?: string;
    };
    doctor: {
        name: string;
    };
    medicines: any[];
    status: string;
    patientAge?: string;
    patientGender?: string;
    createdAt: string;
    isDeleted?: boolean;
    admission?: string | any;
}

function ActiveOrdersPage() {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuthStore();
    const { getPath } = useTenantLink();
    const [orders, setOrders] = useState<PharmacyOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // ✅ PERF: Get hospitalId from URL immediately (parallelize with auth check)
    const hospitalId = (params?.hospitalId as string) || (user as any)?.hospital;

    const fetchActiveOrders = useCallback(async (hId: string, silent = false) => {
        if (!silent) setLoading(true);
        else setIsRefreshing(true);

        try {
            const res = await PharmacyBillingService.getHospitalOrders(hId);
            if (res.pharmacyOrders) {
                // Filter for prescribed, processing and ready orders
                setOrders(res.pharmacyOrders.filter((o: any) =>
                    (o.status === 'prescribed' || o.status === 'processing' || o.status === 'ready') && !o.isDeleted
                ));
            }
        } catch (error) {
            console.error('❌ Error fetching active orders:', error);
            toast.error("Failed to load active orders");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (hospitalId) {
            fetchActiveOrders(hospitalId);

            // Real-time updates
            const handleNewOrder = (data: any) => {
                console.log("🔔 New Pharmacy Order Received:", data);
                toast.success('New Prescription Order Received!');
                // Silent refresh on real-time update
                fetchActiveOrders(hospitalId, true);
            };

            const handleOrderCompleted = (orderId: string) => {
                console.log("✅ Pharmacy Order Completed real-time:", orderId);
                setOrders(prev => prev.filter(o => o._id !== orderId));
            };

            import('@/lib/integrations/api/socket').then(({ subscribeToSocket }) => {
                subscribeToSocket(`hospital_${hospitalId}`, 'new_pharmacy_order', handleNewOrder);
                subscribeToSocket(`hospital_${hospitalId}`, 'pharmacy_order_completed', handleOrderCompleted);
            });

            return () => {
                import('@/lib/integrations/api/socket').then(({ unsubscribeFromSocket }) => {
                    unsubscribeFromSocket(`hospital_${hospitalId}`, 'new_pharmacy_order', handleNewOrder);
                    unsubscribeFromSocket(`hospital_${hospitalId}`, 'pharmacy_order_completed', handleOrderCompleted);
                });
            };
        }
    }, [hospitalId, fetchActiveOrders]);

    const handleProcess = (id: string, admissionId?: string) => {
        if (admissionId) {
            router.push(getPath(`/pharmacy/ipd-billing?orderId=${id}&admissionId=${admissionId}`));
        } else {
            router.push(getPath(`/pharmacy/billing?orderId=${id}`));
        }
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-20">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
                        <Pill className="w-6 h-6 md:w-8 md:h-8 text-teal-500" />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Active Orders
                        </h1>
                        <p className="text-[9px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Queue Management</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3 justify-between md:justify-end">
                    <div className="px-3 py-1.5 md:px-5 md:py-2.5 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800/30 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-teal-500 animate-pulse" />
                        <span className="text-[10px] md:text-xs font-bold text-teal-600 uppercase tracking-wider">Live Updates</span>
                    </div>
                    <button
                        onClick={() => hospitalId && fetchActiveOrders(hospitalId, true)}
                        className="p-2 md:p-3 bg-white dark:bg-gray-800 text-gray-500 hover:text-teal-600 rounded-xl border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md active:scale-95 shadow-sm"
                        title="Refresh List"
                        disabled={loading || isRefreshing}
                    >
                        <RefreshCcw size={18} className={loading || isRefreshing ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-gray-50/50 dark:bg-gray-900/50 text-[10px] md:text-xs uppercase text-gray-400 font-bold tracking-wider">
                            <tr>
                                <th className="p-4 md:p-6 border-b dark:border-gray-700">Token</th>
                                <th className="p-4 md:p-6 border-b dark:border-gray-700">Patient Details</th>
                                <th className="p-4 md:p-6 border-b dark:border-gray-700">Doctor</th>
                                <th className="p-4 md:p-6 border-b dark:border-gray-700 text-center">Medicines</th>
                                <th className="p-4 md:p-6 border-b dark:border-gray-700 text-center">Status</th>
                                <th className="p-4 md:p-6 border-b dark:border-gray-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-0">
                                        <PharmacyTableSkeleton rows={5} />
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan={6} className="p-12 md:p-20 text-center">
                                    <div className="flex flex-col items-center gap-3 md:gap-4">
                                        <Activity className="w-10 h-10 md:w-12 md:h-12 text-gray-200" />
                                        <p className="text-[10px] md:text-xs font-bold uppercase text-gray-400 tracking-widest">No active orders found.</p>
                                    </div>
                                </td></tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order._id} className="border-b dark:border-gray-700/50 last:border-0 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 group transition-colors">
                                        <td className="p-4 md:p-6">
                                            <div className="flex flex-col gap-1">
                                                <span className="px-2 md:px-3 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-600 rounded-lg font-bold text-[10px] md:text-xs uppercase w-fit">
                                                    #{order.tokenNumber}
                                                </span>
                                                {order.admission && (
                                                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded text-[10px] font-bold uppercase w-fit">
                                                        IPD Patient
                                                    </span>
                                                )}
                                                {(order as any).pharmaWarning && (
                                                    <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 rounded text-[9px] font-black uppercase w-fit flex items-center gap-1 border border-red-100 animate-pulse">
                                                        <AlertCircle size={10} /> {(order as any).pharmaWarning}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 md:p-6">
                                            <div className="font-bold text-xs md:text-sm text-gray-900 dark:text-white uppercase tracking-tight">{order.patient?.name || 'Unknown'}</div>
                                            <div className="text-[10px] md:text-xs text-gray-400 uppercase font-semibold tracking-wider mt-0.5">
                                                {order.patientAge || order.patient?.age || '-'}Y • {order.patientGender || order.patient?.gender || '-'}
                                            </div>
                                        </td>
                                        <td className="p-4 md:p-6 text-gray-600 dark:text-gray-300 font-semibold uppercase text-[10px] md:text-xs">
                                            {(order.doctor as any)?.user?.name || order.doctor?.name || 'Dr. Staff'}
                                        </td>
                                        <td className="p-4 md:p-6 text-center">
                                            <span className="text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-300">
                                                {order.medicines?.length || 0} Items
                                            </span>
                                        </td>
                                        <td className="p-4 md:p-6 text-center">
                                            <span className={`px-2.5 md:px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${order.status === 'prescribed'
                                                ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/30'
                                                : 'bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/30'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-4 md:p-6 text-right">
                                            <div className="flex items-center justify-end">
                                                <button
                                                    onClick={() => handleProcess(order._id, order.admission?._id || order.admission)}
                                                    className={`inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 ${order.admission ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' : 'bg-teal-600 hover:bg-teal-700 shadow-teal-100'} text-white rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all w-full md:w-auto justify-center`}
                                                >
                                                    <FileText size={14} />
                                                    <span>{order.admission ? 'IPD Bill' : 'OPD Bill'}</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default React.memo(ActiveOrdersPage);
