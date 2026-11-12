/**
 * Saved and automated replies (MP2 §10).
 *
 * Four kinds, one screen, because they are the same object with different jobs:
 * a welcome message and an away message are automatic and there is exactly one of
 * each; FAQs and quick replies are lists a team curates. The `single` flag in the
 * shared SPACE_CANNED_KINDS table decides which shape a kind gets, so adding a
 * fifth kind later needs no change here.
 *
 * Away messages depend on business hours, which live in Settings → Messaging;
 * this sheet says so rather than silently doing nothing outside them.
 */

import { useCallback, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  SPACE_CANNED_KINDS,
  SPACE_CANNED_LIMITS,
  type SpaceCannedKind,
} from '@wevsoft/shared/wevspace';
import {
  deleteCannedReply,
  fetchCannedReplies,
  saveCannedReply,
} from '../../../lib/wevspaceManageApi';
import { spaceIcon } from '../spaceIcons';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Field,
  IconButton,
  PanelError,
  PanelSkeleton,
  Sheet,
  TextArea,
  TextInput,
  ToggleRow,
  confirmAction,
  usePanelData,
} from './manageUi';

interface Editing {
  id?: string;
  kind: SpaceCannedKind;
  title: string;
  body: string;
  shortcut: string;
  isActive: boolean;
}

