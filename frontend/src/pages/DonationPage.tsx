import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, HeartHandshake } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { AppNavLink } from '../components/navigation/AppNavLink';
import {
  CampaignCard,
  CryptoSection,
  DonorWall,
  EmptyNote,
  FaqSection,
  MethodsGrid,
  SectionHeader,
  SectionSkeleton,
  StatsRow,
} from '../components/donate/DonateSections';
import { DonationWizard } from './donate/DonationWizard';
import { useStore } from '../store';
import {
  fetchCryptoProviders,
  fetchDonationCampaigns,
  fetchDonationConfig,
  fetchDonationMethods,
  fetchDonorWall,
  type CryptoCatalogPayload,
  type DonationCampaign,
  type DonationCenterConfig,
  type DonationFooterLink,
  type DonationMethod,
  type DonorWallItem,
} from '../lib/donationApi';

function defaultFooterLinks(config: DonationCenterConfig | null): DonationFooterLink[] {
  const terms = config?.termsPath || '/terms';
  const privacy = config?.privacyPath || '/privacy';
  const email = config?.supportEmail;
  return [
    { id: 'about', label: 'About', href: '/support' },
    { id: 'terms', label: 'Terms', href: terms },
    { id: 'privacy', label: 'Privacy', href: privacy },
    { id: 'faq', label: 'FAQ', href: '#donate-faq' },
    { id: 'contact', label: 'Contact', href: email?.includes('@') ? `mailto:${email}` : '/support' },
  ];
}

interface LoadState {
  loading: boolean;
  config: DonationCenterConfig | null;
  methods: DonationMethod[];
  campaigns: DonationCampaign[];
  wall: DonorWallItem[];
  crypto: CryptoCatalogPayload;
  failed: Partial<Record<'config' | 'methods' | 'campaigns' | 'wall' | 'crypto', boolean>>;
}

const EMPTY_CRYPTO: CryptoCatalogPayload = { providers: [], catalog: [] };
const INITIAL: LoadState = { loading: true, config: null, methods: [], campaigns: [], wall: [], crypto: EMPTY_CRYPTO, failed: {} };

