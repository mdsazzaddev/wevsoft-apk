import { useStore } from '../../../store';

/**
 * Admin toggle for Creator Pro (Admin → General Settings → General Options → Creator Studio).
 * Backed by FeatureFlag `creator_pro_enabled`, exposed as `creatorProEnabled` on
 * GET /api/settings/system. Missing / not loaded yet = OFF, so nothing Pro flashes.
 */
export function useCreatorProEnabled(): boolean {
  return useStore((s) => s.systemSettings?.creatorProEnabled === true);
}

/** True once /api/settings/system has loaded (so an OFF answer is final, not just "loading"). */
export function useSystemSettingsLoaded(): boolean {
  return useStore((s) => s.systemSettings != null);
}
