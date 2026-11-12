import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, QrCode, Sparkles, ShieldCheck, Users, Briefcase, ShoppingBag, MessageCircle, Heart, Network, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { ProximityRadar } from './ProximityRadar';
import { QRConnect } from './QRConnect';
import { ZoneManager } from './ZoneManager';
import { InsightsGraph } from './InsightsGraph';

export const NetworkDashboard: React.FC = () => {
  const token = useStore((s) => s.token);
  const [activeTab, setActiveTab] = useState<'radar' | 'qr' | 'catchup' | 'zones' | 'connections'>('radar');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'SOCIAL' | 'PROFESSIONAL' | 'MARKETPLACE'>('ALL');
  
  // AI Catch Up State
  const [catchUpList, setCatchUpList] = useState<any[]>([]);
  const [selectedInsightUserId, setSelectedInsightUserId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchCatchUpList();
  }, []);

  const fetchCatchUpList = async () => {
    try {
      const res = await fetch('/api/v1/network/catch-up', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCatchUpList(data.catchUpList || []);
      }
    } catch (e) {
      console.error('[Catch Up Fetch Error]', e);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Ecosystem Title Header */}
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Network size={24} className="text-purple-400" />
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">Ultimate Connections Ecosystem</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-400 border border-purple-500/30 uppercase tracking-widest">
              AI ENGINE V2
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage multi-tier relationships (Social, Professional, WevMall), discover nearby members on Radar & QR, and utilize AI CRM catch-up tools.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap bg-black/5 dark:bg-white/5 p-1 rounded-2xl border border-border">
          {[
            { id: 'radar', label: 'Radar', icon: Radio },
            { id: 'qr', label: 'QR Connect', icon: QrCode },
            { id: 'catchup', label: 'AI Catch-Up', icon: Sparkles },
            { id: 'zones', label: 'Privacy Zones', icon: ShieldCheck },
            { id: 'connections', label: 'Tiers Network', icon: Users },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  activeTab === t.id
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={15} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB 1: Wevsoft RADAR ─────────────────────────────────────────────────── */}
      {activeTab === 'radar' && <ProximityRadar />}

      {/* ── TAB 2: QR CONNECT ─────────────────────────────────────────────────── */}
      {activeTab === 'qr' && <QRConnect />}

      {/* ── TAB 3: AI CATCH-UP CRM WIDGET ────────────────────────────────────── */}
      {activeTab === 'catchup' && (
        <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-purple-400 animate-pulse" />
              <h3 className="text-lg font-extrabold text-foreground">AI Relationship Manager (Catch-Up)</h3>
            </div>
            <span className="text-xs text-purple-400 font-mono">30-Day Interaction Monitor</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catchUpList.map((item, idx) => (
              <div
                key={idx}
                className="bg-card/60 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-4 space-y-3 hover:border-purple-500/50 transition-all shadow-lg shadow-purple-500/5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.user.avatar || `https://ui-avatars.com/api/?name=${item.user.name}`}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover border-2 border-purple-500/30"
                    />
                    <div>
                      <h4 className="font-extrabold text-sm text-foreground">{item.user.name}</h4>
                      <span className="text-[10px] font-bold text-purple-400">
                        Last interacted {item.daysSinceLastInteraction} days ago
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedInsightUserId(item.user.id)}
                    className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 text-muted-foreground hover:text-foreground text-xs font-bold transition-all"
                    title="View Mutual Insights"
                  >
                    <Network size={16} />
                  </button>
                </div>

                {/* Icebreaker Prompt */}
                <div className="bg-black/5 dark:bg-white/5 border border-border rounded-xl p-3 text-xs text-foreground/90 font-medium">
                  <p className="text-[10px] uppercase font-extrabold tracking-wider text-purple-400 mb-1">AI Icebreaker Suggestion:</p>
                  <p className="italic">{item.suggestedIcebreaker}</p>
                </div>

                <button
                  onClick={() => toast.success(`Message draft created for ${item.user.name}!`)}
                  className="w-full py-2 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5"
                >
                  <MessageCircle size={14} />
                  <span>Send Catch-Up Message</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: PRIVACY ZONES ──────────────────────────────────────────────── */}
      {activeTab === 'zones' && <ZoneManager />}

      {/* ── TAB 5: CATEGORIZED CONNECTION TIERS ──────────────────────────────── */}
      {activeTab === 'connections' && (
        <CategorizedConnectionsView 
          onOpenInsights={(id) => setSelectedInsightUserId(id)}
        />
      )}

      {/* ── MUTUAL INSIGHTS GRAPH MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {selectedInsightUserId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 dark:bg-black/70 backdrop-blur-md">
            <InsightsGraph
              targetUserId={selectedInsightUserId}
              onClose={() => setSelectedInsightUserId(null)}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Sub-component for Categorized Smart Connection Tiers
const CategorizedConnectionsView: React.FC<{ onOpenInsights: (id: string) => void }> = ({ onOpenInsights }) => {
  const token = useStore((s) => s.token);
  const [selectedTier, setSelectedTier] = useState<'ALL' | 'SOCIAL' | 'PROFESSIONAL' | 'MARKETPLACE'>('ALL');
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchTierConnections();
  }, [selectedTier]);

  const fetchTierConnections = async () => {
    setLoading(true);
    try {
      const url = selectedTier === 'ALL' 
        ? '/api/v1/network/connections' 
        : `/api/v1/network/connections?tier=${selectedTier}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } catch (e) {
      console.error('[Tier Fetch Error]', e);
    } finally {
      setLoading(false);
    }
  };

  const tiers = [
    { key: 'ALL', label: 'All Tiers', icon: Users },
    { key: 'SOCIAL', label: 'Social Friends', icon: Heart },
    { key: 'PROFESSIONAL', label: 'Professional Network', icon: Briefcase },
    { key: 'MARKETPLACE', label: 'WevMall Trusted', icon: ShoppingBag },
  ];

  return (
    <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-foreground">Categorized Smart Connection Tiers</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Filter your graph network by relationship context.</p>
        </div>

        <div className="flex flex-wrap bg-black/5 dark:bg-white/5 p-1 rounded-2xl border border-border">
          {tiers.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setSelectedTier(t.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedTier === t.key
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-muted-foreground font-mono">Loading Connections...</div>
      ) : connections.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">No connections found in this tier.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map(item => (
            <div
              key={item.id}
              className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-purple-500/30 transition-all shadow-lg"
            >
              <div className="flex items-center gap-3">
                <img
                  src={item.user.avatar || `https://ui-avatars.com/api/?name=${item.user.name}`}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/20"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-sm text-foreground truncate">{item.user.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">@{item.user.username}</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold mt-1 uppercase ${
                    item.tier === 'PROFESSIONAL' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    item.tier === 'MARKETPLACE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  }`}>
                    {item.tier}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-mono">
                  Score: <strong className="text-purple-400">{item.interactionScore}</strong>
                </span>
                <button
                  onClick={() => onOpenInsights(item.user.id)}
                  className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 text-xs font-bold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1"
                >
                  <Network size={13} />
                  <span>Graph</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

