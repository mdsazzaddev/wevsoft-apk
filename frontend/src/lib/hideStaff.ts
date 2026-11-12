/**
 * Defensive client-side filter: staff (admin / moderator / support / system)
 * accounts are hidden by the backend for ordinary users — this only guards
 * against stale caches or older endpoints that still leak a role field.
 */
const STAFF_ROLES = new Set(['superadmin', 'super_admin', 'admin', 'moderator', 'governance_moderator', 'support', 'staff', 'system']);

export function isStaffRoleClient(role?: unknown): boolean {
  return STAFF_ROLES.has(String(role || '').trim().toLowerCase());
}

export function withoutStaff<T>(rows: T[] | null | undefined, viewerRole?: unknown): T[] {
  const list = Array.isArray(rows) ? rows : [];
  if (isStaffRoleClient(viewerRole)) return list;
  return list.filter((r: any) => !(r && (isStaffRoleClient(r.role) || r.officialTeam || r.isAdmin)));
}