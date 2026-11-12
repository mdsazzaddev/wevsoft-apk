import { useEffect, useState } from 'react';
import { isStandaloneDisplay } from '../lib/pwaDisplay';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

/**
 * Captures Chrome/Edge `beforeinstallprompt` so Android can Install App from
 * an in-app button (menu Install is unreliable / engagement-gated).
 */
export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() =>
    typeof window !== 'undefined' ? isStandaloneDisplay() : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const canInstall = Boolean(deferred) && !installed;

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferred) return 'unavailable';
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome === 'accepted') setInstalled(true);
      return choice.outcome;
    } catch {
      setDeferred(null);
      return 'unavailable';
    }
  };

  return { canInstall, installed, promptInstall };
}
