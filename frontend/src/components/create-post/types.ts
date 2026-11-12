export type PreviewDevice = 'mobile' | 'tablet' | 'desktop';

/** Appearance presets shown in Live Preview (maps onto existing layout/media modes). */
export type CreatePostLayoutKind = 'standard' | 'photo' | 'gallery' | 'video' | 'link';

export type CommentAudience = 'everyone' | 'followers' | 'friends' | 'mentioned' | 'off';

export const CREATE_POST_LAYOUTS: Array<{
  id: CreatePostLayoutKind;
  label: string;
}> = [
  { id: 'standard', label: 'Standard' },
  { id: 'photo', label: 'Photo' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'video', label: 'Video' },
  { id: 'link', label: 'Link' },
];