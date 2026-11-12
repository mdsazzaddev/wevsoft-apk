import React, { useEffect, useState } from 'react';
import { Shield, Smartphone, Clock, Key, Monitor, Smartphone as PhoneIcon, Trash2 } from 'lucide-react';
import { AuditLogViewer } from './AuditLogViewer';
import { TwoFactorSetupModal } from './TwoFactorSetupModal';
import api from '../../lib/api';

interface DeviceSession {
  id: string;
  device: string;
  ipAddress: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export const SecuritySettingsPage: React.FC = () => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [is2faModalOpen, setIs2faModalOpen] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  
  const [activeSessions, setActiveSessions] = useState<DeviceSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetch2faStatus();
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchSessions();
  }, []);

  const fetch2faStatus = async () => {
    try {
      const res = await api.get('/2fa/status');
      setTwoFactorEnabled(res.data.enabled);
    } catch (err) {
      console.error('Failed to fetch 2fa status', err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await api.get('/security/sessions');
      setActiveSessions(res.data);
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const revokeSession = async (id: string) => {
    try {
      await api.delete(`/security/sessions/${id}`);
      setActiveSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to revoke session', err);
      alert('Failed to revoke session. Please try again.');
    }
  };

  const handle2faToggle = async () => {
    if (twoFactorEnabled) {
      const code = prompt('Please enter your 6-digit Authenticator code to disable 2FA:');
      if (!code) return;
      try {
        await api.post('/2fa/disable', { code });
        setTwoFactorEnabled(false);
        alert('2FA has been disabled.');
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to disable 2FA.');
      }
    } else {
      setIs2faModalOpen(true);
    }
  };

  const on2faSetupSuccess = () => {
    setTwoFactorEnabled(true);
  };

  const getDeviceIcon = (deviceName: string) => {
    const lower = (deviceName || '').toLowerCase();
    if (lower.includes('iphone') || lower.includes('android') || lower.includes('mobile')) {
      return PhoneIcon;
    }
    return Monitor;
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full p-6 space-y-10">
        
        <div className="pb-6 border-b border-border">
          <h1 className="text-3xl font-black text-foreground flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            Security Settings
          </h1>
          <p className="text-muted-foreground">Manage your account security, sessions, and authentication methods.</p>
        </div>

        {/* 2FA & Timeouts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                <Smartphone className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Two-Factor Auth</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Add an extra layer of security to your account using an authenticator app.</p>
            
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Enable 2FA</span>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  checked={twoFactorEnabled} 
                  onChange={handle2faToggle} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Session Timeout</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Automatically log out of your account after a period of inactivity.</p>
            
            <select 
              value={sessionTimeout}
              onChange={e => setSessionTimeout(e.target.value)}
              className="w-full px-4 py-2 bg-muted rounded-xl text-sm font-semibold text-foreground outline-none border border-border appearance-none cursor-pointer"
            >
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="60">1 Hour</option>
              <option value="never">Never</option>
            </select>
          </div>
        </div>

        {/* Active Sessions */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Active Sessions
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border">
            {sessionsLoading ? (
              <div className="p-5 text-center text-muted-foreground text-sm">Loading sessions...</div>
            ) : activeSessions.length === 0 ? (
              <div className="p-5 text-center text-muted-foreground text-sm">No active sessions found.</div>
            ) : activeSessions.map(session => {
              const Icon = getDeviceIcon(session.device);
              return (
                <div key={session.id} className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-xl text-muted-foreground">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground">{session.device || 'Unknown Device'}</h3>
                        {session.isCurrent && (
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider rounded-md">
                            Current Device
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        IP: {session.ipAddress || 'Unknown'} • Active: {new Date(session.lastActive).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <button 
                      onClick={() => revokeSession(session.id)}
                      className="p-2 text-sm font-semibold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Revoke</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit Log */}
        <div className="pt-8">
          <AuditLogViewer />
        </div>

      </div>
      
      <TwoFactorSetupModal 
        isOpen={is2faModalOpen} 
        onClose={() => setIs2faModalOpen(false)} 
        onSuccess={on2faSetupSuccess} 
      />
    </div>
  );
};
