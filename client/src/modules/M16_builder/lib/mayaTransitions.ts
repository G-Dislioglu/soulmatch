export type MayaPhase = 'idle' | 'dragging' | 'navigating' | 'atTarget' | 'returning';

export const MAYA_TIMING = {
  navigateMs: 600,
  returnMs: 600,
  autoReturnMs: 8000,
  settleBufferMs: 100,
  rAFStabilizeFrames: 3,
  rAFMaxRetries: 20,
  positionDeltaThreshold: 1.5,
  dragDeadzonePx: 5,
} as const;

export const MAYA_LAYOUT = {
  figureSizePx: 24,
  targetOffsetPx: 16,
  viewportMarginPx: 20,
  idleOffsetXPx: 40,
  idleOffsetYPx: 14,
  idleFallbackX: 84,
  idleFallbackY: 84,
} as const;

export const NAVIGATE_SETTLE_DEADLINE = MAYA_TIMING.navigateMs + MAYA_TIMING.settleBufferMs;
export const RETURN_SETTLE_DEADLINE = MAYA_TIMING.returnMs + MAYA_TIMING.settleBufferMs;
export const CLICK_TO_RETURN_ARM_DELAY = NAVIGATE_SETTLE_DEADLINE;

export const MAYA_Z_INDEX = 35;

export const ALLOWED_TRANSITIONS: Record<MayaPhase, MayaPhase[]> = {
  idle: ['dragging', 'navigating'],
  dragging: ['idle'],
  navigating: ['atTarget', 'idle'],
  atTarget: ['returning', 'dragging'],
  returning: ['idle', 'dragging'],
};

export function canTransition(from: MayaPhase, to: MayaPhase): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}