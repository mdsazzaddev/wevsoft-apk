import React, { useState } from 'react';
import { Settings, Cloud, Database, Monitor, Share2, DownloadCloud, Trash2 } from 'lucide-react';
import { Switch } from '../../ui/Switch';
import { useWevChatSettings } from '../../../hooks/useWevChatSettings';

export const SystemAppPanel: React.FC = () => {
  const [level, setLevel] = useState<'basic' | 'advanced' | 'expert'>('basic');
  const { settings, updateSetting, isLoading } = useWevChatSettings();

  if (isLoading || !settings) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Loading settings...</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full">
      <div className="mb-6 border-b border-border pb-4">
        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
          <Settings size={18} className="text-primary" />
          System & App
        </h3>
        <p className="text-muted-foreground text-sm">Manage data sync, backups, and app performance.</p>
        
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
          <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Data & Backup</h4>
          <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10 text-blue-500"><Cloud size={16} /></div>
                <div>
                  <p className="text-sm font-medium">Sync Settings</p>
                  <p className="text-xs text-muted-foreground">Keep chats synced across devices</p>
                </div>
              </div>
              <Switch checked={settings.syncSettings} onChange={() => updateSetting('syncSettings', !settings.syncSettings)} />
            </div>
            
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10 text-green-500"><Database size={16} /></div>
                <div>
                  <p className="text-sm font-medium">Chat Backup</p>
                  <p className="text-xs text-muted-foreground">Backup frequency</p>
                </div>
              </div>
              <select 
                className="bg-background border border-border rounded-md px-2 py-1 text-sm outline-none"
                value={settings.chatBackup}
                onChange={(e) => updateSetting('chatBackup', e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>
        </section>

        {/* Advanced Settings */}
        {(level === 'advanced' || level === 'expert') && (
          <section className="animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider mt-6">Performance</h4>
            <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-500"><Monitor size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Data Saver Mode</p>
                    <p className="text-xs text-muted-foreground">Reduce network usage</p>
                  </div>
                </div>
                <Switch checked={settings.dataSaverMode} onChange={() => updateSetting('dataSaverMode', !settings.dataSaverMode)} />
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-500/10 text-orange-500"><Share2 size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Connected Apps</p>
                    <p className="text-xs text-muted-foreground">Manage external integrations</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 border border-border text-foreground text-xs font-semibold rounded hover:bg-muted transition-colors">
                  Manage Apps
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Expert Settings */}
        {level === 'expert' && (
          <section className="animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider mt-6">System Data</h4>
            <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-500/10 text-amber-500"><DownloadCloud size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Export Account Data</p>
                    <p className="text-xs text-muted-foreground">Download a copy of your info</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 border border-border text-foreground text-xs font-semibold rounded hover:bg-muted transition-colors">
                  Request Export
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-500/10 text-red-500"><Trash2 size={16} /></div>
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Clear Cache</p>
                    <p className="text-xs text-muted-foreground">Free up storage space</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold rounded hover:bg-red-500/20 transition-colors">
                  Clear (142 MB)
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
