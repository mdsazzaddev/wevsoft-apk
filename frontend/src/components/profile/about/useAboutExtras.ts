/**
 * About sections that have no backend column yet.
 *
 * TODO(backend): Category, Languages, Communities, Offers, Work history list,
 * Interests, Travel, Other names / nickname and Name pronunciation are stored
 * in localStorage only (per user id), so they do NOT sync across devices and
 * other people cannot see them. Move to a `UserProfile.aboutExtras` JSON column
 * + PUT /api/profile key when a migration is scheduled.
 */
import { useCallback, useEffect, useState } from 'react';

export interface AboutListItem {
  id: string;
  title: string;
  subtitle?: string;
}

export interface AboutExtras {
  category?: string;
  languages?: string[];
  communities?: AboutListItem[];
  offers?: AboutListItem[];
  work?: AboutListItem[];
  interests?: string[];
  travel?: AboutListItem[];
  /** Extra phone numbers (title = number, subtitle = Mobile/Work/Home…). */
  phones?: AboutListItem[];
  /** Extra emails beyond the account email (title = address, subtitle = label). */
  emails?: AboutListItem[];
  otherNames?: AboutListItem[];
  pronunciation?: string;
}

const key = (userId: string) => `wev:about-extras:${userId}`;

function read(userId: string): AboutExtras {
  try {
    const raw = localStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as AboutExtras) || {} : {};
  } catch {
    return {};
  }
}

export function newAboutId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function useAboutExtras(userId: string) {
  const [extras, setExtras] = useState<AboutExtras>(() => read(userId));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload when the profile changes
    setExtras(read(userId));
  }, [userId]);

  const update = useCallback(
    (patch: Partial<AboutExtras>) => {
      setExtras((prev) => {
        const next = { ...prev, ...patch };
        try {
          localStorage.setItem(key(userId), JSON.stringify(next));
        } catch {
          /* storage full or blocked: keep in memory */
        }
        return next;
      });
    },
    [userId],
  );

  return { extras, update };
}
