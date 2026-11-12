export interface ScheduledMessageItem {
  id: string;
  conversationId: string;
  text?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  mediaType?: string | null;
  scheduledFor: string;
  status: string;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function toLocalInputValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function defaultScheduleTime() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setSeconds(0, 0);
  const minutes = d.getMinutes();
  const rounded = Math.ceil(minutes / 5) * 5;
  if (rounded === 60) {
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
  } else {
    d.setMinutes(rounded);
  }
  return d;
}

export function tomorrowMorning() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

export function formatScheduleTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function validateScheduleDate(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return 'Pick a valid date and time';
  if (date.getTime() < Date.now() + 60 * 1000) return 'Pick a time at least 1 minute from now';
  return null;
}
