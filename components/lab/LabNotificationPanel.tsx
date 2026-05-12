'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell, FlaskConical, CreditCard, FileText, Megaphone,
  Check, Trash2, Clock, Inbox, X, CheckCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationService } from '@/lib/integrations';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LabNotif {
  id: string;
  eventType:
    | 'new_lab_order'
    | 'lab_order_placed'
    | 'bill_generated'
    | 'payment_status_changed'
    | 'sample_collected'
    | 'lab_order_updated'
    | 'lab_result_notification'
    | 'notification:new'
    | 'hospital_announcement';
  title: string;
  body: string;
  meta?: string;
  isRead: boolean;
  createdAt: string;
  dbId?: string;
  relatedId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const EVENT_META: Record<LabNotif['eventType'], { icon: React.ReactNode; color: string; bg: string }> = {
  new_lab_order:          { icon: <FlaskConical className="w-4 h-4" />, color: 'text-violet-600',  bg: 'bg-violet-100 dark:bg-violet-900/30' },
  lab_order_placed:       { icon: <Check        className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  bill_generated:         { icon: <FileText     className="w-4 h-4" />, color: 'text-blue-600',    bg: 'bg-blue-100 dark:bg-blue-900/30' },
  payment_status_changed: { icon: <CreditCard   className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  sample_collected:       { icon: <FlaskConical className="w-4 h-4" />, color: 'text-amber-600',   bg: 'bg-amber-100 dark:bg-amber-900/30' },
  lab_order_updated:      { icon: <FlaskConical className="w-4 h-4" />, color: 'text-sky-600',     bg: 'bg-sky-100 dark:bg-sky-900/30' },
  lab_result_notification:{ icon: <FileText     className="w-4 h-4" />, color: 'text-indigo-600',  bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  'notification:new':     { icon: <Bell         className="w-4 h-4" />, color: 'text-pink-600',    bg: 'bg-pink-100 dark:bg-pink-900/30' },
  hospital_announcement:  { icon: <Megaphone    className="w-4 h-4" />, color: 'text-orange-600',  bg: 'bg-orange-100 dark:bg-orange-900/30' },
};

function buildBody(eventType: LabNotif['eventType'], data: any): { title: string; body: string; meta?: string } {
  // Support both flat fields (labTokenController) and nested fields (labController)
  const patient = data.patientName || data.patient?.name || data.patientDetails?.name || 'Unknown Patient';
  const sample  = data.sampleId ? `#${data.sampleId}` : '';
  const doctor  = data.doctorName || data.doctor?.name || '';
  const bill    = data.billId || '';
  const amount  = data.amount != null ? `₹${data.amount}` : '';

  switch (eventType) {
    case 'new_lab_order': {
      // Avoid "Dr. Dr." by checking if it already exists
      const cleanDoctor = doctor.trim().startsWith('Dr.') ? doctor.trim() : (doctor ? `Dr. ${doctor}` : '');
      return { 
        title: 'New Lab Order', 
        body: `${patient}${sample ? ' · ' + sample : ''}${amount ? ' · ' + amount : ''}${cleanDoctor ? ' · ' + cleanDoctor : ''}`, 
        meta: '' 
      };
    }
    case 'lab_order_placed': {
      const cleanDoctor = doctor.trim().startsWith('Dr.') ? doctor.trim() : (doctor ? `Dr. ${doctor}` : '');
      return { 
        title: 'Order Placed', 
        body: `${patient}${sample ? ' · ' + sample : ''}${amount ? ' · ' + amount : ''}${cleanDoctor ? ' · ' + cleanDoctor : ''}`, 
        meta: '' 
      };
    }
    case 'bill_generated':
      return { title: 'Bill Generated',   body: `${patient}${sample ? ' · ' + sample : ''}${doctor ? ' · Dr. ' + doctor : ''}`, meta: [bill, amount].filter(Boolean).join(' · ') };
    case 'payment_status_changed':
      return { title: 'Payment Received', body: `${patient}${sample ? ' · ' + sample : ''}`, meta: [bill, amount, data.paymentMode ? data.paymentMode.toUpperCase() : ''].filter(Boolean).join(' · ') };
    case 'sample_collected':
      return { title: 'Sample Collected', body: sample || data.orderId || 'Order updated' };
    case 'lab_order_updated':
      return { title: 'Order Updated',    body: sample || data.orderId || 'Lab order status changed' };
    case 'lab_result_notification':
      return { title: 'Results Ready',    body: `${patient}${sample ? ' · ' + sample : ''}${doctor ? ' · Dr. ' + doctor : ''}`, meta: data.tests?.map((t: any) => t.name).join(', ') || '' };
    case 'notification:new':
      return { title: 'Notification',     body: data.message || 'New notification received' };
    case 'hospital_announcement':
      return { title: data.title || 'Announcement', body: data.content || data.message || '' };
    default:
      return { title: 'Update',           body: data.message || 'Lab update received' };
  }
}

function playSound(type: LabNotif['eventType']) {
  try {
    const src = type === 'hospital_announcement' || type === 'notification:new'
      ? '/assets/emergency.mp3' : '/assets/nurse.mp3';
    new Audio(src).play().catch(() => {});
  } catch {}
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LabNotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifs, setNotifs] = useState<LabNotif[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);

  // ── Fetch persisted notifications ───────────────────────────────────────────
  const fetchPersisted = useCallback(async () => {
    try {
      const data = await notificationService.getNotifications();
      const mapped: LabNotif[] = (Array.isArray(data) ? data : []).map((n: any) => {
        const id = typeof n._id === 'object' ? n._id.$oid : n._id;
        
        // Map types to friendly titles
        let title = 'Notification';
        if (n.type === 'hospital_announcement') title = 'Announcement';
        else if (n.type === 'new_lab_order') title = 'New Lab Order';
        else if (n.type === 'lab_result_ready' || n.type === 'lab_result_notification') title = 'Lab Results';
        else if (n.type === 'bill_generated') title = 'New Bill';

        return {
          id, dbId: id,
          eventType: (n.type as LabNotif['eventType']) || 'notification:new',
          title,
          body: n.message || '',
          isRead: n.isRead ?? false,
          createdAt: n.createdAt || new Date().toISOString(),
          relatedId: n.relatedId?.$oid || n.relatedId?.toString() || n.relatedId,
        };
      });
      setNotifs(prev => {
        const liveOnly   = prev.filter(p => !p.dbId);
        const existingDbIds = new Set(prev.filter(p => p.dbId).map(p => p.dbId));
        const existingRelIds = new Set(prev.map(p => p.relatedId).filter(Boolean));
        
        // Only keep mapped ones that aren't already represented by dbId or relatedId
        const newOnes = mapped.filter(m => 
          !existingDbIds.has(m.dbId) && 
          (!m.relatedId || !existingRelIds.has(m.relatedId))
        );
        
        return [...liveOnly, ...newOnes].slice(0, 50);
      });
    } catch {}
  }, []);

  // ── Socket subscriptions ────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const initSocket = async () => {
      try {
        const { joinSocketRoom, subscribeToSocket } = await import('@/lib/integrations/api/socket');
        const userData = localStorage.getItem('user');
        if (!userData) return;
        const user = JSON.parse(userData);

        // Use the shared joinSocketRoom helper — it persists the payload so reconnects
        // automatically re-join the hospital room (required for new_lab_order delivery).
        await joinSocketRoom({ role: user.role || 'lab', userId: user.id || user._id, hospitalId: user.hospital });

        const addNotif = (eventType: LabNotif['eventType'], data: any) => {
          if (!isMounted) return;
          const { title, body, meta } = buildBody(eventType, data);
          const notif: LabNotif = {
            id: `${eventType}-${Date.now()}-${Math.random()}`,
            eventType, title, body, meta,
            isRead: false,
            createdAt: data.createdAt || new Date().toISOString(),
          };
          setNotifs(prev => {
            // Deduplicate by relatedId if present, otherwise by body and time
            const relId = data.relatedId || data.relatedId?.$oid;
            if (relId && prev.some(p => p.relatedId === relId)) return prev;
            if (prev.some(p => p.body === body && Date.now() - new Date(p.createdAt).getTime() < 3000)) return prev;
            
            const newNotif = { ...notif, relatedId: relId };
            return [newNotif, ...prev].slice(0, 50);
          });
          playSound(eventType);
          toast.success(`${title}: ${body}`, { icon: '🔬', duration: 5000, className: 'text-xs' });
        };

        const LAB_EVENTS: LabNotif['eventType'][] = [
          'new_lab_order', 'lab_order_placed', 'bill_generated', 'payment_status_changed',
          'sample_collected', 'lab_order_updated', 'lab_result_notification',
        ];
        for (const ev of LAB_EVENTS) {
          await subscribeToSocket(ev, (data: any) => addNotif(ev, data));
        }
        // Announcements appear in activity feed (no separate tab)
        await subscribeToSocket('hospital_announcement' as any, (data: any) => {
          if (!isMounted) return;
          addNotif('hospital_announcement', data);
        });
      } catch (err) {
        console.error('[LabNotificationPanel] Socket init error:', err);
      }
    };

    initSocket();
    fetchPersisted();
    return () => { isMounted = false; };
  }, [fetchPersisted]);

  // ── Poll when panel open ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    fetchPersisted();
    const timer = setInterval(fetchPersisted, 30000);
    return () => clearInterval(timer);
  }, [isOpen, fetchPersisted]);

  // ── Click outside ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const markRead = useCallback(async (notif: LabNotif) => {
    setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    if (notif.dbId) { try { await notificationService.markAsRead(notif.dbId); } catch {} }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    try { await notificationService.markAllAsRead(); } catch {}
  }, []);

  const removeNotif = useCallback(async (notif: LabNotif, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifs(prev => prev.filter(n => n.id !== notif.id));
    if (notif.dbId) { try { await notificationService.deleteNotification(notif.dbId); } catch {} }
  }, []);

  const clearAll = useCallback(async () => {
    setNotifs([]);
    try { await notificationService.deleteAllNotifications(); } catch {}
  }, []);

  const unread = notifs.filter(n => !n.isRead).length;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative" ref={dropRef}>
      {/* Bell */}
      <button
        id="lab-notification-bell"
        onClick={() => setIsOpen(o => !o)}
        className="relative p-2 rounded-full hover:bg-violet-50 dark:hover:bg-violet-900/20 text-gray-600 dark:text-gray-300 transition-colors"
        aria-label="Lab Notifications"
      >
        <Bell className={`w-5 h-5 ${unread > 0 ? 'animate-[bounce_1s_ease-in-out_3]' : ''}`} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-violet-600 text-[9px] items-center justify-center text-white font-black">
              {unread > 9 ? '9+' : unread}
            </span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-3 w-[340px] sm:w-[400px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] z-[999] overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">Lab Notifications</p>
                  {unread > 0 && (
                    <p className="text-[10px] text-violet-600 font-bold uppercase tracking-widest">{unread} unread</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button onClick={markAllRead} title="Mark all read"
                    className="p-1.5 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-lg text-violet-600 transition-colors">
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                {notifs.length > 0 && (
                  <button onClick={clearAll} title="Clear all"
                    className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-rose-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Feed */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/60">
              {notifs.length === 0 ? (
                <EmptyState
                  message="No lab notifications yet"
                  sub="New orders, payments & results will appear here in real time."
                />
              ) : (
                <AnimatePresence initial={false}>
                  {notifs.map(notif => {
                    const meta = EVENT_META[notif.eventType] || EVENT_META['notification:new'];
                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className={`group flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer transition-colors ${
                          !notif.isRead ? 'bg-violet-50/30 dark:bg-violet-900/5' : ''
                        }`}
                        onClick={() => markRead(notif)}
                      >
                        {/* Icon */}
                        <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-xl ${meta.bg} ${meta.color} flex items-center justify-center`}>
                          {meta.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-xs font-bold truncate ${!notif.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                              {notif.title}
                            </p>
                            {!notif.isRead && <span className="shrink-0 w-2 h-2 mt-1 rounded-full bg-violet-500" />}
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-snug">
                            {notif.body}
                          </p>
                          {notif.meta && (
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider">
                              {notif.meta}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {relativeTime(notif.createdAt)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notif.isRead && (
                            <button
                              onClick={e => { e.stopPropagation(); markRead(notif); }}
                              className="p-1 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-600"
                              title="Mark read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={e => removeNotif(notif, e)}
                            className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ message, sub }: { message: string; sub: string }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-center px-6">
      <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-300 dark:text-gray-600 mb-4">
        <Inbox className="w-7 h-7" />
      </div>
      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{message}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[220px] leading-relaxed">{sub}</p>
    </div>
  );
}
