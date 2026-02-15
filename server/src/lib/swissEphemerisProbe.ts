// Swiss Ephemeris Build Probe - Minimal test for Render compatibility
export function swissEphemerisAvailable(): boolean {
  try {
    // Try to require sweph - this will fail if native binding doesn't work
    require('sweph');
    return true;
  } catch (error) {
    console.warn('Swiss Ephemeris not available:', error);
    return false;
  }
}
