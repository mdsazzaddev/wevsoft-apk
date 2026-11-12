import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Check, ChevronRight, ExternalLink, Plus, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { DEVELOPER_PRODUCT_IDS, WEVSOFT_PRODUCTS, type WevsoftProduct, type WevsoftProductId } from '../../lib/wevsoftProducts';
import { PRODUCT_GUIDES, PRODUCT_UI, type ProductLang } from '../../lib/wevsoftProductDetails';
import type { DeveloperApp } from './devApi';
import { SectionCard, cx, inputCls } from './devUi';

// Phase 3 W2: the selection lives on the server (GET/PUT /api/developer/apps/:id/products).
// The old localStorage list is imported once (then a .migrated marker is set) and still
// mirrored for one release as rollback safety; remove the mirror in Phase 4.
const storageKey = (appId: string) => `wevsoft.dev.appProducts.${appId}`;
const migratedKey = (appId: string) => `wevsoft.dev.appProducts.${appId}.migrated`;
const productsKey = (appId: string) => ['developerApp', appId, 'products'] as const;
// Language of this tab only. Unset = follow the app's i18next language.
const LANG_KEY = 'wevsoft.dev.productsLang';

function load(appId: string): WevsoftProductId[] {
  try {
    const v = JSON.parse(localStorage.getItem(storageKey(appId)) || '[]');
    return Array.isArray(v) ? v.filter((x): x is WevsoftProductId => (DEVELOPER_PRODUCT_IDS as readonly string[]).includes(x)) : [];
  } catch {
    return [];
  }
}

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

