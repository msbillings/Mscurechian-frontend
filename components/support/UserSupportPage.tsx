'use client';

import React, { useState, useEffect } from 'react';
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

    const loadTickets = async () => {
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
    };

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <LifeBuoy className="text-blue-600" /> {effectiveTitle}
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm md:text-base">Raise tickets and track their status directly from here.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                    <Plus size={20} /> New Ticket
                </button>
            </div>

            <TicketList
                tickets={tickets}
                isAdmin={false} // User view
                loading={loading}
                onView={(id) => router.push(`${effectiveBasePath}/${id}`)}
            />

            <CreateTicketModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={loadTickets}
                basePath={effectiveBasePath}
            />
        </div>
    );
}
