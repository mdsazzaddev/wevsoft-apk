import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Shield, HardDrive, Image as ImageIcon, Palette, Bot, Ban,
  Download, Settings, HelpCircle, MessageCircle, Lock, Monitor, Smartphone,
  Trash2, Search, ExternalLink, Sliders, Moon
} from 'lucide-react';
import { Switch } from '../ui/Switch';
import { useWevChatSettings } from '../../hooks/useWevChatSettings';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { AutomationShell } from '../wevchat-ai/automation/AutomationShell';

// Section Title Component
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h4 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">{children}</h4>
);

// Setting Row Component
const SettingRow = ({
  icon: Icon,
  title,
  description,
  control,
  onClick
}: {
  icon?: React.FC<any>,
  title: string,
  description?: string,
  control?: React.ReactNode,
  onClick?: () => void
}) => (
  <div
    className={`flex items-center justify-between p-4 ${onClick ? 'cursor-pointer hover:bg-muted/30 transition-colors' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center gap-4">
      {Icon && (
        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
          <Icon size={18} />
        </div>
      )}
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-[13px] text-muted-foreground mt-0.5 max-w-[250px] sm:max-w-md">{description}</p>}
      </div>
    </div>
    {control && <div className="shrink-0 ml-4">{control}</div>}
  </div>
);

// --- 1. Chat Panel ---
export const ChatPanel = () => {
  const { settings, updateSetting, isLoading } = useWevChatSettings();

  if (isLoading || !settings) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-8 animate-in fade-in zoom-in-95 duration-200">
      <div>
        <SectionTitle>Messaging</SectionTitle>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border/50 shadow-sm overflow-hidden">
          <SettingRow
            title="Enter to Send"
            description="Press Enter key to send message"
            control={<Switch checked={settings.enterToSend} onChange={(v) => updateSetting('enterToSend', v)} />}
          />
          <SettingRow
            title="Shift + Enter for New Line"
            description="Use Shift + Enter to add a line break"
            control={<Switch checked={settings.shiftEnterNewLine || false} onChange={(v) => updateSetting('shiftEnterNewLine', v)} />}
          />
          <SettingRow
            title="Message Editing"
            description="Allow editing messages after sending"
            control={<Switch checked={settings.messageEditing || true} onChange={(v) => updateSetting('messageEditing', v)} />}
          />
          <SettingRow
            title="Message Deletion"
            description="Allow deleting messages for everyone"
            control={<Switch checked={settings.messageDeletion || true} onChange={(v) => updateSetting('messageDeletion', v)} />}
          />
          <SettingRow
            title="Auto-Save Drafts"
            description="Automatically save unfinished messages"
            control={<Switch checked={settings.autoSaveDrafts || true} onChange={(v) => updateSetting('autoSaveDrafts', v)} />}
          />
        </div>
      </div>

      <div>
        <SectionTitle>Display & Organization</SectionTitle>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border/50 shadow-sm overflow-hidden">
          <SettingRow
            title="Reply Preview"
            description="Show preview of the message being replied to"
            control={<Switch checked={settings.replyPreview || true} onChange={(v) => updateSetting('replyPreview', v)} />}
          />
          <SettingRow
            title="Link Preview"
            description="Generate rich previews for URLs"
            control={<Switch checked={settings.linkPreview || true} onChange={(v) => updateSetting('linkPreview', v)} />}
          />
          <SettingRow
            title="Conversation Sorting"
            control={
              <select
                className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer hover:bg-muted/80 transition-colors"
                value={settings.conversationSorting || 'recent'}
                onChange={(e) => updateSetting('conversationSorting', e.target.value)}
              >
                <option value="recent">Recent Activity</option>
                <option value="unread">Unread First</option>
              </select>
            }
          />
        </div>
      </div>
    </div>
  );
};

// --- 2. Notifications Panel ---
export const NotificationsPanel = () => {
  const { settings, updateSetting, isLoading } = useWevChatSettings();

  if (isLoading || !settings) return <div className="p-8 text-center animate-pulse">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-8 animate-in fade-in zoom-in-95 duration-200">
      <div>
        <SectionTitle>Global Notifications</SectionTitle>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border/50 shadow-sm overflow-hidden">
          <SettingRow
            title="Enable All Notifications"
            description="Master toggle for all WevChat alerts"
            control={<Switch checked={settings.msgNotifs} onChange={(v) => updateSetting('msgNotifs', v)} />}
          />
          <SettingRow
            title="Desktop Notifications"
            description="Show notifications on your computer"
            control={<Switch checked={settings.desktopSound} onChange={(v) => updateSetting('desktopSound', v)} />}
          />
          <SettingRow
            title="Notification Preview"
            description="Show message text in notifications"
            control={
              <select
                className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm outline-none"
                value={settings.notificationPreview}
                onChange={(e) => updateSetting('notificationPreview', e.target.value)}
              >
                <option value="full">Name & Message</option>
                <option value="name">Name Only</option>
                <option value="hidden">Hidden completely</option>
              </select>
            }
          />
        </div>
      </div>

      <div>
        <SectionTitle>Specific Alerts</SectionTitle>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border/50 shadow-sm overflow-hidden">
          <SettingRow
            title="Group Message Notifications"
            control={<Switch checked={settings.groupNotifs} onChange={(v) => updateSetting('groupNotifs', v)} />}
          />
          <SettingRow
            title="Mention Notifications"
            description="Alert when someone @mentions you"
            control={<Switch checked={settings.mentionNotifs || true} onChange={(v) => updateSetting('mentionNotifs', v)} />}
          />
          <SettingRow
            title="Call Notifications"
            control={<Switch checked={settings.callNotifs} onChange={(v) => updateSetting('callNotifs', v)} />}
          />
          <SettingRow
            title="Sound Notifications"
            description="Play sounds for incoming messages"
            control={<Switch checked={settings.vibration} onChange={(v) => updateSetting('vibration', v)} />}
          />
        </div>
      </div>
    </div>
  );
};

const EyeIcon = ({ size, className }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>;

// --- 3. Privacy & Security Panel ---
export const PrivacySecurityPanel = () => {
  const { settings, updateSetting, isLoading } = useWevChatSettings();

  if (isLoading || !settings) return <div className="p-8 text-center animate-pulse">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-8 animate-in fade-in zoom-in-95 duration-200">
      <div>
        <SectionTitle>Visibility</SectionTitle>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border/50 shadow-sm overflow-hidden">
          <SettingRow
            icon={EyeIcon}
            title="Last Seen Visibility"
            description="Who can see when you were last online"
            control={
              <select
                className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm outline-none"
                value={settings.lastSeen ? 'everyone' : 'nobody'}
                onChange={(e) => updateSetting('lastSeen', e.target.value === 'everyone')}
              >
                <option value="everyone">Everyone</option>
                <option value="friends">Friends Only</option>
                <option value="nobody">Nobody</option>
              </select>
            }
          />
          <SettingRow
            icon={Monitor}
            title="Online Status"
            description="Show when you are actively using WevChat"
            control={<Switch checked={settings.onlineStatus} onChange={(v) => updateSetting('onlineStatus', v)} />}
          />
          <SettingRow
            title="Read Receipts"
            description="Let others know you've read their messages"
            control={<Switch checked={settings.readReceipts} onChange={(v) => updateSetting('readReceipts', v)} />}
          />
          <SettingRow
            title="Typing Indicator"
            description="Show when you are typing"
            control={<Switch checked={settings.typingIndicator} onChange={(v) => updateSetting('typingIndicator', v)} />}
          />
        </div>
      </div>

      <div>
        <SectionTitle>Security</SectionTitle>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border/50 shadow-sm overflow-hidden">
          <SettingRow
            icon={Lock}
            title="App Lock"
            description="Require authentication to open WevChat"
            control={<Switch checked={settings.appLock} onChange={(v) => updateSetting('appLock', v)} />}
          />
          <SettingRow
            title="Chat Lock"
            description="Lock individual sensitive conversations"
            control={<Switch checked={settings.chatLock || false} onChange={(v) => updateSetting('chatLock', v)} />}
          />
          <SettingRow
            title="Message Request Permissions"
            description="Who can send you new message requests"
            control={
              <select
                className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm outline-none"
                value={settings.whoCanAddMe}
                onChange={(e) => updateSetting('whoCanAddMe', e.target.value)}
              >
                <option value="everyone">Everyone</option>
                <option value="friends_of_friends">Friends of Friends</option>
                <option value="nobody">Nobody</option>
              </select>
            }
          />
        </div>
      </div>
    </div>
  );
};

// --- 4. Storage Panel ---
export const StoragePanel = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-8 animate-in fade-in zoom-in-95 duration-200">
      <div>
        <SectionTitle>Hybrid Storage Configuration</SectionTitle>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                <HardDrive size={24} />
              </div>
              <div>
                <h4 className="font-bold text-base">Google Drive Connected</h4>
                <p className="text-sm text-muted-foreground mt-1">10.5 GB / 15 GB Used</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/settings?cat=messages_chats&opt=msg_storage')}
              className="px-4 py-2 bg-muted text-foreground font-semibold rounded-xl text-sm hover:bg-muted/80 transition-colors border border-border"
            >
              Manage Connection
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-border/50">
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-2">
              <div className="bg-blue-500 h-full w-[70%]"></div>
            </div>
            <p className="text-xs text-muted-foreground">Automatic Wevsoft Server fallback is active.</p>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle>Storage Policies</SectionTitle>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border/50 shadow-sm overflow-hidden">
          <SettingRow
            title="Automatic Server Fallback"
            description="Upload to Wevsoft Server if Google Drive is full"
            control={<Switch checked={true} onChange={() => { }} />}
          />
          <SettingRow
            title="Per-Conversation Storage Settings"
            description="Override storage locations for specific chats"
            onClick={() => toast('Advanced storage rules opened')}
            control={<span className="text-xs font-semibold text-primary">Configure</span>}
          />
          <SettingRow
            title="Clear Stored Data"
            description="Remove cached files and media to save space"
            onClick={() => toast('Cache cleared')}
            control={<Trash2 size={18} className="text-rose-500" />}
          />
        </div>
      </div>
    </div>
  );
};

// --- 5. Media & Files Panel ---
export const MediaFilesPanel = () => {
  const { settings, updateSetting, isLoading } = useWevChatSettings();

  if (isLoading || !settings) return <div className="p-8 text-center animate-pulse">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-8 animate-in fade-in zoom-in-95 duration-200">
      <div>
        <SectionTitle>Media Download</SectionTitle>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border/50 shadow-sm overflow-hidden">
          <SettingRow
            title="Automatic Media Download"
            description="Download photos and videos automatically"
            control={<Switch checked={settings.autoDownload} onChange={(v) => updateSetting('autoDownload', v)} />}
          />
          <SettingRow
            title="Download Over Mobile Data"
            description="Allow downloads when on a cellular network"
            control={<Switch checked={settings.mobileDataDownload || false} onChange={(v) => updateSetting('mobileDataDownload', v)} />}
          />
          <SettingRow
            title="Auto-Download Documents"
            control={<Switch checked={settings.documentDownload || true} onChange={(v) => updateSetting('documentDownload', v)} />}
          />
        </div>
      </div>

      <div>
        <SectionTitle>Media Quality</SectionTitle>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border/50 shadow-sm overflow-hidden">
          <SettingRow
            title="Image Upload Quality"
            description="Not available yet. Chat uploads are not resized by this setting; your saved choice is kept for when this ships."
            control={
              <select
                className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-60"
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
            }
          />
          <SettingRow
            title="Video Compression"
            description="Compress videos before sending"
            control={<Switch checked={settings.videoCompression || true} onChange={(v) => updateSetting('videoCompression', v)} />}
          />
        </div>
      </div>
    </div>
  );
};

const Sun = ({ size, className }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>;

// --- 6. Appearance Panel ---
export const AppearancePanel = () => {
  const { theme, setTheme } = useStore();
  const { settings, updateSetting } = useWevChatSettings();

  return (
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-8 animate-in fade-in zoom-in-95 duration-200">
      <div>
        <SectionTitle>Theme</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'oled', label: 'OLED', icon: Moon },
            { id: 'system', label: 'System', icon: Monitor }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${theme === t.id
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
            >
              <t.icon size={24} className={theme === t.id ? 'opacity-100' : 'opacity-70'} />
              <span className="font-semibold text-sm">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Chat Customization</SectionTitle>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border/50 shadow-sm overflow-hidden">
          <SettingRow
            icon={ImageIcon}
            title="Chat Wallpaper"
            description="Set default background for all chats"
            onClick={() => toast('Wallpaper picker opened')}
            control={<span className="text-xs font-semibold text-primary">Choose</span>}
          />
          <SettingRow
            icon={Sliders}
            title="Compact Mode"
            description="Reduce spacing between messages"
            control={<Switch checked={settings?.compactMode || false} onChange={(v) => updateSetting('compactMode', v)} />}
          />
          <SettingRow
            title="Message Font Size"
            control={
              <select
                className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm outline-none"
                value={settings?.fontSize || 'medium'}
                onChange={(e) => updateSetting('fontSize', e.target.value)}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            }
          />
        </div>
      </div>
    </div>
  );
};

// --- 7. AI & Auto Reply Panel ---
export const AiAutoReplyPanel = () => {
  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-background">
      <div className="p-4 sm:p-6 pb-2">
        <SectionTitle>AI Assistant & Automation</SectionTitle>
        <p className="text-muted-foreground text-[13px] mb-4">
          Configure WevChat AI, translation, and auto-reply bots. Your API keys are kept secure and never exposed.
        </p>
      </div>
      <div className="flex-1 relative">
        <AutomationShell isOpen={true} onClose={() => { }} variant="inline" />
      </div>
    </div>
  );
};

// --- 8. Blocked Users Panel ---
export const BlockedUsersPanel = () => {
  return (
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-8 animate-in fade-in zoom-in-95 duration-200">
      <div>
        <SectionTitle>Blocked Users List</SectionTitle>
        <div className="bg-card border border-border rounded-2xl p-6 text-center shadow-sm">
          <Ban size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <h4 className="font-bold text-foreground mb-1">No Blocked Users</h4>
          <p className="text-sm text-muted-foreground mb-6">You haven't blocked anyone yet.</p>
          <div className="relative max-w-sm mx-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users to block..."
              className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>
      <div>
        <SectionTitle>Permissions</SectionTitle>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border/50 shadow-sm overflow-hidden">
          <SettingRow
            title="Blocked Message Requests"
            description="Automatically block suspicious requests"
            control={<Switch checked={true} onChange={() => { }} />}
          />
          <SettingRow
            title="Manage Blocked Group Invitations"
            control={<span className="text-xs font-semibold text-primary cursor-pointer">Manage</span>}
          />
        </div>
      </div>
    </div>
  );
};

// --- 9. Data & Export Panel ---
export const DataExportPanel = () => {
  return (
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-8 animate-in fade-in zoom-in-95 duration-200">
      <div>
        <SectionTitle>Export Your Data</SectionTitle>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border/50 shadow-sm overflow-hidden">
          <SettingRow
            icon={Download}
            title="Export Chat History"
            description="Download all your messages and media"
            onClick={() => toast('Export started')}
            control={<span className="text-xs font-semibold text-primary">Export</span>}
          />
          <SettingRow
            title="Backup Chat Data"
            description="Create a secure backup file"
            onClick={() => toast('Backup created')}
            control={<span className="text-xs font-semibold text-primary">Backup</span>}
          />
          <SettingRow
            title="Restore Chat Data"
            description="Restore from a previous backup file"
            onClick={() => toast('Select a file to restore')}
            control={<span className="text-xs font-semibold text-primary">Restore</span>}
          />
        </div>
      </div>

      <div>
        <SectionTitle>Data Management</SectionTitle>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border/50 shadow-sm overflow-hidden">
          <SettingRow
            title="Clear Chat History"
            description="Delete all messages from your device"
            onClick={() => {
              if (confirm("Are you sure you want to clear your chat history?")) toast('History cleared');
            }}
            control={<Trash2 size={18} className="text-rose-500" />}
          />
        </div>
      </div>
    </div>
  );
};

// --- 10. Advanced Panel ---
export const AdvancedPanel = () => {
  const { settings, updateSetting, isLoading } = useWevChatSettings();

  if (isLoading || !settings) return <div className="p-8 text-center animate-pulse">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-8 animate-in fade-in zoom-in-95 duration-200">
      <div>
        <SectionTitle>Network & Sync</SectionTitle>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border/50 shadow-sm overflow-hidden">
          <SettingRow
            title="Data Saver"
            description="Reduce data usage for calls and media"
            control={<Switch checked={settings.dataSaver} onChange={(v) => updateSetting('dataSaver', v)} />}
          />
          <SettingRow
            title="Message Synchronization"
            description="Keep messages in sync across devices"
            control={<Switch checked={settings.syncEnabled} onChange={(v) => updateSetting('syncEnabled', v)} />}
          />
          <SettingRow
            title="Auto-Reconnect"
            description="Automatically retry failed connections"
            control={<Switch checked={settings.autoReconnect || true} onChange={(v) => updateSetting('autoReconnect', v)} />}
          />
        </div>
      </div>

      <div>
        <SectionTitle>Developer</SectionTitle>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border/50 shadow-sm overflow-hidden">
          <SettingRow
            title="Experimental Features"
            description="Enable unstable test features"
            control={<Switch checked={settings.betaFeatures} onChange={(v) => updateSetting('betaFeatures', v)} />}
          />
          <SettingRow
            title="Reset WevChat Settings"
            description="Restore all settings to default values"
            onClick={() => {
              if (confirm("Reset all settings?")) toast('Settings reset to defaults');
            }}
            control={<span className="text-xs font-semibold text-rose-500">Reset</span>}
          />
        </div>
      </div>
    </div>
  );
};

// --- 11. Help & Support Panel ---
export const HelpSupportPanel = () => {
  return (
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-8 animate-in fade-in zoom-in-95 duration-200">
      <div>
        <SectionTitle>Support</SectionTitle>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border/50 shadow-sm overflow-hidden">
          <SettingRow
            icon={HelpCircle}
            title="WevChat Help Center"
            onClick={() => window.open('https://help.wevsoft.com', '_blank')}
            control={<ExternalLink size={16} className="text-muted-foreground" />}
          />
          <SettingRow
            title="Frequently Asked Questions"
            onClick={() => toast('Opened FAQ')}
            control={<ExternalLink size={16} className="text-muted-foreground" />}
          />
          <SettingRow
            title="Contact Support"
            description="Get help from the Wevsoft team"
            onClick={() => toast('Opened Contact Form')}
            control={<ExternalLink size={16} className="text-muted-foreground" />}
          />
        </div>
      </div>

      <div>
        <SectionTitle>Legal</SectionTitle>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border/50 shadow-sm overflow-hidden">
          <SettingRow
            title="Privacy Policy"
            onClick={() => toast('Opened Privacy Policy')}
          />
          <SettingRow
            title="Terms of Service"
            onClick={() => toast('Opened Terms of Service')}
          />
          <div className="p-4 flex items-center justify-center text-sm text-muted-foreground">
            WevChat Version 2.4.0 (Build 942)
          </div>
        </div>
      </div>
    </div>
  );
};
