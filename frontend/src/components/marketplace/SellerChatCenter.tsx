import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Sparkles, ShoppingBag, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { wevchatApi } from '../../lib/wevchatApi';
import UserAvatar from '../UserAvatar';

interface SellerChatCenterProps {
  onOpenAiTools: () => void;
}

interface InboxThread {
  conversationId: string | null;
  buyer: { id: string; name: string; avatar?: string; username?: string };
  lastOrder?: {
    id: string;
    orderNumber?: string | null;
    status?: string | null;
    productTitle?: string;
  } | null;
  lastMessage?: { text?: string | null; createdAt?: string; senderId?: string } | null;
  unreadCount: number;
}

export const SellerChatCenter: React.FC<SellerChatCenterProps> = ({ onOpenAiTools }) => {
  const user = useStore((s) => s.user);
  const token = useStore((s) => s.token);
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [active, setActive] = useState<InboxThread | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const auth = { Authorization: `Bearer ${token}` };

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/marketplace/seller-system/inbox', { headers: auth });
      const data = await res.json();
      const list: InboxThread[] = res.ok && Array.isArray(data.threads) ? data.threads : [];
      setThreads(list);
      setActive((prev) => prev || list[0] || null);
    } catch {
      toast.error('Failed to load customer inbox');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    fetchInbox();
  }, [fetchInbox]);

  const openThread = async (thread: InboxThread) => {
    setActive(thread);
    setLoadingThread(true);
    try {
      let cid = thread.conversationId;
      if (!cid && thread.buyer?.id) {
        const convo = await wevchatApi.getOrCreateDirect(thread.buyer.id);
        cid = convo.id;
      }
      setConversationId(cid || null);
      if (!cid) {
        setMessages([]);
        return;
      }
      const list = await wevchatApi.getMessages(cid);
      setMessages(Array.isArray(list) ? list : []);
      wevchatApi.markRead(cid).catch(() => {});
    } catch {
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (active) openThread(active);
     
  }, [active?.buyer?.id, active?.conversationId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !active?.buyer?.id) return;
    setSending(true);
    const textToSend = inputText.trim();
    setInputText('');
    try {
      const res = await fetch('/api/v1/marketplace/seller-system/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({
          text: textToSend,
          sellerId: user?.id,
          receiverId: active.buyer.id,
          orderId: active.lastOrder?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Send failed');
        setInputText(textToSend);
        return;
      }
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.message) setMessages((prev) => [...prev, data.message]);
      fetchInbox();
    } catch {
      toast.error('Send failed');
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  const handleUseAiReply = async () => {
    const lastCustomer = [...messages].reverse().find((m) => m.senderId !== user?.id);
    toast.loading('Generating professional AI customer reply...', { id: 'ai-reply' });
    try {
      const res = await fetch('/api/v1/marketplace/seller-system/ai/customer-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({
          customerMessage: lastCustomer?.text || inputText || 'Order inquiry',
          orderId: active?.lastOrder?.orderNumber || active?.lastOrder?.id,
          productTitle: active?.lastOrder?.productTitle,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInputText(data.replyText);
        toast.success('AI reply inserted — review before sending', { id: 'ai-reply' });
      } else {
        toast.error('AI reply failed', { id: 'ai-reply' });
      }
    } catch {
      toast.error('Network error', { id: 'ai-reply' });
    }
  };

  const orderLabel = active?.lastOrder
    ? `Order #${active.lastOrder.orderNumber || active.lastOrder.id?.slice(0, 8) || '—'}`
    : 'No order yet';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-card dark:bg-zinc-900 border border-border rounded-3xl p-4 sm:p-6 shadow-sm min-h-[550px]">
      <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-border pb-4 lg:pb-0 lg:pr-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" />
            Customer Chats
          </h3>
          <div className="flex items-center gap-1">
            <button type="button" onClick={fetchInbox} className="p-1 rounded-lg text-muted-foreground hover:text-foreground" title="Refresh">
              <RefreshCw size={13} />
            </button>
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
              {threads.length}
            </span>
          </div>
        </div>

        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {loading && <p className="text-[11px] text-muted-foreground px-1">Loading inbox…</p>}
          {!loading && threads.length === 0 && (
            <p className="text-[11px] text-muted-foreground px-1 py-6 text-center">
              No buyer chats yet. Orders and 1:1 messages will show up here — AI auto-reply still runs from Wev Chat.
            </p>
          )}
          {threads.map((thread) => {
            const selected = active?.buyer?.id === thread.buyer?.id;
            return (
              <button
                key={thread.buyer?.id || thread.conversationId}
                type="button"
                onClick={() => setActive(thread)}
                className={`w-full p-3 rounded-2xl text-left space-y-1 border ${
                  selected
                    ? 'bg-primary/15 border-primary/40'
                    : 'bg-black/5 dark:bg-white/5 border-transparent hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground truncate">{thread.buyer?.name || 'Buyer'}</span>
                  {thread.unreadCount > 0 && (
                    <span className="text-[10px] text-primary font-bold">{thread.unreadCount} new</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {thread.lastOrder?.productTitle || thread.lastMessage?.text || 'Start a conversation'}
                </p>
                {thread.lastOrder && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <ShoppingBag size={12} className="text-primary" />
                    <span className="text-[10px] font-mono text-primary font-bold">
                      #{thread.lastOrder.orderNumber || thread.lastOrder.id?.slice(0, 8)}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-3 flex flex-col justify-between space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
          <div>
            <h4 className="text-sm font-extrabold text-foreground">{active?.buyer?.name || 'Select a buyer'}</h4>
            <p className="text-xs text-muted-foreground">
              {conversationId ? 'Wev Chat thread — AI auto-reply is on if you enabled an agent' : 'Wevsoft Buyer Escrow Protected'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAiTools}
              className="px-3 py-1.5 rounded-xl bg-primary/15 border border-primary/40 text-primary text-xs font-bold flex items-center gap-1.5 hover:bg-primary/25"
            >
              <Sparkles size={14} />
              AI Tools
            </button>
            {active?.lastOrder && (
              <div className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border flex items-center gap-2 text-xs">
                <ShoppingBag size={14} className="text-primary" />
                <span className="font-bold text-foreground">{orderLabel}</span>
                {active.lastOrder.status && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase">
                    {active.lastOrder.status}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto max-h-[350px] pr-2">
          {loadingThread && <p className="text-[11px] text-muted-foreground text-center py-6">Loading thread…</p>}
          {!loadingThread && messages.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-10">No messages yet. Say hello to this buyer.</p>
          )}
          {messages.map((m) => {
            const isCustomer = m.senderId !== user?.id;
            return (
              <div key={m.id} className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}>
                <div className="flex items-end gap-2 max-w-md">
                  {isCustomer && <UserAvatar user={m.sender || active?.buyer} className="w-6 h-6 text-[9px]" />}
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isCustomer
                        ? 'bg-black/5 dark:bg-white/5 text-foreground border border-border rounded-tl-none'
                        : 'bg-gradient-to-r from-primary to-primary text-white rounded-tr-none shadow-sm'
                    }`}
                  >
                    {m.isAiGenerated && <span className="block text-[9px] font-bold opacity-70 mb-1">✨ AI auto-reply</span>}
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <button
            type="button"
            onClick={handleUseAiReply}
            disabled={!active}
            className="p-2.5 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 disabled:opacity-40"
            title="Draft AI reply"
          >
            <Sparkles size={16} />
          </button>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={active ? 'Reply to this buyer…' : 'Select a conversation first'}
            disabled={!active}
            rows={2}
            className="flex-1 resize-none bg-black/5 dark:bg-white/5 border border-border rounded-2xl px-3 py-2 text-xs outline-none focus:border-primary/40"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim() || !active}
            className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-40"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
};
