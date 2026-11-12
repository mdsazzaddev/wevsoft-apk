import React, { useMemo, useState } from 'react';
import { SectionCard, CodeBlock, CopyButton } from './devUi';
import { appOrigin, issueSpaceToken } from './devApi';

/**
 * Ready-to-use HTTP requests for Space automations (n8n HTTP Request node, Zapier, scripts).
 * Pairs with the message.received webhook: its payload carries data.spaceId and
 * data.conversationId, which plug straight into the reply URL below.
 * Tokens are never shown here - use a Space access token (scopes spaces.inbox / spaces.posts.write).
 */

type ActionId = 'graph' | 'reply' | 'replyThread' | 'post' | 'inbox';

interface BodyField {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example: string;
  n8n?: string;
}

interface ActionDef {
  id: ActionId;
  label: string;
  method: 'GET' | 'POST';
  scope: string;
  path: (space: string, n8n: boolean) => string;
  body?: (n8n: boolean) => Record<string, unknown>;
  fields?: BodyField[];
  pathParams: { name: string; description: string; n8n?: string }[];
  note: string;
  /** Facebook Send API style: token in ?access_token=, body via -d. */
  fbStyle?: boolean;
}

const N8N_SPACE = '{{ $json.body.data.spaceId }}';
const N8N_CONVERSATION = '{{ $json.body.data.conversationId }}';
const N8N_TEXT = '{{ $json.body.data.message.text }}';
const N8N_SENDER = '{{ $json.body.data.sender.id }}';
const TOKEN_PLACEHOLDER = 'YOUR_SPACE_ACCESS_TOKEN';

const SPACE_PARAM = { name: 'space', description: 'Space id or handle (must have this app installed).', n8n: N8N_SPACE };

