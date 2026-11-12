import React from 'react';
import { WithTranslation } from './WithTranslation';
import type { AISourceType } from '../../lib/aiApi';

export const AITextTools: React.FC<{
  sourceId: string;
  sourceType: AISourceType;
  originalText: string;
  enableSummary?: boolean;
  compact?: boolean;
  disabled?: boolean;
  absoluteActions?: boolean;
  textClassName?: string;
  collapsible?: boolean;
  hideTranslateButton?: boolean;
}> = (props) => {
  if (!props.originalText?.trim()) return null;
  return <WithTranslation {...props} />;
};
