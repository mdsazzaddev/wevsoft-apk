import React, { useState } from 'react';
import { Bot, UserCircle, Briefcase, HeartHandshake, PhoneCall } from 'lucide-react';
import { motion } from 'motion/react';

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: any;
  color: string;
}

export const VoiceAgentSelector: React.FC<{ onStartSession: (agent: Agent) => void }> = ({ onStartSession }) => {
  const agents: Agent[] = [
    { id: '1', name: 'Wevsoft', role: 'General Assistant', description: 'Helpful, versatile AI ready to assist with any task.', icon: Bot, color: 'text-primary bg-primary/10 border-primary/20' },
    { id: '2', name: 'Prof. Alan', role: 'Tutor', description: 'Patient tutor specializing in math, science, and coding.', icon: UserCircle, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
    { id: '3', name: 'Elena', role: 'Therapist', description: 'Empathetic listener offering emotional support and guidance.', icon: HeartHandshake, color: 'text-pink-500 bg-pink-500/10 border-pink-500/20' },
    { id: '4', name: 'Marcus', role: 'Career Coach', description: 'Direct and actionable advice for your professional growth.', icon: Briefcase, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-foreground mb-2">Choose your AI Agent</h2>
        <p className="text-muted-foreground">Select a specialized AI personality to start a real-time voice session.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map(agent => {
          const Icon = agent.icon;
          return (
            <motion.div
              key={agent.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-card border border-border hover:border-primary/50 rounded-2xl p-6 cursor-pointer flex flex-col group transition-colors shadow-sm"
              onClick={() => onStartSession(agent)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl border ${agent.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="bg-muted px-2.5 py-1 rounded-full text-xs font-semibold text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Online
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-foreground mb-1">{agent.name}</h3>
              <p className="text-sm font-medium text-primary mb-3">{agent.role}</p>
              <p className="text-sm text-muted-foreground mb-6 flex-1">{agent.description}</p>
              
              <button className="w-full py-2.5 bg-muted group-hover:bg-primary group-hover:text-primary-foreground rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                <PhoneCall className="w-4 h-4" />
                Start Call
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
