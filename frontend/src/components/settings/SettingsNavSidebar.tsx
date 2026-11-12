import React, { useDeferredValue, useEffect, useState } from 'react';
import { useL10n } from '../../utils/l10n';
import { getLanguageByCode } from '../../i18n/languages';
import { ChevronDown, Search, X } from 'lucide-react';
import { type ConsumerSettingCategory } from '../../pages/consumerSettingsData';
import { SETTINGS_NAV_GROUPS, groupForCategory, matchSettingsCategories } from '../../lib/settingsNavGroups';
import { useSettingsTr } from '../../i18n/settingsBn';

interface SettingsNavSidebarProps {
  selectedCategoryId: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectCategory: (cat: ConsumerSettingCategory) => void;
  iconFor: (iconName: string) => React.ReactNode;
  /** Optional "Tools and resources" entries (checkups and hubs) that point at real existing settings. */
  hubItems?: { id: string; label: string; icon: React.ReactNode }[];
  activeHubId?: string | null;
  onSelectHub?: (id: string) => void;
  hubGroupLabel?: string;
}

/**
 * Desktop Settings Center navigation: searchable, grouped (Account Centre,
 * Password and Security, Preferences, ...) and collapsible. Lives inside the
 * Settings page only; it is not a second global app sidebar.
 */
export default function SettingsNavSidebar({
  selectedCategoryId,
  searchQuery,
  onSearchChange,
  onSelectCategory,
  iconFor,
  hubItems,
  activeHubId,
  onSelectHub,
  hubGroupLabel,
}: SettingsNavSidebarProps) {
  const tr = useSettingsTr();
  const deferredQuery = useDeferredValue(searchQuery);
  const filtered = deferredQuery.trim() ? matchSettingsCategories(deferredQuery, tr) : null;

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const activeGroupId = groupForCategory(selectedCategoryId)?.id;
  // Always reveal the group holding the selected category (deep links, back/forward).
  useEffect(() => {
    if (!activeGroupId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reveal the active group on navigation
    setCollapsed((prev) => (prev[activeGroupId] ? { ...prev, [activeGroupId]: false } : prev));
  }, [activeGroupId]);

  return (
    <aside className="w-[232px] lg:w-[280px] shrink-0 h-full border-r border-border bg-card flex flex-col">
      <div className="p-4 border-b border-border space-y-3 shrink-0">
        <div>
          <h1 className="text-lg font-extrabold text-foreground tracking-tight truncate">{tr('Settings and privacy')}</h1>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Manage your account, security, and social preferences
          </p>
        </div>

        <div className="relative" role="search">
          <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            id="sidebar-settings-search-input"
            name="settingsSearch"
            aria-label={tr('Search settings')}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && searchQuery) onSearchChange('');
            }}
            placeholder={tr('Search settings')}
            className="w-full bg-background border border-border rounded-xl pl-9 pr-9 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label={tr('Clear search')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <nav aria-label={tr('Settings categories')} className="flex-1 overflow-y-auto p-3 no-scrollbar space-y-3">
        {filtered ? (
          <div className="space-y-0.5" aria-live="polite">
            {filtered.length === 0 ? (
              <div className="px-2 py-6 text-center">
                <p className="text-sm font-medium text-foreground">{tr('No results')}</p>
                <p className="text-xs text-muted-foreground mt-1">Nothing matches "{deferredQuery.trim()}". Try another word.</p>
              </div>
            ) : (
              filtered.map(({ category, matches }) => (
                <CategoryNavButton
                  key={category.id}
                  cat={category}
                  active={selectedCategoryId === category.id}
                  iconFor={iconFor}
                  onSelect={onSelectCategory}
                  badge={matches > 0 ? matches : undefined}
                />
              ))
            )}
          </div>
        ) : (
          SETTINGS_NAV_GROUPS.map((group, groupIndex) => {
            const hubBlock = groupIndex === 2 && hubItems && hubItems.length > 0 && onSelectHub ? (
              <div key="__hubs">
                <div className="px-2 py-1 mb-0.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{tr(hubGroupLabel || 'Tools and resources')}</div>
                <div className="space-y-0.5">
                  {hubItems.map((h) => {
                    const active = activeHubId === h.id;
                    return (
                      <button key={h.id} type="button" onClick={() => onSelectHub(h.id)} aria-current={active ? 'page' : undefined}
                        className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${active ? 'bg-primary/12 text-primary font-semibold' : 'text-foreground hover:bg-muted/60'}`}>
                        <span aria-hidden="true" className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-primary/15 text-primary' : 'bg-muted/80 text-muted-foreground'}`}>{h.icon}</span>
                        <span className="text-sm truncate flex-1">{h.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null;
            const isCollapsed = Boolean(collapsed[group.id]);
            const panelId = `settings-nav-group-${group.id}`;
            return (
              <React.Fragment key={group.id}>
              {hubBlock}
              <div>
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  aria-controls={panelId}
                  onClick={() => setCollapsed((prev) => ({ ...prev, [group.id]: !isCollapsed }))}
                  className="w-full flex items-center justify-between gap-2 px-2 py-1 mb-0.5 rounded-md text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <span className="truncate text-left">{tr(group.label)}</span>
                  <ChevronDown
                    size={13}
                    aria-hidden="true"
                    className={`shrink-0 transition-transform motion-reduce:transition-none ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>
                {!isCollapsed && (
                  <div id={panelId} className="space-y-0.5">
                    {group.categories.map((cat) => (
                      <CategoryNavButton
                        key={cat.id}
                        cat={cat}
                        active={selectedCategoryId === cat.id}
                        iconFor={iconFor}
                        onSelect={onSelectCategory}
                      />
                    ))}
                  </div>
                )}
              </div>
              </React.Fragment>
            );
          })
        )}
      </nav>
    </aside>
  );
}

function CategoryNavButton({
  cat,
  active,
  iconFor,
  onSelect,
  badge,
}: {
  cat: ConsumerSettingCategory;
  active: boolean;
  iconFor: (iconName: string) => React.ReactNode;
  onSelect: (cat: ConsumerSettingCategory) => void;
  badge?: number;
}) {
  const tr = useSettingsTr();
  const { currentLang } = useL10n();
  const langMeta =
    cat.id === 'language'
      ? getLanguageByCode(currentLang) || getLanguageByCode(String(currentLang || '').split(/[-_]/)[0])
      : null;
  return (
    <button
      type="button"
      onClick={() => onSelect(cat)}
      aria-current={active ? 'page' : undefined}
      title={cat.description}
      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        active ? 'bg-primary/12 text-primary font-semibold' : 'text-foreground hover:bg-muted/60'
      }`}
    >
      <span
        aria-hidden="true"
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          active ? 'bg-primary/15 text-primary' : 'bg-muted/80 text-muted-foreground'
        }`}
      >
        {iconFor(cat.iconName)}
      </span>
      <span className="text-sm truncate flex-1">{tr(cat.name)}</span>
      {langMeta && (
        <span className="text-[11px] text-muted-foreground font-medium shrink-0 max-w-[42%] truncate">
          {langMeta.nativeName}
        </span>
      )}
      {badge !== undefined && (
        <span className="text-[10px] font-semibold rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground" aria-label={`${badge} ${tr('Search Results')}`}>
          {badge}
        </span>
      )}
    </button>
  );
}