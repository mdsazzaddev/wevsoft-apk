import { createContext, useContext, type Dispatch } from 'react';
import type { Action, EditorState } from '../model/projectReducer';
import type { Overlay, Slide } from '../model/types';

export type LeftTab = 'media' | 'layers' | 'text' | 'stickers' | 'music' | 'templates';
export type InspectorTab = 'edit' | 'filters' | 'adjust' | 'effects';
export type Tool = 'select' | 'move' | 'draw';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface LibraryItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  name: string;
  size?: number;
  createdAt?: string;
}

export interface Studio {
  state: EditorState;
  dispatch: Dispatch<Action>;
  slide: Slide | null;
  overlay: Overlay | null;
  // playback
  time: number;
  playing: boolean;
  total: number;
  setPlaying: (v: boolean) => void;
  seek: (t: number) => void;
  // ui
  leftTab: LeftTab;
  setLeftTab: (t: LeftTab) => void;
  leftOpen: boolean;
  setLeftOpen: (v: boolean) => void;
  inspectorTab: InspectorTab;
  setInspectorTab: (t: InspectorTab) => void;
  inspectorOpen: boolean;
  setInspectorOpen: (v: boolean) => void;
  tool: Tool;
  setTool: (t: Tool) => void;
  safeArea: boolean;
  setSafeArea: (v: boolean) => void;
  guides: boolean;
  setGuides: (v: boolean) => void;
  chrome: boolean;
  compare: boolean;
  setCompare: (v: boolean) => void;
  setChrome: (v: boolean) => void;
  zoomMode: 'fit' | number;
  setZoomMode: (z: 'fit' | number) => void;
  layout: 'mobile' | 'tablet' | 'desktop';
  // media
  library: LibraryItem[];
  libraryLoading: boolean;
  libraryError: string | null;
  reloadLibrary: () => void;
  uploading: number;
  importFiles: (files: FileList | File[]) => void;
  addFromLibrary: (item: LibraryItem) => void;
  addTextSlide: () => void;
  addText: (preset?: 'heading' | 'subheading' | 'body') => void;
  addSticker: (emoji: string) => void;
  addPoll: () => void;
  openImageEditor: () => void;
  // misc
  saveStatus: SaveStatus;
  savedAt: number | null;
  user: { id?: string; name?: string; avatar?: string | null } | null;
  spaceId?: string;
  spaceName?: string;
  notify: (msg: string) => void;
}

export const StudioCtx = createContext<Studio | null>(null);

export function useStudio(): Studio {
  const v = useContext(StudioCtx);
  if (!v) throw new Error('useStudio outside StoryStudioPage');
  return v;
}
