import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { marketFetch } from '../commerce/utils';

// Ids are the values the API has always stored; only the labels changed.
const REACTIONS = [
  { id: 'like', label: '👍 Like' },
  { id: 'love', label: '❤️ Love' },
  { id: 'hot', label: '🔥 Fire' },
  { id: 'want', label: '😍 Interested' },
];

export function ProductSocial({
  productId,
  token,
  isSeller,
}: {
  productId: string;
  token: string | null;
  isSeller?: boolean;
}) {
  const [data, setData] = useState<any>({ comments: [], questions: [], reactions: {}, myReaction: null, bids: [] });
  const [comment, setComment] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<Record<string, string>>({});
  const [reply, setReply] = useState<Record<string, string>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const d = token
        ? await marketFetch(`/api/marketplace/${productId}/social`, token)
        : await fetch(`/api/marketplace/${productId}/social`).then((r) => r.json());
      setData(d);
      setError(null);
    } catch {
      setError('Could not load the discussion. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setLoading(true);
    load().catch(() => {});
  }, [productId, token]);

  const likeAnswer = async (answerId: string) => {
    if (!token) return toast.error('Sign in first');
    await marketFetch(`/api/marketplace/answers/${answerId}/like`, token, { method: 'POST' });
    load();
  };

  const markBest = async (answerId: string) => {
    await marketFetch(`/api/marketplace/answers/${answerId}/best`, token, { method: 'POST' });
    toast.success('Marked as the best answer');
    load();
  };

  const postReply = async (questionId: string, parentId: string) => {
    const body = reply[parentId]?.trim();
    if (!body) return;
    await marketFetch(`/api/marketplace/${productId}/answers`, token, {
      method: 'POST',
      body: JSON.stringify({ questionId, answer: body, parentId }),
    });
    setReply((p) => ({ ...p, [parentId]: '' }));
    setReplyOpen((p) => ({ ...p, [parentId]: false }));
    load();
  };

  if (loading) {
    return (
      <div className="space-y-4 mt-6" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
            <div className="h-3 w-24 bg-muted rounded mb-3" />
            <div className="h-8 w-full bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 bg-card border border-border rounded-lg p-6 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            load();
          }}
          className="mt-3 px-3 py-1.5 rounded-md border border-border text-xs font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  const react = async (type: string) => {
    if (!token) return toast.error('Sign in first');
    const d = await marketFetch(`/api/marketplace/${productId}/reactions`, token, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
    setData((prev: any) => ({ ...prev, reactions: d.reactions, myReaction: prev.myReaction === type ? null : type }));
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    await marketFetch(`/api/marketplace/${productId}/comments`, token, {
      method: 'POST',
      body: JSON.stringify({ text: comment }),
    });
    setComment('');
    load();
  };

  const postQuestion = async () => {
    if (!question.trim()) return;
    await marketFetch(`/api/marketplace/${productId}/questions`, token, {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
    setQuestion('');
    toast.success('Question posted');
    load();
  };

  return (
    <div className="space-y-6 mt-6">
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-wrap gap-2">
          {REACTIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => react(r.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                data.myReaction === r.id ? 'border-primary bg-primary/10 text-primary' : 'border-border'
              }`}
            >
              {r.label} {data.reactions?.[r.id] ? data.reactions[r.id] : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-bold text-sm mb-3">Comments</h3>
        <div className="flex gap-2 mb-3">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write a comment…"
            className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background"
          />
          <button type="button" onClick={postComment} className="px-3 py-2 rounded-md bg-primary text-white text-xs font-bold">
            Post
          </button>
        </div>
        <div className="space-y-2">
          {(data.comments || []).map((c: any) => (
            <div key={c.id} className="text-sm border border-border rounded-md p-2.5">
              <span className="font-bold text-xs">{c.user?.name}</span>
              <p className="text-muted-foreground mt-0.5">{c.text}</p>
            </div>
          ))}
          {!data.comments?.length && <p className="text-xs text-muted-foreground">Be the first to comment.</p>}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-bold text-sm mb-3">Questions & answers</h3>
        <div className="flex gap-2 mb-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask the seller…"
            className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background"
          />
          <button type="button" onClick={postQuestion} className="px-3 py-2 rounded-md border border-border text-xs font-bold">
            Ask
          </button>
        </div>
        <div className="space-y-3">
          {(data.questions || []).map((q: any) => (
            <div key={q.id} className="border border-border rounded-md p-3">
              <p className="text-sm font-semibold">Q: {q.question}</p>
              <p className="text-[11px] text-muted-foreground mb-2">{q.user?.name}</p>
              {(q.answers || []).map((a: any) => (
                <div key={a.id} className="mt-2 pl-3 border-l-2 border-emerald-500/40">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-bold text-emerald-600">A:</span> {a.answer}
                    {a.isBest && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold align-middle">
                        Best answer
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => likeAnswer(a.id)}
                      className={`text-[11px] font-bold ${a.likes?.length ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      👍 Helpful {a.likeCount || 0}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyOpen((p) => ({ ...p, [a.id]: !p[a.id] }))}
                      className="text-[11px] font-bold text-muted-foreground"
                    >
                      Reply
                    </button>
                    {!a.isBest && (isSeller || q.user?.id) && (
                      <button
                        type="button"
                        onClick={() => markBest(a.id)}
                        className="text-[11px] font-bold text-emerald-600"
                      >
                        Mark best
                      </button>
                    )}
                  </div>
                  {(a.replies || []).map((r: any) => (
                    <p key={r.id} className="text-xs text-muted-foreground mt-1 pl-3">
                      <span className="font-bold">{r.user?.name}:</span> {r.answer}
                    </p>
                  ))}
                  {replyOpen[a.id] && (
                    <div className="flex gap-2 mt-2">
                      <input
                        value={reply[a.id] || ''}
                        onChange={(e) => setReply((p) => ({ ...p, [a.id]: e.target.value }))}
                        placeholder="Write a reply"
                        className="flex-1 border border-border rounded-md px-2 py-1.5 text-xs bg-background"
                      />
                      <button
                        type="button"
                        onClick={() => postReply(q.id, a.id)}
                        className="px-2 py-1 rounded-md border border-border text-[11px] font-bold"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {isSeller && (
                <div className="flex gap-2 mt-2">
                  <input
                    value={answer[q.id] || ''}
                    onChange={(e) => setAnswer((p) => ({ ...p, [q.id]: e.target.value }))}
                    placeholder="Write an answer"
                    className="flex-1 border border-border rounded-md px-2 py-1.5 text-xs bg-background"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await marketFetch(`/api/marketplace/${productId}/answers`, token, {
                        method: 'POST',
                        body: JSON.stringify({ questionId: q.id, answer: answer[q.id] }),
                      });
                      setAnswer((p) => ({ ...p, [q.id]: '' }));
                      load();
                    }}
                    className="px-2 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-bold"
                  >
                    Answer
                  </button>
                </div>
              )}
            </div>
          ))}
          {!data.questions?.length && (
            <p className="text-xs text-muted-foreground">No questions yet — ask the seller anything about this item.</p>
          )}
        </div>
      </div>
    </div>
  );
}
