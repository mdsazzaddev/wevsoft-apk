import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * `/developer-console` — the entry the app navbar / sidebar links to.
 *
 * It used to bounce Space-mode users into the WevSpace manage dashboard
 * (`/space/:handle/manage/developer-console`), which rendered the small
 * DeveloperConsolePanel *inside* the Space dashboard chrome, and told personal
 * accounts the console was "only available in Space mode". Both now open the
 * full-viewport WebSoft Developer Console at `/developer`. The Space panel is
 * still reachable from the Space dashboard's own "Developer Console" section
 * and from the console's search / "Team & Access" link.
 */
export default function DeveloperConsolePage() {
  const { search, hash } = useLocation();
  return <Navigate to={`/developer${search}${hash}`} replace />;
}
