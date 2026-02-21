import { useState, useEffect } from "react";

const CACHE_KEY = "soulmatch_asset_images";
const URL_TTL_MS = 20 * 60 * 60 * 1000; // 20h (fal.ai URLs ~24h gültig)

interface CacheEntry {
  url: string;
  generatedAt: number;
}

function readCache(): Record<string, CacheEntry> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as Record<string, CacheEntry>;
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore quota errors */ }
}

function getCached(key: string): string | null {
  const cache = readCache();
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.generatedAt > URL_TTL_MS) {
    // Expired — remove
    const next = { ...cache };
    delete next[key];
    writeCache(next);
    return null;
  }
  return entry.url;
}

function setCached(key: string, url: string) {
  const cache = readCache();
  cache[key] = { url, generatedAt: Date.now() };
  writeCache(cache);
}

export function clearAssetCache() {
  localStorage.removeItem(CACHE_KEY);
}

// ── Main Hook ─────────────────────────────────────────────────────────────────
// type: 'room' | 'persona'
// id:   z.B. 'stern', 'maya'
// autoGenerate: wenn true, wird automatisch generiert wenn kein Bild vorhanden
export function useAssetImage(
  type: "room" | "persona",
  id: string,
  autoGenerate = true
): { url: string | null; loading: boolean; error: string | null; regenerate: () => void } {
  const cacheKey = `${type}:${id}`;
  const [url, setUrl] = useState<string | null>(() => getCached(cacheKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/zimage/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        if (res.status === 400 && data.error === "FAL_KEY not configured") {
          setError("no_key");
        } else {
          setError(data.error ?? "Fehler");
        }
        return;
      }

      const data = await res.json() as { url: string };
      setCached(cacheKey, data.url);
      setUrl(data.url);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!url && autoGenerate && !loading) {
      void generate();
    }
  }, [id, type]); // eslint-disable-line react-hooks/exhaustive-deps

  return { url, loading, error, regenerate: generate };
}
