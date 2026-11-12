import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  resolveAppearanceTheme,
  resolveNavIconStyle,
  type NavIconStyle,
} from '@wevsoft/shared/nav-icon-style';
import { useSettingsStore } from '../stores/settingsStore';
import {
  getNavIconStyleState,
  hydrateNavIconAdminDefaults,
  subscribeNavIconStyleState,
} from '../lib/navIconStyleState';
import { useSystemSettings } from './useSystemSettings';

function subscribePrefersDark(callback: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => callback();
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
  else mq.addListener(handler);
  return () => {
    if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', handler);
    else mq.removeListener(handler);
  };
}

function getPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useNavIconStyle(): NavIconStyle {
  const themePref = useSettingsStore((s) => s.theme);
  const snapshot = useSyncExternalStore(subscribeNavIconStyleState, getNavIconStyleState, getNavIconStyleState);
  const [prefersDark, setPrefersDark] = useState(getPrefersDark);
  const system = useSystemSettings();

  useEffect(() => subscribePrefersDark(() => setPrefersDark(getPrefersDark())), []);

  useEffect(() => {
    if (system?.navIconStyleDefaults) {
      hydrateNavIconAdminDefaults(system.navIconStyleDefaults);
    }
  }, [system?.navIconStyleDefaults]);

  const style = useMemo(() => {
    const appearance = resolveAppearanceTheme(themePref, prefersDark);
    return resolveNavIconStyle({
      theme: appearance,
      userLight: snapshot.user.light,
      userDark: snapshot.user.dark,
      adminDefaults: snapshot.admin,
    });
  }, [themePref, prefersDark, snapshot]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.navIconStyle = style;
  }, [style]);

  return style;
}
