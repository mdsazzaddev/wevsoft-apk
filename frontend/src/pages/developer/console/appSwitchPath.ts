/** Same section for another app (keeps the section when the app switcher changes app). */
export function appSwitchPath(pathname: string, id: string): string | null {
  const m = /^\/developer\/apps\/([^/]+)(\/[^/]+)?\/?$/.exec(pathname);
  if (!m || m[1] === 'new') return null;
  return `/developer/apps/${id}${m[2] || ''}`;
}
