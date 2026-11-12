import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';

interface RecoveryCodePromptProps {
  isOpen: boolean;
  onSuccess: (token: string, user: any) => void;
  onCancel: () => void;
}

export default function RecoveryCodePrompt({ isOpen, onSuccess, onCancel }: RecoveryCodePromptProps) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/webauthn/recovery/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (!res.ok) {
        throw new Error('Invalid recovery code');
      }

      const data = await res.json();
      onSuccess(data.token, data.user);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Verification failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
      <div className="bg-background text-foreground rounded-3xl shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 opacity-100">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <KeyRound className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold">Use Recovery Code</h3>
          <p className="text-muted-foreground text-sm">
            Enter one of your 10-character backup codes to log in.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. A1B2C3D4E5"
                className="w-full bg-secondary text-secondary-foreground px-4 py-3 rounded-xl border border-transparent focus:border-primary outline-none text-center tracking-widest font-mono uppercase"
                maxLength={10}
                disabled={status === 'loading'}
              />
              {status === 'error' && (
                <p className="text-red-500 text-xs mt-2">{errorMessage}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={status === 'loading'}
                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === 'loading' || code.length < 5}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {status === 'loading' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Verify'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
