import type { StudioSeat } from '../../../shared/types/studio';

const KEY = 'soulmatch.lastPersona';

export function getLastPersona(): StudioSeat | null {
  const raw = localStorage.getItem(KEY);
  if (raw === 'maya' || raw === 'luna' || raw === 'orion' || raw === 'lilith') return raw;
  return null;
}

export function setLastPersona(seat: StudioSeat): void {
  localStorage.setItem(KEY, seat);
}
