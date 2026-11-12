import React from 'react';
import { useParams } from 'react-router-dom';
import { LiveStreamingStudioView } from '../components/livestream/LiveStreamingStudioView';

export default function LivestreamPage() {
  const { streamId } = useParams<{ streamId?: string }>();
  // Watch room = immersive full viewport; lobby keeps a light padded shell.
  if (streamId) {
    return (
      <div className="h-full min-h-0 w-full bg-black text-white">
        <LiveStreamingStudioView />
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-3 pb-12 sm:px-4">
      <LiveStreamingStudioView />
    </div>
  );
}
