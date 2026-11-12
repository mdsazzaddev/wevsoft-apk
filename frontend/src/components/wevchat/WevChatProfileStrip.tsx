import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Settings, User } from 'lucide-react';
import { useStore } from '../../store';
import { WevChatSettingsModal } from '../wevchat-settings/WevChatSettingsModal';
import UserAvatar from '../UserAvatar';

/**
 * Inbox header: avatar + display name on the left; ⋯ menu (settings / profile)
 * + optional compose / window controls on the right.
 */
export const WevChatProfileStrip: React.FC<{ trailing?: React.ReactNode; actions?: React.ReactNode }> = ({
  trailing,
  actions,
}) => {
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (!user) return null;

  const displayName = (user.name || user.username || 'You').trim() || 'You';
  const handle = (user.username || (user as { profileSlug?: string }).profileSlug || 'you') as string;

  return (
    <>
      <div className="flex items-center gap-2.5 min-w-0 w-full">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="shrink-0 size-10 rounded-full overflow-hidden p-0 ring-2 ring-border/50 hover:ring-primary/35 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Your profile (@${handle})`}
          title={`@${handle}`}
        >
          <UserAvatar user={user} className="size-10 text-sm" decorative />
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-bold tracking-tight text-foreground leading-tight truncate">
            {displayName}
          </p>
        </div>

        <div className="no-drag flex items-center gap-1 shrink-0">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="h-9 w-9 flex items-center justify-center text-foreground hover:text-primary active:scale-95 transition-colors"
              title="More"
              aria-label="More options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <MoreHorizontal size={20} strokeWidth={2.1} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1.5 z-50 min-w-[180px] rounded-xl border border-border bg-card shadow-lg py-1 overflow-hidden"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowSettings(true);
                  }}
                >
                  <Settings size={16} strokeWidth={1.9} className="text-muted-foreground shrink-0" />
                  Settings
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/profile');
                  }}
                >
                  <User size={16} strokeWidth={1.9} className="text-muted-foreground shrink-0" />
                  Your profile
                </button>
              </div>
            )}
          </div>
          {actions}
          {trailing}
        </div>
      </div>

      <WevChatSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
};
