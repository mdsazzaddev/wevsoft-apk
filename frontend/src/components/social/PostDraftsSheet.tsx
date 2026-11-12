import React, { useState } from 'react';
import { FileText, Loader2, Trash2, X } from 'lucide-react';
import { useEnBn } from '../../lib/useEnBn';

export interface ServerPostDraft {
  id: string;
  clientDraftId: string;
  status: string;
  content: string | null;
  editState: unknown;
  updatedAt: string;
}

export function draftEditState(d: ServerPostDraft): any {
  const raw = d.editState;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw && typeof raw === 'object' ? raw : null;
}

interface PostDraftsSheetProps {
  open: boolean;
  drafts: ServerPostDraft[];
  loading: boolean;
  activeClientDraftId?: string | null;
  onClose: () => void;
  onOpenDraft: (d: ServerPostDraft) => void;
  onDeleteDraft: (d: ServerPostDraft) => Promise<void>;
}

/** Saved (explicit Save Draft) post drafts from /api/post-drafts. */
export const PostDraftsSheet: React.FC<PostDraftsSheetProps> = ({ open, drafts, loading, activeClientDraftId, onClose, onOpenDraft, onDeleteDraft }) => {
  const { t, isBn } = useEnBn();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!open) return null;

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(isBn ? 'bn-BD' : undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose} data-testid="post-drafts-sheet">
      <div className="flex max-h-[min(85dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-background text-foreground shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h4 className="text-[14px] font-bold">{t('Drafts', 'ড্রাফট')}{drafts.length ? ` (${drafts.length})` : ''}</h4>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t('Close', 'বন্ধ')}>
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 size={18} className="animate-spin" /></div>
          ) : drafts.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">{t('No saved drafts yet.', 'এখনও কোনো সেভ করা ড্রাফট নেই।')}</p>
          ) : (
            drafts.map((d) => {
              const st = draftEditState(d);
              const media = Array.isArray(st?.media) ? st.media : [];
              const thumb = media[0];
              const caption = String(st?.content ?? d.content ?? '').trim();
              const busy = deletingId === d.id;
              return (
                <div key={d.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3" data-testid="post-draft-item">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {thumb?.url ? (
                      thumb.kind === 'video'
                        ? <video src={thumb.url} className="h-full w-full object-cover" muted preload="metadata" />
                        : <img src={thumb.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground"><FileText size={18} /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{caption || t('(No caption)', '(ক্যাপশন নেই)')}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {fmt(d.updatedAt)}{media.length ? ` · ${media.length} ${t('media', 'মিডিয়া')}` : ''}
                      {activeClientDraftId === d.clientDraftId ? <span className="ml-1 text-purple-600 dark:text-purple-300">· {t('Open now', 'এখন খোলা')}</span> : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button type="button" onClick={() => onOpenDraft(d)} className="rounded-lg bg-purple-600 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-purple-500" data-testid="post-draft-open">{t('Open', 'খুলুন')}</button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setDeletingId(d.id);
                        try { await onDeleteDraft(d); } finally { setDeletingId(null); }
                      }}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-50"
                      aria-label={t('Delete draft', 'ড্রাফট ডিলিট')}
                      data-testid="post-draft-delete"
                    >
                      {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};