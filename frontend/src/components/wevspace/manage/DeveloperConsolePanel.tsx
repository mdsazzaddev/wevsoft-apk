import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Check,
  Copy,
  Cpu,
  KeyRound,
  Plus,
  ShieldCheck,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { Card, CardTitle, PanelHeader, StatTile } from './manageUi';
import { useManage } from './ManageContext';
import CreateAppModal from '../../../pages/developer/CreateAppModal';
import {
  useDeveloperApps,
  useDeveloperMe,
  useSpaceInstalledApps,
  installSpaceApp,
  uninstallSpaceApp,
  issueSpaceToken,
} from '../../../pages/developer/devApi';
import { AppAvatar, Skeleton, StatusBadge } from '../../../pages/developer/devUi';

/**
 * Space-mode entry point to the Wevsoft developer platform.
 * Supports Space-owned apps, installed third-party apps, and Space Access Tokens.
 */
export default function DeveloperConsolePanel() {
  const { spaceId, isOwner, space } = useManage();
  const me = useDeveloperMe();
  const registered = Boolean(me.data?.registered);
  const apps = useDeveloperApps(registered);
  const installedQuery = useSpaceInstalledApps(spaceId);

  const [createOpen, setCreateOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);

  // Install modal state
  const [selectedAppId, setSelectedAppId] = useState('');
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  // Token modal state
  const [tokenAppId, setTokenAppId] = useState('');
  const [tokenScopes, setTokenScopes] = useState<string[]>([
    'spaces.read',
    'spaces.posts.write',
    'spaces.inbox',
    'spaces.events',
  ]);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const list = [...(apps.data || [])].sort(
    (a, b) => Number(b.wevspaceId === spaceId) - Number(a.wevspaceId === spaceId),
  );
  const linked = list.filter((a) => a.wevspaceId === spaceId).length;
  const installedList = installedQuery.data || [];
  const loading = me.isLoading || (registered && apps.isLoading) || installedQuery.isLoading;

  const blurb = 'Build OAuth apps, connect bots, and manage Space integrations on the Wevsoft platform.';
  const btn =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20';

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId || !selectedAppId) return;
    setInstalling(true);
    setInstallError(null);
    try {
      await installSpaceApp(spaceId, selectedAppId);
      await installedQuery.refetch();
      setInstallModalOpen(false);
      setSelectedAppId('');
    } catch (err: any) {
      setInstallError(err.response?.data?.message || err.message || 'Failed to install app');
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async (appId: string) => {
    if (!spaceId) return;
    if (!window.confirm('Are you sure you want to remove this app from the Space? All active Space tokens for this app will be revoked.')) {
      return;
    }
    try {
      await uninstallSpaceApp(spaceId, appId);
      await installedQuery.refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to uninstall app');
    }
  };

  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId) return;
    setGeneratingToken(true);
    setTokenError(null);
    try {
      const res = await issueSpaceToken(spaceId, {
        appId: tokenAppId || undefined,
        scopes: tokenScopes,
      });
      setGeneratedToken(res.access_token);
      await installedQuery.refetch();
    } catch (err: any) {
      setTokenError(err.response?.data?.message || err.message || 'Failed to generate token');
    } finally {
      setGeneratingToken(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Apps not yet installed
  const installedAppIds = new Set(installedList.map((i) => i.appId));
  const availableAppsToInstall = list.filter((a) => !installedAppIds.has(a.id));

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-20">
      <div className="hidden lg:block">
        <PanelHeader
          title="Developer Console & Integrations"
          blurb={blurb}
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGeneratedToken(null);
                  setTokenError(null);
                  setTokenModalOpen(true);
                }}
                className={`${btn} bg-primary text-primary-foreground hover:brightness-110`}
              >
                <KeyRound size={14} /> Space Token
              </button>
              <Link
                to="/developer"
                target="_blank"
                rel="noopener noreferrer"
                className={`${btn} border border-border hover:bg-muted`}
              >
                Open developer portal <ArrowUpRight size={14} />
              </Link>
            </div>
          }
        />
      </div>
      <p className="lg:hidden text-xs text-muted-foreground">{blurb}</p>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
      ) : !registered ? (
        <Card className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 w-56 h-56 rounded-full bg-primary/10 blur-2xl"
          />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="w-12 h-12 rounded-2xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <Terminal size={22} />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-black">Become a Wevsoft developer</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Register once to create apps, get OAuth credentials and let people or your bots interact with Wevsoft.
              </p>
            </div>
            <Link
              to="/developer"
              target="_blank"
              rel="noopener noreferrer"
              className={`${btn} bg-primary text-primary-foreground hover:brightness-110`}
            >
              Get started
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatTile
              label="Installed Apps & Bots"
              value={installedList.length}
              hint="Active on this Space"
              icon={<Bot size={16} />}
            />
            <StatTile
              label="Linked to this Space"
              value={linked}
              hint={space?.handle ? `@${space.handle}` : undefined}
              icon={<Cpu size={16} />}
            />
            <StatTile
              label="Developer Apps"
              value={list.length}
              hint="In your developer account"
              icon={<KeyRound size={16} />}
            />
          </div>

          {/* Installed Space Apps Section */}
          <Card>
            <CardTitle
              right={
                <button
                  type="button"
                  onClick={() => {
                    setInstallError(null);
                    setInstallModalOpen(true);
                  }}
                  className={`${btn} border border-border hover:bg-muted py-2`}
                >
                  <Plus size={14} /> Add App to Space
                </button>
              }
            >
              Installed Apps & Automations
            </CardTitle>

            {installedList.length ? (
              <ul className="divide-y divide-border -mx-1">
                {installedList.map((inst) => (
                  <li key={inst.id} className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-muted/40 transition">
                    <AppAvatar name={inst.app?.name || 'App'} logoUrl={inst.app?.logoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate">{inst.app?.name || 'Unnamed App'}</p>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {inst.app?.clientId}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {inst.scopes.slice(0, 4).map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                          >
                            {s}
                          </span>
                        ))}
                        {inst.scopes.length > 4 && (
                          <span className="text-[10px] text-muted-foreground">+{inst.scopes.length - 4} more</span>
                        )}
                      </div>
                    </div>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleUninstall(inst.appId)}
                        title="Uninstall App"
                        className="p-2 text-muted-foreground hover:text-destructive rounded-xl hover:bg-destructive/10 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center flex flex-col items-center">
                <span className="w-12 h-12 rounded-2xl bg-muted grid place-items-center text-muted-foreground mb-3">
                  <Bot size={22} />
                </span>
                <p className="text-sm font-bold">No apps installed in this Space yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                  Add an app or bot to automate posting, customer inbox replies, or event management for this Space.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setInstallError(null);
                    setInstallModalOpen(true);
                  }}
                  className={`${btn} bg-primary text-primary-foreground hover:brightness-110`}
                >
                  <Plus size={14} /> Add App to Space
                </button>
              </div>
            )}
          </Card>

          {/* Your Apps Card */}
          <Card>
            <CardTitle
              right={
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className={`${btn} bg-primary text-primary-foreground hover:brightness-110 py-2`}
                >
                  <Plus size={14} /> Quick create
                </button>
              }
            >
              Your developer apps
            </CardTitle>
            {list.length ? (
              <ul className="divide-y divide-border -mx-1">
                {list.slice(0, 5).map((app) => (
                  <li key={app.id}>
                    <Link
                      to={`/developer/apps/${app.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-1 py-3 rounded-xl hover:bg-muted/50 transition group"
                    >
                      <AppAvatar name={app.name} logoUrl={app.logoUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">{app.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">{app.clientId}</p>
                      </div>
                      {app.wevspaceId === spaceId && (
                        <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wide text-primary">
                          This Space
                        </span>
                      )}
                      <StatusBadge status={app.status} />
                      <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No apps yet. Create one to get a client ID and secret.
              </p>
            )}
            {list.length > 5 && (
              <Link
                to="/developer"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block text-center text-xs font-bold text-primary hover:underline"
              >
                View all {list.length} apps
              </Link>
            )}
          </Card>
        </>
      )}

      {/* Docs and Portal links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/developer/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-card border border-border rounded-3xl p-4 sm:p-5 flex items-start gap-3 hover:border-foreground/20 transition"
        >
          <span className="w-10 h-10 rounded-2xl bg-muted grid place-items-center shrink-0">
            <BookOpen size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-black">Space Developer APIs</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Read posts, post as Space, customer inbox messaging, and calendar events.
            </span>
          </span>
        </Link>
        <Link
          to="/developer"
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-card border border-border rounded-3xl p-4 sm:p-5 flex items-start gap-3 hover:border-foreground/20 transition"
        >
          <span className="w-10 h-10 rounded-2xl bg-muted grid place-items-center shrink-0">
            <Terminal size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-black">Developer portal</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Manage credentials, redirect URIs, OAuth scopes, and webhook listeners.
            </span>
          </span>
        </Link>
      </div>

      {/* Quick create modal */}
      <CreateAppModal isOpen={createOpen} onClose={() => setCreateOpen(false)} wevspaceId={isOwner ? spaceId : null} />

      {/* Add App to Space Modal */}
      {installModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setInstallModalOpen(false)}
              className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-black flex items-center gap-2">
              <Bot size={20} className="text-primary" /> Add App to Space
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-5">
              Select one of your registered developer apps to install into this Space.
            </p>

            {installError && (
              <div className="mb-4 p-3 rounded-2xl bg-destructive/10 text-destructive text-xs font-semibold">
                {installError}
              </div>
            )}

            <form onSubmit={handleInstall} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">Select App</label>
                {availableAppsToInstall.length ? (
                  <select
                    value={selectedAppId}
                    onChange={(e) => setSelectedAppId(e.target.value)}
                    required
                    className="w-full bg-muted/50 border border-border rounded-2xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Choose an app...</option>
                    {availableAppsToInstall.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.name} ({app.clientId})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-muted-foreground p-3 bg-muted rounded-2xl">
                    All your developer apps are already installed, or you have not created any yet.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setInstallModalOpen(false)}
                  className={`${btn} border border-border hover:bg-muted`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedAppId || installing}
                  className={`${btn} bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50`}
                >
                  {installing ? 'Installing...' : 'Install App'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Space Access Token Modal */}
      {tokenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setTokenModalOpen(false)}
              className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-black flex items-center gap-2">
              <KeyRound size={20} className="text-primary" /> Generate Space Access Token
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-5">
              Issue a long-lived Bearer token scoped specifically to this Space for bot automation and headless APIs.
            </p>

            {tokenError && (
              <div className="mb-4 p-3 rounded-2xl bg-destructive/10 text-destructive text-xs font-semibold">
                {tokenError}
              </div>
            )}

            {generatedToken ? (
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-xs text-primary font-bold flex items-center gap-2">
                  <ShieldCheck size={16} /> Token generated successfully! Copy it now as it won't be displayed again.
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Space Bearer Token</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedToken}
                      className="flex-1 bg-muted font-mono text-xs p-3 rounded-2xl border border-border select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(generatedToken)}
                      className={`${btn} bg-primary text-primary-foreground hover:brightness-110 shrink-0`}
                    >
                      {copiedToken ? <Check size={14} /> : <Copy size={14} />} {copiedToken ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="bg-muted p-3 rounded-2xl text-[11px] font-mono text-muted-foreground break-all">
                  curl -H "Authorization: Bearer {generatedToken.slice(0, 16)}..." https://api.wevsoft.com/api/developer/spaces/{spaceId}/posts
                </div>

                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setTokenModalOpen(false)}
                    className={`${btn} bg-primary text-primary-foreground`}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateToken} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Bound App (optional)</label>
                  <select
                    value={tokenAppId}
                    onChange={(e) => setTokenAppId(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-2xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Default (or choose app)</option>
                    {list.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.name} ({app.clientId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Granted Scopes</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'spaces.read', label: 'spaces.read (Details, Content, Calendar)' },
                      { id: 'spaces.posts.write', label: 'spaces.posts.write (Publish Space Posts)' },
                      { id: 'spaces.inbox', label: 'spaces.inbox (Customer Inbox & Replies)' },
                      { id: 'spaces.events', label: 'spaces.events (Manage Space Events)' },
                      { id: 'spaces.manage', label: 'spaces.manage (App installs & settings)' },
                    ].map((s) => (
                      <label key={s.id} className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tokenScopes.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTokenScopes([...tokenScopes, s.id]);
                            } else {
                              setTokenScopes(tokenScopes.filter((x) => x !== s.id));
                            }
                          }}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="font-mono text-[11px] truncate">{s.id}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setTokenModalOpen(false)}
                    className={`${btn} border border-border hover:bg-muted`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generatingToken || tokenScopes.length === 0}
                    className={`${btn} bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50`}
                  >
                    {generatingToken ? 'Generating...' : 'Generate Token'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
