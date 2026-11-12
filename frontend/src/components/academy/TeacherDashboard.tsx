import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, BookOpen, Layers, Video, FileText, CheckCircle, ShieldCheck, BarChart3, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

interface TeacherDashboardProps {
  onBackToExplorer: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onBackToExplorer }) => {
  const token = useStore((s) => s.token);
  const [activeTab, setActiveTab] = useState<'create' | 'apply'>('create');

  // Application state
  const [bio, setBio] = useState('');
  const [expertise, setExpertise] = useState('');
  const [applying, setApplying] = useState(false);

  // Course Builder state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('HSC');
  const [level, setLevel] = useState('Beginner');
  const [creating, setCreating] = useState(false);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplying(true);
    try {
      const res = await fetch('/api/v1/academy/instructor/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ bio, expertise }),
      });

      if (res.ok) {
        toast.success('🎉 Instructor Application submitted for Admin Approval!');
      }
    } catch (e) {
      toast.error('Application failed');
    } finally {
      setApplying(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setCreating(true);

    try {
      const res = await fetch('/api/v1/academy/instructor/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, category, level }),
      });

      if (res.ok) {
        toast.success('✨ Course published live on Wevsoft Academy!');
        setTitle('');
        setDescription('');
      }
    } catch (e) {
      toast.error('Failed to create course');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <ShieldCheck className="text-emerald-400" size={24} /> Instructor & Course Builder Studio
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Publish courses, manage chapters & video lessons, and track student enrollment analytics.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'create' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 text-muted-foreground'
            }`}
          >
            Course Builder
          </button>
          <button
            onClick={() => setActiveTab('apply')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'apply' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 text-muted-foreground'
            }`}
          >
            Apply for Instructor
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4">
          <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <Plus size={18} className="text-emerald-400" /> Create & Publish New Course
          </h3>

          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Course Title:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Higher Math 2nd Paper: Integration & Calculus"
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-2xl px-4 py-2.5 text-xs text-foreground outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Course Description:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Write a clear summary of what students will learn in this course..."
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-2xl p-4 text-xs text-foreground outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Category:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black/40 border border-border rounded-xl p-2.5 text-xs text-foreground outline-none"
                >
                  <option value="HSC">HSC</option>
                  <option value="SSC">SSC</option>
                  <option value="Admission">Admission</option>
                  <option value="University">University</option>
                  <option value="Programming">Programming</option>
                  <option value="AI">AI</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Target Level:</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full bg-black/40 border border-border rounded-xl p-2.5 text-xs text-foreground outline-none"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs shadow-lg hover:opacity-90 transition-all flex items-center gap-2"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              <span>Publish Course to Academy</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4 max-w-xl mx-auto">
          <h3 className="text-base font-extrabold text-foreground">Apply for Verified Instructor Status</h3>
          <form onSubmit={handleApply} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Teaching Bio & Qualifications:</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Mention your university, degrees, or teaching background..."
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-2xl p-4 text-xs text-foreground outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Area of Expertise:</label>
              <input
                type="text"
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
                placeholder="e.g. Physics, Higher Math, React/TypeScript"
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-2xl px-4 py-2.5 text-xs text-foreground outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={applying}
              className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-extrabold text-xs shadow-lg hover:opacity-90"
            >
              Submit Application
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