const ACTIONS: ActionDef[] = [
  {
    id: 'graph',
    label: 'Send message (Facebook Send API format)',
    method: 'POST',
    scope: 'spaces.inbox',
    fbStyle: true,
    path: (space) => `/api/graph/v1/${space}/messages`,
    body: (n8n) => ({
      recipient: { id: n8n ? N8N_SENDER : 'USER_ID' },
      messaging_type: 'RESPONSE',
      message: { text: n8n ? `Thanks! You said: ${N8N_TEXT}` : 'Hello, world!' },
    }),
    pathParams: [
      SPACE_PARAM,
      { name: 'access_token', description: 'Query parameter: Space access token (or send Authorization: Bearer instead).' },
    ],
    fields: [
      { name: 'recipient.id', type: 'string', required: true, description: 'Customer user id = data.sender.id from the message.received webhook. Required unless recipient.conversation_id is set.', example: 'USER_ID', n8n: N8N_SENDER },
      { name: 'recipient.conversation_id', type: 'string', required: false, description: 'Existing Space conversation id (data.conversationId from the webhook).', example: 'CONVERSATION_ID', n8n: N8N_CONVERSATION },
      { name: 'messaging_type', type: 'RESPONSE | UPDATE | MESSAGE_TAG', required: false, description: 'Default RESPONSE. MESSAGE_TAG also needs "tag".', example: 'RESPONSE' },
      { name: 'tag', type: 'string', required: false, description: 'Only with messaging_type MESSAGE_TAG.', example: 'ACCOUNT_UPDATE' },
      { name: 'message.text', type: 'string', required: true, description: 'Message text (max 4000). Required unless message.attachment is set.', example: 'Hello, world!', n8n: `Thanks! You said: ${N8N_TEXT}` },
      { name: 'message.attachment', type: 'object', required: false, description: 'Image: {"type":"image","payload":{"url":"https://..."}}', example: '{"type":"image","payload":{"url":"https://example.com/a.jpg"}}' },
    ],
    note: 'Facebook Send API compatible. Sends as the Space (creates the conversation if needed); your app receives message.echo. Response: {"recipient_id":"...","message_id":"..."}. Errors: {"error":{"message","type","code"}}.',
  },
  {
    id: 'reply',
    label: 'Reply to a message (as the Space)',
    method: 'POST',
    scope: 'spaces.inbox',
    path: (space, n8n) =>
      `/api/developer/spaces/${space}/conversations/${n8n ? N8N_CONVERSATION : 'CONVERSATION_ID'}/messages`,
    body: (n8n) => ({ text: n8n ? `Thanks! You said: ${N8N_TEXT}` : 'Thanks for your message!' }),
    pathParams: [
      SPACE_PARAM,
      { name: 'conversationId', description: 'data.conversationId from the message.received webhook.', n8n: N8N_CONVERSATION },
    ],
    fields: [
      { name: 'text', type: 'string', required: true, description: 'Reply text (max 4000 chars). Required unless imageUrl is set.', example: 'Thanks for your message!', n8n: `Thanks! You said: ${N8N_TEXT}` },
      { name: 'imageUrl', type: 'string (URL)', required: false, description: 'Public image URL to send with (or instead of) the text.', example: 'https://example.com/photo.jpg' },
    ],
    note: 'Sends a message as the Space into the customer conversation. Your app receives message.echo for it.',
  },
  {
    id: 'replyThread',
    label: 'Reply by inbox thread id',
    method: 'POST',
    scope: 'spaces.inbox',
    path: (space) => `/api/developer/spaces/${space}/inbox/THREAD_ID/reply`,
    body: () => ({ text: 'Thanks for your message!' }),
    pathParams: [SPACE_PARAM, { name: 'threadId', description: 'Inbox thread id from GET /inbox.' }],
    fields: [
      { name: 'text', type: 'string', required: true, description: 'Reply text (max 4000 chars). Required unless imageUrl is set.', example: 'Thanks for your message!' },
      { name: 'imageUrl', type: 'string (URL)', required: false, description: 'Public image URL.', example: 'https://example.com/photo.jpg' },
    ],
    note: 'Same as above, keyed by the inbox thread id instead of the conversation id.',
  },
  {
    id: 'post',
    label: 'Create a Space post',
    method: 'POST',
    scope: 'spaces.posts.write',
    path: (space) => `/api/developer/spaces/${space}/posts`,
    body: () => ({
      text: 'Hello from our automation!',
      targeting: { age_min: 18, age_max: 35, genders: [1, 2], geo_locations: { countries: ['BD'], cities: [{ name: 'Dhaka' }] }, locales: ['bn', 'en'] },
    }),
    pathParams: [SPACE_PARAM],
    fields: [
      { name: 'text', type: 'string', required: true, description: 'Post text.', example: 'Hello from our automation!' },
      { name: 'kind', type: 'string', required: false, description: 'Content kind, default TEXT.', example: 'TEXT' },
      { name: 'media', type: 'array of { url, type, altText? }', required: false, description: 'Images / videos to attach. type: image or video.', example: '[{ "url": "https://example.com/a.jpg", "type": "image" }]' },
      { name: 'targeting', type: 'object (Facebook Graph shape)', required: false, description: 'Audience restriction: only matching people can see the post (others and logged-out visitors get "not available"; the Space team always sees it). age_min / age_max 13-65 (65 = 65+), genders [1 = male, 2 = female], geo_locations { countries: [ISO codes], cities: [{ name }], regions: [{ name }] }, locales [language codes]. People missing a restricted profile field do not match.', example: '{ "age_min": 18, "age_max": 35, "geo_locations": { "countries": ["BD"] }, "locales": ["bn"] }' },
      { name: 'feed_targeting', type: 'object (same shape)', required: false, description: 'Feed preference: never hides the post; matching people see it ranked higher.', example: '{ "genders": [2] }' },
    ],
    note: 'Publishes a post on the Space. Space posts are always Public; use targeting to restrict who sees them (like Facebook Page post targeting). Invalid targeting returns 400 invalid_targeting.',
  },
  {
    id: 'inbox',
    label: 'List inbox threads',
    method: 'GET',
    scope: 'spaces.inbox',
    path: (space) => `/api/developer/spaces/${space}/inbox`,
    pathParams: [SPACE_PARAM],
    note: 'Returns the Space inbox threads (with conversationId and thread id). No body.',
  },
];

