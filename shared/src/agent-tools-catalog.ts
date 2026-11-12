/**
 * Built-in capability catalog for wevchat AI agents (Tools tab).
 * Stored on WevAIAgentTool as toolName with toolConnectionId = null.
 * Library-backed tools (Google Drive/Sheets, Documents) still attach via WevToolConnection.
 */

export type AgentBuiltinToolId =
  | 'WEB_SEARCH'
  | 'URL_READER'
  | 'GOOGLE_DRIVE'
  | 'GOOGLE_DOCS'
  | 'GOOGLE_SHEETS'
  | 'GMAIL'
  | 'GOOGLE_CALENDAR'
  | 'LOCAL_FILES'
  | 'EXCEL'
  | 'WORD'
  | 'PDF'
  | 'CSV'
  | 'IMAGES'
  | 'WEV_MESSAGES'
  | 'WEV_SAVED_MESSAGES'
  | 'WEV_POSTS'
  | 'WEV_PROFILES'
  | 'WEV_NOTIFICATIONS'
  | 'AI_MEMORY'
  | 'AI_SUMMARIZER'
  | 'AI_TRANSLATOR'
  | 'AI_SMART_REPLY'
  | 'UTIL_CALCULATOR'
  | 'UTIL_DATETIME'
  | 'UTIL_REMINDERS'
  | 'UTIL_CONVERTERS';

export type AgentToolCategoryId = 'web' | 'google' | 'files' | 'wevsoft' | 'ai' | 'utilities';

export interface AgentCatalogTool {
  id: AgentBuiltinToolId;
  label: string;
  hint: string;
  /** Optional hint for library kind that configures this capability */
  libraryKind?: 'DOCUMENTS' | 'GOOGLE_SHEETS' | 'GOOGLE_DRIVE' | 'WIKIPEDIA';
}

export interface AgentToolCategory {
  id: AgentToolCategoryId;
  label: string;
  tools: AgentCatalogTool[];
}

export const AGENT_TOOL_CATEGORIES: AgentToolCategory[] = [
  {
    id: 'web',
    label: 'Web',
    tools: [
      { id: 'WEB_SEARCH', label: 'Web Search', hint: 'Look up facts from the public web when needed.' },
      { id: 'URL_READER', label: 'URL Reader', hint: 'Fetch and summarize content from a link the user shares.' },
    ],
  },
  {
    id: 'google',
    label: 'Google',
    tools: [
      { id: 'GOOGLE_DRIVE', label: 'Drive', hint: 'Read files from a connected Google Drive.', libraryKind: 'GOOGLE_DRIVE' },
      { id: 'GOOGLE_DOCS', label: 'Docs', hint: 'Read Google Docs via Drive connection.', libraryKind: 'GOOGLE_DRIVE' },
      { id: 'GOOGLE_SHEETS', label: 'Sheets', hint: 'Read or append rows in a connected sheet.', libraryKind: 'GOOGLE_SHEETS' },
      { id: 'GMAIL', label: 'Gmail', hint: 'Reference Gmail context when connected (coming soon).' },
      { id: 'GOOGLE_CALENDAR', label: 'Calendar', hint: 'Check schedule context when connected (coming soon).' },
    ],
  },
  {
    id: 'files',
    label: 'Files',
    tools: [
      { id: 'LOCAL_FILES', label: 'Local Files', hint: 'Upload PDFs, docs, and other files for this agent to reference.', libraryKind: 'DOCUMENTS' },
      { id: 'EXCEL', label: 'Excel', hint: 'Reference Excel / spreadsheet uploads.', libraryKind: 'DOCUMENTS' },
      { id: 'WORD', label: 'Word', hint: 'Reference Word document uploads.', libraryKind: 'DOCUMENTS' },
      { id: 'PDF', label: 'PDF', hint: 'Reference PDF uploads.', libraryKind: 'DOCUMENTS' },
      { id: 'CSV', label: 'CSV', hint: 'Reference CSV uploads.', libraryKind: 'DOCUMENTS' },
      { id: 'IMAGES', label: 'Images', hint: 'Reference image uploads where text can be extracted.', libraryKind: 'DOCUMENTS' },
    ],
  },
  {
    id: 'wevsoft',
    label: 'Wevsoft',
    tools: [
      { id: 'WEV_MESSAGES', label: 'Messages', hint: 'Use recent chat context with this person.' },
      { id: 'WEV_SAVED_MESSAGES', label: 'Saved Messages', hint: 'Reference starred / saved messages when relevant.' },
      { id: 'WEV_POSTS', label: 'Posts', hint: 'Reference your public posts when answering.' },
      { id: 'WEV_PROFILES', label: 'Profiles', hint: 'Use profile info for you and the sender.' },
      { id: 'WEV_NOTIFICATIONS', label: 'Notifications', hint: 'Aware of recent notification-style updates.' },
    ],
  },
  {
    id: 'ai',
    label: 'AI',
    tools: [
      { id: 'AI_MEMORY', label: 'Memory', hint: 'Use long-term agent memory notes for this contact.' },
      { id: 'AI_SUMMARIZER', label: 'Summarizer', hint: 'Summarize long messages or threads when asked.' },
      { id: 'AI_TRANSLATOR', label: 'Translator', hint: 'Translate between languages when asked.' },
      { id: 'AI_SMART_REPLY', label: 'Smart Reply', hint: 'Offer short reply suggestions when helpful.' },
    ],
  },
  {
    id: 'utilities',
    label: 'Utilities',
    tools: [
      { id: 'UTIL_CALCULATOR', label: 'Calculator', hint: 'Solve basic math when the user asks.' },
      { id: 'UTIL_DATETIME', label: 'Date/Time', hint: 'Answer with accurate current date and time.' },
      { id: 'UTIL_REMINDERS', label: 'Reminders', hint: 'Help draft reminder wording (delivery via chat).' },
      { id: 'UTIL_CONVERTERS', label: 'Converters', hint: 'Convert units, currency-style amounts, and formats.' },
    ],
  },
];

