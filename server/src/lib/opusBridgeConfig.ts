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

export const WORKER_MAX_OUTPUT_TOKENS = 16000;

export const MEISTER_MAX_OUTPUT_TOKENS = 100000;

export const MEISTER_TOKEN_LIMIT = 100000;

export const WORKER_TOKEN_LIMIT = 16000;

export const PIPELINE_VERSION = "S25-stress-test";

export const S25_TASKS_PUSHED = 7;

export const S25_LAST_RUN = "2026-04-15T07:30:00Z";
export const PIPELINE_STATUS = "operational";
export const PIPELINE_BUILD_ID = "S25-" + Date.now().toString(36);
type JobStatus = "running" | "success" | "failed";
interface OpusJob { id: string; status: JobStatus; instruction: string; startedAt: string; completedAt?: string; result?: unknown; error?: string; }
const opusJobs = new Map<string, OpusJob>();
export function createOpusJob(instruction: string): string {
  const id = "job-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,6);
  opusJobs.set(id, { id, status: "running", instruction, startedAt: new Date().toISOString() });
  return id;
}
export function completeOpusJob(id: string, result: unknown): void {
  const j = opusJobs.get(id);
  if(j){ j.status="success"; j.result=result; j.completedAt=new Date().toISOString(); }
}
export function failOpusJob(id: string, error: string): void {
  const j = opusJobs.get(id);
  if(j){ j.status="failed"; j.error=error; j.completedAt=new Date().toISOString(); }
}
export function getOpusJob(id: string): OpusJob | undefined {
  return opusJobs.get(id);
}
export function listOpusJobs(limit = 20): OpusJob[] {
  return Array.from(opusJobs.values()).slice(-limit).reverse();
}
