import { lazy } from 'react';
import { Route } from 'react-router-dom';

/**
 * Developer-platform console routes registered in one place (App.tsx renders {platformRoutes}).
 * Each entry lazy-loads its page the same way the other console pages do.
 */
const page = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) => lazy(() => load().then((m) => ({ default: m[name] })));

const AdsApiPage = page(() => import('./pages/PlatformAdsPage'), 'AdsApiPage');
const PermissionsReviewPage = page(() => import('./pages/PlatformSecurityPages'), 'PermissionsReviewPage');
const CallbacksPage = page(() => import('./pages/PlatformSecurityPages'), 'CallbacksPage');
const ServiceAccountsPage = page(() => import('./pages/PlatformAuthPages'), 'ServiceAccountsPage');
const TokenDebuggerPage = page(() => import('./pages/PlatformAuthPages'), 'TokenDebuggerPage');
const DeviceVerificationPage = page(() => import('./pages/PlatformAuthPages'), 'DeviceVerificationPage');
const WebhookSchemasPage = page(() => import('./pages/PlatformGrowthPages'), 'WebhookSchemasPage');
const PushPage = page(() => import('./pages/PlatformGrowthPages'), 'PushPage');
const CatalogFeedsPage = page(() => import('./pages/PlatformGrowthPages'), 'CatalogFeedsPage');
const AudiencesPage = page(() => import('./pages/PlatformGrowthPages'), 'AudiencesPage');
const TrustCompliancePage = page(() => import('./pages/PlatformTrustPages'), 'TrustCompliancePage');
const DeveloperSupportPage = page(() => import('./pages/PlatformTrustPages'), 'DeveloperSupportPage');
const OpenIdConnectPage = page(() => import('./pages/PlatformSecurityPages'), 'OpenIdConnectPage');
const AppMarketPage = page(() => import('./pages/Phase5Pages'), 'AppMarketPage');
const AssistantPage = page(() => import('./pages/Phase5Pages'), 'AssistantPage');
const CommunityPage = page(() => import('./pages/Phase5Pages'), 'CommunityPage');
const SharingDebuggerPage = page(() => import('./pages/SharingDebuggerPage').then((m) => ({ default: m.SharingDebuggerPage } as any)), 'default');

export const platformRoutes = [
  <Route key="sharing-debugger" path="/developer/sharing-debugger" element={<SharingDebuggerPage />} />,
  <Route key="ads" path="/developer/ads" element={<AdsApiPage />} />,
  <Route key="permissions" path="/developer/permissions" element={<PermissionsReviewPage />} />,
  <Route key="callbacks" path="/developer/callbacks" element={<CallbacksPage />} />,
  <Route key="oidc" path="/developer/oidc" element={<OpenIdConnectPage />} />,
  <Route key="service-accounts" path="/developer/service-accounts" element={<ServiceAccountsPage />} />,
  <Route key="token-debugger" path="/developer/token-debugger" element={<TokenDebuggerPage />} />,
  <Route key="device" path="/device" element={<DeviceVerificationPage />} />,
  <Route key="webhook-schemas" path="/developer/webhook-schemas" element={<WebhookSchemasPage />} />,
  <Route key="push" path="/developer/push" element={<PushPage />} />,
  <Route key="catalog-feeds" path="/developer/catalog-feeds" element={<CatalogFeedsPage />} />,
  <Route key="audiences" path="/developer/audiences" element={<AudiencesPage />} />,
  <Route key="compliance" path="/developer/compliance" element={<TrustCompliancePage />} />,
  <Route key="dev-support" path="/developer/support" element={<DeveloperSupportPage />} />,
  <Route key="app-market" path="/developer/app-market" element={<AppMarketPage />} />,
  <Route key="assistant" path="/developer/assistant" element={<AssistantPage />} />,
  <Route key="community" path="/developer/community" element={<CommunityPage />} />,
];
