'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supportService } from '@/lib/integrations/services/support.service';
import { SupportTicket } from '@/lib/integrations/types/support';
import TicketList from '@/components/support/TicketList';
import { Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

function AdminSupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const data = await supportService.getAllTickets();
      setTickets(data);
    } catch (error) {
      toast.error("Failed to fetch support tickets");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support & Feedback</h1>
          <p className="text-gray-500 text-sm">Manage all user inquiries and platform feedback</p>
        </div>
      </div>


      <TicketList
        tickets={tickets}
        isAdmin={true}
        loading={loading}
        onView={(id) => router.push(`/admin/support/${id}`)}
      />
    </div>
  );
}

export default React.memo(AdminSupportPage);
