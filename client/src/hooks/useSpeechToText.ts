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
  const transcriptRef = useRef('');
  const onAutoSendRef = useRef(onAutoSend);

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
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript as string;
      setTranscript(text);
      transcriptRef.current = text;
    };

    recognition.onend = () => {
      setIsListening(false);

      // CONTINUOUS MODE: Auto-send after speech pause, then restart
      if (isContinuousModeRef.current) {
        const currentTranscript = transcriptRef.current;

        if (currentTranscript && currentTranscript.trim().length > 0) {
          // Auto-send the transcript
          onAutoSendRef.current?.(currentTranscript.trim());
          setTranscript('');
          transcriptRef.current = '';
        }

        // Restart listening after short pause (500ms)
        setTimeout(() => {
          if (isContinuousModeRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
              setIsListening(true);
            } catch {
              // Already started or aborted — ignore
            }
          }
        }, 500);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        // Silence — just restart if in continuous mode
        if (isContinuousModeRef.current) {
          setTimeout(() => {
            if (isContinuousModeRef.current && recognitionRef.current) {
              try { recognitionRef.current.start(); } catch { /* ignore */ }
            }
          }, 300);
        }
      } else if (event.error === 'not-allowed') {
        // Permission denied — stop continuous mode
        isContinuousModeRef.current = false;
        setIsContinuousMode(false);
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
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
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
    isContinuousModeRef.current = true;
    setIsContinuousMode(true);
    setTranscript('');
    transcriptRef.current = '';
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch { /* already started */ }
  }, []);

  const stopContinuous = useCallback(() => {
    isContinuousModeRef.current = false;
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
