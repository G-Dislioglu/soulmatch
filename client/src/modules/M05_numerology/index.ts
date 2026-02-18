// Public API for module M05. No deep imports allowed outside this module.
export type { NumerologyEngine } from './lib/numerologyEngine';
export { buildNumerologyRequestFromProfile, computeNumerology } from './lib/numerologyEngine';
export { NumerologyCard } from './ui/NumerologyCard';
