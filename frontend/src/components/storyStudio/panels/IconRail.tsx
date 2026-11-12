import { BarChart2, Layers, LayoutTemplate, Music, Settings, Smile, Sun, Moon, Type, Image as ImageIcon } from 'lucide-react';
import { useStore } from '../../../store';
import { COMING_SOON, Tip } from './ui';
import { useStudio, type LeftTab } from './StudioContext';

const ITEMS: { id: LeftTab | 'poll'; label: string; icon: typeof Layers; soon?: boolean; action?: 'poll' }[] = [
  { id: 'media', label: 'Media', icon: ImageIcon },
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'poll', label: 'Poll', icon: BarChart2, action: 'poll' },
  { id: 'stickers', label: 'Stickers', icon: Smile },
  { id: 'music', label: 'Music', icon: Music, soon: true },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate, soon: true },
];

export default function IconRail({ onSettings }: { onSettings: () => void }) {
  const s = useStudio();
  const theme = useStore((st) => st.theme);
  const setTheme = useStore((st) => st.setTheme);
  const isOled = /oled/i.test(theme);
  const isDark = /dark/i.test(theme) || isOled;
  const next = !isDark ? 'Dark mode' : isOled ? 'Light mode' : 'OLED True Black';
  const themeLabel = !isDark ? 'Switch to Dark' : isOled ? 'Switch to Light' : 'Switch to OLED';

  return (
    <nav aria-label="Studio tools" className="flex w-[68px] shrink-0 flex-col items-center gap-1 py-2">
      {ITEMS.map((it) => {
        const active = it.action === 'poll'
          ? Boolean(s.overlay?.kind === 'poll')
          : s.leftOpen && s.leftTab === it.id;
        const Icon = it.icon;
        return (
          <Tip key={it.id} label={it.soon ? `${it.label} · ${COMING_SOON}` : it.action === 'poll' ? 'Add poll sticker' : it.label} side="right">
            <button
              type="button"
              aria-label={it.label}
              aria-pressed={active}
              data-testid={`ss-rail-${it.id}`}
              onClick={() => {
                if (it.action === 'poll') {
                  s.addPoll();
                  return;
                }
                if (s.leftOpen && s.leftTab === it.id) s.setLeftOpen(false);
                else {
                  s.setLeftTab(it.id as LeftTab);
                  s.setLeftOpen(true);
                }
              }}
              className={`flex h-[58px] w-[56px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--ss-accent)] ${
                active ? 'bg-[color:var(--ss-accent-soft)] text-[color:var(--ss-accent)]' : 'text-[color:var(--ss-text)] hover:bg-[color:var(--ss-hover)]'
              } ${it.soon ? 'opacity-75' : ''}`}
            >
              <Icon size={20} strokeWidth={active ? 2.3 : 1.9} />
              {it.label}
            </button>
          </Tip>
        );
      })}
      <div className="mt-auto flex flex-col items-center gap-2 pb-1">
        <Tip label="Shortcuts & settings" side="right">
          <button type="button" aria-label="Settings" onClick={onSettings} className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--ss-border)] bg-[color:var(--ss-panel)] text-[color:var(--ss-accent)] hover:bg-[color:var(--ss-hover)]">
            <Settings size={17} />
          </button>
        </Tip>
        <Tip label={themeLabel} side="right">
          <button type="button" aria-label={themeLabel} onClick={() => setTheme(next)} className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--ss-border)] bg-[color:var(--ss-panel)] text-[color:var(--ss-accent)] hover:bg-[color:var(--ss-hover)]">
            {isDark ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </Tip>
      </div>
    </nav>
  );
}
