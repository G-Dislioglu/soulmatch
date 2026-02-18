// Public API for module M04. No deep imports allowed outside this module.
export type { AstrologyEngine } from './lib/astrologyEngine';
export { buildAstrologyRequestFromProfile } from './lib/astrologyEngine';
export { StubAstrologyEngine } from './lib/stubEngine';
export { RealAstrologyEngine } from './lib/realEngine';

import { RealAstrologyEngine } from './lib/realEngine';
import type { AstrologyRequest, AstrologyResult } from '../../shared/types/astrology';

const defaultEngine = new RealAstrologyEngine();

export function computeAstrology(req: AstrologyRequest): Promise<AstrologyResult> {
  return defaultEngine.compute(req);
}

export { RadixWheel } from './ui/RadixWheel';
export { CosmicDayCard } from './ui/CosmicDayCard';
export { PlanetaryHours } from './ui/PlanetaryHours';
