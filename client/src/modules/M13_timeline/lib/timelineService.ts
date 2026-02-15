/* ═══════════════════════════════════════════
   TimelineService — localStorage CRUD
   Cap: 200 entries, newest first
   ═══════════════════════════════════════════ */

import type { TimelineEntry, TimelineEntryType } from './types';

const STORAGE_KEY = 'soulmatch_timeline';
const MAX_ENTRIES = 200;

function uid(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function load(): TimelineEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(entries: TimelineEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

/* ── Public API ── */

export function getEntries(): TimelineEntry[] {
  return load();
}

export function addEntry(
  type: TimelineEntryType,
  title: string,
  preview: string,
  metadata?: TimelineEntry['metadata'],
): TimelineEntry {
  const entries = load();
  const entry: TimelineEntry = {
    id: uid(),
    type,
    title,
    preview: preview.slice(0, 80),
    timestamp: new Date().toISOString(),
    metadata,
  };
  entries.unshift(entry);
  save(entries);
  return entry;
}

export function removeEntry(id: string): void {
  const entries = load().filter((e) => e.id !== id);
  save(entries);
}

export function clearAll(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Most recent entry of a given type */
export function getLatestByType(type: TimelineEntryType): TimelineEntry | undefined {
  return load().find((e) => e.type === type);
}

/** Count entries by type */
export function countByType(type: TimelineEntryType): number {
  return load().filter((e) => e.type === type).length;
}
