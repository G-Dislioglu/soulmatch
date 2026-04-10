import { getAuthUrl } from "./opusBridgeConfig.js";

export async function runSelfTestV2() {
  const start = Date.now();
  const checks: Array<{ name: string; status: string; ms: number; detail: string }> = [];

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const fetchStart = Date.now();
  let fetchStatus = "ok";
  let fetchDetail = "";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(getAuthUrl("/pipeline-info"), { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      fetchStatus = "error";
      fetchDetail = `HTTP ${response.status}`;
    } else {
      fetchDetail = `HTTP ${response.status}`;
    }
  } catch (err) {
    fetchStatus = "error";
    fetchDetail = err instanceof Error ? err.message : String(err);
  }

  checks.push({
    name: "pipeline-info",
    status: fetchStatus,
    ms: Date.now() - fetchStart,
    detail: fetchDetail,
  });

  return {
    status: checks.some((c) => c.status === "error") ? "error" : "ok",
    checks,
    durationMs: Date.now() - start,
  };
}
