import { useMemo } from 'react';
import { useSystemSettings } from './useSystemSettings';
import {
  DEFAULT_FEED_POST_ACTIONS,
  normalizeFeedPostActions,
  type FeedPostActionsConfig,
} from '../lib/feedPostActions';

/** Admin-controlled feed action-bar visibility. Missing settings = all ON. */
export function useFeedPostActions(): FeedPostActionsConfig {
  const settings = useSystemSettings();
  return useMemo(
    () =>
      settings?.feedPostActions
        ? normalizeFeedPostActions(settings.feedPostActions)
        : DEFAULT_FEED_POST_ACTIONS,
    [settings?.feedPostActions],
  );
}
