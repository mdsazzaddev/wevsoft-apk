import type { CryptoAssetPublic, CryptoWalletPublic, DonationMethod } from './donationApi';

/** How a CRYPTO method collects deposit details in the donate wizard. */
export type CryptoDepositMode = 'none' | 'EXCHANGE_QR' | 'CHAIN_CATALOG';

/** Exchange apps with a single deposit QR (no network picker). */
const EXCHANGE_QR_METHOD_CODES = new Set([
  'BINANCE',
  'BYBIT',
  'OKX',
  'COINBASE',
  'KUCOIN',
  'GATE',
]);

/**
 * Binance etc. → EXCHANGE_QR.
 * Other CRYPTO (Rizon / On-chain / Crypto) → Admin Crypto catalog:
 * network + coin + address — send from any wallet.
 */
export function resolveCryptoDepositMode(method: Pick<DonationMethod, 'type' | 'code'> | null | undefined): CryptoDepositMode {
  if (!method || String(method.type).toUpperCase() !== 'CRYPTO') return 'none';
  const code = String(method.code || '').toUpperCase();
  if (EXCHANGE_QR_METHOD_CODES.has(code)) return 'EXCHANGE_QR';
  return 'CHAIN_CATALOG';
}

export type ChainDepositCurrencyOption = {
  assetId: string;
  symbol: string;
  name: string;
  displaySymbol: string | null;
  logoUrl: string | null;
  networkId: string;
  wallets: CryptoWalletPublic[];
};

export type ChainDepositNetworkOption = {
  chainKey: string;
  name: string;
  logoUrl: string | null;
  currencies: ChainDepositCurrencyOption[];
};

const CHAIN_ORDER: Record<string, number> = {
  'eip155:56': 10,
  bsc: 10,
  'solana:mainnet': 20,
  solana: 20,
  'eip155:137': 30,
  polygon: 30,
  'eip155:10': 40,
  optimism: 40,
  'eip155:42161': 50,
  arbitrum: 50,
  'eip155:8453': 60,
  base: 60,
};

/** Network-first view of Admin Crypto wallets (any wallet → chain → USDT/USDC → deposit). */
export function buildChainFirstDepositOptions(catalog: CryptoAssetPublic[]): ChainDepositNetworkOption[] {
  type Acc = {
    chainKey: string;
    name: string;
    logoUrl: string | null;
    order: number;
    currencies: ChainDepositCurrencyOption[];
  };
  const byKey = new Map<string, Acc>();

  for (const asset of catalog) {
    for (const net of asset.networks) {
      const chainKey = (net.chainIdentifier || net.networkCode || net.name || net.id).trim().toLowerCase();
      if (!chainKey) continue;
      let row = byKey.get(chainKey);
      if (!row) {
        row = {
          chainKey,
          name: net.name || net.networkCode,
          logoUrl: net.logoUrl || null,
          order: CHAIN_ORDER[chainKey] ?? CHAIN_ORDER[net.networkCode?.toLowerCase?.() || ''] ?? 500,
          currencies: [],
        };
        byKey.set(chainKey, row);
      } else if (!row.logoUrl && net.logoUrl) {
        row.logoUrl = net.logoUrl;
      }
      if (!net.wallets.length) continue;
      if (row.currencies.some((c) => c.assetId === asset.id && c.networkId === net.id)) continue;
      row.currencies.push({
        assetId: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        displaySymbol: asset.displaySymbol || null,
        logoUrl: asset.logoUrl || null,
        networkId: net.id,
        wallets: net.wallets,
      });
    }
  }

  return Array.from(byKey.values())
    .filter((r) => r.currencies.length > 0)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map(({ order: _o, ...rest }) => rest);
}

export function primaryWallet(wallets: CryptoWalletPublic[]): CryptoWalletPublic | null {
  return wallets[0] || null;
}

const NETWORK_LOGO_BY_KEY: Record<string, string> = {
  bsc: '/donate/networks/bsc.svg',
  'bnb smart chain': '/donate/networks/bsc.svg',
  'eip155:56': '/donate/networks/bsc.svg',
  solana: '/donate/networks/solana.svg',
  'solana:mainnet': '/donate/networks/solana.svg',
  polygon: '/donate/networks/polygon.svg',
  'eip155:137': '/donate/networks/polygon.svg',
  optimism: '/donate/networks/optimism.svg',
  'eip155:10': '/donate/networks/optimism.svg',
  arbitrum: '/donate/networks/arbitrum.svg',
  'eip155:42161': '/donate/networks/arbitrum.svg',
  base: '/donate/networks/base.svg',
  'eip155:8453': '/donate/networks/base.svg',
};

const TOKEN_LOGO_BY_SYMBOL: Record<string, string> = {
  USDT: '/donate/tokens/usdt.svg',
  USDC: '/donate/tokens/usdc.svg',
};

export const WALLET_ADDRESS_ICON = '/donate/wallet-mark.svg';

/** Admin logo first; else built-in network mark so donors recognise the chain. */
export function resolveNetworkLogoUrl(opts: {
  logoUrl?: string | null;
  chainKey?: string | null;
  name?: string | null;
  networkCode?: string | null;
}): string | null {
  if (opts.logoUrl) return opts.logoUrl;
  const keys = [opts.chainKey, opts.networkCode, opts.name]
    .map((s) => String(s || '').trim().toLowerCase())
    .filter(Boolean);
  for (const k of keys) {
    if (NETWORK_LOGO_BY_KEY[k]) return NETWORK_LOGO_BY_KEY[k];
  }
  return null;
}

