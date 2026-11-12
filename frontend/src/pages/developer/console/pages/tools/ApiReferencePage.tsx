/* Moved verbatim from ToolsPages.tsx (Phase 2 P2-5 split, no logic change). */
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Play, Webhook } from 'lucide-react';
import { appOrigin } from '../../../devApi';
import { cx } from '../../../devUi';
import { PLATFORM_LIMITS, WEBHOOK_EVENTS } from '../../consoleData';
import { Card, CodeBox, ConsolePage, InfoNote, Pill, btn, tdCls, thCls } from '../../ui';

/* ------------------------------------------------------------------ */
/* API catalogue (shared by Explorer + Reference)                      */
/* ------------------------------------------------------------------ */

interface Endpoint {
  id: string;
  group: 'OAuth 2.0' | 'Platform API';
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  title: string;
  auth: string;
  scope?: string;
  /** Scope the authorization server cannot issue yet. */
  scopeUnavailable?: boolean;
  body?: string;
  contentType?: 'json' | 'multipart';
  params?: [string, string, string][];
  response: string;
}
const ENDPOINTS: Endpoint[] = [
  {
    id: 'batch',
    group: 'Platform API',
    method: 'POST',
    path: '/api/developer/v1/batch',
    title: 'Batch up to 50 requests',
    auth: 'Bearer access token or X-API-Key',
    body: `{
  "requests": [
    { "name": "me", "method": "GET", "relative_url": "/oauth/userinfo" },
    { "name": "post", "method": "POST", "relative_url": "/developer/posts", "body": { "content": "Hello from a batch", "privacy": "public" } },
    { "method": "GET", "relative_url": "/developer/posts/{result=post:$.data.id}", "depends_on": "post" }
  ]
}`,
    params: [
      ['requests[]', 'array', 'Up to 50 sub-requests, run in order'],
      ['requests[].method', 'string', 'GET, POST, PUT, PATCH or DELETE'],
      ['requests[].relative_url', 'string', 'Developer API path, relative to /api (e.g. /developer/posts)'],
      ['requests[].body', 'object', 'Optional JSON body'],
      ['requests[].name', 'string', 'Optional name other items can reference'],
      ['requests[].depends_on', 'string | string[]', 'Optional: skip with 424 unless these named items returned 2xx'],
    ],
    response: `{
  "results": [
    { "index": 0, "name": "me", "status": 200, "body": { "sub": "user-id" } },
    { "index": 1, "name": "post", "status": 201, "body": { "data": { "id": "post-id" } } },
    { "index": 2, "status": 200, "body": { "data": { "id": "post-id" } } }
  ]
}`,
  },
  {
    id: 'userinfo',
    group: 'OAuth 2.0',
    method: 'GET',
    path: '/api/oauth/userinfo',
    title: 'Get the signed-in user',
    auth: 'Bearer access token',
    scope: 'profile',
    response: `{
  "sub": "user-id",
  "name": "Display Name",
  "preferred_username": "username",
  "picture": "https://…",
  "email": "person@example.com",
  "email_verified": true
}`,
  },
  {
    id: 'token',
    group: 'OAuth 2.0',
    method: 'POST',
    path: '/api/oauth/token',
    title: 'Exchange an authorization code or refresh token',
    auth: 'client_secret (body or HTTP Basic) or PKCE code_verifier',
    params: [
      ['grant_type', 'string', 'authorization_code or refresh_token'],
      ['code', 'string', 'The code from the redirect (authorization_code grant)'],
      ['refresh_token', 'string', 'The refresh token to rotate (refresh_token grant)'],
      ['redirect_uri', 'string', 'Same URI used in the authorize request'],
      ['client_id', 'string', 'Your client ID'],
      ['client_secret', 'string', 'Confidential clients only'],
      ['code_verifier', 'string', 'PKCE clients only'],
    ],
    body: `{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE",
  "redirect_uri": "https://yourapp.com/oauth/callback",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}`,
    response: `{
  "access_token": "…",
  "refresh_token": "…",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "profile email"
}`,
  },
  {
    id: 'oauth-revoke',
    group: 'OAuth 2.0',
    method: 'POST',
    path: '/api/oauth/revoke',
    title: 'Revoke an access or refresh token (RFC 7009)',
    auth: 'Client credentials or public client_id',
    params: [
      ['token', 'string', 'The access_token or refresh_token to revoke'],
      ['client_id', 'string', 'Optional client ID for validation'],
    ],
    body: `{
  "token": "TOKEN_TO_REVOKE"
}`,
    response: `{ "revoked": true }`,
  },
  {
    id: 'oauth-introspect',
    group: 'OAuth 2.0',
    method: 'POST',
    path: '/api/oauth/introspect',
    title: 'Introspect a token (RFC 7662)',
    auth: 'Client credentials or public client_id',
    params: [
      ['token', 'string', 'The access_token or refresh_token to inspect'],
      ['client_id', 'string', 'Optional client ID for validation'],
    ],
    body: `{
  "token": "TOKEN_TO_INSPECT"
}`,
    response: `{
  "active": true,
  "client_id": "wev_app_123",
  "sub": "user-id",
  "scope": "profile posts.read",
  "token_type": "Bearer",
  "exp": 1760500000
}`,
  },
  {
    id: 'messages',
    group: 'Platform API',
    method: 'POST',
    path: '/api/developer/messages',
    title: 'Send a WevChat direct message',
    auth: 'Bearer access token',
    scope: 'messages.write',
    params: [
      ['receiverId', 'string', 'Wevsoft user ID of the recipient (required)'],
      ['text', 'string', 'Message text (text or mediaUrl required)'],
      ['mediaUrl', 'string', 'Image URL to attach'],
    ],
    body: `{
  "receiverId": "USER_ID",
  "text": "Hello from my app"
}`,
    response: `{ "success": true, "message": { "id": "…", "conversationId": "…" } }`,
  },
  {
    id: 'conversations',
    group: 'Platform API',
    method: 'GET',
    path: '/api/developer/conversations',
    title: 'List WevChat conversations',
    auth: 'Bearer access token',
    scope: 'conversations.read',
    params: [
      ['limit', 'number', 'Page size (1–100, default 30)'],
      ['offset', 'number', 'Skip N conversations (default 0)'],
    ],
    body: '',
    response: `{ "data": [{ "id": "…", "type": "private", "peer": { "id": "…", "name": "…" }, "lastMessage": { "text": "…" } }] }`,
  },
  {
    id: 'conversation-messages',
    group: 'Platform API',
    method: 'GET',
    path: '/api/developer/conversations/:id/messages',
    title: 'List messages in a conversation',
    auth: 'Bearer access token',
    scope: 'messages.read',
    params: [
      ['id', 'string', 'Conversation ID (path)'],
      ['limit', 'number', 'Page size (1–100, default 20)'],
      ['cursor', 'string', 'Pagination cursor from previous page'],
    ],
    body: '',
    response: `{ "data": [{ "id": "…", "text": "…", "senderId": "…" }], "nextCursor": null }`,
  },
  {
    id: 'stories',
    group: 'Platform API',
    method: 'POST',
    path: '/api/developer/stories',
    title: 'Publish a story',
    auth: 'Bearer access token',
    scope: 'stories.write',
    params: [
      ['mediaUrls', 'string[]', 'One or more media URLs (required)'],
      ['type', '"photo" | "video"', 'Defaults to photo'],
      ['textOverlay', 'string', 'Optional caption overlay'],
    ],
    body: `{
  "mediaUrls": ["https://…/photo.jpg"],
  "type": "photo"
}`,
    response: `{ "success": true, "story": { "id": "…" } }`,
  },
  {
    id: 'media',
    group: 'Platform API',
    method: 'POST',
    path: '/api/developer/media/upload',
    title: 'Upload media',
    auth: 'Bearer access token',
    scope: 'media.upload',
    contentType: 'multipart',
    params: [['file', 'binary', `multipart/form-data field, max ${PLATFORM_LIMITS.mediaUploadMb} MB`]],
    response: `{ "success": true, "url": "https://…", "key": "uploads/…", "mimeType": "image/jpeg" }`,
  },
  {
    id: 'posts-list',
    group: 'Platform API',
    method: 'GET',
    path: '/api/developer/posts',
    title: 'List author posts',
    auth: 'Bearer access token',
    scope: 'posts.read',
    response: `{
  "data": [
    {
      "id": "post-id",
      "userId": "user-id",
      "content": "Hello world",
      "type": "text",
      "privacy": "public",
      "status": "published",
      "mediaUrls": [],
      "createdAt": "2026-10-12T00:00:00.000Z"
    }
  ],
  "nextCursor": null
}`,
  },
  {
    id: 'posts-create',
    group: 'Platform API',
    method: 'POST',
    path: '/api/developer/posts',
    title: 'Create a post (text or multimedia)',
    auth: 'Bearer access token',
    scope: 'posts.write',
    params: [
      ['content', 'string', 'Text caption or post content (optional if mediaUrls present)'],
      ['privacy', '"public" | "friends" | "followers" | "private"', 'Audience visibility (default: public)'],
      ['mediaUrls', 'string[]', 'Optional array of up to 10 image, video, or audio URLs'],
    ],
    body: `{
  "content": "Check out our new launch!",
  "privacy": "public",
  "mediaUrls": ["/uploads/photo.jpg"]
}`,
    response: `{
  "data": {
    "id": "post-id",
    "userId": "user-id",
    "content": "Check out our new launch!",
    "type": "photo",
    "privacy": "public",
    "status": "published",
    "mediaUrls": ["/uploads/photo.jpg"],
    "createdAt": "2026-10-12T00:00:00.000Z"
  }
}`,
  },
  {
    id: 'posts-get',
    group: 'Platform API',
    method: 'GET',
    path: '/api/developer/posts/:id',
    title: 'Get post details',
    auth: 'Bearer access token',
    scope: 'posts.read',
    response: `{
  "data": {
    "id": "post-id",
    "userId": "user-id",
    "content": "Check out our new launch!",
    "type": "photo",
    "privacy": "public",
    "status": "published",
    "mediaUrls": ["/uploads/photo.jpg"],
    "createdAt": "2026-10-12T00:00:00.000Z"
  }
}`,
  },
  {
    id: 'posts-patch',
    group: 'Platform API',
    method: 'PATCH',
    path: '/api/developer/posts/:id',
    title: 'Update a post',
    auth: 'Bearer access token',
    scope: 'posts.write',
    params: [
      ['content', 'string', 'Updated caption or text'],
      ['privacy', '"public" | "friends" | "followers" | "private"', 'Updated audience visibility'],
      ['mediaUrls', 'string[]', 'Optional updated array of media URLs'],
    ],
    body: `{
  "content": "Updated post content via API",
  "privacy": "public"
}`,
    response: `{
  "data": {
    "id": "post-id",
    "content": "Updated post content via API",
    "privacy": "public"
  }
}`,
  },
  {
    id: 'posts-delete',
    group: 'Platform API',
    method: 'DELETE',
    path: '/api/developer/posts/:id',
    title: 'Delete a post',
    auth: 'Bearer access token',
    scope: 'posts.write',
    response: `{ "success": true }`,
  },
  {
    id: 'posts-comments-list',
    group: 'Platform API',
    method: 'GET',
    path: '/api/developer/posts/:id/comments',
    title: 'List comments on a post',
    auth: 'Bearer access token',
    scope: 'posts.read',
    response: `{
  "data": [
    {
      "id": "comment-id",
      "postId": "post-id",
      "text": "Great update!",
      "mediaUrl": null,
      "createdAt": "2026-10-12T00:00:00.000Z",
      "author": { "id": "user-id", "name": "User Name", "username": "user", "avatar": "…" }
    }
  ],
  "nextCursor": null
}`,
  },
  {
    id: 'posts-comments-create',
    group: 'Platform API',
    method: 'POST',
    path: '/api/developer/posts/:id/comments',
    title: 'Add a comment to a post',
    auth: 'Bearer access token',
    scope: 'posts.write',
    params: [
      ['text', 'string', 'Comment text (1-2000 characters)'],
      ['mediaUrl', 'string', 'Optional image/media URL'],
    ],
    body: `{
  "text": "Looking forward to this!"
}`,
    response: `{
  "data": {
    "id": "comment-id",
    "postId": "post-id",
    "text": "Looking forward to this!",
    "mediaUrl": null,
    "createdAt": "2026-10-12T00:00:00.000Z",
    "author": { "id": "user-id", "name": "User Name", "username": "user", "avatar": "…" }
  }
}`,
  },
  {
    id: 'posts-reactions-create',
    group: 'Platform API',
    method: 'POST',
    path: '/api/developer/posts/:id/reactions',
    title: 'React to a post',
    auth: 'Bearer access token',
    scope: 'posts.write',
    params: [
      ['type', '"like" | "love" | "haha" | "wow" | "sad" | "angry"', 'Reaction sentiment'],
      ['action', '"set" | "remove"', 'Optional: explicitly remove reaction'],
    ],
    body: `{
  "type": "love"
}`,
    response: `{
  "success": true,
  "data": {
    "postId": "post-id",
    "reaction": "love",
    "active": true,
    "totalReactions": 12
  }
}`,
  },
  {
    id: 'social-friends-list',
    group: 'Platform API',
    method: 'GET',
    path: '/api/developer/friends',
    title: 'List friends',
    auth: 'Bearer access token',
    scope: 'profile',
    params: [
      ['limit', 'number', 'Optional (1-100, default 20)'],
      ['cursor', 'string', 'Optional pagination cursor'],
    ],
    response: `{
  "data": [
    {
      "friendshipId": "friend-row-id",
      "user": { "id": "user-id", "name": "Friend Name", "username": "friend", "avatar": "…", "verified": true }
    }
  ],
  "totalCount": 42,
  "nextCursor": null
}`,
  },
  {
    id: 'social-followers-list',
    group: 'Platform API',
    method: 'GET',
    path: '/api/developer/followers',
    title: 'List followers',
    auth: 'Bearer access token',
    scope: 'profile',
    params: [
      ['limit', 'number', 'Optional (1-100, default 20)'],
      ['cursor', 'string', 'Optional pagination cursor'],
    ],
    response: `{
  "data": [
    {
      "followId": "follow-row-id",
      "user": { "id": "follower-id", "name": "Follower", "username": "fan", "avatar": "…" }
    }
  ],
  "totalCount": 150,
  "nextCursor": null
}`,
  },
  {
    id: 'social-following-list',
    group: 'Platform API',
    method: 'GET',
    path: '/api/developer/following',
    title: 'List accounts followed by user',
    auth: 'Bearer access token',
    scope: 'profile',
    params: [
      ['limit', 'number', 'Optional (1-100, default 20)'],
      ['cursor', 'string', 'Optional pagination cursor'],
    ],
    response: `{
  "data": [
    {
      "followId": "follow-row-id",
      "user": { "id": "following-id", "name": "Creator", "username": "creator", "avatar": "…" }
    }
  ],
  "totalCount": 68,
  "nextCursor": null
}`,
  },
  {
    id: 'stories-list',
    group: 'Platform API',
    method: 'GET',
    path: '/api/developer/stories',
    title: 'List active stories',
    auth: 'Bearer access token',
    scope: 'stories.read',
    response: `{
  "data": [
    {
      "id": "story-id",
      "type": "photo",
      "content": "Story caption",
      "mediaUrls": ["/uploads/story.jpg"],
      "createdAt": "2026-10-12T00:00:00.000Z",
      "expiresAt": "2026-10-13T00:00:00.000Z"
    }
  ]
}`,
  },
  {
    id: 'messages-list',
    group: 'Platform API',
    method: 'GET',
    path: '/api/developer/messages',
    title: 'List direct messages',
    auth: 'Bearer access token',
    scope: 'messages.read',
    params: [
      ['receiverId', 'string', 'Optional contact user ID'],
      ['limit', 'number', 'Optional (1-100, default 20)'],
      ['cursor', 'string', 'Optional pagination cursor'],
    ],
    response: `{
  "data": [
    {
      "id": "msg-id",
      "conversationId": "conv-id",
      "senderId": "sender-id",
      "text": "Hello there!",
      "mediaUrl": null,
      "createdAt": "2026-10-12T00:00:00.000Z",
      "sender": { "id": "sender-id", "name": "Sender", "username": "sender" }
    }
  ],
  "nextCursor": null
}`,
  },
  {
    id: 'directory-list',
    group: 'Platform API',
    method: 'GET',
    path: '/api/developer/directory',
    title: 'Explore App Directory',
    auth: 'Public',
    params: [
      ['q', 'string', 'Optional search term'],
      ['category', 'string', 'Optional category filter'],
      ['page', 'number', 'Page number (default 1)'],
      ['limit', 'number', 'Items per page (default 20)'],
    ],
    response: `{
  "data": [
    {
      "id": "app-id",
      "name": "Social Connect Bot",
      "category": "social",
      "clientId": "wev_app_123",
      "installsCount": 250,
      "developer": { "companyName": "Acme Apps" }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}`,
  },
  {
    id: 'directory-get',
    group: 'Platform API',
    method: 'GET',
    path: '/api/developer/directory/:id',
    title: 'Get public app directory listing',
    auth: 'Public',
    response: `{
  "data": {
    "id": "app-id",
    "name": "Social Connect Bot",
    "category": "social",
    "clientId": "wev_app_123",
    "installsCount": 250,
    "developer": { "companyName": "Acme Apps", "verified": true }
  }
}`,
  },
  {
    id: 'ai-completions',
    group: 'Platform API',
    method: 'POST',
    path: '/api/developer/ai/chat/completions',
    title: 'AI Provider Gateway (BYOK chat completions)',
    auth: 'Bearer access token or X-API-Key',
    scope: 'profile',
    params: [
      ['provider', '"gemini" | "openai" | "anthropic"', 'Target AI provider'],
      ['model', 'string', 'Model identifier (e.g. gemini-2.5-flash, gpt-4o-mini)'],
      ['messages', 'array', 'Array of { role: "system" | "user" | "assistant", content: string }'],
    ],
    body: `{
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "messages": [
    { "role": "user", "content": "Say hello in one sentence." }
  ]
}`,
    response: `{
  "id": "chatcmpl_123",
  "object": "chat.completion",
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "choices": [
    {
      "index": 0,
      "message": { "role": "assistant", "content": "Hello from Wevsoft AI Gateway!" },
      "finish_reason": "stop"
    }
  ]
}`,
  },
  {
    id: 'payments-create-order',
    group: 'Platform API',
    method: 'POST',
    path: '/api/developer/payments/create-order',
    title: 'Create an in-app checkout order',
    auth: 'Bearer access token or X-API-Key',
    scope: 'profile',
    params: [
      ['amount', 'number', 'Order amount in smallest currency unit (e.g. 999 for $9.99)'],
      ['currency', 'string', '3-letter ISO currency code (e.g. USD)'],
      ['description', 'string', 'Line item or order description'],
    ],
    body: `{
  "amount": 999,
  "currency": "USD",
  "description": "Pro Monthly Plan"
}`,
    response: `{
  "data": {
    "id": "order-id",
    "amount": 999,
    "currency": "USD",
    "description": "Pro Monthly Plan",
    "status": "pending",
    "checkoutUrl": "https://wevsoft.com/developer/integrations?checkout=order-id"
  }
}`,
  },
  {
    id: 'payments-list-orders',
    group: 'Platform API',
    method: 'GET',
    path: '/api/developer/payments/orders',
    title: 'List in-app checkout orders',
    auth: 'Bearer access token or X-API-Key',
    scope: 'profile',
    response: `{
  "data": [
    {
      "id": "order-id",
      "amount": 999,
      "currency": "USD",
      "description": "Pro Monthly Plan",
      "status": "paid"
    }
  ]
}`,
  },
  {
    id: 'payments-confirm-order',
    group: 'Platform API',
    method: 'POST',
    path: '/api/developer/payments/orders/:id/confirm',
    title: 'Confirm an in-app checkout order',
    auth: 'Bearer access token or X-API-Key',
    scope: 'profile',
    body: `{}`,
    response: `{
  "data": {
    "id": "order-id",
    "status": "paid"
  }
}`,
  },
];
/* ------------------------------------------------------------------ */
/* API Reference (/developer/api-reference)                            */
/* ------------------------------------------------------------------ */

