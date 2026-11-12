import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Bell, CalendarClock, Users, ChevronRight, ShieldCheck } from 'lucide-react';
import { campusApi } from '../../lib/campusApi';

export default function CampusHomeStrip() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    campusApi
      .hub()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  const membership = data?.membership;
  const hub = data?.hub;
  const inst = membership?.institution;

  if (!membership) {
    return (
      <Link
        to="/campus"
        className="block rounded-[1.75rem] border border-indigo-500/30 bg-gradient-to-r from-indigo-500/15 via-sky-500/10 to-cyan-500/15 p-4 hover:border-indigo-400/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <GraduationCap size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-sm text-foreground">Join your campus</p>
            <p className="text-xs text-muted-foreground">Verify batch, see notices, events, jobs and classmates in one place.</p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </div>
      </Link>
    );
  }

  const nextClass = hub?.todayRoutine?.[0];
  const notice = hub?.notices?.[0];

  return (
    <Link
      to="/campus"
      className="block rounded-[1.75rem] border border-border/70 bg-card/50 backdrop-blur-xl p-4 hover:border-indigo-500/40 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shrink-0">
          <GraduationCap size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-extrabold text-sm truncate">{inst?.shortName || inst?.name || 'My Campus'}</p>
            {membership.status === 'verified' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                <ShieldCheck size={12} /> Verified
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Pending</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {[membership.department, membership.batchYear].filter(Boolean).join(' · ') || inst?.name}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold text-muted-foreground">
            {nextClass && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock size={12} /> {nextClass.subject} {nextClass.startTime}
              </span>
            )}
            {notice && (
              <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                <Bell size={12} /> {notice.title}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users size={12} /> {hub?.stats?.verified || 0} classmates
            </span>
          </div>
        </div>
        <ChevronRight size={18} className="text-muted-foreground mt-1" />
      </div>
    </Link>
  );
}
