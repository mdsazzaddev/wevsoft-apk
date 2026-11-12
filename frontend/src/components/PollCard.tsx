import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart2, Clock, Users, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  percentage: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  multiChoice: boolean;
  expiresAt?: string;
  userVotes: string[]; // optionIds the current user voted for
}

interface PollCardProps {
  poll: Poll;
  onVote?: (pollId: string, optionIds: string[]) => Promise<void>;
  showResults?: boolean;
}

const GRADIENT_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
];

export default function PollCard({ poll, onVote, showResults = false }: PollCardProps) {
  const [selected, setSelected] = useState<string[]>(poll.userVotes || []);
  const [voted, setVoted] = useState(poll.userVotes.length > 0);
  const [loading, setLoading] = useState(false);

  const isExpired = poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false;
  const showResultsNow = voted || showResults || isExpired;

  const handleSelect = (optionId: string) => {
    if (voted || isExpired) return;
    if (poll.multiChoice) {
      setSelected(prev =>
        prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
      );
    } else {
      setSelected([optionId]);
    }
  };

  const handleVote = async () => {
    if (!selected.length || !onVote) return;
    setLoading(true);
    try {
      await onVote(poll.id, selected);
      setVoted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
          <BarChart2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-zinc-900 dark:text-white text-sm leading-snug">{poll.question}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {poll.totalVotes} votes
            </span>
            {poll.expiresAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {isExpired ? 'Ended' : `Ends ${formatDistanceToNow(new Date(poll.expiresAt), { addSuffix: true })}`}
              </span>
            )}
            {poll.multiChoice && (
              <span className="text-violet-500 font-medium">Multi-choice</span>
            )}
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map((option, idx) => {
          const isSelected = selected.includes(option.id);
          const isVotedFor = poll.userVotes.includes(option.id);
          const color = GRADIENT_COLORS[idx % GRADIENT_COLORS.length];

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={voted || isExpired}
              className={`relative w-full text-left rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                isSelected && !showResultsNow
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                  : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50'
              } ${!voted && !isExpired ? 'hover:border-violet-400 cursor-pointer' : 'cursor-default'}`}
            >
              {/* Progress bar */}
              {showResultsNow && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${option.percentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.1 }}
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color} opacity-20 dark:opacity-30`}
                />
              )}

              <div className="relative flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  {!showResultsNow && (
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                      isSelected ? 'border-violet-500 bg-violet-500' : 'border-zinc-300 dark:border-zinc-600'
                    }`}>
                      {isSelected && <div className="w-full h-full rounded-full bg-white scale-50" />}
                    </div>
                  )}
                  {showResultsNow && isVotedFor && (
                    <CheckCircle className="w-4 h-4 text-violet-500 flex-shrink-0" />
                  )}
                  <span className={`text-sm font-medium ${
                    showResultsNow && isVotedFor
                      ? 'text-violet-700 dark:text-violet-300'
                      : 'text-zinc-800 dark:text-zinc-200'
                  }`}>
                    {option.text}
                  </span>
                </div>
                {showResultsNow && (
                  <span className={`text-sm font-bold ${
                    isVotedFor ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-600 dark:text-zinc-400'
                  }`}>
                    {option.percentage}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Vote button */}
      <AnimatePresence>
        {!voted && !isExpired && selected.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={handleVote}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? 'Voting...' : `Vote${poll.multiChoice && selected.length > 1 ? ` (${selected.length})` : ''}`}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
