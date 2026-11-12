/** True when a user payload represents an active suspension. */
export function isUserSuspended(
  user: { status?: string | null; isSuspended?: boolean | null } | null | undefined,
): boolean {
  if (!user) return false;
  return user.isSuspended === true || user.status === 'suspended';
}
