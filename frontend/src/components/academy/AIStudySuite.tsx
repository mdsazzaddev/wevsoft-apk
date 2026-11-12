import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BrainCircuit, Camera, FileText, CheckSquare, Calendar, Wand2, Send, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

export const AIStudySuite: React.FC = () => {
  const token = useStore((s) => s.token);
  const [activeTab, setActiveTab] = useState<'tutor' | 'solver' | 'notes' | 'quiz' | 'planner'>('tutor');

  // Input states
  const [tutorQuery, setTutorQuery] = useState('');
  const [tutorMessages, setTutorMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: 'Hello! I am your Wevsoft AI Tutor. Ask me any math, physics, chemistry, or programming question!' }
  ]);
  const [gradeLevel, setGradeLevel] = useState('HSC / College');

  // Solver states
  const [solverText, setSolverText] = useState('');
  const [solverResult, setSolverResult] = useState<string | null>(null);

  // Notes states
  const [notesTopic, setNotesTopic] = useState('');
  const [notesResult, setNotesResult] = useState<string | null>(null);

  // Quiz states
  const [quizTopic, setQuizTopic] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);

  // Planner states
  const [targetExam, setTargetExam] = useState('HSC 2026');
  const [dailyHours, setDailyHours] = useState(4);
  const [plannerResult, setPlannerResult] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  // 1. AI Tutor Chat Submit
  const handleTutorSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorQuery.trim()) return;

    const userText = tutorQuery;
    setTutorQuery('');
    setTutorMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/academy/ai/tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userText, gradeLevel }),
      });

      if (res.ok) {
        const data = await res.json();
        setTutorMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
      }
    } catch (e) {
      toast.error('AI Tutor failed');
    } finally {
      setLoading(false);
    }
  };

  // 2. AI Homework Solver Submit
  const handleSolverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solverText.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/v1/academy/ai/solver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ problemText: solverText }),
      });

      if (res.ok) {
        const data = await res.json();
        setSolverResult(data.solution);
        toast.success('✨ Homework solution generated!');
      }
    } catch (e) {
      toast.error('Solver error');
    } finally {
      setLoading(false);
    }
  };

  // 3. AI Notes Submit
  const handleNotesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesTopic.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/v1/academy/ai/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ topic: notesTopic }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotesResult(typeof data.notes === 'string' ? data.notes : JSON.stringify(data.notes));
        toast.success('✨ AI Study Notes created!');
      }
    } catch (e) {
      toast.error('Notes error');
    } finally {
      setLoading(false);
    }
  };

  // 4. AI Quiz Submit
  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTopic.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/v1/academy/ai/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ topic: quizTopic }),
      });

      if (res.ok) {
        const data = await res.json();
        setQuizQuestions(data.questions || []);
        toast.success(`🧠 AI Generated ${data.questions?.length || 0} Quiz questions!`);
      }
    } catch (e) {
      toast.error('Quiz error');
    } finally {
      setLoading(false);
    }
  };

  // 5. AI Study Planner Submit
  const handlePlannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/v1/academy/ai/planner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ targetExam, dailyHours }),
      });

      if (res.ok) {
        const data = await res.json();
        setPlannerResult(data.plan);
        toast.success('📅 Personal Study Plan generated!');
      }
    } catch (e) {
      toast.error('Planner error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Suite Selector Bar */}
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BrainCircuit className="text-purple-400" size={26} />
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Wevsoft AI Study Engine</h2>
            <p className="text-[11px] text-muted-foreground">Powered by Gemini 2.5 & OpenAI GPT-4o Multi-Model Factory</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('tutor')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'tutor' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25' : 'bg-black/5 dark:bg-white/5 border border-border text-muted-foreground'
            }`}
          >
            <Sparkles size={15} /> AI Tutor
          </button>

          <button
            onClick={() => setActiveTab('solver')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'solver' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/25' : 'bg-black/5 dark:bg-white/5 border border-border text-muted-foreground'
            }`}
          >
            <Camera size={15} /> Homework Solver
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'notes' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25' : 'bg-black/5 dark:bg-white/5 border border-border text-muted-foreground'
            }`}
          >
            <FileText size={15} /> AI Notes
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'quiz' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/25' : 'bg-black/5 dark:bg-white/5 border border-border text-muted-foreground'
            }`}
          >
            <CheckSquare size={15} /> AI Quiz
          </button>

          <button
            onClick={() => setActiveTab('planner')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'planner' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'bg-black/5 dark:bg-white/5 border border-border text-muted-foreground'
            }`}
          >
            <Calendar size={15} /> Study Planner
          </button>
        </div>
      </div>

      {/* 1. AI TUTOR CHAT */}
      {activeTab === 'tutor' && (
        <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4 h-[520px] flex flex-col justify-between">
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {tutorMessages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                  m.role === 'user' ? 'bg-purple-600 text-white font-medium' : 'bg-black/5 dark:bg-white/5 border border-border text-foreground'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-xs text-purple-400 font-mono animate-pulse">Wevsoft AI Tutor is thinking...</div>}
          </div>

          <form onSubmit={handleTutorSend} className="flex gap-2 pt-2 border-t border-border">
            <input
              type="text"
              value={tutorQuery}
              onChange={(e) => setTutorQuery(e.target.value)}
              placeholder="Ask AI Tutor (e.g., 'Explain Quantum Tunneling with an analogy')..."
              className="flex-1 bg-black/5 dark:bg-white/5 border border-border rounded-2xl px-4 py-3 text-xs text-foreground outline-none focus:border-purple-500/50"
            />
            <button type="submit" disabled={loading} aria-label="Send question to AI Tutor" className="px-5 py-3 rounded-2xl bg-purple-600 text-white font-bold text-xs shadow-lg hover:opacity-90">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* 2. AI HOMEWORK SOLVER */}
      {activeTab === 'solver' && (
        <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4">
          <form onSubmit={handleSolverSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-2">Paste Homework Math or Physics Problem:</label>
              <textarea
                value={solverText}
                onChange={(e) => setSolverText(e.target.value)}
                rows={4}
                placeholder="e.g. A ball is thrown upward with velocity 20m/s. Calculate max height reached (g=9.8m/s²)."
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-2xl p-4 text-xs text-foreground outline-none focus:border-cyan-500/50"
              />
            </div>
            <button type="submit" disabled={loading} className="px-6 py-3 rounded-2xl bg-cyan-600 text-white font-extrabold text-xs shadow-lg hover:opacity-90 flex items-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              <span>Generate Step-by-Step Solution</span>
            </button>
          </form>

          {solverResult && (
            <div className="p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-border text-xs leading-relaxed text-foreground whitespace-pre-wrap font-mono">
              {solverResult}
            </div>
          )}
        </div>
      )}

      {/* 3. AI NOTES GENERATOR */}
      {activeTab === 'notes' && (
        <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4">
          <form onSubmit={handleNotesSubmit} className="flex gap-2">
            <input
              type="text"
              value={notesTopic}
              onChange={(e) => setNotesTopic(e.target.value)}
              placeholder="Enter subject or topic (e.g., 'Organic Chemistry Reactions' or 'React Hooks')"
              className="flex-1 bg-black/5 dark:bg-white/5 border border-border rounded-2xl px-4 py-3 text-xs text-foreground outline-none focus:border-emerald-500/50"
            />
            <button type="submit" disabled={loading} className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-extrabold text-xs shadow-lg hover:opacity-90 flex items-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              <span>Generate Notes</span>
            </button>
          </form>

          {notesResult && (
            <div className="p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-border text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans">
              {notesResult}
            </div>
          )}
        </div>
      )}

      {/* 4. AI QUIZ GENERATOR */}
      {activeTab === 'quiz' && (
        <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4">
          <form onSubmit={handleQuizSubmit} className="flex gap-2">
            <input
              type="text"
              value={quizTopic}
              onChange={(e) => setQuizTopic(e.target.value)}
              placeholder="Enter Quiz topic (e.g., 'Newton Laws' or 'Data Structures')"
              className="flex-1 bg-black/5 dark:bg-white/5 border border-border rounded-2xl px-4 py-3 text-xs text-foreground outline-none focus:border-amber-500/50"
            />
            <button type="submit" disabled={loading} className="px-6 py-3 rounded-2xl bg-amber-600 text-foreground dark:text-white font-extrabold text-xs shadow-lg hover:opacity-90 flex items-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />}
              <span>Generate MCQ Quiz</span>
            </button>
          </form>

          <div className="space-y-4 pt-2">
            {quizQuestions.map((q, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border space-y-2 text-xs">
                <div className="font-bold text-foreground">{idx + 1}. {q.questionText}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {(q.options || []).map((opt: string, optIdx: number) => (
                    <div
                      key={optIdx}
                      className={`p-2.5 rounded-xl border text-xs ${
                        optIdx === q.correctOptionIndex
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                          : 'bg-black/5 dark:bg-white/5 border-border text-muted-foreground'
                      }`}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <div className="text-[11px] text-amber-400 font-mono pt-1">💡 {q.explanation}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. AI EXAM PLANNER */}
      {activeTab === 'planner' && (
        <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4">
          <form onSubmit={handlePlannerSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">Target Exam:</label>
              <input
                type="text"
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value)}
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">Daily Hours:</label>
              <input
                type="number"
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-indigo-600 text-foreground dark:text-white font-extrabold text-xs shadow-lg hover:opacity-90 flex items-center justify-center gap-1.5">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                <span>Generate Plan</span>
              </button>
            </div>
          </form>

          {plannerResult && (
            <div className="p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-border space-y-3 text-xs">
              <h4 className="font-extrabold text-indigo-400">📅 Daily Study Routine</h4>
              <div className="space-y-2">
                {(plannerResult.dailySchedule || []).map((slot: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border flex items-center justify-between">
                    <div>
                      <div className="font-bold text-foreground">{slot.subject} — {slot.activity}</div>
                      <div className="text-[10px] text-muted-foreground">{slot.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
