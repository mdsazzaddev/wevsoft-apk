/** Platform roles — mirror backend authorization vocabulary. */

export const USER_ROLES = [
  'user',
  'moderator',
  'teacher',
  'principal',
  'admin',
  'superadmin',
  'governance_moderator',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_ROLES: UserRole[] = ['admin', 'superadmin'];

export function isAdminRole(role?: string | null): boolean {
  const r = String(role || '').toLowerCase();
  return r === 'admin' || r === 'superadmin';
}
