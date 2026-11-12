import React, { useState } from 'react';
import { Bell, Volume2, MessageSquare, Phone, Smartphone, Music, Vibrate } from 'lucide-react';
import { Switch } from '../../ui/Switch';

export const NotificationsPanel: React.FC = () => {
  const [level, setLevel] = useState<'basic' | 'advanced' | 'expert'>('basic');
  
  const [msgNotifs, setMsgNotifs] = useState(true);
  const [groupNotifs, setGroupNotifs] = useState(true);
  const [callNotifs, setCallNotifs] = useState(true);
  const [reactionNotifs, setReactionNotifs] = useState(false);
  
  const [desktopSound, setDesktopSound] = useState(true);
  const [vibration, setVibration] = useState(true);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full">
      <div className="mb-6 border-b border-border pb-4">
        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
          <Bell size={18} className="text-primary" />
          Notifications & Sounds
        </h3>
        <p className="text-muted-foreground text-sm">Customize how and when WevChat notifies you about new activity.</p>
        
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
          <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Global Alerts</h4>
          <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10 text-blue-500"><MessageSquare size={16} /></div>
                <div>
                  <p className="text-sm font-medium">Message Notifications</p>
                  <p className="text-xs text-muted-foreground">Alerts for direct messages</p>
                </div>
              </div>
              <Switch checked={msgNotifs} onChange={() => setMsgNotifs(!msgNotifs)} />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-500"><Volume2 size={16} /></div>
                <div>
                  <p className="text-sm font-medium">Group Notifications</p>
                  <p className="text-xs text-muted-foreground">Alerts for group activity</p>
                </div>
              </div>
              <Switch checked={groupNotifs} onChange={() => setGroupNotifs(!groupNotifs)} />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10 text-green-500"><Phone size={16} /></div>
                <div>
                  <p className="text-sm font-medium">Call Notifications</p>
                  <p className="text-xs text-muted-foreground">Incoming audio and video calls</p>
                </div>
              </div>
              <Switch checked={callNotifs} onChange={() => setCallNotifs(!callNotifs)} />
            </div>
          </div>
        </section>

        {/* Advanced Settings */}
        {(level === 'advanced' || level === 'expert') && (
          <section className="animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider mt-6">Sounds & Previews</h4>
            <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-500/10 text-amber-500"><Music size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Notification Sound</p>
                    <p className="text-xs text-muted-foreground">Default sound for messages</p>
                  </div>
                </div>
                <select className="bg-background border border-border rounded-md px-2 py-1 text-sm outline-none">
                  <option>WevChat Default</option>
                  <option>Pop</option>
                  <option>Chime</option>
                  <option>None (Silent)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-500/10 text-amber-500"><Music size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Call Ringtone</p>
                  </div>
                </div>
                <select className="bg-background border border-border rounded-md px-2 py-1 text-sm outline-none">
                  <option>WevChat Default</option>
                  <option>Classic Phone</option>
                  <option>Digital</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-500/10 text-orange-500"><Vibrate size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Vibration</p>
                    <p className="text-xs text-muted-foreground">Vibrate device on incoming alerts</p>
                  </div>
                </div>
                <Switch checked={vibration} onChange={() => setVibration(!vibration)} />
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-cyan-500/10 text-cyan-500"><Smartphone size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Notification Preview</p>
                    <p className="text-xs text-muted-foreground">What to show in the notification</p>
                  </div>
                </div>
                <select className="bg-background border border-border rounded-md px-2 py-1 text-sm outline-none">
                  <option>Show full message</option>
                  <option>Sender only</option>
                  <option>Hide content</option>
                </select>
              </div>
            </div>
          </section>
        )}

        {/* Expert Settings */}
        {level === 'expert' && (
          <section className="animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider mt-6">Granular Notifications</h4>
            <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">Reaction Notifications</p>
                  <p className="text-xs text-muted-foreground">When someone reacts to your message</p>
                </div>
                <Switch checked={reactionNotifs} onChange={() => setReactionNotifs(!reactionNotifs)} />
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">Desktop Sounds</p>
                  <p className="text-xs text-muted-foreground">Play sounds when using WevChat on PC/Browser</p>
                </div>
                <Switch checked={desktopSound} onChange={() => setDesktopSound(!desktopSound)} />
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Per-chat overrides</p>
                  <p className="text-xs text-muted-foreground">Manage custom sounds for specific chats</p>
                </div>
                <button className="px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded hover:bg-blue-500/20 transition-colors">
                  Manage overrides
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