export function DonationPage() {
  const navigate = useNavigate();
  const token = useStore((s) => s.token);
  const [state, setState] = useState<LoadState>(INITIAL);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const [config, methods, campaigns, wall, crypto] = await Promise.allSettled([
      fetchDonationConfig(),
      fetchDonationMethods(),
      fetchDonationCampaigns(),
      fetchDonorWall(12),
      fetchCryptoProviders(),
    ]);
    setState({
      loading: false,
      config: config.status === 'fulfilled' ? config.value : null,
      methods: methods.status === 'fulfilled' ? methods.value : [],
      campaigns: campaigns.status === 'fulfilled' ? campaigns.value : [],
      wall: wall.status === 'fulfilled' ? wall.value : [],
      crypto: crypto.status === 'fulfilled' ? crypto.value : EMPTY_CRYPTO,
      failed: {
        config: config.status === 'rejected',
        methods: methods.status === 'rejected',
        campaigns: campaigns.status === 'rejected',
        wall: wall.status === 'rejected',
        crypto: crypto.status === 'rejected',
      },
    });
  }, []);

  useEffect(() => { void load(); }, [load]);

  const { loading, config, methods, campaigns, wall, crypto, failed } = state;
  const disabled = config?.enabled === false;
  const showWall = config?.allowDonorWall !== false;
  const cryptoSelectable = methods.filter((m) => m.selectable && String(m.type).toUpperCase() === 'CRYPTO');
  // Crypto is its own section (Admin → Donations → Crypto) — not mixed into Payment methods.
  const showCrypto =
    config?.cryptoSectionVisible !== false &&
    (cryptoSelectable.length > 0 ||
      crypto.providers.length > 0 ||
      crypto.catalog.some((a) => a.networks.length > 0));

  const startDonation = (forCampaign?: string) => {
    if (!token) {
      toast('Sign in to donate');
      navigate(`/auth?next=${encodeURIComponent('/donate')}`);
      return;
    }
    setCampaignId(forCampaign || null);
    setWizardOpen(true);
  };

  const scrollDonateTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const footerLinks =
    Array.isArray(config?.footerLinks) && config!.footerLinks!.length > 0
      ? config!.footerLinks!
      : defaultFooterLinks(config);

  const renderFooterLink = (link: DonationFooterLink) => {
    const href = String(link.href || '').trim();
    const label = String(link.label || '').trim() || 'Link';
    const cls = 'hover:text-foreground';
    if (href.startsWith('#')) {
      const id = href.slice(1);
      return (
        <button key={link.id || label} type="button" className={cls} onClick={() => scrollDonateTo(id)}>
          {label}
        </button>
      );
    }
    if (/^mailto:/i.test(href) || /^https?:\/\//i.test(href)) {
      return (
        <a
          key={link.id || label}
          href={href}
          className={cls}
          {...(link.openInNewTab && /^https?:\/\//i.test(href)
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {})}
        >
          {label}
        </a>
      );
    }
    return (
      <AppNavLink key={link.id || label} to={href || '/'} className={cls}>
        {label}
      </AppNavLink>
    );
  };

  return (
    <div className="flex min-h-full w-full flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex w-full max-w-[2400px] items-center gap-2 px-3 py-2 sm:gap-3 sm:px-5 sm:py-2.5 lg:px-6 2xl:px-10">
          <AppNavLink
            to="/home"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
            aria-label="Back to home"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </AppNavLink>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HeartHandshake className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-body-sm font-extrabold text-foreground sm:text-base">
                {config?.pageTitle || 'Donation & Support Center'}
              </p>
              <p className="hidden truncate text-caption text-muted-foreground sm:block">
                {config?.pageSubtitle || 'Support WebSoft with a verified contribution'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
            {token ? (
              <AppNavLink
                to="/donate/history"
                className="rounded-lg px-2 py-2 text-caption font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground sm:px-2.5 sm:text-body-sm"
              >
                My donations
              </AppNavLink>
            ) : null}
            <button
              type="button"
              className="hidden rounded-lg px-2.5 py-2 text-body-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground sm:inline"
              onClick={() => scrollDonateTo('donate-faq')}
            >
              FAQ
            </button>
            <Button
              size="md"
              className="min-h-10 px-4"
              disabled={loading || disabled}
              rightIcon={<ArrowRight className="size-4" />}
              onClick={() => startDonation()}
            >
              Donate
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[2400px] flex-1 space-y-4 px-3 pb-[max(6rem,env(safe-area-inset-bottom))] pt-3 sm:space-y-5 sm:px-5 sm:pt-4 lg:px-6 2xl:px-10 md:pb-12">
      <section className="rounded-xl border border-border bg-card p-3.5 sm:p-5" aria-labelledby="donate-hero-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
              {loading && !config ? (
                <div className="space-y-2"><Skeleton className="h-6 w-56" /><Skeleton className="h-4 w-72 max-w-full" /></div>
              ) : (
                <>
                  <h1 id="donate-hero-heading" className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
                    {config?.heroHeading || config?.pageTitle || 'Donation & Support Center'}
                  </h1>
                  <p className="mt-1 max-w-3xl text-body-sm text-muted-foreground">
                    {config?.heroDescription || config?.pageSubtitle || 'Support WebSoft with a verified contribution'}
                  </p>
                </>
              )}
          </div>
        </div>
        {disabled && (
          <p role="status" className="mt-3 text-body-sm font-medium text-warning">
            The Donation Center is temporarily unavailable. Please check back later.
          </p>
        )}
        {failed.config && !loading && (
          <p role="alert" className="mt-3 text-body-sm text-destructive">
            Could not load donation settings. <button type="button" className="font-semibold underline" onClick={() => void load()}>Retry</button>
          </p>
        )}
      </section>

      <StatsRow config={config} />

      {/* Campaigns: omit entire block when empty (no empty-state copy) */}
      {(loading || failed.campaigns || campaigns.length > 0) && (
        <section aria-labelledby="donate-campaigns">
          <SectionHeader id="donate-campaigns" title="Campaigns" subtitle="Choose a cause or give to the general fund." />
          {loading ? (
            <SectionSkeleton />
          ) : failed.campaigns ? (
            <EmptyNote>
              Campaigns could not be loaded.{' '}
              <button type="button" className="font-semibold text-primary underline" onClick={() => void load()}>
                Retry
              </button>
            </EmptyNote>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((c) => (
                <CampaignCard key={c.id} campaign={c} onDonate={(id) => startDonation(id)} />
              ))}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="donate-methods">
        <SectionHeader
          id="donate-methods"
          title="Payment methods"
          subtitle="Mobile banking and bank transfer. Crypto is listed in its own section below."
        />
        {loading ? <SectionSkeleton rows={4} /> : failed.methods
          ? <EmptyNote>Payment methods could not be loaded.</EmptyNote>
          : <MethodsGrid methods={methods} />}
      </section>

      {showCrypto && !failed.crypto && (
        <CryptoSection
          config={config}
          providers={crypto.providers}
          catalog={crypto.catalog}
          selectableMethods={cryptoSelectable}
        />
      )}

      {showWall && (
        <section aria-labelledby="donate-wall">
          <SectionHeader id="donate-wall" title="Donor wall" subtitle="Supporters who chose to be shown publicly, after verification." />
          {loading ? <SectionSkeleton /> : failed.wall ? <EmptyNote>The donor wall could not be loaded.</EmptyNote> : <DonorWall items={wall} />}
        </section>
      )}

      <section aria-labelledby="donate-how">
        <SectionHeader id="donate-how" title="How it works" />
        <ol className="grid gap-3 sm:grid-cols-4">
          {['Choose an amount', 'Pay with a listed method', 'Submit your transaction reference', 'Staff verify, then you get a receipt'].map((t, i) => (
            <li key={t}>
              <Card padding="md" className="h-full">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-caption font-bold text-primary">{i + 1}</span>
                <p className="mt-2 text-body-sm font-semibold text-foreground">{t}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="donate-faq">
        <SectionHeader id="donate-faq" title="Help & FAQ" />
        <FaqSection />
      </section>

      <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-5 text-body-sm text-muted-foreground">
        {footerLinks.map(renderFooterLink)}
      </footer>

      <DonationWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        config={config}
        methods={methods}
        campaigns={campaigns}
        cryptoCatalog={crypto.catalog}
        initialCampaignId={campaignId}
      />
      </div>
    </div>
  );
}

export default DonationPage;
