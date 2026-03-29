import { useState, useEffect, useRef, useCallback } from 'react';

const LANGUAGE_MAP: Record<string, string> = {
  de: 'de-DE', tr: 'tr-TR', en: 'en-US', es: 'es-ES',
  fr: 'fr-FR', it: 'it-IT', pt: 'pt-PT', ar: 'ar-SA', hi: 'hi-IN',
};

const SPEECH_CONSENT_KEY = 'soulmatch_speech_consent';

export interface UseSpeechToTextReturn {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  hasConsent: boolean;
  isContinuousMode: boolean;
  micBlocked: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  grantConsent: () => void;
  startContinuous: () => void;
  stopContinuous: () => void;
  setPlaybackActive: (active: boolean) => void;
}

export function useSpeechToText(
  language = 'de',
  onAutoSend?: (text: string) => void
): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isContinuousModeRef = useRef(false);
  const runningRef = useRef(false);          // true while recognition.start() is active
  const restartTimerRef = useRef<number | null>(null); // pending restart handle
  const shouldAutoSendOnEndRef = useRef(false);
  const transcriptRef = useRef('');
  const onAutoSendRef = useRef(onAutoSend);
  const debounceTimerRef = useRef<number | null>(null);
  const accumulatedFinalTextRef = useRef('');
  const isPlaybackActiveRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const lastStartAtRef = useRef(0);       // timestamp of last recognition.start() call
  const startAttemptRef = useRef(0);     // consecutive restart attempts (for backoff)
  const abortLoopGuardRef = useRef(false);
  const noSpeechStreakRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { onAutoSendRef.current = onAutoSend; }, [onAutoSend]);
  useEffect(() => { isContinuousModeRef.current = isContinuousMode; }, [isContinuousMode]);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor = (w['SpeechRecognition'] ?? w['webkitSpeechRecognition']) as (new () => any) | undefined;

    if (!Ctor) { setIsSupported(false); return; }

    setIsSupported(true);
    setHasConsent(localStorage.getItem(SPEECH_CONSENT_KEY) === 'true');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new Ctor();
    recognition.lang = LANGUAGE_MAP[language] ?? 'de-DE';
    recognition.continuous = true;
    recognition.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      if (isPlaybackActiveRef.current) return;

      noSpeechStreakRef.current = 0;

      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          accumulatedFinalTextRef.current += `${result[0].transcript} `;

          if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current);
          }

          debounceTimerRef.current = window.setTimeout(() => {
            const finalText = accumulatedFinalTextRef.current.trim();
            if (finalText.length > 0 && onAutoSendRef.current) {
              onAutoSendRef.current(finalText);
              accumulatedFinalTextRef.current = '';
              setTranscript('');
              transcriptRef.current = '';
            }
          }, 2000);
        } else {
          interimText += result[0].transcript;
        }
      }

      const text = `${accumulatedFinalTextRef.current}${interimText}`.trim();
      console.log('[speech] onresult:', text);
      setTranscript(text);
      transcriptRef.current = text;
    };

    // safeStart: only start if shouldRun=true AND not already running (no stale closure)
    const safeStart = () => {
      if (isPlaybackActiveRef.current) return;
      if (!isContinuousModeRef.current || !recognitionRef.current || runningRef.current) return;
      if (restartTimerRef.current) { window.clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
      // Throttle: prevent start() spam closer than 200ms
      const now = Date.now();
      if (now - lastStartAtRef.current < 200) {
        const delay = Math.min(300 + startAttemptRef.current * 150, 1000);
        restartTimerRef.current = window.setTimeout(safeStart, delay);
        return;
      }
      try {
        recognitionRef.current.start();
        lastStartAtRef.current = Date.now();
        startAttemptRef.current += 1;
        runningRef.current = true;
        setIsListening(true);
        console.log('[speech] mic started');
      } catch (e: any) {
        if (e.name === 'InvalidStateError') {
          runningRef.current = true;
          setIsListening(true);
        } else {
          console.warn('[speech] safeStart failed:', e);
          const delay = Math.min(300 + startAttemptRef.current * 150, 1000);
          startAttemptRef.current += 1;
          if (isContinuousModeRef.current) {
            restartTimerRef.current = window.setTimeout(safeStart, delay);
          }
        }
      }
    };

    recognition.onstart = () => {
      startAttemptRef.current = 0; // successful start — reset backoff counter
      abortLoopGuardRef.current = false;
      console.log('[speech] onstart');
    };

    recognition.onend = () => {
      runningRef.current = false;
      setIsListening(false);
      console.log('[speech] onend, shouldRun:', isContinuousModeRef.current, 'noSpeechStreak:', noSpeechStreakRef.current);

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // Fallback to the visible transcript when the browser ends recognition
      // without ever promoting the utterance to a final segment.
      const text = accumulatedFinalTextRef.current.trim() || transcriptRef.current.trim();
      if (text.length > 0 && (isContinuousModeRef.current || shouldAutoSendOnEndRef.current) && onAutoSendRef.current) {
        console.log('[speech] auto-sending:', text);
        onAutoSendRef.current(text);
      }
      accumulatedFinalTextRef.current = '';
      setTranscript('');
      transcriptRef.current = '';

      if (abortLoopGuardRef.current && isContinuousModeRef.current) {
        // Avoid infinite mic restart loops seen in Chromium when onerror='aborted' repeats.
        abortLoopGuardRef.current = false;
        isContinuousModeRef.current = false;
        shouldAutoSendOnEndRef.current = false;
        setIsContinuousMode(false);
        console.warn('[speech] continuous mode stopped after aborted error to prevent restart loop');
        return;
      }

      // Restart only if continuous mode is still active and audio is not playing
      if (isContinuousModeRef.current && !isPlaybackActiveRef.current) {
        const baseDelay = Math.min(300 + startAttemptRef.current * 150, 1000);
        const noSpeechDelay = noSpeechStreakRef.current > 0
          ? Math.min(1200 + noSpeechStreakRef.current * 400, 5000)
          : 0;
        const delay = Math.max(baseDelay, noSpeechDelay);
        restartTimerRef.current = window.setTimeout(safeStart, delay);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.log('[speech] error:', event.error);
      if (event.error === 'no-speech') {
        noSpeechStreakRef.current += 1;
        return; // silence during continuous — recognition keeps running
      }
      if (event.error === 'aborted') {
        // aborted fires before onend — mark guard so onend can stop continuous mode once.
        abortLoopGuardRef.current = true;
        runningRef.current = false;
        return;
      }
      runningRef.current = false;
      setIsListening(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        isContinuousModeRef.current = false;
        shouldAutoSendOnEndRef.current = false;
        setIsContinuousMode(false);
        setMicBlocked(true);
        setTranscript('');
        transcriptRef.current = '';
      }
    };

    recognitionRef.current = recognition;

    // Visibility change handler for continuous mode
    const handleVisibilityChange = () => {
      if (document.hidden && isContinuousModeRef.current) {
        // Tab lost focus — pause listening
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      } else if (!document.hidden && isContinuousModeRef.current) {
        // Tab regained focus — resume listening
        setTimeout(() => {
          if (isContinuousModeRef.current && recognitionRef.current) {
            try { recognitionRef.current.start(); setIsListening(true); } catch { /* ignore */ }
          }
        }, 300);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      recognition.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (micStreamRef.current) {
        try {
          micStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch {
          // ignore
        }
        micStreamRef.current = null;
      }
    };
  }, [language]);

  const ensureMicStream = useCallback(async () => {
    if (micStreamRef.current) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;
    } catch {
      // best-effort
    }
  }, []);

  const grantConsent = useCallback(() => {
    localStorage.setItem(SPEECH_CONSENT_KEY, 'true');
    setHasConsent(true);
    void ensureMicStream();
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      void ensureMicStream();
      accumulatedFinalTextRef.current = '';
      setTranscript('');
      transcriptRef.current = '';
      shouldAutoSendOnEndRef.current = true;
      try {
        recognitionRef.current.start();
        setIsListening(true);
        console.log('[STT] started');
      } catch (e) {
        console.warn('[speech] start failed', e);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      shouldAutoSendOnEndRef.current = false;
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    accumulatedFinalTextRef.current = '';
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setTranscript('');
    transcriptRef.current = '';
  }, []);

  const setPlaybackActive = useCallback((active: boolean) => {
    isPlaybackActiveRef.current = active;
    if (active && restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (active && recognitionRef.current && runningRef.current) {
      try {
        recognitionRef.current.stop(); // use stop() not abort() to avoid error loop
      } catch { /* ignore */ }
    }
  }, []);

  const startContinuous = useCallback(() => {
    if (!recognitionRef.current) return;
    if (runningRef.current) return; // guard: already running
    console.log('[speech] startContinuous called');
    // Cancel any pending restart timer
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    isContinuousModeRef.current = true;
    shouldAutoSendOnEndRef.current = true;
    setIsContinuousMode(true);
    setMicBlocked(false);
    accumulatedFinalTextRef.current = '';
    setTranscript('');
    transcriptRef.current = '';
    // Release getUserMedia stream for exclusive mic access
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    try {
      recognitionRef.current.start();
      runningRef.current = true;
      setIsListening(true);
      console.log('[speech] mic started (continuous)');
    } catch (e: any) {
      if (e.name === 'InvalidStateError') {
        runningRef.current = true; // already running — treat as success
        setIsListening(true);
      } else {
        console.warn('[speech] startContinuous failed:', e);
      }
    }
  }, []);

  const stopContinuous = useCallback(() => {
    isContinuousModeRef.current = false;
    shouldAutoSendOnEndRef.current = false;
    setIsContinuousMode(false);
    accumulatedFinalTextRef.current = '';
    // Cancel any pending restart timer
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (recognitionRef.current && runningRef.current) {
      recognitionRef.current.stop();
    }
    runningRef.current = false;
    setIsListening(false);
    setTranscript('');
    transcriptRef.current = '';
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    hasConsent,
    isContinuousMode,
    micBlocked,
    startListening,
    stopListening,
    resetTranscript,
    grantConsent,
    startContinuous,
    stopContinuous,
    setPlaybackActive,
  };
}
