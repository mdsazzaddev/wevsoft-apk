import { useSettingsTr } from '../../i18n/settingsBn';
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Globe, Link2, Unlink, AlertTriangle } from 'lucide-react';

type ConnectedAccountProfile = {
  id: string;
  profileId: string;
  name: string;
  avatarUrl: string | null;
  isActive: boolean;
};

type ConnectedAccount = {
  id: string;
  platformUserId: string | null;
  needsReconnect: boolean;
  connectedAt: string;
  profiles?: ConnectedAccountProfile[];
};

type PlatformIntegration = {
  platform: string;
  environment: string;
  scopes: string;
  isConnected: boolean;
  connection: ConnectedAccount | null;
};

const PLATFORM_META: Record<string, { name: string; icon: string }> = {
  google: { name: 'Google', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg' },
  facebook: { name: 'Facebook', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/facebook/facebook-original.svg' },
  twitter: { name: 'X (Twitter)', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/twitter/twitter-original.svg' },
  linkedin: { name: 'LinkedIn', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linkedin/linkedin-original.svg' },
  tiktok: { name: 'TikTok', icon: 'https://cdn.iconscout.com/icon/free/png-512/free-tiktok-2270636-1891163.png?f=webp&w=256' },
  youtube: { name: 'YouTube', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/youtube/youtube-original.svg' },
};

export default function ConnectedAccountsPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const [platforms, setPlatforms] = useState<PlatformIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPlatforms = React.useCallback(async () => {
    try {
      const res = await fetch('/api/settings/connected-accounts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setPlatforms(await res.json());
      } else {
        toast.error('Failed to load connected accounts');
      }
    } catch {
      toast.error('Network error loading connected accounts');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlatforms();
  }, [fetchPlatforms]);

  const handleConnect = async (platform: string) => {
    setActionLoading(platform);
    try {
      const res = await fetch(`/api/settings/connected-accounts/${platform}/connect`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.url) {
        // Open OAuth popup window
        const popup = window.open(data.url, `oauth_${platform}`, 'width=500,height=600');
        
        // Mock polling for completion since this is a sandbox without real OAuth popup callbacks
        const checkPopup = setInterval(async () => {
          if (popup?.closed || !popup) {
            clearInterval(checkPopup);
            // Refresh to see if it connected
            await fetchPlatforms();
            setActionLoading(null);
          }
        }, 1000);
      } else {
        toast.error(data.error || 'Failed to start connection');
        setActionLoading(null);
      }
    } catch {
      toast.error('Network error starting connection');
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!window.confirm(`Are you sure you want to disconnect ${PLATFORM_META[platform]?.name || platform}?`)) return;
    
    setActionLoading(platform);
    try {
      const res = await fetch(`/api/settings/connected-accounts/${platform}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(`Disconnected ${PLATFORM_META[platform]?.name || platform}`);
        await fetchPlatforms();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to disconnect');
      }
    } catch {
      toast.error('Network error disconnecting');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (platforms.length === 0) {
    return (
      <div className="text-center py-12">
        <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-bold mb-1">{tr('No Integrations Available')}</h3>
        <p className="text-sm text-muted-foreground">{tr('The platform administrator has not enabled any third-party accounts yet.')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-bold">{tr('Connected Accounts')}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Link your external accounts to enable quick sign-in and cross-platform features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((p) => {
          const meta = PLATFORM_META[p.platform] || { name: p.platform, icon: '' };
          const isProcessing = actionLoading === p.platform;
          
          return (
            <div key={p.platform} className="bg-card border rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
              {p.connection?.needsReconnect && (
                <div className="absolute top-0 left-0 right-0 bg-yellow-500/10 text-yellow-600 text-[10px] font-bold px-3 py-1 flex items-center justify-center gap-1 uppercase tracking-wider">
                  <AlertTriangle className="w-3 h-3" /> Needs Reconnect
                </div>
              )}
              
              <div className={`flex items-start justify-between mb-6 ${p.connection?.needsReconnect ? 'mt-4' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted/30 border flex items-center justify-center p-2 shrink-0">
                    <img src={meta.icon} alt={meta.name} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h4 className="font-bold">{meta.name}</h4>
                    {p.isConnected && p.connection?.platformUserId && (
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium truncate max-w-[150px]">
                        ID: {p.connection.platformUserId}
                      </p>
                    )}
                  </div>
                </div>
                
                {p.isConnected ? (
                  <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-green-500/10 text-green-600 border border-green-500/20 shadow-sm animate-in fade-in zoom-in duration-300">
                    Connected
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-muted text-muted-foreground">
                    Not Linked
                  </span>
                )}
              </div>

              {p.isConnected ? (
                <button 
                  onClick={() => handleDisconnect(p.platform)}
                  disabled={isProcessing}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                  Disconnect
                </button>
              ) : (
                <button 
                  onClick={() => handleConnect(p.platform)}
                  disabled={isProcessing}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Connect Account
                </button>
              )}

              {p.isConnected && p.connection?.profiles && p.connection.profiles.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{tr('Connected Pages')}</h4>
                  <div className="space-y-2">
                    {p.connection.profiles.map(profile => (
                      <div key={profile.id} className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5">
                        <div className="flex items-center gap-3">
                          {profile.avatarUrl ? (
                            <img src={profile.avatarUrl} alt={profile.name} className="w-8 h-8 rounded-full border border-border object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary text-xs font-bold">{profile.name.charAt(0)}</span>
                            </div>
                          )}
                          <span className="text-sm font-medium text-foreground">{profile.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${profile.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <span className="text-xs text-muted-foreground">{profile.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
