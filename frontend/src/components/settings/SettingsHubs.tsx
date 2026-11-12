import { useSettingsTr } from '../../i18n/settingsBn';
import React, { useMemo, useState } from 'react';
import { Activity, CheckCircle2, ChevronDown, Database, Lock, ShieldCheck, SlidersHorizontal, Circle, AlertCircle } from 'lucide-react';
import { getOptionById } from '../../pages/consumerSettingsData';
import { SETTINGS_HUB_DEFS, resolveHubOptionIds, evaluatePrivacyCheckup } from '../../lib/settingsHubs';
import { SettingsRow, SettingsSection, SettingsStatusBadge } from './SettingsPrimitives';

type Tr = (s?: string | null) => string;

const HUB_ICONS: Record<string, React.ReactNode> = {
  your_activity: <Activity size={18} />,
  data_privacy: <Database size={18} />,
  advanced: <SlidersHorizontal size={18} />,
};

function OptionLinks({ ids, onOpen, tr, statusOf }: { ids: string[]; onOpen: (id: string) => void; tr: Tr; statusOf?: (id: string) => React.ReactNode }) {
  return (
    <ul className="bg-muted/20 divide-y divide-border/30">
      {ids.map((id) => {
        const f = getOptionById(id);
        if (!f) return null;
        return (
          <li key={id}>
            <button type="button" onClick={() => onOpen(id)}
              className="w-full text-left pl-16 pr-4 py-2.5 flex items-center gap-3 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground truncate">{tr(f.option.name)}</div>
                <div className="text-xs text-muted-foreground truncate">{tr(f.category.name)}</div>
              </div>
              {statusOf?.(id)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Tools and resources: checkups + hubs. Everything links to real existing settings. */
export function SettingsHubs({ values, onOpenOption, tr, initialOpen = null }: { values: Record<string, unknown>; onOpenOption: (optionId: string) => void; tr: Tr; initialOpen?: string | null }) {
  // Remount with a new key to change initialOpen (e.g. from the sidebar).
  const [open, setOpen] = useState<string | null>(initialOpen);
  const privacy = useMemo(() => evaluatePrivacyCheckup(values), [values]);
  const toggle = (id: string) => setOpen((p) => (p === id ? null : id));
  const chevron = (id: string) => <ChevronDown size={18} aria-hidden className={`text-muted-foreground transition-transform motion-reduce:transition-none ${open === id ? 'rotate-180' : ''}`} />;
  const hasSecurityCheckup = !!getOptionById('sec_security_checkup');

  return (
    <SettingsSection title={tr('Tools and resources')}>
      <div>
        <div>
          <SettingsRow expanded={open === 'privacy_checkup'} icon={<Lock size={18} />} title={tr('Privacy Checkup')}
            description={`${privacy.privateCount}/${privacy.checkable} ${tr('settings use the more private choice')}`}
            onClick={() => toggle('privacy_checkup')} trailing={chevron('privacy_checkup')} />
        </div>
        {open === 'privacy_checkup' && (
          <>
            <p className="pl-16 pr-4 pb-2 text-xs text-muted-foreground">{tr('Status comes from your saved settings. The choice is always yours.')}</p>
            <OptionLinks ids={privacy.steps.map((s) => s.optionId)} onOpen={onOpenOption} tr={tr} statusOf={(id) => {
              const s = privacy.steps.find((x) => x.optionId === id)?.status;
              if (s === 'private') return <SettingsStatusBadge tone="ok"><CheckCircle2 size={11} aria-hidden />{tr('More private')}</SettingsStatusBadge>;
              if (s === 'open') return <SettingsStatusBadge tone="warn"><AlertCircle size={11} aria-hidden />{tr('Review')}</SettingsStatusBadge>;
              return <SettingsStatusBadge tone="neutral"><Circle size={11} aria-hidden />{tr('Check')}</SettingsStatusBadge>;
            }} />
          </>
        )}
      </div>
      {hasSecurityCheckup && (
        <SettingsRow icon={<ShieldCheck size={18} />} title={tr('Security Checkup')}
          description={tr('Checks your sign-in protection using your real account data')}
          onClick={() => onOpenOption('sec_security_checkup')} />
      )}
      {SETTINGS_HUB_DEFS.map((h) => {
        const ids = resolveHubOptionIds(h.optionIds);
        if (!ids.length) return null;
        return (
          <div key={h.id}>
            <div>
              <SettingsRow expanded={open === h.id} icon={HUB_ICONS[h.id]} title={tr(h.label)} description={tr(h.description)} onClick={() => toggle(h.id)} trailing={chevron(h.id)} />
            </div>
            {open === h.id && <OptionLinks ids={ids} onOpen={onOpenOption} tr={tr} />}
          </div>
        );
      })}
    </SettingsSection>
  );
}
export const SETTINGS_HUB_NAV_ICONS = { privacy_checkup: Lock, security_checkup: ShieldCheck, your_activity: Activity, data_privacy: Database, advanced: SlidersHorizontal };