export default function CannedRepliesSheet({ onClose }: { onClose: () => void }) {
  const { spaceId, accent, goto } = useManage();
  const data = usePanelData(() => fetchCannedReplies(spaceId), [spaceId]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);

  const replies = data.data?.replies || [];
  const byKind = useMemo(() => {
    const out: Record<string, any[]> = {};
    for (const reply of replies) {
      (out[reply.kind] ||= []).push(reply);
    }
    return out;
  }, [replies]);

  const save = useCallback(
    async (entry: Editing) => {
      if (!entry.title.trim() || !entry.body.trim()) {
        toast.error('Both a title and a message are needed.');
        return;
      }
      setBusy(true);
      try {
        await saveCannedReply(
          spaceId,
          {
            kind: entry.kind,
            title: entry.title.trim(),
            body: entry.body.trim(),
            shortcut: entry.shortcut.trim() || undefined,
            isActive: entry.isActive,
          },
          entry.id,
        );
        toast.success('Saved');
        setEditing(null);
        await data.reload();
      } catch (error: any) {
        toast.error(error?.message || 'Could not save that reply');
      } finally {
        setBusy(false);
      }
    },
    [spaceId, data],
  );

  const remove = async (reply: any) => {
    if (!confirmAction(`Delete “${reply.title}”?`)) return;
    setBusy(true);
    try {
      await deleteCannedReply(reply.id);
      await data.reload();
    } catch (error: any) {
      toast.error(error?.message || 'Could not delete that reply');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (reply: any, next: boolean) => {
    setBusy(true);
    try {
      await saveCannedReply(
        spaceId,
        { kind: reply.kind, title: reply.title, body: reply.body, shortcut: reply.shortcut || undefined, isActive: next },
        reply.id,
      );
      await data.reload();
    } catch (error: any) {
      toast.error(error?.message || 'Could not change that');
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    const def = SPACE_CANNED_KINDS.find((entry) => entry.id === editing.kind);
    return (
      <Sheet
        title={editing.id ? `Edit ${def?.label.toLowerCase() || 'reply'}` : `New ${def?.label.toLowerCase() || 'reply'}`}
        onClose={() => setEditing(null)}
        footer={
          <>
            <ActionButton onClick={() => setEditing(null)}>Cancel</ActionButton>
            <ActionButton tone="accent" accent={accent} busy={busy} onClick={() => save(editing)} full>
              Save
            </ActionButton>
          </>
        }
      >
        <div className="space-y-3">
          {def?.blurb && <p className="text-[11px] text-muted-foreground">{def.blurb}</p>}
          <Field label={editing.kind === 'FAQ' ? 'Question' : editing.kind === 'KEYWORD_REPLY' ? 'Keywords (comma separated)' : 'Title'} count={`${editing.title.length}/${SPACE_CANNED_LIMITS.title.max}`}>
            <TextInput
              value={editing.title}
              maxLength={SPACE_CANNED_LIMITS.title.max}
              placeholder={editing.kind === 'FAQ' ? 'Do you ship outside Dhaka?' : editing.kind === 'KEYWORD_REPLY' ? 'price, cost, how much' : 'Opening hours'}
              onChange={(event) => setEditing({ ...editing, title: event.target.value })}
            />
          </Field>
          <Field
            label={editing.kind === 'FAQ' ? 'Answer' : 'Message'}
            count={`${editing.body.length}/${SPACE_CANNED_LIMITS.body.max}`}
          >
            <TextArea
              rows={5}
              value={editing.body}
              maxLength={SPACE_CANNED_LIMITS.body.max}
              onChange={(event) => setEditing({ ...editing, body: event.target.value })}
            />
          </Field>
          {editing.kind === 'QUICK_REPLY' && (
            <Field label="Shortcut" hint="Type this in the reply box to pull the text in.">
              <TextInput
                value={editing.shortcut}
                maxLength={SPACE_CANNED_LIMITS.shortcut.max}
                placeholder="/hours"
                onChange={(event) => setEditing({ ...editing, shortcut: event.target.value })}
              />
            </Field>
          )}
          <div className="divide-y divide-border">
            <ToggleRow
              label={def?.automatic ? 'Send this automatically' : 'Available to the team'}
              blurb={
                def?.automatic
                  ? 'Turn off to keep the text without sending it.'
                  : 'Turn off to hide it from the reply box without deleting it.'
              }
              checked={editing.isActive}
              onChange={(next) => setEditing({ ...editing, isActive: next })}
              accent={accent}
            />
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      wide
      title="Saved replies"
      onClose={onClose}
      footer={<ActionButton onClick={onClose} full>Done</ActionButton>}
    >
      {data.loading && !data.data ? (
        <PanelSkeleton rows={3} />
      ) : data.error ? (
        <PanelError message={data.error} onRetry={data.reload} />
      ) : (
        <div className="space-y-4">
          {SPACE_CANNED_KINDS.map((def) => {
            const Icon = spaceIcon(def.icon);
            const list = byKind[def.id] || [];
            const single = def.single === true;
            const existing = single ? list[0] : null;

            return (
              <div key={def.id}>
                <div className="flex items-start gap-2.5 mb-2">
                  <span className="grid place-items-center w-9 h-9 rounded-2xl shrink-0" style={{ background: `${accent}14`, color: accent }}>
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black">{def.label}</p>
                    <p className="text-[11px] text-muted-foreground">{def.blurb}</p>
                  </div>
                  {(!single || !existing) && list.length < SPACE_CANNED_LIMITS.perKind && (
                    <ActionButton
                      size="sm"
                      onClick={() =>
                        setEditing({ kind: def.id, title: '', body: '', shortcut: '', isActive: true })
                      }
                    >
                      <Plus size={12} /> {single ? 'Set up' : 'Add'}
                    </ActionButton>
                  )}
                </div>

                {def.id === 'AWAY' && existing?.isActive && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      goto('settings');
                    }}
                    className="mb-2 w-full text-left px-3 py-2 rounded-xl bg-muted/60 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    This only sends outside your business hours — set them in Settings → Messaging →
                  </button>
                )}

                {list.length === 0 ? (
                  <p className="px-3 py-2.5 rounded-2xl border border-dashed border-border text-[11px] text-muted-foreground">
                    Not set up yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {list.map((reply: any) => (
                      <div key={reply.id} className="flex items-start gap-2 p-3 rounded-2xl bg-muted/60">
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({
                              id: reply.id,
                              kind: reply.kind,
                              title: reply.title || '',
                              body: reply.body || '',
                              shortcut: reply.shortcut || '',
                              isActive: reply.isActive !== false,
                            })
                          }
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold truncate">{reply.title}</span>
                            {reply.shortcut && (
                              <span className="shrink-0 px-1.5 rounded-md bg-black/10 dark:bg-white/10 text-[10px] font-black">
                                {reply.shortcut}
                              </span>
                            )}
                            {reply.isActive === false && (
                              <span className="shrink-0 text-[10px] font-black uppercase text-muted-foreground">Off</span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground line-clamp-2">{reply.body}</span>
                        </button>
                        <div className="shrink-0 flex items-center gap-1">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={reply.isActive !== false}
                            aria-label={reply.isActive === false ? 'Turn on' : 'Turn off'}
                            disabled={busy}
                            onClick={() => toggleActive(reply, reply.isActive === false)}
                            className={`relative w-9 h-5 rounded-full transition-colors ${reply.isActive === false ? 'bg-muted' : ''}`}
                            style={reply.isActive === false ? undefined : { background: accent }}
                          >
                            <span
                              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                                reply.isActive === false ? 'left-0.5' : 'left-[18px]'
                              }`}
                            />
                          </button>
                          <IconButton label="Delete" tone="danger" busy={busy} onClick={() => remove(reply)}>
                            <Trash2 size={13} />
                          </IconButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
