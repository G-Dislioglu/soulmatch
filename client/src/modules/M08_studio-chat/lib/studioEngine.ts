import type { StudioRequest, StudioResult } from '../../../shared/types/studio';

export interface StudioEngine {
  compute(req: StudioRequest): Promise<StudioResult>;
}
