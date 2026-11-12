import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Wand2, Type, Image as ImageIcon, Clapperboard } from 'lucide-react';
import { creatorHubPath } from '../../lib/creatorHub';
import { applyBusinessCreatorNav } from '../../lib/creatorBusinessNav';
import { useCreatorHubMode } from '../../lib/creatorSpaceContext';
import { HubPageHeader, HubRow, HubSection } from './hub/HubUI';

type AssistantTool = {
  title: string; blurb: string; icon: typeof Type; to: string; cta: string;
};

const REMIX: AssistantTool = {
  title: 'Smart Content Remix',
  blurb: 'Turn long-form ideas into shorts-ready hooks. Start from Inspiration Hub prompts or your drafts.',
  icon: Wand2,
  to: creatorHubPath('inspiration'),
  cta: 'Open Inspiration Hub',
};

/** Personal hub: consumer creation tools publish as the signed-in person. */
const PERSONAL_TOOLS: AssistantTool[] = [
  {
    title: 'AI Post Creator',
    blurb: 'Draft captions, hooks and post layouts with AI — then publish from Create Post.',
    icon: Type,
    to: '/ai/post',
    cta: 'Open AI Post Creator',
  },
  REMIX,
  {
    title: 'Image & carousel drafts',
    blurb: 'Jump into Create Post to build image or carousel posts with AI-assisted copy.',
    icon: ImageIcon,
    to: '/create-post?type=image',
    cta: 'Create image post',
  },
  {
    title: 'Reel & short scripts',
    blurb: 'Open Content Studio to upload a reel, or use AI Post Creator for script ideas first.',
    icon: Clapperboard,
    to: creatorHubPath('content_studio'),
    cta: 'Open Content Studio',
  },
];

/** Space hub: Space publishing goes through Business Suite Batch Upload. */
const SPACE_TOOLS: AssistantTool[] = [
  {
    title: 'AI Post Creator',
    blurb: 'Draft captions, hooks and post layouts with AI — then publish from Batch Upload for your Space.',
    icon: Type,
    to: '/business/batch',
    cta: 'Open Batch Upload',
  },
  REMIX,
  {
    title: 'Image & carousel drafts',
    blurb: 'Jump into Batch Upload to build image or carousel posts for the selected Space.',
    icon: ImageIcon,
    to: '/business/batch',
    cta: 'Create image post',
  },
];

export const AiCreatorAssistant = () => {
  const navigate = useNavigate();
  const mode = useCreatorHubMode();
  const tools = mode === 'space' ? SPACE_TOOLS : PERSONAL_TOOLS;
  const open = (to: string) => {
    if (!applyBusinessCreatorNav(to, { navigate })) navigate(to);
  };
  return (
    <div className="space-y-5">
      <HubPageHeader
        title="AI Assistant"
        description={mode === 'space'
          ? 'Write, remix and prepare Space content with the AI tools in Wevsoft.'
          : 'Write, remix and prepare content with the AI tools in Wevsoft.'}
      />
      <HubSection title="Tools" flush>
        <div className="divide-y divide-border">
          {tools.map((tool) => (
            <HubRow
              key={tool.title}
              icon={tool.icon}
              title={tool.title}
              description={tool.blurb}
              onClick={() => open(tool.to)}
              trailing={
                <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-primary">
                  <span className="hidden sm:inline">{tool.cta}</span>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </span>
              }
            />
          ))}
        </div>
      </HubSection>
      <p className="text-[13px] text-muted-foreground">
        Use Inspiration Hub for trending audio and prompts, then finish the draft in Content Studio{mode === 'space' ? ' or Batch Upload' : ''}.
      </p>
    </div>
  );
};
