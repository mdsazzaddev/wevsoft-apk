import React, { useState, useEffect } from 'react';
import { Ticket, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface SupportTicket {
  id: string;
  title: string;
  customer: string;
  status: 'open' | 'pending' | 'resolved';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

export const SupportTicketList: React.FC = () => {
  const { token } = useAuthStore();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await fetch('/api/v1/business/support/tickets', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Transform createdAt for display and map backend fields to frontend interface
          const formatted = data.map((t: any) => ({
            id: t.id,
            title: t.subject || t.title || 'Untitled Ticket',
            customer: t.user?.name || t.customer || 'Unknown User',
            status: t.status,
            priority: t.priority === 'normal' ? 'medium' : (t.priority || 'low'),
            createdAt: new Date(t.createdAt).toLocaleDateString()
          }));
          setTickets(formatted);
        }
      } catch (err) {
        console.error('Failed to fetch support tickets', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchTickets();
  }, [token]);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'open': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'resolved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default: return <Ticket className="w-4 h-4" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'open': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'resolved': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 flex justify-center text-muted-foreground">
        Loading support tickets...
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Ticket className="w-5 h-5 text-primary" />
          Support Tickets
        </h2>
        <button className="text-sm font-semibold text-primary hover:underline">View All</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/30 text-muted-foreground text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3 border-b border-border">ID</th>
              <th className="px-4 py-3 border-b border-border">Title</th>
              <th className="px-4 py-3 border-b border-border">Customer</th>
              <th className="px-4 py-3 border-b border-border">Status</th>
              <th className="px-4 py-3 border-b border-border">Priority</th>
              <th className="px-4 py-3 border-b border-border">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tickets.map(ticket => (
              <tr key={ticket.id} className="hover:bg-muted/20 transition-colors cursor-pointer group">
                <td className="px-4 py-3 font-medium text-foreground">{ticket.id.substring(0, 8)}...</td>
                <td className="px-4 py-3 text-foreground/90 group-hover:text-primary transition-colors">{ticket.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{ticket.customer}</td>
                <td className="px-4 py-3">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(ticket.status)}`}>
                    {getStatusIcon(ticket.status)}
                    {ticket.status}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="capitalize font-medium text-muted-foreground text-xs">{ticket.priority}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{ticket.createdAt}</td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No support tickets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
