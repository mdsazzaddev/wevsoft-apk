import React from 'react';
import { AutomationShell } from '../components/wevchat-ai/automation/AutomationShell';

export default function AiWevChatPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* A <div>, not a <main>: DashboardLayout already owns the page's main
          landmark, and nesting a second one is invalid HTML that gives a
          screen reader two "main" regions to choose between (§27). */}
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight mb-2">AI Wev Chat Center</h1>
          <p className="text-muted-foreground text-lg">
            Manage your auto-reply agents, their audience, schedule, and connected providers.
          </p>
        </div>

        <AutomationShell variant="inline" isOpen onClose={() => {}} />
      </div>
    </div>
  );
}
