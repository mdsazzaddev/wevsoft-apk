import { isAdminRole } from '@wevsoft/shared/types/roles';

export function rejectAdminConsumerUser(user?: { role?: string | null } | null): boolean {
  return isAdminRole(user?.role);
}
