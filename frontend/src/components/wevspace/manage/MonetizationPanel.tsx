/**
 * Money — MP2 §17 (offers) and §20 (ledger, balance, payouts).
 *
 * Three rules shape this panel:
 *
 * 1. No card or wallet processor is connected yet — the server says so through
 *    `paymentsReady: false`. Nothing here may imply money has moved. Every figure
 *    on the Earnings tab comes from ledger rows an admin has confirmed as PAID;
 *    everything else is shown under its real status.
 * 2. Withdrawing is the owner's decision alone. The server refuses a teammate's
 *    payout request outright, so the control stays visible and says why rather
 *    than disappearing and leaving the rule invisible.
 * 3. An offer with transactions against it is retired, never deleted, because the
 *    ledger has to keep pointing at something. The confirmation says which of the
 *    two is about to happen.
 */

import React, { useMemo, useState } from 'react';
import {
  Banknote,
  Coins,
  Handshake,
  Landmark,
  Lock,
  Pencil,
  Plus,
  Receipt,
  Repeat,
  ShoppingBag,
  Trash2,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  MONETIZATION_KINDS,
  MONETIZATION_LIMITS,
  PLATFORM_FEE_PERCENT,
  SUPPORTED_CURRENCIES,
  TRANSACTION_STATUSES,
  TRANSACTION_STATUS_LABELS,
  monetizationKindDef,
  splitRevenue,
  validateMonetizationTier,
  type MonetizationKind,
  type TransactionStatus,
} from '@wevsoft/shared/wevspace';
import {
  deleteMonetizationTier,
  fetchMonetization,
  fetchTransactions,
  requestPayout,
  saveMonetizationSettings,
  saveMonetizationTier,
  type MonetizationOverview,
} from '../../../lib/wevspaceManageApi';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Card,
  CardTitle,
  EmptyState,
  Field,
  IconButton,
  PanelError,
  PanelHeader,
  PanelSkeleton,
  Pill,
  SavedTick,
  SegmentedTabs,
  Select,
  Sheet,
  StatTile,
  TextArea,
  TextInput,
  ToggleRow,
  confirmAction,
  dateTime,
  money,
  num,
  relativeTime,
  statusTone,
  usePanelData,
} from './manageUi';

const TABS = [
  { id: 'earnings', label: 'Earnings' },
  { id: 'offers', label: 'Offers' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'payouts', label: 'Payouts' },
] as const;
type MoneyTab = (typeof TABS)[number]['id'];

function kindIcon(kind: MonetizationKind, size = 14) {
  switch (kind) {
    case 'SUBSCRIPTION':
      return <Repeat size={size} />;
    case 'TIP':
      return <Coins size={size} />;
    case 'PAID_CONTENT':
      return <Lock size={size} />;
    case 'SPONSORED':
      return <Handshake size={size} />;
    default:
      return <ShoppingBag size={size} />;
  }
}

function kindLabel(kind: unknown): string {
  return monetizationKindDef(kind)?.label || String(kind || 'Other');
}

export default function MonetizationPanel() {
  const { spaceId, accent, isOwner, refresh } = useManage();
  const [tab, setTab] = useState<MoneyTab>('earnings');

  const overview = usePanelData<MonetizationOverview>(() => fetchMonetization(spaceId), [spaceId]);
  const { data, loading, error, reload, patch } = overview;

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <PanelHeader title="Money" blurb="What your Space offers, what has been recorded, and what you can withdraw." />
        <PanelSkeleton rows={2} tall />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="space-y-4">
        <PanelHeader title="Money" />
        <PanelError message={error || 'Could not load this section'} onRetry={() => void reload()} />
      </div>
    );
  }

  const currency = data.earnings.currency || data.settings.currency;
  const canManage = data.canManage;

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Money"
        blurb="What your Space offers, what has been recorded against it, and what you can withdraw."
        actions={
          <Pill tone={data.settings.enabled ? statusTone('ACTIVE') : statusTone('PAUSED')}>
            {data.settings.enabled ? 'Monetization on' : 'Monetization off'}
          </Pill>
        }
      />

      {!data.paymentsReady && <PaymentsNotLiveNotice />}

      <SegmentedTabs options={TABS} value={tab} onChange={setTab} accent={accent} />

      {tab === 'earnings' && (
        <EarningsTab data={data} currency={currency} accent={accent} onOpenLedger={() => setTab('ledger')} />
      )}
      {tab === 'offers' && (
        <OffersTab
          spaceId={spaceId}
          data={data}
          currency={currency}
          accent={accent}
          canManage={canManage}
          patch={patch}
          reload={reload}
          refresh={refresh}
        />
      )}
      {tab === 'ledger' && <LedgerTab spaceId={spaceId} currency={currency} accent={accent} />}
      {tab === 'payouts' && (
        <PayoutsTab
          spaceId={spaceId}
          data={data}
          currency={currency}
          accent={accent}
          isOwner={isOwner}
          canManage={canManage}
          reload={reload}
        />
      )}
    </div>
  );
}

