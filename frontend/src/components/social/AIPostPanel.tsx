import React, { useState, useCallback } from 'react';
import { useStore } from '../../store';
import {
  Sparkles, Wand2, Languages, AlignLeft, Zap, Image as ImageIcon,
  ChevronDown, ChevronUp, Copy, Check, RefreshCw, Loader2,
  Hash, Smile, MessageSquare, Target, Lightbulb, BookOpen,
  TrendingUp, Briefcase, Megaphone, Heart, Globe, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { stripAiReasoning, stripAiReasoningDeep, normalizeAiPostPayload, unwrapAiContentText } from '@wevsoft/shared/ai-text';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIGeneratedPost {
  title: string;
  content: string;
  caption: string;
  hashtags: string[];
  keywords: string[];
  emojis: string[];
  cta: string;
  relatedTopics: string[];
  suggestedAudience: string;
  draftId?: string;
  model?: string;
  provider?: string;
}

interface AIPostPanelProps {
  onApplyContent: (content: string) => void;
  onApplyHashtags?: (hashtags: string[]) => void;
  currentContent?: string;
  onClose: () => void;
  variant?: 'card' | 'drawer';
}

// ─── Style & Language Options ──────────────────────────────────────────────

const STYLES = [
  { id: 'casual', label: 'Casual', icon: '💬' },
  { id: 'professional', label: 'Professional', icon: '💼' },
  { id: 'funny', label: 'Funny', icon: '😄' },
  { id: 'emotional', label: 'Emotional', icon: '❤️' },
  { id: 'educational', label: 'Educational', icon: '📚' },
  { id: 'storytelling', label: 'Storytelling', icon: '📖' },
  { id: 'motivational', label: 'Motivational', icon: '🔥' },
  { id: 'viral', label: 'Viral', icon: '🚀' },
  { id: 'marketing', label: 'Marketing', icon: '📣' },
  { id: 'technical', label: 'Technical', icon: '⚙️' },
];

const LENGTHS = [
  { id: 'short', label: 'Short', desc: '50-100 words' },
  { id: 'medium', label: 'Medium', desc: '150-250 words' },
  { id: 'long', label: 'Long', desc: '350-500 words' },
  { id: 'thread', label: 'Thread', desc: 'Numbered points' },
];

const LANGUAGES = [
  { id: 'auto', label: 'Auto (from prompt)' },
  { id: 'bn', label: 'Bangla' },
  { id: 'en', label: 'English' },
  { id: 'mixed', label: 'Banglish' },
];

const POST_TYPES = [
  { id: 'general', label: 'General', icon: <MessageSquare size={14}/> },
  { id: 'announcement', label: 'Announcement', icon: <Megaphone size={14}/> },
  { id: 'educational', label: 'Educational', icon: <BookOpen size={14}/> },
  { id: 'marketing', label: 'Marketing', icon: <TrendingUp size={14}/> },
  { id: 'personal', label: 'Personal', icon: <Heart size={14}/> },
  { id: 'business', label: 'Business', icon: <Briefcase size={14}/> },
];

const IMPROVE_ACTIONS = [
  { id: 'rewrite', label: 'Rewrite', icon: '✏️' },
  { id: 'shorter', label: 'Make Shorter', icon: '⬇️' },
  { id: 'longer', label: 'Make Longer', icon: '⬆️' },
  { id: 'professional', label: 'Professional', icon: '💼' },
  { id: 'funny', label: 'Add Humor', icon: '😂' },
  { id: 'grammar', label: 'Fix Grammar', icon: '✅' },
  { id: 'add_emojis', label: 'Add Emojis', icon: '😊' },
  { id: 'remove_emojis', label: 'Remove Emojis', icon: '🚫' },
  { id: 'viral', label: 'Make Viral', icon: '🚀' },
  { id: 'seo', label: 'SEO Optimize', icon: '🔍' },
  { id: 'translate', label: 'Translate', icon: '🌐' },
];

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AIPostPanel({
  onApplyContent,
  onApplyHashtags,
  currentContent = '',
  onClose,
  variant = 'card',
}: AIPostPanelProps) {
  const token = useStore((s) => s.token);
  const [activeTab, setActiveTab] = useState<'generate' | 'improve'>('generate');

  // Generate tab state
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('casual');
  const [language, setLanguage] = useState('auto');
  const [length, setLength] = useState('medium');
  const [postType, setPostType] = useState('general');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<AIGeneratedPost | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Improve tab state
  const [improving, setImproving] = useState(false);
  const [improveAction, setImproveAction] = useState('rewrite');
  const [improvedContent, setImprovedContent] = useState('');
  const [translateLang, setTranslateLang] = useState('en');

  // ─── API Calls ──────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt first!');
      return;
    }
    setGenerating(true);
    setResult(null);

    try {
      const res = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: prompt.trim(), style, language, length, postType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setResult(normalizeAiPostPayload(stripAiReasoningDeep(data)) as unknown as AIGeneratedPost);
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleImprove = async () => {
    if (!currentContent.trim()) {
      toast.error('Please write some content first to improve it!');
      return;
    }
    setImproving(true);
    setImprovedContent('');

    try {
      const res = await fetch('/api/ai/improve-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          content: currentContent,
          action: improveAction,
          language: translateLang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Improvement failed');
      setImprovedContent(stripAiReasoning(data.content || ''));
    } catch (err: any) {
      toast.error(err.message || 'AI improvement failed.');
    } finally {
      setImproving(false);
    }
  };

  const applyClean = (text: string, okMsg: string) => {
    onApplyContent(unwrapAiContentText(text));
    toast.success(okMsg);
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(unwrapAiContentText(text));
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success('Copied!');
  };

  const isDrawer = variant === 'drawer';

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={isDrawer ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
      animate={isDrawer ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={isDrawer ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={
        isDrawer
          ? 'h-full flex flex-col bg-card border-l border-violet-500/20 overflow-hidden'
          : 'bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-fuchsia-500/5 border border-violet-500/20 rounded-2xl overflow-hidden mt-3'
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600">
        <div className="flex items-center gap-2 text-foreground dark:text-white">
          <Sparkles size={16} className="animate-pulse" />
          <span className="font-bold text-sm">AI Content Studio</span>
        </div>
        <button onClick={onClose} aria-label="Close" title="Close" className="text-white/70 hover:text-white transition-colors p-1 hover:bg-black/10 dark:bg-white/10 rounded-full">
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-violet-500/20 bg-background/50">
        {[
          { id: 'generate', label: 'Generate', icon: <Sparkles size={14}/> },
          { id: 'improve', label: 'Improve', icon: <Wand2 size={14}/>, disabled: !currentContent },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
            disabled={tab.disabled}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-all flex-1 justify-center
              ${activeTab === tab.id
                ? 'border-b-2 border-violet-500 text-violet-600 dark:text-violet-400'
                : tab.disabled
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className={`${isDrawer ? 'flex-1 min-h-0 overflow-y-auto' : 'max-h-[460px] overflow-y-auto'} p-4 custom-scrollbar`}>
        <AnimatePresence mode="wait">
          {/* ── GENERATE TAB ───────────────────────────────────────────────── */}
          {activeTab === 'generate' && (
            <motion.div key="generate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

              {/* Prompt Input */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  What do you want to post about?
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Create a romantic post in bangla..."
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm resize-none outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-muted-foreground/60"
                  rows={3}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate(); }}
                />
                <p className="text-[10px] text-muted-foreground/50 mt-1">Ctrl+Enter to generate · say “in bangla” for বাংলা</p>
              </div>

              {/* Post Type */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Post Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {POST_TYPES.map((pt) => (
                    <button
                      key={pt.id}
                      onClick={() => setPostType(pt.id)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border
                        ${postType === pt.id
                          ? 'bg-violet-500/20 border-violet-500/50 text-violet-600 dark:text-violet-400'
                          : 'border-border hover:bg-muted text-muted-foreground'}`}
                    >
                      {pt.icon}
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style + Length + Language */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Style</label>
                  <select aria-label="Style"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-lg px-2 py-2 text-xs outline-none focus:border-violet-500 cursor-pointer"
                  >
                    {STYLES.map((s) => (
                      <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Length</label>
                  <select aria-label="Length"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-lg px-2 py-2 text-xs outline-none focus:border-violet-500 cursor-pointer"
                  >
                    {LENGTHS.map((l) => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Language</label>
                  <select aria-label="Language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-lg px-2 py-2 text-xs outline-none focus:border-violet-500 cursor-pointer"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
              >
                {generating ? (
                  <><Loader2 size={16} className="animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles size={16} /> Generate Post</>
                )}
              </button>

              {/* Result */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-end">
                      <button onClick={handleGenerate} disabled={generating} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                        <RefreshCw size={12} /> Regenerate
                      </button>
                    </div>

                    {/* Title */}
                    {result.title && (
                      <ResultCard
                        label="Title"
                        icon={<Target size={12}/>}
                        content={result.title}
                        onCopy={() => copyToClipboard(result.title, 'title')}
                        copied={copiedField === 'title'}
                        onUse={() => applyClean(result.content || result.title, 'Content applied!')}
                        useLabel="Use Content"
                      />
                    )}

                    {/* Main Content */}
                    {result.content && (
                      <ResultCard
                        label="Post Content"
                        icon={<AlignLeft size={12}/>}
                        content={result.content}
                        onCopy={() => copyToClipboard(result.content, 'content')}
                        copied={copiedField === 'content'}
                        onUse={() => applyClean(result.content, 'Content applied!')}
                        useLabel="Use This"
                        highlight
                      />
                    )}

                    {/* Caption */}
                    {result.caption && (
                      <ResultCard
                        label="Caption"
                        icon={<MessageSquare size={12}/>}
                        content={result.caption}
                        onCopy={() => copyToClipboard(result.caption, 'caption')}
                        copied={copiedField === 'caption'}
                        onUse={() => applyClean(result.caption, 'Caption applied!')}
                        useLabel="Use Caption"
                      />
                    )}

                    {/* Hashtags */}
                    {result.hashtags?.length > 0 && (
                      <div className="bg-muted/30 rounded-xl p-3 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Hash size={12}/> Hashtags</span>
                          <div className="flex gap-1">
                            <button onClick={() => copyToClipboard(result.hashtags.join(' '), 'hashtags')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                              {copiedField === 'hashtags' ? <Check size={10} className="text-green-500"/> : <Copy size={10}/>} Copy
                            </button>
                            {onApplyHashtags && (
                              <button onClick={() => { onApplyHashtags(result.hashtags); toast.success('Hashtags applied!'); }} className="text-xs text-violet-600 font-semibold ml-1">Use</button>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {result.hashtags.map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-md text-xs font-medium cursor-pointer hover:bg-violet-500/20 transition-colors"
                              onClick={() => copyToClipboard(tag, `tag-${i}`)}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Emojis + CTA row */}
                    <div className="grid grid-cols-2 gap-2">
                      {result.emojis?.length > 0 && (
                        <div className="bg-muted/30 rounded-xl p-2.5 border border-border">
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><Smile size={12}/> Emojis</p>
                          <div className="flex flex-wrap gap-1">
                            {result.emojis.map((e, i) => (
                              <button key={i} onClick={() => copyToClipboard(e, `emoji-${i}`)} className="text-base hover:scale-110 transition-transform">{e}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.cta && (
                        <div className="bg-muted/30 rounded-xl p-2.5 border border-border">
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><Zap size={12}/> Call to Action</p>
                          <p className="text-xs text-foreground leading-relaxed">{result.cta}</p>
                        </div>
                      )}
                    </div>

                    {/* Audience */}
                    {result.suggestedAudience && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
                        <Globe size={12} className="mt-0.5 shrink-0 text-violet-500"/>
                        <span><strong className="text-foreground">Target:</strong> {result.suggestedAudience}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}



          {/* ── IMPROVE TAB ────────────────────────────────────────────────── */}
          {activeTab === 'improve' && (
            <motion.div key="improve" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="bg-muted/30 rounded-xl p-3 border border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Current Content Preview</p>
                <p className="text-sm text-foreground line-clamp-3">{currentContent || 'No content yet.'}</p>
              </div>

              {/* Improve Actions */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Choose Improvement</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {IMPROVE_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => setImproveAction(action.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border text-left
                        ${improveAction === action.id
                          ? 'bg-violet-500/20 border-violet-500/50 text-violet-600 dark:text-violet-400'
                          : 'border-border hover:bg-muted text-muted-foreground'}`}
                    >
                      <span>{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Translate language picker */}
              {improveAction === 'translate' && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Translate to</label>
                  <select aria-label="Translate to"
                    value={translateLang}
                    onChange={(e) => setTranslateLang(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm outline-none"
                  >
                    <option value="en">🇬🇧 English</option>
                    <option value="bn">🇧🇩 বাংলা</option>
                  </select>
                </div>
              )}

              <button
                onClick={handleImprove}
                disabled={improving || !currentContent.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {improving ? <><Loader2 size={16} className="animate-spin"/> Improving...</> : <><Wand2 size={16}/> Improve Content</>}
              </button>

              {/* Improved result */}
              {improvedContent && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-muted/30 border border-violet-500/30 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">✨ Improved Version</p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{improvedContent}</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => applyClean(improvedContent, 'Content replaced!')}
                      className="flex-1 py-1.5 bg-violet-600 text-foreground dark:text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition-colors"
                    >
                      Use This Version
                    </button>
                    <button onClick={() => copyToClipboard(improvedContent, 'improved')} className="px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-muted transition-colors">
                      {copiedField === 'improved' ? <Check size={14} className="text-green-500"/> : <Copy size={14}/>}
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── ResultCard Helper ────────────────────────────────────────────────────────

function ResultCard({
  label, icon, content, onCopy, copied, onUse, useLabel, highlight = false
}: {
  label: string; icon: React.ReactNode; content: string;
  onCopy: () => void; copied: boolean;
  onUse: () => void; useLabel: string;
  highlight?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const display = unwrapAiContentText(content);
  const isLong = display.length > 200;

  return (
    <div className={`rounded-xl p-3 border ${highlight ? 'border-violet-500/30 bg-violet-500/5' : 'border-border bg-muted/30'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold flex items-center gap-1 ${highlight ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground'}`}>
          {icon} {label}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={onCopy} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            {copied ? <Check size={12} className="text-green-500"/> : <Copy size={12}/>}
          </button>
          <button
            onClick={onUse}
            className="text-xs font-bold text-foreground dark:text-white bg-violet-600 hover:bg-violet-700 px-2 py-0.5 rounded-md transition-colors ml-1"
          >
            {useLabel}
          </button>
        </div>
      </div>
      <p className={`text-sm text-foreground leading-relaxed whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-4' : ''}`}>
        {display}
      </p>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-violet-600 mt-1 flex items-center gap-1 hover:underline">
          {expanded ? <><ChevronUp size={12}/> Show less</> : <><ChevronDown size={12}/> Show more</>}
        </button>
      )}
    </div>
  );
}
