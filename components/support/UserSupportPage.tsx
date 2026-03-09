'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supportService } from '@/lib/integrations/services/support.service';
import { SupportTicket } from '@/lib/integrations/types/support';
import TicketList from '@/components/support/TicketList';
import CreateTicketModal from '@/components/support/CreateTicketModal';
import { Plus, LifeBuoy } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface UserSupportPageProps {
    basePath?: string;
    title?: string;
}

export default function UserSupportPage({ basePath, title }: UserSupportPageProps) {
    const router = useRouter();
    const pathname = usePathname();
    const effectiveBasePath = basePath || pathname;
    const effectiveTitle = title || "Support Center";
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        loadTickets();
    }, []);

    const loadTickets = useCallback(async () => {
        try {
            setLoading(true);
            const data = await supportService.getMyTickets();
            setTickets(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load tickets");
        } finally {
            setLoading(false);
        }
    }, []);

    // Called by the modal after a ticket is successfully created
    const handleTicketCreated = useCallback(async () => {
        setIsCreateModalOpen(false);
        // Reload the ticket list immediately
        await loadTickets();
        // Also bust Next.js route cache so navigating away and back still shows fresh data
        router.refresh();
    }, [loadTickets, router]);

    return (
        <div className="max-w-7xl mx-auto space-y-1 pb-4 pt-0.5 px-0.5 sm:px-1 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1.5 bg-white dark:bg-gray-800 p-1.5 sm:p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
                <div className="space-y-0">
                    <h1 className="text-[10px] sm:text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5 uppercase tracking-tight">
                        <LifeBuoy size={12} className="text-blue-600" /> {effectiveTitle}
                    </h1>
                    <p className="text-gray-500 text-[7px] sm:text-[9px] font-medium uppercase tracking-tighter shrink-0 opacity-70 leading-none">Raise tickets and track their status directly from here.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-md shadow-blue-600/10 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                    <Plus size={10} /> New Ticket
                </button>
            </div>

            <TicketList
                tickets={tickets}
                isAdmin={false}
                loading={loading}
                onView={(id) => router.push(`${effectiveBasePath}/${id}`)}
            />

            <CreateTicketModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleTicketCreated}
                basePath={effectiveBasePath}
            />
        </div>
    );
}

