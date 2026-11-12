import React, { useEffect } from 'react';
import { WevChatLayout } from '../components/wevchat/WevChatLayout';
import { useUiStore } from '../stores/uiStore';

export default function MessagesPage() {
  // Full-page WevChat replaces any glass desktop float over home/feed.
  useEffect(() => {
    useUiStore.getState().closeWevChatDesktopFloat();
  }, []);

  return (
    <div className="w-full h-full min-h-0 flex flex-col overflow-hidden p-0 bg-background">
      <WevChatLayout />
    </div>
  );
}
