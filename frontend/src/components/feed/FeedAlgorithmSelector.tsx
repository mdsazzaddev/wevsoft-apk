import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../../store';
import toast from 'react-hot-toast';
import { Check, Sparkles, Clock, Users, Flame, LayoutGrid, Tags, Shield, Leaf } from 'lucide-react';

const ALGORITHM_MODES = [
  {
    id: 'ai_personalized',
    label: 'AI Personalized (For You)',
    description: 'ML ranking from your history.',
    icon: Sparkles,
  },
  {
    id: 'chronological',
    label: 'Chronological',
    description: 'Latest first. No ranking.',
    icon: Clock,
  },
  {
    id: 'following_only',
    label: 'Following Only',
    description: 'Only accounts you follow.',
    icon: Users,
  },
  {
    id: 'trending',
    label: 'Trending/Viral',
    description: 'Viral by engagement velocity.',
    icon: Flame,
  },
  {
    id: 'discovery_mix',
    label: 'Discovery Mix',
    description: 'Following, trending & new.',
    icon: LayoutGrid,
  },
  {
    id: 'interest_based',
    label: 'Interest/Category-based',
    description: 'Filtered by your topics.',
    icon: Tags,
  },
  {
    id: 'creator_fairness',
    label: 'Creator Fairness Boost',
    description: 'Boosts newer creators.',
    icon: Shield,
  },
  {
    id: 'low_distraction',
    label: 'Low-Distraction Mode',
    description: 'Less hooks & autoplay.',
    icon: Leaf,
  },
];

const CATEGORIES = [
  'Technology', 'Gaming', 'Music', 'Education', 'Entertainment', 'Sports', 'Art', 'Lifestyle', 'News', 'Comedy',
];

export function FeedAlgorithmSelector() {
  const token = useStore((s) => s.token);
  const [activeMode, setActiveMode] = useState('ai_personalized');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    void fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/settings/feed-preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveMode(data.algorithmMode || 'ai_personalized');
        if (data.selectedCategories) {
          try {
            setSelectedCategories(JSON.parse(data.selectedCategories));
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch feed preferences', err);
    }
  };

  const savePreferences = async (mode: string, categories: string[]) => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/feed-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ algorithmMode: mode, selectedCategories: JSON.stringify(categories) }),
      });
      if (res.ok) toast.success('Feed preferences updated');
      else toast.error('Failed to update preferences');
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (mode: string) => {
    setActiveMode(mode);
    void savePreferences(mode, selectedCategories);
  };

  const toggleCategory = (cat: string) => {
    const newCats = selectedCategories.includes(cat)
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];
    setSelectedCategories(newCats);
    void savePreferences(activeMode, newCats);
  };

  return (
    <div className={`space-y-2 ${loading ? 'opacity-70 pointer-events-none' : ''}`}>
      <div>
        <h3 className="text-sm font-bold leading-tight">Feed Algorithm</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
          Choose how your feed is curated. Applies on next refresh.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        {ALGORITHM_MODES.map((mode) => {
          const isActive = activeMode === mode.id;
          return (
            <motion.button
              key={mode.id}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => handleModeChange(mode.id)}
              className={`w-full text-left px-2.5 py-2 rounded-xl border flex items-center gap-2.5 transition-colors ${
                isActive ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted/50'
              }`}
            >
              <mode.icon
                size={15}
                className={`shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold leading-tight truncate">{mode.label}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug truncate">{mode.description}</p>
              </div>
              {isActive ? <Check size={15} className="shrink-0 text-primary" /> : null}
            </motion.button>
          );
        })}
      </div>

      {activeMode === 'interest_based' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="pt-1"
        >
          <h4 className="text-[11px] font-semibold mb-1.5 text-muted-foreground uppercase tracking-wide">
            Select Categories
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-2 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
                  selectedCategories.includes(cat)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-foreground hover:bg-muted border-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
