import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { SfuRoomView } from '../components/sfu/SfuRoomView';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';

export default function SfuRoomPage() {
  const { isSpaceMode } = useSpaceIdentities();
  const { roomId } = useParams<{ roomId?: string }>();
  if (isSpaceMode) {
    return <Navigate to="/home" replace />;
  }
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-3 pb-12 sm:px-0">
      <SfuRoomView routeRoomId={roomId} />
    </div>
  );
}
