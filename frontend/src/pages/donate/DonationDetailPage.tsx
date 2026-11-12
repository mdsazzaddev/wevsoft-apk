import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Check, Circle, FileText, X } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { cn } from '../../components/ui/cn';
import { AppNavLink } from '../../components/navigation/AppNavLink';
import { DonationStatusBadge } from '../../components/donate/DonationStatusBadge';
import { CopyField } from '../../components/donate/CopyField';
import { DonationReceiptView } from './DonationReceiptView';
import { errorMessage, fetchDonation, formatDate, formatMoney, type Donation } from '../../lib/donationApi';

type StepState = 'done' | 'current' | 'upcoming' | 'failed';

function timeline(d: Donation): { label: string; state: StepState; at: string | null; note?: string }[] {
  const s = d.status;
  const reviewed = s === 'UNDER_REVIEW' || s === 'APPROVED' || s === 'REJECTED';
  const final: { label: string; state: StepState; at: string | null; note?: string } =
    s === 'APPROVED'
      ? { label: 'Approved', state: 'done', at: d.approvedAt }
      : s === 'REJECTED'
        ? { label: 'Rejected', state: 'failed', at: d.rejectedAt, note: d.rejectionReason || undefined }
        : { label: 'Approved / Rejected', state: 'upcoming', at: null };
  return [
    {
      label: 'Submitted',
      state: s === 'DRAFT' || s === 'CANCELLED' ? (s === 'DRAFT' ? 'current' : 'upcoming') : 'done',
      at: d.submittedAt || (s === 'DRAFT' ? null : d.createdAt),
      note: s === 'DRAFT' ? 'Payment details not submitted yet' : undefined,
    },
    {
      label: 'Under review',
      state: s === 'UNDER_REVIEW' || s === 'SUBMITTED' ? 'current' : reviewed ? 'done' : 'upcoming',
      at: d.reviewedAt,
      note: s === 'SUBMITTED' || s === 'UNDER_REVIEW' ? 'Staff are verifying your payment' : undefined,
    },
    final,
  ];
}

function Dot({ state }: { state: StepState }) {
  const base = 'flex size-7 items-center justify-center rounded-full';
  if (state === 'done') return <span className={cn(base, 'bg-success text-primary-foreground')}><Check className="size-4" /></span>;
  if (state === 'failed') return <span className={cn(base, 'bg-destructive text-destructive-foreground')}><X className="size-4" /></span>;
  if (state === 'current') return <span className={cn(base, 'border-2 border-primary text-primary')}><Circle className="size-2.5 fill-current" /></span>;
  return <span className={cn(base, 'border border-border text-muted-foreground')}><Circle className="size-2.5" /></span>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-border py-2.5 text-body-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold text-foreground">{value}</dd>
    </div>
  );
}

export function DonationDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [donation, setDonation] = useState<Donation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDonation(await fetchDonation(id));
    } catch (e) {
      setError(errorMessage(e, 'Donation not found'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="flex min-h-full w-full flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex w-full max-w-[2400px] items-center gap-3 px-3 py-2.5 sm:px-5 lg:px-6 2xl:px-10">
          <AppNavLink
            to="/donate/history"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
            aria-label="Back to my donations"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </AppNavLink>
          <h1 className="min-w-0 flex-1 truncate text-base font-extrabold text-foreground sm:text-lg">Donation detail</h1>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[2400px] flex-1 px-3 pb-24 pt-4 sm:px-5 lg:px-6 2xl:px-10 md:pb-12">

      {loading ? (
        <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-48" /></div>
      ) : error || !donation ? (
        <Card className="text-center">
          <p role="alert" className="text-body-sm text-destructive">{error || 'Donation not found'}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void load()}>Retry</Button>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card padding="lg">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-caption text-muted-foreground">Donation</p>
                <h1 className="text-2xl font-extrabold text-foreground">{formatMoney(donation.amount, donation.currency)}</h1>
              </div>
              <DonationStatusBadge status={donation.status} />
            </div>
            <div className="mt-4 max-w-sm"><CopyField label="Tracking ID" value={donation.publicReference} /></div>
            {donation.status === 'APPROVED' && (
              <Button className="mt-4" leftIcon={<FileText className="size-4" />} onClick={() => setReceiptOpen(true)}>View receipt</Button>
            )}
          </Card>

          <Card padding="lg">
            <h2 className="mb-4 text-body font-bold text-foreground">Progress</h2>
            <ol>
              {timeline(donation).map((step, i, arr) => (
                <li key={step.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <Dot state={step.state} />
                    {i < arr.length - 1 && <span className="my-1 w-px flex-1 bg-border" aria-hidden="true" />}
                  </div>
                  <div className="pb-5">
                    <p className={cn('text-body-sm font-semibold', step.state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground')}>{step.label}</p>
                    {step.at && <p className="text-caption text-muted-foreground">{formatDate(step.at, true)}</p>}
                    {step.note && <p className={cn('mt-1 text-body-sm', step.state === 'failed' ? 'text-destructive' : 'text-muted-foreground')}>{step.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
            {donation.status === 'REJECTED' && !donation.rejectionReason && (
              <p className="text-body-sm text-muted-foreground">No reason was provided. Contact support if you need help.</p>
            )}
            {donation.status === 'CANCELLED' && <p className="text-body-sm text-muted-foreground">This donation was cancelled.</p>}
          </Card>

          <Card padding="lg">
            <h2 className="mb-2 text-body font-bold text-foreground">Details</h2>
            <dl>
              <Row label="Payment method" value={donation.methodName || '—'} />
              {donation.campaignTitle && <Row label="Campaign" value={donation.campaignTitle} />}
              <Row label="Transaction reference" value={donation.transactionReference || '—'} />
              {donation.senderReference && <Row label="Sender" value={donation.senderReference} />}
              {donation.paymentDate && <Row label="Payment date" value={formatDate(donation.paymentDate)} />}
              <Row label="Created" value={formatDate(donation.createdAt, true)} />
              <Row label="Shown as" value={donation.anonymous ? 'Anonymous' : donation.donorDisplayName || 'Your name'} />
              <Row label="Donor wall" value={donation.showOnDonorWall ? 'Opted in' : 'Not shown'} />
            </dl>
            {donation.donorMessage && <p className="mt-3 text-body-sm text-muted-foreground">“{donation.donorMessage}”</p>}
          </Card>

          <Card padding="lg">
            <h2 className="mb-3 text-body font-bold text-foreground">Payment proof</h2>
            {donation.proofs.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No proof images were attached.</p>
            ) : (
              <ul className="flex flex-wrap gap-3">
                {donation.proofs.map((p, i) => (
                  <li key={p.id}>
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noreferrer" className="block size-28 overflow-hidden rounded-md border border-border bg-muted">
                        <img src={p.url} alt={p.name || `Proof ${i + 1}`} loading="lazy" className="size-full object-cover" />
                      </a>
                    ) : (
                      <span className="flex size-28 items-center justify-center rounded-md border border-border bg-muted p-2 text-center text-caption text-muted-foreground">{p.name || `Proof ${i + 1}`}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {receiptOpen && donation && <DonationReceiptView donationId={donation.id} onClose={() => setReceiptOpen(false)} />}
      </div>
    </div>
  );
}

export default DonationDetailPage;
