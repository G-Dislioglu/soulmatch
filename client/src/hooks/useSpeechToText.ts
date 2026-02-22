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
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  grantConsent: () => void;
}

export function useSpeechToText(language = 'de'): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

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
      setTranscript(result[0].transcript as string);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    return () => { recognition.abort(); };
  }, [language]);

  const grantConsent = useCallback(() => {
    localStorage.setItem(SPEECH_CONSENT_KEY, 'true');
    setHasConsent(true);
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
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

  const resetTranscript = useCallback(() => setTranscript(''), []);

  return { isListening, transcript, isSupported, hasConsent, startListening, stopListening, resetTranscript, grantConsent };
}
