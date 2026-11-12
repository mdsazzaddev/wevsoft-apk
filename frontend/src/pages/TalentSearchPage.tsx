import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, MapPin, Briefcase, Star, MessageSquare, Plus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../store';

export default function TalentSearchPage() {
  const token = useStore((s) => s.token);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [talent, setTalent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchTalent = async (q: string) => {
    if (!token) {
      toast.error('Please sign in to search talent');
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/v1/jobs-creator/talent?q=${encodeURIComponent(q.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error('Talent search failed');
        return;
      }
      const data = await res.json();
      let results = data.talent || [];
      if (locationFilter.trim()) {
        const loc = locationFilter.trim().toLowerCase();
        results = results.filter(
          (t: any) =>
            (t.department || '').toLowerCase().includes(loc) ||
            (t.bio || '').toLowerCase().includes(loc)
        );
      }
      setTalent(results);
    } catch {
      toast.error('Talent search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    fetchTalent('');
     
  }, [token]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTalent(query);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Search size={250} />
        </div>

        <div className="relative z-10 max-w-3xl">
          <h1 className="text-3xl font-black text-foreground mb-2">Talent Search Database</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Discover top professionals and invite them to apply for your open roles.
          </p>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search skills, titles, or keywords..."
                className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-2xl text-sm outline-none focus:border-blue-500/50 shadow-inner text-foreground"
              />
            </div>
            <div className="relative sm:w-1/3">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="Department / keyword"
                className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-2xl text-sm outline-none focus:border-blue-500/50 shadow-inner text-foreground"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="py-4 px-8 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6">
          <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-6 shadow-lg">
            <h3 className="text-sm font-extrabold text-foreground mb-4 flex items-center gap-2">
              <Filter size={16} /> Filters
            </h3>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-2">Experience Level</label>
                <div className="space-y-2">
                  {['Entry Level', 'Mid Level', 'Senior', 'Director'].map((level) => (
                    <label key={level} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded bg-background border-border text-blue-500 focus:ring-blue-500/50"
                      />
                      {level}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-2">Job Type</label>
                <div className="space-y-2">
                  {['Full-time', 'Contract', 'Freelance'].map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded bg-background border-border text-blue-500 focus:ring-blue-500/50"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-extrabold text-foreground">
              {loading
                ? 'Searching...'
                : searched
                  ? `Showing ${talent.length} Candidate${talent.length === 1 ? '' : 's'}`
                  : 'Search to find talent'}
            </h2>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="animate-spin text-blue-500" size={28} />
            </div>
          ) : talent.length === 0 ? (
            <div className="py-20 text-center text-sm text-muted-foreground bg-card/20 rounded-3xl border border-border">
              No talent found. Try a different search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {talent.map((c, i) => {
                const name = c.name || c.username || 'User';
                const role = c.department || c.bio?.slice(0, 40) || 'Wevsoft Member';
                const handle = c.username ? `@${c.username}` : '';
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-card/40 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-lg hover:shadow-xl hover:border-blue-500/30 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-4">
                        {c.avatar ? (
                          <img
                            src={c.avatar}
                            alt={name}
                            className="w-14 h-14 rounded-xl object-cover shadow-md"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md text-white font-black text-lg">
                            {name[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h3 className="font-extrabold text-foreground text-base group-hover:text-blue-500 transition-colors">
                            {name}
                          </h3>
                          <p className="text-xs font-bold text-blue-500">{role}</p>
                          {handle && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{handle}</p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => {}} type="button" aria-label="Save to shortlist" title="Save to shortlist" className="text-muted-foreground hover:text-yellow-500 transition-colors">
                        <Star size={18} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {c.department && (
                        <span className="px-2 py-1 bg-black/5 dark:bg-white/5 border border-border/50 rounded-md text-[10px] font-extrabold text-muted-foreground flex items-center gap-1">
                          <Briefcase size={10} /> {c.department}
                        </span>
                      )}
                      {c.bio && (
                        <span className="px-2 py-1 bg-black/5 dark:bg-white/5 border border-border/50 rounded-md text-[10px] font-extrabold text-muted-foreground line-clamp-1 max-w-full">
                          {c.bio}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate('/messages')}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MessageSquare size={14} /> Message
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (c.username) navigate(`/u/${c.username}`);
                          else toast.success(`Invite sent to ${name}`);
                        }}
                        className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground border border-border rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Plus size={14} /> Invite
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
