import React from 'react';
import { WevAgent } from '../../../../lib/automationApi';
import { ToggleSwitch } from '../ToggleSwitch';

interface AgentGeneralTabProps {
  draft: Partial<WevAgent>;
  onChange: (patch: Partial<WevAgent>) => void;
}

export const AgentGeneralTab: React.FC<AgentGeneralTabProps> = ({ draft, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Agent Name</label>
        <input
          value={draft.name || ''}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder='e.g. "Business Support"'
          className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-1.5 text-[13px] focus:ring-2 focus:ring-primary/50 outline-none"
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Description</label>
        <input
          value={draft.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="A short note to help you tell agents apart"
          className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-1.5 text-[13px] focus:ring-2 focus:ring-primary/50 outline-none"
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Personality</label>
        <input
          value={draft.personality || ''}
          onChange={(e) => onChange({ personality: e.target.value })}
          placeholder="e.g. Friendly and concise, uses light humor"
          className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-1.5 text-[13px] focus:ring-2 focus:ring-primary/50 outline-none"
        />
      </div>

      <div 
        onClick={() => onChange({ isEnabled: !(draft.isEnabled ?? true) })}
        className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/30 border border-border cursor-pointer hover:bg-muted/40 transition-colors select-none"
      >
        <div>
          <p className="text-[13px] font-semibold text-foreground">Enabled</p>
          <p className="text-[11px] text-muted-foreground">Off always wins — no auto-reply goes out while this is off, regardless of schedule.</p>
        </div>
        <ToggleSwitch size="sm" checked={draft.isEnabled ?? true} onChange={(v) => onChange({ isEnabled: v })} />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Lifecycle Status</label>
        <select
          value={draft.status || 'ACTIVE'}
          onChange={(e) => onChange({ status: e.target.value })}
          className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-1.5 text-[13px] focus:ring-2 focus:ring-primary/50 outline-none"
        >
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>
    </div>
  );
};
