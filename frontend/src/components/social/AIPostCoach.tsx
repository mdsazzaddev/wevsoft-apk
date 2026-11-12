import React, { useState } from 'react';
import { useStore } from '../../store';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp, BookOpen, Zap, Star, Users, Hash,
  CheckCircle, Clock, Lightbulb, ChevronDown, ChevronUp,
  Loader2, BarChart3, ThumbsUp, AlertCircle, X
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoachScore {
  engagementScore: number;
  readabilityScore: number;
  viralScore: number;
  qualityScore: number;
  emotionalScore: number;
  audienceScore: number;
  hashtagScore: number;
  overallScore: number;
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
  bestPostingTime: string;
  coachId?: string;
  model?: string;
}

interface AIPostCoachProps {
  content: string;
  hashtags?: string[];
  onClose?: () => void;
}

// ─── Score Meters ────────────────────────────────────────────────────────────

const SCORE_METRICS = [
  { key: 'engagementScore', label: 'Engagement', icon: <TrendingUp size={14}/>, color: 'from-blue-500 to-cyan-400' },
  { key: 'readabilityScore', label: 'Readability', icon: <BookOpen size={14}/>, color: 'from-emerald-500 to-teal-400' },
  { key: 'viralScore', label: 'Viral Potential', icon: <Zap size={14}/>, color: 'from-yellow-500 to-orange-400' },
  { key: 'qualityScore', label: 'Content Quality', icon: <Star size={14}/>, color: 'from-purple-500 to-violet-400' },
  { key: 'emotionalScore', label: 'Emotional Impact', icon: <ThumbsUp size={14}/>, color: 'from-rose-500 to-pink-400' },
  { key: 'audienceScore', label: 'Audience Match', icon: <Users size={14}/>, color: 'from-indigo-500 to-blue-400' },
  { key: 'hashtagScore', label: 'Hashtag Quality', icon: <Hash size={14}/>, color: 'from-fuchsia-500 to-purple-400' },
];

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Fair';
  if (score >= 40) return 'Needs Work';
  return 'Poor';
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';

  return (
    <div style={{ width: size, height: size }} className="relative flex-shrink-0">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={6} fill="none" className="text-muted/30"/>
        <motion.circle
          cx={size/2} cy={size/2} r={radius}
          stroke={color} strokeWidth={6} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-lg leading-none" style={{ color }}>{score}</span>
        <span className="text-[9px] text-muted-foreground font-medium">/100</span>
      </div>
    </div>
  );
}

// ─── Mini Score Bar ────────────────────────────────────────────────────────────

