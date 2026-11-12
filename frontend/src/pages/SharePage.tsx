import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ShareStudio from '../components/create-post/ShareStudio';

/** Route `/share?url=...&title=...` — full-page share studio. */
export default function SharePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const url = params.get('url') || (typeof window !== 'undefined' ? window.location.origin : '/');
  const title = params.get('title') || 'Share on Wevsoft';

  const safeUrl = useMemo(() => url, [url]);

  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-lg flex-col px-3 py-4 sm:px-4">
      <ShareStudio
        open
        mode="page"
        url={safeUrl}
        title={title}
        onClose={() => {
          if (window.history.length > 1) navigate(-1);
          else navigate('/home');
        }}
      />
    </div>
  );
}