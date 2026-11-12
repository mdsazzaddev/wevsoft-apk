/**
 * Live preview surface for the creation wizard and the customize screen.
 *
 * It renders the SAME components as the real Space page (SpaceIdentity +
 * SpaceAboutCard) with `interactive={false}`, so what the owner sees here is
 * what visitors get — spec §8 explicitly rules out a separate mock renderer.
 *
 * Device switching is a prop on SpaceIdentity rather than a viewport media
 * query, which is what lets a phone layout render inside a desktop window.
 */

import { useState } from 'react';
import { Eye, Monitor, Smartphone, UserCog } from 'lucide-react';
import { spaceDisplayUrl, type SpacePublicPayload, type SpaceTab } from '@wevsoft/shared/wevspace';
import SpaceAboutCard from './SpaceAboutCard';
import SpaceIdentity from './SpaceIdentity';

interface Props {
  space: SpacePublicPayload;
  /** Hides the owner/public switch when only the public view is meaningful. */
  allowOwnerView?: boolean;
  className?: string;
}

type Device = 'desktop' | 'mobile';

export default function SpaceLivePreview({ space, allowOwnerView = true, className = '' }: Props) {
  const [device, setDevice] = useState<Device>('desktop');
  const [viewMode, setViewMode] = useState<'public' | 'owner'>('public');
  const [tab, setTab] = useState<SpaceTab>('home');

  const activeTab = (space.tabs || []).includes(tab) ? tab : 'home';

  return (
    <div className={className}>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-muted">
          {(
            [
              { id: 'desktop' as Device, icon: Monitor, label: 'Desktop' },
              { id: 'mobile' as Device, icon: Smartphone, label: 'Mobile' },
            ]
          ).map((opt) => {
            const Icon = opt.icon;
            const active = device === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDevice(opt.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors ${
                  active ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={14} /> {opt.label}
              </button>
            );
          })}
        </div>

        {allowOwnerView && (
          <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-muted">
            {(
              [
                { id: 'public' as const, icon: Eye, label: 'Public view' },
                { id: 'owner' as const, icon: UserCog, label: 'Owner view' },
              ]
            ).map((opt) => {
              const Icon = opt.icon;
              const active = viewMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setViewMode(opt.id)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors ${
                    active ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon size={14} /> {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Frame */}
      <div className="rounded-3xl border border-border bg-muted/40 p-3 sm:p-4">
        <div className="flex items-center gap-2 px-2 pb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-2 flex-1 truncate px-3 py-1 rounded-lg bg-card border border-border text-[11px] font-semibold text-muted-foreground">
            {spaceDisplayUrl(space.handle)}
          </span>
        </div>

        <div
          className={`mx-auto transition-[max-width] duration-300 ${
            device === 'mobile' ? 'max-w-[390px]' : 'max-w-full'
          }`}
        >
          <div className="space-y-3">
            <SpaceIdentity
              space={space}
              activeTab={activeTab}
              onTabChange={setTab}
              layout={device}
              viewMode={viewMode}
              interactive={false}
            />
            <SpaceAboutCard space={space} compact={device === 'mobile'} interactive={false} />
          </div>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground text-center">
        Live preview — this is the real Space layout, not a mock-up. Tabs are clickable here.
      </p>
    </div>
  );
}
