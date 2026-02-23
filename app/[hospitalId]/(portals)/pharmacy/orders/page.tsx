'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PharmacyBillingService } from '@/lib/integrations/services/pharmacyBilling.service';
import { Pill, Activity, Clock, FileText, RefreshCcw } from 'lucide-react';
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
    createdAt: string;
    isDeleted?: boolean;
    admission?: string | any;
}

function ActiveOrdersPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { getPath } = useTenantLink();
    const [orders, setOrders] = useState<PharmacyOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const hospitalId = (user as any)?.hospital;

    useEffect(() => {
        if (hospitalId) {
            fetchActiveOrders(hospitalId);

            // Real-time updates
            const handleNewOrder = (data: any) => {
                console.log("🔔 New Pharmacy Order Received:", data);

                toast.success('New Prescription Order Received!');

                // Refresh full list to be safe
                fetchActiveOrders(hospitalId);
            };

            const handleOrderCompleted = (orderId: string) => {
                console.log("✅ Pharmacy Order Completed real-time:", orderId);
                setOrders(prev => prev.filter(o => o._id !== orderId));
            };

            import('@/lib/integrations/api/socket').then(({ subscribeToSocket, unsubscribeFromSocket }) => {
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
    }, [hospitalId]);

    const fetchActiveOrders = async (hospitalId: string) => {
        setLoading(true);
        try {
            const res = await PharmacyBillingService.getHospitalOrders(hospitalId);
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
        }
    };

    const handleProcess = (id: string, admissionId?: string) => {
        if (admissionId) {
            router.push(getPath(`/pharmacy/ipd-billing?orderId=${id}&admissionId=${admissionId}`));
        } else {
            router.push(getPath(`/pharmacy/billing?orderId=${id}`));
        }
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen pb-20">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white tracking-tight">
                        <Pill className="w-8 h-8 text-teal-500" />
                        Active Prescription Orders
                    </h1>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">New prescriptions and orders currently being processed</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => hospitalId && fetchActiveOrders(hospitalId)}
                        className="p-3 bg-white dark:bg-gray-800 text-gray-500 hover:text-teal-600 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md active:scale-95"
                        title="Refresh List"
                    >
                        <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="px-4 py-2 md:px-5 md:py-2.5 bg-teal-50 dark:bg-teal-900/20 rounded-2xl border border-teal-100 dark:border-teal-800/30 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                        <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Live Updates</span>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl md:rounded-4xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-gray-50/50 dark:bg-gray-900/50 text-xs uppercase text-gray-400 font-bold tracking-wider">
                            <tr>
                                <th className="p-6 border-b dark:border-gray-700">Token</th>
                                <th className="p-6 border-b dark:border-gray-700">Patient Details</th>
                                <th className="p-6 border-b dark:border-gray-700">Doctor</th>
                                <th className="p-6 border-b dark:border-gray-700 text-center">Medicines</th>
                                <th className="p-6 border-b dark:border-gray-700 text-center">Status</th>
                                <th className="p-6 border-b dark:border-gray-700 text-right">Actions</th>
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
                                <tr><td colSpan={6} className="p-20 text-center flex flex-col items-center gap-4">
                                    <Activity className="w-12 h-12 text-gray-200" />
                                    <p className="text-xs font-bold uppercase text-gray-400 tracking-widest">No active orders found.</p>
                                </td></tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order._id} className="border-b dark:border-gray-700/50 last:border-0 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 group">
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1">
                                                <span className="px-3 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-600 rounded-lg font-bold text-xs uppercase w-fit">
                                                    {order.tokenNumber}
                                                </span>
                                                {order.admission && (
                                                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded text-[10px] font-bold uppercase w-fit">
                                                        IPD Patient
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">{order.patient?.name || 'Unknown'}</div>
                                            <div className="text-xs text-gray-400 uppercase font-semibold tracking-wider mt-0.5">
                                                {order.patient?.age || '-'}Y • {order.patient?.gender || '-'}
                                            </div>
                                        </td>
                                        <td className="p-6 text-gray-600 dark:text-gray-300 font-semibold uppercase text-xs">
                                            {(order.doctor as any)?.user?.name || order.doctor?.name || 'Dr. Staff'}
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                {order.medicines?.length || 0} Items
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${order.status === 'prescribed'
                                                    ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/30'
                                                    : 'bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/30'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleProcess(order._id, order.admission?._id || order.admission)}
                                                    className={`inline-flex items-center gap-2 px-4 py-2 ${order.admission ? 'bg-blue-600 hover:bg-blue-700' : 'bg-teal-600 hover:bg-teal-700'} text-white rounded-xl text-xs font-bold uppercase tracking-widest dark:shadow-none active:scale-95 transition-all w-full md:w-auto justify-center`}
                                                >
                                                    <FileText size={14} />
                                                    {order.admission ? 'IPD Bill' : 'Retail Bill'}
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
