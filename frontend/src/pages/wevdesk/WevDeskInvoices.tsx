/** WevDesk → Invoices: create, send (as a Space message) and mark paid. No payment capture. */

import { useState } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createInvoice, fetchInvoices, fetchManagedFollowers, setInvoiceStatus, type InvoiceStatus, type SpaceInvoice } from '../../lib/wevspaceManageApi';
import { useDesk } from './deskContext';
import { money } from './deskData';
import { DeskButton, EmptyNote, PageHeader, Pill, StatTile, cx } from './deskUi';

type Item = { description: string; quantity: string; unitPrice: string };
const TONE: Record<InvoiceStatus, 'green' | 'grey' | 'ai'> = { DRAFT: 'grey', SENT: 'ai', PAID: 'green', CANCELLED: 'grey' };
const field = 'w-full h-[38px] rounded-[10px] border border-[var(--wd-btn-border)] bg-white px-3 text-[13px] outline-none focus:border-[var(--wd-teal)]';

export default function WevDeskInvoices() {
  const { spaceId, managePath, can, deskPath } = useDesk();
  const qc = useQueryClient();
  const key = ['wevdesk', spaceId, 'invoices'];
  const list = useQuery({ queryKey: key, queryFn: () => fetchInvoices(spaceId), retry: false, enabled: can('monetization.view') });
  const canManage = Boolean(list.data?.canManage);

  const [customerQ, setCustomerQ] = useState('');
  const [customer, setCustomer] = useState<any | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [items, setItems] = useState<Item[]>([{ description: '', quantity: '1', unitPrice: '' }]);
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const followers = useQuery({
    queryKey: ['wevdesk', spaceId, 'invoice-customers', customerQ],
    queryFn: () => fetchManagedFollowers(spaceId, { search: customerQ, limit: 6 }),
    enabled: customerQ.trim().length >= 2 && !customer,
    retry: false,
  });
  const total = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const reset = () => {
    setCustomer(null); setCustomerQ(''); setCustomerName(''); setCustomerEmail('');
    setItems([{ description: '', quantity: '1', unitPrice: '' }]); setDueDate(''); setNote('');
  };
  const create = useMutation({
    mutationFn: (send: boolean) =>
      createInvoice(spaceId, {
        customerUserId: customer?.id || null,
        customerName: customer ? undefined : customerName,
        customerEmail: customerEmail || undefined,
        items: items.filter((i) => i.description.trim()).map((i) => ({ description: i.description, quantity: Number(i.quantity) || 1, unitPrice: Number(i.unitPrice) || 0 })),
        dueDate: dueDate || null,
        note: note || undefined,
        send,
      }),
    onSuccess: (inv) => {
      setMsg({ ok: true, text: inv.status === 'SENT' ? `${inv.number} sent to ${inv.customerName} in WevChat.` : `${inv.number} saved as a draft.` });
      reset();
      void qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => setMsg({ ok: false, text: e?.message || 'Could not save the invoice' }),
  });
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: Exclude<InvoiceStatus, 'DRAFT'> }) => setInvoiceStatus(v.id, v.status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => setMsg({ ok: false, text: e?.message || 'Could not update the invoice' }),
  });

  const hasCustomer = Boolean(customer || customerName.trim());
  const valid = hasCustomer && total > 0 && items.some((i) => i.description.trim());
  const blocked = !canManage ? 'Your role cannot create invoices (needs Monetization manage)' : !valid ? 'Add a customer, an item and a price' : null;
  const sendBlocked = blocked || (!customer ? 'Pick a Wevsoft follower to send by message (or save a draft and mark it paid)' : null);

  if (!can('monetization.view')) {
    return (
      <div className="px-3 sm:px-5 pt-2"><PageHeader icon={FileText} title="Invoices" subtitle="Your role on this Space does not include monetization, so invoices are hidden." /></div>
    );
  }

  return (
    <div className="px-3 sm:px-5 pb-8 pt-2 space-y-4 max-w-[1300px]">
      <PageHeader
        icon={FileText}
        title="Invoices"
        subtitle="Bill a customer. Sending delivers the invoice to them in WevChat from your Space. Payment isn't collected here: mark it paid when you receive bKash, Nagad, card or cash."
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatTile label="Unpaid" value={money(list.data?.totals.unpaid ?? 0)} sub="Sent, waiting for payment" />
        <StatTile label="Paid this month" value={money(list.data?.totals.paidThisMonth ?? 0)} sub="Marked paid" />
        <StatTile label="Invoices sent" value={list.data?.totals.sent ?? 0} sub="All time" />
        <StatTile label="Drafts" value={(list.data?.invoices || []).filter((i) => i.status === 'DRAFT').length} sub="Not sent yet" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="wd-card p-[18px] lg:col-span-2">
          <h2 className="text-[15px] font-semibold">New invoice</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="text-[12px] text-[var(--wd-text-2)] relative">
              Customer
              {customer ? (
                <div className="mt-1 flex items-center gap-2 h-[38px] rounded-[10px] border border-[var(--wd-teal)] bg-[#f1faf7] px-3 text-[13px]">
                  <span className="flex-1 truncate">{customer.name || customer.username} <span className="text-[var(--wd-muted)]">@{customer.username}</span></span>
                  <button type="button" onClick={() => setCustomer(null)} className="text-[11.5px] text-[var(--wd-muted)] hover:underline">Change</button>
                </div>
              ) : (
                <>
                  <input value={customerQ} onChange={(e) => { setCustomerQ(e.target.value); setCustomerName(e.target.value); }} placeholder="Search a follower, or type a name" className={cx(field, 'mt-1')} />
                  {(followers.data?.followers || []).length > 0 && (
                    <ul className="absolute z-10 left-0 right-0 mt-1 rounded-[10px] border border-[var(--wd-border)] bg-white shadow-lg py-1">
                      {followers.data!.followers.map((f: any) => (
                        <li key={f.user?.id || f.id}>
                          <button type="button" onClick={() => { setCustomer(f.user); setCustomerQ(''); }} className="w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-[#f5f6f8]">
                            {f.user?.name || f.user?.username} <span className="text-[var(--wd-muted)]">@{f.user?.username}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
            <label className="text-[12px] text-[var(--wd-text-2)]">Email (optional)<input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@example.com" className={cx(field, 'mt-1')} /></label>
          </div>
          <div className="mt-4 space-y-2">
            <div className="hidden sm:grid grid-cols-[1fr_80px_120px_32px] gap-2 text-[11px] text-[var(--wd-muted)]"><span>Item</span><span>Qty</span><span>Price (৳)</span><span /></div>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_70px_100px_32px] sm:grid-cols-[1fr_80px_120px_32px] gap-2">
                <input value={it.description} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} placeholder="Description" className={field} />
                <input value={it.quantity} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, quantity: e.target.value.replace(/\D/g, '') } : x)))} inputMode="numeric" className={field} />
                <input value={it.unitPrice} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value.replace(/[^\d.]/g, '') } : x)))} inputMode="decimal" placeholder="0" className={field} />
                <button type="button" aria-label="Remove item" disabled={items.length === 1} onClick={() => setItems(items.filter((_, j) => j !== i))} className="grid place-items-center rounded-[10px] text-[var(--wd-muted)] hover:bg-[var(--wd-chip)] disabled:opacity-30"><Trash2 size={15} /></button>
              </div>
            ))}
            <button type="button" onClick={() => setItems([...items, { description: '', quantity: '1', unitPrice: '' }])} disabled={items.length >= 30} className="inline-flex items-center gap-1 text-[12px] text-[var(--wd-teal)] hover:underline"><Plus size={14} /> Add item</button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] text-[var(--wd-text-2)]">Due date (optional)<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={cx(field, 'mt-1')} /></label>
            <label className="text-[12px] text-[var(--wd-text-2)]">Note (optional)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. bKash 01XXXXXXXXX" className={cx(field, 'mt-1')} /></label>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--wd-line)] pt-3">
            <span className="text-[12.5px] text-[var(--wd-text-2)]">Total</span>
            <span className="text-[17px] font-bold">{money(total)}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DeskButton disabled={Boolean(sendBlocked) || create.isPending} title={sendBlocked || undefined} onClick={() => { setMsg(null); create.mutate(true); }} className="bg-[var(--wd-teal)] text-white border-transparent">Send invoice</DeskButton>
            <DeskButton disabled={Boolean(blocked) || create.isPending} title={blocked || undefined} onClick={() => { setMsg(null); create.mutate(false); }}>Save draft</DeskButton>
            {msg && <span className={cx('text-[12px]', msg.ok ? 'text-[var(--wd-green)]' : 'text-[#b42318]')}>{msg.text}</span>}
          </div>
        </section>
        <section className="wd-card p-[18px]">
          <h2 className="text-[15px] font-semibold">How customers pay</h2>
          <p className="mt-1 text-[12px] text-[var(--wd-muted)]">The customer gets a message with the invoice link. Collect payment by bKash, Nagad, card or cash, then mark it paid here.</p>
          <div className="mt-3 space-y-2">
            {can('monetization.view') && <DeskButton to={managePath('monetization')}>Monetization & payouts</DeskButton>}
            <DeskButton to={deskPath('inbox')}>Open Chat</DeskButton>
          </div>
        </section>
      </div>
      <section className="wd-card p-[18px]">
        <h2 className="text-[15px] font-semibold">All invoices</h2>
        <div className="mt-3">
          {list.isLoading ? (
            <p className="text-[12px] text-[var(--wd-muted)]">Loading…</p>
          ) : !list.data || list.data.invoices.length === 0 ? (
            <EmptyNote title="No invoices yet">Invoices you create are listed here with their status.</EmptyNote>
          ) : (
            <ul className="divide-y divide-[var(--wd-line)]">
              {list.data.invoices.map((inv: SpaceInvoice) => (
                <li key={inv.id} className="py-3 flex flex-wrap items-center gap-3">
                  <Link to={`/space-invoice/${inv.id}`} className="w-[84px] text-[12.5px] font-semibold hover:underline">{inv.number}</Link>
                  <span className="flex-1 min-w-[160px]">
                    <span className="block text-[12.5px]">{inv.customerName}</span>
                    <span className="block text-[11px] text-[var(--wd-muted)]">{new Date(inv.createdAt).toLocaleDateString()}{inv.dueDate ? ` · due ${new Date(inv.dueDate).toLocaleDateString()}` : ''}</span>
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums">{money(inv.total, inv.currency)}</span>
                  <Pill tone={TONE[inv.status]}>{inv.status.toLowerCase()}</Pill>
                  {canManage && (
                    <span className="flex gap-1.5">
                      {inv.status === 'DRAFT' && inv.customerUserId && <DeskButton onClick={() => setStatus.mutate({ id: inv.id, status: 'SENT' })} disabled={setStatus.isPending}>Send</DeskButton>}
                      {(inv.status === 'DRAFT' || inv.status === 'SENT') && <DeskButton onClick={() => setStatus.mutate({ id: inv.id, status: 'PAID' })} disabled={setStatus.isPending}>Mark paid</DeskButton>}
                      {(inv.status === 'DRAFT' || inv.status === 'SENT') && (
                        <DeskButton onClick={() => { if (window.confirm(`Cancel ${inv.number}?`)) setStatus.mutate({ id: inv.id, status: 'CANCELLED' }); }} disabled={setStatus.isPending}>Cancel</DeskButton>
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
