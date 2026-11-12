/**
 * Browser WHEP player (MediaMTX WebRTC read via same-origin `/api/livestream/:id/whep`).
 * Prefer over HLS when MediaMTX HLS muxer crashes on OBS B-frames.
 */

export type WhepPlayHandle = {
  stop: () => void;
  stream: MediaStream;
};

function waitIceGatheringComplete(pc: RTCPeerConnection, timeoutMs = 5000): Promise<void> {
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

export async function startWhepPlayback(opts: {
  whepPlayPath: string;
  token: string;
}): Promise<WhepPlayHandle> {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });
  const remote = new MediaStream();

  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });
  pc.ontrack = (ev) => {
    if (ev.track) remote.addTrack(ev.track);
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitIceGatheringComplete(pc);
  const local = pc.localDescription?.sdp;
  if (!local) {
    pc.close();
    throw new Error('Failed to create WHEP offer');
  }

  const res = await fetch(opts.whepPlayPath, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.token}`,
      'Content-Type': 'application/sdp',
    },
    body: local,
  });
  const answerSdp = await res.text();
  if (!res.ok) {
    pc.close();
    let msg = answerSdp || `WHEP failed (${res.status})`;
    try {
      const j = JSON.parse(answerSdp);
      if (j.error) msg = j.error;
    } catch {
      /* plain */
    }
    throw new Error(msg);
  }

  await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

  return {
    stream: remote,
    stop: () => {
      try {
        remote.getTracks().forEach((t) => t.stop());
        pc.close();
      } catch {
        /* ignore */
      }
    },
  };
}