const verifySnippet = `import crypto from 'node:crypto';

// Express: app.post('/webhooks/wevsoft', express.raw({ type: 'application/json' }), handler)
function verify(req, signingSecret) {
  const timestamp = req.get('X-Wevsoft-Timestamp');
  const signature = req.get('X-Wevsoft-Signature');
  const expected = crypto
    .createHmac('sha256', signingSecret)
    .update(\`\${timestamp}.\${req.body}\`)
    .digest('hex');
  const fresh = Math.abs(Date.now() - Number(timestamp)) < 5 * 60 * 1000;
  return fresh && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}`;
export function ApiReferencePage() {
  const location = useLocation();
  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id) return;
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    return () => window.clearTimeout(t);
  }, [location.hash]);

  const groups = ['OAuth 2.0', 'Platform API'] as const;
  return (
    <ConsolePage group="Developer Tools" title="API Reference" description="Every public endpoint available to Wevsoft apps." requiresAccount={false} actions={<Link to="/developer/api-explorer" className={btn.primary}><Play size={13} /> Open API Explorer</Link>}>
      <div className="grid gap-4 min-[1200px]:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="hidden min-[1200px]:block">
          <div className="sticky top-2 dc-card p-3 text-[12px]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dc-faint)] mb-2">On this page</p>
            {groups.map((g) => (
              <div key={g} className="mb-2">
                <p className="font-semibold text-[var(--dc-text)] mb-1">{g}</p>
                {ENDPOINTS.filter((e) => e.group === g).map((e) => (
                  <a key={e.id} href={`#ep-${e.id}`} className="block py-[2px] text-[var(--dc-muted)] hover:text-[var(--dc-blue)] truncate">{e.title}</a>
                ))}
              </div>
            ))}
            <a href="#webhooks" className="block font-semibold text-[var(--dc-text)] hover:text-[var(--dc-blue)]">Webhooks</a>
          </div>
        </nav>
        <div className="space-y-4 min-w-0">
          <InfoNote>
            Base URL <code className="dc-code font-semibold">{appOrigin()}</code>. All responses are JSON. Errors use <code className="dc-code">{'{ "error": "…", "message": "…" }'}</code>.
          </InfoNote>
          {ENDPOINTS.map((e) => (
            <Card
              key={e.id}
              id={`ep-${e.id}`}
              title={
                <>
                  <Pill tone={e.method === 'GET' ? 'green' : 'blue'}>{e.method}</Pill>
                  <code className="dc-code text-[12.5px]">{e.path}</code>
                </>
              }
              description={e.title}
              action={e.scopeUnavailable ? <Pill tone="amber">Scope not issued yet</Pill> : undefined}
            >
              <div className="grid gap-4 min-[1000px]:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-[11.5px]"><span className="text-[var(--dc-muted)]">Auth:</span> {e.auth}</p>
                  {e.scope && <p className="text-[11.5px] mt-1"><span className="text-[var(--dc-muted)]">Scope:</span> <code className="dc-code">{e.scope}</code></p>}
                  {e.params && (
                    <table className="w-full mt-3">
                      <thead>
                        <tr>
                          <th className={thCls}>Field</th>
                          <th className={thCls}>Type</th>
                          <th className={thCls}>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {e.params.map(([n, t, d]) => (
                          <tr key={n}>
                            <td className={tdCls}><code className="dc-code text-[11px] font-semibold">{n}</code></td>
                            <td className={cx(tdCls, 'text-[11px] text-[var(--dc-muted)]')}>{t}</td>
                            <td className={cx(tdCls, 'text-[11px]')}>{d}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="min-w-0 space-y-2">
                  {e.body && (
                    <>
                      <p className="text-[11px] font-semibold text-[var(--dc-muted)]">Request</p>
                      <CodeBox code={e.body} />
                    </>
                  )}
                  <p className="text-[11px] font-semibold text-[var(--dc-muted)]">Response</p>
                  <CodeBox code={e.response} />
                </div>
              </div>
            </Card>
          ))}
          <Card id="webhooks" title={<><Webhook size={15} className="text-[var(--dc-blue)]" /> Webhooks</>} description="Event notifications sent to your HTTPS endpoint.">
            <div className="grid gap-4 min-[1000px]:grid-cols-2">
              <div className="text-[12px] space-y-2 min-w-0">
                <p>Each delivery is a <code className="dc-code">POST</code> with a JSON body and these headers:</p>
                <ul className="space-y-1">
                  <li><code className="dc-code">X-Wevsoft-Signature</code> — HMAC-SHA256 hex of <code className="dc-code">{'`${timestamp}.${body}`'}</code></li>
                  <li><code className="dc-code">X-Wevsoft-Timestamp</code> — milliseconds since epoch</li>
                  <li><code className="dc-code">X-Wevsoft-Event-Id</code> — unique delivery ID</li>
                </ul>
                <p className="pt-2 font-semibold">Events</p>
                <ul>
                  {WEBHOOK_EVENTS.map((ev) => (
                    <li key={ev.id}><code className="dc-code">{ev.id}</code> — {ev.description}</li>
                  ))}
                </ul>
                <p className="text-[11px] text-[var(--dc-muted)]">Up to {PLATFORM_LIMITS.webhooksPerApp} endpoints per app. Respond with any 2xx within a few seconds.</p>
              </div>
              <CodeBox code={verifySnippet} />
            </div>
          </Card>
        </div>
      </div>
    </ConsolePage>
  );
}
