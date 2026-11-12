import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, BookOpen, Star, Users, Clock, Filter, Sparkles, Award, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

interface CourseExplorerProps {
  onSelectCourse: (courseId: string) => void;
}

export const CourseExplorer: React.FC<CourseExplorerProps> = ({ onSelectCourse }) => {
  const token = useStore((s) => s.token);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    'All', 'SSC', 'HSC', 'Admission', 'University', 'Programming', 'AI', 'Design', 'Business', 'Language'
  ];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchCourses();
  }, [activeCategory]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const url = activeCategory === 'All'
        ? '/api/v1/academy/courses'
        : `/api/v1/academy/courses?category=${activeCategory}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
      }
    } catch (e) {
      console.error('[Course Search Error]', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(c => 
    !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search & Category Filter Header */}
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
              <BookOpen className="text-blue-400" size={24} /> Wevsoft Academy Explorer
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse top-tier academic, programming & AI courses designed by verified instructors.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subjects, topics, skills..."
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-2xl pl-10 pr-4 py-2 text-xs text-foreground outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pt-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-black/5 dark:bg-white/5 border border-border text-muted-foreground hover:bg-black/10 dark:bg-white/10 hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Masonry Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground font-mono">Loading Wevsoft Academy Catalog...</div>
      ) : filteredCourses.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground text-xs bg-card/20 rounded-3xl border border-border p-8">
          No courses found matching "{searchQuery}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map(course => (
            <motion.div
              whileHover={{ y: -4 }}
              key={course.id}
              onClick={() => onSelectCourse(course.id)}
              className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl overflow-hidden shadow-xl hover:border-blue-500/30 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="relative h-44 w-full bg-black overflow-hidden">
                <img
                  src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80'}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600/90 backdrop-blur-md text-white">
                  {course.category}
                </span>
                <span className="absolute bottom-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-black/60 backdrop-blur-md text-white border border-border">
                  {course.level}
                </span>
              </div>

              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-foreground line-clamp-2 group-hover:text-blue-400 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Users size={14} className="text-blue-400" /> {course._count?.enrollments || 340} Enrolled
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star size={13} fill="currentColor" /> 4.9 ({course._count?.reviews || 42})
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                        {course.instructor?.name?.charAt(0) || 'I'}
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">{course.instructor?.name}</span>
                    </div>

                    <span className="text-xs font-extrabold text-emerald-400">
                      {course.price === 0 ? 'FREE ENROLLMENT' : `৳${course.price}`}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
