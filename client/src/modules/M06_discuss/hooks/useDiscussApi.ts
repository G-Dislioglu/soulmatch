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

interface StreamCallbacks {
  onText: (persona: string, text: string, color: string) => void;
  onAudio: (persona: string, audioUrl: string) => void;
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

  const callStream = useCallback(async (
    payload: DiscussPayload,
    callbacks: StreamCallbacks,
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/discuss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          conversationHistory: payload.conversationHistory ?? [],
          stream: true,
          audioMode: payload.audioMode ?? false,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as Record<string, unknown>;
            if (event.type === 'text' && typeof event.persona === 'string' && typeof event.text === 'string') {
              callbacks.onText(event.persona, event.text, typeof event.color === 'string' ? event.color : '');
            } else if (event.type === 'audio' && typeof event.persona === 'string' && typeof event.audio_url === 'string') {
              callbacks.onAudio(event.persona, event.audio_url);
            }
          } catch {
            // ignore parse errors on individual SSE lines
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, []);

  return { call, callStream, loading, error };
}
