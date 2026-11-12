import React, { useState } from 'react';
import { Bitcoin, Check, Copy, Lock, Landmark, Users, Target, Wallet, HandHeart } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import {
  formatDate,
  formatMoney,
  type CryptoAssetPublic,
  type CryptoProvider,
  type DonationCampaign,
  type DonationCenterConfig,
  type DonationMethod,
  type DonorWallItem,
} from '../../lib/donationApi';
import { CRYPTO_METHOD_ICON } from './CryptoReceivePanel';
import {
  resolveCryptoDepositMode,
  resolveNetworkLogoUrl,
  resolveTokenLogoUrl,
  resolveWalletLogoUrl,
} from '../../lib/donationCryptoUi';

export function SectionHeader({ id, title, subtitle }: { id?: string; title: string; subtitle?: string }) {
  return (
    <div id={id} className="mb-4 scroll-mt-20">
      <h2 className="text-title font-bold text-foreground">{title}</h2>
      {subtitle && <p className="mt-1 text-body-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center text-body-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-40" />)}
    </div>
  );
}

// ── stats (real values only; em-dash when the API didn't send them) ──
export function StatsRow({ config }: { config: DonationCenterConfig | null }) {
  const s = config?.stats ?? null;
  const cur = config?.defaultCurrency;
  const items = [
    { icon: Wallet, label: 'Verified donations', value: s?.totalVerifiedAmount != null ? formatMoney(s.totalVerifiedAmount, cur) : '—' },
    { icon: Users, label: 'Verified donors', value: s?.verifiedDonors != null ? s.verifiedDonors.toLocaleString() : '—' },
    { icon: HandHeart, label: 'Active campaigns', value: s?.activeCampaigns != null ? s.activeCampaigns.toLocaleString() : '—' },
    { icon: Target, label: 'Campaign goals', value: s?.totalCampaignGoal != null ? formatMoney(s.totalCampaignGoal, cur) : '—' },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {items.map(({ icon: Icon, label, value }) => (
        <Card key={label} padding="sm" className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <dd className="truncate text-body font-bold text-foreground">{value}</dd>
            <dt className="truncate text-caption text-muted-foreground">{label}</dt>
          </div>
        </Card>
      ))}
    </dl>
  );
}

