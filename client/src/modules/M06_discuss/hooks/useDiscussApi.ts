import { useCallback, useState } from 'react';

interface DiscussPayload {
  personas: string[];
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  userId?: string;
  stream?: boolean;
  audioMode?: boolean;
}

interface DiscussResponse {
  responses: Array<{
    persona: string;
    text: string;
    color: string;
    meta?: unknown;
    audio_url?: string;
    audio?: string;
    mimeType?: string;
  }>;
  creditsUsed?: number;
}

export function useDiscussApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(async (payload: DiscussPayload): Promise<DiscussResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/discuss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          personas: payload.personas,
          message: payload.message,
          conversationHistory: payload.conversationHistory ?? [],
          stream: false,
          audioMode: payload.audioMode ?? false,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      return data as DiscussResponse;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { call, loading, error };
}
