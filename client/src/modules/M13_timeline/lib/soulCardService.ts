/* ═══════════════════════════════════════════
   SoulCardService — localStorage CRUD
   ═══════════════════════════════════════════ */

import type { SoulCard, SoulCardProposal } from './types';

const STORAGE_KEY = 'soulmatch_soul_cards';

function uid(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function load(): SoulCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(cards: SoulCard[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

/* ── Public API ── */

export function getCards(): SoulCard[] {
  return load();
}

export function getConfirmedCards(): SoulCard[] {
  return load().filter((c) => c.confirmedByUser);
}

export function getCardById(id: string): SoulCard | undefined {
  return load().find((c) => c.id === id);
}

export function createCardFromProposal(
  proposal: SoulCardProposal,
  sourceEntryId: string,
  sourceType: SoulCard['sourceType'],
): SoulCard {
  const card: SoulCard = {
    id: uid(),
    title: proposal.title.slice(0, 40),
    essence: proposal.essence,
    tags: proposal.tags.slice(0, 5),
    sourceEntryId,
    sourceType,
    createdAt: new Date().toISOString(),
    confirmedByUser: false,
  };
  const cards = load();
  cards.unshift(card);
  save(cards);
  return card;
}

export function confirmCard(id: string): void {
  const cards = load();
  const card = cards.find((c) => c.id === id);
  if (card) {
    card.confirmedByUser = true;
    save(cards);
  }
}

export function updateCard(id: string, updates: Partial<Pick<SoulCard, 'title' | 'essence' | 'tags'>>): void {
  const cards = load();
  const card = cards.find((c) => c.id === id);
  if (card) {
    if (updates.title !== undefined) card.title = updates.title.slice(0, 40);
    if (updates.essence !== undefined) card.essence = updates.essence;
    if (updates.tags !== undefined) card.tags = updates.tags.slice(0, 5);
    save(cards);
  }
}

export function deleteCard(id: string): void {
  save(load().filter((c) => c.id !== id));
}

export function addCrossing(cardId: string, crossedWithId: string, resultCardId: string): void {
  const cards = load();
  const card = cards.find((c) => c.id === cardId);
  if (card) {
    card.crossedWith = [...(card.crossedWith ?? []), crossedWithId];
    card.crossingResults = [...(card.crossingResults ?? []), resultCardId];
    save(cards);
  }
}
