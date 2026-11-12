import React, { useState } from 'react';
import { FlaskConical, Mic2, ShieldAlert, Code, Webhook, Activity } from 'lucide-react';
import { Switch } from '../../ui/Switch';
import { useWevChatSettings } from '../../../hooks/useWevChatSettings';

export const LabsAdvancedPanel: React.FC = () => {
  const [level, setLevel] = useState<'basic' | 'advanced' | 'expert'>('basic');
  const { settings, updateSetting, isLoading } = useWevChatSettings();

  if (isLoading || !settings) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Loading settings...</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full">
      <div className="mb-6 border-b border-border pb-4">
        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
          <FlaskConical size={18} className="text-primary" />
          Labs & Advanced
        </h3>
        <p className="text-muted-foreground text-sm">Experimental features and developer tools.</p>
        
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
          <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Beta Features</h4>
          <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10 text-blue-500"><FlaskConical size={16} /></div>
                <div>
                  <p className="text-sm font-medium">Join WevChat Beta</p>
                  <p className="text-xs text-muted-foreground">Get early access to new features</p>
                </div>
              </div>
              <Switch checked={settings.joinBeta} onChange={() => updateSetting('joinBeta', !settings.joinBeta)} />
            </div>
            
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-500/10 text-purple-500"><Activity size={16} /></div>
                <div>
                  <p className="text-sm font-medium">New Chat UI</p>
                  <p className="text-xs text-muted-foreground">Try the upcoming redesign</p>
                </div>
              </div>
              <Switch checked={settings.newChatUi} onChange={() => updateSetting('newChatUi', !settings.newChatUi)} />
            </div>
          </div>
        </section>

        {/* Advanced Settings */}
        {(level === 'advanced' || level === 'expert') && (
          <section className="animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider mt-6">Experimental</h4>
            <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-500"><Mic2 size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Voice Effects</p>
                    <p className="text-xs text-muted-foreground">AI voice modulation in calls</p>
                  </div>
                </div>
                <Switch checked={false} onChange={() => {}} />
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-500/10 text-orange-500"><ShieldAlert size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Quantum Safe Encryption</p>
                    <p className="text-xs text-muted-foreground">Post-quantum cryptography test</p>
                  </div>
                </div>
                <Switch checked={false} onChange={() => {}} />
              </div>
            </div>
          </section>
        )}

        {/* Expert Settings */}
        {level === 'expert' && (
          <section className="animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider mt-6">Developer Tools</h4>
            <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-500/10 text-amber-500"><Code size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">API Connections</p>
                    <p className="text-xs text-muted-foreground">Manage bot tokens and OAuth</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 border border-border text-foreground text-xs font-semibold rounded hover:bg-muted transition-colors">
                  API Keys
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-cyan-500/10 text-cyan-500"><Webhook size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Webhooks & Sockets</p>
                    <p className="text-xs text-muted-foreground">Configure realtime delivery</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 border border-border text-foreground text-xs font-semibold rounded hover:bg-muted transition-colors">
                  Diagnostics
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
