import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Star, Users, CheckCircle, Play, FileText, ArrowLeft, Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

interface CourseDetailsViewProps {
  courseId: string;
  onBack: () => void;
  onStartLesson: (lessonId: string) => void;
}

export const CourseDetailsView: React.FC<CourseDetailsViewProps> = ({ courseId, onBack, onStartLesson }) => {
  const token = useStore((s) => s.token);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/academy/courses/${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
        if (data.course?.chapters?.length > 0) {
          setExpandedChapter(data.course.chapters[0].id);
        }
      }
    } catch (e) {
      console.error('[Course Details Fetch Error]', e);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const res = await fetch(`/api/v1/academy/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setEnrolled(true);
        toast.success('🎉 Enrolled successfully! Start learning now.');
      }
    } catch (e) {
      toast.error('Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-muted-foreground font-mono">Loading Course Details...</div>;
  }

  if (!course) {
    return <div className="py-20 text-center text-xs text-muted-foreground">Course not found.</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border hover:bg-black/10 dark:bg-white/10 text-xs font-bold transition-all text-muted-foreground hover:text-foreground flex items-center gap-1.5"
      >
        <ArrowLeft size={16} />
        <span>Back to Course Explorer</span>
      </button>

      {/* Course Hero Banner */}
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-600/90 text-white">
                {course.category}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-black/10 dark:bg-white/10 text-foreground border border-border">
                {course.level}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
              {course.title}
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {course.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs pt-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <Users size={15} className="text-blue-400" /> {course._count?.enrollments || 342} Students
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Star size={15} fill="currentColor" /> 4.9 ({course._count?.reviews || 48} Ratings)
              </span>
              <span className="text-muted-foreground">
                Instructor: <strong className="text-foreground">{course.instructor?.name}</strong>
              </span>
            </div>
          </div>

          {/* Action Card */}
          <div className="bg-card/80 border border-border rounded-2xl p-5 space-y-4 shadow-xl text-center">
            <div className="text-2xl font-extrabold text-emerald-400">
              {course.price === 0 ? 'FREE' : `৳${course.price}`}
            </div>

            <button
              onClick={handleEnroll}
              disabled={enrolling || enrolled}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-extrabold text-xs shadow-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {enrolling ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              <span>{enrolled ? 'Enrolled & Unlocked' : 'Enroll Now & Unlock All Lessons'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Syllabus / Chapters Accordion */}
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4">
        <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
          <BookOpen size={20} className="text-blue-400" /> Course Syllabus & Lessons
        </h3>

        <div className="space-y-3">
          {(course.chapters || []).map((ch: any, idx: number) => {
            const isExpanded = expandedChapter === ch.id;
            return (
              <div key={ch.id} className="border border-border rounded-2xl bg-card/60 overflow-hidden">
                <button
                  onClick={() => setExpandedChapter(isExpanded ? null : ch.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-black/5 dark:bg-white/5 transition-colors text-left"
                >
                  <div className="font-extrabold text-sm text-foreground flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    <span>{ch.title}</span>
                  </div>
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {isExpanded && (
                  <div className="p-4 pt-0 space-y-2 border-t border-border">
                    {(ch.lessons || []).map((les: any) => (
                      <div
                        key={les.id}
                        onClick={() => onStartLesson(les.id)}
                        className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border hover:bg-blue-500/10 hover:border-blue-500/30 transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Play size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-foreground">{les.title}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {Math.floor(les.durationSec / 60)} mins
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
