import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle, Check, CheckCircle2, Clock, Code, Copy, ExternalLink,
  Globe, Info, Layers, Loader2, MessageSquare, RefreshCw, Search,
  Share2, ShieldAlert, Sparkles, X
} from 'lucide-react';
import api from '../../../../lib/api';
import { cx } from '../../devUi';
import { Card, CodeBox, ConsolePage, EmptyState, Pill, btn, inputCls } from '../ui';

interface LinkPreviewData {
  url: string;
  finalUrl: string;
  status: number;
  statusText: string;
  responseTimeMs: number;
  contentType: string;
  preview: {
    url: string;
    finalUrl: string;
    title: string | null;
    description: string | null;
    image: string | null;
    siteName: string | null;
    domain: string;
  };
  rawTags: Record<string, string>;
  warnings: { id: string; level: 'warning' | 'error' | 'info'; message: string; fix: string }[];
  scrapedAt: string;
  cached: boolean;
}

const PRESET_URLS = [
  { label: 'WevSoft Platform', url: 'https://wevsoft.com' },
  { label: 'GitHub', url: 'https://github.com' },
  { label: 'TechCrunch', url: 'https://techcrunch.com' },
  { label: 'The Verge', url: 'https://theverge.com' },
];

export function SharingDebuggerPage() {
  const [targetUrl, setTargetUrl] = useState('');
  const [data, setData] = useState<LinkPreviewData | null>(null);
  const [previewMode, setPreviewMode] = useState<'feed' | 'chat'>('feed');
  const [isCopiedTag, setIsCopiedTag] = useState(false);

  const debugMutation = useMutation({
    mutationFn: async ({ url, forceRefresh }: { url: string; forceRefresh?: boolean }) => {
      const res = await api.post('/api/link-preview/debug', { url, forceRefresh });
      return res.data as LinkPreviewData;
    },
    onSuccess: (result, vars) => {
      setData(result);
      if (vars.forceRefresh) {
        toast.success('Purged cache and scraped fresh Open Graph tags');
      } else {
        toast.success(`Scraped: ${result.preview.domain || 'URL'}`);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Could not scrape URL. Ensure it is a valid public web page.');
    },
  });

  const handleDebug = (e?: React.FormEvent, forceRefresh = false) => {
    if (e) e.preventDefault();
    const trimmed = targetUrl.trim();
    if (!trimmed) {
      toast.error('Enter a URL to debug');
      return;
    }
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    setTargetUrl(withProto);
    debugMutation.mutate({ url: withProto, forceRefresh });
  };

  const handlePreset = (url: string) => {
    setTargetUrl(url);
    debugMutation.mutate({ url, forceRefresh: false });
  };

  // HTML <head> template snippet based on active or template tags
  const recommendedHtmlSnippet = `<!-- Recommended Open Graph tags for rich previews on Wevsoft & social feeds -->
<meta property="og:title" content="${data?.preview?.title || 'Your Article or Page Title'}" />
<meta property="og:description" content="${data?.preview?.description || 'A concise 2-3 sentence summary of your content.'}" />
<meta property="og:image" content="${data?.preview?.image || 'https://yourdomain.com/og-image-1200x630.jpg'}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${data?.finalUrl || targetUrl || 'https://yourdomain.com/page-url'}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="${data?.preview?.siteName || 'Your Site Name'}" />

<!-- Twitter / X Card fallback -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${data?.preview?.title || 'Your Article or Page Title'}" />
<meta name="twitter:description" content="${data?.preview?.description || 'A concise 2-3 sentence summary of your content.'}" />
<meta name="twitter:image" content="${data?.preview?.image || 'https://yourdomain.com/og-image-1200x630.jpg'}" />`;

  const copySnippet = () => {
    navigator.clipboard.writeText(recommendedHtmlSnippet);
    setIsCopiedTag(true);
    toast.success('Open Graph HTML snippet copied');
    setTimeout(() => setIsCopiedTag(false), 2000);
  };

  return (
    <ConsolePage
      group="Developer Tools"
      title="Sharing Debugger"
      description="Inspect how your links appear when shared across Wevsoft feeds and WevChat conversations. Verify Open Graph tags, detect missing assets, and purge preview caches."
      requiresAccount={false}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copySnippet}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-[7px] border border-[var(--dc-border)] bg-[var(--dc-card)] hover:bg-[var(--dc-hover)] text-[var(--dc-text)] transition-colors"
          >
            {isCopiedTag ? <Check size={14} className="text-emerald-500" /> : <Code size={14} className="text-[var(--dc-blue)]" />}
            Get Meta Snippet
          </button>
        </div>
      }
    >
      {/* Search & URL Input Bar */}
      <div className="dc-card p-4 space-y-3">
        <form onSubmit={(e) => handleDebug(e, false)} className="flex flex-col sm:flex-row items-stretch gap-2">
          <div className="relative flex-1 min-w-0">
            <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dc-faint)]" />
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="Paste any URL (e.g. https://yourdomain.com/post-or-article)"
              className={cx(inputCls, 'pl-9 text-[13px] font-mono')}
              spellCheck={false}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="submit"
              disabled={debugMutation.isPending || !targetUrl.trim()}
              className={cx(btn.primary, 'px-5 text-[13px] font-semibold h-[38px]')}
            >
              {debugMutation.isPending ? <Loader2 size={15} className="animate-spin mr-1.5" /> : <Search size={15} className="mr-1.5" />}
              Debug URL
            </button>

            {data && (
              <button
                type="button"
                disabled={debugMutation.isPending}
                onClick={() => handleDebug(undefined, true)}
                title="Purge cache and re-scrape destination server"
                className={cx(btn.secondary, 'h-[38px] px-3.5 text-[12.5px]')}
              >
                <RefreshCw size={13} className={cx('mr-1.5', debugMutation.isPending && 'animate-spin')} />
                Scrape Again
              </button>
            )}
          </div>
        </form>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 overflow-x-auto text-[11px] pt-1">
          <span className="text-[var(--dc-faint)] uppercase tracking-wider font-semibold shrink-0">
            Presets:
          </span>
          {PRESET_URLS.map((p) => (
            <button
              key={p.url}
              type="button"
              onClick={() => handlePreset(p.url)}
              className="px-2.5 py-0.5 rounded-full border border-[var(--dc-border)] bg-[var(--dc-side)] hover:bg-[var(--dc-hover)] text-[var(--dc-text-2)] shrink-0 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Results Container */}
      {data && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Telemetry Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[8px] border border-[var(--dc-border)] bg-[var(--dc-side)] text-[12px]">
            <div className="flex items-center gap-2.5">
              <Pill tone={data.status === 200 ? 'green' : 'amber'}>
                HTTP {data.status} {data.statusText}
              </Pill>
              <span className="text-[var(--dc-muted)] flex items-center gap-1 font-mono">
                <Clock size={12} /> {data.responseTimeMs} ms
              </span>
              <span className="text-[var(--dc-muted)] font-mono">
                {data.cached ? '⚡ Cached in Redis' : '🌐 Fresh Live Scrape'}
              </span>
            </div>
            <div className="text-[11px] text-[var(--dc-faint)] font-mono truncate max-w-sm">
              Canonical: <span className="text-[var(--dc-text-2)]">{data.finalUrl}</span>
            </div>
          </div>

          {/* Diagnostics & Warnings Card (Meta Parity) */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-[var(--dc-blue)]" />
                <span>Open Graph Quality & Diagnostics</span>
                <span className="text-[11px] text-[var(--dc-muted)] font-normal">
                  ({data.warnings.length === 0 ? 'All standard tags present' : `${data.warnings.length} diagnostic notice(s)`})
                </span>
              </div>
            }
          >
            {data.warnings.length === 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-[8px] bg-emerald-500/10 text-emerald-500 text-[12.5px] font-medium">
                <CheckCircle2 size={16} />
                <span>Excellent! All recommended Open Graph tags (og:title, og:image, og:description, og:url) are detected and correctly formatted.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className={cx(
                      'p-3 rounded-[8px] border text-[12px] flex items-start gap-2.5',
                      w.level === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                        : 'bg-[var(--dc-side)] border-[var(--dc-border)] text-[var(--dc-text-2)]',
                    )}
                  >
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <strong className="font-semibold block">{w.message}</strong>
                      <p className="text-[11.5px] text-[var(--dc-muted)] leading-relaxed">{w.fix}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 2-Column Split: Visual Card Preview on Left, Raw OG Properties on Right */}
          <div className="grid gap-4 min-[1100px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)]">
            {/* Visual Simulator */}
            <Card
              title="Social Sharing Visual Card Preview"
              description="Real rendered preview of how this URL looks in Wevsoft feeds and WevChat conversations."
              action={
                <div className="flex items-center rounded-[6px] border border-[var(--dc-border)] bg-[var(--dc-side)] p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('feed')}
                    className={cx(
                      'px-2.5 py-0.5 rounded-[4px] font-medium transition-colors',
                      previewMode === 'feed' ? 'bg-[var(--dc-card)] text-[var(--dc-text)] font-semibold shadow-xs' : 'text-[var(--dc-muted)]',
                    )}
                  >
                    Feed Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('chat')}
                    className={cx(
                      'px-2.5 py-0.5 rounded-[4px] font-medium transition-colors',
                      previewMode === 'chat' ? 'bg-[var(--dc-card)] text-[var(--dc-text)] font-semibold shadow-xs' : 'text-[var(--dc-muted)]',
                    )}
                  >
                    WevChat Bubble
                  </button>
                </div>
              }
            >
              {previewMode === 'feed' ? (
                /* FEED CARD SIMULATION */
                <div className="rounded-[12px] border border-[var(--dc-border)] bg-[var(--dc-card)] overflow-hidden shadow-xs">
                  {/* Mock Feed Header */}
                  <div className="p-3 border-b border-[var(--dc-border)] flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[var(--dc-blue-soft)] text-[var(--dc-blue)] flex items-center justify-center font-bold text-xs">
                      WS
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-[var(--dc-text)]">Wevsoft Creator</div>
                      <div className="text-[10px] text-[var(--dc-muted)]">Just now • 🌐 Public</div>
                    </div>
                  </div>

                  {/* Simulated Post Text */}
                  <div className="p-3 text-[12.5px] text-[var(--dc-text-2)]">
                    Check out this interesting read: <span className="text-[var(--dc-blue)] underline">{data.finalUrl}</span>
                  </div>

                  {/* Link Preview Embed */}
                  <a
                    href={data.finalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border-t border-[var(--dc-border)] bg-[var(--dc-side)] hover:opacity-95 transition-opacity"
                  >
                    {data.preview.image ? (
                      <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-black/5">
                        <img
                          src={data.preview.image}
                          alt={data.preview.title || 'Preview'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-32 w-full flex items-center justify-center bg-[var(--dc-side)] text-[var(--dc-faint)] text-xs">
                        <Share2 size={24} className="opacity-40 mr-2" /> No og:image provided
                      </div>
                    )}
                    <div className="p-3 space-y-1">
                      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--dc-faint)] block truncate">
                        {data.preview.domain || data.preview.siteName}
                      </span>
                      <h4 className="text-[13.5px] font-bold text-[var(--dc-text)] line-clamp-2 leading-snug">
                        {data.preview.title || 'Untitled Link'}
                      </h4>
                      {data.preview.description && (
                        <p className="text-[11.5px] text-[var(--dc-muted)] line-clamp-2 leading-relaxed">
                          {data.preview.description}
                        </p>
                      )}
                    </div>
                  </a>
                </div>
              ) : (
                /* WEVCHAT BUBBLE SIMULATION */
                <div className="p-4 rounded-[12px] bg-[var(--dc-side)] flex justify-end">
                  <div className="max-w-[320px] rounded-[16px] rounded-br-[4px] border border-[var(--dc-border)] bg-[var(--dc-card)] overflow-hidden shadow-xs space-y-2">
                    {data.preview.image && (
                      <img
                        src={data.preview.image}
                        alt=""
                        className="w-full aspect-[1.91/1] object-cover"
                      />
                    )}
                    <div className="p-2.5 pt-0 space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-[var(--dc-faint)]">
                        {data.preview.domain}
                      </span>
                      <h5 className="text-[12px] font-bold text-[var(--dc-text)] line-clamp-2 leading-tight">
                        {data.preview.title}
                      </h5>
                      {data.preview.description && (
                        <p className="text-[10.5px] text-[var(--dc-muted)] line-clamp-2">
                          {data.preview.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Extracted Raw Open Graph Properties Table */}
            <Card
              title="Discovered Open Graph & Meta Tags"
              description="Complete list of <meta> tags parsed directly from the destination page's HTML <head>."
            >
              <div className="overflow-x-auto rounded-[8px] border border-[var(--dc-border)]">
                <table className="w-full text-left text-[11.5px] font-mono">
                  <thead className="bg-[var(--dc-side)] text-[10.5px] uppercase tracking-wider text-[var(--dc-faint)] border-b border-[var(--dc-border)]">
                    <tr>
                      <th className="p-2.5">Property / Tag</th>
                      <th className="p-2.5">Extracted Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--dc-border)]">
                    {Object.entries(data.rawTags).length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-4 text-center text-[var(--dc-muted)] font-sans">
                          No recognized Open Graph meta tags were found in the HTML head.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(data.rawTags).map(([tag, val]) => (
                        <tr key={tag} className="hover:bg-[var(--dc-hover)]">
                          <td className="p-2.5 font-semibold text-[var(--dc-blue)] whitespace-nowrap">
                            {tag}
                          </td>
                          <td className="p-2.5 text-[var(--dc-text-2)] break-all font-sans text-[12px]">
                            {tag.includes('image') || tag.includes('url') ? (
                              <a
                                href={val}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--dc-blue)] hover:underline inline-flex items-center gap-1 font-mono text-[11.5px]"
                              >
                                {val} <ExternalLink size={11} className="opacity-60" />
                              </a>
                            ) : (
                              val
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!data && !debugMutation.isPending && (
        <EmptyState
          icon={Share2}
          title="Ready to Debug Any URL"
          body="Enter any article, product, or web URL above to inspect its Open Graph preview card, tags, and mobile feed formatting."
          className="!py-20"
        />
      )}
    </ConsolePage>
  );
}
