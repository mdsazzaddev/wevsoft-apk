import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Clapperboard, FileText, Image as ImageIcon, MessageSquare } from 'lucide-react';
import ReelUploadModal from '../ReelUploadModal';
import { CreatorPublishLibraryPanel } from './AdminPublishSettingsPanel';
import { draftHasContent, loadVideoPublishDraft, type VideoPublishDraft } from '../../lib/publishDraft';
import { applyBusinessCreatorNav, isBusinessAppHost } from '../../lib/creatorBusinessNav';
import { HubEmpty, HubPageHeader, HubRow, HubSection, hubBtnSecondary } from './hub/HubUI';

export const ContentStudioView = () => {
  const navigate = useNavigate();
  const [showReelUpload, setShowReelUpload] = useState(false);
  const [draft, setDraft] = useState<VideoPublishDraft | null>(null);
  const onBusiness = isBusinessAppHost();

  const goCreate = (path: string) => {
    if (onBusiness && (path.startsWith('/reels') || path.includes('video'))) {
      setShowReelUpload(true);
      return;
    }
    if (!applyBusinessCreatorNav(path, { navigate })) navigate(path);
  };

  const refreshDraft = () => {
    loadVideoPublishDraft().then((row) => {
      setDraft(row && draftHasContent(row) ? row : null);
    });
  };

  useEffect(() => {
    refreshDraft();
  }, [showReelUpload]);

  return (
    <div className="space-y-5">
      <HubPageHeader title="Content Studio" description="Create new content and pick up your drafts." />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <button
          type="button"
          onClick={() => goCreate('/reels/create')}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-surface-hover"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-foreground"><Clapperboard size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Video or short</span>
            <span className="block text-[13px] text-muted-foreground">Upload a reel or long video</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => goCreate('/create-post?type=image')}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-surface-hover"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-foreground"><ImageIcon size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Image or carousel</span>
            <span className="block text-[13px] text-muted-foreground">Photos with a caption</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => goCreate('/create-post?type=text')}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-surface-hover"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-foreground"><MessageSquare size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Text or article</span>
            <span className="block text-[13px] text-muted-foreground">Write a post</span>
          </span>
        </button>
      </div>

      <HubSection title="Drafts" flush>
        {draft ? (
          <HubRow
            icon={FileText}
            title={draft.publishSettings?.title || draft.fileName || 'Untitled draft'}
            description={`Saved ${draft.savedAt ? new Date(draft.savedAt).toLocaleString() : ''} · Step ${draft.step || 1}`}
            onClick={() => goCreate('/reels/create')}
            trailing={<ChevronRight size={18} className="text-muted-foreground" />}
          />
        ) : (
          <HubEmpty
            text="No drafts yet."
            action={<button type="button" onClick={() => goCreate('/reels/create')} className={hubBtnSecondary}>Start a video</button>}
          />
        )}
      </HubSection>

      <CreatorPublishLibraryPanel />

      <ReelUploadModal
        isOpen={showReelUpload}
        onClose={() => { setShowReelUpload(false); refreshDraft(); }}
        onSuccess={() => { setShowReelUpload(false); refreshDraft(); }}
      />
    </div>
  );
};
