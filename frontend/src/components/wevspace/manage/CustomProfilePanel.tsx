/**
 * Custom profile — host this WevSpace on GitHub Pages or any other website.
 * Wevsoft exposes a public live-content API so the hosted page stays in sync.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Copy, Download, ExternalLink, Github, Globe, KeyRound, RefreshCw } from 'lucide-react';
import { SPACE_LIVE_PUBLIC_API_PREFIX } from '@wevsoft/shared/wevspace';
import {
  fetchCustomProfile,
  rotateCustomProfileKey,
  saveCustomProfile,
  type SpaceCustomProfile,
} from '../../../lib/wevspaceApi';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Card,
  CardTitle,
  Field,
  PanelError,
  PanelHeader,
  PanelSkeleton,
  TextArea,
  TextInput,
  ToggleRow,
} from './manageUi';

const STARTER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WevSpace</title>
  <style>
    :root {
      --accent: #2563eb;
      --bg: #0b1020;
      --card: #141a2e;
      --text: #f4f6fb;
      --muted: #9aa3b8;
      --line: rgba(255,255,255,.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: radial-gradient(1200px 600px at 10% -10%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 50%), var(--bg);
      color: var(--text);
      min-height: 100vh;
    }
    .wrap { max-width: 760px; margin: 0 auto; padding: 32px 20px 80px; }
    header { display: flex; gap: 18px; align-items: flex-start; }
    .avatar {
      width: 88px; height: 88px; border-radius: 24px; object-fit: cover;
      background: var(--card); border: 1px solid var(--line); flex: none;
    }
    h1 { margin: 0 0 6px; font-size: 1.7rem; letter-spacing: -.03em; }
    .tagline { margin: 0; color: var(--muted); }
    .bio { margin: 16px 0 0; line-height: 1.55; color: #d7dceb; }
    .links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
    .links a {
      color: var(--text); text-decoration: none; background: var(--card);
      border: 1px solid var(--line); border-radius: 999px; padding: 8px 12px; font-size: 13px; font-weight: 700;
    }
    .cta {
      display: inline-block; margin-top: 16px; background: var(--accent); color: #fff;
      text-decoration: none; font-weight: 800; border-radius: 14px; padding: 10px 16px;
    }
    .posts { margin-top: 40px; }
    .posts h2 { font-size: 1rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
    article {
      background: var(--card); border: 1px solid var(--line); border-radius: 20px;
      padding: 16px 18px; margin: 12px 0;
    }
    article p { margin: 0; white-space: pre-wrap; line-height: 1.5; }
    article time { display: block; margin-top: 10px; color: var(--muted); font-size: 12px; }
    .status { color: var(--muted); padding: 40px 0; }
    .media { width: 100%; border-radius: 14px; margin-top: 12px; display: block; }
  </style>
</head>
<body>
  <div class="wrap">
    <p class="status" id="status">Loading…</p>
    <div id="profile" hidden>
      <header>
        <img class="avatar" id="avatar" alt="" />
        <div>
          <h1 id="name"></h1>
          <p class="tagline" id="tagline"></p>
          <a class="cta" id="cta" hidden></a>
        </div>
      </header>
      <p class="bio" id="bio"></p>
      <div class="links" id="links"></div>
      <section class="posts">
        <h2>Latest posts</h2>
        <div id="posts"></div>
      </section>
    </div>
  </div>
  <script>
    window.WEVSPACE = {
      handle: "HANDLE",
      apiBase: "API_BASE",
      key: "KEY"
    };
    (async function () {
      var cfg = window.WEVSPACE || {};
      var status = document.getElementById("status");
      var headers = {};
      if (cfg.key) headers["X-WevSpace-Key"] = cfg.key;
      function url(path) {
        return String(cfg.apiBase || "").replace(/\\/$/, "") + "/" + encodeURIComponent(cfg.handle) + path;
      }
      try {
        var spaceRes = await fetch(url(""), { headers: headers });
        if (!spaceRes.ok) throw new Error("Could not load this WevSpace (" + spaceRes.status + ")");
        var space = await spaceRes.json();
        document.title = space.name || cfg.handle;
        if (space.accent) document.documentElement.style.setProperty("--accent", space.accent);
        document.getElementById("name").textContent = space.name || cfg.handle;
        document.getElementById("tagline").textContent = space.tagline || ("@" + (space.handle || cfg.handle));
        document.getElementById("bio").textContent = space.bio || space.description || "";
        var avatar = document.getElementById("avatar");
        if (space.avatar) { avatar.src = space.avatar; avatar.alt = space.name || ""; }
        else { avatar.remove(); }
        var cta = document.getElementById("cta");
        if (space.ctaLabel) {
          cta.hidden = false;
          cta.textContent = space.ctaLabel;
          cta.href = space.ctaUrl || "#";
        }
        var links = document.getElementById("links");
        (space.links || []).forEach(function (link) {
          var a = document.createElement("a");
          a.href = link.url;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = link.label || link.platform || link.url;
          links.appendChild(a);
        });
        document.getElementById("profile").hidden = false;
        status.hidden = true;
        var postsRes = await fetch(url("/posts"), { headers: headers });
        var postsBody = postsRes.ok ? await postsRes.json() : { posts: [] };
        var root = document.getElementById("posts");
        var posts = postsBody.posts || [];
        if (!posts.length) {
          root.innerHTML = "<p class='status'>No posts yet.</p>";
        } else {
          posts.forEach(function (post) {
            var el = document.createElement("article");
            var p = document.createElement("p");
            p.textContent = post.content || "";
            el.appendChild(p);
            (post.postMedia || []).slice(0, 1).forEach(function (media) {
              if (media.type === "video") {
                var v = document.createElement("video");
                v.className = "media";
                v.src = media.url;
                v.controls = true;
                el.appendChild(v);
              } else if (media.url) {
                var img = document.createElement("img");
                img.className = "media";
                img.src = media.url;
                img.alt = "";
                el.appendChild(img);
              }
            });
            if (post.createdAt) {
              var time = document.createElement("time");
              time.textContent = new Date(post.createdAt).toLocaleString();
              el.appendChild(time);
            }
            root.appendChild(el);
          });
        }
      } catch (err) {
        status.textContent = err.message || "This WevSpace is not available.";
      }
    })();
  </script>
</body>
</html>
`;

function liveCollectionBase(): string {
  if (typeof window === 'undefined') return SPACE_LIVE_PUBLIC_API_PREFIX;
  return `${window.location.origin}${SPACE_LIVE_PUBLIC_API_PREFIX}`;
}

function fillStarter(handle: string, apiBase: string, key: string, requireKey: boolean): string {
  return STARTER_HTML.replaceAll('"HANDLE"', JSON.stringify(handle))
    .replaceAll('"API_BASE"', JSON.stringify(apiBase))
    .replaceAll('"KEY"', JSON.stringify(requireKey ? key : ''));
}

async function copyText(value: string, ok: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(ok);
  } catch {
    toast.error('Could not copy');
  }
}

function downloadText(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CustomProfilePanel() {
  const { spaceId, handle, accent, can } = useManage();
  const canEdit = can('settings.modify');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [profile, setProfile] = useState<SpaceCustomProfile | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [hostKind, setHostKind] = useState<SpaceCustomProfile['hostKind']>('GITHUB_PAGES');
  const [hostOrigin, setHostOrigin] = useState('');
  const [hostPath, setHostPath] = useState('');
  const [corsText, setCorsText] = useState('');
  const [requireKey, setRequireKey] = useState(false);

  const apply = useCallback((next: SpaceCustomProfile) => {
    setProfile(next);
    setEnabled(next.enabled);
    setHostKind(next.hostKind || 'GITHUB_PAGES');
    setHostOrigin(next.hostOrigin || '');
    setHostPath(next.hostPath || '');
    setCorsText((next.corsOrigins || []).join('\n'));
    setRequireKey(!!next.requirePublishableKey);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setLoading(true);
    fetchCustomProfile(spaceId)
      .then((row) => {
        if (!cancelled) apply(row);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Could not load custom profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [spaceId, apply]);

  const apiBase = liveCollectionBase();
  const liveUrl = `${apiBase}/${encodeURIComponent(handle)}`;
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- manual memoization kept as-is (existing behavior)
  const snippet = useMemo(() => {
    const keyLine = requireKey && profile?.publishableKey ? `\n  key: ${JSON.stringify(profile.publishableKey)},` : '';
    return `<!-- WevSpace live profile -->
<script>
window.WEVSPACE = {
  handle: ${JSON.stringify(handle)},
  apiBase: ${JSON.stringify(apiBase)},${keyLine}
};
</script>`;
  }, [apiBase, handle, profile?.publishableKey, requireKey]);

  const markCopied = (id: string) => {
    setCopied(id);
    window.setTimeout(() => setCopied((cur) => (cur === id ? null : cur)), 1500);
  };

  const save = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const corsOrigins = corsText
        .split(/[\n,]+/)
        .map((row) => row.trim())
        .filter(Boolean);
      const next = await saveCustomProfile(spaceId, {
        enabled,
        hostKind,
        hostOrigin: hostOrigin.trim() || null,
        hostPath: hostPath.trim() || null,
        corsOrigins,
        requirePublishableKey: requireKey,
      });
      apply(next);
      toast.success('Custom profile saved');
    } catch (err: any) {
      setError(err?.message || 'Could not save');
      toast.error(err?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const rotate = async () => {
    if (!canEdit) return;
    setRotating(true);
    try {
      const next = await rotateCustomProfileKey(spaceId);
      apply(next);
      toast.success('Publishable key rotated');
    } catch (err: any) {
      toast.error(err?.message || 'Could not rotate key');
    } finally {
      setRotating(false);
    }
  };

  if (loading) return <PanelSkeleton rows={3} tall />;
  if (error && !profile) return <PanelError message={error} />;

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Custom profile"
        blurb="Host this WevSpace on GitHub Pages or any other website. Wevsoft keeps that page in sync through a public live-content API."
        actions={
          <ActionButton tone="accent" accent={accent} busy={saving} disabled={!canEdit} onClick={save}>
            Save
          </ActionButton>
        }
      />

      <Card>
        <ToggleRow
          label="Enable custom profile"
          blurb="When on, published public content is available at the live API for your hosted page. Disabled, private or unpublished Spaces look like 404."
          checked={enabled}
          onChange={setEnabled}
          disabled={!canEdit}
          accent={accent}
        />
      </Card>

      <Card>
        <CardTitle>Host</CardTitle>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(
            [
              { id: 'GITHUB_PAGES' as const, label: 'GitHub Pages', icon: <Github size={15} /> },
              { id: 'CUSTOM_SITE' as const, label: 'Other website', icon: <Globe size={15} /> },
            ]
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={!canEdit}
              onClick={() => setHostKind(opt.id)}
              className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-extrabold border transition-colors ${
                hostKind === opt.id ? 'border-transparent text-primary-foreground' : 'border-border bg-muted'
              }`}
              style={hostKind === opt.id ? { background: accent || 'var(--color-primary)' } : undefined}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <Field
            label="Origin URL"
            hint="https origin only — no path and no trailing slash."
          >
            <TextInput
              value={hostOrigin}
              onChange={(e) => setHostOrigin(e.target.value)}
              placeholder={hostKind === 'GITHUB_PAGES' ? 'https://yourname.github.io' : 'https://mysite.com'}
              disabled={!canEdit}
            />
          </Field>
          <Field label="Optional path" hint="Use this when Pages is served from a project folder, e.g. /my-space.">
            <TextInput
              value={hostPath}
              onChange={(e) => setHostPath(e.target.value)}
              placeholder="/my-space"
              disabled={!canEdit}
            />
          </Field>
          <Field
            label="Extra CORS origins"
            hint="One https origin per line, up to 10. Your host origin is always allowed."
          >
            <TextArea
              rows={3}
              value={corsText}
              onChange={(e) => setCorsText(e.target.value)}
              placeholder="https://cdn.mysite.com"
              disabled={!canEdit}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle>Live API</CardTitle>
        <Field label="Live API URL">
          <div className="flex gap-2">
            <TextInput readOnly value={liveUrl} />
            <ActionButton
              size="sm"
              onClick={() => {
                void copyText(liveUrl, 'Live API URL copied');
                markCopied('url');
              }}
            >
              {copied === 'url' ? <Check size={14} /> : <Copy size={14} />}
              Copy
            </ActionButton>
          </div>
        </Field>
        <div className="mt-4">
          <ToggleRow
            label="Require publishable key"
            blurb="Browsers must send X-WevSpace-Key. Server-to-server callers without an Origin are still allowed if they send the key."
            checked={requireKey}
            onChange={setRequireKey}
            disabled={!canEdit}
            accent={accent}
          />
        </div>
        <Field label="Publishable key">
          <div className="flex flex-wrap gap-2">
            <TextInput readOnly value={profile?.publishableKey || ''} className="font-mono" />
            <ActionButton
              size="sm"
              onClick={() => {
                if (profile?.publishableKey) {
                  void copyText(profile.publishableKey, 'Key copied');
                  markCopied('key');
                }
              }}
            >
              {copied === 'key' ? <Check size={14} /> : <KeyRound size={14} />}
              Copy
            </ActionButton>
            <ActionButton size="sm" busy={rotating} disabled={!canEdit} onClick={() => void rotate()}>
              <RefreshCw size={14} />
              Rotate
            </ActionButton>
          </div>
        </Field>
      </Card>

      <Card>
        <CardTitle>Embed snippet</CardTitle>
        <pre className="text-[11px] font-mono whitespace-pre-wrap break-all bg-muted rounded-2xl p-3 mb-3">{snippet}</pre>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            size="sm"
            onClick={() => {
              void copyText(snippet, 'Snippet copied');
              markCopied('snippet');
            }}
          >
            {copied === 'snippet' ? <Check size={14} /> : <Copy size={14} />}
            Copy snippet
          </ActionButton>
          <ActionButton
            size="sm"
            onClick={() =>
              downloadText(
                `${handle || 'wevspace'}-profile.html`,
                fillStarter(handle, apiBase, profile?.publishableKey || '', requireKey),
              )
            }
          >
            <Download size={14} />
            Download starter index.html
          </ActionButton>
        </div>
      </Card>

      <Card>
        <CardTitle>GitHub Pages how-to</CardTitle>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
          <li>Create a new GitHub repository.</li>
          <li>Drop the starter <span className="font-bold text-foreground">index.html</span> in the repo root (download it above).</li>
          <li>Enable Pages: Settings → Pages → Deploy from a branch (usually main / root).</li>
          <li>Paste the Pages origin here, e.g. https://yourname.github.io</li>
        </ol>
        <a
          className="mt-3 inline-flex items-center gap-1 text-xs font-bold"
          href="https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site"
          target="_blank"
          rel="noreferrer"
        >
          GitHub Pages docs <ExternalLink size={12} />
        </a>
      </Card>
    </div>
  );
}
