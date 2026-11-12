import { useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReelUploadModal from '../components/ReelUploadModal';

/** Path of the dedicated Reel Creator page. */
export const REEL_CREATOR_PATH = '/reels/create';

/**
 * Dedicated full-page Creator Studio for uploading a Reel
 * (pick video -> edit/preview -> caption & details -> publish).
 * Reuses the existing ReelUploadModal workflow in "page" variant.
 */
export default function ReelCreatorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const finished = useRef(false);
  const from = (location.state as { from?: string } | null)?.from;

  const leave = useCallback(() => {
    if (finished.current) return;
    if (from) navigate(from, { replace: true });
    else if (window.history.length > 1) navigate(-1);
    else navigate('/reels', { replace: true });
  }, [from, navigate]);

  const done = useCallback(() => {
    finished.current = true;
    navigate('/reels', { replace: true, state: { refreshReels: Date.now() } });
  }, [navigate]);

  return <ReelUploadModal variant="page" isOpen onClose={leave} onSuccess={done} />;
}
