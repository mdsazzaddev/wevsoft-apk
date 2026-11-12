import { useSettingsTr } from '../../i18n/settingsBn';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Fingerprint, Smartphone, Trash2 } from 'lucide-react';
import BiometricPrompt from '../auth/BiometricPrompt';

export default function SecuritySettingsTab() {
  const tr = useSettingsTr();
  const [devices, setDevices] = useState<any[]>([]);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/settings/account', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Assuming backend returns authenticators as part of account settings
        setDevices(data.authenticators || []);
      }
    } catch (err) {
      console.error('Failed to fetch devices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    fetchDevices();
  }, []);

  const revokeDevice = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this passkey? You will not be able to log in with it anymore.')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/auth/webauthn/authenticators/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        toast.success(tr('Passkey revoked'));
        fetchDevices();
      } else {
        toast.error(tr('Failed to revoke passkey'));
      }
    } catch (err) {
      toast.error(tr('An error occurred'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{tr('Biometric Login (Passkeys)')}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {tr('Use Face ID, Touch ID, or Windows Hello to log in without a password.')}
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-primary" />
            <span className="font-medium">{tr('Registered Passkeys')}</span>
          </div>
          <button 
            onClick={() => setIsPromptOpen(true)}
            className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-full font-medium"
          >
            {tr('Add Passkey')}
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">{tr('Loading...')}</div>
        ) : devices.length === 0 ? (
          <div className="text-sm text-muted-foreground">{tr('No passkeys registered yet.')}</div>
        ) : (
          <div className="space-y-3">
            {devices.map((device, i) => (
              <div key={device.credentialID || i} className="flex items-center justify-between bg-background p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{device.name || 'Device'}</p>
                    <p className="text-xs text-muted-foreground">Added on {new Date(device.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => revokeDevice(device.credentialID)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                  title={tr('Revoke passkey')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <BiometricPrompt
        isOpen={isPromptOpen}
        mode="register"
        onSuccess={() => {
          setIsPromptOpen(false);
          toast.success(tr('Passkey added successfully'));
          fetchDevices();
        }}
        onClose={() => setIsPromptOpen(false)}
      />
    </div>
  );
}
