// Public API for module M08. No deep imports allowed outside this module.
export type { StudioEngine } from './lib/studioEngine';
export { StubStudioEngine } from './lib/stubStudio';
export { SeatBadge } from './ui/SeatBadge';
export { TurnsView } from './ui/TurnsView';
export { StudioPanel } from './ui/StudioPanel';
export { StudioPage } from './ui/StudioPage';
export { LilithEyes } from './ui/LilithEyes';
export type { LilithEyeState } from './ui/LilithEyes';
export { LilithAvatar } from './ui/LilithAvatar';
export { getLilithIntensity, setLilithIntensity } from './lib/lilithGate';
export type { LilithIntensity } from './lib/lilithGate';
