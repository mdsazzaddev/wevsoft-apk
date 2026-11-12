import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  BellRing,
  Bookmark,
  Cake,
  Calendar,
  Clapperboard,
  Flag,
  Globe,
  HeartHandshake,
  Images,
  Mail,
  MessageCircle,
  MessageSquare,
  Smartphone,
  Store,
  Tag,
  UserPlus,
  UserRoundSearch,
  Users,
  UsersRound,
  Vote,
} from 'lucide-react';
import {
  CHANNEL_LABELS,
  NOTIF_CHANNEL_CATEGORIES,
  NOTIF_CHANNELS_PREF_KEY,
  defaultCategoryChannels,
  normalizeNotifChannelsPrefs,
  summarizeCategoryChannels,
  type NotifCategoryChannels,
  type NotifChannelsPrefs,
  type NotifChannelKey,
} from '@wevsoft/shared/notificationChannels';
import { useSettingsTr } from '../../i18n/settingsBn';
import { SettingsChannelAccordion, SettingsChoiceAccordion, SettingsSwitchRow } from './SettingsRows';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  MessageCircle,
  Tag,
  Bell,
  Activity,
  Users,
  UserPlus,
  UserRoundSearch,
  Cake,
  UsersRound,
  Clapperboard,
  Calendar,
  Flag,
  Bookmark,
  Store,
  HeartHandshake,
  Vote,
  MessageSquare,
  Images,
  BellRing,
  Globe,
  Mail,
  Smartphone,
};

type Props = {
  valuesMap: Record<string, any>;
  isSaving: Record<string, boolean>;
  expandedOptionId?: string | null;
  onToggleExpand: (optionId: string) => void;
  onSave: (optionId: string, value: any) => void | Promise<void>;
};

function buildPrefsFromValues(valuesMap: Record<string, any>): NotifChannelsPrefs {
  const nested = valuesMap[NOTIF_CHANNELS_PREF_KEY];
  const base = normalizeNotifChannelsPrefs({
    ...(typeof nested === 'object' && nested ? nested : {}),
    notif_master: valuesMap.notif_master,
    notif_delivery_browser: valuesMap.notif_delivery_browser,
    notif_delivery_email: valuesMap.notif_delivery_email,
    notif_delivery_email_frequency: valuesMap.notif_delivery_email_frequency,
    notif_delivery_sms: valuesMap.notif_delivery_sms,
    notif_push_alerts: valuesMap.notif_push_alerts,
  });
  for (const def of NOTIF_CHANNEL_CATEGORIES) {
    const flat = valuesMap[def.optionId];
    if (flat && typeof flat === 'object') {
      base.categories[def.id] = { ...defaultCategoryChannels(def), ...flat };
    }
  }
  if (typeof valuesMap.notif_master === 'boolean') base.master = valuesMap.notif_master;
  if (typeof valuesMap.notif_delivery_browser === 'boolean') base.delivery.browser = valuesMap.notif_delivery_browser;
  if (typeof valuesMap.notif_delivery_email === 'boolean') base.delivery.email = valuesMap.notif_delivery_email;
  if (typeof valuesMap.notif_delivery_sms === 'boolean') base.delivery.sms = valuesMap.notif_delivery_sms;
  const freq = valuesMap.notif_delivery_email_frequency;
  if (freq === 'Suggested' || freq === 'Important only' || freq === 'All') {
    base.delivery.emailFrequency = freq;
  }
  return base;
}

/**
 * Facebook-style Notifications settings: channel accordions + delivery section.
 */
