import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Swiss Ephemeris Build Probe - Minimal test for Render compatibility
export function swissEphemerisAvailable(): boolean {
  try {
    require('sweph');
    return true;
  } catch (error) {
    console.warn('Swiss Ephemeris not available:', error);
    return false;
  }
}
