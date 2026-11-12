import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Cloud,
  CreditCard,
  ExternalLink,
  FileCode,
  FileText,
  HardDrive,
  Key,
  Layers,
  Link2,
  Lock,
  MessageCircle,
  Package,
  Puzzle,
  Share2,
  Shield,
  Sparkles,
  Terminal,
  Upload,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import api from '../../../../lib/api';
import { cx } from '../../devUi';
import { useDevAccount } from '../accountContext';
import { GoogleIcon, FacebookIcon, WevChatIcon } from '../BrandIcons';
import {
  Card,
  CodeBox,
  ConsolePage,
  EmptyState,
  ErrorCard,
  InfoNote,
  KV,
  LoadingRows,
  Pill,
  StatTile,
  appScopes,
  btn,
  fmtDate,
  tdCls,
  thCls,
} from '../ui';

/* ------------------------------------------------------------------ */
/* 1. Identity & Connected Platforms                                  */
/* ------------------------------------------------------------------ */

interface IdentityFederationProvider {
  id: string;
  name: string;
  protocol: 'OpenID Connect 1.0' | 'OAuth 2.0';
  scope: string;
  status: 'active' | 'supported' | 'configurable';
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const FEDERATION_PROVIDERS: IdentityFederationProvider[] = [
  {
    id: 'google',
    name: 'Google Identity',
    protocol: 'OpenID Connect 1.0',
    scope: 'openid profile email',
    status: 'active',
    description: 'Sign In with Google, Google One Tap, and Chrome Credential Management federation.',
    Icon: GoogleIcon,
  },
  {
    id: 'facebook',
    name: 'Meta / Facebook Login',
    protocol: 'OAuth 2.0',
    scope: 'public_profile email',
    status: 'active',
    description: 'Facebook Login button, limited login, and Instagram graph cross-authentication.',
    Icon: FacebookIcon,
  },
  {
    id: 'github',
    name: 'GitHub OAuth',
    protocol: 'OAuth 2.0',
    scope: 'read:user user:email',
    status: 'active',
    description: 'Developer identity federation for open-source tools, CI/CD, and developer platforms.',
    Icon: () => <FileCode className="w-[16px] h-[16px] text-[#24292f]" />,
  },
  {
    id: 'discord',
    name: 'Discord OAuth2',
    protocol: 'OAuth 2.0',
    scope: 'identify email guilds',
    status: 'active',
    description: 'Community and bot account federation for Discord guilds and gaming apps.',
    Icon: () => <Users className="w-[16px] h-[16px] text-[#5865F2]" />,
  },
  {
    id: 'apple',
    name: 'Sign in with Apple',
    protocol: 'OpenID Connect 1.0',
    scope: 'name email',
    status: 'configurable',
    description: 'Private relay authentication for iOS apps and Safari web applications.',
    Icon: () => <Lock className="w-[16px] h-[16px] text-black dark:text-white" />,
  },
];

export function ConnectedAppsPage() {
  return (
    <ConsolePage
      group="Integrations"
      title="Connected Platforms & Identity Federation"
      description="Leverage Wevsoft Single Sign-On (SSO) and federated identity providers for third-party developer applications."
      requiresAccount={false}
      actions={
        <div className="flex gap-2">
          <Link to="/developer/oauth/clients" className={cx(btn.secondary, btn.sm)}>
            OAuth Clients
          </Link>
          <Link to="/developer/oidc" className={cx(btn.primary, btn.sm)}>
            OpenID Connect Spec
          </Link>
        </div>
      }
    >
      <div className="grid gap-3 min-[640px]:grid-cols-3">
        <StatTile icon={Link2} label="Federated Providers" value={FEDERATION_PROVIDERS.length} tone="green" />
        <StatTile icon={Shield} label="Core Protocol" value="OIDC 1.0" hint="RS256 JWT ID tokens & JWKS" />
        <StatTile icon={Zap} label="Token Exchange" value="RFC 8693" hint="Cross-platform token exchange" />
      </div>

      <Card
        title="Federated Identity Providers"
        className="mt-4"
        description="Supported third-party identity ecosystems available through Wevsoft OAuth 2.0"
        bodyClassName="!px-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr>
                <th className={thCls}>Provider</th>
                <th className={thCls}>Protocol</th>
                <th className={thCls}>Default Scope</th>
                <th className={thCls}>Status</th>
                <th className={cx(thCls, 'text-right')}>Action</th>
              </tr>
            </thead>
            <tbody>
              {FEDERATION_PROVIDERS.map((p) => {
                const Icon = p.Icon;
                return (
                  <tr key={p.id}>
                    <td className={tdCls}>
                      <span className="flex items-center gap-[10px]">
                        <span className="w-[28px] h-[28px] rounded-[6px] border border-[var(--dc-border)] bg-white grid place-items-center shrink-0">
                          <Icon className="w-[16px] h-[16px]" />
                        </span>
                        <div>
                          <span className="font-semibold text-[var(--dc-text)] block">{p.name}</span>
                          <span className="text-[10.5px] text-[var(--dc-muted)]">{p.description}</span>
                        </div>
                      </span>
                    </td>
                    <td className={cx(tdCls, 'text-[11.5px] font-mono')}>{p.protocol}</td>
                    <td className={cx(tdCls, 'text-[11px] font-mono text-[var(--dc-muted)]')}>{p.scope}</td>
                    <td className={tdCls}>
                      <Pill tone={p.status === 'active' ? 'green' : 'gray'}>
                        {p.status === 'active' ? 'Available' : 'Configurable'}
                      </Pill>
                    </td>
                    <td className={cx(tdCls, 'text-right')}>
                      <Link to="/developer/oauth/clients" className={cx(btn.secondary, btn.sm)}>
                        Configure App
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 min-[1100px]:grid-cols-2 mt-4">
        <Card title="Federated Authorization Flow" description="Redirect user to initiate Single Sign-On">
          <CodeBox
            code={`// Redirect user to Wevsoft OAuth Authorization Endpoint
const authUrl = new URL('${window.location.origin}/api/oauth/authorize');
authUrl.searchParams.set('client_id', 'YOUR_CLIENT_ID');
authUrl.searchParams.set('redirect_uri', 'https://yourapp.com/callback');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', 'openid profile email');
authUrl.searchParams.set('code_challenge', pkceChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

window.location.href = authUrl.toString();`}
          />
          <InfoNote className="mt-3">
            Apps using OpenID Connect automatically receive an RS256-signed <code className="dc-code">id_token</code> JWT verifiable via the public JWKS endpoint at <code className="dc-code">/.well-known/jwks.json</code>.
          </InfoNote>
        </Card>

        <Card title="Token Exchange (RFC 8693 & RFC 7523)" description="Exchange authorization code or service assertion">
          <CodeBox
            code={`curl -X POST '${window.location.origin}/api/oauth/token' \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -d 'grant_type=authorization_code' \\
  -d 'client_id=YOUR_CLIENT_ID' \\
  -d 'client_secret=YOUR_CLIENT_SECRET' \\
  -d 'code=AUTH_CODE' \\
  -d 'redirect_uri=https://yourapp.com/callback' \\
  -d 'code_verifier=YOUR_PKCE_VERIFIER'`}
          />
          <div className="mt-3 flex gap-2">
            <Link to="/developer/token-debugger" className={cx(btn.primary, btn.sm)}>
              Token Debugger
            </Link>
            <Link to="/developer/docs#token" className={cx(btn.secondary, btn.sm)}>
              OAuth Docs
            </Link>
          </div>
        </Card>
      </div>
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Social Platforms & Share Integrations                           */
/* ------------------------------------------------------------------ */

export function SocialPlatformsPage() {
  return (
    <ConsolePage
      group="Integrations"
      title="Social Platforms & Viral Growth"
      description="Integrate Wevsoft social graph, feed posting, and viral sharing intents into external web and mobile apps."
      requiresAccount={false}
      actions={
        <Link to="/developer/embed" className={cx(btn.primary, btn.sm)}>
          Embed Widgets & Badges
        </Link>
      }
    >
      <div className="grid gap-3 min-[640px]:grid-cols-3">
        <StatTile icon={Share2} label="Web Share Intent" value="/share?url=..." tone="green" />
        <StatTile icon={Package} label="Embeddable Widgets" value="Post & Profile" hint="1-click iframe or script" />
        <StatTile icon={Shield} label="Graph Scopes" value="6 Permissions" hint="posts, stories, reels, relations" />
      </div>

      <div className="grid gap-4 min-[1100px]:grid-cols-2 mt-4">
        <Card title="Web & Mobile Share Intent" description="Let users share content directly to their Wevsoft feed">
          <p className="text-[12px] text-[var(--dc-text-2)] mb-3">
            Any website or mobile application can trigger a share dialog by dispatching a URL intent. No API key or user authentication is required for basic sharing.
          </p>
          <CodeBox
            code={`<!-- Web Share Button Link -->
<a 
  href="${window.location.origin}/share?url=\${encodeURIComponent(window.location.href)}&title=\${encodeURIComponent(document.title)}"
  target="_blank" 
  rel="noopener noreferrer"
  class="wevsoft-share-button"
>
  Share on Wevsoft
</a>`}
          />
          <div className="mt-4 p-3 rounded-lg border border-[var(--dc-border)] bg-[var(--dc-bg)]">
            <p className="text-[11px] font-semibold text-[var(--dc-text)]">Supported Query Parameters:</p>
            <ul className="text-[10.5px] text-[var(--dc-muted)] space-y-1 mt-1 font-mono">
              <li><b className="text-[var(--dc-text)]">url</b>: Target link to preview and attach</li>
              <li><b className="text-[var(--dc-text)]">title</b>: Pre-filled post caption or headline</li>
              <li><b className="text-[var(--dc-text)]">hashtags</b>: Comma-separated tag list</li>
            </ul>
          </div>
        </Card>

        <Card title="Programmatic Social Graph API" description="Publish posts, reels, or stories on behalf of consenting users">
          <CodeBox
            code={`curl -X POST '${window.location.origin}/api/developer/posts' \\
  -H 'Authorization: Bearer ACCESS_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "content": "Exciting news! Check out our new update.",
    "privacy": "PUBLIC",
    "mediaUrls": [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"
    ]
  }'`}
          />
          <InfoNote className="mt-3">
            Requires <code className="dc-code">posts.write</code> scope. For multimedia posts, upload files through the <Link to="/developer/integrations/storage" className="underline">Media Upload API</Link> first.
          </InfoNote>
          <div className="mt-3 flex gap-2">
            <Link to="/developer/api-explorer" className={cx(btn.primary, btn.sm)}>
              Try in API Explorer
            </Link>
            <Link to="/developer/api-reference" className={cx(btn.secondary, btn.sm)}>
              API Reference
            </Link>
          </div>
        </Card>
      </div>
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* 3. WevChat Messaging Integrations                                  */
/* ------------------------------------------------------------------ */

export function WevChatIntegrationsPage() {
  const { apps, registered } = useDevAccount();
  const withScope = apps.filter((a) => appScopes(a).includes('messages.write'));

  return (
    <ConsolePage
      group="Integrations"
      title="WevChat Messaging Integrations"
      description="Build customer support bots, order alerts, and interactive direct messaging workflows through WevChat."
      requiresAccount={false}
      actions={
        <Link to="/wevchat" className={cx(btn.secondary, btn.sm)}>
          Open WevChat <ExternalLink size={12} />
        </Link>
      }
    >
      <div className="grid gap-3 min-[640px]:grid-cols-3">
        <StatTile icon={MessageCircle} label="Messaging Protocol" value="REST & WebSocket" tone="green" />
        <StatTile icon={Shield} label="Required Scope" value="messages.write" hint="Subject to security review" />
        <StatTile icon={Bot} label="App Messages" value={withScope.length} hint="Apps with messaging scope" />
      </div>

      <div className="grid gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_360px] mt-4">
        <Card title={<><MessageCircle size={15} className="text-[var(--dc-green)]" /> Direct Messaging API</>} description="POST /api/developer/messages">
          <CodeBox
            code={`curl -X POST '${window.location.origin}/api/developer/messages' \\
  -H 'Authorization: Bearer ACCESS_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{ 
    "receiverId": "TARGET_USER_ID", 
    "text": "Your order #789456 has been confirmed and is out for delivery! 🚀" 
  }'`}
          />
          <InfoNote className="mt-3">
            The endpoint requires the <code className="dc-code">messages.write</code> scope. Sensitive scopes require justification and security review before live production access is unlocked.
          </InfoNote>
          <div className="mt-3 flex gap-2">
            <Link to="/developer/permissions" className={cx(btn.primary, btn.sm)}>
              Request Scope Review
            </Link>
            <Link to="/developer/api-reference#ep-messages" className={cx(btn.secondary, btn.sm)}>
              API Reference
            </Link>
          </div>
        </Card>

        <Card title="Your Configured Apps" description="Applications requesting messaging permissions">
          {!registered ? (
            <p className="text-[12px] text-[var(--dc-muted)]">Register as a developer to inspect applications.</p>
          ) : apps.length === 0 ? (
            <p className="text-[12px] text-[var(--dc-muted)]">No applications created yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--dc-border)]">
              {apps.map((a) => (
                <li key={a.id} className="py-[10px] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/developer/apps/${a.id}`} className="text-[12px] font-semibold truncate block hover:text-[var(--dc-blue)]">
                      {a.name}
                    </Link>
                    <span className="text-[10px] font-mono text-[var(--dc-muted)]">{a.clientId}</span>
                  </div>
                  {withScope.includes(a) ? (
                    <Pill tone="green">messages.write</Pill>
                  ) : (
                    <Pill tone="gray">Unscoped</Pill>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* 4. AI Providers & Gateway Suite                                    */
/* ------------------------------------------------------------------ */

const AI_SUITE_ENDPOINTS = [
  {
    name: 'Chat Completions',
    path: 'POST /api/developer/ai/chat/completions',
    scope: 'profile',
    desc: 'OpenAI-compatible generative chat routing with multi-provider fallback.',
  },
  {
    name: 'Vector Embeddings',
    path: 'POST /api/developer/ai/embeddings',
    scope: 'ai.embeddings',
    desc: 'Generate dense 768-dim vector embeddings for semantic search and RAG.',
  },
  {
    name: 'Content Moderation',
    path: 'POST /api/developer/ai/moderation',
    scope: 'ai.moderation',
    desc: 'Evaluate text for toxicity, hate speech, self-harm, and policy violations.',
  },
  {
    name: 'Multilingual Translation',
    path: 'POST /api/developer/ai/translate',
    scope: 'ai.translate',
    desc: 'Translate text across 50+ languages with automatic dialect detection.',
  },
  {
    name: 'Image Generation',
    path: 'POST /api/developer/ai/images/generate',
    scope: 'ai.generate',
    desc: 'Generate photorealistic images and digital illustrations from prompts.',
  },
];

export function AIProvidersPage() {
  return (
    <ConsolePage
      group="Integrations"
      title="AI Providers & Gateway Suite"
      description="Zero-cost AI routing, vector embeddings, moderation, and LLM inference for developer applications."
      requiresAccount={false}
      actions={
        <Link to="/settings?opt=ai_provider_setup" className={cx(btn.secondary, btn.sm)}>
          Manage BYOK Keys <ExternalLink size={12} />
        </Link>
      }
    >
      <div className="grid gap-3 min-[640px]:grid-cols-3">
        <StatTile icon={Bot} label="Supported Engines" value="Gemini, OpenAI, Claude" tone="blue" />
        <StatTile icon={Sparkles} label="Token Billing" value="Zero Cost BYOK" hint="Metered to user or tenant quota" />
        <StatTile icon={Shield} label="Privacy Guard" value="PII Redaction" hint="Pre-flight safety inspection" />
      </div>

      <Card title="Developer AI Gateway Suite" className="mt-4" description="Programmatic AI endpoints available across the platform">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr>
                <th className={thCls}>Capability</th>
                <th className={thCls}>Endpoint</th>
                <th className={thCls}>Required Scope</th>
                <th className={thCls}>Description</th>
              </tr>
            </thead>
            <tbody>
              {AI_SUITE_ENDPOINTS.map((ep) => (
                <tr key={ep.name}>
                  <td className={cx(tdCls, 'font-semibold text-[var(--dc-text)]')}>{ep.name}</td>
                  <td className={cx(tdCls, 'font-mono text-[11px] text-[var(--dc-blue)]')}>{ep.path}</td>
                  <td className={tdCls}><Pill tone="blue">{ep.scope}</Pill></td>
                  <td className={cx(tdCls, 'text-[11.5px] text-[var(--dc-muted)]')}>{ep.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 min-[1100px]:grid-cols-2 mt-4">
        <Card title="Chat Completions Integration" description="OpenAI-compatible request body format">
          <CodeBox
            code={`curl -X POST '${window.location.origin}/api/developer/ai/chat/completions' \\
  -H 'Authorization: Bearer ACCESS_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "model": "gemini-2.0-flash",
    "messages": [
      { "role": "system", "content": "You are a helpful customer concierge." },
      { "role": "user", "content": "Recommend three popular local dishes in Dhaka." }
    ],
    "temperature": 0.7,
    "max_tokens": 512
  }'`}
          />
        </Card>

        <Card title="Vector Embeddings & Semantic Search" description="Generate embeddings for vector databases (Pinecone, pgvector)">
          <CodeBox
            code={`curl -X POST '${window.location.origin}/api/developer/ai/embeddings' \\
  -H 'Authorization: Bearer ACCESS_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "model": "text-embedding-004",
    "input": [
      "Order #1042 was delivered successfully",
      "Customer requested return for defective headphone"
    ]
  }'`}
          />
          <div className="mt-3 flex gap-2">
            <Link to="/developer/api-explorer" className={cx(btn.primary, btn.sm)}>
              Try in API Explorer
            </Link>
            <Link to="/developer/docs#ai" className={cx(btn.secondary, btn.sm)}>
              AI Gateway Docs
            </Link>
          </div>
        </Card>
      </div>
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Storage & Binary Files Integration                              */
/* ------------------------------------------------------------------ */

export function StorageFilesPage() {
  return (
    <ConsolePage
      group="Integrations"
      title="Media & Object Storage Integration"
      description="Upload and serve multimedia assets through the Wevsoft global CDN and S3-compatible storage pipeline."
      requiresAccount={false}
    >
      <div className="grid gap-3 min-[640px]:grid-cols-3">
        <StatTile icon={Upload} label="Max Upload Size" value="100 MB" tone="blue" />
        <StatTile icon={Cloud} label="Storage Backend" value="S3 / R2 / GCS" hint="Edge-accelerated multi-region" />
        <StatTile icon={Shield} label="Security Guard" value="XSS & MIME Check" hint="SVG/executable neutralization" />
      </div>

      <div className="grid gap-4 min-[1100px]:grid-cols-2 mt-4">
        <Card
          title={<><Upload size={15} className="text-[var(--dc-blue)]" /> Multipart Media Upload API</>}
          description="POST /api/developer/media/upload (multipart/form-data, field 'file')"
        >
          <CodeBox
            code={`curl -X POST '${window.location.origin}/api/developer/media/upload' \\
  -H 'Authorization: Bearer ACCESS_TOKEN' \\
  -F 'file=@photo.jpg'`}
          />
          <InfoNote className="mt-3">
            Uploading requires the <code className="dc-code">media.upload</code> scope. Successful uploads return a permanent CDN URL, asset key, and sanitized MIME type.
          </InfoNote>
        </Card>

        <Card title="Node.js & Python SDK Upload Examples" description="Programmatic asset upload from client and backend code">
          <CodeBox
            code={`// TypeScript / JavaScript SDK
import { WevsoftClient } from '@wevsoft/sdk';

const client = new WevsoftClient({ apiKey: 'YOUR_API_KEY' });
const result = await client.media.upload(fs.createReadStream('banner.png'), {
  filename: 'banner.png',
  contentType: 'image/png'
});
console.log('CDN URL:', result.url);`}
          />
          <div className="mt-4 p-3 rounded-lg border border-[var(--dc-border)] bg-[var(--dc-bg)]">
            <p className="text-[11px] font-semibold text-[var(--dc-text)]">Supported Media Formats:</p>
            <p className="text-[10.5px] text-[var(--dc-muted)] mt-0.5">
              Images (JPEG, PNG, WebP, AVIF, GIF, HEIC), Video (MP4, WebM, MOV), Audio (MP3, WAV, AAC), Documents (PDF, DOCX, XLSX). Executables and unvalidated SVG files are rejected.
            </p>
          </div>
        </Card>
      </div>
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* 6. In-App Checkout & Commerce Gateways                             */
/* ------------------------------------------------------------------ */

export function PaymentsCommercePage() {
  const ordersQuery = useQuery({
    queryKey: ['developerConsole', 'paymentsOrders'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/developer/payments/orders?limit=10');
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

  const orders = ordersQuery.data || [];

  return (
    <ConsolePage
      group="Integrations"
      title="In-App Checkout & Commerce API"
      description="Monetize your developer applications with in-app checkouts, digital goods fulfillment, and automated payouts."
      requiresAccount={false}
      actions={
        <div className="flex gap-2">
          <Link to="/developer/monetization" className={cx(btn.primary, btn.sm)}>
            Earnings & Payouts <ArrowRight size={12} />
          </Link>
        </div>
      }
    >
      <div className="grid gap-3 min-[640px]:grid-cols-4">
        <StatTile icon={CreditCard} label="Revenue Share" value="85% Developer" tone="green" hint="15% platform commission" />
        <StatTile icon={Wallet} label="Gateways" value="Cards, bKash, Crypto" tone="blue" />
        <StatTile icon={Zap} label="Webhook Dispatch" value="order.paid" hint="Instant digital fulfillment" />
        <StatTile icon={Package} label="Settlement" value="Instant Credit" hint="Balance credited on confirm" />
      </div>

      <div className="grid gap-4 min-[1100px]:grid-cols-2 mt-4">
        <Card title="Initiate In-App Checkout Session" description="POST /api/developer/payments/create-order">
          <CodeBox
            code={`curl -X POST '${window.location.origin}/api/developer/payments/create-order' \\
  -H 'Authorization: Bearer ACCESS_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "amount": 29.99,
    "currency": "USD",
    "description": "Pro Member Subscription Pack",
    "redirectUrl": "https://yourapp.com/orders/success",
    "metadata": {
      "appOrderId": "order_789456",
      "sku": "sku_pro_annual"
    }
  }'`}
          />
          <InfoNote className="mt-3">
            Returns a secure <code className="dc-code">checkoutUrl</code> where the user authorizes payment via wallet balance or credit card.
          </InfoNote>
        </Card>

        <Card title="Confirm & Fulfill Order" description="POST /api/developer/payments/orders/:id/confirm">
          <CodeBox
            code={`curl -X POST '${window.location.origin}/api/developer/payments/orders/ord_123456/confirm' \\
  -H 'Authorization: Bearer ACCESS_TOKEN' \\
  -H 'Content-Type: application/json'`}
          />
          <p className="text-[11.5px] text-[var(--dc-text-2)] mt-3">
            Upon confirmation, Wevsoft dispatches an HMAC-signed <code className="dc-code">order.paid</code> webhook to your subscribed webhook endpoints.
          </p>
          <div className="mt-4 flex gap-2">
            <Link to="/developer/webhooks" className={cx(btn.secondary, btn.sm)}>
              Configure Webhooks
            </Link>
            <Link to="/developer/monetization" className={cx(btn.primary, btn.sm)}>
              View Payouts
            </Link>
          </div>
        </Card>
      </div>

      <Card
        title="Recent In-App Checkout Orders"
        className="mt-4"
        description="Live checkout sessions created via the developer payments API"
        bodyClassName="!px-0"
      >
        {ordersQuery.isLoading ? (
          <div className="p-4"><LoadingRows rows={3} /></div>
        ) : orders.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={CreditCard}
              title="No checkout orders yet"
              body="Trigger your first order via POST /api/developer/payments/create-order to test the checkout flow."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr>
                  <th className={thCls}>Order ID</th>
                  <th className={thCls}>Amount</th>
                  <th className={thCls}>Description</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => (
                  <tr key={o.id}>
                    <td className={cx(tdCls, 'font-mono text-[11px] font-semibold text-[var(--dc-blue)]')}>
                      {o.orderId || o.id}
                    </td>
                    <td className={cx(tdCls, 'font-semibold text-[var(--dc-text)]')}>
                      {o.amount} {o.currency}
                    </td>
                    <td className={cx(tdCls, 'text-[11.5px]')}>{o.description}</td>
                    <td className={tdCls}>
                      <Pill tone={o.status === 'paid' || o.status === 'completed' ? 'green' : 'amber'}>
                        {o.status}
                      </Pill>
                    </td>
                    <td className={cx(tdCls, 'text-[11px] text-[var(--dc-muted)]')}>
                      {fmtDate(o.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </ConsolePage>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Other Custom Integrations & Automation                          */
/* ------------------------------------------------------------------ */

export function OtherIntegrationsPage() {
  return (
    <ConsolePage
      group="Integrations"
      title="Webhooks & Automation Bridges"
      description="Connect Wevsoft real-time events to Zapier, Make, n8n, and custom enterprise webhook dispatchers."
      requiresAccount={false}
      actions={
        <Link to="/developer/webhooks" className={cx(btn.primary, btn.sm)}>
          Manage Webhook Subscriptions
        </Link>
      }
    >
      <div className="grid gap-3 min-[640px]:grid-cols-3">
        <StatTile icon={Zap} label="Realtime Events" value="18 Lifecycle Topics" tone="green" />
        <StatTile icon={Shield} label="Signature Format" value="HMAC-SHA256" hint="300s replay tolerance" />
        <StatTile icon={Puzzle} label="Automation Connectors" value="Zapier / n8n / Make" hint="Standard HTTP JSON" />
      </div>

      <div className="grid gap-4 min-[1100px]:grid-cols-2 mt-4">
        <Card title="No-Code Automation Connectors" description="Connect event webhooks to Zapier, Make, or n8n workflows">
          <p className="text-[12px] text-[var(--dc-text-2)] mb-3">
            Subscribe your automation webhook URL in the Developer Console to trigger automated actions whenever someone registers, places an order, or sends a message.
          </p>
          <div className="space-y-2">
            <div className="p-3 rounded-lg border border-[var(--dc-border)] bg-[var(--dc-bg)] flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold text-[var(--dc-text)]">Zapier Catch Hook</p>
                <p className="text-[11px] text-[var(--dc-muted)]">Forward JSON events directly into Zapier triggers.</p>
              </div>
              <Pill tone="green">Ready</Pill>
            </div>
            <div className="p-3 rounded-lg border border-[var(--dc-border)] bg-[var(--dc-bg)] flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold text-[var(--dc-text)]">n8n / Node-RED Webhook</p>
                <p className="text-[11px] text-[var(--dc-muted)]">Self-hosted workflow automation with custom headers.</p>
              </div>
              <Pill tone="green">Ready</Pill>
            </div>
            <div className="p-3 rounded-lg border border-[var(--dc-border)] bg-[var(--dc-bg)] flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold text-[var(--dc-text)]">Make.com (Integromat)</p>
                <p className="text-[11px] text-[var(--dc-muted)]">Visual multi-step integration scenarios.</p>
              </div>
              <Pill tone="green">Ready</Pill>
            </div>
          </div>
        </Card>

        <Card title="Enterprise & Custom Integrations" description="Need dedicated integrations or on-premise connectors?">
          <p className="text-[12px] text-[var(--dc-text-2)] mb-3">
            Our platform engineering team supports custom SAML 2.0 SSO, SCIM 2.0 user directory provisioning, dedicated Kafka streams, and high-throughput webhooks for Enterprise apps.
          </p>
          <div className="mt-4 flex gap-2">
            <Link to="/developer/support" className={cx(btn.primary, btn.sm)}>
              Request Custom Integration
            </Link>
            <Link to="/developer/compliance" className={cx(btn.secondary, btn.sm)}>
              Enterprise Compliance
            </Link>
          </div>
        </Card>
      </div>
    </ConsolePage>
  );
}
