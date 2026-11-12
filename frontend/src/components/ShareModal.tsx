/**
 * Universal share dialog (Wevsoft "Space Mode Share" redesign).
 *
 * Rules this file follows on purpose:
 * - No Repost, no "send to friends" list, no friend avatars.
 * - Every visible destination really works in this environment; anything the
 *   platform cannot do (Bluetooth, Nearby Share, app detection) is not shown.
 * - "Share to feed" (caption on top of the shared post, like Facebook) works for
 *   posts and reels in both modes. Personal mode picks an audience; Space Mode
 *   publishes AS the active Space (server checks post access) and is always Public.
 * - Visibility is only shown when the content data carries it.
 */
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ChevronLeft, ChevronDown, Link2, Check, QrCode, MoreHorizontal, Mail, Smile, Globe2, Users, Lock,
  Newspaper, Search, Download, Smartphone, MessageSquare, Loader2, Copy,
} from 'lucide-react';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import { useOverlayBack } from '../hooks/useOverlayBack';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';
import UserAvatar from './UserAvatar';
import type { SharePreview } from './share/ShareContentPreview';

/* ------------------------------------------------------------------ icons */
type IconProps = { size?: number };
const Svg = ({ size = 22, children, fill = 'currentColor' }: { size?: number; children: React.ReactNode; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} aria-hidden="true" focusable="false">{children}</svg>
);
const FacebookIcon = ({ size }: IconProps) => (
  <Svg size={size}><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971h-1.513c-1.491 0-1.956.931-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" /></Svg>
);
const WhatsAppIcon = ({ size }: IconProps) => (
  <Svg size={size}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" /></Svg>
);
const TelegramIcon = ({ size }: IconProps) => (
  <Svg size={size}><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></Svg>
);
const MessengerIcon = ({ size }: IconProps) => (
  <Svg size={size}><path d="M.001 11.639C.001 4.949 5.241 0 12.001 0S24 4.95 24 11.639c0 6.689-5.24 11.638-12 11.638-1.21 0-2.38-.16-3.47-.46a.96.96 0 0 0-.64.05l-2.39 1.05a.96.96 0 0 1-1.35-.85l-.07-2.14a.97.97 0 0 0-.32-.68A11.39 11.389 0 0 1 .002 11.64zm8.32-2.19-3.52 5.6c-.35.53.32 1.139.82.75l3.79-2.87c.26-.2.6-.2.87 0l2.8 2.1c.84.63 2.04.4 2.6-.48l3.52-5.6c.35-.53-.32-1.13-.82-.75l-3.79 2.87c-.25.2-.6.2-.86 0l-2.8-2.1a1.8 1.8 0 0 0-2.61.48z" /></Svg>
);
const DiscordIcon = ({ size }: IconProps) => (
  <Svg size={size}><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></Svg>
);
const XIcon = ({ size }: IconProps) => (
  <Svg size={size}><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" /></Svg>
);
const RedditIcon = ({ size }: IconProps) => (
  <Svg size={size}><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.11 3.11 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" /></Svg>
);
const LinkedInIcon = ({ size }: IconProps) => (
  <Svg size={size}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></Svg>
);
const PinterestIcon = ({ size }: IconProps) => (
  <Svg size={size}><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" /></Svg>
);
const TumblrIcon = ({ size }: IconProps) => (
  <Svg size={size}><path d="M14.563 24c-5.093 0-7.031-3.756-7.031-6.411V9.747H5.116V6.648c3.63-1.313 4.512-4.596 4.71-6.469C9.84.051 9.941 0 9.999 0h3.517v6.114h4.801v3.633h-4.82v7.47c.016 1.001.375 2.371 2.207 2.371h.09c.631-.02 1.486-.205 1.936-.419l1.156 3.425c-.436.636-2.4 1.374-4.156 1.404h-.178z" /></Svg>
);
const SlackIcon = ({ size = 22 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 1 1-2.52-2.523h2.52v2.523zm1.271 0a2.528 2.528 0 0 1 5.056 0v6.313a2.528 2.528 0 1 1-5.056 0v-6.313z" />
    <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 1 1 2.523-2.52v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 0 5.056H2.522a2.528 2.528 0 0 1 0-5.056h6.312z" />
    <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 1 1 2.522 2.523h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-5.057 0V2.522a2.528 2.528 0 1 1 5.057 0v6.312z" />
    <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 1 1-2.523 2.522v-2.522h2.523zm0-1.27a2.528 2.528 0 0 1 0-5.057h6.313a2.528 2.528 0 1 1 0 5.057h-6.313z" />
  </svg>
);
const GmailIcon = ({ size = 22 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
  </svg>
);

/* ------------------------------------------------------------- helpers */
const enc = encodeURIComponent;
const isMobileUA = () => typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const FB_APP_ID: string = ((import.meta as any).env?.VITE_FACEBOOK_APP_ID as string) || '';

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function openWindow(href: string) {
  if (href.startsWith('mailto:') || href.startsWith('sms:')) {
    window.location.href = href;
    return true;
  }
  const w = window.open(href, '_blank', 'noopener,noreferrer,width=680,height=640');
  if (!w) {
    // Popup blocked: fall back to a normal new tab via a link click.
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  return true;
}

type Section = 'messaging' | 'social' | 'email' | 'device';
interface Dest {
  id: string;
  label: string;
  hint?: string;
  color: string; // brand color for icon
  tint: string; // container background
  Icon: React.ComponentType<IconProps>;
  section: Section;
  /** Shown in the main grid (otherwise only inside More apps). */
  primary?: boolean;
  run: () => unknown;
}

const AUDIENCES = [
  { id: 'public', label: 'Public', hint: 'Anyone on Wevsoft', Icon: Globe2 },
  { id: 'friends', label: 'Friends', hint: 'Your friends only', Icon: Users },
  { id: 'private', label: 'Only me', hint: 'Only you can see it', Icon: Lock },
] as const;
const PRIVACY_LABEL: Record<string, string> = { public: 'Public', friends: 'Friends', followers: 'Followers', private: 'Only me', custom: 'Restricted', close_friends: 'Close friends', group: 'Group members' };
const EMOJIS = ['😀', '😂', '😍', '🥰', '😎', '🤩', '🙌', '👏', '🔥', '💯', '🎉', '❤️', '👍', '🙏', '✨', '🚀', '😮', '😢', '🤔', '💡'];

function useIsMobile() {
  const q = '(max-width: 639px)';
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(q).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(q);
    const sync = () => setM(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);
  return m;
}

/* ----------------------------------------------------------- component */
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  targetType?: string;
  targetId?: string | null;
  preview?: SharePreview | null;
  onSharedToFeed?: () => void;
  /** Accepted for backward compatibility; Repost was removed from the share dialog. */
  allowRepost?: boolean;
  /** Raise above full-screen overlays such as the post viewer (default: z-[100] from the class). */
  overlayZIndex?: number;
  isReposted?: boolean;
  onRepostChange?: (reposted: boolean, boostsCount?: number) => void;
}

type View = 'main' | 'more' | 'qr';

export default function ShareModal({
  isOpen, onClose, url, title = 'Share this link', targetType, targetId, preview = null, onSharedToFeed, overlayZIndex,
}: ShareModalProps) {
  useOverlayBack(isOpen, onClose);
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const { isSpaceMode, active: activeIdentity } = useSpaceIdentities();
  const isMobile = useIsMobile();
  // eslint-disable-next-line react-hooks/use-memo -- computed dependency kept as-is (existing behavior)
  const mobileUA = useMemo(isMobileUA, []);
  const canNativeShare = typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function';

  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const inFlight = useRef(false);

  const [view, setView] = useState<View>('main');
  const [copied, setCopied] = useState(false);
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState<string>('friends');
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [query, setQuery] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
  const domain = useMemo(() => { try { return new URL(fullUrl).host; } catch { return fullUrl; } }, [fullUrl]);
  const displayUrl = fullUrl.replace(/^https?:\/\//i, '');
  const shareText = title && title !== 'Share' ? title : '';
  const visibility = preview?.privacy ? PRIVACY_LABEL[preview.privacy] || null : null;

  // Feed publishing is only real for personal accounts sharing a post or reel.
  const spaceActor = isSpaceMode && activeIdentity?.kind === 'space' && activeIdentity.id ? activeIdentity : null;
  const feedMode = Boolean(token && user && targetId && (targetType === 'post' || targetType === 'reel') && (!isSpaceMode || spaceActor));
  const actorName = spaceActor ? spaceActor.name : user?.name || 'You';
  const actorAvatarUser = spaceActor ? { id: String(spaceActor.id), name: spaceActor.name, avatar: (spaceActor as any).avatar || null } : user || { name: 'You' };

  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setView('main'); setCaption(''); setPrivacy('friends'); setAudienceOpen(false); setEmojiOpen(false);
      setQuery(''); setCopied(false); setSharing(false); setQr(null); setQrError(null);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    return () => { const o = openerRef.current; if (o) window.setTimeout(() => o.focus?.(), 0); };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (audienceOpen || emojiOpen) { setAudienceOpen(false); setEmojiOpen(false); return; }
        if (view !== 'main') setView('main'); else onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])',
        ));
        if (!nodes.length) return;
        const first = nodes[0]; const last = nodes[nodes.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (!panelRef.current.contains(active)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, onClose, view, audienceOpen, emojiOpen]);

  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const t = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(view === 'more' ? 'input[type="search"]' : '[data-autofocus]')
        || panelRef.current?.querySelector<HTMLElement>('button');
      target?.focus();
    }, 30);
    return () => window.clearTimeout(t);
  }, [isOpen, view]);

  /* QR is generated locally from the canonical URL. */
  useEffect(() => {
    if (view !== 'qr' || qr) return;
    let cancelled = false;
    QRCode.toDataURL(fullUrl, { width: 640, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } })
      .then((d) => { if (!cancelled) setQr(d); })
      .catch((e) => { if (!cancelled) setQrError(e?.message || 'Could not create the QR code'); });
    return () => { cancelled = true; };
  }, [view, qr, fullUrl]);

  const doCopy = useCallback(async (quiet = false) => {
    const ok = await copyText(fullUrl);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      if (!quiet) toast.success('Link copied');
    } else {
      toast.error('Could not copy. Select the link and copy it manually.');
    }
    return ok;
  }, [fullUrl]);

  const copyThenOpen = useCallback(async (href: string, app: string) => {
    const ok = await doCopy(true);
    toast.success(ok ? `Link copied — paste it in ${app}` : `Opening ${app}`);
    openWindow(href);
  }, [doCopy]);

  const nativeShare = useCallback(async () => {
    try {
      await (navigator as any).share({ title: shareText || undefined, text: shareText || undefined, url: fullUrl });
      toast.success('Shared');
      onClose();
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error('Your device could not share this link');
    }
  }, [fullUrl, shareText, onClose]);

  const destinations: Dest[] = useMemo(() => {
    const t = shareText;
    const withText = t ? `${t} ${fullUrl}` : fullUrl;
    const list: Dest[] = [
      { id: 'facebook', label: 'Facebook', color: '#1877F2', tint: 'bg-[#1877F2]/10', Icon: FacebookIcon, section: 'social', primary: true,
        run: () => openWindow(`https://www.facebook.com/sharer/sharer.php?u=${enc(fullUrl)}`) },
      { id: 'whatsapp', label: 'WhatsApp', color: '#25D366', tint: 'bg-[#25D366]/10', Icon: WhatsAppIcon, section: 'messaging', primary: true,
        run: () => openWindow(`https://wa.me/?text=${enc(withText)}`) },
      { id: 'telegram', label: 'Telegram', color: '#26A5E4', tint: 'bg-[#26A5E4]/10', Icon: TelegramIcon, section: 'messaging', primary: true,
        run: () => openWindow(`https://t.me/share/url?url=${enc(fullUrl)}${t ? `&text=${enc(t)}` : ''}`) },
    ];
    if (FB_APP_ID) {
      list.push({ id: 'messenger', label: 'Messenger', color: '#0866FF', tint: 'bg-[#0866FF]/10', Icon: MessengerIcon, section: 'messaging', primary: true,
        run: () => openWindow(`https://www.facebook.com/dialog/send?app_id=${enc(FB_APP_ID)}&link=${enc(fullUrl)}&redirect_uri=${enc(window.location.origin)}`) });
    }
    list.push(
      { id: 'discord', label: 'Discord', hint: 'Copies link, opens Discord', color: '#5865F2', tint: 'bg-[#5865F2]/10', Icon: DiscordIcon, section: 'messaging', primary: true,
        run: () => copyThenOpen('https://discord.com/app', 'Discord') },
      { id: 'x', label: 'X', color: 'currentColor', tint: 'bg-slate-900/[0.06] dark:bg-white/10', Icon: XIcon, section: 'social', primary: true,
        run: () => openWindow(`https://x.com/intent/post?url=${enc(fullUrl)}${t ? `&text=${enc(t)}` : ''}`) },
      { id: 'email', label: 'Email', color: '#2563EB', tint: 'bg-blue-500/10', Icon: ({ size }) => <Mail size={size} strokeWidth={2} />, section: 'email', primary: true,
        run: () => openWindow(`mailto:?subject=${enc(t || 'Check this out on Wevsoft')}&body=${enc(withText)}`) },
    );
    if (mobileUA) {
      list.push({ id: 'sms', label: 'Messages', hint: 'SMS', color: '#34C759', tint: 'bg-[#34C759]/10', Icon: ({ size }) => <MessageSquare size={size} strokeWidth={2} />, section: 'messaging', primary: true,
        run: () => openWindow(`sms:?&body=${enc(withText)}`) });
    }
    list.push(
      { id: 'slack', label: 'Slack', hint: 'Copies link, opens Slack', color: '', tint: 'bg-[#4A154B]/[0.07] dark:bg-white/10', Icon: SlackIcon, section: 'messaging',
        run: () => copyThenOpen('https://app.slack.com/client', 'Slack') },
      { id: 'reddit', label: 'Reddit', color: '#FF4500', tint: 'bg-[#FF4500]/10', Icon: RedditIcon, section: 'social',
        run: () => openWindow(`https://www.reddit.com/submit?url=${enc(fullUrl)}${t ? `&title=${enc(t)}` : ''}`) },
      { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', tint: 'bg-[#0A66C2]/10', Icon: LinkedInIcon, section: 'social',
        run: () => openWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${enc(fullUrl)}`) },
      { id: 'pinterest', label: 'Pinterest', color: '#E60023', tint: 'bg-[#E60023]/10', Icon: PinterestIcon, section: 'social',
        run: () => openWindow(`https://www.pinterest.com/pin/create/button/?url=${enc(fullUrl)}${t ? `&description=${enc(t)}` : ''}`) },
      { id: 'tumblr', label: 'Tumblr', color: '#36465D', tint: 'bg-[#36465D]/10 dark:bg-white/10', Icon: TumblrIcon, section: 'social',
        run: () => openWindow(`https://www.tumblr.com/widgets/share/tool?canonicalUrl=${enc(fullUrl)}${t ? `&title=${enc(t)}` : ''}`) },
      { id: 'gmail', label: 'Gmail', color: '', tint: 'bg-[#EA4335]/10', Icon: GmailIcon, section: 'email',
        run: () => openWindow(`https://mail.google.com/mail/?view=cm&fs=1&su=${enc(t || 'Check this out on Wevsoft')}&body=${enc(withText)}`) },
      { id: 'outlook', label: 'Outlook', color: '#0078D4', tint: 'bg-[#0078D4]/10', Icon: ({ size }) => <Mail size={size} strokeWidth={2} />, section: 'email',
        run: () => openWindow(`https://outlook.live.com/mail/0/deeplink/compose?subject=${enc(t || 'Check this out on Wevsoft')}&body=${enc(withText)}`) },
    );
    if (canNativeShare) {
      list.push({ id: 'native', label: 'Share via device', hint: 'Your system share sheet', color: '#475569', tint: 'bg-slate-500/10', Icon: ({ size }) => <Smartphone size={size} strokeWidth={2} />, section: 'device',
        run: nativeShare });
    }
    return list;
  }, [fullUrl, shareText, mobileUA, canNativeShare, copyThenOpen, nativeShare]);

  const handleShareNow = async () => {
    if (!feedMode || !targetId || sharing || inFlight.current) return;
    inFlight.current = true;
    setSharing(true);
    try {
      const endpoint = targetType === 'reel' ? `/api/reels/${targetId}/share` : `/api/posts/${targetId}/share`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(spaceActor
          ? { shareType: 'feed', caption: caption.trim() || null, privacy: 'public', spaceId: String(spaceActor.id) }
          : { shareType: 'feed', caption: caption.trim() || null, privacy }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to share');
      toast.success(spaceActor ? `Shared to ${spaceActor.name}` : 'Shared to your feed');
      onSharedToFeed?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to share to feed');
    } finally {
      inFlight.current = false;
      setSharing(false);
    }
  };

  const downloadQr = () => {
    if (!qr) return;
    const a = document.createElement('a');
    a.href = qr;
    a.download = `wevsoft-share-qr-${(targetId || domain).toString().replace(/[^a-z0-9-]/gi, '').slice(0, 24) || 'link'}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    toast.success('QR code downloaded');
  };

  if (!isOpen || typeof document === 'undefined') return null;

  /* ------------------------------------------------------------ render */
  const LinkIcon = copied ? CheckIcon : LinkIconBase;

  const primary = destinations.filter((d) => d.primary);
  const ActiveAudience = (AUDIENCES.find((a) => a.id === privacy) || AUDIENCES[1]);
  const AudIcon = ActiveAudience.Icon;

  const filtered = destinations.filter((d) => !query.trim() || d.label.toLowerCase().includes(query.trim().toLowerCase()));
  const sections: { id: Section; label: string }[] = [
    { id: 'messaging', label: 'Messaging' },
    { id: 'social', label: 'Social' },
    { id: 'email', label: 'Email & productivity' },
    { id: 'device', label: 'Device' },
  ];

  const headerTitle = view === 'more' ? 'More apps' : view === 'qr' ? 'QR code' : 'Share';

  const body = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 dark:bg-black/65 backdrop-blur-[2px] sm:p-6"
      style={overlayZIndex ? { zIndex: overlayZIndex } : undefined}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wev-share-title"
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full flex flex-col overflow-hidden bg-white text-slate-900 shadow-[0_24px_80px_-20px_rgba(15,23,42,0.35)] border border-slate-200/80 dark:bg-[#14161f] dark:text-slate-100 dark:border-white/[0.08] ${
          isMobile ? 'rounded-t-[28px] max-h-[92dvh] animate-[wevSheetUp_.24s_ease-out]' : 'max-w-[960px] rounded-[28px] max-h-[90vh] animate-[wevPop_.18s_ease-out]'
        }`}
        style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}
      >
        <style>{'@keyframes wevSheetUp{from{transform:translateY(100%)}to{transform:none}}@keyframes wevPop{from{opacity:0;transform:scale(.97) translateY(8px)}to{opacity:1;transform:none}}'}</style>
        {isMobile && <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" aria-hidden />}

        {/* Header */}
        <div className="flex items-center gap-2 px-5 sm:px-8 pt-4 sm:pt-6 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
          {view !== 'main' && (
            <button type="button" onClick={() => setView('main')} aria-label="Back to share options"
              className="-ml-2 grid place-items-center w-11 h-11 rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-blue-500/60 outline-none">
              <ChevronLeft size={22} />
            </button>
          )}
          <h2 id="wev-share-title" className="flex-1 text-[22px] sm:text-[26px] font-bold tracking-tight">{headerTitle}</h2>
          <button type="button" onClick={onClose} aria-label="Close share dialog"
            className="grid place-items-center w-11 h-11 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-blue-500/60 outline-none">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {view === 'main' && (
            <>
              {feedMode ? (
                <section aria-label="Share to your feed" className="px-5 sm:px-8 pt-5 pb-5 border-b border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-start gap-3.5">
                    <UserAvatar user={actorAvatarUser as any} className="w-12 h-12 sm:w-14 sm:h-14 text-sm shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[17px] truncate">{actorName}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 relative">
                        <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-slate-200 text-[13px] font-medium text-slate-700 dark:border-white/10 dark:text-slate-200">
                          <Newspaper size={14} /> {spaceActor ? 'Space feed' : 'Feed'}
                        </span>
                        {spaceActor ? (
                          <span aria-label="Audience: Public (Space reshares are always public)" title="Space reshares are always public" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-slate-200 text-[13px] font-medium text-slate-700 dark:border-white/10 dark:text-slate-200">
                            <Globe2 size={14} /> Public
                          </span>
                        ) : (
                        <button type="button" onClick={() => { setAudienceOpen((v) => !v); setEmojiOpen(false); }} aria-haspopup="listbox" aria-expanded={audienceOpen}
                          aria-label={`Audience: ${ActiveAudience.label}`}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-slate-200 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/[0.06] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60">
                          <AudIcon size={14} /> {ActiveAudience.label} <ChevronDown size={14} />
                        </button>
                        )}
                        {!spaceActor && audienceOpen && (
                          <div role="listbox" aria-label="Audience" className="absolute left-0 top-10 z-20 w-64 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:bg-[#1b1e29] dark:border-white/10">
                            {AUDIENCES.map(({ id, label, hint, Icon }) => (
                              <button key={id} type="button" role="option" aria-selected={privacy === id}
                                onClick={() => { setPrivacy(id); setAudienceOpen(false); }}
                                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${privacy === id ? 'bg-blue-50 dark:bg-blue-500/15' : 'hover:bg-slate-50 dark:hover:bg-white/[0.05]'}`}>
                                <span className="grid place-items-center w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10"><Icon size={16} /></span>
                                <span><span className="block text-sm font-semibold">{label}</span><span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span></span>
                                {privacy === id && <Check size={16} className="ml-auto text-blue-600" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative mt-4">
                    <textarea
                      data-autofocus
                      value={caption}
                      onChange={(e) => setCaption(e.target.value.slice(0, 500))}
                      placeholder="Say something about this..."
                      rows={2}
                      aria-label="Caption"
                      className="w-full resize-none bg-transparent pr-12 text-[17px] leading-relaxed outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                    <button type="button" onClick={() => { setEmojiOpen((v) => !v); setAudienceOpen(false); }} aria-label="Insert emoji" aria-expanded={emojiOpen}
                      className="absolute right-0 top-0 grid place-items-center w-11 h-11 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60">
                      <Smile size={22} />
                    </button>
                    {emojiOpen && (
                      <div role="dialog" aria-label="Emoji picker" className="absolute right-0 top-12 z-20 grid grid-cols-5 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:bg-[#1b1e29] dark:border-white/10">
                        {EMOJIS.map((em) => (
                          <button key={em} type="button" aria-label={`Insert ${em}`} onClick={() => setCaption((c) => (c + em).slice(0, 500))}
                            className="w-10 h-10 rounded-xl text-xl hover:bg-slate-100 dark:hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60">{em}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{caption.length}/500</span>
                    <button type="button" onClick={handleShareNow} disabled={sharing}
                      className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-blue-600 text-white text-[16px] font-semibold shadow-sm shadow-blue-600/25 hover:bg-blue-700 disabled:opacity-70 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14161f]">
                      {sharing ? <Loader2 size={18} className="animate-spin" /> : <SendIcon />} {sharing ? 'Sharing…' : 'Share now'}
                    </button>
                  </div>
                </section>
              ) : (
                <section aria-label="What you are sharing" className="px-5 sm:px-8 pt-5 pb-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center gap-3.5">
                  {preview?.image ? (
                    <img src={preview.image} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" />
                  ) : (
                    <span className="grid place-items-center w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300 shrink-0"><Link2 size={24} /></span>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-[16px] truncate">{preview?.title || shareText || 'Share this link'}</div>
                    <div className="text-[13px] text-slate-500 dark:text-slate-400 truncate">
                      {preview?.authorName ? `${preview.authorName} · ` : ''}{domain}{visibility ? ` · ${visibility}` : ''}
                    </div>
                  </div>
                </section>
              )}

              <section aria-labelledby="wev-share-to" className="px-3 sm:px-6 pt-5 pb-3">
                <h3 id="wev-share-to" className="px-2 mb-2 text-[15px] font-semibold text-slate-800 dark:text-slate-100">Share to</h3>
                <ul role="list" className="grid grid-cols-3 min-[400px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-x-1 gap-y-1">
                  <Tile label={copied ? 'Copied' : 'Copy link'} Icon={LinkIcon} color={copied ? '#10B981' : '#2563EB'} tint={copied ? 'bg-emerald-500/10' : 'bg-blue-500/10'} active={copied} onClick={() => void doCopy()} />
                  {primary.map((d) => <Tile key={d.id} label={d.label} hint={d.hint} Icon={d.Icon} color={d.color || undefined} tint={d.tint} onClick={() => void d.run()} />)}
                  <Tile label="QR code" Icon={QrIcon} color="#334155" tint="bg-slate-500/10 dark:text-slate-200" onClick={() => setView('qr')} />
                  <Tile label="More apps" Icon={MoreIcon} color="#475569" tint="bg-slate-500/10" onClick={() => setView('more')} />
                </ul>
              </section>

              <LinkRow displayUrl={displayUrl} copied={copied} onCopy={() => void doCopy()} visibility={visibility} />
            </>
          )}

          {view === 'more' && (
            <div className="px-5 sm:px-8 py-5">
              <label className="relative block">
                <span className="sr-only">Search share destinations</span>
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search apps"
                  aria-label="Search share destinations"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-[15px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:bg-white/[0.04] dark:border-white/10" />
              </label>
              {filtered.length === 0 && <p className="mt-8 text-center text-sm text-slate-500">No app matches “{query}”.</p>}
              {sections.map((s) => {
                const items = filtered.filter((d) => d.section === s.id);
                if (!items.length) return null;
                return (
                  <section key={s.id} aria-label={s.label} className="mt-5">
                    <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{s.label}</h3>
                    <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {items.map((d) => (
                        <li key={d.id}>
                          <button type="button" onClick={() => void d.run()}
                            className="w-full flex items-center gap-3 rounded-xl px-2.5 py-2 min-h-[56px] text-left hover:bg-slate-50 dark:hover:bg-white/[0.04] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60">
                            <span className={`grid place-items-center w-11 h-11 rounded-xl ${d.tint}`} style={d.color ? { color: d.color } : undefined}><d.Icon size={22} /></span>
                            <span className="min-w-0">
                              <span className="block text-[15px] font-medium">{d.label}</span>
                              {d.hint && <span className="block text-xs text-slate-500 dark:text-slate-400">{d.hint}</span>}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}

          {view === 'qr' && (
            <div className="px-5 sm:px-8 py-6 flex flex-col items-center">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10">
                {qr ? (
                  <img src={qr} alt={`QR code for ${displayUrl}`} className="w-[240px] h-[240px] sm:w-[280px] sm:h-[280px]" />
                ) : qrError ? (
                  <div className="w-[240px] h-[240px] grid place-items-center text-center text-sm text-red-600 p-4">{qrError}</div>
                ) : (
                  <div className="w-[240px] h-[240px] grid place-items-center"><Loader2 className="animate-spin text-slate-400" /></div>
                )}
              </div>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 text-center">Scan with a phone camera to open this link.</p>
              <p className="mt-1 text-[13px] font-medium text-slate-700 dark:text-slate-200 break-all text-center max-w-md">{displayUrl}</p>
              <div className="mt-5 flex w-full max-w-md gap-3">
                <button type="button" onClick={downloadQr} disabled={!qr} data-autofocus
                  className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60">
                  <Download size={18} /> Download QR
                </button>
                <button type="button" onClick={() => void doCopy()}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-xl border border-slate-200 font-semibold hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.06] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60">
                  {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />} {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>
          )}
        </div>

        {view === 'main' && (
          <div className="px-5 sm:px-8 py-4 border-t border-slate-100 dark:border-white/[0.06]">
            <button type="button" onClick={onClose}
              className="w-full h-12 rounded-xl bg-slate-100 text-[16px] font-semibold text-slate-800 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60">
              Done
            </button>
          </div>
        )}
        <span className="sr-only" aria-live="polite">{copied ? 'Link copied to clipboard' : ''}</span>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}

function Tile({ label, hint, Icon, color, tint, onClick, active }: { label: string; hint?: string; Icon: React.ComponentType<IconProps>; color?: string; tint: string; onClick: () => void; active?: boolean }) {
  return (
    <li className="list-none" role="listitem" aria-label={label}>
      <button
        type="button"
        onClick={onClick}
        title={hint || label}
        aria-label={hint ? `${label} — ${hint}` : label}
        className="group w-full flex flex-col items-center gap-2 rounded-2xl px-1 py-2.5 min-h-[88px] outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500/60 active:scale-[0.97] dark:hover:bg-white/[0.04]"
      >
        <span
          className={`grid place-items-center w-14 h-14 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] transition-transform group-hover:-translate-y-0.5 ${tint} ${active ? 'ring-2 ring-emerald-500/50' : ''}`}
          style={color ? { color } : undefined}
        >
          <Icon size={26} />
        </span>
        <span className="text-[12.5px] leading-tight font-medium text-slate-700 dark:text-slate-200 text-center">{label}</span>
      </button>
    </li>
  )
}

const CheckIcon = ({ size }: IconProps) => <Check size={size} strokeWidth={2.4} />;
const LinkIconBase = ({ size }: IconProps) => <Link2 size={size} strokeWidth={2} />;
const MoreIcon = ({ size }: IconProps) => <MoreHorizontal size={size} strokeWidth={2} />;
const QrIcon = ({ size }: IconProps) => <QrCode size={size} strokeWidth={2} />;

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}

function LinkRow({ displayUrl, copied, onCopy, visibility }: { displayUrl: string; copied: boolean; onCopy: () => void; visibility: string | null }) {
  return (
    <section aria-label="Link" className="px-5 sm:px-8 pb-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-3.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
        {visibility && (
          <div className="mb-2 flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-300">
            <Globe2 size={14} /> Visibility: <span className="font-medium">{visibility}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[14px] text-slate-700 dark:text-slate-200" title={displayUrl}>{displayUrl}</span>
          <button type="button" onClick={onCopy} aria-label="Copy link"
            className="shrink-0 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-[14px] font-medium hover:bg-slate-50 dark:bg-white/[0.06] dark:border-white/10 dark:hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60">
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </section>
  );
}
