import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bitcoin, Check, CheckCircle2, ChevronLeft, ChevronRight, Info, Landmark } from 'lucide-react';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { cn } from '../../components/ui/cn';
import { CopyField } from '../../components/donate/CopyField';
import { CryptoMethodTile, CryptoReceivePanel } from '../../components/donate/CryptoReceivePanel';
import { ProofUploader } from '../../components/donate/ProofUploader';
import { useStore } from '../../store';
import {
  cancelDonation,
  createDonation,
  errorMessage,
  formatMoney,
  submitDonation,
  type CryptoAssetPublic,
  type Donation,
  type DonationCampaign,
  type DonationCenterConfig,
  type DonationMethod,
} from '../../lib/donationApi';
import {
  buildChainFirstDepositOptions,
  currenciesForSelectedMethod,
  formatPresetAmountInput,
  isCryptoDonationCurrency,
  maxDecimalsForDonationCurrency,
  minAmountForCurrency,
  presetAmountsForCurrency,
  primaryWallet,
  resolveCryptoDepositMode,
} from '../../lib/donationCryptoUi';

const STEPS = ['Payment', 'Amount', 'Identity', 'Confirmation'] as const;

export interface DonationWizardProps {
  open: boolean;
  onClose: () => void;
  config: DonationCenterConfig | null;
  methods: DonationMethod[];
  campaigns: DonationCampaign[];
  /** Admin Crypto catalog (networks/wallets) for on-chain CHAIN_CATALOG methods. */
  cryptoCatalog?: CryptoAssetPublic[];
  initialCampaignId?: string | null;
}

