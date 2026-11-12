import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { TranslateButton } from './TranslateButton';
import { SummarizeButton } from './SummarizeButton';
import { AIContentSkeleton } from './AIContentSkeleton';
import { SUMMARY_MIN_CHARS, useAIContent } from './useAIContent';
import type { AISourceType } from '../../lib/aiApi';
import ExpandableText from '../ExpandableText';

interface WithTranslationProps {
  sourceId: string;
  sourceType: AISourceType;
  originalText: string;
  enableSummary?: boolean;
  compact?: boolean;
  disabled?: boolean;
  absoluteActions?: boolean;
  hideTranslateButton?: boolean;
  textClassName?: string;
  collapsible?: boolean;
  children?: React.ReactNode;
}

export const WithTranslation: React.FC<WithTranslationProps> = ({
  sourceId,
  sourceType,
  originalText,
  enableSummary = false,
  compact = false,
  disabled = false,
  absoluteActions = false,
  hideTranslateButton = false,
  textClassName,
  collapsible = false,
  children,
}) => {
  const [mode, setMode] = useState<'original' | 'translation' | 'summary'>('original');
  const [wantTranslation, setWantTranslation] = useState(false);
  const [wantSummary, setWantSummary] = useState(false);

  useEffect(() => {
    const onRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail as { sourceId?: string; sourceType?: string } | undefined;
      if (!detail || detail.sourceId !== sourceId || detail.sourceType !== sourceType) return;
      setWantTranslation(true);
      setMode('translation');
    };
    window.addEventListener('wev:request-translate', onRequest);
    return () => window.removeEventListener('wev:request-translate', onRequest);
  }, [sourceId, sourceType]);

  const translation = useAIContent({
    sourceId,
    sourceType,
    actionType: 'TRANSLATION',
    originalText,
    enabled: wantTranslation,
  });
  const summary = useAIContent({
    sourceId,
    sourceType,
    actionType: 'SUMMARY',
    originalText,
    enabled: wantSummary,
  });

  const showSummaryBtn = enableSummary && originalText.trim().length >= SUMMARY_MIN_CHARS;
  const showingTranslation = mode === 'translation' && !!translation.data?.content;
  const showingSummary = mode === 'summary' && !!summary.data?.content;
  const loading = (wantTranslation && translation.isFetching && !translation.data)
    || (wantSummary && summary.isFetching && !summary.data);

  const displayText = showingTranslation
    ? translation.data!.content
    : showingSummary
      ? summary.data!.content
      : originalText;

  const onTranslate = () => {
    if (mode === 'translation') {
      setMode('original');
      return;
    }
    setWantTranslation(true);
    setMode('translation');
  };

  const onSummarize = () => {
    if (mode === 'summary') {
      setMode('original');
      return;
    }
    setWantSummary(true);
    setMode('summary');
  };

  const translationFailed = wantTranslation && translation.isError && !translation.data;
  const summaryFailed = wantSummary && summary.isError && !summary.data;
  const actionSize: 'sm' | 'md' = compact ? 'sm' : 'md';

  const translateBtn = hideTranslateButton ? null : (
    <TranslateButton
      compact={compact}
      size={actionSize}
      active={mode === 'translation' && showingTranslation}
      loading={wantTranslation && translation.isFetching}
      disabled={disabled}
      onClick={onTranslate}
    />
  );

  const summarizeBtn = showSummaryBtn ? (
    <SummarizeButton
      active={mode === 'summary'}
      loading={wantSummary && summary.isFetching}
      disabled={disabled}
      onClick={onSummarize}
    />
  ) : null;

  return (
    <div className="min-w-0">
      {children ?? (
        compact && !collapsible ? (
          <p className={`${textClassName || ''} inline`}>
            <span className="whitespace-pre-wrap break-words">{displayText}</span>
            <span className="ml-1 inline-flex translate-y-[1px] align-middle items-center gap-0.5">
              {translateBtn}
              {summarizeBtn}
            </span>
          </p>
        ) : collapsible ? (
          <ExpandableText text={displayText} className={textClassName} />
        ) : (
          <p className={textClassName}>
            {displayText}
          </p>
        )
      )}
      {children && (
        <AnimatePresence mode="wait">
          {(showingTranslation || showingSummary || loading) && (
            <motion.div
              key={mode + (loading ? '-load' : '')}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 pt-2 border-t border-current/15"
            >
              {loading ? (
                <AIContentSkeleton lines={showSummaryBtn ? 3 : 2} />
              ) : (
                <>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1 mb-1">
                    <Sparkles size={10} />
                    {showingSummary ? 'Summary' : 'Translated'}
                  </span>
                  <p className={textClassName || 'text-sm whitespace-pre-wrap break-words'}>{displayText}</p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
      {!children && !compact && loading && <AIContentSkeleton />}
      {!children && !compact && (showingTranslation || showingSummary) && (
        <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-60">
          <Sparkles size={10} /> {showingSummary ? 'Summary' : 'Translated'}
        </span>
      )}

      {(translationFailed || summaryFailed) && (
        <div className="mt-1 flex items-center gap-2 text-[11px] text-red-400 font-semibold">
          <span>Translation unavailable</span>
          <button
            type="button"
            className="underline hover:text-red-300"
            onClick={() => {
              if (translationFailed) {
                setWantTranslation(false);
                setTimeout(() => setWantTranslation(true), 0);
              }
              if (summaryFailed) {
                setWantSummary(false);
                setTimeout(() => setWantSummary(true), 0);
              }
            }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Non-compact: actions under caption. Compact: icon sits inline after text. */}
      {!compact && (
        <div
          className={
            absoluteActions
              ? 'absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1.5 z-10'
              : 'mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5'
          }
        >
          {translateBtn}
          {summarizeBtn}
        </div>
      )}
    </div>
  );
};
