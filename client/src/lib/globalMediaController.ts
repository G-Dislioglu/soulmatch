import { useSyncExternalStore } from 'react';

type StopHandler = () => void;

interface GlobalMediaSnapshot {
  audioPlaying: boolean;
  requestRunning: boolean;
}

const listeners = new Set<() => void>();
const stopHandlers = new Map<string, StopHandler>();
const activeAudioSources = new Set<string>();
const activeRequestSources = new Set<string>();
let snapshot: GlobalMediaSnapshot = {
  audioPlaying: false,
  requestRunning: false,
};

function refreshSnapshot() {
  snapshot = {
    audioPlaying: activeAudioSources.size > 0,
    requestRunning: activeRequestSources.size > 0,
  };
}

function emit() {
  refreshSnapshot();
  listeners.forEach((listener) => listener());
}

function getSnapshot(): GlobalMediaSnapshot {
  return snapshot;
}

export function useGlobalMediaState(): GlobalMediaSnapshot {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot,
    getSnapshot,
  );
}

export function setGlobalAudioPlaying(source: string, active: boolean) {
  if (active) {
    activeAudioSources.add(source);
  } else {
    activeAudioSources.delete(source);
  }
  emit();
}

export function setGlobalRequestRunning(source: string, active: boolean) {
  if (active) {
    activeRequestSources.add(source);
  } else {
    activeRequestSources.delete(source);
  }
  emit();
}

export function registerGlobalStopHandler(source: string, handler: StopHandler) {
  stopHandlers.set(source, handler);
  return () => {
    if (stopHandlers.get(source) === handler) {
      stopHandlers.delete(source);
    }
  };
}

export function stopGlobalMedia() {
  stopHandlers.forEach((handler) => {
    try {
      handler();
    } catch (error) {
      console.error('[globalMediaController] stop handler failed', error);
    }
  });
}

export function clearGlobalMediaSource(source: string) {
  activeAudioSources.delete(source);
  activeRequestSources.delete(source);
  stopHandlers.delete(source);
  emit();
}