import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store';
import { aiApi, type AIActionType, type AISourceType } from '../../lib/aiApi';

export const SUMMARY_MIN_CHARS = 400;

type Result = { content: string; cached: boolean };

const memoryCache = new Map<string, Result>();

export function resolveClientLanguage(aiLanguage?: string) {
  if (!aiLanguage || aiLanguage === 'default' || aiLanguage === 'auto') return 'Auto';
  return aiLanguage;
}

export function aiContentQueryKey(
  sourceType: AISourceType,
  sourceId: string,
  actionType: AIActionType,
  targetLanguage: string,
) {
  return ['ai-content', sourceType, sourceId, actionType, targetLanguage] as const;
}

function keyOf(parts: readonly string[]) {
  return parts.join(':');
}

export function useAIContent(params: {
  sourceId: string;
  sourceType: AISourceType;
  actionType: AIActionType;
  originalText: string;
  enabled: boolean;
  targetLanguage?: string;
}) {
  const storeLang = useStore((s) => s.aiLanguage);
  const language = resolveClientLanguage(params.targetLanguage || storeLang);
  const cacheKey = useMemo(
    () => keyOf(aiContentQueryKey(params.sourceType, params.sourceId, params.actionType, language)),
    [params.sourceType, params.sourceId, params.actionType, language],
  );

  const [data, setData] = useState<Result | undefined>(() => memoryCache.get(cacheKey));
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!params.enabled || !params.sourceId || !params.originalText.trim()) return;
    const hit = memoryCache.get(cacheKey);
    if (hit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setData(hit);
      setError(null);
      return;
    }
    let cancelled = false;
    setIsFetching(true);
    setError(null);
    aiApi
      .process({
        sourceId: params.sourceId,
        sourceType: params.sourceType,
        actionType: params.actionType,
        targetLanguage: language,
        originalText: params.originalText,
      })
      .then((res) => {
        if (cancelled) return;
        memoryCache.set(cacheKey, res.data);
        setData(res.data);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(err?.message || 'AI request failed'));
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.enabled, params.sourceId, params.originalText, params.sourceType, params.actionType, language, cacheKey]);

  return {
    data,
    isFetching,
    isError: !!error,
    error,
  };
}
