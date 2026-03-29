import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'soulmatch_shell_livetalk';

export interface LiveTalkState {
  liveTalkActive: boolean;
  ttsEnabled: boolean;
  micEnabled: boolean;
  autoSend: boolean;
  selectedVoice: string;
}

export interface LiveTalkController extends LiveTalkState {
  toggleLiveTalk: () => void;
  toggleTTS: () => void;
  toggleMic: () => void;
  toggleAutoSend: () => void;
  setVoice: (voice: string) => void;
  setLiveTalkActive: (active: boolean) => void;
}

const DEFAULT_STATE: LiveTalkState = {
  liveTalkActive: false,
  ttsEnabled: true,
  micEnabled: true,
  autoSend: true,
  selectedVoice: 'Aoede',
};

function loadInitialState(): LiveTalkState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STATE;
    }

    const parsed = JSON.parse(raw) as Partial<LiveTalkState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function useLiveTalk(): LiveTalkController {
  const [state, setState] = useState<LiveTalkState>(loadInitialState);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const toggleLiveTalk = useCallback(() => {
    setState((current) => {
      const nextActive = !current.liveTalkActive;
      if (!nextActive) {
        return {
          ...current,
          liveTalkActive: false,
        };
      }

      return {
        ...current,
        liveTalkActive: true,
        micEnabled: current.micEnabled || true,
        ttsEnabled: current.ttsEnabled || true,
      };
    });
  }, []);

  const toggleTTS = useCallback(() => {
    setState((current) => ({
      ...current,
      ttsEnabled: !current.ttsEnabled,
    }));
  }, []);

  const toggleMic = useCallback(() => {
    setState((current) => ({
      ...current,
      micEnabled: !current.micEnabled,
    }));
  }, []);

  const toggleAutoSend = useCallback(() => {
    setState((current) => ({
      ...current,
      autoSend: !current.autoSend,
    }));
  }, []);

  const setVoice = useCallback((voice: string) => {
    setState((current) => ({
      ...current,
      selectedVoice: voice,
    }));
  }, []);

  const setLiveTalkActive = useCallback((active: boolean) => {
    setState((current) => ({
      ...current,
      liveTalkActive: active,
    }));
  }, []);

  return useMemo(
    () => ({
      ...state,
      toggleLiveTalk,
      toggleTTS,
      toggleMic,
      toggleAutoSend,
      setVoice,
      setLiveTalkActive,
    }),
    [state, toggleAutoSend, toggleLiveTalk, toggleMic, toggleTTS, setLiveTalkActive, setVoice],
  );
}