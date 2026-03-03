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
  // Tracks the pending play() promise so stopAudio() can wait for it before
  // calling pause() — prevents "AbortError: play() interrupted by pause()".
  const playPromiseRef = useRef<Promise<void> | null>(null);
  // Stores the finish() callback from the active playAudio() so stopAudio()
  // can trigger cleanup when it interrupts audio that is still loading.
  const finishRef = useRef<(() => void) | null>(null);

  const speech = useSpeechToText('de', (text) => {
    if (isPlayingRef.current) return;
    const spoken = text.trim();
    if (!spoken) return;
    onTranscript(spoken);
  });

  const stopAudio = useCallback(() => {
    const audio = currentAudioRef.current;
    const pending = playPromiseRef.current;
    const pendingFinish = finishRef.current;

    if (!audio && !pending) return;

    // Clear refs immediately so any concurrent call is a no-op.
    currentAudioRef.current = null;
    playPromiseRef.current = null;
    finishRef.current = null;

    const doStop = () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      // Drive the finish callback so isPlayingRef and mic state are always
      // reset, even when audio was stopped before it finished loading.
      pendingFinish?.();
    };

    if (pending) {
      // Wait for play() to settle before pausing. Calling pause() on a
      // still-loading audio element causes the browser to reject the play()
      // promise with AbortError — this eliminates that race entirely.
      pending.then(doStop, doStop);
    } else {
      doStop();
    }
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
    const shouldManageSpeech = isActiveRef.current;
    if (!shouldManageSpeech) {
      console.warn('[LiveTalk] playAudio: LiveTalk nicht aktiv, spiele Audio trotzdem ab');
    }

    // Stop any currently-playing or still-loading audio before starting new.
    stopAudio();
    isPlayingRef.current = true;
    if (shouldManageSpeech) {
      speech.setPlaybackActive(true);
      speech.stopContinuous();
    }

    let playbackUrl = audioUrl;
    let objectUrlToRevoke: string | undefined;
    if (audioUrl.startsWith('data:')) {
      try {
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        objectUrlToRevoke = URL.createObjectURL(blob);
        playbackUrl = objectUrlToRevoke;
        console.log('[LiveTalk] data URL normalized via fetch->blob', {
          mimeType: blob.type,
          byteLength: blob.size,
        });
      } catch (err) {
        console.error('[LiveTalk] data URL normalization failed, fallback to original URL', err);
      }
    }

    await new Promise<void>((resolve) => {

      const audio = new Audio(playbackUrl);
      currentAudioRef.current = audio;
      let done = false;

      // Temporary diagnostics for silent-playback investigation.
      audio.muted = false;
      audio.volume = 1;
      audio.preload = 'auto';

      console.log('[LiveTalk] playAudio start', {
        urlPrefix: playbackUrl.slice(0, 32),
        isDataUrl: audioUrl.startsWith('data:'),
        isBlobUrl: playbackUrl.startsWith('blob:'),
        readyState: audio.readyState,
        networkState: audio.networkState,
      });

      const finish = () => {
        if (done) return;
        done = true;
        playPromiseRef.current = null;
        finishRef.current = null;
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null;
        }
        if (objectUrlToRevoke) {
          URL.revokeObjectURL(objectUrlToRevoke);
          objectUrlToRevoke = undefined;
        }
        isPlayingRef.current = false;
        if (shouldManageSpeech) {
          speech.setPlaybackActive(false);
          if (isActiveRef.current && !speech.micBlocked) {
            speech.startContinuous();
          }
        }
        resolve();
      };

      // Expose finish so stopAudio() can drive cleanup if it interrupts us.
      finishRef.current = finish;

      audio.onloadedmetadata = () => {
        console.log('[LiveTalk] loadedmetadata', {
          duration: audio.duration,
          readyState: audio.readyState,
          networkState: audio.networkState,
        });
      };
      audio.oncanplay = () => {
        console.log('[LiveTalk] canplay', {
          currentTime: audio.currentTime,
          duration: audio.duration,
          readyState: audio.readyState,
        });
      };
      audio.onplay = () => {
        console.log('[LiveTalk] onplay', {
          currentTime: audio.currentTime,
          volume: audio.volume,
          muted: audio.muted,
        });
      };
      audio.onended = finish;
      audio.onerror = (event) => {
        console.error('[LiveTalk] Audio-Fehler:', event);
        finish();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        // Store so stopAudio() can wait for it before calling pause().
        playPromiseRef.current = playPromise;
        playPromise.catch((err: unknown) => {
          // AbortError is expected only if stopAudio() somehow called pause()
          // without waiting for the promise (should not happen after this fix).
          // Log everything else as a genuine error.
          if ((err as DOMException).name !== 'AbortError') {
            console.error('[LiveTalk] play() Fehler:', err);
          }
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
