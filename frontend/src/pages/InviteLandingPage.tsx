import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { dismissWevSplash } from '../lib/wevSplash';

export default function InviteLandingPage() {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    dismissWevSplash();
    const value = String(code || '').trim().toUpperCase();
    if (value) {
      try {
        localStorage.setItem('wev_ref', value);
      } catch {
        /* ignore */
      }
    }
    navigate(value ? `/auth?ref=${encodeURIComponent(value)}` : '/auth', { replace: true });
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm font-semibold">
      Opening invite…
    </div>
  );
}
