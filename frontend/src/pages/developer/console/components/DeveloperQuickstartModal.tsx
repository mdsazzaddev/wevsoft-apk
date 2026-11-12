import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Terminal,
  Code2,
  Send,
  Zap,
  Activity,
  Copy,
  Check,
  ShieldCheck,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import type { DeveloperApp } from '../../devApi';
import { sendDeveloperPing } from '../../devApi';

interface QuickstartModalProps {
  isOpen: boolean;
  onClose: () => void;
  apps: DeveloperApp[];
  initialAppId?: string;
}

type TechStack = 'curl' | 'typescript' | 'python' | 'go' | 'php' | 'dart';

export function DeveloperQuickstartModal({
  isOpen,
  onClose,
  apps,
  initialAppId,
}: QuickstartModalProps) {
  const [selectedAppId, setSelectedAppId] = useState<string>(
    initialAppId || apps[0]?.id || ''
  );
  const [stack, setStack] = useState<TechStack>('typescript');
  const [copied, setCopied] = useState(false);
  const [pingLoading, setPingLoading] = useState(false);
  const [pingResult, setPingResult] = useState<{
    ok: boolean;
    latencyMs: number;
    message?: string;
    authType?: string;
    rateLimit?: any;
    error?: string;
  } | null>(null);

  if (!isOpen) return null;

  const currentApp = apps.find((a) => a.id === selectedAppId) || apps[0];
  const apiKeyPlaceholder = 'wev_live_YOUR_API_KEY';

  const snippets: Record<TechStack, string> = {
    curl: `# 1. Test authenticated connection
curl -X GET "https://api.wevsoft.com/api/developer/ping" \\
  -H "X-API-Key: ${apiKeyPlaceholder}" \\
  -H "Accept: application/json"`,

    typescript: `// npm install @wevsoft/sdk
import { WevsoftClient } from '@wevsoft/sdk';

const client = new WevsoftClient({
  baseUrl: 'https://api.wevsoft.com',
  apiKey: '${apiKeyPlaceholder}',
});

async function main() {
  // Test connection & check rate limits
  const pong = await client.ping();
  console.log('Wevsoft API Connected:', pong);

  // Read developer account rate limits
  const limits = await client.rateLimits.get();
  console.log(\`\${limits.remaining}/\${limits.perMinuteLimit} reqs remaining\`);
}
main();`,

    python: `# pip install wevsoft
from wevsoft import WevsoftClient

client = WevsoftClient(
    base_url="https://api.wevsoft.com",
    api_key="${apiKeyPlaceholder}",
)

# Test connection
pong = client.ping()
print("Ping Response:", pong)

# Check active rate limits
limits = client.rate_limits.get()
print(f"Remaining quota: {limits['remaining']}/{limits['perMinuteLimit']}")`,

    go: `// go get github.com/wevsoft/wevsoft-go
package main

import (
    "context"
    "fmt"
    "github.com/wevsoft/wevsoft-go"
)

func main() {
    client := wevsoft.NewClient(
        wevsoft.WithBaseURL("https://api.wevsoft.com"),
        wevsoft.WithAPIKey("${apiKeyPlaceholder}"),
    )

    ctx := context.Background()
    status, err := client.Status(ctx)
    if err != nil {
        panic(err)
    }
    fmt.Printf("Wevsoft status: %s\\n", status.Status)
}`,

    php: `<?php
// composer require wevsoft/client
require_once 'vendor/autoload.php';

use Wevsoft\\Client\\WevsoftClient;

$client = new WevsoftClient([
    'base_url' => 'https://api.wevsoft.com',
    'api_key'  => '${apiKeyPlaceholder}',
]);

$response = $client->ping();
echo "Connected: " . $response['message'];`,

    dart: `// flutter pub add wevsoft
import 'package:wevsoft/wevsoft.dart';

void main() async {
  final client = WevsoftClient(
    baseUrl: 'https://api.wevsoft.com',
    apiKey: '${apiKeyPlaceholder}',
  );

  final pong = await client.ping();
  print('Pong: \${pong.message}');
}`,
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(snippets[stack]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunPing = async () => {
    try {
      setPingLoading(true);
      const start = Date.now();
      const res = await sendDeveloperPing();
      const duration = Date.now() - start;
      setPingResult({
        ok: true,
        latencyMs: duration,
        message: res.message,
        authType: res.authType,
        rateLimit: res.rateLimit,
      });
    } catch (err: any) {
      setPingResult({
        ok: false,
        latencyMs: 0,
        error: err?.response?.data?.message || err?.message || 'Connection test failed',
      });
    } finally {
      setPingLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Developer Quickstart Wizard
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Test connectivity, choose your SDK, and certify your integration in under 60 seconds.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Step 1: App Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              1. Target Application
            </label>
            {apps.length > 0 ? (
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.mode || 'development'} mode) — ID: {a.id}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-amber-600">Please create an app first to test integration.</p>
            )}
          </div>

          {/* Step 2: Language Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              2. Choose Stack / SDK
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { id: 'typescript', label: 'Node / TS' },
                { id: 'python', label: 'Python' },
                { id: 'curl', label: 'cURL' },
                { id: 'go', label: 'Go' },
                { id: 'php', label: 'PHP' },
                { id: 'dart', label: 'Dart' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStack(item.id as TechStack)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                    stack === item.id
                      ? 'bg-primary-50 dark:bg-primary-950/50 border-primary-500 text-primary-600 dark:text-primary-400 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Code Snippet */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-primary-500" />
                3. Copy Integration Snippet
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied to clipboard!' : 'Copy Code'}
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
              {snippets[stack]}
            </pre>
          </div>

          {/* Step 4: Live Ping Test */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              4. Live Credential & Connectivity Probe
            </label>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Test Endpoint: <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">GET /api/developer/ping</code>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sends an immediate authenticated ping to verify gateway status and latency.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleRunPing()}
                disabled={pingLoading}
                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 active:bg-primary-700 shadow-sm disabled:opacity-50 shrink-0 transition-colors"
              >
                {pingLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Pinging...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Send Test Ping
                  </>
                )}
              </button>
            </div>

            {/* Ping Result Box */}
            {pingResult && (
              <div
                className={`mt-3 p-4 rounded-xl border text-xs transition-all ${
                  pingResult.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
                }`}
              >
                {pingResult.ok ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Pong! Connection Successful (HTTP 200 OK)
                      </span>
                      <span className="font-mono">{pingResult.latencyMs}ms roundtrip</span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40">
                      <span>Auth Type: <strong className="text-slate-800 dark:text-slate-200">{pingResult.authType}</strong></span>
                      <span>Target App: <strong className="text-slate-800 dark:text-slate-200">{currentApp?.name || 'Session'}</strong></span>
                      {pingResult.rateLimit && (
                        <span className="col-span-2">
                          Rate Limit Remaining: <strong className="text-slate-800 dark:text-slate-200">{pingResult.rateLimit.remaining} / {pingResult.rateLimit.limit} req/min</strong>
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold flex items-center gap-1.5">
                      Probe Failed: {pingResult.error}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Developer Platform Certified Engine</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