function newIdempotencyKey(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `don-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function parseAmount(raw: string): number | null {
  const n = Number(raw.replace(/,/g, '').trim());
  if (!raw.trim() || !Number.isFinite(n) || n <= 0) return null;
  return n;
}

const textareaCls =
  'w-full rounded-sm border border-input bg-card px-3 py-2 text-body-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring';

function CheckRow({
  checked, onChange, disabled, title, hint,
}: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; title: string; hint?: string }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 rounded-md border border-border p-3', disabled && 'cursor-not-allowed opacity-50')}>
      <input
        type="checkbox"
        className="mt-1 size-4 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-body-sm font-semibold text-foreground">{title}</span>
        {hint && <span className="block text-caption text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-5 flex items-center gap-2" aria-label="Donation steps">
      {STEPS.map((label, i) => (
        <li key={label} className="flex min-w-0 flex-1 items-center gap-2" aria-current={i === step ? 'step' : undefined}>
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-bold',
              i < step ? 'bg-primary text-primary-foreground' : i === step ? 'border-2 border-primary text-primary' : 'border border-border text-muted-foreground',
            )}
          >
            {i < step ? <Check className="size-3.5" /> : i + 1}
          </span>
          <span className={cn('hidden truncate text-caption font-semibold sm:block', i === step ? 'text-foreground' : 'text-muted-foreground')}>
            {label}
          </span>
          {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

function MethodDetails({
  method,
  amountText,
  cryptoCurrencies = [],
  selectedCrypto,
  onSelectCrypto,
}: {
  method: DonationMethod;
  amountText: string;
  cryptoCurrencies?: string[];
  selectedCrypto?: string;
  onSelectCrypto?: (symbol: string) => void;
}) {
  const cryptoMode = resolveCryptoDepositMode(method);
  const isExchange = cryptoMode === 'EXCHANGE_QR';

  // Binance / exchange QR: big QR first, then donate-crypto chips + details.
  if (isExchange) {
    return (
      <div className="mt-4 space-y-4 rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-center text-body-sm font-semibold text-foreground">
          Scan with {method.name}
        </p>
        {method.qrUrl ? (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-xl border border-border bg-white p-2 shadow-sm">
              <img
                src={method.qrUrl}
                alt={`${method.name} deposit QR`}
                className="size-32 max-w-full object-contain sm:size-40 md:size-44"
              />
            </div>
            <p className="text-center text-caption text-muted-foreground">
              Open the Binance app → scan this QR (no network picker needed)
            </p>
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border bg-card px-3 py-6 text-center text-body-sm text-muted-foreground">
            QR not published yet — use the deposit address below if available.
          </p>
        )}
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Donate crypto</p>
          {cryptoCurrencies.length > 0 ? (
            <div role="radiogroup" aria-label="Donate crypto" className="flex flex-wrap gap-2">
              {cryptoCurrencies.map((c) => {
                const active = c === selectedCrypto;
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onSelectCrypto?.(c)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-body-sm font-semibold',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-foreground hover:bg-surface-hover',
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-caption text-muted-foreground">No cryptocurrencies listed for this method yet.</p>
          )}
          <p className="text-caption text-muted-foreground">
            Pick the coin you will send. You enter the amount on the next step.
          </p>
          <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Details</p>
          {method.merchantDisplay && (
            <CopyField label="Deposit address" value={method.merchantDisplay} />
          )}
          {method.publicInstructions && (
            <p className="whitespace-pre-line text-body-sm text-muted-foreground">{method.publicInstructions}</p>
          )}
          <p className="flex items-start gap-2 text-caption text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            After paying, continue to enter amount
            {selectedCrypto ? ` in ${selectedCrypto}` : ''} ({amountText}) and upload proof.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/40 p-4">
      <p className="text-body-sm font-semibold text-foreground">Pay {amountText} using {method.name}</p>
      {method.merchantDisplay && (
        <CopyField label={method.type === 'MANUAL' ? 'Send to' : 'Account'} value={method.merchantDisplay} />
      )}
      {method.publicInstructions && (
        <p className="whitespace-pre-line text-body-sm text-muted-foreground">{method.publicInstructions}</p>
      )}
      {method.qrUrl && (
        <div className="flex flex-col items-center gap-2">
          <img
            src={method.qrUrl}
            alt={`${method.name} QR code`}
            className="size-32 rounded-md border border-border bg-white object-contain p-2 sm:size-40 md:size-44"
          />
          <span className="text-caption text-muted-foreground">Scan to pay</span>
        </div>
      )}
      <p className="flex items-start gap-2 text-caption text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Make the payment first, then continue to upload your payment proof.
      </p>
    </div>
  );
}

function WizardBody(props: DonationWizardProps) {
  const { onClose, config, methods, campaigns, cryptoCatalog = [], initialCampaignId } = props;
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const idemKey = useRef(newIdempotencyKey());

  const allowAnonymous = config?.allowAnonymous !== false;
  const allowWall = config?.allowDonorWall !== false;
  const fiatMinAmount = config?.minAmount ?? 0;
  const fiatMaxAmount = config?.maxAmount ?? Infinity;

  const selectable = useMemo(() => methods.filter((m) => m.selectable), [methods]);
  const chainOptions = useMemo(() => buildChainFirstDepositOptions(cryptoCatalog), [cryptoCatalog]);

  const [step, setStep] = useState(0);
  const [amountText, setAmountText] = useState('');
  const [currency, setCurrency] = useState((config?.defaultCurrency || 'BDT').toUpperCase());
  const [campaignId, setCampaignId] = useState(initialCampaignId || '');
  const [anonymous, setAnonymous] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [message, setMessage] = useState('');
  const [onWall, setOnWall] = useState(false);
  const [shareAmount, setShareAmount] = useState(false);
  const [methodId, setMethodId] = useState('');
  const [chainKey, setChainKey] = useState('');
  const [cryptoAssetId, setCryptoAssetId] = useState('');
  const [networkId, setNetworkId] = useState('');
  const [created, setCreated] = useState<Donation | null>(null);
  const [creating, setCreating] = useState(false);
  const [txRef, setTxRef] = useState('');
  const [payDate, setPayDate] = useState('');
  const [senderRef, setSenderRef] = useState('');
  const [note, setNote] = useState('');
  const [proofs, setProofs] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Donation | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Fingerprint of fields baked into the DRAFT — mismatch invalidates stale create. */
  const createdFingerprint = useRef<string | null>(null);

  const amount = parseAmount(amountText);
  // Payment first — show every selectable method (currency comes after).
  const method = selectable.find((m) => m.id === methodId) || null;
  const cryptoMode = resolveCryptoDepositMode(method);
  const selectedChain = chainOptions.find((c) => c.chainKey === chainKey) || null;
  const selectedCurrency = selectedChain?.currencies.find((c) => c.assetId === cryptoAssetId && c.networkId === networkId) || null;
  const selectedWallet = selectedCurrency ? primaryWallet(selectedCurrency.wallets) : null;
  const currencies = useMemo(
    () =>
      currenciesForSelectedMethod(method, {
        chainCurrencySymbol: selectedCurrency?.symbol || null,
      }),
    [method, selectedCurrency?.symbol],
  );
  const payCurrency =
    cryptoMode === 'CHAIN_CATALOG' && selectedCurrency
      ? selectedCurrency.symbol.toUpperCase()
      : currency;
  // Don't keep fiat chips (100, 500…) when switching to BTC/ETH — clear amount.
  const prevPayCurrency = useRef(payCurrency);
  useEffect(() => {
    if (prevPayCurrency.current !== payCurrency) {
      prevPayCurrency.current = payCurrency;
      setAmountText('');
    }
  }, [payCurrency]);
  const campaign = campaigns.find((c) => c.id === campaignId) || null;
  const amountLabel = amount != null ? formatMoney(amount, payCurrency) : '—';
  const amountPresets = useMemo(
    () => presetAmountsForCurrency(payCurrency, config?.presetAmounts),
    [payCurrency, config?.presetAmounts],
  );
  const minAmount = minAmountForCurrency(payCurrency, fiatMinAmount, method?.minimumAmount);
  const maxAmount = isCryptoDonationCurrency(payCurrency)
    ? (method?.maximumAmount != null && method.maximumAmount > 0 ? method.maximumAmount : Infinity)
    : fiatMaxAmount;
  const amountDecimals = maxDecimalsForDonationCurrency(payCurrency);

  const amountError = (() => {
    if (!amountText.trim()) return null;
    if (amount == null) return 'Enter a valid amount';
    const factor = 10 ** amountDecimals;
    if (Math.round(amount * factor) / factor !== amount) {
      return amountDecimals <= 2
        ? 'Use at most two decimal places'
        : `Use at most ${amountDecimals} decimal places`;
    }
    if (amount < minAmount) return `Minimum donation is ${formatMoney(minAmount, payCurrency)}`;
    if (Number.isFinite(maxAmount) && amount > maxAmount) {
      return `Maximum donation is ${formatMoney(maxAmount, payCurrency)}`;
    }
    if (!isCryptoDonationCurrency(payCurrency) && method?.minimumAmount != null && amount < method.minimumAmount) {
      return `${method.name} minimum is ${formatMoney(method.minimumAmount, payCurrency)}`;
    }
    if (!isCryptoDonationCurrency(payCurrency) && method?.maximumAmount != null && amount > method.maximumAmount) {
      return `${method.name} maximum is ${formatMoney(method.maximumAmount, payCurrency)}`;
    }
    return null;
  })();

  const paymentPickError = (() => {
    if (!method) return null;
    if (cryptoMode === 'CHAIN_CATALOG') {
      if (!chainOptions.length) {
        return 'No crypto deposit wallets are published yet. Admin must add Asset → Network → Wallet.';
      }
      if (!selectedChain) return 'Select a network';
      if (!selectedCurrency || !selectedWallet) return 'Select a coin (e.g. USDT or USDC) for this network';
    }
    if (cryptoMode === 'EXCHANGE_QR' && !method.qrUrl && !method.merchantDisplay) {
      return `${method.name} deposit details are not published yet`;
    }
    return null;
  })();

  const paymentReady = !!method && !paymentPickError;
  const amountReady = amount != null && !amountError;
  // Payment → Amount → Identity → Confirmation (create draft when leaving Identity)
  // Step 0 has no Continue — picking a method advances automatically.
  const canNext = [false, amountReady, true, false][step];

  const draftFingerprint = useMemo(
    () =>
      JSON.stringify({
        amount,
        payCurrency,
        methodId,
        campaignId,
        cryptoAssetId,
        networkId,
        walletId: selectedWallet?.id || null,
        anonymous,
        displayName: anonymous ? '' : displayName.trim(),
        message: message.trim(),
        onWall: allowWall && onWall,
        shareAmount: allowWall && onWall && shareAmount,
      }),
    [
      amount,
      payCurrency,
      methodId,
      campaignId,
      cryptoAssetId,
      networkId,
      selectedWallet?.id,
      anonymous,
      displayName,
      message,
      allowWall,
      onWall,
      shareAmount,
    ],
  );

  const invalidateCreatedDraft = (donationId?: string | null) => {
    const id = donationId || created?.id;
    if (id) void cancelDonation(id).catch(() => { /* best-effort */ });
    setCreated(null);
    createdFingerprint.current = null;
    idemKey.current = newIdempotencyKey();
  };

  // If the donor edits amount/method/network after create, drop the stale DRAFT.
  useEffect(() => {
    if (!created || submitted) return;
    if (createdFingerprint.current && createdFingerprint.current !== draftFingerprint) {
      invalidateCreatedDraft(created.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when fingerprint drifts vs stored draft
  }, [draftFingerprint, created, submitted]);

  const pickMethod = (id: string) => {
    const nextMethod = selectable.find((m) => m.id === id) || null;
    setMethodId(id);
    setError(null);
    let nextChain = '';
    let nextAsset = '';
    let nextNet = '';
    if (resolveCryptoDepositMode(nextMethod) === 'CHAIN_CATALOG' && chainOptions.length) {
      const first = chainOptions[0];
      const cur = first.currencies[0];
      nextChain = first.chainKey;
      if (cur) {
        nextAsset = cur.assetId;
        nextNet = cur.networkId;
        setCurrency(cur.symbol.toUpperCase());
      }
    } else {
      const nextCurrencies = currenciesForSelectedMethod(nextMethod);
      if (nextCurrencies.length) setCurrency(nextCurrencies[0]);
    }
    setChainKey(nextChain);
    setCryptoAssetId(nextAsset);
    setNetworkId(nextNet);
    // Payment method tap → Amount (no Continue on this step).
    setStep(1);
  };

  const createNow = async () => {
    if (!method || amount == null || !paymentReady) return;
    setCreating(true);
    setError(null);
    try {
      // Never reuse a draft whose payload no longer matches the form.
      if (created && createdFingerprint.current !== draftFingerprint) {
        invalidateCreatedDraft(created.id);
      }
      if (created && createdFingerprint.current === draftFingerprint) {
        setStep(3);
        return;
      }
      const d = await createDonation({
        amount,
        currency: payCurrency,
        paymentMethodId: method.id,
        campaignId: campaignId || null,
        cryptoAssetId: cryptoMode === 'CHAIN_CATALOG' ? cryptoAssetId : null,
        networkId: cryptoMode === 'CHAIN_CATALOG' ? networkId : null,
        cryptoWalletId: cryptoMode === 'CHAIN_CATALOG' ? selectedWallet?.id || null : null,
        anonymous,
        donorDisplayName: anonymous ? null : displayName.trim() || null,
        donorMessage: message.trim() || null,
        showOnDonorWall: allowWall && onWall,
        shareAmount: allowWall && onWall && shareAmount,
        idempotencyKey: idemKey.current,
      });
      if (!d.id) throw new Error('The server did not return a donation ID');
      createdFingerprint.current = draftFingerprint;
      setCreated(d);
      setStep(3);
    } catch (e) {
      setError(errorMessage(e, 'Could not start your donation'));
    } finally {
      setCreating(false);
    }
  };

  const next = () => {
    setError(null);
    if (step === 2) {
      void createNow();
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const goBack = () => {
    setError(null);
    if (step === 3 && created && !submitted) {
      // Leaving confirmation with an unsubmitted draft — cancel so edits recreate cleanly.
      invalidateCreatedDraft(created.id);
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const submitNow = async () => {
    if (!created) return;
    const trx = txRef.trim();
    const phone = senderRef.trim();
    if (trx && trx.length < 4) {
      setError('Transaction ID must be at least 4 characters if provided');
      return;
    }
    if (!trx && phone.length < 5 && proofs.length < 1) {
      setError('Add a transaction ID, your phone/account number, or upload a payment proof photo');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const d = await submitDonation(created.id, {
        transactionReference: trx || undefined,
        paymentDate: payDate || undefined,
        senderReference: phone || undefined,
        message: note.trim() || undefined,
        proofs,
      });
      setSubmitted({ ...created, ...d, publicReference: d.publicReference || created.publicReference });
      toast.success('Submitted for review');
    } catch (e) {
      setError(errorMessage(e, 'Could not submit your payment details'));
    } finally {
      setSubmitting(false);
    }
  };

  const trackingId = (submitted || created)?.publicReference || '';

  // ── step bodies ──
  const stepAmount = (
    <div className="space-y-4">
      {method && (
        <p className="text-body-sm text-muted-foreground">
          Paying with <strong className="text-foreground">{method.name}</strong>
          {cryptoMode === 'CHAIN_CATALOG' && selectedChain ? ` · ${selectedChain.name}` : ''}
        </p>
      )}

      {method && cryptoMode === 'EXCHANGE_QR' && (
        <MethodDetails
          method={method}
          amountText={amount != null ? amountLabel : 'your donation'}
          cryptoCurrencies={currenciesForSelectedMethod(method)}
          selectedCrypto={payCurrency}
          onSelectCrypto={(c) => setCurrency(c)}
        />
      )}

      {method && cryptoMode === 'CHAIN_CATALOG' && (
        <CryptoReceivePanel
          key={method.id}
          chains={chainOptions}
          chainKey={chainKey}
          cryptoAssetId={cryptoAssetId}
          networkId={networkId}
          onSelectChain={(key) => {
            setChainKey(key);
            setCryptoAssetId('');
            setNetworkId('');
          }}
          onSelectCurrency={(assetId, netId, symbol) => {
            setCryptoAssetId(assetId);
            setNetworkId(netId);
            if (symbol) setCurrency(symbol.toUpperCase());
          }}
        />
      )}

      {method && cryptoMode === 'none' && (
        <MethodDetails method={method} amountText={amount != null ? amountLabel : 'your donation'} />
      )}
      {paymentPickError && <p role="alert" className="text-caption font-medium text-destructive">{paymentPickError}</p>}

      {currencies.length > 0 && cryptoMode !== 'EXCHANGE_QR' && (
        <div role="radiogroup" aria-label="Currency" className="flex flex-wrap gap-2">
          {currencies.map((c) => {
            const active = c === payCurrency;
            const locked = cryptoMode === 'CHAIN_CATALOG' && currencies.length === 1;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={locked}
                onClick={() => setCurrency(c)}
                className={cn(
                  'rounded-full border px-3 py-1 text-body-sm font-semibold',
                  active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-surface-hover',
                  locked && 'opacity-80',
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
      )}
      {amountPresets.length > 0 && (
        <div className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-3 sm:gap-2.5">
          {amountPresets.map((p) => {
            const selected = amount != null && Math.abs(amount - p) < 1e-12;
            return (
              <button
                key={`${payCurrency}-${p}`}
                type="button"
                onClick={() => setAmountText(formatPresetAmountInput(p, payCurrency))}
                className={cn(
                  'min-h-11 rounded-md border px-1.5 py-2 text-caption font-bold tabular-nums sm:min-h-12 sm:px-2 sm:py-2.5 sm:text-body-sm',
                  selected ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:bg-surface-hover',
                )}
              >
                {formatMoney(p, payCurrency)}
              </button>
            );
          })}
        </div>
      )}
      <Input
        label={`Amount (${payCurrency})`}
        inputMode="decimal"
        placeholder={isCryptoDonationCurrency(payCurrency) ? formatPresetAmountInput(amountPresets[0] || 0.001, payCurrency) : 'Enter amount'}
        value={amountText}
        error={amountError}
        hint={`Min ${formatMoney(minAmount, payCurrency)}${Number.isFinite(maxAmount) ? ` · max ${formatMoney(maxAmount, payCurrency)}` : ''}`}
        onChange={(e) => setAmountText(e.target.value.replace(/[^\d.,]/g, ''))}
      />
      {campaigns.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="donate-campaign" className="text-body-sm font-semibold text-foreground">Direct my donation to</label>
          <select
            id="donate-campaign"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="h-control-md rounded-sm border border-input bg-card px-3 text-body-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">General fund</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      )}
    </div>
  );

  const stepIdentity = (
    <div className="space-y-3">
      <CheckRow
        checked={anonymous}
        onChange={setAnonymous}
        disabled={!allowAnonymous}
        title="Donate anonymously"
        hint={allowAnonymous ? 'Your name is hidden from other supporters. Our team can still see who you are for verification.' : 'Anonymous donations are not enabled.'}
      />
      <Input
        label="Display name"
        value={anonymous ? '' : displayName}
        disabled={anonymous}
        maxLength={80}
        placeholder={anonymous ? 'Anonymous' : 'How should we show your name?'}
        onChange={(e) => setDisplayName(e.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="donate-message" className="text-body-sm font-semibold text-foreground">Message (optional)</label>
        <textarea id="donate-message" rows={3} maxLength={500} className={textareaCls} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Leave a short note of support" />
      </div>
      {allowWall && (
        <>
          <CheckRow
            checked={onWall}
            onChange={(v) => { setOnWall(v); if (!v) setShareAmount(false); }}
            title="I agree to appear on the public donor wall"
            hint="Only shown after staff approve your donation. You can stay anonymous on the wall."
          />
          <CheckRow
            checked={shareAmount}
            onChange={setShareAmount}
            disabled={!onWall}
            title="Also show my donation amount"
            hint="Off by default — the amount stays private unless you opt in."
          />
        </>
      )}
    </div>
  );

  const manualMethods = selectable.filter((m) => String(m.type).toUpperCase() !== 'CRYPTO');
  const exchangeMethods = selectable.filter((m) => resolveCryptoDepositMode(m) === 'EXCHANGE_QR');
  const onChainMethods = selectable.filter((m) => resolveCryptoDepositMode(m) === 'CHAIN_CATALOG');

  const renderMethodCard = (m: DonationMethod) => {
    const active = m.id === methodId;
    return (
      <button
        key={m.id}
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => pickMethod(m.id)}
        className={cn(
          'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
          active ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface-hover',
        )}
      >
        {m.logoUrl ? (
          <img src={m.logoUrl} alt="" className="size-10 shrink-0 rounded-md bg-white object-contain p-0.5" />
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            {String(m.type).toUpperCase() === 'CRYPTO' ? <Bitcoin className="size-5" aria-hidden /> : <Landmark className="size-4" aria-hidden />}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-sm font-bold text-foreground">{m.name}</span>
          {m.description ? (
            <span className="mt-0.5 block text-caption text-muted-foreground line-clamp-2">{m.description}</span>
          ) : String(m.type).toUpperCase() === 'CRYPTO' ? (
            <span className="mt-0.5 block text-caption text-muted-foreground">Exchange deposit QR</span>
          ) : null}
        </span>
      </button>
    );
  };

  const stepPayment = (
    <div>
      {selectable.length === 0 ? (
        <p className="rounded-md border border-border bg-muted/40 p-4 text-body-sm text-muted-foreground">
          No payment method is currently available. Please check back soon.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-body-sm text-muted-foreground">Tap a method to continue.</p>
          {manualMethods.length > 0 && (
            <div>
              <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">Mobile / bank</p>
              <div role="radiogroup" aria-label="Mobile payment methods" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {manualMethods.map(renderMethodCard)}
              </div>
            </div>
          )}
          {(exchangeMethods.length > 0 || onChainMethods.length > 0) && (
            <div>
              <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Crypto
              </p>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                {onChainMethods.map((m) => (
                  <CryptoMethodTile
                    key={m.id}
                    methodName={m.name || 'Crypto'}
                    logoUrl={m.logoUrl}
                    active={m.id === methodId}
                    onClick={() => pickMethod(m.id)}
                  />
                ))}
                {exchangeMethods.map(renderMethodCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const stepConfirm = submitted ? (
    <div className="space-y-4 text-center">
      <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden="true" />
      <div>
        <h3 className="text-title font-bold text-foreground">Submitted for review</h3>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Thank you. Your payment details were received. Our team will verify the payment before it counts as a donation — it is <strong>not verified yet</strong>.
        </p>
      </div>
      <div className="mx-auto max-w-xs"><CopyField label="Tracking ID" value={trackingId} /></div>
      <p className="text-caption text-muted-foreground">Keep this ID. You can follow the status under My Donations.</p>
    </div>
  ) : (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-caption text-muted-foreground">Your donation is created — pending your payment details</p>
        <div className="mt-2"><CopyField label="Tracking ID" value={trackingId} /></div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-body-sm">
          <dt className="text-muted-foreground">Amount</dt><dd className="text-right font-semibold text-foreground">{amountLabel}</dd>
          <dt className="text-muted-foreground">Method</dt><dd className="text-right font-semibold text-foreground">{method?.name || '—'}</dd>
          {campaign && (<><dt className="text-muted-foreground">Campaign</dt><dd className="text-right font-semibold text-foreground">{campaign.title}</dd></>)}
        </dl>
        {(selectedWallet?.address || method?.merchantDisplay) && (
          <div className="mt-3">
            <CopyField
              label={selectedWallet ? 'Deposit address' : 'Pay to'}
              value={selectedWallet?.address || method!.merchantDisplay!}
            />
          </div>
        )}
        {/* Always encode the address — never show a wallet logo as if it were a QR. */}
        {selectedWallet?.address ? (
          <div className="mx-auto mt-3 w-fit rounded-md border border-border bg-white p-2">
            <div className="size-28 sm:size-32" role="img" aria-label="Deposit address QR">
              <QRCode
                value={selectedWallet.address}
                size={128}
                level="M"
                bgColor="#ffffff"
                fgColor="#0f172a"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        ) : method?.qrUrl ? (
          <img
            src={method.qrUrl}
            alt=""
            className="mx-auto mt-3 size-28 rounded-md border border-border bg-white object-contain p-1 sm:size-32"
          />
        ) : null}
      </div>
      <p className="text-caption text-muted-foreground">
        Transaction ID is optional — you can send a proof photo and/or your phone number instead.
      </p>
      <Input
        label="Transaction reference / ID (optional)"
        value={txRef}
        maxLength={120}
        placeholder="e.g. 9AB3XY12"
        onChange={(e) => setTxRef(e.target.value)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Payment date (optional)" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
        <Input
          label="Sender phone / account"
          value={senderRef}
          maxLength={120}
          placeholder="01XXXXXXXXX"
          onChange={(e) => setSenderRef(e.target.value)}
          hint="Required if you skip Trx ID and have no proof photo"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="donate-note" className="text-body-sm font-semibold text-foreground">Note to reviewer (optional)</label>
        <textarea id="donate-note" rows={2} maxLength={500} className={textareaCls} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div>
        <p className="mb-2 text-body-sm font-semibold text-foreground">Payment proof photo</p>
        <p className="mb-2 text-caption text-muted-foreground">Screenshot or receipt — enough on its own if you skip Trx ID.</p>
        <ProofUploader files={proofs} onChange={setProofs} disabled={submitting} />
      </div>
    </div>
  );

  const body = [stepPayment, stepAmount, stepIdentity, stepConfirm][step];

  const footer = submitted ? (
    <>
      <Button variant="secondary" onClick={onClose}>Close</Button>
      <Button onClick={() => { onClose(); navigate(`/donate/history/${encodeURIComponent(submitted.id || created!.id)}`); }}>View donation</Button>
    </>
  ) : (
    <>
      {step === 0 ? (
        <span className="text-caption text-muted-foreground">Select a payment method</span>
      ) : step < 3 ? (
        <Button variant="ghost" leftIcon={<ChevronLeft className="size-4" />} disabled={creating} onClick={goBack}>
          Back
        </Button>
      ) : (
        <Button variant="ghost" onClick={onClose} disabled={submitting}>Finish later</Button>
      )}
      {step === 0 ? null : step < 3 ? (
        <Button
          onClick={next}
          disabled={!canNext || (step === 1 && !paymentReady)}
          loading={creating}
          rightIcon={step === 2 ? undefined : <ChevronRight className="size-4" />}
        >
          {step === 2 ? (created ? 'Continue' : "I've paid — continue") : 'Continue'}
        </Button>
      ) : (
        <Button onClick={submitNow} loading={submitting}>Submit for review</Button>
      )}
    </>
  );

  return (
    <Modal
      open
      onClose={onClose}
      size="full"
      closeOnOverlay={false}
      className="h-[100dvh] max-h-[100dvh] w-full max-w-none rounded-none pb-[env(safe-area-inset-bottom)] sm:h-[min(920px,94dvh)] sm:max-h-[94dvh] sm:w-[min(960px,94vw)] sm:max-w-4xl sm:rounded-xl md:w-[min(1100px,92vw)] md:max-w-5xl"
      title={submitted ? 'Donation submitted' : 'Make a donation'}
      description={!submitted && step === 0 && campaign ? `Supporting: ${campaign.title}` : undefined}
      footer={footer}
    >
      {!submitted && <Stepper step={step} />}
      {error && <p role="alert" className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-body-sm text-destructive">{error}</p>}
      {body}
    </Modal>
  );
}

/** Mounts the wizard fresh on each open so state never leaks between sessions. */
export function DonationWizard(props: DonationWizardProps) {
  if (!props.open) return null;
  return <WizardBody {...props} />;
}

export default DonationWizard;
