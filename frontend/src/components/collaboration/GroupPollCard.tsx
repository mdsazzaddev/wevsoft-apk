import React, { useState } from 'react';
import { BarChart3, Clock, CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../../store';
import { vote } from '../../lib/collaborationApi';
import toast from 'react-hot-toast';

interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters?: { id: string; name: string; avatar?: string }[];
}

interface GroupPollCardProps {
  pollId: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  isMultipleChoice: boolean;
  isAnonymous: boolean;
  expiresAt?: string;
  hasVoted?: boolean;
  userVotedOptions?: string[];
}

export const GroupPollCard: React.FC<GroupPollCardProps> = ({
  pollId,
  question,
  options: initialOptions,
  totalVotes: initialTotalVotes,
  isMultipleChoice,
  isAnonymous,
  expiresAt,
  hasVoted: initialHasVoted = false,
  userVotedOptions = [],
}) => {
  const [options, setOptions] = useState(initialOptions);
  const [totalVotes, setTotalVotes] = useState(initialTotalVotes);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [selectedOptions, setSelectedOptions] = useState<string[]>(userVotedOptions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const token = useStore(state => state.token);

  const toggleOption = (id: string) => {
    if (hasVoted) return;
    if (isMultipleChoice) {
      setSelectedOptions(prev => 
        prev.includes(id) ? prev.filter(optId => optId !== id) : [...prev, id]
      );
    } else {
      setSelectedOptions([id]);
    }
  };

  const handleVote = async () => {
    if (selectedOptions.length === 0 || !token) return;
    
    setIsSubmitting(true);
    try {
      await vote(token, pollId, selectedOptions);
      setHasVoted(true);
      
      // Optimistic update
      setOptions(prev => prev.map(opt => {
        if (selectedOptions.includes(opt.id)) {
          return { ...opt, votes: opt.votes + 1 };
        }
        return opt;
      }));
      setTotalVotes(prev => prev + (isMultipleChoice ? selectedOptions.length : 1));
      
      toast.success('Vote submitted');
    } catch (err) {
      toast.error('Failed to submit vote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

  return (
    <div className="bg-card border border-border rounded-xl p-4 max-w-sm w-full shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="font-semibold text-foreground">{question}</h4>
        <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
          <BarChart3 className="w-4 h-4 text-primary" />
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-semibold mb-4">
        <span>{isAnonymous ? 'Anonymous' : 'Public'}</span>
        <span>•</span>
        <span>{isMultipleChoice ? 'Multiple Choice' : 'Single Choice'}</span>
      </div>

      <div className="space-y-3 mb-4">
        {options.map((opt) => {
          const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
          const isSelected = selectedOptions.includes(opt.id);
          
          return (
            <div 
              key={opt.id}
              onClick={() => toggleOption(opt.id)}
              className={`relative overflow-hidden rounded-lg border transition-colors cursor-pointer ${
                isSelected ? 'border-primary' : 'border-border hover:border-primary/50'
              } ${hasVoted ? 'cursor-default' : ''}`}
            >
              {(hasVoted || isExpired) && (
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 bg-primary/10 -z-10"
                />
              )}
              
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  {!hasVoted && !isExpired && (
                    isSelected ? (
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                    )
                  )}
                  <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {opt.text}
                  </span>
                </div>
                
                {(hasVoted || isExpired) && (
                  <span className="text-sm font-semibold text-primary">{percentage}%</span>
                )}
              </div>
              
              {!isAnonymous && hasVoted && opt.voters && opt.voters.length > 0 && (
                <div className="flex -space-x-1.5 px-3 pb-2 pt-1">
                  {opt.voters.slice(0, 5).map(voter => (
                    <img key={voter.id} src={voter.avatar} alt={voter.name} className="w-4 h-4 rounded-full border border-card object-cover" title={voter.name} />
                  ))}
                  {opt.voters.length > 5 && (
                    <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center border border-card text-[8px] font-bold">
                      +{opt.voters.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">
          {totalVotes} votes
        </span>
        
        {!hasVoted && !isExpired && selectedOptions.length > 0 && (
          <button 
            onClick={handleVote}
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Voting...' : 'Vote'}
          </button>
        )}
        
        {expiresAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
            <Clock className="w-3.5 h-3.5" />
            <span>{isExpired ? 'Ended' : new Date(expiresAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};
