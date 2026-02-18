// Public API for module M05. No deep imports allowed outside this module.
export type { NumerologyEngine } from './lib/numerologyEngine';
export { buildNumerologyRequestFromProfile, computeNumerology } from './lib/numerologyEngine';
export { NumerologyCard } from './ui/NumerologyCard';
export { ChakraBar } from './ui/ChakraBar';
export { BiorhythmCurve } from './ui/BiorhythmCurve';
export { TarotDayCard } from './ui/TarotDayCard';
export { DailyAffirmations } from './ui/DailyAffirmations';
export { YearForecast } from './ui/YearForecast';
export { LifePathDetail } from './ui/LifePathDetail';
export { LifePinnacles } from './ui/LifePinnacles';
