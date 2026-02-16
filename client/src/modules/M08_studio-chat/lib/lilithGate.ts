import type { StudioSeat } from '../../../shared/types/studio';

export type LilithIntensity = 'mild' | 'ehrlich' | 'brutal';

const LEGACY_LILITH_KEY = 'soulmatch.lilith.intensity';

function intensityKey(seat: StudioSeat): string {
  return `soulmatch.persona.${seat}.intensity`;
}

export function getPersonaIntensity(seat: StudioSeat): LilithIntensity {
  const stored = localStorage.getItem(intensityKey(seat));
  if (stored === 'mild' || stored === 'ehrlich' || stored === 'brutal') return stored;

  if (seat === 'lilith') {
    const legacy = localStorage.getItem(LEGACY_LILITH_KEY);
    if (legacy === 'mild' || legacy === 'ehrlich' || legacy === 'brutal') return legacy;
  }

  return 'ehrlich';
}

export function setPersonaIntensity(seat: StudioSeat, level: LilithIntensity): void {
  localStorage.setItem(intensityKey(seat), level);
  if (seat === 'lilith') {
    localStorage.setItem(LEGACY_LILITH_KEY, level);
  }
}

export function getLilithIntensity(): LilithIntensity {
  return getPersonaIntensity('lilith');
}

export function setLilithIntensity(level: LilithIntensity): void {
  setPersonaIntensity('lilith', level);
}
