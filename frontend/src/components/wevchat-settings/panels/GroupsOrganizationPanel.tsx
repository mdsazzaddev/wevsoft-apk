import React, { useState } from 'react';
import { Users, Folder, Filter, ShieldCheck, Pin, CheckSquare } from 'lucide-react';
import { Switch } from '../../ui/Switch';
import { useWevChatSettings } from '../../../hooks/useWevChatSettings';

export const GroupsOrganizationPanel: React.FC = () => {
  const [level, setLevel] = useState<'basic' | 'advanced' | 'expert'>('basic');
  const { settings, updateSetting, isLoading } = useWevChatSettings();

  if (isLoading || !settings) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Loading settings...</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full">
      <div className="mb-6 border-b border-border pb-4">
        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
          <Users size={18} className="text-primary" />
          Groups & Organization
        </h3>
        <p className="text-muted-foreground text-sm">Manage group invitations, chat folders, and organization.</p>
        
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

      <div className="space-y-6">
        {/* Basic Settings */}
        <section>
          <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Group Management</h4>
          <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10 text-blue-500"><Users size={16} /></div>
                <div>
                  <p className="text-sm font-medium">Who can add me to groups</p>
                  <p className="text-xs text-muted-foreground">Control group invitations</p>
                </div>
              </div>
              <select 
                className="bg-background border border-border rounded-md px-2 py-1 text-sm outline-none"
                value={settings.whoCanAddMe}
                onChange={(e) => updateSetting('whoCanAddMe', e.target.value)}
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My Contacts</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10 text-green-500"><Folder size={16} /></div>
                <div>
                  <p className="text-sm font-medium">Chat Folders</p>
                  <p className="text-xs text-muted-foreground">Organize chats into tabs</p>
                </div>
              </div>
              <button className="px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-semibold rounded hover:bg-green-500/20 transition-colors">
                Manage Folders
              </button>
            </div>
          </div>
        </section>

        {/* Advanced Settings */}
        {(level === 'advanced' || level === 'expert') && (
          <section className="animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider mt-6">Organization</h4>
            <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-500"><Filter size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Message Requests</p>
                    <p className="text-xs text-muted-foreground">Filter unknown senders</p>
                  </div>
                </div>
                <Switch checked={settings.msgRequests} onChange={() => updateSetting('msgRequests', !settings.msgRequests)} />
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-500/10 text-orange-500"><Pin size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Pinned Chats Limit</p>
                  </div>
                </div>
                <select 
                  className="bg-background border border-border rounded-md px-2 py-1 text-sm outline-none"
                  value={settings.pinnedChatsLimit}
                  onChange={(e) => updateSetting('pinnedChatsLimit', parseInt(e.target.value))}
                >
                  <option value={3}>Default (3)</option>
                  <option value={5}>Extended (5)</option>
                  <option value={10}>Maximum (10)</option>
                </select>
              </div>
            </div>
          </section>
        )}

        {/* Expert Settings */}
        {level === 'expert' && (
          <section className="animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider mt-6">Group Administration</h4>
            <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-500/10 text-amber-500"><ShieldCheck size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Admin Default Settings</p>
                    <p className="text-xs text-muted-foreground">For groups you create</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 border border-border text-foreground text-xs font-semibold rounded hover:bg-muted transition-colors">
                  Configure
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-cyan-500/10 text-cyan-500"><CheckSquare size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Require Member Approval</p>
                    <p className="text-xs text-muted-foreground">New members must be approved</p>
                  </div>
                </div>
                <Switch checked={true} onChange={() => {}} />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
