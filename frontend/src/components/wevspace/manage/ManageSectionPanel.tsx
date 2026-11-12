/**
 * Section registry for the management dashboard (MP2 §1).
 *
 * One lazy chunk per section, so opening Overview does not download the composer,
 * the charts and the ledger tables. The shell has already decided the viewer may
 * open this section; the panel still reads permissions from useManage() for the
 * finer-grained controls inside it, and the server re-checks every call (§24).
 */

import React, { Suspense, lazy } from 'react';
import type { SpaceDashboardSection } from '@wevsoft/shared/wevspace';
import { PanelSkeleton } from './manageUi';

const OverviewPanel = lazy(() => import('./OverviewPanel'));
const ContentPanel = lazy(() => import('./ContentPanel'));
const MessagesPanel = lazy(() => import('./MessagesPanel'));
const FollowersPanel = lazy(() => import('./FollowersPanel'));
const NotificationsPanel = lazy(() => import('./NotificationsPanel'));
// Analytics section = the Insights dashboard scoped to the Space (old AnalyticsPanel kept in the tree, unused).
const AnalyticsPanel = lazy(() => import('./SpaceInsightsPanel'));
const EventsPanel = lazy(() => import('./EventsPanel'));
const ProductsPanel = lazy(() => import('./ProductsPanel'));
const ReviewsPanel = lazy(() => import('./ReviewsPanel'));
const TeamPanel = lazy(() => import('./TeamPanel'));
const MonetizationPanel = lazy(() => import('./MonetizationPanel'));
const VerificationPanel = lazy(() => import('./VerificationPanel'));
const PromotionPanel = lazy(() => import('./PromotionPanel'));
const SettingsPanel = lazy(() => import('./SettingsPanel'));
const CustomProfilePanel = lazy(() => import('./CustomProfilePanel'));
const SecurityPanel = lazy(() => import('./SecurityPanel'));
const ActivityPanel = lazy(() => import('./ActivityPanel'));
const DeveloperConsolePanel = lazy(() => import('./DeveloperConsolePanel'));

const PANELS: Record<SpaceDashboardSection, React.ComponentType> = {
  overview: OverviewPanel,
  content: ContentPanel,
  wevchat: MessagesPanel,
  followers: FollowersPanel,
  notifications: NotificationsPanel,
  analytics: AnalyticsPanel,
  events: EventsPanel,
  products: ProductsPanel,
  reviews: ReviewsPanel,
  team: TeamPanel,
  monetization: MonetizationPanel,
  verification: VerificationPanel,
  promotion: PromotionPanel,
  settings: SettingsPanel,
  'custom-profile': CustomProfilePanel,
  security: SecurityPanel,
  activity: ActivityPanel,
  'developer-console': DeveloperConsolePanel,
};

export default function ManageSectionPanel({ section }: { section: SpaceDashboardSection }) {
  const Panel = PANELS[section] || OverviewPanel;
  return (
    <Suspense fallback={<PanelSkeleton rows={2} tall />}>
      <Panel />
    </Suspense>
  );
}
