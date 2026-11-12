import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, LockOpen, X } from 'lucide-react';

interface PrivateChatToggleProps {
  isActive: boolean;
  disabled?: boolean;
  onToggle: (enabled: boolean) => void | Promise<void>;
}

export const PrivateChatToggle: React.FC<PrivateChatToggleProps> = ({
  isActive,
  disabled,
  onToggle,
}) => {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const commit = async (enabled: boolean) => {
    try {
      setBusy(true);
      await onToggle(enabled);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => setConfirming(true)}
        className={`flex items-center justify-center h-9 w-9 rounded-full transition-colors ${
          isActive
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-muted-foreground hover:text-foreground'
        } disabled:opacity-40`}
        title={isActive ? 'Private Chat — On' : 'Private Chat — Off'}
        aria-label={isActive ? 'Private Chat — On' : 'Private Chat — Off'}
        aria-pressed={isActive}
      >
        {isActive ? <Lock size={16} /> : <LockOpen size={16} />}
      </button>

      {confirming && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card text-foreground shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4">
              <div className="flex items-center gap-2 font-extrabold text-sm">
                <Lock size={16} className="text-amber-500" />
                {isActive ? 'Turn off Private Chat?' : 'Turn on Private Chat?'}
              </div>
              <button type="button" onClick={() => setConfirming(false)} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 text-xs text-muted-foreground leading-relaxed space-y-2">
              {isActive ? (
                <p>
                  Turning off ends this private session. All private messages from this session will disappear for both of you. Normal messages stay.
                </p>
              ) : (
                <p>
                  New messages in this chat will be private for this session only. When either of you turns Private Chat off, those messages disappear for both. Earlier messages are not affected.
                </p>
              )}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-extrabold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => commit(!isActive)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white disabled:opacity-50 ${
                  isActive
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-90'
                }`}
              >
                {busy ? 'Updating…' : isActive ? 'Turn off' : 'Turn on Private Chat'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};
