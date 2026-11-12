import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Flame, Award, Trophy, Play, Star, ChevronRight, Sparkles, AlertCircle } from 'lucide-react';
import { useStore } from '../../store';

interface AcademyDashboardProps {
  onSelectCourse: (courseId: string) => void;
  onExploreCourses: () => void;
  onOpenAISuite: () => void;
}

export const AcademyDashboard: React.FC<AcademyDashboardProps> = ({
  onSelectCourse,
  onExploreCourses,
  onOpenAISuite,
}) => {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const [gamification, setGamification] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/academy/user/gamification', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGamification(data.gamification);
        setLeaderboard(data.leaderboard || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Student Welcome Banner & Gamification Metrics */}
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
                STUDENT LMS DASHBOARD
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mt-2">
              Welcome back, {user?.name || 'Student'}! 👋
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Track your course progress, XP points, learning streaks, and AI study recommendations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Streak Counter */}
            <div className="px-4 py-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center gap-2 shadow-lg">
              <Flame size={22} className="animate-bounce" />
              <div>
                <div className="text-xs font-black uppercase tracking-wider">Streak</div>
                <div className="text-base font-extrabold">{gamification?.streakCount ?? 0} Days</div>
              </div>
            </div>

            {/* XP Points */}
            <div className="px-4 py-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center gap-2 shadow-lg">
              <Trophy size={22} />
              <div>
                <div className="text-xs font-black uppercase tracking-wider">XP Points</div>
                <div className="text-base font-extrabold">{gamification?.xpPoints ?? 0} XP</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Quick Launch Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            onClick={onExploreCourses}
            className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border hover:bg-black/10 dark:bg-white/10 transition-all text-left flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <BookOpen size={16} className="text-blue-400" /> Explore Courses
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Browse HSC, SSC, Programming & AI</div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onOpenAISuite}
            className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all text-left flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-extrabold text-purple-300 flex items-center gap-1.5">
                <Sparkles size={16} /> AI Study Engine
              </div>
              <div className="text-[10px] text-purple-300/70 mt-0.5">Homework solver, AI Tutor & Quiz</div>
            </div>
            <ChevronRight size={16} className="text-purple-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left flex items-center justify-between">
            <div>
              <div className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                <Award size={16} /> Badges Earned
              </div>
              <div className="text-[10px] text-amber-300/70 mt-0.5">Quiz Master • 7-Day Streak</div>
            </div>
          </div>
        </div>
      </div>

      {/* Weak Topic AI Analytics & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Enrolled Courses & Weak Topics */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Weak Topic Diagnostic */}
          <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-extrabold uppercase tracking-widest">
              <AlertCircle size={16} /> AI Weak Topic Diagnostic
            </div>
            <h3 className="text-sm font-extrabold text-foreground">Calculus & Organic Chemistry Reactions</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Based on your recent quiz attempts, your accuracy in **Integration by Parts** is 65%. Try taking a quick 5-question AI Quiz or ask the AI Tutor for a simplified analogy.
            </p>
            <button
              onClick={onOpenAISuite}
              className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30 transition-all flex items-center gap-1.5"
            >
              <Sparkles size={14} /> Practice Weak Topics with AI
            </button>
          </div>

          {/* Enrolled Courses */}
          <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <BookOpen size={18} className="text-blue-400" /> Active Enrolled Courses
              </h3>
              <button onClick={onExploreCourses} className="text-xs text-blue-400 font-bold hover:underline">
                View All Catalog
              </button>
            </div>

            <div className="space-y-3">
              <div
                onClick={() => onSelectCourse('crs-1')}
                className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border hover:bg-black/10 dark:bg-white/10 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    <Play size={20} className="group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-foreground">HSC Physics 2026: Master Vector & Mechanics</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Lesson 1.2 • 45% Progress Completed</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Rank Leaderboard */}
        <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-extrabold text-amber-400 uppercase tracking-widest">
            <Trophy size={16} /> Wevsoft XP Leaderboard
          </div>

          <div className="space-y-3 pt-1">
            {leaderboard.map((item) => (
              <div
                key={item.rank}
                className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                  item.rank === 1
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 font-bold'
                    : 'bg-black/5 dark:bg-white/5 border-border text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center font-extrabold text-[10px]">
                    #{item.rank}
                  </span>
                  <span>{item.name}</span>
                </div>
                <span className="font-extrabold font-mono text-purple-400">{item.xpPoints} XP</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
