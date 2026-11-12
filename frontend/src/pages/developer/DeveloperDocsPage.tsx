import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Info, KeyRound, ShieldCheck, Smartphone, Server } from 'lucide-react';
import { DOCS_READ_KEY, OAUTH_SCOPES, appOrigin } from './devApi';
import { CodeBlock, CopyField, cx } from './devUi';
import { OperationSearchBox } from './docsSearch';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'create-app', label: '1. Create an app' },
  { id: 'authorize', label: '2. Send people to authorize' },
  { id: 'callback', label: '3. Handle the callback' },
  { id: 'token', label: '4. Exchange the code' },
  { id: 'pkce', label: 'PKCE for mobile & SPA' },
  { id: 'api-keys', label: 'API Keys (M2M)' },
  { id: 'platform-apis', label: 'Platform APIs' },
  { id: 'marketplace', label: 'Marketplace API' },
  { id: 'events-livestream', label: 'Events & Livestream API' },
  { id: 'openapi-spec', label: 'OpenAPI 3.1 & Postman' },
  { id: 'webhooks', label: 'Webhooks & Signatures' },
  { id: 'request-signing', label: 'Request Signing & mTLS' },
  { id: 'batch', label: 'Batch requests' },
  { id: 'test-users', label: 'Test Users & Sandbox' },
  { id: 'cli', label: 'Developer CLI' },
  { id: 'sdks', label: 'Official SDKs (7 Languages)' },
  { id: 'm2m-oauth', label: 'M2M OAuth (client_credentials)' },
  { id: 'monetization', label: 'Monetization & Payouts' },
  { id: 'realtime-events', label: 'Real-Time SSE Streams' },
  { id: 'websockets', label: 'WebSocket Gateway' },
  { id: 'webhooks-v2', label: 'Webhooks v2 & DLQ' },
  { id: 'event-simulator', label: 'Event Simulator' },
  { id: 'ai-gateway', label: 'AI Gateway Suite' },
  { id: 'app-reviews', label: 'App Reviews & Ratings' },
  { id: 'enterprise-teams', label: 'Enterprise Teams & RBAC' },
  { id: 'app-verification', label: 'App Store Verification' },
  { id: 'rate-limiting', label: 'Rate Limiting & Status Page' },
  { id: 'scopes', label: 'Scopes' },
  { id: 'errors', label: 'Errors' },
  { id: 'security', label: 'Security checklist' },
  { id: 'platform-terms', label: 'Platform terms' },
];

function scrollToSection(id: string, smooth = true) {
  const el = document.getElementById(id);
  if (!el) return;
  // Scroll only the app's content pane; scrollIntoView would also shift the
  // fixed-height layout shell and push the top bar out of view.
  const pane = document.getElementById('main-scroll-area');
  if (pane && pane.contains(el)) {
    // Native #fragment navigation may already have scrolled the fixed shell; undo that.
    for (let n = pane.parentElement; n; n = n.parentElement) if (n.scrollTop) n.scrollTop = 0;
    if (window.scrollY) window.scrollTo(0, 0);
    const top = el.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop - 72;
    pane.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  } else {
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: smooth ? 'smooth' : 'auto' });
  }
  window.history.replaceState(window.history.state, '', `#${id}`);
}

function onAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  scrollToSection(id);
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-xl sm:text-2xl font-semibold tracking-tight">
      <a href={`#${id}`} onClick={(e) => onAnchorClick(e, id)} className="hover:underline decoration-muted-foreground/40 underline-offset-4">{children}</a>
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold tracking-tight text-foreground pt-1">{children}</h3>;
}

function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cx('text-[15px] leading-7 text-muted-foreground', className)}>{children}</p>;
}

function C({ children }: { children: React.ReactNode }) {
  return <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground">{children}</code>;
}

function Callout({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <div
      className={cx(
        'flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm leading-6',
        tone === 'warn' ? 'border-amber-500/30 bg-amber-500/[0.06] text-amber-900 dark:text-amber-200' : 'border-primary/20 bg-primary/[0.05] text-foreground',
      )}
    >
      <Info className={cx('w-4 h-4 shrink-0 mt-1', tone === 'warn' ? '' : 'text-primary')} />
      <div>{children}</div>
    </div>
  );
}

function ParamTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">Parameter</th>
            <th className="px-4 py-2.5 font-medium">Required</th>
            <th className="px-4 py-2.5 font-medium">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(([name, req, desc]) => (
            <tr key={name} className="align-top">
              <td className="px-4 py-3 whitespace-nowrap"><C>{name}</C></td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{req}</td>
              <td className="px-4 py-3 text-muted-foreground min-w-[220px]">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const wevchatReceivedExample = `{
  "id": "evt_8f2c...",
  "type": "message.received",
  "createdAt": "2026-10-19T08:00:00.000Z",
  "data": {
    "conversationId": "cv_1",
    "recipientId": "u_1",
    "message": {
      "id": "m_1", "senderId": "u_2", "text": "Hi! Is this still available?",
      "mediaType": null, "attachment": null, "replyToId": null,
      "authorType": "USER", "spaceId": null, "isAiGenerated": false,
      "createdAt": "2026-10-19T08:00:00.000Z"
    }
  }
}`;
const wevchatReadExample = `{
  "type": "message.read",
  "data": { "conversationId": "cv_1", "readerId": "u_2", "watermark": "2026-10-19T08:01:00.000Z" }
}`;
const wevchatReactionExample = `{
  "type": "message.reaction",
  "data": {
    "conversationId": "cv_1", "messageId": "m_1", "messageSenderId": "u_1",
    "reactorId": "u_2", "action": "react", "emoji": "❤️", "reactedAt": "2026-10-19T08:02:00.000Z"
  }
}`;
const wevchatEditedExample = `{
  "type": "message.edited",
  "data": {
    "conversationId": "cv_1", "messageId": "m_1", "editorId": "u_2",
    "previousText": "See you at 5", "text": "See you at 6", "editedAt": "2026-10-19T08:03:00.000Z"
  }
}`;
const wevchatDeletedExample = `{
  "type": "message.deleted",
  "data": { "conversationId": "cv_1", "messageId": "m_1", "deletedBy": "u_2", "deletedAt": "2026-10-19T08:04:00.000Z" }
}`;
const accessTokenCurl = `curl -X POST https://wevsoft.com/api/developer/messages \\
  -H "Authorization: Bearer $WEVSOFT_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"receiverId": "u_2", "text": "Hi! Your order has shipped."}'
# Needs messages.write. 201 -> { "success": true, "message": { "id", "conversationId", "createdAt" } }`;
const accessTokenNode = `const res = await fetch('https://wevsoft.com/api/developer/messages', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.WEVSOFT_ACCESS_TOKEN}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ receiverId: 'u_2', text: 'Hi! Your order has shipped.' }),
});
if (!res.ok) throw new Error(\`Send failed: \${res.status}\`);`;
export default function DeveloperDocsPage() {
  const origin = appOrigin();
  const authorizeEndpoint = `${origin}/oauth/authorize`;
  const tokenEndpoint = `${origin}/api/oauth/token`;

  useEffect(() => {
    try {
      window.localStorage.setItem(DOCS_READ_KEY, '1');
    } catch {
      /* private mode */
    }
    const hash = window.location.hash.slice(1);
    if (hash) setTimeout(() => scrollToSection(hash, false), 60);
  }, []);

  const authorizeSample = `${authorizeEndpoint}
  ?response_type=code
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=https%3A%2F%2Fyourapp.com%2Foauth%2Fcallback
  &scope=profile%20email
  &state=RANDOM_STATE`;

  const authorizeNode = `import crypto from 'node:crypto';

app.get('/login/wevsoft', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state; // verify it in the callback

  const url = new URL('${authorizeEndpoint}');
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.WEVSOFT_CLIENT_ID,
    redirect_uri: 'https://yourapp.com/oauth/callback',
    scope: 'profile email',
    state,
  }).toString();

  res.redirect(url.toString());
});`;

  const callbackSample = `https://yourapp.com/oauth/callback?code=AUTH_CODE&state=RANDOM_STATE

# If the person clicks Cancel:
https://yourapp.com/oauth/callback?error=access_denied&state=RANDOM_STATE`;

  const tokenCurl = `curl -X POST ${tokenEndpoint} \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "authorization_code",
    "code": "AUTH_CODE",
    "redirect_uri": "https://yourapp.com/oauth/callback",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET"
  }'`;

  const tokenBasic = `# client_secret_basic: send the credentials in an Authorization header instead
curl -X POST ${tokenEndpoint} \\
  -u "YOUR_CLIENT_ID:YOUR_CLIENT_SECRET" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=authorization_code" \\
  -d "code=AUTH_CODE" \\
  -d "redirect_uri=https://yourapp.com/oauth/callback"`;

  const tokenNode = `app.get('/oauth/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect('/login?cancelled=1');
  if (!state || state !== req.session.oauthState) return res.status(400).send('Invalid state');

  const response = await fetch('${tokenEndpoint}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://yourapp.com/oauth/callback',
      client_id: process.env.WEVSOFT_CLIENT_ID,
      client_secret: process.env.WEVSOFT_CLIENT_SECRET,
    }),
  });
  if (!response.ok) return res.status(401).send(await response.text());

  const tokens = await response.json();
  // { access_token, token_type: 'Bearer', expires_in: 3600, refresh_token, scope }
  req.session.wevsoft = tokens;
  res.redirect('/');
});`;

  const tokenResponse = `HTTP/1.1 200 OK
Cache-Control: no-store
Content-Type: application/json

{
  "access_token": "k3Jx...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "Qm9v...",
  "scope": "profile email"
}`;

  const pkceBrowser = `// 1. Create a verifier and its S256 challenge
function base64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
}
const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
const challenge = base64url(
  await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
);
sessionStorage.setItem('pkce_verifier', verifier);

// 2. Send the person to Wevsoft with the challenge
const url = new URL('${authorizeEndpoint}');
url.search = new URLSearchParams({
  response_type: 'code',
  client_id: 'YOUR_CLIENT_ID',
  redirect_uri: 'https://yourapp.com/callback',
  scope: 'profile',
  state: crypto.randomUUID(),
  code_challenge: challenge,
  code_challenge_method: 'S256',
}).toString();
location.assign(url);`;

  const pkceExchange = `// 3. In your callback, exchange the code with the verifier (no client_secret)
const code = new URLSearchParams(location.search).get('code');
const res = await fetch('${tokenEndpoint}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: 'https://yourapp.com/callback',
    client_id: 'YOUR_CLIENT_ID',
    code_verifier: sessionStorage.getItem('pkce_verifier'),
  }),
});
const tokens = await res.json();`;

  const pkceNode = `import crypto from 'node:crypto';

const verifier = crypto.randomBytes(32).toString('base64url');
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
// Send code_challenge=challenge&code_challenge_method=S256 to /oauth/authorize,
// then send code_verifier=verifier to /api/oauth/token.`;

  const apiKeyCurl = `curl -X GET '${origin}/api/developer/posts' \\
  -H "x-api-key: wev_live_YOUR_API_KEY"`;

  const postCreateCurl = `# Publish a post with multimedia attachments
curl -X POST '${origin}/api/developer/posts' \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Excited to launch our platform integration!",
    "privacy": "public",
    "mediaUrls": ["/uploads/launch_banner.jpg"]
  }'`;

  const postReactionsCurl = `# React to a post with love (like, love, haha, wow, sad, angry)
curl -X POST '${origin}/api/developer/posts/POST_ID/reactions' \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "type": "love" }'`;

  const insightsCurl = `# Query 30-day account performance and engagement rate
curl -X GET '${origin}/api/developer/insights/account?period=30' \\
  -H "Authorization: Bearer ACCESS_TOKEN"

# Query audience demographics (age, gender, locations, active hours)
curl -X GET '${origin}/api/developer/insights/demographics' \\
  -H "Authorization: Bearer ACCESS_TOKEN"`;

  const notifyCurl = `# Send in-app notification to a consenting user
curl -X POST '${origin}/api/developer/notifications' \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Order Shipped",
    "text": "Your package is on its way with Tracking #WV-8821",
    "link": "/wevmall/orders/123"
  }'`;

  const webhookHandshakeNode = `// Step 1: "Verify and save" sends a GET to your callback URL:
//   GET /webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=RANDOM
// Reply 200 with the challenge as the plain body within 5 seconds.
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WEVSOFT_VERIFY_TOKEN) {
    return res.status(200).type('text/plain').send(String(challenge));
  }
  return res.sendStatus(403);
});`;
const webhookVerifyNode = `import crypto from 'node:crypto';

// Verify X-Wevsoft-Signature and X-Wevsoft-Timestamp using HMAC-SHA256
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const timestamp = String(req.headers['x-wevsoft-timestamp'] || '');
  const signature = String(req.headers['x-wevsoft-signature'] || '');
  const rawBody = req.body.toString('utf8');

  const fresh = Math.abs(Date.now() - Number(timestamp)) < 5 * 60 * 1000;
  const expected = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest('hex');

  const valid =
    fresh &&
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));

  if (!valid) {
    return res.status(401).send('Signature verification failed');
  }

  const event = JSON.parse(rawBody);
  console.log('Verified Webhook Event:', event.event, event.data);
  res.sendStatus(200);
});`;

  const requestSigningNode = `import crypto from 'node:crypto';

// Sign every request: hex HMAC-SHA256 of "{timestampMs}.{rawBody}"
const timestamp = Date.now().toString();
const rawBody = JSON.stringify({ content: 'Signed from our backend' });
const signature = crypto
  .createHmac('sha256', process.env.WEVSOFT_SIGNING_SECRET)
  .update(\`\${timestamp}.\${rawBody}\`)
  .digest('hex');

await fetch('${origin}/api/developer/posts', {
  method: 'POST',
  headers: {
    'X-API-Key': process.env.WEVSOFT_API_KEY,
    'Content-Type': 'application/json',
    'X-Wevsoft-Timestamp': timestamp,
    'X-Wevsoft-Signature': signature,
  },
  body: rawBody,
});`;

  const requestSigningCurl = `# 1. Sign "{timestampMs}.{rawBody}" with openssl
BODY='{"content":"Signed from the shell"}'
TS=$(node -e 'process.stdout.write(String(Date.now()))')
SIG=$(printf '%s.%s' "$TS" "$BODY" | openssl dgst -sha256 -hmac "$WEVSOFT_SIGNING_SECRET" -hex | awk '{print $2}')

# 2. Send the signed request
curl -X POST '${origin}/api/developer/posts' \\
  -H "X-API-Key: $WEVSOFT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "X-Wevsoft-Timestamp: $TS" \\
  -H "X-Wevsoft-Signature: $SIG" \\
  -d "$BODY"`;

  const requestSigningJava = `WevsoftClient client = WevsoftClient.builder()
    .baseUrl("${origin}")
    .apiKey(System.getenv("WEVSOFT_API_KEY"))
    .signingSecret(System.getenv("WEVSOFT_SIGNING_SECRET"))
    .build();

// Every request is signed automatically with a fresh timestamp.
client.posts().create(Map.of("content", "Signed from Java"));

// Rotate the signing secret (returned exactly once).
client.apps().rotateSigningSecret(appId);`;

  const requestSigningDotnet = `using var client = new WevsoftClient(new WevsoftClientOptions
{
    BaseUrl = "${origin}",
    ApiKey = Environment.GetEnvironmentVariable("WEVSOFT_API_KEY"),
    SigningSecret = Environment.GetEnvironmentVariable("WEVSOFT_SIGNING_SECRET"),
});

// Every request is signed automatically with a fresh timestamp.
await client.CreatePostAsync(new { Content = "Signed from .NET" });

// Require signed requests from now on.
await client.SetSigningRequiredAsync(appId, required: true);`;

  return (
    <div className="min-h-full">
      {/* Rendered inside the Developer Console shell (DeveloperConsoleLayout). */}
      <div className="max-w-6xl px-4 sm:px-[22px] pt-[20px] pb-24 lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:block">
          <nav className="sticky top-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">On this page</p>
            <ul className="space-y-1 border-l border-border">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} onClick={(e) => onAnchorClick(e, s.id)} className="block -ml-px border-l border-transparent pl-3 py-1 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0 max-w-3xl space-y-12">
          <OperationSearchBox />
          <header id="overview" className="scroll-mt-24">
            <p className="text-sm font-medium text-primary">Getting started</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">Sign in with Wevsoft (OAuth 2.0)</h1>
            <P className="mt-4 text-base">
              Wevsoft uses the standard OAuth 2.0 <span className="text-foreground font-medium">authorization code</span> flow. Your app sends
              people to Wevsoft, they approve the permissions you ask for, and Wevsoft redirects back with a short-lived code that your app
              exchanges for an access token.
            </P>
            <div className="mt-6 grid sm:grid-cols-3 gap-3">
              {[
                { icon: KeyRound, t: 'Authorize', d: 'Redirect to /oauth/authorize' },
                { icon: ShieldCheck, t: 'Approve', d: 'Person reviews the consent screen' },
                { icon: Server, t: 'Exchange', d: 'POST the code to /api/oauth/token' },
              ].map((s, i) => (
                <div key={s.t} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                    <s.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="mt-3 font-medium text-sm">{s.t}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Authorization endpoint (GET, in the browser)</p>
                <CopyField value={authorizeEndpoint} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Token endpoint (POST, from your server)</p>
                <CopyField value={tokenEndpoint} />
              </div>
            </div>
          </header>

          <section className="space-y-4">
            <H2 id="create-app">1. Create an app</H2>
            <P>
              In the <Link to="/developer" className="text-primary font-medium hover:underline">developer dashboard</Link>, create an app. You'll
              get a <C>client_id</C> (public) and a <C>client_secret</C> (shown once; keep it on your server). Then open the app's{' '}
              <span className="text-foreground font-medium">OAuth</span> tab and add every redirect URI you use. Redirect URIs must match exactly;
              use https (http is only allowed for <C>localhost</C>).
            </P>
          </section>

          <section className="space-y-4">
            <H2 id="authorize">2. Send people to authorize</H2>
            <P>Redirect the person's browser to the authorization endpoint with these query parameters. They must be signed in to Wevsoft; if they aren't, they'll sign in first.</P>
            <ParamTable
              rows={[
                ['response_type', 'Yes', 'Always code.'],
                ['client_id', 'Yes', "Your app's client ID (starts with wev_)."],
                ['redirect_uri', 'Yes', 'One of the redirect URIs registered on your app, exactly as registered.'],
                ['scope', 'No', 'Space-separated scopes, e.g. "profile email". profile is always included.'],
                ['state', 'Recommended', 'An unguessable value you generate and check in the callback to prevent CSRF.'],
                ['code_challenge', 'PKCE', 'Base64url SHA-256 of your code_verifier. Required for apps without a client secret.'],
                ['code_challenge_method', 'PKCE', 'S256 (recommended). plain is accepted only together with a client secret.'],
              ]}
            />
            <CodeBlock tabs={[{ label: 'URL', code: authorizeSample }, { label: 'Node.js (Express)', code: authorizeNode }]} />
          </section>

          <section className="space-y-4">
            <H2 id="callback">3. Handle the callback</H2>
            <P>
              After the person clicks <span className="text-foreground font-medium">Allow</span>, Wevsoft redirects to your <C>redirect_uri</C>{' '}
              with a <C>code</C> and your <C>state</C>. Codes expire after <span className="text-foreground font-medium">10 minutes</span> and can
              be used once. If they click <span className="text-foreground font-medium">Cancel</span>, you get <C>error=access_denied</C>.
            </P>
            <CodeBlock tabs={[{ label: 'Redirect', code: callbackSample }]} />
          </section>

          <section className="space-y-4">
            <H2 id="token">4. Exchange the code for tokens</H2>
            <P>
              From your server, POST to the token endpoint. The body can be JSON or <C>application/x-www-form-urlencoded</C>. Authenticate with
              your <C>client_secret</C>, either in the body or with HTTP Basic auth. Requests without a valid secret are rejected with{' '}
              <C>401 invalid_client</C>, unless the code was issued with an S256 PKCE challenge and you send the matching{' '}
              <C>code_verifier</C> (see <a href="#pkce" onClick={(e) => onAnchorClick(e, 'pkce')} className="text-primary hover:underline">PKCE</a>).
            </P>
            <ParamTable
              rows={[
                ['grant_type', 'Yes', 'authorization_code or refresh_token'],
                ['code', 'For authorization_code', 'The code from the callback.'],
                ['refresh_token', 'For refresh_token', 'The refresh token to exchange and rotate.'],
                ['client_id', 'Yes', 'Your client ID (or the Basic auth username).'],
                ['client_secret', 'Confidential apps', 'Your client secret (or the Basic auth password).'],
                ['code_verifier', 'PKCE', 'The original verifier, if you sent a code_challenge.'],
                ['redirect_uri', 'Recommended', 'The same redirect URI used in step 2.'],
              ]}
            />
            <CodeBlock
              tabs={[
                { label: 'curl', code: tokenCurl },
                { label: 'curl (Basic auth)', code: tokenBasic },
                { label: 'Node.js', code: tokenNode },
                { label: 'Response', code: tokenResponse },
              ]}
            />
            <Callout>
              Access tokens last one hour (<C>expires_in: 3600</C>). Refresh tokens last 30 days and rotate on every <C>grant_type=refresh_token</C> exchange (reusing a consumed refresh token revokes the entire token family). Store tokens server-side and never expose your client secret to browsers or mobile apps.
            </Callout>
          </section>

          <section className="space-y-4">
            <H2 id="pkce">PKCE for mobile and single-page apps</H2>
            <P>
              Apps that can't keep a secret (native mobile apps, SPAs) use{' '}
              <span className="text-foreground font-medium">PKCE</span> (Proof Key for Code Exchange) instead. Generate a random{' '}
              <C>code_verifier</C>, send its SHA-256 hash as <C>code_challenge</C> with <C>code_challenge_method=S256</C>, then send the
              verifier when exchanging the code. Confidential server apps can use PKCE too, alongside the secret.
            </P>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                <Server className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">Server apps</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Send client_secret. PKCE is optional but recommended.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                <Smartphone className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">Mobile & SPA</p>
                  <p className="text-xs text-muted-foreground mt-0.5">No secret. PKCE with S256 is required.</p>
                </div>
              </div>
            </div>
            <CodeBlock
              tabs={[
                { label: 'Browser: authorize', code: pkceBrowser },
                { label: 'Browser: exchange', code: pkceExchange },
                { label: 'Node.js helper', code: pkceNode },
              ]}
            />
          </section>

          <section className="space-y-4">
            <H2 id="api-keys">API Keys (Machine-to-Machine)</H2>
            <P>
              For backend daemons, cron jobs, or server integrations that act on behalf of your developer account without interactive user delegation,
              generate an <span className="text-foreground font-medium">API Key</span> from the <Link to="/developer/credentials" className="text-primary hover:underline">Credentials tab</Link>.
              Pass it in the <C>x-api-key</C> request header. API keys support granular scope restrictions and optional IP allowlisting.
            </P>
            <CodeBlock tabs={[{ label: 'curl', code: apiKeyCurl }]} />
            <Callout>
              API keys are restricted to endpoints under <C>/api/developer/*</C>. They cannot authenticate general consumer routes. Keep keys secret and rotate them immediately if exposed.
            </Callout>
          </section>

          <section className="space-y-4">
            <H2 id="platform-apis">Platform APIs (Posts, Comments, Reactions, Chat, AI & Payments)</H2>
            <P>
              WebSoft provides modern REST endpoints for creating and interacting with social content, direct communications, AI inference, and in-app checkout. All endpoints require standard Bearer tokens or API keys with matching scopes:
            </P>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">Posts & Multimedia</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create posts with up to 10 attached photos, videos, or audio tracks. Endpoints: <C>GET /api/developer/posts</C>, <C>POST /api/developer/posts</C>, <C>PATCH /api/developer/posts/:id</C>, and <C>DELETE /api/developer/posts/:id</C>.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">Comments & Reactions</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Interact programmatically with published posts. Endpoints: <C>GET /api/developer/posts/:id/comments</C>, <C>POST /api/developer/posts/:id/comments</C>, and <C>POST /api/developer/posts/:id/reactions</C>.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">Social Graph</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Query friend networks and audience graphs. Endpoints: <C>GET /api/developer/friends</C>, <C>GET /api/developer/followers</C>, and <C>GET /api/developer/following</C>.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">WevChat & Stories</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Messaging scopes: <C>messages.read</C>, <C>messages.write</C>, <C>conversations.read</C>, and Space inbox <C>spaces.inbox</C>.
                  Endpoints: <C>GET/POST /api/developer/messages</C>, <C>GET /api/developer/conversations</C>, <C>GET /api/developer/conversations/:id/messages</C>, <C>GET/POST /api/developer/stories</C>, and Graph Send API under <C>/api/graph/v1/:spaceId/messages</C>.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">AI Provider Gateway (BYOK)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Unified OpenAI-compatible chat completions across Gemini, OpenAI, and Anthropic using the user's BYOK key: <C>POST /api/developer/ai/chat/completions</C>.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">In-App Checkout & Orders</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create and confirm in-app checkout orders with <C>order.paid</C> webhook notifications: <C>POST /api/developer/payments/create-order</C> and <C>GET /api/developer/payments/orders</C>.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">Reels & Short Video</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Publish short-form vertical videos, stream comments, and inspect engagement metrics: <C>GET/POST /api/developer/reels</C>, <C>POST /api/developer/reels/:id/likes</C>, and <C>GET/POST /api/developer/reels/:id/comments</C>.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">Groups & Communities</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Manage community hubs, query member rosters, publish group posts: <C>GET/POST /api/developer/groups</C>, <C>GET /api/developer/groups/:id/members</C>, and <C>GET/POST /api/developer/groups/:id/posts</C>.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">Unified Search</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Multi-entity search across users, posts, reels, and groups with autocomplete: <C>GET /api/developer/search</C>, <C>GET /api/developer/search/users</C>, and <C>GET /api/developer/search/hashtags</C>.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">Insights & Demographics</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Query creator growth, engagement rates, content reach, and audience demographics: <C>GET /api/developer/insights/account</C>, <C>GET /api/developer/insights/posts/:id</C>, and <C>GET /api/developer/insights/demographics</C>.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">In-App Notifications</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Dispatch direct in-app notifications and transactional alerts to consenting users: <C>POST /api/developer/notifications</C> and <C>GET /api/developer/notifications</C>.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">Social Graph & Relationships</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Programmatically follow/unfollow users and inspect reciprocal relationships: <C>POST/DELETE /api/developer/users/:id/follow</C> and <C>GET /api/developer/users/:id/relationship</C>.
                </p>
              </div>
            </div>
            <CodeBlock
              tabs={[
                { label: 'Create Post', code: postCreateCurl },
                { label: 'React to Post', code: postReactionsCurl },
                { label: 'Account Insights', code: insightsCurl },
                { label: 'Send Notification', code: notifyCurl },
              ]}
            />
          </section>

          <section className="space-y-4">
            <H2 id="marketplace">Marketplace API (Listings, Orders & Seller Profile)</H2>
            <P>
              Build commerce integrations on top of WevMall. Access is gated by two scopes: <C>marketplace.read</C> for browsing public listings, categories, your seller profile, and orders you are a party to; and <C>marketplace.write</C> for managing your own listings and advancing fulfilment on orders you sell. Listings created through the API run the exact same automated safety scan as the first-party seller console, and unsafe image URLs are dropped.
            </P>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">Product Listings</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Browse public listings plus your own across any state. Endpoints: <C>GET /api/developer/marketplace/products</C> (filters <C>q</C>, <C>category</C>, <C>condition</C>, <C>sellerId</C>, <C>status</C>, <C>minPrice</C>, <C>maxPrice</C>, <C>mine</C>), <C>POST</C>, <C>GET/PATCH/DELETE /api/developer/marketplace/products/:id</C>.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">Categories & Seller Profile</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Read the active category tree and the calling account's seller identity: <C>GET /api/developer/marketplace/categories</C> and <C>GET /api/developer/marketplace/seller</C>.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">Orders</p>
                <p className="text-xs text-muted-foreground mt-1">
                  List and inspect orders you buy or sell: <C>GET /api/developer/marketplace/orders?role=buyer|seller</C> and <C>GET /api/developer/marketplace/orders/:id</C>. Only a party to the order can read it.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">Fulfilment</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Advance status as the seller: <C>PATCH /api/developer/marketplace/orders/:id</C> with <C>{'{ status, trackingNumber?, returnReason? }'}</C>. Non-sellers get <C>403</C>; invalid transitions get <C>409</C>.
                </p>
              </div>
            </div>
            <CodeBlock
              tabs={[
                {
                  label: 'Listings (cURL)',
                  code: `# Browse public listings (marketplace.read):
curl -X GET '${origin}/api/developer/marketplace/products?q=camera&maxPrice=20000&limit=20' \\
  -H 'Authorization: Bearer YOUR_TOKEN'

# Create a listing you own (marketplace.write):
curl -X POST '${origin}/api/developer/marketplace/products' \\
  -H 'X-API-Key: YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"title":"Vintage Film Camera","price":12500,"category":"Electronics","images":["https://cdn.example.com/camera.jpg"]}'

# Update or remove your listing:
curl -X PATCH '${origin}/api/developer/marketplace/products/PRODUCT_ID' \\
  -H 'X-API-Key: YOUR_API_KEY' -H 'Content-Type: application/json' -d '{"price":11000}'
curl -X DELETE '${origin}/api/developer/marketplace/products/PRODUCT_ID' -H 'X-API-Key: YOUR_API_KEY'`,
                },
                {
                  label: 'Orders & Fulfilment (cURL)',
                  code: `# Orders you sell:
curl -X GET '${origin}/api/developer/marketplace/orders?role=seller' \\
  -H 'X-API-Key: YOUR_API_KEY'

# Advance fulfilment (seller only):
curl -X PATCH '${origin}/api/developer/marketplace/orders/ORDER_ID' \\
  -H 'X-API-Key: YOUR_API_KEY' -H 'Content-Type: application/json' \\
  -d '{"status":"SHIPPED","trackingNumber":"WEV-TRACK-0001"}'`,
                },
                {
                  label: 'SDK & CLI',
                  code: `// TypeScript SDK
await client.marketplace.products.list({ mine: true });
const { product } = await client.marketplace.products.create({ title: 'Vintage Camera', price: 12500 });
await client.marketplace.orders.updateStatus(orderId, 'SHIPPED', { trackingNumber: 'WEV-TRACK-0001' });

# Python SDK
client.marketplace.list_products(mine=True)
client.marketplace.update_order_status(order_id, "SHIPPED")

# Developer CLI
wevsoft marketplace products --mine
wevsoft marketplace create --title "Vintage Camera" --price 12500
wevsoft marketplace orders --role seller
wevsoft marketplace order-status ORDER_ID SHIPPED --tracking WEV-TRACK-0001`,
                },
              ]}
            />
            <Callout>
              Order status flows are enforced server-side: <b>PENDING/NEW → PROCESSING → SHIPPED → DELIVERED → RETURN_REQUESTED</b>, with <b>CANCELLED</b> reachable from any non-terminal state. <b>CANCELLED</b> and <b>RETURN_REQUESTED</b> are terminal. Webhooks fire for <C>product.created</C>, <C>product.updated</C>, <C>product.deleted</C>, and <C>order.status_changed</C>.
            </Callout>
          </section>

          <section className="space-y-4">
            <H2 id="events-livestream">Events & Livestream API</H2>
            <P>
              Build calendar and live-broadcast integrations. Events are gated by <C>events.read</C> / <C>events.write</C>; broadcasts by <C>livestream.read</C> / <C>livestream.write</C>. These are <b>separate</b> from the <C>events.subscribe</C> SSE scope — that one is the real-time change feed, not the calendar.
            </P>
            <Callout>
              <b>Why <C>/calendar</C>?</b> <C>/api/developer/events/*</C> was already taken by the real-time SSE stream (<C>/events/stream</C>, <C>/events/status</C>, <C>/events/simulate</C>). Mounting the calendar there would make <C>GET /developer/events/:id</C> shadow <C>/events/status</C>, so the calendar Events API lives at <C>/api/developer/calendar</C>. It manages the caller's <b>personal</b> events only (<C>spaceId: null</C>) — Space-hosted events stay owned and managed by the Space.
            </Callout>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">Calendar Events</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <C>GET /api/developer/calendar/events</C> (filters <C>mine</C>, <C>upcoming</C>, <C>past</C>, <C>from</C>, <C>to</C>, <C>category</C>, <C>mode</C>, <C>visibility</C>, <C>q</C>), <C>GET /api/developer/calendar/events/:id</C> (404 when not visible), <C>POST</C>, <C>PATCH/DELETE /api/developer/calendar/events/:id</C>.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">RSVP & Guest List</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <C>POST /api/developer/calendar/events/:id/rsvp</C> with <C>{'{ status: "going" | "interested" | "not_going" }'}</C> and <C>DELETE …/rsvp</C>. Organisers read the guest list at <C>GET …/attendees</C>.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">Broadcasts</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <C>GET /api/developer/livestream/streams</C>, <C>GET …/streams/:id</C>, <C>POST …/streams</C>, <C>PATCH …/streams/:id</C>, <C>POST …/streams/:id/start</C>, <C>POST …/streams/:id/end</C>. The RTMP <C>streamKey</C> is returned <b>only to its owner</b> and redacted for everyone else.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-sm">Live Chat & Telemetry</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <C>GET/POST /api/developer/livestream/streams/:id/comments</C> (posting is refused unless the stream is <C>live</C> and chat is enabled) and <C>GET …/viewers</C> (broadcaster-only audience metrics).
                </p>
              </div>
            </div>
            <CodeBlock
              tabs={[
                {
                  label: 'Events (cURL)',
                  code: `# Your upcoming events (events.read):
curl -X GET '${origin}/api/developer/calendar/events?mine=true&upcoming=true' \\
  -H 'Authorization: Bearer YOUR_TOKEN'

# Create an event (events.write):
curl -X POST '${origin}/api/developer/calendar/events' \\
  -H 'X-API-Key: YOUR_API_KEY' -H 'Content-Type: application/json' \\
  -d '{"title":"Live Q&A","startsAt":"2026-11-01T18:00:00Z","mode":"ONLINE","registrationMode":"RSVP","capacity":100,"visibility":"public"}'

# RSVP to an event:
curl -X POST '${origin}/api/developer/calendar/events/EVENT_ID/rsvp' \\
  -H 'X-API-Key: YOUR_API_KEY' -H 'Content-Type: application/json' -d '{"status":"going"}'`,
                },
                {
                  label: 'Livestream (cURL)',
                  code: `# Go live and get your RTMP key (owner only):
curl -X POST '${origin}/api/developer/livestream/streams' \\
  -H 'X-API-Key: YOUR_API_KEY' -H 'Content-Type: application/json' \\
  -d '{"title":"Launch stream","status":"live","tags":["tech","launch"]}'

# Read live chat:
curl -X GET '${origin}/api/developer/livestream/streams/STREAM_ID/comments' \\
  -H 'X-API-Key: YOUR_API_KEY'

# Broadcaster audience telemetry:
curl -X GET '${origin}/api/developer/livestream/streams/STREAM_ID/viewers' \\
  -H 'X-API-Key: YOUR_API_KEY'`,
                },
                {
                  label: 'SDK & CLI',
                  code: `// TypeScript SDK
await client.calendar.events.list({ mine: true, upcoming: true });
const { event } = await client.calendar.events.create({ title: 'Live Q&A', registrationMode: 'RSVP' });
await client.calendar.events.rsvp(eventId, 'going');
const { stream } = await client.livestream.streams.create({ title: 'Launch stream', status: 'live' });
await client.livestream.streams.start(streamId);

# Python SDK
client.calendar.list_events(mine=True)
client.calendar.rsvp(event_id, "going")
client.livestream.create_stream(title="Launch stream", status="live")

# Developer CLI
wevsoft calendar events --mine --upcoming
wevsoft calendar rsvp EVENT_ID going
wevsoft livestream create --title "Launch stream" --live
wevsoft livestream end STREAM_ID`,
                },
              ]}
            />
            <Callout>
              Webhooks: <C>event.created</C>, <C>event.updated</C>, <C>event.deleted</C>, <C>event.rsvp</C> (audience = the organiser, scope <C>events.read</C>) and <C>livestream.started</C>, <C>livestream.ended</C>, <C>livestream.comment</C> (audience = the broadcaster, scope <C>livestream.read</C>).
            </Callout>
          </section>

          <section className="space-y-4">
            <H2 id="openapi-spec">OpenAPI 3.1 & Postman Specification</H2>
            <P>
              WebSoft publishes a complete, machine-readable <span className="text-foreground font-medium">OpenAPI 3.1.0</span> specification covering all public Developer Platform endpoints, parameters, request bodies, error schemas, and Bearer / API-Key security definitions. You can import this directly into Postman, Insomnia, Swagger UI, or generate typed SDKs using OpenAPI Generator.
            </P>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="/api/developer/openapi.json"
                download="wevsoft-openapi.json"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:brightness-110"
              >
                Download OpenAPI JSON (.json)
              </a>
              <a
                href="/api/developer/openapi.yaml"
                download="wevsoft-openapi.yaml"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
              >
                Download OpenAPI YAML (.yaml)
              </a>
              <a
                href="/api/developer/openapi"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                View Raw JSON
              </a>
            </div>
            <CodeBlock
              tabs={[
                {
                  label: 'Import via curl',
                  code: `# Fetch the OpenAPI 3.1 JSON definition
curl -X GET "${appOrigin}/api/developer/openapi.json" -o wevsoft-openapi.json

# Or download the YAML specification
curl -X GET "${appOrigin}/api/developer/openapi.yaml" -o wevsoft-openapi.yaml`,
                },
                {
                  label: 'Postman & Insomnia',
                  code: `# To import into Postman:
1. Open Postman -> Click "Import" in the top navigation.
2. Enter the URL: ${appOrigin}/api/developer/openapi.json
3. Click "Import as API" and choose "Generate Collection".
4. Set your collection variable {{bearerToken}} or {{apiKey}}.

# To import into Insomnia:
1. Open Insomnia -> Create / Select Workspace -> Click "Import From".
2. Select "URL" and enter: ${appOrigin}/api/developer/openapi.yaml
3. Choose "OpenAPI 3.0/3.1" -> Click "Done".`,
                },
              ]}
            />
          </section>

          <section className="space-y-4">
            <H2 id="webhooks">Webhooks & Signature Verification</H2>
            <P>
              Webhooks notify your application in real-time when social and interaction events occur on WebSoft (<C>post.created</C>, <C>post.updated</C>, <C>post.deleted</C>, <C>comment.created</C>, and <C>order.paid</C>).
              Every delivery carries <C>X-Wevsoft-Timestamp</C> (ms since epoch) and <C>X-Wevsoft-Signature</C>: the HMAC-SHA256 hex digest of <C>{'{timestamp}.{raw body}'}</C> computed with your webhook signing secret.
              That is deliberately the same canonical form you use for <a href="#request-signing" onClick={(e) => onAnchorClick(e, 'request-signing')} className="text-primary hover:underline">request signing</a>, so there is one rule for both directions.
            </P>
            <CodeBlock tabs={[{ label: 'Callback URL verification (GET)', code: webhookHandshakeNode }]} />
          <CodeBlock tabs={[{ label: 'Node.js Express Verification', code: webhookVerifyNode }]} />
            <Callout>
              Deliveries have a strict 5-second timeout and employ an exponential backoff retry schedule (up to 5 attempts). If your endpoint continues to fail, events are safely routed to a dead-letter queue and can be manually retried from the Webhooks or Logs pages.
            </Callout>
            <H3>WevChat events (Messenger-style)</H3>
            <P>
              With the <C>messages.read</C> scope you can subscribe to WevChat activity. Events are only delivered for conversations of the account that authorized your app,
              and never for messages inside a private-chat session. Live today: <C>message.received</C>, <C>message.echo</C>, <C>message.read</C>, <C>message.reaction</C>, <C>message.edited</C>, <C>message.deleted</C> (unsend for everyone only; &quot;delete for me&quot; never fires), <C>message.pinned</C>, <C>message.unpinned</C>, <C>conversation.created</C>.
              Defined and coming soon: <C>message.delivered</C>, <C>message.postback</C>, <C>messaging.optin</C>, <C>messaging.referral</C>, <C>conversation.handover</C>,
              <C>messaging.policy_enforcement</C>, <C>account.linking</C>. Full JSON schemas: <C>GET /api/developer/webhooks/schemas</C>.
            </P>
            <CodeBlock tabs={[
              { label: 'message.received', code: wevchatReceivedExample },
              { label: 'message.read', code: wevchatReadExample },
              { label: 'message.reaction', code: wevchatReactionExample },
              { label: 'message.edited', code: wevchatEditedExample },
              { label: 'message.deleted', code: wevchatDeletedExample },
            ]} />
            <H3>Access tokens from the Webhooks page</H3>
            <P>
              In <b>Webhooks &gt; 2. Generate access tokens</b>, click <b>Connect</b> to add your own account or a WevSpace you own or admin, then <b>Generate token</b>.
              The token is shown once; generating again revokes the previous one. An account token lasts 60 days and carries the app&apos;s scopes;
              a Space token lasts 90 days, carries the app&apos;s <C>spaces.*</C> scopes and only works for that Space. Send it as <C>Authorization: Bearer &lt;token&gt;</C>.
            </P>
            <CodeBlock tabs={[
              { label: 'Send a message (cURL)', code: accessTokenCurl },
              { label: 'Node.js', code: accessTokenNode },
            ]} />
          </section>

          <section className="space-y-4">
            <H2 id="request-signing">Request Signing & mTLS</H2>
            <P>
              An API key authenticates <em>who</em> is calling. Request signing proves the call was actually made by you — an API key captured from a log,
              a proxy, or a misconfigured client is useless on its own. Signing is an opt-in second factor you enable per app, and it is the same rule your
              webhooks already follow, so you only learn one canonical form:
            </P>
            <P>
              <C>{'hex(HMAC-SHA256(secret, "{timestamp}.{rawBody}"))'}</C> — the timestamp is <em>inside</em> the signed string, so a captured request cannot
              be replayed with a fresh timestamp.
            </P>
            <ParamTable rows={[
              ['X-Wevsoft-Timestamp', 'Yes', 'Unix milliseconds. Must be within 5 minutes of server time (skew is rejected in both directions).'],
              ['X-Wevsoft-Signature', 'Yes', 'Hex HMAC-SHA256 of the signing string. Case-insensitive on verify.'],
              ['X-Client-Cert-Fingerprint', 'No', 'SHA-256 client-certificate fingerprint, forwarded by a trusted TLS-terminating edge proxy.'],
            ]} />
            <P>
              Signed requests must be sent as JSON, because the signature is computed over the exact raw body — pretty-printing or re-serialising it changes the
              bytes and the signature will not match. Management calls made from the developer console (a browser session) are not affected.
            </P>

            <H3>Enable it for an app</H3>
            <CodeBlock tabs={[
              {
                label: 'CLI',
                code: `# Issue a signing secret (shown exactly once — store it now)
npx wevsoft apps rotate-secret APP_ID

# Inspect the current configuration
npx wevsoft apps signing APP_ID

# Reject unsigned requests from now on
npx wevsoft apps require-signing APP_ID on

# Allowlist a client certificate for mTLS
npx wevsoft apps mtls APP_ID aa:bb:cc:... --required`,
              },
              {
                label: 'REST',
                code: `# Rotate the signing secret (returns signingSecretRaw once)
curl -X POST '${origin}/api/developer/apps/APP_ID/signing-secret/rotate' \\
  -H "Authorization: Bearer SESSION_TOKEN"

# Turn on enforcement
curl -X PUT '${origin}/api/developer/apps/APP_ID/signing' \\
  -H "Authorization: Bearer SESSION_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "signingRequired": true }'`,
              },
            ]} />

            <H3>Sign your requests</H3>
            <CodeBlock
              tabs={[
                { label: 'Node.js', code: requestSigningNode },
                { label: 'Java', code: requestSigningJava },
                { label: '.NET', code: requestSigningDotnet },
                { label: 'cURL (openssl)', code: requestSigningCurl },
              ]}
            />

            <H3>Mutual TLS (mTLS)</H3>
            <P>
              For the highest-assurance integrations you can require a client certificate. Register the SHA-256 fingerprints of the certificates you will
              present; the allowlist is normalised (lowercased, colons optional), de-duplicated, and capped at 20 entries. When a certificate is presented but
              is not on the list the request is refused with <C>403 mtls_forbidden</C>; when <C>mtlsRequired</C> is on and no certificate arrives it is
              refused with <C>403 mtls_required</C>. TLS terminates at the edge, so the fingerprint reaches the API as <C>X-Client-Cert-Fingerprint</C>.
              Your edge proxy must set that header from the verified peer certificate and strip any client-supplied copy of it — otherwise a caller could simply
              claim a fingerprint it does not hold, and the allowlist would enforce nothing.
            </P>
            <Callout tone="warn">
              Signature and mTLS failures answer <C>403</C>/<C>401</C> — never <C>401</C> for a recoverable client problem. A bad signature is rejected
              <em>before</em> your rate-limit quota is spent, so a misconfigured client cannot burn your monthly budget.
            </Callout>
          </section>

          <section className="space-y-4">
            <H2 id="batch">Batch requests</H2>
            <P>
              Send up to 50 developer API calls in one HTTP request with <C>POST /api/developer/v1/batch</C>. Each sub-request runs in order with the same
              credential (OAuth access token or <C>X-API-Key</C>), so scopes, IP allowlist, rate limits and request logs apply to every item exactly as if you
              had called it directly. Only developer API paths are accepted and batches cannot be nested.
            </P>
            <CodeBlock tabs={[{ label: 'Request', code: `POST /api/developer/v1/batch
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "requests": [
    { "name": "post", "method": "POST", "relative_url": "/developer/posts", "body": { "content": "Hi", "privacy": "public" } },
    { "method": "GET", "relative_url": "/developer/posts/{result=post:$.data.id}", "depends_on": "post" }
  ]
}` }]} />
            <P>
              The response is <C>{'{ "results": [{ index, name?, status, body }] }'}</C>, one entry per sub-request in the same order. Name an item and reference its
              JSON result from later items with <C>{'{result=NAME:$.path}'}</C>. An item whose <C>depends_on</C> did not return 2xx is skipped with status <C>424</C>.
              The batch call itself counts as one request toward your rate limit, plus one per item.
            </P>
          </section>

          <section className="space-y-4">
            <H2 id="test-users">Test users & Sandbox</H2>
            <P>
              Each app can create up to 50 synthetic test users from <C>Developer Tools → Test Users</C>. They have no email, phone or password, cannot sign in to
              Wevsoft, never appear in real people's search results or feeds, and their access tokens only work for the app that created them while it is in
              Development mode. You can make them friends or follow each other, issue 24-hour access tokens for them, and delete them all at once.
            </P>
            <P>
              In addition, you can programmatically populate and purge sandbox test data using the Developer Sandbox API:
            </P>
            <CodeBlock tabs={[
              {
                label: 'Seed Sandbox Data',
                code: `# Generate sample test posts, reels, and communities for your app
curl -X POST '${origin}/api/developer/sandbox/seed' \\
  -H "X-API-Key: wev_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "count": 3, "includeReels": true, "includeGroups": true }'`,
              },
              {
                label: 'Reset Sandbox Data',
                code: `# Purge all synthetic sandbox data created for your app
curl -X POST '${origin}/api/developer/sandbox/reset' \\
  -H "X-API-Key: wev_live_YOUR_API_KEY"'`,
              },
            ]} />
          </section>

          <section className="space-y-4">
            <H2 id="cli">Developer CLI (`wevsoft`)</H2>
            <P>
              The official Wevsoft Developer CLI (<C>@wevsoft/cli</C>) lets you manage apps, test APIs, download OpenAPI specs, scaffold starter templates, and forward webhooks locally directly from your terminal.
            </P>
            <CodeBlock tabs={[
              {
                label: 'CLI Workflows',
                code: `# 1. Authenticate with your API key or token
npx wevsoft auth login --key wev_live_YOUR_KEY

# 2. Check credentials & connection status
npx wevsoft auth status

# 3. List or create developer apps
npx wevsoft apps list
npx wevsoft apps create --name "My Merchant App" --redirect-uri "http://localhost:3000/callback"

# 4. Execute API calls with formatted output & latency timing
npx wevsoft api GET /developer/insights/account
npx wevsoft api POST /developer/reels --data '{"videoUrl":"https://cdn.example.com/v.mp4","caption":"Hello World"}'

# 5. Scaffold a starter integration
npx wevsoft init node-starter --name my-app
npx wevsoft init python-starter --name my-python-app
npx wevsoft init webhook-receiver --name my-webhook-server

# 6. Listen to and forward live webhooks to your local development server
npx wevsoft webhooks listen --forward-to http://localhost:3000/webhook

# 7. Download live OpenAPI 3.1 specifications
npx wevsoft openapi download --format json
npx wevsoft openapi download --format yaml

# 8. Harden your app with request signing & mutual TLS
npx wevsoft apps rotate-secret APP_ID
npx wevsoft apps signing APP_ID
npx wevsoft apps require-signing APP_ID on
npx wevsoft apps mtls APP_ID aa:bb:cc:... --required`,
              },
            ]} />
          </section>

          <section className="space-y-4">
            <H2 id="sdks">Official SDKs (7 Languages)</H2>
            <P>
              The repository ships first-party, typed SDKs across 7 major languages with full support for OAuth 2.0 PKCE, API keys, HMAC-SHA256 request signing,
              Reels, Groups, Unified Search, Account & Post Insights, In-App Notifications, Social Graph, and Webhook HMAC verification:
            </P>
            <CodeBlock tabs={[
              {
                label: 'TypeScript (@wevsoft/sdk)',
                code: `import { WevsoftClient, verifyWebhookSignature } from '@wevsoft/sdk';

const wev = new WevsoftClient({ baseUrl: '${origin}', apiKey: 'wev_live_...' });

// Add a signing secret to send HMAC-SHA256 signed requests (opt-in per app):
// const wev = new WevsoftClient({ baseUrl: '${origin}', apiKey, signingSecret });
// await wev.apps.setSigningRequired(appId, true);

// Fetch 30-day Account Insights
const insights = await wev.insights.account('30d');

// Publish a Reel
const reel = await wev.reels.create({
  videoUrl: 'https://cdn.example.com/demo.mp4',
  caption: 'Launched via TypeScript SDK #dev'
});

// Send In-App Notification
await wev.notifications.send({
  userId: 'TARGET_USER_ID',
  title: 'Order Delivered',
  body: 'Your items have arrived safely.'
});`,
              },
              {
                label: 'Python (wevsoft)',
                code: `from wevsoft import WevsoftClient

wev = WevsoftClient(base_url="${origin}", api_key="wev_live_...")

# Fetch Account Insights
insights = wev.insights.account("30d")

# Publish a Reel
reel = wev.reels.create(
    video_url="https://cdn.example.com/demo.mp4",
    caption="Launched via Python SDK"
)

# Search
results = wev.search.unified("technology", search_type="all")`,
              },
              {
                label: 'PHP (wevsoft/sdk)',
                code: `<?php
require 'vendor/autoload.php';

use Wevsoft\\WevsoftClient;

$wev = new WevsoftClient(
    baseUrl: '${origin}',
    apiKey: 'wev_live_...'
);

// Fetch Account Insights
$insights = $wev->getAccountInsights('30d');

// Discover Groups
$groups = $wev->listGroups(['limit' => 10]);`,
              },
              {
                label: 'Go (wevsoft/sdk-go)',
                code: `package main

import (
    "context"
    "fmt"
    "github.com/wevsoft/sdk-go"
)

func main() {
    client, _ := wevsoft.NewClient(wevsoft.Options{
        BaseURL: "${origin}",
        APIKey:  "wev_live_...",
    })

    ctx := context.Background()
    insights, _ := client.GetAccountInsights(ctx, "30d")
    fmt.Printf("Insights: %+v\\n", insights)
}`,
              },
              {
                label: 'Dart (wevsoft_sdk)',
                code: `import 'package:wevsoft_sdk/wevsoft.dart';

void main() async {
  final wev = WevsoftClient(
    baseUrl: '${origin}',
    apiKey: 'wev_live_...',
    signingSecret: 'SIGNING_SECRET', // optional HMAC-SHA256 request signing
  );

  final insights = await wev.getAccountInsights(timeframe: '30d');
  print('Insights: $insights');
}`,
              },
              {
                label: 'Java (com.wevsoft:wevsoft-sdk)',
                code: `import com.wevsoft.sdk.WevsoftClient;
import java.util.Map;

WevsoftClient client = WevsoftClient.builder()
    .baseUrl("${origin}")
    .apiKey(System.getenv("WEVSOFT_API_KEY"))
    .signingSecret(System.getenv("WEVSOFT_SIGNING_SECRET")) // optional
    .build();

Map<String, Object> insights = WevsoftClient.asMap(client.insights().account("30d"));
System.out.println(insights);
// Zero runtime dependencies — ships its own JSON codec.`,
              },
              {
                label: '.NET (Wevsoft.Sdk)',
                code: `using Wevsoft.Sdk;

using var client = new WevsoftClient(new WevsoftClientOptions
{
    BaseUrl = "${origin}",
    ApiKey = Environment.GetEnvironmentVariable("WEVSOFT_API_KEY"),
    SigningSecret = Environment.GetEnvironmentVariable("WEVSOFT_SIGNING_SECRET"), // optional
});

var insights = await client.GetAccountInsightsAsync("30d");
Console.WriteLine(insights?["data"]?.ToJsonString());`,
              },
            ]} />
          </section>

          <section className="space-y-4">
            <H2 id="m2m-oauth">Server-to-Server M2M OAuth (client_credentials)</H2>
            <P>
              Backend daemons, cron jobs, and microservices can authenticate directly with Wevsoft without user browser redirection using the standard RFC 6749 <C>client_credentials</C> grant:
            </P>
            <CodeBlock
              tabs={[
                {
                  label: 'cURL',
                  code: `# Exchange Client ID and Client Secret for an App Bearer Token
curl -X POST '${origin}/api/oauth/token' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "grant_type": "client_credentials",
    "client_id": "app_client_id_here",
    "client_secret": "app_client_secret_here"
  }'

# Response:
{
  "access_token": "wev_m2m_token_...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "profile reels.read groups.read search.read insights.read"
}`,
                },
              ]}
            />
          </section>

          <section className="space-y-4">
            <H2 id="monetization">Monetization & Developer Payouts</H2>
            <P>
              Wevsoft provides an end-to-end monetization ecosystem for developers. Configure app pricing (Free, Paid Upfront, or Recurring Subscription) and withdraw earned revenues directly to bKash, Nagad, or Bank Wire.
            </P>
            <CodeBlock
              tabs={[
                {
                  label: 'cURL',
                  code: `# 1. Fetch Developer Payout & Balance Summary
curl -X GET '${origin}/api/developer/payouts/summary' \\
  -H 'Authorization: Bearer YOUR_TOKEN'

# 2. Submit a Withdrawal Request (Min ৳500)
curl -X POST '${origin}/api/developer/payouts/request' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "amount": 1500,
    "method": "BKASH",
    "destinationHint": "+8801700000000",
    "note": "Monthly revenue payout"
  }'`,
                },
              ]}
            />
          </section>

          <section className="space-y-4">
            <H2 id="realtime-events">Real-Time Server-Sent Events (SSE) Live Streams</H2>
            <P>
              Listen to real-time events published across the Wevsoft network without polling. Connect via browser <C>EventSource</C> or any HTTP streaming client with your Bearer token or API key. Filter streams by topic using <C>?events=post.created,reel.published</C>.
            </P>
            <CodeBlock
              tabs={[
                {
                  label: 'JavaScript',
                  code: `// Connect to Real-Time SSE Stream with EventSource
const streamUrl = '${origin}/api/developer/events/stream?token=YOUR_TOKEN&events=post.created,reel.published';
const source = new EventSource(streamUrl);

source.addEventListener('handshake', (e) => {
  console.log('Connected to stream:', JSON.parse(e.data));
});

source.addEventListener('post.created', (e) => {
  const post = JSON.parse(e.data);
  console.log('New post published:', post);
});

source.addEventListener('ping', () => {
  // Heartbeat received (fires every 15s)
});

source.onerror = (err) => {
  console.error('SSE Stream error:', err);
};`,
                },
                {
                  label: 'cURL',
                  code: `# Stream events via curl:
curl -N '${origin}/api/developer/events/stream?events=post.created,reel.published' \\
  -H 'Authorization: Bearer YOUR_TOKEN'`,
                },
              ]}
            />
          </section>

          <section className="space-y-4">
            <H2 id="websockets">Bi-Directional WebSocket Gateway</H2>
            <P>
              For high-throughput interactive applications that require full-duplex client-to-server messaging and real-time state synchronization, connect to the Wevsoft WebSocket Gateway at <C>/api/developer/ws</C>. Authenticate via query parameters (<C>?token=</C> or <C>?apiKey=</C>) or an initial JSON handshake frame.
            </P>
            <CodeBlock
              tabs={[
                {
                  label: 'JavaScript (Browser / Node)',
                  code: `// Connect to Bi-Directional WebSocket Gateway
const wsUrl = '${origin.replace(/^http/, 'ws')}/api/developer/ws?token=YOUR_TOKEN&topics=post.created,reel.published';
const socket = new WebSocket(wsUrl);

socket.onopen = () => {
  console.log('Connected to WebSocket Gateway');
  
  // Heartbeat ping
  socket.send(JSON.stringify({ type: 'ping' }));
  
  // Dynamic topic subscription
  socket.send(JSON.stringify({ type: 'subscribe', topics: ['order.paid', 'custom.event'] }));
};

socket.onmessage = (event) => {
  const frame = JSON.parse(event.data);
  if (frame.type === 'event') {
    console.log(\`Received event [\${frame.topic}]:\`, frame.data);
  } else if (frame.type === 'pong') {
    console.log('Keepalive heartbeat confirmed');
  }
};

// Client-to-server app broadcast
function broadcastToApp(data) {
  socket.send(JSON.stringify({
    type: 'publish',
    topic: 'app.custom_sync',
    data,
  }));
}`,
                },
                {
                  label: 'Python (websockets)',
                  code: `import asyncio
import json
import websockets

async def connect_gateway():
    uri = "${origin.replace(/^http/, 'ws')}/api/developer/ws?apiKey=YOUR_API_KEY&topics=post.created"
    async with websockets.connect(uri) as websocket:
        # Send heartbeat
        await websocket.send(json.dumps({"type": "ping"}))
        
        while True:
            message = await websocket.recv()
            frame = json.loads(message)
            if frame.get("type") == "event":
                print(f"Received {frame['topic']}:", frame["data"])

asyncio.run(connect_gateway())`,
                },
              ]}
            />
          </section>

          <section className="space-y-4">
            <H2 id="webhooks-v2">Webhooks v2, Exponential Backoff & Dead-Letter Queue (DLQ)</H2>
            <P>
              Webhooks v2 provides enterprise-grade delivery reliability. Each delivery uses HMAC-SHA256 signing, randomized jitter backoff, automatic retries, and dead-letter quarantine after 5 failed attempts.
            </P>
            <Callout>
              Deliveries that fail 5 consecutive times transition to <C>dead</C> status and enter the Dead-Letter Queue (DLQ). You can inspect and replay individual deliveries or bulk-replay the entire DLQ via the Developer Console or REST API.
            </Callout>
            <CodeBlock
              tabs={[
                {
                  label: 'Signature Verification (Node.js)',
                  code: `import crypto from 'node:crypto';

// Verify incoming Wevsoft webhook
function verifyWebhook(rawBody, headers, secret, toleranceSec = 300) {
  const signature = headers['x-wevsoft-signature'];
  const timestamp = headers['x-wevsoft-timestamp'];
  
  if (!signature || !timestamp) return false;
  
  // Prevent replay attacks
  const age = Math.abs(Date.now() - parseInt(timestamp, 10));
  if (age > toleranceSec * 1000) return false;
  
  const expected = crypto
    .createHmac('sha256', secret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest('hex');
    
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}`,
                },
                {
                  label: 'Redeliver API (cURL)',
                  code: `# Replay / redeliver any delivery attempt:
curl -X POST '${origin}/api/developer/apps/{appId}/webhooks/{webhookId}/deliveries/{deliveryId}/redeliver' \\
  -H 'Authorization: Bearer YOUR_TOKEN'

# Fetch Dead-Letter Queue (DLQ):
curl -X GET '${origin}/api/developer/apps/{appId}/webhooks/{webhookId}/dlq' \\
  -H 'Authorization: Bearer YOUR_TOKEN'

# Replay all DLQ deliveries:
curl -X POST '${origin}/api/developer/apps/{appId}/webhooks/{webhookId}/dlq/replay-all' \\
  -H 'Authorization: Bearer YOUR_TOKEN'`,
                },
              ]}
            />
          </section>

          <section className="space-y-4">
            <H2 id="event-simulator">Developer Event Simulator</H2>
            <P>
              Test your webhook receivers, SSE stream listeners, and WebSocket handlers locally without having to generate real production user traffic. Dispatch synthetic events across any combination of channels via the API or Developer Console.
            </P>
            <CodeBlock
              tabs={[
                {
                  label: 'cURL',
                  code: `curl -X POST '${origin}/api/developer/events/simulate' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "eventType": "post.created",
    "channels": ["webhook", "sse", "ws"],
    "payload": {
      "id": "mock_post_123",
      "content": "Testing event simulator integration",
      "privacy": "public"
    }
  }'`,
                },
                {
                  label: 'CLI',
                  code: `# Simulate event via Wevsoft CLI:
wevsoft events simulate post.created

# Check WebSocket Gateway telemetry:
wevsoft events ws-status`,
                },
              ]}
            />
          </section>

          <section className="space-y-4">
            <H2 id="ai-gateway">AI Gateway Suite</H2>
            <P>
              Enterprise-grade AI primitives natively built into the Wevsoft platform: text embeddings for semantic vector search, automated toxicity moderation, multilingual machine translation, and generative image synthesis.
            </P>
            <CodeBlock
              tabs={[
                {
                  label: 'cURL',
                  code: `# 1. Vector Embeddings
curl -X POST '${origin}/api/developer/ai/embeddings' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"input": "Search query or document chunk"}'

# 2. Content Moderation
curl -X POST '${origin}/api/developer/ai/moderation' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"input": "Text to evaluate for toxicity and safety"}'

# 3. Multilingual Translation
curl -X POST '${origin}/api/developer/ai/translate' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"text": "Hello world", "targetLanguage": "bn"}'

# 4. Generative Images
curl -X POST '${origin}/api/developer/ai/images/generate' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"prompt": "A modern futuristic skyline at sunset", "size": "1024x1024"}'`,
                },
              ]}
            />
          </section>

          <section className="space-y-4">
            <H2 id="app-reviews">App Store Reviews & Developer Replies</H2>
            <P>
              Engage with your user base directly on the Wevsoft App Store Directory. Fetch 1–5 star ratings, review distributions, and post official developer responses to customer feedback.
            </P>
            <CodeBlock
              tabs={[
                {
                  label: 'cURL',
                  code: `# 1. Get Reviews & Rating Summary for an App
curl -X GET '${origin}/api/developer/directory/APP_ID/reviews'

# 2. Submit a User Review & Rating (1 to 5)
curl -X POST '${origin}/api/developer/directory/APP_ID/reviews' \\
  -H 'Authorization: Bearer USER_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"rating": 5, "comment": "Exceptional app, seamlessly integrated!"}'

# 3. Post an Official Developer Reply
curl -X POST '${origin}/api/developer/apps/APP_ID/reviews/REVIEW_ID/reply' \\
  -H 'Authorization: Bearer DEVELOPER_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"reply": "Thank you for the wonderful feedback! Version 2.0 is launching soon."}'`,
                },
              ]}
            />
          </section>

          <section className="space-y-4">
            <H2 id="enterprise-teams">Enterprise Multi-Member Teams & Granular RBAC</H2>
            <P>
              Collaborate securely across your engineering, finance, and customer support organizations. The Developer Platform provides 6 granular roles with strict access controls:
            </P>
            <div className="grid gap-2 sm:grid-cols-2 text-xs">
              <div className="p-3 rounded-xl border border-border bg-card">
                <b>Owner & Admin:</b> Full management across applications, credentials, webhooks, and team memberships.
              </div>
              <div className="p-3 rounded-xl border border-border bg-card">
                <b>Developer:</b> Configure apps, test in sandbox, manage webhooks, and inspect API request logs.
              </div>
              <div className="p-3 rounded-xl border border-border bg-card">
                <b>Billing & Finance:</b> Manage in-app monetization pricing models, view gross sales, and submit withdrawal requests.
              </div>
              <div className="p-3 rounded-xl border border-border bg-card">
                <b>Customer Support:</b> Monitor user ratings, review feedback, and post official developer replies.
              </div>
            </div>
            <CodeBlock
              tabs={[
                {
                  label: 'Team Management (cURL)',
                  code: `# 1. List Team Roles & Capabilities
curl -X GET '${origin}/api/developer/team/roles' \\
  -H 'Authorization: Bearer YOUR_TOKEN'

# 2. Invite a Billing Manager
curl -X POST '${origin}/api/developer/team' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"identifier": "finance@company.com", "role": "billing"}'

# 3. Update Member Role
curl -X PUT '${origin}/api/developer/team/MEMBER_ID/role' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"role": "support"}'

# 4. Transfer Primary Ownership
curl -X POST '${origin}/api/developer/team/transfer-ownership' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"targetUserId": "TARGET_USER_ID", "confirmation": "TRANSFER"}'`,
                },
              ]}
            />
          </section>

          <section className="space-y-4">
            <H2 id="app-verification">App Store Verification & Readiness Checklist</H2>
            <P>
              Before publishing to the Wevsoft App Store Directory, run automated readiness checks to ensure compliance with branding, privacy, and OAuth security standards.
            </P>
            <Callout>
              Applications reviewed by the platform review team can earn trust badges: <b>Verified App</b> (Blue Checkmark) and <b>Official Partner</b> (Gold Star) for high-visibility directory placement.
            </Callout>
            <CodeBlock
              tabs={[
                {
                  label: 'Readiness Checklist (cURL)',
                  code: `# Evaluate App Store pre-submission checklist:
curl -X GET '${origin}/api/developer/apps/APP_ID/review-checklist' \\
  -H 'Authorization: Bearer YOUR_TOKEN'

# Submit for Review:
curl -X POST '${origin}/api/developer/apps/APP_ID/submit-review' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"notes": "Production release v1.0.0 with full OAuth integration"}'`,
                },
                {
                  label: 'Developer CLI',
                  code: `# Run review readiness check in terminal:
wevsoft apps checklist APP_ID

# Manage team members:
wevsoft team roles
wevsoft team add engineer@company.com --role developer
wevsoft team update-role MEMBER_ID billing
wevsoft team transfer TARGET_USER_ID --confirm TRANSFER`,
                },
              ]}
            />
          </section>

          <section className="space-y-4">
            <H2 id="rate-limiting">Multi-Tier Rate Limiting & Platform Status</H2>
            <P>
              All Developer API requests are protected by distributed edge rate limiting with standard RFC headers to protect platform stability and ensure fair allocation across developers.
            </P>
            <div className="grid gap-2 sm:grid-cols-3 text-xs">
              <div className="p-3 rounded-xl border border-border bg-card">
                <b className="text-primary font-semibold block mb-1">Free Tier</b>
                <span className="text-muted-foreground">60 req/min &bull; 10,000 monthly quota. Default for sandbox and personal apps.</span>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card">
                <b className="text-primary font-semibold block mb-1">Pro / Standard Tier</b>
                <span className="text-muted-foreground">300 req/min &bull; 100,000 monthly quota. For production apps in the App Directory.</span>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card">
                <b className="text-primary font-semibold block mb-1">Enterprise Tier</b>
                <span className="text-muted-foreground">1,200 req/min &bull; 1,000,000 monthly quota. High-concurrency verified partners.</span>
              </div>
            </div>

            <H3>Rate Limit Headers</H3>
            <P>Every response from the Developer API includes these standard headers:</P>
            <ParamTable
              rows={[
                ['X-RateLimit-Limit', 'integer', 'Maximum requests allowed per 60-second window (e.g. 60, 300, 1200).'],
                ['X-RateLimit-Remaining', 'integer', 'Number of requests remaining in the current minute window.'],
                ['X-RateLimit-Reset', 'integer', 'Unix epoch timestamp (seconds) when the current window resets.'],
                ['Retry-After', 'integer', 'Sent with HTTP 429 errors indicating seconds until next request is allowed.'],
              ]}
            />

            <H3>Public Status Page & Diagnostics</H3>
            <P>
              Monitor live platform health, 30-day uptime metrics, and service status across all subsystems at{' '}
              <Link to="/developer/status" className="text-primary underline font-medium">
                /developer/status
              </Link>
              , or query programmatically:
            </P>

            <CodeBlock
              tabs={[
                {
                  label: 'cURL & CLI',
                  code: `# 1. Public Platform Health & Subsystem Status (No Auth Required)
curl -X GET '${origin}/api/developer/status'

# 2. Authenticated Probe & Latency Ping
curl -X GET '${origin}/api/developer/ping' \\
  -H 'Authorization: Bearer YOUR_TOKEN'

# 3. Check App Rate Limits & Quotas
curl -X GET '${origin}/api/developer/rate-limits?appId=APP_ID' \\
  -H 'Authorization: Bearer YOUR_TOKEN'

# 4. CLI Status & Ping Commands
wevsoft status
wevsoft ping
wevsoft rate-limits --app-id APP_ID`,
                },
                {
                  label: 'TypeScript SDK',
                  code: `import { WevsoftClient } from '@wevsoft/sdk';

const client = new WevsoftClient({ apiKey: 'dev_key_...' });

// Check real-time platform status
const status = await client.status.get();
console.log('Platform Status:', status.status);

// Send low-latency ping probe
const pong = await client.ping();
console.log('Probe response:', pong.message, 'Remaining:', pong.rateLimit?.remaining);

// Inspect rate limit quotas
const limits = await client.rateLimits.get('APP_ID');
console.log('Tier:', limits.tier, 'Remaining:', limits.remainingPerMinute);`,
                },
                {
                  label: 'Python SDK',
                  code: `from wevsoft import WevsoftClient

client = WevsoftClient(api_key="dev_key_...")

# Check platform status
status = client.status.get()
print(f"Status: {status['status']}")

# Diagnostic ping
pong = client.ping()
print(f"Ping: {pong['message']}")

# Inspect rate limits
limits = client.rate_limits.get(app_id="APP_ID")
print(f"Remaining: {limits['remainingPerMinute']}/{limits['limitPerMinute']}")`,
                },
              ]}
            />
          </section>

          <section className="space-y-4">
            <H2 id="scopes">Scopes</H2>
            <P>Ask only for what you need. People see each permission on the consent screen.</P>
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
              {OAUTH_SCOPES.map((s) => (
                <div key={s.scope} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-4 py-3">
                  <C>{s.scope}</C>
                  <span className="text-sm text-muted-foreground">{s.title}. {s.description}{s.always ? ' Always included.' : ''}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <H2 id="errors">Errors</H2>
            <ParamTable
              rows={[
                ['invalid_request', '400', 'A required parameter is missing (e.g. code, client_id, or code_verifier for a PKCE code).'],
                ['invalid_client', '401', 'Unknown client_id, wrong client_secret, or no secret without a valid S256 PKCE exchange.'],
                ['invalid_grant', '400', 'The code or refresh token is invalid, expired, already used, issued to another app, or the verifier does not match.'],
                ['invalid_redirect_uri', '400', 'redirect_uri is not registered on the app.'],
                ['invalid_scope', '400', 'An unknown scope was requested.'],
                ['unsupported_grant_type', '400', 'Supported grant types are authorization_code and refresh_token.'],
                ['invalid_signature', '401', 'Request signing is on, but X-Wevsoft-Signature / X-Wevsoft-Timestamp is missing, wrong, or outside the 5-minute replay window.'],
                ['signing_not_configured', '403', 'The app requires signed requests but has no signing secret yet — issue one first.'],
                ['mtls_required', '403', 'The app requires a client certificate and none was presented.'],
                ['mtls_forbidden', '403', 'A client certificate was presented but its fingerprint is not on the allowlist.'],
              ]}
            />
          </section>

          <section className="space-y-4">
            <H2 id="security">Security checklist</H2>
            <ul className="space-y-2 text-[15px] text-muted-foreground list-disc pl-5 leading-7">
              <li>Generate a fresh <C>state</C> for every sign-in and reject callbacks where it doesn't match.</li>
              <li>Keep the client secret on your server. If it leaks, rotate it in the Credentials tab right away.</li>
              <li>Use PKCE (S256) for every public client, and register exact redirect URIs only.</li>
              <li>Treat access tokens like passwords: store them encrypted and never log them.</li>
              <li>Enable request signing so a leaked API key alone is not enough to impersonate you, and store the signing secret like any other credential.</li>
              <li>Sign the exact raw JSON body — re-serialising it changes the bytes and the signature will not match.</li>
              <li>Add a client-certificate allowlist for high-assurance integrations, and keep the fingerprint list trimmed to certificates you still control.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <H2 id="platform-terms">Platform terms</H2>
            <Callout tone="warn">
              Summary only. By registering you agree to use people's data only for the features they approved, keep credentials secure, respect
              deletion requests, publish a privacy policy for production apps, and not misrepresent your app on the consent screen. Wevsoft may
              suspend apps that break these rules.
            </Callout>
          </section>

          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold">Ready to build?</p>
              <p className="text-sm text-muted-foreground">Create an app and get your credentials in seconds.</p>
            </div>
            <Link
              to="/developer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110"
            >
              Go to dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
