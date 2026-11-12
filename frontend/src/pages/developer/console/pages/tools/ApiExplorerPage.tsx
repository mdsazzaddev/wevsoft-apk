/* Moved verbatim from ToolsPages.tsx (Phase 2 P2-5 split, no logic change). */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, Clock, Code, Copy, ExternalLink, Eye, EyeOff, FileCode, Key, Layers, Loader2, Play, Plus, Search, Send, Sliders, Trash2, X } from 'lucide-react';
import api from '../../../../../lib/api';
import { useStore } from '../../../../../store';
import { appOrigin } from '../../../devApi';
import { cx } from '../../../devUi';
import { useDevAccount } from '../../accountContext';
import { compactNumber } from '../../consoleData';
import { Card, CodeBox, ConsolePage, EmptyState, Pill, btn, inputCls, selectCls } from '../../ui';

/* ------------------------------------------------------------------ */
/* API Explorer (/developer/api-explorer) — Meta Graph API Parity     */
/* ------------------------------------------------------------------ */

interface RunResult {
  status: number;
  statusText?: string;
  ms: number;
  body: string;
  headers: [string, string][];
  sizeBytes: number;
  ok: boolean;
}
interface NodeFieldDef {
  name: string;
  description: string;
  type: string;
}
const COMMON_NODE_FIELDS: Record<string, { label: string; fields: NodeFieldDef[] }> = {
  user: {
    label: 'User Node',
    fields: [
      { name: 'id', description: 'Unique user identifier', type: 'string' },
      { name: 'sub', description: 'Subject ID for OpenID Connect', type: 'string' },
      { name: 'name', description: 'Full display name', type: 'string' },
      { name: 'preferred_username', description: 'Username / handle', type: 'string' },
      { name: 'email', description: 'Account email address', type: 'string' },
      { name: 'picture', description: 'Avatar image URL', type: 'string' },
      { name: 'email_verified', description: 'Whether email is verified', type: 'boolean' },
      { name: 'bio', description: 'Public bio profile summary', type: 'string' },
      { name: 'createdAt', description: 'Account creation ISO timestamp', type: 'datetime' },
    ],
  },
  post: {
    label: 'Post Node',
    fields: [
      { name: 'id', description: 'Post unique ID', type: 'string' },
      { name: 'userId', description: 'Author user ID', type: 'string' },
      { name: 'content', description: 'Text caption and post body', type: 'string' },
      { name: 'type', description: 'Post media type (text, photo, video)', type: 'string' },
      { name: 'privacy', description: 'Visibility (public, friends, private)', type: 'string' },
      { name: 'status', description: 'Publication status', type: 'string' },
      { name: 'mediaUrls', description: 'Array of attached media URLs', type: 'array' },
      { name: 'likesCount', description: 'Total likes / reactions count', type: 'number' },
      { name: 'commentsCount', description: 'Total comments count', type: 'number' },
      { name: 'createdAt', description: 'Publish ISO timestamp', type: 'datetime' },
      { name: 'author', description: 'Nested author profile snapshot', type: 'object' },
    ],
  },
  space: {
    label: 'Space Node',
    fields: [
      { name: 'id', description: 'WevSpace unique ID', type: 'string' },
      { name: 'name', description: 'Space display title', type: 'string' },
      { name: 'slug', description: 'URL handle / slug', type: 'string' },
      { name: 'description', description: 'Space summary or mission', type: 'string' },
      { name: 'avatarUrl', description: 'Space avatar / logo', type: 'string' },
      { name: 'coverUrl', description: 'Space hero banner image', type: 'string' },
      { name: 'category', description: 'Industry or niche category', type: 'string' },
      { name: 'isVerified', description: 'Verification badge status', type: 'boolean' },
      { name: 'followersCount', description: 'Total followers count', type: 'number' },
      { name: 'role', description: 'Viewer membership role', type: 'string' },
    ],
  },
  comment: {
    label: 'Comment Node',
    fields: [
      { name: 'id', description: 'Comment identifier', type: 'string' },
      { name: 'postId', description: 'Target post ID', type: 'string' },
      { name: 'text', description: 'Comment body text', type: 'string' },
      { name: 'mediaUrl', description: 'Optional attachment image', type: 'string' },
      { name: 'createdAt', description: 'Creation ISO timestamp', type: 'datetime' },
      { name: 'author', description: 'Comment author details', type: 'object' },
    ],
  },
  message: {
    label: 'Message Node',
    fields: [
      { name: 'id', description: 'Direct message ID', type: 'string' },
      { name: 'conversationId', description: 'Conversation thread ID', type: 'string' },
      { name: 'senderId', description: 'Sender user ID', type: 'string' },
      { name: 'receiverId', description: 'Recipient user ID', type: 'string' },
      { name: 'text', description: 'Message content', type: 'string' },
      { name: 'mediaUrl', description: 'Attached media file URL', type: 'string' },
      { name: 'createdAt', description: 'Message sent timestamp', type: 'datetime' },
    ],
  },
  order: {
    label: 'In-App Order Node',
    fields: [
      { name: 'id', description: 'Order ID', type: 'string' },
      { name: 'amount', description: 'Total charge amount in cents', type: 'number' },
      { name: 'currency', description: 'Three-letter currency code (USD, BDT)', type: 'string' },
      { name: 'description', description: 'Item description or plan name', type: 'string' },
      { name: 'status', description: 'Order state (pending, paid, cancelled)', type: 'string' },
      { name: 'checkoutUrl', description: 'Direct customer checkout URL', type: 'string' },
      { name: 'createdAt', description: 'Order placement timestamp', type: 'datetime' },
    ],
  },
};
interface GraphPreset {
  id: string;
  title: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  nodeKey: string;
  scope?: string;
  body?: string;
  defaultFields: string[];
}
const GRAPH_PRESETS: GraphPreset[] = [
  {
    id: 'userinfo',
    title: 'Me (Signed-in User)',
    method: 'GET',
    path: '/api/oauth/userinfo',
    nodeKey: 'user',
    scope: 'profile',
    defaultFields: ['sub', 'name', 'preferred_username', 'email', 'picture'],
  },
  {
    id: 'posts-list',
    title: 'Feed Posts',
    method: 'GET',
    path: '/api/developer/posts',
    nodeKey: 'post',
    scope: 'posts.read',
    defaultFields: ['id', 'content', 'type', 'privacy', 'createdAt', 'author'],
  },
  {
    id: 'posts-create',
    title: 'Publish New Post',
    method: 'POST',
    path: '/api/developer/posts',
    nodeKey: 'post',
    scope: 'posts.write',
    defaultFields: ['id', 'content', 'privacy', 'status', 'createdAt'],
    body: JSON.stringify({ content: 'Hello from WevSoft Graph API Explorer! 🚀', privacy: 'public', mediaUrls: [] }, null, 2),
  },
  {
    id: 'posts-get',
    title: 'Get Single Post',
    method: 'GET',
    path: '/api/developer/posts/:id',
    nodeKey: 'post',
    scope: 'posts.read',
    defaultFields: ['id', 'content', 'type', 'mediaUrls', 'createdAt', 'author'],
  },
  {
    id: 'posts-comments',
    title: 'Post Comments',
    method: 'GET',
    path: '/api/developer/posts/:id/comments',
    nodeKey: 'comment',
    scope: 'posts.read',
    defaultFields: ['id', 'postId', 'text', 'createdAt', 'author'],
  },
  {
    id: 'spaces-list',
    title: 'Connected Spaces',
    method: 'GET',
    path: '/api/developer/spaces',
    nodeKey: 'space',
    scope: 'spaces.read',
    defaultFields: ['id', 'name', 'slug', 'avatarUrl', 'role', 'followersCount'],
  },
  {
    id: 'messages-list',
    title: 'WevChat Messages',
    method: 'GET',
    path: '/api/developer/messages',
    nodeKey: 'message',
    scope: 'messages.read',
    defaultFields: ['id', 'conversationId', 'senderId', 'text', 'createdAt'],
  },
  {
    id: 'conversations-list',
    title: 'WevChat Conversations',
    method: 'GET',
    path: '/api/developer/conversations',
    nodeKey: 'conversation',
    scope: 'conversations.read',
    defaultFields: ['id', 'type', 'name', 'updatedAt', 'unreadCount'],
  },
  {
    id: 'friends-list',
    title: 'User Friends',
    method: 'GET',
    path: '/api/developer/friends',
    nodeKey: 'user',
    scope: 'profile',
    defaultFields: ['id', 'name', 'username', 'avatar', 'verified'],
  },
  {
    id: 'orders-list',
    title: 'In-App Checkout Orders',
    method: 'GET',
    path: '/api/developer/payments/orders',
    nodeKey: 'order',
    scope: 'profile',
    defaultFields: ['id', 'amount', 'currency', 'description', 'status'],
  },
  {
    id: 'batch',
    title: 'Batch Requests (up to 50)',
    method: 'POST',
    path: '/api/developer/v1/batch',
    nodeKey: 'user',
    defaultFields: [],
    body: JSON.stringify({
      requests: [
        { name: 'me', method: 'GET', relative_url: '/oauth/userinfo' },
        { name: 'posts', method: 'GET', relative_url: '/developer/posts' },
      ],
    }, null, 2),
  },
];
export function ApiExplorerPage() {
  const { apps } = useDevAccount();
  const sessionToken = useStore((s) => s.token);

  // Request State
  // W5: docs search / palette deep-link (?method=&path=) seeds the request once.
  const [deepLink] = useSearchParams();
  const linkMethod = (deepLink.get('method') || '').toUpperCase();
  const linkPath = deepLink.get('path') || '';
  const [method, setMethod] = useState<'GET' | 'POST' | 'PATCH' | 'DELETE'>(
    linkMethod === 'POST' || linkMethod === 'PATCH' || linkMethod === 'DELETE' ? linkMethod : linkMethod === 'PUT' ? 'PATCH' : 'GET',
  );
  const [path, setPath] = useState(linkPath.startsWith('/api/') ? linkPath : '/api/oauth/userinfo');
  const [nodeKey, setNodeKey] = useState('user');
  const [selectedFields, setSelectedFields] = useState<string[]>(['sub', 'name', 'preferred_username', 'email', 'picture']);
  const [customFieldInput, setCustomFieldInput] = useState('');
  const [fieldFilter, setFieldFilter] = useState('');
  const [resourceId, setResourceId] = useState('');

  // Token Management
  const [tokenSource, setTokenSource] = useState<'session' | 'app' | 'space' | 'custom'>('session');
  const [selectedAppId, setSelectedAppId] = useState<string>(apps[0]?.id || '');
  const [customToken, setCustomToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  // Spaces for space tokens
  const spacesQuery = useQuery({
    queryKey: ['developerConsole', 'spacesList'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/developer/spaces');
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [spaceToken, setSpaceToken] = useState<string>('');

  // Auto-generate or fetch Space Token when a space is selected
  const fetchSpaceToken = useMutation({
    mutationFn: async (sId: string) => {
      const res = await api.post(`/api/developer/spaces/${sId}/token`, {
        scopes: ['spaces.read', 'spaces.write', 'spaces.posts.write', 'spaces.inbox'],
        name: 'API Explorer Session',
      });
      return res.data?.token || res.data?.accessToken || '';
    },
    onSuccess: (tok: string) => {
      if (tok) {
        setSpaceToken(tok);
        toast.success('Generated space access token');
      }
    },
    onError: () => {
      toast.error('Could not generate space access token');
    },
  });

  const handleSpaceChange = (sId: string) => {
    setSelectedSpaceId(sId);
    if (sId) fetchSpaceToken.mutate(sId);
  };

  // Active Effective Token
  const effectiveToken = useMemo(() => {
    if (tokenSource === 'session') return sessionToken || '';
    if (tokenSource === 'space') return spaceToken || '';
    if (tokenSource === 'app') {
      const app = apps.find((a) => a.id === selectedAppId);
      return app?.clientSecretRaw || (app as any)?.apiKey || '';
    }
    return customToken;
  }, [tokenSource, sessionToken, spaceToken, selectedAppId, apps, customToken]);

  // Request Body & Options
  const [activeTab, setActiveTab] = useState<'fields' | 'params' | 'body' | 'headers'>('fields');
  const [body, setBody] = useState('');
  const [headersList, setHeadersList] = useState<{ key: string; value: string }[]>([
    { key: 'Accept', value: 'application/json' },
  ]);

  // Execution & Response State
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [responseTab, setResponseTab] = useState<'body' | 'headers' | 'curl'>('body');
  const [isCopied, setIsCopied] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'js' | 'python' | 'php' | 'go'>('curl');

  // Resolved URL Path with :id substitution
  const hasIdParam = path.includes(':id');
  const resolvedPath = useMemo(() => {
    let p = path;
    if (hasIdParam) {
      p = p.replace(':id', encodeURIComponent(resourceId.trim() || ':id'));
    }
    return p;
  }, [path, hasIdParam, resourceId]);

  // Synchronize field checklist with ?fields= query param in path
  const toggleField = (field: string) => {
    let next: string[];
    if (selectedFields.includes(field)) {
      next = selectedFields.filter((f) => f !== field);
    } else {
      next = [...selectedFields, field];
    }
    setSelectedFields(next);
    updatePathWithFields(next);
  };

  const updatePathWithFields = (fields: string[]) => {
    try {
      const dummyBase = 'http://localhost';
      const parsed = new URL(path, dummyBase);
      if (fields.length > 0) {
        parsed.searchParams.set('fields', fields.join(','));
      } else {
        parsed.searchParams.delete('fields');
      }
      const newPath = parsed.pathname + parsed.search;
      setPath(newPath);
    } catch {
      // Fallback
      const base = path.split('?')[0];
      if (fields.length > 0) setPath(`${base}?fields=${fields.join(',')}`);
      else setPath(base);
    }
  };

  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customFieldInput.trim();
    if (!trimmed) return;
    if (!selectedFields.includes(trimmed)) {
      const next = [...selectedFields, trimmed];
      setSelectedFields(next);
      updatePathWithFields(next);
    }
    setCustomFieldInput('');
  };

  // Load Preset
  const applyPreset = (preset: GraphPreset) => {
    setMethod(preset.method);
    setNodeKey(preset.nodeKey);
    setSelectedFields(preset.defaultFields);
    setBody(preset.body || '');
    if (preset.defaultFields.length > 0 && preset.method === 'GET') {
      const base = preset.path.split('?')[0];
      setPath(`${base}?fields=${preset.defaultFields.join(',')}`);
    } else {
      setPath(preset.path);
    }
    setResult(null);
    if (preset.body) {
      setActiveTab('body');
    } else {
      setActiveTab('fields');
    }
  };

  // JSON Body Error check
  const bodyError = useMemo(() => {
    if (!['POST', 'PATCH', 'PUT'].includes(method)) return null;
    if (!body.trim()) return null;
    try {
      JSON.parse(body);
      return null;
    } catch (e: any) {
      return 'Invalid JSON syntax: ' + e.message;
    }
  }, [body, method]);

  // Execute Request
  const sendRequest = async () => {
    if (hasIdParam && !resourceId.trim()) {
      toast.error('Please specify a Resource ID for :id');
      return;
    }
    if (bodyError) {
      toast.error('Please fix JSON syntax errors before sending');
      return;
    }

    setBusy(true);
    const t0 = performance.now();
    try {
      const fullUrl = resolvedPath.startsWith('http') ? resolvedPath : `${appOrigin()}${resolvedPath}`;
      const reqHeaders: Record<string, string> = {};
      if (['POST', 'PATCH', 'PUT'].includes(method)) {
        reqHeaders['Content-Type'] = 'application/json';
      }
      if (effectiveToken.trim()) {
        reqHeaders['Authorization'] = `Bearer ${effectiveToken.trim()}`;
      }
      headersList.forEach(({ key, value }) => {
        if (key.trim()) reqHeaders[key.trim()] = value;
      });

      const res = await fetch(fullUrl, {
        method,
        headers: reqHeaders,
        body: ['POST', 'PATCH', 'PUT'].includes(method) ? body.trim() || undefined : undefined,
      });

      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* Raw response */
      }

      const headersArray: [string, string][] = [];
      res.headers.forEach((val, k) => headersArray.push([k, val]));

      setResult({
        status: res.status,
        statusText: res.statusText,
        ms: Math.round(performance.now() - t0),
        body: pretty || '(empty response)',
        headers: headersArray,
        sizeBytes: new Blob([text]).size,
        ok: res.ok,
      });
    } catch (err: any) {
      setResult({
        status: 0,
        statusText: 'Network / CORS Error',
        ms: Math.round(performance.now() - t0),
        body: err?.message || 'Failed to fetch',
        headers: [],
        sizeBytes: 0,
        ok: false,
      });
    } finally {
      setBusy(false);
    }
  };

  // Keyboard shortcut Ctrl/Cmd + Enter to execute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        sendRequest();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resolvedPath, method, body, effectiveToken, headersList, resourceId]);

  // cURL representation
  const curlCommand = useMemo(() => {
    const fullUrl = `${appOrigin()}${resolvedPath}`;
    let c = `curl -X ${method} '${fullUrl}' \\\n`;
    if (effectiveToken.trim()) {
      c += `  -H 'Authorization: Bearer ${effectiveToken.trim()}' \\\n`;
    }
    if (['POST', 'PATCH', 'PUT'].includes(method)) {
      c += `  -H 'Content-Type: application/json' \\\n`;
      const cleanBody = (body || '{}').replace(/'/g, "'\\''");
      c += `  -d '${cleanBody}'`;
    } else {
      c = c.slice(0, -3); // remove trailing backslash
    }
    return c;
  }, [method, resolvedPath, effectiveToken, body]);

  // Code Generation Snippets
  const generatedCode = useMemo(() => {
    const fullUrl = `${appOrigin()}${resolvedPath}`;
    const tokenStr = effectiveToken.trim() || 'YOUR_ACCESS_TOKEN';

    if (codeLanguage === 'curl') {
      return curlCommand;
    }
    if (codeLanguage === 'js') {
      return `// JavaScript (Fetch)
const response = await fetch('${fullUrl}', {
  method: '${method}',
  headers: {
    'Authorization': 'Bearer ${tokenStr}',
${['POST', 'PATCH', 'PUT'].includes(method) ? "    'Content-Type': 'application/json',\n" : ''}  },
${['POST', 'PATCH', 'PUT'].includes(method) ? `  body: JSON.stringify(${body.trim() || '{}'})\n` : ''}});

const data = await response.json();
console.log(data);`;
    }
    if (codeLanguage === 'python') {
      return `# Python (requests)
import requests

url = '${fullUrl}'
headers = {
    'Authorization': 'Bearer ${tokenStr}',
${['POST', 'PATCH', 'PUT'].includes(method) ? "    'Content-Type': 'application/json',\n" : ''}}
${['POST', 'PATCH', 'PUT'].includes(method) ? `payload = ${body.trim() || '{}'}\nresponse = requests.${method.toLowerCase()}(url, headers=headers, json=payload)` : `response = requests.${method.toLowerCase()}(url, headers=headers)`}

print(response.status_code)
print(response.json())`;
    }
    if (codeLanguage === 'php') {
      return `<?php
// PHP cURL
$ch = curl_init('${fullUrl}');
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${method}');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ${tokenStr}',
${['POST', 'PATCH', 'PUT'].includes(method) ? "    'Content-Type: application/json',\n" : ''}]);
${['POST', 'PATCH', 'PUT'].includes(method) ? `curl_setopt($ch, CURLOPT_POSTFIELDS, '${(body.trim() || '{}').replace(/'/g, "\\'")}');\n` : ''}
$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>`;
    }
    if (codeLanguage === 'go') {
      return `package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
)

func main() {
	url := "${fullUrl}"
${['POST', 'PATCH', 'PUT'].includes(method) ? `	jsonBody := []byte(\`${body.trim() || '{}'}\`)\n	req, _ := http.NewRequest("${method}", url, bytes.NewBuffer(jsonBody))` : `	req, _ := http.NewRequest("${method}", url, nil)`}
	req.Header.Set("Authorization", "Bearer ${tokenStr}")
${['POST', 'PATCH', 'PUT'].includes(method) ? `	req.Header.Set("Content-Type", "application/json")\n` : ''}
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`;
    }
    return '';
  }, [codeLanguage, curlCommand, resolvedPath, method, effectiveToken, body]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const activeNodeInfo = COMMON_NODE_FIELDS[nodeKey] || COMMON_NODE_FIELDS.user;
  const filteredFields = activeNodeInfo.fields.filter(
    (f) => !fieldFilter || f.name.toLowerCase().includes(fieldFilter.toLowerCase()) || f.description.toLowerCase().includes(fieldFilter.toLowerCase()),
  );

  return (
    <ConsolePage
      group="Developer Tools"
      title="Graph & REST API Explorer"
      description="Interactive playground with Graph field selector, multi-source access tokens, live request runner, and multi-language code generation."
      requiresAccount={false}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCodeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-[7px] border border-[var(--dc-border)] bg-[var(--dc-card)] hover:bg-[var(--dc-hover)] text-[var(--dc-text)] transition-colors"
          >
            <Code size={14} className="text-[var(--dc-blue)]" />
            Get Code
          </button>
          <Link
            to="/developer/token-debugger"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-[7px] border border-[var(--dc-border)] bg-[var(--dc-card)] hover:bg-[var(--dc-hover)] text-[var(--dc-text-2)] transition-colors"
          >
            <Key size={14} />
            Token Debugger
            <ExternalLink size={12} className="opacity-60" />
          </Link>
        </div>
      }
    >
      {/* Quick Presets Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--dc-faint)] shrink-0 flex items-center gap-1">
          <Layers size={12} /> Presets:
        </span>
        {GRAPH_PRESETS.map((p) => {
          const isActive = path.startsWith(p.path.split('?')[0]) && method === p.method;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              className={cx(
                'shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all',
                isActive
                  ? 'border-[var(--dc-blue)] bg-[var(--dc-blue-soft)] text-[var(--dc-blue)] shadow-xs'
                  : 'border-[var(--dc-border)] bg-[var(--dc-side)] hover:bg-[var(--dc-hover)] text-[var(--dc-text-2)]',
              )}
            >
              {p.title}
            </button>
          );
        })}
      </div>

      {/* Main Request Command Bar (Meta Graph Explorer Top Bar) */}
      <div className="dc-card p-3 sm:p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          {/* Method Pill Selector */}
          <div className="flex items-center rounded-[8px] border border-[var(--dc-border)] bg-[var(--dc-side)] p-0.5 shrink-0">
            {(['GET', 'POST', 'PATCH', 'DELETE'] as const).map((m) => {
              const active = method === m;
              const color =
                m === 'GET'
                  ? 'text-emerald-500 bg-emerald-500/10'
                  : m === 'POST'
                  ? 'text-sky-500 bg-sky-500/10'
                  : m === 'PATCH'
                  ? 'text-amber-500 bg-amber-500/10'
                  : 'text-rose-500 bg-rose-500/10';
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cx(
                    'px-2.5 py-1 text-[11.5px] font-bold tracking-wide rounded-[6px] transition-all',
                    active ? `${color} shadow-xs` : 'text-[var(--dc-muted)] hover:text-[var(--dc-text)]',
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {/* Path Input Bar */}
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/api/oauth/userinfo?fields=id,name"
              className={cx(inputCls, 'dc-code !text-[12.5px] font-mono pr-20')}
              spellCheck={false}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10.5px] text-[var(--dc-faint)] pointer-events-none hidden sm:inline">
              Ctrl+↵ to run
            </span>
          </div>

          {/* Primary Submit CTA */}
          <button
            type="button"
            onClick={sendRequest}
            disabled={busy || Boolean(bodyError) || (hasIdParam && !resourceId.trim())}
            className={cx(btn.primary, 'shrink-0 h-[38px] px-5 font-semibold text-[13px] shadow-sm')}
          >
            {busy ? <Loader2 size={15} className="animate-spin mr-1.5" /> : <Play size={15} className="mr-1.5 fill-current" />}
            Submit
          </button>
        </div>

        {/* Dynamic :id bar if endpoint has route params */}
        {hasIdParam && (
          <div className="flex items-center gap-2 p-2 rounded-[8px] bg-[var(--dc-side)] border border-[var(--dc-border)]">
            <span className="text-[11.5px] text-[var(--dc-muted)] shrink-0 flex items-center gap-1 font-medium">
              <span className="text-[var(--dc-amber)] font-bold">Target Resource ID:</span> Replace <code className="dc-code">:id</code> in path with:
            </span>
            <input
              type="text"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              placeholder="e.g. post_xyz123 or order_abc456"
              className={cx(inputCls, 'dc-code !h-[30px] !text-[11.5px] max-w-[280px]')}
            />
          </div>
        )}
      </div>

      {/* Access Token Configuration Deck */}
      <div className="dc-card p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--dc-border)] pb-2.5">
          <div className="flex items-center gap-2">
            <Key size={15} className="text-[var(--dc-blue)]" />
            <h3 className="text-[13px] font-semibold text-[var(--dc-text)]">Access Token & Credentials</h3>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[var(--dc-muted)]">
            <span>Token Source:</span>
            <div className="flex items-center rounded-[6px] border border-[var(--dc-border)] bg-[var(--dc-side)] p-0.5">
              {(
                [
                  { id: 'session', label: 'User (Session)' },
                  { id: 'app', label: 'App Token' },
                  { id: 'space', label: 'Space Token' },
                  { id: 'custom', label: 'Custom' },
                ] as const
              ).map((src) => (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => setTokenSource(src.id)}
                  className={cx(
                    'px-2 py-0.5 rounded-[4px] text-[11px] font-medium transition-colors',
                    tokenSource === src.id
                      ? 'bg-[var(--dc-card)] text-[var(--dc-text)] font-semibold shadow-xs'
                      : 'text-[var(--dc-muted)] hover:text-[var(--dc-text)]',
                  )}
                >
                  {src.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Source Inputs */}
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            {tokenSource === 'session' && (
              <div className="flex items-center gap-2">
                <input
                  type={showToken ? 'text' : 'password'}
                  readOnly
                  value={sessionToken || ''}
                  placeholder={sessionToken ? 'Session access token loaded' : 'No active session token'}
                  className={cx(inputCls, 'dc-code !text-[12px] bg-[var(--dc-side)] font-mono')}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  title={showToken ? 'Hide token' : 'Show token'}
                  className="p-2 rounded-[6px] border border-[var(--dc-border)] text-[var(--dc-muted)] hover:text-[var(--dc-text)]"
                >
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            )}

            {tokenSource === 'app' && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedAppId}
                  onChange={(e) => setSelectedAppId(e.target.value)}
                  className={selectCls}
                >
                  {apps.length === 0 ? (
                    <option value="">No apps found (create an app in Apps tab)</option>
                  ) : (
                    apps.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.clientId})
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {tokenSource === 'space' && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selectedSpaceId}
                  onChange={(e) => handleSpaceChange(e.target.value)}
                  className={cx(selectCls, 'sm:max-w-[240px]')}
                >
                  <option value="">Select a WevSpace...</option>
                  {(spacesQuery.data || []).map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (@{s.slug || s.id})
                    </option>
                  ))}
                </select>
                <input
                  type={showToken ? 'text' : 'password'}
                  value={spaceToken}
                  onChange={(e) => setSpaceToken(e.target.value)}
                  placeholder="Paste or auto-generate Space Token (spk_...)"
                  className={cx(inputCls, 'dc-code !text-[12px] font-mono flex-1')}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="p-2 rounded-[6px] border border-[var(--dc-border)] text-[var(--dc-muted)] hover:text-[var(--dc-text)]"
                >
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            )}

            {tokenSource === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={customToken}
                  onChange={(e) => setCustomToken(e.target.value)}
                  placeholder="Paste OAuth access token, API key (wev_live_...), or Space Token"
                  className={cx(inputCls, 'dc-code !text-[12px] font-mono')}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="p-2 rounded-[6px] border border-[var(--dc-border)] text-[var(--dc-muted)] hover:text-[var(--dc-text)]"
                >
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {effectiveToken ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-emerald-500/10 text-emerald-500 text-[11px] font-medium">
                <Check size={13} /> Token Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-amber-500/10 text-amber-500 text-[11px] font-medium">
                No Token (Public Only)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main 2-Column Graph Layout: Field Explorer / Body & Params on Left, Interactive Response on Right */}
      <div className="grid gap-4 min-[1100px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Left Column: Explorer Deck */}
        <div className="space-y-4 min-w-0">
          <Card
            title={
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-[var(--dc-blue)]" />
                <span>Request Inspector</span>
              </div>
            }
            action={
              <div className="flex items-center gap-1 rounded-[6px] border border-[var(--dc-border)] bg-[var(--dc-side)] p-0.5 text-[11.5px]">
                <button
                  type="button"
                  onClick={() => setActiveTab('fields')}
                  className={cx(
                    'px-2.5 py-1 rounded-[4px] font-medium transition-colors',
                    activeTab === 'fields' ? 'bg-[var(--dc-card)] text-[var(--dc-text)] font-semibold shadow-xs' : 'text-[var(--dc-muted)] hover:text-[var(--dc-text)]',
                  )}
                >
                  Fields
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('params')}
                  className={cx(
                    'px-2.5 py-1 rounded-[4px] font-medium transition-colors',
                    activeTab === 'params' ? 'bg-[var(--dc-card)] text-[var(--dc-text)] font-semibold shadow-xs' : 'text-[var(--dc-muted)] hover:text-[var(--dc-text)]',
                  )}
                >
                  Params
                </button>
                {['POST', 'PATCH', 'PUT'].includes(method) && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('body')}
                    className={cx(
                      'px-2.5 py-1 rounded-[4px] font-medium transition-colors',
                      activeTab === 'body' ? 'bg-[var(--dc-card)] text-[var(--dc-text)] font-semibold shadow-xs' : 'text-[var(--dc-muted)] hover:text-[var(--dc-text)]',
                    )}
                  >
                    Body (JSON)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('headers')}
                  className={cx(
                    'px-2.5 py-1 rounded-[4px] font-medium transition-colors',
                    activeTab === 'headers' ? 'bg-[var(--dc-card)] text-[var(--dc-text)] font-semibold shadow-xs' : 'text-[var(--dc-muted)] hover:text-[var(--dc-text)]',
                  )}
                >
                  Headers
                </button>
              </div>
            }
          >
            {/* TAB 1: GRAPH FIELD EXPLORER */}
            {activeTab === 'fields' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--dc-border)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-[var(--dc-text)]">{activeNodeInfo.label}</span>
                    <span className="text-[11px] text-[var(--dc-muted)]">
                      ({selectedFields.length} selected)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const all = activeNodeInfo.fields.map((f) => f.name);
                        setSelectedFields(all);
                        updatePathWithFields(all);
                      }}
                      className="text-[11px] text-[var(--dc-blue)] hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-[var(--dc-faint)]">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFields([]);
                        updatePathWithFields([]);
                      }}
                      className="text-[11px] text-[var(--dc-muted)] hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Filter and Node selector */}
                <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--dc-faint)]" />
                    <input
                      type="text"
                      value={fieldFilter}
                      onChange={(e) => setFieldFilter(e.target.value)}
                      placeholder="Filter fields..."
                      className={cx(inputCls, '!h-[30px] pl-8 !text-[11.5px]')}
                    />
                  </div>
                  <select
                    value={nodeKey}
                    onChange={(e) => {
                      setNodeKey(e.target.value);
                      const def = COMMON_NODE_FIELDS[e.target.value]?.fields.map((f) => f.name) || [];
                      setSelectedFields(def.slice(0, 4));
                      updatePathWithFields(def.slice(0, 4));
                    }}
                    className={cx(selectCls, '!h-[30px] !text-[11.5px]')}
                  >
                    {Object.entries(COMMON_NODE_FIELDS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Field Checkboxes */}
                <div className="max-h-[250px] overflow-y-auto space-y-1 pr-1 divide-y divide-[var(--dc-border)]/50">
                  {filteredFields.map((f) => {
                    const checked = selectedFields.includes(f.name);
                    return (
                      <label
                        key={f.name}
                        className={cx(
                          'flex items-start gap-2.5 p-2 rounded-[6px] cursor-pointer transition-colors hover:bg-[var(--dc-hover)]',
                          checked && 'bg-[var(--dc-side)]',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleField(f.name)}
                          className="mt-0.5 rounded border-[var(--dc-border)] text-[var(--dc-blue)] focus:ring-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[12px] font-semibold text-[var(--dc-text)]">{f.name}</span>
                            <span className="text-[10px] px-1 py-px rounded bg-[var(--dc-hover)] text-[var(--dc-muted)] font-mono">{f.type}</span>
                          </div>
                          <p className="text-[11px] text-[var(--dc-muted)] leading-tight">{f.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Add Custom Field */}
                <form onSubmit={handleAddCustomField} className="pt-2 border-t border-[var(--dc-border)] flex items-center gap-2">
                  <input
                    type="text"
                    value={customFieldInput}
                    onChange={(e) => setCustomFieldInput(e.target.value)}
                    placeholder="Add custom field or edge (e.g. author{name})..."
                    className={cx(inputCls, '!h-[30px] !text-[11.5px] dc-code flex-1')}
                  />
                  <button type="submit" disabled={!customFieldInput.trim()} className={cx(btn.secondary, btn.sm, '!h-[30px]')}>
                    <Plus size={13} /> Add
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: QUERY PARAMS */}
            {activeTab === 'params' && (
              <div className="space-y-3">
                <p className="text-[11.5px] text-[var(--dc-muted)]">
                  Parameters extracted from current URL query string:
                </p>
                <div className="rounded-[8px] border border-[var(--dc-border)] overflow-hidden">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-[var(--dc-side)] text-[var(--dc-faint)] text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="p-2">Key</th>
                        <th className="p-2">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--dc-border)]">
                      {Array.from(new URLSearchParams(path.split('?')[1] || '').entries()).map(([k, v], idx) => (
                        <tr key={idx} className="hover:bg-[var(--dc-hover)] font-mono text-[11.5px]">
                          <td className="p-2 font-semibold text-[var(--dc-blue)]">{k}</td>
                          <td className="p-2 text-[var(--dc-text-2)] break-all">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: REQUEST BODY */}
            {activeTab === 'body' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11.5px] font-semibold text-[var(--dc-muted)]">Request Payload (JSON)</label>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(body || '{}');
                        setBody(JSON.stringify(parsed, null, 2));
                        toast.success('Formatted JSON');
                      } catch {
                        toast.error('Cannot format invalid JSON');
                      }
                    }}
                    className="text-[11px] text-[var(--dc-blue)] hover:underline"
                  >
                    Format JSON
                  </button>
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  spellCheck={false}
                  placeholder={`{\n  "content": "Hello World",\n  "privacy": "public"\n}`}
                  className={cx(inputCls, '!h-auto py-2.5 font-mono text-[12px] leading-relaxed')}
                />
                {bodyError && (
                  <p className="text-[11px] text-[var(--dc-red)] bg-rose-500/10 p-2 rounded-[6px] border border-rose-500/20">
                    {bodyError}
                  </p>
                )}
              </div>
            )}

            {/* TAB 4: HEADERS */}
            {activeTab === 'headers' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {headersList.map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={h.key}
                        onChange={(e) => {
                          const next = [...headersList];
                          next[i].key = e.target.value;
                          setHeadersList(next);
                        }}
                        placeholder="Header name"
                        className={cx(inputCls, '!h-[30px] !text-[11.5px] font-mono')}
                      />
                      <input
                        type="text"
                        value={h.value}
                        onChange={(e) => {
                          const next = [...headersList];
                          next[i].value = e.target.value;
                          setHeadersList(next);
                        }}
                        placeholder="Value"
                        className={cx(inputCls, '!h-[30px] !text-[11.5px] font-mono')}
                      />
                      <button
                        type="button"
                        onClick={() => setHeadersList(headersList.filter((_, idx) => idx !== i))}
                        className="p-1.5 text-[var(--dc-muted)] hover:text-rose-500"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setHeadersList([...headersList, { key: '', value: '' }])}
                  className={cx(btn.secondary, btn.sm)}
                >
                  <Plus size={13} /> Add Header
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Response Inspector Deck */}
        <div className="space-y-4 min-w-0">
          <Card
            title={
              <div className="flex items-center gap-2">
                <span>Response</span>
                {result && (
                  <span className="flex items-center gap-2">
                    <Pill tone={result.ok ? 'green' : 'red'}>
                      {result.status} {result.statusText || (result.ok ? 'OK' : 'Error')}
                    </Pill>
                    <span className="text-[11px] text-[var(--dc-muted)] flex items-center gap-1 font-mono">
                      <Clock size={11} /> {result.ms} ms
                    </span>
                    <span className="text-[11px] text-[var(--dc-muted)] font-mono">
                      {compactNumber(result.sizeBytes)} B
                    </span>
                    {(() => {
                      // W4: the request ID ties this call to its API log row and any webhooks it fired.
                      const rid = result.headers.find(([k]) => k.toLowerCase() === 'x-request-id')?.[1];
                      if (!rid) return null;
                      return (
                        <span data-testid="explorer-request-id" className="text-[11px] font-mono flex items-center gap-1">
                          <button
                            type="button"
                            title="Copy request ID"
                            className="text-[var(--dc-muted)] hover:underline"
                            onClick={() => { void navigator.clipboard?.writeText(rid); }}
                          >
                            {rid.slice(0, 8)}&hellip;
                          </button>
                          {selectedAppId && (
                            <Link
                              to={`/developer/apps/${selectedAppId}/analytics?requestId=${encodeURIComponent(rid)}`}
                              className="text-[var(--dc-blue)] hover:underline"
                            >
                              View in logs
                            </Link>
                          )}
                        </span>
                      );
                    })()}
                  </span>
                )}
              </div>
            }
            action={
              result && (
                <div className="flex items-center gap-1">
                  <div className="flex items-center rounded-[6px] border border-[var(--dc-border)] bg-[var(--dc-side)] p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setResponseTab('body')}
                      className={cx('px-2 py-0.5 rounded-[4px] font-medium', responseTab === 'body' && 'bg-[var(--dc-card)] text-[var(--dc-text)] shadow-xs')}
                    >
                      JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => setResponseTab('headers')}
                      className={cx('px-2 py-0.5 rounded-[4px] font-medium', responseTab === 'headers' && 'bg-[var(--dc-card)] text-[var(--dc-text)] shadow-xs')}
                    >
                      Headers
                    </button>
                    <button
                      type="button"
                      onClick={() => setResponseTab('curl')}
                      className={cx('px-2 py-0.5 rounded-[4px] font-medium', responseTab === 'curl' && 'bg-[var(--dc-card)] text-[var(--dc-text)] shadow-xs')}
                    >
                      cURL
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.body)}
                    title="Copy full response"
                    className="p-1.5 rounded-[6px] text-[var(--dc-muted)] hover:text-[var(--dc-text)]"
                  >
                    {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              )
            }
          >
            {result ? (
              <div>
                {responseTab === 'body' && (
                  <CodeBox code={result.body} className="max-h-[460px] overflow-auto text-[11.5px]" />
                )}
                {responseTab === 'headers' && (
                  <div className="max-h-[460px] overflow-auto rounded-[6px] border border-[var(--dc-border)]">
                    <table className="w-full text-left text-[11.5px] font-mono">
                      <thead className="bg-[var(--dc-side)] text-[10.5px] uppercase tracking-wider text-[var(--dc-faint)]">
                        <tr>
                          <th className="p-2 border-b border-[var(--dc-border)]">Header</th>
                          <th className="p-2 border-b border-[var(--dc-border)]">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--dc-border)]">
                        {result.headers.map(([hk, hv], idx) => (
                          <tr key={idx} className="hover:bg-[var(--dc-hover)]">
                            <td className="p-2 font-semibold text-[var(--dc-blue)]">{hk}</td>
                            <td className="p-2 text-[var(--dc-text-2)] break-all">{hv}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {responseTab === 'curl' && (
                  <CodeBox code={curlCommand} className="max-h-[460px] overflow-auto text-[11.5px]" />
                )}
              </div>
            ) : (
              <EmptyState
                icon={Send}
                title="No request executed"
                body="Select an endpoint, customize fields or body, and press Submit."
                className="!py-16"
              />
            )}
          </Card>
        </div>
      </div>

      {/* "Get Code" Modal Dialog */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl dc-card overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-[var(--dc-border)]">
              <div className="flex items-center gap-2">
                <FileCode size={18} className="text-[var(--dc-blue)]" />
                <h3 className="text-[14px] font-bold text-[var(--dc-text)]">Generate Code Snippet</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCodeModalOpen(false)}
                className="p-1 rounded-[6px] text-[var(--dc-muted)] hover:bg-[var(--dc-hover)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Language Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {(
                  [
                    { id: 'curl', label: 'cURL (Bash)' },
                    { id: 'js', label: 'JavaScript (Fetch)' },
                    { id: 'python', label: 'Python (requests)' },
                    { id: 'php', label: 'PHP (cURL)' },
                    { id: 'go', label: 'Go (net/http)' },
                  ] as const
                ).map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setCodeLanguage(lang.id)}
                    className={cx(
                      'px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors',
                      codeLanguage === lang.id
                        ? 'bg-[var(--dc-blue)] text-white shadow-xs'
                        : 'border border-[var(--dc-border)] bg-[var(--dc-side)] text-[var(--dc-muted)] hover:text-[var(--dc-text)]',
                    )}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              {/* Code Box */}
              <div className="relative">
                <CodeBox code={generatedCode} className="max-h-[380px] overflow-auto text-[12px]" />
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[var(--dc-side)] border-t border-[var(--dc-border)]">
              <span className="text-[11px] text-[var(--dc-muted)]">Production-ready code with active parameters</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCodeModalOpen(false)}
                  className={cx(btn.secondary, btn.sm)}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(generatedCode)}
                  className={cx(btn.primary, btn.sm)}
                >
                  {isCopied ? <Check size={13} className="mr-1" /> : <Copy size={13} className="mr-1" />}
                  Copy Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConsolePage>
  );
}
