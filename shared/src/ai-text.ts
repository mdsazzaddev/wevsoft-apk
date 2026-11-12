/**
 * Strip model chain-of-thought / reasoning wrappers from AI text, and extract
 * clean JSON payloads from noisy model replies.
 */

const REASONING_NAMES = 'think|thinking|reasoning|redacted_reasoning|thought';

/** Closed XML-style reasoning blocks. */
const REASONING_TAG_BLOCKS = new RegExp(
  `<(${REASONING_NAMES})\\b[^>]*>[\\s\\S]*?<\\/\\1>`,
  'gi',
);

/** Unclosed open tag — drop until a JSON object starts or the string ends. */
const UNCLOSED_REASONING_TAG = new RegExp(
  `<(${REASONING_NAMES})\\b[^>]*>[\\s\\S]*?(?=\\{|$)`,
  'gi',
);

const ORPHAN_REASONING_TAGS = new RegExp(`<\\/?(?:${REASONING_NAMES})\\b[^>]*>`, 'gi');

/** "Thinking Process:" prose blocks some models dump without XML tags. */
const THINKING_PROCESS_HEADING =
  /(?:^|\n)\s*(?:\*\*|__|#+\s*)?Thinking Process:?\*?\*?_?\s*\n[\s\S]*?(?=\n\s*(?:#{1,3}\s*)?(?:\*\*)?(?:Final Answer|Answer|Output|Response|Result|JSON|Caption|Post)\b|\n\s*\{|$)/gi;

/** Meta chatter some models emit while "planning" JSON (no XML tags). */
const META_CHATTER_LINE =
  /^(?:\s*(?:✅|✔️|☑︎)?\s*)?(?:All good\.?|I will output only the JSON\.?|No markdown\.?|Ensure proper escaping.*|One minor thing:.*|I'll (?:stick|format|proceed|double-check|output|make sure).*|Self-Correction.*|Verification during thought:.*|Ready\.?|Output matches.*|Proceeds\.?|\[(?:Output Generation|Proceeds)\].*|Matches perfectly\.?|Done\.?|Final check.*|Note:.*JSON.*|Total:\s*\d+\s*words.*|P\d+:\s*.*|Check (?:newline|word count|tone|fields).*|Wait, let me count.*|\(Self-Correction.*|\[Proceeds\].*|\*Self-Correction.*|\*\(Self-Correction.*)$/gim;

export function stripAiReasoning(text: string | null | undefined): string {
  if (text == null) return '';
  let out = String(text);
  if (!out) return '';

  out = out.replace(REASONING_TAG_BLOCKS, '');
  out = out.replace(UNCLOSED_REASONING_TAG, '');
  out = out.replace(ORPHAN_REASONING_TAGS, '');
  out = out.replace(THINKING_PROCESS_HEADING, '\n');
  out = out.replace(META_CHATTER_LINE, '');

  // Common leftover labels after a stripped block
  out = out.replace(/^\s*(?:Final Answer|Answer|Output|Response)\s*:\s*/i, '');

  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Recursively clean string fields on a parsed AI JSON payload. */
export function stripAiReasoningDeep<T>(value: T): T {
  if (typeof value === 'string') return stripAiReasoning(value) as T;
  if (Array.isArray(value)) return value.map((v) => stripAiReasoningDeep(v)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = stripAiReasoningDeep(v);
    }
    return out as T;
  }
  return value;
}

/**
 * Extract the best JSON object from a noisy model reply.
 * Prefers the last object that has a non-empty `content` string.
 */
export function extractAiJsonObject(raw: string): Record<string, unknown> | null {
  const text = stripAiReasoning(raw);
  if (!text) return null;

  const candidates: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      if (depth > 0) depth--;
      if (depth === 0 && start >= 0) {
        candidates.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }

  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(candidates[i]!);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const content = (obj as any).content;
        if (typeof content === 'string' && content.trim().length > 0) {
          return stripAiReasoningDeep(obj as Record<string, unknown>);
        }
      }
    } catch {
      /* try earlier candidate */
    }
  }

  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(candidates[i]!);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        return stripAiReasoningDeep(obj as Record<string, unknown>);
      }
    } catch {
      /* continue */
    }
  }

  return null;
}