function useProductLang(): [ProductLang, (l: ProductLang) => void] {
  const { i18n } = useTranslation();
  const [saved, setSaved] = useState<ProductLang | null>(() => {
    try {
      const v = localStorage.getItem(LANG_KEY);
      return v === 'bn' || v === 'en' ? v : null;
    } catch {
      return null;
    }
  });
  const lang: ProductLang = saved ?? ((i18n.resolvedLanguage || i18n.language || 'en').startsWith('bn') ? 'bn' : 'en');
  const set = (l: ProductLang) => {
    setSaved(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
  };
  return [lang, set];
}

export default function AppProductsTab({ app }: { app: DeveloperApp }) {
  const queryClient = useQueryClient();
  const productsQuery = useQuery<{ products: WevsoftProductId[] }>({
    queryKey: productsKey(app.id),
    queryFn: async () => (await api.get(`/api/developer/apps/${app.id}/products`)).data,
  });
  const save = useMutation({
    mutationFn: async (vars: { products: WevsoftProductId[]; source?: 'local_import' }) =>
      (await api.put(`/api/developer/apps/${app.id}/products`, vars)).data as { products: WevsoftProductId[] },
    onSuccess: (data) => queryClient.setQueryData(productsKey(app.id), data),
  });
  const enabled: WevsoftProductId[] = Array.isArray(productsQuery.data?.products) ? productsQuery.data!.products : [];
  const importTried = useRef<string | null>(null);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<WevsoftProductId | null>(null);
  const [lang, setLang] = useProductLang();
  const t = PRODUCT_UI[lang];

  // One-time import of the pre-Phase-3 localStorage selection.
  useEffect(() => {
    if (!productsQuery.isSuccess || importTried.current === app.id) return;
    importTried.current = app.id;
    try {
      if (localStorage.getItem(migratedKey(app.id))) return;
      localStorage.setItem(migratedKey(app.id), '1');
    } catch {
      return;
    }
    const local = load(app.id);
    if (!productsQuery.data?.products?.length && local.length) save.mutate({ products: local, source: 'local_import' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per app after the first load
  }, [app.id, productsQuery.isSuccess]);

  const toggle = (id: WevsoftProductId) => {
    const name = PRODUCT_GUIDES[id][lang].name;
    const on = enabled.includes(id);
    const next = on ? enabled.filter((x) => x !== id) : [...enabled, id];
    queryClient.setQueryData(productsKey(app.id), { products: next });
    save.mutate(
      { products: next },
      {
        onSuccess: () => {
          try {
            localStorage.setItem(storageKey(app.id), JSON.stringify(next));
          } catch {
            /* storage full or blocked: server copy is authoritative */
          }
          toast.success(fill(on ? t.removedToast : t.addedToast, { name, app: app.name }));
        },
        onError: (e: any) => {
          queryClient.invalidateQueries({ queryKey: productsKey(app.id) });
          toast.error(e?.message || t.saveError);
        },
      },
    );
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return WEVSOFT_PRODUCTS;
    return WEVSOFT_PRODUCTS.filter((p) => {
      const g = PRODUCT_GUIDES[p.id];
      return `${p.name} ${p.description} ${p.category} ${g.bn.name} ${g.bn.tagline} ${g.en.tagline}`.toLowerCase().includes(q);
    });
  }, [query]);

  const openProduct = openId ? WEVSOFT_PRODUCTS.find((p) => p.id === openId) || null : null;

  return (
    <div lang={lang}>
      <SectionCard
        title={
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span>{t.title}</span>
            <LangToggle lang={lang} onChange={setLang} />
          </span>
        }
        description={fill(t.intro, { app: app.name, n: enabled.length, total: WEVSOFT_PRODUCTS.length })}
      >
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} className={cx(inputCls, 'pl-9')} />
        </div>

        {list.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{fill(t.noMatch, { q: query })}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {list.map((p) => {
              const on = enabled.includes(p.id);
              const g = PRODUCT_GUIDES[p.id][lang];
              return (
                <li key={p.id} className={cx('flex flex-col gap-3 rounded-2xl border p-3 transition-colors', on ? 'border-primary/40 bg-primary/[0.04]' : 'border-border bg-card')}>
                  <div className="flex items-center gap-3">
                    <ProductIcon p={p} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{g.name}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{g.tagline}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button type="button" onClick={() => setOpenId(p.id)} className="inline-flex h-8 items-center gap-0.5 rounded-full px-2 text-xs font-medium text-primary hover:bg-primary/10">
                      {t.details} <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <AddButton on={on} label={on ? t.added : t.add} onClick={() => toggle(p.id)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {openProduct && (
        <ProductDrawer
          product={openProduct}
          lang={lang}
          onLang={setLang}
          on={enabled.includes(openProduct.id)}
          onToggle={() => toggle(openProduct.id)}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

function ProductIcon({ p, big }: { p: WevsoftProduct; big?: boolean }) {
  return (
    <span className={cx('flex shrink-0 items-center justify-center rounded-xl', p.tile, big ? 'h-12 w-12' : 'h-10 w-10')}>
      <p.icon className={big ? 'h-6 w-6' : 'h-5 w-5'} />
    </span>
  );
}

function AddButton({ on, label, onClick, wide }: { on: boolean; label: string; onClick: () => void; wide?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors',
        wide ? 'h-10 w-full text-sm' : 'h-8',
        on ? 'bg-primary text-primary-foreground hover:brightness-110' : 'border border-border hover:bg-muted',
      )}
    >
      {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function LangToggle({ lang, onChange }: { lang: ProductLang; onChange: (l: ProductLang) => void }) {
  const opts: [ProductLang, string][] = [
    ['en', 'EN'],
    ['bn', 'বাংলা'],
  ];
  return (
    <span role="group" aria-label="Language / ভাষা" className="inline-flex rounded-full border border-border bg-muted/50 p-0.5 text-xs font-medium">
      {opts.map(([code, label]) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={lang === code}
          onClick={() => onChange(code)}
          className={cx('rounded-full px-2.5 py-1 transition-colors', lang === code ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
        >
          {label}
        </button>
      ))}
    </span>
  );
}

function ProductDrawer({
  product,
  lang,
  onLang,
  on,
  onToggle,
  onClose,
}: {
  product: WevsoftProduct;
  lang: ProductLang;
  onLang: (l: ProductLang) => void;
  on: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const t = PRODUCT_UI[lang];
  const guide = PRODUCT_GUIDES[product.id];
  const d = guide[lang];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-stretch sm:justify-end" role="dialog" aria-modal="true" aria-labelledby="product-drawer-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        lang={lang}
        className="relative flex max-h-[88dvh] w-full flex-col rounded-t-3xl border border-border bg-card text-foreground shadow-2xl sm:h-full sm:max-h-none sm:w-[440px] sm:rounded-none sm:border-y-0 sm:border-r-0"
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted sm:hidden" aria-hidden />
        <header className="flex items-start gap-3 border-b border-border px-5 py-4">
          <ProductIcon p={product} big />
          <div className="min-w-0 flex-1">
            <h2 id="product-drawer-title" className="text-lg font-semibold">{d.name}</h2>
            <p className="text-sm text-muted-foreground">{d.tagline}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t.close} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 text-sm leading-relaxed">
          <div className="flex justify-end">
            <LangToggle lang={lang} onChange={onLang} />
          </div>
          <Section title={t.what}>
            <p className="text-muted-foreground">{d.what}</p>
          </Section>
          <Section title={t.how}>
            <ol className="space-y-2.5">
              {d.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          </Section>
          <Section title={t.useCases}>
            <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground marker:text-primary">
              {d.useCases.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </Section>
          <Section title={t.gives}>
            <ul className="space-y-1.5">
              {d.gives.map((g) => (
                <li key={g} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </Section>
          <Section title={t.scopes}>
            {guide.scopes.length ? (
              <div className="flex flex-wrap gap-1.5">
                {guide.scopes.map((s) => (
                  <code key={s} lang="en" className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">{s}</code>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{t.noScopes}</p>
            )}
          </Section>
          <a href={product.path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            {fill(t.open, { name: d.name })} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <footer className="border-t border-border px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <AddButton on={on} label={on ? t.added : t.add} onClick={onToggle} wide />
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}
