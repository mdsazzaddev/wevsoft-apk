import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import api from '../../lib/api';

interface AuditLog {
  id: string;
  device: string | null;
  ipAddress: string | null;
  createdAt: string;
  status: 'success' | 'failed' | 'warning';
}

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/security/login-history');
        setLogs(res.data);
      } catch (err) {
        console.error('Failed to fetch audit logs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        <History className="w-5 h-5 text-primary" />
        Security Audit Log
      </h2>
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground text-xs uppercase font-semibold tracking-wider">
              <tr>
                <th className="px-5 py-4 border-b border-border">Action / Device</th>
                <th className="px-5 py-4 border-b border-border">IP Address</th>
                <th className="px-5 py-4 border-b border-border">Timestamp</th>
                <th className="px-5 py-4 border-b border-border">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={4} className="px-5 py-4 text-center text-muted-foreground">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-4 text-center text-muted-foreground">No logs found</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4 font-medium text-foreground">{log.device || 'Unknown Device'}</td>
                  <td className="px-5 py-4 font-mono text-muted-foreground text-xs">{log.ipAddress || 'Unknown IP'}</td>
                  <td className="px-5 py-4 text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      log.status === 'success' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                      log.status === 'failed' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                      'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                    }`}>
                      {log.status === 'success' ? 'Login Success' : 'Login Failed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
