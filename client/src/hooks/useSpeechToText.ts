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
  const shouldAutoSendOnEndRef = useRef(false);
  const transcriptRef = useRef('');
  const onAutoSendRef = useRef(onAutoSend);
  const debounceTimerRef = useRef<number | null>(null);
  const accumulatedFinalTextRef = useRef('');
  const isPlaybackActiveRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);

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

    recognition.onend = () => {
      console.log('[speech] onend, continuous:', isContinuousModeRef.current, 'transcript:', transcriptRef.current);
      setIsListening(false);

      if (isPlaybackActiveRef.current) {
        return;
      }

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // Auto-send + optional auto-restart (handsfree session)
      if (isContinuousModeRef.current || shouldAutoSendOnEndRef.current) {
        const text = accumulatedFinalTextRef.current.trim();

        if (text && text.length > 0 && onAutoSendRef.current) {
          console.log('[speech] auto-sending:', text);
          onAutoSendRef.current(text);
        }

        accumulatedFinalTextRef.current = '';

        setTranscript('');
        transcriptRef.current = '';

        // Handsfree: restart mic after short pause, until user explicitly stops
        setTimeout(() => {
          if ((isContinuousModeRef.current || shouldAutoSendOnEndRef.current) && recognitionRef.current) {
            try {
              // Ensure we don't start if already listening
              if (!isListening) {
                recognitionRef.current.start();
                setIsListening(true);
                console.log('[speech] mic restarted');
              }
            } catch (e: any) {
              if (e.name === 'InvalidStateError') {
                // Already started, this is fine.
                setIsListening(true);
              } else {
                console.error('[speech] restart failed:', e);
              }
            }
          }
        }, 800);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.log('[speech] error:', event.error);
      if (event.error === 'no-speech') {
        // With continuous=true the recognition keeps running after silence — ignore
        return;
      }
      setIsListening(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        // Permission denied — stop continuous mode
        isContinuousModeRef.current = false;
        shouldAutoSendOnEndRef.current = false;
        setIsContinuousMode(false);
        setMicBlocked(true);
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
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
    if (active) {
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      setIsListening(false);
    }
  }, []);

  const startContinuous = useCallback(() => {
    if (!recognitionRef.current) return;
    console.log('[speech] startContinuous called');
    isContinuousModeRef.current = true;
    shouldAutoSendOnEndRef.current = true;
    setIsContinuousMode(true);
    setMicBlocked(false);
    accumulatedFinalTextRef.current = '';
    setTranscript('');
    transcriptRef.current = '';

    // Release any open getUserMedia stream so the Recognition API
    // gets exclusive mic access (holding both simultaneously causes conflicts).
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    const doStart = (attempt: number) => {
      if (!isContinuousModeRef.current || !recognitionRef.current) return;
      try {
        recognitionRef.current.start();
        setIsListening(true);
        console.log('[speech] mic started (continuous), attempt', attempt);
      } catch (e: any) {
        if (e.name === 'InvalidStateError' && attempt < 5) {
          window.setTimeout(() => doStart(attempt + 1), 250);
        } else {
          console.warn('[speech] startContinuous failed:', e);
        }
      }
    };
    doStart(0);
  }, []);

  const stopContinuous = useCallback(() => {
    isContinuousModeRef.current = false;
    shouldAutoSendOnEndRef.current = false;
    setIsContinuousMode(false);
    accumulatedFinalTextRef.current = '';
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
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
