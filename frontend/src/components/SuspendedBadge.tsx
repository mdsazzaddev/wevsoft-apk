import { AlertTriangle } from 'lucide-react';
import { isUserSuspended } from '../lib/suspendedUser';

export default function SuspendedBadge({
  user,
  className = '',
}: {
  user?: { status?: string | null; isSuspended?: boolean | null } | null;
  className?: string;
}) {
  if (!isUserSuspended(user)) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${className}`}>
      <AlertTriangle size={11} />
      Suspended
    </span>
  );
}
