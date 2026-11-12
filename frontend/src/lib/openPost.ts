import type { NavigateFunction } from 'react-router-dom';
import { readMainScrollTop, routeKey, saveRouteScroll } from './appNavigation';

/** Open Facebook-style post permalink; keeps feed post in history state for instant paint. */
export function openPostPermalink(
  navigate: NavigateFunction,
  post: { id: string; [key: string]: unknown },
  options?: { fromPath?: string },
) {
  if (!post?.id) return;
  const from = options?.fromPath || (typeof window !== 'undefined' ? window.location.pathname : '/home');
  const search = typeof window !== 'undefined' ? window.location.search : '';
  saveRouteScroll(routeKey(from, search), readMainScrollTop());
  navigate(`/posts/${encodeURIComponent(String(post.id))}`, { state: { post } });
}
