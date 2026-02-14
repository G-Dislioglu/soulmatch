export type LilithIntensity = 'mild' | 'ehrlich' | 'brutal';

const INTENSITY_KEY = 'soulmatch.lilith.intensity';

export function getLilithIntensity(): LilithIntensity {
  const stored = localStorage.getItem(INTENSITY_KEY);
  if (stored === 'mild' || stored === 'ehrlich' || stored === 'brutal') return stored;
  return 'ehrlich';
}

export function setLilithIntensity(level: LilithIntensity): void {
  localStorage.setItem(INTENSITY_KEY, level);
}
