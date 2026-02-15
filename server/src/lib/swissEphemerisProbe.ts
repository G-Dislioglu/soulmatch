import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export interface SwissEphemerisProbeResult {
  available: boolean;
  error?: string;
  runtime: {
    node: string;
    platform: NodeJS.Platform;
    arch: NodeJS.Architecture;
  };
}

// Swiss Ephemeris Build Probe with diagnostics for Render compatibility
export function swissEphemerisProbe(): SwissEphemerisProbeResult {
  const runtime = {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  };

  try {
    require('sweph');
    return {
      available: true,
      runtime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? `${error.message}\n${error.stack ?? ''}`.trim()
      : String(error);

    console.warn('Swiss Ephemeris not available:', errorMessage);

    return {
      available: false,
      error: errorMessage,
      runtime,
    };
  }
}
