import { useSettingsTr } from '../../i18n/settingsBn';
import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Flashlight, ImagePlus, QrCode, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import jsQR from 'jsqr';

type Request = { id: string; device: string; approximateLocation: string | null };

function canUseLiveCamera(): boolean {
  return typeof window !== 'undefined'
    && window.isSecureContext
    && !!navigator.mediaDevices?.getUserMedia;
}

async function decodeQrFromImageSource(source: CanvasImageSource, width: number, height: number): Promise<string | null> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || width < 8 || height < 8) return null;
  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  return jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' })?.data || null;
}

async function decodeQrFromFile(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read that image.'));
      el.src = url;
    });
    return decodeQrFromImageSource(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function QrDeviceLoginPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const [payload, setPayload] = useState('');
  const [request, setRequest] = useState<Request | null>(null);
  const [opening, setOpening] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const scanLoop = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const stop = () => {
    if (scanLoop.current) {
      cancelAnimationFrame(scanLoop.current);
      scanLoop.current = 0;
    }
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setScanning(false);
  };

  useEffect(() => () => stop(), []);

  const scan = async (value = payload) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    try {
      const res = await fetch('/api/auth/qr/scan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrPayload: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not verify this QR code.');
      stop();
      setRequest(data);
    } catch (error: any) {
      toast.error(error.message || tr('QR scan failed'));
    }
  };

  const startJsQrLoop = () => {
    let last = 0;
    const tick = async (now: number) => {
      const el = video.current;
      if (!el || !stream.current) return;
      // ~5 fps — enough for QR, lighter on mid-range phones.
      if (now - last >= 200 && el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        last = now;
        try {
          const found = await decodeQrFromImageSource(el, el.videoWidth, el.videoHeight);
          if (found) {
            await scan(found);
            return;
          }
        } catch {
          /* keep scanning */
        }
      }
      scanLoop.current = requestAnimationFrame((t) => { void tick(t); });
    };
    scanLoop.current = requestAnimationFrame((t) => { void tick(t); });
  };

  const startBarcodeDetectorLoop = async () => {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) return false;
    const detector = new Detector({ formats: ['qr_code'] });
    const tick = async () => {
      if (!video.current || !stream.current) return;
      try {
        const codes = await detector.detect(video.current);
        if (codes[0]?.rawValue) {
          await scan(codes[0].rawValue);
          return;
        }
      } catch {
        /* next frame */
      }
      scanLoop.current = requestAnimationFrame(() => { void tick(); });
    };
    scanLoop.current = requestAnimationFrame(() => { void tick(); });
    return true;
  };

  const openCamera = async () => {
    setOpening(true);
    setCameraError('');
    stop();
    try {
      if (!canUseLiveCamera()) {
        setCameraError(
          window.isSecureContext
            ? tr('Live camera is not available in this browser. Use “Scan from photo” below.')
            : tr('Live camera needs HTTPS. On mobile, use “Scan from photo” to capture the QR code.'),
        );
        fileInput.current?.click();
        return;
      }
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      setScanning(true);
      if (video.current) {
        video.current.srcObject = stream.current;
        await video.current.play();
      }
      const usedNative = await startBarcodeDetectorLoop();
      if (!usedNative) startJsQrLoop();
    } catch (error: any) {
      const name = error?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError(tr('Camera permission was denied. Allow access in settings, or use “Scan from photo”.'));
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError(tr('No camera found. Try “Scan from photo” instead.'));
      } else {
        setCameraError(error?.message || tr('Could not open the camera. Use “Scan from photo”.'));
      }
    } finally {
      setOpening(false);
    }
  };

  const onPickImage = async (file: File | undefined) => {
    if (!file) return;
    setOpening(true);
    setCameraError('');
    try {
      const value = await decodeQrFromFile(file);
      if (!value) {
        setCameraError(tr('No QR code found in that photo. Retake a clearer shot.'));
        return;
      }
      setPayload(value);
      await scan(value);
    } catch (error: any) {
      setCameraError(error?.message || tr('Could not read a QR code from that photo.'));
    } finally {
      setOpening(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const decide = async (action: 'approve' | 'reject') => {
    if (!request) return;
    const res = await fetch(`/api/auth/qr/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: request.id }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || tr('This request is no longer valid'));
      return;
    }
    if (action === 'approve') toast.success(tr('Login approved'));
    setRequest(null);
    setPayload('');
  };

  if (request) {
    return (
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-4">
        <div className="flex gap-3">
          <ShieldCheck className="text-primary shrink-0" />
          <div>
            <h3 className="font-bold">{tr('Login request')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{tr('Do you want to sign in to Wevsoft on this computer?')}</p>
          </div>
        </div>
        <div className="rounded-xl bg-background border border-border p-3 text-sm">
          <p className="font-semibold">{request.device}</p>
          <p className="text-muted-foreground mt-1">
            {request.approximateLocation ? `Approximate location: ${request.approximateLocation}` : 'Location unavailable'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => void decide('reject')} className="rounded-xl border border-border py-2.5 font-semibold">{tr('Cancel')}</button>
          <button type="button" onClick={() => void decide('approve')} className="rounded-xl bg-primary text-primary-foreground py-2.5 font-bold">{tr('Approve')}</button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div>
        <h3 className="font-bold flex gap-2 items-center">
          <QrCode size={19} className="text-primary" /> Login with QR
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{tr('Only scan a Wevsoft QR code shown on your own computer.')}</p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-black aspect-video relative">
        {!scanning && (
          <div className="absolute inset-0 grid place-items-center text-white/70 pointer-events-none">
            <Camera />
          </div>
        )}
        <video
          ref={video}
          muted
          playsInline
          autoPlay
          className={`h-full w-full object-cover ${scanning ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className="absolute inset-8 border-2 border-primary rounded-2xl pointer-events-none" />
      </div>

      {cameraError && <p className="text-xs text-amber-600 dark:text-amber-400">{cameraError}</p>}

      <button
        type="button"
        disabled={opening}
        onClick={() => void openCamera()}
        className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-bold inline-flex justify-center items-center gap-2 disabled:opacity-60"
      >
        <Camera size={17} /> {tr('Scan with camera')}
      </button>

      <button
        type="button"
        disabled={opening}
        onClick={() => fileInput.current?.click()}
        className="w-full rounded-xl border border-border py-2.5 font-semibold inline-flex justify-center items-center gap-2 disabled:opacity-60"
      >
        <ImagePlus size={17} /> {tr('Scan from photo')}
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void onPickImage(e.target.files?.[0])}
      />

      <div className="flex gap-2">
        <input
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          placeholder={tr('Paste QR link')}
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm"
        />
        <button
          type="button"
          onClick={() => void scan()}
          disabled={!payload.trim()}
          className="rounded-xl border border-border px-3 font-semibold disabled:opacity-50"
          aria-label={tr('Scan pasted QR link')}
        >
          <CheckCircle2 size={18} />
        </button>
      </div>

      <p className="text-xs text-muted-foreground flex gap-1">
        <Flashlight size={13} className="shrink-0 mt-0.5" />
        {tr('If the camera won’t open on mobile, use “Scan from photo” — capture the QR and approve the login.')}
      </p>
    </section>
  );
}