/**
 * If a string looks like a post JSON blob (`{ "content": "..." }`), return the
 * inner plain text. Handles truncated / invalid JSON via a targeted regex.
 */
export function unwrapAiContentText(raw: string | null | undefined): string {
  const text = stripAiReasoning(raw);
  if (!text) return '';

  const trimmed = text.trim();
  if (!(trimmed.startsWith('{') && /"content"\s*:/.test(trimmed))) {
    return text;
  }

  const nested = extractAiJsonObject(trimmed);
  if (nested && typeof nested.content === 'string' && nested.content.trim()) {
    const inner = nested.content.trim();
    // Avoid one more level of accidental nesting
    if (inner.startsWith('{') && /"content"\s*:/.test(inner)) {
      return unwrapAiContentText(inner);
    }
    return nested.content;
  }

  // Truncated JSON: pull the content string even if the object/string never closed.
  const m = trimmed.match(/"content"\s*:\s*"((?:\\.|[^"\\])*)(?:"|$)/);
  if (m) {
    try {
      return JSON.parse(`"${m[1]}"`) as string;
    } catch {
      return m[1]!
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
  }

  return text;
}

/**
 * Normalize a generate-post payload so UI fields are plain text, never raw JSON.
 */
export function normalizeAiPostPayload(
  input: unknown,
): Record<string, unknown> {
  let obj: Record<string, unknown>;

  if (typeof input === 'string') {
    const extracted = extractAiJsonObject(input);
    if (extracted) {
      obj = extracted;
    } else {
      return { content: unwrapAiContentText(input) };
    }
  } else if (input && typeof input === 'object' && !Array.isArray(input)) {
    obj = { ...(input as Record<string, unknown>) };
  } else {
    return { content: '' };
  }

  if (typeof obj.content === 'string') {
    const contentRaw = obj.content.trim();
    if (contentRaw.startsWith('{') && /"content"\s*:/.test(contentRaw)) {
      const nested = extractAiJsonObject(contentRaw);
      if (nested) {
        for (const key of [
          'caption',
          'hashtags',
          'keywords',
          'emojis',
          'cta',
          'relatedTopics',
          'suggestedAudience',
          'title',
        ] as const) {
          const outer = obj[key];
          const inner = nested[key];
          const outerEmpty =
            outer == null ||
            outer === '' ||
            (Array.isArray(outer) && outer.length === 0);
          if (outerEmpty && inner != null) obj[key] = inner;
        }
        obj.content = unwrapAiContentText(
          typeof nested.content === 'string' ? nested.content : contentRaw,
        );
      } else {
        obj.content = unwrapAiContentText(contentRaw);
      }
    } else {
      obj.content = unwrapAiContentText(obj.content);
    }
  }

  if (typeof obj.caption === 'string') {
    obj.caption = unwrapAiContentText(obj.caption);
  }
  if (typeof obj.cta === 'string') {
    obj.cta = unwrapAiContentText(obj.cta);
  }

  return stripAiReasoningDeep(obj);
}

export type PostGenLanguage = 'en' | 'bn' | 'mixed';

/**
 * Resolve post language. An explicit language inside the user prompt
 * (e.g. "in bangla") wins over a stale client default of English.
 */
export function resolvePostGenLanguage(
  prompt: string,
  requested?: string | null,
): PostGenLanguage {
  const p = String(prompt || '');
  const promptWantsBn = /[\u0980-\u09FF]/.test(p) || /\b(bangla|bengali|বাংলা)\b/i.test(p);
  const promptWantsMixed = /\b(mixed|binglish)\b/i.test(p);

  // Prompt intent is authoritative for generation language.
  if (promptWantsBn) return 'bn';
  if (promptWantsMixed) return 'mixed';

  const req = String(requested || 'auto').trim().toLowerCase();
  if (req === 'bn' || req === 'bangla' || req === 'bengali') return 'bn';
  if (req === 'en' || req === 'english') return 'en';
  if (req === 'mixed' || req === 'binglish') return 'mixed';
  return 'en';
}

export function postGenLanguageLabel(lang: PostGenLanguage): string {
  if (lang === 'bn') return 'Bangla (Bengali) — write the entire post in Bangla script';
  if (lang === 'mixed') return 'a natural mix of English and Bangla (Banglish)';
  return 'English';
}