/** POSIX single-quote escaping, which n8n's Import cURL parser understands. */
const sq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/** Facebook Send API style: curl -X POST -H "Content-Type: application/json" -d '{...}' "URL?access_token=...". */
function buildFbCurl(url: string, body: string, n8n: boolean): string {
  // Double-quoted URL like Facebook's docs; single-quoted when it holds n8n {{ $json }} expressions,
  // so shells and n8n's Import cURL do not try to expand $json.
  const quotedUrl = n8n ? sq(url) : `"${url}"`;
  return `curl -X POST -H "Content-Type: application/json" -d ${sq(body)} ${quotedUrl}`;
}

function buildCurl(method: string, url: string, token: string, body: string | null): string {
  const lines = [`curl -X ${method} ${sq(url)}`];
  lines.push(`-H ${sq('Accept: application/json')}`);
  lines.push(`-H ${sq(`Authorization: Bearer ${token}`)}`);
  if (body) {
    lines.push(`-H ${sq('Content-Type: application/json')}`);
    lines.push(`--data-raw ${sq(body)}`);
  }
  return lines.join(' \\\n  ');
}

function DetailRow({ label, value, copy = true, mono = true }: { label: string; value: string; copy?: boolean; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[150px_1fr_auto] items-start gap-3 px-3 py-2 border-b border-border/60 last:border-b-0">
      <div className="text-xs font-semibold text-muted-foreground pt-0.5">{label}</div>
      <div className={`min-w-0 break-all text-[12.5px] ${mono ? 'font-mono' : ''}`}>{value}</div>
      {copy ? <CopyButton value={value} label={`Copy ${label}`} toastLabel={`${label} copied`} /> : <span />}
    </div>
  );
}

