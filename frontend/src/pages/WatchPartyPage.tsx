import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { WatchPartyRoomView } from '../components/watchparty/WatchPartyRoomView';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';

export default function WatchPartyPage() {
  const { isSpaceMode } = useSpaceIdentities();
  const { code } = useParams<{ code?: string }>();
  if (isSpaceMode) {
    return <Navigate to="/home" replace />;
  }
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 px-3 sm:px-0">
      <WatchPartyRoomView routeCode={code} />
    </div>
  );
}
