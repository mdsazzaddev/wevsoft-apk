import { NavLink, useLocation, type NavLinkProps } from 'react-router-dom';
import { markReelsAudioUnlockIntent } from '../../lib/videoAutoplay';

function destPath(to: NavLinkProps['to']) {
  if (typeof to === 'string') return to.split('?')[0].split('#')[0];
  if (typeof to === 'object' && to && 'pathname' in to) return to.pathname || '';
  return '';
}

/** NavLink that does not push a duplicate history entry for the current route. */
export function AppNavLink({ onClick, to, ...rest }: NavLinkProps) {
  const location = useLocation();

  return (
    <NavLink
      to={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        const path = destPath(to);
        // Reels entry click = user gesture; stash so muted autoplay can remute on land.
        if (path === '/reels' || path.startsWith('/reels/')) {
          markReelsAudioUnlockIntent();
        }
        const search = typeof to === 'string' && to.includes('?') ? `?${to.split('?')[1]?.split('#')[0] || ''}` : '';
        if (path && location.pathname === path && (!search || location.search === search)) {
          event.preventDefault();
        }
      }}
      {...rest}
    />
  );
}