/** Admin asset logo first; else built-in USDT/USDC mark. */
export function resolveTokenLogoUrl(opts: { logoUrl?: string | null; symbol?: string | null }): string | null {
  if (opts.logoUrl) return opts.logoUrl;
  const sym = String(opts.symbol || '').trim().toUpperCase();
  return TOKEN_LOGO_BY_SYMBOL[sym] || null;
}

/** Wallet brand logo, else network, else generic wallet mark (shown beside address). */
export function resolveWalletLogoUrl(opts: {
  walletLogoUrl?: string | null;
  networkLogoUrl?: string | null;
  chainKey?: string | null;
  networkName?: string | null;
}): string {
  if (opts.walletLogoUrl) return opts.walletLogoUrl;
  const net =
    opts.networkLogoUrl ||
    resolveNetworkLogoUrl({ logoUrl: null, chainKey: opts.chainKey, name: opts.networkName });
  return net || WALLET_ADDRESS_ICON;
}

/** Shown on Amount only after Binance (EXCHANGE_QR) is selected — not mixed into bKash/Nagad. */
export const BINANCE_CRYPTO_CURRENCIES = [
  'USDT',
  'USDC',
  'BTC',
  'ETH',
  'BNB',
  'SOL',
  'XRP',
  'TRX',
  'DOGE',
] as const;

/**
 * Currencies for the Amount step, scoped to the selected payment method.
 * Binance → multi crypto list; Rizon → locked to the network pick; manual → method list.
 */
export function currenciesForSelectedMethod(
  method: Pick<DonationMethod, 'type' | 'code' | 'supportedCurrencies'> | null | undefined,
  opts?: { chainCurrencySymbol?: string | null },
): string[] {
  if (!method) return [];
  const mode = resolveCryptoDepositMode(method);
  if (mode === 'CHAIN_CATALOG') {
    const sym = (opts?.chainCurrencySymbol || '').trim().toUpperCase();
    return sym ? [sym] : ['USDT', 'USDC'];
  }
  if (mode === 'EXCHANGE_QR' && String(method.code || '').toUpperCase() === 'BINANCE') {
    const fromAdmin = (method.supportedCurrencies || []).map((c) => String(c).toUpperCase()).filter(Boolean);
    const merged = new Set<string>([...fromAdmin, ...BINANCE_CRYPTO_CURRENCIES]);
    return Array.from(merged);
  }
  const list = (method.supportedCurrencies || []).map((c) => String(c).toUpperCase()).filter(Boolean);
  return list.length ? list : ['BDT'];
}

const FIAT_LIKE = new Set(['BDT', 'USD', 'EUR', 'GBP', 'INR']);

/** True for crypto tickers (not BDT/USD fiat). */
export function isCryptoDonationCurrency(currency: string | null | undefined): boolean {
  const c = String(currency || '').trim().toUpperCase();
  return !!c && !FIAT_LIKE.has(c);
}

/** Fraction digits allowed in the amount field for this currency. */
export function maxDecimalsForDonationCurrency(currency: string | null | undefined): number {
  const c = String(currency || '').trim().toUpperCase();
  if (c === 'BTC') return 8;
  if (c === 'ETH' || c === 'BNB' || c === 'SOL') return 6;
  if (isCryptoDonationCurrency(c)) return 4;
  return 2;
}

/**
 * Preset chips for Amount step.
 * Fiat → admin `presetAmounts` (e.g. 100–5000 BDT).
 * Crypto → small realistic defaults (never 100 BTC).
 */
export function presetAmountsForCurrency(
  currency: string | null | undefined,
  fiatPresets: number[] | null | undefined,
): number[] {
  const c = String(currency || '').trim().toUpperCase();
  if (!isCryptoDonationCurrency(c)) {
    const fiat = (fiatPresets || []).filter((n) => Number.isFinite(n) && n > 0);
    return fiat.length ? fiat : [100, 200, 500, 1000, 2000, 5000];
  }
  switch (c) {
    case 'BTC':
      return [0.0001, 0.0005, 0.001, 0.002, 0.005, 0.01];
    case 'ETH':
      return [0.001, 0.005, 0.01, 0.05, 0.1, 0.25];
    case 'BNB':
    case 'SOL':
      return [0.01, 0.05, 0.1, 0.25, 0.5, 1];
    case 'XRP':
    case 'TRX':
    case 'DOGE':
      return [10, 25, 50, 100, 200, 500];
    case 'USDT':
    case 'USDC':
      return [1, 2, 5, 10, 20, 50];
    default:
      return [1, 2, 5, 10, 20, 50];
  }
}

/** Soft minimum when fiat config min (e.g. 50 BDT) must not apply as 50 BTC. */
export function minAmountForCurrency(
  currency: string | null | undefined,
  fiatMin: number,
  methodMin?: number | null,
): number {
  const c = String(currency || '').trim().toUpperCase();
  if (methodMin != null && Number.isFinite(methodMin) && methodMin > 0 && !isCryptoDonationCurrency(c)) {
    return Math.max(fiatMin, methodMin);
  }
  if (!isCryptoDonationCurrency(c)) return Math.max(0, fiatMin);
  switch (c) {
    case 'BTC':
      return 0.00005;
    case 'ETH':
      return 0.0005;
    case 'BNB':
    case 'SOL':
      return 0.001;
    case 'USDT':
    case 'USDC':
      return 1;
    default:
      return 0.01;
  }
}

export function formatPresetAmountInput(n: number, currency: string | null | undefined): string {
  const decimals = maxDecimalsForDonationCurrency(currency);
  // Avoid scientific notation / trailing junk for tiny BTC chips.
  const fixed = n.toFixed(decimals).replace(/\.?0+$/, '');
  return fixed || String(n);
}
