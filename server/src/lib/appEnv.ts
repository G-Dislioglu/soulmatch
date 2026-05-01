export type AppEnv = 'production' | 'sandbox' | 'development';

function normalizeAppEnv(value: string | undefined): AppEnv {
  const raw = (value ?? '').trim().toLowerCase();
  if (raw === 'sandbox' || raw === 'staging') {
    return 'sandbox';
  }
  if (raw === 'production' || raw === 'prod') {
    return 'production';
  }
  return 'development';
}

export function getAppEnv(): AppEnv {
  return normalizeAppEnv(process.env.APP_ENV);
}

export function getAppEnvLabel(): string {
  const explicit = process.env.APP_ENV_LABEL?.trim();
  if (explicit) {
    return explicit;
  }

  const env = getAppEnv();
  if (env === 'sandbox') {
    return 'Sandbox / Nicht live';
  }
  if (env === 'production') {
    return 'Live';
  }
  return 'Local / Development';
}

export function isSandboxEnv(): boolean {
  return getAppEnv() === 'sandbox';
}

export function isSandboxFalEnabled(): boolean {
  return process.env.SANDBOX_FAL_ENABLED === 'true';
}
