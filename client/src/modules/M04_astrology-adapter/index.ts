// Public API for module M04. No deep imports allowed outside this module.
export type { AstrologyEngine } from './lib/astrologyEngine';
export { buildAstrologyRequestFromProfile } from './lib/astrologyEngine';
export { StubAstrologyEngine } from './lib/stubEngine';

import { StubAstrologyEngine } from './lib/stubEngine';
import type { AstrologyRequest, AstrologyResult } from '../../shared/types/astrology';

const defaultEngine = new StubAstrologyEngine();

export function computeAstrology(req: AstrologyRequest): Promise<AstrologyResult> {
  return defaultEngine.compute(req);
}
