import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2, Clock3, MapPin, QrCode, RefreshCw, ShieldCheck, WifiOff } from 'lucide-react';
import { getSocket } from '../../lib/socket';

type QrRequest = { sessionId: string; qrPayload: string; browserSecret: string; expiresAt: string; device: string; approximateLocation: string | null };
type State = 'idle' | 'loading' | 'ready' | 'waiting' | 'approved' | 'expired' | 'cancelled' | 'error';

export default function QrLoginCard({ onSuccess, className = '' }: { onSuccess: (token: string, user: Record<string, unknown>) => void; className?: string }) {
  const [state, setState] = useState<State>('idle');
  const [request, setRequest] = useState<QrRequest | null>(null);
  const [image, setImage] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState('QR login is currently unavailable.');
  const timer = useRef<number | null>(null);
  const requestRef = useRef<QrRequest | null>(null);
  const createGen = useRef(0);

  const params = useCallback((item: QrRequest) => new URLSearchParams({ sessionId: item.sessionId }).toString(), []);

  const cancelRemote = useCallback(async (item: QrRequest | null) => {
    if (!item) return;
    try {
      await fetch('/api/auth/qr/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-QR-Browser-Secret': item.browserSecret },
        body: JSON.stringify({ sessionId: item.sessionId, browserSecret: item.browserSecret }),
      });
    } catch {
      /* best-effort */
    }
  }, []);

  const create = useCallback(async () => {
    const gen = ++createGen.current;
    const previous = requestRef.current;
    requestRef.current = null;
    void cancelRemote(previous);
    setState('loading');
    setImage('');
    setRequest(null);
    setErrorMessage('QR login is currently unavailable.');
    try {
      const res = await fetch('/api/auth/qr/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json().catch(() => ({}));
      if (gen !== createGen.current) return;
      if (!res.ok) {
        setErrorMessage(typeof data.error === 'string' ? data.error : 'QR login is currently unavailable.');
        setState('error');
        return;
      }
      const next = data as QrRequest;
      const dataUrl = await QRCode.toDataURL(next.qrPayload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 264,
        color: { dark: '#111827', light: '#ffffff' },
      });
      if (gen !== createGen.current) return;
      requestRef.current = next;
      setImage(dataUrl);
      setRequest(next);
      setState('ready');
    } catch {
      if (gen !== createGen.current) return;
      setErrorMessage('Could not reach the server. Please try again.');
      setState('error');
    }
  }, [cancelRemote]);

  // Desktop is the pairing surface, so make the QR immediately visible in the
  // laptop/PC login composition. Phone login intentionally keeps the normal
  // login flow; its scanner remains inside Settings → Login with QR.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (window.matchMedia('(min-width: 768px)').matches) create();
    return () => {
      createGen.current += 1;
      void cancelRemote(requestRef.current);
      requestRef.current = null;
    };
  }, [create, cancelRemote]);

  const consume = useCallback(async (item: QrRequest) => {
    const res = await fetch('/api/auth/qr/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: item.sessionId, browserSecret: item.browserSecret }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrorMessage(typeof data.error === 'string' ? data.error : 'Unable to finish login.');
      setState(data.code === 'QR_USED' ? 'cancelled' : 'error');
      return;
    }
    onSuccess(data.token, data.user);
  }, [onSuccess]);

  useEffect(() => {
    if (!request || !['ready', 'waiting', 'approved'].includes(state)) return;
    const update = () => {
      const left = Math.max(0, Math.ceil((new Date(request.expiresAt).getTime() - Date.now()) / 1000));
      setSeconds(left);
      if (!left && state !== 'approved') setState('expired');
    };
    update();
    timer.current = window.setInterval(update, 1000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [request, state]);

  useEffect(() => {
    if (!request || !['ready', 'waiting'].includes(state)) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/auth/qr/status?${params(request)}`, {
          headers: { 'X-QR-Browser-Secret': request.browserSecret },
        });
        const data = await res.json().catch(() => ({}));
        if (!alive || !res.ok) return;
        if (data.status === 'APPROVED') {
          setState('approved');
          await consume(request);
        } else if (data.status === 'PENDING_APPROVAL') setState('waiting');
        else if (data.status === 'EXPIRED') setState('expired');
        else if (['CANCELLED', 'REJECTED', 'CONSUMED'].includes(data.status)) setState('cancelled');
      } catch {
        /* socket / next poll can recover */
      }
    };
    const socket = getSocket();
    socket.emit('qr:watch', { sessionId: request.sessionId, browserSecret: request.browserSecret });
    const approved = () => {
      if (alive) {
        setState('approved');
        void consume(request);
      }
    };
    socket.on('qr:approved', approved);
    void poll();
    const interval = window.setInterval(() => { void poll(); }, 2500);
    return () => {
      alive = false;
      window.clearInterval(interval);
      socket.off('qr:approved', approved);
    };
  }, [request, state, params, consume]);

  const label =
    state === 'waiting'
      ? 'Waiting for approval on your phone…'
      : state === 'approved'
        ? 'Finishing sign-in…'
        : 'Scan with the Wevsoft mobile app';
  const mm = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <section className={`rounded-2xl border border-border bg-muted/30 p-4 text-center ${className}`} aria-live="polite">
      {state === 'idle' ? (
        <button
          type="button"
          onClick={() => void create()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
        >
          <QrCode size={18} /> Login with Wevsoft Mobile
        </button>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-center gap-2 text-sm font-bold">
            <ShieldCheck size={17} className="text-primary" /> Secure QR Login
          </div>
          {image && ['ready', 'waiting', 'approved'].includes(state) && (
            <img className="mx-auto h-48 w-48 rounded-xl bg-white p-2" src={image} alt="Wevsoft QR login code" />
          )}
          {state === 'loading' && <div className="py-16 text-sm text-muted-foreground">Generating QR code…</div>}
          {state === 'expired' && (
            <div className="py-12">
              <Clock3 className="mx-auto mb-2 text-amber-500" />
              <p className="font-semibold">This QR code has expired</p>
            </div>
          )}
          {state === 'cancelled' && (
            <div className="py-12">
              <WifiOff className="mx-auto mb-2 text-muted-foreground" />
              <p className="font-semibold">This login request was cancelled</p>
            </div>
          )}
          {state === 'error' && (
            <div className="py-12">
              <p className="font-semibold">{errorMessage}</p>
            </div>
          )}
          {['ready', 'waiting', 'approved'].includes(state) && (
            <>
              <p className="mt-3 text-xs text-muted-foreground">{label}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold tabular-nums">
                <Clock3 size={15} /> {mm}
              </p>
              {request?.approximateLocation && (
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin size={13} /> {request.approximateLocation}
                </p>
              )}
              {state === 'approved' && (
                <p className="mt-2 inline-flex items-center justify-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 size={14} /> Approved
                </p>
              )}
            </>
          )}
          {['expired', 'cancelled', 'error'].includes(state) && (
            <button
              type="button"
              onClick={() => void create()}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
            >
              <RefreshCw size={15} /> Generate new QR
            </button>
          )}
        </>
      )}
    </section>
  );
}
