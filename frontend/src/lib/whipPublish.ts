/**
 * Browser WHIP publisher (camera → same-origin proxy → MediaMTX).
 */

export type WhipPublishHandle = {
  stop: () => Promise<void>;
  stream: MediaStream;
};

function waitIceGatheringComplete(pc: RTCPeerConnection, timeoutMs = 4000): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') done();
    };
    pc.addEventListener('icegatheringstatechange', onChange);
    window.setTimeout(done, timeoutMs);
  });
}

/**
 * Start camera + WHIP publish via `/api/livestream/:id/whip`.
 */
export async function startWhipCameraPublish(opts: {
  whipPublishPath: string;
  token: string;
  facingMode?: 'user' | 'environment';
}): Promise<WhipPublishHandle> {
  const media = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: {
      facingMode: opts.facingMode || 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });

  for (const track of media.getTracks()) {
    pc.addTrack(track, media);
  }

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitIceGatheringComplete(pc);
  const local = pc.localDescription?.sdp;
  if (!local) {
    media.getTracks().forEach((t) => t.stop());
    pc.close();
    throw new Error('Failed to create SDP offer');
  }

  const res = await fetch(opts.whipPublishPath, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.token}`,
      'Content-Type': 'application/sdp',
    },
    body: local,
  });
  const answerSdp = await res.text();
  if (!res.ok) {
    media.getTracks().forEach((t) => t.stop());
    pc.close();
    let msg = answerSdp || `WHIP failed (${res.status})`;
    try {
      const j = JSON.parse(answerSdp);
      if (j.error) msg = j.error;
    } catch { /* plain sdp/text */ }
    throw new Error(msg);
  }

  await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

  const stop = async () => {
    try {
      await fetch(opts.whipPublishPath, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${opts.token}` },
      });
    } catch { /* ignore */ }
    media.getTracks().forEach((t) => t.stop());
    try {
      pc.close();
    } catch { /* ignore */ }
  };

  return { stop, stream: media };
}