const ALL_IDS = new Set(AGENT_TOOL_CATEGORIES.flatMap((c) => c.tools.map((t) => t.id)));

/**
 * These ids are persisted on `WevAIAgentTool.toolName`, and before the Wevsoft
 * rename the platform tools were called `SORA_MESSAGES`, `SORA_POSTS` and so on.
 * Rows written by an earlier build still carry those names, so every id that
 * crosses the database boundary is normalized here — otherwise a user's already
 * enabled tool would silently stop matching the catalog and appear switched off.
 */
const LEGACY_TOOL_ID_PREFIX = 'SORA_';

export function normalizeBuiltinToolId(value: string): string {
  return value.startsWith(LEGACY_TOOL_ID_PREFIX)
    ? `WEV_${value.slice(LEGACY_TOOL_ID_PREFIX.length)}`
    : value;
}

/** The pre-rename spelling of a platform tool id, for matching existing rows. */
export function legacyBuiltinToolId(value: string): string {
  return value.startsWith('WEV_') ? `${LEGACY_TOOL_ID_PREFIX}${value.slice('WEV_'.length)}` : value;
}

export function isAgentBuiltinToolId(value: string): value is AgentBuiltinToolId {
  return ALL_IDS.has(normalizeBuiltinToolId(value) as AgentBuiltinToolId);
}

export function getCatalogTool(id: string): AgentCatalogTool | undefined {
  const wanted = normalizeBuiltinToolId(id);
  for (const cat of AGENT_TOOL_CATEGORIES) {
    const found = cat.tools.find((t) => t.id === wanted);
    if (found) return found;
  }
  return undefined;
}

/**
 * Built-in tool IDs that have real backing code the model can actually rely on.
 * Only UTIL_DATETIME is implemented as a pure built-in (it injects the current
 * time in tool-registry.ts's buildToolContext). Every other catalog entry is
 * either a UI-only stub with no code (WEB_SEARCH, URL_READER, GMAIL,
 * GOOGLE_CALENDAR, UTIL_CALCULATOR, AI_TRANSLATOR, WEV_*, …) or a library-backed
 * capability (Drive/Docs/Sheets/uploads) that only works once a WevToolConnection
 * is attached — and those inject their own labeled context blocks (tool-registry.ts)
 * or native function defs (function-tools.ts), so they must NOT be advertised here
 * as standalone built-ins either. Advertising a capability with no backing invites
 * the model to hallucinate results it cannot produce, so the prompt blurb below is
 * filtered through this allow-list. (Catalog entries are kept intact for the UI.)
 */
export const IMPLEMENTED_BUILTIN_TOOL_IDS = new Set<AgentBuiltinToolId>(['UTIL_DATETIME']);

/** Prompt blurb for enabled built-ins (capabilities the model may use). */
export function describeEnabledBuiltinTools(enabledIds: string[]): string {
  const labels: string[] = [];
  for (const cat of AGENT_TOOL_CATEGORIES) {
    for (const tool of cat.tools) {
      // Only advertise tools that are actually implemented — never tell the model it
      // "may use" a capability that has no backing code (hallucination risk).
      if (enabledIds.includes(tool.id) && IMPLEMENTED_BUILTIN_TOOL_IDS.has(tool.id)) {
        labels.push(`${cat.label} › ${tool.label}`);
      }
    }
  }
  if (labels.length === 0) return '';
  return (
    `--- Enabled tools ---\n` +
    `You may use these capabilities when relevant (do not invent results you cannot verify):\n` +
    labels.map((l) => `- ${l}`).join('\n') +
    `\n`
  );
}