// ── campaigns ──
export function CampaignCard({ campaign, onDonate }: { campaign: DonationCampaign; onDonate: (id: string) => void }) {
  const pct = campaign.percent != null ? Math.max(0, Math.min(100, campaign.percent)) : null;
  return (
    <Card padding="none" className="flex flex-col overflow-hidden">
      {campaign.coverUrl ? (
        <img src={campaign.coverUrl} alt="" loading="lazy" className="h-36 w-full object-cover" />
      ) : (
        <div className="flex h-36 items-center justify-center bg-muted text-muted-foreground"><HandHeart className="size-8" aria-hidden="true" /></div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-gutter">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-body font-bold text-foreground">{campaign.title}</h3>
            {campaign.featured && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-caption font-semibold text-primary">Featured</span>}
          </div>
          {campaign.description && <p className="mt-1 line-clamp-3 text-body-sm text-muted-foreground">{campaign.description}</p>}
        </div>
        <div className="mt-auto">
          {pct != null && (
            <div
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${campaign.title} progress`}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          )}
          <div className="mt-2 flex items-baseline justify-between text-caption text-muted-foreground">
            <span><strong className="text-foreground">{formatMoney(campaign.raised, campaign.currency)}</strong> raised</span>
            <span>{campaign.goalAmount != null ? `of ${formatMoney(campaign.goalAmount, campaign.currency)}` : 'No fixed goal'}{pct != null ? ` · ${pct}%` : ''}</span>
          </div>
          <Button size="sm" fullWidth className="mt-3" onClick={() => onDonate(campaign.id)}>Donate to this campaign</Button>
        </div>
      </div>
    </Card>
  );
}

// ── payment methods (bank / MFS only — crypto lives in CryptoSection) ──
export function MethodsGrid({ methods }: { methods: DonationMethod[] }) {
  const list = methods.filter((m) => m.selectable && String(m.type).toUpperCase() !== 'CRYPTO');
  if (!list.length) return <EmptyNote>No mobile / bank payment methods are available right now. Please check back soon.</EmptyNote>;
  const card = (m: DonationMethod) => (
    <Card key={m.id} padding="md" className="flex items-center gap-3">
      {m.logoUrl ? (
        <img src={m.logoUrl} alt="" loading="lazy" className="size-10 rounded-md bg-white object-contain p-0.5" />
      ) : (
        <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Landmark className="size-5" aria-hidden />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-body-sm font-bold text-foreground">{m.name}</p>
        <p className="truncate text-caption text-muted-foreground">
          {m.supportedCurrencies.join(' · ') || m.description || 'Manual payment'}
        </p>
      </div>
    </Card>
  );
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{list.map(card)}</div>;
}

function CopyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-caption font-semibold text-foreground hover:bg-muted"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(address);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ── crypto: separate section (Admin → Donations → Crypto) ──
export function CryptoSection({
  config,
  providers,
  catalog = [],
  selectableMethods = [],
}: {
  config: DonationCenterConfig | null;
  providers: CryptoProvider[];
  catalog?: CryptoAssetPublic[];
  /** CRYPTO methods donors can pick in the wizard (Active + jurisdiction approved). */
  selectableMethods?: DonationMethod[];
}) {
  const live = selectableMethods.filter((m) => m.selectable && String(m.type).toUpperCase() === 'CRYPTO');
  const liveIds = new Set(live.map((m) => m.id));
  const pendingProviders = providers.filter((p) => !liveIds.has(p.id));
  const hasCatalog = catalog.some((a) => a.networks.length > 0);
  const empty = !live.length && !pendingProviders.length && !hasCatalog;

  return (
    <section aria-labelledby="donate-crypto-title">
      <div className="mb-4">
        <h2 id="donate-crypto-title" className="text-title font-bold text-foreground">
          {config?.cryptoSectionLabel || 'Crypto'}
        </h2>
        <p className="mt-1 text-body-sm text-muted-foreground">
          {config?.cryptoSectionNote ||
            (live.length
              ? 'Choose Crypto or an exchange QR during checkout. Send only on the network you pick.'
              : 'Crypto donations are not available until legal approval.')}
        </p>
      </div>

      {empty ? (
        <EmptyNote>Crypto providers will be listed here once they are configured in Admin → Crypto.</EmptyNote>
      ) : (
        <div className="space-y-6">
          {live.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((m) => {
                const onChain = resolveCryptoDepositMode(m) === 'CHAIN_CATALOG';
                // Prefer Admin → Crypto provider logo; fall back to built-in crypto mark.
                const icon = m.logoUrl || (onChain ? CRYPTO_METHOD_ICON : null);
                const useCover = onChain && !m.logoUrl;
                return (
                  <Card key={m.id} padding="md" className="flex items-center gap-3">
                    {icon ? (
                      <img
                        src={icon}
                        alt=""
                        loading="lazy"
                        className={`size-12 shrink-0 rounded-lg ring-1 ring-border ${
                          useCover ? 'bg-black object-cover' : 'bg-white object-contain p-0.5'
                        }`}
                      />
                    ) : (
                      <span className="flex size-12 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
                        <Bitcoin className="size-6" aria-hidden />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-bold text-foreground">{m.name}</p>
                      <p className="truncate text-caption text-muted-foreground">
                        {onChain
                          ? 'Crypto · any wallet'
                          : m.supportedCurrencies.join(' · ') || m.description || 'Available in donate checkout'}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {pendingProviders.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pendingProviders.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-border bg-muted/40 p-gutter opacity-90"
                >
                  <div className="flex items-center gap-3">
                    {p.logoUrl
                      ? <img src={p.logoUrl} alt="" loading="lazy" className="size-10 rounded-md object-contain grayscale" />
                      : <span className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground"><Lock className="size-5" aria-hidden="true" /></span>}
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-bold text-foreground">{p.name}</p>
                      <p className="text-caption font-semibold text-warning">Pending legal approval</p>
                    </div>
                  </div>
                  <p className="mt-2 text-caption text-muted-foreground">
                    Deposit details stay hidden until this method is approved for checkout.
                  </p>
                </div>
              ))}
            </div>
          )}

          {catalog.map((asset) => {
            const tokenLogo = resolveTokenLogoUrl({ logoUrl: asset.logoUrl, symbol: asset.symbol });
            return (
            <div key={asset.id} className="space-y-3">
              <div className="flex items-center gap-2">
                {tokenLogo
                  ? <img src={tokenLogo} alt="" loading="lazy" className="size-8 rounded-full object-contain ring-1 ring-border" />
                  : <span className="flex size-8 items-center justify-center rounded-md bg-muted text-caption font-bold text-muted-foreground">{asset.symbol.slice(0, 3)}</span>}
                <div>
                  <p className="text-body-sm font-bold text-foreground">
                    {asset.displaySymbol ? <span className="mr-1">{asset.displaySymbol}</span> : null}
                    {asset.symbol}{' '}
                    <span className="font-medium text-muted-foreground">· {asset.name}</span>
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {live.length
                      ? 'Networks listed for checkout — open Donate to get a live QR'
                      : 'Informational only — deposit addresses stay private until crypto is selectable'}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {asset.networks.map((net) => {
                  const netLogo = resolveNetworkLogoUrl({
                    logoUrl: net.logoUrl,
                    networkCode: net.networkCode,
                    name: net.name,
                    chainKey: net.chainIdentifier,
                  });
                  const showWallets = live.length > 0 && net.wallets.some((w) => !!w.address);
                  return (
                  <div key={net.id} className="rounded-lg border border-border bg-card p-3 sm:p-gutter">
                    <div className="mb-2 flex items-center gap-2 sm:mb-3">
                      {netLogo
                        ? <img src={netLogo} alt="" loading="lazy" className="size-8 rounded-full object-contain ring-1 ring-border sm:size-9" />
                        : <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground sm:size-9"><Landmark className="size-4" aria-hidden /></span>}
                      <div className="min-w-0">
                        <p className="truncate text-body-sm font-bold text-foreground">{net.name}</p>
                        <p className="truncate text-caption text-muted-foreground">
                          {net.networkCode}
                          {net.chainIdentifier ? ` · ${net.chainIdentifier}` : ''}
                        </p>
                      </div>
                    </div>
                    {!showWallets ? (
                      <p className="text-caption text-muted-foreground">
                        {live.length ? 'Use Donate checkout for the deposit QR.' : 'Addresses hidden until approval.'}
                      </p>
                    ) : (
                      <ul className="space-y-2 sm:space-y-3">
                        {net.wallets.filter((w) => !!w.address).map((w) => {
                          const wLogo = resolveWalletLogoUrl({
                            walletLogoUrl: w.logoUrl,
                            networkLogoUrl: netLogo,
                            networkName: net.name,
                            chainKey: net.chainIdentifier || net.networkCode,
                          });
                          return (
                          <li key={w.id} className="rounded-md border border-border/80 bg-muted/30 p-2.5 sm:p-3">
                            <div className="mb-2 flex items-center gap-2">
                              <img src={wLogo} alt="" loading="lazy" className="size-6 rounded-full object-contain ring-1 ring-border sm:size-7" />
                              <span className="truncate text-caption font-semibold text-foreground">{w.label || 'Deposit wallet'}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-snug text-foreground">{w.address}</code>
                              <CopyAddressButton address={w.address} />
                            </div>
                            {w.memoRequirement && (
                              <p className="mt-1 text-caption text-muted-foreground">Memo / tag: {w.memoRequirement}</p>
                            )}
                          </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── donor wall ──
export function DonorWall({ items }: { items: DonorWallItem[] }) {
  if (!items.length) return <EmptyNote>No public supporters yet. Approved donors who opt in will appear here.</EmptyNote>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((d) => (
        <li key={d.id}>
          <Card padding="md" className="h-full">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-body-sm font-bold text-foreground">{d.displayName}</p>
              {d.amount != null && <span className="shrink-0 text-body-sm font-semibold text-primary">{formatMoney(d.amount, d.currency)}</span>}
            </div>
            {d.message && <p className="mt-1 line-clamp-3 text-body-sm text-muted-foreground">“{d.message}”</p>}
            <p className="mt-2 text-caption text-muted-foreground">{formatDate(d.donatedAt)}</p>
          </Card>
        </li>
      ))}
    </ul>
  );
}

// ── FAQ (static, process-only claims) ──
const FAQ: { q: string; a: string }[] = [
  { q: 'How does a donation get verified?', a: 'You pay through one of the listed methods, then submit your transaction reference (and optional screenshots). Our team reviews every manual payment before it is counted.' },
  { q: 'How long does review take?', a: 'Review is manual, so timing varies. You can follow the status of each donation under My Donations using your tracking ID.' },
  { q: 'Can I donate anonymously?', a: 'Yes, when enabled. Anonymous donations are hidden from the public wall and other supporters; staff can still see them for verification.' },
  { q: 'Will I get a receipt?', a: 'A receipt becomes available on the donation page once a donation is approved.' },
  { q: 'Why are crypto options disabled?', a: 'Crypto providers stay disabled until they receive legal approval. We never ask for private keys, seed phrases or exchange passwords.' },
];

export function FaqSection() {
  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-card">
      {FAQ.map((f) => (
        <details key={f.q} className="group px-gutter py-3">
          <summary className="cursor-pointer list-none text-body-sm font-semibold text-foreground marker:hidden">{f.q}</summary>
          <p className="mt-2 text-body-sm text-muted-foreground">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
