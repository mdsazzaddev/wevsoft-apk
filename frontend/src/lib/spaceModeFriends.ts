import toast from 'react-hot-toast';

/** Soft-login WevSpace mode has no personal friend graph. */
export const SPACE_MODE_FRIENDS_BLOCKED_MSG =
  'Friends are not available while using a WevSpace.';

export function toastSpaceModeFriendsBlocked() {
  toast.error(SPACE_MODE_FRIENDS_BLOCKED_MSG);
}

export const SPACE_MODE_FEATURE_BLOCKED_MSG =
  'This feature is only available for personal accounts and cannot be accessed in Space (Business) mode.';

export function toastSpaceModeFeatureBlocked(featureName?: string) {
  const msg = featureName
    ? `${featureName} is not available while in Space (Business) mode.`
    : SPACE_MODE_FEATURE_BLOCKED_MSG;
  toast.error(msg);
}
