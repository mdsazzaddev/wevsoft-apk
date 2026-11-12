import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BookOpen, Search, Sparkles, LayoutDashboard, ShieldCheck, Plus, ArrowLeft } from 'lucide-react';
import { AcademyDashboard } from '../components/academy/AcademyDashboard';
import { CourseExplorer } from '../components/academy/CourseExplorer';
import { CourseDetailsView } from '../components/academy/CourseDetailsView';
import { LessonPlayerView } from '../components/academy/LessonPlayerView';
import { AIStudySuite } from '../components/academy/AIStudySuite';
import { TeacherDashboard } from '../components/academy/TeacherDashboard';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';

export default function AcademicPage() {
  const { isSpaceMode } = useSpaceIdentities();
  if (isSpaceMode) {
    return <Navigate to="/home" replace />;
  }
  // Navigation View Modes: 'dashboard' | 'explorer' | 'details' | 'player' | 'ai' | 'teacher'
  const [viewMode, setViewMode] = useState<'dashboard' | 'explorer' | 'details' | 'player' | 'ai' | 'teacher'>('dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('crs-1');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('les-1');

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setViewMode('details');
  };

  const handleStartLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setViewMode('player');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Platform Navigation Bar */}
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="text-blue-500" size={26} />
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Wevsoft Academy</h1>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            LMS V2
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode('dashboard')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              viewMode === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 border border-border text-muted-foreground'
            }`}
          >
            <LayoutDashboard size={15} /> Dashboard
          </button>

          <button
            onClick={() => setViewMode('explorer')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              viewMode === 'explorer' ? 'bg-blue-600 text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 border border-border text-muted-foreground'
            }`}
          >
            <Search size={15} /> Catalog
          </button>

          <button
            onClick={() => setViewMode('ai')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              viewMode === 'ai' ? 'bg-purple-600 text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 border border-border text-muted-foreground'
            }`}
          >
            <Sparkles size={15} /> AI Engine
          </button>

          <button
            onClick={() => setViewMode('teacher')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              viewMode === 'teacher' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 border border-border text-muted-foreground'
            }`}
          >
            <ShieldCheck size={15} /> Teacher Studio
          </button>
        </div>
      </div>

      {/* Dynamic Sub-View Render */}
      {viewMode === 'dashboard' && (
        <AcademyDashboard
          onSelectCourse={handleSelectCourse}
          onExploreCourses={() => setViewMode('explorer')}
          onOpenAISuite={() => setViewMode('ai')}
        />
      )}

      {viewMode === 'explorer' && (
        <CourseExplorer onSelectCourse={handleSelectCourse} />
      )}

      {viewMode === 'details' && (
        <CourseDetailsView
          courseId={selectedCourseId}
          onBack={() => setViewMode('explorer')}
          onStartLesson={handleStartLesson}
        />
      )}

      {viewMode === 'player' && (
        <LessonPlayerView
          lessonId={selectedLessonId}
          onBack={() => setViewMode('details')}
        />
      )}

      {viewMode === 'ai' && (
        <AIStudySuite />
      )}

      {viewMode === 'teacher' && (
        <TeacherDashboard onBackToExplorer={() => setViewMode('explorer')} />
      )}
    </div>
  );
}
