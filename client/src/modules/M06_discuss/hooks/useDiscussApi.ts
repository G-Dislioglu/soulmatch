import { useCallback, useEffect, useRef, useState } from 'react';
import { clearGlobalMediaSource, registerGlobalStopHandler, setGlobalRequestRunning } from '../../../lib/globalMediaController';

const DISCUSS_REQUEST_SOURCE = 'm06-discuss-request';

interface DiscussPayload {
  personas: string[];
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  personaSettings?: Record<string, { humor?: number; accentProfile?: 'off' | 'subtle' | 'strict'; voice?: string; accent?: string }>;
  userId?: string;
  appMode?: string;
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
    tts_engine_used?: string;
    tts_mime_type?: string;
  }>;
  creditsUsed?: number;
}

interface StreamCallbacks {
  onTyping?: (persona: string, color: string) => void;
  onText: (persona: string, text: string, color: string) => void;
  onAudio: (persona: string, audioUrl: string, meta?: { ttsEngineUsed?: string; ttsMimeType?: string }) => void;
  onDone?: (creditsUsed?: number) => void;
}

export function useDiscussApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
    setGlobalRequestRunning(DISCUSS_REQUEST_SOURCE, false);
  }, []);

  useEffect(() => registerGlobalStopHandler(DISCUSS_REQUEST_SOURCE, cancel), [cancel]);
  useEffect(() => () => clearGlobalMediaSource(DISCUSS_REQUEST_SOURCE), []);

  const call = useCallback(async (payload: DiscussPayload): Promise<DiscussResponse | null> => {
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setLoading(true);
    setError(null);
    setGlobalRequestRunning(DISCUSS_REQUEST_SOURCE, true);
    try {
      const res = await fetch('/api/discuss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          ...payload,
          personas: payload.personas,
          message: payload.message,
          conversationHistory: payload.conversationHistory ?? [],
          personaSettings: payload.personaSettings,
          appMode: payload.appMode,
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
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      return null;
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      setLoading(false);
      setGlobalRequestRunning(DISCUSS_REQUEST_SOURCE, false);
    }
  }, []);

  const callStream = useCallback(async (
    payload: DiscussPayload,
    callbacks: StreamCallbacks,
  ): Promise<void> => {
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setLoading(true);
    setError(null);
    setGlobalRequestRunning(DISCUSS_REQUEST_SOURCE, true);
    try {
      const res = await fetch('/api/discuss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          ...payload,
          conversationHistory: payload.conversationHistory ?? [],
          personaSettings: payload.personaSettings,
          appMode: payload.appMode,
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
          if (!line.startsWith('data:')) continue;
          try {
            const event = JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
            if (event.type === 'typing' && typeof event.persona === 'string') {
              callbacks.onTyping?.(event.persona, typeof event.color === 'string' ? event.color : '');
            } else if (event.type === 'text' && typeof event.persona === 'string' && typeof event.text === 'string') {
              callbacks.onText(event.persona, event.text, typeof event.color === 'string' ? event.color : '');
            } else if (event.type === 'audio' && typeof event.persona === 'string') {
              const audioUrl =
                (typeof event.audio_url === 'string' ? event.audio_url : undefined)
                ?? (typeof event.audioUrl === 'string' ? event.audioUrl : undefined)
                ?? (typeof event.audio === 'string' ? event.audio : undefined);
              if (audioUrl) {
                console.log('[LiveTalk] onAudio received');
                callbacks.onAudio(event.persona, audioUrl, {
                  ttsEngineUsed: typeof event.tts_engine_used === 'string' ? event.tts_engine_used : undefined,
                  ttsMimeType: typeof event.tts_mime_type === 'string' ? event.tts_mime_type : undefined,
                });
              }
            } else if (event.type === 'done') {
              callbacks.onDone?.(typeof event.creditsUsed === 'number' ? event.creditsUsed : undefined);
            }
          } catch {
            // ignore parse errors on individual SSE lines
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      setLoading(false);
      setGlobalRequestRunning(DISCUSS_REQUEST_SOURCE, false);
    }
  }, []);

  return { call, callStream, cancel, loading, error };
}