/**
 * The honesty notice. This is the whole reason the panel does not look like a
 * payments dashboard: supporters can record intent, and that is all.
 */
function PaymentsNotLiveNotice() {
  return (
    <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
      <p className="text-sm font-black text-amber-700 dark:text-amber-400">
        Card and wallet payments are not connected yet
      </p>
      <p className="mt-1.5 text-xs text-amber-800/90 dark:text-amber-200/80 max-w-2xl">
        Supporters can record that they want to pay, and each record lands in the ledger as{' '}
        <strong>{TRANSACTION_STATUS_LABELS.PENDING_PAYMENT}</strong>. Nothing is charged, and an amount only counts
        towards your balance once a reviewer confirms the money actually arrived. Offers, prices and payout details you
        set here are saved now and apply the moment a processor is switched on.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Earnings
// ──────────────────────────────────────────────────────────────

function EarningsTab({
  data,
  currency,
  accent,
  onOpenLedger,
}: {
  data: MonetizationOverview;
  currency: string;
  accent: string;
  onOpenLedger: () => void;
}) {
  const e = data.earnings;
  const netByKind = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of e.byKind || []) map.set(String(row.kind), Number(row.net) || 0);
    return map;
  }, [e.byKind]);

  const streams = MONETIZATION_KINDS.filter(
    (kind) => data.settings.kinds?.[kind.id] || (netByKind.get(kind.id) || 0) > 0,
  );
  const recent = (data.transactions || []).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Available"
          value={money(e.availableBalance, currency)}
          hint={`Minimum payout ${money(data.minPayout, currency)}`}
          icon={<Wallet size={16} />}
          accent={accent}
        />
        <StatTile
          label="Confirmed"
          value={money(e.netRealised, currency)}
          hint={`${num(e.transactions)} confirmed ${e.transactions === 1 ? 'payment' : 'payments'}`}
          icon={<Banknote size={16} />}
          accent={accent}
        />
        <StatTile
          label="Platform fee"
          value={money(e.feesTaken, currency)}
          hint={`${data.platformFeePercent ?? PLATFORM_FEE_PERCENT}% of ${money(e.grossRealised, currency)}`}
          icon={<Receipt size={16} />}
        />
        <StatTile
          label="Paid out"
          value={money(e.paidOut, currency)}
          hint={e.inFlightPayouts > 0 ? `${money(e.inFlightPayouts, currency)} still being reviewed` : 'No open requests'}
          icon={<Landmark size={16} />}
        />
      </div>

      <Card>
        <CardTitle>How the balance is worked out</CardTitle>
        <div className="rounded-2xl bg-muted p-3 space-y-1.5 text-xs font-semibold">
          <BalanceLine label="Confirmed earnings after fees" value={money(e.netRealised, currency)} />
          <BalanceLine label="Already paid out" value={`− ${money(e.paidOut, currency)}`} />
          <BalanceLine label="Requested and awaiting review" value={`− ${money(e.inFlightPayouts, currency)}`} />
          <div className="pt-1.5 border-t border-border flex items-center justify-between gap-3">
            <span className="font-black">Available to withdraw</span>
            <span className="font-black tabular-nums" style={{ color: accent }}>
              {money(e.availableBalance, currency)}
            </span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Worked out from the ledger every time this page loads rather than stored as a running total, so a mistaken
          entry can never quietly inflate what you are told you can withdraw.
        </p>
      </Card>

      <Card>
        <CardTitle right={<span className="text-[11px] font-bold text-muted-foreground">Confirmed, after fees</span>}>
          By stream
        </CardTitle>
        {streams.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No streams are switched on yet. Turn one on under <strong>Offers</strong> to start using it.
          </p>
        ) : (
          <div className="space-y-2.5">
            {streams.map((kind) => {
              const net = netByKind.get(kind.id) || 0;
              const share = e.netRealised > 0 ? Math.round((net / e.netRealised) * 100) : 0;
              const live = data.settings.enabled && data.settings.kinds?.[kind.id];
              return (
                <div key={kind.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-xs font-bold min-w-0">
                      <span style={{ color: accent }}>{kindIcon(kind.id)}</span>
                      <span className="truncate">{kind.label}</span>
                      {!live && <Pill tone={statusTone('PAUSED')}>Off</Pill>}
                    </span>
                    <span className="text-xs font-black tabular-nums shrink-0">{money(net, currency)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${share}%`, background: accent }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle
          right={
            recent.length > 0 ? (
              <ActionButton size="sm" onClick={onOpenLedger}>
                Full ledger
              </ActionButton>
            ) : undefined
          }
        >
          Latest entries
        </CardTitle>
        {recent.length === 0 ? (
          <EmptyState
            icon={<Receipt size={20} />}
            title="Nothing recorded yet"
            blurb="Tips, subscriptions and sales will appear here the moment somebody records one."
          />
        ) : (
          <div className="divide-y divide-border">
            {recent.map((tx: any) => (
              <TransactionRow key={tx.id} tx={tx} currency={currency} accent={accent} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function BalanceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function TransactionRow({ tx, currency, accent }: { tx: any; currency: string; accent: string }) {
  const status = String(tx.status || '') as TransactionStatus;
  const rowCurrency = tx.currency || currency;
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: accent }}>
              {kindIcon(tx.kind, 13)}
            </span>
            <span className="text-sm font-bold truncate">{kindLabel(tx.kind)}</span>
            {tx.tier?.name && <Pill accent={accent}>{tx.tier.name}</Pill>}
            <Pill tone={statusTone(status)}>{TRANSACTION_STATUS_LABELS[status] || status}</Pill>
          </span>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {tx.payer?.name ? `${tx.payer.name} · ` : ''}
            {dateTime(tx.createdAt)}
          </p>
          {tx.reviewNote && <p className="mt-1 text-[11px] font-semibold text-muted-foreground">“{tx.reviewNote}”</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-black tabular-nums">{money(tx.netAmount, rowCurrency)}</p>
          <p className="text-[10px] font-bold text-muted-foreground tabular-nums">
            {money(tx.grossAmount, rowCurrency)} − {money(tx.feeAmount, rowCurrency)} fee
          </p>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Offers — the master switch, the streams, the tiers
// ──────────────────────────────────────────────────────────────

function OffersTab({
  spaceId,
  data,
  currency,
  accent,
  canManage,
  patch,
  reload,
  refresh,
}: {
  spaceId: string;
  data: MonetizationOverview;
  currency: string;
  accent: string;
  canManage: boolean;
  patch: (next: (current: MonetizationOverview) => MonetizationOverview) => void;
  reload: () => Promise<void>;
  refresh: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [destination, setDestination] = useState(data.settings.payoutDestination || '');
  const [editing, setEditing] = useState<any | null>(null);
  const [adding, setAdding] = useState(false);

  const tiers: any[] = data.tiers || [];
  const atCapacity = tiers.length >= MONETIZATION_LIMITS.maxTiers;

  async function save(body: Parameters<typeof saveMonetizationSettings>[1], key: string) {
    setBusy(key);
    try {
      const res = await saveMonetizationSettings(spaceId, body);
      patch((current) => ({ ...current, settings: res.monetization }));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
      // The nav hides sections a Space has switched off, so the shell re-reads.
      refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Could not save that');
    } finally {
      setBusy(null);
    }
  }

  async function removeTier(tier: any) {
    const ok = confirmAction(
      `Remove “${tier.name}”?\n\nIf anyone has already been recorded against it, it is retired instead — the ledger has to keep pointing at something, so its history stays readable.`,
    );
    if (!ok) return;
    setBusy(`tier:${tier.id}`);
    try {
      const res = await deleteMonetizationTier(tier.id);
      toast.success(res.retired ? `“${tier.name}” retired` : `“${tier.name}” removed`);
      await reload();
    } catch (err: any) {
      toast.error(err?.message || 'Could not remove that offer');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle right={<SavedTick show={saved} />}>Taking money at all</CardTitle>
        <ToggleRow
          label="Monetization"
          blurb="The master switch. With this off, nothing below is live and supporters see no way to pay."
          checked={data.settings.enabled}
          onChange={(next) => void save({ enabled: next }, 'enabled')}
          disabled={!canManage || busy === 'enabled'}
          accent={accent}
        />
        <div className="pt-3 border-t border-border grid gap-3 sm:grid-cols-2">
          <Field
            label="Currency"
            hint="Applies to new entries. Amounts already recorded keep the currency they were recorded in."
          >
            <Select
              value={data.settings.currency}
              disabled={!canManage || busy === 'currency'}
              onChange={(event) => void save({ currency: event.target.value }, 'currency')}
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Where payouts should go"
            hint="Bank details, a wallet address, or however you are paid. Only the owner and reviewers see this."
          >
            <div className="flex items-center gap-2">
              <TextInput
                value={destination}
                maxLength={200}
                placeholder="Account or wallet"
                disabled={!canManage}
                onChange={(event) => setDestination(event.target.value)}
              />
              <ActionButton
                size="sm"
                tone="accent"
                accent={accent}
                busy={busy === 'destination'}
                disabled={!canManage || destination.trim() === (data.settings.payoutDestination || '')}
                onClick={() => void save({ payoutDestination: destination.trim() || null }, 'destination')}
              >
                Save
              </ActionButton>
            </div>
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle right={<span className="text-[11px] font-bold text-muted-foreground">{PLATFORM_FEE_PERCENT}% platform fee</span>}>
          Ways people can support you
        </CardTitle>
        {!data.settings.enabled && (
          <div className="mb-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
            Monetization is switched off, so none of these are live. You can still set them up now.
          </div>
        )}
        <div className="divide-y divide-border">
          {MONETIZATION_KINDS.map((kind) => (
            <ToggleRow
              key={kind.id}
              label={kind.label}
              blurb={kind.blurb}
              checked={data.settings.kinds?.[kind.id] === true}
              onChange={(next) => void save({ kinds: { [kind.id]: next } }, `kind:${kind.id}`)}
              disabled={!canManage || busy === `kind:${kind.id}`}
              accent={accent}
            />
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle
          right={
            canManage ? (
              <ActionButton
                size="sm"
                tone="accent"
                accent={accent}
                disabled={atCapacity}
                title={atCapacity ? `A Space can offer up to ${MONETIZATION_LIMITS.maxTiers} offers` : undefined}
                onClick={() => setAdding(true)}
              >
                <Plus size={13} /> New offer
              </ActionButton>
            ) : undefined
          }
        >
          Offers ({tiers.length}/{MONETIZATION_LIMITS.maxTiers})
        </CardTitle>
        {tiers.length === 0 ? (
          <EmptyState
            icon={<Coins size={20} />}
            title="No offers yet"
            blurb="An offer is one thing somebody can pay for — a monthly tier, a one-off unlock, a suggested tip."
            action={
              canManage ? (
                <ActionButton tone="accent" accent={accent} onClick={() => setAdding(true)}>
                  <Plus size={14} /> Create the first one
                </ActionButton>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-2.5">
            {tiers.map((tier) => (
              <TierRow
                key={tier.id}
                tier={tier}
                currency={currency}
                accent={accent}
                canManage={canManage}
                busy={busy === `tier:${tier.id}`}
                onEdit={() => setEditing(tier)}
                onRemove={() => void removeTier(tier)}
              />
            ))}
          </div>
        )}
      </Card>

      {(adding || editing) && (
        <TierSheet
          spaceId={spaceId}
          tier={editing}
          currency={data.settings.currency}
          accent={accent}
          nextOrder={tiers.length}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setAdding(false);
            setEditing(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function TierRow({
  tier,
  currency,
  accent,
  canManage,
  busy,
  onEdit,
  onRemove,
}: {
  tier: any;
  currency: string;
  accent: string;
  canManage: boolean;
  busy: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const perks: string[] = Array.isArray(tier.perks) ? tier.perks : [];
  const split = splitRevenue(Number(tier.price) || 0);
  return (
    <div className="rounded-2xl bg-muted p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 flex-wrap">
            <span style={{ color: accent }}>{kindIcon(tier.kind, 14)}</span>
            <span className="text-sm font-black truncate">{tier.name}</span>
            <Pill accent={accent}>{kindLabel(tier.kind)}</Pill>
            {!tier.isActive && <Pill tone={statusTone('PAUSED')}>Retired</Pill>}
          </span>
          {tier.description && <p className="mt-1 text-[11px] text-muted-foreground">{tier.description}</p>}
          {perks.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {perks.map((perk, index) => (
                <li key={index} className="text-[11px] font-semibold text-muted-foreground">
                  · {perk}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-black tabular-nums">{money(tier.price, tier.currency || currency)}</p>
          <p className="text-[10px] font-bold text-muted-foreground">
            {tier.intervalDays ? `every ${tier.intervalDays} days` : 'one-off'}
          </p>
          <p className="mt-0.5 text-[10px] font-bold text-muted-foreground tabular-nums">
            you keep {money(split.net, tier.currency || currency)}
          </p>
        </div>
      </div>
      {canManage && (
        <div className="mt-2.5 pt-2.5 border-t border-border flex items-center gap-2">
          <ActionButton size="sm" onClick={onEdit}>
            <Pencil size={12} /> Edit
          </ActionButton>
          <IconButton label={`Remove ${tier.name}`} tone="danger" busy={busy} onClick={onRemove}>
            <Trash2 size={14} />
          </IconButton>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Ledger
// ──────────────────────────────────────────────────────────────

const LEDGER_PAGE = 20;

function LedgerTab({ spaceId, currency, accent }: { spaceId: string; currency: string; accent: string }) {
  const [status, setStatus] = useState<TransactionStatus | 'all'>('all');
  const [kind, setKind] = useState<MonetizationKind | 'all'>('all');
  const [limit, setLimit] = useState(LEDGER_PAGE);

  const ledger = usePanelData(
    () =>
      fetchTransactions(spaceId, {
        status,
        ...(kind === 'all' ? {} : { kind }),
        limit,
      }),
    [spaceId, status, kind, limit],
  );

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Status">
            <Select value={status} onChange={(event) => setStatus(event.target.value as TransactionStatus | 'all')}>
              <option value="all">Every status</option>
              {TRANSACTION_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {TRANSACTION_STATUS_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Stream">
            <Select value={kind} onChange={(event) => setKind(event.target.value as MonetizationKind | 'all')}>
              <option value="all">Every stream</option>
              {MONETIZATION_KINDS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {ledger.loading && !ledger.data && <PanelSkeleton rows={4} />}
      {ledger.error && <PanelError message={ledger.error} onRetry={() => void ledger.reload()} />}

      {ledger.data && (
        <>
          <Card>
            <CardTitle
              right={
                <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                  {num(ledger.data.total)} {ledger.data.total === 1 ? 'entry' : 'entries'}
                </span>
              }
            >
              {status === 'all' ? 'Every entry' : TRANSACTION_STATUS_LABELS[status]}
            </CardTitle>
            <div className="rounded-2xl bg-muted p-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Gross</p>
                <p className="text-sm font-black tabular-nums">{money(ledger.data.sums.gross, currency)}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                  After platform fee
                </p>
                <p className="text-sm font-black tabular-nums">{money(ledger.data.sums.net, currency)}</p>
              </div>
              <p className="text-[11px] text-muted-foreground max-w-xs">
                Totals cover exactly the rows shown by this filter. Only entries marked{' '}
                <strong>{TRANSACTION_STATUS_LABELS.PAID}</strong> count towards your earnings and balance.
              </p>
            </div>
          </Card>

          <Card>
            {ledger.data.transactions.length === 0 ? (
              <EmptyState
                icon={<Receipt size={20} />}
                title="No entries match"
                blurb={
                  status === 'all' && kind === 'all'
                    ? 'Nothing has been recorded against this Space yet.'
                    : 'Try a different status or stream.'
                }
              />
            ) : (
              <>
                <div className="divide-y divide-border">
                  {ledger.data.transactions.map((tx: any) => (
                    <LedgerRow key={tx.id} tx={tx} currency={currency} accent={accent} />
                  ))}
                </div>
                {ledger.data.transactions.length < ledger.data.total && (
                  <div className="mt-3 flex justify-center">
                    <ActionButton
                      busy={ledger.loading}
                      onClick={() => setLimit((current) => current + LEDGER_PAGE)}
                    >
                      Show more
                    </ActionButton>
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

/** Wider than the Earnings preview row: the ledger is where the detail belongs. */
function LedgerRow({ tx, currency, accent }: { tx: any; currency: string; accent: string }) {
  const status = String(tx.status || '') as TransactionStatus;
  const rowCurrency = tx.currency || currency;
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 flex-wrap">
            <span style={{ color: accent }}>{kindIcon(tx.kind, 13)}</span>
            <span className="text-sm font-bold truncate">{kindLabel(tx.kind)}</span>
            <Pill tone={statusTone(status)}>{TRANSACTION_STATUS_LABELS[status] || status}</Pill>
            {tx.tier?.name && <Pill accent={accent}>{tx.tier.name}</Pill>}
            {tx.campaign?.name && <Pill>{tx.campaign.name}</Pill>}
          </span>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {tx.payer?.name ? `${tx.payer.name} · ` : 'No signed-in payer · '}
            {dateTime(tx.createdAt)}
            {tx.provider ? ` · ${tx.provider}` : ''}
            {tx.providerRef ? ` · ref ${tx.providerRef}` : ''}
          </p>
          {tx.reviewNote && (
            <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
              “{tx.reviewNote}”{tx.reviewedAt ? ` — reviewed ${relativeTime(tx.reviewedAt)}` : ''}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-black tabular-nums">{money(tx.netAmount, rowCurrency)}</p>
          <p className="text-[10px] font-bold text-muted-foreground tabular-nums">
            {money(tx.grossAmount, rowCurrency)} − {money(tx.feeAmount, rowCurrency)} fee
          </p>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Payouts
// ──────────────────────────────────────────────────────────────

function PayoutsTab({
  spaceId,
  data,
  currency,
  accent,
  isOwner,
  canManage,
  reload,
}: {
  spaceId: string;
  data: MonetizationOverview;
  currency: string;
  accent: string;
  isOwner: boolean;
  canManage: boolean;
  reload: () => Promise<void>;
}) {
  const [requesting, setRequesting] = useState(false);
  const payouts: any[] = data.payouts || [];
  const balance = data.earnings.availableBalance;
  const belowMinimum = balance < data.minPayout;

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Withdrawing</CardTitle>
        <div className="rounded-2xl bg-muted p-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Available</p>
            <p className="text-2xl font-black tabular-nums" style={{ color: accent }}>
              {money(balance, currency)}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
              Minimum request {money(data.minPayout, currency)}
              {data.earnings.inFlightPayouts > 0
                ? ` · ${money(data.earnings.inFlightPayouts, currency)} already awaiting review`
                : ''}
            </p>
          </div>
          <ActionButton
            tone="accent"
            accent={accent}
            disabled={!isOwner || belowMinimum}
            title={
              !isOwner
                ? 'Only the owner can request a payout'
                : belowMinimum
                  ? `You need at least ${money(data.minPayout, currency)} available`
                  : undefined
            }
            onClick={() => setRequesting(true)}
          >
            <Landmark size={14} /> Request a payout
          </ActionButton>
        </div>
        {!isOwner && (
          <p className="mt-2 text-[11px] font-bold text-muted-foreground">
            Only the owner can request a payout, whatever else the team can manage here. The server refuses anybody
            else, so the button stays visible rather than hiding the rule.
          </p>
        )}
        {isOwner && belowMinimum && (
          <p className="mt-2 text-[11px] font-bold text-muted-foreground">
            You can request a payout once {money(data.minPayout, currency)} has been confirmed.
          </p>
        )}
        {!data.settings.payoutDestination && canManage && (
          <p className="mt-2 text-[11px] font-bold text-muted-foreground">
            No payout destination saved yet — add one under <strong>Offers</strong> so it is pre-filled next time.
          </p>
        )}
      </Card>

      <Card>
        <CardTitle
          right={<span className="text-[11px] font-bold text-muted-foreground">Newest first</span>}
        >
          Requests
        </CardTitle>
        {payouts.length === 0 ? (
          <EmptyState
            icon={<Landmark size={20} />}
            title="No payout requests yet"
            blurb="Every request you make is listed here with what a reviewer decided."
          />
        ) : (
          <div className="divide-y divide-border">
            {payouts.map((payout) => (
              <PayoutRow key={payout.id} payout={payout} currency={currency} />
            ))}
          </div>
        )}
      </Card>

      {requesting && (
        <PayoutSheet
          spaceId={spaceId}
          accent={accent}
          currency={currency}
          balance={balance}
          minimum={data.minPayout}
          destination={data.settings.payoutDestination || ''}
          onClose={() => setRequesting(false)}
          onDone={async () => {
            setRequesting(false);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function PayoutRow({ payout, currency }: { payout: any; currency: string }) {
  const status = String(payout.status || '');
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black tabular-nums">{money(payout.amount, payout.currency || currency)}</span>
            <Pill tone={statusTone(status)}>{status}</Pill>
          </span>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">to {payout.destination || '—'}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {payout.requestedBy?.name ? `${payout.requestedBy.name} · ` : ''}
            requested {relativeTime(payout.requestedAt)}
            {payout.reviewedAt ? ` · reviewed ${relativeTime(payout.reviewedAt)}` : ''}
          </p>
          {payout.note && <p className="mt-1 text-[11px] font-semibold text-muted-foreground">“{payout.note}”</p>}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Editors
// ──────────────────────────────────────────────────────────────

function TierSheet({
  spaceId,
  tier,
  currency,
  accent,
  nextOrder,
  onClose,
  onSaved,
}: {
  spaceId: string;
  tier: any | null;
  currency: string;
  accent: string;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [kind, setKind] = useState<MonetizationKind>((tier?.kind as MonetizationKind) || 'SUBSCRIPTION');
  const [name, setName] = useState(tier?.name || '');
  const [description, setDescription] = useState(tier?.description || '');
  const [price, setPrice] = useState(tier?.price === undefined || tier?.price === null ? '' : String(tier.price));
  const [intervalDays, setIntervalDays] = useState(tier?.intervalDays ? String(tier.intervalDays) : '30');
  const [perksText, setPerksText] = useState<string>((tier?.perks || []).join('\n'));
  const [isActive, setIsActive] = useState<boolean>(tier ? tier.isActive !== false : true);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const recurring = monetizationKindDef(kind)?.recurring === true;
  const perks = perksText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);
  const split = splitRevenue(Number(price) || 0);

  async function submit() {
    const check = validateMonetizationTier({ name, description, price: Number(price), currency });
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setErrors([]);
    setBusy(true);
    try {
      await saveMonetizationTier(
        spaceId,
        {
          kind,
          name: name.trim(),
          description: description.trim() || null,
          price: Number(price),
          currency,
          perks,
          // Only a recurring kind carries an interval; the server nulls it anyway,
          // but sending the truth keeps the payload readable in the audit log.
          intervalDays: recurring ? Number(intervalDays) || null : null,
          isActive,
          order: tier?.order ?? nextOrder,
        },
        tier?.id,
      );
      toast.success(tier ? `“${name.trim()}” updated` : `“${name.trim()}” created`);
      await onSaved();
    } catch (err: any) {
      toast.error(err?.message || 'Could not save that offer');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={tier ? 'Edit offer' : 'New offer'}
      onClose={onClose}
      footer={
        <>
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton tone="accent" accent={accent} busy={busy} onClick={() => void submit()}>
            {tier ? 'Save offer' : 'Create offer'}
          </ActionButton>
        </>
      }
    >
      <div className="space-y-3">
        {errors.length > 0 && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 space-y-0.5">
            {errors.map((message, index) => (
              <p key={index} className="text-[11px] font-bold text-red-600 dark:text-red-400">
                {message}
              </p>
            ))}
          </div>
        )}

        <Field label="What kind of offer is this?">
          <Select value={kind} onChange={(event) => setKind(event.target.value as MonetizationKind)}>
            {MONETIZATION_KINDS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <p className="-mt-1 text-[11px] text-muted-foreground">{monetizationKindDef(kind)?.blurb}</p>

        <Field label="Name" count={`${name.length}/${MONETIZATION_LIMITS.tierName.max}`}>
          <TextInput
            value={name}
            maxLength={MONETIZATION_LIMITS.tierName.max}
            placeholder={recurring ? 'Supporter' : 'Behind the scenes'}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <Field
          label="What they get"
          hint="Shown on your Space. Keep it plain — this is the promise you are making."
          count={`${description.length}/${MONETIZATION_LIMITS.tierDescription.max}`}
        >
          <TextArea
            value={description}
            rows={3}
            maxLength={MONETIZATION_LIMITS.tierDescription.max}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`Price (${currency})`} hint={`${MONETIZATION_LIMITS.minPrice} to ${num(MONETIZATION_LIMITS.maxPrice)}`}>
            <TextInput
              value={price}
              type="number"
              inputMode="decimal"
              min={MONETIZATION_LIMITS.minPrice}
              max={MONETIZATION_LIMITS.maxPrice}
              step="0.01"
              onChange={(event) => setPrice(event.target.value)}
            />
          </Field>
          {recurring && (
            <Field label="Charged every" hint="In days. 30 is roughly monthly, 365 yearly.">
              <TextInput
                value={intervalDays}
                type="number"
                inputMode="numeric"
                min={1}
                max={3650}
                onChange={(event) => setIntervalDays(event.target.value)}
              />
            </Field>
          )}
        </div>

        {Number(price) > 0 && (
          <div className="rounded-2xl bg-muted p-3 text-[11px] font-bold">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Supporter pays</span>
              <span className="tabular-nums">{money(split.gross, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Platform fee ({PLATFORM_FEE_PERCENT}%)</span>
              <span className="tabular-nums">− {money(split.fee, currency)}</span>
            </div>
            <div className="mt-1 pt-1 border-t border-border flex items-center justify-between gap-3">
              <span className="font-black">You keep</span>
              <span className="font-black tabular-nums" style={{ color: accent }}>
                {money(split.net, currency)}
              </span>
            </div>
          </div>
        )}

        <Field label="Perks" hint="One per line, up to 20. Each line is shown as its own bullet." count={`${perks.length}/20`}>
          <TextArea
            value={perksText}
            rows={4}
            placeholder={'Early access to every post\nMember-only chat'}
            onChange={(event) => setPerksText(event.target.value)}
          />
        </Field>

        <div className="rounded-2xl bg-muted px-3">
          <ToggleRow
            label="Offer this now"
            blurb="Switch off to keep the offer but stop showing it to new supporters. Anyone already on it is unaffected."
            checked={isActive}
            onChange={setIsActive}
            accent={accent}
          />
        </div>
      </div>
    </Sheet>
  );
}

function PayoutSheet({
  spaceId,
  accent,
  currency,
  balance,
  minimum,
  destination,
  onClose,
  onDone,
}: {
  spaceId: string;
  accent: string;
  currency: string;
  balance: number;
  minimum: number;
  destination: string;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(Math.round(balance * 100) / 100));
  const [dest, setDest] = useState(destination);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const parsed = Number(amount);
  const amountProblem = !Number.isFinite(parsed) || parsed < minimum
    ? `The minimum payout is ${money(minimum, currency)}.`
    : parsed > balance
      ? `That is more than your available ${money(balance, currency)}.`
      : null;
  const destProblem = dest.trim().length < 4 ? 'Add where the payout should go.' : null;
  const problem = amountProblem || destProblem;

  async function submit() {
    if (problem) return;
    setBusy(true);
    try {
      const res = await requestPayout(spaceId, { amount: parsed, destination: dest.trim(), note: note.trim() || undefined });
      // The server's own wording, shown as-is: it says a reviewer acts on it, not
      // that money is on its way.
      toast.success(res?.message || 'Requested. A reviewer will action it.');
      await onDone();
    } catch (err: any) {
      toast.error(err?.message || 'Could not send that request');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Request a payout"
      onClose={onClose}
      footer={
        <>
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton
            tone="accent"
            accent={accent}
            busy={busy}
            disabled={!!problem}
            title={problem || undefined}
            onClick={() => void submit()}
          >
            Send request
          </ActionButton>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-2xl bg-muted p-3 flex items-center justify-between gap-3">
          <span className="text-xs font-extrabold text-muted-foreground">Available</span>
          <span className="text-sm font-black tabular-nums" style={{ color: accent }}>
            {money(balance, currency)}
          </span>
        </div>

        <Field label={`Amount (${currency})`} error={amountProblem}>
          <TextInput
            value={amount}
            type="number"
            inputMode="decimal"
            min={minimum}
            max={balance}
            step="0.01"
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>

        <Field
          label="Where it should go"
          hint="Only the owner and platform reviewers see this."
          error={destProblem}
        >
          <TextInput value={dest} maxLength={200} onChange={(event) => setDest(event.target.value)} />
        </Field>

        <Field label="Anything a reviewer should know?" count={`${note.length}/300`}>
          <TextArea value={note} rows={3} maxLength={300} onChange={(event) => setNote(event.target.value)} />
        </Field>

        <p className="text-[11px] text-muted-foreground">
          Sending this records the request and holds the amount out of your available balance while a reviewer looks at
          it. No transfer happens automatically — you will see the decision on this tab.
        </p>
      </div>
    </Sheet>
  );
}



