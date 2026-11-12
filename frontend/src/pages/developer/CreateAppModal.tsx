import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ArrowRight, Bot, Boxes, Briefcase, Building2, CalendarCheck, Check,
  CheckCircle2, Copy, Cpu, FileText, Gamepad2, GraduationCap, Info, KeyRound,
  Layers, Loader2, Lock, Mail, MessageSquare, Share2, Shield, ShieldCheck,
  ShoppingBag, Sparkles, User, Users, Wrench, X
} from 'lucide-react';
import api from '../../lib/api';
import { useStore } from '../../store';
import { APP_CATEGORIES, DEV_KEYS, type DeveloperApp } from './devApi';
import { IconClose, Modal, btnPrimary, btnSecondary, cx, inputCls } from './devUi';

interface CreateAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  wevspaceId?: string | null;
}

interface UseCaseOption {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  scopes: string[];
  recommended?: boolean;
}

const USE_CASES: UseCaseOption[] = [
  {
    id: 'login',
    title: 'Wevsoft Sign-In & Identity (OIDC)',
    description: 'Allow users to sign in with their Wevsoft account, access basic profile information, and verify OpenID Connect identity tokens.',
    icon: User,
    scopes: ['profile', 'email', 'openid'],
    recommended: true,
  },
  {
    id: 'messaging',
    title: 'WevChat Bot & Messaging',
    description: 'Build interactive chatbots, send direct messages, list conversations, handle Space inbox inquiries, and receive message webhooks.',
    icon: MessageSquare,
    scopes: ['messages.read', 'messages.write', 'conversations.read', 'spaces.inbox'],
  },
  {
    id: 'publishing',
    title: 'Content Publishing & Feeds',
    description: 'Publish multimedia posts, short-form reels, and 24-hour stories to personal profiles and WevSpaces.',
    icon: Share2,
    scopes: ['posts.read', 'posts.write', 'stories.write', 'reels.write'],
  },
  {
    id: 'webhooks',
    title: 'Webhooks & Event Streams',
    description: 'Listen to real-time events for post comments, order updates, messaging activities, and member interactions.',
    icon: Layers,
    scopes: ['events.subscribe'],
  },
  {
    id: 'commerce',
    title: 'Commerce & In-App Checkout',
    description: 'Create checkout orders, manage marketplace product listings, and monetize app subscriptions and digital goods.',
    icon: ShoppingBag,
    scopes: ['marketplace.read', 'marketplace.write'],
  },
  {
    id: 'ai',
    title: 'AI Gateway & LLM Orchestration',
    description: 'Access AI vector embeddings, multilingual content translation, and automated policy moderation filters.',
    icon: Cpu,
    scopes: ['ai.embeddings', 'ai.moderation', 'ai.translate'],
  },
];

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  social: Users,
  games: Gamepad2,
  productivity: CalendarCheck,
  business: Briefcase,
  education: GraduationCap,
  utilities: Wrench,
  other: Boxes,
};

