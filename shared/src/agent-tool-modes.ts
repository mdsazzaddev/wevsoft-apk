/**
 * Per-attachment modes on WevAIAgentTool.config (JSON).
 * - useInfo: inject tool data into the reply prompt (read)
 * - useSave: allow the model to write/record into the tool (Sheets, table, webhook)
 */

export interface AgentToolModes {
  useInfo: boolean;
  useSave: boolean;
}

export const SAVE_CAPABLE_KINDS = new Set(['CUSTOM_TABLE', 'GOOGLE_SHEETS', 'GOOGLE_DOCS', 'WEBHOOK', 'SAVE_RECORDS']);

export function parseAgentToolModes(config: string | null | undefined): AgentToolModes {
  try {
    const c = JSON.parse(config || '{}') as Record<string, unknown>;
    return {
      useInfo: c.useInfo !== false,
      useSave: c.useSave === true,
    };
  } catch {
    return { useInfo: true, useSave: false };
  }
}

export function defaultModesForKind(kind: string): AgentToolModes {
  if (kind === 'WEBHOOK' || kind === 'SAVE_RECORDS') return { useInfo: false, useSave: true };
  return { useInfo: true, useSave: false };
}

export function serializeAgentToolModes(
  modes: Partial<AgentToolModes>,
  existing?: string | null,
  kind?: string
): string {
  const base = existing ? parseAgentToolModes(existing) : defaultModesForKind(kind || '');
  return JSON.stringify({
    useInfo: modes.useInfo ?? base.useInfo,
    useSave: modes.useSave ?? base.useSave,
  });
}

export function kindSupportsSave(kind: string): boolean {
  return SAVE_CAPABLE_KINDS.has(kind);
}
