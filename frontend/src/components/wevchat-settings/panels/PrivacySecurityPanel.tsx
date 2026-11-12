import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, Lock, Globe, Users, Clock, AlertTriangle } from 'lucide-react';
import { Switch } from '../../ui/Switch'; 
import { useWevChatSettings } from '../../../hooks/useWevChatSettings';

export const PrivacySecurityPanel: React.FC = () => {
  const navigate = useNavigate();
  const [level, setLevel] = useState<'basic' | 'advanced' | 'expert'>('basic');
  const { settings, updateSetting, isLoading } = useWevChatSettings();

  if (isLoading || !settings) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Loading settings...</div>;
  }
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full">
      <div className="mb-6 border-b border-border pb-4">
        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
          <Shield size={18} className="text-primary" />
          Privacy & Security
        </h3>
        <p className="text-muted-foreground text-sm">Manage who can interact with you and see your activity in WevChat.</p>
        
        {/* Tier Selector */}
        <div className="flex gap-2 mt-4 bg-muted/30 p-1 rounded-lg w-max border border-border">
          <button 
            onClick={() => setLevel('basic')} 
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${level === 'basic' ? 'bg-background shadow-sm border border-border/50 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Basic
          </button>
          <button 
            onClick={() => setLevel('advanced')} 
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${level === 'advanced' ? 'bg-background shadow-sm border border-border/50 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Advanced
          </button>
          <button 
            onClick={() => setLevel('expert')} 
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${level === 'expert' ? 'bg-background shadow-sm border border-border/50 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Expert
          </button>
        </div>
      </div>

      {/* Basic Settings */}
      <div className="space-y-6">
        <section>
          <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Visibility</h4>
          <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium">Who can message me</p>
                <p className="text-xs text-muted-foreground">Control who can send you direct messages</p>
              </div>
              <select className="bg-background border border-border rounded-md px-2 py-1 text-sm outline-none">
                <option>Everyone</option>
                <option>Friends</option>
                <option>Friends of friends</option>
                <option>Nobody</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium">Who can see my profile photo</p>
                <p className="text-xs text-muted-foreground">Visibility of your avatar in chat lists</p>
              </div>
              <select className="bg-background border border-border rounded-md px-2 py-1 text-sm outline-none">
                <option>Everyone</option>
                <option>Contacts</option>
                <option>Nobody</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium">Who can add me to groups</p>
              </div>
              <select className="bg-background border border-border rounded-md px-2 py-1 text-sm outline-none">
                <option>Everyone</option>
                <option>Contacts</option>
              </select>
            </div>
          </div>
        </section>

        {/* Advanced Settings */}
        {(level === 'advanced' || level === 'expert') && (
          <section className="animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider mt-6">Granular Activity Controls</h4>
            <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-500/10 text-blue-500"><Eye size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Read Receipts</p>
                    <p className="text-xs text-muted-foreground">Let others know when you've read their messages</p>
                  </div>
                </div>
                <Switch checked={settings.readReceipts} onChange={() => updateSetting('readReceipts', !settings.readReceipts)} />
              </div>
              
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/10 text-green-500"><Globe size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Typing Indicator</p>
                    <p className="text-xs text-muted-foreground">Show others when you are typing</p>
                  </div>
                </div>
                <Switch checked={settings.typingIndicator} onChange={() => updateSetting('typingIndicator', !settings.typingIndicator)} />
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-500/10 text-purple-500"><Clock size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Last Seen / Active Status</p>
                    <p className="text-xs text-muted-foreground">Show your online status and last active time</p>
                  </div>
                </div>
                <Switch checked={settings.lastSeen} onChange={() => updateSetting('lastSeen', !settings.lastSeen)} />
              </div>
            </div>
          </section>
        )}

        {/* Expert Settings */}
        {level === 'expert' && (
          <section className="animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-semibold text-red-500 mb-3 uppercase tracking-wider flex items-center gap-2 mt-6">
              <AlertTriangle size={14} /> Expert Diagnostics & Security
            </h4>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl divide-y divide-red-500/10">
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">End-to-End Encryption (E2EE)</p>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70">Not available yet. Messages are protected in transit (HTTPS) but are not end-to-end encrypted, so there are no device keys to verify.</p>
                </div>
                <span className="px-3 py-1.5 bg-muted text-muted-foreground text-xs font-semibold rounded">Not available</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">Session Management</p>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70">Revoke remote devices and active WebSocket connections</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/settings?tab=security')}
                  className="px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold rounded hover:bg-red-500/20 transition-colors"
                >
                  Manage Sessions
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