function ScoreBar({ label, icon, score, colorClass }: { label: string; icon: React.ReactNode; score: number; colorClass: string; key?: string | number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <span className={`${score >= 70 ? 'text-emerald-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{icon}</span>
          {label}
        </span>
        <span className={`font-bold ${getScoreColor(score)}`}>{score}</span>
      </div>
      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${colorClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AIPostCoach({ content, hashtags = [], onClose }: AIPostCoachProps) {
  const token = useStore((s) => s.token);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<CoachScore | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (!content.trim() || content.trim().length < 10) {
      toast.error('Write at least 10 characters to analyze.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/post-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, hashtags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setScore(data);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || 'Coach analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 border border-emerald-500/20 rounded-2xl overflow-hidden mt-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="flex items-center gap-2 text-foreground dark:text-white">
          <BarChart3 size={16} />
          <span className="font-bold text-sm">AI Post Coach</span>
          {score && (
            <span className="ml-1 bg-black/20 dark:bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
              Score: {score.overallScore}/100
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!score && (
            <button
              onClick={analyze}
              disabled={loading || !content.trim()}
              className="flex items-center gap-1.5 bg-black/20 dark:bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={12} className="animate-spin"/> : <Zap size={12}/>}
              {loading ? 'Analyzing...' : 'Analyze Post'}
            </button>
          )}
          {score && (
            <button onClick={() => setScore(null)} className="text-foreground dark:text-white/70 hover:text-foreground dark:text-white text-xs transition-colors">
              Re-analyze
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1 hover:bg-black/10 dark:bg-white/10 rounded-full">
              <X size={14}/>
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {/* Loading State */}
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"/>
                <BarChart3 size={20} className="absolute inset-0 m-auto text-emerald-500"/>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Analyzing your post...</p>
                <p className="text-xs text-muted-foreground mt-1">AI Coach is reviewing engagement, readability, and viral potential</p>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {error && !loading && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-red-500 py-4 justify-center">
              <AlertCircle size={16}/> {error}
            </motion.div>
          )}

          {/* Initial State */}
          {!score && !loading && !error && (
            <motion.div key="initial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <BarChart3 size={24} className="text-emerald-500"/>
              </div>
              <p className="text-sm font-semibold text-foreground">Get AI Coaching</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                AI will score your post for engagement, readability, viral potential, and give you actionable suggestions.
              </p>
              <button
                onClick={analyze}
                disabled={!content.trim()}
                className="mt-3 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                <Zap size={14}/> Analyze My Post
              </button>
            </motion.div>
          )}

          {/* Score Results */}
          {score && !loading && (
            <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {/* Overall Score Hero */}
              <div className="flex items-center gap-4 bg-muted/30 rounded-2xl p-4 border border-border">
                <ScoreRing score={score.overallScore} size={80} />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium">Overall Score</p>
                  <p className={`text-2xl font-black ${getScoreColor(score.overallScore)}`}>
                    {getScoreLabel(score.overallScore)}
                  </p>
                  {score.bestPostingTime && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock size={11}/> Best time: <strong className="text-foreground">{score.bestPostingTime}</strong>
                    </p>
                  )}
                  {score.model && (
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">analyzed by {score.model}</p>
                  )}
                </div>
              </div>

              {/* Score Bars */}
              <div className="space-y-2">
                {SCORE_METRICS.slice(0, showAll ? undefined : 4).map((metric) => (
                  <ScoreBar
                    key={metric.key}
                    label={metric.label}
                    icon={metric.icon}
                    score={(score as any)[metric.key] || 0}
                    colorClass={metric.color}
                  />
                ))}
                {!showAll && SCORE_METRICS.length > 4 && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    <ChevronDown size={12}/> Show {SCORE_METRICS.length - 4} more metrics
                  </button>
                )}
                {showAll && (
                  <button
                    onClick={() => setShowAll(false)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    <ChevronUp size={12}/> Show less
                  </button>
                )}
              </div>

              {/* Strengths & Weaknesses */}
              {(score.strengths?.length > 0 || score.weaknesses?.length > 0) && (
                <div className="grid grid-cols-2 gap-2">
                  {score.strengths?.length > 0 && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2.5">
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                        <ThumbsUp size={11}/> Strengths
                      </p>
                      <ul className="space-y-1">
                        {score.strengths.slice(0, 2).map((s, i) => (
                          <li key={i} className="text-xs text-foreground flex items-start gap-1">
                            <CheckCircle size={10} className="text-emerald-500 mt-0.5 shrink-0"/> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {score.weaknesses?.length > 0 && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                        <AlertCircle size={11}/> Improve
                      </p>
                      <ul className="space-y-1">
                        {score.weaknesses.slice(0, 2).map((w, i) => (
                          <li key={i} className="text-xs text-foreground flex items-start gap-1">
                            <span className="text-amber-500 mt-0.5 shrink-0">•</span> {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* AI Suggestions */}
              {score.suggestions?.length > 0 && (
                <div className="bg-muted/30 rounded-xl p-3 border border-border space-y-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Lightbulb size={13} className="text-yellow-500"/> AI Suggestions
                  </p>
                  <ul className="space-y-2">
                    {score.suggestions.map((s, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="text-xs text-foreground flex items-start gap-2"
                      >
                        <span className="w-5 h-5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {s}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
