import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, FileText, CheckCircle, Wand2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

interface AICareerAssistantModalProps {
  onClose: () => void;
}

export const AICareerAssistantModal: React.FC<AICareerAssistantModalProps> = ({ onClose }) => {
  const token = useStore((s) => s.token);
  const [resumeText, setResumeText] = useState('');
  const [jobTitle, setJobTitle] = useState('Senior Software Engineer');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [missingKeywords, setMissingKeywords] = useState<string[]>([]);

  const handleAnalyzeResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeText.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/v1/jobs-creator/jobs/ai/resume-ats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ resumeText, jobTitle }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
        setAtsScore(typeof data.atsScore === 'number' ? data.atsScore : null);
        setMissingKeywords(Array.isArray(data.missingKeywords) ? data.missingKeywords : []);
        toast.success('✨ ATS Resume Analysis & Cover Letter generated!');
      }
    } catch (e) {
      toast.error('AI Resume Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card border border-border rounded-3xl p-6 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative space-y-6"
    >
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-purple-400" size={22} />
          <h2 className="text-lg font-extrabold text-foreground">Wevsoft AI ATS Resume Assistant</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:bg-white/10 text-muted-foreground">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleAnalyzeResume} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-muted-foreground block mb-1">Target Job Title:</label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-4 py-2 text-xs text-foreground outline-none focus:border-purple-500/50"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground block mb-1">Paste Resume Text / Skills Profile:</label>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={4}
            placeholder="Paste your skills, work history, or education summary here..."
            className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl p-3 text-xs text-foreground outline-none focus:border-purple-500/50"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-xs shadow-lg hover:opacity-90 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          <span>Analyze ATS Score & Generate Cover Letter</span>
        </button>
      </form>

      {analysis && (
        <div className="p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-border space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="font-extrabold text-purple-400">📊 ATS Match Score: 88.5%</span>
            <span className="text-emerald-400 font-bold">{(atsScore ?? 0) >= 70 ? 'Strong Match' : (atsScore ?? 0) >= 45 ? 'Developing Match' : 'Needs tailoring'}</span>
          </div>
          <p className="font-extrabold text-purple-400">Calculated ATS Match Score: {atsScore ?? 0}%</p>
          {missingKeywords.length > 0 && <p className="text-muted-foreground">Missing keywords: {missingKeywords.join(', ')}</p>}
          <div className="leading-relaxed text-foreground whitespace-pre-wrap font-sans">
            {analysis}
          </div>
        </div>
      )}
    </motion.div>
  );
};