export default function NotificationsSettingsPanel({
  valuesMap,
  isSaving,
  expandedOptionId,
  onToggleExpand,
  onSave,
}: Props) {
  const tr = useSettingsTr();
  const prefs = useMemo(() => buildPrefsFromValues(valuesMap), [valuesMap]);
  // Read once at mount (was: 'default' + setState in a mount effect).
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof window === 'undefined' || typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const [smsSenderAvailable, setSmsSenderAvailable] = useState<boolean | null>(null);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch('/api/settings/notification-channels', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        if (!cancelled) setSmsSenderAvailable(!!data?.senders?.sms);
      } catch {
        if (!cancelled) setSmsSenderAvailable(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const patchCategory = async (catId: string, channels: NotifCategoryChannels) => {
    const next: NotifChannelsPrefs = {
      ...prefs,
      categories: { ...prefs.categories, [catId]: channels },
    };
    // Fast path: save flat option + nested blob key together via preferences merges.
    const def = NOTIF_CHANNEL_CATEGORIES.find((c) => c.id === catId);
    if (def) await onSave(def.optionId, channels);
    await onSave(NOTIF_CHANNELS_PREF_KEY, {
      ...prefs,
      categories: { ...prefs.categories, [catId]: channels },
    });
  };

  const requestBrowserPermission = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const result = await Notification.requestPermission();
      setBrowserPerm(result);
      if (result === 'granted') {
        await onSave('notif_delivery_browser', true);
        await onSave(NOTIF_CHANNELS_PREF_KEY, {
          ...prefs,
          delivery: { ...prefs.delivery, browser: true },
        });
        // Best-effort web-push subscribe when VAPID public key + SW are available.
        try {
          const vapid =
            (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY) ||
            (typeof window !== 'undefined' && (window as any).__VAPID_PUBLIC_KEY__) ||
            '';
          if (vapid && 'serviceWorker' in navigator && 'PushManager' in window) {
            // Production uses /sw.js via bootstrapServiceWorker; Vite DEV / localhost
            // intentionally skips that, so register the push-only worker instead.
            const regs = await navigator.serviceWorker.getRegistrations();
            let reg =
              regs.find((r) => {
                const script = r.active?.scriptURL || r.waiting?.scriptURL || r.installing?.scriptURL || '';
                return script.includes('/push-sw.js') || script.includes('/sw.js');
              }) || (await navigator.serviceWorker.getRegistration('/'));
            if (!reg || !(reg.active || reg.waiting || reg.installing)) {
              reg = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
            }
            if (reg.installing) {
              await new Promise<void>((resolve) => {
                const w = reg!.installing!;
                w.addEventListener('statechange', () => {
                  if (w.state === 'activated' || w.state === 'installed') resolve();
                });
              });
            }
            await reg.update?.().catch(() => null);
            const urlBase64ToUint8Array = (base64String: string) => {
              const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
              const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
              const raw = window.atob(base64);
              const out = new Uint8Array(raw.length);
              for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
              return out;
            };
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(String(vapid)),
            });
            const json = sub.toJSON();
            const token = localStorage.getItem('token') || localStorage.getItem('wevsoft_token') || '';
            if (json.endpoint && json.keys?.auth && json.keys?.p256dh && token) {
              await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ endpoint: json.endpoint, keys: { auth: json.keys.auth, p256dh: json.keys.p256dh } }),
              }).catch(() => null);
            }
          }
        } catch {
          /* permission alone is enough for in-tab alerts; SW subscribe is optional */
        }
      }
    } catch {
      /* ignore */
    }
  };

  const emailSub = !prefs.delivery.email
    ? tr('Off')
    : `${tr('On')}, ${tr(prefs.delivery.emailFrequency)}`;
  const smsSub =
    smsSenderAvailable === false
      ? tr('Unavailable — add BulkSMSBD sender ID to enable')
      : prefs.delivery.sms
        ? tr('On')
        : tr('Off');
  const browserSub =
    browserPerm === 'granted'
      ? prefs.delivery.browser
        ? tr('On')
        : tr('Off')
      : browserPerm === 'denied'
        ? tr('Blocked in browser')
        : browserPerm === 'unsupported'
          ? tr('Not supported')
          : tr('Click to enable');

  return (
    <div className="space-y-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <section className="space-y-2">
        <h3 className="px-1 text-base font-bold text-foreground">{tr('What notifications you receive')}</h3>
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border/40">
          {NOTIF_CHANNEL_CATEGORIES.map((def) => {
            const Icon = ICON_MAP[def.icon] || Bell;
            const cat = prefs.categories[def.id] || defaultCategoryChannels(def);
            const channels = def.channels.map((id) => ({
              id,
              label: CHANNEL_LABELS[id as NotifChannelKey] || id,
            }));
            const values: Record<string, boolean> = {};
            for (const ch of def.channels) values[ch] = cat[ch] !== false;
            const deliveryForSub = smsSenderAvailable === false
              ? { ...prefs.delivery, sms: false }
              : prefs.delivery;
            const subtitle = summarizeCategoryChannels(def, cat, deliveryForSub);
            const saving = !!isSaving[def.optionId] || !!isSaving[NOTIF_CHANNELS_PREF_KEY];
            return (
              <SettingsChannelAccordion
                key={def.id}
                id={def.optionId}
                title={def.name}
                description={def.description}
                values={values}
                channels={channels}
                expanded={expandedOptionId === def.optionId}
                saving={saving}
                subtitle={tr(subtitle)}
                channelsHeading="Where you receive these notifications"
                disabledChannels={smsSenderAvailable === false ? ['sms'] : undefined}
                icon={<Icon size={20} />}
                onToggleExpand={() => onToggleExpand(def.optionId)}
                onChangeChannel={(channelId, enabled) => {
                  if (channelId === 'sms' && smsSenderAvailable === false) return;
                  const next = { ...cat, [channelId]: enabled };
                  if (def.inAppOnly) {
                    next.push = false;
                    next.email = false;
                    next.sms = false;
                  }
                  void patchCategory(def.id, next);
                }}
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="px-1 text-base font-bold text-foreground">{tr('Where you receive notifications')}</h3>
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border/40">
          <SettingsSwitchRow
            id="notif_master"
            title="Allow notifications on Wevsoft"
            description="Turn off to pause all non-security alerts across channels"
            checked={prefs.master !== false}
            saving={!!isSaving.notif_master}
            onChange={(next) => {
              void onSave('notif_master', next);
              void onSave(NOTIF_CHANNELS_PREF_KEY, { ...prefs, master: next });
            }}
            icon={<Bell size={20} />}
          />

          <div>
            <SettingsSwitchRow
              id="notif_delivery_browser"
              title="Browser"
              description="Push alerts in this browser. Requires permission from your browser."
              checked={prefs.delivery.browser !== false && browserPerm !== 'denied'}
              saving={!!isSaving.notif_delivery_browser}
              disabled={browserPerm === 'unsupported' || browserPerm === 'denied'}
              onChange={(next) => {
                if (next && browserPerm !== 'granted') {
                  void requestBrowserPermission();
                  return;
                }
                void onSave('notif_delivery_browser', next);
                void onSave(NOTIF_CHANNELS_PREF_KEY, {
                  ...prefs,
                  delivery: { ...prefs.delivery, browser: next },
                });
              }}
              icon={<Globe size={20} />}
            />
            <p className="px-4 sm:px-5 pb-3 -mt-1 text-[12px] text-muted-foreground pl-[68px]">
              {tr(browserSub)}
              {browserPerm === 'default' ? (
                <>
                  {' · '}
                  <button type="button" className="text-primary font-semibold" onClick={() => void requestBrowserPermission()}>
                    {tr('Enable')}
                  </button>
                </>
              ) : null}
            </p>
          </div>

          <SettingsSwitchRow
            id="notif_delivery_email"
            title="Email"
            description="Email alerts use your account email when a mail sender is configured"
            checked={prefs.delivery.email !== false}
            saving={!!isSaving.notif_delivery_email}
            onChange={(next) => {
              void onSave('notif_delivery_email', next);
              void onSave(NOTIF_CHANNELS_PREF_KEY, {
                ...prefs,
                delivery: { ...prefs.delivery, email: next },
              });
            }}
            icon={<Mail size={20} />}
          />
          <p className="px-4 sm:px-5 pb-1 -mt-2 text-[12px] text-muted-foreground pl-[68px]">{emailSub}</p>

          {prefs.delivery.email !== false && (
            <SettingsChoiceAccordion
              id="notif_delivery_email_frequency"
              title="Email frequency"
              description="How often we send email when Email is on"
              value={prefs.delivery.emailFrequency}
              options={[
                { value: 'Suggested', label: 'Suggested', short: 'Suggested' },
                { value: 'Important only', label: 'Important only', short: 'Important' },
                { value: 'All', label: 'All', short: 'All' },
              ]}
              expanded={expandedOptionId === 'notif_delivery_email_frequency'}
              saving={!!isSaving.notif_delivery_email_frequency}
              onToggleExpand={() => onToggleExpand('notif_delivery_email_frequency')}
              onSelect={(v) => {
                void onSave('notif_delivery_email_frequency', v);
                void onSave(NOTIF_CHANNELS_PREF_KEY, {
                  ...prefs,
                  delivery: { ...prefs.delivery, emailFrequency: v as NotifChannelsPrefs['delivery']['emailFrequency'] },
                });
              }}
            />
          )}

          <SettingsSwitchRow
            id="notif_delivery_sms"
            title="SMS"
            description={
              smsSenderAvailable === false
                ? 'SMS is unavailable until an approved BulkSMSBD sender ID is configured on the server'
                : 'Text alerts to your verified phone when an SMS sender is configured'
            }
            checked={prefs.delivery.sms === true && smsSenderAvailable !== false}
            saving={!!isSaving.notif_delivery_sms}
            disabled={smsSenderAvailable === false}
            onChange={(next) => {
              if (smsSenderAvailable === false) return;
              void onSave('notif_delivery_sms', next);
              void onSave(NOTIF_CHANNELS_PREF_KEY, {
                ...prefs,
                delivery: { ...prefs.delivery, sms: next },
              });
            }}
            icon={<Smartphone size={20} />}
          />
          <p className="px-4 sm:px-5 pb-3 -mt-2 text-[12px] text-muted-foreground pl-[68px]">{smsSub}</p>

          <SettingsChoiceAccordion
            id="notif_quiet_hours"
            title="Quiet hours schedule"
            description="Mute push sounds during these hours"
            value={valuesMap.notif_quiet_hours ?? 'Turn off quiet hours'}
            options={[
              { value: '10:00 PM to 7:00 AM', label: '10:00 PM to 7:00 AM' },
              { value: '11:00 PM to 6:00 AM', label: '11:00 PM to 6:00 AM' },
              { value: 'Custom schedule', label: 'Custom schedule' },
              { value: 'Turn off quiet hours', label: 'Turn off quiet hours', short: 'Off' },
            ]}
            expanded={expandedOptionId === 'notif_quiet_hours'}
            saving={!!isSaving.notif_quiet_hours}
            onToggleExpand={() => onToggleExpand('notif_quiet_hours')}
            onSelect={(v) => { void onSave('notif_quiet_hours', v); }}
            icon={<Bell size={20} />}
          />

          <SettingsSwitchRow
            id="notif_sound_vibration"
            title="Sounds and haptics"
            description="Play sounds and vibrate for alerts on this device"
            checked={valuesMap.notif_sound_vibration !== false}
            saving={!!isSaving.notif_sound_vibration}
            onChange={(next) => { void onSave('notif_sound_vibration', next); }}
          />
        </div>
      </section>
    </div>
  );
}
