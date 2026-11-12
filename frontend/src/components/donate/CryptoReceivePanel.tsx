import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, QrCode } from 'lucide-react';
import QRCode from 'react-qr-code';
import { cn } from '../ui/cn';
import { copyText } from './CopyField';
import type { ChainDepositNetworkOption } from '../../lib/donationCryptoUi';
import {
  primaryWallet,
  resolveNetworkLogoUrl,
  resolveTokenLogoUrl,
  resolveWalletLogoUrl,
} from '../../lib/donationCryptoUi';

function shortenAddress(addr: string, head = 6, tail = 5): string {
  const s = addr.trim();
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}...${s.slice(-tail)}`;
}

function LogoThumb({
  src,
  label,
  className = 'size-6',
}: {
  src: string | null;
  label: string;
  className?: string;
}) {
  if (src) {
    return <img src={src} alt="" className={cn('rounded-full bg-white object-contain ring-1 ring-border', className)} />;
  }
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-muted text-[10px] font-bold uppercase text-muted-foreground ring-1 ring-border',
        className,
      )}
    >
      {label.slice(0, 1)}
    </span>
  );
}

/**
 * Wallet-app style receive UI: Network + Token pills → large QR → copy address.
 * Options come from Admin → Crypto (Asset → Network → Wallet).
 */
export function CryptoReceivePanel({
  chains,
  chainKey,
  cryptoAssetId,
  networkId,
  onSelectChain,
  onSelectCurrency,
}: {
  chains: ChainDepositNetworkOption[];
  chainKey: string;
  cryptoAssetId: string;
  networkId: string;
  onSelectChain: (key: string) => void;
  onSelectCurrency: (assetId: string, networkId: string, symbol: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const didInit = useRef(false);
  const selectedChain = chains.find((c) => c.chainKey === chainKey) || null;
  const selectedCurrency =
    selectedChain?.currencies.find((c) => c.assetId === cryptoAssetId && c.networkId === networkId) || null;
  const wallet = selectedCurrency ? primaryWallet(selectedCurrency.wallets) : null;
  const networkLogo = selectedChain
    ? resolveNetworkLogoUrl({ logoUrl: selectedChain.logoUrl, chainKey: selectedChain.chainKey, name: selectedChain.name })
    : null;
  const tokenLogo = selectedCurrency
    ? resolveTokenLogoUrl({ logoUrl: selectedCurrency.logoUrl, symbol: selectedCurrency.symbol })
    : null;
  const walletLogo = resolveWalletLogoUrl({
    walletLogoUrl: wallet?.logoUrl,
    networkLogoUrl: networkLogo,
    chainKey: selectedChain?.chainKey,
    networkName: selectedChain?.name,
  });

  // Prefer first published chain/coin so QR appears as soon as Crypto is opened.
  useEffect(() => {
    if (!chains.length || didInit.current) return;
    const first = chains[0];
    const cur = first.currencies[0];
    if (!cur) return;
    didInit.current = true;
    if (!chainKey) onSelectChain(first.chainKey);
    if (!cryptoAssetId || !networkId) onSelectCurrency(cur.assetId, cur.networkId, cur.symbol);
  }, [chains, chainKey, cryptoAssetId, networkId, onSelectChain, onSelectCurrency]);

  if (!chains.length) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
        <QrCode className="mx-auto size-10 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-body-sm font-semibold text-foreground">No crypto QR published yet</p>
        <p className="mt-1 text-caption text-muted-foreground">
          Admin → Crypto → Asset → Network → Wallet (address + QR image).
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3 text-center">
        <p className="text-body-sm font-bold text-foreground">QR Code</p>
        <p className="text-caption text-muted-foreground">Receive donation · any wallet</p>
      </div>

      <div className="space-y-3 px-3 py-3 sm:px-4 sm:py-4">
        <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
          <label className="block space-y-1">
            <span className="px-1 text-caption font-semibold uppercase tracking-wide text-muted-foreground">Network</span>
            <span className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
                <LogoThumb src={networkLogo} label={selectedChain?.name || 'N'} />
              </span>
              <select
                className="h-11 w-full appearance-none rounded-full border border-border bg-background py-2 pl-10 pr-9 text-body-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={chainKey}
                onChange={(e) => {
                  const key = e.target.value;
                  onSelectChain(key);
                  const chain = chains.find((c) => c.chainKey === key);
                  const cur = chain?.currencies[0];
                  if (cur) onSelectCurrency(cur.assetId, cur.networkId, cur.symbol);
                  else onSelectCurrency('', '', '');
                }}
              >
                {chains.map((c) => (
                  <option key={c.chainKey} value={c.chainKey}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            </span>
          </label>

          <label className="block space-y-1">
            <span className="px-1 text-caption font-semibold uppercase tracking-wide text-muted-foreground">Token</span>
            <span className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
                <LogoThumb src={tokenLogo} label={selectedCurrency?.symbol || 'T'} />
              </span>
              <select
                className="h-11 w-full appearance-none rounded-full border border-border bg-background py-2 pl-10 pr-9 text-body-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                value={selectedCurrency ? `${selectedCurrency.assetId}|${selectedCurrency.networkId}` : ''}
                disabled={!selectedChain?.currencies.length}
                onChange={(e) => {
                  const [assetId, netId] = e.target.value.split('|');
                  const cur = selectedChain?.currencies.find((c) => c.assetId === assetId && c.networkId === netId);
                  if (cur) onSelectCurrency(cur.assetId, cur.networkId, cur.symbol);
                }}
              >
                {(selectedChain?.currencies || []).map((cur) => (
                  <option key={`${cur.assetId}-${cur.networkId}`} value={`${cur.assetId}|${cur.networkId}`}>
                    {cur.symbol}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            </span>
          </label>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1">
            <LogoThumb src={walletLogo} label={wallet?.label || 'W'} className="size-5" />
            <span className="text-caption font-semibold text-foreground">
              {wallet?.label || selectedChain?.name || 'Deposit wallet'}
            </span>
            {tokenLogo ? <LogoThumb src={tokenLogo} label={selectedCurrency?.symbol || 'T'} className="size-4" /> : null}
          </div>
          {wallet?.address ? (
            <div className="rounded-xl border border-border bg-white p-2 shadow-sm sm:p-2.5">
              <div
                className="flex size-32 items-center justify-center sm:size-40 md:size-44"
                role="img"
                aria-label={`${selectedCurrency?.symbol || 'Crypto'} deposit address QR`}
              >
                <QRCode
                  value={wallet.address}
                  size={176}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                  style={{ width: '100%', height: '100%', maxWidth: 176 }}
                />
              </div>
            </div>
          ) : (
            <div className="flex size-32 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 sm:size-40 md:size-44">
              <QrCode className="size-8 text-muted-foreground" aria-hidden />
              <p className="mt-1.5 px-3 text-center text-[11px] text-muted-foreground">
                {wallet ? 'No deposit address' : 'Select network & token'}
              </p>
            </div>
          )}
          <p className="text-center text-caption text-muted-foreground">Scan to send to this wallet</p>
        </div>

        {wallet?.address && (
          <button
            type="button"
            onClick={async () => {
              await copyText(wallet.address, 'Address copied');
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
            className="mx-auto flex w-full max-w-md items-center gap-2 rounded-full border border-border bg-background px-2.5 py-2.5 text-left hover:bg-surface-hover sm:max-w-sm sm:py-2"
            aria-label="Copy wallet address"
          >
            <LogoThumb src={walletLogo} label="A" className="size-7 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Address</span>
              <span className="block truncate font-mono text-caption font-semibold text-foreground">
                {shortenAddress(wallet.address)}
              </span>
            </span>
            {copied ? <Check className="size-3.5 shrink-0 text-success" /> : <Copy className="size-3.5 shrink-0 text-muted-foreground" />}
          </button>
        )}

        {wallet?.memoRequirement && (
          <button
            type="button"
            onClick={() => void copyText(wallet.memoRequirement!, 'Memo copied')}
            className="mx-auto flex w-full max-w-sm items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-left"
          >
            <span>
              <span className="block text-caption font-semibold text-amber-700 dark:text-amber-400">Memo / tag (required)</span>
              <span className="font-mono text-body-sm text-foreground">{wallet.memoRequirement}</span>
            </span>
            <Copy className="size-4 shrink-0 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Brand mark for on-chain Crypto — BTC + major coins so donors recognise “crypto” at a glance. */
export const CRYPTO_METHOD_ICON = '/donate/crypto-coins.png';

/** Compact method card for on-chain Crypto (same height as Binance / bank tiles). */
export function CryptoMethodTile({
  methodName,
  logoUrl,
  active,
  onClick,
}: {
  methodName: string;
  /** Admin Crypto provider logo; falls back to CRYPTO_METHOD_ICON. */
  logoUrl?: string | null;
  active: boolean;
  onClick: () => void;
}) {
  const iconSrc = logoUrl || CRYPTO_METHOD_ICON;
  const adminLogo = !!logoUrl;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'flex min-h-14 items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors sm:gap-3 sm:p-3',
        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface-hover',
      )}
    >
      <span
        className={cn(
          'relative size-10 shrink-0 overflow-hidden rounded-lg shadow-sm ring-1 ring-border sm:size-12',
          adminLogo ? 'bg-white' : 'bg-black',
        )}
        aria-hidden
      >
        <img
          src={iconSrc}
          alt=""
          className={cn('size-full object-center', adminLogo ? 'object-contain p-0.5' : 'object-cover')}
          width={48}
          height={48}
          decoding="async"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-bold text-foreground">{methodName || 'Crypto'}</span>
        <span className="mt-0.5 block text-caption text-muted-foreground line-clamp-2">
          Crypto · any wallet QR
        </span>
      </span>
    </button>
  );
}

export default CryptoReceivePanel;
