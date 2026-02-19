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
export { MoonCalendar } from './ui/MoonCalendar';
export { SignInterpretation } from './ui/SignInterpretation';
export { CosmicAlerts } from './ui/CosmicAlerts';
export { DayEnergyScore } from './ui/DayEnergyScore';
export { MonthlyHoroscope } from './ui/MonthlyHoroscope';
export { CurrentSkyCard } from './ui/CurrentSkyCard';
export { RetrogradeAlert } from './ui/RetrogradeAlert';
export { AspectsOverview } from './ui/AspectsOverview';
export { WeeklyAstroView } from './ui/WeeklyAstroView';
export { DayRhythm } from './ui/DayRhythm';
export { PlanetJournal } from './ui/PlanetJournal';
export { LunarCalendar } from './ui/LunarCalendar';
export { BirthRuler } from './ui/BirthRuler';
export { YearAstro } from './ui/YearAstro';
export { ChakraMap } from './ui/ChakraMap';
export { TransitsToday } from './ui/TransitsToday';
export { LunarAdvice } from './ui/LunarAdvice';
export { PlanetRhythm } from './ui/PlanetRhythm';
export { StarGate } from './ui/StarGate';
export { MonthlyEnergy } from './ui/MonthlyEnergy';
export { AspectMeaning } from './ui/AspectMeaning';
export { RetrogradeGuide } from './ui/RetrogradeGuide';
export { HouseMeanings } from './ui/HouseMeanings';
export { ZodiacGuide } from './ui/ZodiacGuide';
export { PlanetMeanings } from './ui/PlanetMeanings';
export { ChironWounds } from './ui/ChironWounds';
