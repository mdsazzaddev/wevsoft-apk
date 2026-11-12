import { useTranslation } from 'react-i18next';
import { trLabel } from './settings/languagePickerShared';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

interface ExpandableTextProps {
  text: string;
  onExpand?: () => void;
  className?: string;
  maxLines?: number;
}

type TextMetrics = {
  collapsedHeight: number;
  fullHeight: number;
  isOverflowing: boolean;
  measured: boolean;
};

const TOKEN_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+|@[A-Za-z0-9._-]+|#[\p{L}\p{N}_-]+)/gu;
const TRAILING_URL_PUNCTUATION = /[),.!?;:'"]+$/;

export default function ExpandableText({
  text,
  onExpand,
  className = '',
  maxLines = 3,
}: ExpandableTextProps) {
  const { t } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [metrics, setMetrics] = useState<TextMetrics>({
    collapsedHeight: 0,
    fullHeight: 0,
    isOverflowing: false,
    measured: false,
  });

  const measure = useCallback(() => {
    const node = contentRef.current;
    if (!node) return;

    const styles = window.getComputedStyle(node);
    const fontSize = Number.parseFloat(styles.fontSize) || 16;
    const parsedLineHeight = Number.parseFloat(styles.lineHeight);
    const lineHeight = Number.isFinite(parsedLineHeight) ? parsedLineHeight : fontSize * 1.5;
    const collapsedHeight = Math.ceil(lineHeight * maxLines);
    const fullHeight = Math.ceil(node.scrollHeight);
    const isOverflowing = fullHeight > collapsedHeight + 1;

    setMetrics((current) => {
      const next = { collapsedHeight, fullHeight, isOverflowing, measured: true };
      return current.collapsedHeight === next.collapsedHeight
        && current.fullHeight === next.fullHeight
        && current.isOverflowing === next.isOverflowing
        && current.measured
        ? current
        : next;
    });
  }, [maxLines]);

  useEffect(() => {
    let frame = window.requestAnimationFrame(measure);
    const node = contentRef.current;
    if (!node) return () => window.cancelAnimationFrame(frame);

    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    });
    observer.observe(node);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [measure, text]);

  const renderedText = useMemo(() => renderRichText(text), [text]);

  if (!text) return null;

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);
    if (nextExpanded) onExpand?.();
  };

  const maxHeight = metrics.measured
    ? metrics.isOverflowing
      ? isExpanded ? metrics.fullHeight : metrics.collapsedHeight
      : metrics.fullHeight
    : `${maxLines * 1.5}em`;

  return (
    <div className={className}>
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out motion-reduce:transition-none"
        style={{ maxHeight }}
      >
        <div ref={contentRef} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {renderedText}
        </div>
      </div>

      {metrics.isOverflowing && (
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={isExpanded}
          className="mt-1 block text-left text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {isExpanded ? trLabel(t, 'SeeLess', 'See Less') : trLabel(t, 'SeeMore', 'See More')}
        </button>
      )}
    </div>
  );
}

function renderRichText(text: string) {
  const parts = text.split(TOKEN_PATTERN);

  return parts.map((part, index) => {
    if (!part) return null;

    if (/^https?:\/\//i.test(part) || /^www\./i.test(part)) {
      const punctuation = part.match(TRAILING_URL_PUNCTUATION)?.[0] || '';
      const urlText = punctuation ? part.slice(0, -punctuation.length) : part;
      const href = /^https?:\/\//i.test(urlText) ? urlText : `https://${urlText}`;
      return (
        <React.Fragment key={`${index}-${part}`}>
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(event) => event.stopPropagation()}
            className="text-sky-500 hover:underline"
          >
            {urlText}
          </a>
          {punctuation}
        </React.Fragment>
      );
    }

    if (part.startsWith('@')) {
      return <Link key={`${index}-${part}`} to={`/${part}`} onClick={(event) => event.stopPropagation()} className="font-medium text-sky-500 hover:underline">{part}</Link>;
    }

    if (part.startsWith('#')) {
      return <Link key={`${index}-${part}`} to={`/explore?q=${encodeURIComponent(part)}`} onClick={(event) => event.stopPropagation()} className="font-medium text-sky-500 hover:underline">{part}</Link>;
    }

    return <React.Fragment key={`${index}-${part}`}>{part}</React.Fragment>;
  });
}
