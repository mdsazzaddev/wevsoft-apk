import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Key, Bot, Settings, ChevronRight, Save, BrainCircuit, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../store';

export default function AiAssistantPage() {
  const token = useStore((s) => s.token);
  const [activeTab, setActiveTab] = useState<'models' | 'personas' | 'memory'>('models');
  const [settings, setSettings] = useState<any>({
    defaultProvider: 'gemini',
    defaultModel: 'gemini-2.5-flash',
    byokEnabled: false,
    temperature: 0.7,
    maxTokens: 2048,
    autoReplyGlobal: false,
    systemPrompt: '',
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setLoading(false);
      return;
    }
    fetch('/api/v1/wev-ai-platform/settings', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`settings ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data && data.defaultProvider) {
          setSettings(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [token]);

  const handleSave = async () => {
    if (!token) {
      toast.error('Please sign in to save AI settings.');
      return;
    }
    try {
      const res = await fetch('/api/v1/wev-ai-platform/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      if (res.ok) toast.success('AI Settings saved successfully!');
      else toast.error('Failed to save settings.');
    } catch (e) {
      toast.error('Network error saving settings.');
    }
  };

  if (loading) {
    return <div className="p-10 text-center animate-pulse text-muted-foreground">Loading AI Settings...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto min-h-full md:h-[calc(100vh-6rem)] p-4 md:p-6 flex flex-col md:flex-row gap-6">
      
      {/* ─── LEFT: NAVIGATION MENU ────────────────────────────────────────── */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
        <h1 className="text-2xl font-black tracking-tight mb-4 flex items-center gap-2">
          <Sparkles className="text-blue-500" /> Wevsoft AI
        </h1>

        <div className="space-y-1">
          <button onClick={() => setActiveTab('models')} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTab === 'models' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-black/5 dark:bg-white/5 text-muted-foreground'}`}>
            <div className="flex items-center gap-3"><Settings size={18} /> <span className="font-bold text-sm">Model Settings</span></div>
          </button>
          
          <button onClick={() => setActiveTab('personas')} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTab === 'personas' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-black/5 dark:bg-white/5 text-muted-foreground'}`}>
            <div className="flex items-center gap-3"><Bot size={18} /> <span className="font-bold text-sm">AI Personas</span></div>
          </button>

          <button onClick={() => setActiveTab('memory')} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTab === 'memory' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-black/5 dark:bg-white/5 text-muted-foreground'}`}>
            <div className="flex items-center gap-3"><BrainCircuit size={18} /> <span className="font-bold text-sm">Memory Dashboard</span></div>
          </button>
        </div>

        <div className="mt-8 space-y-1 border-t border-border pt-4">
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground px-3 mb-2">Ecosystem</p>
          {/* DEAD-01: /ai/workflows was retired (App.tsx redirects it to /home), so the
              Workflow Builder entry is hidden instead of bouncing users to the feed. */}
          <button onClick={() => {}} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-black/5 dark:bg-white/5 text-muted-foreground transition-all">
            <div className="flex items-center gap-3"><Users size={18} /> <span className="font-bold text-sm">Agent WevMall</span></div>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ─── RIGHT: SETTINGS PANEL ────────────────────────────────────────── */}
      <div className="flex-1 bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-4 md:p-8 overflow-y-auto custom-scrollbar">
        
        {activeTab === 'models' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Model & Provider Settings</h2>
                <p className="text-sm text-muted-foreground mt-1">Configure your default AI models and Bring-Your-Own-Key (BYOK) settings.</p>
              </div>
              <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all">
                <Save size={16} /> Save Changes
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Default Provider */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Default Provider</label>
                <select 
                  value={settings.defaultProvider}
                  onChange={(e) => setSettings({...settings, defaultProvider: e.target.value})}
                  className="w-full bg-black/40 border border-border rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500/50"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="groq">Groq</option>
                </select>
              </div>

              {/* Default Model */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Default Model</label>
                <select 
                  value={settings.defaultModel}
                  onChange={(e) => setSettings({...settings, defaultModel: e.target.value})}
                  className="w-full bg-black/40 border border-border rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500/50"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                </select>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-blue-400 flex items-center gap-2"><Key size={16} /> Bring Your Own Key (BYOK)</h3>
                  <p className="text-xs text-muted-foreground mt-1">Use your own API keys to bypass platform credit limits. Keys are AES-256 encrypted.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={settings.byokEnabled} onChange={(e) => setSettings({...settings, byokEnabled: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-black/10 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
              
              {settings.byokEnabled && (
                <div className="pt-4 border-t border-blue-500/20">
                  <input type="password" placeholder="Enter Provider API Key (sk-...)" className="w-full bg-black/10 dark:bg-black/50 border border-border rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500/50" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-bold">Generation Parameters</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-muted-foreground flex justify-between"><span>Temperature</span> <span>{settings.temperature}</span></label>
                  <input type="range" min="0" max="1" step="0.1" value={settings.temperature} onChange={(e) => setSettings({...settings, temperature: parseFloat(e.target.value)})} className="w-full mt-2 accent-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground flex justify-between"><span>Max Tokens</span> <span>{settings.maxTokens}</span></label>
                  <input type="range" min="256" max="8192" step="256" value={settings.maxTokens} onChange={(e) => setSettings({...settings, maxTokens: parseInt(e.target.value)})} className="w-full mt-2 accent-blue-500" />
                </div>
              </div>
            </div>

          </motion.div>
        )}

        {activeTab === 'personas' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
             <h2 className="text-2xl font-bold mb-4">Autonomous Agent Settings</h2>
             <p className="text-muted-foreground mb-6">Configure how Wevsoft AI acts when chatting on your behalf.</p>
             
             <div className="space-y-4">
               <label className="text-sm font-bold">Global System Prompt</label>
               <textarea 
                  rows={5}
                  value={settings.systemPrompt}
                  onChange={(e) => setSettings({...settings, systemPrompt: e.target.value})}
                  placeholder="You are an AI assistant representing Abrar. Be polite and concise..."
                  className="w-full bg-black/40 border border-border rounded-xl p-4 text-sm font-medium outline-none focus:border-blue-500/50"
               />
               
               <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 border border-border rounded-xl mt-4">
                 <div>
                   <p className="font-bold">Auto-Reply Global Toggle</p>
                   <p className="text-xs text-muted-foreground">Allow AI to autonomously reply to specified direct messages.</p>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={settings.autoReplyGlobal} onChange={(e) => setSettings({...settings, autoReplyGlobal: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-black/10 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
               </div>
             </div>
             
             <button onClick={handleSave} className="mt-8 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20">
               Save System Prompt
             </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
