import type { UserProfile } from '../../../shared/types/profile';

const LEGACY_KEY = 'soulmatch.profile.v1';
const PROFILES_KEY = 'soulmatch.profiles.v1';
const CURRENT_ID_KEY = 'soulmatch.profile.currentId';

export type ProfileErrors = Partial<Record<'name' | 'birthDate' | 'birthTime' | 'birthPlace', string>>;

export interface ProfileDraft {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
}

export function validateProfileDraft(draft: ProfileDraft): ProfileErrors {
  const errors: ProfileErrors = {};

  const trimmedName = draft.name.trim();
  if (trimmedName.length < 2) {
    errors.name = 'Name muss mindestens 2 Zeichen lang sein.';
  } else if (trimmedName.length > 40) {
    errors.name = 'Name darf maximal 40 Zeichen lang sein.';
  }

  if (!draft.birthDate) {
    errors.birthDate = 'Geburtsdatum ist erforderlich.';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate)) {
    errors.birthDate = 'Geburtsdatum muss im Format YYYY-MM-DD sein.';
  } else {
    const parsed = new Date(draft.birthDate);
    if (isNaN(parsed.getTime())) {
      errors.birthDate = 'Geburtsdatum ist ungültig.';
    } else if (parsed > new Date()) {
      errors.birthDate = 'Geburtsdatum darf nicht in der Zukunft liegen.';
    }
  }

  if (draft.birthTime) {
    if (!/^\d{2}:\d{2}$/.test(draft.birthTime)) {
      errors.birthTime = 'Geburtszeit muss im Format HH:MM sein.';
    } else {
      const [h, m] = draft.birthTime.split(':').map(Number);
      if (h! < 0 || h! > 23 || m! < 0 || m! > 59) {
        errors.birthTime = 'Geburtszeit ist ungültig (00:00–23:59).';
      }
    }
  }

  if (draft.birthPlace && draft.birthPlace.length > 80) {
    errors.birthPlace = 'Geburtsort darf maximal 80 Zeichen lang sein.';
  }

  return errors;
}

export function hasErrors(errors: ProfileErrors): boolean {
  return Object.keys(errors).length > 0;
}

function migrateIfNeeded(): void {
  const existing = localStorage.getItem(PROFILES_KEY);
  if (existing) return;
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (!legacy) return;
  try {
    const profile = JSON.parse(legacy) as UserProfile;
    localStorage.setItem(PROFILES_KEY, JSON.stringify([profile]));
    localStorage.setItem(CURRENT_ID_KEY, profile.id);
  } catch { /* ignore corrupt data */ }
}

export function listProfiles(): UserProfile[] {
  migrateIfNeeded();
  const raw = localStorage.getItem(PROFILES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as UserProfile[];
  } catch {
    return [];
  }
}

export function getProfileById(id: string): UserProfile | null {
  return listProfiles().find((p) => p.id === id) ?? null;
}

export function setCurrentProfileId(id: string): void {
  localStorage.setItem(CURRENT_ID_KEY, id);
}

export function getCurrentProfileId(): string | null {
  migrateIfNeeded();
  return localStorage.getItem(CURRENT_ID_KEY);
}

export function getCurrentProfile(): UserProfile | null {
  const id = getCurrentProfileId();
  if (!id) return null;
  return getProfileById(id);
}

export function saveProfile(profile: UserProfile): void {
  migrateIfNeeded();
  const profiles = listProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    profiles[idx] = profile;
  } else {
    profiles.push(profile);
  }
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  localStorage.setItem(LEGACY_KEY, JSON.stringify(profile));
  setCurrentProfileId(profile.id);
}

export function loadProfile(): UserProfile | null {
  return getCurrentProfile();
}

export function deleteProfile(id: string): void {
  const profiles = listProfiles().filter((p) => p.id !== id);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  const currentId = getCurrentProfileId();
  if (currentId === id) {
    const next = profiles[0];
    if (next) {
      setCurrentProfileId(next.id);
      localStorage.setItem(LEGACY_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(CURRENT_ID_KEY);
      localStorage.removeItem(LEGACY_KEY);
    }
  }
}

export function clearProfile(): void {
  const currentId = getCurrentProfileId();
  if (currentId) {
    deleteProfile(currentId);
  } else {
    localStorage.removeItem(LEGACY_KEY);
  }
}

export function hasValidProfile(profile: UserProfile | null): profile is UserProfile {
  if (!profile) return false;
  return (
    typeof profile.id === 'string' &&
    typeof profile.name === 'string' &&
    profile.name.trim().length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(profile.birthDate)
  );
}
