import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, CheckCircle, FileText, ArrowLeft, Download, MessageSquare, Sparkles, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

interface LessonPlayerViewProps {
  lessonId: string;
  onBack: () => void;
}

export const LessonPlayerView: React.FC<LessonPlayerViewProps> = ({ lessonId, onBack }) => {
  const token = useStore((s) => s.token);
  const [completed, setCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState<'video' | 'materials' | 'discussion'>('video');

  const handleMarkComplete = async () => {
    try {
      const res = await fetch(`/api/v1/academy/lessons/${lessonId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setCompleted(true);
        toast.success('🎉 Lesson completed! Earned +25 XP Points!');
      }
    } catch (e) {
      toast.error('Error saving progress');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border hover:bg-black/10 dark:bg-white/10 text-xs font-bold transition-all text-muted-foreground hover:text-foreground flex items-center gap-1.5"
        >
          <ArrowLeft size={16} />
          <span>Back to Course</span>
        </button>

        <button
          onClick={handleMarkComplete}
          disabled={completed}
          className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 ${
            completed
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:opacity-90'
          }`}
        >
          <CheckCircle size={16} />
          <span>{completed ? 'Completed (+25 XP)' : 'Mark Lesson Complete (+25 XP)'}</span>
        </button>
      </div>

      {/* Video & Learning Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border border-border shadow-2xl flex items-center justify-center group">
            <video
              controls
              className="w-full h-full object-contain"
              poster="https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=1200&auto=format&fit=crop&q=80"
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
            />
          </div>

          <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-foreground">1.1 Vector Addition & Resultant Calculations</h2>
              <span className="text-xs font-extrabold text-blue-400 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                20 mins
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              In this video lesson, we explore the fundamentals of vector addition, analytical resultant equations R = √(P² + Q² + 2PQ cos α), and shortcuts for competitive entrance exams.
            </p>
          </div>
        </div>

        {/* Side Panel Materials & Q&A */}
        <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex border-b border-border pb-2 gap-2">
              <button
                onClick={() => setActiveTab('video')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === 'video' ? 'bg-blue-600 text-white' : 'text-muted-foreground'
                }`}
              >
                Materials
              </button>
              <button
                onClick={() => setActiveTab('discussion')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === 'discussion' ? 'bg-blue-600 text-white' : 'text-muted-foreground'
                }`}
              >
                Q&A Thread
              </button>
            </div>

            {activeTab === 'video' ? (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-blue-400" />
                    <div>
                      <div className="text-xs font-bold text-foreground">Chapter 1 Formula Sheet.pdf</div>
                      <div className="text-[10px] text-muted-foreground">PDF Document • 2.4 MB</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toast.success('Downloaded PDF Study Notes')}
                    className="p-2 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:bg-white/20 text-white transition-all"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-border text-xs space-y-1">
                  <div className="font-bold text-blue-400">@tanvir_hsc</div>
                  <div className="text-muted-foreground">Why does the direction angle formula use tan θ = (Q sin α) / (P + Q cos α)?</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
