import React, { useState } from 'react';
import { Image, Palette, HardDrive, Clock, Send, Wifi } from 'lucide-react';
import { Switch } from '../../ui/Switch';
import { useWevChatSettings } from '../../../hooks/useWevChatSettings';

export const ChatMediaPanel: React.FC = () => {
  const [level, setLevel] = useState<'basic' | 'advanced' | 'expert'>('basic');
  const { settings, updateSetting, isLoading } = useWevChatSettings();

  if (isLoading || !settings) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Loading settings...</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full">
      <div className="mb-6 border-b border-border pb-4">
        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
          <Image size={18} className="text-primary" />
          Chat & Media
        </h3>
        <p className="text-muted-foreground text-sm">Control chat appearance, media downloads, and storage.</p>
        
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
          <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Chat Behavior</h4>
          <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10 text-blue-500"><Send size={16} /></div>
                <div>
                  <p className="text-sm font-medium">Enter to Send</p>
                  <p className="text-xs text-muted-foreground">Press Enter key to send message</p>
                </div>
              </div>
              <Switch checked={settings.enterToSend} onChange={() => updateSetting('enterToSend', !settings.enterToSend)} />
            </div>
            
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10 text-green-500"><Wifi size={16} /></div>
                <div>
                  <p className="text-sm font-medium">Media Auto-download</p>
                  <p className="text-xs text-muted-foreground">Automatically download photos</p>
                </div>
              </div>
              <Switch checked={settings.autoDownload} onChange={() => updateSetting('autoDownload', !settings.autoDownload)} />
            </div>
          </div>
        </section>

        {/* Advanced Settings */}
        {(level === 'advanced' || level === 'expert') && (
          <section className="animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider mt-6">Appearance & Quality</h4>
            <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-500"><Palette size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Chat Wallpaper</p>
                    <p className="text-xs text-muted-foreground">Set default background</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 border border-border text-foreground text-xs font-semibold rounded hover:bg-muted transition-colors">
                  Choose Wallpaper
                </button>
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-500/10 text-orange-500"><Image size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Media Upload Quality</p>
                    <p className="text-xs text-amber-600 mt-0.5">Not available yet. Chat uploads are not resized by this setting; your saved choice is kept for when this ships.</p>
                  </div>
                </div>
                <select 
                  className="bg-background border border-border rounded-md px-2 py-1 text-sm outline-none"
                  value={settings.mediaUploadQuality}
                  disabled
                  aria-disabled="true"
                  title="Not available yet"
                  onChange={(e) => updateSetting('mediaUploadQuality', e.target.value)}
                >
                  <option value="standard">Standard (Faster)</option>
                  <option value="hd">HD Quality</option>
                  <option value="original">Original Size</option>
                </select>
              </div>
            </div>
          </section>
        )}

        {/* Expert Settings */}
        {level === 'expert' && (
          <section className="animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider mt-6">Advanced Storage</h4>
            <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-500/10 text-amber-500"><Clock size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Disappearing Messages</p>
                    <p className="text-xs text-muted-foreground">Default timer for new chats</p>
                    <p className="text-xs text-amber-600 mt-0.5">Not available yet. Messages are not deleted automatically; your saved choice is kept for when this ships.</p>
                  </div>
                </div>
                <select 
                  className="bg-background border border-border rounded-md px-2 py-1 text-sm outline-none"
                  value={settings.disappearingTimer}
                  disabled
                  aria-disabled="true"
                  title="Not available yet"
                  onChange={(e) => updateSetting('disappearingTimer', e.target.value)}
                >
                  <option value="off">Off</option>
                  <option value="24h">24 Hours</option>
                  <option value="7d">7 Days</option>
                  <option value="90d">90 Days</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-cyan-500/10 text-cyan-500"><HardDrive size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Hardware Acceleration</p>
                    <p className="text-xs text-muted-foreground">Use GPU for video playback</p>
                  </div>
                </div>
                <Switch checked={settings.hardwareAccel} onChange={() => updateSetting('hardwareAccel', !settings.hardwareAccel)} />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
