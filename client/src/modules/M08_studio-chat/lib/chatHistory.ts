import type { StudioSeat } from '../../../shared/types/studio';

export interface ChatMessage {
  role: 'user' | 'persona';
  seat: StudioSeat;
  text: string;
  timestamp: string;
}

const KEY_PREFIX = 'soulmatch.chat.';
const MAX_MESSAGES = 100;

function storageKey(seat: StudioSeat): string {
  return `${KEY_PREFIX}${seat}`;
}

export function loadChatHistory(seat: StudioSeat): ChatMessage[] {
  const raw = localStorage.getItem(storageKey(seat));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendMessage(seat: StudioSeat, msg: ChatMessage): ChatMessage[] {
  const history = loadChatHistory(seat);
  history.push(msg);
  const trimmed = history.slice(-MAX_MESSAGES);
  localStorage.setItem(storageKey(seat), JSON.stringify(trimmed));
  return trimmed;
}

export function clearChatHistory(seat: StudioSeat): void {
  localStorage.removeItem(storageKey(seat));
}
