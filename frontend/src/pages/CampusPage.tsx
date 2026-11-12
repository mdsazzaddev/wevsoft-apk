import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  GraduationCap, Search, ShieldCheck, Clock, Bell, CalendarClock, Briefcase,
  Users, Store, Calendar, Newspaper, Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { campusApi } from '../lib/campusApi';
import UserAvatar from '../components/UserAvatar';
import { AITextTools } from '../components/ai/AITextTools';
import { formatDistanceToNow } from 'date-fns';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

type Tab = 'overview' | 'feed' | 'notices' | 'routine' | 'events' | 'jobs' | 'groups' | 'market' | 'people';

export default function CampusPage() {
  const { isSpaceMode } = useSpaceIdentities();
  if (isSpaceMode) {
    return <Navigate to="/home" replace />;
  }
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [hubData, setHubData] = useState<any>(null);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [join, setJoin] = useState({
    institutionId: '',
    department: '',
    batchYear: '',
    academicEmail: '',
    role: 'student',
  });
  const [code, setCode] = useState('');
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '' });
  const [routineForm, setRoutineForm] = useState({
    subject: '', dayOfWeek: 'sunday', startTime: '09:00', endTime: '10:00', room: '',
  });
  const [posts, setPosts] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);

  const membership = hubData?.membership;
  const hub = hubData?.hub;
  const inst = membership?.institution;
  const verified = membership?.status === 'verified';

  const loadHub = async () => {
    try {
      const data = await campusApi.hub();
      setHubData(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load campus');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    loadHub();
  }, []);

  useEffect(() => {
    if (membership) return;
    const t = setTimeout(() => {
      campusApi.institutions(query).then(setInstitutions).catch(() => setInstitutions([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query, membership]);

  useEffect(() => {
    if (!verified) return;
    if (tab === 'feed') {
      campusApi.feed('campus').then((d) => setPosts(d.posts || [])).catch(() => setPosts([]));
    }
    if (tab === 'people') {
      campusApi.people('', true).then(setPeople).catch(() => setPeople([]));
    }
  }, [tab, verified]);

  const filteredInstitutions = useMemo(() => institutions, [institutions]);

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const result = await campusApi.join(join);
      toast.success('Campus joined. Verify your email or wait for admin approval.');
      await loadHub();
      if (result.needsEmailVerify && result.membership?.id) {
        const sent = await campusApi.sendVerifyEmail(result.membership.id, join.academicEmail);
        if (sent.devCode) toast.success(`Dev code: ${sent.devCode}`);
        else if (sent.sent) toast.success('Verification code sent to your academic email');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleConfirm = async () => {
    try {
      await campusApi.confirmEmail(membership.id, code);
      toast.success('Campus verified');
      setCode('');
      await loadHub();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSendCode = async () => {
    try {
      const sent = await campusApi.sendVerifyEmail(membership.id, membership.academicEmail);
      if (sent.devCode) toast.success(`Dev code: ${sent.devCode}`);
      else if (sent.sent) toast.success('Code sent');
      else toast.error(sent.reason || 'Could not send email');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleNotice = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await campusApi.createNotice(noticeForm);
      toast.success('Notice posted');
      setNoticeForm({ title: '', content: '' });
      await loadHub();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRoutine = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await campusApi.createRoutine(routineForm);
      toast.success('Class added');
      setRoutineForm({ ...routineForm, subject: '', room: '' });
      await loadHub();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-primary mx-auto" />
        <p className="text-xs text-muted-foreground mt-3 font-semibold">Loading campus…</p>
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        <header className="rounded-[2rem] border border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 to-cyan-500/10 p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">My Campus</p>
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="text-indigo-400" size={28} />
            <h1 className="text-2xl font-black">Join your campus</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Pick your university or college, verify with academic email (or admin), then see batch feed, notices, routine, events, jobs and campus shops.
          </p>
        </header>

        <form onSubmit={handleJoin} className="bg-card/50 border border-border rounded-[2rem] p-5 space-y-4">
          <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">Search institution</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="DU, BUET, BRACU, your college…"
              className="w-full pl-9 pr-3 py-3 rounded-2xl bg-background border border-border outline-none focus:border-indigo-500"
            />
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1">
            {filteredInstitutions.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  setJoin((p) => ({ ...p, institutionId: item.id }));
                  setQuery(item.name);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl border ${
                  join.institutionId === item.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <p className="font-bold text-sm">{item.shortName ? `${item.shortName} · ${item.name}` : item.name}</p>
                <p className="text-[11px] text-muted-foreground">{[item.city, item.type, `${item.memberCount || 0} members`].filter(Boolean).join(' · ')}</p>
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              value={join.department}
              onChange={(e) => setJoin((p) => ({ ...p, department: e.target.value }))}
              placeholder="Department / group"
              className="px-3 py-3 rounded-2xl bg-background border border-border outline-none"
            />
            <input
              value={join.batchYear}
              onChange={(e) => setJoin((p) => ({ ...p, batchYear: e.target.value }))}
              placeholder="Batch / year (e.g. 2024)"
              className="px-3 py-3 rounded-2xl bg-background border border-border outline-none"
            />
            <input
              value={join.academicEmail}
              onChange={(e) => setJoin((p) => ({ ...p, academicEmail: e.target.value }))}
              placeholder="Academic email (optional)"
              type="email"
              className="px-3 py-3 rounded-2xl bg-background border border-border outline-none"
            />
            <select
              aria-label="Campus role"
              value={join.role}
              onChange={(e) => setJoin((p) => ({ ...p, role: e.target.value }))}
              className="px-3 py-3 rounded-2xl bg-background border border-border outline-none"
            >
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="alumni">Alumni</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={!join.institutionId}
            className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-extrabold disabled:opacity-50"
          >
            Join campus
          </button>
        </form>
      </div>
    );
  }

  const tabs: Array<{ id: Tab; label: string; icon: any }> = [
    { id: 'overview', label: 'Overview', icon: GraduationCap },
    { id: 'feed', label: 'Feed', icon: Newspaper },
    { id: 'notices', label: 'Notices', icon: Bell },
    { id: 'routine', label: 'Routine', icon: CalendarClock },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'groups', label: 'Groups', icon: Users },
    { id: 'market', label: 'Market', icon: Store },
    { id: 'people', label: 'People', icon: Users },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <header className="rounded-[2rem] border border-border bg-card/40 backdrop-blur-xl p-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">My Campus</p>
          <h1 className="text-2xl font-black">{inst?.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[membership.department, membership.batchYear, membership.role].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {verified ? (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-extrabold border border-emerald-500/30">
              <ShieldCheck size={14} /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-extrabold border border-amber-500/30">
              <Clock size={14} /> {membership.status}
            </span>
          )}
        </div>
      </header>

      {!verified && (
        <section className="rounded-[1.75rem] border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
          <p className="text-sm font-bold">Verify to unlock campus feed, jobs, groups and market.</p>
          {membership.academicEmail && (
            <div className="flex flex-wrap gap-2">
              <button onClick={handleSendCode} className="px-3 py-2 rounded-xl bg-background border border-border text-xs font-bold">
                Send email code
              </button>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                className="px-3 py-2 rounded-xl bg-background border border-border w-32 text-sm"
              />
              <button onClick={handleConfirm} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">
                Confirm
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            No matching academic domain? An admin can approve you from Campus Approvals.
          </p>
        </section>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap flex items-center gap-1.5 ${
                tab === item.id ? 'bg-indigo-600 text-white' : 'bg-card border border-border text-muted-foreground'
              }`}
            >
              <Icon size={14} /> {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && hub && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Today's classes" empty="No classes listed for today.">
            {(hub.todayRoutine || []).map((slot: any) => (
              <div key={slot.id} className="flex justify-between text-sm py-2 border-b border-border/50 last:border-0">
                <span className="font-bold">{slot.subject}</span>
                <span className="text-muted-foreground">{slot.startTime}–{slot.endTime} {slot.room || ''}</span>
              </div>
            ))}
          </Card>
          <Card title="Notices" empty="No notices yet.">
            {(hub.notices || []).slice(0, 5).map((n: any) => (
              <div key={n.id} className="py-2 border-b border-border/50 last:border-0">
                <p className="font-bold text-sm">{n.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{n.content}</p>
              </div>
            ))}
          </Card>
          <HubList title="Campus events" items={hub.events} to="/events" label={(e: any) => e.title} />
          <HubList title="Jobs from campus" items={hub.jobs} to="/jobs" label={(e: any) => e.title} />
          <HubList title="Groups" items={hub.groups} to="/groups" label={(e: any) => e.name} />
          <HubList title="Campus market" items={hub.products} to="/wevmall" label={(e: any) => e.title} />
          <div className="md:col-span-2 bg-card/40 border border-border rounded-[1.75rem] p-4">
            <h3 className="font-extrabold mb-3">Batchmates</h3>
            <div className="flex flex-wrap gap-3">
              {(hub.classmates || []).map((p: any) => (
                <Link key={p.id} to={p.username ? `/u/${p.username}` : '/friends'} className="flex items-center gap-2 pr-3 rounded-2xl bg-background border border-border">
                  <UserAvatar user={p} className="w-9 h-9 rounded-2xl overflow-hidden" />
                  <span className="text-xs font-bold">{p.name}</span>
                </Link>
              ))}
              {(!hub.classmates || hub.classmates.length === 0) && (
                <p className="text-xs text-muted-foreground">No verified classmates yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'feed' && (
        <div className="space-y-3">
          {!verified && <p className="text-sm text-muted-foreground">Verify to see the campus feed.</p>}
          {verified && posts.length === 0 && <p className="text-sm text-muted-foreground">No campus posts yet. Share something on Home.</p>}
          {posts.map((post) => (
            <article key={post.id} className="bg-card/50 border border-border rounded-[1.75rem] p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserAvatar user={post.user} className="w-9 h-9 rounded-full overflow-hidden" />
                <div>
                  <p className="text-sm font-bold">{post.user?.name}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
              {post.content && (
                <AITextTools
                  sourceId={post.id}
                  sourceType="POST"
                  originalText={post.content}
                  enableSummary
                  collapsible
                  textClassName="text-sm whitespace-pre-wrap"
                />
              )}
            </article>
          ))}
        </div>
      )}

      {tab === 'notices' && (
        <div className="space-y-4">
          {verified && (
            <form onSubmit={handleNotice} className="bg-card/50 border border-border rounded-[1.75rem] p-4 space-y-2">
              <input
                value={noticeForm.title}
                onChange={(e) => setNoticeForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Notice title"
                className="w-full px-3 py-2 rounded-xl bg-background border border-border"
              />
              <textarea
                value={noticeForm.content}
                onChange={(e) => setNoticeForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="Details for your campus"
                className="w-full px-3 py-2 rounded-xl bg-background border border-border min-h-24"
              />
              <button onClick={() => {}} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-extrabold">
                <Plus size={14} /> Post notice
              </button>
            </form>
          )}
          {(hub?.notices || []).map((n: any) => (
            <article key={n.id} className="bg-card/40 border border-border rounded-2xl p-4">
              <p className="font-extrabold">{n.title}</p>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.content}</p>
              <p className="text-[11px] mt-2 text-muted-foreground">{n.author?.name} · {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
            </article>
          ))}
        </div>
      )}

      {tab === 'routine' && (
        <div className="space-y-4">
          {verified && (membership.role === 'faculty') && (
            <form onSubmit={handleRoutine} className="bg-card/50 border border-border rounded-[1.75rem] p-4 grid sm:grid-cols-2 gap-2">
              <input value={routineForm.subject} onChange={(e) => setRoutineForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Subject" className="px-3 py-2 rounded-xl bg-background border border-border sm:col-span-2" />
              <select value={routineForm.dayOfWeek} onChange={(e) => setRoutineForm((p) => ({ ...p, dayOfWeek: e.target.value }))} className="px-3 py-2 rounded-xl bg-background border border-border">
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <input value={routineForm.room} onChange={(e) => setRoutineForm((p) => ({ ...p, room: e.target.value }))} placeholder="Room" className="px-3 py-2 rounded-xl bg-background border border-border" />
              <input type="time" value={routineForm.startTime} onChange={(e) => setRoutineForm((p) => ({ ...p, startTime: e.target.value }))} className="px-3 py-2 rounded-xl bg-background border border-border" />
              <input type="time" value={routineForm.endTime} onChange={(e) => setRoutineForm((p) => ({ ...p, endTime: e.target.value }))} className="px-3 py-2 rounded-xl bg-background border border-border" />
              <button onClick={() => {}} className="sm:col-span-2 py-2 rounded-xl bg-indigo-600 text-white text-xs font-extrabold">Add class</button>
            </form>
          )}
          {(hub?.routine || []).map((slot: any) => (
            <div key={slot.id} className="flex justify-between bg-card/40 border border-border rounded-2xl px-4 py-3 text-sm">
              <div>
                <p className="font-bold capitalize">{slot.dayOfWeek} · {slot.subject}</p>
                <p className="text-xs text-muted-foreground">{slot.teacherName || ''} {slot.room || ''}</p>
              </div>
              <p className="text-muted-foreground">{slot.startTime}–{slot.endTime}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'events' && <LinkGrid items={hub?.events} to="/events" titleKey="title" />}
      {tab === 'jobs' && <LinkGrid items={hub?.jobs} to="/jobs" titleKey="title" extra={(j: any) => j.companyName} />}
      {tab === 'groups' && <LinkGrid items={hub?.groups} to="/groups" titleKey="name" />}
      {tab === 'market' && <LinkGrid items={hub?.products} to="/wevmall" titleKey="title" extra={(p: any) => p.price != null ? `৳${p.price}` : ''} />}

      {tab === 'people' && (
        <div className="grid sm:grid-cols-2 gap-3">
          {people.map((p) => (
            <Link key={p.id} to={p.username ? `/u/${p.username}` : '/friends'} className="flex items-center gap-3 bg-card/40 border border-border rounded-2xl p-3">
              <UserAvatar user={p} className="w-10 h-10 rounded-2xl overflow-hidden" />
              <div>
                <p className="font-bold text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground">{[p.department, p.batchYear, p.role].filter(Boolean).join(' · ')}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ title, empty, children }: { title: string; empty: string; children: any }) {
  const items = Array.isArray(children) ? children : [children];
  const has = items.filter(Boolean).length > 0 && items.some((c: any) => c);
  return (
    <section className="bg-card/40 border border-border rounded-[1.75rem] p-4">
      <h3 className="font-extrabold mb-2">{title}</h3>
      {has ? children : <p className="text-xs text-muted-foreground">{empty}</p>}
    </section>
  );
}

function HubList({ title, items, to, label }: { title: string; items: any[]; to: string; label: (item: any) => string }) {
  return (
    <section className="bg-card/40 border border-border rounded-[1.75rem] p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-extrabold">{title}</h3>
        <Link to={to} className="text-[11px] font-bold text-indigo-400">See all</Link>
      </div>
      {(items || []).slice(0, 4).map((item: any) => (
        <p key={item.id} className="text-sm py-1.5 border-b border-border/40 last:border-0">{label(item)}</p>
      ))}
      {(!items || items.length === 0) && <p className="text-xs text-muted-foreground">Nothing here yet.</p>}
    </section>
  );
}

function LinkGrid({ items, to, titleKey, extra }: { items?: any[]; to: string; titleKey: string; extra?: (item: any) => string }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {(items || []).map((item) => (
        <Link key={item.id} to={to} className="bg-card/40 border border-border rounded-2xl p-4">
          <p className="font-bold text-sm">{item[titleKey]}</p>
          {extra && <p className="text-xs text-muted-foreground mt-1">{extra(item)}</p>}
        </Link>
      ))}
      {(!items || items.length === 0) && <p className="text-sm text-muted-foreground">Nothing from your campus yet.</p>}
    </div>
  );
}
