import React from 'react';
import { Navigate } from 'react-router-dom';
import { AIStudySuite } from '../components/academy/AIStudySuite';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';

export default function AiStudyPage() {
  const { isSpaceMode } = useSpaceIdentities();
  if (isSpaceMode) {
    return <Navigate to="/home" replace />;
  }
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <AIStudySuite />
    </div>
  );
}
