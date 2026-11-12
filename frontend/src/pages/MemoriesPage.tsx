import React from 'react';
import { Clock, Image as ImageIcon, Sparkles, Calendar } from 'lucide-react';

export default function MemoriesPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4 mb-12">
        <div className="w-20 h-20 bg-teal-500/10 rounded-3xl mx-auto flex items-center justify-center rotate-3 hover:rotate-6 transition-transform">
          <Clock className="text-teal-500" size={40} />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">On This Day</h1>
        <p className="text-muted-foreground font-medium">Looking back at your campus journey.</p>
      </div>

      <div className="space-y-12">
        {/* AI Memory Card */}
        <div className="relative rounded-3xl overflow-hidden border border-border shadow-xl bg-card">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-blue-500 to-purple-500"></div>
          <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 text-teal-500 font-bold text-sm uppercase tracking-widest">
                <Sparkles size={16} /> AI Generated Memory
              </div>
              <h2 className="text-3xl font-bold leading-tight">1 Year Ago Today</h2>
              <p className="text-muted-foreground">You attended the Tech Carnival and shared 5 photos with your batchmates.</p>
              <button onClick={() => {}} className="px-6 py-3 bg-teal-500 text-foreground dark:text-white font-bold rounded-xl hover:bg-teal-600 transition-colors shadow-lg shadow-teal-500/20">
                Share Memory
              </button>
            </div>
            <div className="w-full md:w-1/2 aspect-video bg-muted rounded-2xl overflow-hidden relative rotate-1 hover:rotate-0 transition-transform">
               <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800&auto=format&fit=crop" alt="Memory" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-border">
          {[1, 2].map((i) => (
            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-teal-500 text-foreground dark:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <Calendar size={16} />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-foreground">2 Years Ago</h4>
                  <span className="text-xs font-semibold text-teal-500">2024</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                   <img src={`https://images.unsplash.com/photo-1511629091441-ee46146481b6?q=80&w=400&auto=format&fit=crop&sig=${i}1`} className="rounded-lg w-full aspect-square object-cover" alt="mem" />
                   <img src={`https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=400&auto=format&fit=crop&sig=${i}2`} className="rounded-lg w-full aspect-square object-cover" alt="mem" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">Study session before finals at the main library.</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
