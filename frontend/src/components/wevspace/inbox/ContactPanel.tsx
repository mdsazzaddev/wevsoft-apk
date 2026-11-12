/**
 * Contact panel (~25%). Only facts the inbox API actually returns are shown;
 * anything the Space has no way to know yet reads "—" with the reason on hover.
 */

import type { LucideIcon } from 'lucide-react';
import {
  AtSign,
  BadgeCheck,
  CalendarDays,
  ExternalLink,
  Hash,
  Mail,
  MessageSquareText,
  Phone,
  ShieldAlert,
  Store,
  Tag,
  UserCheck,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SPACE_THREAD_LABELS, SPACE_THREAD_STATUS_LABELS, type SpaceThreadStatus } from '@wevsoft/shared/wevspace';
import { compact, longDate } from './inboxData';
import { Avatar, IconBtn, cx } from './inboxUi';

interface Props {
  thread: any | null;
  listRow: any | null;
  replyingAs: { name: string; handle: string; verified: boolean } | null;
  presence?: 'online' | 'offline';
  loading: boolean;
  onClose: () => void;
}

export default function ContactPanel({ thread, listRow, replyingAs, presence, loading, onClose }: Props) {
  const customer = thread?.customer || listRow?.customer || null;
  const status: SpaceThreadStatus = (thread?.status || listRow?.status || 'OPEN') as SpaceThreadStatus;
  const labels: string[] = Array.isArray(thread?.labels) ? thread.labels : Array.isArray(listRow?.labels) ? listRow.labels : [];
  const contact = (thread?.contact || listRow?.contact || {}) as Record<string, unknown>;
  const email = typeof contact.email === 'string' && contact.email ? contact.email : null;
  const phone = typeof contact.phone === 'string' && contact.phone ? contact.phone : null;
  const notes = typeof thread?.notes === 'string' ? thread.notes : '';
  const joined = customer?.createdAt ? longDate(customer.createdAt) : null;
  const started = thread?.createdAt || listRow?.createdAt;
  const messageCount = typeof thread?.messageCount === 'number' ? thread.messageCount : null;
  const isCustomer = status === 'OPEN' || status === 'RESOLVED' || status === 'ARCHIVED';

  return (
    <aside aria-label="Contact details" className="h-full min-h-0 flex flex-col bg-[var(--si-card)]">
      <div className="shrink-0 h-[60px] flex items-center gap-2 px-4 border-b border-[var(--si-border)]">
        <h2 className="flex-1 text-[14px] font-bold text-[var(--si-text)]">Contact</h2>
        <IconBtn icon={X} label="Close contact details" onClick={onClose} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto si-scroll">
        {!customer ? (
          <p className="p-6 text-center text-[12.5px] text-[var(--si-muted)]">{loading ? 'Loading…' : 'Pick a conversation to see who you are talking to.'}</p>
        ) : (
          <>
            <div className="px-5 pt-6 pb-5 text-center border-b border-[var(--si-border)]">
              <div className="inline-block">
                <Avatar person={customer} size={76} presence={presence || null} />
              </div>
              <p className="mt-3 text-[16px] font-bold text-[var(--si-text)] truncate">{customer.name || customer.username || 'Someone'}</p>
              {customer.username && <p className="text-[12.5px] text-[var(--si-muted)] truncate">@{customer.username}</p>}
              <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                <span className={cx('px-2 py-0.5 rounded-full text-[11px] font-semibold', isCustomer ? 'bg-[var(--si-green-soft)] text-[var(--si-green)]' : status === 'SPAM' ? 'bg-[var(--si-red-soft)] text-[var(--si-red)]' : 'bg-[var(--si-amber-soft)] text-[var(--si-amber)]')}>
                  {isCustomer ? 'Contact' : SPACE_THREAD_STATUS_LABELS[status] || status}
                </span>
                {labels.map((id) => {
                  const def = SPACE_THREAD_LABELS.find((entry) => entry.id === id);
                  return def ? (
                    <span key={id} className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${def.tone}`}>
                      {def.label}
                    </span>
                  ) : null;
                })}
              </div>
              {customer.username && (
                <Link to={`/u/${customer.username}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--si-blue)] hover:underline">
                  View Wevsoft profile <ExternalLink size={12} />
                </Link>
              )}
            </div>

            <dl className="px-4 py-3 space-y-0.5">
              <Fact icon={Mail} label="Email" value={email} missing="Not shared with this Space" />
              <Fact icon={Phone} label="Phone" value={phone} missing="Not shared with this Space" />
              <Fact icon={Store} label="Space" value={replyingAs ? `${replyingAs.name} · @${replyingAs.handle}` : null} missing="Unknown" badge={replyingAs?.verified} />
              <Fact icon={CalendarDays} label="Joined Wevsoft" value={joined} missing="Join date not available" />
              <Fact icon={MessageSquareText} label="First message" value={started ? longDate(started) : null} missing="Not available" />
              <Fact icon={Hash} label="Total messages" value={messageCount === null ? null : compact(messageCount)} missing={loading ? 'Loading…' : 'Not available'} />
              <Fact icon={UserCheck} label="Assigned to" value={thread?.assignedTo?.user?.name || listRow?.assignedTo?.user?.name || 'Unassigned'} missing="" />
              <Fact icon={AtSign} label="Status" value={SPACE_THREAD_STATUS_LABELS[status] || status} missing="" />
            </dl>

            {Array.isArray(thread?.customerSanctions) && thread.customerSanctions.length > 0 && (
              <div className="mx-4 mb-3 flex gap-2 rounded-lg bg-[var(--si-amber-soft)] px-3 py-2.5 text-[12px] text-[var(--si-amber)]">
                <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                Currently {thread.customerSanctions.join(' and ').toLowerCase()} on this Space.
              </div>
            )}

            {notes && (
              <div className="mx-4 mb-3 rounded-lg border border-[var(--si-border)] bg-[var(--si-card-2)] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--si-muted)]">Notes</p>
                <p className="mt-1 text-[12.5px] whitespace-pre-wrap text-[var(--si-text-2)]">{notes}</p>
              </div>
            )}

            <div className="mx-4 mb-5 rounded-lg border border-dashed border-[var(--si-border-2)] px-3 py-3">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--si-text-2)]">
                <Tag size={13} /> CRM profile, private notes & order history
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--si-muted)]">Leads, notes and deals are kept in the Business CRM. Labels and assignment work from the ⋮ menu.</p>
              <Link to="/business/crm" className="mt-2 inline-flex text-[12px] font-semibold text-[var(--si-blue)] hover:underline">Open CRM →</Link>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function Fact({ icon: Icon, label, value, missing, badge }: { icon: LucideIcon; label: string; value: string | null; missing: string; badge?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-lg px-1 py-2">
      <span className="mt-0.5 grid place-items-center w-7 h-7 shrink-0 rounded-lg bg-[var(--si-hover)] text-[var(--si-muted)]">
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] text-[var(--si-muted)]">{label}</dt>
        <dd className="text-[13px] font-medium text-[var(--si-text)] truncate flex items-center gap-1" title={value ? value : missing}>
          {value ? (
            <>
              <span className="truncate">{value}</span>
              {badge && <BadgeCheck size={13} className="shrink-0 text-[var(--si-blue)]" />}
            </>
          ) : (
            <span className="text-[var(--si-faint)] cursor-help">—</span>
          )}
        </dd>
      </div>
    </div>
  );
}
