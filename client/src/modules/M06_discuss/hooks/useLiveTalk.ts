import { useCallback, useEffect, useRef, useState } from 'react';
import { useSpeechToText } from '../../../hooks/useSpeechToText';

interface UseLiveTalkOptions {
  onTranscript: (text: string) => void;
}

interface AudioLikeResponse {
  audioUrl?: string;
  audio_url?: string;
  audio?: string;
  mimeType?: string;
}

function getAudioUrl(response: AudioLikeResponse | undefined): string | undefined {
  if (!response) return undefined;
  if (response.audioUrl) return response.audioUrl;
  if (response.audio_url) return response.audio_url;
  if (response.audio && response.audio.trim().length > 0) {
    if (response.audio.startsWith('http://') || response.audio.startsWith('https://') || response.audio.startsWith('data:')) {
      return response.audio;
    }
    return `data:${response.mimeType ?? 'audio/wav'};base64,${response.audio}`;
  }
  return undefined;
}

export function useLiveTalk({ onTranscript }: UseLiveTalkOptions) {
  const [showConsent, setShowConsent] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const isActiveRef = useRef(false);
  const isPlayingRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const speech = useSpeechToText('de', (text) => {
    if (isPlayingRef.current) return;
    const spoken = text.trim();
    if (!spoken) return;
    onTranscript(spoken);
  });

  const stopAudio = useCallback(() => {
    if (!currentAudioRef.current) return;
    currentAudioRef.current.pause();
    currentAudioRef.current.currentTime = 0;
    currentAudioRef.current = null;
  }, []);

  const activate = useCallback(() => {
    if (!speech.hasConsent) {
      setShowConsent(true);
      return;
    }
    setIsActive(true);
    isActiveRef.current = true;
    speech.startContinuous();
  }, [speech]);

  const deactivate = useCallback(() => {
    setIsActive(false);
    isActiveRef.current = false;
    speech.stopContinuous();
    speech.setPlaybackActive(false);
    isPlayingRef.current = false;
    stopAudio();
  }, [speech, stopAudio]);

  const toggle = useCallback(() => {
    if (isActiveRef.current) {
      deactivate();
    } else {
      activate();
    }
  }, [activate, deactivate]);

  const acceptConsent = useCallback(() => {
    speech.grantConsent();
    setShowConsent(false);
    setIsActive(true);
    isActiveRef.current = true;
    speech.startContinuous();
  }, [speech]);

  const cancelConsent = useCallback(() => {
    setShowConsent(false);
  }, []);

  const playAudio = useCallback(async (audioUrl: string | undefined): Promise<void> => {
    if (!audioUrl) {
      console.warn('[LiveTalk] playAudio: kein audioUrl');
      return;
    }
    if (!isActiveRef.current) {
      console.log('[LiveTalk] playAudio: LiveTalk nicht aktiv, übersprungen');
      return;
    }

    stopAudio();
    isPlayingRef.current = true;
    speech.setPlaybackActive(true);
    speech.stopContinuous();

    await new Promise<void>((resolve) => {
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      let done = false;

      const finish = () => {
        if (done) return;
        done = true;
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null;
        }
        isPlayingRef.current = false;
        speech.setPlaybackActive(false);
        if (isActiveRef.current && !speech.micBlocked) {
          speech.startContinuous();
        }
        resolve();
      };

      audio.onended = finish;
      audio.onerror = (event) => {
        console.error('[LiveTalk] Audio-Fehler:', event);
        finish();
      };

      // Use play() directly — audio.load()+oncanplay is unreliable for data: URLs (base64 TTS)
      // and leaves isPlayingRef stuck at true, permanently blocking Freisprechen auto-send.
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error('[LiveTalk] play() Fehler:', err);
          finish();
        });
      }
    });
  }, [speech, stopAudio]);

  const playAudioFromResponse = useCallback(async (response: AudioLikeResponse | undefined): Promise<void> => {
    await playAudio(getAudioUrl(response));
  }, [playAudio]);

  useEffect(() => {
    return () => {
      speech.setPlaybackActive(false);
      isPlayingRef.current = false;
      stopAudio();
    };
  }, [speech, stopAudio]);

  return {
    isActive,
    isListening: speech.isListening,
    isSupported: speech.isSupported,
    hasConsent: speech.hasConsent,
    micBlocked: speech.micBlocked,
    transcript: speech.transcript,
    showConsent,
    toggle,
    activate,
    deactivate,
    acceptConsent,
    cancelConsent,
    playAudio,
    playAudioFromResponse,
    resetTranscript: speech.resetTranscript,
  };
}
