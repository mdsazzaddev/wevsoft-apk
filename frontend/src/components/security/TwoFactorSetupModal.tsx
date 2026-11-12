import React, { useState, useEffect } from 'react';
import { X, Shield, Copy, Check, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'setup' | 'verify' | 'success'>('setup');
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setStep('setup');
      setVerificationCode('');
      setError('');
      setBackupCodes([]);
      // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
      fetchSetupData();
    }
  }, [isOpen]);

  const fetchSetupData = async () => {
    try {
      setLoading(true);
      const res = await api.post('/2fa/setup');
      setSetupData(res.data);
      setStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initialize 2FA setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code.');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      const res = await api.post('/2fa/enable', { code: verificationCode });
      setBackupCodes(res.data.backupCodes || []);
      setStep('success');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 text-foreground font-bold">
            <Shield className="w-5 h-5 text-primary" />
            Two-Factor Authentication
          </div>
          {step !== 'success' && (
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-500 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'setup' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-sm text-muted-foreground">Preparing setup...</p>
            </div>
          )}

          {step === 'verify' && setupData && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="font-bold text-lg">Scan QR Code</h3>
                <p className="text-sm text-muted-foreground">Open your authenticator app (e.g. Google Authenticator, Authy) and scan this QR code.</p>
              </div>
              
              <div className="flex justify-center bg-white p-4 rounded-xl border border-border w-fit mx-auto">
                <img src={setupData.qrCodeDataUrl} alt="2FA QR Code" className="w-48 h-48" />
              </div>

              <div className="space-y-1 text-center">
                <p className="text-xs text-muted-foreground">Or enter this secret manually:</p>
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{setupData.secret}</code>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Verification Code</label>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-background border border-border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-[0.5em] font-mono text-lg"
                />
              </div>

              <button
                onClick={handleVerify}
                disabled={loading || verificationCode.length !== 6}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8" />
              </div>
              
              <h3 className="font-bold text-2xl">2FA Enabled!</h3>
              <p className="text-sm text-muted-foreground">Your account is now more secure. Please save these backup codes in a safe place. You will need them if you lose access to your authenticator app.</p>

              <div className="bg-muted rounded-xl p-4 border border-border text-left relative group">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes.map((code, idx) => (
                    <div key={idx} className="tracking-wider">{code}</div>
                  ))}
                </div>
                <button
                  onClick={copyBackupCodes}
                  className="absolute top-2 right-2 p-2 bg-background border border-border rounded-lg shadow-sm hover:bg-muted transition-colors"
                  title="Copy codes"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                I have saved these codes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
