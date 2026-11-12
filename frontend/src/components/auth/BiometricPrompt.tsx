import React, { useEffect, useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

interface BiometricPromptProps {
  isOpen: boolean;
  mode: 'register' | 'login' | 'intercept-register';
  username?: string; // Used for login discovery
  onSuccess: (token?: string, user?: any) => void;
  onClose: () => void;
  onFallback?: () => void;
}

export default function BiometricPrompt({
  isOpen,
  mode,
  username,
  onSuccess,
  onClose,
  onFallback,
}: BiometricPromptProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setStatus('loading');
      setErrorMessage('');
      // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
      handleWebAuthn();
    } else {
      setStatus('idle');
    }
  }, [isOpen, mode]);

  const handleWebAuthn = async () => {
    try {
      if (mode === 'register' || mode === 'intercept-register') {
        // 1. Fetch options
        const generateRes = await fetch('/api/auth/webauthn/register/generate', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        });
        if (!generateRes.ok) throw new Error('Failed to generate registration options');
        const options = await generateRes.json();

        // 2. Browser interaction
        const attResp = await startRegistration(options);

        // 3. Verify
        const verifyRes = await fetch('/api/auth/webauthn/register/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(attResp),
        });

        if (!verifyRes.ok) throw new Error('Verification failed');
        setStatus('success');
        setTimeout(() => onSuccess(), 1500);

      } else {
        // Login mode
        const generateRes = await fetch('/api/auth/webauthn/login/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        });
        
        if (!generateRes.ok) throw new Error('Failed to generate authentication options');
        const { options, sessionId } = await generateRes.json();

        const asseResp = await startAuthentication(options);

        const verifyRes = await fetch('/api/auth/webauthn/login/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ response: asseResp, sessionId }),
        });

        if (!verifyRes.ok) throw new Error('Authentication failed');
        const data = await verifyRes.json();
        
        setStatus('success');
        setTimeout(() => onSuccess(data.token, data.user), 1500);
      }
    } catch (err: any) {
      console.error('WebAuthn Error:', err);
      setStatus('error');
      if (err.name === 'NotAllowedError') {
        setErrorMessage('Biometric prompt cancelled.');
      } else {
        setErrorMessage(err.message || 'An error occurred.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
      <div className="bg-background text-foreground rounded-3xl shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 opacity-100">
        
        <div className="text-center space-y-4">
          {status === 'loading' && (
            <>
              <div className="mx-auto w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <h3 className="text-xl font-semibold">
                {mode === 'intercept-register' ? 'New Device Detected' : 'Verify Identity'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {mode === 'intercept-register' 
                  ? "We see you are on a new device. Add this device's Face ID/Fingerprint for future logins?"
                  : "Please use your device's biometric sensor."}
              </p>
              
              {mode === 'login' && onFallback && (
                <div className="pt-4">
                  <button 
                    onClick={onFallback}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Lost your device? Try another way
                  </button>
                </div>
              )}
              {mode === 'intercept-register' && (
                <div className="pt-4">
                  <button 
                    onClick={onClose}
                    className="text-sm font-semibold text-muted-foreground hover:underline"
                  >
                    Not Now
                  </button>
                </div>
              )}
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 className="text-xl font-semibold">Success!</h3>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </div>
              <h3 className="text-xl font-semibold">Error</h3>
              <p className="text-muted-foreground text-sm">{errorMessage}</p>
              <div className="pt-4 flex gap-3">
                <button 
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleWebAuthn()}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
                >
                  Retry
                </button>
              </div>
            </>
          )}
        </div>
        
      </div>
    </div>
  );
}
