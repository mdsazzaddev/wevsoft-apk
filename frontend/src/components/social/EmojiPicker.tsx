import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smile, Heart, ThumbsUp, Sparkles, Coffee, Award, Compass, Lightbulb, Flag, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
  className?: string;
}

const EMOJI_CATEGORIES = [
  {
    id: 'popular',
    name: 'Popular',
    icon: '🔥',
    emojis: ['❤️', '🔥', '✨', '🚀', '😍', '😂', '🎉', '👍', '🙏', '💯', '😊', '🥰', '😎', '💡', '🌟', '💪', '👏', '💥', '🥳', '🙌', '🤝', '🌸', '⚡', '🏆']
  },
  {
    id: 'smileys',
    name: 'Smileys',
    icon: '😀',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', 'upside_down_face', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', 'tired_face', 'weary', '🥺', '😢', '😭', '😤', 'angry', 'rage', 'mind_blown', 'hugs', 'thinking', '🤫', 'subtly_smiling_face'].map(e => {
      const map: Record<string, string> = {
        upside_down_face: '🙃', tired_face: '😫', weary: '😩', angry: '😠', rage: '😡', mind_blown: '🤯', hugs: '🤗', thinking: '🤔', subtly_smiling_face: '🙂'
      };
      return map[e] || e;
    })
  },
  {
    id: 'hands',
    name: 'Hands & People',
    icon: '👍',
    emojis: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '✋', '🤚', '🖐', '🖖', '👋', '🤙', '💪', '🙏', '🤝', '👏', '🙌', '👐', '🤲', '🤳', '💅', '🙋‍♂️', '🙋‍♀️', '🧑‍💻', '👨‍💻', '👩‍💻', '🧑‍🎨', '🧑‍🚀']
  },
  {
    id: 'hearts',
    name: 'Hearts & Love',
    icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', 'purple_heart', 'black_heart', 'white_heart', 'brown_heart', 'broken_heart', 'heart_on_fire', 'mending_heart', 'two_hearts', 'revolving_hearts', 'heartbeat', 'heartpulse', 'sparkling_heart', 'cupid', 'gift_heart', 'love_letter', 'kiss', 'ring', 'gem', 'bouquet', 'rose', 'hibiscus', 'cherry_blossom'].map(e => {
      const map: Record<string, string> = {
        purple_heart: '💜', black_heart: '🖤', white_heart: '🤍', brown_heart: '🤎', broken_heart: '💔', heart_on_fire: '❤️‍🔥', mending_heart: '❤️‍🩹', two_hearts: '💕', revolving_hearts: '💞', heartbeat: '💓', heartpulse: '💗', sparkling_heart: '💖', cupid: '💘', gift_heart: '💝', love_letter: '💌', kiss: '💋', ring: '💍', gem: '💎', bouquet: '💐', rose: '🌹', hibiscus: '🌺', cherry_blossom: '🌸'
      };
      return map[e] || e;
    })
  },
  {
    id: 'animals',
    name: 'Animals & Nature',
    icon: '🐶',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐢', '🐍', '🐙', '🐬', '🐳', '🐘', '🐪', '🦒', '🌸', '🌼', '🌻', '🌺', '🌲', '🌳', '🌴', '🍀', '🍁', '🌙', '⭐', '☀️', '🌈']
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: '🍕',
    emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🌽', '🥕', '🥔', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🌮', '🌯', '🥗', '🍿', '🍰', '🎂', '🍩', '🍪', '🍫', '🍬', '☕', '🍵', '🥤', '🧋', '🍺', '🥂', '🍷', '🍹']
  },
  {
    id: 'activities',
    name: 'Activities & Sports',
    icon: '⚽',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '🥊', '🥋', '⛳', '⛸', '🎣', '🎽', '🎿', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🎯', '🎮', '🕹', '🎲', '🧩', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻']
  },
  {
    id: 'travel',
    name: 'Travel & Places',
    icon: '🚀',
    emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '✈️', '🚀', '🛸', '🚁', '⛵', '🚢', '🗺', '⛰', '🏔', '🌋', '🏖', '🏝', '🏜', '🗽', '🗼', '🏰', '🏯', '🏟', '🎡', '🎢', '⛺', '🏠', '🏡', '🏢', '🏣', '🏥', '🏦', '🏨', '🏪', '🏫', '🏬', '🌟', '✨']
  },
  {
    id: 'symbols',
    name: 'Objects & Symbols',
    icon: '💡',
    emojis: ['💡', '🔦', '🏮', '📱', '💻', '🖥', '⌚', '📷', '📹', '🔍', '🔎', '🕯', '📚', '📖', '📝', '✏️', '✒️', '📎', '📌', '📎', '🔒', '🔓', '🔑', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💯', '💢', '💥', '💫', '💦', '💨', '⚡']
  },
  {
    id: 'flags',
    name: 'Flags',
    icon: '🇧🇩',
    emojis: ['🇧🇩', '🇺🇸', '🇬🇧', '🇨🇦', '🇦🇺', '🇯🇵', '🇰🇷', '🇮🇳', '🇵🇰', '🇸🇦', '🇦🇪', '🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸', '🇧🇷', '🇦🇷', '🇲🇽', '🇨🇳', '🇷🇺', '🇹🇷', '🇪🇬', '🇿🇦', '🇳🇬', '🇮🇩', '🇲🇾', '🇸🇬', '🇹🇭', '🇻🇳', '🇵🇭', '🏳️‍🌈', '🏳️‍⚧️', '🏁', '🚩']
  }
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onSelectEmoji,
  onClose,
  className = ''
}) => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('popular');
  const [searchQuery, setSearchQuery] = useState('');

  const currentCategoryObj = EMOJI_CATEGORIES.find(c => c.id === activeCategory) || EMOJI_CATEGORIES[0];

  const filteredEmojis = searchQuery.trim()
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis).filter((e, idx, arr) => arr.indexOf(e) === idx)
    : currentCategoryObj.emojis;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className={`w-72 sm:w-80 bg-card/95 backdrop-blur-2xl border border-border/80 rounded-3xl shadow-2xl overflow-hidden z-50 flex flex-col select-none ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/60 bg-muted/40">
        <span className="text-xs font-black tracking-wider uppercase text-muted-foreground">
          {t('Select Emoji') || 'Select Emoji'}
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      {!searchQuery && (
        <div className="flex items-center gap-1 p-2 border-b border-border/40 overflow-x-auto no-scrollbar bg-background/50">
          {EMOJI_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`p-2 rounded-xl text-base transition-all shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-primary/20 text-primary scale-110 shadow-sm border border-primary/30'
                  : 'hover:bg-muted text-muted-foreground'
              }`}
              title={cat.name}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emojis Grid */}
      <div className="p-3 max-h-56 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-7 gap-1.5">
          {filteredEmojis.map((emoji, index) => (
            <motion.button
              key={`${emoji}-${index}`}
              whileHover={{ scale: 1.25 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSelectEmoji(emoji)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xl hover:bg-muted/80 transition-colors"
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
