import React from 'react';
import type { DeveloperApp } from './devApi';
import { WebhookManager } from './console/pages/ToolsPages';

/**
 * Legacy per-app webhooks tab. The app details page uses WebhookManager directly; this keeps
 * any old import working and shows the same endpoints + per-event "Webhook fields" switches.
 */
export function WebhooksTab({ app }: { app: DeveloperApp }) {
  return <WebhookManager fixedAppId={app.id} />;
}