export default function SpaceApiActionsPanel({ appId }: { appId?: string }) {
  const [actionId, setActionId] = useState<ActionId>('graph');
  const [spaceInput, setSpaceInput] = useState('');
  const [n8n, setN8n] = useState(false);
  const [baseInput, setBaseInput] = useState('');
  const [issued, setIssued] = useState<{ token: string; space: string; expiresAt: string } | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const origin = (baseInput.trim() || appOrigin()).replace(/\/+$/, '');
  const dockerBase = 'http://host.docker.internal:3000';

  const generateToken = async () => {
    const space = spaceInput.trim();
    if (!space) {
      setIssueError('Enter the Space ID or handle first.');
      return;
    }
    setIssuing(true);
    setIssueError(null);
    try {
      const res = await issueSpaceToken(space, {
        ...(appId ? { appId } : {}),
        scopes: ['spaces.read', 'spaces.posts.write', 'spaces.inbox', 'spaces.events'],
      });
      setIssued({ token: res.access_token, space: res.space?.handle || space, expiresAt: res.expires_at });
    } catch (err: any) {
      setIssueError(err?.response?.data?.message || err?.message || 'Could not generate a token');
    } finally {
      setIssuing(false);
    }
  };
  const action = ACTIONS.find((a) => a.id === actionId) || ACTIONS[0];
  const hasBody = action.method !== 'GET' && Boolean(action.body);

  const spaceSegment = spaceInput.trim() ? encodeURIComponent(spaceInput.trim()) : n8n ? N8N_SPACE : 'SPACE_ID';
  const baseUrl = `${origin}${action.path(spaceSegment, n8n)}`;
  const url = action.fbStyle ? `${baseUrl}?access_token=${TOKEN_PLACEHOLDER}` : baseUrl;
  const bodyJson = hasBody && action.body ? JSON.stringify(action.body(n8n), null, 2) : null;
  const curl = useMemo(
    () => (action.fbStyle && bodyJson ? buildFbCurl(url, bodyJson, n8n) : buildCurl(action.method, url, TOKEN_PLACEHOLDER, bodyJson)),
    [action.fbStyle, action.method, url, bodyJson, n8n],
  );

  const headerLines = action.fbStyle
    ? ['Content-Type: application/json']
    : [
        `Authorization: Bearer ${TOKEN_PLACEHOLDER}`,
        'Accept: application/json',
        ...(hasBody ? ['Content-Type: application/json'] : []),
      ];

  return (
    <SectionCard
      title="Space API requests (n8n / cURL)"
      description={
        <>
          Everything needed for n8n's <b>HTTP Request</b> node: set the fields manually from <b>Request details</b>, or
          click <b>Import cURL</b> and paste the cURL command. Authenticate with a Space access token for a Space that
          installed this app (scope <code className="font-mono text-xs">{action.scope}</code>). Replace{' '}
          <code className="font-mono text-xs">{TOKEN_PLACEHOLDER}</code>; tokens are never shown on this page.
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm space-y-1">
            <span className="font-medium">Action</span>
            <select
              value={actionId}
              onChange={(e) => setActionId(e.target.value as ActionId)}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
            >
              {ACTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.method} - {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span className="font-medium">Space ID or handle (optional)</span>
            <input
              value={spaceInput}
              onChange={(e) => setSpaceInput(e.target.value)}
              placeholder={n8n ? 'Leave empty to use the webhook value' : 'e.g. fgdggd'}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
            />
          </label>
        </div>

        <label className="text-sm space-y-1 block">
          <span className="font-medium">API base URL</span>
          <div className="flex flex-wrap gap-2">
            <input
              value={baseInput}
              onChange={(e) => setBaseInput(e.target.value)}
              placeholder={appOrigin()}
              className="flex-1 min-w-[220px] h-10 rounded-xl border border-border bg-background px-3 text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => setBaseInput(dockerBase)}
              className="h-10 px-3 rounded-xl border border-border text-xs font-medium hover:bg-muted"
            >
              n8n in Docker on this PC
            </button>
            {baseInput && (
              <button type="button" onClick={() => setBaseInput('')} className="h-10 px-3 rounded-xl border border-border text-xs font-medium hover:bg-muted">
                Reset
              </button>
            )}
          </div>
          <span className="block text-xs text-muted-foreground">
            The URL must be reachable from where n8n runs. Inside a Docker container, <code className="font-mono">localhost</code> is the container itself -
            use <code className="font-mono">{dockerBase}</code>, or a public tunnel URL.
          </span>
        </label>

        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium flex-1 min-w-[200px]">Space access token</span>
            <button
              type="button"
              onClick={() => void generateToken()}
              disabled={issuing}
              className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
            >
              {issuing ? 'Generating...' : 'Generate Space access token'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Uses the Space ID/handle above and this app. Use the raw <code className="font-mono">spk_...</code> value as{' '}
            <code className="font-mono">access_token</code> (not the client secret, an API key or your login token). Existing tokens keep working.
          </p>
          {issueError && <p className="text-xs text-red-600">{issueError}</p>}
          {issued && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                <code className="flex-1 min-w-0 break-all font-mono text-xs">{issued.token}</code>
                <CopyButton value={issued.token} label="Copy token" toastLabel="Token copied" showLabel />
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Shown only once - copy it now. Space @{issued.space}, expires {new Date(issued.expiresAt).toLocaleDateString()}.
              </p>
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={n8n} onChange={(e) => setN8n(e.target.checked)} />
          Fill placeholders with n8n expressions from the message.received webhook (
          <code className="font-mono text-xs">$json.body.data.*</code>)
        </label>

        <p className="text-sm text-muted-foreground">{action.note}</p>

        {/* Request details - mirrors the n8n HTTP Request node fields */}
        <div className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Request details (n8n HTTP Request node)</div>
          <div className="rounded-xl border border-border bg-muted/30">
            <DetailRow label="Method" value={action.method} />
            <DetailRow label="URL" value={url} />
            {action.fbStyle ? (
              <>
                <DetailRow label="Authentication" value="None (token is in the URL as ?access_token=)" mono={false} copy={false} />
                <DetailRow label="Send Query Parameters" value="Off (already in the URL) - or On with access_token" mono={false} copy={false} />
                <DetailRow label="Query: access_token" value={TOKEN_PLACEHOLDER} />
              </>
            ) : (
              <>
                <DetailRow label="Authentication" value="Generic Credential Type -> Header Auth" mono={false} copy={false} />
                <DetailRow label="Header Auth name" value="Authorization" />
                <DetailRow label="Header Auth value" value={`Bearer ${TOKEN_PLACEHOLDER}`} />
                <DetailRow label="Send Query Parameters" value="Off" mono={false} copy={false} />
              </>
            )}
            <DetailRow label="Send Headers" value="On" mono={false} copy={false} />
            {headerLines.map((h) => {
              const [name, ...rest] = h.split(': ');
              return <DetailRow key={name} label={`Header: ${name}`} value={rest.join(': ')} />;
            })}
            <DetailRow label="Send Body" value={hasBody ? 'On' : 'Off'} mono={false} copy={false} />
            {hasBody && (
              <>
                <DetailRow label="Body Content Type" value="JSON" mono={false} copy={false} />
                <DetailRow label="Specify Body" value="Using JSON" mono={false} copy={false} />
                <DetailRow label="JSON" value={bodyJson || ''} />
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            If you use the Header Auth credential, you can leave the Authorization header out of Send Headers.
            {n8n && ' Switch URL and JSON to Expression mode in n8n so {{ }} values are evaluated.'}
          </p>
        </div>

        {/* Path params */}
        <div className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">URL parameters</div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Description</th>
                  <th className="text-left px-3 py-2">n8n expression</th>
                </tr>
              </thead>
              <tbody>
                {action.pathParams.map((p) => (
                  <tr key={p.name} className="border-t border-border/60">
                    <td className="px-3 py-2 font-mono text-xs">{p.name}</td>
                    <td className="px-3 py-2 text-xs">{p.description}</td>
                    <td className="px-3 py-2">
                      {p.n8n ? (
                        <span className="inline-flex items-center gap-1">
                          <code className="font-mono text-xs">{p.n8n}</code>
                          <CopyButton value={p.n8n} label="Copy expression" toastLabel="Expression copied" />
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Body fields */}
        {hasBody && action.fields && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Body fields (JSON)</div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Field</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Required</th>
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-left px-3 py-2">Example / n8n expression</th>
                  </tr>
                </thead>
                <tbody>
                  {action.fields.map((f) => (
                    <tr key={f.name} className="border-t border-border/60 align-top">
                      <td className="px-3 py-2 font-mono text-xs">{f.name}</td>
                      <td className="px-3 py-2 text-xs">{f.type}</td>
                      <td className="px-3 py-2 text-xs">{f.required ? 'Yes' : 'No'}</td>
                      <td className="px-3 py-2 text-xs">{f.description}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1">
                          <code className="font-mono text-xs break-all">{n8n && f.n8n ? f.n8n : f.example}</code>
                          <CopyButton value={n8n && f.n8n ? f.n8n : f.example} label="Copy example" toastLabel="Copied" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <CodeBlock
          tabs={[
            { label: 'cURL (Import into n8n)', code: curl },
            { label: 'Headers', code: headerLines.join('\n') },
            ...(bodyJson ? [{ label: 'JSON body', code: bodyJson }] : []),
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <CopyButton value={curl} label="Copy cURL" toastLabel="cURL copied" showLabel />
          <CopyButton value={url} label="Copy URL" toastLabel="URL copied" showLabel />
          {bodyJson && <CopyButton value={bodyJson} label="Copy JSON body" toastLabel="JSON copied" showLabel />}
        </div>
      </div>
    </SectionCard>
  );
}
