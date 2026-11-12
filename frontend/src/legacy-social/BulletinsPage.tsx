import React, { useEffect, useState } from 'react';
import { Megaphone, Flag, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import { profilePathFor } from '../lib/profileLinks';
import { Link, Navigate } from 'react-router-dom';
import { legacySocialApi } from './api';
import ReportModal from '../components/ReportModal';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';

export default function BulletinsPage() {
  const { isSpaceMode } = useSpaceIdentities();
  if (isSpaceMode) {
    return <Navigate to="/home" replace />;
  }
  const user = useStore((s) => s.user);
  const [rows, setRows] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [ttl, setTtl] = useState(48);
  const [reportId, setReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setRows(await legacySocialApi.bulletins());
    } catch (err: any) {
      toast.error(err.message || 'Could not load bulletins');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { load(); }, []);

  const post = async () => {
    if (!text.trim()) return;
    try {
      await legacySocialApi.postBulletin({ content: text.trim(), ttlHours: ttl });
      setText('');
      toast.success('Bulletin sent to followers');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <div className="flex items-center gap-2 mb-5">
        <Megaphone className="text-primary" size={22} />
        <div>
          <h1 className="text-xl font-bold">Bulletins</h1>
          <p className="text-xs text-muted-foreground">Short, time-limited notes for followers — not mixed into the feed.</p>
        </div>
      </div>

      {user && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 280))}
            rows={3}
            placeholder="Share a short announcement…"
            className="w-full bg-muted/40 rounded-xl px-3 py-2 text-sm resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <select aria-label="Bulletin duration" value={ttl} onChange={(e) => setTtl(Number(e.target.value))} className="text-xs bg-muted rounded-lg px-2 py-1">
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
              <option value={72}>72 hours</option>
            </select>
            <button type="button" onClick={post} className="px-4 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
              Broadcast
            </button>
          </div>
        </div>
      )}

      {loading && <div className="h-24 rounded-2xl bg-muted/40 animate-pulse" />}
      <div className="space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Link to={profilePathFor(row.author) || '#'}>
                <img src={row.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.authorUserId}`} alt="" className="w-10 h-10 rounded-full object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                  {row.author?.name}
                  {row.group?.name && <span className="text-muted-foreground font-normal"> · {row.group.name}</span>}
                </p>
                <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}</p>
                <p className="text-sm mt-2 whitespace-pre-wrap break-words">{row.content}</p>
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setReportId(row.id)} className="text-[11px] text-muted-foreground hover:text-red-500 inline-flex items-center gap-1"><Flag size={10} /> Report</button>
                  {user?.id === row.authorUserId && (
                    <button type="button" onClick={async () => { await legacySocialApi.hideBulletin(row.id); load(); }} className="text-[11px] text-muted-foreground hover:text-red-500 inline-flex items-center gap-1"><Trash2 size={10} /> Hide</button>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
        {!loading && !rows.length && <p className="text-sm text-muted-foreground text-center py-10">No bulletins yet.</p>}
      </div>
      {reportId && <ReportModal targetId={reportId} targetType="bulletin" onClose={() => setReportId(null)} />}
    </div>
  );
}
