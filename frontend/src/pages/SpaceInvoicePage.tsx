/** /space-invoice/:invoiceId — the invoice as its customer (or the Space team) sees it. */

import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { spaceDeskPath, spacePublicPath } from '@wevsoft/shared/wevspace';
import { fetchInvoice } from '../lib/wevspaceManageApi';

const bdt = (n: number) => `৳${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function SpaceInvoicePage() {
  const { invoiceId = '' } = useParams();
  const q = useQuery({ queryKey: ['spaceInvoice', invoiceId], queryFn: () => fetchInvoice(invoiceId), retry: false });
  const inv = q.data;
  return (
    <div className="min-h-[70vh] px-4 py-8">
      <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-card p-6 sm:p-8">
        {q.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading invoice…</p>
        ) : !inv ? (
          <div className="text-center">
            <h1 className="text-lg font-semibold">Invoice not found</h1>
            <p className="mt-1 text-sm text-muted-foreground">It may have been removed, or it isn't addressed to you.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoice</p>
                <h1 className="text-2xl font-bold">{inv.number}</h1>
                {inv.space && (
                  <Link to={spacePublicPath(inv.space.handle)} className="text-sm text-muted-foreground hover:underline">from {inv.space.name}</Link>
                )}
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-muted">{inv.status.toLowerCase()}</span>
            </div>
            <div className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Billed to</p><p className="font-medium">{inv.customerName}</p>{inv.customerEmail && <p className="text-muted-foreground">{inv.customerEmail}</p>}</div>
              <div><p className="text-muted-foreground text-xs">Dates</p><p>Issued {new Date(inv.createdAt).toLocaleDateString()}</p>{inv.dueDate && <p>Due {new Date(inv.dueDate).toLocaleDateString()}</p>}{inv.paidAt && <p>Paid {new Date(inv.paidAt).toLocaleDateString()}</p>}</div>
            </div>
            <table className="mt-6 w-full text-sm">
              <thead><tr className="text-left text-muted-foreground text-xs border-b border-border"><th className="py-2">Item</th><th className="py-2 w-14 text-right">Qty</th><th className="py-2 w-28 text-right">Price</th><th className="py-2 w-28 text-right">Amount</th></tr></thead>
              <tbody>
                {inv.items.map((it, i) => (
                  <tr key={i} className="border-b border-border/60"><td className="py-2">{it.description}</td><td className="py-2 text-right">{it.quantity}</td><td className="py-2 text-right">{bdt(it.unitPrice)}</td><td className="py-2 text-right">{bdt(it.quantity * it.unitPrice)}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-end text-lg font-bold">Total {bdt(inv.total)}</div>
            {inv.note && <p className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">{inv.note}</p>}
            <p className="mt-6 text-xs text-muted-foreground">
              Pay {inv.space?.name || 'the Space'} by bKash, Nagad, card or cash as agreed. Wevsoft does not collect this payment; the Space marks the invoice paid.
            </p>
            <div className="mt-4 flex gap-2">
              {inv.conversationId && !inv.viewerIsTeam && <Link to={`/messages/${inv.conversationId}`} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">Message {inv.space?.name}</Link>}
              {inv.viewerIsTeam && inv.space && <Link to={spaceDeskPath(inv.space.handle, 'invoices')} className="px-4 py-2 rounded-xl border border-border text-sm font-medium">Back to invoices</Link>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
