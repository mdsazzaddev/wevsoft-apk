import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuthStore } from '../../stores/authStore';

interface Lead {
  id: string;
  name: string;
  company: string;
  value: number;
  status: 'new' | 'contacted' | 'qualified' | 'closed';
}

export const CRMLeadKanban: React.FC = () => {
  const { token } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch('/api/v1/business/crm/leads', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLeads(data);
        }
      } catch (err) {
        console.error('Failed to fetch CRM leads', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchLeads();
  }, [token]);

  const columns: { id: Lead['status'], label: string, color: string }[] = [
    { id: 'new', label: 'New Leads', color: 'border-blue-500' },
    { id: 'contacted', label: 'Contacted', color: 'border-yellow-500' },
    { id: 'qualified', label: 'Qualified', color: 'border-purple-500' },
    { id: 'closed', label: 'Closed Won', color: 'border-green-500' },
  ];

  const handleDragStart = (e: React.DragEvent<Element>, id: string) => {
    e.dataTransfer.setData('leadId', id);
  };

  const handleDrop = async (e: React.DragEvent, status: Lead['status']) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('leadId');
    if (!id) return;
    
    // Optimistic update
    setLeads(leads.map(l => l.id === id ? { ...l, status } : l));
    
    // API call
    try {
      await fetch(`/api/v1/business/crm/leads/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
    } catch (err) {
      console.error('Failed to update lead status', err);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading leads...</div>;
  }

  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-4 no-scrollbar">
      {columns.map(col => {
        const columnLeads = leads.filter(l => l.status === col.id);
        const totalValue = columnLeads.reduce((sum, l) => sum + (l.value || 0), 0);

        return (
          <div 
            key={col.id}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, col.id)}
            className="flex-1 min-w-[280px] bg-muted/20 border border-border rounded-2xl flex flex-col overflow-hidden"
          >
            <div className={`p-4 border-b border-border bg-card border-t-4 ${col.color}`}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-foreground">{col.label}</h3>
                <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{columnLeads.length}</span>
              </div>
              <p className="text-xs font-semibold text-primary">${totalValue.toLocaleString()}</p>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {columnLeads.map(lead => (
                <motion.div
                  layout
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent<Element>, lead.id)}
                  className="bg-card border border-border p-4 rounded-xl cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors shadow-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-sm text-foreground">{lead.name}</h4>
                    <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{lead.company}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded">
                      ${(lead.value || 0).toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              ))}
              
              <button className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors border border-dashed border-border hover:border-solid">
                <Plus className="w-4 h-4" />
                Add Lead
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
