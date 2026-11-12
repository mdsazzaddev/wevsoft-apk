/**
 * Canonical registry of the user-facing "AI sections" that an admin can point at a
 * specific AI provider + model. Each section maps to one or more WevFeature rows
 * (keyed by featureKey); that row is the single source of truth for which provider
 * powers the section.
 *
 * Pure data — safe to import from both the browser (admin UI) and the server.
 * `icon` is a lucide-react icon name the UI resolves to a component.
 * `defaultInstruction` is used only when the UI has to CREATE a missing feature row.
 */

export interface AiSectionFeature {
  featureKey: string;
  label: string;
  /** System prompt applied when this feature row is first created. Ignored by the
   *  gateway/factory paths (they build their own prompts); used by the engine path. */
  defaultInstruction: string;
}

export interface AiSection {
  key: string;
  label: string;
  description: string;
  /** lucide-react icon name. */
  icon: string;
  /** How this section's AI runs today — informs the UI's helper copy. */
  path: 'engine' | 'gateway' | 'factory';
  features: AiSectionFeature[];
}

export const AI_SECTIONS: AiSection[] = [
  {
    key: 'post',
    label: 'Post Creation',
    description: 'AI Writer, rewrite/improve, and post scoring in the composer.',
    icon: 'PenSquare',
    path: 'engine',
    features: [
      { featureKey: 'post_studio', label: 'AI Writer', defaultInstruction: 'You are an expert social media content creator for the Wevsoft platform. You write engaging, authentic, platform-optimised posts. Always respond with valid JSON only and never wrap it in markdown code fences.' },
      { featureKey: 'improve_content', label: 'Improve / Rewrite', defaultInstruction: 'You rewrite and improve social media content according to the requested action. Return only the improved text, with no explanation or metadata.' },
      { featureKey: 'post_coach', label: 'Post Coach', defaultInstruction: 'You are a social media coach and analytics expert. Score posts objectively from 0-100 and give actionable feedback. Always respond with valid JSON only.' },
    ],
  },
  {
    key: 'assistant',
    label: 'Wevsoft AI',
    description: 'The floating Wevsoft assistant available across the platform.',
    icon: 'Bot',
    path: 'engine',
    features: [
      { featureKey: 'global', label: 'Global Assistant', defaultInstruction: 'You are Wevsoft, a helpful assistant for the Wevsoft social platform.' },
    ],
  },
  {
    key: 'academy',
    label: 'Academy',
    description: 'Academic chat, study planner, and the tutor / solver / notes / quiz tools.',
    icon: 'GraduationCap',
    path: 'factory',
    features: [
      { featureKey: 'academic', label: 'Academic Chat', defaultInstruction: 'You are Wevsoft Academic Assistant. You help students with campus life, notices, files, study material, math, exams, and social activities.' },
      { featureKey: 'study_planner', label: 'Study Planner', defaultInstruction: 'You are Wevsoft Study Planner. Generate flashcards and study material as valid JSON only, with no markdown code fences.' },
      { featureKey: 'academy_tools', label: 'Tutor / Solver / Notes / Quiz', defaultInstruction: 'You are Wevsoft AI Study Master — an elite, encouraging, step-by-step academic tutor and content generator.' },
    ],
  },
  {
    key: 'wevchat',
    label: 'WevChat',
    description: 'Smart replies, compose, tone/grammar, copilot, and chat summaries.',
    icon: 'MessageCircle',
    path: 'gateway',
    features: [
      { featureKey: 'wevchat', label: 'Smart replies / compose / summaries', defaultInstruction: 'You are a concise, helpful messaging assistant. Follow the requested action exactly and return only the result.' },
    ],
  },
  {
    key: 'translate',
    label: 'Translate',
    description: 'Feed, post, and comment translation across the platform.',
    icon: 'Languages',
    path: 'gateway',
    features: [
      { featureKey: 'translate', label: 'Feed / post / comment translate', defaultInstruction: 'You are a translator. Reply with only the translated text. Maintain the original tone, slang, and emojis.' },
    ],
  },
  {
    key: 'summarize',
    label: 'Summarize',
    description: 'TL;DR summaries for posts and voice notes.',
    icon: 'FileText',
    path: 'gateway',
    features: [
      { featureKey: 'summarize', label: 'Content & voice summaries', defaultInstruction: 'You write concise TL;DR summaries. Reply with only the summary, no preamble or quotes.' },
    ],
  },
  {
    key: 'wevchat_translate',
    label: 'WevChat Translate',
    description: 'In-chat message translation and composer translate.',
    icon: 'Languages',
    path: 'gateway',
    features: [
      { featureKey: 'wevchat_translate', label: 'Chat message translate', defaultInstruction: 'You are a chat translator. Reply with only the translated text. Keep tone, slang, and emojis.' },
    ],
  },
  {
    key: 'economy',
    label: 'AI Economy',
    description: 'Marketplace seller AI: descriptions, replies, and pricing.',
    icon: 'ShoppingBag',
    path: 'gateway',
    features: [
      { featureKey: 'ai_economy', label: 'Marketplace & seller AI', defaultInstruction: 'You are a marketplace commerce assistant. Help sellers write listings, reply to buyers, and price products. Return only the requested content.' },
    ],
  },
  {
    key: 'media',
    label: 'Media Analysis',
    description: 'Vision analysis for images, reels, and marketplace media.',
    icon: 'Image',
    path: 'gateway',
    features: [
      { featureKey: 'media_analysis', label: 'Image / media analysis', defaultInstruction: 'You are a vision assistant for Wevsoft. Analyse the provided media and return detailed metadata as valid JSON only.' },
    ],
  },
  {
    key: 'jobs',
    label: 'Jobs',
    description: 'Resume / ATS analysis, recruiter assist, and company summaries.',
    icon: 'Briefcase',
    path: 'factory',
    features: [
      { featureKey: 'jobs', label: 'Resume / ATS / career', defaultInstruction: 'You are a career assistant. Provide resume/ATS analysis and career guidance. Return only the requested content.' },
      { featureKey: 'employer', label: 'Recruiter & company summary', defaultInstruction: 'You are a recruiter advisor. Help employers write job strategy, JD copy, and company summaries.' },
    ],
  },
  {
    key: 'events',
    label: 'Events',
    description: 'AI event creator and organizer promotion assistant.',
    icon: 'Calendar',
    path: 'factory',
    features: [
      { featureKey: 'events', label: 'Event creator / organizer', defaultInstruction: 'You help create events and advise organizers on promotion and engagement. Return only the requested content.' },
    ],
  },
  {
    key: 'creator',
    label: 'Creator Studio',
    description: 'Creator assistant, live/watch help, and brand-pitch drafts.',
    icon: 'Sparkles',
    path: 'factory',
    features: [
      { featureKey: 'creator', label: 'Creator / live / pitch', defaultInstruction: 'You are a creator-studio assistant. Help with scripts, live ideas, and sponsorship pitches. Return only the requested content.' },
    ],
  },
  {
    key: 'moderation',
    label: 'Moderation',
    description: 'Automated toxicity and spam scoring for user-generated content.',
    icon: 'Shield',
    path: 'gateway',
    features: [
      { featureKey: 'moderation', label: 'Content safety scoring', defaultInstruction: 'You score user content for toxicity and spam. Reply with valid JSON only.' },
    ],
  },
  {
    key: 'knowledge',
    label: 'Knowledge',
    description: 'Chat-to-note export and knowledge-base article drafts.',
    icon: 'BookOpen',
    path: 'gateway',
    features: [
      { featureKey: 'knowledge', label: 'Chat-to-note export', defaultInstruction: 'Convert chat transcripts into clean Markdown notes or articles. Return only the document.' },
    ],
  },
  {
    key: 'voice',
    label: 'Voice',
    description: 'Voice-AI session notes (voice-note translate/summary use the sections above).',
    icon: 'Mic',
    path: 'gateway',
    features: [
      { featureKey: 'voice_ai', label: 'Voice AI session summary', defaultInstruction: 'Summarize a voice AI session transcript concisely. Reply with only the summary.' },
    ],
  },
];

/** Flat lookup: featureKey -> the section it belongs to. */
export const SECTION_BY_FEATURE_KEY: Record<string, AiSection> = AI_SECTIONS.reduce(
  (acc, section) => {
    for (const f of section.features) acc[f.featureKey] = section;
    return acc;
  },
  {} as Record<string, AiSection>,
);
