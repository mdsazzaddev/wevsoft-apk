import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MarketplaceHeader } from '../components/marketplace/commerce/MarketplaceHeader';
import { PriceTag } from '../components/marketplace/commerce/primitives';
import { marketFetch, productThumb } from '../components/marketplace/commerce/utils';
import { useStore } from '../store';

export default function MarketplaceLivePage() {
  const { id } = useParams();
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);

  const [session, setSession] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [text, setText] = useState('');

  const load = () => {
    if (!token) return;
    if (!id) {
      marketFetch('/api/marketplace/live', token).then((d) => setSessions(d.sessions || [])).catch(() => {});
      return;
    }
    marketFetch(`/api/marketplace/live/${id}`, token).then(setSession).catch(() => setSession(null));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [id, token]);

  if (!id) {
    return (
      <div className="max-w-5xl mx-auto pb-12">
        <MarketplaceHeader search="" onSearchChange={() => {}} onSearchSubmit={() => {}} category="All" onCategory={() => {}} />
        <h1 className="text-xl font-bold mb-4">Live selling</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sessions.map((s) => (
            <Link key={s.id} to={`/wevmall/live/${s.id}`} className="bg-card border border-border rounded-lg p-4">
              <span className="text-[10px] font-bold text-rose-500">LIVE</span>
              <div className="font-bold mt-1">{s.title}</div>
              <p className="text-xs text-muted-foreground">{s.host?.name}</p>
            </Link>
          ))}
          {!sessions.length && <p className="text-sm text-muted-foreground">No live sales right now.</p>}
        </div>
      </div>
    );
  }

  if (!session) {
    return <div className="max-w-4xl mx-auto py-16 text-center text-sm text-muted-foreground">Loading live sale…</div>;
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <MarketplaceHeader search="" onSearchChange={() => {}} onSearchSubmit={() => {}} category="All" onCategory={() => {}} />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="bg-black rounded-lg aspect-video relative overflow-hidden">
          {session.streamUrl ? (
            <video src={session.streamUrl} controls autoPlay className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <span className="px-2 py-0.5 rounded bg-rose-600 text-[10px] font-bold mb-2">LIVE</span>
              <p className="font-bold">{session.title}</p>
              <p className="text-xs text-white/70 mt-1">Hosted by {session.host?.name}</p>
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-lg p-3 flex flex-col h-[480px]">
          <h3 className="font-bold text-sm mb-2">Live chat</h3>
          <div className="flex-1 overflow-y-auto space-y-2 text-sm">
            {(session.chats || []).map((c: any) => (
              <div key={c.id}>
                <span className="font-bold text-xs">{c.user?.name}: </span>
                <span className="text-muted-foreground">{c.text}</span>
              </div>
            ))}
          </div>
          <form
            className="flex gap-2 mt-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!text.trim()) return;
              await marketFetch(`/api/marketplace/live/${id}/chat`, token, {
                method: 'POST',
                body: JSON.stringify({ text }),
              });
              setText('');
              load();
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 border border-border rounded-md px-2 py-1.5 text-xs bg-background"
              placeholder="Say something…"
            />
            <button onClick={() => {}} className="px-2 py-1.5 rounded-md bg-[#F57224] text-white text-xs font-bold">Send</button>
          </form>
        </div>
      </div>
      {session.product && (
        <div className="mt-4 bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <img src={productThumb(session.product)} alt="" className="w-20 h-20 rounded object-cover" />
          <div className="flex-1">
            <div className="font-bold">{session.product.title}</div>
            <PriceTag price={session.product.price} discountPrice={session.product.discountPrice} />
          </div>
          <Link
            to={`/wevmall/product/${session.product.id}`}
            className="px-4 py-2 rounded-md bg-[#F57224] text-white text-sm font-bold"
            onClick={() => toast.success('Opening product')}
          >
            Buy now
          </Link>
        </div>
      )}
    </div>
  );
}
