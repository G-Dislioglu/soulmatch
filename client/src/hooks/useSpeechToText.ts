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
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  grantConsent: () => void;
  startContinuous: () => void;
  stopContinuous: () => void;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isContinuousModeRef = useRef(false);
  const shouldAutoSendOnEndRef = useRef(false);
  const transcriptRef = useRef('');
  const onAutoSendRef = useRef(onAutoSend);
  const stopTimerRef = useRef<number | null>(null);
  const fallbackStopTimerRef = useRef<number | null>(null);
  const noNewWordsTimerRef = useRef<number | null>(null);
  const lastStableTextRef = useRef<string>('');

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
    recognition.continuous = false;
    recognition.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      // Accumulate ALL final results + current interim
      let finalText = '';
      let interimText = '';
      
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText = result[0].transcript;
        }
      }
      
      // Use final text if available, otherwise interim
      const text = finalText || interimText;
      console.log('[speech] onresult:', text);
      setTranscript(text);
      transcriptRef.current = text;

      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
      if (fallbackStopTimerRef.current) window.clearTimeout(fallbackStopTimerRef.current);
      if (noNewWordsTimerRef.current) window.clearTimeout(noNewWordsTimerRef.current);

      if (!(isContinuousModeRef.current || shouldAutoSendOnEndRef.current) || text.trim().length === 0) {
        lastStableTextRef.current = text;
        return;
      }

      const normalized = text.trim().toLowerCase();
      const words = normalized.split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      const endsWithPunctuation = /[.!?]$/.test(normalized);
      const endsWithCommonEndWord = (() => {
        const endPhrases = [
          'okay',
          'danke',
          'bitte',
          'ja',
          'nein',
          'genau',
          'stimmt',
          'alles klar',
          'verstanden',
        ];

        return endPhrases.some((p) => normalized === p || normalized.endsWith(` ${p}`));
      })();

      const stopRecognition = (reason: string) => {
        if (!(isContinuousModeRef.current || shouldAutoSendOnEndRef.current) || !recognitionRef.current) return;
        console.log('[speech] stopping recognition:', reason);
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('[speech] stop failed:', e);
        }
      };

      // Fast path: explicit sentence-end signals => auto-send after ~800ms
      if (endsWithPunctuation || endsWithCommonEndWord) {
        stopTimerRef.current = window.setTimeout(() => stopRecognition('end-signal (800ms)'), 800);
        lastStableTextRef.current = text;
        return;
      }

      // Medium path: sentence has >= 4 words and then 2s no new words => auto-send after 800ms
      lastStableTextRef.current = text;
      if (wordCount >= 4) {
        noNewWordsTimerRef.current = window.setTimeout(() => {
          if (!(isContinuousModeRef.current || shouldAutoSendOnEndRef.current)) return;
          if (transcriptRef.current !== lastStableTextRef.current) return;
          stopTimerRef.current = window.setTimeout(() => stopRecognition('no-new-words-2s (800ms)'), 800);
        }, 2000);
      }

      // Fallback: stop after 3000ms complete silence
      fallbackStopTimerRef.current = window.setTimeout(() => stopRecognition('silence-3s (fallback)'), 3000);
    };

    recognition.onend = () => {
      console.log('[speech] onend, continuous:', isContinuousModeRef.current, 'transcript:', transcriptRef.current);
      setIsListening(false);

      // Auto-send + optional auto-restart (handsfree session)
      if (isContinuousModeRef.current || shouldAutoSendOnEndRef.current) {
        const text = transcriptRef.current?.trim();

        if (text && text.length > 0 && onAutoSendRef.current) {
          console.log('[speech] auto-sending:', text);
          onAutoSendRef.current(text);
        }

        setTranscript('');
        transcriptRef.current = '';

        if (stopTimerRef.current) { window.clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
        if (fallbackStopTimerRef.current) { window.clearTimeout(fallbackStopTimerRef.current); fallbackStopTimerRef.current = null; }
        if (noNewWordsTimerRef.current) { window.clearTimeout(noNewWordsTimerRef.current); noNewWordsTimerRef.current = null; }
        lastStableTextRef.current = '';

        // Handsfree: restart mic after short pause, until user explicitly stops
        setTimeout(() => {
          if ((isContinuousModeRef.current || shouldAutoSendOnEndRef.current) && recognitionRef.current) {
            try {
              recognitionRef.current.start();
              setIsListening(true);
              console.log('[speech] mic restarted');
            } catch (e) {
              console.error('[speech] restart failed:', e);
            }
          }
        }, 800);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.log('[speech] error:', event.error);
      if (event.error === 'no-speech') {
        // Silence — just restart if handsfree is active
        if (isContinuousModeRef.current || shouldAutoSendOnEndRef.current) {
          setTimeout(() => {
            if ((isContinuousModeRef.current || shouldAutoSendOnEndRef.current) && recognitionRef.current) {
              try {
                recognitionRef.current.start();
                setIsListening(true);
              } catch {
                // ignore
              }
            }
          }, 300);
        }
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        // Permission denied — stop continuous mode
        isContinuousModeRef.current = false;
        shouldAutoSendOnEndRef.current = false;
        setIsContinuousMode(false);
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
        setTranscript('');
        transcriptRef.current = '';
      }
      setIsListening(false);
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
      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      if (fallbackStopTimerRef.current) {
        window.clearTimeout(fallbackStopTimerRef.current);
        fallbackStopTimerRef.current = null;
      }
      if (noNewWordsTimerRef.current) {
        window.clearTimeout(noNewWordsTimerRef.current);
        noNewWordsTimerRef.current = null;
      }
      recognition.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [language]);

  const grantConsent = useCallback(() => {
    localStorage.setItem(SPEECH_CONSENT_KEY, 'true');
    setHasConsent(true);
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      transcriptRef.current = '';
      shouldAutoSendOnEndRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
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
    setTranscript('');
    transcriptRef.current = '';
  }, []);

  const startContinuous = useCallback(() => {
    if (!recognitionRef.current) return;
    console.log('[speech] startContinuous called');
    isContinuousModeRef.current = true;
    shouldAutoSendOnEndRef.current = true;
    setIsContinuousMode(true);
    setTranscript('');
    transcriptRef.current = '';
    try {
      recognitionRef.current.start();
      setIsListening(true);
      console.log('[speech] mic started, isContinuousMode=true');
    } catch (e) { console.log('[speech] start failed:', e); /* already started */ }
  }, []);

  const stopContinuous = useCallback(() => {
    isContinuousModeRef.current = false;
    shouldAutoSendOnEndRef.current = false;
    setIsContinuousMode(false);
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
    startListening,
    stopListening,
    resetTranscript,
    grantConsent,
    startContinuous,
    stopContinuous,
  };
}