export default function CreateAppModal({ isOpen, onClose, wevspaceId }: CreateAppModalProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.user);

  // 5 Step State (1: Details, 2: Use Cases, 3: Workspace, 4: Permissions, 5: Review & Agreement, 6: Success)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [category, setCategory] = useState('social');
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>(['login']);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(wevspaceId || '');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [createdData, setCreatedData] = useState<(DeveloperApp & { clientSecretRaw: string }) | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Fetch caller's spaces for portfolio linking in Step 3
  const spacesQuery = useQuery({
    queryKey: ['developerConsole', 'spacesForApp'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/developer/spaces');
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
    enabled: isOpen,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setStep(1);
      setName('');
      setContactEmail(currentUser?.email || '');
      setCategory('social');
      setSelectedUseCases(['login']);
      setSelectedSpaceId(wevspaceId || '');
      setAgreedTerms(false);
      setCreatedData(null);
      setCopiedSecret(false);
    }
  }, [isOpen, wevspaceId, currentUser?.email]);

  // Aggregate required scopes from selected use cases
  const aggregatedScopes = useMemo(() => {
    const set = new Set<string>(['profile']);
    selectedUseCases.forEach((ucId) => {
      const uc = USE_CASES.find((u) => u.id === ucId);
      uc?.scopes.forEach((s) => set.add(s));
    });
    return Array.from(set);
  }, [selectedUseCases]);

  const toggleUseCase = (id: string) => {
    if (selectedUseCases.includes(id)) {
      if (selectedUseCases.length === 1) {
        toast.error('Select at least one capability for your app');
        return;
      }
      setSelectedUseCases(selectedUseCases.filter((x) => x !== id));
    } else {
      setSelectedUseCases([...selectedUseCases, id]);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      // 1. Create App
      const res = await api.post('/api/developer/apps', {
        name: name.trim(),
        category,
        wevspaceId: selectedSpaceId || undefined,
      });
      const created = res.data as DeveloperApp & { clientSecretRaw: string };

      // 2. Set initial requested scopes based on use-case wizard
      if (created?.id && aggregatedScopes.length > 0) {
        try {
          await api.put(`/api/developer/apps/${created.id}`, {
            requestedScopes: aggregatedScopes,
          });
        } catch {
          /* Fallback non-blocking */
        }
      }

      return created;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.apps });
      queryClient.invalidateQueries({ queryKey: DEV_KEYS.me });
      toast.success(`${data.name} created successfully!`);
      setCreatedData(data);
      setStep(6);
    },
    onError: (err: any) => toast.error(err?.message || 'Could not create the app'),
  });

  const trimmedName = name.trim();
  const trimmedEmail = contactEmail.trim();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

  const canProceedStep1 = Boolean(trimmedName && trimmedName.length <= 80 && isValidEmail);
  const canProceedStep2 = selectedUseCases.length > 0;
  const canProceedStep5 = agreedTerms && !createMutation.isPending;

  const finish = () => {
    onClose();
    if (createdData) {
      navigate(`/developer/apps/${createdData.id}/credentials`, { state: { newSecret: createdData.clientSecretRaw } });
    }
  };

  const copySecret = () => {
    if (createdData?.clientSecretRaw) {
      navigator.clipboard.writeText(createdData.clientSecretRaw);
      setCopiedSecret(true);
      toast.success('Client Secret copied to clipboard');
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={createMutation.isPending || step === 6 ? () => {} : onClose}
      labelledBy="create-app-title"
      className="sm:max-w-2xl"
    >
      <div className="relative overflow-hidden">
        {/* Background Accents */}
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl opacity-50" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 px-6 sm:px-8 pt-7 relative z-10 border-b border-border/40 pb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                {step === 6 ? 'Complete' : `Step ${step} of 5`}
              </span>
              <span className="text-xs text-muted-foreground">Meta App Creation Architecture</span>
            </div>
            <h2 id="create-app-title" className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
              {step === 1 && 'App Details & Category'}
              {step === 2 && 'Select Use Cases & Capabilities'}
              {step === 3 && 'Portfolio & Workspace Linking'}
              {step === 4 && 'Permissions & Review Requirements'}
              {step === 5 && 'Review & Agreement'}
              {step === 6 && 'App Provisioned Successfully!'}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {step === 1 && 'Provide primary contact information and choose your app category.'}
              {step === 2 && 'Choose the platforms, features, and capabilities your application will integrate.'}
              {step === 3 && 'Connect this application to an owned WevSpace or keep it personal.'}
              {step === 4 && 'Review automatically calculated scopes and access levels required.'}
              {step === 5 && 'Verify your configuration and accept the developer platform terms.'}
              {step === 6 && 'Your application credentials are generated and ready for use.'}
            </p>
          </div>
          {step !== 6 && <IconClose onClick={onClose} />}
        </div>

        {/* Progress Tracker Bar */}
        {step !== 6 && (
          <div className="px-6 sm:px-8 pt-4 pb-2 relative z-10">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={cx(
                    'flex-1 h-1.5 rounded-full transition-all duration-300',
                    step >= s ? 'bg-primary' : 'bg-muted',
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 sm:p-8 relative z-10 max-h-[70vh] overflow-y-auto">
          {/* STEP 1: APP DETAILS */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="app-name" className="block text-sm font-semibold text-foreground">
                    Application Name <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground font-mono">{name.length}/80</span>
                </div>
                <input
                  id="app-name"
                  type="text"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cx(inputCls, 'h-11 text-base px-3.5 rounded-xl bg-muted/30 focus:bg-background')}
                  placeholder="e.g. Acme Marketing Suite"
                />
                <p className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                  Shown to users on OAuth consent screens and audit logs.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="app-email" className="block text-sm font-semibold text-foreground">
                  App Contact Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="app-email"
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className={cx(inputCls, 'h-11 text-sm pl-10 pr-3.5 rounded-xl bg-muted/30 focus:bg-background')}
                    placeholder="developer@example.com"
                  />
                </div>
                <p className="text-[12px] text-muted-foreground">
                  Used for urgent policy notifications, security alerts, and review communications.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <label className="block text-sm font-semibold text-foreground">App Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {APP_CATEGORIES.map((c) => {
                    const Icon = CATEGORY_ICONS[c.value] || Boxes;
                    const active = category === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCategory(c.value)}
                        className={cx(
                          'flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all',
                          active
                            ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                            : 'border-border/70 hover:border-primary/40 bg-muted/20 text-muted-foreground',
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-xs truncate">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/50">
                <button
                  type="button"
                  disabled={!canProceedStep1}
                  onClick={() => setStep(2)}
                  className={cx(btnPrimary, 'px-6 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-primary/20')}
                >
                  Continue to Use Cases <ArrowRight className="w-4 h-4 ml-1.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: USE CASES SELECTION */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <p className="text-xs text-muted-foreground">
                Select what your app intends to build. WevSoft will automatically provision appropriate endpoints, webhook topics, and permission scopes.
              </p>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {USE_CASES.map((uc) => {
                  const active = selectedUseCases.includes(uc.id);
                  const Icon = uc.icon;
                  return (
                    <div
                      key={uc.id}
                      onClick={() => toggleUseCase(uc.id)}
                      className={cx(
                        'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                        active
                          ? 'border-primary bg-primary/5 text-foreground shadow-xs'
                          : 'border-border hover:border-border/80 bg-muted/10 text-muted-foreground',
                      )}
                    >
                      <div className={cx('p-2 rounded-lg shrink-0', active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-[13px] font-semibold text-foreground truncate">{uc.title}</h4>
                          <input
                            type="checkbox"
                            checked={active}
                            readOnly
                            className="rounded border-border text-primary focus:ring-0 shrink-0"
                          />
                        </div>
                        <p className="text-[11.5px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                          {uc.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <button type="button" onClick={() => setStep(1)} className={cx(btnSecondary, 'px-4 py-2.5 rounded-xl')}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </button>
                <button
                  type="button"
                  disabled={!canProceedStep2}
                  onClick={() => setStep(3)}
                  className={cx(btnPrimary, 'px-6 py-2.5 rounded-xl shadow-md shadow-primary/20')}
                >
                  Continue to Workspace <ArrowRight className="w-4 h-4 ml-1.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: WORKSPACE & PORTFOLIO */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">App Ownership & Workspace Binding</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label
                    onClick={() => setSelectedSpaceId('')}
                    className={cx(
                      'flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all',
                      !selectedSpaceId ? 'border-primary bg-primary/5 shadow-xs' : 'border-border hover:border-border/80 bg-muted/10',
                    )}
                  >
                    <input
                      type="radio"
                      name="app-owner"
                      checked={!selectedSpaceId}
                      onChange={() => setSelectedSpaceId('')}
                      className="mt-1 text-primary focus:ring-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-sm text-foreground">
                        <User className="w-4 h-4 text-primary" /> Personal Developer App
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Owned exclusively by your personal developer account ({currentUser?.email || 'You'}).
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => {
                      const firstSpace = (spacesQuery.data || [])[0]?.id;
                      if (firstSpace) setSelectedSpaceId(firstSpace);
                    }}
                    className={cx(
                      'flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all',
                      selectedSpaceId ? 'border-primary bg-primary/5 shadow-xs' : 'border-border hover:border-border/80 bg-muted/10',
                    )}
                  >
                    <input
                      type="radio"
                      name="app-owner"
                      checked={Boolean(selectedSpaceId)}
                      onChange={() => {
                        const firstSpace = (spacesQuery.data || [])[0]?.id;
                        if (firstSpace) setSelectedSpaceId(firstSpace);
                      }}
                      className="mt-1 text-primary focus:ring-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-sm text-foreground">
                        <Building2 className="w-4 h-4 text-primary" /> WevSpace / Business Portfolio
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Linked to a WevSpace you own. Shares administrative access with Space admins.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {Boolean(selectedSpaceId) && (
                <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2 animate-in fade-in duration-150">
                  <label htmlFor="space-selector" className="block text-xs font-semibold text-foreground">
                    Select WevSpace to Link:
                  </label>
                  {(spacesQuery.data || []).length === 0 ? (
                    <p className="text-xs text-amber-500">
                      You do not currently own any WevSpaces. You can proceed with a Personal Developer App or create a Space first.
                    </p>
                  ) : (
                    <select
                      id="space-selector"
                      value={selectedSpaceId}
                      onChange={(e) => setSelectedSpaceId(e.target.value)}
                      className={cx(inputCls, 'h-10 text-sm bg-background')}
                    >
                      {(spacesQuery.data || []).map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (@{s.slug || s.id})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <button type="button" onClick={() => setStep(2)} className={cx(btnSecondary, 'px-4 py-2.5 rounded-xl')}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className={cx(btnPrimary, 'px-6 py-2.5 rounded-xl shadow-md shadow-primary/20')}
                >
                  Continue to Permissions <ArrowRight className="w-4 h-4 ml-1.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PERMISSIONS & REVIEW REQUIREMENTS */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4" /> Auto-Provisioned Permissions
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Based on your selected use cases, your app will be initialized with the following OAuth scopes:
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {aggregatedScopes.map((sc) => (
                    <span
                      key={sc}
                      className="px-2.5 py-1 rounded-md bg-muted border border-border text-[11.5px] font-mono text-foreground font-medium"
                    >
                      {sc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Meta Access Level Architecture explanation */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/10 space-y-2 text-xs">
                <h5 className="font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary" /> Access Level Information
                </h5>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li>
                    <strong className="text-foreground">Standard Access:</strong> Immediately available for your account, administrators, and designated Test Users in Development mode.
                  </li>
                  <li>
                    <strong className="text-foreground">Advanced Access:</strong> Required before non-admin production users can authorize sensitive scopes. You can request App Review in the Permissions tab once ready.
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <button type="button" onClick={() => setStep(3)} className={cx(btnSecondary, 'px-4 py-2.5 rounded-xl')}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className={cx(btnPrimary, 'px-6 py-2.5 rounded-xl shadow-md shadow-primary/20')}
                >
                  Continue to Agreement <ArrowRight className="w-4 h-4 ml-1.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & AGREEMENT */}
          {step === 5 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Application Summary
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block">App Name:</span>
                    <strong className="text-foreground text-sm">{trimmedName}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Category:</span>
                    <strong className="text-foreground text-sm capitalize">{category}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Contact Email:</span>
                    <span className="text-foreground font-mono">{trimmedEmail}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Ownership:</span>
                    <span className="text-foreground font-medium">
                      {selectedSpaceId ? 'Linked to WevSpace' : 'Personal Developer Account'}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-border/60">
                  <span className="text-muted-foreground text-xs block mb-1">Configured Capabilities:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedUseCases.map((ucId) => {
                      const uc = USE_CASES.find((u) => u.id === ucId);
                      return (
                        <span key={ucId} className="px-2 py-0.5 rounded bg-background border border-border text-[11px] text-foreground">
                          {uc?.title}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Developer Agreement Checkbox */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-border text-primary focus:ring-0"
                />
                <div className="min-w-0 text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground block mb-0.5">Wevsoft Developer Platform Agreement</span>
                  By checking this box, I confirm that this application complies with the Wevsoft Platform Terms of Service, User Privacy Policy, Data Handling Standards, and Anti-Abuse Rules.
                </div>
              </label>

              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className={cx(btnSecondary, 'px-4 py-2.5 rounded-xl')}
                  disabled={createMutation.isPending}
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </button>
                <button
                  type="button"
                  disabled={!canProceedStep5}
                  onClick={() => createMutation.mutate()}
                  className={cx(btnPrimary, 'px-6 py-2.5 rounded-xl shadow-lg shadow-primary/25')}
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                  Create Application
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: CELEBRATION & SECRETS */}
          {step === 6 && createdData && (
            <div className="space-y-6 text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Application Created Successfully!</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mt-1">
                  <strong className="text-foreground">{createdData.name}</strong> has been provisioned with your requested capabilities and credentials.
                </p>
              </div>

              {/* Credentials Box */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 text-left space-y-3 max-w-lg mx-auto">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Client ID</span>
                  <div className="p-2 rounded-lg bg-background border border-border font-mono text-xs text-foreground select-all">
                    {createdData.clientId}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-500 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5" /> Client Secret (One-Time Copy)
                    </span>
                    <button
                      type="button"
                      onClick={copySecret}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      {copiedSecret ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSecret ? 'Copied!' : 'Copy Secret'}
                    </button>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-amber-500/30 font-mono text-xs text-foreground break-all select-all">
                    {createdData.clientSecretRaw}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Store this secret securely. For security, it cannot be displayed again.
                  </p>
                </div>
              </div>

              <div className="pt-2 max-w-lg mx-auto">
                <button
                  type="button"
                  onClick={finish}
                  className={cx(btnPrimary, 'w-full py-3 rounded-xl text-sm font-semibold shadow-lg shadow-primary/25')}
                >
                  Go to App Dashboard & Credentials <ArrowRight className="w-4 h-4 ml-1.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

