import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import { getSavedAccounts, removeSavedAccount, type SavedAccount } from '../lib/savedAccounts';
import UserAvatar from './UserAvatar';
import SignedOutAccountsList from './account/SignedOutAccountsList';
import { useOverlayBack } from '../hooks/useOverlayBack';

interface SwitchAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SwitchAccountModal({ isOpen, onClose }: SwitchAccountModalProps) {
  useOverlayBack(isOpen, onClose);
  const user = useStore((state) => state.user);
  const setAuth = useStore((state) => state.setAuth);
  const beginAddAccount = useStore((state) => state.beginAddAccount);
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (isOpen) setAccounts(getSavedAccounts());
  }, [isOpen]);

  const switchTo = (account: SavedAccount) => {
    if (account.id === user?.id) {
      onClose();
      return;
    }
    setBusyId(account.id);
    setAuth(account.token, {
      id: account.id,
      name: account.name,
      email: account.email || '',
      username: account.username || undefined,
      avatar: account.avatar || undefined,
      role: account.role || undefined,
      theme: account.theme || 'dark',
    });
    toast.success(`Switched to ${account.name}`);
    window.location.assign('/feed');
  };

  const removeAccount = (event: React.MouseEvent, account: SavedAccount) => {
    event.stopPropagation();
    if (account.id === user?.id) {
      toast.error('You cannot remove the account you are using. Log out first.');
      return;
    }
    setAccounts(removeSavedAccount(account.id));
    toast.success(`Removed ${account.name}`);
  };

  const addAnother = () => {
    beginAddAccount();
    window.location.assign('/auth?add_account=1');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full sm:max-w-md max-h-[85vh] bg-background/95 backdrop-blur-2xl border border-border/80 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <RefreshCw size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Switch Account</h3>
                  <p className="text-xs text-muted-foreground">Choose a saved account or add another.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {accounts.length === 0 && (
                <p className="text-sm text-muted-foreground px-2 py-6 text-center">
                  No other accounts saved on this device yet.
                </p>
              )}

              {accounts.map((account) => {
                const isCurrent = account.id === user?.id;
                return (
                  <div
                    key={account.id}
                    className={`w-full flex items-center gap-2 rounded-2xl px-2 py-2 ${
                      isCurrent ? 'bg-primary/10 border border-primary/20' : 'border border-transparent hover:bg-muted'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={busyId === account.id}
                      onClick={() => switchTo(account)}
                      className="min-w-0 flex-1 flex items-center gap-3 rounded-xl px-1 py-1 text-left"
                    >
                      <UserAvatar user={account} className="w-11 h-11 text-sm" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">{account.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {account.username ? `@${account.username}` : account.email || 'Saved account'}
                        </div>
                      </div>
                      {isCurrent && <Check size={18} className="text-primary shrink-0" />}
                    </button>
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={(event) => removeAccount(event, account)}
                        className="p-2 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                        title="Remove from this device"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
              <SignedOutAccountsList onPick={(a) => { beginAddAccount(); window.location.assign('/auth?add_account=1&login_hint=' + encodeURIComponent(a.email || a.username || '')); }} />
            </div>

            <div className="p-4 border-t border-border">
              <button
                type="button"
                onClick={addAnother}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold py-3 hover:bg-primary/90 transition-colors"
              >
                <Plus size={18} />
                Add another account
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
