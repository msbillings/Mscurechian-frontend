import React, { useState, useMemo } from 'react';
import { SupportTicket } from '@/lib/integrations/types/support';
import { Eye, Clock, CheckCircle, AlertCircle, User, Calendar, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from './StatusBadge';

interface TicketListProps {
    tickets: SupportTicket[];
    isAdmin?: boolean;
    onView: (id: string) => void;
    loading?: boolean;
}

function TicketList({ tickets, isAdmin, onView, loading }: TicketListProps) {
    const [activeTab, setActiveTab] = useState('Unresolved');
    const [search, setSearch] = useState('');

    const filteredTickets = useMemo(() => {
        if (!tickets) return [];
        return tickets.filter(ticket => {
            if (activeTab === 'Resolved' && !['resolved', 'closed'].includes(ticket.status)) return false;
            const ticketType = (ticket.type || ticket.category || '').toLowerCase();

            if (activeTab === 'Unresolved' && (['resolved', 'closed'].includes(ticket.status) || ticketType === 'feedback')) return false;
            if (activeTab === 'Feedback' && ticketType !== 'feedback') return false;

            if (search.trim() === '') return true;
            const searchLower = search.toLowerCase();
            return (
                ticket.subject.toLowerCase().includes(searchLower) ||
                ticket.message.toLowerCase().includes(searchLower) ||
                (ticket.requester?.name || ticket.name || '').toLowerCase().includes(searchLower)
            );
        });
    }, [tickets, activeTab, search]);

    if (loading) {
        return (
            <div className="py-20 text-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-teal-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing Support Stream...</p>
                </div>
            </div>
        );
    }

    const tabs = ['Unresolved', 'Resolved', 'Feedback'];

    return (
        <div className="space-y-3">
            <div className="flex flex-col md:flex-row justify-between items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                <div className="flex p-0.5 bg-slate-50 border border-slate-100 rounded-lg w-full md:w-auto overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 md:px-4 py-1.5 rounded-md text-[8px] md:text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === tab
                                ? 'bg-white text-teal-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-64 px-1 md:px-0">
                    <input
                        type="text"
                        placeholder="Filter subject indexes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-tight outline-none focus:border-teal-500 transition-colors"
                    />
                </div>
            </div>

            {filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 md:p-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
                    <User size={32} className="text-slate-200 mb-3" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Assistance Tickets Synchronized</p>
                </div>
            ) : (
                <>
                    {/* DESKTOP TABLE VIEW */}
                    <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    {isAdmin && (
                                        <>
                                            <th className="py-2.5 px-4 font-black">Requester</th>
                                            <th className="py-2.5 px-4 font-black">Role</th>
                                        </>
                                    )}
                                    <th className="py-2.5 px-4 font-black">Subject Index</th>
                                    <th className="py-2.5 px-4 font-black">Category</th>
                                    <th className="py-2.5 px-4 font-black">Status</th>
                                    <th className="py-2.5 px-4 font-black">Updated</th>
                                    <th className="py-2.5 px-4 text-right font-black">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTickets.map((ticket) => (
                                    <tr key={ticket._id} className="group hover:bg-slate-50/50 transition-colors">
                                        {isAdmin && (
                                            <>
                                                <td className="px-4 py-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-900 uppercase leading-tight">
                                                            {ticket.requester?.name || ticket.name || 'Unknown'}
                                                        </span>
                                                        <span className="text-[7px] text-slate-400 font-bold uppercase tracking-tighter">
                                                            {ticket.requester?.email || 'No Email'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-slate-100 text-slate-500`}>
                                                        {ticket.requester?.role || ticket.role || 'N/A'}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                        <td className="py-2 px-4">
                                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[200px]">{ticket.subject}</p>
                                            <p className="text-[8px] text-slate-400 font-medium truncate max-w-[200px] mt-0.5">{ticket.message}</p>
                                        </td>
                                        <td className="py-2 px-4">
                                            <CategoryBadge category={ticket.type || ticket.category} />
                                        </td>
                                        <td className="py-2 px-4">
                                            <StatusBadge status={ticket.status} />
                                        </td>
                                        <td className="py-2 px-4">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">
                                                    {ticket.createdAt ? format(new Date(ticket.createdAt), 'MMM dd, yy') : 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-2 px-4 text-right">
                                            <button
                                                onClick={() => onView(ticket._id)}
                                                className="px-2.5 py-1 bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ml-auto transition-all active:scale-95"
                                            >
                                                <Eye size={10} /> Open
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE CARD VIEW */}
                    <div className="md:hidden grid grid-cols-1 gap-1.5">
                        {filteredTickets.map((ticket) => (
                            <div key={ticket._id} className="bg-white p-2 sm:p-3 rounded-lg border border-slate-100 shadow-sm flex flex-col gap-2 transition-transform active:scale-[0.98]">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <StatusBadge status={ticket.status} />
                                            <CategoryBadge category={ticket.type || ticket.category} />
                                        </div>
                                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-tight leading-tight mb-0.5 truncate">{ticket.subject}</h3>
                                        <p className="text-[8px] text-slate-500 line-clamp-1 font-medium italic">"{ticket.message}"</p>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-50/50 flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        <Calendar size={10} />
                                        {ticket.createdAt ? format(new Date(ticket.createdAt), 'MMM dd') : 'N/A'}
                                    </div>
                                    <button
                                        onClick={() => onView(ticket._id)}
                                        className="px-3 py-1 bg-slate-900 text-white rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                                    >
                                        <Eye size={10} /> Open
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function CategoryBadge({ category }: { category: string }) {
    const normalize = (str: string) => str?.toLowerCase().trim() || '';
    let style = 'bg-slate-50 text-slate-400 border border-slate-100';

    if (normalize(category) === 'complaint') style = 'bg-rose-50 text-rose-600 border border-rose-100';
    else if (normalize(category) === 'bug') style = 'bg-rose-50 text-rose-600 border border-rose-100';
    else if (normalize(category) === 'feedback') style = 'bg-teal-50 text-teal-600 border border-teal-100';
    else if (normalize(category) === 'inquiry') style = 'bg-slate-50 text-slate-600 border border-slate-200';

    return (
        <span className={`px-2.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${style}`}>
            {category || 'Node'}
        </span>
    );
}

export default React.memo(TicketList);
