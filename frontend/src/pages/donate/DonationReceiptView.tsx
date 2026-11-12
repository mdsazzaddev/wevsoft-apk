import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  errorMessage,
  fetchDonationReceipt,
  formatDate,
  formatMoney,
  type DonationReceipt,
} from '../../lib/donationApi';

const PRINT_CSS = `
@media print {
  body > *:not(#donation-receipt-portal) { display: none !important; }
  #donation-receipt-portal { position: static !important; inset: auto !important; overflow: visible !important; background: #fff !important; }
  #donation-receipt-portal .no-print { display: none !important; }
  #donation-receipt-sheet { box-shadow: none !important; border: 1px solid #ccc !important; color: #000 !important; background: #fff !important; }
  #donation-receipt-sheet * { color: #000 !important; }
}
`;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-border py-2 text-body-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold text-foreground">{value}</dd>
    </div>
  );
}

/** Full-screen printable receipt. Use the browser's Print → Save as PDF to download. */
export function DonationReceiptView({ donationId, onClose }: { donationId: string; onClose: () => void }) {
  const [receipt, setReceipt] = useState<DonationReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchDonationReceipt(donationId)
      .then((r) => alive && setReceipt(r))
      .catch((e) => alive && setError(errorMessage(e, 'Receipt is not available')));
    return () => { alive = false; };
  }, [donationId]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return createPortal(
    <div id="donation-receipt-portal" role="dialog" aria-modal="true" aria-label="Donation receipt" className="fixed inset-0 z-(--z-modal) overflow-y-auto bg-background">
      <style>{PRINT_CSS}</style>
      <div className="no-print sticky top-0 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <p className="text-body-sm font-semibold text-foreground">Receipt</p>
        <div className="flex gap-2">
          <Button size="sm" leftIcon={<Printer className="size-4" />} disabled={!receipt} onClick={() => window.print()}>Print / Save PDF</Button>
          <Button size="sm" variant="secondary" leftIcon={<X className="size-4" />} onClick={onClose}>Close</Button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-4 sm:p-8">
        {error ? (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-body-sm text-destructive">{error}</p>
        ) : !receipt ? (
          <Skeleton className="h-96" />
        ) : (
          <article id="donation-receipt-sheet" className="rounded-xl border border-border bg-card p-6 sm:p-10">
            <header className="flex items-start justify-between gap-4 border-b border-border pb-5">
              <div>
                <h1 className="text-2xl font-extrabold text-foreground">Donation receipt</h1>
                <p className="mt-1 text-body-sm text-muted-foreground">{receipt.issuerName || 'WebSoft'}</p>
              </div>
              <div className="text-right">
                <p className="text-caption text-muted-foreground">Receipt no.</p>
                <p className="font-mono text-body-sm font-bold text-foreground">{receipt.receiptNumber || '—'}</p>
              </div>
            </header>
            <p className="my-6 text-center text-3xl font-extrabold text-foreground">{formatMoney(receipt.amount, receipt.currency)}</p>
            <dl>
              <Row label="Tracking ID" value={receipt.publicReference || '—'} />
              <Row label="Donor" value={receipt.donorName || '—'} />
              <Row label="Payment method" value={receipt.methodName || '—'} />
              {receipt.campaignTitle && <Row label="Campaign" value={receipt.campaignTitle} />}
              {receipt.transactionReference && <Row label="Transaction reference" value={receipt.transactionReference} />}
              <Row label="Approved on" value={formatDate(receipt.approvedAt, true)} />
              <Row label="Issued on" value={formatDate(receipt.issuedAt || receipt.approvedAt, true)} />
            </dl>
            {receipt.disclaimer && <p className="mt-6 border-t border-border pt-4 text-caption text-muted-foreground">{receipt.disclaimer}</p>}
          </article>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default DonationReceiptView;
