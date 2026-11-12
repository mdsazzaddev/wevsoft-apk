import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import toast from 'react-hot-toast';

export interface WevChatSettings {
  msgNotifs: boolean;
  groupNotifs: boolean;
  callNotifs: boolean;
  reactionNotifs: boolean;
  desktopSound: boolean;
  vibration: boolean;
  notificationPreview: string;
  notificationSound: string;
  callRingtone: string;

  enterToSend: boolean;
  autoDownload: boolean;
  hardwareAccel: boolean;
  chatWallpaper: string;
  mediaUploadQuality: string;
  disappearingTimer: string;

  privateChatEnabled: boolean;
  readReceipts: boolean;
  typingIndicator: boolean;
  lastSeen: boolean;
  onlineStatus: boolean;
  copyProtection: boolean;
  screenshotAlerts: boolean;
  incognitoMode: boolean;
  appLock: boolean;
  encryptionMode: string;

  whoCanAddMe: string;
  msgRequests: boolean;
  pinnedChatsLimit: number;

  syncEnabled: boolean;
  syncSettings: boolean;
  chatBackup: string;
  dataSaver: boolean;
  dataSaverMode: boolean;

  betaFeatures: boolean;
  joinBeta: boolean;
  newUi: boolean;
  newChatUi: boolean;
  
  profileVisibility: string;
  [key: string]: any;
}

export function useWevChatSettings() {
  const { token } = useStore();
  const [settings, setSettings] = useState<WevChatSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setIsLoading(false);
      return;
    }
    
    let isMounted = true;
    setIsLoading(true);
    
    fetch('/api/wevchat/settings', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch settings');
        return res.json();
      })
      .then(data => {
        if (isMounted) {
          setSettings(data);
        }
      })
      .catch(err => {
        console.error('Error fetching WevChat settings:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
      
    return () => {
      isMounted = false;
    };
  }, [token]);

  const updateSetting = useCallback(async (key: keyof WevChatSettings, value: any) => {
    if (!token) return;
    
    // Optimistic update
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
    setIsSaving(prev => ({ ...prev, [key]: true }));

    try {
      const res = await fetch('/api/wevchat/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [key]: value })
      });
      
      if (!res.ok) {
        throw new Error('Failed to update setting');
      }
    } catch (err) {
      console.error('Error updating WevChat setting:', err);
      toast.error('Failed to save setting');
    } finally {
      setIsSaving(prev => ({ ...prev, [key]: false }));
    }
  }, [token]);

  return {
    settings,
    isLoading,
    isSaving,
    updateSetting
  };
}
