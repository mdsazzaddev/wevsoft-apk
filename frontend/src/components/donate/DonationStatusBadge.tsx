import React from 'react';
import { cn } from '../ui/cn';
import { STATUS_LABEL, type DonationStatus } from '../../lib/donationApi';

const TONE: Record<DonationStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SUBMITTED: 'bg-primary/10 text-primary',
  UNDER_REVIEW: 'bg-warning/15 text-warning',
  APPROVED: 'bg-success/15 text-success',
  REJECTED: 'bg-destructive/10 text-destructive',
  CANCELLED: 'bg-muted text-muted-foreground',
};

export function DonationStatusBadge({ status, className }: { status: DonationStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-semibold',
        TONE[status] ?? TONE.SUBMITTED,
        className,
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default DonationStatusBadge;
