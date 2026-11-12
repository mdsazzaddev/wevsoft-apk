/**
 * Phantom anonymous profile — device-local only.
 * There is no server-side Phantom identity; this page shows the shared anonymous
 * persona plus bookmarks/reactions stored on this device.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bookmark, EyeOff, Heart, Info, KeyRound, PenSquare, Shield, ShieldCheck, Zap,
} from 'lucide-react';
import './phantom-ui.css';
import { GhostAvatar } from './PhantomArt';

const SAVED_KEY = 'phantom.saved';
const REACTED_KEY = 'phantom.reacted';
const SETTINGS_KEY = 'phantom.settings';

function readSet(key: string) {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(key) || '[]'));
  } catch {
    return new Set<string>();
  }
}

export default function PhantomProfilePage() {
  const nav = useNavigate();
  const [saved] = useState(() => readSet(SAVED_KEY));
  const [reacted] = useState(() => readSet(REACTED_KEY));
  const lightMode = useMemo(() => {
    try {
      return !!(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}').lightMode);
    } catch {
      return false;
    }
  }, []);

  const cls = ['ph-root', 'ph-create-root', lightMode ? 'ph-light' : ''].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <header className="ph-create-top">
        <button type="button" className="ph-icon-btn" aria-label="Back to Phantom" title="Back" onClick={() => nav('/phantom')}>
          <ArrowLeft size={16} />
        </button>
        <div className="ph-create-title">
          <b>Anonymous Profile</b>
          <small>Phantom · Zero identity</small>
        </div>
      </header>

      <main className="ph-create-main ph-profile-main">
        <section className="ph-card ph-profile-hero">
          <div className="ph-profile-avatar-wrap">
            <GhostAvatar size={88} />
            <span className="ph-profile-badge"><ShieldCheck size={11} /> Anonymous</span>
          </div>
          <h1>Phantom</h1>
          <p className="ph-profile-handle">@anonymous · Incognito Mode</p>
          <p className="ph-profile-bio">
            This is not a personal account. Every Phantom post uses a random alias and is owned only by its PIN.
            Wevsoft stores no author id, no profile history, and no link between your Wevsoft login and what you publish here.
          </p>
          <div className="ph-profile-actions">
            <button type="button" className="ph-btn-red" onClick={() => nav('/phantom/create')}>
              <PenSquare size={13} /> Create Post
            </button>
            <button type="button" className="ph-small-btn" onClick={() => nav('/phantom')}>
              Back to Feed
            </button>
          </div>
        </section>

        <section className="ph-card ph-rcard">
          <h5><Zap size={12} /> On this device</h5>
          <div className="ph-id-stats ph-profile-stats">
            <div><b>{saved.size}</b><small>Saved here</small></div>
            <div><b>{reacted.size}</b><small>Reacted here</small></div>
            <div><b>0</b><small>Author data</small></div>
          </div>
          <p className="ph-muted" style={{ fontSize: 11, margin: '8px 0 0', lineHeight: 1.45 }}>
            Saved posts and reactions stay in this browser only. They are never synced to a Phantom account, because none exists.
          </p>
        </section>

        <section className="ph-card ph-rcard">
          <h5><EyeOff size={12} /> What anonymity means</h5>
          <ul className="ph-profile-list">
            <li><Shield size={13} className="ph-red" /> No user id, IP, or session is stored on Phantom posts</li>
            <li><KeyRound size={13} className="ph-red" /> Only your PIN can edit or delete a post later</li>
            <li><Bookmark size={13} className="ph-red" /> Bookmarks are local to this device</li>
            <li><Heart size={13} className="ph-red" /> Reactions are counted publicly, but never tied to you</li>
          </ul>
          <button type="button" className="ph-wide-btn" onClick={() => nav('/phantom')}>
            <Info size={13} /> Open Phantom feed →
          </button>
        </section>
      </main>
    </div>
  );
}
