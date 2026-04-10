export const OPUS_BASE_PATH = "/api/builder/opus-bridge";

export const OPUS_TOKEN_ENV = "OPUS_BRIDGE_SECRET";

export const getOpusToken = (): string =>
  process.env[OPUS_TOKEN_ENV] || "";

export const getLocalBaseUrl = (port?: number): string =>
  `http://localhost:${port || process.env.PORT || 10000}${OPUS_BASE_PATH}`;

export const getAuthUrl = (path: string, port?: number): string =>
  `${getLocalBaseUrl(port)}${path}?opus_token=${getOpusToken()}`;

export const WORKER_TIMEOUT_MS = 90000;

export const MAX_FILE_LINES_FOR_OVERWRITE = 500;
