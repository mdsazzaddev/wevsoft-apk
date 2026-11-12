import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store';
import AIPostPanel from '../components/social/AIPostPanel';
import { PostSettings } from '../components/social/PostSettings';
import AudienceSelectorModal from '../components/social/AudienceSelectorModal';
import { uploadWithProgress } from '../components/UploadProgressToast';
import {
  appendPublishSettings,
  DEFAULT_PUBLISH_SETTINGS,
  type CreatorPublishSettings,
} from '../lib/creatorPublish';
import {
  DEFAULT_VISIBILITY_FLAGS,
  audienceSummaryLabel,
  privacyFromFlags,
  type AudienceUser,
  type VisibilityFlags,
} from '../lib/postVisibility';
import {
  Sparkles, Send, Clock, CheckCircle, XCircle, FileText,
  ChevronDown, ChevronUp, Loader2, Trash2, Copy, Check,
  MessageSquare, TrendingUp, Users, Zap, Globe, Lock, ImagePlus, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface Draft {
  id: string;
  prompt: string;
  style: string;
  postType: string;
  language: string;
  generatedContent: string;
  status: 'draft' | 'used' | 'discarded';
  createdAt: string;
  model?: string;
  provider?: string;
}

interface CoachResult {
  score: number;
  strengths: string[];
  improvements: string[];
  viralScore: number;
  engagementTips: string[];
}

export default function AiPostCreatorPage() {
  const token = useStore((s) => s.token);

  const [step, setStep] = useState<'editor' | 'settings'>('editor');
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [posting, setPosting] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const [files, setFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [visibilityFlags, setVisibilityFlags] = useState<VisibilityFlags>(DEFAULT_VISIBILITY_FLAGS);
  const [customUsers, setCustomUsers] = useState<AudienceUser[]>([]);
  const [privacy, setPrivacy] = useState('private');
  const [showAudienceModal, setShowAudienceModal] = useState(false);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);

  const [coachResult, setCoachResult] = useState<CoachResult | null>(null);
  const [coaching, setCoaching] = useState(false);

  const [copiedHash, setCopiedHash] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setCharCount(content.length);
  }, [content]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setFilePreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const loadDrafts = useCallback(async () => {
    setLoadingDrafts(true);
    try {
      const res = await fetch('/api/ai/post-drafts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDrafts((data.drafts as Draft[]) || []);
    } catch {
      toast.error('Failed to load drafts');
    } finally {
      setLoadingDrafts(false);
    }
  }, [token]);

  const updateDraftStatus = async (id: string, status: 'used' | 'discarded') => {
    await fetch(`/api/ai/post-drafts/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
  };

  const applyDraft = (draft: Draft) => {
    try {
      const parsed = JSON.parse(draft.generatedContent);
      setContent(parsed.content || parsed.caption || '');
    } catch {
      setContent(draft.generatedContent);
    }
    updateDraftStatus(draft.id, 'used');
    toast.success('Draft applied!');
  };

  const runPostCoach = async () => {
    if (!content.trim()) {
      toast.error('Write some content first');
      return;
    }
    setCoaching(true);
    setCoachResult(null);
    try {
      const res = await fetch('/api/ai/post-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, hashtags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Coach failed');
      setCoachResult(data);
    } catch (err: any) {
      toast.error(err.message || 'Post coach failed');
    } finally {
      setCoaching(false);
    }
  };

  const resetComposer = () => {
    setContent('');
    setHashtags([]);
    setFiles([]);
    setCoachResult(null);
    setVisibilityFlags(DEFAULT_VISIBILITY_FLAGS);
    setCustomUsers([]);
    setPrivacy('private');
    setStep('editor');
  };

  const handleFinalSubmitPost = async (settings: {
    location?: string;
    isCommentEnabled: boolean;
    scheduledAt?: string | null;
    hashtags: string[];
    privacy: string;
    visibilityFlags?: VisibilityFlags;
    customUserIds?: string[];
    publishSettings?: CreatorPublishSettings;
  }) => {
    if (!content.trim() && files.length === 0) {
      toast.error('Write something or add media before posting');
      return;
    }
    setPosting(true);

    try {
      const formData = new FormData();
      let finalContent = content;

      const allTags = Array.from(new Set([...hashtags, ...settings.hashtags]));
      if (allTags.length > 0 && !content.includes('#')) {
        finalContent = content + '\n\n' + allTags.join(' ');
      }

      const flags = settings.visibilityFlags || visibilityFlags;
      const customIds = settings.customUserIds || customUsers.map((u) => u.id);
      const effectivePrivacy = privacyFromFlags(flags, customIds.length > 0);

      formData.append('content', finalContent);
      formData.append(
        'type',
        files.some((f) => f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(f.name))
          ? 'video'
          : files.length > 0
            ? 'photo'
            : 'text',
      );
      formData.append('privacy', effectivePrivacy);
      formData.append('visibilityFlags', JSON.stringify(flags));
      formData.append('customUserIds', JSON.stringify(customIds));
      formData.append('templateType', 'grid');

      if (settings.location) formData.append('location', settings.location);
      formData.append('commentsDisabled', (!settings.isCommentEnabled).toString());

      if (settings.scheduledAt) {
        formData.append('scheduledFor', settings.scheduledAt);
        formData.append('status', 'scheduled');
      } else {
        formData.append('status', 'published');
      }

      const publish = {
        ...(settings.publishSettings || DEFAULT_PUBLISH_SETTINGS),
        visibilityType: (
          ['public', 'followers', 'private', 'unlisted', 'friends', 'custom'].includes(effectivePrivacy)
            ? effectivePrivacy
            : 'private'
        ) as CreatorPublishSettings['visibilityType'],
        enableComments: settings.isCommentEnabled,
        location: settings.publishSettings?.location || settings.location || '',
        hashtags: settings.publishSettings?.hashtags || allTags.join(' '),
        scheduledPublishAt: settings.scheduledAt || settings.publishSettings?.scheduledPublishAt || '',
        contentDisclosureType: (settings.publishSettings?.contentDisclosureType || 'ai_assisted') as CreatorPublishSettings['contentDisclosureType'],
        isAiAssisted: true,
      };
      appendPublishSettings(formData, publish);

      files.forEach((f) => formData.append('media', f));

      const hasMedia = files.length > 0;
      const res = hasMedia
        ? await uploadWithProgress(
            '/api/posts',
            formData,
            token,
            `ai-post-${Date.now()}`,
            files.some((f) => f.type.startsWith('video/')) ? 'Uploading video post' : 'Uploading post',
          )
        : await fetch('/api/posts', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });

      if (res.ok) {
        resetComposer();
        toast.success(settings.scheduledAt ? 'Post scheduled successfully!' : 'Post published successfully!');
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || errorData.details || errorData.message || 'Failed to publish post');
      }
    } catch (err: any) {
      toast.error(err?.message || 'An error occurred while publishing');
    } finally {
      setPosting(false);
    }
  };

  const goToSettings = () => {
    if (!content.trim() && files.length === 0) {
      toast.error('Write something or add media first');
      return;
    }
    if (charCount > 2000) {
      toast.error('Content is too long (max 2000 characters)');
      return;
    }
    setStep('settings');
  };

  const removeHashtag = (i: number) => setHashtags((h) => h.filter((_, idx) => idx !== i));

  const copyHashtag = async (tag: string, i: number) => {
    await navigator.clipboard.writeText(tag);
    setCopiedHash(i);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">AI Post Creator</h1>
            <p className="text-xs text-muted-foreground">Generate, refine and publish AI-powered posts</p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowDrafts(!showDrafts);
            if (!showDrafts) loadDrafts();
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm font-medium text-muted-foreground transition-colors"
        >
          <Clock size={15} />
          Drafts
          {showDrafts ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          {step === 'settings' ? (
            <div className="bg-card border border-border rounded-2xl overflow-hidden min-h-[24rem] max-h-[min(70vh,40rem)] flex flex-col">
              <PostSettings
                onBackStep={() => setStep('editor')}
                onSubmitPost={handleFinalSubmitPost}
                submitting={posting}
                visibilityFlags={visibilityFlags}
                customUserIds={customUsers.map((u) => u.id)}
                privacy={privacy}
              />
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Post Content</label>
                <button
                  type="button"
                  onClick={() => setShowAudienceModal(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/60 hover:bg-muted px-2.5 py-1 rounded-full border border-border/50 transition-colors"
                >
                  {visibilityFlags.public ? (
                    <Globe size={12} className="text-primary" />
                  ) : visibilityFlags.friends || visibilityFlags.followers || visibilityFlags.custom ? (
                    <Users size={12} className="text-emerald-400" />
                  ) : (
                    <Lock size={12} className="text-amber-400" />
                  )}
                  <span className="max-w-[160px] truncate">
                    {audienceSummaryLabel(visibilityFlags, customUsers.length)}
                  </span>
                  <ChevronDown size={10} />
                </button>
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind? Or let AI generate it for you..."
                rows={9}
                className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm resize-none outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-muted-foreground/50 leading-relaxed"
              />

              {filePreviewUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filePreviewUrls.map((url, i) => (
                    <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border bg-muted">
                      {files[i]?.type.startsWith('video/') ? (
                        <video src={url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className={charCount > 2000 ? 'text-red-500 font-semibold' : ''}>{charCount} chars</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <ImagePlus size={12} /> Media
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const picked = Array.from(e.target.files || []);
                      if (picked.length) setFiles((prev) => [...prev, ...picked]);
                      e.target.value = '';
                    }}
                  />
                  {(charCount > 0 || files.length > 0) && (
                    <button
                      onClick={resetComposer}
                      className="hover:text-red-500 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Clear
                    </button>
                  )}
                </div>
              </div>

              {hashtags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Hashtags</p>
                  <div className="flex flex-wrap gap-2">
                    {hashtags.map((tag, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 px-2.5 py-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-full text-xs font-medium"
                      >
                        {tag}
                        <button onClick={() => copyHashtag(tag, i)} className="ml-1 hover:text-violet-800 transition-colors">
                          {copiedHash === i ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                        </button>
                        <button onClick={() => removeHashtag(i)} className="hover:text-red-500 transition-colors">
                          <XCircle size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={runPostCoach}
                  disabled={coaching || !content.trim()}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted text-xs font-semibold text-muted-foreground transition-colors disabled:opacity-40"
                >
                  {coaching ? <Loader2 size={13} className="animate-spin" /> : <TrendingUp size={13} />}
                  Analyze Post
                </button>
                <button
                  onClick={goToSettings}
                  disabled={(!content.trim() && files.length === 0) || charCount > 2000}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 text-sm shadow-lg shadow-violet-500/20"
                >
                  <Send size={15} />
                  Continue to Settings
                </button>
              </div>
            </div>
          )}

          <AnimatePresence>
            {coachResult && step === 'editor' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-card border border-border rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Zap size={15} className="text-yellow-500" /> Post Coach Analysis
                  </p>
                  <button onClick={() => setCoachResult(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <XCircle size={15} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <ScoreRing label="Quality" score={coachResult.score} color="violet" />
                  <ScoreRing label="Viral" score={coachResult.viralScore} color="fuchsia" />
                </div>

                {coachResult.strengths?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                      <CheckCircle size={12} /> Strengths
                    </p>
                    <ul className="space-y-1">
                      {coachResult.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-green-500 mt-0.5">•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {coachResult.improvements?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                      <TrendingUp size={12} /> Improvements
                    </p>
                    <ul className="space-y-1">
                      {coachResult.improvements.map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-amber-500 mt-0.5">•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {coachResult.engagementTips?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
                      <Users size={12} /> Engagement Tips
                    </p>
                    <ul className="space-y-1">
                      {coachResult.engagementTips.map((t, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-blue-500 mt-0.5">•</span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <AIPostPanel
            onApplyContent={(c) => setContent(c)}
            onApplyHashtags={(tags) => setHashtags(tags)}
            currentContent={content}
            onClose={() => setShowAiPanel(false)}
          />
          {!showAiPanel && (
            <button
              onClick={() => setShowAiPanel(true)}
              className="w-full mt-3 py-3 border-2 border-dashed border-violet-500/30 rounded-2xl text-sm font-semibold text-violet-600 dark:text-violet-400 hover:border-violet-500/60 hover:bg-violet-500/5 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={16} /> Open AI Studio
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showDrafts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileText size={15} /> Saved Drafts
                </p>
                <button
                  onClick={loadDrafts}
                  disabled={loadingDrafts}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <Loader2 size={12} className={loadingDrafts ? 'animate-spin' : 'hidden'} />
                  Refresh
                </button>
              </div>
              {loadingDrafts ? (
                <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Loading drafts…</div>
              ) : drafts.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No drafts yet</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {drafts.map((draft) => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      onApply={() => applyDraft(draft)}
                      onDiscard={() => updateDraftStatus(draft.id, 'discarded')}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AudienceSelectorModal
        open={showAudienceModal}
        onClose={() => setShowAudienceModal(false)}
        initialFlags={visibilityFlags}
        initialCustomUsers={customUsers}
        onSave={({ flags, customUsers: users, hideFromUsers: _hidden }) => {
          setVisibilityFlags(flags);
          setCustomUsers(users);
          setPrivacy(privacyFromFlags(flags, users.length > 0));
          setShowAudienceModal(false);
        }}
      />
    </div>
  );
}

function ScoreRing({ label, score, color }: { label: string; score: number; color: 'violet' | 'fuchsia' }) {
  const pct = Math.max(0, Math.min(100, Number(score) || 0));
  const ring =
    color === 'violet'
      ? 'from-violet-500 to-violet-700'
      : 'from-fuchsia-500 to-fuchsia-700';
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${ring} text-white text-xs font-black flex items-center justify-center`}>
        {pct}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
        <p className="text-sm font-semibold text-foreground">{pct}/100</p>
      </div>
    </div>
  );
}

function DraftCard({
  draft,
  onApply,
  onDiscard,
}: {
  draft: Draft;
  onApply: () => void;
  onDiscard: () => void;
}) {
  let preview = draft.generatedContent;
  try {
    const parsed = JSON.parse(draft.generatedContent);
    preview = parsed.content || parsed.caption || draft.generatedContent;
  } catch {
    /* plain text */
  }

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <MessageSquare size={10} />
          {draft.postType || 'post'}
        </span>
        <span className="text-[10px] text-muted-foreground">{new Date(draft.createdAt).toLocaleDateString()}</span>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-1 font-medium">{draft.prompt || draft.style}</p>
      <p className="text-xs text-foreground line-clamp-3 leading-relaxed">{preview}</p>

      {draft.status === 'draft' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={onApply}
            className="flex-1 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-colors"
          >
            Use Draft
          </button>
          <button
            onClick={onDiscard}
            className="px-3 py-1.5 border border-border hover:bg-red-500/10 hover:border-red-500/30 rounded-lg text-xs text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
