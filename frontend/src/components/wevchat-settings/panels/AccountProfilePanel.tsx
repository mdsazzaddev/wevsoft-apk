import React, { useState } from 'react';
import { User, LogOut, Trash2, Globe, Shield, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWevChatSettings } from '../../../hooks/useWevChatSettings';
import { useAuthStore } from '../../../stores/authStore';

export const AccountProfilePanel: React.FC = () => {
  const navigate = useNavigate();
  const [level, setLevel] = useState<'basic' | 'advanced' | 'expert'>('basic');
  const { settings, updateSetting, isLoading } = useWevChatSettings();
  const logout = useAuthStore((s) => s.logout);
  const beginAddAccount = useAuthStore((s) => s.beginAddAccount);

  if (isLoading || !settings) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Loading settings...</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full">
      <div className="mb-6 border-b border-border pb-4">
        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
          <User size={18} className="text-primary" />
          Account & Profile
        </h3>
        <p className="text-muted-foreground text-sm">Manage your personal information and WevChat account connection.</p>
        
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
          <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Public Info</h4>
          <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10 text-blue-500"><User size={16} /></div>
                <div>
                  <p className="text-sm font-medium">Display Name & Bio</p>
                  <p className="text-xs text-muted-foreground">Change how you appear in WevChat</p>
                </div>
              </div>
              <button className="px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded hover:bg-blue-500/20 transition-colors">
                Edit Profile
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10 text-green-500"><Globe size={16} /></div>
                <div>
                  <p className="text-sm font-medium">Profile Visibility</p>
                  <p className="text-xs text-muted-foreground">Who can see your WevChat profile</p>
                </div>
              </div>
              <select 
                className="bg-background border border-border rounded-md px-2 py-1 text-sm outline-none"
                value={settings.profileVisibility}
                onChange={(e) => updateSetting('profileVisibility', e.target.value)}
              >
                <option value="everyone">Everyone</option>
                <option value="friends">Friends</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>
          </div>
        </section>

        {/* Advanced Settings */}
        {(level === 'advanced' || level === 'expert') && (
          <section className="animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider mt-6">Connections & Identity</h4>
            <div className="bg-muted/10 border border-border rounded-xl divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-500"><Shield size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Connected WebSoft Profile</p>
                    <p className="text-xs text-muted-foreground">Linked to your main social account</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded hover:bg-indigo-500/20 transition-colors"
                >
                  Manage Link
                </button>
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-500/10 text-orange-500"><RefreshCcw size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">Switch WevChat Account</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    beginAddAccount();
                    navigate('/auth');
                  }}
                  className="px-3 py-1.5 border border-border text-foreground text-xs font-semibold rounded hover:bg-muted transition-colors"
                >
                  Add Account
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Expert Settings */}
        {level === 'expert' && (
          <section className="animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-semibold text-red-500 mb-3 uppercase tracking-wider mt-6">Danger Zone</h4>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl divide-y divide-red-500/10">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-500/10 text-red-500"><LogOut size={16} /></div>
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Log out of all sessions</p>
                    <p className="text-xs text-red-600/70 dark:text-red-400/70">Sign out from all devices</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/auth');
                  }}
                  className="px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold rounded hover:bg-red-500/20 transition-colors"
                >
                  Log Out
                </button>
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-500/10 text-red-500"><Trash2 size={16} /></div>
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Delete WevChat Data</p>
                    <p className="text-xs text-red-600/70 dark:text-red-400/70">Permanently delete messages</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete all cached WevChat local data? This action cannot be undone.')) {
                      localStorage.removeItem('wevchat_storage_mode');
                      window.location.reload();
                    }
                  }}
                  className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-600 transition-colors"
                >
                  Delete Data
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
